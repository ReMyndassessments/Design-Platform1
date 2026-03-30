import { Router } from "express";
import { db } from "@workspace/db";
import { casesTable, assignmentsTable, scoresTable, responsesTable, assessmentToolsTable } from "@workspace/db/schema";
import { eq, sql, and, or } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { analyzeIntakeWithAI } from "../lib/ai.js";

const INVIGILATOR_EMAIL = "hayley@remynd.com";
const INVIGILATOR_NAME  = "Hayley";

function getBaseUrl(req: { headers: Record<string, string | string[] | undefined> }): string {
  const host = req.headers.host as string ?? "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  return `${proto}://${host}`;
}

const router = Router();

const PHASE_PROGRESS: Record<string, number> = {
  pre_commitment: 5,
  intake: 15,
  setup: 25,
  forms: 40,
  assessment: 55,
  scoring: 70,
  report: 85,
  debrief: 95,
  complete: 100,
};

const PHASE_ORDER = [
  "pre_commitment", "intake", "setup", "forms", "assessment",
  "scoring", "report", "debrief", "complete"
];

function nextPhase(current: string): string {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return current;
  return PHASE_ORDER[idx + 1];
}

function canAccessCase(_role: string, _userId: string, _c: typeof casesTable.$inferSelect): boolean {
  return true;
}

function formatCase(c: typeof casesTable.$inferSelect) {
  return {
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
  };
}

router.get("/cases", authMiddleware, async (req, res) => {
  const cases = await db.select().from(casesTable).orderBy(sql`${casesTable.updatedAt} DESC`);
  res.json(cases.map(formatCase));
});

router.post("/cases", authMiddleware, async (req, res) => {
  const { studentName, dob, school, grade, languagePreference, referralReason, parentName, parentEmail, parentPhone } = req.body;
  const assignedLeadId = req.body.assignedLeadId ?? null;
  const assignedPsychId = req.body.assignedPsychId ?? null;

  const newCase = await db.insert(casesTable).values({
    id: nanoid(),
    studentName,
    dob,
    school,
    grade,
    languagePreference: languagePreference ?? "english",
    referralReason,
    parentName,
    parentEmail,
    parentPhone,
    assignedLeadId,
    assignedPsychId,
    caseStatus: "active",
    currentPhase: "pre_commitment",
    progressPercentage: PHASE_PROGRESS["pre_commitment"],
    consentObtained: false,
  }).returning();

  // Auto-assign all invigilator tools to Hayley for every new case
  try {
    const allTools = await db.select().from(assessmentToolsTable);
    const invigilatorTools = allTools.filter(t =>
      Array.isArray(t.respondentTypes) && t.respondentTypes.includes("invigilator")
    );
    const baseUrl = getBaseUrl(req as unknown as Parameters<typeof getBaseUrl>[0]);
    for (const tool of invigilatorTools) {
      const token = crypto.randomBytes(24).toString("hex");
      const uniqueLink = `${baseUrl}/external/${token}`;
      await db.insert(assignmentsTable).values({
        id: nanoid(),
        caseId: newCase[0].id,
        toolId: tool.id,
        toolName: tool.name,
        respondentType: "invigilator",
        respondentLabel: "Post-Assessment",
        assignedToName: INVIGILATOR_NAME,
        assignedToEmail: INVIGILATOR_EMAIL,
        uniqueToken: token,
        uniqueLink,
        qrCodeData: uniqueLink,
        status: "not_started",
      });
    }
  } catch {
    // Non-fatal: case is still created; assignments can be added manually
  }

  res.status(201).json(formatCase(newCase[0]));
});

router.get("/cases/:caseId", authMiddleware, async (req, res) => {
  const rows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "not_found", message: "Case not found" });
    return;
  }
  const c = rows[0];
  if (!canAccessCase(req.userRole!, req.userId!, c)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  const [assignments, scores] = await Promise.all([
    db.select().from(assignmentsTable).where(eq(assignmentsTable.caseId, req.params.caseId)),
    db.select().from(scoresTable).where(eq(scoresTable.caseId, req.params.caseId)),
  ]);
  res.json({
    ...formatCase(c),
    intakeData: c.intakeData,
    intakeAnalysis: c.intakeAnalysis,
    assignments,
    scores,
  });
});

