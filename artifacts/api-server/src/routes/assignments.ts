import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, casesTable, responsesTable, assessmentToolsTable, scoresTable, batteriesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { SAMPLE_QUESTIONS } from "../lib/questions.js";
import { generateIntakeSummary } from "../lib/ai.js";

const router = Router();

const INTAKE_TOOL_IDS = new Set(["REFERRAL", "REFERRAL-CORP", "REFERRAL-UNI", "REFERRAL-PARENT", "REFERRAL-BOARDING", "CONSENT", "INTAKE"]);

function generateQRData(link: string): string {
  return link;
}

function getBaseUrl(req: { headers: Record<string, string | string[] | undefined> }): string {
  const host = req.headers.host as string ?? "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  return `${proto}://${host}`;
}

async function checkCaseAccess(_role: string, _userId: string, caseId: string): Promise<boolean> {
  const rows = await db.select({ id: casesTable.id })
    .from(casesTable)
    .where(eq(casesTable.id, caseId))
    .limit(1);
  return !!rows[0];
}

router.get("/cases/:caseId/assignments", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  const assignments = await db.select().from(assignmentsTable).where(eq(assignmentsTable.caseId, req.params.caseId));
  res.json(assignments);
});

router.post("/cases/:caseId/assignments", authMiddleware, async (req, res) => {
  const { toolId, respondentType, respondentLabel, assignedToName, assignedToEmail, dueDate } = req.body;

  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!caseRows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const { userRole } = req;
  if (userRole === "assessment_lead" && !INTAKE_TOOL_IDS.has(toolId)) {
    res.status(403).json({ error: "forbidden", message: "Invigilators can only deploy Referral, Consent, and Intake forms" });
    return;
  }
  if (userRole === "psychometrician" && INTAKE_TOOL_IDS.has(toolId)) {
    res.status(403).json({ error: "forbidden", message: "Psychometricians cannot deploy intake-stage forms" });
    return;
  }

  const token = crypto.randomBytes(24).toString("hex");
  const baseUrl = getBaseUrl(req as unknown as Parameters<typeof getBaseUrl>[0]);
  const uniqueLink = `${baseUrl}/external/${token}`;

  const assignment = await db.insert(assignmentsTable).values({
    id: nanoid(),
    caseId: req.params.caseId,
    toolId,
    toolName: req.body.toolName ?? toolId,
    respondentType,
    respondentLabel,
    assignedToName,
    assignedToEmail,
    uniqueToken: token,
    uniqueLink,
    qrCodeData: uniqueLink,
    status: "not_started",
    dueDate: dueDate ? new Date(dueDate) : null,
  }).returning();

  res.status(201).json(assignment[0]);
});

router.patch("/cases/:caseId/assignments/:assignmentId", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  const updates: Partial<typeof assignmentsTable.$inferInsert> = {};
  if (req.body.status) updates.status = req.body.status;
  if (req.body.assignedToName) updates.assignedToName = req.body.assignedToName;
  if (req.body.assignedToEmail) updates.assignedToEmail = req.body.assignedToEmail;
  if (req.body.dueDate) updates.dueDate = new Date(req.body.dueDate);

  const rows = await db.update(assignmentsTable).set(updates)
    .where(and(eq(assignmentsTable.id, req.params.assignmentId), eq(assignmentsTable.caseId, req.params.caseId)))
    .returning();
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(rows[0]);
});

router.get("/cases/:caseId/assignments/:assignmentId/response", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const assignmentRows = await db.select().from(assignmentsTable)
    .where(and(eq(assignmentsTable.id, req.params.assignmentId), eq(assignmentsTable.caseId, req.params.caseId)))
    .limit(1);
  const assignment = assignmentRows[0];
  if (!assignment) {
    res.status(404).json({ error: "not_found", message: "Assignment not found" });
    return;
  }

  const responseRows = await db.select().from(responsesTable)
    .where(eq(responsesTable.assignmentId, assignment.id))
    .limit(1);
  if (!responseRows[0]) {
    res.status(404).json({ error: "not_found", message: "No response submitted yet" });
    return;
  }

  const caseRows = await db.select({ studentName: casesTable.studentName, school: casesTable.school, grade: casesTable.grade })
    .from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);

  const [toolRows, existingScoreRows] = await Promise.all([
    db.select({ formItems: assessmentToolsTable.formItems, scoringType: assessmentToolsTable.scoringType, domains: assessmentToolsTable.domains, scoringConfig: assessmentToolsTable.scoringConfig })
      .from(assessmentToolsTable).where(eq(assessmentToolsTable.id, assignment.toolId)).limit(1),
    db.select().from(scoresTable)
      .where(and(
        eq(scoresTable.caseId, req.params.caseId),
        eq(scoresTable.toolId, assignment.toolId),
        eq(scoresTable.respondentType, assignment.respondentType)
      ))
      .limit(1),
  ]);

  const ITEM_TYPE_MAP: Record<string, string> = {
    checkbox: "checkbox_group",
    radio: "radio_group",
    multiple_choice: "radio_group",
  };
  type StoredItem = { id: string; text: string; textChinese?: string; textKorean?: string; type: string; options?: string[]; optionsChinese?: string[]; optionsKorean?: string[]; domain?: string; required?: boolean; note?: string; noteChinese?: string; noteKorean?: string };
  const rawItems = toolRows[0]?.formItems;
  const questions = (rawItems && Array.isArray(rawItems) && rawItems.length > 0)
    ? (rawItems as StoredItem[]).map(item => ({
        ...item,
        type: ITEM_TYPE_MAP[item.type] ?? item.type,
        domain: item.domain ?? "",
        required: item.required ?? true,
      }))
    : (SAMPLE_QUESTIONS[assignment.toolId] ?? SAMPLE_QUESTIONS["default"] ?? []);

  res.json({
    assignment: {
      id: assignment.id,
      toolId: assignment.toolId,
      toolName: assignment.toolName,
      respondentType: assignment.respondentType,
      respondentLabel: assignment.respondentLabel,
      assignedToName: assignment.assignedToName,
    },
    response: responseRows[0],
    questions,
    studentName: caseRows[0]?.studentName ?? "Unknown Student",
    school: caseRows[0]?.school ?? "",
    grade: caseRows[0]?.grade ?? "",
    scoringType: toolRows[0]?.scoringType ?? null,
    toolDomains: toolRows[0]?.domains ?? [],
    scoringConfig: toolRows[0]?.scoringConfig ?? null,
    existingScore: existingScoreRows[0] ?? null,
  });
});

