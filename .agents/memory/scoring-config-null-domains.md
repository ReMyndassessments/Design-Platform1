---
name: RAOS scoring config null domains
description: BRIEF-2 and tools with minimal scoring configs crash frontend when domain keys are accessed without double optional chaining.
---

## Rule
Always use `scoringConfig?.domains?.[key]` (double `?.`) when looking up a domain in a scoring config. `scoringConfig?.domains[key]` only guards `scoringConfig` being null — if `scoringConfig` exists but has no `domains` key, the second access crashes.

## Why
BRIEF-2's `scoring_config` in the DB is `{"max": 2}` — it has no `domains` object. `getDomainInfo` in `[assignmentId].tsx` used `scoringConfig?.domains[key]`, which threw "Cannot read properties of undefined (reading '<domainName>')" (e.g. 'shift', 'anxiety') whenever `scoringConfig` was non-null but lacked a `domains` key.

## How to apply
- `getDomainInfo`: `scoringConfig?.domains?.[key]` ✓ (fixed)
- Same pattern applies anywhere scoring config sub-properties are accessed: always chain `?.` at each level.
- `normalizedScores` from the DB can also be null even when typed as `Record<string,number>` — always guard with `?? {}` before indexing.

## Safety net
`ScoreCardErrorBoundary` wraps the entire score card IIFE in `[assignmentId].tsx`. Any future crash in score rendering shows an inline amber error rather than crashing the full response viewer page. This must be preserved in future edits.
