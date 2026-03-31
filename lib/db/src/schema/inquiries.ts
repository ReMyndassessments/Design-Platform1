import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const inquiryTypeEnum = pgEnum("inquiry_type", ["school", "parent"]);
export const inquiryStatusEnum = pgEnum("inquiry_status", ["new", "contacted", "converted", "closed"]);

export const inquiriesTable = pgTable("inquiries", {
  id: text("id").primaryKey(),
  inquiryType: inquiryTypeEnum("inquiry_type").notNull(),
  status: inquiryStatusEnum("status").notNull().default("new"),

  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),

  organisation: text("organisation"),
  role: text("role"),

  studentName: text("student_name"),
  studentAge: text("student_age"),
  yearGroup: text("year_group"),

  message: text("message").notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
