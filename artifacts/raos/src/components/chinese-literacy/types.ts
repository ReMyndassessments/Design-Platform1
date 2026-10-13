export type ResponseStatus = "rated" | "not_observed" | "not_applicable" | "unanswered";
export interface ItemResponse { itemId: string; status: ResponseStatus; value: number | null; reason?: string }
export interface Priority { text: string; itemIds: string[]; strategyId: string; owner: string; indicator: string; reviewDate: string }
export interface SupportPlanDraft { pathway: string; rationale: string; priorities: Priority[] }
export interface ClDomainObservation {
  id: string;
  label: string;
  distribution: Array<{ value: number; label: string; count: number }>;
  mean: string | number | null;
  validCount: number;
  applicableCount: number;
  requiredValidCount: number;
  coverage: number | null;
  frequentDifficultyCount: number;
  frequentDifficultyItemIds: string[];
  notObservedCount: number;
  notApplicableCount: number;
  unansweredCount: number;
  impact: number | null;
  strengths: string;
  supports: string;
  examples: Array<{ text: string; itemIds: string[] }>;
  narrative: string;
  interpretation: string;
  planningRecommendation: string;
  itemsForDiscussion: Array<{ id: string; text: string; value: number }>;
  itemsWithFrequentRatings: Array<{ id: string; text: string; value: number }>;
}
export interface EvidenceExample { text: string; itemIds: string[] }
export interface DomainEvidence { examples: EvidenceExample[]; strengths: string; supports: string; opportunities?: number | null; impact: 0 | 1 | 2 | 3 | null; setting?: string; language?: string }
export type SectionDecision = "complete" | "not_observed" | "not_applicable";
export type InterfaceLanguage = "english" | "mandarin" | "korean";
export interface ClInput {
  context: Record<string, any>;
  responses: ItemResponse[];
  sections: Record<string, { decision: SectionDecision; reason?: string }>;
  evidence: Record<string, DomainEvidence>;
  summary: { strengths: string; barriers: string; supportResponse: string; discussion: string; priorities: Priority[] };
  interfaceLanguage: InterfaceLanguage;
}
export interface ClItem { id: string; text: string }
export interface ClDomain { id: string; label: string; requirement: string; items: ClItem[] }
export interface ClStrategy { id: string; label: string; type: string; options: string[] }
export interface ClMetadata {
  key: string; name: string; version: string; scoringVersion: string; introduction: string; limitation: string; reportLimitation: string;
  domains: ClDomain[]; anchors: string[]; strategies: ClStrategy[];
  translationStatus: { english: string; mandarin: string; korean: string }; gradeExamples?: any; formName?: string; setting?: string; respondent?: string;
}
export interface ClScore {
  id: string; label: string; status: string; totalItems: number; applicableCount: number; validCount: number; notApplicableCount: number;
  notObservedCount: number; unansweredCount: number; coverage: number | null; requiredValidCount: number; sum: number | null; mean: number | null;
  displayMean: string | number | null; frequentDifficultyItemIds: string[]; frequentDifficultyCount: number; impact: number | null;
  examples: EvidenceExample[]; scoredItemIds: string[]; applicableItemIds: string[];
}
export interface ClAdministration {
  assignmentId: string; caseId: string; instrumentVersion: string; scoringVersion: string; languageVersion: string; status: string; revision: number;
  input: ClInput; scores: ClScore[] | null; baselineId: string | null; selectedDomains: string[] | null; report: any; plan: any; monitoring: any;
  teacherName?: string; teacherEmail?: string; metadata?: ClMetadata;
}
export interface ClEnvelope {
  administration: ClAdministration; metadata: ClMetadata;
  student: { identifier: string; age: string | number | null; grade: string | number | null };
  teacher: { name: string; email: string };
  integration: { portal: string; ai: string };
}
export interface ValidationIssue { step: string; message: string }
