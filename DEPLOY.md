# Deploying the Finance Tracker (Vercel + Turso)

The app runs on **Vercel** and stores data in **Turso** (a hosted, SQLite-compatible
database). Locally it still uses the `dev.db` SQLite file — no change to your workflow.

Password protection is built in: set `APP_PASSWORD` and the whole site (pages + API)
requires Basic Auth login. Your browser/phone remembers it after the first prompt.

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

   | Name               | Value                                            |
   | ------------------ | ------------------------------------------------ |
   | `DATABASE_URL`     | the `libsql://…` URL from step 2                 |
   | `TURSO_AUTH_TOKEN` | the token from step 2                            |
   | `APP_PASSWORD`     | a strong password you choose                     |
   | `APP_USER`         | *(optional)* login username, defaults to `admin` |

3. Click **Deploy**.

## 5. Open it on your phone

Visit the `*.vercel.app` URL Vercel gives you. You'll get a login prompt — enter
`admin` (or your `APP_USER`) and your `APP_PASSWORD`. On iOS/Android you can then use
the browser's **Add to Home Screen** to get an app-like icon.

---

### Notes

- **Local dev is unchanged**: with `APP_PASSWORD` unset and `DATABASE_URL="file:./dev.db"`,
  the app is open and uses the local SQLite file.
- Your local `dev.db` data is **not** copied to Turso — production starts empty. Re-enter
  holdings/transactions there, or export/import manually if you need the old data.
- To change the password later, edit `APP_PASSWORD` in Vercel's project settings and redeploy.
