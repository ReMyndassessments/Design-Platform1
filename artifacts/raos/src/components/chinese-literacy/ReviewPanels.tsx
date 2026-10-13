import { useState } from "react";
import type { ClAdministration, ClDomain, ClMetadata, Priority, ClDomainObservation } from "./types";
import { PARENT_INSTRUMENT_ID } from "./api";
import { parseNarrative } from "./logic";
import { PriorityEditor } from "./PriorityEditor";
import { ScoreList } from "./ScoreList";
import { ReportDocument } from "./ReportDocument";
import type { SupportPlanDraft } from "./types";
import { Banner, Btn, Field, inputCls } from "./ui";

export type RunAction = (body: Record<string, unknown>) => Promise<any>;
type P = { adm: ClAdministration; meta: ClMetadata; run: RunAction; busy: boolean; ai: string; portal: string };
type Translate = (path: string, value: unknown) => string;
const isApproved = (adm: ClAdministration) => adm.report?.status === "approved" || Boolean(adm.report?.approvedAt);
const fmt = (d?: string) => (d ? new Date(d).toLocaleString() : "");

export function EvidencePanel({ adm, meta, run, busy, translate = (_path, value) => String(value ?? "") }: Pick<P, "adm" | "meta" | "run" | "busy"> & { translate?: Translate }) {
  const pm = meta.key === PARENT_INSTRUMENT_ID;
  const [reason, setReason] = useState("");
  const c = adm.input.context ?? {};
  const s = adm.input.summary;
  const show = (path: string, l: string, v: unknown) => { const p = parseNarrative(translate(path, String(v ?? ""))); return <div><dt className="text-[10px] uppercase tracking-wide text-slate-400">{l}</dt><dd className="text-xs text-slate-700">{p.mode === "answer" ? (p.text || "Not provided") : <><span className="font-semibold">{p.mode === "not_known" ? "Not known" : "Not yet observed"}:</span> {p.text}</>}</dd></div>; };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Btn disabled={busy || adm.status === "in_review"} onClick={() => run({ action: "review" })} data-testid="button-start-review">Mark in review</Btn>
        <input className={`${inputCls} max-w-xs`} placeholder={`Reason for returning to ${pm ? "parent" : "teacher"}`} value={reason} onChange={e => setReason(e.target.value)} />
        <Btn variant="danger" disabled={busy || !reason.trim()} onClick={() => run({ action: "return", reason }).then(() => setReason(""))} data-testid="button-return">Return to {pm ? "parent" : "teacher"}</Btn>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-bold mb-3">{pm ? "Parent context" : "Teacher context"}</h3>
        <dl className="grid sm:grid-cols-2 gap-3">
          {(pm ? [["grade", "Grade", c.grade], ["relationship", "Relationship", c.relationship], ["contactFrequency", "Contact", c.contactFrequency], ["setting", "Home setting", c.setting], ["observation", "Observation", `${c.observationStart ?? "?"} to ${c.observationEnd ?? "?"}`], ["completionDate", "Completed", c.completionDate], ["homeLanguages", "Home languages", c.homeLanguages], ["activities", "Activities", c.activities], ["script", "Script", c.script], ["spokenVariety", "Spoken variety", c.spokenVariety], ["readingConfidence", "Reading judgement", c.readingConfidence], ["writingConfidence", "Writing judgement", c.writingConfidence], ["observationLanguage", "Observation language", c.observationLanguage], ["assistanceMode", "Completed how", c.assistanceMode], ["assistantCombined", "Assistant", [c.assistantIdentity, c.assistantLanguage].filter(Boolean).join(", ") || undefined], ["parentConfirmed", "Parent confirmed", c.parentConfirmed === "yes" ? `Yes, ${c.confirmationDate ?? ""}` : "No"], ["schoolFeedback", "School feedback (not rated)", c.schoolFeedback], ["schoolFeedbackSource", "Feedback source", c.schoolFeedbackSource], ["participationImpact", "Participation impact", c.participationImpact], ["questions", "Questions", c.questions]] : [["grade", "Grade", c.grade], ["teacherRole", "Role or subject", c.teacherRole], ["contactFrequency", "Contact", c.contactFrequency], ["setting", "Setting", c.setting], ["timeTeaching", "Time teaching", c.timeTeaching], ["observation", "Observation", `${c.observationStart ?? "?"} to ${c.observationEnd ?? "?"}`], ["script", "Script", c.script], ["spokenVariety", "Spoken variety", c.spokenVariety], ["instruction", "Chinese instruction", c.instruction], ["observationLanguage", "Observation language", c.observationLanguage]]).map(([key, l, v]) => <div key={l as string}><dt className="text-[10px] uppercase tracking-wide text-slate-400">{l}</dt><dd className="text-xs text-slate-700">{translate(`input.context.${key}`, v)}</dd></div>)}
          {show("input.context.exposureHistory", "Exposure and instruction history", c.exposureHistory)}{show("input.context.curriculum", "Curriculum", c.curriculum)}{show("input.context.reason", "Reason for completion", c.reason)}{show("input.context.strengths", "Strengths and interests", c.strengths)}
          {show("input.context.currentSupports", "Current supports", c.currentSupports)}{show("input.context.accessInformation", "Access information", c.accessInformation)}{show("input.context.unknownInformation", "Not known", c.unknownInformation)}
          {c.shortWindowExplanation ? show("input.context.shortWindowExplanation", "Short window explanation", c.shortWindowExplanation) : null}
        </dl>
      </section>
      {pm && (
        <section className="rounded-xl border border-slate-200 bg-white p-4" data-testid="section-parent-domain-evidence"><h3 className="text-sm font-bold mb-3">Home setting and language by domain</h3>
          <dl className="grid sm:grid-cols-2 gap-3">
            {meta.domains.filter(d => adm.input.evidence?.[d.id]?.setting || adm.input.evidence?.[d.id]?.language).map(d => { const e = adm.input.evidence[d.id]; return <div key={d.id}><dt className="text-[10px] uppercase tracking-wide text-slate-400">{d.label}</dt><dd className="text-xs text-slate-700">Setting: {translate(`input.evidence.${d.id}.setting`, e.setting || "Not provided")}. Language: {translate(`input.evidence.${d.id}.language`, e.language || "Not provided")}.</dd></div>; })}
          </dl>
        </section>
      )}
      {adm.scores && adm.scores.length ? <ScoreList scores={adm.scores} translate={translate} /> : <Banner>Scores are calculated on the server when the {pm ? "parent" : "teacher"} submits.</Banner>}
      <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-bold mb-3">{pm ? "Parent summary" : "Teacher summary"}</h3>
        <dl className="grid gap-3">{show("input.summary.strengths", "Strengths", s.strengths)}{show("input.summary.barriers", "Barriers", s.barriers)}{show("input.summary.supportResponse", "Support response", s.supportResponse)}{show("input.summary.discussion", "Further discussion", s.discussion)}</dl>
        {s.priorities.length > 0 && <ul className="mt-3 text-xs text-slate-700 space-y-1 list-disc pl-4">{s.priorities.map((p, i) => <li key={i}>{translate(`input.summary.priorities.${i}.text`, p.text)} <span className="font-mono text-[10px] text-slate-400">{p.itemIds.join(", ")}</span> (proposed owner: {translate(`input.summary.priorities.${i}.owner`, p.owner || "none")})</li>)}</ul>}
      </section>
    </div>
  );
}

