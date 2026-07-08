---
name: RAOS apprentice case access model
description: Current rule for what cases a clinical_apprentice can see/edit in RAOS — read before changing apprentice permission logic.
---

Clinical apprentices in RAOS may only see or open a case (live or test) if a mentor has created an active `case_apprentice_assignments` row for it. There is no automatic/blanket visibility into all live cases.

- Assigned **test/training** cases: full admin-equivalent edit access (mentor coaching, no real student data at risk).
- Assigned **live** cases: strictly read-only.

**Why:** An earlier iteration granted apprentices automatic read-only access to every live case (no assignment required) to satisfy a "full read-only parity" requirement. The product owner explicitly reversed this — they want to curate exactly which cases (live or test) an apprentice can see, not grant blanket access.

**How to apply:** The single source of truth is `canUserAccessCase` in `artifacts/api-server/src/lib/permissions.ts` — it now always requires `isApprenticeAssignedToCase` for the `clinical_apprentice` role, regardless of case mode. Everything else (the `/cases` list filter, `apprenticeGuard` middleware, report routes, the watch-along WebSocket) calls through this function, so changing it here is sufficient — do not special-case live cases elsewhere. Before reintroducing any "apprentices can see all live cases" behavior, confirm with the user first — it was explicitly rejected once already.
