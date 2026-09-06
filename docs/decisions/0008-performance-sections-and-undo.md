# ADR-0008: Performance sections, missed-today rule, and completion undo

## Status
Accepted.

## Context
`getAllTaskPerformance()`, `getCategoryPerformance()`, and
`getMissedOccurrences()` existed service-side but were never rendered.
Completion had no reverse path, and the missed list could label today's
still-actionable tasks as missed when the selected period included today.

## Decision
- Task and category performance render weakest-first with an alphabetical
  tiebreak, so attention goes where performance slips. This flips the
  previous strongest-first ordering (and its unit assertion) deliberately:
  the section exists to answer "what am I failing at?", not to celebrate.
- Missed = scheduled + fully passed + not completed. Today's incomplete
  tasks are actionable, never missed (`occ < today` clamp; existing
  week-end rule for goals unchanged).
- Undo deletes the `TaskCompletion` record (`DELETE /api/completions`,
  same occurrence-key resolution as POST). Points history is never mutated;
  `Task.points` is untouched. Undoing an already-undone occurrence returns
  404 + `alreadyUndone: true`, which the UI treats as converged state
  rather than an error. The DB uniqueness constraint keeps racing
  complete/undo pairs safe.
- New sections are period-scoped to the active week/month view and fetched
  server-side alongside existing progress data (no client-side recurrence).

## Consequences
- `getAllTaskPerformance` / `getCategoryPerformance` sort ascending; the
  old descending unit assertion was replaced with an ascending + tiebreak
  assertion.
- `getMissedOccurrences` takes an optional `todayIso` (default: real today)
  for determinism in tests.
- CI (`.github/workflows/ci.yml`) runs install, Prisma generate, lint,
  unit tests, production build, then Playwright (Chromium) against
  `next start`. `playwright.config.ts` scopes E2E to `tests/*.spec.ts`.
- Local `dev.db` is a scratch runtime artifact: E2E completion flows are
  net-zero by construction (complete → undo) with API-level cleanup, and
  the file must not be committed for test-run page churn.
