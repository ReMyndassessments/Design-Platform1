import { useLocalizedView } from "./Localization";
import type { ClStrategy, Priority } from "./types";
import { Btn, Field, ItemIdPicker, inputCls } from "./ui";

export const blankPriority = (): Priority => ({ text: "", itemIds: [], strategyId: "", owner: "", indicator: "", reviewDate: "" });

export function PriorityEditor({ priorities, onChange, strategies, itemOptions, max = 3, readOnly = false, englishView = false, translate = (_path, value) => String(value ?? "") }: {
  priorities: Priority[]; onChange: (p: Priority[]) => void; strategies: ClStrategy[]; itemOptions: string[]; max?: number; readOnly?: boolean;
  englishView?: boolean; translate?: (path: string, value: unknown) => string;
}) {
  const view = useLocalizedView();
  const set = (i: number, patch: Partial<Priority>) => onChange(priorities.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  const strat = (id: string) => strategies.find(s => s.id === id);
  return view(
    <div className="space-y-3">
      {priorities.map((p, i) => (
        <fieldset key={i} disabled={readOnly} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3" data-testid={`priority-${i}`}>
          <legend className="px-1 text-xs font-bold text-slate-700">Priority {i + 1}</legend>
          <Field label="Priority"><textarea className={inputCls} rows={2} value={englishView ? translate(`plan.priorities.${i}.text`, p.text) : p.text} onChange={e => set(i, { text: e.target.value })} readOnly={englishView} /></Field>
          <Field label="Linked items" hint="Choose the observed items this priority responds to."><ItemIdPicker label="Linked items" options={itemOptions} value={p.itemIds} onChange={v => set(i, { itemIds: v })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Suggested strategy">
              <select className={inputCls} value={p.strategyId} onChange={e => set(i, { strategyId: e.target.value })}>
                <option value="">Choose a strategy</option>
                {strategies.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
             <Field label="Responsible adult (proposal)"><input className={inputCls} value={englishView ? translate(`plan.priorities.${i}.owner`, p.owner) : p.owner} onChange={e => set(i, { owner: e.target.value })} readOnly={englishView} /></Field>
             <Field label="Progress indicator"><input className={inputCls} value={englishView ? translate(`plan.priorities.${i}.indicator`, p.indicator) : p.indicator} onChange={e => set(i, { indicator: e.target.value })} readOnly={englishView} /></Field>
            <Field label="Review date"><input type="date" className={inputCls} value={p.reviewDate} onChange={e => set(i, { reviewDate: e.target.value })} /></Field>
          </div>
          {strat(p.strategyId)?.options?.length ? <p className="text-[11px] text-slate-500">Options: {strat(p.strategyId)!.options.join("; ")}</p> : null}
          {!readOnly && <Btn variant="danger" onClick={() => onChange(priorities.filter((_, idx) => idx !== i))}>Remove priority</Btn>}
        </fieldset>
      ))}
      {!readOnly && priorities.length < max && <Btn variant="ghost" onClick={() => onChange([...priorities, blankPriority()])} data-testid="button-add-priority">Add priority ({priorities.length}/{max})</Btn>}
    </div>
  );
}
