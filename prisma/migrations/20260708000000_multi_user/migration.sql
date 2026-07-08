-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Park all pre-existing (single-user era) rows on a placeholder owner. The
-- empty passwordHash means nobody can log in as it; run
-- `node scripts/claim-legacy.mjs <email>` after signing up to take ownership.
INSERT INTO "User" ("id", "email", "passwordHash") VALUES ('legacy', 'legacy@local', '');

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cutoffDay" INTEGER NOT NULL DEFAULT 25,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "AppSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AppSetting" ("cutoffDay", "id", "updatedAt", "userId") SELECT "cutoffDay", "id", "updatedAt", 'legacy' FROM "AppSetting";
DROP TABLE "AppSetting";
ALTER TABLE "new_AppSetting" RENAME TO "AppSetting";
CREATE UNIQUE INDEX "AppSetting_userId_key" ON "AppSetting"("userId");
CREATE TABLE "new_SavingsAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Nordiska Flex Plus',
    "principalBalance" REAL NOT NULL,
    "accruedInterest" REAL NOT NULL DEFAULT 0,
    "lastCalculatedDate" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "SavingsAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SavingsAccount" ("accruedInterest", "id", "lastCalculatedDate", "name", "principalBalance", "updatedAt", "userId") SELECT "accruedInterest", "id", "lastCalculatedDate", "name", "principalBalance", "updatedAt", 'legacy' FROM "SavingsAccount";
DROP TABLE "SavingsAccount";
ALTER TABLE "new_SavingsAccount" RENAME TO "SavingsAccount";
CREATE UNIQUE INDEX "SavingsAccount_userId_key" ON "SavingsAccount"("userId");
CREATE TABLE "new_SavingsTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "SavingsTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SavingsTransaction" ("amount", "createdAt", "date", "id", "type", "userId") SELECT "amount", "createdAt", "date", "id", "type", 'legacy' FROM "SavingsTransaction";
DROP TABLE "SavingsTransaction";
ALTER TABLE "new_SavingsTransaction" RENAME TO "SavingsTransaction";
CREATE INDEX "SavingsTransaction_userId_idx" ON "SavingsTransaction"("userId");
CREATE TABLE "new_StockHolding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "shares" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "StockHolding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StockHolding" ("createdAt", "id", "shares", "ticker", "updatedAt", "userId") SELECT "createdAt", "id", "shares", "ticker", "updatedAt", 'legacy' FROM "StockHolding";
DROP TABLE "StockHolding";
ALTER TABLE "new_StockHolding" RENAME TO "StockHolding";
CREATE INDEX "StockHolding_userId_idx" ON "StockHolding"("userId");
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "category", "createdAt", "date", "description", "id", "type", "userId") SELECT "amount", "category", "createdAt", "date", "description", "id", "type", 'legacy' FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

