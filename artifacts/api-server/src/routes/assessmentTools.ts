import { Router } from "express";
import { db } from "@workspace/db";
import { assessmentToolsTable } from "@workspace/db/schema";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { recommendToolsWithAI, analyzeFormWithAI } from "../lib/ai.js";
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

router.post("/assessment-tools", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can add new tools" });
    return;
  }

  const { id, name, description, category, scoringType, domains, respondentTypes, isRemyndOwned, formItems } = req.body;
  if (!id?.trim() || !name?.trim() || !category?.trim()) {
    res.status(400).json({ error: "bad_request", message: "id, name, and category are required" });
    return;
  }

  const existing = await db.select().from(assessmentToolsTable).where(eq(assessmentToolsTable.id, id.trim()));
  if (existing.length > 0) {
    res.status(409).json({ error: "conflict", message: "A tool with this ID already exists" });
    return;
  }

  const newTool = await db.insert(assessmentToolsTable).values({
    id: id.trim(),
    name: name.trim(),
    description: (description ?? "").trim(),
    category: category.trim(),
    scoringType: scoringType ?? "manual",
    domains: domains ?? [],
    respondentTypes: respondentTypes ?? [],
    isRemyndOwned: isRemyndOwned ?? false,
    formItems: Array.isArray(formItems) ? formItems : null,
  }).returning();

  res.status(201).json(newTool[0]);
});

router.post("/assessment-tools/analyze", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can analyze forms" });
    return;
  }
  const { formText, imageBase64, mimeType } = req.body as {
    formText?: string;
    imageBase64?: string;
    mimeType?: string;
  };
  if (!formText && !imageBase64) {
    res.status(400).json({ error: "bad_request", message: "formText or imageBase64 is required" });
    return;
  }
  const result = await analyzeFormWithAI({ formText, imageBase64, mimeType });
  res.json(result);
});

router.post("/assessment-tools/recommend", authMiddleware, async (req, res) => {
  const { caseId, domains, riskLevel } = req.body;
  const allTools = await db.select().from(assessmentToolsTable);

  const recommendations = await recommendToolsWithAI({ domains, riskLevel, allTools });
  res.json(recommendations);
});

export default router;
