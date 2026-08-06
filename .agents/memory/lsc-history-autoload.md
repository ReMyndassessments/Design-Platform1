---
name: LSC history auto-load behavior
description: How the LSC panel loads prior analysis from history and why this caused persistent guide display
---

## Rule
`loadLscHistory` previously auto-set `lscAnalysis` and `lscDisplayGuide` from the DB on every panel open. This caused the trial analysis guide to reappear every time the panel opened, even after the user dismissed it.

**Why:** History loading was designed to restore session context, but it had no concept of "dismissed" state.

**Fix applied:** `loadLscHistory` is now a no-op — it marks history as loaded but does not auto-populate `lscAnalysis`. Analysis only appears when the user actively runs one in the current session.

**How to apply:** If history restore is ever needed (e.g., "view previous analysis" button), add an explicit user-triggered call — never auto-restore on panel open.

## Related
- Dismiss X button clears `lscAnalysis`, `lscDisplayGuide`, `lscFollowUpMessages`, `lscContent` and saves `lsc_dismissed_{token}` to localStorage.
- `isAdminPreview` flag added to `/lsc/status` response so admin preview tokens show payment section after analysis (without modifying real subscription state).
