import { z } from "zod/v4";

export const CHINESE_LITERACY_KEY = "REMYND_CHINESE_LITERACY_TEACHER_OBSERVATION";
export const CHINESE_LITERACY_VERSION = "0.1.0";
export const CHINESE_LITERACY_SCORING_VERSION = "descriptive-domain-v0.1.0";
export const LITERACY_INTRODUCTION = "Use this form to document Chinese literacy patterns observed during ordinary teaching and to plan classroom support. One teacher can complete it. Parent forms, student questionnaires, and separate assessment tasks are not required.";
export const LITERACY_LIMITATION = "This educational profile has not been validated as a dyslexia screener. It does not diagnose or rule out dyslexia or another condition. Findings describe classroom observations and should guide professional review and support.";
export const LITERACY_REPORT_LIMITATION = "This non-diagnostic teacher observation profile describes Chinese literacy and classroom learning patterns reported by the named teacher during the documented period. It guides instruction and support. It does not establish or exclude dyslexia or another diagnosis, and its scores are not compared with population norms.";
export const LITERACY_ANCHORS = [
  "1 Never or almost never — absent or exceptional in relevant observed opportunities.",
  "2 Occasionally — appears on some occasions but is not a recurring pattern.",
  "3 Sometimes — recurs, although successful performance also occurs regularly.",
  "4 Often — occurs in many relevant opportunities.",
  "5 Almost always — occurs in nearly every relevant observed opportunity.",
  "NO Not observed — insufficient relevant evidence.",
  "NA Not applicable — not relevant to the taught curriculum or task; reason required.",
];

export function domain(id: string, label: string, requirement: "core" | "contextual" | "optional", text: string) {
  return { id, label, requirement, items: text.split("\n").map(line => {
    const split = line.indexOf(" — ");
    return { id: line.slice(0, split), text: line.slice(split + 3), translationKey: `chineseLiteracy.items.${line.slice(0, split)}` };
  }) };
}

