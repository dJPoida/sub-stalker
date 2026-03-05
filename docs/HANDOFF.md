# Handoff

Last updated: 2026-03-05

## Current status

The repository is an MVP with working operational checks, local/production migrations, basic auth, and a refreshed Figma-inspired UI.

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
  - session lifecycle policy (absolute + idle expiry, max concurrent sessions).
  - sign-in rate limiting by email + IP.
  - same-origin validation on auth actions.
  - expired sessions pruned on sign-in.
  - stale sign-in attempts pruned by daily cron batch.
  - manual maintenance actions available in `/tools`.
  - `/subscriptions` and `/settings` protected.
- Subscription CRUD:
  - authenticated users can create, list, update, and deactivate subscriptions from `/subscriptions`.
  - subscriptions page now supports modal add/edit flows plus client-side search, status filtering, and sorting.
  - `paymentMethod` is now required and acts as a learning field (suggests prior values entered by the same user).
  - `signedUpBy` is optional and also acts as a learning field (suggests prior user-entered values).
  - subscriptions list includes direct filters for payment method and signed-up-by values.
  - subscriptions are persisted in the `Subscription` table.
  - server actions validate payment method, amount, currency, billing interval, and optional next billing date.
  - update/deactivate operations are scoped to the authenticated user.
- Settings persistence:
  - `/settings` reads/writes `UserSettings` defaults (currency + reminders + display mode).
  - simple settings are edited inline and auto-saved per control.
  - account details are edited in a dedicated modal; display name persists to `User.name`.
  - display mode preference is persisted as `DEVICE | LIGHT | DARK`.
  - app theme follows system preference in `DEVICE` mode and uses explicit override for `LIGHT`/`DARK`.
- Form submit UX feedback:
  - all primary form/server-action flows use pending submit states and disabled fieldsets via shared `PendingFormControls`.
- Dashboard:
  - shows active subscription count, estimated monthly spend, next charge summary, and quick actions.

Not implemented yet:

- Email/notification workflows.
- Automated tests.

## Critical deployment notes

- Keep `DATABASE_URL` and `DIRECT_URL` separate in Vercel:
  - `DATABASE_URL`: runtime app traffic (pooler acceptable).
  - `DIRECT_URL`: migration connection for Prisma (must be migration-safe).
- Set `CRON_SECRET` for `/api/internal/daily-maintenance`.
- If Prisma errors on Vercel about stale client, verify `scripts/vercel-build.mjs` still runs `npx prisma generate` first.

## Immediate next tasks

1. Add minimal e2e smoke tests for auth + status + subscriptions CRUD.
2. Add optional "sign out all sessions" account control.
3. Add notifications/reminders workflow from settings preferences.

## Files to understand first

1. `README.md`
2. `prisma/schema.prisma`
3. `lib/auth.ts`
4. `lib/status.ts`
5. `scripts/vercel-build.mjs`
6. `app/auth/actions.ts`
