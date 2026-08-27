# ADR-0003: Add nanoid for ID generation

- Date: 2026-08-27
- Status: accepted
- Supersedes: none
- Superseded by: none

## Context
Commit 7367ba4 added the `nanoid` package as a dependency. The project previously relied on Prisma's default `cuid()` for generating unique identifiers. The team evaluated the need for a smaller, URL‑friendly ID generator for client‑side use (e.g., temporary IDs before server persistence) and decided to adopt `nanoid`.

## Decision
Add `nanoid` as a runtime dependency and use it for client‑side ID generation where short, collision‑resistant strings are required.

## Why this over the alternatives
- Continue using only Prisma `cuid()` — rejected because `cuid()` strings are longer and not as URL‑friendly for client‑side temporary keys.
- Use `uuid` — rejected due to larger bundle size and slower generation.
- `nanoid` — chosen: tiny (~130 bytes), fast, cryptographically strong, and widely adopted.

## Trade-offs accepted
- Additional runtime dependency (≈1 KB gzipped).
- Developers must remember to import `nanoid` instead of using `cuid()` on the client.

## Consequences
- Client components can generate IDs instantly without a round‑trip to the server.
- Bundle size increases negligibly.
- Future IDs generated with `nanoid` follow the same pattern across the codebase.