import test from "node:test";
import assert from "node:assert/strict";
import { reusableQuestionnaireEvidence, readQuestionnaireTestHistory } from "./questionnaireTestHistory.ts";
import { buildBatteryReviewState } from "./batteryReview.ts";
import {
  buildQuestionnaireTestFingerprint,
  buildQuestionnaireTestFormKey,
  resolveQuestionnaireTestResults,
  type QuestionnaireTestAssignment,
  type QuestionnaireTestEvidence,
} from "./staffQuestionnaireTests.ts";

const source: QuestionnaireTestAssignment = {
  id: "old-assignment", toolId: "PHQ-9", toolName: "PHQ-9",
  respondentType: "parent", respondentLabel: "Private recipient label",
  formItemsSnapshot: '[{"id":"q1","text":"How often?","type":"radio","options":["Never","Often"]}]',
  assignedLanguage: "english",
};
const target = { ...source, id: "new-assignment", respondentType: "teacher", respondentLabel: "Teacher 2" };
const original: QuestionnaireTestEvidence = {
  id: "original-review", assignmentId: source.id, testerId: "staff", testerName: "Reviewer",
  testedAt: "2026-10-01T01:00:00.000Z", evidenceOrder: "9007199254740993",
  fingerprint: buildQuestionnaireTestFingerprint(source), result: "passed", language: "en",
  checklist: { correctForm: true, contentLanguage: true, controls: true, safeTesting: true },
  notes: "Private source-case review notes",
};
const legacyRow = { ...original, caseId: "old-case", sourceAssignment: source };
const asBattery = { ...target, uniqueLink: "https://example.org/target" };

test("an existing legacy pass immediately covers an identical form assigned in another case, without case details", () => {
  const reused = reusableQuestionnaireEvidence(legacyRow, "new-case");
  assert.equal(reused.formKey, buildQuestionnaireTestFormKey(target));
  const result = resolveQuestionnaireTestResults([target], [reused]).get(target.id)!;
  assert.equal(result.status, "passed");
  assert.equal(result.sharedAcrossCases, true);
  assert.equal(result.sharedFromAssignmentId, source.id);
  assert.equal(result.sharedFromLabel, undefined);
  assert.equal(result.notes, undefined);
  assert.equal(result.testedBy, "Reviewer");
  assert.equal("caseId" in reused, false);
  assert.equal("sourceAssignment" in reused, false);
  const state = buildBatteryReviewState([asBattery], null, [reused]);
  assert.equal(state.passedCount, 1);
  assert.deepEqual(state.issues, []);
  assert.equal(buildBatteryReviewState([asBattery], {
    fingerprint: state.fingerprint, approvedAt: "2026-10-01T02:00:00.000Z", approvedBy: "admin",
  }, [reused]).approved, true);
});

test("different form content, tool, item order, language, or rendering never inherits another case's pass", () => {
  const reused = reusableQuestionnaireEvidence(legacyRow, "new-case");
  for (const changed of [
    { ...target, assignedLanguage: "korean" },
    { ...target, toolId: "GAD-7" },
    { ...target, toolName: "RPPI renderer" },
    { ...target, formItemsSnapshot: '[{"id":"q1","text":"Changed","type":"radio","options":["Never","Often"]}]' },
    { ...target, formItemsSnapshot: '[{"id":"q1","text":"How often?","type":"radio","options":["Often","Never"]}]' },
    { ...target, formItemsSnapshot: null },
  ]) {
    assert.equal(resolveQuestionnaireTestResults([changed], [reused]).get(changed.id)?.status, "not_tested");
  }
});

