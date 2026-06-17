import { AssessmentTool } from "@workspace/db/schema";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_MODEL = "deepseek-chat";

async function callDeepSeek(prompt: string, maxTokens = 4096): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${text}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}


export type RecommendedTool = {
  toolId: string;
  name: string;
  rationale: string;
  priority: "essential" | "recommended" | "optional";
};

export type IntakeAnalysisResult = {
  recommendedTools: RecommendedTool[];
  recommendedDomains: string[];
  riskLevel: "low" | "moderate" | "high";
  summary: string;
  flags: string[];
  suggestedQuestions?: {
    teacher: string[];
    parent: string[];
  };
};

export async function analyzeIntakeWithAI(intake: {
  studentName: string;
  school: string;
  referralReason: string;
  grade?: string | null;
  dob?: string | null;
  age?: number | null;
  referralFormAnswers?: Record<string, unknown> | null;
  parentIntakeAnswers?: Record<string, unknown> | null;
  assessmentTools?: Array<{
    id: string;
    name: string;
    description: string;
    domains: string[];
    respondentTypes: string[];
    category: string;
    isRemyndOwned: boolean;
  }>;
}): Promise<IntakeAnalysisResult> {
  const toArr = (v: unknown): string[] => Array.isArray(v) ? v as string[] : [];
  const toolList = (intake.assessmentTools ?? [])
    .map(t => `- ID: ${t.id} | Name: ${t.name} | Category: ${t.category} | Domains: ${toArr(t.domains).join(", ")} | Respondents: ${toArr(t.respondentTypes).join(", ")} | ReMynd-owned: ${t.isRemyndOwned} | Description: ${t.description}`)
    .join("\n");

  const prompt = `You are a senior psychoeducational assessment specialist with deep expertise in selecting appropriate assessment batteries for students.

Analyze the following intake data for a student and recommend which assessment tools from the provided library should be used.

═══ STUDENT INFORMATION ═══
Name: ${intake.studentName}
School: ${intake.school}
Grade: ${intake.grade ?? "Not specified"}
Date of Birth: ${intake.dob ?? "Not recorded"}
Age: ${intake.age != null ? `${intake.age} years old` : "Unknown"}
Primary Referral Reason: ${intake.referralReason || "Not specified"}

═══ REFERRAL FORM RESPONSES ═══
${intake.referralFormAnswers
  ? (Object.keys(intake.referralFormAnswers).some(k => k.endsWith("_referral"))
    ? `Multiple referral sources provided (each key is a respondent type):\n${JSON.stringify(intake.referralFormAnswers, null, 2)}`
    : JSON.stringify(intake.referralFormAnswers, null, 2))
  : "No referral form data available."}

═══ PARENT INTAKE FORM RESPONSES ═══
${intake.parentIntakeAnswers
  ? (Object.keys(intake.parentIntakeAnswers).some(k => k.endsWith("_intake"))
    ? `Multiple intake sources provided (each key is a respondent type):\n${JSON.stringify(intake.parentIntakeAnswers, null, 2)}`
    : JSON.stringify(intake.parentIntakeAnswers, null, 2))
  : "No parent intake form data available."}

═══ AVAILABLE ASSESSMENT TOOLS ═══
${toolList || "No tools available in library."}

═══ INSTRUCTIONS ═══
Based on ALL the above information (student age, grade, gender if mentioned, referral concerns from the referral form, and developmental/behavioral history from the parent intake form):

1. Identify the key domains of concern
2. Select appropriate assessment tools from the library above that match:
   - The student's age/grade level
   - The presenting concerns and referral reasons
   - The behavioral patterns described in the parent intake
   - Use a mix of respondent types (parent, teacher, self) where appropriate
3. Prioritize ReMynd-owned tools where clinically appropriate
4. Assign each tool a priority: "essential" (must use), "recommended" (strongly suggested), or "optional" (useful if time allows)
5. Provide a brief clinical rationale for each tool selection

Return ONLY a JSON object (no markdown, no code fences) with this exact structure:
{
  "recommendedTools": [
    {"toolId": "TOOL_ID", "name": "Tool Name", "rationale": "1-2 sentence clinical justification", "priority": "essential|recommended|optional"}
  ],
  "recommendedDomains": ["attention", "executive_function", "emotional_regulation", "social_communication", "academic_persistence", "memory", "processing_speed"],
  "riskLevel": "low|moderate|high",
  "summary": "2-3 sentence clinical summary of the referral picture and key concerns",
  "flags": ["Specific concern or pattern to watch for during assessment"],
  "suggestedQuestions": {
    "teacher": ["5-8 targeted questions a psychometrician should ask the teacher to get a clearer school-based picture of this student's functioning, behaviour, and academic performance"],
    "parent": ["5-8 targeted questions a psychometrician should ask the parent/guardian to get a fuller developmental and home-context picture beyond what was captured in the intake form"]
  }
}`;

  try {
    const text = await callDeepSeek(prompt, 6000);
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    return {
      recommendedTools: Array.isArray(parsed.recommendedTools) ? parsed.recommendedTools : [],
      recommendedDomains: Array.isArray(parsed.recommendedDomains) ? parsed.recommendedDomains : [],
      riskLevel: parsed.riskLevel ?? "moderate",
      summary: parsed.summary ?? "Intake analysis completed.",
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      suggestedQuestions: (parsed.suggestedQuestions && typeof parsed.suggestedQuestions === "object")
        ? {
            teacher: Array.isArray(parsed.suggestedQuestions.teacher) ? parsed.suggestedQuestions.teacher : [],
            parent: Array.isArray(parsed.suggestedQuestions.parent) ? parsed.suggestedQuestions.parent : [],
          }
        : undefined,
    };
  } catch {
    return {
      recommendedTools: [],
      recommendedDomains: ["attention", "executive_function"],
      riskLevel: "moderate",
      summary: `${intake.studentName} has been referred for: ${intake.referralReason || "concerns noted in intake"}. Full AI analysis unavailable — manual review recommended.`,
      flags: ["Manual review recommended — AI analysis could not be completed"],
    };
  }
}

export async function recommendToolsWithAI(params: {
  domains: string[];
  riskLevel: string;
  allTools: AssessmentTool[];
}): Promise<{ recommended: AssessmentTool[]; rationale: string }> {
  const remyndTools = params.allTools.filter(t => t.isRemyndOwned);
  const prompt = `You are a psychoeducational assessment specialist. Recommend assessment tools for a student with the following profile:

Domains of concern: ${params.domains.join(", ")}
Risk level: ${params.riskLevel}

Available ReMynd tools: ${JSON.stringify(remyndTools.map(t => ({ id: t.id, name: t.name, domains: t.domains, respondentTypes: t.respondentTypes })))}

Return a JSON (no markdown) with:
- recommended: array of tool IDs to recommend
- rationale: brief explanation of why these tools were selected

Example: {"recommended": ["RCS-80", "RASR"], "rationale": "RCS-80 provides comprehensive screening..."}`;

  try {
    const text = await callDeepSeek(prompt);
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const recommendedIds: string[] = parsed.recommended ?? [];
    const recommended = params.allTools.filter(t => recommendedIds.includes(t.id));
    if (recommended.length === 0) {
      return { recommended: remyndTools.slice(0, 3), rationale: parsed.rationale ?? "Standard battery recommended." };
    }
    return { recommended, rationale: parsed.rationale ?? "Tools selected based on identified domains." };
  } catch {
    return { recommended: remyndTools.slice(0, 3), rationale: "Standard comprehensive battery recommended based on referral profile." };
  }
}

