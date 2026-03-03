# Architecture

## High-level

Sub Stalker is a Next.js App Router app using Prisma + Postgres.

Main concerns:

- Web UI: App Router pages in `app/`.
- Auth/session: server-side, cookie + DB-backed session table.
- Data layer: Prisma client in `lib/db.ts`, schema in `prisma/schema.prisma`.
- Ops status: `/status` page + `/api/status` JSON route.

## Route map

- `/` dashboard (auth-aware message).
- `/auth/sign-in`, `/auth/sign-up` (server-action forms).
- `/subscriptions` (authenticated).
- `/settings` (authenticated).
- `/status` (human-readable operational status).
- `/api/status` (machine-readable operational status).
- `/api/internal/session-cleanup` (cron-only maintenance endpoint).

## Data model

Defined in `prisma/schema.prisma`:

- `User`
- `UserSettings` (1:1 with user)
- `Subscription` (many per user)
- `Session` (many per user; opaque token hashes)
- `SignInAttempt` (rate-limit tracking by hashed email+IP key)

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

- Hourly Vercel cron calls `/api/internal/session-cleanup` (guarded by `CRON_SECRET`).
