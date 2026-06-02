import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, casesTable, responsesTable, assessmentToolsTable, scoresTable, batteriesTable, usersTable } from "@workspace/db/schema";
import { eq, and, ne, inArray, sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { SAMPLE_QUESTIONS } from "../lib/questions.js";
import { generateIntakeSummary, generateAboSummary, generateFormSummary, translateAnswersToEnglish } from "../lib/ai.js";
import { sendEmail } from "../lib/outlookEmail.js";
import { writeAudit } from "../lib/audit.js";

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
  if (userRole !== "admin" && userRole !== "psychometrician") {
    res.status(403).json({ error: "forbidden", message: "Only administrators and psychometricians can assign forms" });
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

  // Stamp the current form version on the assignment for integrity tracking
  try {
    const vRes = await db.execute(sql`SELECT version_id FROM assessment_tools WHERE id = ${toolId}`);
    const toolVersionId = (vRes.rows?.[0] as any)?.version_id ?? null;
    if (toolVersionId && assignment[0]) {
      await db.execute(sql`UPDATE assignments SET tool_version_id = ${toolVersionId} WHERE id = ${assignment[0].id}`);
    }
  } catch { /* column may not exist on first boot before migration runs */ }

  void writeAudit({
    eventType: "assignment.created",
    caseId: req.params.caseId,
    assignmentId: assignment[0]?.id,
    toolId,
    actorId: req.userId ?? null,
    actorRole: req.userRole ?? null,
    metadata: { respondentType, respondentLabel, assignedToName: assignedToName ?? null },
  });

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

  let bascCorrectionApplied = false;
  try {
    const bcResult = await db.execute(sql`
      SELECT COALESCE(basc_correction_applied, FALSE) AS applied
      FROM responses WHERE id = ${responseRows[0].id}
    `);
    bascCorrectionApplied = (bcResult.rows?.[0] as any)?.applied ?? false;
  } catch { /* column may not exist on very first boot before migration runs */ }

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
    bascCorrectionApplied,
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
  const [responseRows, caseRows, toolRows] = await Promise.all([
    db.select().from(responsesTable).where(eq(responsesTable.assignmentId, assignment.id)).limit(1),
    db.select({ studentName: casesTable.studentName, school: casesTable.school, grade: casesTable.grade })
      .from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1),
    db.select({ name: assessmentToolsTable.name, formItems: assessmentToolsTable.formItems })
      .from(assessmentToolsTable).where(eq(assessmentToolsTable.id, assignment.toolId ?? "")).limit(1),
  ]);

  if (!responseRows[0]) {
    res.status(404).json({ error: "not_found", message: "No response submitted yet" });
    return;
  }

  const commonParams = {
    studentName: caseRows[0]?.studentName ?? "Unknown Student",
    school: caseRows[0]?.school ?? "",
    grade: caseRows[0]?.grade ?? "",
    answers: responseRows[0].answers,
  };

  let summary: string;
  if (assignment.toolId === "INTAKE") {
    summary = await generateIntakeSummary(commonParams);
  } else if (assignment.toolId === "BEHAVOBS") {
    summary = await generateAboSummary(commonParams);
  } else {
    const formItems = (toolRows[0]?.formItems as Array<{ id: string; text: string; type: string; options?: string[]; rows?: Array<{ id: string; text: string }> }>) ?? [];
    summary = await generateFormSummary({
      ...commonParams,
      toolId: assignment.toolId ?? "",
      toolName: assignment.toolName ?? toolRows[0]?.name ?? "Assessment Form",
      respondentType: assignment.respondentType ?? "unknown",
      formItems,
    });
  }

  await db.update(responsesTable)
    .set({ summary })
    .where(eq(responsesTable.id, responseRows[0].id));

  res.json({ summary });
});

