import { Router } from "express";
import { db } from "@workspace/db";
import { inquiriesTable } from "@workspace/db/schema";
import { nanoid } from "nanoid";

const router = Router();

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

  res.status(201).json({ success: true, id: row[0]?.id });
});

export default router;
