import { Router } from "express";
import { db } from "@workspace/db";
import { assessmentToolsTable } from "@workspace/db/schema";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { recommendToolsWithAI } from "../lib/gemini.js";

const router = Router();

router.get("/assessment-tools", authMiddleware, async (req, res) => {
  const tools = await db.select().from(assessmentToolsTable);
  res.json(tools);
});

router.post("/assessment-tools/recommend", authMiddleware, async (req, res) => {
  const { caseId, domains, riskLevel } = req.body;
  const allTools = await db.select().from(assessmentToolsTable);

  const recommendations = await recommendToolsWithAI({ domains, riskLevel, allTools });
  res.json(recommendations);
});

export default router;
