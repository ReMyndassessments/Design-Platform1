/**
 * Public (no-auth) policy endpoints.
 * Returns policy index and individual documents in EN, ZH, or KO.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// Index — only publicly visible policies
router.get("/public/policies", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT policy_name FROM compliance_policy_register
      WHERE public_visible = true
      ORDER BY policy_name ASC
    `);
    res.json((rows.rows as any[]).map(r => ({ name: r.policy_name })));
  } catch { res.status(500).json({ error: "Failed to load policies" }); }
});

// Single document — only if publicly visible
router.get("/public/privacy-policy", async (req, res) => {
  const lang = (req.query.lang as string) || "en";
  const name = (req.query.name as string) || "China Privacy Notice";

  try {
    const rows = await db.execute(sql`
      SELECT policy_name, content_en, content_zh, content_ko, public_visible
      FROM compliance_policy_register
      WHERE policy_name = ${name}
    `);
    const policy = rows.rows[0] as any;
    if (!policy) return res.status(404).json({ error: "Policy not found" });
    if (!policy.public_visible) return res.status(403).json({ error: "Not publicly available" });

    const content =
      lang === "zh" ? (policy.content_zh || policy.content_en) :
      lang === "ko" ? (policy.content_ko || policy.content_en) :
      policy.content_en;

    res.json({ name: policy.policy_name, lang, content });
  } catch { res.status(500).json({ error: "Failed to load policy" }); }
});

export default router;
