import type { IntakeAnalysisResult, RecommendedTool } from "./ai.js";

/** Never replace a saved clinical analysis with parseable but incomplete AI output. */
export function parseIntakeAnalysisResult(text: string): IntakeAnalysisResult {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI intake analysis was not JSON");
  const result: unknown = JSON.parse(cleaned.slice(start, end + 1));
  if (typeof result !== "object" || result === null) throw new Error("AI intake analysis was incomplete");
  const data = result as Record<string, unknown>;
  const strings = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every(item => typeof item === "string" && !!item.trim());
  const tools = data.recommendedTools;
  const suggested = data.suggestedQuestions;
  if (
    !Array.isArray(tools) || tools.length === 0 ||
    !tools.every((item: unknown) => {
      if (typeof item !== "object" || item === null) return false;
      const tool = item as Record<string, unknown>;
      return typeof tool.toolId === "string" && !!tool.toolId.trim() &&
        typeof tool.name === "string" && !!tool.name.trim() &&
        typeof tool.rationale === "string" && !!tool.rationale.trim() &&
        ["essential", "recommended", "optional"].includes(String(tool.priority));
    }) ||
    !strings(data.recommendedDomains) || data.recommendedDomains.length === 0 ||
    !["low", "moderate", "high"].includes(String(data.riskLevel)) ||
    typeof data.summary !== "string" || data.summary.trim().length < 20 ||
    data.summary.trim() === "Intake analysis completed." ||
    !strings(data.flags) ||
    typeof suggested !== "object" || suggested === null ||
    !("teacher" in suggested) || !strings(suggested.teacher) || suggested.teacher.length === 0 ||
    !("parent" in suggested) || !strings(suggested.parent) || suggested.parent.length === 0
  ) throw new Error("AI intake analysis was incomplete; the previous analysis has been kept");
  return {
    recommendedTools: tools as RecommendedTool[],
    recommendedDomains: data.recommendedDomains,
    riskLevel: data.riskLevel as IntakeAnalysisResult["riskLevel"],
    summary: data.summary,
    flags: data.flags,
    suggestedQuestions: {
      teacher: suggested.teacher,
      parent: suggested.parent,
    },
  };
}