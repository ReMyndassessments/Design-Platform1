import React, { useState } from "react";
import { useListAssessmentTools } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Layers, CheckCircle2, Clock } from "lucide-react";

const categoryColors: Record<string, string> = {
  "admin": "bg-slate-100 text-slate-700",
  "behavior": "bg-blue-100 text-blue-700",
  "cognitive": "bg-purple-100 text-purple-700",
  "achievement": "bg-green-100 text-green-700",
  "language": "bg-yellow-100 text-yellow-700",
  "social-emotional": "bg-pink-100 text-pink-700",
  "executive-function": "bg-orange-100 text-orange-700",
  "memory": "bg-indigo-100 text-indigo-700",
  "processing": "bg-teal-100 text-teal-700",
  "adaptive": "bg-lime-100 text-lime-700",
};

function categoryBadge(cat: string) {
  const cls = categoryColors[cat.toLowerCase()] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {cat}
    </span>
  );
}

export default function AssessmentTools() {
  const { data: tools, isLoading } = useListAssessmentTools();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const categories = tools
    ? ["all", ...Array.from(new Set(tools.map(t => t.category))).sort()]
    : ["all"];

  const filtered = (tools ?? []).filter(t => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.domains.some(d => d.toLowerCase().includes(q));
    const matchCat = filterCategory === "all" || t.category === filterCategory;
    return matchSearch && matchCat;
  });

  const remyndTools = filtered.filter(t => t.isRemyndOwned);
  const thirdPartyTools = filtered.filter(t => !t.isRemyndOwned);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Assessment Tools</h1>
        <p className="text-slate-500 mt-1">All available instruments and forms in the ReMynd system.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search by name, description, or domain..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-full sm:w-48"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          {categories.map(c => (
            <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">No tools match your search.</div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-8">
          {remyndTools.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                ReMynd Forms ({remyndTools.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {remyndTools.map(tool => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </section>
          )}

          {thirdPartyTools.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                Third-Party Instruments ({thirdPartyTools.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {thirdPartyTools.map(tool => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ToolCard({ tool }: { tool: any }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm leading-tight">{tool.name}</h3>
          {tool.description && (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{tool.description}</p>
          )}
        </div>
        {tool.isRemyndOwned && (
          <span className="shrink-0 inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-100">
            ReMynd
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {categoryBadge(tool.category)}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${tool.scoringType === "auto" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
          {tool.scoringType === "auto" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {tool.scoringType === "auto" ? "Auto-scored" : "Manual scoring"}
        </span>
      </div>

      {tool.domains?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tool.domains.map((d: string) => (
            <span key={d} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
              {d}
            </span>
          ))}
        </div>
      )}

      {tool.respondentTypes?.length > 0 && (
        <div className="text-xs text-slate-400">
          Respondents: {tool.respondentTypes.join(", ")}
        </div>
      )}
    </div>
  );
}
