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

