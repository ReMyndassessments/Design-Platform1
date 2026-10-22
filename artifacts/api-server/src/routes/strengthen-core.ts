import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, assessmentToolsTable, casesTable, inquiriesTable, strengthenCoreApplicationsTable, strengthenCoreProgramTable } from "@workspace/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { writeAudit } from "../lib/audit.js";
import { CONSENT_FORM_V2 } from "../lib/questions.js";
import { deidentifiedIntake, EXTENSIONS, generateSycAnalysis, type Extension } from "../lib/strengthen-core-analysis.js";

const router = Router();
type ProgramSettings = {
  open: boolean;
  maxSchools: number | null;
  closesAt: string | null;
  portalDurationDays: number;
  coreInstrumentEnabled: boolean;
  allowedExtensions: Extension[];
};

const DEFAULT_SETTINGS: ProgramSettings = {
  open: false,
  maxSchools: null,
  closesAt: null,
  portalDurationDays: 30,
  coreInstrumentEnabled: false,
  allowedExtensions: [],
};

const reviewSchema = z.object({
  decision: z.enum(["request_information", "approve", "decline", "route_review"]),
  approvedExtension: z.enum(EXTENSIONS).nullable().optional(),
  reason: z.string().trim().min(1).max(4000),
});

function isAdmin(req: { userRole?: string }): boolean {
  return req.userRole === "admin";
}

function parseSettings(raw: unknown): ProgramSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return DEFAULT_SETTINGS;
  const value = raw as Record<string, unknown>;
  return {
    open: value.open === true,
    maxSchools: Number.isInteger(value.maxSchools) && Number(value.maxSchools) > 0 ? Number(value.maxSchools) : null,
    closesAt: typeof value.closesAt === "string" ? value.closesAt : null,
    portalDurationDays: Number.isInteger(value.portalDurationDays)
      ? Math.min(90, Math.max(1, Number(value.portalDurationDays)))
      : 30,
    coreInstrumentEnabled: value.coreInstrumentEnabled === true,
    allowedExtensions: Array.isArray(value.allowedExtensions)
      ? value.allowedExtensions.filter((extension): extension is Extension => EXTENSIONS.includes(extension as Extension))
      : [],
  };
}

async function getSettings(): Promise<ProgramSettings> {
  const [row] = await db.select().from(strengthenCoreProgramTable).where(eq(strengthenCoreProgramTable.id, "default")).limit(1);
  return parseSettings(row?.settings);
}

function safeString(value: unknown, max = 1000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

type SycConsentRecord = {
  guardianName: string;
  guardianEmail: string;
  guardianRelationship: string;
  studentName: string;
  studentDob: string;
  guardianTokenHash?: string | null;
  studentTokenHash?: string | null;
  guardianExpiresAt?: string | null;
  studentExpiresAt?: string | null;
  guardianStatus?: "pending" | "consented" | "declined";
  studentStatus?: "pending" | "assented" | "declined";
  guardianSignatureName?: string | null;
  guardianSignedAt?: string | null;
  studentSignatureName?: string | null;
  studentAssentedAt?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  caseId?: string | null;
};

type SycPrivateData = {
  consent?: SycConsentRecord;
};

function getPrivateData(data: Record<string, unknown>): SycPrivateData {
  const metadata = data.__syc;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const consent = (metadata as Record<string, unknown>).consent;
  return consent && typeof consent === "object" && !Array.isArray(consent)
    ? { consent: consent as SycConsentRecord }
    : {};
}

function withPrivateData(data: Record<string, unknown>, privateData: SycPrivateData): Record<string, unknown> {
  return { ...data, __syc: privateData };
}

function publicApplicationData(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([key]) =>
    key !== "__syc" && key !== "studentAssentPlan" && key !== "assentAcknowledgement" && !key.startsWith("_")
  ));
}

function formatApplication(row: typeof strengthenCoreApplicationsTable.$inferSelect) {
  const data = row.data as Record<string, unknown>;
  const consent = getPrivateData(data).consent;
  return {
    id: row.id,
    schoolName: row.schoolName,
    primaryConcern: row.primaryConcern,
    language: row.language,
    status: row.status,
    submittedAt: row.createdAt,
    data: publicApplicationData(data),
    analysis: row.analysis,
    approvedExtension: row.approvedExtension,
    reviewReason: row.reviewReason,
    reviewedAt: row.reviewedAt,
    consent: consent ? {
      guardianName: consent.guardianName,
      guardianEmail: consent.guardianEmail,
      guardianRelationship: consent.guardianRelationship,
      studentName: consent.studentName,
      guardianStatus: consent.guardianStatus ?? "pending",
      studentStatus: "not_required",
      guardianSignatureName: consent.guardianSignatureName ?? null,
      guardianSignedAt: consent.guardianSignedAt ?? null,
      verifiedAt: consent.verifiedAt ?? null,
      caseId: consent.caseId ?? null,
    } : null,
  };
}

