---
name: Operational Gmail throttling
description: Rules for batching large approved operational recipient lists without misclassifying provider throttling as bad addresses.
---

Process large operational lists in groups of 50, but limit simultaneous SMTP sends within each group. Treat Gmail 4xx responses, especially 421 temporary system errors, as retryable provider failures rather than invalid recipient addresses. Only permanent address-specific failures should deactivate a saved operational contact.

**Why:** Sending 50 SMTP transactions concurrently produced widespread Gmail 421 responses after an initial successful subset. Those failures reflected provider throttling, not bad addresses.

**How to apply:** Keep low concurrency and a pause between 50-recipient groups. Preserve temporary failures for “Retry Failed” and future saved-list sends; deactivate only clear permanent mailbox/address failures such as 550/551/553 user-not-found responses.