export const PHASE_ORDER = [
  "pre_commitment", "intake", "setup", "forms", "assessment",
  "scoring", "report", "final_review", "debrief", "complete",
] as const;

export const DISPLAY_PHASES = [
  "intake", "assessment", "scoring", "report", "final_review", "debrief", "complete",
] as const;

/** Without a target, retain the legacy one-internal-phase Step Back behavior. */
export function resolveStepBackTarget(current: string, requested?: string): string | null {
  const currentIndex = PHASE_ORDER.findIndex(phase => phase === current);
  if (currentIndex <= 0) return null;
  if (requested === undefined) return PHASE_ORDER[currentIndex - 1];
  if (!DISPLAY_PHASES.some(phase => phase === requested)) return null;
  const targetIndex = PHASE_ORDER.findIndex(phase => phase === requested);
  return targetIndex >= 0 && targetIndex < currentIndex ? requested : null;
}