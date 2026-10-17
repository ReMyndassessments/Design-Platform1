import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTO_REFRESH_OPTIONS,
  canGenerateComparison,
  createComparisonCsv,
  hasChineseLiteracyDashboardAccess,
  isParentHome,
  isTeacherClassroom,
  sharedDomainPairs,
  snapshotMatchesSelection,
  type ChineseLiteracyDashboardAdministrationModel,
} from "./chinese-literacy-dashboard-model.ts";

function source(overrides: Partial<ChineseLiteracyDashboardAdministrationModel> = {}): ChineseLiteracyDashboardAdministrationModel {
  return {
    assignmentId: "assignment-1",
    respondentType: "parent",
    setting: "Home",
    status: "submitted",
    revision: 1,
    submittedAt: "2026-10-12T08:00:00.000Z",
    domains: [
      { id: "R", name: "Reading", mean: 2.5, status: "complete", validCount: 8, notObservedCount: 1, notApplicableCount: 0, unansweredCount: 1 },
      { id: "W", name: "Written expression", mean: 3, status: "complete", validCount: 5, notObservedCount: 0, notApplicableCount: 0, unansweredCount: 0 },
    ],
    ...overrides,
  };
}

test("dashboard hub exposes the comparison only to roles allowed by its API", () => {
  for (const role of ["admin", "psychometrician", "school_clinical_coordinator"]) {
    assert.equal(hasChineseLiteracyDashboardAccess(role), true, role);
  }
  for (const role of ["clinical_apprentice", "assessment_invigilator", "parent", "", null, undefined]) {
    assert.equal(hasChineseLiteracyDashboardAccess(role), false, String(role));
  }
});

test("source selectors only classify the appropriate parent-home and teacher-classroom records", () => {
  assert.equal(isParentHome(source()), true);
  assert.equal(isParentHome(source({ respondentType: "teacher1", setting: "Classroom" })), false);
  assert.equal(isTeacherClassroom(source({ respondentType: "teacher2", setting: "Classroom" })), true);
  assert.equal(isTeacherClassroom(source({ respondentType: "parent", setting: "Home" })), false);
  assert.equal(isTeacherClassroom(source({ respondentType: "teacher1", setting: "Clinic" })), false);
});

test("shared chart domains require identical IDs and labels in both selected records", () => {
  const parent = source();
  const teacher = source({
    respondentType: "teacher1",
    setting: "Classroom",
    domains: [
      { id: "R", name: " Reading ", mean: 3.2, status: "complete", validCount: 9, notObservedCount: 0, notApplicableCount: 0, unansweredCount: 0 },
      { id: "W", name: "Writing", mean: 2.8, status: "complete", validCount: 6, notObservedCount: 0, notApplicableCount: 0, unansweredCount: 0 },
      { id: "CN", name: "Chinese literacy patterns", mean: 4, status: "complete", validCount: 2, notObservedCount: 0, notApplicableCount: 0, unansweredCount: 0 },
    ],
  });

  assert.deepEqual(sharedDomainPairs(parent, teacher).map(domain => domain.name), ["Reading"]);
  assert.deepEqual(sharedDomainPairs(undefined, teacher), []);
});

test("comparison generation accepts submitted, under-review, and approved records with a matched domain", () => {
  const parent = source();
  const teacher = source({ respondentType: "teacher1", setting: "Classroom", assignmentId: "teacher-1", status: "under_review" });
  assert.equal(canGenerateComparison(parent, teacher, 1, false), true);
  assert.equal(canGenerateComparison(source({ status: "approved" }), source({
    respondentType: "teacher1",
    setting: "Classroom",
    assignmentId: "teacher-1",
    status: "approved",
  }), 1, false), true);
  assert.equal(canGenerateComparison(parent, source({ submittedAt: null }), 1, false), false);
  assert.equal(canGenerateComparison(parent, source({ status: "in_progress" }), 1, false), false);
  assert.equal(canGenerateComparison(parent, teacher, 0, false), false);
  assert.equal(canGenerateComparison(parent, teacher, 1, true), false);
});

test("saved narratives are current only for the exact selected source revisions", () => {
  const parent = source();
  const teacher = source({ assignmentId: "teacher-1", respondentType: "teacher1", setting: "Classroom", revision: 4 });
  const snapshot = { parentAssignmentId: parent.assignmentId, teacherAssignmentId: teacher.assignmentId, parentRevision: 1, teacherRevision: 4 };
  assert.equal(snapshotMatchesSelection(snapshot, parent, teacher), true);
  assert.equal(snapshotMatchesSelection(snapshot, source({ revision: 2 }), teacher), false);
  assert.equal(snapshotMatchesSelection({ ...snapshot, teacherAssignmentId: "teacher-2" }, parent, teacher), false);
  assert.equal(snapshotMatchesSelection(snapshot, parent, undefined), false);
});

test("CSV export keeps sources separate and correctly escapes respondent content", () => {
  const csv = createComparisonCsv([{
    name: 'Reading, "oral"',
    parentDomain: { mean: 2.5, status: "complete" },
    teacherDomain: { mean: 3.25, status: "complete" },
  }]);
  assert.match(csv, /Parent \/ home mean/);
  assert.match(csv, /Teacher \/ classroom mean/);
  assert.match(csv, /"Reading, ""oral"""/);
  assert.match(csv, /"2.5","3.25","complete","complete"/);
  assert.doesNotMatch(csv, /combined|overall|average/i);
});

test("automatic refresh is off by default and never offers an interval below five minutes", () => {
  assert.equal(AUTO_REFRESH_OPTIONS[0].value, null);
  assert(AUTO_REFRESH_OPTIONS.slice(1).every(option => option.value !== null && option.value >= 5 * 60 * 1000));
});
