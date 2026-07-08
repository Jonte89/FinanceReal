# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Read `AGENTS.md` first.** This project pins a non-standard Next.js (16.2.x). APIs,
> conventions, and file layout may differ from training data — consult
> `node_modules/next/dist/docs/` before writing Next.js code, and heed deprecation notices.

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` / `npm run start` — production build / serve
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `next/core-web-vitals` + `next/typescript`)
- `npx prisma migrate dev --name <name>` — create + apply a migration after editing `prisma/schema.prisma`
- `npx prisma generate` — regenerate the client into `src/generated/prisma` (committed; re-run after schema changes)

There is no test runner configured.

## Architecture

Personal Finance & Wealth Tracker: a Next.js App Router app (React 19) tracking **transactions, stock holdings, and a savings account, all valued in SEK**. The app is **multi-user**: every data model belongs to a `User`, and all queries must be scoped by the session's `userId`.

**Three domains, each a page + API route + Prisma model:**
- **Transactions** (`/transactions`) — income/expense ledger, categorized via `src/lib/categories.ts`.
- **Stocks** (`/stocks`) — holdings priced live through `yahoo-finance2`.
- **Savings** (`/savings`) — single interest-bearing account with daily accrual.

Pages live in `src/app/<domain>/page.tsx`; their APIs in `src/app/api/<domain>/route.ts` (plus `[id]` routes for mutations). The desktop `Sidebar` and phone `MobileNav` (both exported from `src/components/sidebar.tsx`) plus a `sonner` `Toaster` are mounted globally in `layout.tsx`.

### Data layer (Prisma 7 + libSQL)
- Prisma 7 **requires a driver adapter**. The shared client (`src/lib/prisma.ts`) wraps `@prisma/adapter-libsql` and is the singleton you should import everywhere (`import { prisma } from "@/lib/prisma"`). The same libSQL adapter drives both a **local SQLite file** in dev (`DATABASE_URL="file:./dev.db"`) and a **remote Turso database** in prod (`DATABASE_URL="libsql://…"` + `TURSO_AUTH_TOKEN`) — see `DEPLOY.md`.
- The generated client is emitted to `src/generated/prisma` (not `node_modules`) per `prisma/schema.prisma`'s `output`. Import types/client from `@/generated/prisma/client`.
- `datasource db` in the schema only declares `provider = "sqlite"` (no `url`); the connection is supplied at runtime by the adapter. `DATABASE_URL` (in `.env`) is loaded for the CLI via `prisma.config.ts` (`import "dotenv/config"`), **not** automatically by Prisma.
- Models: `User`, `Transaction`, `StockHolding`, `SavingsAccount`, `SavingsTransaction`, plus `AppSetting` — per-user preferences (e.g. `cutoffDay`, the day a new budget period starts, managed via `/api/settings`). Every data model has a required `userId` (cascade-delete); `SavingsAccount` and `AppSetting` are one-per-user (`userId @unique`). Money is stored as `Float` in SEK; `type` fields are plain strings (`"INCOME"`/`"EXPENSE"`, `"DEPOSIT"`/`"WITHDRAWAL"`), not enums.
- The `multi_user` migration parks pre-existing rows on a placeholder user (id `legacy`, unclaimable); `scripts/claim-legacy.mjs <email>` reassigns them to a real account.

### Domain logic
- **Stock pricing** (`src/app/api/stocks/route.ts`): `yahoo-finance2` v3 is **class-based** — instantiate `new YahooFinance(...)`. Non-SEK quotes are converted to SEK via a `<CCY>SEK=X` FX quote, cached per request.
- **Savings interest** (`src/lib/savings.ts`): pure accrual engine. `accrueSavings` rolls balances forward day-by-day from `lastCalculatedDate` to today (idempotent same-day), applies the daily rate, and **capitalizes accrued interest into principal on Dec 31**. Rate tiers: `FLEX_PLUS_RATE` (2.10%) at/above `FLEX_PLUS_THRESHOLD` (10 000 SEK), else `FLEX_RATE` (2.00%). The savings GET route accrues and persists on every read.
- **Stock news** (`src/app/api/stocks/news/route.ts`): per-ticker headlines via `yahoo-finance2`. Equities are matched by searching the company name and keeping only results whose `relatedTickers` share the same `tickerRoot` (suffix-stripped symbol); ETFs/commodities (no `relatedTickers`) are matched by deriving theme keywords from the fund name (`FUND_STOPWORDS` drops provider/structure noise) and keeping headlines that mention them.
- **Amount expressions** (`src/lib/expression.ts`): `evaluateExpression` is a hand-written recursive-descent parser for amount inputs (`+ - * /`, parens, unary signs) — never `eval`/`Function`. Returns `null` on empty or invalid input.
- **Formatting** (`src/lib/currency.ts`): always use `formatSEK` for money display (Swedish `sv-SE` locale, e.g. `1 234,50 kr`).

### UI
- shadcn/ui components in `src/components/ui` (style `radix-nova`, base color `neutral`, Lucide icons; config in `components.json`), built on Radix/Base UI + Tailwind v4 (CSS-first via `src/app/globals.css`, no `tailwind.config`).
- Path alias `@/*` → `src/*` (see `tsconfig.json`). Aliases: `@/components`, `@/lib`, `@/components/ui`.

### Auth & deployment
- Email + password accounts with stateless sessions: `src/lib/session.ts` (edge-safe jose JWT sign/verify) and `src/lib/auth.ts` (bcryptjs hashing, `cookies()` helpers, `getSessionUserId()`). Auth endpoints live under `src/app/api/auth/` (signup/login/logout/me); the UI is `/login`.
- `src/proxy.ts` (Next 16's renamed middleware) does an **optimistic** session-cookie check on every route: unauthenticated pages redirect to `/login`, APIs get 401. It is not the real guard — **every API route must call `getSessionUserId()` and scope its Prisma queries by `userId`** (use `deleteMany({ where: { id, userId } })` for mutations so ownership is enforced).
- Signup is invite-only: `INVITE_CODE` must match in production (unset in prod disables signup; unset in dev leaves signup open). `SESSION_SECRET` signs session cookies (30-day expiry); a dev fallback is used when unset outside production.
- Deployment (Vercel + Turso, env vars, data migration) is documented in `DEPLOY.md`.
