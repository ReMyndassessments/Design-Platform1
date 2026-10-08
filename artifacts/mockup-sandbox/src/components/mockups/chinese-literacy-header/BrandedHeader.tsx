import { Languages } from "lucide-react";
import type { ReactNode } from "react";
import { useLocalizedView, Verbatim } from "./Localization";
import type { InterfaceLanguage } from "./types";

export interface BrandedHeaderProps {
  title: string;
  formName: string;
  version: string;
  studentIdentifier: ReactNode;
  language: InterfaceLanguage;
  setLang: (language: InterfaceLanguage) => void;
  progress: number;
  status?: ReactNode;
  onRetrySave?: () => void;
  saveError?: boolean;
}

const languageOptions: { value: InterfaceLanguage; label: string }[] = [
  { value: "english", label: "English / 英文" },
  { value: "mandarin", label: "中文（简体） / Mandarin" },
  { value: "korean", label: "한국어 / Korean" },
];

/** Shared ReMynd identity and assessment controls for editable and read-only forms. */
export function BrandedHeader({
  title,
  formName,
  version,
  studentIdentifier,
  language,
  setLang,
  progress,
  status,
  onRetrySave,
  saveError = false,
}: BrandedHeaderProps) {
  const view = useLocalizedView(language);
  return view(
    <header
      className="cl-branded-header sticky top-0 z-20 overflow-hidden"
      style={{ background: "linear-gradient(145deg, #0d1b2e 0%, #0a1628 45%, #060d1c 100%)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />
      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-x-7 gap-y-4 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-md">
            <img src="/__mockup/images/remynd-logo-new.png" alt="ReMynd" className="h-9 w-9 object-contain" />
          </div>
          <div className="min-w-0 leading-none">
            <span className="block font-display text-xl font-bold tracking-tight text-white">ReMynd</span>
            <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Student Services</span>
          </div>
        </div>

        <div className="min-w-0 border-l-2 border-white/15 pl-4 lg:pl-5">
          <p className="text-sm font-bold leading-snug text-white sm:text-[15px]" title={title}>{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            <span className="font-medium text-slate-200">{formName}</span>
            <span className="ml-1.5 text-slate-400">· v{version}</span>
            <span className="mx-1.5 text-slate-500" aria-hidden="true">·</span>
            <span>Student: {studentIdentifier}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-1 lg:justify-end">
          {(status || onRetrySave) && (
            <div className="flex min-h-10 items-center gap-2">
              {status && <span className={`text-xs font-semibold ${saveError ? "text-rose-200" : "text-slate-300"}`}>{status}</span>}
              {saveError && onRetrySave && (
                <button
                  type="button"
                  onClick={onRetrySave}
                  className="rounded-md border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  data-testid="button-retry-save"
                >
                  Retry save
                </button>
              )}
            </div>
          )}
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.08] px-3 text-slate-200 shadow-sm transition-colors focus-within:border-sky-300/70 focus-within:bg-white/[0.12]">
            <Languages aria-hidden="true" size={17} strokeWidth={1.8} className="shrink-0 text-sky-200" />
            <span className="text-xs font-semibold">Language</span>
            <select
              aria-label="Language"
              data-testid="select-interface-language"
              className="min-w-[11.5rem] cursor-pointer appearance-none border-0 bg-transparent py-2 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:min-w-[13rem]"
              value={language}
              onChange={event => setLang(event.target.value as InterfaceLanguage)}
            >
              {languageOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-[#0d1b2e] text-white"><Verbatim>{option.label}</Verbatim></option>
              ))}
            </select>
            <span aria-hidden="true" className="pointer-events-none -ml-1 text-[10px] text-slate-400">▾</span>
          </label>
        </div>
      </div>
      <div className="relative h-1 w-full bg-white/10">
        <div
          className="h-full bg-sky-400 transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, Math.round(progress * 100)))}%` }}
        />
      </div>
    </header>
  );
}
