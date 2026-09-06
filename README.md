# ScoreDay — Personal Daily Scoreboard

A personal scoreboard for tracking productivity, habits, and goal completion.

## Product philosophy

ScoreDay is a personal performance scoreboard: Tasks → Points → Daily
Score → Weekly Performance → Long-term Consistency. It is deliberately NOT
a gamified app — there is no XP, no levels, no badges, no leaderboards.
The core metrics are Score, Points, Completion Rate, Consistency, Streaks,
History, and Trends.

## Features
- Recurrence driven by a deterministic engine (`lib/recurrence.ts`):
  DAILY · WEEKLY (certain days) · WEEKLY_GOAL (once per Mon-Sun week,
  complete any day) · CUSTOM (every N days/weeks/months) · NONE (one time).
- Occurrence-based completions: unique(taskId, occurrenceDate) makes double
  completion of the same occurrence impossible at the DB layer. Certain-days
  tasks complete per calendar date; only WEEKLY_GOAL shares its week's
  Monday key, enforcing one-per-week automatically.
- Scoring respects real occurrences — never "points x 7". Daily score is
  earned / available for tasks actually scheduled that date; weekly score is
  total earned / total available across Mon-Sun. Weekly goals never enter a
  daily denominator. Points are frozen snapshots at completion time
  (`TaskCompletion.pointsEarned`); editing tasks never rewrites history.
- Task status engine: NOT_DUE / DUE / COMPLETED / MISSED / UPCOMING / OVERDUE
  (+ SATISFIED for weekly goals) computed centrally per task+date.
- Progress/History page (`/progress`): performance summary, score history,
  activity calendar, consistency (current/best streak, consistency %),
  task performance (weakest first), category performance, missed
  occurrences, monthly trends, and a day-detail view for any date. All
  sections follow the active week/month period. Working week view with
  Mon–Sun breakdown.
- Consistency tracking (`lib/streaks.ts`): a streak day is a scheduled day
  finished at 100%. Days with no scheduled tasks are "no data" — they
  neither extend nor break streaks.
- Completion workflow: optimistic Complete/Undo on Today. Undo
  (`DELETE /api/completions`) removes the occurrence record — history is
  never edited, only removed, and the occurrence becomes completable again.
- Local-first storage with SQLite.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite
- **ORM**: Prisma

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` (already pre-configured for SQLite).
```bash
cp .env.example .env
```

### 3. Setup Database
Generate Prisma client and run migrations.
```bash
npx prisma migrate dev --name init
```

### 4. Seed Database
Populate with sample tasks plus two weeks of relative history (destructive —
it wipes tasks and completions first; intended for fresh dev/CI databases).
```bash
npm run db:seed
```

### Testing
```bash
npm test              # vitest unit tests (recurrence, progress, streaks, performance, completions)
npx playwright test   # E2E specs against a local server (Today flow, Progress, day detail, mobile)
npx tsc --noEmit      # strict type check (CI-enforced)
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 6. Production Build
```bash
npm run build
npm run start
```

## Project Structure
- `app/`: Application routes and API endpoints.
- `components/`: Reusable UI and domain-specific components.
- `lib/`: Core business logic:
  - `recurrence.ts` — deterministic recurrence engine + status engine + formatters
  - `scoring.ts` — daily/weekly score calculations from occurrences
  - `progress.ts` — historical performance (daily/weekly/monthly, task/category performance, missed, trends, day detail)
  - `streaks.ts` — consistency (current/best streak, consistency rate)
  - `taskValidation.ts` — strict per-type input validation
  - `dates.ts` — local-calendar date utilities
  - `prisma.ts` — Prisma client singleton
- `app/api/`: Route handlers — `tasks` (CRUD), `completions` (complete + undo), `progress/{day,week,month}` (analytics bundles)
- `components/`: `dashboard/DashboardView`, `tasks/TaskForm`, `progress/ProgressView`, `ui/Header`
- `tests/` — vitest unit tests by category (recurrence, scoring via progress fixtures, progress, streaks, performance, completions) plus Playwright E2E specs (`*.spec.ts`, `npm run` via `npx playwright test`)
- `prisma/`: Database schema, migrations, and seed script.
- `.github/workflows/ci.yml` — install → generate → lint → tsc → unit → build → Playwright vs production server

## Scripts
- `npm run dev` — Start development server.
- `npm run build` / `npm run start` — Production build and serve.
- `npm run lint` — Run ESLint.
- `npm run db:migrate` — Apply database migrations.
- `npm run db:seed` — Seed sample tasks.
- `npm run db:studio` — Browse database records.

## Deployment

ScoreDay is a single-user app: Next.js 15 + Prisma + SQLite. SQLite needs a
**persistent writable filesystem** — it is not compatible with read-only or
ephemeral serverless runtimes (that would require migrating to Postgres,
which is out of scope).

Recommended: a small VPS or Fly.io with an attached volume.

1. Required Node version: 22 LTS.
2. Install: `npm ci`.
3. Generate the client: `npx prisma generate`.
4. Database: point `DATABASE_URL` at an **absolute** path on persistent
   storage (e.g. `DATABASE_URL="file:/data/prod.db"`) and apply migrations
   at boot: `npx prisma migrate deploy`. Relative `file:` paths in
   `DATABASE_URL` resolve against the process working directory (verified),
   so never rely on them in production. (The committed `.env.example` uses
   `file:./prisma/dev.db`, which is correct when commands run from the
   project root.)
5. Build: `npm run build`. Start: `npm run start`.
6. No other production environment variables are required. No secrets are
   needed; do not commit `.env` files.

Caveats: back up the SQLite file on your own schedule; run exactly one app
instance per database file (no shared/concurrent writers beyond a single
Node process). `dev.db` is a local artifact and is not tracked in Git.

## Troubleshooting

### `localStorage.getItem is not a function` on startup

Node.js v25+ ships a non-functional global `localStorage` stub (unless
`--localstorage-file` is set), which crashes Next.js server-side rendering.
This project includes `instrumentation.ts`, which replaces that broken stub
with a safe in-memory shim at server startup — no action needed.

Using an LTS Node version (18/20/22) is still recommended.
