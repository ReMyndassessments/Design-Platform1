import type { ClInput, ClMetadata } from "./types";
import { composeNarrative, parseNarrative } from "./logic";
import { PriorityEditor } from "./PriorityEditor";
import { Field, inputCls } from "./ui";

function Nar({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const p = parseNarrative(value);
  return (
    <Field label={label}>
      <select aria-label={`${label} response type`} className={`${inputCls} mb-1.5`} value={p.mode} onChange={e => onChange(composeNarrative(e.target.value as any, p.text))}>
        <option value="answer">Provide an answer</option><option value="not_known">Not known (explain)</option><option value="not_yet">Not yet observed (explain)</option>
      </select>
      <textarea rows={3} className={inputCls} value={p.text} onChange={e => onChange(composeNarrative(p.mode, e.target.value))} />
    </Field>
  );
}

export function SummaryStep({ input, meta, update, parent = false }: { parent?: boolean; input: ClInput; meta: ClMetadata; update: (fn: (i: ClInput) => ClInput) => void }) {
  const s = input.summary;
  const set = (patch: Partial<ClInput["summary"]>) => update(i => ({ ...i, summary: { ...i.summary, ...patch } }));
  const rated = input.responses.filter(r => r.status === "rated").map(r => r.itemId);
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-slate-900">Strengths and initial priorities</h2><p className="text-xs text-slate-500 mt-1">Owners you name are proposals until an authorised support plan is agreed.</p></div>
      <Nar label="Main strengths" value={s.strengths} onChange={v => set({ strengths: v })} />
      <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">When describing barriers, name the item IDs they come from (for example R3, W2) so a reviewer can trace each statement to the ratings.</p>
      <Nar label="Important literacy barriers" value={s.barriers} onChange={v => set({ barriers: v })} />
      <Nar label={parent ? "Supports tried at home and how your child responded" : "Supports tried and how the student responded"} value={s.supportResponse} onChange={v => set({ supportResponse: v })} />
      <Field label="Further discussion you suggest (optional)"><textarea rows={2} className={inputCls} value={s.discussion} onChange={e => set({ discussion: e.target.value })} /></Field>
      <h3 className="text-sm font-bold text-slate-800">Initial priorities (up to 3)</h3>
      <PriorityEditor priorities={s.priorities} onChange={p => set({ priorities: p })} strategies={meta.strategies} itemOptions={rated} />
    </div>
  );
}
