# ADR-0002: Simplify frequency system to 4 options and remove XP/Level

- Date: 2026-08-25
- Status: accepted
- Supersedes: none
- Superseded by: none

## Context
The ScoreDay scaffold had accumulated complexity in its recurrence system with 7 frequency types (DAILY, WEEKDAYS, WEEKLY, EVERY_N_DAYS, EVERY_N_WEEKS, MONTHLY, ONE_TIME) and supporting fields (intervalDays, intervalWeeks, dayOfMonth, startDate). The UI presented all options as a complex radio/select grid with conditional fields, overwhelming users. Additionally, an XP/Level system was implemented but not core to the product's value proposition, adding unnecessary complexity to scoring and UI.

## Decision
Simplify the frequency system to exactly 4 user-facing options matching natural language:
1. Every day (DAILY)
2. Certain days (SPECIFIC_DAYS: user-selectable weekdays)
3. Any day this week (WEEKLY: one occurrence per Mon-Sun week)
4. One time (ONE_TIME: single dueDate)

Remove all advanced scheduling concepts (intervalDays, intervalWeeks, dayOfMonth, startDate) from active logic and UI. Remove the XP/Level system entirely, retaining only POINTS earned and SCORE% as progression metrics.

## Why this over the alternatives

### Frequency simplification alternatives considered:
- Keeping 7 types but hiding advanced ones behind an "Advanced" section: Rejected because it still exposed complexity and didn't reduce cognitive load
- Collapsing to 3 types (Daily/Weekly/One-time): Rejected because losing weekday specificity (e.g., Workout Mon/Wed/Fri) would make the system feel inflexible
- Keeping Monthly as a 5th type: Rejected because most personal tasks don't need strict monthly cadence; One time covers specific dates like bill due dates

### XP/Level trade-off accepted:
Simplicity over engagement — accepted losing gamification to reduce cognitive load (POINTS + SCORE% only), planning to potentially add XP/Level later if user engagement data shows a clear need.

## Consequences
- Frequency UI now shows only 4 radio choices under "WHEN?" with relevant conditional fields (Certain days shows weekday chips, One time shows date picker)
- Scoring excludes WEEKLY from daily denominator (per spec) and counts real occurrences via recurrence engine
- Weekly tasks show "Completed this week" after completion until next Monday
- One-time tasks appear in "Coming up" strip (next 7 days) and move to overdue after due date
- Historical completion points remain frozen; editing tasks never rewrites past scores
- ADR-0002 recorded; future architects can review rationale via `docs/decisions/0002-simplify-frequency-and-remove-xp.md`