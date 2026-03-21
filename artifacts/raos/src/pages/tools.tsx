import React, { useState } from "react";
import {
  useListAssessmentTools,
  useUpdateAssessmentTool,
  useDeleteAssessmentTool,
  useCreateAssessmentTool,
  useGetCurrentUser,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Layers,
  CheckCircle2,
  Clock,
  Eye,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  ChevronDown,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

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

const ALL_RESPONDENT_TYPES = [
  "parent", "teacher1", "teacher2", "student", "self",
  "school", "school_counselor", "special_needs_teacher", "referring_teacher",
];

function categoryBadge(cat: string) {
  const cls = categoryColors[cat.toLowerCase()] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {cat}
    </span>
  );
}

// ── Add Tool Modal ─────────────────────────────────────────────────────────────

function AddToolModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const createMut = useCreateAssessmentTool();

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [scoringType, setScoringType] = useState<"auto" | "manual">("manual");
  const [domainsRaw, setDomainsRaw] = useState("");
  const [respondents, setRespondents] = useState<string[]>([]);
  const [isRemyndOwned, setIsRemyndOwned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRespondent = (r: string) => {
    setRespondents(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    );
  };

  const handleCreate = () => {
    if (!id.trim()) { setError("Tool ID is required."); return; }
    if (!name.trim()) { setError("Name is required."); return; }
    if (!category.trim()) { setError("Category is required."); return; }
    const domains = domainsRaw.split(",").map(d => d.trim()).filter(Boolean);
    createMut.mutate(
      {
        id: id.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        scoringType,
        domains,
        respondentTypes: respondents,
        isRemyndOwned,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/assessment-tools"] });
          onClose();
        },
        onError: (err: any) => {
          const msg = err?.message ?? "";
          if (msg.includes("409") || msg.includes("conflict")) {
            setError("A tool with this ID already exists. Please use a different ID.");
          } else {
            setError("Failed to create tool. Please try again.");
          }
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-primary" />
            <h2 className="font-bold text-slate-900 text-base">Add Assessment Tool</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Tool ID <span className="text-red-500">*</span></label>
            <Input
              value={id}
              onChange={e => setId(e.target.value)}
              className="h-10 font-mono"
              placeholder="e.g. RASR, RCS-80, BRIEF"
            />
            <p className="text-xs text-slate-400">Short unique identifier — will be uppercased automatically</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Name <span className="text-red-500">*</span></label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-10"
              placeholder="Full tool name..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="min-h-[80px] resize-none text-sm"
              placeholder="Brief description of this assessment tool..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Category <span className="text-red-500">*</span></label>
            <Input
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="h-10"
              placeholder="e.g. ReMynd Core, External — Standardized, ReMynd Admin Forms"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Scoring Type</label>
              <div className="relative">
                <select
                  value={scoringType}
                  onChange={e => setScoringType(e.target.value as "auto" | "manual")}
                  className="w-full h-10 appearance-none border border-input rounded-md px-3 pr-8 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="manual">Manual scoring</option>
                  <option value="auto">Auto-scored</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">ReMynd Owned?</label>
              <button
                type="button"
                onClick={() => setIsRemyndOwned(prev => !prev)}
                className={cn(
                  "w-full h-10 rounded-md border text-sm font-medium transition-all",
                  isRemyndOwned
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                )}
              >
                {isRemyndOwned ? "Yes — ReMynd" : "No — Third-Party"}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Domains</label>
            <Input
              value={domainsRaw}
              onChange={e => setDomainsRaw(e.target.value)}
              placeholder="attention, memory, executive_function  (comma-separated)"
              className="h-10 text-sm"
            />
            <p className="text-xs text-slate-400">Separate multiple domains with commas</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Respondent Types</label>
            <div className="flex flex-wrap gap-2">
              {ALL_RESPONDENT_TYPES.map(r => {
                const selected = respondents.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRespondent(r)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-slate-200 text-slate-600 hover:border-primary/40"
                    )}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleCreate} disabled={createMut.isPending}>
            {createMut.isPending ? "Creating..." : "Add Tool"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────

function EditToolModal({ tool, onClose }: { tool: any; onClose: () => void }) {
  const qc = useQueryClient();
  const updateMut = useUpdateAssessmentTool();

  const [name, setName] = useState(tool.name ?? "");
  const [description, setDescription] = useState(tool.description ?? "");
  const [category, setCategory] = useState(tool.category ?? "");
  const [scoringType, setScoringType] = useState<"auto" | "manual">(tool.scoringType ?? "auto");
  const [domainsRaw, setDomainsRaw] = useState((tool.domains ?? []).join(", "));
  const [respondents, setRespondents] = useState<string[]>(tool.respondentTypes ?? []);
  const [error, setError] = useState<string | null>(null);

  const toggleRespondent = (r: string) => {
    setRespondents(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    );
  };

  const handleSave = () => {
    if (!name.trim()) { setError("Name is required."); return; }
    if (!category.trim()) { setError("Category is required."); return; }
    const domains = domainsRaw.split(",").map(d => d.trim()).filter(Boolean);
    updateMut.mutate(
      {
        toolId: tool.id,
        data: { name: name.trim(), description: description.trim(), category: category.trim(), scoringType, domains, respondentTypes: respondents },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/assessment-tools"] });
          onClose();
        },
        onError: () => setError("Failed to save changes. Please try again."),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-primary" />
            <h2 className="font-bold text-slate-900 text-base">Edit Assessment Tool</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Name <span className="text-red-500">*</span></label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-10" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="min-h-[80px] resize-none text-sm"
              placeholder="Brief description of this assessment tool..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Category <span className="text-red-500">*</span></label>
            <Input
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Scoring Type</label>
            <div className="relative">
              <select
                value={scoringType}
                onChange={e => setScoringType(e.target.value as "auto" | "manual")}
                className="w-full h-10 appearance-none border border-input rounded-md px-3 pr-8 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="auto">Auto-scored</option>
                <option value="manual">Manual scoring</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Domains</label>
            <Input
              value={domainsRaw}
              onChange={e => setDomainsRaw(e.target.value)}
              placeholder="attention, memory, executive_function  (comma-separated)"
              className="h-10 text-sm"
            />
            <p className="text-xs text-slate-400">Separate multiple domains with commas</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Respondent Types</label>
            <div className="flex flex-wrap gap-2">
              {ALL_RESPONDENT_TYPES.map(r => {
                const selected = respondents.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRespondent(r)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-slate-200 text-slate-600 hover:border-primary/40"
                    )}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={updateMut.isPending}>
            {updateMut.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirmation ───────────────────────────────────────────────────────

function DeleteConfirmDialog({ tool, onClose }: { tool: any; onClose: () => void }) {
  const qc = useQueryClient();
  const deleteMut = useDeleteAssessmentTool();

  const handleDelete = () => {
    deleteMut.mutate(
      { toolId: tool.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/assessment-tools"] });
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <h2 className="font-bold text-slate-900 text-lg mb-1">Delete Tool</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-slate-700">"{tool.name}"</span>? This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleDelete}
            disabled={deleteMut.isPending}
          >
            {deleteMut.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Tool Card ─────────────────────────────────────────────────────────────────

function ToolCard({ tool, isAdmin }: { tool: any; isAdmin: boolean }) {
  const [, setLocation] = useLocation();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 hover:shadow-sm transition-all group">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm leading-tight">{tool.name}</h3>
            {tool.description && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{tool.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {tool.isRemyndOwned && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-100">
                ReMynd
              </span>
            )}
            {/* Admin-only action buttons */}
            {isAdmin && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  title="Edit"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleting(true)}
                  title="Delete"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 items-center">
          {categoryBadge(tool.category)}
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
            tool.scoringType === "auto"
              ? "bg-green-50 text-green-700"
              : "bg-amber-50 text-amber-700"
          )}>
            {tool.scoringType === "auto" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {tool.scoringType === "auto" ? "Auto-scored" : "Manual scoring"}
          </span>
        </div>

        {/* Domains */}
        {tool.domains?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tool.domains.map((d: string) => (
              <span key={d} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {d}
              </span>
            ))}
          </div>
        )}

        {/* Respondents */}
        {tool.respondentTypes?.length > 0 && (
          <div className="text-xs text-slate-400">
            Respondents: {tool.respondentTypes.join(", ")}
          </div>
        )}

        {/* View Form button */}
        {tool.isRemyndOwned && (
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs h-8"
              onClick={() => setLocation(`/tools/${encodeURIComponent(tool.id)}/preview`)}
            >
              <Eye className="w-3.5 h-3.5" /> View Form
            </Button>
          </div>
        )}
      </div>

      {editing && <EditToolModal tool={tool} onClose={() => setEditing(false)} />}
      {deleting && <DeleteConfirmDialog tool={tool} onClose={() => setDeleting(false)} />}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssessmentTools() {
  const { data: tools, isLoading } = useListAssessmentTools();
  const { data: user } = useGetCurrentUser();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [adding, setAdding] = useState(false);

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assessment Tools</h1>
          <p className="text-slate-500 mt-1">All available instruments and forms in the ReMynd system.</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setAdding(true)}
            className="gap-2 flex-shrink-0"
          >
            <Plus size={16} />
            Add Tool
          </Button>
        )}
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
        <div className="relative">
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-full sm:w-48 appearance-none pr-8"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
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
                {remyndTools.map(tool => <ToolCard key={tool.id} tool={tool} isAdmin={isAdmin} />)}
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
                {thirdPartyTools.map(tool => <ToolCard key={tool.id} tool={tool} isAdmin={isAdmin} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {adding && <AddToolModal onClose={() => setAdding(false)} />}
    </div>
  );
}
