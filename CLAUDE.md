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

Personal Finance & Wealth Tracker: a Next.js App Router app (React 19) tracking **transactions, stock holdings, and a savings account, all valued in SEK**.

**Three domains, each a page + API route + Prisma model:**
- **Transactions** (`/transactions`) — income/expense ledger, categorized via `src/lib/categories.ts`.
- **Stocks** (`/stocks`) — holdings priced live through `yahoo-finance2`.
- **Savings** (`/savings`) — single interest-bearing account with daily accrual.

Pages live in `src/app/<domain>/page.tsx`; their APIs in `src/app/api/<domain>/route.ts` (plus `[id]` routes for mutations). The `Sidebar` (`src/components/sidebar.tsx`) and a `sonner` `Toaster` are mounted globally in `layout.tsx`.

### Data layer (Prisma 7 + SQLite)
- Prisma 7 **requires a driver adapter**. The shared client (`src/lib/prisma.ts`) wraps `@prisma/adapter-better-sqlite3` and is the singleton you should import everywhere (`import { prisma } from "@/lib/prisma"`).
- The generated client is emitted to `src/generated/prisma` (not `node_modules`) per `prisma/schema.prisma`'s `output`. Import types/client from `@/generated/prisma/client`.
- `DATABASE_URL` (in `.env`, e.g. `file:./dev.db`) is loaded for the CLI via `prisma.config.ts` (`import "dotenv/config"`), **not** automatically by Prisma.
- Models: `Transaction`, `StockHolding`, `SavingsAccount`, `SavingsTransaction`. Money is stored as `Float` in SEK; `type` fields are plain strings (`"INCOME"`/`"EXPENSE"`, `"DEPOSIT"`/`"WITHDRAWAL"`), not enums.

### Domain logic
- **Stock pricing** (`src/app/api/stocks/route.ts`): `yahoo-finance2` v3 is **class-based** — instantiate `new YahooFinance(...)`. Non-SEK quotes are converted to SEK via a `<CCY>SEK=X` FX quote, cached per request.
- **Savings interest** (`src/lib/savings.ts`): pure accrual engine. `accrueSavings` rolls balances forward day-by-day from `lastCalculatedDate` to today (idempotent same-day), applies the daily rate, and **capitalizes accrued interest into principal on Dec 31**. Rate tiers: `FLEX_PLUS_RATE` (2.10%) at/above `FLEX_PLUS_THRESHOLD` (10 000 SEK), else `FLEX_RATE` (2.00%). The savings GET route accrues and persists on every read.
- **Formatting** (`src/lib/currency.ts`): always use `formatSEK` for money display (Swedish `sv-SE` locale, e.g. `1 234,50 kr`).

### UI
- shadcn/ui components in `src/components/ui` (style `radix-nova`, base color `neutral`, Lucide icons; config in `components.json`), built on Radix/Base UI + Tailwind v4 (CSS-first via `src/app/globals.css`, no `tailwind.config`).
- Path alias `@/*` → `src/*` (see `tsconfig.json`). Aliases: `@/components`, `@/lib`, `@/components/ui`.
