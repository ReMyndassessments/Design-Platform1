---
name: RAOS api-client codegen vs. live server drift
description: Why running `pnpm --filter @workspace/api-spec run codegen` in RAOS can silently drop enum values, and what to check before/after running it.
---

In the RAOS project, `lib/api-client-react` and `lib/api-zod` are generated
via orval from a checked-in OpenAPI spec (`lib/api-spec`). That spec has
drifted from the live route schemas in `artifacts/api-server` — e.g. running
codegen dropped the `"examiner"` respondent-type enum value from multiple
generated files because the spec doesn't currently declare it, even though
the live server enum and app code both use it.

**Why:** the spec is not auto-synced on every route change, so it can lag
behind actual server schemas. Regenerating from a stale spec silently
regresses working types/enums that many unrelated files depend on.

**How to apply:** if `useXyz` hooks appear "missing" from
`@workspace/api-client-react` during typecheck, first suspect a stale
TypeScript project-reference build cache — fix with
`cd lib/api-client-react && npx tsc --build --force` (and same for
`lib/api-zod`) rather than reaching for the `codegen` script. Only run
`codegen` deliberately (e.g. after intentionally updating the spec), and
diff the generated output afterward for unexpected deletions before trusting
it.
