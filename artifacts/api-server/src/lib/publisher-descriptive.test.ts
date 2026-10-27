import test from "node:test";
import assert from "node:assert/strict";
import { buildPublisherDescriptiveRecord, isPublisherScoredToolId } from "./publisher-descriptive.ts";

test("BASC mixed response types stay in separate saved-option groups and numeric codes are not remapped", () => {
  const report = buildPublisherDescriptiveRecord({
    toolId: "BASC3-SRP-A",
    language: "english",
    questions: [
      { id: "h1", type: "section_header", text: "Instructions" },
      { id: "tf1", type: "likert", text: "Synthetic true/false item", options: ["True", "False"] },
      { id: "freq1", type: "likert", text: "Synthetic frequency item", options: ["Never", "Sometimes", "Often", "Almost Always"] },
    ],
    answers: { tf1: "True", freq1: 2 },
    currentDefinitionItemCount: 2,
  });

  assert.equal(report.reportingState, "descriptive_only");
  assert.equal(report.standardizedScoringEligibility, "blocked");
  assert.equal(report.items[1]?.response, "Recorded code/value: 2");
  assert.equal(report.responseFrequencyGroups.length, 2);
  assert.equal(report.responseValidity, "not_available");
  assert.match(report.summary, /RESPONSE-BASED SCREENING NARRATIVE/);
  assert.match(report.summary, /stored as a code\/value/i);
  assert.match(report.summary, /does not calculate scores/i);
  assert.equal("normalizedScores" in report, false);
  assert.equal("domainScores" in report, false);
});

test("BYI-2 missing answers stay missing and item domains are not used to create scores", () => {
  const report = buildPublisherDescriptiveRecord({
    toolId: "BYI2",
    language: "english",
    questions: [
      { id: "q1", type: "likert", text: "Synthetic item", options: ["Never", "Sometimes", "Often", "Always"] },
      { id: "q2", type: "likert", text: "Synthetic item 2", options: ["Never", "Sometimes", "Often", "Always"] },
    ],
    answers: { q1: "Sometimes", q2: null },
  });

  assert.equal(report.completeness.answered, 1);
  assert.equal(report.completeness.missing, 1);
  assert.equal(report.items[1]?.response, null);
  assert.equal("domainScores" in report, false);
  assert.equal(report.standardizedScoringEligibility, "blocked");
});

test("publisher-scored form detection does not capture unrelated Beck or other assessments", () => {
  assert.equal(isPublisherScoredToolId("BASC3-TRS-C"), true);
  assert.equal(isPublisherScoredToolId("BASC3"), true);
  assert.equal(isPublisherScoredToolId("BYI2"), true);
  assert.equal(isPublisherScoredToolId("BDI-II"), false);
  assert.equal(isPublisherScoredToolId("BECK"), false);
  assert.equal(isPublisherScoredToolId("BRIEF2-P"), false);
});
