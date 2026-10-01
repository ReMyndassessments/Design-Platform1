import { assignmentsTable, scoresTable } from "@workspace/db/schema";

type AssignmentEvidence = Pick<
  typeof assignmentsTable.$inferSelect,
  "id" | "toolId" | "respondentType" | "status" | "submittedAt"
>;
type ScoreEvidence = Pick<
  typeof scoresTable.$inferSelect,
  | "id"
  | "toolId"
  | "toolName"
  | "respondentType"
  | "rawScore"
  | "domainScores"
  | "normalizedScores"
  | "agreementIndex"
  | "hasHighDiscrepancy"
  | "isManual"
  | "notes"
  | "generatedAt"
>;

function pairKey(row: { toolId: string; respondentType: string | null }): string {
  return `${row.toolId}::${row.respondentType ?? ""}`;
}

export function activeScoresForAssignments<T extends ScoreEvidence>(
  assignments: readonly AssignmentEvidence[],
  scores: readonly T[],
): T[] {
  const activePairs = new Set(assignments.map(pairKey));
  return scores.filter(score => activePairs.has(pairKey(score)));
}

/** Stable snapshot of the assignments and scores currently backing a report. */
export function activeAssignmentEvidenceRevision(
  assignments: readonly AssignmentEvidence[],
  scores: readonly ScoreEvidence[],
): string {
  const sortedAssignments = [...assignments]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(a => ({
      id: a.id,
      toolId: a.toolId,
      respondentType: a.respondentType,
      status: a.status,
      submittedAt: a.submittedAt?.toISOString() ?? null,
    }));
  const sortedScores = activeScoresForAssignments(assignments, scores)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(s => ({
      id: s.id,
      toolId: s.toolId,
      toolName: s.toolName,
      respondentType: s.respondentType,
      rawScore: s.rawScore,
      domainScores: s.domainScores,
      normalizedScores: s.normalizedScores,
      agreementIndex: s.agreementIndex,
      hasHighDiscrepancy: s.hasHighDiscrepancy,
      isManual: s.isManual,
      notes: s.notes,
      generatedAt: s.generatedAt.toISOString(),
    }));
  return JSON.stringify({ assignments: sortedAssignments, scores: sortedScores });
}