router.post("/cases/:caseId/assignments/:assignmentId/response/translate", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  const assignmentRows = await db.select().from(assignmentsTable)
    .where(and(eq(assignmentsTable.id, req.params.assignmentId), eq(assignmentsTable.caseId, req.params.caseId)))
    .limit(1);
  if (!assignmentRows[0]) { res.status(404).json({ error: "not_found" }); return; }

  const responseRows = await db.select().from(responsesTable)
    .where(eq(responsesTable.assignmentId, req.params.assignmentId))
    .limit(1);
  if (!responseRows[0]) { res.status(404).json({ error: "not_found", message: "No response found" }); return; }

  const { language, answers } = responseRows[0];
  if (!language || language === "english") {
    res.json({ translatedAnswers: {} });
    return;
  }

  const translatedAnswers = await translateAnswersToEnglish(
    answers as Record<string, unknown>,
    language
  );
  res.json({ translatedAnswers });
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
    // Stamp the current form version for integrity tracking
    try {
      const vRes = await db.execute(sql`SELECT version_id FROM assessment_tools WHERE id = ${toolId}`);
      const toolVersionId = (vRes.rows?.[0] as any)?.version_id ?? null;
      if (toolVersionId && newAssignment[0]) {
        await db.execute(sql`UPDATE assignments SET tool_version_id = ${toolVersionId} WHERE id = ${newAssignment[0].id}`);
      }
    } catch { /* optional */ }
    void writeAudit({
      eventType: "assignment.created",
      caseId: req.params.caseId,
      assignmentId: newAssignment[0]?.id,
      toolId,
      actorId: req.userId ?? null,
      actorRole: req.userRole ?? null,
      metadata: { respondentType, respondentLabel, assignedToName: assignedToName ?? null, batteryId: req.params.batteryId },
    });
  }

  res.status(201).json({ assignments: created, batteryId: battery.id, count: created.length });
});

// ── POST /api/cases/:caseId/assignments/reset-completed ──────────────────────
// Reset a list of completed assignments back to pending so they can be refilled
router.post("/cases/:caseId/assignments/reset-completed", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin" && req.userRole !== "psychometrician") {
    res.status(403).json({ error: "forbidden" }); return;
  }
  const { assignmentIds } = req.body as { assignmentIds: string[] };
  if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
    res.status(400).json({ error: "bad_request", message: "assignmentIds array is required" }); return;
  }

  // Only reset assignments that belong to this case and are completed
  const targets = await db.select({ id: assignmentsTable.id })
    .from(assignmentsTable)
    .where(and(
      eq(assignmentsTable.caseId, req.params.caseId),
      inArray(assignmentsTable.id, assignmentIds),
      eq(assignmentsTable.status, "completed"),
    ));

  if (targets.length === 0) {
    res.json({ reset: 0 }); return;
  }

  const ids = targets.map(t => t.id);

  // Delete existing responses for these assignments
  await db.delete(responsesTable).where(inArray(responsesTable.assignmentId, ids));

  // Reset assignment status back to pending
  await db.update(assignmentsTable)
    .set({ status: "pending" })
    .where(inArray(assignmentsTable.id, ids));

  res.json({ reset: ids.length });
});

