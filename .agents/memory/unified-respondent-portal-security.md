---
name: Unified respondent portal security
description: Security boundaries when reusing an intake invitation for later reports and debrief meetings
---

Reuse an earlier respondent link for report or debrief invitations only when the case, recipient email, and parent/teacher role all match. Treat the older link as a bearer capability for the respondent portal, not as proof of parental consent: modifying school report access requires the report access code and a completed parent download. An admin preview may demonstrate this flow but must not unlock or notify real recipients.

**Why:** A question link may have been issued well before the confidential report. Returning a report token ID to that link would let its holder change school access unless the consent endpoint independently checks the code and download. Preview tokens also coexist with live tokens on a case.

**How to apply:** When adding new report or meeting delivery paths, match by case, normalized email, and compatible role; gate report downloads and consent on the recipient's report token; keep preview recipient updates separate from live permissions and notifications.