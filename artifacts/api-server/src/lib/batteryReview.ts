import { createHash } from "node:crypto";
import {
  buildQuestionnaireTestFingerprint,
  isValidQuestionnaireSnapshot,
  latestQuestionnaireTestEvidence,
  resolveQuestionnaireTestResults,
  type QuestionnaireTestAssignment,
  type QuestionnaireTestEvidence,
  type StaffTestResult,
} from "./staffQuestionnaireTests.js";

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
  toolName?: string | null;
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
  const latestEvidence = latestQuestionnaireTestEvidence(testEvidence);
  const testAssignments: QuestionnaireTestAssignment[] = questionnaireRows.map(row => ({
    id: row.id,
    toolId: row.toolId,
    toolName: row.toolName,
    respondentType: row.respondentType,
    respondentLabel: row.respondentLabel,
    formItemsSnapshot: row.formItemsSnapshot,
    assignedLanguage: row.assignedLanguage ?? "english",
  }));
  const resolvedTestResults = resolveQuestionnaireTestResults(testAssignments, testEvidence);
  const testResults: Record<string, StaffTestResult> = {};
  const currentTestFingerprints: Record<string, string> = {};
  for (const row of questionnaireRows) {
    const currentTestFingerprint = buildQuestionnaireTestFingerprint({
      id: row.id,
      toolId: row.toolId,
      toolName: row.toolName,
      respondentType: row.respondentType,
      respondentLabel: row.respondentLabel,
      formItemsSnapshot: row.formItemsSnapshot,
      assignedLanguage: row.assignedLanguage ?? "english",
    });
    currentTestFingerprints[row.id] = currentTestFingerprint;
    testResults[row.id] = resolvedTestResults.get(row.id) ?? { status: "not_tested", testedBy: null };
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
  return isValidQuestionnaireSnapshot(snapshot);
}
