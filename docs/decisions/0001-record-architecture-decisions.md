# ADR-0001: Record architecture decisions

- Date: 2026-08-24
- Status: accepted
- Supersedes: none
- Superseded by: none

## Context
The ScoreDay project lacks a structured way to capture why architectural choices were made. As the codebase grows, new engineers (and future us) need to understand the rationale behind decisions like framework choice, data layer, and API patterns — without archaeology through commit history or code comments.

## Decision
Establish an Architecture Decision Record (ADR) practice in `docs/decisions/`. Each decision gets a sequentially numbered Markdown file (NNNN-kebab-title.md) following the template. ADRs are immutable once written; supersede with a new ADR instead of editing old ones.

## Why this over the alternatives
- ADR in `docs/decisions/` — chosen: lightweight, versioned with code, no external tooling
- Architecture wiki page — rejected: drifts from code, harder to discover
- Commit message conventions — rejected: hard to query, mixes "what" with "why"
- Code comments — rejected: scattered, not a decision log

## Trade-offs accepted
- Requires discipline to write ADRs at decision time
- Adds a file per decision (low overhead)

## Consequences
- New architectural decisions must be recorded via `/orient-decide`
- `AGENTS.md` will point agents to read relevant ADRs before changing that area
- `docs/STATE.md` tracks current focus; ADRs capture the "why" behind constraints