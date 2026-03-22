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
  ChevronUp,
  Plus,
  Sparkles,
  Upload,
  FileText,
  Loader2,
  List,
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

type ImportedFormItem = {
  id: string;
  text: string;
  type: "likert" | "text" | "checkbox" | "radio" | "multiple_choice" | "scale";
  options?: string[];
  domain?: string;
};

type UploadedFileState =
  | { name: string; kind: "text"; content: string }
  | { name: string; kind: "document"; base64: string }
  | { name: string; kind: "image"; base64: string; mimeType: string };

const ACCEPTED_EXTS = ".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg";

function fileKind(file: File): "image" | "document" | "text" | "unsupported" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "text/plain" || file.name.endsWith(".txt")) return "text";
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx")) return "document";
  return "unsupported";
}

function fileIcon(kind: UploadedFileState["kind"]) {
  if (kind === "image") return "🖼️";
  if (kind === "document") return "📄";
  return "📋";
}

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

  const [aiImportOpen, setAiImportOpen] = useState(true);
  const [aiTab, setAiTab] = useState<"paste" | "upload">("paste");
  const [pasteText, setPasteText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<UploadedFileState | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [formItems, setFormItems] = useState<ImportedFormItem[]>([]);
  const [itemsExpanded, setItemsExpanded] = useState(false);

  const toggleRespondent = (r: string) => {
    setRespondents(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiError(null);

    const kind = fileKind(file);

    if (kind === "unsupported") {
      setAiError(`"${file.name}" is not supported. Please use PDF, Word (.docx), .txt, or an image file.`);
      e.target.value = "";
      return;
    }

    if (kind === "image") {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setUploadedFile({ name: file.name, kind: "image", base64, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    } else if (kind === "text") {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedFile({ name: file.name, kind: "text", content: reader.result as string });
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const bytes = new Uint8Array(reader.result as ArrayBuffer);
        let binary = "";
        bytes.forEach(b => { binary += String.fromCharCode(b); });
        const base64 = btoa(binary);
        setUploadedFile({ name: file.name, kind: "document", base64 });
      };
      reader.readAsArrayBuffer(file);
    }
    e.target.value = "";
  };

  const handleAnalyze = async () => {
    setAiError(null);
    setAiLoading(true);
    try {
      const token = localStorage.getItem("raos_token");
      const body: Record<string, string> = {};
      if (aiTab === "paste" && pasteText.trim()) {
        body.formText = pasteText.trim();
      } else if (aiTab === "upload" && uploadedFile) {
        if (uploadedFile.kind === "image") {
          body.imageBase64 = uploadedFile.base64;
          body.mimeType = uploadedFile.mimeType;
        } else if (uploadedFile.kind === "document") {
          body.fileBase64 = uploadedFile.base64;
          body.fileName = uploadedFile.name;
        } else {
          body.formText = uploadedFile.content;
        }
      }
      const res = await fetch("/api/assessment-tools/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? `Server error ${res.status}`);
      }
      const data = await res.json() as {
        suggestedId: string;
        name: string;
        description: string;
        category: string;
        scoringType: "auto" | "manual";
        domains: string[];
        respondentTypes: string[];
        formItems: ImportedFormItem[];
      };
      setId(data.suggestedId ?? "");
      setName(data.name ?? "");
      setDescription(data.description ?? "");
      setCategory(data.category ?? "");
      setScoringType(data.scoringType ?? "manual");
      setDomainsRaw((data.domains ?? []).join(", "));
      setRespondents(data.respondentTypes ?? []);
      setFormItems(data.formItems ?? []);
      if ((data.formItems ?? []).length > 0) setItemsExpanded(true);
      setAiImportOpen(false);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "AI analysis failed. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const canAnalyze = (aiTab === "paste" && pasteText.trim().length > 0)
    || (aiTab === "upload" && uploadedFile !== null && uploadedFile.kind !== undefined);

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
        formItems: formItems.length > 0 ? formItems : undefined,
      } as Parameters<typeof createMut.mutate>[0],
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/assessment-tools"] });
          onClose();
        },
        onError: (err: unknown) => {
          const msg = (err as { message?: string })?.message ?? "";
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-primary" />
            <h2 className="font-bold text-slate-900 text-base">Add Assessment Tool</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* AI Import Section */}
          <div className="rounded-xl border border-violet-200 bg-violet-50 overflow-hidden">
            <button
              type="button"
              onClick={() => setAiImportOpen(prev => !prev)}
              className="flex items-center justify-between w-full px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-violet-600" />
                <span className="text-sm font-semibold text-violet-800">Smart Import with AI</span>
                {formItems.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-violet-600 text-white px-2 py-0.5 rounded-full">
                    <List size={10} /> {formItems.length} items extracted
                  </span>
                )}
              </div>
              {aiImportOpen ? <ChevronUp size={15} className="text-violet-500" /> : <ChevronDown size={15} className="text-violet-500" />}
            </button>

            {aiImportOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-violet-200">
                <p className="text-xs text-violet-600 pt-3">
                  Paste or upload a form and AI will auto-fill all fields and extract every item.
                </p>

                <div className="flex border border-violet-200 rounded-lg overflow-hidden text-xs font-medium">
                  {(["paste", "upload"] as const).map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setAiTab(tab)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors",
                        aiTab === tab
                          ? "bg-violet-600 text-white"
                          : "text-violet-600 hover:bg-violet-100"
                      )}
                    >
                      {tab === "paste" ? <FileText size={12} /> : <Upload size={12} />}
                      {tab === "paste" ? "Paste Text" : "Upload File"}
                    </button>
                  ))}
                </div>

                {aiTab === "paste" ? (
                  <Textarea
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    className="min-h-[120px] resize-none text-xs bg-white border-violet-200 focus:border-violet-400"
                    placeholder="Paste the full text of the assessment form here — questions, instructions, response scales, everything..."
                  />
                ) : (
                  <div
                    className={cn(
                      "relative w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed rounded-lg text-xs transition-colors overflow-hidden",
                      uploadedFile
                        ? "border-violet-400 bg-violet-100 text-violet-700"
                        : "border-violet-200 text-violet-400 hover:border-violet-400 hover:bg-violet-100"
                    )}
                  >
                    <input
                      type="file"
                      accept={ACCEPTED_EXTS}
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      title=""
                    />
                    <div className="pointer-events-none flex flex-col items-center gap-2">
                      {uploadedFile ? (
                        <>
                          <span className="text-2xl">{fileIcon(uploadedFile.kind)}</span>
                          <span className="font-medium text-violet-700">{uploadedFile.name}</span>
                          <span className="text-violet-500">Click to replace</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20} />
                          <span className="font-medium">Click to select a file</span>
                          <span className="text-violet-300">PDF · Word (.docx) · .txt · PNG · JPG</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {aiError && (
                  <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {aiError}
                  </div>
                )}

                <Button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze || aiLoading}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2"
                >
                  {aiLoading ? (
                    <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles size={14} /> Analyze with AI</>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Form Fields */}
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
              placeholder="e.g. behavior, cognitive, social-emotional"
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

          {/* Extracted Form Items Preview */}
          {formItems.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setItemsExpanded(prev => !prev)}
                className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 text-left"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <List size={14} />
                  Extracted Form Items
                  <span className="text-xs font-normal text-slate-500">({formItems.length} items)</span>
                </div>
                {itemsExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </button>
              {itemsExpanded && (
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {formItems.map((item, idx) => (
                    <div key={item.id} className="flex gap-3 px-4 py-2.5">
                      <span className="text-xs text-slate-400 font-mono w-6 shrink-0 pt-0.5">{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 leading-snug">{item.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400 italic">{item.type}</span>
                          {item.domain && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{item.domain}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

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
