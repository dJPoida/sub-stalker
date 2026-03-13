# Sub Stalker

Next.js (App Router + TypeScript) starter for a subscription tracking app.

## Project mission and original requirements (for future AI agents)

This section documents the core task this project is pursuing so future agents can continue work with the same intent.

### Product intent

Subscription Stalker is a web app that helps users keep track of recurring subscriptions, understand upcoming charges, and reduce wasted spend.

### Original requirements summary

1. Build a subscription tracking application where users can manage their subscriptions from a single dashboard.
2. Support core user journeys for:
   - authentication (sign in/sign up)
   - viewing subscriptions
   - updating account/settings preferences
3. Provide a status/health surface for operational checks:
   - human-readable status page at `/status`
   - machine-readable status endpoint at `/api/status`
4. Ensure the app is deployable to Vercel with environment-driven configuration.
5. Maintain a clean, incremental foundation so future work can add:
   - concrete subscription CRUD
   - billing/renewal visibility
   - notifications/reminders
   - richer product metrics

### Working guidance for future agents

- Treat this repository as an evolving MVP: prefer small, testable steps.
- Preserve and improve operational visibility (`/status`, `/api/status`) as features expand.
- Keep environment variables and deployment docs up to date when adding integrations.
- Documentation sync is mandatory: every feature or behavior change must update relevant docs in the same change set before handoff/merge (`README.md`, `docs/ARCHITECTURE.md`, `docs/HANDOFF.md`, `docs/TEST_PLAN.md`, and other affected docs).
- When implementing new features, align changes to the mission above (help users track, understand, and act on subscription costs).

## Prerequisites

- Node.js 18.17+ (Node.js 20 recommended)
- npm 9+
- Docker Desktop (for local Postgres + migration testing)
- GitHub MCP configured if you use AI agents for backlog/TODO handling
- On Windows, run local project commands in Git Bash (`C:\Program Files\Git\bin\bash.exe`) instead of PowerShell to avoid script execution-policy issues with `npm`.

## Backlog and TODO workflow

- GitHub Issues is the source of truth for backlog tasks, TODO follow-ups, and defects.
- For AI-assisted development, contributors should use the GitHub MCP server to create/update issues while working.
- Avoid leaving untracked TODOs without a linked issue.
- Default execution flow for AI agents when a user requests work:
  1. Check for an existing/overlapping issue.
  2. Create a new issue if one does not exist.
  3. If execution was not explicit, confirm whether the request is backlog-only or implementation now.
  4. If implementing, create a branch first.
  5. Implement the fix.
  6. Commit and push/publish the branch.
  7. Raise a pull request.
- See `AGENTS.md` for AI-specific workflow requirements.

## Favicon and app icons

- Source design brief and prompt live at `docs/branding/favicon.md`.
- Canonical source image is `docs/branding/favicon-source.png`.
- This app expects these committed icon outputs in `public/`:
  - `favicon.ico`
  - `favicon-16x16.png`
  - `favicon-32x32.png`
  - `apple-touch-icon.png`
  - `android-chrome-192x192.png`
  - `android-chrome-512x512.png`
  - `android-chrome-maskable-192x192.png`
  - `android-chrome-maskable-512x512.png`
  - `safari-pinned-tab.svg`
  - `site.webmanifest`
- Regeneration workflow:
  1. Create/update a 1024x1024 source icon using the prompt in `docs/branding/favicon.md`.
  2. Run the source through a favicon generator workflow (for example, RealFaviconGenerator).
  3. Keep the exact filenames above so Next.js metadata links remain valid.

## Environment variables

Next.js automatically loads `.env.local` for local development and Vercel project environment variables in deployed environments.

1. Copy the example:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in required keys:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `CRON_SECRET`
- `MAIL_PROVIDER_API_KEY`
- `MAIL_FROM_ADDRESS`
- `MAIL_FROM_NAME` (optional; defaults to `Sub Stalker`)
- `MAIL_PROVIDER` (optional; `resend`, `console`, or `mock`)
- `EMAIL_DELIVERY_LOG_RETENTION_DAYS` (optional; defaults to `90`)
- `INVITES_REQUIRED` (optional; set to `true` to enforce invite-only sign-up)

## Local database and Prisma migrations

This repo includes a local Postgres container (`docker-compose.yml`) and Prisma schema/migrations (`prisma/`).

Default local connection:

```env
DATABASE_URL="postgresql://sub_stalker:sub_stalker@localhost:5433/sub_stalker?schema=public"
DIRECT_URL="postgresql://sub_stalker:sub_stalker@localhost:5433/sub_stalker?schema=public"
AUTH_SECRET="replace-with-a-random-secret"
CRON_SECRET="replace-with-a-random-secret"
MAIL_PROVIDER_API_KEY="replace-with-provider-key"
MAIL_PROVIDER="resend"
MAIL_FROM_ADDRESS="onboarding@resend.dev"
MAIL_FROM_NAME="Sub Stalker"
EMAIL_DELIVERY_LOG_RETENTION_DAYS="90"
INVITES_REQUIRED="false"
```

