# Architecture — <!-- updated: 2026-09-29 -->

Only what a new engineer can't read off the code at a glance. Not a file listing,
not a call graph, not a dependency inventory.

## Entry points
- `npm run dev` → `next dev` (Next 15 app router) on localhost:3000
- `app/page.tsx` — Server component entry (fetches dashboard data)
- `app/api/**/route.ts` — Route Handler exports per HTTP verb (GET/POST/PUT/DELETE)
- `prisma/seed.ts` — demo data seed
- `npm run start:prod` — production entry (Railway): `prisma migrate deploy && next start -p $PORT`
- `middleware.ts` — runs before every page and `/api/*` request (not static assets); secret guard when `API_TOKEN` is set
- `native/macOS` — SwiftUI Mac app; project generated from `project.yml` by XcodeGen (ADR-0009)

## Module boundaries and ownership
- `app/` — pages (app router) and API routes; `page.tsx` for routes, `layout.tsx` for layout
- `components/` — reusable React pieces (`DashboardView`, `TaskForm`, `ProgressView`, `ui/Header`)
- `lib/` — server-side utilities (`prisma` singleton, `dates`, `scoring`, `recurrence`, `progress`, `streaks`, `taskValidation`)
- `prisma/` — schema, migrations, seed script; singleton from `lib/prisma`
- `docs/` — project documentation (architecture, decisions, state, learnings)
- `public/` — static assets
- `tests/` — vitest test files (+ Playwright E2E spec)
- `native/` — `ScoreDayCore` Swift package (models, API client) + `macOS` app; talks to the web app only over the HTTP API
- `scripts/` — one-off ops scripts (`export-data.ts` / `import-data.ts` for data migration)

## Critical paths
- Dashboard scoring — `app/page.tsx` → `components/DashboardView` → `lib/scoring` → `lib/prisma`
- Task creation — `components/tasks/TaskForm.tsx` → `app/api/tasks/route.ts` (POST) → `lib/taskValidation` → `prisma`
- Completion recording — UI → `app/api/completions/route.ts` (POST) → `prisma` → `TaskCompletion`
- Progress — `app/progress/page.tsx` → `components/ProgressView` → `lib/progress` + `lib/streaks` → `lib/prisma`; client navigation refetches via `app/api/progress/{month,week,day}`; task/category/missed sections are period-scoped to the active view
- Completion undo — `DashboardView` (optimistic) → `DELETE /api/completions` → record deletion only, never point mutation
- Day detail — calendar/chart day → `DayDetailModal` → `app/api/progress/day` → `getDayDetail`
- Seed — `prisma/seed.ts` → `lib/prisma` → DB
- Native Today — Mac app → `middleware.ts` → `GET /api/dashboard[?date=]` → `getDashboardData(dateStr?)`; past-day toggles → `/api/completions` with that date
- Data migration — `npm run db:export` (local DB, or a server via `GET /api/admin/export` when `API_BASE_URL` is set) → `npm run db:import` → `POST /api/admin/restore` (one-shot, empty DB only)

## Conventions that differ from framework default
- Custom Prisma singleton (`lib/prisma.ts`) attached to global in dev
- Route Handler (`route.ts`) instead of older `pages/api/*.js`; no default export
- Tailwind v4 in package; RTK wrapper (`rtk`) available for concise terminal output
- Vitest used for testing instead of Jest
- Architecture Decision Records (ADR) practice in `docs/decisions/` (10 ADRs recorded)
- Zod adopted for request validation (replacing manual validation incrementally)
- nanoid used for client-side ID generation (instead of Prisma cuid)
- Deterministic date math in `lib/dates.ts` — all scoring/recurrence uses local YYYY-MM-DD strings
- Score math lives only in `lib/scoring.ts` — TaskCompletion.pointsEarned is immutable snapshot
- Historical performance math lives in `lib/progress.ts`, consistency math in `lib/streaks.ts` — both reuse the recurrence engine, never duplicate it
- Core metric distinction: Score = weighted points performance (earned/available); Completion Rate = completed/scheduled occurrences; Consistency = % of scheduled days finished at 100%
- WEEKLY_GOAL is one opportunity per Mon-Sun week: it never enters daily denominators, counts once in weekly totals, and shares the week's Monday occurrence key
- Certain-days (WEEKLY) tasks complete per calendar date — each scheduled day is its own occurrence
- Days with no scheduled tasks are "no data", never 0%
- Missed = scheduled + passed + not completed; today's incomplete tasks are actionable, never missed
- Performance sections sort weakest-first (task, category) with alphabetical tiebreaks
- CI: install → generate → lint → tsc → unit → build → Playwright vs `next start`; E2E scoped to `tests/*.spec.ts`; e2e job migrates + seeds a hermetic SQLite file
- SQLite: datasource honors `DATABASE_URL` (`env()`); relative `file:` paths resolve CWD-relative — production uses the Railway volume `file:/data/prod.db`, single instance (ADR-0010); `dev.db` is an untracked local artifact, never committed
- Seed (`prisma/seed.ts`) is wipe-first and date-relative: dev/CI use only, never production
- Human-readable labels via formatRecurrence() — raw enum names never reach UI
- No XP/levels/badges/leaderboards anywhere — product, code, and docs (see ADR-0007)
- Auth: one shared secret (`API_TOKEN`), enforced only when set — local dev stays open. It guards pages too, because `/` and `/progress` render DB data server-side: the Mac app sends `Bearer <token>` (kept in the Keychain), browsers use HTTP Basic with the token as password (ADR-0010)
- `native/` is fenced off from the web toolchain (tsconfig `exclude`, Tailwind `@source not`); Xcode builds go to the default DerivedData, never in-repo
- XcodeGen: `project.yml` is the source of truth; the generated `.xcodeproj` and `Info.plist` are committed (ADR-0009)