export const LITERACY_DOMAINS = [
  domain("R", "Reading", "core", `R1 — Understands comparable content less successfully when reading it independently than when hearing it.
R2 — Has difficulty recognizing taught or frequently encountered Chinese characters or words.
R3 — Has difficulty explaining the meaning of sentences read independently.
R4 — Has difficulty identifying the main idea and supporting information in an appropriate passage.
R5 — Misreads taught characters or words during oral reading.
R6 — Frequently pauses or stops because characters or words are not recognized.
R7 — Has difficulty using punctuation and sentence boundaries to guide phrasing and meaning.
R8 — Confuses similar-sounding characters or words when reading, after considering spoken variety and instruction.
R9 — Has difficulty accessing texts expected within the curriculum the student has been taught.
R10 — Has difficulty finding reading-related errors in their work when explicitly shown how to check.`),
  domain("D", "Dictation and transcription", "core", `D1 — Omits or incorrectly writes taught characters or words during dictation.
D2 — Makes character or word transcription errors when copying from an accessible nearby model.
D3 — Needs extra time to copy accurately from an accessible model.
D4 — Omits or loses the place in text when copying from a board or screen.
D5 — Writes the same taught character or word inconsistently across comparable attempts.`),
  domain("W", "Written expression", "core", `W1 — Can explain or say a known word but has difficulty retrieving its written character form.
W2 — Communicates ideas less fully in writing than in a comparable oral response.
W3 — Has difficulty using punctuation to make written meaning clear after relevant instruction.
W4 — Has difficulty organizing words or clauses into a meaningful sentence.
W5 — Has difficulty organizing written ideas clearly for the task and audience.
W6 — Uses sentence structures that obscure intended meaning, after considering Chinese proficiency and instruction.
W7 — Omits, adds, or reorders characters or words in ways that change intended meaning.`),
  domain("CL", "Chinese literacy patterns", "core", `CL1 — Confuses taught characters with visually similar components or arrangements.
CL2 — Omits, substitutes, or misplaces components when writing taught characters.
CL3 — Has difficulty using explicitly taught semantic radicals to support character meaning.
CL4 — Has difficulty using explicitly taught phonetic components as pronunciation clues when those clues are useful.
CL5 — Has difficulty identifying familiar meaningful parts within a compound word after relevant instruction.
CL6 — Has difficulty distinguishing the meanings of familiar same-sounding words through sentence context.
CL7 — Has difficulty using familiar word parts and context to work out the meaning of a new compound.
CL8 — Retrieves familiar character or word names slowly during everyday reading tasks.
CL9 — Has difficulty recognizing the same taught characters across familiar fonts or appropriate print and digital formats.
CL10 — Has difficulty grouping characters into meaningful words or phrases during passage reading.
CL11 — Has difficulty learning and retaining newly taught character forms across successive opportunities.
CL12 — Needs substantial support to use taught characters or words in a new sentence or text.`),
  domain("GP", "General performance", "contextual", `GP1 — Repeatedly erases or rewrites during literacy tasks because producing or checking the written response is difficult.
GP2 — Shows markedly variable literacy performance across comparable tasks or occasions.
GP3 — Demonstrates understanding in discussion more successfully than in written assessment.
GP4 — Has difficulty demonstrating learned content in written assessments despite documented preparation.
GP5 — Has difficulty retrieving taught characters or words in dictation after practice.
GP6 — Needs substantially more effort or time to complete literacy tasks than the instructional task allows.`),
  domain("CN", "Attention and task engagement", "contextual", `CN1 — Loses task focus because attention shifts to competing stimuli.
CN2 — Has difficulty sustaining attention long enough to complete an accessible learning activity.
CN3 — Loses recently presented information before using it, despite evidence of initial understanding.`),
  domain("MM", "Memory for learning", "contextual", `MM1 — Has difficulty recalling recently taught information during relevant learning activities.
MM2 — Loses parts of a multi-step instruction after first demonstrating understanding.
MM3 — Needs repeated presentation to retain an understood classroom message or instruction.
MM4 — Has difficulty recalling familiar names or subject vocabulary when needed.
MM5 — Has difficulty retaining a short, meaningful verbal sequence after supported practice.
MM6 — Has difficulty remembering relevant timetable or deadline information without external reminders.
MM7 — Has difficulty recalling previously learned information needed for a current task.`),
  domain("SQ", "Sequencing and organization", "contextual", `SQ1 — Has difficulty producing taught characters in a workable stroke sequence during handwriting.
SQ2 — Has difficulty organizing dates or deadlines in a familiar, explicitly taught format.
SQ3 — Has difficulty interpreting time relationships needed for the task, such as before, after, earlier, or later.
SQ4 — Has difficulty recounting events or following a procedure in a coherent sequence.
SQ5 — Has difficulty estimating or planning the time needed for a learning activity.`),
  domain("L", "Oral language", "contextual", `L1 — Needs additional time to understand and respond during communication in a familiar language.
L2 — Has difficulty expressing a clear, connected explanation in a familiar language.
L3 — Has difficulty selecting words that communicate the intended meaning in a familiar language.
L4 — Produces speech that is difficult to understand after considering dialect, accent, language exposure, and context.`),
  domain("SA", "Learning experience and wellbeing", "contextual", `SA1 — Delays or avoids literacy tasks that they experience as difficult.
SA2 — Experiences difficulty participating comfortably with others during literacy-related activities.
SA3 — Expresses negative beliefs about their competence as a learner.
SA4 — Becomes frustrated or disengages when literacy difficulty occurs.
SA5 — Reports or shows physical discomfort associated with stressful learning situations.`),
  domain("M", "Mathematics access", "optional", `M1 — Has difficulty selecting or using an effective strategy for a taught calculation.
M2 — Has difficulty interpreting the language of a mathematics problem.
M3 — Has difficulty demonstrating taught number and place-value concepts.
M4 — Confuses the meaning or use of taught mathematical symbols.
M5 — Has difficulty retrieving taught arithmetic facts when the task requires them.`),
  domain("SP", "Spatial and visual task access", "optional", `SP1 — Has difficulty using orientation cues such as left, right, above, or below during relevant tasks.
SP2 — Has difficulty keeping place or locating information on an accessible page, screen, diagram, or workspace.`),
  domain("MC", "Motor access", "optional", `MC1 — Has difficulty controlling handwriting sufficiently for an accessible written task.
MC2 — Has difficulty coordinating movement during relevant school activities.
MC3 — Experiences fatigue or discomfort that limits participation in observed motor tasks.
MC4 — Has difficulty accessing taught physical activities even when instructions and equipment are appropriate.
MC5 — Has difficulty coordinating object handling in relevant school tasks.
MC6 — Has difficulty following a taught movement or rhythmic sequence in a relevant activity.
MC7 — Has difficulty managing school materials or age-relevant practical tasks because of motor demands.`),
];

