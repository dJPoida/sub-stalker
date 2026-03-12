# Handoff

Last updated: 2026-03-13

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
  - invite registry with single-use token hashes and lifecycle statuses (`PENDING`, `CONSUMED`, `EXPIRED`, `REVOKED`).
  - optional invite-only sign-up gate via `INVITES_REQUIRED=true`.
  - invite issuance workflow available in `/tools` for authenticated operators (manual copy/share links).
  - invite validation + consumption occurs transactionally during sign-up.
  - manual maintenance actions available in `/tools`.
  - daily maintenance now marks expired pending invites.
  - `/subscriptions` and `/settings` protected.
- Subscription CRUD:
  - authenticated users can create, list, update, and deactivate subscriptions from `/subscriptions`.
  - subscriptions page now supports modal add/edit flows plus client-side search, status filtering, and sorting.
  - shared read-only `Subscription Details` modal now opens from:
    - dashboard `Upcoming Charges`
    - dashboard `Recent Activity`
    - `/subscriptions` card rows (click + keyboard Enter/Space)
  - details modal data is served by `/api/subscriptions/[subscriptionId]/details` using a shared contract in `lib/subscription-details.ts`.
  - details modal includes loading/empty/error states, focus trap, `Esc` close, and non-edit actions (`View Full History`, `Copy Subscription ID`, `Close`).
  - modal interaction telemetry posts to `/api/telemetry` with source context (`upcoming_charges`, `recent_activity`, `subscriptions_list`).
  - `paymentMethod` is now required and acts as a learning field (suggests prior values entered by the same user).
  - `signedUpBy` is optional and also acts as a learning field (suggests prior user-entered values).
  - optional billing workflow links are captured per subscription:
    - `billingConsoleUrl` (Billing Console / Manage Plan)
    - `cancelSubscriptionUrl` (Cancel Subscription)
    - `billingHistoryUrl` (Billing History)
  - optional `notesMarkdown` stores notes/comments as markdown edited in a WYSIWYG markdown editor.
  - subscriptions list includes direct filters for payment method and signed-up-by values.
  - subscriptions are persisted in the `Subscription` table.
  - server actions validate payment method, amount, currency, billing interval, optional next billing date, and optional URL fields (`http/https` only).
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
  - API-driven aggregation contract exposed via `/api/dashboard`.
  - shows active subscription count, estimated monthly spend, renewals-in-next-7-days, and category/savings signals.
  - upcoming/recent items are interactive entry points into the shared details modal.
- Email and notification baseline:
  - provider-agnostic mail wrapper with `resend` / `console` / `mock`.
  - `EmailDeliveryLog` persistence for send outcomes (`SENT`, `FAILED`, `SKIPPED`).
  - daily maintenance dispatches due subscription reminders and dedupes reruns using `SubscriptionReminderDispatch`.
  - `/tools` supports authenticated test-email sends and manual daily-batch execution.

Not implemented yet:

- Registration verification email flow is still template-only and not yet wired into sign-up/sign-in gating.
- Full end-to-end browser coverage.

## Critical deployment notes

- Keep `DATABASE_URL` and `DIRECT_URL` separate in Vercel:
  - `DATABASE_URL`: runtime app traffic (pooler acceptable).
  - `DIRECT_URL`: migration connection for Prisma (must be migration-safe).
- Set `CRON_SECRET` for `/api/internal/daily-maintenance`.
- If Prisma errors on Vercel about stale client, verify `scripts/vercel-build.mjs` still runs `npx prisma generate` first.

## Immediate next tasks

1. Add role-based operator permissions for `/tools` invite issuance.
2. Add optional "sign out all sessions" account control.
3. Wire registration verification email/token flow into auth lifecycle.

## Files to understand first

1. `README.md`
2. `prisma/schema.prisma`
3. `lib/auth.ts`
4. `lib/status.ts`
5. `scripts/vercel-build.mjs`
6. `app/auth/actions.ts`
7. `lib/subscription-reminders.ts`
