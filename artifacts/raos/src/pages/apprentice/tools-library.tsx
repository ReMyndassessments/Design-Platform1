import { useState } from "react";
import { Link } from "wouter";
import { useListAssessmentTools } from "@workspace/api-client-react";
import { ArrowLeft, Search, Lock, ClipboardList } from "lucide-react";

const categoryColors: Record<string, string> = {
  admin: "bg-slate-100 text-slate-700",
  behavior: "bg-blue-100 text-blue-700",
  cognitive: "bg-purple-100 text-purple-700",
  achievement: "bg-green-100 text-green-700",
  language: "bg-yellow-100 text-yellow-700",
  "social-emotional": "bg-pink-100 text-pink-700",
  "executive-function": "bg-orange-100 text-orange-700",
  memory: "bg-indigo-100 text-indigo-700",
  processing: "bg-teal-100 text-teal-700",
  adaptive: "bg-lime-100 text-lime-700",
};

function categoryBadge(cat: string) {
  const cls = categoryColors[cat?.toLowerCase()] ?? "bg-slate-100 text-slate-600";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{cat}</span>;
}

export default function ApprenticeToolsLibraryPage() {
  const { data: tools, isLoading } = useListAssessmentTools();
  const [search, setSearch] = useState("");

  const filtered = (tools ?? []).filter((tool) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return tool.name.toLowerCase().includes(q) || tool.category.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/apprentice/resources" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} /> Back to Training Resources
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <ClipboardList size={22} className="text-amber-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Clinical Reference</p>
          <h1 className="text-2xl font-bold text-slate-900">Assessment Tools Library</h1>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <Lock size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-slate-600">
          This is a read-only view of every assessment tool configured in RAOS. As an apprentice, you can browse this list but cannot add, edit, or delete tools.
        </p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools by name, category, or description..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading tools...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400">No tools match your search.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((tool) => (
            <div key={tool.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">{tool.name}</p>
                {categoryBadge(tool.category)}
              </div>
              {tool.description && <p className="text-xs text-slate-500 mt-1.5">{tool.description}</p>}
              {tool.domains?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tool.domains.map((domain) => (
                    <span key={domain} className="text-[11px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                      {domain}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
