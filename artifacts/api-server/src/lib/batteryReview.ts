import { createHash } from "node:crypto";
import type { QuestionnaireTestEvidence, StaffTestResult } from "./staffQuestionnaireTests.js";

export const INTAKE_TOOL_IDS = new Set([
  "REFERRAL",
  "REFERRAL-CORP",
  "REFERRAL-UNI",
  "REFERRAL-PARENT",
  "REFERRAL-BOARDING",
  "CONSENT",
  "INTAKE",
]);

// These examiner-led modules present their own task workflow instead of a
// questionnaire from assessment_tools.form_items. Their frozen snapshot is [].
export const SPECIALIZED_EXAMINER_TOOL_IDS = new Set([
  "RDA", "RRCA", "RRFA", "RAEPA", "RAMRI", "RMRA",
]);

export function isSpecializedExaminerAssignment(row: { toolId: string; respondentType: string }): boolean {
  return row.respondentType === "examiner" && SPECIALIZED_EXAMINER_TOOL_IDS.has(row.toolId);
}

export type BatteryApproval = {
  fingerprint: string;
  approvedAt: string;
  approvedBy: string;
};

export type BatteryReviewAssignment = {
  id: string;
  toolId: string;
  respondentLabel: string | null;
  respondentType: string;
  uniqueLink: string;
  formItemsSnapshot: string | null;
  assignedToName?: string | null;
  assignedToEmail?: string | null;
  assignedLanguage?: string | null;
};

export type BatteryReviewState = {
  approved: boolean;
  approval: { approvedAt: string; approvedBy: string } | null;
  assignmentCount: number;
  questionnaireCount: number;
  passedCount: number;
  testResults: Record<string, StaffTestResult>;
  missingSnapshots: number;
  issues: string[];
  fingerprint: string;
};

export function buildBatteryReviewState(
  assignments: readonly BatteryReviewAssignment[],
  savedApproval: BatteryApproval | null,
  testEvidence: readonly QuestionnaireTestEvidence[] = [],
): BatteryReviewState {
  const assessmentRows = assignments.filter(row => !INTAKE_TOOL_IDS.has(row.toolId));
  const questionnaireRows = assessmentRows.filter(row => !isSpecializedExaminerAssignment(row));
  const fingerprintInput = [...assessmentRows]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(({ id, toolId, respondentLabel, respondentType, uniqueLink, formItemsSnapshot }) => ({
      id, toolId, respondentLabel, respondentType, uniqueLink, formItemsSnapshot,
    }));
  const assignmentsFingerprint = createHash("sha256").update(JSON.stringify(fingerprintInput)).digest("hex");
  const latestEvidence = latestEvidenceByAssignment(testEvidence);
  const testResults: Record<string, StaffTestResult> = {};
  const currentTestFingerprints: Record<string, string> = {};
  for (const row of questionnaireRows) {
    const currentTestFingerprint = createHash("sha256").update(JSON.stringify({
      assignmentId: row.id,
      toolId: row.toolId,
      formItemsSnapshot: row.formItemsSnapshot,
      respondentType: row.respondentType,
      respondentLabel: row.respondentLabel,
      assignedLanguage: normalizeAssignedLanguage(row.assignedLanguage ?? "english"),
    })).digest("hex");
    currentTestFingerprints[row.id] = currentTestFingerprint;
    const latest = latestEvidence.get(row.id);
    testResults[row.id] = !latest
      ? { status: "not_tested", testedBy: null }
      : {
          status: latest.fingerprint !== currentTestFingerprint ? "retest_required" : latest.result,
          testedBy: latest.testerName,
          testedById: latest.testerId,
          testedAt: latest.testedAt instanceof Date ? latest.testedAt.toISOString() : new Date(latest.testedAt).toISOString(),
          language: latest.language,
          ...(latest.notes ? { notes: latest.notes } : {}),
        };
  }
  const hasTestEvidence = questionnaireRows.some(row => latestEvidence.has(row.id));
  const fingerprint = hasTestEvidence
    ? createHash("sha256").update(JSON.stringify({
        assignmentsFingerprint,
        latestTestEvidenceIds: questionnaireRows
          .slice()
          .sort((a, b) => a.id.localeCompare(b.id))
          .map(row => [row.id, currentTestFingerprints[row.id], latestEvidence.get(row.id)?.id ?? null]),
      })).digest("hex")
    : assignmentsFingerprint;
  const missingSnapshots = questionnaireRows.filter(row => !isValidSnapshot(row.formItemsSnapshot)).length;
  const passedCount = questionnaireRows.filter(row => testResults[row.id]?.status === "passed").length;
  const issues: string[] = [];

  if (questionnaireRows.length === 0) issues.push("Assign at least one questionnaire form before approving assessment sends.");
  if (missingSnapshots > 0) issues.push(`${missingSnapshots} assigned assessment form${missingSnapshots === 1 ? " is" : "s are"} missing a valid frozen form snapshot.`);
  if (passedCount !== questionnaireRows.length) {
    const outstanding = questionnaireRows.length - passedCount;
    issues.push(`${outstanding} assigned questionnaire${outstanding === 1 ? " has" : "s have"} not passed a current staff test.`);
  }

  const groupedTools = new Map<string, Set<string>>();
  const duplicates = new Set<string>();
  for (const row of questionnaireRows) {
    const key = `${row.respondentType}\u0000${row.respondentLabel ?? ""}`;
    const tools = groupedTools.get(key) ?? new Set<string>();
    if (tools.has(row.toolId)) duplicates.add(`${row.respondentLabel || row.respondentType}: ${row.toolId}`);
    tools.add(row.toolId);
    groupedTools.set(key, tools);
  }
  if (duplicates.size > 0) {
    issues.push(`Duplicate assessment forms in one recipient group: ${[...duplicates].sort().join(", ")}. Remove unintended duplicates before approving.`);
  }

  const parentRows = questionnaireRows.filter(row =>
    row.respondentType === "parent" &&
    (row.respondentLabel === "Parent" || row.respondentLabel === "Parent Assessment Package"),
  );
  const splitUnnamedParentPackages =
    parentRows.some(row => row.respondentLabel === "Parent") &&
    parentRows.some(row => row.respondentLabel === "Parent Assessment Package") &&
    parentRows.every(row => !row.assignedToName?.trim() && !row.assignedToEmail?.trim());
  if (splitUnnamedParentPackages) {
    issues.push("The unnamed parent assessment packages must be explicitly consolidated before approval.");
  }

  const approvalMatches = savedApproval?.fingerprint === fingerprint;
  if (savedApproval && !approvalMatches) {
    issues.push("Assessment assignments changed after approval. Review and approve the current battery again.");
  }
  const hasBlockers = issues.some(issue => !issue.startsWith("Assessment assignments changed after approval."));
  const approved = approvalMatches && !hasBlockers;
  return {
    approved,
    approval: approved && savedApproval
      ? { approvedAt: savedApproval.approvedAt, approvedBy: savedApproval.approvedBy }
      : null,
    assignmentCount: assessmentRows.length,
    questionnaireCount: questionnaireRows.length,
    passedCount,
    testResults,
    missingSnapshots,
    issues,
    fingerprint,
  };
}

