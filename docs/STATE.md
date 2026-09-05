# STATE — <!-- updated: 2026-08-27 -->

## Current focus
Finalizing implementation of Apple Reminders-inspired frequency UI and verifying new recurrence engine.

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