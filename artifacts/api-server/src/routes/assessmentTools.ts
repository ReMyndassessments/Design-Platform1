import { Router } from "express";
import { db } from "@workspace/db";
import { assessmentToolsTable } from "@workspace/db/schema";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { recommendToolsWithAI } from "../lib/gemini.js";
import { SAMPLE_QUESTIONS } from "../lib/questions.js";
import { eq } from "drizzle-orm";

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

router.put("/assessment-tools/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, description, category, scoringType, domains, respondentTypes } = req.body;

  const existing = await db.select().from(assessmentToolsTable).where(eq(assessmentToolsTable.id, id));
  if (!existing.length) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }

  const updated = await db
    .update(assessmentToolsTable)
    .set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(scoringType !== undefined && { scoringType }),
      ...(domains !== undefined && { domains }),
      ...(respondentTypes !== undefined && { respondentTypes }),
    })
    .where(eq(assessmentToolsTable.id, id))
    .returning();

  res.json(updated[0]);
});

router.delete("/assessment-tools/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  const existing = await db.select().from(assessmentToolsTable).where(eq(assessmentToolsTable.id, id));
  if (!existing.length) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }

  await db.delete(assessmentToolsTable).where(eq(assessmentToolsTable.id, id));
  res.json({ success: true });
});

router.post("/assessment-tools/recommend", authMiddleware, async (req, res) => {
  const { caseId, domains, riskLevel } = req.body;
  const allTools = await db.select().from(assessmentToolsTable);

  const recommendations = await recommendToolsWithAI({ domains, riskLevel, allTools });
  res.json(recommendations);
});

export default router;
