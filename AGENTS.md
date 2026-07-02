<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project notes

Personal Finance & Wealth Tracker (Next.js App Router, React 19, everything valued in SEK). See `CLAUDE.md` for full architecture; the essentials:

- **Data layer**: Prisma 7 requires a driver adapter. `src/lib/prisma.ts` wraps `@prisma/adapter-libsql`, driving a local SQLite file in dev (`DATABASE_URL="file:./dev.db"`) and a remote Turso DB in prod (`DATABASE_URL="libsql://…"` + `TURSO_AUTH_TOKEN`). Import the singleton (`import { prisma } from "@/lib/prisma"`); import types from `@/generated/prisma/client` (generated client lives in `src/generated/prisma`, not `node_modules`).
- **Auth**: `src/middleware.ts` gates every route with HTTP Basic Auth when `APP_PASSWORD` is set (user = `APP_USER` or `"admin"`); left open when unset (e.g. local dev).
- **Navigation**: `layout.tsx` mounts both `Sidebar` (desktop) and `MobileNav` (phone) from `src/components/sidebar.tsx`, plus a `sonner` `Toaster`.
- **Deployment**: Vercel + Turso, documented in `DEPLOY.md`.