export async function generateReportWithAI(params: {
  caseData: {
    studentName: string;
    dob: string;
    school: string;
    grade?: string | null;
    referralReason: string;
    languagePreference: string;
  };
  scores: Array<{
    toolName: string;
    respondentType: string;
    domainScores: Record<string, number>;
    normalizedScores: Record<string, number>;
  }>;
  intakeAnalysis: Record<string, unknown> | null;
}): Promise<{
  backgroundSummary: string;
  domainAnalysis: string;
  strengths: string;
  areasOfConcern: string;
  crossSettingComparison: string;
  recommendations: string;
}> {
  const prompt = `You are a psychoeducational specialist writing a professional assessment report. Generate a comprehensive Educational Profile and Support Plan.

STUDENT INFORMATION:
Name: ${params.caseData.studentName}
Date of Birth: ${params.caseData.dob}
School: ${params.caseData.school}
Grade: ${params.caseData.grade ?? "Unknown"}
Language: ${params.caseData.languagePreference}
Referral Reason: ${params.caseData.referralReason}

INTAKE ANALYSIS:
${JSON.stringify(params.intakeAnalysis ?? {}, null, 2)}

ASSESSMENT SCORES:
${JSON.stringify(params.scores.map(s => ({
  tool: s.toolName,
  respondent: s.respondentType,
  domains: s.domainScores,
  normalized: s.normalizedScores,
})), null, 2)}

Write a professional psychoeducational report in JSON format (no markdown) with these sections:
- backgroundSummary: Background and reason for referral (2-3 paragraphs)
- domainAnalysis: Analysis of each domain assessed with score interpretation (2-3 paragraphs)
- strengths: Identified strengths observed across settings (1-2 paragraphs)
- areasOfConcern: Areas requiring additional support (1-2 paragraphs)
- crossSettingComparison: How behaviors compare across home/school/self-report (1-2 paragraphs)
- recommendations: Specific, actionable recommendations for school and home (numbered list format)

This is a SCREENING report only — NOT a diagnostic report. Use appropriate language like "may benefit from", "demonstrates patterns consistent with", "warrants further evaluation".`;

  try {
    const text = await callDeepSeek(prompt, 8192);
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    const name = params.caseData.studentName;
    return {
      backgroundSummary: `${name} was referred for psychoeducational screening at ${params.caseData.school}. The referral concern involves: ${params.caseData.referralReason}. This report summarizes screening findings from multiple informants.`,
      domainAnalysis: `Assessment data was collected from ${params.scores.length} informant(s). Domain scores indicate areas that may benefit from additional support and monitoring. Full interpretation pending manual review.`,
      strengths: `${name} demonstrates potential strengths that can be leveraged to support learning. Informant reports indicate areas of relative strength across settings.`,
      areasOfConcern: `Several areas have been flagged for follow-up based on cross-informant data. These areas warrant continued monitoring and targeted support strategies.`,
      crossSettingComparison: `Data collected from multiple informants provides a cross-setting perspective on ${name}'s functioning. Patterns of consistency and discrepancy across settings have been noted for review.`,
      recommendations: `1. Continue monitoring in the identified areas of concern.\n2. Implement evidence-based classroom accommodations.\n3. Schedule a review meeting with parents and school team.\n4. Consider referral for comprehensive evaluation if concerns persist.`,
    };
  }
}

export type ToolMetadata = {
  suggestedId: string;
  name: string;
  description: string;
  category: string;
  scoringType: "auto" | "manual";
  domains: string[];
  respondentTypes: string[];
};

export async function lookupToolWithAI(query: string): Promise<ToolMetadata> {
  const prompt = `You are a psychoeducational assessment expert with comprehensive knowledge of standardized assessment instruments used internationally.

The user has entered the following query to look up an assessment tool:
Query: "${query}"

Identify the instrument they are referring to and return its metadata.

Return a JSON object (no markdown, no code fences) with EXACTLY this structure:
{
  "suggestedId": "SHORT_UPPERCASE_ID (max 10 chars, e.g. BRIEF, BASC3, RCADS, CONNERS3)",
  "name": "Full official name of the instrument",
  "description": "2-3 sentence description of what this tool measures, age range, and who it is designed for",
  "category": "One of: cognitive, behavior, language, social-emotional, executive-function, achievement, adaptive, memory, processing, admin",
  "scoringType": "auto or manual",
  "domains": ["array", "of", "specific_psychological_domains_assessed"],
  "respondentTypes": ["array from: parent, teacher1, teacher2, boarding_staff, referring_teacher, self, invigilator"]
}

Rules:
- Use your knowledge of this specific instrument to give accurate metadata
- If this is a parent-report version, include only "parent" in respondentTypes
- If this is a teacher-report version, include "teacher1"
- If it measures both anxiety and depression, list both as separate domains
- scoringType is "auto" for standardized scales with fixed scoring keys, "manual" for clinical judgment tools
- Be specific with domains (e.g. "separation_anxiety", "social_anxiety", "generalized_anxiety", "depression", "ocd" rather than just "anxiety")
- If the query specifies a version (e.g. "parent", "teacher", "self-report"), reflect that in the name and respondentTypes

Return ONLY the JSON object, nothing else.`;

  const raw = await callDeepSeek(prompt);
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("AI did not return valid JSON");
  const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as ToolMetadata;

  return {
    suggestedId: (parsed.suggestedId ?? query.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 10)),
    name: parsed.name ?? query,
    description: parsed.description ?? "",
    category: parsed.category ?? "behavior",
    scoringType: parsed.scoringType === "auto" ? "auto" : "manual",
    domains: Array.isArray(parsed.domains) ? parsed.domains : [],
    respondentTypes: Array.isArray(parsed.respondentTypes) ? parsed.respondentTypes : [],
  };
}

export type AnalyzedFormResult = {
  suggestedId: string;
  name: string;
  description: string;
  category: string;
  scoringType: "auto" | "manual";
  domains: string[];
  respondentTypes: string[];
  duplicateMatch?: { id: string; name: string } | null;
  formItems: Array<{
    id: string;
    text: string;
    textChinese?: string;
    textKorean?: string;
    type: "likert" | "text" | "textarea" | "checkbox" | "radio" | "multiple_choice" | "scale" | "section_header";
    options?: string[];
    optionsChinese?: string[];
    optionsKorean?: string[];
    domain?: string;
  }>;
};

type RawFormItem = {
  id: string;
  text: string;
  textChinese?: string;
  textKorean?: string;
  type: "likert" | "text" | "textarea" | "checkbox" | "radio" | "multiple_choice" | "scale" | "section_header";
  options?: string[];
  optionsChinese?: string[];
  optionsKorean?: string[];
  domain?: string;
};

