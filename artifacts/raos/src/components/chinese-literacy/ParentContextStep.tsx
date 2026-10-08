import { useLocalizedView, Verbatim } from "./Localization";
import type { ClInput } from "./types";
import { composeNarrative, parseNarrative, windowDays } from "./logic";
import { hasStaffToken } from "./api";
import { Banner, Field, inputCls } from "./ui";

const FREQ = ["Daily", "Several times a week", "Weekly", "Less than weekly", "Unknown"];
const SCRIPT = [["simplified", "Simplified"], ["traditional", "Traditional"], ["both", "Both"], ["other", "Other"], ["unknown", "Unknown"]];
const VARIETY = [["mandarin", "Mandarin"], ["cantonese", "Cantonese"], ["other", "Other"], ["unknown", "Unknown"]];
const CONF = [["comfortable", "Comfortable judging"], ["some_limits", "Some limits"], ["unable_to_judge", "Unable to judge"]];
const MODES = [["independent", "I completed it myself"], ["assessor", "An assessor helped me"], ["interpreter", "An interpreter helped me"], ["paper", "Paper copy entered by staff"]];

function Narrative({ label, value, onChange, hint }: { label: string; value: unknown; onChange: (v: string) => void; hint?: string }) {
  const view = useLocalizedView();
  const p = parseNarrative(value);
  return view(
    <Field label={label} hint={hint}>
      <select aria-label={`${label} response type`} className={`${inputCls} mb-1.5`} value={p.mode} onChange={e => onChange(composeNarrative(e.target.value as any, p.text))}>
        <option value="answer">Provide an answer</option><option value="not_known">Not known (explain)</option><option value="not_yet">Not yet observed (explain)</option>
      </select>
      <textarea className={inputCls} rows={3} value={p.text} placeholder={p.mode === "answer" ? "" : "Brief explanation"} onChange={e => onChange(composeNarrative(p.mode, e.target.value))} />
    </Field>
  );
}

