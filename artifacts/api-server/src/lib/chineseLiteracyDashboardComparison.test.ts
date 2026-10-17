import test from "node:test";
import assert from "node:assert/strict";
import { comparisonDraftSchema, savedComparisonDraftSchema } from "./chineseLiteracyDashboardComparison.ts";

const legacyContent = {
  parentHome: "Parent observations.",
  teacherClassroom: "Teacher observations.",
  crossSetting: "Comparison interpretation.",
  recommendations: ["Try the evidence-linked classroom strategy."],
  limitations: "The sources are descriptive and not equivalent measures.",
};

test("new combined reports require an overall student summary", () => {
  assert.throws(() => comparisonDraftSchema.parse(legacyContent));
  const parsed = comparisonDraftSchema.parse({ ...legacyContent, overallSummary: "A source-aware student summary." });
  assert.equal(parsed.overallSummary, "A source-aware student summary.");
});

test("older saved comparison reports remain readable and get an empty summary for regeneration", () => {
  const parsed = savedComparisonDraftSchema.parse(legacyContent);
  assert.equal(parsed.overallSummary, "");
  assert.equal(parsed.parentHome, "Parent observations.");
});
