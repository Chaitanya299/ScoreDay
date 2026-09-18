# STATE — <!-- updated: 2026-09-18 -->

## Current focus
Native macOS app is buildable and runs against the local API (XcodeGen
project, models aligned to real API JSON). Next: finish macOS UX gaps,
then scaffold the iOS project the same way.

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

## Done (condensed)
- **Recurrence engine** (4 core types + WEEKLY_GOAL/CUSTOM) with 18 tests
- **Progress/History** — weekly/monthly views, summary cards, activity calendar, trend charts (41 tests)
- **Streaks** — current/best/consistency % via `getStreakData` (14 tests)
- **Day Detail** — clickable calendar days → modal with score/earned/max (`getDayDetail` + `/api/progress/day`)
- **Working week** — Mon-Sun breakdown, real prev/next nav (`/api/progress/week`)
- **Undo completions** — DELETE `/api/completions` + optimistic UI (12 tests)
- **Performance sections** — Task/Category/Missed on Progress, period-scoped (13 tests)
- **A11y/mobile** — 44px targets, dialog roles, Escape handling, zero-overflow at 390px
- **Sprint 3 prod hardening** — tsc zero, hermetic CI (install→generate→lint→tsc→unit→build→E2E), canonical seed, DATABASE_URL honored, dead deps pruned
- **98 unit / 33 E2E tests passing**, lint clean, build successful
- **Native macOS app builds & runs** — XcodeGen project (`native/macOS/project.yml`), ~30 compile errors fixed,
  Swift models match API JSON (flat Task recurrence, `YYYY-MM-DD` dates, week/month bundles), 41 ScoreDayCore
  tests incl. API contract suite; fixed weekdayZeroBased (Mon=0 → Sun=0) and UTC day-shift in LocalDate.parse
- **`GET /api/dashboard`** — single endpoint for native Today screen (`getDashboardData`)

## In progress
- Web (uncommitted): dashboard checkbox complete/undo with optimistic UI, TaskForm changes,
  task soft-delete (`DELETE /api/tasks/[id]` sets `active: false`), scoring.ts tweaks
- Native iOS app: sources only, needs an XcodeGen `project.yml` like macOS

## Next up
- macOS UX gaps: prefill edit form, live-apply API URL setting
- Decide whether to keep GRDB local cache (compiled, unused) or drop it
- Visual/product redesign phase (UI/UX improvements)
- TIMES_PER_WEEK flexible quota (e.g., "gym 4× any days")

## Blocked / needs research
- Exact deployment host selection (persistent-FS required, serverless excluded)
- Native app: background sync strategy, conflict resolution
- ADR not yet recorded: XcodeGen-generated Xcode projects (hand-written pbxproj crashed xcodebuild)

## Known issues
- No UI for backfilling missed past occurrences (API accepts any date)
- **Uncommitted `PUT /api/tasks/[id]` writes raw `body` — validateRecurrenceInput removed (mass-assignment risk)**
- macOS: open `native/ScoreDay.xcworkspace`; needs the Next dev server on :3000
- macOS: editing a task opens the form with empty fields (TaskFormViewMac doesn't prefill from `editingTask`)
- macOS: API base URL change in Settings only applies after relaunch
- macOS: GRDB local cache is compiled but unused (views call the API directly)