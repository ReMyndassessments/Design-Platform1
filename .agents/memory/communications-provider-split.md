---
name: RAOS communications provider split
description: Durable delivery, consent, privacy, and live-data safety rules for the Communications Center.
---

Use Gmail for direct, individual, case-related, staff, test, and small operational messages. Send one Gmail transaction per recipient, never expose recipient addresses, and cap Gmail groups at 50 recipients. Use EmailOctopus only for consent-eligible cohort, newsletter, and promotional campaigns.

**Why:** Case-service consent is not promotional consent. Bulk-provider synchronization must never leak confidential assessment or case information, and existing provider contacts must not be silently changed or resubscribed.

**How to apply:** Keep communications changes additive and preserve authoritative source records. Operational Gmail messages remain capped at 50. Admins may paste a promotional list only after explicitly confirming prior marketing consent. For continuation sends, match the internal campaign name and exclude addresses already recorded as sent or delivered. EmailOctopus's documented API cannot create or dispatch broadcasts: RAOS prepares a timestamped dedicated filtered list, the admin sends it in the EmailOctopus dashboard, then explicitly confirms the external send in RAOS so local exclusion history is updated. Populate large lists with a small bounded worker pool; sequential contact creation exceeds production request timeouts, while unbounded concurrency risks provider limits. A normal Send Now message sent to the administrator as a final check is still a real send, so do not auto-label it as a test; show recipient details and require explicit deletion instead. Reference source type and source ID when one exists. Synchronize only minimum campaign data to EmailOctopus, honor local suppressions, use Gmail for all dedicated test sends, and never modify or auto-resubscribe an existing EmailOctopus contact.

For targeted intake questions, one-to-one Gmail invitations must be branded, link to the respondent's existing ReMynd portal, and contain NO question text. An admin's test email links to a short-lived, read-only preview in that same portal; it must not create a real invitation or accept answers. Repeated sends and additional recipients are intentional.

**Why:** The user corrected an earlier email containing bare questions as unprofessional and potentially harmful during first contact with teachers and parents. The intended experience is to view and answer requests inside the established respondent portal, never inside the email itself.

**How to apply:** Every teacher/parent action-request email should direct the recipient into the actual respondent portal component, not a similar-looking separate page. An early question-only invitation's private link should show that same recipient's forms as they are assigned later; match by case, exact recipient email, and respondent role to prevent cross-recipient exposure. Keep test previews distinct from real invitations, scope test delivery to the signed-in admin's account, and preserve the original question snapshot when resending a real invitation. Do not send another live test email automatically when correcting templates.

An opt-out from Communications Center must retain a minimal hard suppression while removing the saved operational contact; keep historical recipient records. Do not downgrade a hard block to promotional-only when processing a later provider event.

**Why:** Deleting every trace permits the address to be sourced again. EmailOctopus native unsubscribes are list-scoped; a new dedicated list could otherwise re-add an address that opted out on an older list.

**How to apply:** Reconcile native EmailOctopus unsubscribes into the shared hard block, and check it at both audience preparation and actual Gmail delivery. A provider list prepared before the opt-out remains a separate cleanup responsibility; do not claim it was removed merely because RAOS blocked the address.