test("a newer cross-case failure invalidates inherited and own passes and existing battery approval; rechecking restores it", () => {
  const passed = reusableQuestionnaireEvidence(legacyRow, "new-case");
  const ready = buildBatteryReviewState([asBattery], null, [passed]);
  const approval = { fingerprint: ready.fingerprint, approvedAt: "2026-10-01T02:00:00.000Z", approvedBy: "admin" };
  const failed = {
    ...passed, id: "failure", assignmentId: "other-assignment",
    evidenceOrder: "9007199254740994", result: "failed" as const,
  };
  const invalid = buildBatteryReviewState([asBattery], approval, [passed, failed]);
  assert.equal(invalid.testResults[target.id]?.status, "failed");
  assert.equal(invalid.approved, false);
  assert.notEqual(invalid.fingerprint, ready.fingerprint);
  const ownPass = { ...passed, id: "local-pass", assignmentId: target.id,
    fingerprint: buildQuestionnaireTestFingerprint(target), sharedAcrossCases: false };
  assert.equal(resolveQuestionnaireTestResults([target], [ownPass, failed]).get(target.id)?.status, "failed");
  const retest = { ...ownPass, id: "rechecked", evidenceOrder: "9007199254740995" };
  assert.equal(resolveQuestionnaireTestResults([target], [passed, failed, retest]).get(target.id)?.status, "passed");
  assert.equal(buildBatteryReviewState([asBattery], approval, [passed, failed, retest]).approved, false);
});

test("legacy evidence with changed, missing, or examiner source cannot certify a different case", () => {
  for (const changed of [
    null, { ...source, assignedLanguage: "korean" },
    { ...source, formItemsSnapshot: "[]" },
    { ...source, toolId: "RPPI" },
  ]) {
    const reused = reusableQuestionnaireEvidence({ ...legacyRow, sourceAssignment: changed }, "new-case");
    assert.equal(reused.formKey, null);
    assert.equal(resolveQuestionnaireTestResults([target], [reused]).get(target.id)?.status, "not_tested");
  }
});

test("new evidence pins the checked content independently of later source edits or deletion", () => {
  const stored = { ...legacyRow, checklist: { ...original.checklist!, formKey: buildQuestionnaireTestFormKey(source) } };
  for (const sourceAssignment of [null, { ...source, formItemsSnapshot: "[]" }]) {
    const reused = reusableQuestionnaireEvidence({ ...stored, sourceAssignment }, "new-case");
    assert.equal(resolveQuestionnaireTestResults([target], [reused]).get(target.id)?.status, "passed");
  }
});

test("verified content evidence also remains passed on its own assignment after recipient-only changes", () => {
  const stored = { ...legacyRow, checklist: { ...original.checklist!, formKey: buildQuestionnaireTestFormKey(source) } };
  const ownEvidence = reusableQuestionnaireEvidence(stored, "old-case");
  for (const changed of [
    { ...source, respondentLabel: "Replacement recipient" },
    { ...source, respondentType: "teacher1" },
  ]) {
    assert.equal(resolveQuestionnaireTestResults([changed], [ownEvidence]).get(changed.id)?.status, "passed");
  }
  assert.equal(resolveQuestionnaireTestResults([
    { ...source, formItemsSnapshot: '[{"id":"q1","text":"Changed content","type":"text"}]' },
  ], [ownEvidence]).get(source.id)?.status, "retest_required");
});

test("passing another version does not erase the original version's review history", () => {
  const v1 = reusableQuestionnaireEvidence(legacyRow, "new-case");
  const v2 = { ...v1, id: "v2-review", evidenceOrder: "9007199254740994",
    formKey: buildQuestionnaireTestFormKey({ ...source, formItemsSnapshot: '[{"id":"q1","text":"Version 2","type":"text"}]' }) };
  assert.equal(resolveQuestionnaireTestResults([target], [v1, v2]).get(target.id)?.status, "passed");
  const v1Failure = { ...v1, id: "v1-failure", evidenceOrder: "9007199254740995", result: "failed" as const };
  assert.equal(resolveQuestionnaireTestResults([target], [v1, v2, v1Failure]).get(target.id)?.status, "failed");
});

test("history loader reads actual evidence rows, including legacy matches, without exposing source context", async () => {
  const reader = { execute: async () => ({ rows: [legacyRow] }) };
  const rows = await readQuestionnaireTestHistory("new-case", [target], reader as never);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sharedAcrossCases, true);
  assert.equal(rows[0].formKey, buildQuestionnaireTestFormKey(target));
});