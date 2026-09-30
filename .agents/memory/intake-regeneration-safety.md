---
name: Intake regeneration safety
description: Why re-running clinical intake analysis must not erase related settings or substitute a failed AI response.
---

An intake-analysis regeneration should replace only the AI-generated portions of the result, preserve other case settings stored alongside them, and retain the prior analysis if AI generation fails.

**Why:** The analysis document also stores clinician decisions and unrelated product/dashboard settings; replacing it wholesale silently discards those choices. A provider failure must not replace a useful clinical summary with a generic fallback.

**How to apply:** When changing intake synthesis, merge only generated fields into the current stored document, and keep generation failure separate from successful output. Include newly saved parent interview sources, but never use unsaved browser drafts.

Parseable JSON from the AI is not necessarily a successful analysis. Require the full expected clinical result before replacing any generated fields.

**Why:** A model can return `{}` or partial JSON without a parsing error; filling missing fields with defaults would erase a useful previous summary and recommendations.

**How to apply:** Reject incomplete results before the database update so the existing analysis remains intact, while making the failure visible to staff.

Follow-up answers and verified assessment-lead clarifications can be included in future regeneration. Keep exploratory AI discussion separate: a question or hypothetical scenario in chat is not automatically a confirmed case fact.

**Why:** Clinical decisions need a traceable distinction between evidence received, the lead's verified context, and exploratory AI advice.

**How to apply:** Require an explicit save of source answers or lead clarifications before making them input to regeneration. AI conversation can advise about missing evidence but must not automatically rewrite the case, assigned tools, or report.

For current age and grade, the structured case birth date and grade take precedence over approximate ages or historic grade references in interviews and forms. Do not infer a replacement birth date from an approximate age in narrative notes.

**Why:** A family narrative may describe a prior school transition or round a child's age; treating it as current demographics can produce a mixed-grade or incorrect-age clinical summary after regeneration.

**How to apply:** Let authorized users correct structured demographics explicitly, show the saved values before regeneration, and tell the AI to identify conflicts for review rather than blending multiple current values. Calculate age from the birth date at the time of analysis.