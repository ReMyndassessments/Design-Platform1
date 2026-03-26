import { Router } from "express";
import { db } from "@workspace/db";
import { assessmentToolsTable } from "@workspace/db/schema";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { recommendToolsWithAI, analyzeFormWithAI, translateFormItemsWithAI, lookupToolWithAI } from "../lib/ai.js";
import { SAMPLE_QUESTIONS } from "../lib/questions.js";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

async function extractTextFromFile(fileBase64: string, fileName: string): Promise<string> {
  const buffer = Buffer.from(fileBase64, "base64");
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) {
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule.default ?? pdfParseModule) as (buf: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    const mammothModule = await import("mammoth");
    const mammoth = (mammothModule.default ?? mammothModule) as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
    const result = await mammoth.extractRawText({ buffer });
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

  const rows = await db.select().from(assessmentToolsTable).where(eq(assessmentToolsTable.id, id));
  const tool = rows[0];

  if (tool?.formItems && Array.isArray(tool.formItems) && tool.formItems.length > 0) {
    type StoredItem = {
      id: string;
      text: string;
      textChinese?: string;
      textKorean?: string;
      type: string;
      options?: string[];
      optionsChinese?: string[];
      optionsKorean?: string[];
      domain?: string;
      required?: boolean;
    };
    const typeMap: Record<string, string> = {
      checkbox: "checkbox_group",
      radio: "radio_group",
      multiple_choice: "radio_group",
    };
    const questions = (tool.formItems as StoredItem[]).map(item => ({
      id: item.id,
      text: item.text,
      textChinese: item.textChinese,
      textKorean: item.textKorean,
      type: typeMap[item.type] ?? item.type,
      options: item.options,
      optionsChinese: item.optionsChinese,
      optionsKorean: item.optionsKorean,
      domain: item.domain ?? "",
      required: item.required ?? true,
    }));
    res.json({ toolId: id, questions });
    return;
  }

  const questions = SAMPLE_QUESTIONS[id] ?? SAMPLE_QUESTIONS["default"];
  res.json({ toolId: id, questions });
});

router.patch("/assessment-tools/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, description, category, scoringType, domains, respondentTypes, formItems, scoringConfig } = req.body;

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
      ...(formItems !== undefined && { formItems: Array.isArray(formItems) ? formItems : null }),
      ...(scoringConfig !== undefined && { scoringConfig: scoringConfig ?? null }),
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

  const { id, name, description, category, scoringType, domains, respondentTypes, isRemyndOwned, formItems, scoringConfig } = req.body;
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
    scoringConfig: scoringConfig ?? null,
  }).returning();

  res.status(201).json(newTool[0]);
});

router.post("/assessment-tools/lookup", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can look up tool metadata" });
    return;
  }
  const { toolId, toolName } = req.body as { toolId?: string; toolName?: string };
  if (!toolId?.trim() && !toolName?.trim()) {
    res.status(400).json({ error: "bad_request", message: "toolId or toolName is required" });
    return;
  }
  const query = [toolId, toolName].filter(Boolean).join(" – ");
  const result = await lookupToolWithAI(query);
  res.json(result);
});

router.post("/assessment-tools/quick-add", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can add tools" });
    return;
  }
  const { query } = req.body as { query?: string };
  if (!query?.trim()) {
    res.status(400).json({ error: "bad_request", message: "query is required" });
    return;
  }

  const meta = await lookupToolWithAI(query.trim());

  let toolId = meta.suggestedId;
  const existing = await db.select({ id: assessmentToolsTable.id })
    .from(assessmentToolsTable)
    .where(eq(assessmentToolsTable.id, toolId));

  if (existing.length > 0) {
    let suffix = 2;
    while (true) {
      const candidate = `${toolId.slice(0, 8)}${suffix}`;
      const dupe = await db.select({ id: assessmentToolsTable.id })
        .from(assessmentToolsTable)
        .where(eq(assessmentToolsTable.id, candidate));
      if (!dupe.length) { toolId = candidate; break; }
      suffix++;
    }
  }

  const newTool = await db.insert(assessmentToolsTable).values({
    id: toolId,
    name: meta.name,
    description: meta.description,
    category: meta.category,
    scoringType: meta.scoringType,
    domains: meta.domains,
    respondentTypes: meta.respondentTypes,
    isRemyndOwned: false,
    formItems: null,
  }).returning();

  res.status(201).json(newTool[0]);
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

  const MAX_CHARS = 14_000;
  let resolvedText = formText;
  if (fileBase64 && fileName && !imageBase64) {
    try {
      resolvedText = await extractTextFromFile(fileBase64, fileName);
    } catch (extractErr) {
      logger.error({ err: extractErr, fileName }, "PDF/file extraction failed");
      res.status(422).json({ error: "extract_failed", message: "Could not read this file. Try copy-pasting the content instead." });
      return;
    }
    if (!resolvedText?.trim()) {
      res.status(422).json({ error: "extract_failed", message: "Could not extract text from this file. Try copy-pasting the content instead." });
      return;
    }
  }
  // Strip CJK characters — bilingual forms double the token count unnecessarily for English extraction
  if (resolvedText) {
    resolvedText = resolvedText
      .replace(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff]/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  if (resolvedText && resolvedText.length > MAX_CHARS) {
    resolvedText = resolvedText.slice(0, MAX_CHARS);
  }

  try {
    const TIMEOUT_MS = 140_000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI analysis timed out. Please try again or use a shorter form.")), TIMEOUT_MS)
    );
    const result = await Promise.race([
      analyzeFormWithAI({ formText: resolvedText, imageBase64, mimeType }),
      timeoutPromise,
    ]);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI analysis failed. Please try again.";
    res.status(502).json({ error: "ai_failed", message: msg });
  }
});

router.post("/assessment-tools/translate", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can translate form items" });
    return;
  }
  const { items } = req.body as { items?: unknown[] };
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "bad_request", message: "items array is required" });
    return;
  }
  try {
    const TIMEOUT_MS = 300_000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Translation timed out")), TIMEOUT_MS)
    );
    const translated = await Promise.race([
      translateFormItemsWithAI(items as Parameters<typeof translateFormItemsWithAI>[0]),
      timeoutPromise,
    ]);
    res.json({ items: translated });
  } catch (err) {
    req.log.error({ err }, "translate route error — returning original English items");
    res.status(200).json({ items });
  }
});

router.post("/assessment-tools/recommend", authMiddleware, async (req, res) => {
  const { caseId, domains, riskLevel } = req.body;
  const allTools = await db.select().from(assessmentToolsTable);

  const recommendations = await recommendToolsWithAI({ domains, riskLevel, allTools });
  res.json(recommendations);
});

export default router;