export function ParentContextStep({ input, setContext, student, respondent }: {
  input: ClInput; setContext: (k: string, v: any) => void;
  student: { identifier: string; age: string | number | null; grade: string | number | null }; respondent: { name: string; email: string };
}) {
  const view = useLocalizedView();
  const c = input.context; const days = windowDays(c);
  const txt = (k: string, label: string, ph?: string, hint?: string) => (
    <Field label={label} hint={hint}><input className={inputCls} value={c[k] ?? ""} placeholder={ph} onChange={e => setContext(k, e.target.value)} data-testid={`input-${k}`} /></Field>
  );
  const sel = (k: string, label: string, opts: readonly (string | readonly string[])[]) => (
    <Field label={label}>
      <select className={inputCls} value={c[k] ?? ""} onChange={e => setContext(k, e.target.value)} data-testid={`select-${k}`}>
        <option value="">Choose</option>
        {opts.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o[0]} value={o[0]}>{o[1]}</option>)}
      </select>
    </Field>
  );
  const assisted = !!c.assistanceMode && c.assistanceMode !== "independent";
  const staff = hasStaffToken();
  return view(
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 grid sm:grid-cols-3 gap-2">
        <div><span className="block text-[10px] uppercase tracking-wide text-slate-400">Student</span><Verbatim>{student.identifier}</Verbatim></div>
        <div><span className="block text-[10px] uppercase tracking-wide text-slate-400">Age on case</span>{student.age ?? "Not recorded"}</div>
        <div><span className="block text-[10px] uppercase tracking-wide text-slate-400">Parent or caregiver</span>{respondent.name ? <Verbatim>{respondent.name}</Verbatim> : "Not recorded"}</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Grade" hint="This instrument covers Grades 3 to 12.">
          <select className={inputCls} value={c.grade ?? ""} onChange={e => setContext("grade", e.target.value)} data-testid="select-grade">
            <option value="">Choose</option>{Array.from({ length: 10 }, (_, i) => i + 3).map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </Field>
        {txt("relationship", "Your relationship to the student", "For example, mother, grandfather")}
        {sel("contactFrequency", "How often you see the student", FREQ)}
        {txt("setting", "Ordinary home setting", "For example, evenings and weekends at home")}
        {txt("observationLanguage", "Language used to observe or discuss learning")}
        {txt("homeLanguages", "Languages used at home")}
        {sel("spokenVariety", "Spoken variety at home", VARIETY)}
        {sel("script", "Written script", SCRIPT)}
        {sel("readingConfidence", "How confident are you judging your child's Chinese reading?", CONF)}
        {sel("writingConfidence", "How confident are you judging your child's Chinese writing?", CONF)}
        <Field label="Observation start"><input type="date" className={inputCls} value={c.observationStart ?? ""} onChange={e => setContext("observationStart", e.target.value)} /></Field>
        <Field label="Observation end"><input type="date" className={inputCls} value={c.observationEnd ?? ""} onChange={e => setContext("observationEnd", e.target.value)} /></Field>
        <Field label="Completion date"><input type="date" className={inputCls} value={c.completionDate ?? ""} onChange={e => setContext("completionDate", e.target.value)} /></Field>
      </div>
      <Banner tone={days != null && days < 28 ? "warn" : "info"} title="Observation window">
        About 4 to 6 weeks of everyday observation is a proposed guideline, not a validated minimum. A shorter window can still be submitted with an explanation.
      </Banner>
      {days != null && days < 28 && (
        <Field label={`Explain the evidence available (window is ${days} day${days === 1 ? "" : "s"})`}><textarea className={inputCls} rows={2} value={c.shortWindowExplanation ?? ""} onChange={e => setContext("shortWindowExplanation", e.target.value)} data-testid="input-shortWindowExplanation" /></Field>
      )}
      <Banner tone="warn" title="Observe naturally">Only describe what you have seen in everyday life. Please do not test your child or set reading or writing tasks. If your child has limited Chinese ability, answer No (not observed), not NA.</Banner>
      {txt("activities", "Home activities involving Chinese reading or writing", "For example, messaging relatives, shopping signs")}
      <Narrative label="Why you are completing this form" value={c.reason} onChange={v => setContext("reason", v)} />
      <Narrative label="Literacy strengths and interests" value={c.strengths} onChange={v => setContext("strengths", v)} />
      <Narrative label="Current supports at home" value={c.currentSupports} onChange={v => setContext("currentSupports", v)} />
      <Narrative label="Chinese literacy exposure or instruction history you know of" value={c.exposureHistory} onChange={v => setContext("exposureHistory", v)} />
      <Narrative label="Instruction, attendance or access information" value={c.accessInformation} onChange={v => setContext("accessInformation", v)} hint="Please avoid unrelated medical or family details." />
      <Narrative label="Information you do not know" value={c.unknownInformation} onChange={v => setContext("unknownInformation", v)} />
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <h3 className="text-sm font-bold text-slate-800">School feedback (recorded separately, not rated)</h3>
        <Field label="What the school has told you (optional)"><textarea className={inputCls} rows={2} value={c.schoolFeedback ?? ""} onChange={e => setContext("schoolFeedback", e.target.value)} /></Field>
        {txt("schoolFeedbackSource", "Who gave this feedback", "Required if feedback is entered")}
        <Field label="How literacy affects participation (optional)"><textarea className={inputCls} rows={2} value={c.participationImpact ?? ""} onChange={e => setContext("participationImpact", e.target.value)} /></Field>
        <Field label="Questions you would like answered (optional)"><textarea className={inputCls} rows={2} value={c.questions ?? ""} onChange={e => setContext("questions", e.target.value)} /></Field>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <h3 className="text-sm font-bold text-slate-800">How this form was completed</h3>
        {sel("assistanceMode", "Completion method", MODES)}
        {assisted && <div className="grid sm:grid-cols-2 gap-4">{txt("assistantIdentity", "Name or role of the person who helped")}{txt("assistantLanguage", "Language used to help")}</div>}
        {c.assistanceMode === "paper" && staff && (
          <label className="flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" checked={c.staffSourceConfirmed === "yes"} onChange={e => setContext("staffSourceConfirmed", e.target.checked ? "yes" : "")} data-testid="checkbox-staffSourceConfirmed" /> I confirm I am entering this from the parent's own signed paper form.</label>
        )}
        <label className="flex items-start gap-2 text-sm text-slate-800"><input type="checkbox" className="mt-1" checked={c.parentConfirmed === "yes"} onChange={e => setContext("parentConfirmed", e.target.checked ? "yes" : "")} data-testid="checkbox-parentConfirmed" /> These are my own observations of my child.</label>
        <Field label="Confirmation date"><input type="date" className={`${inputCls} max-w-xs`} value={c.confirmationDate ?? ""} onChange={e => setContext("confirmationDate", e.target.value)} /></Field>
      </section>
    </div>
  );
}
