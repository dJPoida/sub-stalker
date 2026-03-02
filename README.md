# Sub Stalker

Next.js (App Router + TypeScript) starter for a subscription tracking app.

## Project mission and original requirements (for future AI agents)

This section documents the core task this project is pursuing so future agents can continue work with the same intent.

### Product intent

Subscription Stalker is a web app that helps users keep track of recurring subscriptions, understand upcoming charges, and reduce wasted spend.

### Original requirements summary

1. Build a **subscription tracking application** where users can manage their subscriptions from a single dashboard.
2. Support core user journeys for:
   - authentication (sign in/sign up),
   - viewing subscriptions,
   - updating account/settings preferences.
3. Provide a **status/health surface** for operational checks:
   - human-readable status page at `/status`,
   - machine-readable status endpoint at `/api/status`.
4. Ensure the app is deployable to Vercel with environment-driven configuration.
5. Maintain a clean, incremental foundation so future work can add:
   - concrete subscription CRUD,
   - billing/renewal visibility,
   - notifications/reminders,
   - richer product metrics.

### Working guidance for future agents

- Treat this repository as an evolving MVP: prefer small, testable steps.
- Preserve and improve operational visibility (`/status`, `/api/status`) as features expand.
- Keep environment variables and deployment docs up to date when adding integrations.
- When implementing new features, align changes to the mission above (help users track, understand, and act on subscription costs).

## Prerequisites

- Node.js 18.17+ (Node.js 20 recommended)
- npm 9+

## Environment variables

Next.js automatically loads `.env.local` for local development and Vercel project environment variables in deployed environments.

1. Copy the example:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in required keys:

- `DATABASE_URL`
- `AUTH_SECRET`
- `MAIL_PROVIDER_API_KEY`


## Status page

- Visit `/status` to view a simple system health page.
- Use `/api/status` for JSON output suitable for uptime checks.
- Database connectivity is checked via a TCP probe to the `DATABASE_URL` host/port.


### Database URL troubleshooting

If `/status` reports `Database URL is not a valid URL`:
- Ensure the value in Vercel is a full `postgres://` or `postgresql://` connection string.
- Remove wrapping quotes (for example, use `postgres://...` not `"postgres://..."`).
- The app will read the first available value from: `DATABASE_URL`, `SUB_STALKER_STORAGE_POSTGRES_URL`, `SUB_STALKER_STORAGE_POSTGRES_PRISMA_URL`, or `POSTGRES_URL`.

## GitHub PR automation (hands-off mode)

This repo includes:
- `.github/workflows/ci.yml` to run typecheck, lint, and build on PRs and `main`.
- `.github/workflows/automerge.yml` to auto-enable squash merge for trusted PR authors or PRs labeled `automerge`.

### One-time setup on your side

1. **Connect git remote from this environment** (if not already connected):
   ```bash
   git remote add origin <your-github-repo-url>
   git push -u origin work
   ```
2. **Enable GitHub auto-merge**:
   - Repo **Settings → General → Pull Requests → Allow auto-merge**.
3. **Set branch protection for `main`**:
   - Repo **Settings → Branches → Add branch protection rule** for `main`.
   - Require pull request before merging.
   - Require status checks to pass before merging.
   - Select required check: `CI / checks`.
   - Keep “Require approval” disabled if you want zero manual review.
4. **Update trusted bot usernames** in `.github/workflows/automerge.yml`:
   - Edit `github.event.pull_request.user.login == 'copilot-swe-agent'` to match the PR author account your agent uses.
   - Or rely on adding `automerge` label to PRs.
5. **(Optional) Restrict automerge to labels only**:
   - Remove username checks and keep only `contains(..., 'automerge')`.

### Expected behavior

- Agent opens PR.
- CI runs (`typecheck`, `lint`, `build`).
- `automerge.yml` enables auto-merge when trust condition matches.
- PR is squash-merged automatically when required checks pass.
- Vercel deploys from `main` automatically.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build locally

```bash
npm run build
npm run start
```

## Deploy to Vercel

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Import the project in Vercel.
3. In **Project Settings → Environment Variables**, set:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `MAIL_PROVIDER_API_KEY`
4. Deploy.

Vercel will run `npm install` and `npm run build` automatically.
