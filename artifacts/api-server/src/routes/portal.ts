import { Router } from "express";
import { db } from "@workspace/db";
import { inquiriesTable } from "@workspace/db/schema";
import { nanoid } from "nanoid";
import { sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { sendInquiryNotification } from "../lib/outlookEmail.js";

const router = Router();

const NOTIFY_EMAIL = process.env.INQUIRY_NOTIFY_EMAIL || "ne-roberts@yahoo.com";

router.post("/portal/inquiry", async (req, res) => {
  const {
    inquiryType,
    contactName,
    contactEmail,
    contactPhone,
    organisation,
    role,
    studentName,
    studentAge,
    yearGroup,
    message,
    wechatId,
    whatsappId,
  } = req.body;

  if (!inquiryType || !contactName || !contactEmail || !message) {
    res.status(400).json({ error: "bad_request", message: "Missing required fields" });
    return;
  }

  if (!["school", "parent"].includes(inquiryType)) {
    res.status(400).json({ error: "bad_request", message: "Invalid inquiry type" });
    return;
  }

  const row = await db.insert(inquiriesTable).values({
    id: nanoid(),
    inquiryType,
    contactName,
    contactEmail,
    contactPhone: contactPhone || null,
    organisation: organisation || null,
    role: role || null,
    studentName: studentName || null,
    studentAge: studentAge || null,
    yearGroup: yearGroup || null,
    message,
    status: "new",
  }).returning();

  sendInquiryNotification(
    {
      inquiryType,
      contactName,
      contactEmail,
      contactPhone,
      organisation,
      role,
      studentName,
      studentAge,
      yearGroup,
      message,
      wechatId,
      whatsappId,
    },
    NOTIFY_EMAIL
  ).catch((err) => {
    console.error("[email] Failed to send inquiry notification:", err?.message ?? err);
  });

  res.status(201).json({ success: true, id: row[0]?.id });
});

router.get("/portal/inquiries", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const rows = await db
    .select()
    .from(inquiriesTable)
    .orderBy(sql`${inquiriesTable.createdAt} DESC`);

  res.json(rows);
});

router.patch("/portal/inquiries/:id/status", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const { status } = req.body;
  const validStatuses = ["new", "contacted", "converted", "closed"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "bad_request", message: "Invalid status" });
    return;
  }

  await db
    .update(inquiriesTable)
    .set({ status, updatedAt: new Date() })
    .where(sql`${inquiriesTable.id} = ${req.params.id}`);

  res.json({ success: true });
});

export default router;
