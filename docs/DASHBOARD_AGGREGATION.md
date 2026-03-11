# Dashboard Aggregation Contract

The dashboard aggregation contract is built in `lib/dashboard.ts` and exposed through `GET /api/dashboard`.

## Date windows

- Renewals KPI window: next `7` days (`DASHBOARD_RENEWALS_WINDOW_DAYS`).
- Upcoming renewals list window: next `30` days (`DASHBOARD_UPCOMING_RENEWALS_WINDOW_DAYS`).
- Window checks are inclusive at the upper bound (`<= window length`).

## Normalization rules

- Weekly to monthly: `amountCents * 4.33` (rounded to nearest cent).
- Monthly to monthly: `amountCents`.
- Yearly to monthly: `amountCents / 12` (rounded to nearest cent).
- Weekly to annual: `amountCents * 52`.
- Monthly to annual: `amountCents * 12`.
- Yearly to annual: `amountCents`.
- `CUSTOM` cadence subscriptions are excluded from normalized monthly and annual totals.

## Currency handling

- No FX conversion is applied.
- Normalized KPI totals return a single `amountCents` only when all contributing subscriptions share one currency.
- When multiple currencies are present, KPI totals are returned in `totalsByCurrency` and single-currency fields are `null`.

## Potential savings rules

- Rule 1 (`duplicate_overlap`): for active subscriptions sharing canonical service name and currency, keep the lowest monthly-equivalent entry and treat the remaining entries as overlap savings.
- Rule 2 (`potentially_unused_subscription`): active subscriptions are flagged when they have an upcoming renewal in 30 days, account age is at least 120 days, and last update is at least 90 days old.
- To avoid double counting, subscriptions that are part of duplicate groups are excluded from the potentially-unused rule.
- Savings totals are grouped by currency with no FX conversion.
- `CUSTOM` cadence subscriptions are excluded from savings opportunities because monthly normalization is undefined.

## Deterministic ordering

- `upcomingRenewals`: renewal date ascending, then name ascending.
- `attentionNeeded`: severity descending, then due date ascending, then title ascending.
- `topCostDrivers`: monthly equivalent descending, then currency ascending, then name ascending.
- `spendBreakdownByCategory`: max category monthly total descending, then subscription count descending, then category ascending.
- `potentialSavings.opportunities`: estimated monthly savings descending, then title ascending.
