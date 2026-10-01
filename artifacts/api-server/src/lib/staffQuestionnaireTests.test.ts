import test from "node:test";
import assert from "node:assert/strict";
import type { FormQuestion } from "./questions.ts";
import {
  buildQuestionnaireTestFingerprint,
  latestQuestionnaireTestEvidence,
  normalizeQuestionnaireLanguage,
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