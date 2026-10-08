import { useLocalizedView } from "./Localization";
import type { ClDomain, ClInput, ValidationIssue } from "./types";
import { domainStats, overallProgress } from "./logic";
import { Banner, Btn } from "./ui";

export function ReviewStep({ input, domains, issues, goTo, onSubmit, submitting, preview, error, passed, parent = false }: {
  parent?: boolean;
  input: ClInput; domains: ClDomain[]; issues: ValidationIssue[]; goTo: (step: string) => void; onSubmit: () => void; submitting: boolean; preview: boolean; error: string | null; passed: boolean;
}) {
  const view = useLocalizedView();
  const p = overallProgress(input, domains);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return view(
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Review and submit</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Response completion</p>
          <p className="text-2xl font-bold tabular-nums">{pct(p.completion)}</p>
          <p className="text-xs text-slate-500">{p.answered} of {p.total} items have an explicit response, including Not observed and Not applicable.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Rated coverage (provisional)</p>
          <p className="text-2xl font-bold tabular-nums">{pct(p.ratedCoverage)}</p>
          <p className="text-xs text-slate-500">{p.rated} of {p.applicable} applicable items have a numeric rating. A section answered entirely as Not observed is complete but has no rated coverage.</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {domains.map(d => { const s = domainStats(d, input); return (
          <button key={d.id} type="button" onClick={() => goTo(`d:${d.id}`)} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-xs hover:bg-slate-50">
            <span className="font-semibold text-slate-700">{d.label}</span>
            <span className="text-slate-500 tabular-nums">{s.answered}/{s.total} answered, {s.rated} rated{s.na ? `, ${s.na} NA` : ""}</span>
          </button>
        ); })}
      </div>
      {parent && p.rated === 0 && p.answered === p.total && <Banner tone="info" title="Additional information needed">Answering No to every item can be submitted. It tells the reviewer more information is needed; it is not a risk or diagnostic label.</Banner>}
      {issues.length > 0 ? (
        <Banner tone="warn" title={`${issues.length} item${issues.length === 1 ? "" : "s"} to resolve before submitting`}>
          <ul className="space-y-1 mt-1">{issues.slice(0, 40).map((i, k) => <li key={k}><button type="button" className="underline text-left" onClick={() => goTo(i.step)}>{i.message}</button></li>)}</ul>
          <p className="mt-2">Your draft is saved. Insufficient observations in a section do not stop you submitting; the profile will show that more information is needed.</p>
        </Banner>
      ) : <Banner tone="ok">Everything required is complete.</Banner>}
      {error && <Banner tone="error" title="Submission did not go through">{error}</Banner>}
      {preview && passed && <Banner tone="ok" title="Preview check passed">Nothing was saved or submitted. This was a safe local test.</Banner>}
      <Btn onClick={onSubmit} disabled={submitting || issues.length > 0} data-testid="button-submit">{submitting ? "Submitting" : preview ? "Run preview check" : "Submit observation"}</Btn>
      {!preview && <p className="text-[11px] text-slate-500">After submission this form locks and descriptive domain summaries are calculated on the server.</p>}
    </div>
  );
}
