---
name: Execution sandbox uniqueness
description: Runtime-safe unique names for isolated development validation.
---

The execution notebook in this workspace may lack a durable-scope crypto global and disable Date.now. When a unique temporary identifier is required, generate it with node:crypto inside a small impure function and return only the identifier.

**Why:** Assuming those durable-scope APIs were available interrupted preparation of an isolated SQL check before any query ran.

**How to apply:** Keep the actual database callbacks in durable scope, validate generated SQL identifiers, and use one transaction with rollback for temporary validation structures.