Common local workflow:

```bash
npm install
npm run db:up
npm run db:migrate -- --name init
npm run prisma:generate
npm run dev
```

Useful commands:

- `npm run db:down` to stop containers
- `npm run db:logs` to tail Postgres logs
- `npm run db:reset` to reset local DB during development
- `npm run db:studio` to browse data via Prisma Studio

## Status page

- Visit `/status` to view a simple system health page.
- Use `/api/status` for JSON output suitable for uptime checks.
- Database connectivity is checked via a TCP probe to the `DATABASE_URL` host/port.
- Status output also includes database version and Prisma migration currency (applied/pending + latest migration).
- Status output includes email readiness (`email.configured`, `email.provider`, `email.fromAddress`).

## Email service

- Email delivery is implemented via `lib/mail` with a provider-agnostic `sendEmail` interface.
- Current provider path:
  - `resend` when `MAIL_PROVIDER_API_KEY` is set
  - `console` no-op fallback when API key is missing
  - `mock` provider for automated tests (`MAIL_PROVIDER=mock`)
- Email templates are authored with React Email in `lib/mail/templates/`:
  - test email
  - invite issuance
  - registration verification
  - subscription reminder
- Manual validation workflow:
  - go to `/tools`
  - use `Send Test Email` to send to the authenticated account email
  - endpoint is rate-limited to 3 sends per user per hour
- Delivery attempts are recorded in Prisma `EmailDeliveryLog` (`SENT`, `FAILED`, `SKIPPED`).
- Reminder dispatch dedupe state is recorded in Prisma `SubscriptionReminderDispatch` (unique per `userId + billingDateKey`).
- Invite issuance from `/tools` attempts immediate email delivery and falls back to manual share when provider is unavailable or send fails.
- Registration sign-up now issues single-use verification links, logs delivery as `registration_verification`, and rate-limits resend attempts per recipient.
- Daily maintenance dispatches due subscription reminder batches using each user's saved reminder settings.
- Daily maintenance prunes stale email logs using `EMAIL_DELIVERY_LOG_RETENTION_DAYS`.
- Local template preview command:
  - `npm run email:dev`

### Free-tier constraints and growth limits

- Resend free tier is intended for MVP scale (100 emails/day, 3,000/month).
- Current safeguards:
  - test email endpoint limit: 3/user/hour
  - no-op fallback when provider key is missing
- As usage grows, add global send budgeting and provider failover before expanding reminder volumes.

### Database URL troubleshooting

If `/status` reports `Database URL is not a valid URL`:

- Ensure the value is a full `postgres://` or `postgresql://` connection string.
- Remove wrapping quotes (use `postgres://...` not `"postgres://..."`).
- Avoid smart/curly quotes copied from docs or chat tools (`"..."` and `'...'` only).
- URL-encode special characters in DB username/password (`@`, `#`, `%`, `:`) before placing them in the URL.
- For Supabase: use pooled URL for `DATABASE_URL` and direct connection URL for `DIRECT_URL` so migrations do not stall.
- If runtime logs show `prepared statement "s0" already exists`, ensure runtime uses a pooler-compatible URL. This app auto-applies `pgbouncer=true` and `connection_limit=1` for Supabase pooler hosts at runtime.
- The app will read the first available value from:
  - `DATABASE_URL`
  - `SUB_STALKER_STORAGE_POSTGRES_URL`
  - `SUB_STALKER_STORAGE_POSTGRES_PRISMA_URL`
  - `POSTGRES_URL`

## GitHub PR automation (hands-off mode)

This repo includes:

- `.github/workflows/ci.yml` to run typecheck, lint, and build on PRs and `main`
- `.github/workflows/automerge.yml` to auto-enable squash merge for trusted PR authors or PRs labeled `automerge`
- `vercel.json` + `scripts/vercel-build.mjs` to run production DB migrations during Vercel production builds
- Vercel cron config to run `/api/internal/daily-maintenance` once per day

### One-time setup on your side

1. Connect git remote from this environment (if not already connected):

   ```bash
   git remote add origin <your-github-repo-url>
   git push -u origin work
   ```

2. Enable GitHub auto-merge:
   - Repo Settings -> General -> Pull Requests -> Allow auto-merge
3. Set branch protection for `main`:
   - Repo Settings -> Branches -> Add branch protection rule for `main`
   - Require pull request before merging
   - Require status checks to pass before merging
   - Select required check: `CI / checks`
   - Keep "Require approval" disabled if you want zero manual review
4. Update trusted bot usernames in `.github/workflows/automerge.yml`:
   - Edit `github.event.pull_request.user.login == 'copilot-swe-agent'` to match the PR author account your agent uses
   - Or rely on adding `automerge` label to PRs
5. Optional: restrict automerge to labels only:
   - Remove username checks and keep only `contains(..., 'automerge')`

