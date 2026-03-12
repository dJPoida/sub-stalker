# Roadmap

## P0: Subscription CRUD (completed)

Goal:

- Let authenticated users create, list, edit, deactivate subscriptions.

Acceptance criteria:

- CRUD available to signed-in users only.
- Data persisted in `Subscription` table.
- Basic validation for amount, currency, billing interval.
- UI shows empty state and list state.

## P1: Settings persistence (completed)

Goal:

- Make `/settings` actually read/write `UserSettings`.

Acceptance criteria:

- Persist `defaultCurrency`.
- Persist reminder preferences.
- Persist display mode preferences (`DEVICE`, `LIGHT`, `DARK`).
- Pre-fill form from DB values.

## P2: Dashboard signal (completed)

Goal:

- Show practical summary on `/` dashboard.

Acceptance criteria:

- Next upcoming renewal date.
- Active subscription count.
- Monthly estimated spend summary.

## P3: Notification baseline (completed)

Goal:

- Prepare reminder event pipeline.

Acceptance criteria:

- Define reminder query job.
- Integrate mail provider wrapper.
- Add delivery attempt logging model.

## P4: Form submit UX feedback (completed)

Goal:

- Improve perceived responsiveness and prevent duplicate submits while server actions are in flight.

Acceptance criteria:

- Primary submit buttons show a loading/in-progress state during request execution.
- Relevant form inputs/buttons are temporarily disabled while pending.
- Users receive clear completion/error feedback after submit.

## P5: Subscription learning fields (completed)

Goal:

- Capture reusable payment-source metadata and signup-attribution metadata for subscriptions.

Acceptance criteria:

- `paymentMethod` is required when creating/editing subscriptions.
- `signedUpBy` is available as an optional field.
- Both fields suggest previously used values for the authenticated user.
- Subscriptions list supports filtering by both fields.

## P6: Subscription billing links + notes editor (completed)

Goal:

- Capture optional operational links and free-form notes for each subscription.

Acceptance criteria:

- Subscriptions support optional `billingConsoleUrl`, `cancelSubscriptionUrl`, and `billingHistoryUrl`.
- Subscriptions support optional `notesMarkdown`.
- Notes are edited via a WYSIWYG markdown editor in create/edit flows.
- Server actions validate URL fields when provided (`http/https` only).

## P7: Invitation-only onboarding (completed)

Goal:

- Move sign-up from open registration to optional invite-only gating.

Acceptance criteria:

- Invite registry exists separately from user data.
- `/tools` can issue single-use invite links for manual sharing.
- Sign-up enforces invite token + email match when `INVITES_REQUIRED=true`.
- Invite consumption is atomic and safe under concurrent registration attempts.

## P8: Household account linking and sharing

Goal:

- Let users link family/spouse/partner accounts so subscriptions can be shared with clear ownership and permissions.

Summary:

- Introduce a household model where users can invite and link trusted accounts, choose whether each subscription is personal or shared, and enforce role-based access so shared data stays collaborative but controlled.
- Tracking issue: #65.

Acceptance criteria:

- Users can create a household and invite another account through a secure linking flow.
- Invited users can accept the invite and join the linked household.
- Shared subscriptions are visible to authorized household members.
- Personal subscriptions remain private to the owner account.
- Permission rules are enforced for create/update/delete actions on shared subscriptions.
- Shared records retain audit metadata showing who made changes.
