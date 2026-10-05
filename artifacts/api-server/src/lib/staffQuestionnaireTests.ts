import { createHash } from "node:crypto";
import type { FormQuestion } from "./questions.js";
import { withBehavobsDetails } from "./behavobsDetails.js";

export type StaffTestResultStatus = "not_tested" | "passed" | "failed" | "retest_required";
export type StaffTestOutcome = "passed" | "failed";

export type StaffTestChecklist = {
  correctForm: boolean;
  contentLanguage: boolean;
  controls: boolean;
  safeTesting: boolean;
  // Server-owned content identity, stored with the review (never test answers).
  formKey?: string | null;
};

export type QuestionnaireTestAssignment = {
  id: string;
  toolId: string;
  toolName?: string | null;
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
  formKey?: string | null;
  sharedAcrossCases?: boolean;
};

export type StaffTestResult = {
  status: StaffTestResultStatus;
  testedBy: string | null;
  testedById?: string;
  testedAt?: string;
  language?: string;
  notes?: string;
  sharedFromAssignmentId?: string;
  sharedFromLabel?: string;
  sharedAcrossCases?: boolean;
  evidenceId?: string;
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
    // Preserve legacy fingerprints for ordinary forms and canonical RPPI.
    // A title-triggered RPPI workflow on another tool needs a discriminator:
    // an older ordinary-form check cannot certify this different workflow.
    ...(assignment.toolId !== "RPPI" && (assignment.toolName ?? "").toLowerCase().includes("rppi")
      ? { rppiExternalWorkflow: true }
      : {}),
  };
  return createHash("sha256").update(JSON.stringify(scope)).digest("hex");
}

/**
 * Parse and canonicalize a frozen form snapshot. Object key order is not part
 * of the form; array order is, including the order of questions and options.
 */
export function canonicalQuestionnaireSnapshot(snapshot: string | null | undefined): string | null {
  if (!snapshot) return null;
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    if (!isValidQuestionnaireSnapshotValue(parsed)) return null;
    return JSON.stringify(canonicalizeJson(parsed));
  } catch {
    return null;
  }
}

export function isValidQuestionnaireSnapshot(snapshot: string | null | undefined): boolean {
  return canonicalQuestionnaireSnapshot(snapshot) !== null;
}

/**
 * The assignment-specific fingerprint remains the persisted evidence identity.
 * This second key intentionally ignores recipient metadata and assignment id
 * so exact rendered forms can share a functionality result across recipients
 * and assigned languages. Keep the actual reviewed language in the evidence.
 */
export function buildQuestionnaireTestFormKey(assignment: QuestionnaireTestAssignment): string | null {
  let snapshot = canonicalQuestionnaireSnapshot(assignment.formItemsSnapshot);
  if (!snapshot) return null;
  if (assignment.toolId === "BEHAVOBS") {
    snapshot = canonicalQuestionnaireSnapshot(JSON.stringify(
      withBehavobsDetails(JSON.parse(snapshot), assignment.toolId),
    ));
  }
  if (!snapshot) return null;
  return createHash("sha256").update(JSON.stringify({
    toolId: assignment.toolId,
    rppiExternalWorkflow: assignment.toolId === "RPPI" ||
      (assignment.toolName ?? "").toLowerCase().includes("rppi"),
    formItemsSnapshot: snapshot,
  })).digest("hex");
}

/** Read compatibility for passes recorded before functionality tests became language-independent. */
export function buildLegacyQuestionnaireTestFormKey(assignment: QuestionnaireTestAssignment): string | null {
  const snapshot = canonicalQuestionnaireSnapshot(assignment.formItemsSnapshot);
  if (!snapshot) return null;
  return createHash("sha256").update(JSON.stringify({
    toolId: assignment.toolId,
    // The external renderer also recognizes RPPI from toolName text, not just
    // toolId. Include that behavior switch without treating ordinary display
    // title variations as different frozen questionnaires.
    rppiExternalWorkflow: assignment.toolId === "RPPI" ||
      (assignment.toolName ?? "").toLowerCase().includes("rppi"),
    formItemsSnapshot: snapshot,
    assignedLanguage: normalizeQuestionnaireLanguage(assignment.assignedLanguage || "english"),
  })).digest("hex");
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
    evidenceId: evidence.id,
    testedBy: evidence.testerName,
    testedById: evidence.testerId,
    testedAt: evidence.testedAt instanceof Date
      ? evidence.testedAt.toISOString()
      : new Date(evidence.testedAt).toISOString(),
    language: evidence.language,
    ...(evidence.notes ? { notes: evidence.notes } : {}),
  };
}

