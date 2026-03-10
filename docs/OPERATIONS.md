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
- `INVITES_REQUIRED` (optional; set `true` for invite-only sign-up)

Supabase guidance:

- Use pooled URL for `DATABASE_URL` (runtime).
- Use migration-safe URL for `DIRECT_URL`.

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
- Invite issuance is conservatively throttled per authenticated operator (hourly window).

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
4. Verify session cleanup endpoint health:
   - ensure cron requests succeed in Vercel logs.
5. If invite-only onboarding is enabled:
   - verify `/tools` invite issuance succeeds for authenticated operators.
   - confirm sign-up rejects missing/invalid invite tokens.

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
