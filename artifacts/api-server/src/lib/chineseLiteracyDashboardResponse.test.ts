import assert from "node:assert/strict";
import test from "node:test";
import {
  GenerateChineseLiteracyDashboardComparisonResponse,
  GetChineseLiteracyDashboardResponse,
} from "../../../../lib/api-zod/src/generated/api.ts";

const generatedAt = new Date("2026-10-17T11:58:00.000Z");
const content = {
  overallSummary: "Student-focused summary.",
  parentHome: "Parent observations.",
  teacherClassroom: "Teacher observations.",
  crossSetting: "Comparison interpretation.",
  recommendations: ["Support recommendation."],
  limitations: "Interpret cautiously.",
};
const comparison = {
  caseId: "case-1",
  parentAssignmentId: "parent-1",
  teacherAssignmentId: "teacher-1",
  parentRevision: 1,
  teacherRevision: 2,
  generatedAt,
  content,
  stale: false,
};

test("dashboard response validators receive Date objects before JSON serialization", () => {
  const generatedResponse = GenerateChineseLiteracyDashboardComparisonResponse.parse(comparison);
  const dashboardResponse = GetChineseLiteracyDashboardResponse.parse({
    caseId: "case-1",
    administrations: [],
    comparison,
  });

  assert.equal(generatedResponse.generatedAt.getTime(), generatedAt.getTime());
  assert.equal(dashboardResponse.comparison?.generatedAt.getTime(), generatedAt.getTime());
  assert.equal(JSON.parse(JSON.stringify(generatedResponse)).generatedAt, generatedAt.toISOString());
  assert.equal(JSON.parse(JSON.stringify(dashboardResponse)).comparison.generatedAt, generatedAt.toISOString());
  assert.throws(() => GenerateChineseLiteracyDashboardComparisonResponse.parse({
    ...comparison,
    generatedAt: generatedAt.toISOString(),
  }));
});
