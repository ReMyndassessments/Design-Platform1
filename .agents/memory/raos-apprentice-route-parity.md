---
name: RAOS apprentice route parity via allowApprentice
description: How ProtectedRoute gates clinical_apprentice access per-route in RAOS, and the silent-redirect failure mode when a route is missed.
---

In `artifacts/raos/src/App.tsx`, every case sub-route is wrapped in `ProtectedRoute`. Read-only parity for the `clinical_apprentice` role is granted per-route via an explicit `allowApprentice` prop — there is no single global flag. If a case sub-route is missing `allowApprentice`, `ProtectedRoute` silently redirects apprentices to `/apprentice/dashboard` on render (no error, no console warning).

**Why:** This caused a real bug — the `/cases/:id/scoring` route was missing `allowApprentice`, so apprentices were silently bounced to their dashboard whenever they landed there (via direct click, deep link, or programmatic navigation like the watch-along auto-follow feature). It looked like a websocket/navigation bug during testing but was actually a routing/access-control gap.

**How to apply:** Whenever adding a new case sub-page, or extending any feature that programmatically navigates users (e.g. live "watch along", deep links, redirects), check that every reachable `/cases/:id/...` route the apprentice might land on has `allowApprentice` set in `App.tsx`. When a feature that navigates a user lands them on a blank/dashboard page unexpectedly, check the route's `ProtectedRoute` flags before assuming the navigation trigger itself is broken. Also remember: read-only parity at the route level doesn't gate individual mutating actions on the page itself (e.g. buttons) — those need their own `canEdit`-style checks (see `report.tsx`'s `isApprenticeOnTestCase` pattern: apprentices get full edit only on `caseMode === "test"` cases, read-only on live cases).
