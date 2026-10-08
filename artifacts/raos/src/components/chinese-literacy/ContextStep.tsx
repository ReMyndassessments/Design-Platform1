import type { ClInput } from "./types";
import { composeNarrative, parseNarrative, windowDays } from "./logic";
import { Banner, Field, inputCls } from "./ui";

const OPTS = {
  contactFrequency: ["Daily", "Several times a week", "Weekly", "Less than weekly", "Unknown"],
  script: [["simplified", "Simplified"], ["traditional", "Traditional"], ["both", "Both"], ["other", "Other"], ["unknown", "Unknown"]],
  spokenVariety: [["mandarin", "Mandarin"], ["cantonese", "Cantonese"], ["other", "Other"], ["unknown", "Unknown"]],
  instruction: [["main curriculum", "Main curriculum"], ["additional language", "Additional language"], ["literacy support", "Literacy support"], ["other", "Other"], ["unknown", "Unknown"]],
} as const;

function Narrative({ label, value, onChange, hint }: { label: string; value: unknown; onChange: (v: string) => void; hint?: string }) {
  const p = parseNarrative(value);
  return (
    <Field label={label} hint={hint}>
      <select aria-label={`${label} response type`} className={`${inputCls} mb-1.5`} value={p.mode} onChange={e => onChange(composeNarrative(e.target.value as any, p.text))}>
        <option value="answer">Provide an answer</option>
        <option value="not_known">Not known (explain)</option>
        <option value="not_yet">Not yet observed (explain)</option>
      </select>
      <textarea className={inputCls} rows={3} value={p.text} placeholder={p.mode === "answer" ? "" : "Brief explanation"} onChange={e => onChange(composeNarrative(p.mode, e.target.value))} />
    </Field>
  );
}

export function ContextStep({ input, setContext, student, teacher }: {
  input: ClInput; setContext: (k: string, v: any) => void;
  student: { identifier: string; age: string | number | null; grade: string | number | null }; teacher: { name: string; email: string };
}) {
  const c = input.context; const days = windowDays(c);
  const sel = (k: keyof typeof OPTS, label: string) => (
    <Field label={label}>
      <select className={inputCls} value={c[k] ?? ""} onChange={e => setContext(k, e.target.value)} data-testid={`select-${k}`}>
        <option value="">Choose</option>
        {OPTS[k].map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o[0]} value={o[0]}>{o[1]}</option>)}
      </select>
    </Field>
  );
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 grid sm:grid-cols-3 gap-2">
        <div><span className="block text-[10px] uppercase tracking-wide text-slate-400">Student</span>{student.identifier}</div>
        <div><span className="block text-[10px] uppercase tracking-wide text-slate-400">Age on case</span>{student.age ?? "Not recorded"}</div>
        <div><span className="block text-[10px] uppercase tracking-wide text-slate-400">Teacher</span>{teacher.name}</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Grade" hint="This instrument covers Grades 3 to 12.">
          <select className={inputCls} value={c.grade ?? ""} onChange={e => setContext("grade", e.target.value)} data-testid="select-grade">
            <option value="">Choose</option>{Array.from({ length: 10 }, (_, i) => i + 3).map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </Field>
        <Field label="Your role or subject"><input className={inputCls} value={c.teacherRole ?? ""} onChange={e => setContext("teacherRole", e.target.value)} data-testid="input-teacherRole" /></Field>
        {sel("contactFrequency", "How often you teach this student")}
        <Field label="Observation setting"><input className={inputCls} value={c.setting ?? ""} placeholder="For example, Chinese class, small group" onChange={e => setContext("setting", e.target.value)} /></Field>
        <Field label="Time teaching this student"><input className={inputCls} value={c.timeTeaching ?? ""} placeholder="For example, 5 months" onChange={e => setContext("timeTeaching", e.target.value)} /></Field>
        <Field label="Language used to observe or discuss learning"><input className={inputCls} value={c.observationLanguage ?? ""} onChange={e => setContext("observationLanguage", e.target.value)} /></Field>
        <Field label="Observation start"><input type="date" className={inputCls} value={c.observationStart ?? ""} onChange={e => setContext("observationStart", e.target.value)} /></Field>
        <Field label="Observation end"><input type="date" className={inputCls} value={c.observationEnd ?? ""} onChange={e => setContext("observationEnd", e.target.value)} /></Field>
      </div>
      <Banner tone={days != null && days < 28 ? "warn" : "info"} title="Observation window">
        About 4 to 6 weeks of recent observation is a proposed guideline, not a validated minimum. A shorter window is fine and never blocks submission.
        {days != null && days < 28 && <> Your window is {days} day{days === 1 ? "" : "s"}; you can explain the evidence available below.</>}
      </Banner>
      {days != null && days < 28 && (
        <Field label="Explain the available evidence (optional)"><textarea className={inputCls} rows={2} value={c.shortWindowExplanation ?? ""} onChange={e => setContext("shortWindowExplanation", e.target.value)} /></Field>
      )}
      <div className="grid sm:grid-cols-3 gap-4">{sel("script", "Written script")}{sel("spokenVariety", "Spoken variety used in teaching")}{sel("instruction", "Chinese instruction")}</div>
      <Banner>The interface language is separate from the language of observation. Spoken Chinese proficiency is not the same as Chinese reading proficiency.</Banner>
      <Narrative label="Chinese literacy exposure or instruction history you know of" value={c.exposureHistory} onChange={v => setContext("exposureHistory", v)} />
      <Narrative label="Relevant curriculum context" value={c.curriculum} onChange={v => setContext("curriculum", v)} />
      <Narrative label="Reason for completing this form" value={c.reason} onChange={v => setContext("reason", v)} />
      <Narrative label="Literacy strengths and interests" value={c.strengths} onChange={v => setContext("strengths", v)} />
      <Narrative label="Current supports and teaching strategies" value={c.currentSupports} onChange={v => setContext("currentSupports", v)} />
      <Narrative label="Relevant instruction, attendance or access information" value={c.accessInformation} onChange={v => setContext("accessInformation", v)} hint="Please avoid unrelated medical or family information." />
      <Narrative label="Information you do not know" value={c.unknownInformation} onChange={v => setContext("unknownInformation", v)} />
    </div>
  );
}