export function isValidSnapshot(snapshot: string | null): boolean {
  if (!snapshot) return false;
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    const isValidItem = (item: unknown): boolean => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      const candidate = item as { id?: unknown; text?: unknown; type?: unknown; rows?: unknown };
      return typeof candidate.id === "string" &&
        typeof candidate.text === "string" &&
        typeof candidate.type === "string" &&
        (candidate.rows === undefined ||
          (Array.isArray(candidate.rows) && candidate.rows.every(isValidItem)));
    };
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidItem);
  } catch {
    return false;
  }
}

function normalizeAssignedLanguage(language: string): string {
  const normalized = language.trim().toLowerCase().replaceAll("_", " ").replace(/\s+/g, " ");
  if (["en", "eng", "english"].includes(normalized)) return "en";
  if ([
    "zh", "zho", "chi", "chinese", "mandarin", "simplified chinese", "traditional chinese",
    "chinese (simplified)", "chinese (traditional)", "中文", "普通话",
  ].includes(normalized)) return "zh";
  if (["ko", "kor", "korean", "한국어"].includes(normalized)) return "ko";
  return normalized;
}

function latestEvidenceByAssignment(
  evidence: readonly QuestionnaireTestEvidence[],
): Map<string, QuestionnaireTestEvidence> {
  const latest = new Map<string, QuestionnaireTestEvidence>();
  for (const row of evidence) {
    const previous = latest.get(row.assignmentId);
    const testedAt = new Date(row.testedAt).getTime();
    const previousTestedAt = previous ? new Date(previous.testedAt).getTime() : Number.NEGATIVE_INFINITY;
    const orderComparison = row.evidenceOrder !== undefined && previous?.evidenceOrder !== undefined
      ? compareExactEvidenceOrders(row.evidenceOrder, previous.evidenceOrder)
      : null;
    const isMoreRecent = orderComparison !== null
      ? orderComparison > 0
      : testedAt > previousTestedAt ||
        (testedAt === previousTestedAt && row.id.localeCompare(previous?.id ?? "") > 0);
    if (!previous || isMoreRecent) {
      latest.set(row.assignmentId, row);
    }
  }
  return latest;
}

function compareExactEvidenceOrders(
  leftValue: number | string | bigint,
  rightValue: number | string | bigint,
): number {
  const toBigInt = (value: number | string | bigint): bigint => {
    if (typeof value === "number" && !Number.isSafeInteger(value)) {
      throw new Error("Questionnaire test evidence order must be represented exactly.");
    }
    return BigInt(value);
  };
  const left = toBigInt(leftValue);
  const right = toBigInt(rightValue);
  return left < right ? -1 : left > right ? 1 : 0;
}