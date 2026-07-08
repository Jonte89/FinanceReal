# Deploying the Finance Tracker (Vercel + Turso)

The app runs on **Vercel** and stores data in **Turso** (a hosted, SQLite-compatible
database). Locally it still uses the `dev.db` SQLite file — no change to your workflow.

The app has account-based auth: each user signs up with email + password (gated by an
invite code you choose) and only sees their own data.

You only need to do this once. Steps that require *your* accounts are marked 🔑.

---

## 1. Push the code to GitHub 🔑

```bash
git add -A
git commit -m "Prepare for deploy: Turso adapter + password protection"
gh repo create finance-tracker --private --source=. --push   # or push to an existing repo
```

## 2. Create the Turso database 🔑

Install the CLI and log in (opens a browser):

```bash
brew install tursodatabase/tap/turso
turso auth login
```

Create the database and grab its connection details:

```bash
turso db create finance-tracker
turso db show finance-tracker --url          # -> libsql://finance-tracker-<org>.turso.io
turso db tokens create finance-tracker       # -> the auth token (copy it)
```

## 3. Create the tables in Turso

Apply the existing Prisma migration to the empty Turso DB:

```bash
turso db shell finance-tracker < prisma/migrations/20260629182624_init/migration.sql
```

(If you change `prisma/schema.prisma` later: run `npx prisma migrate dev` locally to
create a new migration, then pipe that new `migration.sql` into `turso db shell` the
same way.)

## 4. Deploy on Vercel 🔑

1. Go to https://vercel.com → **Add New → Project** → import the GitHub repo.
   (Framework auto-detects as Next.js; the build runs `prisma generate` via the
   `postinstall` hook, so no extra config is needed.)
2. Before the first deploy, add **Environment Variables** (Production):

   | Name               | Value                                                       |
   | ------------------ | ----------------------------------------------------------- |
   | `DATABASE_URL`     | the `libsql://…` URL from step 2                            |
   | `TURSO_AUTH_TOKEN` | the token from step 2                                       |
   | `SESSION_SECRET`   | output of `openssl rand -base64 32` (signs session cookies) |
   | `INVITE_CODE`      | a code you choose; required to create an account            |

3. Click **Deploy**.

## 5. Create your account & claim existing data

1. Visit the `*.vercel.app` URL, choose **Create an account**, and sign up with your
   email, a password, and your `INVITE_CODE`.
2. If the database already had data from the single-user era, it is parked on a
   placeholder "legacy" user. Claim it for your new account (run locally, pointed at
   production):

   ```bash
   DATABASE_URL="libsql://…" TURSO_AUTH_TOKEN="…" node scripts/claim-legacy.mjs you@example.com
   ```

On iOS/Android you can use the browser's **Add to Home Screen** to get an app-like icon.

## 6. Inviting other people

Send them the URL and the `INVITE_CODE` — they sign up and get their own empty tracker.
To rotate the code, change `INVITE_CODE` in Vercel's project settings and redeploy;
existing accounts keep working.

---

### Notes

- **Local dev**: `DATABASE_URL="file:./dev.db"` uses the local SQLite file. `SESSION_SECRET`
  falls back to an insecure dev value if unset, and without `INVITE_CODE` signup is open
  (both are enforced in production).
- Your local `dev.db` data is **not** copied to Turso — production starts empty. Re-enter
  holdings/transactions there, or export/import manually if you need the old data.
- Rotating `SESSION_SECRET` logs everyone out (sessions are signed cookies, 30-day expiry).