function asId(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function makeToken(): string {
  return randomBytes(32).toString("base64url");
}

function normalizedName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

router.get("/strengthen-core/program", async (_req, res): Promise<void> => {
  const settings = await getSettings();
  const isClosed = !settings.open || (settings.closesAt !== null && Date.parse(settings.closesAt) < Date.now());
  res.json({
    open: !isClosed,
    message: isClosed ? "Applications are currently closed." : "Applications are open and subject to ReMynd review.",
  });
});

router.get("/strengthen-core/program/admin", authMiddleware, async (req, res): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const settings = await getSettings();
  const [row] = await db.select().from(strengthenCoreProgramTable).where(eq(strengthenCoreProgramTable.id, "default")).limit(1);
  res.json({ id: "default", ...settings, updatedAt: row?.updatedAt ?? new Date() });
});

router.patch("/strengthen-core/program", authMiddleware, async (req, res): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const parsed = z.object({
    open: z.boolean(),
    maxSchools: z.number().int().min(1).max(10000).nullable(),
    closesAt: z.string().datetime().nullable(),
    portalDurationDays: z.number().int().min(1).max(90),
    coreInstrumentEnabled: z.boolean(),
    allowedExtensions: z.array(z.enum(EXTENSIONS)).max(4),
  }).strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: "Programme settings are invalid." });
    return;
  }
  const settings: ProgramSettings = {
    ...parsed.data,
    closesAt: parsed.data.closesAt,
    allowedExtensions: [...new Set(parsed.data.allowedExtensions)],
  };
  const [row] = await db.insert(strengthenCoreProgramTable).values({
    id: "default",
    settings,
    updatedBy: req.userId ?? null,
  }).onConflictDoUpdate({
    target: strengthenCoreProgramTable.id,
    set: { settings, updatedBy: req.userId ?? null, updatedAt: new Date() },
  }).returning();
  await writeAudit({
    eventType: "syc.program.settings_updated",
    actorId: req.userId,
    actorRole: req.userRole,
    metadata: { open: settings.open, coreInstrumentEnabled: settings.coreInstrumentEnabled, enabledExtensions: settings.allowedExtensions },
  });
  res.json({ id: row.id, ...settings, updatedAt: row.updatedAt });
});

