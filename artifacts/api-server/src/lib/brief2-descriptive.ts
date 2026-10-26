export const BRIEF2_TOOL_IDS = ["BRIEF2-P", "BRIEF2-T", "BRIEF2-SR"] as const;

export type Brief2ToolId = (typeof BRIEF2_TOOL_IDS)[number];

export function isBrief2ToolId(toolId: string | null | undefined): toolId is Brief2ToolId {
  return BRIEF2_TOOL_IDS.includes(toolId as Brief2ToolId);
}

export interface Brief2FormItem {
  id: string;
  text: string;
  textChinese?: string;
  textKorean?: string;
  type: string;
  options?: string[];
  optionsChinese?: string[];
  optionsKorean?: string[];
  rows?: Brief2FormItem[];
}

export interface Brief2DescriptiveItem {
  id: string;
  prompt: string;
  response: string | null;
  state: "answered" | "missing";
}

export interface Brief2DescriptiveResponse {
  formId: Brief2ToolId;
  reportingState: "descriptive_only";
  provenanceState: "legacy_unverified" | "blocked";
  provenanceIssues: string[];
  formCompatibility: "expected_item_count" | "item_count_mismatch";
  completeness: {
    answered: number;
    missing: number;
    total: number;
  };
  sourceVerification: "unverified";
  responseValidity: "not_available";
  reviewerApproval: "not_reviewed";
  frequencyCounts: Record<string, number>;
  items: Brief2DescriptiveItem[];
  summary: string;
}

function getItemText(item: Brief2FormItem, language: string): string {
  if (language === "mandarin" || language === "cantonese") return item.textChinese || item.text;
  if (language === "korean") return item.textKorean || item.text;
  return item.text;
}

function formatRecordedResponse(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" || typeof value === "boolean") return `Recorded code/value: ${String(value)}`;
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim())) {
    return `Recorded code/value: ${value}`;
  }
  if (typeof value === "string") return value;
  try {
    return `Recorded value: ${JSON.stringify(value)}`;
  } catch {
    return "Recorded value (format unavailable)";
  }
}

export function buildBrief2DescriptiveResponse(input: {
  toolId: string;
  questions: Brief2FormItem[];
  answers: Record<string, unknown>;
  language: string;
}): Brief2DescriptiveResponse {
  if (!isBrief2ToolId(input.toolId)) throw new Error("Unsupported BRIEF-2 form ID");

  const items: Brief2DescriptiveItem[] = input.questions
    .filter(item => item.type !== "section_header" && item.type !== "heading" && item.type !== "instruction")
    .map(item => {
      const response = formatRecordedResponse(input.answers[item.id]);
      return {
        id: item.id,
        prompt: getItemText(item, input.language),
        response,
        state: response === null ? "missing" : "answered",
      };
    });

  const frequencyCounts: Record<string, number> = {};
  for (const item of items) {
    if (item.response !== null) frequencyCounts[item.response] = (frequencyCounts[item.response] ?? 0) + 1;
  }

  const answered = items.filter(item => item.state === "answered").length;
  const missing = items.length - answered;
  const expectedItemCount = input.toolId === "BRIEF2-SR" ? 55 : 63;
  const provenanceIssues: string[] = [];
  if (items.length !== expectedItemCount) {
    provenanceIssues.push(`This form contains ${items.length} response items; ${input.toolId} is expected to contain ${expectedItemCount}.`);
  }
  if (missing > 0) provenanceIssues.push(`${missing} item responses are missing.`);
  const frequencyText = Object.entries(frequencyCounts)
    .map(([label, count]) => `${label}: ${count}`)
    .join("; ");
  const summary = [
    `Descriptive response record for ${input.toolId}: ${answered} of ${items.length} items have recorded responses${missing ? `; ${missing} are unanswered` : ""}.`,
    frequencyText ? `Recorded response frequencies: ${frequencyText}.` : "No response frequencies are available.",
    "This is a non-standardized description of this administration only. Norm-based scores, percentiles, validity findings, and composites are unavailable.",
  ].join(" ");

  return {
    formId: input.toolId,
    reportingState: "descriptive_only",
    provenanceState: provenanceIssues.length > 0 ? "blocked" : "legacy_unverified",
    provenanceIssues,
    formCompatibility: items.length === expectedItemCount ? "expected_item_count" : "item_count_mismatch",
    completeness: { answered, missing, total: items.length },
    sourceVerification: "unverified",
    responseValidity: "not_available",
    reviewerApproval: "not_reviewed",
    frequencyCounts,
    items,
    summary,
  };
}
