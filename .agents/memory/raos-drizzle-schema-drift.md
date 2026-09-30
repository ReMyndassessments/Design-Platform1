---
name: RAOS Drizzle schema drift
description: Development database push may confuse runtime-managed legacy tables with schema renames
---

The generic Drizzle schema push can present a large ambiguous rename list involving unrelated legacy tables, even for a small additive change. Do not accept those prompts or run a force push.

**Why:** The database contains many tables maintained outside the compact Drizzle schema. A push tried to interpret them as possible renames rather than just applying the intended additive column; accepting the wrong option would risk data loss.

**How to apply:** Keep intended changes in the schema source, inspect any push proposal, and stop when unrelated renames or drops appear. A narrowly scoped development-only additive change may be needed when the broad push is unsafe; production schema changes must go through Publish, never direct production DDL or startup-time self-healing.