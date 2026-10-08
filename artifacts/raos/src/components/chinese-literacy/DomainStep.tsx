import { useMemo } from "react";
import type { ClDomain, ClInput, ClMetadata, DomainEvidence, ItemResponse, SectionDecision } from "./types";
import { blankEvidence, blankResponse, domainNote, domainStats, gradeExamplesFor, isCore, isParentMeta, itemsNeedingEvidence, respMap } from "./logic";
import { Banner, Btn, Field, ItemIdPicker, inputCls } from "./ui";

const split = (a: string) => a.split(/\s+[—-]\s+/)[0];
const IMPACT = [[0, "0 No observed access impact"], [1, "1 Minor additional effort"], [2, "2 Repeated support needed"], [3, "3 Substantial restriction of participation or demonstration of learning"]] as const;

function AnchorLegend({ anchors }: { anchors: string[] }) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600" open>
      <summary className="font-semibold text-slate-700 cursor-pointer">Response scale</summary>
      <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1">{anchors.map((a, i) => <li key={i}>{a}</li>)}</ul>
    </details>
  );
}

function ItemRow({ id, text, resp, anchors, onChange }: { id: string; text: string; resp: ItemResponse; anchors: string[]; onChange: (r: ItemResponse) => void }) {
  const choices: Array<{ key: string; label: string; r: ItemResponse }> = [1, 2, 3, 4, 5].map(n => ({ key: String(n), label: `${n} ${split(anchors[n - 1] ?? "").replace(/^\d\s*/, "")}`, r: { itemId: id, status: "rated", value: n } }));
  choices.push({ key: "NO", label: split(anchors[5] ?? "Not observed").replace(/^NO\s*/, "NO "), r: { itemId: id, status: "not_observed", value: null } });
  choices.push({ key: "NA", label: split(anchors[6] ?? "Not applicable").replace(/^NA\s*/, "NA "), r: { itemId: id, status: "not_applicable", value: null, reason: resp.reason ?? "" } });
  const cur = resp.status === "rated" ? String(resp.value) : resp.status === "not_observed" ? "NO" : resp.status === "not_applicable" ? "NA" : "";
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4" data-testid={`item-${id}`}>
      <p className="text-sm text-slate-800"><span className="font-mono text-[11px] text-slate-400 mr-2">{id}</span>{text}</p>
      <div role="radiogroup" aria-label={`${id} response`} className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
        {choices.map(c => (
          <button key={c.key} type="button" role="radio" aria-checked={cur === c.key} data-testid={`rate-${id}-${c.key}`}
            onClick={() => onChange(cur === c.key ? blankResponse(id) : c.r)}
            className={`rounded-lg border px-2 py-2 text-left text-[11px] leading-tight transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${cur === c.key ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-slate-700 hover:border-primary"}`}>
            {c.label}
          </button>
        ))}
      </div>
      {resp.status === "not_applicable" && (
        <div className="mt-2"><Field label="Reason this item is not applicable"><input className={inputCls} value={resp.reason ?? ""} onChange={e => onChange({ ...resp, reason: e.target.value })} data-testid={`na-reason-${id}`} /></Field></div>
      )}
    </li>
  );
}

