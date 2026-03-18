# Architecture

## High-level

Sub Stalker is a Next.js App Router app using Prisma + Postgres.

Main concerns:

- Web UI: App Router pages in `app/`.
- Auth/session: server-side, cookie + DB-backed session table.
- Data layer: Prisma client in `lib/db.ts`, schema in `prisma/schema.prisma`.
- Email service: provider-agnostic abstraction in `lib/mail/` with React Email templates.
- Theme system: CSS variable tokens with `html[data-theme]` override and `prefers-color-scheme` fallback.
- Ops status: `/status` page + `/api/status` JSON route.

## Route map

- `/` dashboard (auth-aware message).
- `/auth/sign-in`, `/auth/sign-up` (server-action forms; sign-up accepts optional `invite` token context).
- `/auth/verify`, `/auth/verify/requested` (public verification completion + resend flow).
- `/subscriptions` (authenticated).
- `/settings` (authenticated; action-first settings UI with inline auto-save for simple preferences and modal edit flow for account details).
- `/tools` (authenticated maintenance + invite issuance and invite-email actions with manual-share fallback).
- `/status` (human-readable operational status).
- `/api/status` (machine-readable operational status).
- `/api/mail/test` (authenticated test-email send, rate-limited per user).
- `/api/subscriptions/[subscriptionId]/details` (authenticated, read-only details contract for modal).
- `/api/telemetry` (lightweight modal interaction telemetry ingestion).
- `/api/internal/daily-maintenance` (cron-only daily maintenance endpoint).

## Data model

Defined in `prisma/schema.prisma`:

- `User`
- `User.emailVerifiedAt` tracks whether the account can enter authenticated flows.
- `UserSettings` (1:1 with user; `defaultCurrency`, `remindersEnabled`, `reminderDaysBefore`, `displayMode`)
- `DisplayMode` enum (`DEVICE`, `LIGHT`, `DARK`)
- `Subscription` (many per user; includes learning fields `paymentMethod` required and `signedUpBy` optional, plus optional billing links and markdown notes)
- `Session` (many per user; opaque token hashes)
- `SignInAttempt` (rate-limit tracking by hashed email+IP key)
- `Invite` (single-use invitation registry with token hash, status lifecycle, and audit fields)
- `InviteStatus` enum (`PENDING`, `CONSUMED`, `EXPIRED`, `REVOKED`)
- `EmailVerificationToken` (single-use registration verification token hash, expiry, consume/revoke timestamps)
- `EmailDeliveryLog` (delivery attempts with template metadata and provider outcome)
- `EmailDeliveryStatus` enum (`SENT`, `FAILED`, `SKIPPED`)
- `SubscriptionReminderDispatch` (idempotent reminder dispatch lock/status per `user + billing date`)
- `ReminderDispatchStatus` enum (`PENDING`, `SENT`, `FAILED`)

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
4. The nested `v2` operational modal contract described in `docs/SUBSCRIPTION_DETAILS_V2_CONTRACT.md`.

Current modal coverage:

1. Dashboard `Upcoming Charges`
2. `/subscriptions` subscription row cards

Modal behavior:

1. Refetches details on open (`cache: no-store`) to reduce stale views.
2. Includes loading, empty, and error states.
3. Uses keyboard accessible dialog behavior (focus trap + `Esc` close).
4. Supports contextual actions without editing controls (view history, copy ID, close).

V2 contract notes:

1. Legacy flat fields remain in place for the current modal.
2. The nested `v2` payload adds section-level `ready` / `partial` / `empty` states.
3. Alert derivation returns both rendered items and rule-evaluation outcomes.
4. Action capability payloads define permission, confirmation, and required server validation rules before UI wiring.

## Auth flow

1. Sign-up/sign-in server action validates credentials.
2. Passwords are stored as `scrypt` hashes.
3. Sign-up creates the user record, issues a verification token, sends `registration_verification`, and redirects to `/auth/verify/requested` instead of creating a session.
4. Verification links land on `/auth/verify`, atomically consume the token, mark `User.emailVerifiedAt`, and revoke older outstanding verification tokens.
5. Verified sign-in success:
   - generate random session token.
   - store HMAC-SHA256 token hash in `Session` table with `expiresAt` and `lastSeenAt`.
   - set HTTP-only cookie with raw token.
6. Requests read cookie, hash token, look up session, enforce absolute and idle expiry, and clear sessions for users whose email is still unverified.
7. Session touch updates `lastSeenAt` at a fixed interval.
8. Sign-in enforces rate limiting (email+IP), prunes stale attempts, and prunes expired sessions.
9. Sign-out deletes matching session row and clears cookie.
10. Auth actions require same-origin request validation.
11. If `INVITES_REQUIRED=true`, sign-up additionally requires a valid invite token bound to submitted email.
12. Invite consumption and user creation run in one DB transaction to ensure one-time use under concurrency.

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

Status payload also includes email readiness:

1. `email.configured` (`MAIL_PROVIDER_API_KEY` present)
2. `email.provider` (`resend`, `console`, or `mock`)
3. `email.fromAddress` (configured sender or `not configured`)

## Email flow

`lib/mail/` provides:

1. Provider abstraction and runtime selection (`resend`, `console`, `mock`).
2. React Email template rendering (`lib/mail/templates`).
3. `sendEmail` logging into `EmailDeliveryLog` for all attempts.
4. `sendInviteEmail` helper for invite issuance delivery (`invite_issuance` template) with explicit `sent`/`skipped`/`failed` outcomes.
5. `sendRegistrationVerificationEmail` helper for registration verification delivery (`registration_verification` template) with explicit `sent`/`skipped`/`failed` outcomes.
6. Registration verification resend throttling is enforced per recipient using recent `EmailDeliveryLog` entries.
7. Rate-limit helper for `/api/mail/test` (3 sends per user per hour).
8. `runSubscriptionReminderDispatchJob` selects due subscriptions based on `UserSettings`, groups by user, and sends `subscription_reminder` emails.
9. `SubscriptionReminderDispatch` enforces idempotency for reminder reruns (`userId + billingDateKey` uniqueness).

Current guarantees:

1. No-op fallback when API key is missing (safe local/dev behavior).
2. Provider-specific SDK usage is isolated to `lib/mail/providers.ts`.
3. Daily maintenance prunes stale email logs based on retention env configuration.

## Deployment flow

Production build command is defined by `vercel.json`:

- `npm run build:vercel`

`scripts/vercel-build.mjs`:

1. `npx prisma generate`
2. if `VERCEL_ENV=production`: `prisma migrate deploy`
3. `next build`

Additional scheduled operation:

- Daily Vercel cron calls `/api/internal/daily-maintenance` (guarded by `CRON_SECRET`).
- Daily maintenance marks expired pending invites as `EXPIRED`.
- Daily maintenance dispatches due subscription reminder batches and reports reminder counters in run output.