### Expected behavior

- Agent opens PR.
- CI runs (`typecheck`, `lint`, `build`).
- `automerge.yml` enables auto-merge when trust condition matches.
- PR is squash-merged automatically when required checks pass.
- Vercel deploys from `main` automatically.
- During production deploys (`VERCEL_ENV=production`), Prisma migrations are applied via `prisma migrate deploy` before `next build`.
- Vercel cron runs daily maintenance once per day.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Basic auth (MVP)

- Sign up at `/auth/sign-up` (email + password, minimum 8 chars).
- New accounts must verify email ownership before a session can be created.
- Optional invitation-only mode:
  - set `INVITES_REQUIRED=true` to require valid invite token on sign-up.
  - invite token must be pending, unexpired, and tied to the same normalized email.
  - `/tools` invite issuance now issues and attempts email send in one step; if email cannot be sent, manual token/URL share remains available.
  - keep `INVITES_REQUIRED=false` for rollback to open sign-up.
- Sign in at `/auth/sign-in`.
- Verification completion lives at `/auth/verify`, and resend/self-service status lives at `/auth/verify/requested`.
- Session is stored as an HTTP-only cookie with an opaque token backed by the `Session` database table.
- Session token hashes are keyed with `AUTH_SECRET`.
- Session policy:
  - absolute TTL: 7 days
  - idle TTL: 3 days
  - max concurrent sessions per user: 5
  - sign-out revokes current session only
- Sign-in is rate limited by email + IP (5 attempts per 15 minutes, then 30-minute block).
- Unverified accounts cannot complete sign-in or keep an authenticated session until verification succeeds.
- Auth server actions enforce same-origin request checks.
- Expired sessions are pruned on sign-in.
- Manual maintenance actions are available at `/tools` for test runs.
- `/tools` includes operational invite issuance (manual copy/share of one-time invite links).
- `/tools` includes a `Send Test Email` action for operational email verification.
- `/subscriptions` and `/settings` require authentication.
- `/subscriptions` provides modal add/edit flows with client-side search, status filtering, and sort controls.
- subscription details are available in a shared read-only modal opened from:
  - dashboard -> `Upcoming Charges`
  - subscriptions list -> subscription card row (click, Enter, or Space)
- the details modal fetches fresh data on open via `/api/subscriptions/[subscriptionId]/details` and includes loading, empty, and error states.
- modal telemetry events are posted to `/api/telemetry` for open/close/view-history interactions with source context.
- `/subscriptions` learning fields:
  - required `payment method` (free-text + learned suggestions)
  - optional `signed up by` (free-text + learned suggestions)
  - both fields are filterable in the subscriptions list
- `/subscriptions` billing workflow metadata:
  - optional `billing console / manage plan` URL
  - optional `cancel subscription` URL
  - optional `billing history` URL
  - optional `notes and comments` markdown field edited with a WYSIWYG markdown editor
  - URL fields accept `http://` and `https://` only
- `/settings` uses action-first controls:
  - simple preferences auto-save inline on change (display mode, default currency, reminder toggle, reminder lead time)
  - account details are edited in a dedicated modal dialog
- `/settings` persists default currency, reminder controls, display mode (`Device`, `Light`, `Dark`), and account display name.
- Display mode behavior:
  - `Device` follows OS/browser `prefers-color-scheme`.
  - `Light` and `Dark` force an explicit app theme override.

## Additional docs

- `docs/HANDOFF.md`
- `docs/ARCHITECTURE.md`
- `docs/OPERATIONS.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- `docs/TEST_PLAN.md`
- `docs/STATUS_CONTRACT.md`
- `docs/LEARNING_FIELDS.md`

## Production build locally

```bash
npm run build
npm run start
```

## Deploy to Vercel

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Import the project in Vercel.
3. In Project Settings -> Environment Variables, set:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `AUTH_SECRET`
   - `CRON_SECRET`
   - `MAIL_PROVIDER_API_KEY`
   - `MAIL_FROM_ADDRESS`
   - `MAIL_FROM_NAME` (optional)
   - `MAIL_PROVIDER` (optional; use `mock` in automated tests)
   - `EMAIL_DELIVERY_LOG_RETENTION_DAYS` (optional)
   - `INVITES_REQUIRED` (optional, `true` for invite-only sign-up)
4. Ensure your Vercel Production environment has:
   - `DATABASE_URL` for runtime app traffic (pooler URL is acceptable)
   - `DIRECT_URL` for Prisma migrations (must be a direct Postgres connection, not the pooler)
5. Deploy.

Vercel will run `npm install` and then `npm run build:vercel` (configured in `vercel.json`), which performs:

1. `prisma generate`
2. `prisma migrate deploy` (production only)
3. `next build`

Vercel cron:

- Calls `GET /api/internal/daily-maintenance` once per day.
- Uses `CRON_SECRET` via `Authorization: Bearer <CRON_SECRET>`.
