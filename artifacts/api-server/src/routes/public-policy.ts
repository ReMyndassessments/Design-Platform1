/**
 * Public (no-auth) policy endpoint.
 * Returns the China Privacy Notice in EN, ZH, or KO.
 */
import { Router } from "express";
import { POLICY_CONTENT } from "../lib/policy-content.js";

const router = Router();

router.get("/public/privacy-policy", (req, res) => {
  const lang = (req.query.lang as string) || "en";
  const notice = POLICY_CONTENT.find(p => p.name === "China Privacy Notice");
  if (!notice) return res.status(404).json({ error: "Policy not found" });

  const content =
    lang === "zh" ? notice.content_zh :
    lang === "ko" ? notice.content_ko :
    notice.content_en;

  res.json({ name: notice.name, lang, content });
});

export default router;
