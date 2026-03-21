import { Router } from "express";
import { db } from "@workspace/db";
import { assessmentToolsTable } from "@workspace/db/schema";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { recommendToolsWithAI } from "../lib/gemini.js";
import { SAMPLE_QUESTIONS } from "../lib/questions.js";

const router = Router();

router.get("/assessment-tools", authMiddleware, async (req, res) => {
  const tools = await db.select().from(assessmentToolsTable);
  res.json(tools);
});

router.get("/assessment-tools/:id/form-preview", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const questions = SAMPLE_QUESTIONS[id] ?? SAMPLE_QUESTIONS["default"];
  res.json({ toolId: id, questions });
});

router.post("/assessment-tools/recommend", authMiddleware, async (req, res) => {
  const { caseId, domains, riskLevel } = req.body;
  const allTools = await db.select().from(assessmentToolsTable);

  const recommendations = await recommendToolsWithAI({ domains, riskLevel, allTools });
  res.json(recommendations);
});

export default router;