async function translateBatch(items: RawFormItem[]): Promise<void> {
  if (items.length === 0) return;
  const translatePrompt = `You are a clinical psychologist specialising in multilingual psychoeducational assessments.
Translate each item below into Simplified Chinese and Korean.
Return a JSON array with this structure per item:
[{"id":"<id>","textChinese":"...","textKorean":"...","optionsChinese":[...],"optionsKorean":[...]}]
Rules:
- Use clinically appropriate terminology
- optionsChinese / optionsKorean must be the same length as the original options array
- If options is empty or absent, use empty arrays []
- Return ONLY the JSON array, no markdown, no extra text

Items:
${JSON.stringify(items.map(it => ({ id: it.id, text: it.text, options: it.options ?? [] })))}`;

  try {
    const tRaw = await callDeepSeek(translatePrompt, 8192);
    const tCleaned = tRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const arrStart = tCleaned.indexOf("[");
    const arrEnd = tCleaned.lastIndexOf("]");
    if (arrStart === -1 || arrEnd === -1) return;
    const translations = JSON.parse(tCleaned.slice(arrStart, arrEnd + 1)) as Array<{
      id: string;
      textChinese?: string;
      textKorean?: string;
      optionsChinese?: string[];
      optionsKorean?: string[];
    }>;
    const byId = Object.fromEntries(translations.map(t => [t.id, t]));
    for (const item of items) {
      if (byId[item.id]) {
        item.textChinese    = item.textChinese    || byId[item.id].textChinese;
        item.textKorean     = item.textKorean     || byId[item.id].textKorean;
        if (!item.optionsChinese?.length) item.optionsChinese = byId[item.id].optionsChinese;
        if (!item.optionsKorean?.length)  item.optionsKorean  = byId[item.id].optionsKorean;
      }
    }
  } catch (err) {
    // Non-fatal — English-only items still work
    console.error("[translateBatch] DeepSeek call failed:", err instanceof Error ? err.message : String(err));
  }
}

export async function analyzeFormWithAI(params: {
  formText?: string;
  imageBase64?: string;
  mimeType?: string;
  existingTools?: Array<{ id: string; name: string }>;
}): Promise<AnalyzedFormResult> {

  const existingToolsSection = params.existingTools && params.existingTools.length > 0
    ? `\nEXISTING TOOLS ALREADY IN THE SYSTEM (check for duplicates):\n${params.existingTools.map(t => `- ${t.id}: ${t.name}`).join("\n")}\n\nIf the form being analyzed matches any of the above tools (same tool, same or very similar version), set "duplicateMatch" to {"id": "<matching id>", "name": "<matching name>"}. Otherwise set "duplicateMatch" to null.\n`
    : "";

  // Extract structure + all items in English only — no translation here
  const extractPrompt = `You are a psychoeducational assessment expert. Analyze the provided assessment form and extract structured information.

${params.formText ? `FORM CONTENT:\n${params.formText}\n` : ""}${params.imageBase64 ? "Please analyze the assessment form shown in the image." : ""}
${existingToolsSection}
Return a JSON object (no markdown, no code fences) with EXACTLY this structure:
{
  "suggestedId": "SHORT_UPPERCASE_ID (max 10 chars, e.g. BRIEF, BASC, RASR)",
  "name": "Full official name of the assessment tool",
  "description": "1-2 sentence description of what the tool measures and who it is for",
  "category": "One of: cognitive, behavior, language, social-emotional, executive-function, achievement, adaptive, memory, processing, admin",
  "scoringType": "auto or manual",
  "domains": ["array", "of", "psychological_domains", "being_assessed"],
  "respondentTypes": ["array from: parent, teacher1, teacher2, boarding_staff, referring_teacher, self, invigilator"],
  "duplicateMatch": null,
  "formItems": [
    {
      "id": "q1",
      "text": "Exact question or item text in English",
      "type": "section_header | likert | text | textarea | checkbox | radio | multiple_choice | scale",
      "options": ["response options in English if applicable, else empty array"],
      "domain": "which domain this item measures"
    }
  ]
}

TYPE RULES — choose the correct type for every item:
- "section_header": A section title, heading, or domain label that introduces a group of items (no response required). options must be [].
- "likert": A rated item with a fixed scale (e.g. Never/Sometimes/Often/Always, 0–3, Strongly Disagree–Strongly Agree). Always include the scale options.
- "text": A SHORT open-ended field expecting a single-line written answer (e.g. Name:, Date:, Age:, School:, Diagnosis:, Person completing form:). options must be [].
- "textarea": A LONG open-ended field expecting a multi-line written response (e.g. "Additional Comments:", "Please describe...", "Explain any concerns:", "Notes:", "Describe the student's strengths:"). options must be [].
- "radio": A single-choice question where EXACTLY ONE option is selected (e.g. Yes/No, Male/Female, or a short list of mutually exclusive choices). Include the options.
- "checkbox": A multi-select question where the respondent can choose MULTIPLE options. Include the options.
- "scale": A numeric slider or rating scale (e.g. rate 1–10). Include numeric options.
- "multiple_choice": A question with labeled choices but not a Likert scale. Include the options.

EXTRACTION RULES:
- Extract ALL items/questions from the form — do not skip, truncate, or stop early
- Keep question text EXACTLY as written in the form
- ALWAYS produce a "section_header" item for each section title or domain heading found in the form
- ALWAYS produce a "textarea" item for any open-ended comment/notes/description field
- ALWAYS produce a "text" item for fill-in-the-blank fields like name, date, age, school
- If a section header exists, use it to infer the domain for all items in that section

Return ONLY the JSON object, nothing else.`;

  const raw = await callDeepSeek(extractPrompt, 8192);
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("AI did not return valid JSON");
  const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as AnalyzedFormResult;

  const formItems: RawFormItem[] = Array.isArray(parsed.formItems) ? parsed.formItems : [];

  const duplicateMatch =
    parsed.duplicateMatch && typeof parsed.duplicateMatch === "object" && parsed.duplicateMatch.id
      ? { id: parsed.duplicateMatch.id, name: parsed.duplicateMatch.name ?? "" }
      : null;

  return {
    suggestedId: (parsed.suggestedId ?? "TOOL").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 10),
    name: parsed.name ?? "",
    description: parsed.description ?? "",
    category: parsed.category ?? "behavior",
    scoringType: parsed.scoringType === "auto" ? "auto" : "manual",
    domains: Array.isArray(parsed.domains) ? parsed.domains : [],
    respondentTypes: Array.isArray(parsed.respondentTypes) ? parsed.respondentTypes : [],
    duplicateMatch,
    formItems,
  };
}

export async function translateFormItemsWithAI(
  items: RawFormItem[],
  options: { sequential?: boolean } = {}
): Promise<RawFormItem[]> {
  const BATCH_SIZE = 50;
  const batches: RawFormItem[][] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE));
  }
  if (options.sequential) {
    for (const batch of batches) {
      await translateBatch(batch);
    }
  } else {
    await Promise.all(batches.map(batch => translateBatch(batch)));
  }
  return items;
}

