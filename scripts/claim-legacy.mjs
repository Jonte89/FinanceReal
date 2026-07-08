// Reassign all data parked on the "legacy" placeholder user (created by the
// multi_user migration) to a real account, then delete the placeholder.
//
// Usage: node scripts/claim-legacy.mjs <email-of-registered-account>
//
// Uses DATABASE_URL (+ TURSO_AUTH_TOKEN for remote Turso) from .env, so it
// works against both the local dev.db and production.
import "dotenv/config";
import { createClient } from "@libsql/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/claim-legacy.mjs <email>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const legacy = await db.execute({
  sql: "SELECT id FROM User WHERE id = 'legacy'",
  args: [],
});
if (legacy.rows.length === 0) {
  console.log("No legacy user found — nothing to claim.");
  process.exit(0);
}

const target = await db.execute({
  sql: "SELECT id FROM User WHERE email = ?",
  args: [email],
});
if (target.rows.length === 0) {
  console.error(`No account with email ${email}. Sign up in the app first.`);
  process.exit(1);
}
const targetId = target.rows[0].id;

// Transaction/StockHolding/SavingsTransaction can always move. SavingsAccount
// and AppSetting are unique per user, so only move them if the target has none.
const statements = [
  { sql: "UPDATE `Transaction` SET userId = ? WHERE userId = 'legacy'", args: [targetId] },
  { sql: "UPDATE StockHolding SET userId = ? WHERE userId = 'legacy'", args: [targetId] },
  { sql: "UPDATE SavingsTransaction SET userId = ? WHERE userId = 'legacy'", args: [targetId] },
  {
    sql: `UPDATE SavingsAccount SET userId = ? WHERE userId = 'legacy'
          AND NOT EXISTS (SELECT 1 FROM SavingsAccount WHERE userId = ?)`,
    args: [targetId, targetId],
  },
  {
    sql: `UPDATE AppSetting SET userId = ? WHERE userId = 'legacy'
          AND NOT EXISTS (SELECT 1 FROM AppSetting WHERE userId = ?)`,
    args: [targetId, targetId],
  },
  // Cascades away anything that could not be moved above.
  { sql: "DELETE FROM User WHERE id = 'legacy'", args: [] },
];

const results = await db.batch(statements, "write");
const [tx, stocks, savingsTx, savingsAcct, settings] = results.map((r) => r.rowsAffected);
console.log(`Claimed for ${email}:`);
console.log(`  transactions:         ${tx}`);
console.log(`  stock holdings:       ${stocks}`);
console.log(`  savings transactions: ${savingsTx}`);
console.log(`  savings account:      ${savingsAcct}`);
console.log(`  settings:             ${settings}`);
console.log("Legacy user deleted.");
