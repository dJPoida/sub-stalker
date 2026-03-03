# Decisions

## D-001: Prisma ORM for MVP data layer

Date: 2026-03-02

Decision:

- Use Prisma with Postgres for schema and migration management.

Rationale:

- Fast iteration for MVP.
- Clear migration history in repo.
- Strong TypeScript support.

## D-002: DB-backed sessions over stateless signed cookie payload

Date: 2026-03-03

Decision:

- Store session token hashes in DB `Session` table.
- Cookie contains opaque token only.

Rationale:

- Supports server-side session revocation.
- Better future control (device/session management).
- Simpler incident response (forced sign-out possible).

## D-003: Migrate DB during production build

Date: 2026-03-03

Decision:

- Run `prisma migrate deploy` in Vercel production build path.

Rationale:

- Keeps app schema and deployed code in lockstep on `main` merges.
- Removes manual migration step for routine deploys.

Tradeoff:

- Build depends on DB connectivity.

## D-004: Run `prisma generate` in build pipeline

Date: 2026-03-03

Decision:

- Execute `npx prisma generate` before migrations/build in `build:vercel`.

Rationale:

- Avoids stale Prisma Client from cached dependencies in Vercel builds.

## D-005: Session security controls in-app

Date: 2026-03-03

Decision:

- Add same-origin checks for auth actions.
- Add sign-in rate limiting by email+IP.
- Use keyed token hashing (`AUTH_SECRET`) for session token lookup.

Rationale:

- Reduces CSRF risk on auth actions.
- Slows brute-force attempts.
- Protects against unhashed token lookup reuse across environments.

## D-006: Session lifecycle enforcement policy

Date: 2026-03-03

Decision:

- Absolute session TTL: 7 days.
- Idle TTL: 3 days.
- Max concurrent sessions per user: 5.
- Current-session revocation on sign-out.

Rationale:

- Balanced usability and security for MVP.
- Prevents unlimited session accumulation.

## D-007: Scheduled auth maintenance cleanup

Date: 2026-03-03

Decision:

- Add a once-daily cron endpoint to run batched maintenance jobs.

Rationale:

- Matches platform cron limits while keeping routine maintenance automated.
- Keeps auth tables bounded even when sign-ins are infrequent.