function formatAnswersForPrompt(answers: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(answers)) {
    if (value === null || value === undefined || value === "") continue;
    const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    if (Array.isArray(value)) {
      if (value.length > 0) lines.push(`${label}: ${value.join(", ")}`);
    } else {
      lines.push(`${label}: ${String(value)}`);
    }
  }
  return lines.join("\n");
}

interface FormItemLike {
  id: string;
  text: string;
  type: string;
  options?: string[];
  rows?: Array<{ id: string; text: string }>;
}

function formatQuestionsAndAnswers(formItems: FormItemLike[], answers: Record<string, unknown>): string {
  const lines: string[] = [];
  let n = 0;
  for (const item of formItems) {
    if (item.type === "section_header" || item.type === "instruction") {
      lines.push(`\n[${item.text.toUpperCase()}]`);
      continue;
    }
    const answer = answers[item.id];
    if (answer === undefined || answer === null || answer === "") continue;
    n++;
    let formatted = "";
    if (item.type === "frequency_grid" && item.rows && typeof answer === "object" && !Array.isArray(answer)) {
      const gridParts = item.rows
        .map(row => {
          const val = (answer as Record<string, unknown>)[row.id];
          return val !== undefined && val !== null && val !== "" ? `${row.text}: ${val}` : null;
        })
        .filter(Boolean);
      formatted = gridParts.join("; ");
    } else if (Array.isArray(answer)) {
      formatted = answer.length > 0 ? answer.join(", ") : "";
    } else {
      formatted = String(answer);
    }
    if (formatted) {
      lines.push(`${n}. ${item.text.replace(/\*$/, "").trim()}: ${formatted}`);
    }
  }
  return lines.join("\n");
}

const RESPONDENT_LABEL: Record<string, string> = {
  parent: "Parent / Guardian",
  teacher: "Teacher", teacher1: "Teacher 1", teacher2: "Teacher 2",
  referring_teacher: "Referring Teacher", special_needs_teacher: "Special Needs Teacher",
  school_counselor: "School Counselor", boarding_staff: "Boarding Staff",
  self: "Student (Self-Report)", invigilator: "Invigilator / Psychometrist",
  clinician: "Clinician",
};

export async function generateFormSummary(params: {
  toolId: string;
  toolName: string;
  respondentType: string;
  studentName: string;
  school: string;
  grade: string;
  answers: Record<string, unknown>;
  formItems: FormItemLike[];
}): Promise<string> {
  const { toolName, respondentType, studentName, school, grade, answers, formItems } = params;
  const firstName = studentName.trim().split(/[\s,]/)[0] ?? studentName;
  const respondentLabel = RESPONDENT_LABEL[respondentType] ?? respondentType;
  const formattedQA = formatQuestionsAndAnswers(formItems, answers);

  const prompt = `You are a psychoeducational assessment specialist writing a formal clinical interpretation narrative for a student's assessment file. You have been given completed responses from a "${toolName}" rating scale / assessment form, completed by the ${respondentLabel}.

STUDENT INFORMATION:
- Full Name: ${studentName}
- School: ${school || "Not specified"}
- Grade: ${grade || "Not specified"}
- Respondent: ${respondentLabel}

FORM QUESTIONS AND RESPONSES:
${formattedQA}

---
Write a professional clinical summary interpretation of these responses. Use third-person prose throughout. Refer to the student by first name ("${firstName}") naturally. Base ALL content solely on the responses provided — do not invent or assume details. Use cohesive paragraphs — no bullet points within sections.

Structure the narrative using the following sections. Only include a section if the form data supports it:

ASSESSMENT SUMMARY — ${toolName}

Overview

[Write a paragraph introducing the assessment context: what the tool measures, who completed it, and the overall pattern of responding (e.g., generally elevated, generally within normal limits, mixed pattern across domains).]

Key Findings

[Write one or more paragraphs describing the most clinically significant ratings. Group related areas together. Note items or domains that were notably elevated, below average, or inconsistent. Use specific response data to support your statements.]

Areas of Strength

[If the data shows areas of relative strength or within-normal-limits functioning, describe them here. If all areas are elevated, note that no relative strengths were identified on this measure.]

Clinical Implications

[Write a brief paragraph connecting the findings to potential clinical or academic impact. Note how these results align with or should be interpreted alongside other assessment data. Avoid making diagnostic statements — frame as "consistent with difficulties in..." or "suggests support may be beneficial for..."]

[Write a final one-sentence or two-sentence closing statement summarising the overall clinical picture from this measure and recommending that results be interpreted in the context of the full assessment battery.]`;

  const result = await callDeepSeek(prompt);
  return result.trim();
}

export async function generateAboSummary(params: {
  studentName: string;
  school: string;
  grade: string;
  answers: Record<string, unknown>;
}): Promise<string> {
  const { studentName, school, grade, answers } = params;
  const firstName = studentName.trim().split(/[\s,]/)[0] ?? studentName;
  const formattedAnswers = formatAnswersForPrompt(answers);

  const prompt = `You are a psychoeducational assessment specialist writing a formal clinical behavioral observation narrative for a student's assessment report. You have been given completed Assessment Behavior Observation (ABO) form data recorded by the invigilating psychometrist during the assessment session.

STUDENT INFORMATION:
- Full Name: ${studentName}
- School: ${school || "Not specified"}
- Grade: ${grade || "Not specified"}

OBSERVATION FORM DATA:
${formattedAnswers}

---
Write a comprehensive, clinically-styled behavioral observation narrative strictly based on the data provided above. Use professional third-person prose throughout. Refer to the student by first name ("${firstName}") naturally. Do not invent, infer beyond, or add details not present in the observation data. If data is absent for a particular area, note that it was not formally recorded. Use cohesive prose paragraphs — do not use bullet points within sections.

Structure the narrative exactly as follows:

BEHAVIORAL OBSERVATION SUMMARY

General Presentation and Appearance

[Write a paragraph covering physical presentation, apparent age relative to stated age, dress and grooming, handedness, use of glasses or hearing aids, and overall first impression during the assessment.]

Interpersonal Behaviour and Rapport

[Write a paragraph covering how rapport was established (or not), attitude toward the examiner, speech characteristics and communication style, and the student's general affect and emotional presentation during the session.]

Engagement and Task Behaviour

[Write a paragraph covering the student's attitude toward the assessment tasks, concentration and attentional capacity, ability to follow instructions, persistence on difficult items, frequency of redirection required, and the number of breaks taken.]

Validity and Clinical Considerations

[Write a paragraph addressing whether the student understood the purpose of the evaluation, their reactions to errors or challenging items, any unusual or atypical behaviors observed, and the examiner's overall judgment of test validity. Include the psychometrist's additional test-specific observations if recorded.]

[Write a brief concluding paragraph summarising the overall behavioural presentation and noting any factors that may have influenced test performance or that should be considered in the interpretation of assessment results.]`;

  const result = await callDeepSeek(prompt);
  return result.trim();
}

