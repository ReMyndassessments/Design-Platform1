import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { INTAKE_TOOL_IDS, isSpecializedExaminerAssignment } from "./batteryReview.js";
import {
  buildQuestionnaireTestFingerprint,
  buildQuestionnaireTestFormKey,
  type QuestionnaireTestAssignment,
  type QuestionnaireTestEvidence,
} from "./staffQuestionnaireTests.js";

type EvidenceReader = Pick<typeof db, "execute">;
type HistoryRow = QuestionnaireTestEvidence & {
  caseId: string;
  sourceAssignment: QuestionnaireTestAssignment | null;
};

export function eligibleQuestionnaire(assignment: { toolId: string; respondentType: string }): boolean {
  return !INTAKE_TOOL_IDS.has(assignment.toolId) && !isSpecializedExaminerAssignment(assignment);
}

/**
 * New evidence pins its form key at review time. Legacy passes are reused only
 * when the source still proves the exact assignment-specific fingerprint.
 * Other-case recipient labels, notes, and case identities stay server-side.
 */
export function reusableQuestionnaireEvidence(row: HistoryRow, caseId: string): QuestionnaireTestEvidence {
  let formKey = row.checklist?.formKey;
  if (!formKey || !/^[a-f0-9]{64}$/.test(formKey)) {
    const source = row.sourceAssignment;
    formKey = source && eligibleQuestionnaire(source) &&
      buildQuestionnaireTestFingerprint(source) === row.fingerprint
      ? buildQuestionnaireTestFormKey(source)
      : null;
  }
  const { caseId: sourceCaseId, sourceAssignment: _source, ...evidence } = row;
  return {
    ...evidence,
    formKey,
    sharedAcrossCases: sourceCaseId !== caseId,
    ...(sourceCaseId !== caseId ? { notes: null } : {}),
  };
}

export async function readQuestionnaireTestHistory(
  caseId: string,
  assignments: readonly QuestionnaireTestAssignment[],
  reader: EvidenceReader = db,
): Promise<QuestionnaireTestEvidence[]> {
  const eligible = assignments.filter(eligibleQuestionnaire);
  const keys = [...new Set(eligible.map(buildQuestionnaireTestFormKey).filter((key): key is string => Boolean(key)))];
  const toolIds = [...new Set(eligible.map(row => row.toolId))];
  const matchingStoredKeys = keys.length
    ? sql`e.checklist->>'formKey' IN (${sql.join(keys.map(key => sql`${key}`), sql`, `)})`
    : sql`FALSE`;
  const matchingLegacyTools = toolIds.length
    ? sql`(e.checklist->>'formKey' IS NULL AND a.tool_id IN (${sql.join(toolIds.map(id => sql`${id}`), sql`, `)}))`
    : sql`FALSE`;
  const result = await reader.execute(sql`
    SELECT e.id, e.evidence_order AS "evidenceOrder", e.case_id AS "caseId",
      e.assignment_id AS "assignmentId", e.tester_id AS "testerId",
      e.tester_name AS "testerName", e.tested_at AS "testedAt", e.fingerprint,
      e.result, e.language, e.checklist, e.notes,
      CASE WHEN a.id IS NOT NULL THEN jsonb_build_object(
        'id', a.id, 'toolId', a.tool_id, 'toolName', a.tool_name,
        'respondentType', a.respondent_type, 'respondentLabel', a.respondent_label,
        'formItemsSnapshot', a.form_items_snapshot,
        'assignedLanguage', COALESCE(c.language_preference, 'english')
      ) END AS "sourceAssignment"
    FROM questionnaire_test_evidence e
    LEFT JOIN assignments a ON a.id = e.assignment_id AND a.case_id = e.case_id
    LEFT JOIN cases c ON c.id = a.case_id
    WHERE e.case_id = ${caseId} OR ${matchingStoredKeys} OR ${matchingLegacyTools}
    ORDER BY e.evidence_order DESC
  `);
  return ((result.rows ?? []) as unknown as HistoryRow[])
    .map(row => reusableQuestionnaireEvidence(row, caseId));
}

// A shared form can be rechecked in one case while another is being approved.
// Serialize those decisions by content identity, not only by case.
export async function lockQuestionnaireTestForms(
  assignments: readonly QuestionnaireTestAssignment[],
  reader: EvidenceReader,
): Promise<void> {
  const keys = [...new Set(assignments.filter(eligibleQuestionnaire)
    .map(buildQuestionnaireTestFormKey).filter((key): key is string => Boolean(key)))].sort();
  for (const key of keys) {
    await reader.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
  }
}