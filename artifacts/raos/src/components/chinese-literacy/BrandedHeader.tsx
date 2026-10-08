import type { ReactNode } from "react";
import { useLocalizedView, Verbatim } from "./Localization";
import type { InterfaceLanguage } from "./types";

export interface BrandedHeaderProps {
  title: string;
  formName: string;
  version: string;
  studentIdentifier: ReactNode;
  respondentName?: string;
  language: InterfaceLanguage;
  setLang: (language: InterfaceLanguage) => void;
  progress: number;
  status?: ReactNode;
  onRetrySave?: () => void;
  saveError?: boolean;
}

const languageOptions: { value: InterfaceLanguage; label: string; accessibleLabel: string }[] = [
  { value: "english", label: "En", accessibleLabel: "English" },
  { value: "mandarin", label: "中", accessibleLabel: "中文（简体）" },
  { value: "korean", label: "한", accessibleLabel: "한국어" },
];

/** Shared ReMynd identity and assessment controls for editable and read-only forms. */
export function BrandedHeader({
  title,
  formName,
  version,
  studentIdentifier,
  respondentName,
  language,
  setLang,
  progress,
  status,
  onRetrySave,
  saveError = false,
}: BrandedHeaderProps) {
  const view = useLocalizedView(language);
  return view(
    <>
    <header
      className="cl-branded-header sticky top-0 z-20 overflow-hidden"
      style={{ background: "linear-gradient(145deg, #0d1b2e 0%, #0a1628 45%, #060d1c 100%)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />
      <div className="relative z-10 flex items-center gap-3 px-5 py-3">
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-md">
            <img src="/images/remynd-logo-new.png" alt="ReMynd" className="h-8 w-8 object-contain" />
          </div>
          <div className="min-w-0 leading-none">
            <span className="block font-display text-xl font-bold tracking-tight text-white">ReMynd</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              {language === "mandarin" ? "评估门户" : language === "korean" ? "평가 포털" : "Assessment Portal"}
            </span>
          </div>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-4">
          {respondentName && (
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-xs font-semibold text-white"><Verbatim>{respondentName}</Verbatim></p>
              <p className="text-[10px] text-slate-400">
                {language === "mandarin" ? "填写人" : language === "korean" ? "응답자" : "Respondent"}
              </p>
            </div>
          )}
          <div role="group" aria-label="Language" className="flex shrink-0 rounded-lg border border-white/[0.10] bg-white/[0.08] p-0.5">
            {languageOptions.map(option => (
              <button
                key={option.value}
                type="button"
                aria-label={option.accessibleLabel}
                aria-pressed={language === option.value}
                title={option.accessibleLabel}
                data-testid={`button-interface-language-${option.value}`}
                onClick={() => setLang(option.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${language === option.value ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
              >
                <Verbatim>{option.label}</Verbatim>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-bold leading-snug text-slate-900" title={title}>{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            <span>{formName}</span>
            <span className="ml-1.5">· v{version}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Student: {studentIdentifier}</span>
          </p>
        </div>
          {(status || onRetrySave) && (
            <div className="flex min-h-10 items-center gap-2">
              {status && <span className={`text-xs font-semibold ${saveError ? "text-red-700" : "text-slate-500"}`}>{status}</span>}
              {saveError && onRetrySave && (
                <button
                  type="button"
                  onClick={onRetrySave}
                  className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  data-testid="button-retry-save"
                >
                  Retry save
                </button>
              )}
            </div>
          )}
      </div>
      <div className="relative h-1 w-full bg-slate-100">
        <div
          className="h-full bg-sky-400 transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, Math.round(progress * 100)))}%` }}
        />
      </div>
    </div>
    </>
  );
}
