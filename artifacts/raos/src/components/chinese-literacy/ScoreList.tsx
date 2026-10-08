import type { ClScore } from "./types";

const IMPACT: Record<string, string> = { "0": "0 No observed access impact", "1": "1 Minor additional effort", "2": "2 Repeated support needed", "3": "3 Substantial restriction of participation or demonstration of learning" };
const STATUS: Record<string, string> = { scored: "Descriptive mean available", eligible: "Descriptive mean available", insufficient_observations: "Insufficient observations", not_applicable: "Not applicable", not_administered: "Not administered", not_observed: "Not observed" };
const pct = (c: number | null) => (c == null ? "n/a" : `${Math.round(c * 1000) / 10}%`);

export function ScoreList({ scores }: { scores: ClScore[] }) {
  return (
    <div className="space-y-3" data-testid="list-scores">
      <p className="text-[11px] text-slate-500">Observed difficulty frequency on a 1 to 5 scale, shown per domain. Domains are never combined. Coverage uses a provisional completeness guide, not a clinical cutoff. Classroom impact is reported separately and is not averaged into frequency.</p>
      {scores.map(s => {
        const hasMean = s.mean != null && s.displayMean != null;
        const allNo = s.applicableCount > 0 && s.notObservedCount === s.applicableCount;
        return (
          <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4" data-testid={`score-${s.id}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-800">{s.label}</h4>
              <span className="text-[11px] font-semibold text-slate-500">{allNo ? "Not observed" : STATUS[s.status] ?? s.status.replace(/_/g, " ")}</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">
              {hasMean ? <><span className="text-xl font-bold tabular-nums">{typeof s.displayMean === "number" ? s.displayMean.toFixed(1) : s.displayMean}</span> of 5, observed difficulty frequency</> : <span className="text-slate-500">No descriptive mean reported</span>}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {s.validCount} of {s.applicableCount} applicable items rated ({pct(s.coverage)} coverage; {s.requiredValidCount} needed for a mean)
              {s.notApplicableCount > 0 && <>; {s.notApplicableCount} of {s.totalItems} items not applicable</>}
              {s.notObservedCount > 0 && <>; {s.notObservedCount} not observed</>}
              {s.unansweredCount > 0 && <>; {s.unansweredCount} unanswered</>}.
            </p>
            <p className="text-xs text-slate-600 mt-1">Classroom impact: {s.impact == null ? "Unknown" : IMPACT[String(s.impact)] ?? s.impact}</p>
            {s.frequentDifficultyCount > 0 && <p className="text-[11px] text-slate-500 mt-1">Review aid, items rated 4 or 5: {s.frequentDifficultyItemIds.join(", ")}. Not a diagnostic cutoff.</p>}
            {s.examples?.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-slate-600 list-disc pl-4">
                {s.examples.map((e, i) => <li key={i}>{e.text} <span className="font-mono text-[10px] text-slate-400">{e.itemIds.join(", ")}</span></li>)}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
