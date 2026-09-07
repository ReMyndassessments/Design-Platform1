---
name: RAOS communications provider split
description: Durable delivery, consent, privacy, and live-data safety rules for the Communications Center.
---

Use Gmail for direct, individual, case-related, staff, test, and small operational messages. Send one Gmail transaction per recipient, never expose recipient addresses, and cap Gmail groups at 50 recipients. Use EmailOctopus only for consent-eligible cohort, newsletter, and promotional campaigns.

**Why:** Case-service consent is not promotional consent. Bulk-provider synchronization must never leak confidential assessment or case information, and existing provider contacts must not be silently changed or resubscribed.

**How to apply:** Keep communications changes additive and preserve authoritative source records. Operational Gmail messages remain capped at 50. Admins may paste a promotional list only after explicitly confirming prior marketing consent. For continuation sends, match the internal campaign name and exclude addresses already recorded as sent or delivered. Bind each EmailOctopus campaign to a dedicated filtered list so the provider cannot resend to the whole default list. Populate large dedicated lists with a small bounded worker pool; sequential contact creation exceeds production request timeouts, while unbounded concurrency risks provider limits. A normal Send Now message sent to the administrator as a final check is still a real send, so do not auto-label it as a test; show recipient details and require explicit deletion instead. Reference source type and source ID when one exists. Synchronize only minimum campaign data to EmailOctopus, honor local suppressions, use Gmail for all dedicated test sends, and never modify or auto-resubscribe an existing EmailOctopus contact.