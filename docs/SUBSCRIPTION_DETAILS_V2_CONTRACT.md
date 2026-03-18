# Subscription Details V2 Contract

`lib/subscription-details.ts` now exposes a backward-compatible payload with:

- Legacy flat fields used by the current modal.
- A nested `v2` contract for the operational modal redesign.

## Contract goals

The V2 payload is designed so new sections can render safely even when the backend only has partial data.

- Every major section exposes a `state` of `ready`, `partial`, or `empty`.
- Alert derivation returns both rendered `items` and per-rule `ruleOutcomes`.
- Action capability objects define whether an action is enabled, what permission it assumes, and which server validations must exist before the UI can invoke it.

## Section map

- `v2.header`: service identity, lifecycle status, category, and status chips.
- `v2.summaryStrip`: current price, renewal summary, payment summary, and reminder status.
- `v2.attentionNeeded`: derived alert items plus deterministic rule evaluation results.
- `v2.actionBar`: header actions, quick actions, and footer navigation actions.
- `v2.billingDetails`: billing cadence, billing date, payment method, spend summary, and trial metadata.
- `v2.notesCategory`: inferred category, notes markdown, owner metadata, and tags.
- `v2.paymentHistory`: timeline items plus the upcoming renewal callout.
- `v2.management`: management URLs and internal identifiers.
- `v2.lifecycle`: lifecycle stage, dates, cancellation metadata, and review-state support status.

## Lifecycle derivation

Lifecycle stage is derived deterministically from `isActive` and `nextBillingDate`.

- `active`: `isActive === true`
- `cancel_scheduled`: `isActive === false` and `nextBillingDate` is still in the future
- `canceled`: `isActive === false` and there is no future effective date left

This rule is intentionally simple so downstream UI labels and chips stay stable without hidden server heuristics.

## Alert derivation

The contract currently evaluates three machine-readable alert rules.

### `promo_ending_soon`

Matched only when all of the following are true:

- the subscription is active
- the name contains a promo/trial hint keyword
- `nextBillingDate` exists
- the account age is at most 45 days
- the next renewal is within 7 days

If a promo-like subscription is missing `nextBillingDate`, the rule returns `insufficient_data` instead of silently disappearing.

### `price_increase_imminent`

Requires:

- `nextBillingDate`
- `projectedNextChargeAmountCents`

It matches when the projected next charge is higher than the current amount and the renewal is within 7 days.

### `higher_price_renewal`

Requires:

- `nextBillingDate`
- `lastChargedAmountCents`
- `projectedNextChargeAmountCents`

It matches when the projected renewal amount exceeds the last captured charge amount.

## Action policy

Each action advertises:

- `kind`: `client`, `navigate`, or `mutate`
- `availability`: `enabled` or `disabled`
- `permission`: currently `owner_read` or `owner_write`
- `requiresConfirmation`
- `serverValidation`: explicit backend checks required before wiring the action

Current policy:

- `edit_subscription`: client-triggered, owner-write, no confirmation
- `mark_cancelled`: mutating, owner-write, confirmation required
- `open_management_page`: navigate-only, owner-read, requires a valid stored management URL
- `change_alert`: currently disabled because alerts are only persisted at account level
- `mark_for_review`: currently disabled because no review-state field exists yet
- `cancel_soon`: navigate-only, owner-write, requires an active subscription plus a valid cancel URL
- `view_billing_history`: navigate-only, owner-read, requires a valid history URL

## Partial-data expectations

The V2 contract is expected to degrade safely when fields are missing.

- Missing reminder settings fall back to the app default of 3 days before renewal.
- Missing price comparison signals do not remove the rule entirely; they produce `insufficient_data`.
- Missing notes keep `notesCategory.state = "partial"` while still returning inferred category data.
- Missing management URLs keep the management panel renderable while disabling navigation actions.

This contract intentionally exposes capability gaps instead of hiding them, so later issues can implement sections without redefining payload semantics.
