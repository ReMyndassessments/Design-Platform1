import { buildResponseBasedScreeningNarrative } from "./response-based-screening-narrative.js";

export type PublisherScoredFamily = "BASC3" | "BYI2";

export function publisherScoredFamily(toolId: string | null | undefined): PublisherScoredFamily | null {
  if (toolId === "BASC3" || toolId?.startsWith("BASC3-")) return "BASC3";
  if (toolId === "BYI2") return "BYI2";
  return null;
}

export function isPublisherScoredToolId(toolId: string | null | undefined): boolean {
  return publisherScoredFamily(toolId) !== null;
}

export interface PublisherDescriptiveItem {
  id: string;
  prompt: string | null;
  promptEnglish: string | null;
  savedOptions: string[];
  englishOptions: string[];
  response: string | null;
  state: "answered" | "missing";
}

export interface PublisherResponseFrequencyGroup {
  savedOptions: string[];
  counts: Record<string, number>;
}

export interface PublisherDescriptiveRecord {
  family: PublisherScoredFamily;
  reportingState: "descriptive_only";
  standardizedScoringEligibility: "blocked";
  provenanceState: "legacy_unverified";
  formSource: "assignment_snapshot" | "not_saved";
  formItemCount: { captured: number; savedCurrentDefinition: number | null; matchesSavedDefinition: boolean | null };
  completeness: { answered: number; missing: number; total: number | null };
  administrationSuitability: "not_verified";
  sourceVerification: "unverified";
  responseValidity: "not_available";
  reviewerApproval: "not_reviewed";
  provenanceIssues: string[];
  responseFrequencyGroups: PublisherResponseFrequencyGroup[];
  items: PublisherDescriptiveItem[];
  summary: string;
}

interface SavedFormItem {
  id: string;
  text?: string;
  textChinese?: string;
  textKorean?: string;
  type?: string;
  options?: string[];
  optionsChinese?: string[];
  optionsKorean?: string[];
}

function displayedText(item: SavedFormItem, language: string): string | null {
  if (language === "mandarin" || language === "cantonese") return item.textChinese || item.text || null;
  if (language === "korean") return item.textKorean || item.text || null;
  return item.text || null;
}

function savedOptions(item: SavedFormItem, language: string): string[] {
  if (language === "mandarin" || language === "cantonese") return item.optionsChinese ?? item.options ?? [];
  if (language === "korean") return item.optionsKorean ?? item.options ?? [];
  return item.options ?? [];
}

function recordedValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" || typeof value === "boolean") return `Recorded code/value: ${String(value)}`;
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim())) {
    return `Recorded code/value: ${value}`;
  }
  if (typeof value === "string" && /^(true|false)$/i.test(value.trim())) {
    return `Recorded code/value: ${value}`;
  }
  if (typeof value === "string") return value;
  try {
    return `Recorded value: ${JSON.stringify(value)}`;
  } catch {
    return "Recorded value (format unavailable)";
  }
}

export function buildPublisherDescriptiveRecord(input: {
  toolId: string;
  questions: SavedFormItem[];
  answers: Record<string, unknown>;
  language: string;
  currentDefinitionItemCount?: number | null;
}): PublisherDescriptiveRecord {
  const family = publisherScoredFamily(input.toolId);
  if (!family) throw new Error("Unsupported publisher-scored tool ID");

  const questions = input.questions.filter(item =>
    item.type !== "section_header" && item.type !== "heading" && item.type !== "instruction"
  );
  const questionIds = new Set(questions.map(item => item.id));
  const items: PublisherDescriptiveItem[] = questions.map(item => {
    const response = recordedValue(input.answers[item.id]);
    return {
      id: item.id,
      prompt: displayedText(item, input.language),
      promptEnglish: item.text || null,
      savedOptions: savedOptions(item, input.language),
      englishOptions: item.options ?? [],
      response,
      state: response === null ? "missing" : "answered",
    };
  });

  // If no assignment snapshot was saved, preserve answer keys and values without
  // attaching current form text to historical responses.
  for (const [id, value] of Object.entries(input.answers)) {
    if (questionIds.has(id)) continue;
    const response = recordedValue(value);
    if (response === null) continue;
    items.push({ id, prompt: null, promptEnglish: null, savedOptions: [], englishOptions: [], response, state: "answered" });
  }

  const groups = new Map<string, PublisherResponseFrequencyGroup>();
  for (const item of items) {
    if (item.response === null) continue;
    const question = questions.find(q => q.id === item.id);
    const options = question ? savedOptions(question, input.language) : [];
    const key = JSON.stringify(options);
    const group = groups.get(key) ?? { savedOptions: options, counts: {} };
    group.counts[item.response] = (group.counts[item.response] ?? 0) + 1;
    groups.set(key, group);
  }

  const answered = items.filter(item => item.state === "answered").length;
  const missing = items.filter(item => item.state === "missing").length;
  const formSource = input.questions.length > 0 ? "assignment_snapshot" : "not_saved";
  const matchesSavedDefinition = input.currentDefinitionItemCount == null || formSource === "not_saved"
    ? null
    : questions.length === input.currentDefinitionItemCount;
  const provenanceIssues = [
    "This local form and its item/scale mapping have not been verified against the applicable licensed publisher edition.",
    "Publisher-generated standard scores and response-validity results are not attached to this administration.",
    "The saved language/translation has not been verified as equivalent to the licensed edition.",
  ];
  if (formSource === "not_saved") {
    provenanceIssues.push("No assignment-time form snapshot was saved; current form text was not substituted for historical item text.");
  }
  if (matchesSavedDefinition === false) {
    provenanceIssues.push("The saved assignment item count differs from the current RAOS form definition.");
  }
  if (missing > 0) provenanceIssues.push(`${missing} item responses are unanswered.`);

  const summary = buildResponseBasedScreeningNarrative({
    instrument: family,
    answered,
    total: questions.length > 0 ? questions.length : null,
    items: items.map(item => ({
      prompt: item.prompt,
      response: item.response,
      options: item.savedOptions,
    })),
  });

  return {
    family,
    reportingState: "descriptive_only",
    standardizedScoringEligibility: "blocked",
    provenanceState: "legacy_unverified",
    formSource,
    formItemCount: {
      captured: questions.length,
      savedCurrentDefinition: input.currentDefinitionItemCount ?? null,
      matchesSavedDefinition,
    },
    completeness: { answered, missing, total: questions.length > 0 ? questions.length : null },
    administrationSuitability: "not_verified",
    sourceVerification: "unverified",
    responseValidity: "not_available",
    reviewerApproval: "not_reviewed",
    provenanceIssues,
    responseFrequencyGroups: Array.from(groups.values()),
    items,
    summary,
  };
}
