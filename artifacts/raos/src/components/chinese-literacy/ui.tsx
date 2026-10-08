import type { ReactNode } from "react";

export const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";
export function Field({ label, hint, error, children, id }: { label: string; hint?: string; error?: string | null; children: ReactNode; id?: string }) {
  return (
    <div className="space-y-1" id={id}>
      <label className="block text-xs font-semibold text-slate-700">{label}</label>
      {hint && <p className="text-[11px] text-slate-500 leading-snug">{hint}</p>}
      {children}
      {error && <p role="alert" className="text-[11px] font-medium text-red-700">{error}</p>}
    </div>
  );
}
export function Banner({ tone = "info", title, children }: { tone?: "info" | "warn" | "error" | "ok"; title?: string; children?: ReactNode }) {
  const cls = { info: "border-sky-200 bg-sky-50 text-sky-900", warn: "border-amber-200 bg-amber-50 text-amber-900", error: "border-red-200 bg-red-50 text-red-900", ok: "border-emerald-200 bg-emerald-50 text-emerald-900" }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${cls}`} role={tone === "error" ? "alert" : undefined}>
      {title && <p className="font-semibold mb-0.5">{title}</p>}
      {children}
    </div>
  );
}
export function Btn({ variant = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const v = { primary: "bg-primary text-white hover:bg-primary/90", ghost: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50", danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50" }[variant];
  return <button type="button" {...p} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${v} ${className}`} />;
}
export function Skeleton() {
  return <div className="space-y-3 animate-pulse max-w-3xl mx-auto p-6">{[0, 1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-slate-200/70" />)}</div>;
}
export function ItemIdPicker({ options, value, onChange, label }: { options: string[]; value: string[]; onChange: (v: string[]) => void; label: string }) {
  if (!options.length) return <p className="text-[11px] text-slate-400">No items available to link yet.</p>;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map(id => {
        const on = value.includes(id);
        return (
          <button type="button" key={id} aria-pressed={on} onClick={() => onChange(on ? value.filter(v => v !== id) : [...value, id])}
            className={`px-2 py-0.5 rounded-md border text-[11px] font-mono ${on ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-300 hover:border-primary"}`}>{id}</button>
        );
      })}
    </div>
  );
}