router.post("/strengthen-core/applications", async (req, res): Promise<void> => {
  const parsed = z.object({
    language: z.enum(["en", "zh", "ko"]),
    data: z.record(z.string(), z.unknown()),
  }).strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: "Please review the required application fields." });
    return;
  }
  const data = publicApplicationData(parsed.data.data);
  const requiredTextFields = [
    "schoolName", "coordinatorName", "coordinatorRole", "coordinatorEmail", "gradeBand",
    "primaryConcern", "strengths", "sixWeekOutcome", "coordinatorCapacity",
  ];
  const missing = requiredTextFields.filter((key) => !safeString(data[key], 800));
  const contactEmail = safeString(data.coordinatorEmail, 320);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
  const requiredAcknowledgements = [
    "oneStudent", "evidenceAvailable", "consentAcknowledgement",
    "nonDiagnosticAcknowledgement", "deidentificationAcknowledgement",
  ];
  const missingAcknowledgement = requiredAcknowledgements.some((key) => data[key] !== true);
  if (missing.length || missingAcknowledgement || !emailValid) {
    res.status(400).json({
      error: "invalid_application",
      message: missing.length || missingAcknowledgement
        ? "Complete the required school, concern, strength, outcome, and safeguard fields."
        : "Check the school coordinator email address.",
    });
    return;
  }
  const encoded = JSON.stringify(data);
  if (encoded.length > 80_000) {
    res.status(413).json({ error: "application_too_large", message: "The application is too large to submit. Shorten the narrative responses." });
    return;
  }
  const settings = await getSettings();
  if (!settings.open || (settings.closesAt !== null && Date.parse(settings.closesAt) < Date.now())) {
    res.status(409).json({ error: "programme_closed", message: "Applications are currently closed." });
    return;
  }
  if (settings.maxSchools !== null) {
    const activeInquiries = await db.select({
      id: inquiriesTable.id,
      status: inquiriesTable.status,
      organisation: inquiriesTable.organisation,
      metadata: inquiriesTable.metadata,
    })
      .from(inquiriesTable)
      .where(sql`${inquiriesTable.status} IN ('new', 'contacted', 'converted')`);
    const activeSchools = activeInquiries.filter((row) => {
      const metadata = row.metadata as Record<string, unknown> | null;
      return metadata?.productId === "STRENGTHEN_CORE" &&
        (typeof metadata.caseId === "string" || row.status === "converted");
    });
    if (new Set(activeSchools.map((row) => (row.organisation ?? "").trim().toLowerCase()).filter(Boolean)).size >= settings.maxSchools) {
      res.status(409).json({ error: "programme_full", message: "The programme has reached its current application capacity." });
      return;
    }
  }
  const id = nanoid();
  const caseId = nanoid();
  const guardianToken = makeToken();
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  const host = (req.headers.host as string) ?? "localhost";
  const guardianUrl = `${proto}://${host}/external/${guardianToken}`;
  const schoolName = safeString(data.schoolName, 240);
  const languageText = `${safeString(data.learningLanguage, 100)} ${parsed.data.language}`.toLowerCase();
  const languagePreference = /cantonese|廣東話|粤语/.test(languageText)
    ? "cantonese" as const
    : /chinese|mandarin|中文|普通话/.test(languageText)
      ? "mandarin" as const
      : "english" as const;
  const applicationAnalysis = {
    source: "promotional_link",
    sourceInquiryId: id,
    sycInitialReview: null,
    productToolOverrides: {
      STRENGTHEN_CORE: { addedToolIds: [], removedToolIds: [] },
    },
    sycWorkflow: {
      source: "promotional_link",
      inquiryId: id,
      guardianStatus: "pending",
      approvedExtension: null,
    },
  };
  const inquiryMetadata = {
    productId: "STRENGTHEN_CORE",
    source: "promotional_link",
    sourceLabel: "Strengthen Your Core promotional link",
    language: parsed.data.language,
    stage: "inquiry",
    caseId,
    caseStartedAt: new Date().toISOString(),
    intakeData: data,
  };
  const [row] = await db.transaction(async (tx) => {
    await tx.insert(casesTable).values({
      id: caseId,
      studentName: "Pending guardian consent",
      dob: "Pending",
      school: schoolName || "School to be confirmed",
      grade: safeString(data.gradeBand, 80) || null,
      languagePreference,
      referralReason: `Strengthen Your Core school application: ${safeString(data.primaryConcern, 4000)}`,
      caseStatus: "active",
      currentPhase: "pre_commitment",
      progressPercentage: 0,
      consentObtained: false,
      productIds: ["STRENGTHEN_CORE"],
      intakeData: data,
      intakeAnalysis: applicationAnalysis,
    });
    await tx.insert(assignmentsTable).values({
      id: nanoid(),
      caseId,
      toolId: "CONSENT",
      toolName: "ReMynd Student Assessment — Parent/Guardian Consent Form",
      respondentType: "parent",
      respondentLabel: "Parent / Guardian",
      uniqueToken: guardianToken,
      uniqueLink: guardianUrl,
      qrCodeData: guardianUrl,
      status: "not_started",
      formItemsSnapshot: JSON.stringify(CONSENT_FORM_V2),
    });
    return tx.insert(inquiriesTable).values({
      id,
      inquiryType: "school",
      contactName: safeString(data.coordinatorName, 240),
      contactEmail,
      contactPhone: safeString(data.coordinatorPhone, 60) || null,
      organisation: schoolName,
      role: safeString(data.coordinatorRole, 160),
      yearGroup: safeString(data.gradeBand, 120),
      message: safeString(data.primaryConcern, 4000),
      schoolType: safeString(data.schoolType, 120) || null,
      schoolLocation: safeString(data.schoolLocation, 240) || null,
      currentSupport: safeString(data.supportsTried, 8000) || null,
      timeline: safeString(data.duration, 160) || null,
      howHeard: "Strengthen Your Core promotional application",
      metadata: inquiryMetadata,
      status: "new",
    }).returning();
  });
  await writeAudit({
    eventType: "inquiry.submitted",
    metadata: { inquiryId: id, productId: "STRENGTHEN_CORE", source: "promotional_link", language: parsed.data.language },
  });
  await writeAudit({
    eventType: "case.created",
    caseId,
    metadata: { inquiryId: id, productId: "STRENGTHEN_CORE", source: "promotional_link", consentPending: true },
  });
  res.status(201).json({ id: row.id, status: row.status, received: true });
});

router.get("/strengthen-core/applications", authMiddleware, async (req, res): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const status = typeof req.query.status === "string" ? req.query.status : null;
  const rows = status
    ? await db.select().from(strengthenCoreApplicationsTable)
      .where(eq(strengthenCoreApplicationsTable.status, status))
      .orderBy(desc(strengthenCoreApplicationsTable.createdAt))
    : await db.select().from(strengthenCoreApplicationsTable).orderBy(desc(strengthenCoreApplicationsTable.createdAt));
  res.json(rows.map(formatApplication));
});

router.get("/strengthen-core/applications/:applicationId", authMiddleware, async (req, res): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const id = asId(req.params.applicationId);
  if (!id) {
    res.status(400).json({ error: "invalid_application_id" });
    return;
  }
  const [row] = await db.select().from(strengthenCoreApplicationsTable)
    .where(eq(strengthenCoreApplicationsTable.id, id)).limit(1);
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(formatApplication(row));
});

