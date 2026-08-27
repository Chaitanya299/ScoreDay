# STATE — <!-- updated: 2026-08-27 -->

## Current focus
Finalizing frequency system simplification and documentation system.

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
- Simplified frequency system to 4 options (Every day, Certain days, Any day this week, One time)
- Removed XP/Level system, retaining POINTS and SCORE% only
- Implemented deterministic recurrence engine with status tracking
- Added comprehensive test suite for recurrence logic (17 tests)
- Updated all UI components to reflect simplified frequency options
- Added Coming up strip for one-time tasks in next 7 days
- Improved validation with past date prevention for one-time tasks
- Established Architecture Decision Record (ADR) practice with 2 decisions recorded

## In progress
- Finalizing verification of all system components
- Preparing for visual/product redesign phase
- Ensuring all edge cases handled (leap years, short months, etc.)

## Next up
- Visual/product redesign phase (UI/UX improvements)
- Consider adding TIMES_PER_WEEK flexible quota (e.g., "gym 4× any days")
- Implement undo/accidental tap protection for task completion
- Add visual distinction for overdue tasks

## Blocked / needs research
- Deployment target (Vercel vs Fly.io) and CI/CD setup

## Known issues
- Legacy interval/monthly tasks converted to closest 4-type during migration (documented in migration comments)
- No UI for backfilling missed past occurrences (API accepts any date)