export const LITERACY_STRATEGIES = [
  { id: "character-recognition", label: "Character recognition or retrieval", type: "instruction", options: ["Preview taught vocabulary", "Accessible text", "Explicit character/component teaching and meaningful retrieval practice"] },
  { id: "character-structure", label: "Character structure or dictation", type: "instruction", options: ["Character references", "Component contrasts", "Retrieval within meaningful words", "Reduce unnecessary copying"] },
  { id: "reading-access", label: "Effortful reading", type: "accommodation", options: ["Read-aloud or audio access for content where appropriate", "Flexible time", "Supported reading with feedback"] },
  { id: "compound-meaning", label: "Compound meaning", type: "instruction", options: ["Explicitly teach familiar meaningful word parts and contextual use"] },
  { id: "written-organization", label: "Written organization", type: "instruction", options: ["Oral planning", "Models and organizers", "Sentence construction", "Revision routines", "Appropriate alternate response modes"] },
  { id: "instructions-organization", label: "Instructions or organization", type: "accommodation", options: ["Written steps", "Chunked instructions", "Checking routines", "Visual schedules"] },
  { id: "literacy-frustration", label: "Literacy-related frustration", type: "accommodation", options: ["Predictable support", "Private rehearsal", "Meaningful choice", "Successful participation", "Help-seeking routines"] },
];
export const LITERACY_METADATA = {
  key: CHINESE_LITERACY_KEY, name: "ReMynd Chinese Literacy Observation Profile",
  formName: "Teacher Form for Grades 3–12", version: CHINESE_LITERACY_VERSION,
  scoringVersion: CHINESE_LITERACY_SCORING_VERSION, status: "Developmental educational profile",
  minimumRespondents: 1, secondTeacher: "optional", introduction: LITERACY_INTRODUCTION,
  limitation: LITERACY_LIMITATION, reportLimitation: LITERACY_REPORT_LIMITATION,
  domains: LITERACY_DOMAINS, anchors: LITERACY_ANCHORS, strategies: LITERACY_STRATEGIES,
  strategyVersion: "0.1.0",
  translationStatus: { english: "source", mandarin: "translated_pending_bilingual_review", korean: "pending_bilingual_review", traditionalChinese: "pending_bilingual_review" },
  gradeExamples: { "3–5": "Use recently taught characters, short curriculum passages and accessible nearby copying models.", "6–8": "Use taught subject vocabulary, curriculum passages and short explanations.", "9–12": "Use age-respectful subject texts, extended explanations and authentic classroom tasks." },
  notes: ["Finger counting or manipulatives are not themselves difficulties.", "Stroke-order differences alone do not establish dyslexia.", "Accent, dialect, code-switching and second-language learning are not themselves disorders.", "Copying difficulties may relate to task accessibility.", "Motor and wellbeing observations do not explain the cause of literacy difficulty.", "Attention items are not an ADHD scale.", "The 80 percent coverage rule is provisional completeness guidance, not a clinical cutoff.", "Audio access is not proof that independent reading improved."],
  translationKeys: ["domains", "anchors", "context", "validation", "reportLimitation"].map(key => `chineseLiteracy.${key}`),
};
export const LITERACY_FORM_ITEMS = LITERACY_DOMAINS.flatMap(d => d.items.map(item => ({
  id: item.id, text: item.text, type: "likert" as const, domain: d.id, options: LITERACY_ANCHORS, required: true,
})));
export type LiteracyMetadata = Omit<typeof LITERACY_METADATA, "gradeExamples"> & {
  gradeExamples?: Record<string, unknown>; respondent?: string; setting?: string; guidance?: string[];
};

