# ADR-0006: Adopt Apple Reminders‑style frequency UI

- Date: 2026-08-27
- Status: accepted
- Supersedes: none
- Superseded by: none

## Context
The current task‑creation form embeds a large, multi‑field recurrence selector (frequency dropdown, weekday pills, monthly controls, interval pickers) directly in the main view. This makes creating a simple task feel like configuring a calendar application and overwhelms the user with technical concepts (RRULE, intervals, units) before they even name the task. Engagement data shows the form is perceived as "clumsy". The product principle called out in the redesign brief is: *keep the main task creation form simple; put recurrence configuration behind a single "Repeat" setting that opens a focused configuration interface.*

## Decision
Adopt an Apple Reminders‑inspired interaction model:
- The main form contains a single row labeled **Repeat** showing the current recurrence (e.g., `Daily >`).
- Tapping the row opens a centered modal (desktop) or bottom sheet (mobile) with the first‑level options: **Never, Every Day, Weekdays, Weekends, Every Week, Weekly Goal, Custom**.
- Advanced controls (interval, unit, selected weekdays, day‑of‑month, start/end dates) live only inside **Custom**.
- A one‑time **Due Date** field appears in the main form only when **Never** is selected.
- The underlying recurrence engine in `lib/recurrence.ts` continues to centralise all scheduling logic; the UI options are thin mappings onto the existing model (NONE, DAILY, WEEKLY, CUSTOM, WEEKLY_GOAL).

## Why this over the alternatives
- **Keep the inline frequency selector** — rejected: forces every user to learn advanced scheduling controls to create a simple task; violates the stated product principle.
- **Separate “Advanced” toggle in the main form** — rejected: still exposes technical terms (interval, unit) in the primary view; users must hunt for a toggle.
- **Full multi‑step wizard** — rejected: adds friction for the common case; the Apple‑Reminders pattern proves a single‑row + sheet is sufficient.

## Trade‑offs accepted
- Users must perform one extra tap to change a recurrence. Acceptable because it’s a low‑frequency action and the gain in main‑form clarity outweighs the cost.
- Additional UI components (modal/sheet, custom‑recurrence screen) increase the component surface area.
- Power users may need to discover that “Every 2 weeks” now lives under **Custom → Week → interval = 2**.

## Consequences
- `lib/recurrence.ts` adds a `WEEKLY_GOAL` type (already added in the redesign branch) and a `CUSTOM` type with interval/unit/selected‑weekdays/day‑of‑month/start/end.
- `components/tasks/TaskForm.tsx` is refactored: the large frequency block is replaced by a `Repeat` row that opens `components/tasks/RepeatSheet.tsx`.
- `lib/taskValidation.ts` learns validation for `interval`, `unit`, `selectedWeekdays`, `dayOfMonth`, `startDate`, `endDate`.
- Task cards and the dashboard display a human‑readable summary via `formatRecurrence()`; enum names never reach the UI.
- Historical completion points remain immutable; the migration (`prisma/migrations/20260827160000_recurrence`) maps existing rows to the new model without deleting completions.
- Future Early‑Reminder support can be added inside the Custom sheet without touching the main form.
