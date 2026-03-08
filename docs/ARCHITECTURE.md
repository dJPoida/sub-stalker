# Architecture

## High-level

Sub Stalker is a Next.js App Router app using Prisma + Postgres.

Main concerns:

- Web UI: App Router pages in `app/`.
- Auth/session: server-side, cookie + DB-backed session table.
- Data layer: Prisma client in `lib/db.ts`, schema in `prisma/schema.prisma`.
- Theme system: CSS variable tokens with `html[data-theme]` override and `prefers-color-scheme` fallback.
- Ops status: `/status` page + `/api/status` JSON route.

## Route map

- `/` dashboard (auth-aware message).
- `/auth/sign-in`, `/auth/sign-up` (server-action forms).
- `/subscriptions` (authenticated).
- `/settings` (authenticated; action-first settings UI with inline auto-save for simple preferences and modal edit flow for account details).
- `/tools` (authenticated maintenance actions).
- `/status` (human-readable operational status).
- `/api/status` (machine-readable operational status).
- `/api/subscriptions/[subscriptionId]/details` (authenticated, read-only details contract for modal).
- `/api/telemetry` (lightweight modal interaction telemetry ingestion).
- `/api/internal/daily-maintenance` (cron-only daily maintenance endpoint).

## Data model

Defined in `prisma/schema.prisma`:

- `User`
- `UserSettings` (1:1 with user; `defaultCurrency`, `remindersEnabled`, `reminderDaysBefore`, `displayMode`)
- `DisplayMode` enum (`DEVICE`, `LIGHT`, `DARK`)
- `Subscription` (many per user; includes learning fields `paymentMethod` required and `signedUpBy` optional, plus optional billing links and markdown notes)
- `Session` (many per user; opaque token hashes)
- `SignInAttempt` (rate-limit tracking by hashed email+IP key)

## Learning fields

Learning fields are user-owned text values that gain suggestions over time from prior entries.

Current implementation for subscriptions:

1. `paymentMethod` is required on create/edit.
2. `signedUpBy` is optional on create/edit.
3. Suggestions are loaded as distinct values from the authenticated user’s existing subscriptions.
4. `/subscriptions` supports direct filtering by both fields.
5. DB indexes (`userId + paymentMethod`, `userId + signedUpBy`) support scoped filter queries.

Detailed specification: `docs/LEARNING_FIELDS.md`.

## Subscription metadata (non-learning)

In addition to learning fields, each subscription can persist optional operational metadata:

- `billingConsoleUrl`
- `cancelSubscriptionUrl`
- `billingHistoryUrl`
- `notesMarkdown`

UI behavior:

1. Create/edit subscription modals expose all four fields.
2. URL fields are validated server-side and must be `http` or `https` when provided.
3. `notesMarkdown` is edited through a WYSIWYG markdown editor and saved as raw markdown text.
4. Subscription card search includes these metadata fields.

## Shared subscription details contract

`lib/subscription-details.ts` defines a shared, typed contract used by:

1. `/api/subscriptions/[subscriptionId]/details` (server response builder).
2. Dashboard + subscriptions modal consumers (single read-only component).
3. Shared timeline and normalized-cost formatting logic.

Current modal coverage:

1. Dashboard `Upcoming Charges`
2. Dashboard `Recent Activity`
3. `/subscriptions` subscription row cards

Modal behavior:

1. Refetches details on open (`cache: no-store`) to reduce stale views.
2. Includes loading, empty, and error states.
3. Uses keyboard accessible dialog behavior (focus trap + `Esc` close).
4. Supports contextual actions without editing controls (view history, copy ID, close).

## Auth flow

1. Sign-up/sign-in server action validates credentials.
2. Passwords are stored as `scrypt` hashes.
3. On success:
   - generate random session token.
   - store HMAC-SHA256 token hash in `Session` table with `expiresAt` and `lastSeenAt`.
   - set HTTP-only cookie with raw token.
4. Requests read cookie, hash token, look up session, enforce absolute and idle expiry.
5. Session touch updates `lastSeenAt` at a fixed interval.
6. Sign-in enforces rate limiting (email+IP), prunes stale attempts, and prunes expired sessions.
7. Sign-out deletes matching session row and clears cookie.
8. Auth actions require same-origin request validation.

## Settings flow

`/settings` is implemented as independent server actions rather than one monolithic form submit:

1. Simple preferences auto-save inline on change:
   - display mode
   - default currency
   - reminder enabled/disabled
   - reminder lead time
2. Complex profile updates use a modal form:
   - account display name
3. Each action validates input and same-origin request headers before persistence.

## Status flow

`lib/status.ts` composes:

1. DB URL normalization + host/port parse.
2. TCP probe for connectivity/latency.
3. Prisma metadata reads:
   - DB server version.
   - applied migration count.
   - latest applied migration + timestamp.
   - pending migration count vs local `prisma/migrations`.

`/api/status` returns `200` for fully healthy, `503` for degraded.

## Deployment flow

Production build command is defined by `vercel.json`:

- `npm run build:vercel`

`scripts/vercel-build.mjs`:

1. `npx prisma generate`
2. if `VERCEL_ENV=production`: `prisma migrate deploy`
3. `next build`

Additional scheduled operation:

- Daily Vercel cron calls `/api/internal/daily-maintenance` (guarded by `CRON_SECRET`).
