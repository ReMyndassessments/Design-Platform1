---
name: Workshop manual-sales mode
description: Scope and safety rules for temporarily bypassing Airwallex on paid workshop purchases.
---

Paid workshop purchases use a server-controlled manual-sales mode: prospective attendees choose WeChat Pay, Alipay, or other payment options and verify their email instead of creating an Airwallex payment intent. QR payments require an uploaded receipt; other options trigger direct follow-up. Preserve the Airwallex integration for later restoration.

**Why:** The business temporarily needs to arrange workshop payments directly. This must not alter existing paid registrations, historical transactions, free workshop registration, or LSC/subscription payment behavior.

The payment section is additive: every workshop form, free or paid, must retain the full school-information, interests, school-needs, future-interest, and consent intake.

**How to apply:** Keep the bypass limited to paid workshop public entry points and enforce it on the server as well as the UI. Never hide or drop shared intake fields on free or paid forms when changing payment handling. QR receipt submission remains pending administrator verification; inquiry submission never creates paid access. Restore checkout only by disabling the workshop-specific flag after safely retesting Airwallex.