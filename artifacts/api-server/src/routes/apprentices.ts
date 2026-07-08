import { Router } from "express";
import { db } from "@workspace/db";
import {
  casesTable,
  assignmentsTable,
  scoresTable,
  reportsTable,
  usersTable,
  caseApprenticeAssignmentsTable,
  clinicalApprenticeNotesTable,
  clinicalApprenticeFeedbackTable,
  clinicalApprenticeCompetenciesTable,
} from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { canUserAccessCase, canUserViewReport } from "../lib/permissions.js";
import { writeAudit } from "../lib/audit.js";

const router = Router();

function isMentorLike(role?: string): boolean {
  return role === "admin" || role === "psychometrician" || role === "school_clinical_coordinator";
}

async function requireApprenticeAccess(userId: string, caseId: string): Promise<boolean> {
  return canUserAccessCase({ id: userId, role: "clinical_apprentice" }, caseId);
}

// --- Admin: manage apprentice assignments on a case ---

router.get("/cases/:caseId/apprentices", authMiddleware, async (req, res) => {
  if (!isMentorLike(req.userRole)) {
    res.status(403).json({ error: "forbidden", message: "Only mentors/admins can view apprentice assignments" });
    return;
  }
  const rows = await db.select().from(caseApprenticeAssignmentsTable)
    .where(eq(caseApprenticeAssignmentsTable.caseId, req.params.caseId));
  const apprenticeIds = [...new Set(rows.map(r => r.apprenticeUserId))];
  const apprentices = apprenticeIds.length
    ? await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).where(inArray(usersTable.id, apprenticeIds))
    : [];
  const byId = new Map(apprentices.map(a => [a.id, a]));
  res.json(rows.map(r => ({ ...r, apprentice: byId.get(r.apprenticeUserId) ?? null })));
});

router.post("/cases/:caseId/apprentices", authMiddleware, async (req, res) => {
  if (!isMentorLike(req.userRole)) {
    res.status(403).json({ error: "forbidden", message: "Only mentors/admins can assign apprentices" });
    return;
  }
  const { apprenticeUserId, notes } = req.body;
  if (!apprenticeUserId?.trim()) {
    res.status(400).json({ error: "bad_request", message: "apprenticeUserId is required" });
    return;
  }
  const target = await db.select().from(usersTable).where(eq(usersTable.id, apprenticeUserId)).limit(1);
  if (!target[0] || target[0].role !== "clinical_apprentice") {
    res.status(400).json({ error: "bad_request", message: "Target user is not a Clinical Apprentice" });
    return;
  }
  const caseRows = await db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!caseRows[0]) {
    res.status(404).json({ error: "not_found", message: "Case not found" });
    return;
  }
  const existing = await db.select().from(caseApprenticeAssignmentsTable).where(and(
    eq(caseApprenticeAssignmentsTable.caseId, req.params.caseId),
    eq(caseApprenticeAssignmentsTable.apprenticeUserId, apprenticeUserId),
    eq(caseApprenticeAssignmentsTable.status, "active"),
  )).limit(1);
  if (existing[0]) {
    res.status(409).json({ error: "conflict", message: "Apprentice is already assigned to this case" });
    return;
  }
  const inserted = await db.insert(caseApprenticeAssignmentsTable).values({
    id: nanoid(),
    caseId: req.params.caseId,
    apprenticeUserId,
    assignedByUserId: req.userId!,
    status: "active",
    notes: notes?.trim() || null,
  }).returning();
  res.status(201).json(inserted[0]);
});

router.delete("/cases/:caseId/apprentices/:assignmentId", authMiddleware, async (req, res) => {
  if (!isMentorLike(req.userRole)) {
    res.status(403).json({ error: "forbidden", message: "Only mentors/admins can remove apprentice access" });
    return;
  }
  const rows = await db.select().from(caseApprenticeAssignmentsTable).where(and(
    eq(caseApprenticeAssignmentsTable.id, req.params.assignmentId),
    eq(caseApprenticeAssignmentsTable.caseId, req.params.caseId),
  )).limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  await db.update(caseApprenticeAssignmentsTable).set({ status: "removed" }).where(eq(caseApprenticeAssignmentsTable.id, req.params.assignmentId));
  res.json({ success: true });
});

// --- Apprentice: list & view assigned cases (read-only) ---

router.get("/apprentice/cases", authMiddleware, async (req, res) => {
  if (req.userRole !== "clinical_apprentice") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const rows = await db.select().from(caseApprenticeAssignmentsTable).where(and(
    eq(caseApprenticeAssignmentsTable.apprenticeUserId, req.userId!),
    eq(caseApprenticeAssignmentsTable.status, "active"),
  ));
  const caseIds = rows.map(r => r.caseId);
  const cases = caseIds.length
    ? await db.select({
        id: casesTable.id,
        studentName: casesTable.studentName,
        currentPhase: casesTable.currentPhase,
        caseStatus: casesTable.caseStatus,
        productIds: casesTable.productIds,
      }).from(casesTable).where(inArray(casesTable.id, caseIds))
    : [];
  const byId = new Map(cases.map(c => [c.id, c]));
  res.json(rows.map(r => ({
    assignmentId: r.id,
    caseId: r.caseId,
    assignedAt: r.assignedAt,
    caseLabel: byId.get(r.caseId)?.studentName?.split(" ").map(p => p[0]).join("") ?? "Case",
    phase: byId.get(r.caseId)?.currentPhase ?? null,
    status: byId.get(r.caseId)?.caseStatus ?? null,
    productIds: byId.get(r.caseId)?.productIds ?? [],
  })));
});

