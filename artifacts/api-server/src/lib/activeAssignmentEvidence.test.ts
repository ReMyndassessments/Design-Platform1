import test from "node:test";
import assert from "node:assert/strict";
import { activeAssignmentEvidenceRevision, activeScoresForAssignments } from "./activeAssignmentEvidence.ts";

const assignment = {
  id: "assignment-old",
  toolId: "ASSQ",
  respondentType: "teacher1" as const,
  status: "completed" as const,
  submittedAt: new Date("2025-01-01T00:00:00.000Z"),
};
const score = {
  id: "score-old",
  toolId: "ASSQ",
  toolName: "Assessment",
  respondentType: "teacher1",
  rawScore: 2,
  domainScores: { attention: 2 },
  normalizedScores: { attention: 40 },
  agreementIndex: null,
  hasHighDiscrepancy: false,
  isManual: false,
  notes: null,
  generatedAt: new Date("2025-01-02T00:00:00.000Z"),
};

test("active evidence revision changes when an assignment is replaced", () => {
  const oldRevision = activeAssignmentEvidenceRevision([assignment], [score]);
  const replacement = { ...assignment, id: "assignment-new", submittedAt: null };
  assert.notEqual(activeAssignmentEvidenceRevision([replacement], []), oldRevision);
});

test("scores without an active assignment pair do not enter the evidence revision", () => {
  const unrelatedScore = { ...score, id: "score-unrelated", toolId: "RETIRED-TOOL" };
  assert.deepEqual(activeScoresForAssignments([assignment], [score, unrelatedScore]), [score]);
  assert.equal(
    activeAssignmentEvidenceRevision([assignment], [score, unrelatedScore]),
    activeAssignmentEvidenceRevision([assignment], [score]),
  );
});