import { createHash } from "node:crypto";

export const INTAKE_TOOL_IDS = new Set([
  "REFERRAL",
  "REFERRAL-CORP",
  "REFERRAL-UNI",
  "REFERRAL-PARENT",
  "REFERRAL-BOARDING",
  "CONSENT",
  "INTAKE",
]);

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
};

export type BatteryReviewState = {
  approved: boolean;
  approval: { approvedAt: string; approvedBy: string } | null;
  assignmentCount: number;
  missingSnapshots: number;
  issues: string[];
  fingerprint: string;
};

export function buildBatteryReviewState(
  assignments: readonly BatteryReviewAssignment[],
  savedApproval: BatteryApproval | null,
): BatteryReviewState {
  const assessmentRows = assignments.filter(row => !INTAKE_TOOL_IDS.has(row.toolId));
  const fingerprintInput = [...assessmentRows]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(({ id, toolId, respondentLabel, respondentType, uniqueLink, formItemsSnapshot }) => ({
      id, toolId, respondentLabel, respondentType, uniqueLink, formItemsSnapshot,
    }));
  const fingerprint = createHash("sha256").update(JSON.stringify(fingerprintInput)).digest("hex");
  const missingSnapshots = assessmentRows.filter(row => !isValidSnapshot(row.formItemsSnapshot)).length;
  const issues: string[] = [];

  if (assessmentRows.length === 0) issues.push("Assign at least one assessment form before approving the battery.");
  if (missingSnapshots > 0) issues.push(`${missingSnapshots} assigned assessment form${missingSnapshots === 1 ? " is" : "s are"} missing a valid frozen form snapshot.`);

  const groupedTools = new Map<string, Set<string>>();
  const duplicates = new Set<string>();
  for (const row of assessmentRows) {
    const key = `${row.respondentType}\u0000${row.respondentLabel ?? ""}`;
    const tools = groupedTools.get(key) ?? new Set<string>();
    if (tools.has(row.toolId)) duplicates.add(`${row.respondentLabel || row.respondentType}: ${row.toolId}`);
    tools.add(row.toolId);
    groupedTools.set(key, tools);
  }
  if (duplicates.size > 0) {
    issues.push(`Duplicate assessment forms in one recipient group: ${[...duplicates].sort().join(", ")}. Remove unintended duplicates before approving.`);
  }

  const parentRows = assessmentRows.filter(row =>
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