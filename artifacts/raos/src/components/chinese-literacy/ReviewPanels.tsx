import { useState } from "react";
import type { ClAdministration, ClDomain, ClMetadata, Priority } from "./types";
import { parseNarrative } from "./logic";
import { PriorityEditor } from "./PriorityEditor";
import { ScoreList } from "./ScoreList";
import { Banner, Btn, Field, inputCls } from "./ui";

export type RunAction = (body: Record<string, unknown>) => Promise<any>;
type P = { adm: ClAdministration; meta: ClMetadata; run: RunAction; busy: boolean; ai: string; portal: string };
const isApproved = (adm: ClAdministration) => adm.report?.status === "approved" || Boolean(adm.report?.approvedAt);
const fmt = (d?: string) => (d ? new Date(d).toLocaleString() : "");

export function EvidencePanel({ adm, run, busy }: Pick<P, "adm" | "run" | "busy">) {
  const [reason, setReason] = useState("");
  const c = adm.input.context ?? {};
  const s = adm.input.summary;
  const show = (l: string, v: unknown) => { const p = parseNarrative(v); return <div><dt className="text-[10px] uppercase tracking-wide text-slate-400">{l}</dt><dd className="text-xs text-slate-700">{p.mode === "answer" ? (p.text || "Not provided") : <><span className="font-semibold">{p.mode === "not_known" ? "Not known" : "Not yet observed"}:</span> {p.text}</>}</dd></div>; };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Btn disabled={busy || adm.status === "in_review"} onClick={() => run({ action: "review" })} data-testid="button-start-review">Mark in review</Btn>
        <input className={`${inputCls} max-w-xs`} placeholder="Reason for returning to teacher" value={reason} onChange={e => setReason(e.target.value)} />
        <Btn variant="danger" disabled={busy || !reason.trim()} onClick={() => run({ action: "return", reason }).then(() => setReason(""))} data-testid="button-return">Return to teacher</Btn>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-bold mb-3">Teacher context</h3>
        <dl className="grid sm:grid-cols-2 gap-3">
          {[["Grade", c.grade], ["Role or subject", c.teacherRole], ["Contact", c.contactFrequency], ["Setting", c.setting], ["Time teaching", c.timeTeaching], ["Observation", `${c.observationStart ?? "?"} to ${c.observationEnd ?? "?"}`], ["Script", c.script], ["Spoken variety", c.spokenVariety], ["Chinese instruction", c.instruction], ["Observation language", c.observationLanguage]].map(([l, v]) => <div key={l as string}><dt className="text-[10px] uppercase tracking-wide text-slate-400">{l}</dt><dd className="text-xs text-slate-700">{String(v ?? "Not provided")}</dd></div>)}
          {show("Exposure and instruction history", c.exposureHistory)}{show("Curriculum", c.curriculum)}{show("Reason for completion", c.reason)}{show("Strengths and interests", c.strengths)}
          {show("Current supports", c.currentSupports)}{show("Access information", c.accessInformation)}{show("Not known", c.unknownInformation)}
          {c.shortWindowExplanation ? show("Short window explanation", c.shortWindowExplanation) : null}
        </dl>
      </section>
      {adm.scores && adm.scores.length ? <ScoreList scores={adm.scores} /> : <Banner>Scores are calculated on the server when the teacher submits.</Banner>}
      <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-bold mb-3">Teacher summary</h3>
        <dl className="grid gap-3">{show("Strengths", s.strengths)}{show("Barriers", s.barriers)}{show("Support response", s.supportResponse)}{show("Further discussion", s.discussion)}</dl>
        {s.priorities.length > 0 && <ul className="mt-3 text-xs text-slate-700 space-y-1 list-disc pl-4">{s.priorities.map((p, i) => <li key={i}>{p.text} <span className="font-mono text-[10px] text-slate-400">{p.itemIds.join(", ")}</span> (proposed owner: {p.owner || "none"})</li>)}</ul>}
      </section>
    </div>
  );
}