router.post("/strengthen-core/applications/:applicationId/analyze", authMiddleware, async (req, res): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const id = asId(req.params.applicationId);
  if (!id) {
    res.status(400).json({ error: "invalid_application_id" });
    return;
  }
  const [row] = await db.select().from(strengthenCoreApplicationsTable)
    .where(eq(strengthenCoreApplicationsTable.id, id)).limit(1);
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const settings = await getSettings();
  const safeIntake = deidentifiedIntake(row.data);
  try {
    const analysis = await generateSycAnalysis(safeIntake, settings.allowedExtensions);
    const eligibleRecommendation = analysis.recommendedExtension
      && settings.allowedExtensions.includes(analysis.recommendedExtension)
      ? analysis.recommendedExtension
      : null;
    const savedAnalysis = {
      ...analysis,
      recommendedExtension: eligibleRecommendation,
      professionalApprovalStatus: "pending_administrator_review",
      generatedAt: new Date().toISOString(),
    };
    const [updated] = await db.update(strengthenCoreApplicationsTable)
      .set({
        analysis: savedAnalysis,
        status: row.status === "submitted" ? "ai_analysis_complete" : row.status,
        updatedAt: new Date(),
      })
      .where(eq(strengthenCoreApplicationsTable.id, id))
      .returning();
    await writeAudit({
      eventType: "syc.application.ai_analysis_generated",
      actorId: req.userId,
      actorRole: req.userRole,
      metadata: { applicationId: id, recommendedExtension: eligibleRecommendation, suitability: analysis.suitability },
    });
    res.json(formatApplication(updated));
  } catch (error) {
    req.log?.error({ error: error instanceof Error ? error.message : "unknown" }, "Strengthen Your Core intake analysis failed");
    res.status(502).json({ error: "analysis_unavailable", message: "The de-identified intake analysis could not be completed. The application remains saved for review." });
  }
});

router.post("/strengthen-core/inquiries/:inquiryId/analyze", authMiddleware, async (req, res): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const id = asId(req.params.inquiryId);
  if (!id) {
    res.status(400).json({ error: "invalid_inquiry_id" });
    return;
  }
  const [inquiry] = await db.select().from(inquiriesTable).where(eq(inquiriesTable.id, id)).limit(1);
  if (!inquiry) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const metadata = (inquiry.metadata ?? {}) as Record<string, unknown>;
  if (metadata.productId !== "STRENGTHEN_CORE") {
    res.status(409).json({ error: "not_strengthen_core_inquiry" });
    return;
  }
  const source = metadata.source === "promotional_link" ? "promotional_link" : "portal";
  const fullIntake = metadata.intakeData && typeof metadata.intakeData === "object" && !Array.isArray(metadata.intakeData)
    ? metadata.intakeData as Record<string, unknown>
    : {};
  const evidence = source === "promotional_link"
    ? fullIntake
    : {
        gradeBand: inquiry.yearGroup ?? "",
        context: "",
        primaryConcern: inquiry.message,
        strengths: "",
        barriers: "",
        currentSupport: inquiry.currentSupport ?? "",
        evidenceSummary: "",
      };
  const safeIntake = deidentifiedIntake(evidence);
  const settings = await getSettings();
  const sourceInstruction = source === "portal"
    ? `\n\nIMPORTANT SOURCE RULE: This is a brief website-portal inquiry, not the detailed promotional application. The evidence is sparse. Do not make an assessment eligibility decision or recommend any instrument or extension. Focus the interpretation on what is known, what cannot yet be concluded, the most important missing details, and which standard RAOS referral form should be requested next. Set recommendedExtension to null and suitability to "additional_information_required" unless the limited facts clearly require urgent human review.`
    : `\n\nSOURCE: detailed Strengthen Your Core promotional application. Use the specialized educational intake criteria in the instructions above. An extension suggestion is only a draft; the administrator must approve it.`;
  try {
    const analysis = await generateSycAnalysis(
      safeIntake,
      source === "portal" ? [] : settings.allowedExtensions,
      sourceInstruction,
    );
    const eligibleRecommendation = source === "promotional_link" && analysis.recommendedExtension &&
        settings.allowedExtensions.includes(analysis.recommendedExtension)
      ? analysis.recommendedExtension
      : null;
    const savedAnalysis = {
      ...analysis,
      recommendedExtension: eligibleRecommendation,
      professionalApprovalStatus: "pending_administrator_review",
      source,
      generatedAt: new Date().toISOString(),
    };
    const nextMetadata = { ...metadata, aiAnalysis: savedAnalysis, aiAnalysisSource: source };
    await db.update(inquiriesTable).set({ metadata: nextMetadata, updatedAt: new Date() })
      .where(eq(inquiriesTable.id, id));
    if (typeof metadata.caseId === "string" && metadata.caseId) {
      await db.update(casesTable).set({
        intakeAnalysis: sql`jsonb_set(COALESCE(${casesTable.intakeAnalysis}, '{}'::jsonb),
          '{sycInitialReview}', ${JSON.stringify(savedAnalysis)}::jsonb, true)`,
        updatedAt: new Date(),
      }).where(eq(casesTable.id, metadata.caseId));
    }
    await writeAudit({
      eventType: "inquiry.syc_ai_analysis_generated",
      actorId: req.userId,
      actorRole: req.userRole,
      metadata: { inquiryId: id, source, recommendedExtension: eligibleRecommendation, suitability: analysis.suitability },
    });
    res.json({ analysis: savedAnalysis, source });
  } catch (error) {
    req.log?.error({ error: error instanceof Error ? error.message : "unknown", inquiryId: id }, "Strengthen Your Core inquiry analysis failed");
    res.status(502).json({ error: "analysis_unavailable", message: "The de-identified inquiry analysis could not be completed. The inquiry remains saved for review." });
  }
});

