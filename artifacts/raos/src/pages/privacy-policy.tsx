import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Globe } from "lucide-react";

type Lang = "en" | "zh" | "ko";

const LANG_LABELS: Record<Lang, string> = { en: "English", zh: "中文", ko: "한국어" };

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold text-slate-900 mt-8 mb-3">{line.slice(2)}</h1>;
    if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold text-slate-800 mt-6 mb-2 border-b border-slate-100 pb-1">{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold text-slate-700 mt-4 mb-1">{line.slice(4)}</h3>;
    if (line.startsWith("- ")) return <li key={i} className="ml-4 text-slate-600 text-sm leading-relaxed list-disc">{renderInline(line.slice(2))}</li>;
    if (line.startsWith("---")) return <hr key={i} className="border-slate-200 my-4" />;
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return <p key={i} className="text-slate-600 text-sm leading-relaxed">{renderInline(line)}</p>;
  });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>
      : part
  );
}

export default function PrivacyPolicyPage() {
  const [, navigate] = useLocation();
  const [lang, setLang] = useState<Lang>("en");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const BASE = import.meta.env.BASE_URL;

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`${BASE}api/public/privacy-policy?lang=${lang}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setContent(d.content); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [lang, BASE]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/assessment-services")}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={13} />
            Back
          </button>

          <div className="flex items-center gap-1.5">
            <Globe size={12} className="text-slate-400" />
            {(["en", "zh", "ko"] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                  lang === l
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {loading && (
          <div className="flex justify-center py-24">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <p className="text-center text-slate-400 py-24 text-sm">Unable to load policy content.</p>
        )}
        {!loading && !error && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-8 py-10">
            <div className="prose-sm max-w-none">
              {renderMarkdown(content)}
            </div>
            <p className="mt-10 pt-6 border-t border-slate-100 text-[11px] text-slate-400 text-center">
              This document is a draft pending legal review. For questions, contact ReMynd Student Services.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
