/**
 * PIPL Compliance Foundation — Phase 1
 * Admin-only routes. All endpoints return 403 to non-admins.
 * Passive only — no existing workflow is modified.
 */
import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";

const router = Router();

// ── Guard: admin only ──────────────────────────────────────────────────────────
function requireAdmin(req: any, res: any, next: any) {
  if (req.userRole !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
}
router.use(authMiddleware, requireAdmin);

// ── Risk Dashboard ─────────────────────────────────────────────────────────────
router.get("/compliance/dashboard", async (req, res) => {
  try {
    const [inv, vendors, policies, events, accessReviews] = await Promise.all([
      db.execute(sql`SELECT
        COUNT(*) FILTER (WHERE true) AS total,
        COUNT(*) FILTER (WHERE involves_minor = true) AS involves_minor,
        COUNT(*) FILTER (WHERE is_sensitive = true) AS is_sensitive,
        COUNT(*) FILTER (WHERE risk_level = 'critical') AS critical,
        COUNT(*) FILTER (WHERE risk_level = 'high') AS high,
        COUNT(*) FILTER (WHERE review_status = 'pending') AS pending_review
        FROM compliance_data_inventory`),
      db.execute(sql`SELECT
        COUNT(*) FILTER (WHERE true) AS total,
        COUNT(*) FILTER (WHERE hosting_region IS NULL OR hosting_region = 'unknown') AS unknown_region,
        COUNT(*) FILTER (WHERE leaves_mainland = true OR leaves_mainland IS NULL) AS possible_crossborder,
        COUNT(*) FILTER (WHERE risk_level = 'high' OR risk_level = 'critical') AS high_risk
        FROM compliance_vendors`),
      db.execute(sql`SELECT
        COUNT(*) FILTER (WHERE status != 'effective') AS awaiting_legal
        FROM compliance_policy_register`),
      db.execute(sql`SELECT COUNT(*) AS total FROM security_audit_events
        WHERE occurred_at > NOW() - INTERVAL '7 days'`),
      db.execute(sql`SELECT
        MAX(reviewed_at) AS last_review
        FROM compliance_access_reviews`),
    ]);

    const aiReviewCount = 7; // From Phase 1 inspection
    const unresolvedHigh = Number((inv.rows[0] as any).critical ?? 0) + Number((inv.rows[0] as any).high ?? 0);

    res.json({
      inventory: {
        total: Number((inv.rows[0] as any).total ?? 0),
        involvingMinors: Number((inv.rows[0] as any).involves_minor ?? 0),
        sensitive: Number((inv.rows[0] as any).is_sensitive ?? 0),
        pendingReview: Number((inv.rows[0] as any).pending_review ?? 0),
      },
      vendors: {
        total: Number((vendors.rows[0] as any).total ?? 0),
        unknownRegion: Number((vendors.rows[0] as any).unknown_region ?? 0),
        possibleCrossBorder: Number((vendors.rows[0] as any).possible_crossborder ?? 0),
        highRisk: Number((vendors.rows[0] as any).high_risk ?? 0),
      },
      policies: {
        awaitingLegal: Number((policies.rows[0] as any).awaiting_legal ?? 0),
      },
      security: {
        eventsLast7Days: Number((events.rows[0] as any).total ?? 0),
      },
      aiReview: {
        functionsReviewed: aiReviewCount,
        unresolvedHigh,
      },
      lastAccessReview: (accessReviews.rows[0] as any)?.last_review ?? null,
    });
  } catch (err) {
    console.error("[compliance] dashboard error", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

// ── Data Inventory ─────────────────────────────────────────────────────────────
router.get("/compliance/data-inventory", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM compliance_data_inventory ORDER BY risk_level DESC, category ASC`);
    res.json({ items: rows.rows });
  } catch { res.status(500).json({ error: "Failed to load inventory" }); }
});

router.post("/compliance/data-inventory", async (req, res) => {
  try {
    const id = nanoid();
    const b = req.body;
    await db.execute(sql`INSERT INTO compliance_data_inventory
      (id, category, example_fields, data_subject, purpose, source, system_location,
       is_sensitive, involves_minor, involves_under_14, authorized_roles, external_recipients,
       storage_region, overseas_access, retention_practice, deletion_method,
       security_controls, risk_level, compliance_notes, review_status, reviewer)
      VALUES (
        ${id}, ${b.category}, ${b.example_fields ?? null}, ${b.data_subject ?? null},
        ${b.purpose ?? null}, ${b.source ?? null}, ${b.system_location ?? null},
        ${b.is_sensitive ?? false}, ${b.involves_minor ?? false}, ${b.involves_under_14 ?? false},
        ${b.authorized_roles ?? null}, ${b.external_recipients ?? null},
        ${b.storage_region ?? null}, ${b.overseas_access ?? null},
        ${b.retention_practice ?? null}, ${b.deletion_method ?? null},
        ${b.security_controls ?? null}, ${b.risk_level ?? 'unknown'},
        ${b.compliance_notes ?? null}, ${b.review_status ?? 'pending'}, ${b.reviewer ?? null}
      )`);
    await db.execute(sql`INSERT INTO security_audit_events
      (id, event_type, occurred_at, actor_id, actor_role, resource_id, resource_type, outcome, description)
      VALUES (${nanoid()}, 'compliance_register_changed', NOW(), ${(req as any).userId},
        ${(req as any).userRole}, ${id}, 'data_inventory', 'success', 'Data inventory item created')`);
    res.status(201).json({ id });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to create item" }); }
});

router.patch("/compliance/data-inventory/:id", async (req, res) => {
  try {
    const b = req.body;
    await db.execute(sql`UPDATE compliance_data_inventory SET
      category = COALESCE(${b.category}, category),
      example_fields = COALESCE(${b.example_fields ?? null}, example_fields),
      data_subject = COALESCE(${b.data_subject ?? null}, data_subject),
      purpose = COALESCE(${b.purpose ?? null}, purpose),
      storage_region = COALESCE(${b.storage_region ?? null}, storage_region),
      risk_level = COALESCE(${b.risk_level ?? null}, risk_level),
      review_status = COALESCE(${b.review_status ?? null}, review_status),
      compliance_notes = COALESCE(${b.compliance_notes ?? null}, compliance_notes),
      reviewer = COALESCE(${b.reviewer ?? null}, reviewer),
      last_reviewed_at = CASE WHEN ${b.review_status ?? null} IS NOT NULL THEN NOW() ELSE last_reviewed_at END,
      updated_at = NOW()
      WHERE id = ${req.params.id}`);
    await db.execute(sql`INSERT INTO security_audit_events
      (id, event_type, occurred_at, actor_id, actor_role, resource_id, resource_type, outcome, description)
      VALUES (${nanoid()}, 'compliance_register_changed', NOW(), ${(req as any).userId},
        ${(req as any).userRole}, ${req.params.id}, 'data_inventory', 'success', 'Data inventory item updated')`);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to update item" }); }
});

// ── Vendor Register ────────────────────────────────────────────────────────────
router.get("/compliance/vendors", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM compliance_vendors ORDER BY risk_level DESC, vendor_name ASC`);
    res.json({ items: rows.rows });
  } catch { res.status(500).json({ error: "Failed to load vendors" }); }
});

router.post("/compliance/vendors", async (req, res) => {
  try {
    const id = nanoid();
    const b = req.body;
    await db.execute(sql`INSERT INTO compliance_vendors
      (id, vendor_name, service_purpose, data_categories, student_info_possible,
       sensitive_info_possible, minors_possible, hosting_region, leaves_mainland,
       contract_reviewed, training_use, retention_terms_known, deletion_capable,
       security_review_status, risk_level, required_followup, notes)
      VALUES (
        ${id}, ${b.vendor_name}, ${b.service_purpose ?? null}, ${b.data_categories ?? null},
        ${b.student_info_possible ?? true}, ${b.sensitive_info_possible ?? false},
        ${b.minors_possible ?? false}, ${b.hosting_region ?? null},
        ${b.leaves_mainland ?? null}, ${b.contract_reviewed ?? 'unknown'},
        ${b.training_use ?? 'unknown'}, ${b.retention_terms_known ?? false},
        ${b.deletion_capable ?? false}, ${b.security_review_status ?? 'not_started'},
        ${b.risk_level ?? 'unknown'}, ${b.required_followup ?? null}, ${b.notes ?? null}
      )`);
    await db.execute(sql`INSERT INTO security_audit_events
      (id, event_type, occurred_at, actor_id, actor_role, resource_id, resource_type, outcome, description)
      VALUES (${nanoid()}, 'compliance_register_changed', NOW(), ${(req as any).userId},
        ${(req as any).userRole}, ${id}, 'vendor', 'success', 'Vendor register item created')`);
    res.status(201).json({ id });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to create vendor" }); }
});

router.patch("/compliance/vendors/:id", async (req, res) => {
  try {
    const b = req.body;
    await db.execute(sql`UPDATE compliance_vendors SET
      vendor_name = COALESCE(${b.vendor_name ?? null}, vendor_name),
      service_purpose = COALESCE(${b.service_purpose ?? null}, service_purpose),
      hosting_region = COALESCE(${b.hosting_region ?? null}, hosting_region),
      leaves_mainland = COALESCE(${b.leaves_mainland ?? null}, leaves_mainland),
      contract_reviewed = COALESCE(${b.contract_reviewed ?? null}, contract_reviewed),
      training_use = COALESCE(${b.training_use ?? null}, training_use),
      risk_level = COALESCE(${b.risk_level ?? null}, risk_level),
      required_followup = COALESCE(${b.required_followup ?? null}, required_followup),
      notes = COALESCE(${b.notes ?? null}, notes),
      last_reviewed_at = NOW(), updated_at = NOW()
      WHERE id = ${req.params.id}`);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to update vendor" }); }
});

// ── Policy Register ────────────────────────────────────────────────────────────
router.get("/compliance/policies", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM compliance_policy_register ORDER BY policy_name ASC`);
    res.json({ items: rows.rows });
  } catch { res.status(500).json({ error: "Failed to load policies" }); }
});

router.patch("/compliance/policies/:id", async (req, res) => {
  try {
    const b = req.body;
    const { sql: drizzleSql } = await import("drizzle-orm");
    // Build SET clauses only for fields present in the request body
    const sets: ReturnType<typeof drizzleSql>[] = [];
    if (b.status !== undefined)        sets.push(sql`status = ${b.status}`);
    if (b.version !== undefined)       sets.push(sql`version = ${b.version}`);
    if (b.document_owner !== undefined) sets.push(sql`document_owner = ${b.document_owner}`);
    if (b.internal_notes !== undefined) sets.push(sql`internal_notes = ${b.internal_notes}`);
    if (b.content_en !== undefined)    sets.push(sql`content_en = ${b.content_en}`);
    if (b.content_zh !== undefined)    sets.push(sql`content_zh = ${b.content_zh}`);
    if (b.content_ko !== undefined)    sets.push(sql`content_ko = ${b.content_ko}`);
    if (b.effective_date !== undefined) sets.push(sql`effective_date = ${b.effective_date ?? null}::date`);
    if (b.review_date !== undefined)   sets.push(sql`review_date = ${b.review_date ?? null}::date`);
    if (b.public_visible !== undefined) {
      // Cast explicitly to boolean to avoid parameterized-query type ambiguity
      const boolVal = b.public_visible === true || b.public_visible === "true";
      sets.push(sql`public_visible = ${boolVal}::boolean`);
    }
    if (sets.length === 0) return res.json({ ok: true });
    sets.push(sql`updated_at = NOW()`);
    const setClauses = sql.join(sets, sql`, `);
    await db.execute(sql`UPDATE compliance_policy_register SET ${setClauses} WHERE id = ${req.params.id}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("policy PATCH error:", err);
    res.status(500).json({ error: "Failed to update policy" });
  }
});

// ── Access Review ──────────────────────────────────────────────────────────────
router.get("/compliance/access-review", async (_req, res) => {
  try {
    const users = await db.execute(sql`
      SELECT u.id, u.name, u.email, u.role, u.school_name AS school, u.created_at,
        (SELECT COUNT(*) FROM assignments a WHERE a.user_id = u.id) AS case_count,
        (SELECT MAX(created_at) FROM assignments a WHERE a.user_id = u.id) AS last_assignment,
        cr.review_label, cr.reviewed_by, cr.reviewed_at, cr.notes AS review_notes
      FROM users u
      LEFT JOIN compliance_access_reviews cr ON cr.user_id = u.id
      ORDER BY u.role, u.name
    `);
    res.json({ users: users.rows.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      school: u.school,
      caseCount: Number(u.case_count ?? 0),
      lastAssignment: u.last_assignment,
      createdAt: u.created_at,
      reviewLabel: u.review_label ?? null,
      reviewedBy: u.reviewed_by ?? null,
      reviewedAt: u.reviewed_at ?? null,
      reviewNotes: u.review_notes ?? null,
    })) });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to load access review" }); }
});

