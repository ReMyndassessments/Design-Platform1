import { createHash } from "node:crypto";
import type { FormQuestion } from "./questions.js";

export type StaffTestResultStatus = "not_tested" | "passed" | "failed" | "retest_required";
export type StaffTestOutcome = "passed" | "failed";

export type StaffTestChecklist = {
  correctForm: boolean;
  contentLanguage: boolean;
  controls: boolean;
  safeTesting: boolean;
};

export type QuestionnaireTestAssignment = {
  id: string;
  toolId: string;
  respondentType: string;
  respondentLabel: string | null;
  formItemsSnapshot: string | null;
  assignedLanguage: string | null;
};

export type QuestionnaireTestEvidence = {
  id: string;
  assignmentId: string;
  testerId: string;
  testerName: string;
  testedAt: Date | string;
  evidenceOrder?: number | string | bigint;
  fingerprint: string;
  result: StaffTestOutcome;
  language: string;
  checklist: StaffTestChecklist | null;
  notes: string | null;
};

export type StaffTestResult = {
  status: StaffTestResultStatus;
  testedBy: string | null;
  testedById?: string;
  testedAt?: string;
  language?: string;
  notes?: string;
};

export type RequiredAnswerValidation = {
  valid: boolean;
  missingCount: number;
  consentBlocked: boolean;
};

const CONSENT_BLOCKING_IDS = new Set([
  "consent_1", "consent_2", "consent_3", "consent_4",
  "consent_authority", "consent_authorization", "consent_ai", "consent_sensitive",
  "consent_under14", "consent_privacy_ack", "consent_final",
]);

export function normalizeQuestionnaireLanguage(language: string | null | undefined): string {
  const normalized = (language ?? "").trim().toLowerCase().replaceAll("_", " ").replace(/\s+/g, " ");
  if (["en", "eng", "english"].includes(normalized)) return "en";
  if ([
    "zh", "zho", "chi", "chinese", "mandarin", "simplified chinese", "traditional chinese",
    "chinese (simplified)", "chinese (traditional)", "中文", "普通话",
  ].includes(normalized)) return "zh";
  if (["ko", "kor", "korean", "한국어"].includes(normalized)) return "ko";
  return normalized;
}

export function buildQuestionnaireTestFingerprint(assignment: QuestionnaireTestAssignment): string {
  const scope = {
    assignmentId: assignment.id,
    toolId: assignment.toolId,
    formItemsSnapshot: assignment.formItemsSnapshot,
    respondentType: assignment.respondentType,
    respondentLabel: assignment.respondentLabel,
    assignedLanguage: normalizeQuestionnaireLanguage(assignment.assignedLanguage || "english"),
  };
  return createHash("sha256").update(JSON.stringify(scope)).digest("hex");
}

export function toStaffTestResult(
  currentFingerprint: string,
  evidence: QuestionnaireTestEvidence | null | undefined,
): StaffTestResult {
  if (!evidence) return { status: "not_tested", testedBy: null };
  const status: StaffTestResultStatus = evidence.fingerprint !== currentFingerprint
    ? "retest_required"
    : evidence.result;
  return {
    status,
    testedBy: evidence.testerName,
    testedById: evidence.testerId,
    testedAt: evidence.testedAt instanceof Date
      ? evidence.testedAt.toISOString()
      : new Date(evidence.testedAt).toISOString(),
    language: evidence.language,
    ...(evidence.notes ? { notes: evidence.notes } : {}),
  };
}

export function checklistIsComplete(checklist: StaffTestChecklist | null | undefined): boolean {
  return Boolean(checklist &&
    checklist.correctForm === true &&
    checklist.contentLanguage === true &&
    checklist.controls === true &&
    checklist.safeTesting === true);
}

export function validateStaffTestAnswers(
  questions: readonly FormQuestion[],
  answers: Record<string, unknown>,
  formType?: string | null,
  now = new Date(),
): RequiredAnswerValidation {
  const isVisible = (question: FormQuestion): boolean => {
    if (question.conditionalType === "under_14") {
      const dob = answers.student_dob;
      if (typeof dob !== "string" || !dob) return false;
      const birthDate = new Date(dob);
      if (Number.isNaN(birthDate.getTime())) return false;
      let age = now.getFullYear() - birthDate.getFullYear();
      const monthDelta = now.getMonth() - birthDate.getMonth();
      if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) age -= 1;
      return age < 14;
    }
    if (question.conditionalOn && !question.conditionalType) {
      return answers[question.conditionalOn] === question.conditionalValue;
    }
    return true;
  };
  const hasAnswer = (question: FormQuestion): boolean => {
    const value = answers[question.id];
    if (Array.isArray(value)) return value.length > 0 && value.every(item => typeof item === "string");
    return typeof value === "string" && value !== "";
  };

  const requiredItems: FormQuestion[] = [];
  for (const question of questions) {
    if (question.type === "section_header" || !isVisible(question)) continue;
    if (question.type === "frequency_grid") {
      for (const row of question.rows ?? []) {
        if ((row.required ?? question.required) && isVisible(row)) requiredItems.push(row);
      }
    } else if (question.required) {
      requiredItems.push(question);
    }
  }
  const missingCount = requiredItems.filter(question => !hasAnswer(question)).length;
  const consentBlocked = formType === "CONSENT" && questions.some(question =>
    isVisible(question) &&
    CONSENT_BLOCKING_IDS.has(question.id) &&
    answers[question.id] === "No",
  );
  return { valid: missingCount === 0 && !consentBlocked, missingCount, consentBlocked };
}

export function latestQuestionnaireTestEvidence(
  evidence: readonly QuestionnaireTestEvidence[],
): Map<string, QuestionnaireTestEvidence> {
  const latest = new Map<string, QuestionnaireTestEvidence>();
  for (const row of evidence) {
    const current = latest.get(row.assignmentId);
    if (!current || compareEvidenceRecency(row, current) > 0) latest.set(row.assignmentId, row);
  }
  return latest;
}

function compareEvidenceRecency(a: QuestionnaireTestEvidence, b: QuestionnaireTestEvidence): number {
  if (a.evidenceOrder !== undefined && b.evidenceOrder !== undefined) {
    const orderComparison = compareExactIntegerOrders(a.evidenceOrder, b.evidenceOrder);
    if (orderComparison !== 0) return orderComparison;
  }
  const timeDelta = new Date(a.testedAt).getTime() - new Date(b.testedAt).getTime();
  return timeDelta || a.id.localeCompare(b.id);
}

function compareExactIntegerOrders(a: number | string | bigint, b: number | string | bigint): number {
  const toBigInt = (value: number | string | bigint): bigint => {
    if (typeof value === "number" && !Number.isSafeInteger(value)) {
      throw new Error("Questionnaire test evidence order must be represented exactly.");
    }
    return BigInt(value);
  };
  const left = toBigInt(a);
  const right = toBigInt(b);
  return left < right ? -1 : left > right ? 1 : 0;
}