export async function generateIntakeSummary(params: {
  studentName: string;
  school: string;
  grade: string;
  answers: Record<string, unknown>;
}): Promise<string> {
  const { studentName, school, grade, answers } = params;
  const firstName = studentName.trim().split(/[\s,]/)[0] ?? studentName;
  const formattedAnswers = formatAnswersForPrompt(answers);

  const prompt = `You are a psychoeducational assessment specialist writing a formal clinical narrative for a student's assessment file. You have been given raw Parent Intake form responses. Generate a professional narrative summary strictly following the structure and style shown below.

STUDENT INFORMATION:
- Full Name: ${studentName}
- School: ${school || "Not specified"}
- Grade: ${grade || "Not specified"}

INTAKE FORM RESPONSES:
${formattedAnswers}

---
Write the summary now, following this EXACT structure and formatting. Use professional, clinical third-person prose throughout. Use the student's first name ("${firstName}") naturally. Base ALL content solely on the intake data provided — do not invent or assume details not present in the responses. If a subsection has limited data, write what can be reasonably inferred and note that information was not fully reported. Do NOT use bullet points inside sections — write cohesive prose paragraphs.

PERSONAL HISTORY - PARENT

Developmental and Medical History

[Write a paragraph covering: birth circumstances and delivery method, anesthesia used, any complications during pregnancy or delivery, birth weight or condition, birth problems if any, early developmental milestones (motor, speech/language, self-help/toilet training), infant temperament and early behavioral characteristics, medical history, current medications, any prior diagnoses and who made them, early personality descriptions by parents.]

Family History

[Write a paragraph covering: who the child currently lives with, parents' marital status, custody arrangements if parents are divorced, whether the child is adopted, siblings and their relationships, presence of babysitter/caregiver, which parent administers discipline and how, languages spoken at home, home environment description, any relevant family mental health history.]

Academic History

[Write a paragraph covering: current school, grade level, language of instruction, overall academic performance level, favorite and least-favorite subjects, academic difficulties reported (attention, organization, written output, etc.), special education services or IEP, after-school tutoring, attitude toward school and teacher, extracurricular interests.]

SUMMARY OF PRESENTING STRENGTHS & CONCERNS

Presenting Strengths:

[Write a paragraph describing the child's cognitive strengths, positive personality traits, skills, and protective factors as reported by parents. Draw from the strengths question and positive behavioral checklist items.]

Cognitive and Academic Problems:

[Write a paragraph describing attentional, executive functioning, organizational, or academic difficulties. Draw from academic difficulties, behavioral checklist, and presenting issues reported.]

Emotional Difficulties:

[Write a paragraph describing emotional regulation challenges, emotional temperament, and any emotional behavioral checklist items (e.g., quick to anger, easily frustrated, overly sensitive, anxious, volatile).]

Behavioral issues:

[Write a paragraph describing behavioral patterns at home and school, including any ADHD-related behaviors, impulsivity, compliance difficulties, electronic device use if noted.]

Social Deficits:

[Write a paragraph describing the child's social functioning, peer relationships, and any social difficulties or strengths noted.]

[Write a final closing paragraph that synthesizes the overall profile, acknowledges both strengths and areas of concern, and frames the need for assessment in a balanced, strengths-based way.]`;

  const result = await callDeepSeek(prompt);
  return result.trim();
}

export async function generateRppiSummary(params: {
  studentName: string;
  school: string;
  grade: string;
  normalizedScores: Record<string, number>;
  paRisk: string;
  nonwordRisk: string;
  rapidRisk: string;
  overallRisk: string;
  interpretationText: string;
  rapidNaming: {
    letters: { time?: string; errors?: string; corrections?: string; rating?: string };
    digits:  { time?: string; errors?: string; corrections?: string; rating?: string };
  };
  mode: string;
  generalNotes: string;
}): Promise<string> {
  const { studentName, school, grade, normalizedScores, paRisk, nonwordRisk, rapidRisk, overallRisk, interpretationText, rapidNaming, mode, generalNotes } = params;
  const firstName = studentName.trim().split(/[\s,]/)[0] ?? studentName;

  const riskLabel = (r: string) =>
    r === "low" ? "Within Typical Limits" :
    r === "mild" ? "Mild Concern" :
    r === "moderate" ? "Moderate Concern" : "Significant Concern";

  const DOMAIN_LABELS: Record<string, string> = {
    rhyming:      "Rhyming Awareness",
    blending:     "Phoneme Blending",
    segmentation: "Phoneme Segmentation",
    deletion:     "Phoneme Deletion",
    substitution: "Phoneme Substitution",
    nonword:      "Phonological Memory (Nonword Repetition)",
    pa_composite: "Phonological Awareness Composite",
  };

  const domainLines = Object.entries(DOMAIN_LABELS)
    .map(([key, label]) => {
      const pct = normalizedScores[key];
      return pct !== undefined ? `- ${label}: ${pct}% accuracy (${riskLabel(pct >= 85 ? "low" : pct >= 70 ? "mild" : pct >= 50 ? "moderate" : "significant")})` : null;
    })
    .filter(Boolean)
    .join("\n");

  const rnLines = [
    rapidNaming.letters.time   ? `- Task A (Letters): ${rapidNaming.letters.time}s, ${rapidNaming.letters.errors ?? 0} errors, ${rapidNaming.letters.corrections ?? 0} self-corrections → ${rapidNaming.letters.rating ?? "Not rated"}` : null,
    rapidNaming.digits.time    ? `- Task B (Digits): ${rapidNaming.digits.time}s, ${rapidNaming.digits.errors ?? 0} errors, ${rapidNaming.digits.corrections ?? 0} self-corrections → ${rapidNaming.digits.rating ?? "Not rated"}` : null,
  ].filter(Boolean).join("\n");

  const prompt = `You are a psychoeducational assessment specialist writing a formal clinical interpretation narrative for a student's phonological processing profile.

STUDENT INFORMATION:
- Full Name: ${studentName}
- School: ${school || "Not specified"}
- Grade: ${grade || "Not specified"}
- Administration Mode: ${mode}

RPPI DOMAIN SCORES:
${domainLines}

RAPID NAMING RESULTS:
${rnLines || "Not administered"}

RISK SUMMARY:
- Phonological Awareness (PA Composite): ${riskLabel(paRisk)}
- Phonological Memory (Nonword Repetition): ${riskLabel(nonwordRisk)}
- Rapid Naming: ${riskLabel(rapidRisk)}
- Overall Profile Risk: ${riskLabel(overallRisk)}

SYSTEM INTERPRETATION:
${interpretationText || "No automated interpretation recorded."}

EXAMINER NOTES:
${generalNotes || "None recorded."}

---
Write a professional clinical interpretation narrative of this RPPI profile. Use third-person prose throughout. Refer to the student by first name ("${firstName}") naturally. Base ALL content solely on the data provided — do not invent or assume details. Use cohesive paragraphs — no bullet points within sections.

Structure the narrative as follows:

RPPI ASSESSMENT SUMMARY

Overview

[Introduce the assessment: what the RPPI measures (phonological processing skills including phonological awareness, phonological memory, and rapid naming), how it was administered, and the overall pattern of performance.]

Phonological Awareness

[Describe ${firstName}'s performance across the five PA subdomains (Rhyming, Blending, Segmentation, Deletion, Substitution) and the composite score. Note areas of strength and difficulty, citing specific accuracy percentages. Relate findings to typical literacy skill development.]

Phonological Memory

[Describe performance on the Nonword Repetition task. Discuss what this reflects about the student's ability to hold and manipulate novel phonological information and any implications for learning new vocabulary or decoding unfamiliar words.]

Rapid Naming

[Describe performance on the Rapid Letter and Digit Naming tasks. Discuss speed, accuracy, and self-correction patterns. Connect to reading fluency and automatic word recognition.]

Clinical Implications

[Synthesise the overall phonological profile. Describe the pattern of risk (e.g., isolated PA difficulty vs broad phonological deficit). Frame implications for literacy, reading, and spelling support. Note whether findings are consistent with a phonological processing profile associated with dyslexia risk, using appropriate clinical hedging. Do NOT make a diagnosis.]

[Write a brief closing sentence or two noting that results should be interpreted alongside other RAOS assessment findings, academic achievement data, developmental history, and classroom observations.]`;

  const result = await callDeepSeek(prompt);
  return result.trim();
}

