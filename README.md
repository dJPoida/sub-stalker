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
- When implementing new features, align changes to the mission above (help users track, understand, and act on subscription costs).

## Prerequisites

- Node.js 18.17+ (Node.js 20 recommended)
- npm 9+
- Docker Desktop (for local Postgres + migration testing)

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

## Local database and Prisma migrations

This repo includes a local Postgres container (`docker-compose.yml`) and Prisma schema/migrations (`prisma/`).

Default local connection:

```env
DATABASE_URL="postgresql://sub_stalker:sub_stalker@localhost:5433/sub_stalker?schema=public"
DIRECT_URL="postgresql://sub_stalker:sub_stalker@localhost:5433/sub_stalker?schema=public"
AUTH_SECRET="replace-with-a-random-secret"
CRON_SECRET="replace-with-a-random-secret"
MAIL_PROVIDER_API_KEY="replace-with-provider-key"
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
- Vercel cron config to run `/api/internal/session-cleanup` hourly

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
- Vercel cron prunes expired sessions and stale sign-in attempts hourly.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Basic auth (MVP)

- Sign up at `/auth/sign-up` (email + password, minimum 8 chars).
- Sign in at `/auth/sign-in`.
- Session is stored as an HTTP-only cookie with an opaque token backed by the `Session` database table.
- Session token hashes are keyed with `AUTH_SECRET`.
- Session policy:
  - absolute TTL: 7 days
  - idle TTL: 3 days
  - max concurrent sessions per user: 5
  - sign-out revokes current session only
- Sign-in is rate limited by email + IP (5 attempts per 15 minutes, then 30-minute block).
- Auth server actions enforce same-origin request checks.
- Expired sessions are pruned on sign-in and by hourly cron.
- `/subscriptions` and `/settings` require authentication.

## Additional docs

- `docs/HANDOFF.md`
- `docs/ARCHITECTURE.md`
- `docs/OPERATIONS.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- `docs/TEST_PLAN.md`
- `docs/STATUS_CONTRACT.md`

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
4. Ensure your Vercel Production environment has:
   - `DATABASE_URL` for runtime app traffic (pooler URL is acceptable)
   - `DIRECT_URL` for Prisma migrations (must be a direct Postgres connection, not the pooler)
5. Deploy.

Vercel will run `npm install` and then `npm run build:vercel` (configured in `vercel.json`), which performs:

1. `prisma generate`
2. `prisma migrate deploy` (production only)
3. `next build`

Vercel cron:

- Calls `GET /api/internal/session-cleanup` every hour.
- Uses `CRON_SECRET` via `Authorization: Bearer <CRON_SECRET>`.
