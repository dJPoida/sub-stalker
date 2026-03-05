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
2. Open `Add Subscription` modal and confirm `Payment method` is required.
3. Submit a new subscription with `Payment method` and optional `Signed up by`, then confirm success message.
4. Open `Edit` modal on an existing subscription, update `Payment method` and/or `Signed up by`, submit, and confirm success message.
5. Open `Add Subscription` again and confirm prior `Payment method` and `Signed up by` values are suggested.
6. Use search to filter the list by subscription name, payment method, and signed-up-by text.
7. Use `Payment method` and `Signed up by` filter controls and confirm card list changes correctly.
8. Switch status filter (`All`, `Active`, `Inactive`) and confirm card list changes correctly.
9. Change sort mode and confirm card order updates.
10. Trigger `Deactivate`, accept confirmation, and confirm status updates to inactive.

Settings UX:

1. Open `/settings` while signed in and confirm current values are shown in inline controls.
2. Change display mode to `Dark` and confirm it auto-saves and re-renders in dark theme.
3. Navigate to another page (for example `/`) and confirm the dark theme remains applied.
4. Change display mode to `Light` and confirm it auto-saves and re-renders in light theme.
5. Change display mode to `Device`, then toggle OS/browser color scheme and confirm app theme follows system preference.
6. Change default currency and reminder lead-time and confirm each change persists after page reload.
7. Toggle reminder emails off/on and confirm state persists after page reload.
8. Open `Edit Account`, update display name, save, and confirm the updated name appears in settings.

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
