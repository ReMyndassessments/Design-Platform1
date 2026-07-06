import { pgTable, text, integer, boolean, real, timestamp, jsonb } from "drizzle-orm/pg-core";

export const rmraSessionsTable = pgTable("rmra_sessions", {
  id: text("id").primaryKey(),
  caseId: text("case_id"),
  assignmentId: text("assignment_id"),
  examinerId: text("examiner_id"),
  ageBand: text("age_band").notNull().default("upper_primary"),
  version: text("version").notNull().default("full"),
  theme: text("theme").notNull().default("space_mission"),
  status: text("status").notNull().default("not_started"),
  currentTaskId: text("current_task_id"),
  generalNotes: text("general_notes"),
  domainScores: jsonb("domain_scores").$type<Record<string, {
    accuracy: number;
    reasoning: number;
    strategyLevel: number;
    hintDependency: number;
    productiveStruggle: number;
    confidence: number;
    tasksAdministered: number;
    tasksDiscontinued: number;
    level: "strength" | "developing" | "vulnerable" | "high_concern";
  }>>(),
  reportData: jsonb("report_data").$type<{
    narrative: {
      overview: string;
      behavioralObservations: string;
      mathematicalProfile: string;
      strategyUseProfile: string;
      strengths: string[];
      areasOfNeed: string[];
      classroomRecommendations: string[];
      parentRecommendations: string[];
    };
    generatedAt: string;
  }>(),
  timerStartedAt: timestamp("timer_started_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const rmraTaskResponsesTable = pgTable("rmra_task_responses", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  domain: text("domain").notNull(),
  taskId: text("task_id").notNull(),
  ageBand: text("age_band").notNull(),
  accuracy: integer("accuracy"),
  reasoning: integer("reasoning"),
  strategyLevel: integer("strategy_level"),
  strategyLabel: text("strategy_label"),
  hintLevel: integer("hint_level").notNull().default(0),
  attempts: integer("attempts").notNull().default(1),
  selfCorrection: boolean("self_correction").notNull().default(false),
  confidenceRating: integer("confidence_rating"),
  responseTimeSeconds: real("response_time_seconds"),
  firstResponse: text("first_response"),
  finalResponse: text("final_response"),
  productiveStrugglePersistence: integer("productive_struggle_persistence"),
  productiveStruggleFlexibility: integer("productive_struggle_flexibility"),
  productiveStruggleEmotionalRegulation: integer("productive_struggle_emotional_regulation"),
  productiveStruggleErrorRecovery: integer("productive_struggle_error_recovery"),
  productiveStruggleHelpUtilization: integer("productive_struggle_help_utilization"),
  discontinued: boolean("discontinued").notNull().default(false),
  discontinuationReason: text("discontinuation_reason"),
  examinerNotes: text("examiner_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const rmraAccessCodesTable = pgTable("rmra_access_codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  description: text("description"),
  usageLimit: integer("usage_limit").notNull().default(1),
  usageCount: integer("usage_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type RmraSession = typeof rmraSessionsTable.$inferSelect;
export type RmraTaskResponse = typeof rmraTaskResponsesTable.$inferSelect;
export type RmraAccessCode = typeof rmraAccessCodesTable.$inferSelect;
