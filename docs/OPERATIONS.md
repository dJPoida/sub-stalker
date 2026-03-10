# Operations

## Environments

Local:

- Postgres via `docker-compose.yml` on `localhost:5433`.
- Next.js loads `.env.local`.

Vercel production:

- deploys from `main`.
- runs `npm run build:vercel`.

## Required environment variables

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `CRON_SECRET`
- `MAIL_PROVIDER_API_KEY`
- `MAIL_FROM_ADDRESS`
- `MAIL_FROM_NAME` (optional; default `Sub Stalker`)
- `MAIL_PROVIDER` (optional; `resend`, `console`, `mock`)
- `EMAIL_DELIVERY_LOG_RETENTION_DAYS` (optional; default `90`)
- `INVITES_REQUIRED` (optional; set `true` for invite-only sign-up)

Supabase guidance:

- Use pooled URL for `DATABASE_URL` (runtime).
- Use migration-safe URL for `DIRECT_URL`.

Public schema security baseline:

- Every new table in `public` must enable Row Level Security in the same Prisma migration that creates it.
- If the table is internal-only, revoke table privileges from `anon` and `authenticated`.
- If API access is required, add explicit least-privilege RLS policies instead of broad grants.
- After deploy, confirm Supabase Security Advisor shows no `RLS Disabled in Public` findings for app tables.

## Build and migration pipeline

`npm run build:vercel` performs:

1. `npx prisma generate`
2. `prisma migrate deploy` (production only)
3. `next build`

Scheduled cleanup:

- Vercel cron runs once daily at `/api/internal/daily-maintenance`.
- Endpoint requires `Authorization: Bearer <CRON_SECRET>`.
- For ad-hoc testing, use `/tools` manual actions instead of increasing cron frequency.
- Daily maintenance marks expired pending invites as `EXPIRED`.
- Daily maintenance prunes `EmailDeliveryLog` rows older than the retention window.
- Invite issuance is conservatively throttled per authenticated operator (hourly window).

Email service:

- Provider abstraction is in `lib/mail/`.
- Provider selection:
  - `MAIL_PROVIDER=mock` forces in-memory mock mode (no network calls).
  - if `MAIL_PROVIDER_API_KEY` is set, provider defaults to Resend.
  - if API key is missing, console/no-op provider is used automatically.
- Current production expectation uses Resend free-tier limits (100/day, 3,000/month); monitor volume growth before expanding automated reminder sends.
- Test endpoint: `POST /api/mail/test` (authenticated, 3 requests/user/hour).
- Readiness is exposed at `/api/status` and `/status` under the `email` section.

## Common runbook

### Local setup

1. `npm install`
2. `npm run db:up`
3. `npm run db:migrate -- --name <name>`
4. `npm run dev`

### Production deploy verification

1. Confirm GitHub merge to `main`.
2. Confirm Vercel build logs include:
   - `Generating Prisma Client...`
   - `Running Prisma migrations...`
   - `No pending migrations to apply` or migration apply output.
3. Check:
   - `/status`
   - `/api/status`
   - ensure `email.configured`/`email.provider`/`email.fromAddress` values are expected
4. Verify session cleanup endpoint health:
   - ensure cron requests succeed in Vercel logs.
5. If invite-only onboarding is enabled:
   - verify `/tools` invite issuance succeeds for authenticated operators.
   - confirm sign-up rejects missing/invalid invite tokens.
6. Verify email health path:
   - trigger `Send Test Email` from `/tools` as an authenticated user.
   - confirm `EmailDeliveryLog` row is written with expected status.

### If deployment fails

Prisma stale client:

- Ensure build log includes `npx prisma generate`.
- Verify `scripts/vercel-build.mjs` is used by `vercel.json`.

Prisma cannot reach DB (`P1001`):

- verify `DIRECT_URL`.
- verify DB host/port allow Vercel network path.

Migration hangs:

- check if migration is pointed at an unsupported pooled URL.
- switch `DIRECT_URL` to a migration-safe connection endpoint.

Auth rejects with `invalid_request`:

- verify app hostname and origin match expected host/protocol.
- check proxy headers (`x-forwarded-host`, `x-forwarded-proto`) in deployment path.

Invite sign-up rejects with invalid invite:

- verify `INVITES_REQUIRED` expected value in environment.
- confirm invite token was freshly issued from `/tools` and not previously consumed.
- confirm submitted sign-up email exactly matches invite target email after lowercase normalization.

Test email fails:

- inspect `/api/status` for `email.configured` and provider values.
- if provider is `console`, set `MAIL_PROVIDER_API_KEY` and redeploy.
- confirm `MAIL_FROM_ADDRESS` is valid for current provider/domain setup.
- inspect `EmailDeliveryLog` entries in Prisma Studio for recent `FAILED` rows.