const responseSchema = z.discriminatedUnion("status", [
  z.object({ itemId: z.string(), status: z.literal("rated"), value: z.number().int().min(1).max(5) }).strict(),
  z.object({ itemId: z.string(), status: z.literal("not_observed"), value: z.null() }).strict(),
  z.object({ itemId: z.string(), status: z.literal("not_applicable"), value: z.null(), reason: z.string().trim().max(2000).default("") }).strict(),
  z.object({ itemId: z.string(), status: z.literal("unanswered"), value: z.null() }).strict(),
]);
const prioritySchema = z.object({
  text: z.string().max(4000), itemIds: z.array(z.string()).max(78), strategyId: z.string(),
  owner: z.string().max(500), indicator: z.string().max(2000), reviewDate: z.string().max(30),
}).strict();
export const literacyInputSchema = z.object({
  context: z.record(z.string(), z.union([z.string().max(8000), z.number(), z.null()])),
  responses: z.array(responseSchema).max(78),
  sections: z.record(z.string(), z.object({ decision: z.enum(["complete", "not_observed", "not_applicable"]), reason: z.string().trim().max(2000).optional() }).strict()),
  evidence: z.record(z.string(), z.object({
    examples: z.array(z.object({ text: z.string().max(8000), itemIds: z.array(z.string()).max(78) }).strict()).max(78),
    strengths: z.string().max(8000), supports: z.string().max(8000), opportunities: z.number().int().nonnegative().nullable().optional(),
    impact: z.number().int().min(0).max(3).nullable(),
    setting: z.string().max(8000).optional(), language: z.string().max(8000).optional(),
  }).strict()),
  summary: z.object({ strengths: z.string().max(8000), barriers: z.string().max(8000), supportResponse: z.string().max(8000), discussion: z.string().max(8000), priorities: z.array(prioritySchema).max(3) }).strict(),
  interfaceLanguage: z.enum(["english", "mandarin", "korean"]),
}).strict();
export type LiteracyInput = z.infer<typeof literacyInputSchema>;
export type LiteracyResponse = z.infer<typeof responseSchema>;

