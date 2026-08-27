# Architecture — <!-- updated: 2026-08-27 -->

Only what a new engineer can't read off the code at a glance. Not a file listing,
not a call graph, not a dependency inventory.

## Entry points
- `npm run dev` → `next dev` (Next 15 app router) on localhost:3000
- `app/api/**/route.ts` — Route Handler exports per HTTP verb (GET/POST/PUT)
- `prisma/seed.ts` — demo data seed

## Module boundaries and ownership
- `app/` — pages (app router) and API routes; `page.tsx` for routes, `layout.tsx` for layout
- `components/` — reusable React pieces (`DashboardView`, `TaskForm`, `ui/Header`)
- `lib/` — server-side utilities (`prisma` singleton, `dates`, `scoring`, `recurrence`, `taskValidation`)
- `prisma/` — schema, migrations, seed script; singleton from `lib/prisma`
- `docs/` — project documentation (architecture, decisions, state, learnings)
- `public/` — static assets
- `tests/` — vitest test files

## Critical paths
- Dashboard scoring — `app/page.tsx` → `components/DashboardView` → `lib/scoring` → `lib/prisma`
- Task creation — `components/TaskForm` → `app/api/tasks/route.ts` (POST) → `prisma`
- API read — `app/api/tasks/route.ts` (GET) → `lib/prisma` → response
- Seed — `prisma/seed.ts` → `lib/prisma` → DB
- Frequency validation — `components/tasks/TaskForm.tsx` → `lib/taskValidation.ts` → `lib/recurrence.ts`

## Conventions that differ from framework default
- Custom Prisma singleton (`lib/prisma.ts`) attached to global in dev
- Route Handler (`route.ts`) instead of older `pages/api/*.js`; no default export
- Tailwind v4 in package; RTK wrapper (`rtk`) available for concise terminal output
- Vitest used for testing instead of Jest
- Architecture Decision Records (ADR) practice in `docs/decisions/`
