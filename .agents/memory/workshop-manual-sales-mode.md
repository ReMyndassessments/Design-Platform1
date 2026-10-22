---
name: Workshop manual-sales mode
description: Scope and safety rules for temporarily bypassing Airwallex on paid workshop purchases.
---

Paid workshop purchases use a server-controlled manual-sales mode: prospective attendees choose WeChat Pay, Alipay, or Credit Card and verify their email instead of creating an Airwallex payment intent. QR payments require an uploaded receipt; Credit Card triggers a ReMynd payment-link follow-up. Preserve the Airwallex integration for later restoration.

Workshop payment requests and registrations belong in Training, never in the RAOS assessment Inquiries queue. Keep pending payment review separate from confirmed attendees' workshop rosters, and preserve existing registration/payment records when separating the views.

**Why:** Workshop payments are operational registration records, not assessment referrals. Mixing them into assessment triage confuses staff and risks mishandling real registrations. The business temporarily needs to arrange workshop payments directly. This must not alter existing paid registrations, historical transactions, free workshop registration, or LSC/subscription payment behavior.

The payment section is additive: every workshop form, free or paid, must retain the full school-information, interests, school-needs, future-interest, and consent intake.

**How to apply:** Keep the bypass limited to paid workshop public entry points and enforce it on the server as well as the UI. Place payment-request review and attendee management in Training; keep workshop requests out of RAOS Inquiries. Serve configured QR artwork through an API image endpoint rather than direct object paths. Never hide or drop shared intake fields on free or paid forms when changing payment handling. QR receipt submission remains pending administrator verification; inquiry submission never creates paid access. Restore checkout only by disabling the workshop-specific flag after safely retesting Airwallex.