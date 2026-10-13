import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { ApiError, caseUrl, clRequest, downloadExport } from "./api";
import { EvidencePanel, FollowUpPanel, MonitoringPanel, PlanPanel, ReportPanel } from "./ReviewPanels";
import { PARENT_INSTRUMENT_ID } from "./api";
import type { ClAdministration, ClMetadata, SupportPlanDraft } from "./types";
import { Banner, Btn, Skeleton } from "./ui";

interface Listing { administrations: ClAdministration[]; metadata: ClMetadata; integration: { portal: string; ai: string } }
const TABS = [["evidence", "Evidence"], ["report", "Report"], ["plan", "Support plan"], ["monitor", "Monitoring"], ["follow", "Follow-up and export"]] as const;

export default function CaseReview({ caseId }: { caseId: string }) {
  const [data, setData] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("evidence");
  const [busy, setBusy] = useState(false);
  const [englishView, setEnglishView] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string> | null>(null);
  const [translationBusy, setTranslationBusy] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    clRequest<Listing>(caseUrl(caseId), { staff: true }).then(d => { setData(d); setSel(s => s ?? d.administrations[0]?.assignmentId ?? null); }).catch(e => setError(e instanceof ApiError ? e.message : "Could not load."));
  }, [caseId]);
  useEffect(load, [load]);

  const adm = data?.administrations.find(a => a.assignmentId === sel);
  const metaOf = (a: ClAdministration): ClMetadata => a.metadata ?? data!.metadata;
  const isParent = (a: ClAdministration) => metaOf(a).key === PARENT_INSTRUMENT_ID;
  const who = (a: ClAdministration) => (isParent(a) ? "Parent" : "Teacher");
  useEffect(() => {
    setEnglishView(false);
    setTranslations(null);
    setTranslationError(null);
  }, [sel]);
  const toggleEnglish = async () => {
    if (englishView) { setEnglishView(false); return; }
    if (translations) { setEnglishView(true); return; }
    if (!adm) return;
    setTranslationBusy(true);
    setTranslationError(null);
    try {
      const result = await clRequest<{ translations: Record<string, string> }>(
        `${caseUrl(caseId)}/${encodeURIComponent(adm.assignmentId)}/translate`,
        { method: "POST", staff: true },
      );
      setTranslations(result.translations);
      setEnglishView(true);
    } catch (e) {
      setTranslationError(e instanceof ApiError ? e.message : "Could not translate this report. Please try again.");
    } finally {
      setTranslationBusy(false);
    }
  };
  const generateReport = async () => {
    if (!adm) throw new Error("Select a submitted parent or teacher form first.");
    const result = await clRequest<any>(
      `${caseUrl(caseId)}/${encodeURIComponent(adm.assignmentId)}/generate-report`,
      { method: "POST", staff: true },
    );
    if (!result?.administration) throw new Error("The report draft could not be saved. Reload the case before trying again.");
    setEnglishView(false);
    setTranslations(null);
    const merged = { teacherName: adm.teacherName, teacherEmail: adm.teacherEmail, ...result.administration };
    setData(d => d && { ...d, administrations: d.administrations.map(a => a.assignmentId === merged.assignmentId ? merged : a) });
  };
  const generateSupportPlan = async (): Promise<SupportPlanDraft> => {
    if (!adm) throw new Error("Select a submitted parent or teacher form first.");
    const result = await clRequest<{ planDraft: SupportPlanDraft }>(
      `${caseUrl(caseId)}/${encodeURIComponent(adm.assignmentId)}/generate-support-plan`,
      { method: "POST", staff: true },
    );
    if (!result?.planDraft) throw new Error("The support-plan draft could not be generated. Reload the case before trying again.");
    return result.planDraft;
  };
  const translate = (path: string, value: unknown) => typeof value === "string" && englishView
    ? translations?.[path] ?? value
    : String(value ?? "");
  const run = async (body: Record<string, unknown>) => {
    if (!adm || !data) return;
    setBusy(true); setActionError(null);
    try {
      const res = await clRequest<any>(`${caseUrl(caseId)}/${encodeURIComponent(adm.assignmentId)}/action`, { method: "POST", staff: true, body: { ...body, revision: adm.revision } });
      if (res.administration) {
        setEnglishView(false);
        setTranslations(null);
        const merged = { teacherName: adm.teacherName, teacherEmail: adm.teacherEmail, ...res.administration };
        setData(d => d && { ...d, administrations: d.administrations.map(a => a.assignmentId === merged.assignmentId ? merged : a) });
      }
      if (body.action === "followup") load();
      return res;
    } catch (e) {
      setActionError(e instanceof ApiError ? `${e.message}${e.issues.length ? ": " + e.issues.join("; ") : ""}${e.status === 409 ? " Reload to see the latest revision." : ""}` : "Action failed.");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5" data-testid="page-chinese-literacy-review">
      <div>
        <Link href={`/cases/${caseId}`} className="text-xs text-primary underline">Back to case</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Chinese literacy observation review</h1>
        <p className="text-xs text-slate-500">Descriptive evidence from separate parent and teacher forms. Each is shown on its own; scores are never combined. Not a diagnosis, screener or risk rating.</p>
      </div>
      {error && <div className="space-y-2"><Banner tone="error" title="Could not load">{error}</Banner><Btn onClick={load}>Try again</Btn></div>}
      {!data && !error && <Skeleton />}
      {data && data.administrations.length === 0 && <Banner title="No administrations yet">Assign a Chinese literacy teacher or parent observation to this case to begin. Either one is enough on its own.</Banner>}
      {data && adm && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {data.administrations.map(a => (
              <button key={a.assignmentId} type="button" onClick={() => setSel(a.assignmentId)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${a.assignmentId === sel ? "bg-primary text-white border-primary" : "bg-white text-slate-700 border-slate-300"}`}>
                <span className="font-bold">{who(a)}</span>: {a.teacherName || who(a)} {a.baselineId ? "(follow-up)" : ""} <span className="font-normal opacity-80">{a.status.replace(/_/g, " ")}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">{metaOf(adm).formName ?? `${who(adm)} form`} ({who(adm)} record; setting {metaOf(adm).setting ?? "not stated"}). {adm.teacherName} {adm.teacherEmail}. Status {adm.status.replace(/_/g, " ")}, revision {adm.revision}. Instrument v{adm.instrumentVersion}, scoring {adm.scoringVersion}, language {adm.languageVersion}.{adm.selectedDomains?.length ? ` Follow-up domains: ${adm.selectedDomains.join(", ")}.` : ""}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="ghost" disabled={translationBusy} onClick={() => void toggleEnglish()} data-testid="button-translate-report">
              {translationBusy ? "Translating…" : englishView ? "View original Chinese" : "View in English"}
            </Btn>
            <span className="text-[11px] text-slate-500">
              {englishView
                ? "English translation for review only; saved responses and report text are unchanged."
                : "Translate respondent evidence and any Chinese report, plan, or monitoring notes for review. Uses your configured DeepSeek API."}
            </span>
            <Btn variant="ghost" onClick={() => { setEnglishView(false); setTab("plan"); }} data-testid="button-open-support-plan">
              Open support-plan generator
            </Btn>
          </div>
          {translationError && <Banner tone="error" title="Translation unavailable">{translationError}</Banner>}
          {data.integration.portal === "not_configured" && <p className="text-[11px] text-slate-500">Case Portal is not configured. Nothing is synchronised.</p>}
          {actionError && <Banner tone="error" title="Action not completed">{actionError}</Banner>}
          <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200">
            {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} data-testid={`tab-${k}`} className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 ${tab === k ? "border-primary text-primary" : "border-transparent text-slate-500"}`}>{l}</button>)}
          </div>
          {adm.status === "draft" || adm.status === "not_started" || adm.status === "in_progress" ? <Banner>The {who(adm).toLowerCase()} has not submitted this administration. Review actions open after submission.</Banner> : null}
          {(() => {
            const p = { key: adm.assignmentId + adm.revision, adm, meta: metaOf(adm), run, busy, ai: data.integration.ai, portal: data.integration.portal };
              return tab === "evidence" ? <EvidencePanel {...p} translate={translate} /> : tab === "report" ? <ReportPanel {...p} translate={translate} englishView={englishView} onGenerate={generateReport} onExport={format => downloadExport(caseId, adm.assignmentId, format, "report")} /> : tab === "plan" ? <PlanPanel {...p} translate={translate} englishView={englishView} onGenerate={generateSupportPlan} onOpenReport={() => { setEnglishView(false); setTab("report"); }} /> : tab === "monitor" ? <MonitoringPanel {...p} translate={translate} />
              : <FollowUpPanel {...p} onExport={f => downloadExport(caseId, adm.assignmentId, f)} />;
          })()}
        </>
      )}
    </div>
  );
}
