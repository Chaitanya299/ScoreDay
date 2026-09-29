# ADR-0010: Host on Railway with SQLite on a volume and shared-token API auth

## Status
Accepted.

## Context
The macOS app depended on a local `next dev` server that repeatedly became
unreachable: it crashed after days (dev-mode compile of `/_not-found` hit
`RangeError: Invalid array length`), stopped on sleep/reboot, and lost its files
when the project folder was deleted. Outages looked like data loss. The API had
no authentication, so it could not simply be exposed publicly.

## Decision
- Run the production build (`next build` + `next start`) 24/7 on Railway,
  single service, 1 replica, restart on failure (`railway.json`).
- Keep SQLite: the DB lives on a Railway volume mounted at `/data`
  (`DATABASE_URL=file:/data/prod.db`). `start:prod` runs
  `prisma migrate deploy` before `next start`; `prisma` is a runtime dependency.
- `middleware.ts` requires `Authorization: Bearer <API_TOKEN>` on `/api/*`
  whenever `API_TOKEN` is set (constant-time compare); unset keeps local dev open.
  The macOS app stores the token in the Keychain.
- Data moves via `npm run db:export` → `npm run db:import` →
  `POST /api/admin/restore`: a one-shot, lossless insert that is disabled without
  `API_TOKEN` and refuses a non-empty database.

## Alternatives considered
- Vercel / serverless: no persistent filesystem for SQLite.
- Managed Postgres: sturdier and multi-writer, but a provider migration plus data
  move with no benefit for a single user today.
- Keep the local dev server: not durable (the root cause of the outages).
- Deploy without auth: the public URL would expose read/write/delete of all data.
- Render / Fly: same category; Railway chosen for the simplest volume + GitHub
  deploy flow.

## Consequences
- Exactly one instance can own the SQLite file; no horizontal scaling. Volume
  backups must be enabled in Railway.
- One shared secret, no per-user accounts; rotating it means changing the
  Railway variable and the token in the app's Settings.
- Importing through the normal API is lossy (it rejects past due dates and
  completing inactive tasks), hence the dedicated restore endpoint.
- `native/` is excluded from `tsconfig.json` and Tailwind (`@source not`) so native
  build output can never again crash `next dev` or run `next build` out of memory.
- Upgrade path if needs grow: Postgres (Prisma provider switch + export/import).
