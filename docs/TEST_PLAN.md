# Test Plan

## Required checks before merge

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`

For migration/schema changes:

1. `npm run db:up`
2. `npm run db:migrate -- --name <change>`
3. `npm run prisma:generate`
4. `npm run build:vercel` (with local env overrides if needed)

## Manual smoke tests

Auth:

1. Sign up with new user.
2. Sign out.
3. Sign in with same user.
4. Confirm `/subscriptions` loads when signed in.
5. Confirm `/subscriptions` redirects to sign-in when signed out.
6. Submit repeated bad credentials and confirm rate-limit response appears.
7. Confirm sign-in rejects cross-origin requests (invalid request path).

Subscriptions UX:

1. Open `/subscriptions` and confirm subscription cards render.
2. Open `Add Subscription` modal, submit a new subscription, and confirm success message.
3. Open `Edit` modal on an existing subscription, update a field, submit, and confirm success message.
4. Use search to filter the list by subscription name/provider.
5. Switch status filter (`All`, `Active`, `Inactive`) and confirm card list changes correctly.
6. Change sort mode and confirm card order updates.
7. Trigger `Deactivate`, accept confirmation, and confirm status updates to inactive.

Status:

1. Open `/status`.
2. Confirm DB connectivity fields render.
3. Confirm migration metadata renders.
4. Open `/api/status` and confirm JSON contract.

Deploy:

1. Merge to `main`.
2. Confirm Vercel build includes Prisma generate + migrate + build.
3. Confirm deployed `/status` and `/api/status`.
4. Confirm daily cron endpoint is invoked by Vercel and returns success.
5. Confirm `/tools` manual maintenance actions run successfully for testing.

## Known gaps

- No automated integration tests yet.
- No e2e browser tests yet.
- No load testing yet.
