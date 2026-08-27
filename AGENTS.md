<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- ORIENT:START -->
## Project docs — read on demand, never preload

- `docs/STATE.md` — what's built, in progress, blocked. Read this first when picking up work.
- `docs/decisions/` — one file per architectural decision. Read the relevant one before changing that area.
- `docs/architecture.md` — entry points and module boundaries. Read before cross-module work.

## Workflow

- Update `docs/STATE.md` before reporting a task complete.
- After a real architectural decision is made in conversation, proactively offer to record it with `/orient-decide` — don't wait to be asked. It also updates `architecture.md`.
- Never edit a past decision file. Supersede it with a new one.
- Trace execution paths on demand with `/orient-trace` instead of maintaining a flow doc.
<!-- ORIENT:END -->