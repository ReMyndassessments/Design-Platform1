---
name: Drizzle raw SQL array parameters
description: ANY(${array}) in drizzle sql`` template is unreliable — use attribute WHERE clauses or scalar loops instead
---

**Rule:** Never use `sql\`WHERE id = ANY(${someArray})\`` in `db.execute()` calls. The drizzle `sql` tagged template does not reliably serialize a JS `string[]` as a PostgreSQL array parameter, causing silent 500 errors.

**Why:** The `ramri_work_samples` table has no drizzle schema definition (created inline via raw SQL in index.ts), so `inArray()` from drizzle-orm cannot be used either. The `ANY(${array})` pattern consistently caused 500 crashes on the suggest-interview-samples endpoint even though it looks valid.

**How to apply:**
- Attribute-based WHERE (preferred): filter by column values directly, e.g. `WHERE answer_status = 'correct' OR suitability = 'excluded'`
- Scalar loop (for small sets ≤10): `for (const id of ids) { await db.execute(sql\`UPDATE ... WHERE id = ${id}\`) }`
- For ORM-schema tables (cases, assignments, etc.): `inArray()` from drizzle-orm works fine
