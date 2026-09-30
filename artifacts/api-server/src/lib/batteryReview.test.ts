import test from "node:test";
import assert from "node:assert/strict";
import { buildBatteryReviewState, isValidSnapshot } from "./batteryReview.ts";
import { questionsFromAssignmentSnapshot } from "./assignmentSnapshotQuestions.ts";

const snapshot = JSON.stringify([
  { id: "q1", text: "How often?", type: "radio", options: ["Never", "Often"] },
]);
const assessment = {
  id: "assignment-1",
  toolId: "PHQ-9",
  respondentLabel: "Parent Assessment Package",
  respondentType: "parent",
  uniqueLink: "https://example.org/external/portal-token",
  formItemsSnapshot: snapshot,
  assignedToName: null,
  assignedToEmail: null,
};

test("battery fingerprints are stable and exclude intake and recipient metadata", () => {
  const first = buildBatteryReviewState([assessment], null);
  const reordered = buildBatteryReviewState([{
    ...assessment,
    assignedToName: "Parent",
    assignedToEmail: "parent@example.org",
  }, {
    ...assessment,
    id: "intake",
    toolId: "INTAKE",
    formItemsSnapshot: null,
  }], null);
  assert.equal(first.fingerprint, reordered.fingerprint);
  assert.equal(first.assignmentCount, 1);
});

test("only a matching admin approval marks a clean battery approved", () => {
  const current = buildBatteryReviewState([assessment], null);
  const approved = buildBatteryReviewState([assessment], {
    fingerprint: current.fingerprint,
    approvedAt: "2026-01-02T03:04:05.000Z",
    approvedBy: "admin-id",
  });
  assert.equal(approved.approved, true);
  assert.deepEqual(approved.approval, {
    approvedAt: "2026-01-02T03:04:05.000Z",
    approvedBy: "admin-id",
  });
  const changed = buildBatteryReviewState([{ ...assessment, uniqueLink: "https://example.org/external/changed" }], {
    fingerprint: current.fingerprint,
    approvedAt: "2026-01-02T03:04:05.000Z",
    approvedBy: "admin-id",
  });
  assert.equal(changed.approved, false);
  assert.equal(changed.approval, null);
  assert.ok(changed.issues.some(issue => issue.includes("changed after approval")));
});

test("duplicate recipient forms, split unnamed parent packages, and missing snapshots block approval", () => {
  const duplicate = { ...assessment, id: "assignment-2" };
  const duplicateState = buildBatteryReviewState([assessment, duplicate], null);
  assert.equal(duplicateState.approved, false);
  assert.ok(duplicateState.issues.some(issue => issue.includes("Duplicate assessment forms")));

  const splitState = buildBatteryReviewState([
    { ...assessment, respondentLabel: "Parent" },
    { ...assessment, id: "assignment-2", respondentLabel: "Parent Assessment Package" },
  ], null);
  assert.ok(splitState.issues.some(issue => issue.includes("consolidated")));

  const missingState = buildBatteryReviewState([{ ...assessment, formItemsSnapshot: null }], null);
  assert.equal(missingState.missingSnapshots, 1);
  assert.ok(missingState.issues.some(issue => issue.includes("missing a valid frozen form snapshot")));
});

test("specialized examiner workflows do not require questionnaire snapshots, but missing recipient forms still block", () => {
  const examinerTools = ["RDA", "RRCA", "RRFA", "RAEPA", "RAMRI", "RMRA"].map((toolId, index) => ({
    ...assessment,
    id: `examiner-${index}`,
    toolId,
    respondentType: "examiner",
    respondentLabel: "Examiner",
    formItemsSnapshot: "[]",
  }));
  const state = buildBatteryReviewState([assessment, ...examinerTools], null);
  assert.equal(state.assignmentCount, 7);
  assert.equal(state.missingSnapshots, 0);
  assert.deepEqual(state.issues, []);
  assert.equal(buildBatteryReviewState([assessment, ...examinerTools], {
    fingerprint: state.fingerprint,
    approvedAt: "2026-01-02T03:04:05.000Z",
    approvedBy: "admin-id",
  }).approved, true);

  const missingTeacher = { ...assessment, id: "teacher-missing", respondentType: "teacher1", respondentLabel: "Teacher 1", formItemsSnapshot: null };
  const withMissingTeacher = buildBatteryReviewState([assessment, ...examinerTools, missingTeacher], null);
  assert.equal(withMissingTeacher.missingSnapshots, 1);
  assert.equal(withMissingTeacher.approved, false);
});

test("snapshot preview uses external form radio normalization and rejects malformed snapshots", () => {
  assert.deepEqual(questionsFromAssignmentSnapshot(snapshot), [{
    id: "q1",
    text: "How often?",
    textChinese: undefined,
    textKorean: undefined,
    type: "radio_group",
    options: ["Never", "Often"],
    optionsChinese: undefined,
    optionsKorean: undefined,
    domain: "",
    required: false,
    note: undefined,
    noteChinese: undefined,
    noteKorean: undefined,
    links: undefined,
    conditionalOn: undefined,
    conditionalValue: undefined,
    conditionalType: undefined,
    reversed: undefined,
    rows: undefined,
  }]);
  assert.equal(questionsFromAssignmentSnapshot("{bad json"), null);
  assert.equal(questionsFromAssignmentSnapshot(JSON.stringify([{ id: "q1", type: "text" }])), null);
});

test("snapshot mapping recursively preserves grid rows, aliases, and conditional/reversed fields", () => {
  const formSnapshot = JSON.stringify([{
    id: "impact_grid",
    text: "How difficult are these areas?",
    type: "frequency_grid",
    domain: "impact",
    rows: [{
      id: "communication",
      text: "Communication",
      type: "radio",
      options: ["No difficulty", "Some difficulty"],
      rows: [{
        id: "communication_detail",
        text: "Communication detail",
        type: "multiple_choice",
        conditionalOn: "communication",
        conditionalValue: "Some difficulty",
        conditionalType: "custom",
        reversed: true,
      }],
    }],
  }]);

  const questions = questionsFromAssignmentSnapshot(formSnapshot);
  assert.ok(questions);
  assert.equal(questions[0].type, "frequency_grid");
  assert.equal(questions[0].rows?.[0].type, "radio_group");
  assert.equal(questions[0].rows?.[0].rows?.[0].type, "radio_group");
  assert.equal(questions[0].rows?.[0].rows?.[0].conditionalOn, "communication");
  assert.equal(questions[0].rows?.[0].rows?.[0].conditionalValue, "Some difficulty");
  assert.equal(questions[0].rows?.[0].rows?.[0].conditionalType, "custom");
  assert.equal(questions[0].rows?.[0].rows?.[0].reversed, true);

  const malformedNestedRows = JSON.stringify([{
    id: "impact_grid",
    text: "How difficult are these areas?",
    type: "frequency_grid",
    rows: [{ id: "missing-fields" }],
  }]);
  assert.equal(questionsFromAssignmentSnapshot(malformedNestedRows), null);
  assert.equal(isValidSnapshot(malformedNestedRows), false);
});