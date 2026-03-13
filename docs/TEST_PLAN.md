# Test Plan

## Required checks before merge

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`
4. `npm run test:auth` (when local Postgres is available)
5. `npm run test:invites` (when local Postgres is available)
6. `npm run test:mail`
7. `npm run test:dashboard`

For migration/schema changes:

1. `npm run db:up`
2. `npm run db:migrate -- --name <change>`
3. `npm run prisma:generate`
4. `npm run build:vercel` (with local env overrides if needed)

## Manual smoke tests

Auth:

1. Sign up with new user.
2. Confirm sign-up redirects to `/auth/verify/requested` and does not create an authenticated session yet.
3. Open the verification email link and confirm `/auth/verify` reports success.
4. Sign in with the same user and confirm success only after verification.
5. Confirm `/subscriptions` loads when signed in.
6. Confirm `/subscriptions` redirects to sign-in when signed out.
7. Submit repeated bad credentials and confirm rate-limit response appears.
8. Confirm sign-in with a correct password but unverified account redirects back to the verification flow.
9. Confirm sign-in rejects cross-origin requests (invalid request path).
10. Confirm repeated verification resends eventually show the rate-limit response.
11. If `INVITES_REQUIRED=true`, confirm sign-up rejects missing invite token with safe generic error.
12. From `/tools`, issue an invite for `invite-test@example.com`; complete sign-up using invite link and matching email.
13. Confirm invite issuance reports email send status in `/tools`; if provider is unavailable, confirm fallback message instructs manual share.
14. Retry sign-up with the same invite token and confirm rejection.
15. Issue invite for one email and attempt sign-up with different email; confirm rejection.

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
11. In `Add Subscription`, provide valid optional URLs (`https://...`) for billing console, cancel subscription, and billing history; submit and confirm success.
12. Open `Edit` and set one URL to an invalid value (for example `ftp://...` or plain text), submit, and confirm validation error response.
13. Add markdown notes/comments in the WYSIWYG notes editor, save, reopen edit modal, and confirm markdown content round-trips.
14. Confirm subscription cards render `Open` links for populated URL fields and show `Not set` when empty.
15. Use global search with text that appears only in notes or URL fields and confirm matching subscriptions are returned.
16. Click a subscription card body (not Edit/Deactivate buttons) and confirm `Subscription Details` modal opens.
17. Focus a subscription card and press `Enter`, then `Space`; confirm modal opens from keyboard.
18. Inside the modal, confirm focus remains trapped, `Esc` closes it, and there are no editing controls.
19. In the modal, click `Copy Subscription ID` and confirm clipboard copy succeeds.
20. In browser devtools network tab, confirm modal interaction telemetry posts to `POST /api/telemetry` with source `subscriptions_list`.

Dashboard details modal UX:

1. Open `/` while signed in and click an item in `Upcoming Charges`; confirm `Subscription Details` modal opens.
2. While opening modal, confirm loading state is visible and details render after request.
3. Temporarily break the details request (for example, by forcing `401/404`) and confirm error/empty state copy is shown.
4. In browser devtools network tab, confirm telemetry source value is `upcoming_charges`.

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
5. Confirm `email.configured`, `email.provider`, and `email.fromAddress` are present.

Email:

1. Open `/tools` as an authenticated user and click `Send Test Email`.
2. Confirm success response instructs to check inbox/spam.
3. Trigger 4 sends within one hour and confirm the fourth request is rate-limited.
4. In Prisma Studio, verify `EmailDeliveryLog` rows are created with expected `templateName` and `status`.
5. Sign up a fresh account and verify an `EmailDeliveryLog` entry with `templateName=registration_verification` is created.
6. Trigger repeated resend attempts for the same account and confirm `registration_verification` rows stop increasing once rate-limited.
7. From `/tools`, issue an invite and verify an `EmailDeliveryLog` entry with `templateName=invite_issuance` is created.
8. Disable provider key (or force `MAIL_PROVIDER=console`) and issue another invite; confirm `/tools` shows fallback/manual-share status while still returning token/URL.
9. Set a subscription with `nextBillingDate` equal to today's date plus the user's `reminderDaysBefore`, run `Run Daily Batch`, and verify an `EmailDeliveryLog` row with `templateName=subscription_reminder` is created.
10. Run `Run Daily Batch` again on the same day and confirm reminder dedupe in output (no duplicate reminder send for the same user + billing cycle).

Deploy:

1. Merge to `main`.
2. Confirm Vercel build includes Prisma generate + migrate + build.
3. Confirm deployed `/status` and `/api/status`.
4. Confirm daily cron endpoint is invoked by Vercel and returns success.
5. Confirm `/tools` manual maintenance actions run successfully for testing.
6. Confirm maintenance output includes expired invite counts.
7. Confirm maintenance output includes pruned email delivery log counts.
8. Confirm maintenance output includes reminder due/sent/failed/deduped counts.

## Known gaps

- No automated integration tests yet.
- No e2e browser tests yet.
- No load testing yet.
