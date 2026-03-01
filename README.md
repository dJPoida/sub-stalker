# Sub Stalker

Next.js (App Router + TypeScript) starter for a subscription tracking app.

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
