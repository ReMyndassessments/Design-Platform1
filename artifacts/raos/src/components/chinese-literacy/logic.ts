import { hasStaffToken, isParentKey } from "./api";
import type { ClDomain, ClInput, ClMetadata, DomainEvidence, ItemResponse, ValidationIssue } from "./types";

export const CONTEXT_REQUIRED: Array<[string, string]> = [
  ["grade", "Grade"], ["teacherRole", "Teacher role or subject"], ["contactFrequency", "Contact frequency"], ["setting", "Observation setting"],
  ["timeTeaching", "Time teaching the student"], ["observationStart", "Observation start"], ["observationEnd", "Observation end"],
  ["script", "Written script"], ["spokenVariety", "Spoken variety used in teaching"], ["instruction", "Chinese instruction"],
  ["observationLanguage", "Language used to observe or discuss learning"], ["exposureHistory", "Chinese literacy exposure or instruction history"],
  ["curriculum", "Curriculum context"], ["reason", "Reason for completion"], ["strengths", "Literacy strengths and interests"],
  ["currentSupports", "Current supports and teaching strategies"], ["accessInformation", "Instruction, attendance or access information"],
  ["unknownInformation", "Information that is not known"],
];
export const PARENT_CONTEXT_REQUIRED: Array<[string, string]> = [
  ["grade", "Grade"], ["relationship", "Relationship to the student"], ["contactFrequency", "How often you see the student"], ["setting", "Home setting"],
  ["observationStart", "Observation start"], ["observationEnd", "Observation end"], ["completionDate", "Completion date"], ["homeLanguages", "Languages used at home"],
  ["activities", "Home activities involving reading or writing"], ["spokenVariety", "Spoken variety"], ["script", "Written script"],
  ["readingConfidence", "Confidence judging reading"], ["writingConfidence", "Confidence judging writing"], ["observationLanguage", "Language used to observe or discuss learning"],
  ["reason", "Reason for completion"], ["strengths", "Literacy strengths and interests"], ["currentSupports", "Current supports at home"],
  ["exposureHistory", "Chinese literacy exposure or instruction history"], ["accessInformation", "Instruction, attendance or access information"],
  ["unknownInformation", "Information that is not known"], ["assistanceMode", "How the form was completed"], ["confirmationDate", "Confirmation date"],
];
export const isParentMeta = (meta?: { key?: string } | null) => isParentKey(meta?.key);
export const NARRATIVE_KEYS = new Set(["exposureHistory", "curriculum", "reason", "strengths", "currentSupports", "accessInformation", "unknownInformation"]);
export const isCore = (d: ClDomain) => /^(core|required)/i.test(d.requirement);
export const isOptional = (d: ClDomain) => /optional/i.test(d.requirement);
export const blankEvidence = (): DomainEvidence => ({ examples: [], strengths: "", supports: "", opportunities: null, impact: null });
export const blankResponse = (itemId: string): ItemResponse => ({ itemId, status: "unanswered", value: null });

export function activeDomains(meta: ClMetadata, selected: string[] | null | undefined): ClDomain[] {
  return selected && selected.length ? meta.domains.filter(d => selected.includes(d.id)) : meta.domains;
}
export function parseGrade(g: unknown): string {
  const n = parseInt(String(g ?? "").replace(/\D/g, ""), 10);
  return n >= 3 && n <= 12 ? String(n) : "";
}
export function normalizeInput(raw: Partial<ClInput> | null | undefined, meta: ClMetadata, studentGrade?: unknown): ClInput {
  const byId = new Map((raw?.responses ?? []).map(r => [r.itemId, r]));
  const responses = meta.domains.flatMap(d => d.items.map(i => byId.get(i.id) ?? blankResponse(i.id)));
  const sections = { ...(raw?.sections ?? {}) };
  for (const d of meta.domains) {
    if (sections[d.id]) continue;
    const sectionResponses = d.items.map(item => byId.get(item.id));
    if (sectionResponses.length > 0 && sectionResponses.every(response => response && response.status !== "unanswered")) {
      // Older drafts allowed item-by-item decisions without a separate section-level click.
      // A fully answered section is therefore an explicit item-level completion.
      sections[d.id] = { decision: "complete" };
    }
  }
  const evidence: Record<string, DomainEvidence> = {};
  meta.domains.forEach(d => { evidence[d.id] = { ...blankEvidence(), ...(raw?.evidence?.[d.id] ?? {}) }; });
  const context = { ...(raw?.context ?? {}) };
  if (!context.grade) { const g = parseGrade(studentGrade); if (g) context.grade = g; }
  return {
    context, responses, sections, evidence,
    summary: { strengths: "", barriers: "", supportResponse: "", discussion: "", priorities: [], ...(raw?.summary ?? {}) },
    interfaceLanguage: raw?.interfaceLanguage ?? "english",
  };
}
export const respMap = (input: ClInput) => new Map(input.responses.map(r => [r.itemId, r]));

