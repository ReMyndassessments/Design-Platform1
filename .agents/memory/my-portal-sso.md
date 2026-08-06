---
name: my-portal SSO via URL params
description: How the Intervention Progress Tracker SSO flow works from the external portal
---

## Rule
The "View Progress Dashboard" button in the external portal (`[token].tsx`) builds a URL to `/my-portal` with `caseId` and `password` as query params. The `my-portal.tsx` page detects those params on mount via `useEffect` and calls `doLogin()` automatically — no form interaction needed.

**Why:** The credentials are stored in `bobbyAiPortalCredentials` on the case. Extracting them and passing via URL params enables true SSO without a separate auth backend.

**How to apply:**
- Deep link format: `/my-portal?caseId=ENCODED_ID&password=ENCODED_CODE`
- Params are extracted via regex: `Case ID: ...` and `Access Code: ...` patterns in `bobbyAiPortalCredentials`
- `my-portal.tsx` reads `window.location.search` on render and fires `doLogin` in a `useEffect([], [])` when both params present
- Falls through to manual form if params are missing

## Files
- `artifacts/raos/src/pages/external/[token].tsx` — builds deepLink with encoded params
- `artifacts/raos/src/pages/my-portal.tsx` — reads params, auto-submits login
