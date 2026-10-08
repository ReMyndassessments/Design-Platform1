---
name: RAOS battery review policy
description: Approval authority and safe internal testing of assigned assessment forms
---

A completed staff functionality test must persist once answer validation and all four human confirmations are complete; do not require an additional, easily missed save step.

**Why:** The user repeatedly reported having completed testing while the case still showed “Not tested.” A local answer-validation success is not a persisted staff acceptance result.

**How to apply:** Make successful persistence visible and verifiable after reload. Keep failed saves visible with a retry path. Never fabricate an earlier pass or treat clinical submissions as staff-test evidence.

Questionnaire-link approval must not block authorized internal examiner assessments.

**Why:** The user found examiner forms unavailable because an unrelated BEHAVOBS questionnaire check was outstanding. Approval governs recipient sharing, not internal examiner administration.

**How to apply:** Keep RRFA, RDA, RPPI, RRCA and the other specialized examiner workflows accessible through their existing authorized routes, including from the review list. Preserve current staff-review approval gates on invitation emails, not retrieval of existing respondent package links.

Authorized staff must be able to copy an existing respondent package link or display its QR code even when current battery approval is outstanding. Do not resend email, regenerate links, or reset responses merely to recover access to that link.

**Why:** The user explicitly asked to unblock a teacher's existing QR code and link; a case-wide review hold prevented retrieving an already-created package.

**How to apply:** Separate QR/copy controls for canonical existing package links from new invitation-email dispatch. Keep email approval checks and case authorization intact.

Require a current recorded pass covering every questionnaire before admin approval. Identical copies across cases can share one recorded check, with an optional test-again action; opening a preview is not evidence of testing. The pass covers required-answer validation and a human checklist, not scoring accuracy or clinical validity. Test answers may be validated transiently but must not become clinical responses.

**Why:** The user approved persistent test results and mandatory current passes, then explicitly requested that identical teacher/parent forms share a pass and that reassignment to a different case retain the already-tested status without removing the option to test again.

**How to apply:** Share across cases only for the same questionnaire content, item/option order, and rendering behavior—not by recipient name, teacher slot, or assigned respondent language. Existing valid evidence may cover matching copies; do not copy answers, source-case recipient details, or clinical notes, or claim each recipient was independently tested. Verified form checks remain valid after recipient-only changes. Later failures override prior passes across matching copies, and changed form scope requires retesting. Battery sign-off is still case-specific. Unauthenticated emailed previews cannot certify a staff test. Previously sent respondent links must remain usable when staff approval is no longer current.

Staff functionality testing defaults to English and must not depend on the respondent's assigned language. Preserve the respondent's preferred language separately and record the language actually tested; a functionality pass is not certification of unreviewed translations.

**Why:** The user explicitly rejected requiring staff to test in a case's assigned language, and required English testing with reusable passes instead of repeating checks for each case or language.

**How to apply:** Do not reject an English staff-test pass because the case uses Mandarin or another respondent language. Match reusable evidence by form content/version and rendering behavior. Preserve verified legacy passes when changing that equivalence rule, rather than making the whole catalogue require retesting.

Only an administrator signs off the assessment battery before new recipient emails are sent. Administrators and psychometricians can inspect and interactively test snapshot-based questionnaires without saving answers as clinical responses. Some assigned examiner assessments use separate operational workflows rather than standard questionnaire items; these are not safely tested in the generic staff dry run. The administrator may send a separate, short-lived, test-only questionnaire package link to any email address (no RAOS account required), but that route must never submit responses or mutate respondent assignments or live links. A changed battery needs fresh admin approval.

**Why:** The user wants a deliberate accuracy/function check before forms reach parents or teachers and clarified “Admin only” when asked who should approve. They rejected account-bound invites in favor of entering any email address. On a live mixed battery, generic snapshot validation mistakenly counted examiner workflows as missing questionnaires; the user explicitly corrected the inference that those assessments had no content. Examiner operational pages can autosave, so opening them is not a safe dry run.

**How to apply:** Keep the case-scoped review page restricted to admin/psychometrician. Distinguish questionnaire snapshots from confirmed examiner workflows and never equate an empty generic snapshot with an empty assessment; clearly label examiner workflows as not tested here. Genuine missing respondent questionnaires must still block approval. Make arbitrary-email test invitations admin-only; scope each expiring token to selected parent/teacher assignments, show only neutral test identity, and render through the no-save preview form. Keep respondent sends dependent on current admin approval. Do not expose live links in test emails or alter live recipient fields.

RPPI is always an examiner-administered assessment, not a respondent questionnaire. Legacy text-entry snapshots or incorrect recipient labels must not make it eligible for generic questionnaire testing or require a questionnaire pass.

**Why:** The user identified the blank RPPI dry run as meaningless: its operational examiner record was being rendered as if it were a text questionnaire.

**How to apply:** Exclude RPPI from questionnaire previews, pass recording, shared-result groups, and test packages. Display it with the separate examiner assessments. Do not open its live session merely to test it or change existing records. An examiner-only battery has no questionnaire tests to complete.

Examiner instructions must be specific to the assessment being administered: “only the relevant instruction for the specific form.”

**Why:** The user explicitly approved adding the literacy examiner manuals only with this scope restriction, not a combined manual repeated on every form.

**How to apply:** Keep student scripts, administration, scoring caveats, and completion guidance relevant to the current assessment. Do not expose another assessment’s instructions on that form.