router.patch("/strengthen-core/applications/:applicationId/review", authMiddleware, async (req, res): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const id = asId(req.params.applicationId);
  if (!id) {
    res.status(400).json({ error: "invalid_application_id" });
    return;
  }
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_review", message: "Provide a valid decision and review reason." });
    return;
  }
  const [row] = await db.select().from(strengthenCoreApplicationsTable)
    .where(eq(strengthenCoreApplicationsTable.id, id)).limit(1);
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const existingConsent = getPrivateData(row.data as Record<string, unknown>).consent;
  if (existingConsent) {
    res.status(409).json({ error: "consent_flow_started", message: "Review decisions are locked once consent links have been issued." });
    return;
  }
  const settings = await getSettings();
  const extension = parsed.data.approvedExtension ?? null;
  if (extension && !settings.allowedExtensions.includes(extension)) {
    res.status(400).json({ error: "extension_not_enabled", message: "This extension has not been enabled in programme settings." });
    return;
  }
  const statusByDecision = {
    request_information: "additional_information_requested",
    approve: "approved",
    decline: "declined",
    route_review: "professional_pathway_review_required",
  } as const;
  const status = statusByDecision[parsed.data.decision];
  const [updated] = await db.update(strengthenCoreApplicationsTable)
    .set({
      status,
      approvedExtension: parsed.data.decision === "approve" ? extension : null,
      reviewReason: parsed.data.reason,
      reviewedBy: req.userId ?? null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(strengthenCoreApplicationsTable.id, id), eq(strengthenCoreApplicationsTable.status, row.status)))
    .returning();
  if (!updated) {
    res.status(409).json({ error: "review_conflict", message: "The application changed during review. Refresh and try again." });
    return;
  }
  await writeAudit({
    eventType: `syc.application.${parsed.data.decision}`,
    actorId: req.userId,
    actorRole: req.userRole,
    metadata: { applicationId: id, status, approvedExtension: extension },
  });
  res.json(formatApplication(updated));
});

router.post("/strengthen-core/applications/:applicationId/start-raos-flow", authMiddleware, async (req, res): Promise<void> => {
  res.status(410).json({
    error: "use_raos_inquiries",
    message: "New Strengthen Your Core inquiries now continue through the shared RAOS Inquiries and Cases workflow.",
  });
  return;
  /*
  if (!isAdmin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const id = asId(req.params.applicationId);
  if (!id) {
    res.status(400).json({ error: "invalid_application_id" });
    return;
  }
  const [row] = await db.select().from(strengthenCoreApplicationsTable)
    .where(eq(strengthenCoreApplicationsTable.id, id)).limit(1);
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (!["approved", "consent_requested", "guardian_consent_received", "student_assent_received"].includes(row.status)) {
    res.status(409).json({ error: "application_not_approved", message: "Approve the application before creating its RAOS case." });
    return;
  }
  const settings = await getSettings();
  if (!settings.coreInstrumentEnabled) {
    res.status(409).json({ error: "programme_not_ready", message: "Enable the core instrument in programme settings before starting the RAOS flow." });
    return;
  }
  const existingConsent = getPrivateData(row.data as Record<string, unknown>).consent;
  if (existingConsent?.caseId) {
    res.json({ caseId: existingConsent.caseId, caseUrl: `/cases/${encodeURIComponent(existingConsent.caseId)}`, alreadyStarted: true });
    return;
  }

  const data = row.data as Record<string, unknown>;
  const caseId = nanoid();
  const consentToken = makeToken();
  const assentToken = makeToken();
  const baseUrl = `${(req.headers["x-forwarded-proto"] as string) ?? "https"}://${req.headers.host ?? "localhost"}`;
  const consentUrl = `${baseUrl}/external/${consentToken}`;
  const assentUrl = `${baseUrl}/external/${assentToken}`;
  const learningLanguage = `${safeString(data.learningLanguage, 100)} ${safeString(data.languagePreference, 100)}`.toLowerCase();
  const languagePreference = /cantonese|廣東話|粤语/.test(learningLanguage)
    ? "cantonese" as const
    : /chinese|mandarin|中文|普通话/.test(learningLanguage)
      ? "mandarin" as const
      : "english" as const;
  const now = new Date();
  const consent: SycConsentRecord = {
    guardianName: "",
    guardianEmail: "",
    guardianRelationship: "",
    studentName: "",
    studentDob: "",
    guardianStatus: "pending",
    studentStatus: "pending",
    guardianSignatureName: null,
    guardianSignedAt: null,
    studentSignatureName: null,
    studentAssentedAt: null,
    verifiedAt: null,
    caseId,
  };
  const nextData = withPrivateData(data, { ...getPrivateData(data), consent });
  const [consentTool] = await db.select({ formItems: assessmentToolsTable.formItems })
    .from(assessmentToolsTable).where(eq(assessmentToolsTable.id, "CONSENT")).limit(1);

  await db.transaction(async (tx) => {
    await tx.insert(casesTable).values({
      id: caseId,
      studentName: "Pending guardian consent",
      dob: "Pending",
      school: row.schoolName,
      grade: safeString(data.gradeBand, 80) || null,
      languagePreference,
      referralReason: `Strengthen Your Core approved referral: ${row.primaryConcern}`,
      currentPhase: "pre_commitment",
      caseStatus: "active",
      consentObtained: false,
      productIds: ["STRENGTHEN_CORE"],
      intakeData: data,
      intakeAnalysis: {
        source: "promotional_link",
        sourceInquiryId: id,
        strengthenCoreApplicationId: id,
        sycWorkflow: {
          source: "promotional_link",
          guardianStatus: "pending",
          approvedExtension: row.approvedExtension ?? null,
        },
        productToolOverrides: {
          STRENGTHEN_CORE: {
            addedToolIds: row.approvedExtension ? [row.approvedExtension] : [],
            removedToolIds: [],
          },
        },
      },
    });
    await tx.insert(assignmentsTable).values([
      {
        id: nanoid(),
        caseId,
        toolId: "CONSENT",
        toolName: "ReMynd Student Assessment — Parent/Guardian Consent Form",
        respondentType: "parent",
        respondentLabel: "Parent / Guardian",
        uniqueToken: consentToken,
        uniqueLink: consentUrl,
        qrCodeData: consentUrl,
        status: "not_started",
        formItemsSnapshot: consentTool?.formItems ? JSON.stringify(consentTool.formItems) : JSON.stringify(CONSENT_FORM_V2),
      },
      {
        id: nanoid(),
        caseId,
        toolId: "SYC-ASSENT",
        toolName: "Strengthen Your Core — Student Assent",
        respondentType: "student",
        respondentLabel: "Student",
        uniqueToken: assentToken,
        uniqueLink: assentUrl,
        qrCodeData: assentUrl,
        status: "not_started",
        formItemsSnapshot: JSON.stringify(SYC_STUDENT_ASSENT_FORM),
      },
    ]);
    await tx.update(strengthenCoreApplicationsTable).set({
      data: nextData,
      status: "consent_requested",
      updatedAt: now,
    }).where(eq(strengthenCoreApplicationsTable.id, id));
  });
  await writeAudit({
    eventType: "syc.application.raos_consent_flow_started",
    actorId: req.userId,
    actorRole: req.userRole,
    caseId,
    metadata: { applicationId: id },
  });
  res.status(201).json({
    caseId,
    caseUrl: `/cases/${encodeURIComponent(caseId)}`,
    consentUrl,
    studentAssentUrl: assentUrl,
    alreadyStarted: false,
  });
  */
});

