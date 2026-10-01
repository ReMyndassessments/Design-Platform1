---
name: PostgreSQL BIGINT ordering
description: Exact comparisons for raw PostgreSQL sequence values returned by node-postgres.
---

Treat PostgreSQL BIGINT and BIGSERIAL values returned by raw node-postgres queries as strings unless explicitly normalized. Compare sequence values with BigInt, not string comparisons or JavaScript numbers.

**Why:** Lexicographic ordering considers "10" older than "9", which can cause newer failure evidence to be ignored and preserve an invalid approval. Number conversion also loses precision for larger sequences.

**How to apply:** Any latest-record selection performed in JavaScript should compare database sequence values exactly. Include string boundary regressions such as 9 to 10 and values above Number.MAX_SAFE_INTEGER; TypeScript casts do not change the runtime representation.