router.post("/cases/:caseId/assignments/:assignmentId/response/summary", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const assignmentRows = await db.select().from(assignmentsTable)
    .where(and(eq(assignmentsTable.id, req.params.assignmentId), eq(assignmentsTable.caseId, req.params.caseId)))
    .limit(1);
  const assignment = assignmentRows[0];
  if (!assignment) {
    res.status(404).json({ error: "not_found", message: "Assignment not found" });
    return;
  }
  if (assignment.toolId !== "INTAKE") {
    res.status(400).json({ error: "not_supported", message: "Summary generation is only available for the Parent Intake form" });
    return;
  }

  const responseRows = await db.select().from(responsesTable)
    .where(eq(responsesTable.assignmentId, assignment.id))
    .limit(1);
  if (!responseRows[0]) {
    res.status(404).json({ error: "not_found", message: "No response submitted yet" });
    return;
  }

  const caseRows = await db.select({ studentName: casesTable.studentName, school: casesTable.school, grade: casesTable.grade })
    .from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);

  const summary = await generateIntakeSummary({
    studentName: caseRows[0]?.studentName ?? "Unknown Student",
    school: caseRows[0]?.school ?? "",
    grade: caseRows[0]?.grade ?? "",
    answers: responseRows[0].answers,
  });

  await db.update(responsesTable)
    .set({ summary })
    .where(eq(responsesTable.id, responseRows[0].id));

  res.json({ summary });
});

router.delete("/cases/:caseId/assignments/:assignmentId", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  const rows = await db.delete(assignmentsTable)
    .where(and(eq(assignmentsTable.id, req.params.assignmentId), eq(assignmentsTable.caseId, req.params.caseId)))
    .returning();
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ success: true });
});

// POST /cases/:caseId/batteries/:batteryId/assign
// Creates one assignment per tool in the battery (bulk assign)
router.post("/cases/:caseId/batteries/:batteryId/assign", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const [battery] = await db.select().from(batteriesTable).where(eq(batteriesTable.id, req.params.batteryId));
  if (!battery) {
    res.status(404).json({ error: "not_found", message: "Battery not found" });
    return;
  }

  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!caseRows[0]) {
    res.status(404).json({ error: "not_found", message: "Case not found" });
    return;
  }

  const { respondentType = "parent", respondentLabel, assignedToName, assignedToEmail, dueDate } = req.body;
  const toolIds = (battery.toolIds as string[]) ?? [];

  // Fetch tool names for label
  const tools = toolIds.length > 0
    ? await db.select({ id: assessmentToolsTable.id, name: assessmentToolsTable.name })
        .from(assessmentToolsTable)
    : [];
  const toolNameMap = new Map(tools.map(t => [t.id, t.name]));

  const baseUrl = getBaseUrl(req as unknown as Parameters<typeof getBaseUrl>[0]);
  const created = [];
  for (const toolId of toolIds) {
    const token = crypto.randomBytes(24).toString("hex");
    const uniqueLink = `${baseUrl}/external/${token}`;
    const newAssignment = await db.insert(assignmentsTable).values({
      id: nanoid(),
      caseId: req.params.caseId,
      toolId,
      toolName: toolNameMap.get(toolId) ?? toolId,
      respondentType,
      respondentLabel: respondentLabel ?? respondentType,
      assignedToName: assignedToName ?? null,
      assignedToEmail: assignedToEmail ?? null,
      status: "not_started",
      uniqueToken: token,
      uniqueLink,
      qrCodeData: uniqueLink,
      dueDate: dueDate ? new Date(dueDate) : null,
    }).returning();
    created.push(newAssignment[0]);
  }

  res.status(201).json({ assignments: created, batteryId: battery.id, count: created.length });
});

export default router;