/**
 * Resolve assignment-specific legacy evidence and verified content-scoped
 * history. A later failure overrides passes for that exact form/version.
 */
export function resolveQuestionnaireTestResults(
  assignments: readonly QuestionnaireTestAssignment[],
  evidence: readonly QuestionnaireTestEvidence[],
): Map<string, StaffTestResult> {
  const latestByAssignment = latestQuestionnaireTestEvidence(evidence);
  const fingerprints = new Map(assignments.map(assignment => [
    assignment.id,
    buildQuestionnaireTestFingerprint(assignment),
  ]));
  const formKeys = new Map(assignments.map(assignment => [
    assignment.id,
    buildQuestionnaireTestFormKey(assignment),
  ]));
  const validSourcesByForm = new Map<string, QuestionnaireTestEvidence[]>();

  for (const row of evidence) {
    if (!row.formKey || !/^[a-f0-9]{64}$/.test(row.formKey)) continue;
    const sources = validSourcesByForm.get(row.formKey) ?? [];
    sources.push(row);
    validSourcesByForm.set(row.formKey, sources);
  }

  for (const assignment of assignments) {
    const formKey = formKeys.get(assignment.id);
    const latest = latestByAssignment.get(assignment.id);
    if (!formKey || !latest || latest.fingerprint !== fingerprints.get(assignment.id)) continue;
    const sources = validSourcesByForm.get(formKey) ?? [];
    sources.push(latest);
    validSourcesByForm.set(formKey, sources);
  }

  const newestByForm = new Map<string, QuestionnaireTestEvidence>();
  for (const [formKey, sources] of validSourcesByForm) {
    let newest = sources[0];
    for (const candidate of sources.slice(1)) {
      if (compareQuestionnaireTestEvidenceRecency(candidate, newest) > 0) newest = candidate;
    }
    newestByForm.set(formKey, newest);
  }

  const labels = new Map(assignments.map(assignment => [assignment.id, assignment.respondentLabel]));
  const results = new Map<string, StaffTestResult>();
  for (const assignment of assignments) {
    const fingerprint = fingerprints.get(assignment.id)!;
    const ownLatest = latestByAssignment.get(assignment.id);
    const formKey = formKeys.get(assignment.id);
    const sharedEvidence = formKey ? newestByForm.get(formKey) : undefined;
    const selectedEvidence = sharedEvidence ?? ownLatest;
    const contentScopedEvidence = sharedEvidence &&
      (sharedEvidence.formKey === formKey || sharedEvidence.assignmentId !== assignment.id)
      ? sharedEvidence : undefined;
    const result = contentScopedEvidence
      ? toStaffTestResult(contentScopedEvidence.fingerprint, contentScopedEvidence)
      : toStaffTestResult(fingerprint, selectedEvidence);
    if (sharedEvidence && sharedEvidence.assignmentId !== assignment.id) {
      result.sharedFromAssignmentId = sharedEvidence.assignmentId;
      result.sharedAcrossCases = sharedEvidence.sharedAcrossCases === true;
      const label = !sharedEvidence.sharedAcrossCases ? labels.get(sharedEvidence.assignmentId) : undefined;
      if (label) result.sharedFromLabel = label;
    }
    if (sharedEvidence?.sharedAcrossCases) {
      result.sharedAcrossCases = true;
      delete result.notes;
    }
    results.set(assignment.id, result);
  }
  return results;
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
    if (!current || compareQuestionnaireTestEvidenceRecency(row, current) > 0) latest.set(row.assignmentId, row);
  }
  return latest;
}

export function compareQuestionnaireTestEvidenceRecency(a: QuestionnaireTestEvidence, b: QuestionnaireTestEvidence): number {
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

function isValidQuestionnaireSnapshotValue(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  const isValidItem = (item: unknown): boolean => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const candidate = item as { id?: unknown; text?: unknown; type?: unknown; rows?: unknown };
    return typeof candidate.id === "string" &&
      typeof candidate.text === "string" &&
      typeof candidate.type === "string" &&
      (candidate.rows === undefined ||
        (Array.isArray(candidate.rows) && candidate.rows.every(isValidItem)));
  };
  return value.every(isValidItem);
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, nested]) => [key, canonicalizeJson(nested)]));
  }
  return value;
}