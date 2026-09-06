---
name: RAOS communications provider split
description: Durable delivery, consent, privacy, and live-data safety rules for the Communications Center.
---

Use Gmail for direct, individual, case-related, staff, test, and small operational messages. Send one Gmail transaction per recipient, never expose recipient addresses, and cap Gmail groups at 50 recipients. Use EmailOctopus only for consent-eligible cohort, newsletter, and promotional campaigns.

**Why:** Case-service consent is not promotional consent. Bulk-provider synchronization must never leak confidential assessment or case information, and existing provider contacts must not be silently changed or resubscribed.

**How to apply:** Keep communications changes additive and preserve authoritative source records. Operational Gmail messages may include manually entered external addresses and remain capped at 50; never offer manual recipients for promotional sends. Reference source type and source ID when one exists. Synchronize only minimum campaign data to EmailOctopus, honor local suppressions, use Gmail for all test sends, and never modify or auto-resubscribe an existing EmailOctopus contact.