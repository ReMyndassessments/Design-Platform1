import { useState } from "react";
import { BrandedHeader } from "./BrandedHeader";
import type { InterfaceLanguage } from "./types";
import { Verbatim } from "./Localization";
import "./_group.css";

type Respondent = "parent" | "teacher";

const formNames: Record<Respondent, string> = {
  parent: "Parent Observation Form for Grades 3–12",
  teacher: "Teacher Form, Grades 3 to 12",
};

/** Production header with synthetic student details and local-only language/form controls. */
export default function Preview() {
  const [language, setLanguage] = useState<InterfaceLanguage>("english");
  const [respondent, setRespondent] = useState<Respondent>("parent");

  return (
    <div className="cl-header-preview min-h-[100dvh] bg-[#f4f6f9]">
      <BrandedHeader
        title="Chinese literacy observation"
        formName={formNames[respondent]}
        version="1.0.0"
        studentIdentifier={<Verbatim>Jamie Chen</Verbatim>}
        language={language}
        setLang={setLanguage}
        progress={0.42}
        status={<span role="status" data-testid="status-save">Saved 10:42 AM</span>}
      />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Production header · synthetic preview data</p>
        <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm" role="group" aria-label="Select assessment form">
          {(["parent", "teacher"] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setRespondent(type)}
              aria-pressed={respondent === type}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${respondent === type ? "bg-[#0d1b2e] text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {type === "parent" ? "Parent form" : "Teacher form"}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-600">Use the language selector in the header to preview English, Simplified Chinese, and Korean source wording.</p>
      </main>
    </div>
  );
}
