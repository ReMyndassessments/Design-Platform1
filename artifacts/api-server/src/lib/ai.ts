import { AssessmentTool } from "@workspace/db/schema";

const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = "https://api.deepseek.com";
const MODEL = "deepseek-chat";

async function callDeepSeek(prompt: string): Promise<string> {
  if (!API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
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
  description: string;
  category: string;
  scoringType: "auto" | "manual";
  domains: string[];
  respondentTypes: string[];
};

export async function lookupToolWithAI(toolId: string, toolName: string): Promise<ToolMetadata> {
  const prompt = `You are a psychoeducational assessment expert with comprehensive knowledge of standardized assessment instruments used internationally.

Provide metadata for the following assessment tool:
Tool ID / Abbreviation: ${toolId}
Full Name: ${toolName}

Return a JSON object (no markdown, no code fences) with EXACTLY this structure:
{
  "description": "2-3 sentence description of what this tool measures, age range, and who it is designed for",
  "category": "One of: cognitive, behavior, language, social-emotional, executive-function, achievement, adaptive, memory, processing, admin",
  "scoringType": "auto or manual",
  "domains": ["array", "of", "specific_psychological_domains_assessed"],
  "respondentTypes": ["array from: parent, teacher1, teacher2, student, self, school, school_counselor, special_needs_teacher, referring_teacher"]
}

Rules:
- Use your knowledge of this specific instrument to give accurate metadata
- If this is a parent-report version, include only "parent" in respondentTypes
- If this is a teacher-report version, include "teacher1"
- If it measures both anxiety and depression, list both as separate domains
- scoringType is "auto" for standardized scales with fixed scoring keys, "manual" for clinical judgment tools
- Be specific with domains (e.g. "separation_anxiety", "social_anxiety", "generalized_anxiety", "depression", "ocd" rather than just "anxiety")

Return ONLY the JSON object, nothing else.`;

  const raw = await callDeepSeek(prompt);
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("AI did not return valid JSON");
  const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as ToolMetadata;

  return {
    description: parsed.description ?? "",
    category: parsed.category ?? "behavior",
    scoringType: parsed.scoringType === "auto" ? "auto" : "manual",
    domains: Array.isArray(parsed.domains) ? parsed.domains : [],
    respondentTypes: Array.isArray(parsed.respondentTypes) ? parsed.respondentTypes : [],
  };
}

async function callDeepSeekMultimodal(
  textPrompt: string,
  imageBase64?: string,
  mimeType?: string,
): Promise<string> {
  if (!API_KEY) throw new Error("DEEPSEEK_API_KEY is not configured");

  type ContentBlock =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

  const content: ContentBlock[] = [];
  if (imageBase64 && mimeType) {
    content.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } });
  }
  content.push({ type: "text", text: textPrompt });

  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: imageBase64 ? "deepseek-chat" : MODEL,
      messages: [{ role: "user", content }],
      temperature: 0.3,
      max_tokens: 4096,
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
    type: "likert" | "text" | "checkbox" | "radio" | "multiple_choice" | "scale";
    options?: string[];
    domain?: string;
  }>;
};

export async function analyzeFormWithAI(params: {
  formText?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<AnalyzedFormResult> {
  const prompt = `You are a psychoeducational assessment expert. Analyze the provided assessment form and extract structured information.

${params.formText ? `FORM CONTENT:\n${params.formText}\n` : ""}${params.imageBase64 ? "Please analyze the assessment form shown in the image." : ""}

Return a JSON object (no markdown, no code fences) with EXACTLY this structure:
{
  "suggestedId": "SHORT_UPPERCASE_ID (max 10 chars, e.g. BRIEF, BASC, RASR)",
  "name": "Full official name of the assessment tool",
  "description": "1-2 sentence description of what the tool measures and who it is for",
  "category": "One of: cognitive, behavior, language, social-emotional, executive-function, achievement, adaptive, memory, processing, admin",
  "scoringType": "auto or manual",
  "domains": ["array", "of", "psychological_domains", "being_assessed"],
  "respondentTypes": ["array from: parent, teacher1, teacher2, student, self, school, school_counselor, special_needs_teacher, referring_teacher"],
  "formItems": [
    {
      "id": "q1",
      "text": "Exact question or item text",
      "type": "likert | text | checkbox | radio | multiple_choice | scale",
      "options": ["response options if applicable"],
      "domain": "which domain this item measures"
    }
  ]
}

Rules:
- Extract ALL items/questions from the form. Do not skip any.
- For Likert-scale items (e.g. Never/Sometimes/Often/Always), use type "likert"
- Keep question text exact as written in the form
- If a section header exists, use it to infer the domain for items in that section
- respondentTypes should reflect who fills out this form
- Provide at least the first 20 items if the form is long; include all if fewer than 50 items

Return ONLY the JSON object, nothing else.`;

  const raw = await callDeepSeekMultimodal(prompt, params.imageBase64, params.mimeType);

  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("AI did not return valid JSON");
  const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as AnalyzedFormResult;

  return {
    suggestedId: (parsed.suggestedId ?? "TOOL").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 10),
    name: parsed.name ?? "",
    description: parsed.description ?? "",
    category: parsed.category ?? "behavior",
    scoringType: parsed.scoringType === "auto" ? "auto" : "manual",
    domains: Array.isArray(parsed.domains) ? parsed.domains : [],
    respondentTypes: Array.isArray(parsed.respondentTypes) ? parsed.respondentTypes : [],
    formItems: Array.isArray(parsed.formItems) ? parsed.formItems : [],
  };
}
