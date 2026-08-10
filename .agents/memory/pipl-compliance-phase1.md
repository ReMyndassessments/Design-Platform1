---
name: PIPL Compliance Foundation Phase 1
description: What was built, what was deferred, and key architectural decisions for RAOS PIPL compliance work.
---

## What was built (Phase 1)
- 5 new compliance tables: `compliance_data_inventory`, `compliance_vendors`, `compliance_policy_register`, `compliance_access_reviews`, `security_audit_events`
- All seeded on first boot in `createComplianceTables()` in `artifacts/api-server/src/index.ts`
- Admin-only API routes at `/api/compliance/*` in `artifacts/api-server/src/routes/compliance.ts`
- Frontend page at `/admin/privacy-compliance` in `artifacts/raos/src/pages/admin/privacy-compliance.tsx`
- Nav link in `artifacts/raos/src/components/layout.tsx` (admin only)
- AI de-identification: student name → case ID reference, DOB → [REDACTED] in `lib/ai.ts` `analyzeIntakeWithAI` and `generateReportWithAI` only

## AI providers and data findings
- **DeepSeek**: intake analysis + report generation + LSC. Was sending student name and DOB — now pseudonymised.
- **Groq LLaMA**: RAMRI/RAEPA text analysis. No direct identifiers found.
- **Groq Whisper**: Audio transcription. CRITICAL — audio cannot be de-identified. Recording consent required.
- **Gemini**: RAMRI/RAEPA vision. No direct identifiers found.

## Critical deferred items
- Groq Whisper recording consent — cannot de-identify audio without breaking function
- Cross-border transfer legal mechanism for DeepSeek + Groq (PIPL Art. 38)
- Free-text parent names in intake answers still reach DeepSeek
- 16 policy documents all at "not_started"

**Why:** Phase 1 is additive-only. Consent flows, blocking, and DPA negotiation require separate legal approval.

## Programme label
Internal label: "RAOS PIPL Compliance Programme — Phase 1 Foundation"
Never say "PIPL-Compliant" or "Fully PIPL-Compliant" anywhere.