router.post("/strengthen-core/applications/:applicationId/consent-links", authMiddleware, async (req, res): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const id = asId(req.params.applicationId);
  const parsed = z.object({
    guardianName: z.string().trim().min(2).max(200),
    guardianEmail: z.string().trim().email().max(320),
    guardianRelationship: z.string().trim().min(2).max(120),
    studentName: z.string().trim().min(2).max(200),
    studentDob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).strict().safeParse(req.body);
  if (!id || !parsed.success) {
    res.status(400).json({ error: "invalid_request", message: "Provide the guardian's details and the student's name and date of birth." });
    return;
  }
  const [row] = await db.select().from(strengthenCoreApplicationsTable)
    .where(eq(strengthenCoreApplicationsTable.id, id)).limit(1);
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (!["approved", "consent_requested", "guardian_consent_received", "student_assent_received"].includes(row.status)) {
    res.status(409).json({ error: "application_not_approved", message: "The application must be approved before requesting consent." });
    return;
  }
  const settings = await getSettings();
  if (!settings.coreInstrumentEnabled) {
    res.status(409).json({ error: "programme_not_ready", message: "Enable the core instrument in programme settings before starting consent." });
    return;
  }
  const existing = getPrivateData(row.data as Record<string, unknown>).consent;
  if (existing?.caseId || existing?.guardianStatus === "declined") {
    res.status(409).json({ error: "consent_flow_closed", message: "Parent/guardian consent has been declined or a verified case already exists." });
    return;
  }
  const identity = existing?.guardianStatus === "consented"
    ? {
        guardianName: existing.guardianName,
        guardianEmail: existing.guardianEmail,
        guardianRelationship: existing.guardianRelationship,
        studentName: existing.studentName,
        studentDob: existing.studentDob,
      }
    : parsed.data;
  if (!identity.guardianName || !identity.guardianEmail || !identity.guardianRelationship || !identity.studentName || !identity.studentDob) {
    res.status(409).json({ error: "consent_identity_incomplete", message: "The consent identity record is incomplete. Contact an administrator." });
    return;
  }
  const guardianToken = existing?.guardianStatus === "consented" ? null : makeToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const data = row.data as Record<string, unknown>;
  const privateData = getPrivateData(data);
  const consent: SycConsentRecord = {
    ...existing,
    ...identity,
    guardianTokenHash: guardianToken ? hashToken(guardianToken) : null,
    studentTokenHash: null,
    guardianExpiresAt: guardianToken ? expiresAt : existing?.guardianExpiresAt ?? null,
    studentExpiresAt: null,
    guardianStatus: existing?.guardianStatus ?? "pending",
    studentStatus: undefined,
    guardianSignatureName: existing?.guardianSignatureName ?? null,
    guardianSignedAt: existing?.guardianSignedAt ?? null,
    verifiedBy: null,
    verifiedAt: null,
    caseId: null,
  };
  await db.update(strengthenCoreApplicationsTable).set({
    data: withPrivateData(data, { ...privateData, consent }),
    status: "consent_requested",
    updatedAt: new Date(),
  }).where(eq(strengthenCoreApplicationsTable.id, id));
  await writeAudit({
    eventType: "syc.application.consent_links_created",
    actorId: req.userId,
    actorRole: req.userRole,
    metadata: { applicationId: id, expiresAt },
  });
  const base = "/strengthen-your-core/consent";
  res.status(201).json({
    guardianUrl: guardianToken ? `${base}/guardian/${guardianToken}` : null,
    expiresAt,
  });
});

