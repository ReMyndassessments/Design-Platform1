---
name: Execution sandbox constraints
description: Runtime-safe uniqueness and bounded bulk data reads for isolated validation.
---

The execution notebook in this workspace may lack a durable-scope crypto global and disable Date.now. When a unique temporary identifier is required, generate it with node:crypto inside a small impure function and return only the identifier.

**Why:** Assuming those durable-scope APIs were available interrupted preparation of an isolated SQL check before any query ran.

**How to apply:** Keep the actual database callbacks in durable scope, validate generated SQL identifiers, and use one transaction with rollback for temporary validation structures.

Large executeSql results can be replaced by a truncation marker at approximately 1 MiB, even when the query succeeded. Do not parse that marker as query data or interpret it as an empty result.

**Why:** Aggregating frozen questionnaire snapshots exceeded the result cap and prevented an otherwise valid read-only review check.

**How to apply:** Query only the needed metadata first. When raw snapshots are necessary, fetch bounded batches and validate that each result is complete before decoding it.