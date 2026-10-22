import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSycAnalysisOutput } from "./strengthen-core-analysis-response.ts";

test("SYC analysis schema stays bounded when the model returns many missing-information items", () => {
  const response = {
    referralSummary: "A school application was submitted.",
    primaryEducationalQuestion: "What support may help?",
    studentStrengths: [],
    observedConcerns: [],
    interpretations: [],
    alternativeExplanations: [],
    recommendedExtension: null,
    assessmentJustification: "",
    interventionPlanDraft: {
      readiness: "more_information_required",
      priorityTargets: [],
      supportStrategies: [],
      observableGoals: [],
      progressMonitoring: [],
    },
    missingInformation: Array.from({ length: 20 }, (_, index) => `Item ${index + 1}`),
    suitability: "additional_information_required",
    safetyFlags: [],
  };

  const normalized = normalizeSycAnalysisOutput(response) as typeof response;
  assert.equal(normalized.missingInformation.length, 12);
  assert.equal(normalized.missingInformation[0], "Item 1");
  assert.equal(normalized.missingInformation[11], "Item 12");
});
