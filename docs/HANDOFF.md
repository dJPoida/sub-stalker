# Handoff

Last updated: 2026-03-03

## Current status

The repository is an MVP scaffold with working operational checks, local/production migrations, and basic auth.

Implemented:

- Next.js 14 app router shell pages (`/`, `/subscriptions`, `/settings`, auth pages, `/status`).
- `/status` and `/api/status` with:
  - TCP connectivity check to DB host/port.
  - DB metadata (server version, applied/pending migrations, latest migration).
- Prisma + Postgres setup:
  - local docker compose Postgres on `localhost:5433`.
  - committed Prisma migrations.
  - Vercel build pipeline runs `prisma generate`, then `prisma migrate deploy` (production), then `next build`.
- Basic auth:
  - sign-up/sign-in/sign-out via server actions.
  - password hashing with `scrypt`.
  - DB-backed sessions in `Session` table.
  - expired sessions pruned on successful sign-in.
  - `/subscriptions` and `/settings` protected.

Not implemented yet:

- Subscription CRUD and dashboard metrics.
- Settings persistence UI.
- Email/notification workflows.
- Automated tests.

## Critical deployment notes

- Keep `DATABASE_URL` and `DIRECT_URL` separate in Vercel:
  - `DATABASE_URL`: runtime app traffic (pooler acceptable).
  - `DIRECT_URL`: migration connection for Prisma (must be migration-safe).
- If Prisma errors on Vercel about stale client, verify `scripts/vercel-build.mjs` still runs `npx prisma generate` first.

## Immediate next tasks

1. Build authenticated subscription CRUD (server actions + Prisma queries + UI forms).
2. Add basic settings persistence from `UserSettings`.
3. Add minimal e2e smoke tests for auth + status.
4. Add scheduled cleanup job for old sessions (pruning currently runs on sign-in only).

## Files to understand first

1. `README.md`
2. `prisma/schema.prisma`
3. `lib/auth.ts`
4. `lib/status.ts`
5. `scripts/vercel-build.mjs`
6. `app/auth/actions.ts`

