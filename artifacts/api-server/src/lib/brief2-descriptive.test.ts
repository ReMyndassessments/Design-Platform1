import test from "node:test";
import assert from "node:assert/strict";
import { buildBrief2DescriptiveResponse } from "./brief2-descriptive.ts";

function form(idPrefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${idPrefix}-${index + 1}`,
    text: `Synthetic item ${index + 1}`,
    type: "likert",
    options: ["Never", "Sometimes", "Often"],
  }));
}

test("BRIEF-2 parent report preserves actual response frequencies without severity interpretation", () => {
  const questions = form("p", 63);
  const answers = Object.fromEntries(questions.map(item => [item.id, "Never"]));
  answers["p-63"] = "Sometimes";
  const report = buildBrief2DescriptiveResponse({ toolId: "BRIEF2-P", questions, answers, language: "english" });

  assert.deepEqual(report.completeness, { answered: 63, missing: 0, total: 63 });
  assert.deepEqual(report.frequencyCounts, { Never: 62, Sometimes: 1 });
  assert.equal(report.reportingState, "descriptive_only");
  assert.equal(report.provenanceState, "legacy_unverified");
  assert.equal(report.responseValidity, "not_available");
  assert.match(report.summary, /RESPONSE-BASED SCREENING NARRATIVE/);
  assert.match(report.summary, /“Sometimes” was selected for 1 item/);
  assert.match(report.summary, /does not calculate scores/i);
  assert.doesNotMatch(report.summary, /pervasive|severe|elevated|clinical dysfunction/i);
  assert.deepEqual(report.provenanceIssues, []);
  assert.equal("scores" in report, false);
});

test("BRIEF-2 self-report retains 55 item responses without assigning parent/teacher scales", () => {
  const questions = form("sr", 55);
  const report = buildBrief2DescriptiveResponse({
    toolId: "BRIEF2-SR",
    questions,
    answers: Object.fromEntries(questions.map(item => [item.id, "Never"])),
    language: "english",
  });

  assert.equal(report.items.length, 55);
  assert.equal(report.items.some(item => item.id === "initiate" || item.id === "task_monitor"), false);
  assert.deepEqual(report.frequencyCounts, { Never: 55 });
});

test("missing values stay distinct from labels and numeric codes are not inferred from option order", () => {
  const questions = [
    { id: "q1", text: "Synthetic item 1", type: "likert", options: ["Never", "Sometimes", "Often"] },
    { id: "q2", text: "Synthetic item 2", type: "likert", options: ["Never", "Sometimes", "Often"] },
  ];
  const report = buildBrief2DescriptiveResponse({
    toolId: "BRIEF2-T",
    questions,
    answers: { q1: 0, q2: null },
    language: "english",
  });

  assert.deepEqual(report.completeness, { answered: 1, missing: 1, total: 2 });
  assert.deepEqual(report.frequencyCounts, { "Recorded code/value: 0": 1 });
  assert.equal(report.items[1]?.state, "missing");
  assert.equal(report.items[0]?.response, "Recorded code/value: 0");
  assert.match(report.summary, /not assigned a response label/i);
});

test("mismatched or incomplete response records are blocked from standardized interpretation", () => {
  const report = buildBrief2DescriptiveResponse({
    toolId: "BRIEF2-T",
    questions: [
      { id: "q1", text: "Synthetic item 1", type: "likert", options: ["Never", "Sometimes", "Often"] },
    ],
    answers: {},
    language: "english",
  });

  assert.equal(report.provenanceState, "blocked");
  assert.equal(report.formCompatibility, "item_count_mismatch");
  assert.equal(report.completeness.missing, 1);
  assert.equal(report.provenanceIssues.length, 2);
});
