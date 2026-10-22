const RESPONSE_ARRAY_LIMITS: Record<string, number> = {
  studentStrengths: 12,
  observedConcerns: 16,
  interpretations: 12,
  alternativeExplanations: 12,
  missingInformation: 12,
  safetyFlags: 12,
};

const PLAN_ARRAY_LIMITS: Record<string, number> = {
  priorityTargets: 3,
  supportStrategies: 6,
  observableGoals: 4,
  progressMonitoring: 4,
};

export function normalizeSycAnalysisOutput(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const response = { ...(value as Record<string, unknown>) };
  for (const [key, maxItems] of Object.entries(RESPONSE_ARRAY_LIMITS)) {
    if (Array.isArray(response[key])) response[key] = response[key].slice(0, maxItems);
  }

  const plan = response.interventionPlanDraft;
  if (plan && typeof plan === "object" && !Array.isArray(plan)) {
    const normalizedPlan = { ...(plan as Record<string, unknown>) };
    for (const [key, maxItems] of Object.entries(PLAN_ARRAY_LIMITS)) {
      if (Array.isArray(normalizedPlan[key])) normalizedPlan[key] = normalizedPlan[key].slice(0, maxItems);
    }
    response.interventionPlanDraft = normalizedPlan;
  }

  const questions = response.suggestedQuestions;
  if (questions && typeof questions === "object" && !Array.isArray(questions)) {
    const normalizedQuestions = { ...(questions as Record<string, unknown>) };
    for (const key of ["teacher", "parent"]) {
      if (Array.isArray(normalizedQuestions[key])) normalizedQuestions[key] = normalizedQuestions[key].slice(0, 8);
    }
    response.suggestedQuestions = normalizedQuestions;
  }
  return response;
}
