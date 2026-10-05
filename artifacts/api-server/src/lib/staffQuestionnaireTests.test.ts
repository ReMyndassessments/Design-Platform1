import test from "node:test";
import assert from "node:assert/strict";
import type { FormQuestion } from "./questions.ts";
import { BEHAVOBS_DETAILS } from "./behavobsDetails.ts";
import {
  buildQuestionnaireTestFormKey,
  buildLegacyQuestionnaireTestFormKey,
  buildQuestionnaireTestFingerprint,
  canonicalQuestionnaireSnapshot,
  latestQuestionnaireTestEvidence,
  normalizeQuestionnaireLanguage,
  resolveQuestionnaireTestResults,
  toStaffTestResult,
  validateStaffTestAnswers,
  type QuestionnaireTestAssignment,
  type QuestionnaireTestEvidence,
} from "./staffQuestionnaireTests.ts";

const assignment: QuestionnaireTestAssignment = {
  id: "assignment-1",
  toolId: "FORM-A",
  respondentType: "parent",
  respondentLabel: "Parent",
  formItemsSnapshot: '[{"id":"q1","text":"Question","type":"radio"}]',
  assignedLanguage: "english",
};

function evidence(overrides: Partial<QuestionnaireTestEvidence> = {}): QuestionnaireTestEvidence {
  return {
    id: "evidence-1",
    assignmentId: assignment.id,
    testerId: "staff-1",
    testerName: "Staff Tester",
    testedAt: "2026-04-12T09:00:00.000Z",
    fingerprint: buildQuestionnaireTestFingerprint(assignment),
    result: "passed",
    language: "en",
    checklist: { correctForm: true, contentLanguage: true, controls: true, safeTesting: true },
    notes: null,
    ...overrides,
  };
}

