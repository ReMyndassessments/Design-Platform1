import test from "node:test";
import assert from "node:assert/strict";
import { buildMultiInformantReport, buildMultiInformantSources } from "./multi-informant-report.ts";

test("builds domain-by-domain interpretation from separate respondent ratings", () => {
  const report = buildMultiInformantReport([
    { respondentType: "parent", normalizedScores: { attention: 72, anxiety: 20, single_source: 10 } },
    { respondentType: "teacher1", normalizedScores: { attention: 75, anxiety: 68 } },
    { respondentType: "self", normalizedScores: { attention: 42 } },
  ], {
    studentName: "Student",
    higherIsBetter: false,
    domainLabels: { attention: "Attention", anxiety: "Anxiety" },
  });

  assert.match(report.summary, /3 separate respondent records/);
  assert.equal(report.domainFindings.length, 2);
  assert.equal(report.domainFindings[0].pattern, "different");
  assert.deepEqual(report.domainFindings[0].ratings.map((rating) => rating.value), [72, 75, 42]);
  assert.match(report.domainFindings[1].interpretation, /Parent \/ caregiver: 20\/100 \(Low\)/);
  assert.match(report.coverageNote, /only one respondent record/);
});

test("does not compare domains reported by only one respondent", () => {
  const report = buildMultiInformantReport([
    { respondentType: "parent", normalizedScores: { home_routine: 20 } },
    { respondentType: "teacher1", normalizedScores: { classroom_attention: 72 } },
  ], { studentName: "Student", higherIsBetter: false });

  assert.equal(report.domainFindings.length, 0);
  assert.match(report.summary, /do not contain domain scores that can be compared/);
  assert.match(report.coverageNote, /review each respondent's profile separately/);
});

test("recommendations name shared concerns and context-specific differences", () => {
  const report = buildMultiInformantReport([
    { respondentType: "parent", normalizedScores: { attention: 72, learning: 30 } },
    { respondentType: "teacher1", normalizedScores: { attention: 70, learning: 75 } },
  ], {
    studentName: "Student",
    higherIsBetter: false,
    domainLabels: { attention: "Attention", learning: "Learning" },
  });

  assert.ok(report.recommendations.some((text) => text.includes("Attention")));
  assert.ok(report.recommendations.some((text) => text.includes("Learning")));
  assert.ok(report.recommendations.some((text) => text.includes("specific examples")));
  assert.match(report.limitations, /not pooled scores or norm-referenced estimates/);
});

test("labels duplicate respondent types independently instead of collapsing them", () => {
  const sources = buildMultiInformantSources([
    { respondentType: "teacher1", toolName: "Form A" },
    { respondentType: "teacher1", toolName: "Form B" },
  ]);

  assert.notEqual(sources[0].key, sources[1].key);
  assert.notEqual(sources[0].label, sources[1].label);
});

test("uses low skill ratings as priorities when higher scores indicate better skills", () => {
  const report = buildMultiInformantReport([
    { respondentType: "parent", normalizedScores: { planning: 30, initiation: 85 } },
    { respondentType: "teacher1", normalizedScores: { planning: 35, initiation: 82 } },
  ], {
    studentName: "Student",
    higherIsBetter: true,
    domainLabels: { planning: "Planning", initiation: "Initiation" },
  });

  assert.match(report.domainFindings[0].interpretation, /High support need/);
  assert.ok(report.recommendations.some((text) => text.includes("Planning")));
  assert.ok(report.recommendations.some((text) => text.includes("Initiation")));
});
