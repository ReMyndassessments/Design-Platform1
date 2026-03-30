CREATE TYPE "public"."user_role" AS ENUM('admin', 'assessment_invigilator', 'psychometrician');--> statement-breakpoint
CREATE TYPE "public"."case_phase" AS ENUM('pre_commitment', 'intake', 'setup', 'forms', 'assessment', 'scoring', 'report', 'debrief', 'complete');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('active', 'on_hold', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('english', 'mandarin', 'cantonese');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'moderate', 'high');--> statement-breakpoint
CREATE TYPE "public"."scoring_type" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('not_started', 'in_progress', 'completed', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."respondent_type" AS ENUM('parent', 'teacher1', 'teacher2', 'student', 'self', 'school_counselor', 'special_needs_teacher', 'referring_teacher', 'boarding_staff', 'invigilator');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('draft', 'approved', 'exported');--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'assessment_invigilator' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" text PRIMARY KEY NOT NULL,
	"student_name" text NOT NULL,
	"dob" text NOT NULL,
	"school" text NOT NULL,
	"grade" text,
	"language_preference" "language" DEFAULT 'english' NOT NULL,
	"referral_reason" text NOT NULL,
	"case_status" "case_status" DEFAULT 'active' NOT NULL,
	"current_phase" "case_phase" DEFAULT 'pre_commitment' NOT NULL,
	"progress_percentage" integer DEFAULT 0 NOT NULL,
	"risk_level" "risk_level",
	"assigned_lead_id" text,
	"assigned_psych_id" text,
	"parent_name" text,
	"parent_email" text,
	"parent_phone" text,
	"consent_obtained" boolean DEFAULT false NOT NULL,
	"intake_data" jsonb,
	"intake_analysis" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_tools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_remynd_owned" boolean DEFAULT false NOT NULL,
	"respondent_types" jsonb NOT NULL,
	"scoring_type" "scoring_type" DEFAULT 'auto' NOT NULL,
	"domains" jsonb NOT NULL,
	"form_items" jsonb,
	"scoring_config" jsonb,
	"product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"tool_id" text NOT NULL,
	"tool_name" text NOT NULL,
	"respondent_type" "respondent_type" NOT NULL,
	"respondent_label" text NOT NULL,
	"assigned_to_name" text,
	"assigned_to_email" text,
	"unique_token" text NOT NULL,
	"unique_link" text NOT NULL,
	"qr_code_data" text NOT NULL,
	"status" "assignment_status" DEFAULT 'not_started' NOT NULL,
	"due_date" timestamp,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assignments_unique_token_unique" UNIQUE("unique_token")
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"language" text DEFAULT 'english' NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"summary" text
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"tool_id" text NOT NULL,
	"tool_name" text NOT NULL,
	"respondent_type" text NOT NULL,
	"raw_score" real,
	"domain_scores" jsonb NOT NULL,
	"normalized_scores" jsonb NOT NULL,
	"agreement_index" real,
	"has_high_discrepancy" boolean DEFAULT false NOT NULL,
	"is_manual" boolean DEFAULT false NOT NULL,
	"notes" text,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"status" "report_status" DEFAULT 'draft' NOT NULL,
	"background_summary" text DEFAULT '' NOT NULL,
	"domain_analysis" text DEFAULT '' NOT NULL,
	"strengths" text DEFAULT '' NOT NULL,
	"areas_of_concern" text DEFAULT '' NOT NULL,
	"cross_setting_comparison" text DEFAULT '' NOT NULL,
	"recommendations" text DEFAULT '' NOT NULL,
	"admin_notes" text,
	"generated_at" timestamp,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reports_case_id_unique" UNIQUE("case_id")
);
--> statement-breakpoint
CREATE TABLE "batteries" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tool_ids" jsonb NOT NULL,
	"is_remynd_owned" boolean DEFAULT false NOT NULL,
	"domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scoring_notes" text
);
