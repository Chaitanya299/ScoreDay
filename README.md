# ScoreDay — Personal Daily Scoreboard

A personal scoreboard for tracking productivity, habits, and goal completion.

## Features
- Seven recurrence types driven by a deterministic engine (`lib/recurrence.ts`):
  DAILY · WEEKDAYS (any day combination) · WEEKLY (once per Mon-Sun week,
  complete any day) · EVERY_N_DAYS (anchored to a start date) ·
  EVERY_N_WEEKS · MONTHLY (short months clamp to the last day) · ONE_TIME.
- Occurrence-based completions: unique(taskId, occurrenceDate) makes double
  completion of the same occurrence impossible at the DB layer; weekly tasks
  are keyed by their week's Monday, enforcing one-per-week automatically.
- Scoring respects real occurrences — never "points x 7". Points are frozen
  snapshots at completion time; editing tasks never rewrites history.
- Task status engine: NOT_DUE / DUE / COMPLETED / MISSED / UPCOMING / OVERDUE
  computed centrally per task+date.
- Game-style leveling system:
  - Every completion awards its task's points as XP.
  - Early levels come fast — Level 2 after ~2 tasks, Level 3 within one strong day.
  - Later levels demand consistency: L2@16, L3@48, L4@96, L5@160, L6@240 ... L10@720 total XP.
  - A "LEVEL UP!" banner celebrates every promotion.
- Streak tracking (consecutive days with points).
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
