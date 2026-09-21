---
name: EmailOctopus bulk preparation
description: Reliability rules for preparing large EmailOctopus campaign audiences.
---

Large EmailOctopus audiences must be prepared asynchronously rather than inside the initiating HTTP request. Keep contact uploads below the provider rate limit and persist the dedicated list ID immediately after creation so a failed retry resumes the same list.

**Why:** Uploading hundreds of contacts synchronously exceeded the request window and returned a campaign-level failure before any recipient could be processed. Saving the list reference only at the end also caused retries to create fresh lists.

**How to apply:** For bulk promotional campaigns, acknowledge preparation immediately, show a preparing state, poll until ready or failed, throttle provider calls, preserve the provider list reference early, and store/log the exact provider error. Normalize angle-bracket-wrapped addresses before validation and provider upload. A `list:` reference is a prepared audience, not a campaign report ID.