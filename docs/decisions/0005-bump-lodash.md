# ADR-0005: Upgrade lodash to latest version

- Date: 2026-08-27
- Status: accepted
- Supersedes: none
- Superseded by: none

## Context
Commit 8b0584e bumped `lodash` from an older version to the latest release (4.17.21 → 4.18.1 at time of commit). The upgrade was triggered by a dependabot alert for a prototype‑pollution vulnerability in the previous version.

## Decision
Upgrade `lodash` to the latest patch version and run the test suite to ensure no behavioural changes.

## Why this over the alternatives
- Pin to an older, vulnerable version — rejected: security risk.
- Replace lodash utilities with native ES2021+ equivalents — rejected: would require a large refactor across the codebase; not justified for a patch update.
- Upgrade to latest patch — chosen: minimal risk, fixes the vulnerability, maintains API compatibility.

## Trade-offs accepted
- Minor chance of subtle behavioural differences (mitigated by full test run).

## Consequences
- The security vulnerability (CVE‑2021‑23337) is resolved.
- `package-lock.json` updated accordingly.
- No code changes required; lodash API remains stable.