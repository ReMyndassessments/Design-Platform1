import { Router } from "express";
import { db } from "@workspace/db";
import { casesTable, assignmentsTable } from "@workspace/db/schema";
import { eq, or, sql } from "drizzle-orm";
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
  const allAssignments = caseIds.length > 0
    ? await db.select().from(assignmentsTable)
    : [];
  const relevantAssignments = allAssignments.filter(a => caseIds.includes(a.caseId));
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

export default router;
