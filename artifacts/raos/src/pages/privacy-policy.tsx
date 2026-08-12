import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Globe, FileText, ChevronRight } from "lucide-react";

type Lang = "en" | "zh" | "ko";
const LANG_LABELS: Record<Lang, string> = { en: "English", zh: "中文", ko: "한국어" };

const BASE = import.meta.env.BASE_URL;

function renderTable(tableLines: string[], startKey: number) {
  const rows = tableLines
    .filter(l => !l.replace(/[\s|:-]/g, ""))  // drop separator rows (---|---)
    .map(l =>
      l.split("|")
        .map(c => c.trim())
        .filter((_, i, a) => i > 0 && i < a.length - 1) // drop leading/trailing empty from outer pipes
    );
  if (rows.length < 1) return null;
  const [head, ...body] = rows;
  return (
    <div key={startKey} className="my-4 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50">
            {head.map((cell, ci) => (
              <th key={ci} className="border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700">{renderInline(cell)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
              {row.map((cell, ci) => (
                <td key={ci} className="border border-slate-200 px-3 py-2 text-xs text-slate-600">{renderInline(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const output: React.ReactNode[] = [];
  let i = 0;
  let k = 0; // unique key counter
  while (i < lines.length) {
    const line = lines[i];
    // Collect contiguous table rows
    if (line.trimStart().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const node = renderTable(tableLines, k++);
      if (node) output.push(node);
      continue;
    }
    const key = k++;
    if (line.startsWith("# "))   { output.push(<h1 key={key} className="text-xl font-bold text-slate-900 mt-6 mb-2">{line.slice(2)}</h1>); }
    else if (line.startsWith("## "))  { output.push(<h2 key={key} className="text-base font-semibold text-slate-800 mt-5 mb-1.5 border-b border-slate-100 pb-1">{line.slice(3)}</h2>); }
    else if (line.startsWith("### ")) { output.push(<h3 key={key} className="text-sm font-semibold text-slate-700 mt-4 mb-1">{line.slice(4)}</h3>); }
    else if (line.startsWith("- "))   { output.push(<li key={key} className="ml-5 text-slate-600 text-sm leading-relaxed list-disc">{renderInline(line.slice(2))}</li>); }
    else if (line.startsWith("---"))  { output.push(<hr key={key} className="border-slate-200 my-4" />); }
    else if (line.trim() === "")      { output.push(<div key={key} className="h-2" />); }
    else                              { output.push(<p key={key} className="text-slate-600 text-sm leading-relaxed">{renderInline(line)}</p>); }
    i++;
  }
  return output;
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="font-semibold text-slate-800">{p.slice(2, -2)}</strong>
      : p
  );
}

export default function PrivacyPolicyPage() {
  const [, navigate] = useLocation();
  const [lang, setLang] = useState<Lang>("en");
  const [policyNames, setPolicyNames] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("China Privacy Notice");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load policy index
  useEffect(() => {
    fetch(`${BASE}api/public/policies`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { name: string }[]) => setPolicyNames(data.map(d => d.name)))
      .catch(() => {});
  }, [BASE]);

  // Load selected document
  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`${BASE}api/public/privacy-policy?lang=${lang}&name=${encodeURIComponent(selected)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setContent(d.content); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [lang, selected, BASE]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/assessment-services")}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={13} />
            Back
          </button>

          <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Privacy &amp; Compliance Policies</span>

          <div className="flex items-center gap-1.5">
            <Globe size={12} className="text-slate-400" />
            {(["en", "zh", "ko"] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                  lang === l ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 py-8 gap-6">

        {/* Sidebar */}
        <aside className={`${sidebarOpen ? "w-64" : "w-10"} flex-shrink-0 transition-all duration-200`}>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <FileText size={13} className="flex-shrink-0" />
              {sidebarOpen && <span className="truncate">All Documents</span>}
            </button>
            {sidebarOpen && (
              <nav className="py-1">
                {policyNames.map(name => (
                  <button
                    key={name}
                    onClick={() => setSelected(name)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 text-[11px] leading-snug transition-colors ${
                      selected === name
                        ? "bg-indigo-50 text-indigo-700 font-medium"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <ChevronRight size={10} className={`flex-shrink-0 transition-transform ${selected === name ? "rotate-90 text-indigo-500" : "text-slate-300"}`} />
                    <span>{name}</span>
                  </button>
                ))}
              </nav>
            )}
          </div>
        </aside>

        {/* Document viewer */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-8 py-8 min-h-[500px]">
            {loading && (
              <div className="flex justify-center py-24">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
              </div>
            )}
            {error && (
              <p className="text-center text-slate-400 py-24 text-sm">Unable to load policy content.</p>
            )}
            {!loading && !error && (
              <>
                <div className="prose-sm max-w-none">
                  {renderMarkdown(content)}
                </div>
                <p className="mt-10 pt-6 border-t border-slate-100 text-[11px] text-slate-400 text-center">
                  These documents are drafts pending legal review and effective dates. For questions, contact ReMynd Student Services.
                </p>
              </>
            )}
          </div>
        </main>

      </div>
    </div>
  );
}