export async function generateRrcaPassage(params: {
  age: number;
  grade: string;
  language: string;
  difficulty: string;
  topic: string;
}): Promise<{ passage: string; wordCount: number; questions: Array<{ id: string; text: string; type: "literal" | "inferential" | "vocabulary" }> }> {
  const { age, grade, language, difficulty, topic } = params;

  const wordRange =
    age <= 8  ? "100–150 words" :
    age <= 10 ? "150–220 words" :
    age <= 12 ? "220–320 words" :
    age <= 15 ? "320–450 words" : "450–600 words";

  const difficultyLabel =
    difficulty === "below" ? "Below Age Expectation (simpler vocabulary, shorter sentences)" :
    difficulty === "above" ? "Above Age Expectation (richer vocabulary, more complex sentences)" :
    "Age Expected (appropriate vocabulary and sentence complexity for age)";

  const langLabel =
    language === "mandarin" ? "Simplified Mandarin Chinese" :
    language === "cantonese" ? "Traditional Chinese (Cantonese)" :
    language === "korean" ? "Korean" : "English";

  const topicLabel = topic || "General Knowledge";

  const prompt = `You are a specialist educational assessment author creating an examiner-administered reading comprehension passage for a psychoeducational assessment.

PASSAGE REQUIREMENTS:
- Student age: ${age} years old, Grade: ${grade || "not specified"}
- Language: ${langLabel}
- Difficulty level: ${difficultyLabel}
- Topic: ${topicLabel}
- Length: Strictly ${wordRange}
- Style: Factual, engaging, neutral, age-appropriate. No cultural bias. No references to disability, mental health, or assessment.
- Format: Continuous prose (no headers, bullet points, or lists)

QUESTION REQUIREMENTS:
Generate exactly 10 questions about the passage:
- 5 Literal questions (answers explicitly stated in the text)
- 3 Inferential questions (require reasoning beyond the text)
- 2 Vocabulary questions (ask about meaning of a word or phrase used in the passage)

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "passage": "Full passage text here...",
  "questions": [
    {"id": "q1", "text": "Question text here?", "type": "literal"},
    {"id": "q2", "text": "Question text here?", "type": "literal"},
    {"id": "q3", "text": "Question text here?", "type": "literal"},
    {"id": "q4", "text": "Question text here?", "type": "literal"},
    {"id": "q5", "text": "Question text here?", "type": "literal"},
    {"id": "q6", "text": "Question text here?", "type": "inferential"},
    {"id": "q7", "text": "Question text here?", "type": "inferential"},
    {"id": "q8", "text": "Question text here?", "type": "inferential"},
    {"id": "q9", "text": "What does the word '...' mean in this passage?", "type": "vocabulary"},
    {"id": "q10", "text": "What does the phrase '...' mean in this passage?", "type": "vocabulary"}
  ]
}`;

  const raw = await callDeepSeek(prompt, 2000);
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as {
    passage: string;
    questions: Array<{ id: string; text: string; type: "literal" | "inferential" | "vocabulary" }>;
  };

  const wordCount = parsed.passage.trim().split(/\s+/).length;
  return { passage: parsed.passage, wordCount, questions: parsed.questions };
}

export async function generateRrfaPassage(params: {
  age: number;
  grade: string;
  language: string;
  topic: string;
  passageType: "60-second" | "full-passage";
}): Promise<{ passage: string; wordCount: number }> {
  const { age, grade, language, topic, passageType } = params;

  const wordRange =
    passageType === "60-second"
      ? (age <= 8 ? "80–120 words" : age <= 10 ? "120–180 words" : age <= 12 ? "180–260 words" : age <= 15 ? "260–360 words" : "360–500 words")
      : (age <= 8 ? "120–180 words" : age <= 10 ? "180–260 words" : age <= 12 ? "260–380 words" : age <= 15 ? "380–520 words" : "520–700 words");

  const langLabel =
    language === "mandarin" ? "Simplified Mandarin Chinese" :
    language === "cantonese" ? "Traditional Chinese (Cantonese)" :
    language === "korean" ? "Korean" : "English";

  const prompt = `You are a specialist educational assessment author creating a reading fluency passage for a psychoeducational oral reading assessment.

PASSAGE REQUIREMENTS:
- Student age: ${age} years old, Grade: ${grade || "not specified"}
- Language: ${langLabel}
- Topic: ${topic || "General Knowledge"}
- Length: Strictly ${wordRange}
- Style: Factual, engaging, neutral, age-appropriate. Varied sentence lengths (mix of short and longer sentences) to assess prosody. No cultural bias. No references to disability, mental health, or assessment.
- Format: Continuous prose only (no headers, bullet points, lists, or dialogue)
- Reading fluency focus: The passage should flow naturally when read aloud. Avoid overly complex punctuation. Include a natural mix of common and slightly challenging vocabulary appropriate for the age.

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{"passage": "Full passage text here..."}`;

  const raw = await callDeepSeek(prompt, 1200);
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as { passage: string };
  const wordCount = parsed.passage.trim().split(/\s+/).length;
  return { passage: parsed.passage, wordCount };
}

