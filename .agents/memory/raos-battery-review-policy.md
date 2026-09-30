---
name: RAOS battery review policy
description: Approval authority and safe internal testing of assigned assessment forms
---

Only an administrator signs off the assessment battery before new recipient emails are sent. Administrators and psychometricians can inspect and interactively test the exact assigned form version without saving answers as clinical responses. The administrator may also send a separate, short-lived, test-only package link to any email address (no RAOS account required), but that route must never submit responses or mutate respondent assignments or live links. A changed battery needs fresh admin approval.

**Why:** The user wants a deliberate accuracy/function check before forms reach parents or teachers and clarified “Admin only” when asked who should approve. After briefly choosing account-bound invites, the user explicitly rejected adding account complexity and requested that the administrator send a testing link to any email address. The test link therefore must be clearly separate from real respondent links, temporary, non-submitting, and must not leak student identity.

**How to apply:** Keep the case-scoped review page restricted to admin/psychometrician. Make arbitrary-email test invitations admin-only; scope each expiring test token to selected parent/teacher assignments, show only neutral test identity, and render through the no-save preview form. Keep production respondent-email sending dependent on current admin approval. Do not expose or reuse live respondent links in test emails, and do not alter live recipient fields.