router.get("/apprentice/cases/:caseId", authMiddleware, async (req, res) => {
  if (req.userRole !== "clinical_apprentice") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const { caseId } = req.params;
  if (!(await requireApprenticeAccess(req.userId!, caseId))) {
    res.status(403).json({ error: "forbidden", message: "You are not assigned to this case" });
    return;
  }
  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  if (!caseRows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const c = caseRows[0];
  const [assignments, scores] = await Promise.all([
    db.select().from(assignmentsTable).where(eq(assignmentsTable.caseId, caseId)),
    db.select().from(scoresTable).where(eq(scoresTable.caseId, caseId)),
  ]);

  await writeAudit({
    eventType: "view_case",
    caseId,
    actorId: req.userId,
    actorRole: req.userRole,
    ipAddress: req.ip ?? null,
  });

  res.json({
    caseOverview: {
      id: c.id,
      caseLabel: c.studentName?.split(" ").map(p => p[0]).join("") ?? "Case",
      grade: c.grade,
      currentPhase: c.currentPhase,
      caseStatus: c.caseStatus,
      productIds: c.productIds,
      debriefMeetingDate: c.debriefMeetingDate,
    },
    battery: assignments.map(a => ({
      id: a.id,
      toolId: a.toolId,
      toolName: a.toolName,
      respondentLabel: a.respondentLabel,
      status: a.status,
      dueDate: a.dueDate,
      submittedAt: a.submittedAt,
    })),
    scoringSummary: scores.map(s => ({
      toolId: s.toolId,
      toolName: s.toolName,
      respondentType: s.respondentType,
      domainScores: s.domainScores,
      hasHighDiscrepancy: s.hasHighDiscrepancy,
    })),
  });
});

router.get("/apprentice/cases/:caseId/report", authMiddleware, async (req, res) => {
  if (req.userRole !== "clinical_apprentice") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const { caseId } = req.params;
  if (!(await canUserViewReport({ id: req.userId!, role: "clinical_apprentice" }, caseId))) {
    res.status(403).json({ error: "forbidden", message: "You are not assigned to this case" });
    return;
  }
  const rows = await db.select().from(reportsTable).where(eq(reportsTable.caseId, caseId)).limit(1);
  if (!rows[0] || rows[0].status === "draft") {
    res.status(404).json({ error: "not_found", message: "No report preview available for this case yet" });
    return;
  }
  await writeAudit({
    eventType: "view_report",
    caseId,
    actorId: req.userId,
    actorRole: req.userRole,
    ipAddress: req.ip ?? null,
  });
  res.json(rows[0]);
});

// --- Reflection notes ---

router.get("/cases/:caseId/apprentice-notes", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  if (req.userRole === "clinical_apprentice") {
    if (!(await requireApprenticeAccess(req.userId!, caseId))) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const rows = await db.select().from(clinicalApprenticeNotesTable).where(and(
      eq(clinicalApprenticeNotesTable.caseId, caseId),
      eq(clinicalApprenticeNotesTable.apprenticeUserId, req.userId!),
    ));
    res.json(rows);
    return;
  }
  if (!isMentorLike(req.userRole)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const rows = await db.select().from(clinicalApprenticeNotesTable).where(and(
    eq(clinicalApprenticeNotesTable.caseId, caseId),
    eq(clinicalApprenticeNotesTable.visibility, "visible_to_mentor"),
  ));
  res.json(rows);
});

router.post("/cases/:caseId/apprentice-notes", authMiddleware, async (req, res) => {
  if (req.userRole !== "clinical_apprentice") {
    res.status(403).json({ error: "forbidden", message: "Only apprentices can add reflection notes" });
    return;
  }
  const { caseId } = req.params;
  if (!(await requireApprenticeAccess(req.userId!, caseId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const { noteText, visibility } = req.body;
  if (!noteText?.trim()) {
    res.status(400).json({ error: "bad_request", message: "noteText is required" });
    return;
  }
  const inserted = await db.insert(clinicalApprenticeNotesTable).values({
    id: nanoid(),
    caseId,
    apprenticeUserId: req.userId!,
    noteText: noteText.trim(),
    visibility: visibility === "visible_to_mentor" ? "visible_to_mentor" : "private_to_apprentice",
  }).returning();
  await writeAudit({
    eventType: "add_reflection",
    caseId,
    actorId: req.userId,
    actorRole: req.userRole,
    ipAddress: req.ip ?? null,
  });
  res.status(201).json(inserted[0]);
});

// --- Mentor feedback ---

router.get("/cases/:caseId/apprentice-feedback", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  if (req.userRole === "clinical_apprentice") {
    if (!(await requireApprenticeAccess(req.userId!, caseId))) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const rows = await db.select().from(clinicalApprenticeFeedbackTable).where(and(
      eq(clinicalApprenticeFeedbackTable.caseId, caseId),
      eq(clinicalApprenticeFeedbackTable.apprenticeUserId, req.userId!),
    ));
    await writeAudit({ eventType: "view_feedback", caseId, actorId: req.userId, actorRole: req.userRole, ipAddress: req.ip ?? null });
    res.json(rows);
    return;
  }
  if (!isMentorLike(req.userRole)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const rows = await db.select().from(clinicalApprenticeFeedbackTable).where(eq(clinicalApprenticeFeedbackTable.caseId, caseId));
  res.json(rows);
});

router.post("/cases/:caseId/apprentice-feedback", authMiddleware, async (req, res) => {
  if (!isMentorLike(req.userRole)) {
    res.status(403).json({ error: "forbidden", message: "Only mentors/admins can add feedback" });
    return;
  }
  const { caseId } = req.params;
  const { apprenticeUserId, feedbackText, competencyArea } = req.body;
  if (!apprenticeUserId?.trim() || !feedbackText?.trim()) {
    res.status(400).json({ error: "bad_request", message: "apprenticeUserId and feedbackText are required" });
    return;
  }
  const inserted = await db.insert(clinicalApprenticeFeedbackTable).values({
    id: nanoid(),
    caseId,
    apprenticeUserId,
    mentorUserId: req.userId!,
    feedbackText: feedbackText.trim(),
    competencyArea: competencyArea?.trim() || null,
  }).returning();
  res.status(201).json(inserted[0]);
});

// --- Competencies ---

const DEFAULT_COMPETENCIES: { key: string; label: string }[] = [
  { key: "parent_consultation", label: "Parent Consultation" },
  { key: "intake_review", label: "Intake Review" },
  { key: "assessment_setup", label: "Assessment Setup" },
  { key: "form_review", label: "Form Review" },
  { key: "student_assessment_observation", label: "Student Assessment Observation" },
  { key: "scoring_interpretation", label: "Scoring Interpretation" },
  { key: "report_review", label: "Report Review" },
  { key: "debrief_observation", label: "Debrief Observation" },
  { key: "intervention_planning", label: "Intervention Planning" },
  { key: "confidentiality_ethics", label: "Confidentiality & Ethics" },
];

router.get("/apprentices/:userId/competencies", authMiddleware, async (req, res) => {
  const { userId } = req.params;
  if (req.userRole === "clinical_apprentice" && req.userId !== userId) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (req.userRole !== "clinical_apprentice" && !isMentorLike(req.userRole)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const existing = await db.select().from(clinicalApprenticeCompetenciesTable).where(eq(clinicalApprenticeCompetenciesTable.apprenticeUserId, userId));
  const byKey = new Map(existing.map(e => [e.competencyKey, e]));
  const merged = DEFAULT_COMPETENCIES.map(dc => byKey.get(dc.key) ?? {
    id: null,
    apprenticeUserId: userId,
    competencyKey: dc.key,
    competencyLabel: dc.label,
    status: "not_started" as const,
    mentorUserId: null,
    updatedAt: null,
    mentorNotes: null,
  });
  res.json(merged);
});

router.patch("/apprentices/:userId/competencies/:competencyKey", authMiddleware, async (req, res) => {
  if (!isMentorLike(req.userRole)) {
    res.status(403).json({ error: "forbidden", message: "Only mentors/admins can update competencies" });
    return;
  }
  const { userId, competencyKey } = req.params;
  const { status, mentorNotes } = req.body;
  const validStatuses = ["not_started", "observing", "guided_practice", "competent"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "bad_request", message: "Invalid status" });
    return;
  }
  const label = DEFAULT_COMPETENCIES.find(c => c.key === competencyKey)?.label ?? competencyKey;
  const existing = await db.select().from(clinicalApprenticeCompetenciesTable).where(and(
    eq(clinicalApprenticeCompetenciesTable.apprenticeUserId, userId),
    eq(clinicalApprenticeCompetenciesTable.competencyKey, competencyKey),
  )).limit(1);

  if (existing[0]) {
    const updated = await db.update(clinicalApprenticeCompetenciesTable).set({
      status,
      mentorUserId: req.userId!,
      mentorNotes: mentorNotes?.trim() || null,
      updatedAt: new Date(),
    }).where(eq(clinicalApprenticeCompetenciesTable.id, existing[0].id)).returning();
    res.json(updated[0]);
    return;
  }
  const inserted = await db.insert(clinicalApprenticeCompetenciesTable).values({
    id: nanoid(),
    apprenticeUserId: userId,
    competencyKey,
    competencyLabel: label,
    status,
    mentorUserId: req.userId!,
    mentorNotes: mentorNotes?.trim() || null,
  }).returning();
  res.status(201).json(inserted[0]);
});

export default router;
