import { Router } from "express";
import { db } from "@workspace/db";
import { casesTable, assignmentsTable, scoresTable, responsesTable, assessmentToolsTable } from "@workspace/db/schema";
import { eq, sql, and, or } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { analyzeIntakeWithAI } from "../lib/ai.js";
import { sendEmail } from "../lib/outlookEmail.js";

const INVIGILATOR_EMAIL = "hayleyxu13@gmail.com";
const INVIGILATOR_NAME  = "Hayley";

function getBaseUrl(req: { headers: Record<string, string | string[] | undefined> }): string {
  const host = req.headers.host as string ?? "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  return `${proto}://${host}`;
}

function buildDebriefEmail(lang: "en" | "zh" | "ko", studentName: string, recipientName: string | null, meetingUrl: string, recipientType: "parent" | "teacher" = "parent"): string {
  const isTeacher = recipientType === "teacher";
  const copy = {
    en: {
      salutation: `Dear ${recipientName ?? (isTeacher ? "Educator" : "Parent/Guardian")},`,
      intro: isTeacher
        ? `We are writing to let you know that ${studentName}'s psychoeducational assessment has been completed. As one of ${studentName}'s educators, you are invited to join the debrief meeting where we will discuss the key findings.`
        : `We are pleased to let you know that ${studentName}'s psychoeducational assessment has been completed and we would like to schedule a debrief meeting with you to discuss the findings.`,
      what: isTeacher
        ? `The debrief will cover assessment outcomes and practical recommendations that may be relevant to your work with ${studentName} in the classroom.`
        : `During the debrief, our team will walk you through the assessment results, explain what they mean for ${studentName}, and answer any questions you may have.`,
      howTitle: "How to join the meeting:",
      how: `Click the button below to join our secure video meeting room. No account or download is required — it works directly in your browser.`,
      cta: "Join the Debrief Meeting",
      alt: `Or paste this link into your browser: ${meetingUrl}`,
      footer: "If you have any questions before the meeting, please reply to this email.",
      sign: "The ReMynd Student Services Team",
    },
    zh: {
      salutation: `尊敬的${parentName ?? "家长/监护人"}，`,
      intro: `我们很高兴地通知您，${studentName}的心理教育评估已经完成。我们希望与您安排一次结果汇报会议，讨论评估结果。`,
      what: `在汇报会议期间，我们的团队将向您介绍评估结果，解释其对${studentName}的意义，并解答您的任何疑问。`,
      howTitle: "如何加入会议：",
      how: `点击下方按钮即可加入我们的安全视频会议室。无需注册或下载，直接在浏览器中使用即可。`,
      cta: "加入汇报会议",
      alt: `或将以下链接粘贴到浏览器中：${meetingUrl}`,
      footer: "如果您在会议前有任何问题，请直接回复本邮件。",
      sign: "ReMynd学生服务团队",
    },
    ko: {
      salutation: `${parentName ?? "학부모/보호자"}님께,`,
      intro: `${studentName} 학생의 심리교육 평가가 완료되었음을 알려드립니다. 평가 결과를 논의하기 위한 결과 설명 회의를 예약하고자 합니다.`,
      what: `결과 설명 회의에서 저희 팀은 평가 결과를 안내해 드리고, ${studentName} 학생에게 의미하는 바를 설명하며, 궁금하신 사항에 답변드리겠습니다.`,
      howTitle: "회의 참여 방법:",
      how: `아래 버튼을 클릭하시면 보안 화상 회의실에 참여하실 수 있습니다. 계정 생성이나 다운로드 없이 브라우저에서 바로 사용 가능합니다.`,
      cta: "결과 설명 회의 참여",
      alt: `또는 다음 링크를 브라우저에 붙여넣으세요: ${meetingUrl}`,
      footer: "회의 전에 궁금하신 점이 있으시면 이 이메일에 바로 답장해 주세요.",
      sign: "ReMynd 학생 서비스 팀",
    },
  }[lang];

  return `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
    <div style="background:#1e293b;padding:28px 32px;border-radius:12px 12px 0 0">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">ReMynd Student Services</h1>
      <p style="margin:6px 0 0;color:#94a3b8;font-size:13px">${lang === "zh" ? "心理教育评估汇报" : lang === "ko" ? "심리교육 평가 결과 설명" : "Psychoeducational Assessment Debrief"}</p>
    </div>
    <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:32px">
      <p style="margin:0 0 16px;font-size:15px">${copy.salutation}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6">${copy.intro}</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6">${copy.what}</p>
      <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#475569">${copy.howTitle}</p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569">${copy.how}</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${meetingUrl}" style="background:#059669;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">${copy.cta}</a>
      </p>
      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0 0 24px">${copy.alt}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="font-size:13px;color:#475569;margin:0 0 8px">${copy.footer}</p>
      <p style="font-size:13px;color:#475569;margin:0"><strong>${copy.sign}</strong></p>
      <p style="font-size:11px;color:#94a3b8;margin:20px 0 0">ReMynd Student Services · Confidential</p>
    </div>
  </div>`;
}