export function DomainStep({ domain, input, meta, update }: { domain: ClDomain; input: ClInput; meta: ClMetadata; update: (fn: (i: ClInput) => ClInput) => void }) {
  const core = isCore(domain);
  const sec = input.sections[domain.id];
  const m = respMap(input);
  const stats = domainStats(domain, input);
  const ev: DomainEvidence = input.evidence[domain.id] ?? blankEvidence();
  const parent = isParentMeta(meta);
  const examples = parent ? [] : gradeExamplesFor(meta, domain, input.context.grade);
  const note = domainNote(domain);
  const ratedIds = useMemo(() => domain.items.filter(i => m.get(i.id)?.status === "rated").map(i => i.id), [domain, m]);
  const needEv = itemsNeedingEvidence(domain, input);
  const hasContent = stats.rated > 0 || sec?.decision === "complete";

  const setResp = (r: ItemResponse) => update(i => ({
    ...i, responses: i.responses.map(x => x.itemId === r.itemId ? r : x),
    sections: (!core && !i.sections[domain.id]) || (i.sections[domain.id] && i.sections[domain.id].decision !== "complete") ? { ...i.sections, [domain.id]: { decision: "complete" } } : i.sections,
  }));
  const setDecision = (decision: SectionDecision) => {
    const anyRated = stats.rated > 0;
    if (decision !== "complete" && anyRated && !window.confirm("This replaces existing ratings in this section. Continue?")) return;
    update(i => {
      const ids = new Set(domain.items.map(x => x.id));
      const reason = i.sections[domain.id]?.reason ?? "";
      return {
        ...i,
        sections: { ...i.sections, [domain.id]: decision === "not_applicable" ? { decision, reason } : { decision } },
        responses: i.responses.map(r => !ids.has(r.itemId) ? r
          : decision === "not_observed" ? { itemId: r.itemId, status: "not_observed", value: null }
          : decision === "not_applicable" ? { itemId: r.itemId, status: "not_applicable", value: null, reason }
          : r.status === "rated" ? r : blankResponse(r.itemId)),
      };
    });
  };
  const setReason = (reason: string) => update(i => {
    const ids = new Set(domain.items.map(x => x.id));
    return { ...i, sections: { ...i.sections, [domain.id]: { decision: "not_applicable", reason } },
      responses: i.responses.map(r => ids.has(r.itemId) ? { itemId: r.itemId, status: "not_applicable", value: null, reason } : r) };
  });
  const setEv = (patch: Partial<DomainEvidence>) => update(i => ({ ...i, evidence: { ...i.evidence, [domain.id]: { ...(i.evidence[domain.id] ?? blankEvidence()), ...patch } } }));
  const decisionBtn = (d: SectionDecision, label: string) => (
    <button key={d} type="button" role="radio" aria-checked={sec?.decision === d} data-testid={`section-${domain.id}-${d}`} onClick={() => setDecision(d)}
      className={`rounded-lg border px-3 py-2 text-xs font-semibold ${sec?.decision === d ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-slate-700 hover:border-primary"}`}>{label}</button>
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{core ? "Required to review" : /optional/i.test(domain.requirement) ? "Optional" : "Contextual, if observed"}</p>
        <h2 className="text-xl font-bold text-slate-900">{domain.label}</h2>
        <p className="text-xs text-slate-500 mt-1">{stats.answered} of {stats.total} items answered; {stats.rated} rated, {stats.no} not observed, {stats.na} not applicable.</p>
      </div>
      {note && <Banner>{note}</Banner>}
      {parent && <Banner tone="warn" title="Choosing No">If your child has limited Chinese ability, choose No (not observed), not NA. Only observe what happens naturally. Please do not run tests or set tasks for your child.</Banner>}
      {examples.length > 0 && <Banner title={`Examples for Grade ${input.context.grade}`}><ul className="list-disc pl-4">{examples.map((e, i) => <li key={i}>{e}</li>)}</ul></Banner>}
      <AnchorLegend anchors={meta.anchors} />
      <div role="radiogroup" aria-label="Whole section decision" className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500 mr-1">{core ? "Whole section:" : "Section decision (required):"}</span>
        {decisionBtn("complete", core ? "Rate items individually" : "Complete this section")}{decisionBtn("not_observed", "Not observed")}{decisionBtn("not_applicable", "Not applicable")}
      </div>
      {sec?.decision === "not_applicable" && (
        <Field label="Reason the whole section is not applicable"><input className={inputCls} value={sec.reason ?? ""} onChange={e => setReason(e.target.value)} data-testid="input-section-reason" /></Field>
      )}
      {(core || !!sec) && (
        <ol className="space-y-3">
          {domain.items.map(i => <ItemRow key={i.id} id={i.id} text={i.text} anchors={meta.anchors} resp={m.get(i.id) ?? blankResponse(i.id)}
            onChange={setResp} />)}
        </ol>
      )}
      {hasContent && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4" aria-label="Evidence and impact">
          <h3 className="text-sm font-bold text-slate-800">Evidence and classroom impact</h3>
          {needEv.length > 0 && (
            <Banner tone="warn" title="Examples needed before submission">
              Items rated 4 or 5 need a concrete linked example: {needEv.join(", ")}.
              <div className="mt-2"><Btn variant="ghost" onClick={() => setEv({ examples: [...ev.examples, { text: "", itemIds: needEv }] })}>Add example for these items</Btn></div>
            </Banner>
          )}
          {ev.examples.map((ex, idx) => (
            <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2" data-testid={`example-${domain.id}-${idx}`}>
              <Field label={`Concrete example ${idx + 1}`}><textarea rows={2} className={inputCls} value={ex.text} onChange={e => setEv({ examples: ev.examples.map((x, k) => k === idx ? { ...x, text: e.target.value } : x) })} /></Field>
              <Field label="Items this example supports"><ItemIdPicker label="Supported items" options={ratedIds} value={ex.itemIds} onChange={v => setEv({ examples: ev.examples.map((x, k) => k === idx ? { ...x, itemIds: v } : x) })} /></Field>
              <Btn variant="danger" onClick={() => setEv({ examples: ev.examples.filter((_, k) => k !== idx) })}>Remove example</Btn>
            </div>
          ))}
          <Btn variant="ghost" onClick={() => setEv({ examples: [...ev.examples, { text: "", itemIds: [] }] })} data-testid={`button-add-example-${domain.id}`}>Add example</Btn>
          {parent && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Home setting observed"><input className={inputCls} value={ev.setting ?? ""} placeholder="For example, homework at the kitchen table" onChange={e => setEv({ setting: e.target.value })} data-testid={`input-ev-setting-${domain.id}`} /></Field>
              <Field label="Language involved"><input className={inputCls} value={ev.language ?? ""} placeholder="For example, Mandarin" onChange={e => setEv({ language: e.target.value })} data-testid={`input-ev-language-${domain.id}`} /></Field>
            </div>
          )}
          <Field label="Conditions of success and strengths"><textarea rows={2} className={inputCls} value={ev.strengths} onChange={e => setEv({ strengths: e.target.value })} /></Field>
          <Field label="Supports present"><textarea rows={2} className={inputCls} value={ev.supports} onChange={e => setEv({ supports: e.target.value })} /></Field>
          <Field label="Approximate number of relevant observation opportunities (if known)">
            <input type="number" min={0} className={`${inputCls} max-w-[10rem]`} value={ev.opportunities ?? ""} onChange={e => setEv({ opportunities: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} />
          </Field>
          <div role="radiogroup" aria-label="Classroom impact" className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">{parent ? "Impact at home (separate from frequency)" : "Classroom impact (separate from frequency)"}</p>
            {[...IMPACT, [null, "Unknown"] as const].map(([v, l]) => (
              <label key={String(v)} className="flex items-start gap-2 text-xs text-slate-700">
                <input type="radio" name={`impact-${domain.id}`} checked={ev.impact === v} onChange={() => setEv({ impact: v as DomainEvidence["impact"] })} data-testid={`impact-${domain.id}-${v}`} /> {l}
              </label>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
