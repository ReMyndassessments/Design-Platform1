import { Router } from "express";
import { db } from "@workspace/db";
import { reportDraftsTable, usersTable } from "@workspace/db/schema";
import { eq, desc, max } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage.js";
import { randomUUID } from "crypto";
import { Readable } from "stream";

const router = Router();
const storage = new ObjectStorageService();

// ── List all drafts for a case ──────────────────────────────────────────────
router.get("/cases/:id/report-drafts", authMiddleware, async (req, res) => {
  const allowed = ["admin", "assessment_invigilator"];
  if (!allowed.includes(req.userRole ?? "")) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const drafts = await db
    .select()
    .from(reportDraftsTable)
    .where(eq(reportDraftsTable.caseId, req.params.id))
    .orderBy(desc(reportDraftsTable.version));

  res.json({ drafts });
});

// ── Upload a new draft version ──────────────────────────────────────────────
router.post("/cases/:id/report-drafts", authMiddleware, async (req, res) => {
  const allowed = ["admin", "assessment_invigilator"];
  if (!allowed.includes(req.userRole ?? "")) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const { fileKey, filename, note } = req.body as {
    fileKey: string;
    filename: string;
    note?: string;
  };

  if (!fileKey || !filename) {
    res.status(400).json({ error: "fileKey and filename are required" }); return;
  }

  // Determine next version number
  const [maxRow] = await db
    .select({ maxVer: max(reportDraftsTable.version) })
    .from(reportDraftsTable)
    .where(eq(reportDraftsTable.caseId, req.params.id));

  const nextVersion = (maxRow?.maxVer ?? 0) + 1;

  // If first version, mark it active. Otherwise, keep existing active unchanged.
  const isFirstVersion = nextVersion === 1;

  // If this is not the first version, leave existing active as-is
  // (admin must explicitly pin a version as active)
  // Resolve uploader's display name
  const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  const uploaderName = userRow ? `${userRow.firstName ?? ""} ${userRow.lastName ?? ""}`.trim() || userRow.email : "Unknown";

  const draft = {
    id: randomUUID(),
    caseId: req.params.id,
    version: nextVersion,
    fileKey,
    filename,
    uploadedBy: req.userId!,
    uploaderName,
    note: note ?? null,
    isActive: isFirstVersion,
  };

  await db.insert(reportDraftsTable).values(draft);

  res.json({ draft });
});

// ── Set a specific version as the active (pinned) version ───────────────────
router.patch("/cases/:id/report-drafts/:draftId/activate", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "only admins can set the active version" }); return;
  }

  // Deactivate all, then activate the chosen one
  await db
    .update(reportDraftsTable)
    .set({ isActive: false })
    .where(eq(reportDraftsTable.caseId, req.params.id));

  await db
    .update(reportDraftsTable)
    .set({ isActive: true })
    .where(eq(reportDraftsTable.id, req.params.draftId));

  res.json({ ok: true });
});

// ── Download a specific draft version ───────────────────────────────────────
router.get("/cases/:id/report-drafts/:draftId/download", authMiddleware, async (req, res) => {
  const allowed = ["admin", "assessment_invigilator"];
  if (!allowed.includes(req.userRole ?? "")) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const [draft] = await db
    .select()
    .from(reportDraftsTable)
    .where(eq(reportDraftsTable.id, req.params.draftId));

  if (!draft || draft.caseId !== req.params.id) {
    res.status(404).json({ error: "not_found" }); return;
  }

  try {
    const response = await storage.downloadObject({ fileKey: draft.fileKey });
    res.status(response.status);
    res.setHeader("Content-Disposition", `attachment; filename="${draft.filename}"`);
    const ct = response.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "file_not_found" }); return;
    }
    console.error("Error downloading draft", err);
    res.status(500).json({ error: "download_failed" });
  }
});

export default router;
