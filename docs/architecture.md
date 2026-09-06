# Architecture — <!-- updated: 2026-08-27 -->

Only what a new engineer can't read off the code at a glance. Not a file listing,
not a call graph, not a dependency inventory.

## Entry points
- `npm run dev` → `next dev` (Next 15 app router) on localhost:3000
- `app/page.tsx` — Server component entry (fetches dashboard data)
- `app/api/**/route.ts` — Route Handler exports per HTTP verb (GET/POST/PUT/DELETE)
- `prisma/seed.ts` — demo data seed

## Module boundaries and ownership
- `app/` — pages (app router) and API routes; `page.tsx` for routes, `layout.tsx` for layout
- `components/` — reusable React pieces (`DashboardView`, `TaskForm`, `ProgressView`, `ui/Header`)
- `lib/` — server-side utilities (`prisma` singleton, `dates`, `scoring`, `recurrence`, `progress`, `streaks`, `taskValidation`)
- `prisma/` — schema, migrations, seed script; singleton from `lib/prisma`
- `docs/` — project documentation (architecture, decisions, state, learnings)
- `public/` — static assets
- `tests/` — vitest test files (+ Playwright E2E spec)

## Critical paths
- Dashboard scoring — `app/page.tsx` → `components/DashboardView` → `lib/scoring` → `lib/prisma`
- Task creation — `components/tasks/TaskForm.tsx` → `app/api/tasks/route.ts` (POST) → `lib/taskValidation` → `prisma`
- Completion recording — UI → `app/api/completions/route.ts` (POST) → `prisma` → `TaskCompletion`
- Progress — `app/progress/page.tsx` → `components/ProgressView` → `lib/progress` + `lib/streaks` → `lib/prisma`; client navigation refetches via `app/api/progress/{month,week,day}`
- Day detail — calendar/chart day → `DayDetailModal` → `app/api/progress/day` → `getDayDetail`
- Seed — `prisma/seed.ts` → `lib/prisma` → DB

## Conventions that differ from framework default
- Custom Prisma singleton (`lib/prisma.ts`) attached to global in dev
- Route Handler (`route.ts`) instead of older `pages/api/*.js`; no default export
- Tailwind v4 in package; RTK wrapper (`rtk`) available for concise terminal output
- Vitest used for testing instead of Jest
- Architecture Decision Records (ADR) practice in `docs/decisions/` (6 ADRs recorded)
- Zod adopted for request validation (replacing manual validation incrementally)
- nanoid used for client-side ID generation (instead of Prisma cuid)
- Deterministic date math in `lib/dates.ts` — all scoring/recurrence uses local YYYY-MM-DD strings
- Score math lives only in `lib/scoring.ts` — TaskCompletion.pointsEarned is immutable snapshot
- Historical performance math lives in `lib/progress.ts`, consistency math in `lib/streaks.ts` — both reuse the recurrence engine, never duplicate it
- Core metric distinction: Score = weighted points performance (earned/available); Completion Rate = completed/scheduled occurrences; Consistency = % of scheduled days finished at 100%
- WEEKLY_GOAL is one opportunity per Mon-Sun week: it never enters daily denominators, counts once in weekly totals, and shares the week's Monday occurrence key
- Certain-days (WEEKLY) tasks complete per calendar date — each scheduled day is its own occurrence
- Days with no scheduled tasks are "no data", never 0%
- Human-readable labels via formatRecurrence() — raw enum names never reach UI
- No XP/levels/badges/leaderboards anywhere — product, code, and docs (see ADR-0007)