export type QuestionnaireTestResult = {
  status: "not_tested" | "passed" | "failed" | "retest_required";
  testedBy?: string | null;
  testedById?: string;
  testedAt?: string;
  language?: string;
  notes?: string;
  sharedFromAssignmentId?: string;
  sharedFromLabel?: string;
};

export type PreviewCheck = {
  passed: boolean;
  language: string;
  answers: Record<string, string | string[]>;
};

export function normalizeTestLanguage(language: string): string {
  const value = language.trim().toLowerCase();
  if (["chinese", "mandarin", "zh", "zh-cn", "zh-tw"].includes(value)) return "mandarin";
  if (["korean", "ko", "ko-kr"].includes(value)) return "korean";
  if (!value || ["english", "en", "en-us", "en-gb"].includes(value)) return "english";
  return value;
}

export const TEST_STATUS_LABELS: Record<QuestionnaireTestResult["status"], string> = {
  not_tested: "Not tested",
  passed: "Questionnaire test passed",
  failed: "Failed / needs correction",
  retest_required: "Retest required",
};