export async function generateRdaSummary(params: {
  studentName: string;
  school: string;
  grade: string;
  rawScore: number;
  maxScore: number;
  percentage: number;
  riskLevel: string;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  interpretationText: string;
  mode: string;
  generalNotes: string;
}): Promise<string> {
  const { studentName, school, grade, rawScore, maxScore, percentage, riskLevel, correctCount, partialCount, incorrectCount, interpretationText, mode, generalNotes } = params;
  const firstName = studentName.trim().split(/[\s,]/)[0] ?? studentName;

  const riskLabel =
    riskLevel === "low" ? "Low Concern (85–100%)" :
    riskLevel === "mild" ? "Mild Concern (70–84%)" :
    riskLevel === "moderate" ? "Moderate Concern (50–69%)" : "Significant Concern (below 50%)";

  const prompt = `You are a psychoeducational assessment specialist writing a formal clinical interpretation narrative for a student's decoding assessment profile.

STUDENT INFORMATION:
- Full Name: ${studentName}
- School: ${school || "Not specified"}
- Grade: ${grade || "Not specified"}
- Administration Mode: ${mode}

RDA RESULTS:
- Total Score: ${rawScore} / ${maxScore} (${percentage}%)
- Correct (full credit): ${correctCount}
- Partially Correct / Self-Corrected: ${partialCount}
- Incorrect / No Response: ${incorrectCount}
- Risk Level: ${riskLabel}

SYSTEM INTERPRETATION:
${interpretationText}

EXAMINER NOTES:
${generalNotes || "None recorded."}

---
Write a professional clinical interpretation narrative of this RDA (ReMynd Decoding Assessment) profile. Use third-person prose throughout. Refer to the student by first name ("${firstName}") naturally. Base ALL content solely on the data provided.

Structure as follows:

RDA ASSESSMENT SUMMARY

Overview
[Introduce the RDA: what it measures (decoding of unfamiliar nonwords, phonics, sound-symbol mapping, decoding efficiency), how it was administered, and the overall result.]

Decoding and Nonword Reading
[Describe ${firstName}'s performance on the 20-item nonword decoding task. Reference the total score (${rawScore}/${maxScore}, ${percentage}%), the risk level (${riskLabel}), and any patterns in correct, partial, or incorrect responses. Relate findings to phonics knowledge and decoding efficiency.]

Clinical Implications
[Synthesise the decoding profile. Frame implications for literacy support. Note whether findings are consistent with a decoding profile associated with phonics difficulty or dyslexia risk, using appropriate clinical hedging. Do NOT make a diagnosis. Close with a note that results should be interpreted alongside RPPI, RRFA, RRCA, and other RAOS assessment findings.]`;

  const result = await callDeepSeek(prompt);
  return result.trim();
}

export async function generateRrfaSummary(params: {
  studentName: string;
  school: string;
  grade: string;
  wordsPerMinute: number | null;
  accuracyPercentage: number | null;
  fluencyRating: string;
  riskLevel: string;
  passageType: string;
  wordsRead: number | null;
  errors: number | null;
  selfCorrections: number | null;
  hesitations: number | null;
  readingTimeSeconds: number | null;
  interpretationText: string;
  mode: string;
  generalNotes: string;
}): Promise<string> {
  const { studentName, school, grade, wordsPerMinute, accuracyPercentage, fluencyRating, riskLevel, passageType, wordsRead, errors, selfCorrections, hesitations, readingTimeSeconds, interpretationText, mode, generalNotes } = params;
  const firstName = studentName.trim().split(/[\s,]/)[0] ?? studentName;

  const riskLabel =
    riskLevel === "low" ? "Low Concern" :
    riskLevel === "mild" ? "Mild Concern" :
    riskLevel === "moderate" ? "Moderate Concern" : "Significant Concern";

  const mins = readingTimeSeconds != null ? Math.floor(readingTimeSeconds / 60) : null;
  const secs = readingTimeSeconds != null ? readingTimeSeconds % 60 : null;
  const timeStr = mins != null && secs != null ? `${mins}m ${secs}s` : "Not recorded";

  const prompt = `You are a psychoeducational assessment specialist writing a formal clinical interpretation narrative for a student's reading fluency assessment profile.

STUDENT INFORMATION:
- Full Name: ${studentName}
- School: ${school || "Not specified"}
- Grade: ${grade || "Not specified"}
- Administration Mode: ${mode}

RRFA RESULTS:
- Passage Type: ${passageType === "60-second" ? "60-Second Reading" : "Full Passage Reading"}
- Words Read: ${wordsRead ?? "Not recorded"}
- Errors: ${errors ?? "Not recorded"}
- Self-Corrections: ${selfCorrections ?? "Not recorded"}
- Hesitations: ${hesitations ?? "Not recorded"}
- Reading Time: ${timeStr}
- Words Per Minute: ${wordsPerMinute ?? "Not calculated"}
- Accuracy: ${accuracyPercentage != null ? `${accuracyPercentage}%` : "Not calculated"}
- Examiner Rating: ${fluencyRating || "Not rated"}
- Risk Level: ${riskLabel}

SYSTEM INTERPRETATION:
${interpretationText}

EXAMINER NOTES:
${generalNotes || "None recorded."}

---
Write a professional clinical interpretation narrative of this RRFA (ReMynd Reading Fluency Assessment) profile. Use third-person prose throughout. Refer to the student by first name ("${firstName}") naturally. Base ALL content solely on the data provided.

Structure as follows:

RRFA ASSESSMENT SUMMARY

Overview
[Introduce the RRFA: what it measures (reading accuracy, fluency, and automaticity through timed oral passage reading), how it was administered, and the overall pattern of performance.]

Reading Fluency
[Describe ${firstName}'s performance: words per minute, accuracy percentage, examiner rating, and the risk level. Note any patterns with errors, self-corrections, and hesitations. Relate findings to reading automaticity and fluency development.]

Clinical Implications
[Synthesise the fluency profile. Frame implications for reading support. Note whether findings suggest a need for fluency intervention, using appropriate clinical hedging. Do NOT make a diagnosis. Close with a note that results should be interpreted alongside RPPI, RDA, RRCA, and other RAOS assessment findings.]`;

  const result = await callDeepSeek(prompt);
  return result.trim();
}

export async function generateRrcaSummary(params: {
  studentName: string;
  school: string;
  grade: string;
  rawScore: number;
  maxScore: number;
  percentage: number;
  riskLevel: string;
  literalScore: number;
  inferentialScore: number;
  vocabularyScore: number;
  passageTopic: string;
  passageDifficulty: string;
  interpretationText: string;
  mode: string;
  generalNotes: string;
}): Promise<string> {
  const { studentName, school, grade, rawScore, maxScore, percentage, riskLevel, literalScore, inferentialScore, vocabularyScore, passageTopic, passageDifficulty, interpretationText, mode, generalNotes } = params;
  const firstName = studentName.trim().split(/[\s,]/)[0] ?? studentName;

  const riskLabel =
    riskLevel === "low" ? "Low Concern (85–100%)" :
    riskLevel === "mild" ? "Mild Concern (70–84%)" :
    riskLevel === "moderate" ? "Moderate Concern (50–69%)" : "Significant Concern (below 50%)";

  const diffLabel =
    passageDifficulty === "below" ? "Below Age Expectation" :
    passageDifficulty === "above" ? "Above Age Expectation" : "Age Expected";

  const prompt = `You are a psychoeducational assessment specialist writing a formal clinical interpretation narrative for a student's reading comprehension assessment profile.

STUDENT INFORMATION:
- Full Name: ${studentName}
- School: ${school || "Not specified"}
- Grade: ${grade || "Not specified"}
- Administration Mode: ${mode}

RRCA RESULTS:
- Passage Difficulty: ${diffLabel}
- Passage Topic: ${passageTopic || "Not specified"}
- Total Score: ${rawScore} / ${maxScore} (${percentage}%)
- Literal Comprehension: ${literalScore} / 5
- Inferential Comprehension: ${inferentialScore} / 3
- Vocabulary: ${vocabularyScore} / 2
- Risk Level: ${riskLabel}

SYSTEM INTERPRETATION:
${interpretationText}

EXAMINER NOTES:
${generalNotes || "None recorded."}

---
Write a professional clinical interpretation narrative of this RRCA (ReMynd Reading Comprehension Assessment) profile. Use third-person prose throughout. Refer to the student by first name ("${firstName}") naturally. Base ALL content solely on the data provided.

Structure as follows:

RRCA ASSESSMENT SUMMARY

Overview
[Introduce the RRCA: what it measures (reading comprehension using an AI-generated passage across literal, inferential, and vocabulary dimensions), how it was administered, and the overall pattern of performance.]

Reading Comprehension
[Describe ${firstName}'s performance across the three comprehension dimensions: literal (${literalScore}/5), inferential (${inferentialScore}/3), and vocabulary (${vocabularyScore}/2). Discuss relative strengths and areas of difficulty. Reference the overall score (${rawScore}/${maxScore}, ${percentage}%, ${riskLabel}).]

Clinical Implications
[Synthesise the comprehension profile. Note whether difficulties appear to be broadly based or specific to a particular comprehension dimension. Frame implications for literacy and language support. Do NOT make a diagnosis. Close with a note that results should be interpreted alongside RPPI, RDA, RRFA, and other RAOS assessment findings.]`;

  const result = await callDeepSeek(prompt);
  return result.trim();
}