router.get("/strengthen-core/consent/:role/:token", async (req, res): Promise<void> => {
  const role = req.params.role;
  const token = req.params.token;
  if (role === "student") {
    res.status(410).json({ error: "student_assent_not_required", message: "A separate student assent form is not required. Parent/guardian consent is the only consent form for this pathway." });
    return;
  }
  if (role !== "guardian" || !token || token.length > 200) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const key = "guardianTokenHash";
  const rows = await db.execute(sql`
    SELECT id, language, status, data
    FROM syc_applications
    WHERE data -> '__syc' -> 'consent' ->> ${key} = ${hashToken(token)}
    LIMIT 1
  `);
  const row = rows.rows[0] as { id: string; language: string; status: string; data: Record<string, unknown> } | undefined;
  const consent = row ? getPrivateData(row.data).consent : null;
  const expiry = consent?.guardianExpiresAt;
  const tokenStatus = consent?.guardianStatus;
  if (!row || !["consent_requested", "guardian_consent_received", "student_assent_received"].includes(row.status) ||
      !consent || !expiry || Date.parse(expiry) < Date.now() || tokenStatus !== "pending") {
    res.status(404).json({ error: "invalid_or_expired_link", message: "This consent link is invalid, expired, or has already been used." });
    return;
  }
  res.json({ role, language: row.language, guardianConsentReceived: consent.guardianStatus === "consented" });
});

router.post("/strengthen-core/consent/:role/:token", async (req, res): Promise<void> => {
  const role = req.params.role;
  const token = req.params.token;
  if (role === "student") {
    res.status(410).json({ error: "student_assent_not_required", message: "A separate student assent form is not required. Parent/guardian consent is the only consent form for this pathway." });
    return;
  }
  if (role !== "guardian" || !token || token.length > 200) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const parsed = z.object({
    decision: z.enum(["agree", "decline"]),
    signatureName: z.string().trim().min(2).max(200),
    legalAuthorityConfirmed: z.boolean(),
  }).strict().safeParse(req.body);
  if (!parsed.success || parsed.data.legalAuthorityConfirmed !== true) {
    res.status(400).json({ error: "invalid_consent", message: "Complete the required consent confirmations and signature." });
    return;
  }
  const key = "guardianTokenHash";
  const result = await db.transaction(async (tx) => {
    const rows = await tx.execute(sql`
      SELECT id, data, status
      FROM syc_applications
      WHERE data -> '__syc' -> 'consent' ->> ${key} = ${hashToken(token)}
      FOR UPDATE
    `);
    const row = rows.rows[0] as { id: string; data: Record<string, unknown>; status: string } | undefined;
    const consent = row ? getPrivateData(row.data).consent : null;
    const expiry = consent?.guardianExpiresAt;
    const tokenStatus = consent?.guardianStatus;
    if (!row || !["consent_requested", "guardian_consent_received", "student_assent_received"].includes(row.status) ||
        !consent || !expiry || Date.parse(expiry) < Date.now() || tokenStatus !== "pending") {
      return { error: "invalid_or_expired_link" as const };
    }
    const expectedName = consent.guardianName;
    if (normalizedName(parsed.data.signatureName) !== normalizedName(expectedName)) {
      return { error: "signature_mismatch" as const };
    }
    const now = new Date().toISOString();
    const nextConsent: SycConsentRecord = {
      ...consent,
      guardianStatus: parsed.data.decision === "agree" ? "consented" : "declined",
      guardianSignatureName: parsed.data.signatureName.trim(),
      guardianSignedAt: now,
      guardianTokenHash: null,
      studentTokenHash: null,
    };
    const newStatus = parsed.data.decision === "decline" ? "consent_declined" : "guardian_consent_received";
    await tx.update(strengthenCoreApplicationsTable).set({
      data: withPrivateData(row.data, { ...getPrivateData(row.data), consent: nextConsent }),
      status: newStatus,
      updatedAt: new Date(),
    }).where(and(eq(strengthenCoreApplicationsTable.id, row.id), eq(strengthenCoreApplicationsTable.status, row.status)));
    return { id: row.id, status: newStatus };
  });
  if ("error" in result) {
    res.status(404).json({ error: result.error, message: result.error === "signature_mismatch" ? "The typed signature must match the name provided by the school." : "This link is invalid, expired, already used, or not yet available." });
    return;
  }
  await writeAudit({
    eventType: `syc.consent.guardian_${parsed.data.decision}`,
    metadata: { applicationId: result.id },
  });
  res.json({ submitted: true, status: result.status });
});

