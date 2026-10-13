import test from "node:test";
import assert from "node:assert/strict";
import {
  alignChineseLiteracyDomains,
  canReviewChineseLiteracyDashboard,
  collectPrivateValues,
  isChineseLiteracySnapshotStale,
  redactPrivateValues,
  validateChineseLiteracyPairEligibility,
} from "./chineseLiteracyDashboard.ts";

test("dashboard review access is limited to authorized professional roles", () => {
  for (const role of ["admin", "psychometrician", "school_clinical_coordinator"]) {
    assert.equal(canReviewChineseLiteracyDashboard(role), true, role);
  }
  for (const role of ["clinical_apprentice", "assessment_invigilator", "parent", "", null, undefined]) {
    assert.equal(canReviewChineseLiteracyDashboard(role), false, String(role));
  }
});

test("comparison domains must match by both ID and label and be selected by both respondents", () => {
  const parent = [
    { id: "R", label: "Reading" },
    { id: "W", label: "Written expression" },
    { id: "CL", label: "Chinese literacy patterns" },
  ];
  const teacher = [
    { id: "R", label: "Reading" },
    { id: "W", label: "Writing" },
    { id: "CL", label: "Chinese literacy patterns" },
    { id: "GP", label: "Grammar" },
  ];

  assert.deepEqual(
    alignChineseLiteracyDomains(parent, teacher, ["R", "W", "CL"], ["R", "W", "CL", "GP"]),
    [
      { id: "R", name: "Reading" },
      { id: "CL", name: "Chinese literacy patterns" },
    ],
  );
});

test("comparison requires original submitted parent and teacher records with scores", () => {
  const completePair = {
    parentIsParentForm: true,
    teacherIsParentForm: false,
    parentBaselineId: null,
    teacherBaselineId: null,
    parentSubmittedAt: "2026-10-12T08:00:00.000Z",
    teacherSubmittedAt: "2026-10-12T09:00:00.000Z",
    parentScoreCount: 13,
    teacherScoreCount: 13,
  };

  assert.deepEqual(validateChineseLiteracyPairEligibility(completePair), { eligible: true });
  assert.equal(validateChineseLiteracyPairEligibility({ ...completePair, parentIsParentForm: false }).status, 400);
  assert.equal(validateChineseLiteracyPairEligibility({ ...completePair, teacherIsParentForm: true }).status, 400);
  assert.equal(validateChineseLiteracyPairEligibility({ ...completePair, parentBaselineId: "baseline-1" }).status, 400);
  assert.equal(validateChineseLiteracyPairEligibility({ ...completePair, teacherSubmittedAt: null }).status, 422);
  assert.equal(validateChineseLiteracyPairEligibility({ ...completePair, parentScoreCount: 0 }).status, 422);
});

test("saved comparison is stale if either source is missing, changed, or no longer submitted", () => {
  const saved = { parentRevision: 2, teacherRevision: 4 };
  const parent = { revision: 2, submittedAt: "2026-10-12" };
  const teacher = { revision: 4, submittedAt: "2026-10-13" };

  assert.equal(isChineseLiteracySnapshotStale(saved, parent, teacher), false);
  assert.equal(isChineseLiteracySnapshotStale(saved, undefined, teacher), true);
  assert.equal(isChineseLiteracySnapshotStale(saved, { ...parent, revision: 3 }, teacher), true);
  assert.equal(isChineseLiteracySnapshotStale(saved, parent, { ...teacher, revision: 5 }), true);
  assert.equal(isChineseLiteracySnapshotStale(saved, parent, { ...teacher, submittedAt: null }), true);
});

test("AI prompt sanitization redacts nested identifiers without changing source separation", () => {
  const privateValues = collectPrivateValues({
    studentName: "林明",
    dob: "2013-02-09",
    parent: { parentName: "Parent One", email: "parent+test@example.com", phone: "+1 (555) 010-8888" },
    teacherName: "Teacher Two",
    caseId: "CASE.123",
  });
  const promptRecords = {
    parentHome: { source: "Parent home-setting record", example: "林明 reads with Parent One." },
    teacherClassroom: { source: "Teacher classroom-setting record", example: "Teacher Two observed CASE.123." },
    observationContext: "Birth date 2013-02-09; contact parent+test@example.com.",
  };
  const safe = redactPrivateValues(promptRecords, privateValues);
  const serialized = JSON.stringify(safe);

  for (const value of privateValues) assert.equal(serialized.includes(value), false, value);
  assert.match(serialized, /Parent home-setting record/);
  assert.match(serialized, /Teacher classroom-setting record/);
  assert.match(serialized, /\[REDACTED\]/);
});