router.patch("/compliance/access-review/:userId", async (req, res) => {
  try {
    const { review_label, notes } = req.body;
    await db.execute(sql`
      INSERT INTO compliance_access_reviews (id, user_id, review_label, reviewed_by, reviewed_at, notes)
      VALUES (${nanoid()}, ${req.params.userId}, ${review_label}, ${(req as any).userId}, NOW(), ${notes ?? null})
      ON CONFLICT (user_id) DO UPDATE SET
        review_label = EXCLUDED.review_label,
        reviewed_by = EXCLUDED.reviewed_by,
        reviewed_at = EXCLUDED.reviewed_at,
        notes = COALESCE(EXCLUDED.notes, compliance_access_reviews.notes),
        updated_at = NOW()
    `);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to update review" }); }
});

// ── Security Events ────────────────────────────────────────────────────────────
router.get("/compliance/security-events", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const offset = Number(req.query.offset ?? 0);
    const rows = await db.execute(sql`
      SELECT * FROM security_audit_events
      ORDER BY occurred_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const count = await db.execute(sql`SELECT COUNT(*) FROM security_audit_events`);
    res.json({ events: rows.rows, total: Number((count.rows[0] as any).count ?? 0) });
  } catch { res.status(500).json({ error: "Failed to load security events" }); }
});

// ── AI Data Protection Review ─────────────────────────────────────────────────
// Static findings from Phase 1 code inspection — no live data, no student records
router.get("/compliance/ai-review", async (_req, res) => {
  res.json({
    reviewedAt: "2026-08-10",
    reviewedBy: "System — Phase 1 automated inspection",
    disclaimer: "This review reflects findings from automated code inspection. It does not constitute a legal determination. Human review required.",
    functions: [
      {
        id: "analyze-intake",
        name: "Intake Analysis",
        provider: "DeepSeek",
        model: "deepseek-chat",
        file: "lib/ai.ts → analyzeIntakeWithAI()",
        trigger: "Case intake submission",
        dataCategories: ["Student name (now pseudonymised)", "Grade", "Age", "Referral reason", "Referral form answers", "Parent intake answers", "Parent interview notes", "Assessment tool metadata"],
        directIdentifiers: "Partially mitigated — student name replaced with case ID in Phase 1. Parent names may appear in free-text intake answers.",
        hostingRegion: "Unknown — DeepSeek servers",
        leavesMainland: true,
        trainingUse: "unknown",
        riskLevel: "high",
        phase1Action: "Student name de-identified. Free-text fields may still contain parent names — flagged for Phase 2.",
        status: "partial_mitigation",
      },
      {
        id: "generate-report",
        name: "Report Generation",
        provider: "DeepSeek",
        model: "deepseek-chat",
        file: "lib/ai.ts → generateReportWithAI()",
        trigger: "Report generation request by clinician",
        dataCategories: ["Student name (now pseudonymised)", "Date of birth (redacted)", "School", "Grade", "Referral reason", "Intake analysis", "Debrief notes", "Assessment scores"],
        directIdentifiers: "Partially mitigated — student name and DOB replaced with case ID in Phase 1.",
        hostingRegion: "Unknown — DeepSeek servers",
        leavesMainland: true,
        trainingUse: "unknown",
        riskLevel: "high",
        phase1Action: "Student name and DOB de-identified. School name still included — required for clinical context.",
        status: "partial_mitigation",
      },
      {
        id: "tool-lookup",
        name: "Assessment Tool Lookup",
        provider: "DeepSeek",
        model: "deepseek-chat",
        file: "lib/ai.ts → lookupToolWithAI()",
        trigger: "Tool library search",
        dataCategories: ["User-entered search query", "Assessment tool metadata"],
        directIdentifiers: "None — no student data transmitted",
        hostingRegion: "Unknown — DeepSeek servers",
        leavesMainland: true,
        trainingUse: "unknown",
        riskLevel: "low",
        phase1Action: "No action required. No student data in payload.",
        status: "reviewed_no_action",
      },
      {
        id: "recommend-tools",
        name: "Tool Recommendation",
        provider: "DeepSeek",
        model: "deepseek-chat",
        file: "lib/ai.ts → recommendToolsWithAI()",
        trigger: "Assessment tool recommendation",
        dataCategories: ["Risk level", "Assessment domains", "Tool metadata"],
        directIdentifiers: "None — no student identifiers",
        hostingRegion: "Unknown — DeepSeek servers",
        leavesMainland: true,
        trainingUse: "unknown",
        riskLevel: "low",
        phase1Action: "No action required.",
        status: "reviewed_no_action",
      },
      {
        id: "ramri-deepseek",
        name: "RAMRI Interview Analysis",
        provider: "DeepSeek + Groq (Llama) + Gemini",
        model: "deepseek-chat / llama-3.3-70b-versatile / gemini-2.5-flash",
        file: "routes/ramri-interview.ts",
        trigger: "RAMRI structured interview session",
        dataCategories: ["Work samples (images)", "Interview observations", "Domain ratings", "Session transcript fragments"],
        directIdentifiers: "None found in automated inspection — student name not injected into prompts",
        hostingRegion: "Unknown (DeepSeek / Groq / Replit-provisioned Gemini)",
        leavesMainland: true,
        trainingUse: "unknown",
        riskLevel: "medium",
        phase1Action: "No de-identification action taken — no direct identifiers found. Manual review recommended to confirm.",
        status: "requires_manual_review",
      },
      {
        id: "raepa",
        name: "RAEPA Language Assessment",
        provider: "Groq (Llama) + Gemini",
        model: "llama-3.3-70b-versatile / gemini-2.5-flash",
        file: "routes/raepa.ts",
        trigger: "RAEPA session analysis",
        dataCategories: ["Work samples", "Language function ratings", "Module scores"],
        directIdentifiers: "None found in automated inspection",
        hostingRegion: "Unknown (Groq / Replit-provisioned Gemini)",
        leavesMainland: true,
        trainingUse: "unknown",
        riskLevel: "medium",
        phase1Action: "No de-identification action taken. Manual review recommended.",
        status: "requires_manual_review",
      },
      {
        id: "groq-whisper",
        name: "Audio Transcription",
        provider: "Groq",
        model: "whisper-large-v3",
        file: "lib/groqTranscription.ts",
        trigger: "Interview recording transcription",
        dataCategories: ["Audio recordings of assessment sessions (may contain student/clinician voice)"],
        directIdentifiers: "Audio content — cannot be de-identified without breaking functionality",
        hostingRegion: "Unknown — Groq servers",
        leavesMainland: true,
        trainingUse: "unknown",
        riskLevel: "critical",
        phase1Action: "DEFERRED — cannot de-identify audio. Priority legal and technical review required. Recording consent framework needed.",
        status: "deferred_priority_review",
      },
    ],
  });
});

// ── Phase 1 Findings ──────────────────────────────────────────────────────────
router.get("/compliance/phase1-findings", async (_req, res) => {
  res.json({
    programmeLabel: "RAOS PIPL Compliance Programme — Phase 1 Foundation",
    disclaimer: "This dashboard supports ReMynd's compliance review. It does not certify that RAOS or ReMynd is legally compliant with PIPL or any other law. Final legal determinations require qualified mainland Chinese legal review.",
    completedDate: "2026-08-10",
    deferredItems: [
      { id: "d1", title: "Audio recording de-identification", reason: "Groq Whisper transcription cannot be de-identified without breaking functionality. Recording consent framework and legal review required.", priority: "critical" },
      { id: "d2", title: "Free-text parent name removal from AI payloads", reason: "Parent names may appear in free-text intake answers passed to DeepSeek. Structured field extraction required — Phase 2.", priority: "high" },
      { id: "d3", title: "School name removal from report generation", reason: "School name included in DeepSeek report prompt for clinical context. Removal may reduce output quality.", priority: "medium" },
      { id: "d4", title: "Parent consent workflow", reason: "New mandatory consent screens deferred per Phase 1 scope.", priority: "high" },
      { id: "d5", title: "Automated data deletion / retention enforcement", reason: "Requires separate architectural approval.", priority: "high" },
      { id: "d6", title: "Cross-border transfer blocking", reason: "All AI providers are overseas. Blocking would disable core AI functions.", priority: "high" },
      { id: "d7", title: "Groq and DeepSeek model training opt-out confirmation", reason: "API data-retention and training-use terms not confirmed for current account. Legal review required.", priority: "high" },
      { id: "d8", title: "RAMRI and RAEPA manual AI payload review", reason: "Automated inspection found no direct identifiers but manual review by a qualified person is recommended.", priority: "medium" },
    ],
  });
});

export default router;
