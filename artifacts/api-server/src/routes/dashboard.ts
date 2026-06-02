import { Router } from "express";
import { db } from "@workspace/db";
import { casesTable, assignmentsTable } from "@workspace/db/schema";
import { eq, or, sql, inArray } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/dashboard/stats", authMiddleware, async (req, res) => {
  const { userId, userRole } = req;
  const allCases = userRole === "admin"
    ? await db.select().from(casesTable).orderBy(sql`${casesTable.updatedAt} DESC`)
    : await db.select().from(casesTable)
        .where(or(eq(casesTable.assignedLeadId, userId!), eq(casesTable.assignedPsychId, userId!)))
        .orderBy(sql`${casesTable.updatedAt} DESC`);

  const totalCases = allCases.length;
  const activeCases = allCases.filter(c => c.caseStatus === "active").length;
  const completedCases = allCases.filter(c => c.caseStatus === "completed" || c.currentPhase === "complete").length;

  const caseIds = allCases.map(c => c.id);
  const relevantAssignments = caseIds.length > 0
    ? await db.select().from(assignmentsTable).where(inArray(assignmentsTable.caseId, caseIds))
    : [];
  const pendingForms = relevantAssignments.filter(a => a.status === "not_started" || a.status === "in_progress").length;
  const overdueForms = relevantAssignments.filter(a => a.status === "overdue").length;

  const casesByPhase: Record<string, number> = {};
  for (const c of allCases) {
    casesByPhase[c.currentPhase] = (casesByPhase[c.currentPhase] ?? 0) + 1;
  }

  const recentCases = allCases.slice(0, 5).map(c => ({
    id: c.id,
    studentName: c.studentName,
    dob: c.dob,
    school: c.school,
    grade: c.grade,
    languagePreference: c.languagePreference,
    referralReason: c.referralReason,
    caseStatus: c.caseStatus,
    currentPhase: c.currentPhase,
    progressPercentage: c.progressPercentage,
    riskLevel: c.riskLevel,
    assignedLeadId: c.assignedLeadId,
    assignedPsychId: c.assignedPsychId,
    parentName: c.parentName,
    parentEmail: c.parentEmail,
    parentPhone: c.parentPhone,
    consentObtained: c.consentObtained,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  res.json({ totalCases, activeCases, completedCases, pendingForms, overdueForms, casesByPhase, recentCases });
});

router.get("/admin/validation-warnings", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin" && req.userRole !== "psychometrician") {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const warnings: object[] = [];

  // ── 1. BASC historical scale correction ─────────────────────────────────────
  try {
    const bascRows = await db.execute(sql`
      SELECT
        r.id            AS response_id,
        a.id            AS assignment_id,
        a.tool_id,
        a.tool_name,
        a.respondent_label,
        a.case_id,
        c.student_name,
        c.school,
        r.submitted_at
      FROM responses r
      JOIN assignments a ON a.id = r.assignment_id
      JOIN cases c       ON c.id = a.case_id
      WHERE r.basc_correction_applied = TRUE
      ORDER BY r.submitted_at DESC
    `);
    for (const row of bascRows.rows as any[]) {
      warnings.push({
        type: "basc_scale_correction",
        severity: "warning",
        caseId: row.case_id,
        studentName: row.student_name,
        school: row.school ?? "",
        assignmentId: row.assignment_id,
        toolId: row.tool_id,
        toolName: row.tool_name,
        respondentLabel: row.respondent_label,
        submittedAt: row.submitted_at,
        description:
          "This response was submitted under an incorrect BASC response scale (0–3 instead of 1–4). " +
          "A conservative midpoint correction has been applied. Results should be interpreted with appropriate clinical judgement.",
      });
    }
  } catch { /* table may not exist on first boot */ }

  // ── 2. Form version changed after assignment was sent ────────────────────────
  try {
    const driftRows = await db.execute(sql`
      SELECT
        a.id            AS assignment_id,
        a.tool_id,
        a.tool_name,
        a.respondent_label,
        a.case_id,
        a.status,
        a.tool_version_id,
        t.version_id    AS current_version_id,
        c.student_name,
        c.school
      FROM assignments a
      JOIN assessment_tools t ON t.id = a.tool_id
      JOIN cases c             ON c.id = a.case_id
      WHERE a.tool_version_id IS NOT NULL
        AND a.tool_version_id != t.version_id
        AND a.status NOT IN ('completed')
    `);
    for (const row of driftRows.rows as any[]) {
      warnings.push({
        type: "form_version_changed",
        severity: "warning",
        caseId: row.case_id,
        studentName: row.student_name,
        school: row.school ?? "",
        assignmentId: row.assignment_id,
        toolId: row.tool_id,
        toolName: row.tool_name,
        respondentLabel: row.respondent_label,
        assignedVersionId: row.tool_version_id,
        currentVersionId: row.current_version_id,
        status: row.status,
        description:
          "The form definition in the assessment library has changed since this link was sent. " +
          "The respondent will receive the updated form. Review whether re-sending the link is required.",
      });
    }
  } catch { /* column may not exist on first boot */ }

  res.json({ warnings, count: warnings.length });
});

export default router;
