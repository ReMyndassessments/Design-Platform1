import { Router } from "express";
import { db } from "@workspace/db";
import { casesTable, assignmentsTable, scoresTable, responsesTable, assessmentToolsTable, referralInvitesTable } from "@workspace/db/schema";
import { eq, sql, and, or, inArray } from "drizzle-orm";
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

function buildAssessmentInviteEmail(lang: "en" | "zh" | "ko", studentName: string, recipientName: string | null, meetingUrl: string, assessmentDate: string | null, recipientType: "parent" | "teacher" = "parent"): string {
  const isTeacher = recipientType === "teacher";
  const dateBlock = assessmentDate
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin:0 0 24px">
        <p style="margin:0;font-size:12px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:0.05em">${lang === "zh" ? "评估日期与时间" : lang === "ko" ? "평가 일시" : "Assessment Date &amp; Time"}</p>
        <p style="margin:6px 0 0;font-size:14px;color:#14532d;font-weight:600">${assessmentDate}</p>
      </div>`
    : '';
  const copy = {
    en: {
      subtitle: "Psychoeducational Assessment — Session Invitation",
      salutation: `Dear ${recipientName ?? (isTeacher ? "Educator" : "Parent/Guardian")},`,
      intro: isTeacher
        ? `We are writing to invite you to observe ${studentName}'s upcoming psychoeducational assessment session. Your presence provides important contextual support during the process.`
        : `We are writing to invite you to join ${studentName}'s upcoming psychoeducational assessment session. Your presence during the assessment helps create a comfortable and familiar environment for ${studentName}.`,
      what: isTeacher
        ? `During the session, our team will administer a series of standardised assessments. We appreciate your time and collaboration throughout this process.`
        : `During the session, our team will administer a series of standardised assessments. The session typically takes 2–3 hours and will be conducted via video. You are welcome to observe and provide support.`,
      howTitle: "How to join the session:",
      how: `Click the button below to enter the secure video room at the scheduled time. No account or software download is required — it works directly in your browser.`,
      cta: "Join the Assessment Session",
      alt: `Or paste this link into your browser: ${meetingUrl}`,
      footer: "If you have any questions before the session, please reply to this email.",
      sign: "The ReMynd Student Services Team",
    },
    zh: {
      subtitle: "心理教育评估 — 会议邀请",
      salutation: `尊敬的${recipientName ?? (isTeacher ? "老师" : "家长/监护人")}，`,
      intro: isTeacher
        ? `我们诚邀您出席${studentName}即将进行的心理教育评估会议。您的参与将为评估过程提供重要的情境支持。`
        : `我们诚邀您参加${studentName}即将进行的心理教育评估会议。您的陪同有助于为${studentName}营造一个熟悉、舒适的环境。`,
      what: isTeacher
        ? `评估期间，我们的团队将进行一系列标准化测试。感谢您在此过程中的配合与支持。`
        : `评估期间，我们的团队将对${studentName}进行一系列标准化测试，整个过程通常需要2至3小时，将通过视频方式进行。欢迎您全程陪同并提供支持。`,
      howTitle: "如何加入会议：",
      how: `请在预定时间点击下方按钮进入安全视频会议室。无需注册或下载软件，直接在浏览器中即可使用。`,
      cta: "加入评估会议",
      alt: `或将以下链接粘贴到浏览器中：${meetingUrl}`,
      footer: "如有任何问题，请直接回复本邮件。",
      sign: "ReMynd学生服务团队",
    },
    ko: {
      subtitle: "심리교육 평가 — 세션 초대",
      salutation: `${recipientName ?? (isTeacher ? "선생님" : "학부모/보호자")}님께,`,
      intro: isTeacher
        ? `${studentName} 학생의 심리교육 평가 세션에 참석하도록 초대드립니다. 선생님의 참여는 평가 과정에서 중요한 맥락적 지원이 됩니다.`
        : `${studentName} 학생의 심리교육 평가 세션에 함께 참여하도록 초대드립니다. 보호자의 참여는 ${studentName} 학생이 편안한 환경에서 평가를 받는 데 도움이 됩니다.`,
      what: isTeacher
        ? `세션 동안 저희 팀은 표준화된 평가를 진행할 예정입니다. 협조해 주셔서 감사합니다.`
        : `세션 동안 저희 팀은 표준화된 평가를 진행하며, 세션은 보통 2~3시간 소요되고 화상으로 진행됩니다. 참관하시며 지원해 주시면 됩니다.`,
      howTitle: "세션 참여 방법:",
      how: `예정된 시간에 아래 버튼을 클릭하여 보안 화상 회의실에 입장하세요. 계정 생성이나 소프트웨어 다운로드 없이 브라우저에서 바로 사용 가능합니다.`,
      cta: "평가 세션 참여",
      alt: `또는 다음 링크를 브라우저에 붙여넣으세요: ${meetingUrl}`,
      footer: "세션 전에 궁금하신 점이 있으시면 이 이메일에 바로 답장해 주세요.",
      sign: "ReMynd 학생 서비스 팀",
    },
  }[lang];

  return `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
    <div style="background:#1e293b;padding:28px 32px;border-radius:12px 12px 0 0">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">ReMynd Student Services</h1>
      <p style="margin:6px 0 0;color:#94a3b8;font-size:13px">${copy.subtitle}</p>
    </div>
    <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:32px">
      <p style="margin:0 0 16px;font-size:15px">${copy.salutation}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6">${copy.intro}</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6">${copy.what}</p>
      ${dateBlock}
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
  "scoring", "report", "final_review", "debrief", "complete"
];

function nextPhase(current: string): string {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return current;
  return PHASE_ORDER[idx + 1];
}

function prevPhase(current: string): string {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx <= 0) return current;
  return PHASE_ORDER[idx - 1];
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
    assessmentMeetingDate: c.assessmentMeetingDate,
    debriefMeetingUrl: c.debriefMeetingUrl,
    debriefMeetingDate: c.debriefMeetingDate,
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
  const [assignments, scores, referralInviteRows] = await Promise.all([
    db.select().from(assignmentsTable).where(eq(assignmentsTable.caseId, req.params.caseId)),
    db.select().from(scoresTable).where(eq(scoresTable.caseId, req.params.caseId)),
    db.select().from(referralInvitesTable).where(eq(referralInvitesTable.resultingCaseId, req.params.caseId)).limit(1),
  ]);
  const referralInvite = referralInviteRows[0]
    ? {
        token: referralInviteRows[0].token,
        formId: referralInviteRows[0].formId,
        toName: referralInviteRows[0].toName,
        toEmail: referralInviteRows[0].toEmail,
        schoolName: referralInviteRows[0].schoolName,
        usedAt: referralInviteRows[0].usedAt?.toISOString() ?? null,
      }
    : null;
  res.json({
    ...formatCase(c),
    intakeData: c.intakeData,
    intakeAnalysis: c.intakeAnalysis,
    assignments,
    scores,
    referralInvite,
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
  const baseAllowed = ["studentName", "school", "grade", "languagePreference", "parentName", "parentEmail", "parentPhone", "consentObtained", "workingDocUrl", "customMeetingUrl", "moderatorMeetingUrl", "assessmentMeetingDate", "debriefMeetingUrl", "debriefMeetingDate"];
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
  if (userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can advance case phases" });
    return;
  }
  const current = rows[0].currentPhase;
  const next = nextPhase(current);
  const updated = await db.update(casesTable).set({
    currentPhase: next as typeof casesTable.$inferSelect["currentPhase"],
    progressPercentage: PHASE_PROGRESS[next] ?? 100,
    updatedAt: new Date(),
  }).where(eq(casesTable.id, req.params.caseId)).returning();

  res.json(formatCase(updated[0]));
});

// ── Admin: step case back one phase ───────────────────────────────────────────
router.post("/cases/:caseId/step-back", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can step back a phase" });
    return;
  }
  const rows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  const current = rows[0].currentPhase;
  const prev = prevPhase(current);
  if (prev === current) {
    res.status(400).json({ error: "already_at_first_phase" }); return;
  }
  const PHASE_PROGRESS: Record<string, number> = {
    pre_commitment: 5, intake: 15, setup: 25, forms: 38,
    assessment: 52, scoring: 66, report: 79, final_review: 90, debrief: 95,
  };
  const updated = await db.update(casesTable).set({
    currentPhase: prev as typeof casesTable.$inferSelect["currentPhase"],
    progressPercentage: PHASE_PROGRESS[prev] ?? 0,
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
  const studentParam = studentName ? `&student=${encodeURIComponent(studentName)}` : '';
  const rawUrl = caseRow.customMeetingUrl ?? '';

  // Build branded client join URL for Jitsi rooms; use raw URL for external platforms
  let meetingUrl: string;
  if (rawUrl.includes('meet.ffmuc.net')) {
    const roomSlug = rawUrl.split('/').pop();
    meetingUrl = `${base}/join/${roomSlug}?type=assessment${studentParam}`;
  } else if (rawUrl.includes('meet.jit.si/moderated/')) {
    const roomSlug = rawUrl.split('/').pop();
    meetingUrl = `${base}/join/${roomSlug}?jitsiRoom=moderated/${roomSlug}&type=assessment${studentParam}`;
  } else if (rawUrl) {
    // Zoom, Teams, or other external platform — send raw URL
    meetingUrl = rawUrl;
  } else {
    // Fallback: no URL saved, generate a default room
    const fallbackRoom = `raos-${req.params.caseId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;
    meetingUrl = `${base}/join/${fallbackRoom}?type=assessment${studentParam}`;
  }

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
        ? (lang === "zh" ? `评估会议邀请 — ${studentName}` : lang === "ko" ? `평가 세션 초대 — ${studentName}` : `Assessment Session Invitation — ${studentName}`)
        : `Assessment Session Invitation — ${studentName}`;
      await sendEmail({
        to: r.email,
        subject,
        html: buildAssessmentInviteEmail(lang, studentName, r.name ?? null, meetingUrl, caseRow.assessmentMeetingDate ?? null, r.type),
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
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can run AI intake analysis" });
    return;
  }
  const rows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const c = rows[0];

  const REFERRAL_IDS = ["REFERRAL", "REFERRAL-CORP", "REFERRAL-UNI", "REFERRAL-PARENT", "REFERRAL-BOARDING"];
  const ADMIN_IDS = new Set([...REFERRAL_IDS, "CONSENT", "INTAKE"]);

  const [assignments, allTools] = await Promise.all([
    db.select().from(assignmentsTable).where(
      and(eq(assignmentsTable.caseId, req.params.caseId), inArray(assignmentsTable.toolId, [...REFERRAL_IDS, "INTAKE"]))
    ),
    db.select({
      id: assessmentToolsTable.id,
      name: assessmentToolsTable.name,
      description: assessmentToolsTable.description,
      domains: assessmentToolsTable.domains,
      respondentTypes: assessmentToolsTable.respondentTypes,
      category: assessmentToolsTable.category,
      isRemyndOwned: assessmentToolsTable.isRemyndOwned,
    }).from(assessmentToolsTable),
  ]);

  const referralAssignmentIds = assignments.filter(a => REFERRAL_IDS.includes(a.toolId)).map(a => a.id);
  const intakeAssignmentIds = assignments.filter(a => a.toolId === "INTAKE").map(a => a.id);
  const allAssignmentIds = [...referralAssignmentIds, ...intakeAssignmentIds];

  const responses = allAssignmentIds.length > 0
    ? await db.select().from(responsesTable).where(inArray(responsesTable.assignmentId, allAssignmentIds))
    : [];

  const referralAnswers = responses.find(r => referralAssignmentIds.includes(r.assignmentId))?.answers as Record<string, unknown> | null ?? null;
  const intakeAnswers = responses.find(r => intakeAssignmentIds.includes(r.assignmentId))?.answers as Record<string, unknown> | null ?? null;

  const assessmentTools = allTools.filter(t => !ADMIN_IDS.has(t.id));

  let age: number | null = null;
  if (c.dob) {
    const dob = new Date(c.dob);
    const today = new Date();
    const y = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    age = (m < 0 || (m === 0 && today.getDate() < dob.getDate())) ? y - 1 : y;
  }

  const analysis = await analyzeIntakeWithAI({
    studentName: c.studentName,
    school: c.school,
    referralReason: c.referralReason,
    grade: c.grade,
    dob: c.dob,
    age,
    referralFormAnswers: referralAnswers,
    parentIntakeAnswers: intakeAnswers,
    assessmentTools,
  });

  await db.update(casesTable).set({
    intakeAnalysis: analysis as Record<string, unknown>,
    riskLevel: analysis.riskLevel as typeof casesTable.$inferSelect["riskLevel"],
    updatedAt: new Date(),
  }).where(eq(casesTable.id, req.params.caseId));

  res.json(analysis);
});

router.post("/cases/:caseId/dismiss-recommended-tool", authMiddleware, async (req, res) => {
  const { toolId } = req.body;
  if (!toolId) { res.status(400).json({ error: "toolId required" }); return; }
  const rows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  if (!canAccessCase(req.userRole!, req.userId!, rows[0])) {
    res.status(403).json({ error: "forbidden" }); return;
  }
  const current = (rows[0].intakeAnalysis as Record<string, unknown> | null) ?? {};
  const dismissed = Array.isArray(current.dismissedToolIds)
    ? [...(current.dismissedToolIds as string[])]
    : [];
  if (!dismissed.includes(toolId)) dismissed.push(toolId);
  const updated = await db.update(casesTable)
    .set({ intakeAnalysis: { ...current, dismissedToolIds: dismissed }, updatedAt: new Date() })
    .where(eq(casesTable.id, req.params.caseId))
    .returning();
  res.json(formatCase(updated[0]));
});

export default router;
