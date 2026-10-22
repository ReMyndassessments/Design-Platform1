---
name: Development database safety boundary
description: Keep test writes in Replit's isolated development database when shell and workflow environments differ.
---

Do not assume a ShellExec process shares the same database target as the development workflow. In this workspace, shell runtime reported a production environment while the development database callback and dev-domain API were isolated to the development database. Use explicit `executeSql` calls with `environment: "development"` for SQL checks, and use the development domain only when exercising the dev API. Verify any synthetic record through the development database callback before proceeding.

**Why:** The shell's inherited runtime context can differ from the application's configured development workflow. Direct database commands could therefore write to the wrong environment despite a development testing goal.

**How to apply:** Before database-backed tests in a multi-environment Replit project, confirm the target using environment-scoped database tools. Avoid direct shell database commands whenever the shell's environment is ambiguous.
