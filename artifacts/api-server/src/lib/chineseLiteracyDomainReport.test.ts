import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChineseLiteracyDomainObservations } from "./chineseLiteracyDomainReport.ts";

function document(respondent: "parent" | "teacher", values: number[] = [1, 3, 4, 4]) {
  const domain = {
    id: "R",
    label: "Reading",
    items: values.map((_, index) => ({ id: `R${index + 1}`, text: `Reading item ${index + 1}` })),
  };
  return {
    metadata: { respondent, domains: [domain] },
    selectedDomains: ["R"],
    input: {
      responses: values.map((value, index) => ({ itemId: `R${index + 1}`, status: "rated", value })),
      evidence: { R: { strengths: "Enjoys shared stories", supports: "Reads together", examples: [{ text: "Reads a short passage", itemIds: ["R2"] }] } },
    },
    scores: [{
      id: "R", displayMean: "3.0", validCount: values.length, applicableCount: values.length,
      requiredValidCount: 4, coverage: 1, frequentDifficultyCount: 2,
      frequentDifficultyItemIds: ["R3", "R4"], notObservedCount: 0, notApplicableCount: 0,
      unansweredCount: 0, impact: 1,
    }],
  } as any;
}

test("domain report derives a five-level distribution and a descriptive, non-diagnostic explanation", () => {
  const [reading] = buildChineseLiteracyDomainObservations(document("teacher"));
  assert.deepEqual(reading.distribution.map(({ value, count }) => [value, count]), [
    [1, 1], [2, 0], [3, 1], [4, 2], [5, 0],
  ]);
  assert.match(reading.narrative, /The descriptive mean is 3.0 of 5/);
  assert.doesNotMatch(reading.narrative, /parent's home-setting record only|teacher's teaching-setting record only/);
  assert.match(reading.interpretation, /Often|Almost always/);
  assert.match(reading.planningRecommendation, /Support plan/);
  assert.equal(reading.itemsWithFrequentRatings.length, 2);
  assert.equal(reading.itemsForDiscussion.length, 3);
});

test("interpretation explains occasional-to-sometimes patterns and separates reported impact", () => {
  const doc = document("parent", [2, 2, 2, 3, 3]);
  doc.scores[0].displayMean = "2.4";
  doc.scores[0].frequentDifficultyCount = 0;
  doc.scores[0].frequentDifficultyItemIds = [];
  doc.scores[0].impact = 3;
  const [reading] = buildChineseLiteracyDomainObservations(doc);
  assert.match(reading.interpretation, /Occasionally/);
  assert.match(reading.interpretation, /Sometimes/);
  assert.match(reading.interpretation, /Substantial restriction of participation/);
  assert.match(reading.planningRecommendation, /R4, R5/);
  assert.match(reading.planningRecommendation, /Support plan/);
});

test("domain report shows missing coverage without inventing a mean", () => {
  const doc = document("parent", []);
  doc.scores[0].displayMean = null;
  doc.scores[0].validCount = 0;
  doc.scores[0].applicableCount = 4;
  doc.scores[0].requiredValidCount = 4;
  doc.scores[0].coverage = 0;
  doc.scores[0].frequentDifficultyCount = 0;
  doc.scores[0].frequentDifficultyItemIds = [];
  const [reading] = buildChineseLiteracyDomainObservations(doc);
  assert.equal(reading.mean, null);
  assert.match(reading.narrative, /A domain mean is not reported/);
  assert.match(reading.interpretation, /no numeric frequency ratings to interpret/);
  assert.match(reading.planningRecommendation, /incomplete ratings/);
});

