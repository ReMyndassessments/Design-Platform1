import { useLocalizedView, ClLanguageContext, Verbatim } from "./Localization";
import { translateLiteracyText } from "./localization";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, PARENT_INSTRUMENT_ID, clRequest, formUrl, metadataUrl, setOptionalStaffAuth } from "./api";
import { ParentContextStep } from "./ParentContextStep";
import type { ClMetadata } from "./types";
import { ContextStep } from "./ContextStep";
import { DomainStep } from "./DomainStep";
import { ReviewStep } from "./ReviewStep";
import { ScoreList } from "./ScoreList";
import { SummaryStep } from "./SummaryStep";
import { activeDomains, normalizeInput, overallProgress, validateInput } from "./logic";
import type { ClEnvelope, ClInput, InterfaceLanguage } from "./types";
import { useDraftSync } from "./useDraftSync";
import { Banner, Btn, Skeleton } from "./ui";
import { BrandedHeader } from "./BrandedHeader";

export interface TeacherFormProps {
  token: string; preview?: boolean; instrument?: string; onBack?: () => void;
  /** Preview only: fires after the local validation check runs. Nothing is saved or submitted. */
  onValidated?: (result: { passed: boolean; language: string; input: ClInput; testAnswers: Record<string, string> }) => void;
}

/** Flattened map for the generic questionnaire test endpoint: item id to "1".."5" for rated items, "NO"/"NA" otherwise (unanswered omitted). */
export function toTestAnswers(input: ClInput): Record<string, string> {
  const out: Record<string, string> = {};
  input.responses.forEach(r => { if (r.status === "rated") out[r.itemId] = String(r.value); else if (r.status === "not_observed") out[r.itemId] = "NO"; else if (r.status === "not_applicable") out[r.itemId] = "NA"; });
  return out;
}

export default function TeacherForm(props: TeacherFormProps) {
  const [env, setEnv] = useState<ClEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true; setEnv(null); setError(null);
    const load = props.preview
      ? clRequest<any>(props.instrument ? metadataUrl(props.instrument) : "/api/chinese-literacy/metadata", { staff: true }).then((r): ClEnvelope => {
          const metadata: ClMetadata = r?.metadata ?? r;
          return {
            metadata, student: { identifier: "Preview student", age: null, grade: null }, teacher: { name: props.instrument === PARENT_INSTRUMENT_ID ? "Preview parent" : "Preview teacher", email: "" },
            integration: { portal: "not_configured", ai: "manual_only" },
            administration: { assignmentId: "preview", caseId: "preview", instrumentVersion: metadata.version, scoringVersion: metadata.scoringVersion, languageVersion: "english", status: "draft", revision: 0, input: null as any, scores: null, baselineId: null, selectedDomains: null, report: null, plan: null, monitoring: null },
          };
        })
      : clRequest<ClEnvelope>(formUrl(props.token));
    load.then(e => live && setEnv(e)).catch(e => live && setError(e instanceof ApiError ? e.message : "Could not load the form."));
    return () => { live = false; };
  }, [props.token, props.preview, props.instrument, attempt]);
  if (error) return (
    <div className="max-w-xl mx-auto p-6 space-y-3"><Banner tone="error" title="This form could not be loaded">{error}</Banner>
      <div className="flex gap-2"><Btn onClick={() => setAttempt(a => a + 1)}>Try again</Btn>{props.onBack && <Btn variant="ghost" onClick={props.onBack}>Back to package</Btn>}</div></div>
  );
  if (!env) return <Skeleton />;
  return <FormBody key={props.token} env={env} {...props} />;
}