export function ReportPanel({ adm, meta, run, busy, ai, portal }: P) {
  const [text, setText] = useState<string>(adm.report?.narrative ?? "");
  const versions: any[] = Array.isArray(adm.report?.versions) ? adm.report.versions : [];
  const approved = isApproved(adm);
  return (
    <div className="space-y-4">
      <Banner title="Manual report, teacher-only evidence">
        {ai === "manual_only" ? "AI drafting is not enabled; write or edit this narrative yourself. " : ""}This draft uses one teacher's observations only. It is not triangulated, and releasing it to families is a separate step that is never automatic. {portal === "not_configured" ? "Case Portal is not configured, so nothing is synchronised." : ""}
      </Banner>
      <Field label="Report narrative (editable draft)"><textarea rows={14} className={inputCls} value={text} onChange={e => setText(e.target.value)} disabled={approved} data-testid="input-report-narrative" /></Field>
      <p className="text-[11px] text-slate-500">Required limitation: {meta.reportLimitation}</p>
      {approved && <Banner tone="ok">Approved {fmt(adm.report?.approvedAt)}{adm.report?.approvedBy ? ` by ${adm.report.approvedBy}` : ""}.</Banner>}
      <div className="flex flex-wrap gap-2">
        <Btn variant="ghost" disabled={busy || approved || !text.trim()} onClick={() => run({ action: "report", report: { narrative: text } })} data-testid="button-save-report">Save draft</Btn>
        <Btn disabled={busy || approved || !text.trim() || (adm.report?.narrative ?? "") !== text} onClick={() => run({ action: "approve" })} data-testid="button-approve">Approve report</Btn>
      </div>
      {!approved && (adm.report?.narrative ?? "") !== text && <p className="text-[11px] text-amber-700">Save the draft before approving so approval covers this exact text.</p>}
      {versions.length > 0 && (
        <section><h3 className="text-sm font-bold mb-2">Historical versions</h3>
          <ul className="space-y-2">{versions.map((v, i) => <li key={i} className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-[11px] text-slate-500">Version {v.version ?? versions.length - i} {fmt(v.approvedAt ?? v.createdAt ?? v.savedAt)} {v.status ?? ""}</p><p className="mt-1 text-xs text-slate-700 whitespace-pre-wrap">{v.narrative}</p></li>)}</ul>
        </section>
      )}
    </div>
  );
}

const PATHWAYS: Array<[string, string]> = [["classroom_support_review", "Classroom support and review"], ["targeted_support_planning", "Targeted support planning"], ["comprehensive_assessment_discussion", "Comprehensive assessment discussion"], ["additional_information_needed", "Additional information needed"], ["wellbeing_pathway", "Existing wellbeing pathway"]];

export function PlanPanel({ adm, meta, run, busy }: P) {
  const [rationale, setRationale] = useState<string>(adm.plan?.rationale ?? "");
  const [pathway, setPathway] = useState<string>(adm.plan?.pathway ?? "");
  const [pri, setPri] = useState<Priority[]>(adm.plan?.priorities ?? adm.input.summary.priorities ?? []);
  const items = Array.from(new Set(adm.input.responses.filter(r => r.status === "rated").map(r => r.itemId)));
  const approved = isApproved(adm);
  const ready = rationale.trim() && pathway && pri.length > 0 && pri.every(p => p.text.trim() && p.itemIds.length && p.strategyId);
  return (
    <div className="space-y-4">
      {!approved && <Banner tone="warn">A support plan needs an approved report first.</Banner>}
      <Banner>The pathway is a professional choice with a rationale. It is not calculated from scores, and school-defined tiers are preserved. Support and further assessment can proceed in parallel.</Banner>
      <Field label="Pathway"><select className={inputCls} value={pathway} onChange={e => setPathway(e.target.value)} data-testid="select-pathway"><option value="">Choose a pathway</option>{PATHWAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      <Field label="Rationale"><textarea rows={4} className={inputCls} value={rationale} onChange={e => setRationale(e.target.value)} /></Field>
      <PriorityEditor priorities={pri} onChange={setPri} strategies={meta.strategies} itemOptions={items} max={10} />
      <p className="text-[11px] text-slate-500">Keep accommodations and skill instruction separately labelled. Audio access to content is not proof that independent reading improved.</p>
      <Btn disabled={busy || !approved || !ready} onClick={() => run({ action: "plan", plan: { rationale, pathway, priorities: pri } })} data-testid="button-save-plan">Save support plan</Btn>
    </div>
  );
}

export function MonitoringPanel({ adm, run, busy }: P) {
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
        <ul className="space-y-2">{entries.map((x, i) => <li key={i} className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700"><span className="font-semibold">{x.date}</span>: {x.supportDelivered}. Participation: {x.participation || "not recorded"}. {x.note}</li>)}</ul>
      )}
      <section><h3 className="text-sm font-bold mb-2">Baseline and follow-up comparison</h3>
        {comparison.length === 0 ? <p className="text-xs text-slate-500">No linked follow-up has been submitted.</p> : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-xs"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-2">Domain</th><th className="p-2">Baseline</th><th className="p-2">Follow-up</th><th className="p-2">Change</th><th className="p-2">Conditions</th></tr></thead>
            <tbody>{comparison.map((r, i) => { const cv = (x: any) => x ? `${x.displayMean ?? "no mean"} (${x.validCount ?? "?"}/${x.applicableCount ?? "?"} rated, ${x.coverage != null ? Math.round(x.coverage * 100) + "%" : "n/a"})` : "Not administered";
              return <tr key={i} className="border-t border-slate-100 align-top"><td className="p-2 font-semibold">{r.domainId}</td><td className="p-2">{cv(r.baseline)}</td><td className="p-2">{cv(r.followup)}</td>
                <td className="p-2 tabular-nums">{r.change == null ? "Not calculated" : (r.change > 0 ? "+" : "") + Number(r.change).toFixed(1)}</td><td className="p-2 text-slate-500">{(r.limitations ?? []).join("; ") || "Coverage conditions met"}</td></tr>; })}</tbody></table></div>
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