/** "Not known: why" / "Not yet observed: why" helpers */
export function parseNarrative(v: unknown): { mode: "answer" | "not_known" | "not_yet"; text: string } {
  const s = typeof v === "string" ? v : "";
  if (/^Not known:/.test(s)) return { mode: "not_known", text: s.replace(/^Not known:\s?/, "") };
  if (/^Not yet observed:/.test(s)) return { mode: "not_yet", text: s.replace(/^Not yet observed:\s?/, "") };
  return { mode: "answer", text: s };
}
export function composeNarrative(mode: "answer" | "not_known" | "not_yet", text: string) {
  return mode === "answer" ? text : `${mode === "not_known" ? "Not known" : "Not yet observed"}: ${text}`;
}
export const narrativeFilled = (v: unknown) => { const p = parseNarrative(v); return p.text.trim().length > 0; };

export function windowDays(ctx: Record<string, any>): number | null {
  if (!ctx.observationStart || !ctx.observationEnd) return null;
  const d = (new Date(ctx.observationEnd).getTime() - new Date(ctx.observationStart).getTime()) / 86400000;
  return Number.isFinite(d) ? Math.round(d) + 1 : null;
}

export function domainStats(d: ClDomain, input: ClInput) {
  const m = respMap(input);
  let rated = 0, no = 0, na = 0, un = 0;
  d.items.forEach(i => {
    const r = m.get(i.id);
    if (!r || r.status === "unanswered") un++; else if (r.status === "rated") rated++; else if (r.status === "not_observed") no++; else na++;
  });
  const applicable = d.items.length - na;
  return { total: d.items.length, rated, no, na, un, applicable, answered: d.items.length - un, coverage: applicable > 0 ? rated / applicable : null, required: Math.max(2, Math.ceil((4 * applicable) / 5)) };
}
export function overallProgress(input: ClInput, domains: ClDomain[]) {
  let total = 0, answered = 0, rated = 0, applicable = 0;
  domains.forEach(d => { const s = domainStats(d, input); total += s.total; answered += s.answered; rated += s.rated; applicable += s.applicable; });
  return { total, answered, rated, applicable, completion: total ? answered / total : 0, ratedCoverage: applicable ? rated / applicable : 0 };
}
export function itemsNeedingEvidence(d: ClDomain, input: ClInput): string[] {
  const m = respMap(input);
  const linked = new Set((input.evidence[d.id]?.examples ?? []).filter(e => e.text.trim()).flatMap(e => e.itemIds));
  return d.items.filter(i => { const r = m.get(i.id); return r?.status === "rated" && (r.value === 4 || r.value === 5) && !linked.has(i.id); }).map(i => i.id);
}

