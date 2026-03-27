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


export async function analyzeIntakeWithAI(intake: {
  studentName: string;
  school: string;
  referralReason: string;
  grade?: string | null;
  intakeData?: unknown;
}): Promise<{
  recommendedDomains: string[];
  riskLevel: "low" | "moderate" | "high";
  summary: string;
  flags: string[];
}> {
  const prompt = `You are a psychoeducational assessment specialist AI. Analyze the following student intake information and provide assessment recommendations.

Student: ${intake.studentName}
School: ${intake.school}
Grade: ${intake.grade ?? "Unknown"}
Referral Reason: ${intake.referralReason}
Additional Intake Data: ${JSON.stringify(intake.intakeData ?? {})}

Based on this information, provide a JSON response (no markdown, just pure JSON) with:
- recommendedDomains: array of relevant domains from ["attention", "executive_function", "emotional_regulation", "social_communication", "academic_persistence", "memory", "processing_speed"]
- riskLevel: "low", "moderate", or "high"
- summary: 2-3 sentence clinical summary of the referral concerns
- flags: array of specific concerns to watch for

Example format:
{"recommendedDomains": ["attention", "executive_function"], "riskLevel": "moderate", "summary": "Student presents with...", "flags": ["Possible ADHD inattentive presentation", "Academic underachievement"]}`;

  try {
    const text = await callDeepSeek(prompt);
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      recommendedDomains: parsed.recommendedDomains ?? ["attention"],
      riskLevel: parsed.riskLevel ?? "moderate",
      summary: parsed.summary ?? "Intake analysis completed.",
      flags: parsed.flags ?? [],
    };
  } catch {
    return {
      recommendedDomains: ["attention", "executive_function"],
      riskLevel: "moderate",
      summary: `Student ${intake.studentName} has been referred for: ${intake.referralReason}. Full AI analysis unavailable; manual review recommended.`,
      flags: ["Manual review recommended"],
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
    const text = await callDeepSeek(prompt);
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
}): Promise<AnalyzedFormResult> {

  // Extract structure + all items in English only — no translation here
  const extractPrompt = `You are a psychoeducational assessment expert. Analyze the provided assessment form and extract structured information.

${params.formText ? `FORM CONTENT:\n${params.formText}\n` : ""}${params.imageBase64 ? "Please analyze the assessment form shown in the image." : ""}

Return a JSON object (no markdown, no code fences) with EXACTLY this structure:
{
  "suggestedId": "SHORT_UPPERCASE_ID (max 10 chars, e.g. BRIEF, BASC, RASR)",
  "name": "Full official name of the assessment tool",
  "description": "1-2 sentence description of what the tool measures and who it is for",
  "category": "One of: cognitive, behavior, language, social-emotional, executive-function, achievement, adaptive, memory, processing, admin",
  "scoringType": "auto or manual",
  "domains": ["array", "of", "psychological_domains", "being_assessed"],
  "respondentTypes": ["array from: parent, teacher1, teacher2, boarding_staff, referring_teacher, self, invigilator"],
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

  return {
    suggestedId: (parsed.suggestedId ?? "TOOL").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 10),
    name: parsed.name ?? "",
    description: parsed.description ?? "",
    category: parsed.category ?? "behavior",
    scoringType: parsed.scoringType === "auto" ? "auto" : "manual",
    domains: Array.isArray(parsed.domains) ? parsed.domains : [],
    respondentTypes: Array.isArray(parsed.respondentTypes) ? parsed.respondentTypes : [],
    formItems,
  };
}

export async function translateFormItemsWithAI(
  items: RawFormItem[],
  options: { sequential?: boolean } = {}
): Promise<RawFormItem[]> {
  const BATCH_SIZE = 15;
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
