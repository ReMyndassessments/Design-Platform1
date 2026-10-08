import { CONTEXT_REQUIRED, PARENT_CONTEXT_REQUIRED, isParentMeta, normalizeInput } from "./logic";
import type { ClInput, ClMetadata, InterfaceLanguage } from "./types";

/** Complete synthetic dry-run fixture, never a clinical observation. */
export function literacyTestSample(meta: ClMetadata, language: InterfaceLanguage): ClInput {
  const sample = normalizeInput(null, meta, "6");
  const text = "SAMPLE ONLY — synthetic staff functionality test, not a student observation.";
  for (const [key] of isParentMeta(meta) ? PARENT_CONTEXT_REQUIRED : CONTEXT_REQUIRED) sample.context[key] = text;
  Object.assign(sample.context, {
    grade: "6", teacherRole: "Chinese language teacher", relationship: "Parent",
    contactFrequency: "Daily", script: "simplified", spokenVariety: "mandarin",
    instruction: "main curriculum", readingConfidence: "comfortable", writingConfidence: "comfortable",
    observationLanguage: "Mandarin", homeLanguages: "Mandarin",
    observationStart: "2026-01-01", observationEnd: "2026-02-15",
    completionDate: "2026-02-15", confirmationDate: "2026-02-15",
    assistanceMode: "independent", parentConfirmed: "yes",
  });
  if (isParentMeta(meta)) {
    Object.assign(sample.context, {
      schoolFeedback: text, schoolFeedbackSource: "Synthetic test source",
      participationImpact: text, questions: text,
    });
  }
  sample.responses = sample.responses.map(response => ({ ...response, status: "rated", value: 2 }));
  for (const domain of meta.domains) {
    sample.sections[domain.id] = { decision: "complete" };
    sample.evidence[domain.id] = {
      ...sample.evidence[domain.id], setting: "Sample home/classroom setting", language: "Mandarin",
      strengths: text, supports: text, opportunities: 5, impact: 1,
      examples: [{ itemIds: domain.items.map(item => item.id), text }],
    };
  }
  sample.summary = { strengths: text, barriers: text, supportResponse: text, discussion: text, priorities: [] };
  sample.interfaceLanguage = language;
  return sample;
}
