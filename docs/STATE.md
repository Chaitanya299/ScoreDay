# STATE — <!-- updated: 2026-09-06 -->

## Current focus
Sprint complete: ScoreDay is a coherent personal performance scoreboard.
Today is for action, Progress is for reflection. Next: pick up the
"Remaining limitations" list in the sprint report (task/category
performance sections are service-ready but not yet rendered).

## Shape
```mermaid
flowchart TD
    A[Next.js App Router<br/>app/] --> B[API Routes<br/>app/api/]
    A --> C[Page Components<br/>app/(page|dashboard|tasks|settings)/]
    A --> D[Layout & UI<br/>app/layout.tsx<br/>components/ui/]
    B --> E[Prisma ORM<br/>lib/prisma.ts]
    E --> F[Database<br/>prisma/dev.db]
    C --> G[Lib Utilities<br/>lib/]
    G --> H[Scoring Logic<br/>scoring.ts]
    G --> I[Recurrence Engine<br/>recurrence.ts]
    G --> J[Date Utilities<br/>dates.ts]
    G --> K[Validation<br/>taskValidation.ts]
    C --> L[Client Components<br/>'use client']
```

## Done
- Implemented deterministic recurrence engine with 4 core types (DAILY, SPECIFIC_DAYS, WEEKLY, ONE_TIME)
- Added comprehensive test suite for recurrence logic (17 tests)
- Migrated legacy frequency system to new model preserving all completion history
- Established Architecture Decision Record (ADR) practice with 6 decisions recorded
- Added nanoid for client-side ID generation
- Added Zod for request validation
- Upgraded lodash to latest version
- Completed frequency system redesign: Apple Reminders-inspired UI with single Repeat row → sheet/modal
- Added WEEKLY_GOAL (any day during week) and CUSTOM recurrence types
- Implemented human-readable recurrence formatting (formatRecurrence)
- **Added Progress/History feature: /progress page with weekly/monthly views, summary cards, activity calendar, monthly trend charts**
- 57 unit tests passing (17 recurrence + 40 progress)
- 16 Playwright E2E tests passing
- Lint clean, build successful
- **Sprint: score-semantics audit + fixes (ADR-0007)** — weekly goals out of
  all daily denominators (Mon max 28, week max 148 on reference dataset);
  certain-days tasks complete per calendar date (date occurrence keys);
  dashboard weekly max counts per scheduled day; dashboard streak redefined
  as consecutive 100% scheduled days (delegates to new `lib/streaks.ts`)
- **Day Detail experience** — clickable calendar/week days open a modal with
  score, earned/max, completed + missed tasks (`getDayDetail` + new
  `/api/progress/day` route)
- **Consistency section on Progress** — Current Streak / Best Streak /
  Consistency % via `getStreakData` (batched queries, no-task days skipped)
- **Working week view** — Mon-Sun breakdown + weekly total with real
  prev/next week navigation (`/api/progress/week`); month prev/next now
  refetches via `/api/progress/month` (previously label-only)
- **Legacy data cleanup** — dev rows migrated to canonical recurrence types;
  corrupt unix-timestamp `startDate` values repaired; engine ignores
  malformed date bounds instead of silently zeroing schedules
- **XP/Level removal** — verified absent from code; removed stale leveling
  docs from README
- **Task form cleanup** — removed redundant Every day/Weekdays/Weekends
  shortcut links under the weekday picker
- **Mobile/a11y** — fixed 21px horizontal overflow on Progress (wrapping
  period controls); calendar days are real buttons with labels; day modal
  has dialog role, labelled close, and Escape handling; 44px touch targets
  on nav controls
- 73 unit tests passing (18 recurrence + 14 streaks + 41 progress)
- 26 Playwright E2E tests passing (incl. day detail, week/month nav data
  reload, streak display, XP absence, mobile overflow)
- Lint clean, build successful

## In progress
- Finalizing verification of Repeat sheet/modal UI on desktop and mobile
- Ensuring all edge cases handled for custom intervals (leap years, month boundaries)
- Validating scoring behavior for Weekly Goal type (points awarded once per week)
- Testing duplicate completion prevention across all recurrence types

## Next up
- Visual/product redesign phase (UI/UX improvements)
- Consider adding TIMES_PER_WEEK flexible quota (e.g., "gym 4× any days")
- Implement undo/accidental tap protection for task completion
- Add visual distinction for overdue tasks

## Blocked / needs research
- Deployment target (Vercel vs Fly.io) and CI/CD setup

## Known issues
- No UI for backfilling missed past occurrences (API accepts any date)