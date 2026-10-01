---
name: Intake response compatibility
description: Why old combined replies must remain intact alongside per-question intake answers.
---

Keep previously submitted combined-text intake responses readable as written when introducing or changing per-question answer fields. Do not automatically split an old narrative into individual answers; a respondent may explicitly replace it only while the case is still in the intake-stage phases.

**Why:** A combined reply may contain context, qualifications, or numbering that cannot be reliably assigned to a specific question. Guessing at a split could change clinical meaning or hide information from staff.

**How to apply:** In respondent and staff views, render both saved formats clearly. Preserve the old text during editing until a new submission succeeds, and check that downstream clinical review can still interpret the submitted response.

Submitted additional intake replies must be read-only for respondents once the internal case phase reaches assessment, including every later phase. Apply this to parent and teacher replies through both original question-only invitations and assignment portals. Do not derive permissions from the simplified phase shown to respondents.

**Why:** The original replies informed intake analysis and assessment recommendations. Respondent edits after that stage would change the underlying evidence without revising those decisions. Some older invitations still display an intake phase even after the case has advanced.

**How to apply:** Hide editing controls and reject overwrites on the server without changing the answer or submission timestamp. Serialize the phase check and response write with case phase updates. An unanswered request may accept its first reply; once submitted in assessment or later, that reply is also locked. Intake-stage corrections remain available before assessment.