---
name: Intake regeneration safety
description: Why re-running clinical intake analysis must not erase related settings or substitute a failed AI response.
---

An intake-analysis regeneration should replace only the AI-generated portions of the result, preserve other case settings stored alongside them, and retain the prior analysis if AI generation fails.

**Why:** The analysis document also stores clinician decisions and unrelated product/dashboard settings; replacing it wholesale silently discards those choices. A provider failure must not replace a useful clinical summary with a generic fallback.

**How to apply:** When changing intake synthesis, merge only generated fields into the current stored document, and keep generation failure separate from successful output. Include newly saved parent interview sources, but never use unsaved browser drafts.

Follow-up answers and verified assessment-lead clarifications can be included in future regeneration. Keep exploratory AI discussion separate: a question or hypothetical scenario in chat is not automatically a confirmed case fact.

**Why:** Clinical decisions need a traceable distinction between evidence received, the lead's verified context, and exploratory AI advice.

**How to apply:** Require an explicit save of source answers or lead clarifications before making them input to regeneration. AI conversation can advise about missing evidence but must not automatically rewrite the case, assigned tools, or report.