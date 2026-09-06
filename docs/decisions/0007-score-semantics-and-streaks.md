# ADR-0007: Score semantics, occurrence keys, and streak definition

## Status
Accepted.

## Context
The dashboard (`lib/scoring.ts`), progress service (`lib/progress.ts`), and
recurrence engine (`lib/recurrence.ts`) disagreed on three load-bearing
questions, and legacy `recurrenceType` values (`WEEKLY` = old any-day goal,
`SPECIFIC_DAYS`, `ONE_TIME`) were interpreted differently per call site:

1. Dashboard excluded certain-days tasks from the daily max while including
   weekly goals every day (inverted vs. the product model).
2. Dashboard weekly max counted certain-days tasks once per week instead of
   once per scheduled day.
3. Certain-days completions shared the week's Monday occurrence key, so the
   DB uniqueness constraint made Mon/Wed/Fri tasks effectively
   once-per-week.
4. Progress counted the weekly goal in Monday's denominator (33 instead of 28
   on the reference dataset) and counted goals as ~30 monthly occurrences
   instead of one per week for completion rate.
5. `streak` meant "consecutive days with any completion", letting empty days
   and partial days extend it.

## Decision
- Daily score = earned / available for tasks actually scheduled that date.
  WEEKLY_GOAL never enters any daily denominator (reference: Monday max 28,
  weekly max 148 on Water 8 + Workout M/W/F 10 + Work M-F 10 + Read goal 5 +
  Deep Clean one-time 7).
- Weekly score = total earned / total available across Mon-Sun, never an
  average of daily percentages. Goals add once per overlapping week.
- Occurrence keys are calendar dates for every type except WEEKLY_GOAL,
  which shares its week's Monday key. Each scheduled day of a certain-days
  task is independently completable; the DB constraint stays authoritative.
- Completion rate = completed / scheduled occurrences, with goals counting
  one scheduled occurrence per week.
- A streak day = a scheduled day finished at 100%. Days with no scheduled
  tasks are "no data": skipped, never breaking or extending a run. An
  in-progress today does not break the current streak.
- Consistency % = successful scheduled days / scheduled days — distinct from
  Score (weighted) and Completion Rate (occurrences).
- No XP, levels, badges, or leaderboards in product, code, or docs. The
  README's leveling section described behavior that was never implemented
  and has been removed.
- Legacy dev rows migrated to canonical types
  (`WEEKLY`→`WEEKLY_GOAL`, `SPECIFIC_DAYS`→`WEEKLY`, `ONE_TIME`→`NONE`);
  historical migration files left intact. Corrupt `startDate` values (unix
  timestamps) repaired to YYYY-MM-DD, and the engine now ignores malformed
  date bounds instead of silently zeroing schedules.

## Consequences
- `getOccurrenceKey` changed for WEEKLY certain-days (week key → date key).
  No week-keyed rows existed in real data, so no history was orphaned;
  progress test mocks updated to date keys.
- Day detail shows an uncompleted goal as missed only on its week's Sunday
  (one weekly opportunity, not seven missed tasks).
- Dashboard streak values change definition (100%-days instead of any-points
  days); `computeStreak` now delegates to `lib/streaks.ts`.
- `lib/streaks.ts` batches to ~2 Prisma queries per call; scoring logic is
  mirrored from `getDailyProgress`, not forked — any denominator change must
  land in both places (documented in code).
