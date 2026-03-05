# Learning Fields

## Definition

A learning field is a user-owned text field where the application stores each entered value and reuses prior values as suggestions in future forms and filters.

Key properties:

- Scoped per authenticated user.
- Suggestions come from that user’s historical values only.
- Users can always type a new value.
- New values become suggestions automatically after save.

## Subscription design

Current subscription learning fields:

- `paymentMethod` (required)
- `signedUpBy` (optional)

Behavior:

1. Create/edit subscription forms use free-text inputs with datalist suggestions.
2. Suggestion lists are loaded from distinct values in the signed-in user’s existing subscriptions.
3. Subscriptions list supports direct filtering by both fields.
4. Global search on `/subscriptions` also matches both fields.

Non-learning subscription metadata (stored on the same entity, but not suggestion-backed):

- `billingConsoleUrl` (optional)
- `cancelSubscriptionUrl` (optional)
- `billingHistoryUrl` (optional)
- `notesMarkdown` (optional markdown content, edited via WYSIWYG markdown editor)

## Data model

`Subscription` stores both learning fields directly:

- `paymentMethod String` (required)
- `signedUpBy String?` (optional)

Indexes support user-scoped filtering:

- `@@index([userId, paymentMethod])`
- `@@index([userId, signedUpBy])`

## Migration strategy

When replacing the previous optional `provider` field:

1. Add `paymentMethod` as nullable.
2. Backfill from `provider` when available.
3. Fallback to `"Unknown"` for existing rows without a provider.
4. Set `paymentMethod` to required.
5. Drop `provider`.

## Future evolution

If learning fields expand beyond subscriptions, move suggestion history into a shared table (for example `LearningValue`) keyed by `(userId, domain, fieldKey, value)` while keeping entity-level fields for query simplicity.
