---
name: Runtime credential checks
description: How to resolve a mismatch between the environment inventory and credentials available to the running app.
---

The secrets inventory can report a credential absent even when the workspace shell and running service have it in their inherited environment. Do not ask a user to provide an existing credential based on inventory absence alone.

**Why:** An inventory-only check produced a false negative; a presence-only runtime check and a minimal provider request confirmed the credential was usable.

**How to apply:** When the user says a credential already exists, verify only whether the running process has the named variable, without printing its value, and make a minimal non-destructive provider request if necessary. Do not record credential contents.