import { z } from "zod";

export const comparisonDraftSchema = z.object({
  overallSummary: z.string().trim().min(1).max(12000),
  parentHome: z.string().trim().min(1).max(12000),
  teacherClassroom: z.string().trim().min(1).max(12000),
  crossSetting: z.string().trim().min(1).max(16000),
  recommendations: z.array(z.string().trim().min(1).max(3000)).min(1).max(8),
  limitations: z.string().trim().min(1).max(5000),
}).strict();

export const savedComparisonDraftSchema = comparisonDraftSchema.extend({
  // Older saved snapshots predate the student-level synthesis; allow them to load and prompt regeneration.
  overallSummary: z.string().trim().max(12000).default(""),
});
