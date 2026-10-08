import { isChineseLiteracy, literacyMetadata } from "./chineseLiteracyInstruments.js";
import { CHINESE_LITERACY_KEY } from "./chineseLiteracy.js";
import { CHINESE_LITERACY_PARENT_KEY } from "./chineseLiteracyParent.js";

/** Grade eligibility is not inferred from age, language preference or narrative history. */
export function chineseLiteracyGradeEligible(grade?: string | null): boolean {
  const match = grade?.match(/(?:^|\D)(\d{1,2})(?:\D|$)/);
  return !match || (Number(match[1]) >= 3 && Number(match[1]) <= 12);
}

export function eligibleRecommendationTools<T extends { id: string }>(tools: T[], grade?: string | null): T[] {
  return tools.filter(tool => !isChineseLiteracy(tool.id) || chineseLiteracyGradeEligible(grade));
}

export function recommendationToolName(id: string, name: string): string {
  if (!isChineseLiteracy(id)) return name;
  const metadata = literacyMetadata(id);
  return `${metadata.name} (${metadata.respondent === "parent" ? "Parent" : "Teacher"} Observation Form)`;
}

export function chineseLiteracyRecommendationGuidance(availableIds: string[], grade?: string | null): string {
  const candidates = [CHINESE_LITERACY_KEY, CHINESE_LITERACY_PARENT_KEY]
    .filter(id => availableIds.includes(id) && chineseLiteracyGradeEligible(grade));
  if (!candidates.length) return "Chinese literacy observation forms are not eligible/available in this supplied library. Do not recommend them.";
  return `CHINESE LITERACY OBSERVATION SELECTION:
${candidates.map(id => {
    const meta = literacyMetadata(id);
    return `- Exact ID ${id}: ${recommendationToolName(id, meta.name)}; ${meta.respondent === "parent" ? "parent/caregiver-reported ordinary home observations; assign to a parent or caregiver" : "teacher-reported classroom observations; assign to the relevant Chinese-language teacher"}; Grades 3–12.`;
  }).join("\n")}
Explicitly consider each available version when evidence raises Chinese literacy or Chinese learning concerns, such as character reading/recognition, Chinese writing/spelling/copying, reading comprehension, homework participation or difficulty accessing Chinese instruction. Select the version(s) whose setting and respondent can usefully address the referral; explain the evidence and missing information in each rationale. Home and classroom concerns may justify both, but recommend them as separate instruments with their own exact IDs, not one combined profile.
Do not recommend these merely because a family speaks Mandarin/Cantonese, prefers Chinese, or has English-only literacy difficulties without evidence of Chinese literacy concerns. Grades outside 3–12 are not eligible. If current grade is unknown, flag the need to verify it before assignment; never invent it.
One parent/caregiver is sufficient for the parent form; one relevant teacher is sufficient for the teacher form. Neither requires the other, a second respondent, student interview, direct test or homework upload. Missing teacher evidence must not block a relevant parent recommendation, and vice versa.
These are descriptive developmental observation profiles, not validated dyslexia screeners, diagnostic tests or normative/risk measures. Keep parent-home and teacher-classroom evidence separate; never pool their scores, treat them as equivalent measures or infer a discrepancy diagnosis. Do not automatically assign or send forms; staff review remains required.`;
}

/** Keep the two identically named library entries distinct in the visible AI results. */
export function normalizeLiteracyRecommendations<T extends { toolId: string; name: string }>(
  recommendations: T[], availableIds: string[], grade?: string | null,
): T[] {
  return recommendations.filter(t => !isChineseLiteracy(t.toolId) ||
    (availableIds.includes(t.toolId) && chineseLiteracyGradeEligible(grade)))
    .map(t => isChineseLiteracy(t.toolId)
      ? { ...t, name: recommendationToolName(t.toolId, t.name) }
      : t) as T[];
}
