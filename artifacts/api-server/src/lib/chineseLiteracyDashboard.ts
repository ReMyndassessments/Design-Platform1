export interface ChineseLiteracyDashboardDomainDefinition {
  id: string;
  label: string;
}

export interface ChineseLiteracyDashboardSnapshot {
  parentRevision: number;
  teacherRevision: number;
}

export interface ChineseLiteracyDashboardCurrentSource {
  revision: number;
  submittedAt: unknown;
}

export type ChineseLiteracyPairEligibility =
  | { eligible: true }
  | { eligible: false; status: 400 | 422; message: string };

export function canReviewChineseLiteracyDashboard(role: string | null | undefined) {
  return role === "admin" || role === "psychometrician" || role === "school_clinical_coordinator";
}

export function validateChineseLiteracyPairEligibility(input: {
  parentIsParentForm: boolean;
  teacherIsParentForm: boolean;
  parentBaselineId: string | null | undefined;
  teacherBaselineId: string | null | undefined;
  parentSubmittedAt: unknown;
  teacherSubmittedAt: unknown;
  parentScoreCount: number;
  teacherScoreCount: number;
}): ChineseLiteracyPairEligibility {
  if (!input.parentIsParentForm || input.teacherIsParentForm) {
    return { eligible: false, status: 400, message: "Choose one parent form and one teacher form from this case." };
  }
  if (input.parentBaselineId || input.teacherBaselineId) {
    return { eligible: false, status: 400, message: "Choose the original parent and teacher forms, not a follow-up." };
  }
  if (!input.parentSubmittedAt || !input.teacherSubmittedAt || !input.parentScoreCount || !input.teacherScoreCount) {
    return { eligible: false, status: 422, message: "Both selected Chinese Literacy forms must be submitted before a comparison can be generated." };
  }
  return { eligible: true };
}

export function alignChineseLiteracyDomains(
  parentDomains: ChineseLiteracyDashboardDomainDefinition[],
  teacherDomains: ChineseLiteracyDashboardDomainDefinition[],
  parentSelected: string[],
  teacherSelected: string[],
) {
  return teacherDomains
    .filter(domain => parentDomains.some(parent => parent.id === domain.id && parent.label === domain.label))
    .filter(domain => parentSelected.includes(domain.id) && teacherSelected.includes(domain.id))
    .map(domain => ({ id: domain.id, name: domain.label }));
}

export function isChineseLiteracySnapshotStale(
  snapshot: ChineseLiteracyDashboardSnapshot,
  parent: ChineseLiteracyDashboardCurrentSource | undefined,
  teacher: ChineseLiteracyDashboardCurrentSource | undefined,
) {
  return !parent || !teacher
    || parent.revision !== snapshot.parentRevision
    || teacher.revision !== snapshot.teacherRevision
    || !parent.submittedAt
    || !teacher.submittedAt;
}

export function collectPrivateValues(...values: unknown[]): string[] {
  const found: string[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const privateKey = /(name|email|phone|address|dob|birth|case.?id|token)/i;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (privateKey.test(key) && typeof child === "string" && child.trim().length >= 2) found.push(child.trim());
      visit(child);
    }
  };
  values.forEach(visit);
  return [...new Set(found)];
}

export function redactPrivateValues<T>(value: T, privateValues: string[]): T {
  if (Array.isArray(value)) return value.map(item => redactPrivateValues(item, privateValues)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .map(([key, child]) => [key, redactPrivateValues(child, privateValues)])) as T;
  }
  if (typeof value !== "string") return value as T;
  const redacted = [...privateValues].sort((a, b) => b.length - a.length).reduce<string>((text, item) => {
    if (/^(unknown|none|n\/a|not provided)$/i.test(item)) return text;
    const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(new RegExp(escaped, "giu"), "[REDACTED]");
  }, value);
  return redacted as T;
}