router.patch("/cases/:caseId", authMiddleware, async (req, res) => {
  const existing = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (!canAccessCase(req.userRole!, req.userId!, existing[0])) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const updates: Partial<typeof casesTable.$inferInsert> = {};
  const adminFields = ["currentPhase", "caseStatus", "assignedLeadId", "assignedPsychId", "riskLevel"];
  const baseAllowed = ["studentName", "school", "grade", "languagePreference", "parentName", "parentEmail", "parentPhone", "consentObtained"];
  const allowed = req.userRole === "admin" ? [...baseAllowed, ...adminFields] : baseAllowed;

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      (updates as Record<string, unknown>)[key === "studentName" ? "studentName" : key] = req.body[key];
    }
  }

  if (updates.currentPhase) {
    updates.progressPercentage = PHASE_PROGRESS[updates.currentPhase as string] ?? 0;
  }
  updates.updatedAt = new Date();

  const rows = await db.update(casesTable).set(updates).where(eq(casesTable.id, req.params.caseId)).returning();
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(formatCase(rows[0]));
});

router.post("/cases/:caseId/advance", authMiddleware, async (req, res) => {
  const rows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (!canAccessCase(req.userRole!, req.userId!, rows[0])) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  const { userRole } = req;
  const current = rows[0].currentPhase;
  const PSYCH_PHASES = new Set(["setup", "forms", "assessment", "scoring", "report", "debrief"]);
  if (userRole === "assessment_invigilator") {
    res.status(403).json({ error: "forbidden", message: "Invigilators have view-only access and cannot advance phases" });
    return;
  }
  if (userRole === "psychometrician" && !PSYCH_PHASES.has(current)) {
    res.status(403).json({ error: "forbidden", message: "Psychometricians can only advance Setup through Debrief phases" });
    return;
  }
  const next = nextPhase(current);
  const updated = await db.update(casesTable).set({
    currentPhase: next as typeof casesTable.$inferSelect["currentPhase"],
    progressPercentage: PHASE_PROGRESS[next] ?? 100,
    updatedAt: new Date(),
  }).where(eq(casesTable.id, req.params.caseId)).returning();
  res.json(formatCase(updated[0]));
});

router.delete("/cases/:caseId", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can delete cases" });
    return;
  }
  const rows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  await db.delete(scoresTable).where(eq(scoresTable.caseId, req.params.caseId));
  await db.delete(assignmentsTable).where(eq(assignmentsTable.caseId, req.params.caseId));
  await db.delete(casesTable).where(eq(casesTable.id, req.params.caseId));
  res.status(204).send();
});

router.post("/cases/:caseId/self-report", authMiddleware, async (req, res) => {
  const { caseId } = req.params;

  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  if (!caseRows[0]) {
    res.status(404).json({ error: "not_found", message: "Case not found" });
    return;
  }

  const { toolId: rawToolId, answers, language, administeredBy } = req.body as {
    toolId?: string;
    answers?: Record<string, string>;
    language?: string;
    administeredBy?: string;
  };

  const toolId = (rawToolId ?? "RASR").replace(/_v\d+$/, "");

  const existing = await db.select().from(assignmentsTable).where(
    and(
      eq(assignmentsTable.caseId, caseId),
      eq(assignmentsTable.toolId, toolId),
      or(
        eq(assignmentsTable.respondentType, "self"),
        eq(assignmentsTable.respondentType, "student"),
      ),
    )
  );

  const pending = existing.find(a => a.status !== "completed");
  let assignmentId: string;

  if (pending) {
    assignmentId = pending.id;
  } else {
    assignmentId = nanoid();
    const token = nanoid(32);
    await db.insert(assignmentsTable).values({
      id: assignmentId,
      caseId,
      toolId,
      toolName: "ReMynd Assessment Self-Report (RASR)",
      respondentType: "self",
      respondentLabel: administeredBy ?? "Self (In-Office)",
      uniqueToken: token,
      uniqueLink: `/external/${token}`,
      qrCodeData: token,
      status: "not_started",
    });
  }

  await db.insert(responsesTable).values({
    id: nanoid(),
    assignmentId,
    answers: answers ?? {},
    language: language ?? "english",
  });

  await db.update(assignmentsTable).set({
    status: "completed",
    submittedAt: new Date(),
  }).where(eq(assignmentsTable.id, assignmentId));

  res.json({ success: true, message: "Self-report submitted successfully." });
});

router.post("/cases/:caseId/intake-analysis", authMiddleware, async (req, res) => {
  const rows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (!canAccessCase(req.userRole!, req.userId!, rows[0])) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const c = rows[0];
  const analysis = await analyzeIntakeWithAI({
    studentName: c.studentName,
    school: c.school,
    referralReason: c.referralReason,
    grade: c.grade,
    intakeData: c.intakeData,
  });

  await db.update(casesTable).set({
    intakeAnalysis: analysis as Record<string, unknown>,
    riskLevel: analysis.riskLevel as typeof casesTable.$inferSelect["riskLevel"],
    updatedAt: new Date(),
  }).where(eq(casesTable.id, req.params.caseId));

  res.json(analysis);
});

export default router;
