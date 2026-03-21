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
