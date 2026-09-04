---
name: Workshop manual-sales mode
description: Scope and safety rules for temporarily bypassing Airwallex on paid workshop purchases.
---

Paid workshop purchases use a server-controlled manual-sales mode: prospective attendees verify their email and submit an inquiry instead of creating a registration or Airwallex payment intent. Preserve the Airwallex integration for later restoration.

**Why:** The business temporarily needs to arrange workshop payments directly. This must not alter existing paid registrations, historical transactions, free workshop registration, or LSC/subscription payment behavior.

**How to apply:** Keep the bypass limited to paid workshop public entry points and enforce it on the server as well as the UI. Inquiry submission never creates paid access. Restore checkout only by disabling the workshop-specific flag after safely retesting Airwallex.