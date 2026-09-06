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
Populate with sample tasks.
```bash
npm run db:seed
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
  - `taskValidation.ts` — strict per-type input validation
  - `levels.ts` — XP → level progression
  - `dates.ts` — local-calendar date utilities
  - `prisma.ts` — Prisma client singleton
- `tests/` — vitest suite for the recurrence engine (`npm test`)
- `prisma/`: Database schema and seed scripts.

## Scripts
- `npm run dev` — Start development server.
- `npm run build` / `npm run start` — Production build and serve.
- `npm run lint` — Run ESLint.
- `npm run db:migrate` — Apply database migrations.
- `npm run db:seed` — Seed sample tasks.
- `npm run db:studio` — Browse database records.

## Troubleshooting

### `localStorage.getItem is not a function` on startup

Node.js v25+ ships a non-functional global `localStorage` stub (unless
`--localstorage-file` is set), which crashes Next.js server-side rendering.
This project includes `instrumentation.ts`, which replaces that broken stub
with a safe in-memory shim at server startup — no action needed.

Using an LTS Node version (18/20/22) is still recommended.