export async function translateAnswersToEnglish(
  answers: Record<string, unknown>,
  fromLanguage: string
): Promise<Record<string, string>> {
  const toTranslate: Record<string, string> = {};

  function collect(obj: Record<string, unknown>, prefix = "") {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "string" && value.trim() && !/^\d+(\.\d+)?$/.test(value.trim()) && value !== "true" && value !== "false") {
        toTranslate[fullKey] = value;
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        collect(value as Record<string, unknown>, fullKey);
      }
    }
  }
  collect(answers);

  if (Object.keys(toTranslate).length === 0) return {};

  const langLabel =
    fromLanguage === "mandarin" ? "Mandarin Chinese" :
    fromLanguage === "cantonese" ? "Cantonese Chinese" :
    fromLanguage === "korean" ? "Korean" : fromLanguage;

  const prompt = `Translate the following form answer values from ${langLabel} to English. Keep proper nouns, names, and values already in English unchanged. Return ONLY a valid JSON object with the same keys and English-translated string values. No markdown, no explanation.

${JSON.stringify(toTranslate, null, 2)}`;

  try {
    const text = await callDeepSeek(prompt, 2000);
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
  } catch {
    return {};
  }
}

const DOMAIN_LABELS_AI: Record<string, string> = {
  attention: "Attention",
  executive_function: "Executive Function",
  emotional_regulation: "Emotional Regulation",
  social_communication: "Social Communication",
  academic_persistence: "Academic Persistence",
  sustained_attention: "Sustained Attention",
  distractibility: "Distractibility",
  impulse_regulation: "Impulse Regulation",
  task_initiation: "Task Initiation",
  behavioral_modulation: "Behavioral Modulation",
  attention_regulation: "Attention Regulation",
  executive_functioning: "Executive Functioning",
  functional_impact: "Functional Impact",
  protective_factors: "Protective Factors",
  working_memory: "Working Memory",
  planning: "Planning & Organization",
  inhibition: "Inhibition",
  cognitive_flexibility: "Cognitive Flexibility",
  self_monitoring: "Self-Monitoring",
  organization: "Organization",
  internalizing: "Internalizing",
  externalizing: "Externalizing",
};

const RESPONDENT_LABEL_AI: Record<string, string> = {
  parent: "Parent/Guardian",
  teacher1: "Teacher 1",
  teacher2: "Teacher 2",
  self: "Student (Self)",
  school_counselor: "School Counselor",
  boarding_staff: "Boarding Staff",
  referring_teacher: "Referring Teacher",
};

export async function generateRemyndIndexInsights(
  caseProfile: { studentName: string; school: string; grade: string; referralReason: string },
  tools: Array<{
    toolName: string;
    respondents: Array<{ respondentType: string; normalizedScores: Record<string, number> }>;
  }>,
  indexData?: Record<string, { average: number; riskBand: string; sources: string[] }>
): Promise<string> {
  const { studentName, school, grade, referralReason } = caseProfile;
  const firstName = studentName.trim().split(/[\s,]/)[0] ?? studentName;

  const scoreSummary = tools.map(tool => {
    const respLines = tool.respondents.map(r => {
      const label = RESPONDENT_LABEL_AI[r.respondentType] ?? r.respondentType;
      const domainLines = Object.entries(r.normalizedScores)
        .map(([d, v]) => `  - ${DOMAIN_LABELS_AI[d] ?? d}: ${v}/100`)
        .join("\n");
      return `  ${label}:\n${domainLines}`;
    }).join("\n");
    return `${tool.toolName}:\n${respLines}`;
  }).join("\n\n");

  const indexSummary = indexData && Object.keys(indexData).length > 0
    ? "\n\nREMYND INDEX (cross-tool averages):\n" +
      Object.entries(indexData)
        .sort((a, b) => b[1].average - a[1].average)
        .map(([d, e]) => `  - ${DOMAIN_LABELS_AI[d] ?? d}: ${e.average}/100 (${e.riskBand.charAt(0).toUpperCase() + e.riskBand.slice(1)}) — ${[...new Set(e.sources)].slice(0, 3).join("; ")}`)
        .join("\n")
    : "";

  const prompt = `You are a psychoeducational specialist writing a clinical interpretation narrative for a formal assessment report. You have been provided with data from the ReMynd Assessment Operating System (RAOS) — a suite of proprietary rating scales completed by multiple respondents.

STUDENT PROFILE:
- Name: ${studentName}
- School: ${school || "Not specified"}
- Grade: ${grade || "Not specified"}
- Referral Reason: ${referralReason || "Not specified"}

NORMALIZED SCORE DATA (0 = no concern, 100 = maximum concern):
Risk bands: 0–25 = Low, 26–50 = Mild, 51–65 = Moderate, 66–100 = Elevated

${scoreSummary}${indexSummary}

Write a professional clinical interpretation narrative (4–6 paragraphs) addressing:
1. Overall functional profile and primary areas of concern based on the cross-informant and cross-tool ReMynd Index data.
2. Per-domain interpretation with convergent (agreeing) and divergent (discrepant) respondent findings, noting which informants report elevated concerns and which do not.
3. Contextual factors that may explain discrepancies (e.g., setting differences, rater perspective, protective factors).
4. Functional implications for ${firstName}'s academic performance, social engagement, and daily functioning.
5. Recommended next steps or assessment directions (e.g., further clinical interview, classroom observation, diagnostic formulation).

Write in formal, professional psychoeducational language suitable for a school psychological report. Use ${firstName}'s first name after the initial introduction. Do not invent data not present in the scores. Do not include disclaimers about AI limitations. Format as flowing paragraphs — no headers, no bullet points.`;

  try {
    const narrative = await callDeepSeek(prompt, 1800);
    return narrative.trim();
  } catch {
    return `Clinical interpretation narrative could not be generated at this time. Please review the score data above and consult with the assessing psychologist for interpretation.`;
  }
}
