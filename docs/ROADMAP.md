# Roadmap

## P0: Subscription CRUD (next)

Goal:

- Let authenticated users create, list, edit, deactivate subscriptions.

Acceptance criteria:

- CRUD available to signed-in users only.
- Data persisted in `Subscription` table.
- Basic validation for amount, currency, billing interval.
- UI shows empty state and list state.

## P1: Settings persistence

Goal:

- Make `/settings` actually read/write `UserSettings`.

Acceptance criteria:

- Persist `defaultCurrency`.
- Persist reminder preferences.
- Pre-fill form from DB values.

## P2: Dashboard signal

Goal:

- Show practical summary on `/` dashboard.

Acceptance criteria:

- Next upcoming renewal date.
- Active subscription count.
- Monthly estimated spend summary.

## P3: Notification baseline

Goal:

- Prepare reminder event pipeline.

Acceptance criteria:

- Define reminder query job.
- Integrate mail provider wrapper.
- Add delivery attempt logging model.

