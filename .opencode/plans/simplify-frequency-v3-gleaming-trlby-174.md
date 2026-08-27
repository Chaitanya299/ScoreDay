# Plan: Simplify Frequency System (4 options) + Remove XP

## Context
Current app has 7 recurrence types (DAILY, WEEKDAYS, WEEKLY, EVERY_N_DAYS, EVERY_N_WEEKS, MONTHLY, ONE_TIME) with DB fields intervalDays/Weeks/dayOfMonth/startDate/dueDate/daysOfWeek and engine in lib/recurrence.ts. Subsequent task requests: simplify to 4 user-facing options, remove advanced intervals/monthly, remove XP/Level (POINTS+SCORE% only). No full redesign, no new features. Keep implementation clean and scoring trustworthy.

Target frequencies (plain wording):
1. Every day → DAILY
2. Certain days → SPECIFIC_DAYS (any Sun-Sat combination, require ≥1)
3. Any day this week → WEEKLY (one Mon-Sun occurrence)
4. One time → ONE_TIME (single dueDate)

## Goals
- UI shows only 4 radio choices under "WHEN?" with only relevant fields.
- DB/logic supports exactly 4 behaviors; migrate existing EVERY_N_DAYS/EVERY_N_WEEKS/MONTHLY safely without deleting history.
- Scoring respects simplified rules (daily denominator excludes WEEKLY, weekly counts real occurrences).
- Remove XP/Level entirely.

## Non-Goals
No redesign of navigation/theme/dashboard structure/categories/points/completion behavior. No auth/notifications/AI. No new recurrence types.

## Investigation Summary
- Schema: recurrenceType, daysOfWeek CSV, startDate, dueDate, intervalDays/Weeks, dayOfMonth; completions via occurrenceDate/completedOn unique.
- Engine: lib/recurrence.ts pure, handles 7 types + getTaskStatus + formatRecurrence; dates via lib/dates (local calendar, Mon-Sun weeks).
- Scoring: lib/scoring.ts already excludes WEEKLY from daily max per spec; weekly via getOccurrencesForDateRange; streak + levelInfo included.
- Form: 7-option select with conditional fields; validation in lib/taskValidation.ts; categories via lib/categories.ts.
- Tests: 30 vitest tests in tests/recurrence.test.ts covering all 7 types + Feb clamping.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Internal enum | DAILY, SPECIFIC_DAYS, WEEKLY, ONE_TIME | Matches spec wording; rename from WEEKDAYS for clarity |
| daysOfWeek storage | Keep validated CSV "0..6" | Robust, avoids 7 booleans |
| Dropped columns | intervalDays, intervalWeeks, dayOfMonth, startDate removed from active logic | Historical completions preserved; future intervals would be ambiguous |
| Weekly key | Keep Monday as occurrenceDate for WEEKLY | DB constraint enforces one-per-week |
| XP removal | Delete lib/levels.ts, strip levelInfo from scoring+DashboardView | Spec: use only POINTS+SCORE% |

## Migration Strategy

**Schema (prisma/schema.prisma)**: Keep recurrenceType string + daysOfWeek + dueDate. Drop intervalDays/Weeks, dayOfMonth, startDate from Prisma model via ReDefineTables migration (SQLite recreate). Keep occurrenceDate/completedOn unique.

**Backfill (append to migration.sql, non-interactive env)**:
- DAILY → DAILY
- WEEKDAYS 1,3,5 → SPECIFIC_DAYS same CSV
- WEEKLY → WEEKLY ("Any day this week")
- EVERY_N_DAYS (Take Medicine) → DAILY (closest)
- EVERY_N_WEEKS (Deep Clean) → WEEKLY
- MONTHLY (Pay Rent day 1) → ONE_TIME with dueDate = next 1st of month from today
- Ambiguous → preserve but document; new validation will require 4-type on next edit.
Keep all TaskCompletion rows verbatim.

## Code Changes

