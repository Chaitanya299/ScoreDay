# STATE — <!-- updated: 2026-09-18 -->

## Current focus
Sprint 3 complete: production hardening done (tsc zero, hermetic CI with
E2E, canonical seed, deployable SQLite config). Native iOS/macOS
foundation scaffolded with Xcode projects, ScoreDayCore package, and
SwiftUI views.

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

## In progress
- Native macOS app: Xcode project + ScoreDayCore framework + 14 SwiftUI views/viewmodels
- Native iOS app: parallel Xcode project structure
- ScoreDayCore Swift Package (Models, ScoringEngine, Persistence, SyncManager)

## Next up
- Wire native apps to API (GRDB local cache + sync)
- Implement SwiftUI view logic + viewmodel functionality
- Visual/product redesign phase (UI/UX improvements)
- TIMES_PER_WEEK flexible quota (e.g., "gym 4× any days")

## Blocked / needs research
- Exact deployment host selection (persistent-FS required, serverless excluded)
- Native app: background sync strategy, conflict resolution

## Known issues
- No UI for backfilling missed past occurrences (API accepts any date)
- Native Xcode projects need manual open in Xcode.app (xcodebuild timeout env issue)