// ── POST /api/cases/:caseId/send-respondent-email ────────────────────────────
// Send one branded email to a respondent with their unique form link
router.post("/cases/:caseId/send-respondent-email", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin" && req.userRole !== "psychometrician") {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const { toEmail, toName, formLink, formNames, studentName, respondentRole } = req.body as {
    toEmail: string;
    toName: string;
    formLink: string;
    formNames: string[];
    studentName?: string;
    respondentRole?: string;
  };

  if (!toEmail || !toName || !formLink || !Array.isArray(formNames)) {
    res.status(400).json({ error: "bad_request", message: "toEmail, toName, formLink, and formNames are required" }); return;
  }

  const caseRows = await db.select({ id: casesTable.id, studentName: casesTable.studentName }).from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!caseRows[0]) { res.status(404).json({ error: "not_found" }); return; }

  const resolvedStudentName = studentName ?? caseRows[0].studentName ?? "the student";
  const formsListHtml = formNames.map(f => `<li style="margin-bottom:4px">${f}</li>`).join("");
  const roleLabel = respondentRole ?? "respondent";

  const html = `<div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#1e293b">
  <div style="background:#0a1628;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center">
    <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.3px">ReMynd Student Services</p>
    <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">Assessment Operating System</p>
  </div>
  <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <h2 style="margin:0 0 16px;font-size:18px;color:#0a1628">Hi ${toName},</h2>
    <p style="margin:0 0 12px;font-size:14px;color:#475569">
      As part of the psychoeducational assessment for <strong>${resolvedStudentName}</strong>, we are requesting your input as their <strong>${roleLabel}</strong>.
    </p>
    <p style="margin:0 0 8px;font-size:14px;color:#475569">Please complete the following form${formNames.length > 1 ? "s" : ""} at the link below:</p>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;color:#475569">${formsListHtml}</ul>
    <p style="margin:0 0 24px;font-size:14px;color:#475569">Each form takes just a few minutes. You can return to the same link at any time to continue or review your responses.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${formLink}" style="background:#1d4ed8;color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Open My Forms ↗</a>
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
    <p style="font-size:12px;color:#94a3b8;text-align:center">ReMynd Student Services · Confidential<br/>This invitation was sent by our assessment team. Please do not share this link.</p>
  </div>
</div>`;

  // Extract the unique token from the formLink so we can find the exact assignment group
  const tokenMatch = formLink.match(/\/external\/([^/?#]+)/);
  const portalToken = tokenMatch?.[1] ?? null;

  try {
    await sendEmail({ to: toEmail, subject: `Assessment Forms for ${resolvedStudentName} — ReMynd Student Services`, html });

    // Find the anchor assignment via its portal token, then update all siblings in the same group
    if (portalToken) {
      const anchor = await db.select({ id: assignmentsTable.id, respondentLabel: assignmentsTable.respondentLabel, assignedToEmail: assignmentsTable.assignedToEmail })
        .from(assignmentsTable).where(eq(assignmentsTable.uniqueToken, portalToken)).limit(1);

      if (anchor[0]) {
        // Match by email if stored, otherwise match by respondentLabel within this case
        const siblings = anchor[0].assignedToEmail
          ? await db.select({ id: assignmentsTable.id }).from(assignmentsTable)
              .where(and(eq(assignmentsTable.caseId, req.params.caseId), eq(assignmentsTable.assignedToEmail, anchor[0].assignedToEmail!)))
          : await db.select({ id: assignmentsTable.id }).from(assignmentsTable)
              .where(and(eq(assignmentsTable.caseId, req.params.caseId), eq(assignmentsTable.respondentLabel, anchor[0].respondentLabel ?? "")));

        if (siblings.length > 0) {
          await db.update(assignmentsTable)
            .set({ assignedToName: toName, assignedToEmail: toEmail })
            .where(inArray(assignmentsTable.id, siblings.map(s => s.id)));
        }
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("[send-respondent-email] SMTP error:", err?.message ?? err, "code:", err?.code, "response:", err?.response);
    res.status(502).json({ error: "send_failed", message: err?.message ?? "Email could not be sent. Please try again." });
  }
});

// GET /api/assignments/my-pending — returns invigilator's own pending forms
router.get("/assignments/my-pending", authMiddleware, async (req, res) => {
  const { userId } = req;
  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, userId!)).limit(1);
  if (!userRows[0]) { res.status(404).json({ error: "user_not_found" }); return; }
  const email = userRows[0].email;

  const assignments = await db.select().from(assignmentsTable).where(
    and(
      eq(assignmentsTable.assignedToEmail, email),
      eq(assignmentsTable.respondentType, "invigilator"),
      ne(assignmentsTable.status, "completed"),
    )
  );

  if (assignments.length === 0) { res.json([]); return; }

  const caseIds = [...new Set(assignments.map(a => a.caseId))];
  const cases = caseIds.length === 1
    ? await db.select().from(casesTable).where(eq(casesTable.id, caseIds[0]))
    : await db.select().from(casesTable).where(inArray(casesTable.id, caseIds));
  const caseMap = new Map(cases.map(c => [c.id, c]));

  const result = assignments.map(a => ({
    id: a.id,
    caseId: a.caseId,
    studentName: caseMap.get(a.caseId)?.studentName ?? "Unknown",
    toolName: a.toolName,
    status: a.status,
    uniqueLink: a.uniqueLink,
    respondentType: a.respondentType,
    updatedAt: a.updatedAt,
  }));

  res.json(result);
});

export default router;
