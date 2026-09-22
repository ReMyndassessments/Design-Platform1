---
name: Operational Gmail throttling
description: Rules for batching large approved operational recipient lists without misclassifying provider throttling as bad addresses.
---

Process large operational lists in groups of 50, but limit simultaneous SMTP sends within each group and use a pooled, rate-limited SMTP connection. Treat Gmail 4xx responses, especially 421 and 454 errors, as retryable provider failures rather than invalid recipient addresses. Only permanent address-specific failures should deactivate a saved operational contact.

**Why:** Sending many SMTP transactions concurrently produced widespread Gmail 421 responses; reducing concurrency without pooling then produced 454 “too many login attempts.” Both reflected provider throttling, not bad addresses.

**How to apply:** Keep low concurrency, pause between 50-recipient groups, and reuse one SMTP connection with an explicit rate limit. Preserve temporary failures for “Retry Failed” and future saved-list sends; deactivate only clear permanent mailbox/address failures such as 550/551/553 user-not-found responses.