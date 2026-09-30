---
name: RAOS battery review policy
description: Approval authority and safe internal testing of assigned assessment forms
---

Only an administrator signs off the assessment battery before new recipient emails are sent. Administrators and psychometricians both need to inspect and interactively test the exact assigned form version without recording an opened-form event or saving answers as clinical responses. A changed battery needs fresh admin approval.

**Why:** The user wants a deliberate accuracy/function check before forms reach parents or teachers and clarified “Admin only” when asked who should approve. Real respondent tokens are inappropriate for staff testing because they can change audit state and persist responses.

**How to apply:** Keep dry-run routes authenticated and non-saving, make server-side send authorization depend on current approval, and distinguish staff tests from real respondent links. Do not treat access to preview as authority to approve.