export function emptyLiteracyInput(grade: string | null = null): LiteracyInput {
  return { context: { grade: grade ?? "" }, responses: [], sections: {}, evidence: {}, summary: { strengths: "", barriers: "", supportResponse: "", discussion: "", priorities: [] }, interfaceLanguage: "english" };
}
export class LiteracyValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) { super(issues.join(" ")); this.issues = issues; }
}
export function validateLiteracyInput(raw: unknown, selectedDomains = LITERACY_DOMAINS.map(d => d.id), submitted = false, metadata: LiteracyMetadata = LITERACY_METADATA): LiteracyInput {
  const parsed = literacyInputSchema.safeParse(raw);
  if (!parsed.success) throw new LiteracyValidationError(parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`));
  const input = parsed.data;
  const parent = metadata.respondent === "parent";
  const selected = validateDomainSelection(selectedDomains, metadata);
  const domains = metadata.domains.filter(d => selected.includes(d.id));
  const expected = new Set(domains.flatMap(d => d.items.map(item => item.id)));
  const seen = new Set<string>();
  const issues: string[] = [];
  for (const response of input.responses) {
    if (!expected.has(response.itemId) || seen.has(response.itemId)) issues.push(`Unknown or duplicate item ${response.itemId}.`);
    seen.add(response.itemId);
  }
  for (const id of [...Object.keys(input.sections), ...Object.keys(input.evidence)]) {
    if (!selected.includes(id)) issues.push(`Domain ${id} was not assigned.`);
  }
  for (const d of domains) {
    const section = input.sections[d.id];
    const responses = input.responses.filter(r => d.items.some(item => item.id === r.itemId));
    const evidence = input.evidence[d.id];
    const ids = new Set(d.items.map(item => item.id));
    for (const example of evidence?.examples ?? []) {
      if (example.itemIds.some(id => !ids.has(id))) issues.push(`${d.label}: example links must belong to this domain.`);
    }
    if (!submitted) continue;
    if (!section && (!parent || d.requirement !== "core")) issues.push(`${d.label}: make an explicit section decision.`);
    if (section?.decision === "not_applicable" && !section.reason?.trim()) issues.push(`${d.label}: section NA requires a reason.`);
    if (responses.length !== d.items.length || responses.some(r => r.status === "unanswered")) issues.push(`${d.label}: review every assigned item with a rating, NO or NA.`);
    if (section?.decision === "not_observed" && responses.some(r => r.status !== "not_observed")) issues.push(`${d.label}: section NO must explicitly populate all items as NO.`);
    if (section?.decision === "not_applicable" && responses.some(r => r.status !== "not_applicable" || r.reason !== section.reason)) issues.push(`${d.label}: section NA reason must apply to all its items.`);
    if (section?.decision === "complete" && !evidence) issues.push(`${d.label}: provide domain evidence and impact (Unknown is allowed).`);
    if (parent && responses.some(r => r.status === "rated") && (section?.decision === "complete" || (!section && d.requirement === "core"))) {
      if (!evidence?.setting?.trim() || !evidence?.language?.trim()) issues.push(`${d.label}: record the home observation setting and language.`);
      if (!evidence?.strengths?.trim() || !evidence?.supports?.trim()) issues.push(`${d.label}: describe strengths and usual support, or explain what was not observed.`);
    }
    for (const response of responses) {
      if (response.status === "not_applicable" && !response.reason.trim()) issues.push(`${response.itemId}: provide the respondent's actual NA reason.`);
    }
  }
  if (submitted) {
    const grade = Number(input.context.grade);
    if (!Number.isInteger(grade) || grade < 3 || grade > 12) issues.push("Grade must be an integer from 3 through 12.");
    const contextKeys = parent
      ? ["relationship", "contactFrequency", "setting", "observationStart", "observationEnd", "completionDate", "homeLanguages", "activities", "script", "spokenVariety", "readingConfidence", "writingConfidence", "observationLanguage", "reason", "strengths", "currentSupports", "exposureHistory", "accessInformation", "unknownInformation", "schoolFeedback", "schoolFeedbackSource", "participationImpact", "questions", "assistanceMode", "parentConfirmed", "confirmationDate"]
      : ["teacherRole", "contactFrequency", "setting", "timeTeaching", "observationStart", "observationEnd", "script", "spokenVariety", "instruction", "observationLanguage", "exposureHistory", "curriculum", "reason", "strengths", "currentSupports", "accessInformation", "unknownInformation"];
    for (const key of contextKeys) {
      if (typeof input.context[key] !== "string" || !input.context[key]?.trim()) issues.push(`Context ${key}: provide a response or an explicit unknown with explanation.`);
    }
    for (const key of parent ? ["exposureHistory", "reason", "strengths", "currentSupports", "accessInformation", "unknownInformation", "schoolFeedback", "schoolFeedbackSource", "participationImpact", "questions"] : ["exposureHistory", "curriculum", "reason", "strengths", "currentSupports", "accessInformation", "unknownInformation"]) {
      if (/^(not known|not yet observed|unknown)\s*[:–-]?\s*$/i.test(String(input.context[key]).trim())) issues.push(`Context ${key}: briefly explain the explicit unknown.`);
    }
    const start = Date.parse(String(input.context.observationStart));
    const end = Date.parse(String(input.context.observationEnd));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end > Date.now() + 86400000) issues.push("Provide valid observation dates in chronological order, not in the future.");
    const contextOptions: Record<string, string[]> = parent
      ? { script: ["simplified", "traditional", "both", "other", "unknown"], spokenVariety: ["mandarin", "cantonese", "other", "unknown"], readingConfidence: ["comfortable", "some_limits", "unable_to_judge"], writingConfidence: ["comfortable", "some_limits", "unable_to_judge"], assistanceMode: ["independent", "assessor", "interpreter", "paper"] }
      : { script: ["simplified", "traditional", "both", "other", "unknown"], spokenVariety: ["mandarin", "cantonese", "other", "unknown"], instruction: ["main curriculum", "additional language", "literacy support", "other", "unknown"] };
    for (const [key, options] of Object.entries(contextOptions)) {
      if (!options.includes(String(input.context[key]).toLowerCase())) issues.push(`Choose a valid ${key} option.`);
    }
    if (parent) {
      for (const key of ["completionDate", "confirmationDate"]) {
        const date = Date.parse(String(input.context[key]));
        if (!Number.isFinite(date) || date < end || date > Date.now() + 86400000) issues.push(`${key}: provide a valid date on or after the observation end, not in the future.`);
      }
      if (input.context.parentConfirmed !== "yes") issues.push("The source parent or caregiver must confirm that these are their chosen responses.");
      if (input.context.assistanceMode !== "independent" && (!String(input.context.assistantIdentity ?? "").trim() || !String(input.context.assistantLanguage ?? "").trim())) issues.push("Record the assistant's identity and language for assisted or paper completion.");
      if (end - start < 28 * 86400000 && !String(input.context.shortWindowExplanation ?? "").trim()) issues.push("Briefly explain the shorter observation window; it does not prevent support or require more testing.");
    }
    for (const key of ["strengths", "barriers", "supportResponse"] as const) {
      if (!input.summary[key].trim()) issues.push(`Summary ${key}: provide a response or an explicit unknown with explanation.`);
      if (/^(not known|not yet observed|unknown)\s*[:–-]?\s*$/i.test(input.summary[key].trim())) issues.push(`Summary ${key}: briefly explain the explicit unknown.`);
    }
    for (const p of input.summary.priorities) {
      if (!p.text.trim() || !p.owner.trim() || !p.indicator.trim() || !Number.isFinite(Date.parse(p.reviewDate))) issues.push("Each proposed priority needs text, an owner, progress indicator and review date.");
      if (!metadata.strategies.some(s => s.id === p.strategyId) || !p.itemIds.length || p.itemIds.some(id => !expected.has(id))) issues.push("Priorities must reference assigned item IDs and a permitted strategy.");
    }
  }
  if (issues.length) throw new LiteracyValidationError(issues);
  return input;
}
export function validateDomainSelection(ids: string[], metadata: LiteracyMetadata = LITERACY_METADATA) {
  if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length || ids.some(id => !metadata.domains.some(d => d.id === id))) throw new LiteracyValidationError(["Choose unique, complete domains from the pinned instrument."]);
  return ids;
}
export function scoreLiteracyDomain(itemIds: readonly string[], rawResponses: readonly unknown[]) {
  if (!itemIds.length || new Set(itemIds).size !== itemIds.length) throw new LiteracyValidationError(["Invalid domain item bank."]);
  const byId = new Map<string, LiteracyResponse>();
  for (const raw of rawResponses) {
    const response = responseSchema.parse(raw);
    if (response.status === "not_applicable" && !response.reason.trim()) throw new LiteracyValidationError(["Scoring NA requires a valid reason."]);
    if (!itemIds.includes(response.itemId) || byId.has(response.itemId)) throw new LiteracyValidationError(["Unknown or duplicate scoring item."]);
    byId.set(response.itemId, response);
  }
  let sum = 0, validCount = 0, notApplicableCount = 0, notObservedCount = 0, unansweredCount = 0;
  const frequentDifficultyItemIds: string[] = [], scoredItemIds: string[] = [], applicableItemIds: string[] = [];
  for (const id of itemIds) {
    const response = byId.get(id);
    if (response?.status === "not_applicable") { notApplicableCount++; continue; }
    applicableItemIds.push(id);
    if (!response || response.status === "unanswered") { unansweredCount++; continue; }
    if (response.status === "not_observed") { notObservedCount++; continue; }
    sum += response.value; validCount++; scoredItemIds.push(id);
    if (response.value >= 4) frequentDifficultyItemIds.push(id);
  }
  const applicableCount = itemIds.length - notApplicableCount;
  const coverage = applicableCount ? validCount / applicableCount : null;
  const requiredValidCount = Math.max(2, Math.ceil(4 * applicableCount / 5));
  const eligible = applicableCount >= 2 && validCount >= requiredValidCount;
  const mean = eligible ? sum / validCount : null;
  return { status: !applicableCount ? "not_applicable" : eligible ? "scored" : "insufficient_observations",
    presentationLabel: applicableCount > 0 && notObservedCount === applicableCount ? "Not observed" : null,
    totalItems: itemIds.length, applicableCount, validCount, notApplicableCount, notObservedCount, unansweredCount,
    coverage, requiredValidCount, sum, mean, displayMean: mean === null ? null : mean.toFixed(1),
    frequentDifficultyCount: frequentDifficultyItemIds.length, frequentDifficultyItemIds, scoredItemIds, applicableItemIds };
}
export function scoreLiteracy(input: LiteracyInput, selectedDomains = LITERACY_DOMAINS.map(d => d.id), metadata: LiteracyMetadata = LITERACY_METADATA) {
  validateLiteracyInput(input, selectedDomains, false, metadata);
  return metadata.domains.map(d => ({
    id: d.id, label: d.label,
    ...(selectedDomains.includes(d.id)
      ? scoreLiteracyDomain(d.items.map(i => i.id), input.responses.filter(r => d.items.some(i => i.id === r.itemId)))
      : { status: "not_administered", mean: null, displayMean: null, coverage: null }),
    impact: input.evidence[d.id]?.impact ?? null, examples: input.evidence[d.id]?.examples ?? [],
    strengths: input.evidence[d.id]?.strengths ?? "", supports: input.evidence[d.id]?.supports ?? "",
  }));
}
export function literacyEvidenceStatus(scores: ReturnType<typeof scoreLiteracy>) {
  return scores.filter(d => ["R", "D", "W", "CL"].includes(d.id) && d.status !== "not_administered").some(d => d.status !== "scored")
    ? "Additional information needed" : "Ready for professional review";
}
export function compareLiteracy(baseline: any, followup: any) {
  return followup.scores.filter((f: any) => f.status !== "not_administered").map((f: any) => {
    const b = baseline.scores.find((s: any) => s.id === f.id);
    const limitations: string[] = [];
    if (baseline.instrumentVersion !== followup.instrumentVersion || baseline.scoringVersion !== followup.scoringVersion) limitations.push("Instrument wording or scoring version changed.");
    if (baseline.respondentIdentity !== followup.respondentIdentity) limitations.push("Different respondent; results remain separate.");
    if (baseline.metadata?.key !== followup.metadata?.key) limitations.push("Instrument version or observation source changed; parent and teacher results are not equivalent.");
    const membership = (ids: string[] = []) => [...ids].sort().join("|");
    if (!b || b.status !== "scored" || f.status !== "scored") limitations.push("Both domains need eligible observations.");
    if (membership(b?.applicableItemIds) !== membership(f.applicableItemIds)) limitations.push("Applicable-item membership changed.");
    if (membership(b?.scoredItemIds) !== membership(f.scoredItemIds)) limitations.push("Scored-item membership changed.");
    for (const key of ["grade", "script", "spokenVariety", "observationLanguage", "curriculum", "currentSupports", "setting", "activities", "homeLanguages", "assistanceMode", "assistantLanguage", "relationship", "readingConfidence", "writingConfidence", "assistantIdentity"]) {
      if (baseline.input.context[key] !== followup.input.context[key]) limitations.push(`${key} changed.`);
    }
    return { domainId: f.id, change: limitations.some(l => l.startsWith("Different respondent") || l.includes("membership") || l.includes("eligible") || l.includes("version")) ? null : f.mean - b.mean,
      baseline: b ?? null, followup: f, limitations, interpretation: "A lower mean describes less frequently reported difficulty for this respondent and setting, not statistical or clinical significance or resolution of a diagnosis." };
  });
}
