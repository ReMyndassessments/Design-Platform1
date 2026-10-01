import test from "node:test";
import assert from "node:assert/strict";
import { buildBatteryReviewState, isValidSnapshot } from "./batteryReview.ts";
import { questionsFromAssignmentSnapshot } from "./assignmentSnapshotQuestions.ts";
import { buildQuestionnaireTestFingerprint, type QuestionnaireTestEvidence } from "./staffQuestionnaireTests.ts";

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

function passingEvidence(assignment = assessment, id = "evidence-1"): QuestionnaireTestEvidence {
  return {
    id,
    assignmentId: assignment.id,
    testerId: "tester-1",
    testerName: "Case Reviewer",
    testedAt: "2026-01-02T03:04:05.000Z",
    fingerprint: buildQuestionnaireTestFingerprint({
      id: assignment.id,
      toolId: assignment.toolId,
      respondentType: assignment.respondentType,
      respondentLabel: assignment.respondentLabel,
      formItemsSnapshot: assignment.formItemsSnapshot,
      assignedLanguage: "english",
    }),
    result: "passed",
    language: "en",
    checklist: { correctForm: true, contentLanguage: true, controls: true, safeTesting: true },
    notes: null,
  };
}

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

test("only a matching admin approval with current questionnaire tests marks a clean battery approved", () => {
  const untested = buildBatteryReviewState([assessment], null);
  assert.equal(untested.approved, false);
  assert.equal(untested.questionnaireCount, 1);
  assert.equal(untested.passedCount, 0);
  assert.equal(untested.testResults[assessment.id]?.status, "not_tested");
  const evidence = [passingEvidence()];
  const current = buildBatteryReviewState([assessment], null, evidence);
  const approved = buildBatteryReviewState([assessment], {
    fingerprint: current.fingerprint,
    approvedAt: "2026-01-02T03:04:05.000Z",
    approvedBy: "admin-id",
  }, evidence);
  assert.equal(approved.approved, true);
  assert.equal(approved.passedCount, 1);
  assert.deepEqual(approved.approval, {
    approvedAt: "2026-01-02T03:04:05.000Z",
    approvedBy: "admin-id",
  });
  const changed = buildBatteryReviewState([{ ...assessment, uniqueLink: "https://example.org/external/changed" }], {
    fingerprint: current.fingerprint,
    approvedAt: "2026-01-02T03:04:05.000Z",
    approvedBy: "admin-id",
  }, evidence);
  assert.equal(changed.approved, false);
  assert.equal(changed.approval, null);
  assert.ok(changed.issues.some(issue => issue.includes("changed after approval")));
});

test("the newest failed or stale evidence invalidates an earlier pass and battery approval", () => {
  const passed = passingEvidence();
  const passingState = buildBatteryReviewState([assessment], null, [passed]);
  const savedApproval = {
    fingerprint: passingState.fingerprint,
    approvedAt: "2026-01-02T03:04:05.000Z",
    approvedBy: "admin-id",
  };
  const newestFailure = {
    ...passed,
    id: "evidence-2",
    result: "failed" as const,
    notes: "The controls label is unclear",
    testedAt: "2026-01-03T03:04:05.000Z",
  };
  const failedState = buildBatteryReviewState([assessment], savedApproval, [passed, newestFailure]);
  assert.equal(failedState.testResults[assessment.id]?.status, "failed");
  assert.equal(failedState.passedCount, 0);
  assert.equal(failedState.approved, false);
  assert.notEqual(failedState.fingerprint, passingState.fingerprint);

  const changedAssignment = { ...assessment, formItemsSnapshot: `${snapshot} ` };
  const staleState = buildBatteryReviewState([changedAssignment], null, [passed]);
  assert.equal(staleState.testResults[assessment.id]?.status, "retest_required");
  assert.equal(staleState.passedCount, 0);

  const languageState = buildBatteryReviewState([{ ...assessment, assignedLanguage: "english" }], null, [passed]);
  const changedLanguage = buildBatteryReviewState([{ ...assessment, assignedLanguage: "korean" }], {
    fingerprint: languageState.fingerprint,
    approvedAt: savedApproval.approvedAt,
    approvedBy: savedApproval.approvedBy,
  }, [passed]);
  assert.equal(changedLanguage.testResults[assessment.id]?.status, "retest_required");
  assert.notEqual(changedLanguage.fingerprint, languageState.fingerprint);
  assert.equal(changedLanguage.approved, false);
});

test("string BIGSERIAL order makes every newer failure invalidate the current approval", () => {
  for (const [passOrder, failureOrder] of [
    ["9", "10"],
    ["99", "100"],
    ["9007199254740993", "9007199254740994"],
  ]) {
    const previousPass = {
      ...passingEvidence(),
      id: `pass-${passOrder}`,
      evidenceOrder: passOrder,
      testedAt: "2026-04-12T09:00:00.000Z",
    };
    const passingState = buildBatteryReviewState([assessment], null, [previousPass]);
    const approvedBattery = {
      fingerprint: passingState.fingerprint,
      approvedAt: "2026-04-12T10:00:00.000Z",
      approvedBy: "admin-id",
    };
    const latestFailure = {
      ...previousPass,
      id: `fail-${failureOrder}`,
      evidenceOrder: failureOrder,
      result: "failed" as const,
      notes: "The tested controls do not work.",
      testedAt: "2026-04-11T09:00:00.000Z",
    };
    const state = buildBatteryReviewState([assessment], approvedBattery, [previousPass, latestFailure]);
    assert.equal(state.testResults[assessment.id]?.status, "failed", `${passOrder} -> ${failureOrder}`);
    assert.equal(state.passedCount, 0, `${passOrder} -> ${failureOrder}`);
    assert.equal(state.approved, false, `${passOrder} -> ${failureOrder}`);
    assert.notEqual(state.fingerprint, passingState.fingerprint, `${passOrder} -> ${failureOrder}`);
  }
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
  assert.ok(state.issues.some(issue => issue.includes("staff test")));
  const currentEvidence = [passingEvidence()];
  const ready = buildBatteryReviewState([assessment, ...examinerTools], null, currentEvidence);
  assert.deepEqual(ready.issues, []);
  assert.equal(buildBatteryReviewState([assessment, ...examinerTools], {
    fingerprint: ready.fingerprint,
    approvedAt: "2026-01-02T03:04:05.000Z",
    approvedBy: "admin-id",
  }, currentEvidence).approved, true);

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