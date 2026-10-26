export interface PublisherCriteria {
  family: "BRIEF2" | "BASC3" | "BYI2";
  formId: string;
  version: string;
  bands: Array<{ min: number | null; max: number | null; label: string; adaptiveLabel?: string }>;
  clinicalScales: string[];
  inventories: Array<{ code: string; name: string; direction: string }>;
  responseAnchors: string[];
  sources: Array<{ title: string; url: string }>;
  limitations: string[];
  readiness: Array<{ rule: string; state: string; detail: string }>;
}

export function PublisherCriteriaPanel({ criteria }: { criteria: PublisherCriteria }) {
  const range = (min: number | null, max: number | null) =>
    min === null ? `≤ ${max}` : max === null ? `≥ ${min}` : `${min}–${max}`;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 print-page">
      <h2 className="text-lg font-semibold text-slate-900">Publisher scoring criteria · {criteria.formId}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        These are reference rules, not scores calculated for this response record.
        Interpretation of an official T-score is separate from converting raw answers into a T-score.
      </p>
      {criteria.bands.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3">Verified T-score</th>
                <th className="p-3">{criteria.family === "BASC3" ? "Clinical/problem scale" : "Clinical scale/index/composite"}</th>
                {criteria.family === "BASC3" && <th className="p-3">Adaptive/strength scale</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {criteria.bands.map(band => (
                <tr key={`${band.min}-${band.max}`}>
                  <td className="p-3 font-medium">{range(band.min, band.max)}</td>
                  <td className="p-3">{band.label}</td>
                  {criteria.family === "BASC3" && <td className="p-3">{band.adaptiveLabel}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {criteria.clinicalScales.length > 0 && (
        <p className="mt-4 text-sm text-slate-600">
          Clinical scales for this form: {criteria.clinicalScales.join(", ")}.
        </p>
      )}
      {criteria.inventories.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {criteria.inventories.map(inventory => (
            <li key={inventory.code}><strong>{inventory.code} · {inventory.name}:</strong> {inventory.direction}</li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-slate-600">
        Publisher response anchors: {criteria.responseAnchors.join("; ")}.
        {" "}These do not relabel legacy numeric answers or verify a translated form.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
        {criteria.limitations.map(note => <li key={note}>{note}</li>)}
      </ul>
      <details className="mt-4 rounded-lg border bg-slate-50 p-3 text-sm">
        <summary className="cursor-pointer font-medium text-slate-800">Scoring readiness and source references</summary>
        <div className="mt-3 space-y-3">
          {criteria.readiness.map(rule => (
            <div key={rule.rule}>
              <p className="font-medium">{rule.rule}: {rule.state}</p>
              <p className="mt-1 text-slate-600">{rule.detail}</p>
            </div>
          ))}
          <ul className="list-disc space-y-2 pl-5">
            {criteria.sources.map(source => (
              <li key={source.url}><a className="text-blue-700 underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">Criteria version: {criteria.version}. Reference categories are not diagnoses.</p>
        </div>
      </details>
    </section>
  );
}
