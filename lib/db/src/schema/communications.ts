import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Communications records deliberately reference source records by type/id; they never copy them. */
export const communicationTemplatesTable = pgTable("communication_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  archivedAt: timestamp("archived_at"),
});

export const communicationDraftsTable = pgTable("communication_drafts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull().default(""),
  html: text("html").notNull().default(""),
  audience: jsonb("audience").notNull().default({}),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const communicationBrandSettingsTable = pgTable("communication_brand_settings", {
  id: text("id").primaryKey(),
  settings: jsonb("settings").notNull().default({}),
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const communicationCampaignsTable = pgTable("communication_campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  kind: text("kind").notNull().default("promotional"),
  provider: text("provider").notNull().default("gmail"),
  providerCampaignId: text("provider_campaign_id"),
  audience: jsonb("audience").notNull().default({}),
  status: text("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const communicationRecipientsTable = pgTable("communication_recipients", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull(),
  email: text("email").notNull(),
  name: text("name"),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  providerMessageId: text("provider_message_id"),
  unsubscribeToken: text("unsubscribe_token").unique(),
  error: text("error"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  bouncedAt: timestamp("bounced_at"),
  complainedAt: timestamp("complained_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const communicationDeliveryEventsTable = pgTable("communication_delivery_events", {
  id: text("id").primaryKey(),
  eventKey: text("event_key").notNull().unique(),
  campaignId: text("campaign_id").notNull(),
  recipientId: text("recipient_id").notNull(),
  provider: text("provider").notNull(),
  eventType: text("event_type").notNull(),
  occurredAt: timestamp("occurred_at"),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const communicationSuppressionsTable = pgTable("communication_suppressions", {
  email: text("email").primaryKey(),
  kind: text("kind").notNull().default("unsubscribe"),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const communicationAssetsTable = pgTable("communication_assets", {
  id: text("id").primaryKey(),
  objectPath: text("object_path").notNull(),
  name: text("name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  altText: text("alt_text"),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});