const router = Router();

const PHASE_PROGRESS: Record<string, number> = {
  pre_commitment: 5,
  intake: 15,
  setup: 25,
  forms: 38,
  assessment: 52,
  scoring: 66,
  report: 79,
  final_review: 90,
  debrief: 100,
  complete: 100,
};

const PHASE_ORDER = [
  "pre_commitment", "intake", "setup", "forms", "assessment",
  "scoring", "report", "final_review", "debrief"
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
    workingDocUrl: c.workingDocUrl,
    adminApprovedReport: c.adminApprovedReport,
    psychApprovedReport: c.psychApprovedReport,
    customMeetingUrl: c.customMeetingUrl,
    moderatorMeetingUrl: c.moderatorMeetingUrl,
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
  const baseAllowed = ["studentName", "school", "grade", "languagePreference", "parentName", "parentEmail", "parentPhone", "consentObtained", "workingDocUrl", "customMeetingUrl", "moderatorMeetingUrl"];
  const allowed = req.userRole === "admin" ? [...baseAllowed, ...adminFields] : baseAllowed;

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      (updates as Record<string, unknown>)[key === "studentName" ? "studentName" : key] = req.body[key];
    }
  }

  if (updates.currentPhase) {
    updates.progressPercentage = PHASE_PROGRESS[updates.currentPhase as string] ?? 0;
  }
  // If the working doc URL is being changed, reset both approvals
  if (updates.workingDocUrl !== undefined && updates.workingDocUrl !== existing[0].workingDocUrl) {
    updates.adminApprovedReport = false;
    updates.psychApprovedReport = false;
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

// ── Send debrief meeting invite manually ──────────────────────────────────────
router.post("/cases/:caseId/debrief-invite", authMiddleware, async (req, res) => {
  const rows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!rows[0]) { res.status(404).json({ error: "not_found" }); return; }

  const caseRow = rows[0];
  const studentName = caseRow.studentName;
  const base = getBaseUrl(req as any);
  const roomName = `raos-${req.params.caseId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;
  const meetingUrl = caseRow.customMeetingUrl || `${base}/join/${roomName}?student=${encodeURIComponent(studentName)}`;

  // recipients: [{ email, name, type: "parent" | "teacher", lang?: "en"|"zh"|"ko" }]
  const { recipients } = req.body as {
    recipients: { email: string; name?: string; type: "parent" | "teacher"; lang?: "en" | "zh" | "ko" }[];
  };

  if (!Array.isArray(recipients) || recipients.length === 0) {
    res.status(400).json({ error: "No recipients provided" }); return;
  }

  const sent: string[] = [];
  const failed: string[] = [];

  for (const r of recipients) {
    if (!r.email) continue;
    try {
      const lang = r.lang ?? "en";
      const isParent = r.type === "parent";
      const subject = isParent
        ? (lang === "zh" ? `汇报会议邀请 — ${studentName}` : lang === "ko" ? `결과 설명 회의 초대 — ${studentName}` : `Debrief Meeting Invitation — ${studentName}`)
        : `Debrief Meeting Invitation — ${studentName}`;
      await sendEmail({
        to: r.email,
        subject,
        html: buildDebriefEmail(lang, studentName, r.name ?? null, meetingUrl, r.type),
      });
      sent.push(r.email);
    } catch (err) {
      console.error(`[debrief-invite] Failed to send to ${r.email}:`, err);
      failed.push(r.email);
    }
  }

  res.json({ sent, failed });
});

// ── Create Jitsi Moderated Meeting ────────────────────────────────────────────
router.post("/cases/:caseId/create-moderated-meeting", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin" && req.userRole !== "assessment_invigilator") {
    res.status(403).json({ error: "forbidden" }); return;
  }
  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!caseRow) { res.status(404).json({ error: "not_found" }); return; }

  try {
    // Generate a unique random room name — both admin and guest use the exact same URL.
    // The first person to join a meet.jit.si room automatically becomes the moderator,
    // so the admin simply needs to join before the client.
    const { randomBytes } = await import("crypto");
    const roomName = `RAOS-${randomBytes(8).toString("hex")}`;
    // Use meet.ffmuc.net — a reliable public Jitsi instance that does not require login.
    const meetingUrl = `https://meet.ffmuc.net/${roomName}`;

    await db.update(casesTable)
      .set({
        customMeetingUrl: meetingUrl,
        moderatorMeetingUrl: meetingUrl,
        updatedAt: new Date(),
      })
      .where(eq(casesTable.id, req.params.caseId));

    res.json({ guestUrl: meetingUrl, moderatorUrl: meetingUrl });
  } catch (err) {
    console.error("Failed to create meeting:", err);
    res.status(502).json({ error: "meeting_creation_failed", message: "Could not create a meeting room. Try again." });
  }
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
