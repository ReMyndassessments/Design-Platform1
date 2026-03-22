import { Router } from "express";
import { db } from "@workspace/db";
import { assessmentToolsTable } from "@workspace/db/schema";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { recommendToolsWithAI, analyzeFormWithAI, lookupToolWithAI } from "../lib/ai.js";
import { SAMPLE_QUESTIONS } from "../lib/questions.js";
import { eq } from "drizzle-orm";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

async function extractTextFromFile(fileBase64: string, fileName: string): Promise<string> {
  const buffer = Buffer.from(fileBase64, "base64");
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) {
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer) as { text: string };
    return result.text;
  }

  if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    const mammoth = require("mammoth");
    const result = await (mammoth as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> })
      .extractRawText({ buffer });
    return result.value;
  }

  return buffer.toString("utf-8");
}

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

router.post("/assessment-tools/lookup", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can look up tool metadata" });
    return;
  }
  const { toolId, toolName } = req.body as { toolId?: string; toolName?: string };
  if (!toolId?.trim() || !toolName?.trim()) {
    res.status(400).json({ error: "bad_request", message: "toolId and toolName are required" });
    return;
  }
  const result = await lookupToolWithAI(toolId.trim(), toolName.trim());
  res.json(result);
});

router.post("/assessment-tools/analyze", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can analyze forms" });
    return;
  }
  const { formText, imageBase64, mimeType, fileBase64, fileName } = req.body as {
    formText?: string;
    imageBase64?: string;
    mimeType?: string;
    fileBase64?: string;
    fileName?: string;
  };

  if (!formText && !imageBase64 && !fileBase64) {
    res.status(400).json({ error: "bad_request", message: "formText, imageBase64, or fileBase64 is required" });
    return;
  }

  let resolvedText = formText;
  if (fileBase64 && fileName && !imageBase64) {
    resolvedText = await extractTextFromFile(fileBase64, fileName);
    if (!resolvedText?.trim()) {
      res.status(422).json({ error: "extract_failed", message: "Could not extract text from this file. Try copy-pasting the content instead." });
      return;
    }
  }

  const result = await analyzeFormWithAI({ formText: resolvedText, imageBase64, mimeType });
  res.json(result);
});

router.post("/assessment-tools/recommend", authMiddleware, async (req, res) => {
  const { caseId, domains, riskLevel } = req.body;
  const allTools = await db.select().from(assessmentToolsTable);

  const recommendations = await recommendToolsWithAI({ domains, riskLevel, allTools });
  res.json(recommendations);
});

export default router;
