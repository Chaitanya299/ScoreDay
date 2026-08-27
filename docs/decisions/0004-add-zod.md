# ADR-0004: Add Zod for request validation

- Date: 2026-08-27
- Status: accepted
- Supersedes: none
- Superseded by: none

## Context
Commit 8404386 introduced the `zod` library to the project. Previously, API route validation was performed with ad‑hoc checks in `lib/taskValidation.ts`. As the number of endpoints grew, the team wanted a declarative, type‑safe schema validation library that integrates with TypeScript.

## Decision
Adopt `zod` as the canonical validation library for all incoming request payloads (API routes, server actions, and form submissions). Replace manual validation logic with Zod schemas.

## Why this over the alternatives
- Keep manual validation — rejected: error‑prone, duplicated logic, no automatic TypeScript inference.
- `joi` — rejected: larger bundle, no first‑class TypeScript support.
- `yup` — rejected: slower, API less ergonomic for complex unions.
- `zod` — chosen: zero dependencies, excellent TypeScript inference, composable schemas, small bundle.

## Trade-offs accepted
- Learning curve for developers unfamiliar with Zod's schema API.
- Slight increase in bundle size (~2 KB gzipped).

## Consequences
- All new API routes must define a Zod schema for their input.
- Existing manual validation in `taskValidation.ts` will be migrated incrementally.
- Runtime validation errors are standardized and easier to test.