### lib/recurrence.ts — prune to 4 types
- RECURRENCE_TYPES = ['DAILY','SPECIFIC_DAYS','WEEKLY','ONE_TIME']
- RecurrenceTask: keep daysOfWeek, dueDate; drop interval*/dayOfMonth/startDate from active logic (keep nullable for tolerance if needed)
- isTaskDueOnDate: keep DAILY (always), SPECIFIC_DAYS (weekday in set), WEEKLY (always within active), ONE_TIME (date===dueDate)
- getOccurrenceKey/getTaskOccurrenceForDate/getOccurrencesForDateRange/getNext/Previous: simplify branches
- getTaskStatus: keep ONE_TIME UPCOMING/DUE/OVERDUE/COMPLETED; WEEKLY week-level; DAILY/SPECIFIC past→MISSED/today→DUE/future→UPCOMING
- formatRecurrence → formatFrequency (or alias): Every day / Mon, Wed, Fri / Any day this week / Due Aug 29

### lib/dates.ts
Keep getWeekStart/End, parseLocalDate, addDays, eachDay. Remove lastDayOfMonth/weeksBetween if unused.

### lib/taskValidation.ts
Validate per 4 types only: DAILY/WEEKLY no extra, SPECIFIC_DAYS require ≥1 day, ONE_TIME require valid dueDate (past rejection with legacy unchanged allowance). Remove interval/dayOfMonth/startDate branches.

### lib/levels.ts
Delete file.

### lib/scoring.ts
Remove computeLevelInfo import, levelInfo return, streak stays. TaskRow drops interval*/dayOfMonth/startDate. Weekly max via engine (WEEKLY counts once, ONE_TIME if in range). Daily max excludes WEEKLY.

### lib/categories.ts
No change.

### components/tasks/TaskForm.tsx
Replace frequency select with 4 radios under "WHEN?" (large touch targets, Tailwind). Conditional: DAILY nothing, SPECIFIC_DAYS chips, WEEKLY hint, ONE_TIME date picker min=today. Default Every day.

### app/tasks/page.tsx
Update Task interface, handleSubmit serialization, card footer uses formatFrequency.

### components/dashboard/DashboardView.tsx
Delete level bar/banner, computeLevelInfo. Update TaskItem interface. Status chips: DUE→Complete, OVERDUE (one-time)→red Overdue, COMPLETED→Completed. Keep weeklyOverview/upcoming (ONE_TIME within 7d).

### prisma/seed.ts
~6 tasks covering 4 types.

### tests/recurrence.test.ts
Remove EVERY_N_DAYS/WEEKS/MONTHLY blocks, update SPECIFIC_DAYS label expectations to new wording (Mon, Wed, Fri still valid).

## File Impact Map
| File | Action |
|---|---|
| prisma/schema.prisma | Edit: 4 types, drop 3 columns |
| prisma/migrations/*_simplify_frequency/migration.sql | Create with backfill |
| prisma/seed.ts | Edit: 4-type demo |
| lib/recurrence.ts | Major edit: prune + rename formatter |
| lib/taskValidation.ts | Edit: 4-type validation |
| lib/levels.ts | Delete |
| lib/scoring.ts | Edit: remove levels, simplify |
| lib/dates.ts | Minor prune |
| components/tasks/TaskForm.tsx | Major edit: 4 radios |
| app/tasks/page.tsx | Edit: new shape, formatFrequency |
| components/dashboard/DashboardView.tsx | Edit: remove level UI |
| tests/recurrence.test.ts | Edit: keep 4-type tests |

## Risks & Mitigations
- Interval→Daily conversion changes future cadence → document in migration comment, dev seed only.
- DAILY vs SPECIFIC_DAYS both everyday-like → tests cover.
- Scoring drift if weekly excluded incorrectly → re-verify manual.

## Verification (in order)
1. prisma migrate diff → hand-edit migration.sql → migrate deploy → generate
2. npm run db:seed
3. npm test (vitest) expect remaining tests pass
4. npm run lint (no warnings)
5. npm run build (static pages)
6. rm -rf .next && npm run dev → manual verify per spec: DAILY every day, SPECIFIC Mon/Wed/Fri, WEEKLY Wed→Thu satisfied/next Mon reopens, ONE_TIME upcoming/due/completed/missed, denominators correct.

## Effort
Single session: ~12 file edits, 1 migration, 1 deletion.