export function validateInput(input: ClInput, meta: ClMetadata, domains: ClDomain[]): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const ctx = input.context;
  const parent = isParentMeta(meta);
  (parent ? PARENT_CONTEXT_REQUIRED : CONTEXT_REQUIRED).forEach(([k, label]) => {
    const v = ctx[k];
    if (NARRATIVE_KEYS.has(k) ? !narrativeFilled(v) : !String(v ?? "").trim()) out.push({ step: "context", message: `${label} is required (use Not known or Not yet observed with a brief explanation where applicable).` });
  });
  if (parent) {
    if (ctx.assistanceMode && ctx.assistanceMode !== "independent") {
      if (!String(ctx.assistantIdentity ?? "").trim()) out.push({ step: "context", message: "Assistant identity is required when someone helped complete the form." });
      if (!String(ctx.assistantLanguage ?? "").trim()) out.push({ step: "context", message: "Assistant language is required when someone helped complete the form." });
    }
    if (ctx.parentConfirmed !== "yes") out.push({ step: "context", message: "Please confirm the form reflects your own observations." });
    const wd = windowDays(ctx);
    if (wd != null && wd < 28 && !String(ctx.shortWindowExplanation ?? "").trim()) out.push({ step: "context", message: "Explain the available evidence because the observation window is under 28 days." });
    if (String(ctx.schoolFeedback ?? "").trim() && !String(ctx.schoolFeedbackSource ?? "").trim()) out.push({ step: "context", message: "Say who the school feedback came from." });
  }
  if (parent && ctx.assistanceMode === "paper" && hasStaffToken() && ctx.staffSourceConfirmed !== "yes") out.push({ step: "context", message: "Confirm the paper source before submitting staff-entered responses." });
  const g = parseInt(String(ctx.grade), 10);
  if (ctx.grade && !(g >= 3 && g <= 12)) out.push({ step: "context", message: "Grade must be between 3 and 12 for this instrument." });
  if (ctx.observationStart && ctx.observationEnd && new Date(ctx.observationEnd) < new Date(ctx.observationStart)) out.push({ step: "context", message: "Observation end cannot be before the start." });
  (["strengths", "barriers", "supportResponse"] as const).forEach(k => {
    if (!narrativeFilled(input.summary[k])) out.push({ step: "summary", message: `Summary ${k}: provide a response or an explicit Not known with explanation.` });
  });
  input.summary.priorities.forEach((p, n) => {
    if (!p.text.trim() || !p.owner.trim() || !p.indicator.trim() || !p.reviewDate || !p.strategyId || !p.itemIds.length) out.push({ step: "summary", message: `Priority ${n + 1} needs text, linked items, a strategy, an owner, a progress indicator and a review date.` });
  });
  const m = respMap(input);
  domains.forEach(d => {
    const step = `d:${d.id}`;
    const sec = input.sections[d.id];
    const s = domainStats(d, input);
    if (sec?.decision === "not_applicable" && !(sec.reason ?? "").trim()) out.push({ step, message: `${d.label}: a reason is required when the whole section is not applicable.` });
    if (!isCore(d) && !sec) out.push({ step, message: `${d.label}: choose Complete this section, Not observed, or Not applicable.` });
    else if (s.un > 0) out.push({ step, message: `${d.label}: ${s.un} item${s.un === 1 ? "" : "s"} still need a rating, Not observed, or Not applicable.` });
    d.items.forEach(i => { const r = m.get(i.id); if (r?.status === "not_applicable" && !(r.reason ?? "").trim() && !(sec?.decision === "not_applicable" && (sec.reason ?? "").trim())) out.push({ step, message: `${i.id}: a reason is required for Not applicable.` }); });
    if (parent && s.rated > 0 && sec?.decision !== "not_observed" && sec?.decision !== "not_applicable") {
      const pe = input.evidence[d.id];
      if (!String(pe?.setting ?? "").trim()) out.push({ step, message: `${d.label}: say in what home setting this was observed.` });
      if (!String(pe?.language ?? "").trim()) out.push({ step, message: `${d.label}: say which language was involved.` });
      if (!String(pe?.strengths ?? "").trim() || !String(pe?.supports ?? "").trim()) out.push({ step, message: `${d.label}: describe strengths and usual support, or explain what was not observed.` });
    }
  });
  return out;
}
export function gradeBand(grade: unknown) {
  const n = parseInt(String(grade), 10);
  return n >= 3 && n <= 5 ? "3-5" : n >= 6 && n <= 8 ? "6-8" : n >= 9 && n <= 12 ? "9-12" : null;
}
export function gradeExamplesFor(meta: ClMetadata, d: ClDomain, grade: unknown): string[] {
  const ge: any = meta.gradeExamples; const band = gradeBand(grade);
  if (!ge || !band) return [];
  const pick = (v: any): any => (v && typeof v === "object" && !Array.isArray(v) ? v[d.id] ?? v[d.label] : v);
  const v = pick(ge[band] ?? ge[band.replace("-", "–")] ?? ge[`grades${band}`]) ?? pick(ge[d.id]?.[band] ? ge[d.id][band] : undefined);
  if (!v) return [];
  return (Array.isArray(v) ? v : [v]).map(x => typeof x === "string" ? x : x?.text ?? JSON.stringify(x));
}
const NOTES: Record<string, string> = {
  D: "Copying difficulty may relate to task accessibility rather than literacy skill.",
  CL: "Stroke-order differences alone do not establish dyslexia.", SQ: "Stroke-order differences alone do not establish dyslexia.",
  CN: "These items are not an attention-disorder scale.", L: "Accent, dialect, code-switching and second-language learning are not themselves disorders.",
  M: "Finger counting or manipulatives are not themselves difficulties.", MC: "Motor observations do not explain the cause of literacy difficulty.",
  SA: "Wellbeing observations do not explain the cause of literacy difficulty.",
};
export function domainNote(d: ClDomain): string | null {
  const prefix = (d.items[0]?.id ?? "").replace(/^P-/, "").replace(/\d+$/, "");
  return NOTES[prefix] ?? null;
}