function FormBody({ env: initial, token, preview = false, onBack, onValidated }: TeacherFormProps & { env: ClEnvelope }) {
  const meta = initial.metadata ?? initial.administration.metadata!;
  const { student, teacher, integration } = initial;
  const parent = meta.key === PARENT_INSTRUMENT_ID;
  useEffect(() => { setOptionalStaffAuth(parent); return () => setOptionalStaffAuth(false); }, [parent]);
  const [adm, setAdm] = useState(initial.administration);
  const domains = useMemo(() => activeDomains(meta, adm.selectedDomains), [meta, adm.selectedDomains]);
  const locked = !preview && !["not_started", "in_progress", "returned"].includes(adm.status);
  const [input, setInput] = useState<ClInput>(() => normalizeInput(preview ? null : adm.input, meta, student.grade));
  const view = useLocalizedView(input.interfaceLanguage);
  const inputRef = useRef(input);
  const sync = useDraftSync({ token, enabled: !preview && !locked, initialRevision: adm.revision });
  const steps = useMemo(() => ["intro", "context", ...domains.map(d => `d:${d.id}`), "summary", "review"], [domains]);
  const stepKey = `cl-step-${token}`;
  const [step, setStep] = useState(() => { const s = preview ? "intro" : sessionStorage.getItem(stepKey); return s && steps.includes(s) ? s : "intro"; });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [passed, setPassed] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const update = useCallback((fn: (i: ClInput) => ClInput) => {
    const next = fn(inputRef.current); inputRef.current = next; setInput(next); setPassed(false); setSubmitError(null); sync.markDirty(next);
  }, [sync.markDirty]);
  const goTo = (s: string) => { setStep(s); if (!preview) sessionStorage.setItem(stepKey, s); topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const issues = useMemo(() => validateInput(input, meta, domains), [input, meta, domains]);
  const progress = overallProgress(input, domains);
  const idx = steps.indexOf(step);

  const [resolving, setResolving] = useState<string | null>(null);
  const reloadLatest = async () => {
    if (!window.confirm(translateLiteracyText("Discard your unsaved local edits and load the latest saved version?", input.interfaceLanguage))) return;
    setResolving("reload");
    try {
      const latest = await clRequest<ClEnvelope>(formUrl(token));
      const next = normalizeInput(latest.administration.input, meta, student.grade);
      inputRef.current = next; setInput(next); setAdm(latest.administration); sync.resolveReload(latest.administration.revision);
    } catch (e) { setSubmitError((e as Error).message); } finally { setResolving(null); }
  };
  const overwriteLatest = async () => {
    if (!window.confirm(translateLiteracyText("Overwrite the newer saved version with what is on your screen? Changes saved elsewhere will be replaced.", input.interfaceLanguage))) return;
    setResolving("overwrite");
    try { await sync.overwrite(); } catch (e) { setSubmitError((e as Error).message); } finally { setResolving(null); }
  };
  const setLang = (l: InterfaceLanguage) => update(i => ({ ...i, interfaceLanguage: l }));
  const setReadOnlyLang = (l: InterfaceLanguage) => {
    const next = { ...inputRef.current, interfaceLanguage: l };
    inputRef.current = next;
    setInput(next);
  };
  const submit = async () => {
    setSubmitError(null);
    if (preview) { const ok = issues.length === 0; setPassed(ok); onValidated?.({ passed: ok, language: input.interfaceLanguage, input, testAnswers: toTestAnswers(input) }); return; }
    setSubmitting(true);
    try {
      const ok = await sync.flush();
      if (!ok) throw new Error(sync.status === "conflict" ? "Resolve the revision conflict above before submitting." : "Your latest edits could not be saved yet. Please retry.");
      const res = await clRequest<ClEnvelope>(`${formUrl(token)}/submit`, { method: "POST", body: { revision: sync.revisionRef.current, input: inputRef.current } });
      setAdm(res.administration); sessionStorage.removeItem(stepKey);
    } catch (e) {
      setSubmitError(e instanceof ApiError && e.issues.length ? `${e.message} ${e.issues.join(" ")}` : (e as Error).message);
    } finally { setSubmitting(false); }
  };

  if (locked) {
    return <ClLanguageContext.Provider value={input.interfaceLanguage}>{view(
      <div className="min-h-[100dvh] bg-slate-50">
        <BrandedHeader
          title={meta.name}
          formName={meta.formName ?? (parent ? "Parent Observation Form for Grades 3–12" : "Teacher Form, Grades 3 to 12")}
          version={meta.version}
          studentIdentifier={<Verbatim>{student.identifier}</Verbatim>}
          language={input.interfaceLanguage}
          setLang={setReadOnlyLang}
          progress={progress.completion}
        />
        <main className="max-w-3xl mx-auto p-4 sm:p-8 space-y-5">
          <Banner tone="ok" title="Observation submitted">Thank you. This form is now locked. A reviewer will use it to {parent ? "understand what you see at home alongside any school information;" : "agree classroom support;"} it does not diagnose or rule out any condition.</Banner>
          {adm.scores?.some(score => ["R", "D", "W", "CL"].includes(score.id) && score.status !== "scored" && score.status !== "not_administered") && (
            <Banner tone="warn" title="Additional information needed">The core literacy observations are not sufficient for a descriptive profile yet. Classroom support can continue while the reviewer gathers more observation opportunities. This is not a risk or diagnostic label.</Banner>
          )}
          {adm.scores && adm.scores.length > 0 && <ScoreList scores={adm.scores} />}
          <p className="text-[11px] text-slate-500">{meta.limitation}</p>
          {onBack && <Btn variant="ghost" onClick={onBack} data-testid="button-back-package">Back to package</Btn>}
        </main>
      </div>
    )}</ClLanguageContext.Provider>;
  }

  const lang = input.interfaceLanguage;
  const statusText = preview ? "Preview: nothing is saved" : sync.status === "saving" ? "Saving" : sync.status === "pending" ? "Unsaved changes" : sync.status === "error" ? "Not saved" : sync.status === "conflict" ? "Resolving newer revision" : sync.savedAt ? `Saved ${sync.savedAt.toLocaleTimeString()}` : "Draft";
  const cur = domains.find(d => `d:${d.id}` === step);

  return <ClLanguageContext.Provider value={input.interfaceLanguage}>{view(
    <div className="min-h-[100dvh] bg-slate-50" ref={topRef}>
      <BrandedHeader
        title={meta.name}
        formName={meta.formName ?? (parent ? "Parent Observation Form for Grades 3–12" : "Teacher Form, Grades 3 to 12")}
        version={meta.version}
        studentIdentifier={<Verbatim>{student.identifier}</Verbatim>}
        language={lang}
        setLang={setLang}
        progress={progress.completion}
        status={<span role="status" data-testid="status-save">{statusText}</span>}
        onRetrySave={sync.status === "error" ? () => void sync.flush() : undefined}
        saveError={sync.status === "error"}
      />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {preview && <Banner tone="warn" title="Staff preview, safe test mode">Answers stay in this browser. Nothing is saved, submitted or written to live data.</Banner>}
        {sync.status === "conflict" && (
          <Banner tone="error" title="This form was changed somewhere else">
            Autosave is paused and your edits are still on screen, unsaved. {sync.message}
            <div className="mt-2 flex flex-wrap gap-2">
              <Btn variant="ghost" disabled={!!resolving} onClick={() => void reloadLatest()} data-testid="button-conflict-reload">Reload latest, discard my edits</Btn>
              <Btn variant="danger" disabled={!!resolving} onClick={() => void overwriteLatest()} data-testid="button-conflict-overwrite">Overwrite with my edits</Btn>
            </div>
          </Banner>
        )}
        {sync.status !== "conflict" && sync.message && <Banner tone={sync.status === "error" ? "error" : "warn"}>{sync.message}</Banner>}
        {lang === "mandarin" && <Banner title="Chinese translation">Chinese wording is available throughout this form. Switching language does not change your answers. This translation has not yet had an independent bilingual educational review.</Banner>}
        {lang === "korean" && <Banner title="English source wording shown">The Korean translation is pending bilingual educational review, so the English source wording is shown. Switching language never changes your answers.</Banner>}
        {adm.selectedDomains && adm.selectedDomains.length > 0 && <Banner>This follow-up covers {domains.length} selected domain{domains.length === 1 ? "" : "s"}. Other domains are not administered.</Banner>}
        <nav aria-label="Form steps" className="flex gap-1 overflow-x-auto pb-1">
          {steps.map((s, i) => {
            const label = s === "intro" ? "Start" : s === "context" ? "Context" : s === "summary" ? "Summary" : s === "review" ? "Submit" : domains.find(d => `d:${d.id}` === s)?.label ?? s;
            return <button key={s} type="button" onClick={() => goTo(s)} aria-current={s === step ? "step" : undefined} className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold border ${s === step ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-300 hover:border-primary"}`}>{i > 1 && i < steps.length - 2 ? `${i - 1}. ` : ""}{label}</button>;
          })}
        </nav>

        {step === "intro" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-slate-900">{parent ? "Chinese literacy observation: parent form" : "Chinese literacy observation"}</h1>
            <p className="text-sm text-slate-700 leading-relaxed">{meta.introduction}</p>
            <Banner title="What this form is">{meta.limitation}</Banner>
            <Banner tone="info" title="Before you start">{parent ? "Use what you have seen at home, ideally over the last 4 to 6 weeks. Please do not test your child or set tasks. If your child has limited Chinese ability, choose No, not NA. One parent or caregiver is enough. " : "Use recent observations, ideally from the last 4 to 6 weeks. "}Nothing is pre-filled with ratings. Your draft saves automatically and you can return to it later. {integration.ai === "manual_only" ? "Reports are written manually by a reviewer." : ""}</Banner>
            <p className="text-xs text-slate-500">English source and Chinese translation are available. Chinese translation is pending independent bilingual educational review.</p>
          </div>
        )}
        {step === "context" && (parent
          ? <ParentContextStep input={input} student={student} respondent={teacher} setContext={(k, v) => update(i => ({ ...i, context: { ...i.context, [k]: v } }))} />
          : <ContextStep input={input} student={student} teacher={teacher} setContext={(k, v) => update(i => ({ ...i, context: { ...i.context, [k]: v } }))} />)}
        {cur && <DomainStep domain={cur} input={input} meta={meta} update={update} />}
        {step === "summary" && <SummaryStep input={input} meta={meta} update={update} parent={parent} />}
        {step === "review" && <ReviewStep parent={parent} input={input} domains={domains} issues={issues} goTo={goTo} onSubmit={() => void submit()} submitting={submitting} preview={preview} error={submitError} passed={passed} />}

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            {onBack && <Btn variant="ghost" onClick={async () => { if (!preview) await sync.flush(); onBack(); }}>Back to package</Btn>}
            <Btn variant="ghost" disabled={idx <= 0} onClick={() => goTo(steps[idx - 1])} data-testid="button-prev">Previous</Btn>
          </div>
          <Btn disabled={idx >= steps.length - 1} onClick={() => goTo(steps[idx + 1])} data-testid="button-next">Next</Btn>
        </div>
        <p className="text-[11px] text-slate-400 text-center">{meta.limitation}</p>
      </main>
    </div>
  )}</ClLanguageContext.Provider>;
}
