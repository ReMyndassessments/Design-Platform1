/**
 * This policy controls generic scoring eligibility, not assignment/submission
 * eligibility. Unknown versions within a protected family must not fall back
 * to a percentage score merely because their exact ID is not recognized.
 */
export function instrumentScoringFamily(toolId: string | null | undefined): "BRIEF2" | "BASC3" | "BYI2" | "SDQ" | null {
  const key = (toolId ?? "").trim().toUpperCase().replace(/[\s_-]/g, "");
  if (key.startsWith("BRIEF2") || key.startsWith("BREIF2")) return "BRIEF2";
  if (key.startsWith("BASC3")) return "BASC3";
  if (key.startsWith("BYI2")) return "BYI2";
  if (key.startsWith("SDQ")) return "SDQ";
  return null;
}

export function usesInstrumentSpecificScoring(toolId: string | null | undefined): boolean {
  return instrumentScoringFamily(toolId) !== null;
}

export function assertGenericScoringAllowed(toolId: string): void {
  const family = instrumentScoringFamily(toolId);
  if (family) throw new Error(`${family} requires its instrument-specific scoring pathway; generic domain averages and /100 normalization are not valid.`);
}
