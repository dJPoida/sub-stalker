# Status Contract

## Endpoints

- Human: `/status`
- Machine: `/api/status`

## `/api/status` response contract

Top-level shape:

```json
{
  "app": "Subscription Stalker",
  "status": "ok | degraded",
  "database": {},
  "email": {},
  "emailConfigured": "boolean",
  "metrics": {
    "users": null,
    "subscriptions": null,
    "monthlySpend": null
  }
}
```

`database` fields:

- `connected`: boolean
- `latencyMs`: number or null
- `host`: string or null
- `port`: number or null
- `checkedAt`: ISO timestamp string
- `envSource`: string
- `error`: optional string
- `metadata`:
  - `serverVersion`: string or null
  - `appliedMigrations`: number or null
  - `latestMigration`: string or null
  - `latestMigrationAppliedAt`: ISO timestamp or null
  - `pendingMigrations`: number or null
  - `error`: optional string

`email` fields:

- `configured`: boolean (`MAIL_PROVIDER_API_KEY` presence)
- `provider`: string (`resend`, `console`, `mock`)
- `fromAddress`: string (`not configured` when unset)

`emailConfigured` field:

- legacy/shortcut top-level boolean mirror of `email.configured`

## Health semantics

`status = "ok"` when:

- `database.connected === true`
- no `database.metadata.error`

Otherwise:

- `status = "degraded"`
- HTTP status code `503`

If `status = "ok"`:

- HTTP status code `200`

## Stability guidance

- Keep existing field names stable when adding new status data.
- Add fields, do not rename/remove fields without explicit migration note.
- Preserve `503` behavior for degraded status for uptime tooling compatibility.
