import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const inquiryTypeEnum = pgEnum("inquiry_type", ["school", "parent", "partner_school"]);
export const inquiryStatusEnum = pgEnum("inquiry_status", ["new", "contacted", "converted", "closed"]);

export const inquiriesTable = pgTable("inquiries", {
  id: text("id").primaryKey(),
  inquiryType: inquiryTypeEnum("inquiry_type").notNull(),
  status: inquiryStatusEnum("status").notNull().default("new"),

  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  wechatId: text("wechat_id"),
  whatsappId: text("whatsapp_id"),

  organisation: text("organisation"),
  role: text("role"),

  studentName: text("student_name"),
  studentAge: text("student_age"),
  yearGroup: text("year_group"),

  message: text("message").notNull(),

  // Partner school specific fields
  schoolType: text("school_type"),
  schoolLocation: text("school_location"),
  enrollment: text("enrollment"),
  currentSupport: text("current_support"),
  howHeard: text("how_heard"),
  timeline: text("timeline"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