export function ReportPanel({ adm, meta, run, busy, ai, portal, translate = (_path, value) => String(value ?? ""), englishView = false, onGenerate, onExport, onOpenSupportPlan }: P & {
  translate?: Translate;
  englishView?: boolean;
  onGenerate: () => Promise<void>;
  onExport: (format: "html" | "doc") => Promise<void>;
  onOpenSupportPlan: () => void;
}) {
  const pm = meta.key === PARENT_INSTRUMENT_ID;
  const [text, setText] = useState<string>(adm.report?.narrative ?? "");
  const [editing, setEditing] = useState(!adm.report?.narrative);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const versions: any[] = Array.isArray(adm.report?.versions) ? adm.report.versions : [];
  const approved = isApproved(adm);
  const hasUnsavedEdits = text !== (adm.report?.narrative ?? "");
  const domainObservations = Array.isArray(adm.report?.domainObservations) ? adm.report.domainObservations as ClDomainObservation[] : [];
  const canExport = Boolean(adm.report?.narrative) && !hasUnsavedEdits && !exporting && !busy;
  const canPrint = canExport && (!editing || englishView);
  const exportReport = async (format: "html" | "doc") => {
    setExporting(true); setExportError(null);
    try { await onExport(format); }
    catch (error) { setExportError((error as Error).message || "Could not export the report."); }
    finally { setExporting(false); }
  };
  const generate = async () => {
    if (adm.report?.narrative && !window.confirm("Replace the current saved report draft with a newly generated draft?")) return;
    setGenerating(true); setGenerateError(null);
    try { await onGenerate(); }
    catch (error) { setGenerateError((error as Error).message || "Could not generate a report draft."); }
    finally { setGenerating(false); }
  };
  return (
    <div className="space-y-4">
      <Banner title="AI-assisted editable draft; professional review required">
        Generate a draft from this {pm ? "parent's home" : "teacher's"} submission only. It will not combine respondents, diagnose, or be released automatically. Review and edit it before approval. {portal === "not_configured" ? "Case Portal is not configured, so nothing is synchronised." : ""}
      </Banner>
      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="ghost" disabled={busy || generating || approved || englishView || hasUnsavedEdits} onClick={() => void generate()} data-testid="button-generate-literacy-report">
          {generating ? "Generating report draft…" : adm.report?.narrative ? "Regenerate draft" : "Generate report draft"}
        </Btn>
        <span className="text-[11px] text-slate-500">The selected respondent’s form is sent to DeepSeek using your configured API. Charges follow your DeepSeek account; staff review and approval are required.</span>
        {hasUnsavedEdits && <span className="text-[11px] text-amber-700">Save your current edits before generating a replacement.</span>}
      </div>
      {generateError && <Banner tone="error" title="Report draft not generated">{generateError}</Banner>}
      {englishView && <Banner>Translated view is for review. You may approve while viewing it; approval applies to the saved source-language report. Switch back to the original to edit the source narrative.</Banner>}
      {text.trim() && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700">{englishView ? "English report preview" : editing ? "Editing report draft" : "Formatted report preview"}</p>
          {!englishView && (
            <Btn variant="ghost" disabled={approved} onClick={() => setEditing(value => !value)} data-testid="button-toggle-report-editor">
              {editing ? "Preview formatted report" : "Edit report"}
            </Btn>
          )}
        </div>
      )}
      {editing && !englishView ? (
        <Field label="Edit report text" hint="Use headings and lists as needed. The preview formats them as a professional report.">
          <textarea rows={18} className={`${inputCls} font-mono text-xs leading-6`} value={text} onChange={e => setText(e.target.value)} disabled={approved} data-testid="input-report-narrative" />
        </Field>
      ) : text.trim() ? (
        <ReportDocument
          content={englishView ? translate("report.narrative", text) : text}
          source={pm ? "Parent-reported · home setting" : "Teacher-reported · teaching setting"}
          formName={meta.formName ?? "Chinese Literacy Observation Profile"}
          approved={approved}
          domainObservations={domainObservations}
          translate={translate}
          onOpenSupportPlan={onOpenSupportPlan}
        />
      ) : (
        <Field label="Report text">
          <textarea rows={18} className={`${inputCls} font-mono text-xs leading-6`} value={text} onChange={e => setText(e.target.value)} disabled={approved} data-testid="input-report-narrative" />
        </Field>
      )}
      <p className="text-[11px] text-slate-500">Required limitation: {meta.reportLimitation}</p>
      {approved && <Banner tone="ok">Approved {fmt(adm.report?.approvedAt)}{adm.report?.approvedBy ? ` by ${adm.report.approvedBy}` : ""}.</Banner>}
      <div className="flex flex-wrap gap-2">
        <Btn variant="ghost" disabled={busy || approved || englishView || !text.trim()} onClick={() => run({ action: "report", report: { narrative: text } })} data-testid="button-save-report">Save draft</Btn>
        <Btn disabled={busy || approved || !text.trim() || (adm.report?.narrative ?? "") !== text} onClick={() => run({ action: "approve" })} data-testid="button-approve">Approve report</Btn>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
        <Btn variant="ghost" disabled={!canExport} onClick={() => void exportReport("doc")} data-testid="button-download-literacy-report">
          {exporting ? "Preparing report…" : "Download Word report"}
        </Btn>
        <Btn variant="ghost" disabled={!canPrint} onClick={() => window.print()} data-testid="button-print-literacy-report">
          Print / Save as PDF
        </Btn>
        {!adm.report?.narrative && <span className="text-[11px] text-slate-500">Generate and save a report draft before downloading or printing.</span>}
        {hasUnsavedEdits && <span className="text-[11px] text-amber-700">Save your edits first so the download and printout match the saved report.</span>}
        {editing && !englishView && adm.report?.narrative && !hasUnsavedEdits && <span className="text-[11px] text-slate-500">Preview the formatted report before printing.</span>}
      </div>
      {exportError && <Banner tone="error" title="Report not downloaded">{exportError}</Banner>}
      {!approved && (adm.report?.narrative ?? "") !== text && <p className="text-[11px] text-amber-700">Save the draft before approving so approval covers this exact text.</p>}
      {versions.length > 0 && (
        <section><h3 className="text-sm font-bold mb-2">Historical versions</h3>
          <ul className="space-y-2">{versions.map((v, i) => <li key={i} className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-[11px] text-slate-500">Version {v.version ?? versions.length - i} {fmt(v.approvedAt ?? v.createdAt ?? v.savedAt)} {v.status ?? ""}</p><p className="mt-1 text-xs text-slate-700 whitespace-pre-wrap">{translate(`report.versions.${i}.narrative`, v.narrative)}</p></li>)}</ul>
        </section>
      )}
    </div>
  );
}

const PATHWAYS: Array<[string, string]> = [["classroom_support_review", "Classroom support and review"], ["targeted_support_planning", "Targeted support planning"], ["comprehensive_assessment_discussion", "Comprehensive assessment discussion"], ["additional_information_needed", "Additional information needed"], ["wellbeing_pathway", "Existing wellbeing pathway"]];

export function PlanPanel({ adm, meta, run, busy, onGenerate, onOpenReport, translate = (_path, value) => String(value ?? ""), englishView = false }: P & {
  onGenerate: () => Promise<SupportPlanDraft>;
  onOpenReport: () => void;
  translate?: Translate;
  englishView?: boolean;
}) {
  const [rationale, setRationale] = useState<string>(adm.plan?.rationale ?? "");
  const [pathway, setPathway] = useState<string>(adm.plan?.pathway ?? "");
  const [pri, setPri] = useState<Priority[]>(adm.plan?.priorities ?? adm.input.summary.priorities ?? []);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const items = Array.from(new Set(adm.input.responses.filter(r => r.status === "rated").map(r => r.itemId)));
  const approved = isApproved(adm);
  const ready = rationale.trim() && pathway && pri.length > 0 && pri.length <= 3 && pri.every(p =>
    p.text.trim() && p.itemIds.length && p.strategyId && p.owner.trim() && p.indicator.trim() && Number.isFinite(Date.parse(p.reviewDate)),
  );
  const generate = async () => {
    if ((rationale.trim() || pathway || pri.some(p => p.text.trim())) && !window.confirm("Replace the current support-plan fields with a new AI-generated draft? Nothing has been saved yet.")) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const draft = await onGenerate();
      setPathway(draft.pathway);
      setRationale(draft.rationale);
      setPri(draft.priorities);
      setGenerated(true);
    } catch (error) {
      setGenerateError((error as Error).message || "Could not generate the support-plan draft.");
    } finally {
      setGenerating(false);
    }
  };
  return (
    <div className="space-y-4">
      {!approved && <Banner tone="warn" title="Approve the report before generating a support plan">
        <span>A support plan needs an approved report first. </span>
        <button type="button" className="font-semibold underline" onClick={onOpenReport} data-testid="button-open-report-for-plan">Open the Report tab</button>
        <span> to review and approve it.</span>
      </Banner>}
      <Banner>The generated plan is a suggestion for professional review—not a score-based or diagnostic decision. Parent and teacher evidence stay separate; support and further assessment can proceed in parallel.</Banner>
      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="ghost" disabled={!approved || busy || generating || englishView} onClick={() => void generate()} data-testid="button-generate-support-plan">
          {generating ? "Generating support-plan draft…" : "Generate support plan with DeepSeek"}
        </Btn>
        <span className="text-[11px] text-slate-500">Only this respondent’s submitted form and approved report are sent to your configured DeepSeek API. Charges follow your DeepSeek account; the draft is not saved until you approve it.</span>
      </div>
      {generateError && <Banner tone="error" title="Support plan not generated">{generateError}</Banner>}
      {generated && <Banner tone="warn" title="AI-generated suggestion — review before approval">Confirm the pathway, evidence links, proposed owner and progress indicator. Choose a review date after agreeing when support starts.</Banner>}
      <Field label="Suggested pathway — confirm or change"><select className={inputCls} value={pathway} onChange={e => setPathway(e.target.value)} disabled={englishView} data-testid="select-pathway"><option value="">Choose a pathway</option>{PATHWAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      <Field label="Rationale"><textarea rows={4} className={inputCls} value={englishView ? translate("plan.rationale", rationale) : rationale} onChange={e => setRationale(e.target.value)} readOnly={englishView} /></Field>
      <PriorityEditor priorities={pri} onChange={setPri} strategies={meta.strategies} itemOptions={items} max={3} readOnly={englishView || generating} englishView={englishView} translate={translate} />
      <p className="text-[11px] text-slate-500">Keep accommodations and skill instruction separately labelled. Audio access to content is not proof that independent reading improved.</p>
      <p className="text-[11px] text-slate-500">Each priority needs an evidence link, proposed owner, observable progress indicator and review date.</p>
      <Btn disabled={busy || generating || englishView || !approved || !ready} onClick={() => run({ action: "plan", plan: { rationale, pathway, priorities: pri } })} data-testid="button-save-plan">Approve support plan</Btn>
    </div>
  );
}

export function MonitoringPanel({ adm, run, busy, translate = (_path, value) => String(value ?? "") }: P & { translate?: Translate }) {
  const [e, setE] = useState({ date: "", supportDelivered: "", participation: "", note: "" });
  const entries: any[] = adm.monitoring?.entries ?? [];
  const comparison: any[] = adm.monitoring?.comparison ?? adm.monitoring?.comparisons ?? [];
  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-bold">Manual progress entry</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Date"><input type="date" className={inputCls} value={e.date} onChange={x => setE({ ...e, date: x.target.value })} /></Field>
          <Field label="Support delivered"><input className={inputCls} value={e.supportDelivered} onChange={x => setE({ ...e, supportDelivered: x.target.value })} /></Field>
        </div>
        <Field label="Classroom participation"><input className={inputCls} value={e.participation} onChange={x => setE({ ...e, participation: x.target.value })} /></Field>
        <Field label="Note"><textarea rows={2} className={inputCls} value={e.note} onChange={x => setE({ ...e, note: x.target.value })} /></Field>
        <Btn disabled={busy || !e.date || !e.supportDelivered.trim()} onClick={() => run({ action: "monitor", entry: e }).then(() => setE({ date: "", supportDelivered: "", participation: "", note: "" }))} data-testid="button-add-entry">Add entry</Btn>
      </section>
         {entries.length === 0 ? <Banner>No progress entries yet. A review roughly 6 to 8 weeks after support starts is suggested, but it is not required for further assessment.</Banner> : (
         <ul className="space-y-2">{entries.map((x, i) => <li key={i} className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700"><span className="font-semibold">{x.date}</span>: {translate(`monitoring.entries.${i}.supportDelivered`, x.supportDelivered)}. Participation: {translate(`monitoring.entries.${i}.participation`, x.participation || "not recorded")}. {translate(`monitoring.entries.${i}.note`, x.note)}</li>)}</ul>
      )}
      <section><h3 className="text-sm font-bold mb-2">Baseline and follow-up comparison</h3>
        {comparison.length === 0 ? <p className="text-xs text-slate-500">No linked follow-up has been submitted.</p> : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-xs"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-2">Domain</th><th className="p-2">Baseline</th><th className="p-2">Follow-up</th><th className="p-2">Change</th><th className="p-2">Conditions</th></tr></thead>
            <tbody>{comparison.map((r, i) => { const cv = (x: any) => x ? `${x.displayMean ?? "no mean"} (${x.validCount ?? "?"}/${x.applicableCount ?? "?"} rated, ${x.coverage != null ? Math.round(x.coverage * 100) + "%" : "n/a"})` : "Not administered";
              return <tr key={i} className="border-t border-slate-100 align-top"><td className="p-2 font-semibold">{r.domainId}</td><td className="p-2">{cv(r.baseline)}</td><td className="p-2">{cv(r.followup)}</td>
                <td className="p-2 tabular-nums">{r.change == null ? "Not calculated" : (r.change > 0 ? "+" : "") + Number(r.change).toFixed(1)}</td><td className="p-2 text-slate-500">{(r.limitations ?? []).map((limitation: string, j: number) => translate(`monitoring.comparison.${i}.limitations.${j}`, limitation)).join("; ") || "Coverage conditions met"}</td></tr>; })}</tbody></table></div>
        )}
        <p className="text-[11px] text-slate-500 mt-2">A lower frequency may reflect changing support or conditions and is not shown as a significant effect. A change is only calculated when both administrations meet coverage conditions.</p>
      </section>
    </div>
  );
}

export function FollowUpPanel({ adm, meta, run, busy, onExport }: P & { onExport: (f: "html" | "doc") => Promise<void> }) {
  const [whole, setWhole] = useState(true);
  const [sel, setSel] = useState<string[]>([]);
  const [link, setLink] = useState<string | null>(null);
  const [exp, setExp] = useState<string | null>(null);
  const domains: ClDomain[] = meta.domains;
  const go = async () => { const r = await run({ action: "followup", ...(whole ? {} : { domains: sel }) }); if (r?.link) setLink(r.link); };
  const doExport = async (f: "html" | "doc") => { setExp(null); try { await onExport(f); } catch (e) { setExp((e as Error).message); } };
  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-bold">Create linked follow-up</h3>
        <p className="text-xs text-slate-500">The follow-up is linked to this baseline. Domains left out are recorded as not administered. No email is sent; share the link yourself.</p>
        <label className="flex items-center gap-2 text-xs"><input type="radio" checked={whole} onChange={() => setWhole(true)} /> Whole form</label>
        <label className="flex items-center gap-2 text-xs"><input type="radio" checked={!whole} onChange={() => setWhole(false)} /> Selected full domains</label>
        {!whole && <div className="grid sm:grid-cols-2 gap-1">{domains.map(d => <label key={d.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={sel.includes(d.id)} onChange={() => setSel(sel.includes(d.id) ? sel.filter(x => x !== d.id) : [...sel, d.id])} /> {d.label}</label>)}</div>}
        <Btn disabled={busy || (!whole && sel.length === 0)} onClick={go} data-testid="button-followup">Create follow-up</Btn>
        {link && <Banner tone="ok" title="Follow-up created"><input readOnly className={inputCls} value={link} onFocus={e => e.currentTarget.select()} data-testid="text-followup-link" /></Banner>}
      </section>
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-bold">Export frozen snapshot</h3>
        <p className="text-xs text-slate-500">Printable HTML supports browser Save as PDF. The Word document is editable.</p>
        <div className="flex gap-2"><Btn variant="ghost" onClick={() => doExport("html")} data-testid="button-export-html">Printable HTML</Btn><Btn variant="ghost" onClick={() => doExport("doc")} data-testid="button-export-doc">Word document</Btn></div>
        {exp && <Banner tone="error">{exp}</Banner>}
      </section>
    </div>
  );
}