router.post("/strengthen-core/applications/:applicationId/verify-consent", authMiddleware, async (req, res): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const id = asId(req.params.applicationId);
  if (!id) {
    res.status(400).json({ error: "invalid_application_id" });
    return;
  }
  const settings = await getSettings();
  if (!settings.coreInstrumentEnabled) {
    res.status(409).json({ error: "programme_not_ready", message: "Enable the core instrument in programme settings before verifying assessment readiness." });
    return;
  }
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(strengthenCoreApplicationsTable)
      .where(eq(strengthenCoreApplicationsTable.id, id)).for("update").limit(1);
    if (!row) return { error: "not_found" as const };
    const data = row.data as Record<string, unknown>;
    const consent = getPrivateData(data).consent;
    if (!consent || consent.guardianStatus !== "consented") {
      return { error: "guardian_consent_required" as const };
    }
    if (row.status !== "student_assent_received" && row.status !== "guardian_consent_received") {
      return { error: "application_not_ready" as const };
    }
    if (consent.caseId) {
      const verifiedConsent: SycConsentRecord = {
        ...consent,
        guardianTokenHash: null,
        studentTokenHash: null,
        verifiedBy: req.userId ?? null,
        verifiedAt: new Date().toISOString(),
      };
      await tx.update(casesTable).set({ consentObtained: true, updatedAt: new Date() })
        .where(eq(casesTable.id, consent.caseId));
      await tx.update(strengthenCoreApplicationsTable).set({
        data: withPrivateData(data, { ...getPrivateData(data), consent: verifiedConsent }),
        status: "consent_verified",
        updatedAt: new Date(),
      }).where(eq(strengthenCoreApplicationsTable.id, id));
      return { caseId: consent.caseId };
    }
    const caseId = nanoid();
    const languageText = `${safeString(data.learningLanguage, 100)} ${safeString(data.languagePreference, 100)}`.toLowerCase();
    const languagePreference = /cantonese|廣東話|粤语/.test(languageText)
      ? "cantonese" as const
      : /chinese|mandarin|中文|普通话/.test(languageText)
        ? "mandarin" as const
        : "english" as const;
    await tx.insert(casesTable).values({
      id: caseId,
      studentName: consent.studentName,
      dob: consent.studentDob,
      school: row.schoolName,
      grade: safeString(data.gradeBand, 80) || null,
      languagePreference,
      referralReason: `Strengthen Your Core approved referral: ${row.primaryConcern}`,
      currentPhase: "pre_commitment",
      caseStatus: "active",
      consentObtained: true,
      parentName: consent.guardianName,
      parentEmail: consent.guardianEmail,
      productIds: ["STRENGTHEN_CORE"],
      intakeData: data,
      intakeAnalysis: {
        source: "promotional_link",
        strengthenCoreApplicationId: id,
        sycWorkflow: {
          source: "promotional_link",
          guardianStatus: "verified",
          verifiedAt: consent.verifiedAt ?? new Date().toISOString(),
          approvedExtension: row.approvedExtension ?? null,
        },
        productToolOverrides: {
          STRENGTHEN_CORE: {
            addedToolIds: row.approvedExtension ? [row.approvedExtension] : [],
            removedToolIds: [],
          },
        },
      },
    });
    const verifiedConsent: SycConsentRecord = {
      ...consent,
      guardianTokenHash: null,
      studentTokenHash: null,
      verifiedBy: req.userId ?? null,
      verifiedAt: new Date().toISOString(),
      caseId,
    };
    await tx.update(strengthenCoreApplicationsTable).set({
      data: withPrivateData(data, { ...getPrivateData(data), consent: verifiedConsent }),
      status: "consent_verified",
      updatedAt: new Date(),
    }).where(eq(strengthenCoreApplicationsTable.id, id));
    return { caseId };
  });
  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 409;
    res.status(status).json({
      error: result.error,
      message: result.error === "guardian_consent_required"
        ? "Parent/guardian consent must be recorded first."
        : result.error === "application_not_ready"
            ? "The application must be approved and consent responses received before verification."
            : "This application is not ready for verification.",
    });
    return;
  }
  await writeAudit({
    eventType: "syc.application.consent_verified_case_created",
    actorId: req.userId,
    actorRole: req.userRole,
    caseId: result.caseId,
    metadata: { applicationId: id },
  });
  res.json({ verified: true, caseId: result.caseId });
});

export default router;