test("questionnaire fingerprint is SHA-256 scoped to the assignment snapshot, tool, respondent and case language", () => {
  const fingerprint = buildQuestionnaireTestFingerprint(assignment);
  assert.match(fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(fingerprint, buildQuestionnaireTestFingerprint({ ...assignment, assignedLanguage: "en" }));
  assert.notEqual(fingerprint, buildQuestionnaireTestFingerprint({ ...assignment, formItemsSnapshot: "changed" }));
  assert.notEqual(fingerprint, buildQuestionnaireTestFingerprint({ ...assignment, toolId: "FORM-B" }));
  assert.notEqual(fingerprint, buildQuestionnaireTestFingerprint({ ...assignment, respondentType: "teacher" }));
  assert.notEqual(fingerprint, buildQuestionnaireTestFingerprint({ ...assignment, respondentLabel: "Guardian" }));
  assert.notEqual(fingerprint, buildQuestionnaireTestFingerprint({ ...assignment, assignedLanguage: "korean" }));
  assert.equal(normalizeQuestionnaireLanguage("mandarin"), normalizeQuestionnaireLanguage("Chinese"));
  assert.equal(normalizeQuestionnaireLanguage("zh"), normalizeQuestionnaireLanguage("中文"));
  assert.equal(normalizeQuestionnaireLanguage("Korean"), normalizeQuestionnaireLanguage("ko"));
});

test("legacy and current BEHAVOBS snapshots with the same rendered follow-up share a functionality pass", () => {
  const q24 = { id: "q24", text: "Unusual/Bizarre Behavior", type: "radio", options: ["Yes", "No"] };
  const legacy = { ...assignment, toolId: "BEHAVOBS", formItemsSnapshot: JSON.stringify([q24]) };
  const current = { ...legacy, assignedLanguage: "mandarin", formItemsSnapshot: JSON.stringify([q24, BEHAVOBS_DETAILS]) };
  assert.equal(buildQuestionnaireTestFormKey(legacy), buildQuestionnaireTestFormKey(current));
});

test("latest test result reports pass, fail and stale evidence without hiding tester evidence", () => {
  const fingerprint = buildQuestionnaireTestFingerprint(assignment);
  assert.deepEqual(toStaffTestResult(fingerprint, null), { status: "not_tested", testedBy: null });
  assert.equal(toStaffTestResult(fingerprint, evidence()).status, "passed");
  const failed = toStaffTestResult(fingerprint, evidence({ result: "failed", notes: "Wrong respondent label" }));
  assert.equal(failed.status, "failed");
  assert.equal(failed.testedBy, "Staff Tester");
  assert.equal(failed.testedById, "staff-1");
  assert.equal(failed.notes, "Wrong respondent label");
  assert.equal(toStaffTestResult("f".repeat(64), evidence()).status, "retest_required");
});

test("BIGSERIAL evidence order compares digit strings numerically, including beyond safe integers", () => {
  for (const [older, newer] of [
    ["9", "10"],
    ["99", "100"],
    ["9007199254740993", "9007199254740994"],
  ]) {
    const rows = latestQuestionnaireTestEvidence([
      evidence({ id: "pass", result: "passed", evidenceOrder: older, testedAt: "2026-04-12T09:00:00.000Z" }),
      evidence({ id: "fail", result: "failed", evidenceOrder: newer, testedAt: "2026-04-11T09:00:00.000Z" }),
    ]);
    assert.equal(rows.get(assignment.id)?.id, "fail");
    assert.equal(rows.get(assignment.id)?.result, "failed");
  }
  assert.throws(() => latestQuestionnaireTestEvidence([
    evidence({ evidenceOrder: Number.MAX_SAFE_INTEGER + 1 }),
    evidence({ id: "second", evidenceOrder: Number.MAX_SAFE_INTEGER + 2 }),
  ]), /represented exactly/);
});

test("equivalent frozen parent and teacher forms share current assignment-specific evidence", () => {
  const teacher: QuestionnaireTestAssignment = {
    ...assignment,
    id: "teacher-2",
    respondentType: "teacher",
    respondentLabel: "Teacher 2",
    formItemsSnapshot: '[ { "type": "radio", "text": "Question", "id": "q1" } ]',
  };
  const results = resolveQuestionnaireTestResults(
    [assignment, teacher],
    [evidence()],
  );
  assert.equal(results.get(assignment.id)?.status, "passed");
  assert.equal(results.get(teacher.id)?.status, "passed");
  assert.equal(results.get(teacher.id)?.sharedFromAssignmentId, assignment.id);
  assert.equal(results.get(teacher.id)?.sharedFromLabel, "Parent");
  assert.equal(results.get(assignment.id)?.sharedFromAssignmentId, undefined);
});

test("form equivalence preserves content and renderer identity, not assigned respondent language", () => {
  const reorderedKeys = {
    ...assignment,
    formItemsSnapshot: '[{"type":"radio","text":"Question","id":"q1"}]',
  };
  assert.equal(
    canonicalQuestionnaireSnapshot(assignment.formItemsSnapshot),
    canonicalQuestionnaireSnapshot(reorderedKeys.formItemsSnapshot),
  );
  assert.equal(buildQuestionnaireTestFormKey(assignment), buildQuestionnaireTestFormKey(reorderedKeys));
  for (const changed of [
    { ...assignment, formItemsSnapshot: '[{"id":"q1","text":"Changed wording","type":"radio"}]' },
    { ...assignment, formItemsSnapshot: '[{"id":"q1","text":"Question","type":"radio","note":"Instruction"}]' },
    { ...assignment, formItemsSnapshot: '[{"id":"q1","text":"Question","type":"radio","options":["Often","Never"]}]' },
    {
      ...assignment,
      formItemsSnapshot: '[{"id":"q2","text":"Second","type":"text"},{"id":"q1","text":"Question","type":"radio"}]',
    },
    { ...assignment, toolId: "FORM-B" },
    { ...assignment, toolName: "RPPI examiner form" },
  ]) {
    assert.notEqual(buildQuestionnaireTestFormKey(assignment), buildQuestionnaireTestFormKey(changed));
  }
  assert.equal(buildQuestionnaireTestFormKey({ ...assignment, assignedLanguage: "eng" }), buildQuestionnaireTestFormKey(assignment));
  assert.equal(buildQuestionnaireTestFormKey({ ...assignment, assignedLanguage: "korean" }), buildQuestionnaireTestFormKey(assignment));
  assert.notEqual(buildLegacyQuestionnaireTestFormKey({ ...assignment, assignedLanguage: "korean" }), buildLegacyQuestionnaireTestFormKey(assignment));
  assert.equal(
    buildQuestionnaireTestFormKey({ ...assignment, assignedLanguage: "mandarin" }),
    buildQuestionnaireTestFormKey({ ...assignment, assignedLanguage: "Chinese" }),
  );
});

test("invalid snapshots never inherit, and stale source evidence cannot cover changed forms or languages", () => {
  const invalid = { ...assignment, id: "invalid", formItemsSnapshot: '[{"id":"missing-text","type":"radio"}]' };
  const missing = { ...assignment, id: "missing", formItemsSnapshot: null };
  const invalidResults = resolveQuestionnaireTestResults(
    [assignment, invalid, missing],
    [evidence()],
  );
  assert.equal(invalidResults.get(invalid.id)?.status, "not_tested");
  assert.equal(invalidResults.get(missing.id)?.status, "not_tested");
  assert.equal(invalidResults.get(invalid.id)?.sharedFromAssignmentId, undefined);
  assert.equal(buildQuestionnaireTestFormKey(invalid), null);
  assert.equal(buildQuestionnaireTestFormKey(missing), null);

  const changedContent = { ...assignment, id: "changed-content", formItemsSnapshot: '[{"id":"q1","text":"New","type":"radio"}]' };
  const changedLanguage = { ...assignment, id: "changed-language", assignedLanguage: "korean" };
  const staleResults = resolveQuestionnaireTestResults(
    [changedContent, changedLanguage],
    [evidence()],
  );
  assert.equal(staleResults.get(changedContent.id)?.status, "not_tested");
  assert.equal(staleResults.get(changedLanguage.id)?.status, "not_tested");
  assert.equal(staleResults.get(changedContent.id)?.sharedFromAssignmentId, undefined);
});

test("the most recent exact-order group evidence, including a late failure, overrides inherited passes", () => {
  const teacher = { ...assignment, id: "teacher-1", respondentType: "teacher", respondentLabel: "Teacher 1" };
  const pass = evidence({ evidenceOrder: "9007199254740993", testedAt: "2026-04-12T12:00:00.000Z" });
  const failure = evidence({
    id: "late-failure",
    assignmentId: teacher.id,
    fingerprint: buildQuestionnaireTestFingerprint(teacher),
    evidenceOrder: "9007199254740994",
    testedAt: "2026-04-11T12:00:00.000Z",
    result: "failed",
    notes: "The displayed controls do not match the assigned form.",
  });
  const results = resolveQuestionnaireTestResults([assignment, teacher], [pass, failure]);
  assert.equal(results.get(assignment.id)?.status, "failed");
  assert.equal(results.get(assignment.id)?.sharedFromAssignmentId, teacher.id);
  assert.equal(results.get(teacher.id)?.status, "failed");
  assert.equal(results.get(teacher.id)?.sharedFromAssignmentId, undefined);
});

test("a title-triggered renderer change invalidates old evidence without invalidating ordinary legacy checks", () => {
  const previous = { ...assignment, toolName: "Standard questionnaire" };
  const changed = { ...previous, toolName: "RPPI examiner workflow" };
  const duplicate = { ...changed, id: "changed-teacher", respondentType: "teacher", respondentLabel: "Teacher 1" };
  assert.equal(buildQuestionnaireTestFingerprint(previous), buildQuestionnaireTestFingerprint(assignment));
  assert.notEqual(buildQuestionnaireTestFingerprint(changed), buildQuestionnaireTestFingerprint(previous));
  const results = resolveQuestionnaireTestResults([changed, duplicate], [
    evidence({ fingerprint: buildQuestionnaireTestFingerprint(previous) }),
  ]);
  assert.equal(results.get(changed.id)?.status, "retest_required");
  assert.equal(results.get(duplicate.id)?.status, "not_tested");
  assert.equal(results.get(duplicate.id)?.sharedFromAssignmentId, undefined);
  assert.equal(
    buildQuestionnaireTestFingerprint({ ...assignment, toolId: "RPPI", toolName: "RPPI" }),
    buildQuestionnaireTestFingerprint({ ...assignment, toolId: "RPPI", toolName: "Renamed title" }),
  );
});

test("required-answer validation matches visible conditionals and required frequency-grid rows", () => {
  const questions: FormQuestion[] = [
    { id: "section", text: "Section", type: "section_header", domain: "", required: false },
    { id: "trigger", text: "Trigger", type: "radio_group", domain: "", required: true },
    {
      id: "grid",
      text: "Grid",
      type: "frequency_grid",
      domain: "",
      required: false,
      rows: [
        { id: "grid-a", text: "A", type: "radio_group", domain: "", required: true },
        { id: "grid-b", text: "B", type: "radio_group", domain: "", required: true, conditionalOn: "trigger", conditionalValue: "yes" },
        { id: "grid-c", text: "C", type: "radio_group", domain: "", required: false },
      ],
    },
    { id: "conditional", text: "Conditional", type: "text", domain: "", required: true, conditionalOn: "trigger", conditionalValue: "yes" },
    { id: "under14", text: "Guardian", type: "text", domain: "", required: true, conditionalType: "under_14" },
  ];
  const now = new Date("2026-04-12T12:00:00.000Z");
  const incomplete = validateStaffTestAnswers(questions, { trigger: "yes", "grid-a": "often" }, null, now);
  assert.deepEqual(incomplete, { valid: false, missingCount: 2, consentBlocked: false });
  const complete = validateStaffTestAnswers(questions, {
    trigger: "yes",
    "grid-a": "often",
    "grid-b": "sometimes",
    conditional: "details",
    student_dob: "2013-05-01",
    under14: "guardian",
  }, null, now);
  assert.deepEqual(complete, { valid: true, missingCount: 0, consentBlocked: false });
  const hiddenRows = validateStaffTestAnswers(questions, {
    trigger: "no",
    "grid-a": "often",
    student_dob: "2010-01-01",
  }, null, now);
  assert.equal(hiddenRows.valid, true);
});

test("consent No blockers prevent a pass even after all required fields are answered", () => {
  const consentQuestions: FormQuestion[] = [
    { id: "consent_authorization", text: "Authorize?", type: "radio_group", domain: "", required: true },
  ];
  assert.deepEqual(validateStaffTestAnswers(
    consentQuestions,
    { consent_authorization: "No" },
    "CONSENT",
  ), { valid: false, missingCount: 0, consentBlocked: true });
  assert.deepEqual(validateStaffTestAnswers(
    consentQuestions,
    { consent_authorization: "Yes" },
    "CONSENT",
  ), { valid: true, missingCount: 0, consentBlocked: false });
});