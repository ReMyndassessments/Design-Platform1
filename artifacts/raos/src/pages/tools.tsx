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
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type ScoringConfigDomain = {
  label: string;
  shortLabel: string;
  narratives: { low: string; mild: string; moderate: string; elevated: string };
};

type ScoringConfig = {
  max: number;
  thresholds: { low: number; mild: number; moderate: number };
  domains: Record<string, ScoringConfigDomain>;
};

function emptyDomainConfig(): ScoringConfigDomain {
  return { label: "", shortLabel: "", narratives: { low: "", mild: "", moderate: "", elevated: "" } };
}

function buildScoringConfig(
  scaleMax: number,
  thresholds: { low: number; mild: number; moderate: number },
  domainConfigs: Record<string, ScoringConfigDomain>,
): ScoringConfig {
  return { max: scaleMax, thresholds, domains: domainConfigs };
}

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
  "parent", "teacher1", "teacher2", "boarding_staff", "referring_teacher", "self",
];

const FILTER_RESPONDENT_TYPES = ALL_RESPONDENT_TYPES as readonly string[];

const RESPONDENT_TYPE_LABELS: Record<string, string> = {
  parent:            "Parent",
  teacher1:          "Teacher 1",
  teacher2:          "Teacher 2",
  referring_teacher: "Referring Teacher",
  boarding_staff:    "Boarding Staff",
  self:              "Self-Report",
};

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
  textChinese?: string;
  textKorean?: string;
  type: "likert" | "text" | "checkbox" | "radio" | "multiple_choice" | "scale";
  options?: string[];
  optionsChinese?: string[];
  optionsKorean?: string[];
  domain?: string;
  required?: boolean;
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

// ── Shared Editable Form Items Component ──────────────────────────────────────

const ITEM_TYPE_OPTIONS: ImportedFormItem["type"][] = [
  "likert", "text", "checkbox", "radio", "multiple_choice", "scale",
];

function FormItemsEditor({
  items,
  onChange,
}: {
  items: ImportedFormItem[];
  onChange: (items: ImportedFormItem[]) => void;
}) {
  const [expanded, setExpanded] = useState(items.length > 0);

  function addItem() {
    const newItem: ImportedFormItem = {
      id: `item_${Date.now()}`,
      text: "",
      type: "likert",
      domain: "",
    };
    onChange([...items, newItem]);
    if (!expanded) setExpanded(true);
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, patch: Partial<ImportedFormItem>) {
    onChange(items.map((item, i) => i === idx ? { ...item, ...patch } : item));
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between w-full px-4 py-3 bg-slate-50">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(prev => !prev)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setExpanded(prev => !prev); }}
          className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none flex-1"
        >
          <List size={14} />
          Form Items
          <span className="text-xs font-normal text-slate-500">({items.length} item{items.length !== 1 ? "s" : ""})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); addItem(); }}
            className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80 transition-colors px-2 py-1 rounded hover:bg-primary/10"
          >
            <Plus size={12} /> Add Item
          </button>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpanded(prev => !prev)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setExpanded(prev => !prev); }}
            className="cursor-pointer"
          >
            {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {items.length === 0 && (
            <div className="px-4 py-5 text-center text-xs text-slate-400">
              No items yet. Click "Add Item" to add a question.
            </div>
          )}
          {items.map((item, idx) => (
            <div key={item.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-xs text-slate-400 font-mono w-6 shrink-0 pt-2">{idx + 1}.</span>
                <div className="flex-1 space-y-2">
                  <Input
                    value={item.text}
                    onChange={e => updateItem(idx, { text: e.target.value })}
                    placeholder="Question text..."
                    className="h-8 text-xs"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <select
                        value={item.type}
                        onChange={e => updateItem(idx, { type: e.target.value as ImportedFormItem["type"] })}
                        className="h-7 text-xs appearance-none border border-input rounded-md px-2 pr-6 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary"
                      >
                        {ITEM_TYPE_OPTIONS.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <Input
                      value={item.domain ?? ""}
                      onChange={e => updateItem(idx, { domain: e.target.value })}
                      placeholder="domain (e.g. attention)"
                      className="h-7 text-xs flex-1 min-w-24"
                    />
                    <button
                      type="button"
                      onClick={() => updateItem(idx, { required: !item.required })}
                      className={cn(
                        "h-7 px-2 text-xs rounded-md border transition-colors",
                        item.required !== false
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 text-slate-500"
                      )}
                      title="Toggle required"
                    >
                      {item.required !== false ? "Required" : "Optional"}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors mt-1"
                  title="Remove item"
                >
                  <Minus size={12} />
                </button>
              </div>
            </div>
          ))}
          {items.length > 0 && (
            <div className="px-4 py-2 bg-slate-50/50">
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80 transition-colors"
              >
                <Plus size={12} /> Add another item
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared Scoring Criteria Editor ────────────────────────────────────────────

function ScoringCriteriaEditor({
  scoringConfig,
  onChange,
  formItems,
}: {
  scoringConfig: ScoringConfig;
  onChange: (cfg: ScoringConfig) => void;
  formItems: ImportedFormItem[];
}) {
  const [expanded, setExpanded] = useState(false);

  // Derive domain keys from form items (unique non-empty domain values)
  const derivedDomains = Array.from(
    new Set(formItems.map(i => i.domain?.trim()).filter(Boolean) as string[])
  );

  // Ensure all derivedDomains have entries in domainConfigs
  function getDomainsWithDefaults(): Record<string, ScoringConfigDomain> {
    const result: Record<string, ScoringConfigDomain> = { ...scoringConfig.domains };
    for (const d of derivedDomains) {
      if (!result[d]) result[d] = emptyDomainConfig();
    }
    return result;
  }

  const domainKeys = derivedDomains.length > 0
    ? derivedDomains
    : Object.keys(scoringConfig.domains);

  function updateDomain(key: string, patch: Partial<ScoringConfigDomain>) {
    const domains = getDomainsWithDefaults();
    onChange({ ...scoringConfig, domains: { ...domains, [key]: { ...domains[key] ?? emptyDomainConfig(), ...patch } } });
  }

  function updateNarrative(key: string, band: keyof ScoringConfigDomain["narratives"], value: string) {
    const domains = getDomainsWithDefaults();
    const existing = domains[key] ?? emptyDomainConfig();
    onChange({
      ...scoringConfig,
      domains: { ...domains, [key]: { ...existing, narratives: { ...existing.narratives, [band]: value } } },
    });
  }

  const BANDS: { key: keyof ScoringConfigDomain["narratives"]; label: string; color: string }[] = [
    { key: "low", label: "Low", color: "text-emerald-700" },
    { key: "mild", label: "Mild", color: "text-sky-700" },
    { key: "moderate", label: "Moderate", color: "text-amber-700" },
    { key: "elevated", label: "Elevated", color: "text-red-700" },
  ];

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center justify-between w-full px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-indigo-800">
          <BarChart2Icon size={14} />
          Scoring Criteria
        </div>
        {expanded ? <ChevronUp size={14} className="text-indigo-400" /> : <ChevronDown size={14} className="text-indigo-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-indigo-200">
          {/* Scale max */}
          <div className="pt-3 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Scale Maximum</label>
            <p className="text-xs text-slate-400">The highest possible value on the response scale (e.g. 4 for 0–4 Likert)</p>
            <Input
              type="number"
              min={1}
              max={20}
              value={scoringConfig.max}
              onChange={e => onChange({ ...scoringConfig, max: Number(e.target.value) || 4 })}
              className="h-8 w-28 text-sm"
            />
          </div>

          {/* Thresholds */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Severity Thresholds (0–100 normalized scale)</label>
            <p className="text-xs text-slate-400">Upper boundary for each severity band</p>
            <div className="flex gap-3 flex-wrap">
              {(["low", "mild", "moderate"] as const).map(band => (
                <div key={band} className="space-y-1">
                  <label className="text-xs text-slate-500 capitalize">{band} ≤</label>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={scoringConfig.thresholds[band]}
                    onChange={e => onChange({ ...scoringConfig, thresholds: { ...scoringConfig.thresholds, [band]: Number(e.target.value) || 0 } })}
                    className="h-7 w-16 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Domain configs */}
          {domainKeys.length === 0 && (
            <p className="text-xs text-slate-400 italic">
              Add form items with domain assignments to configure per-domain labels and narratives.
            </p>
          )}
          {domainKeys.map(key => {
            const cfg = getDomainsWithDefaults()[key] ?? emptyDomainConfig();
            return (
              <div key={key} className="rounded-lg border border-indigo-200 bg-white p-3 space-y-3">
                <p className="text-xs font-bold text-indigo-800 font-mono">{key}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Label</label>
                    <Input
                      value={cfg.label}
                      onChange={e => updateDomain(key, { label: e.target.value })}
                      placeholder="Full label"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Short Label</label>
                    <Input
                      value={cfg.shortLabel}
                      onChange={e => updateDomain(key, { shortLabel: e.target.value })}
                      placeholder="Short label"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {BANDS.map(({ key: band, label, color }) => (
                    <div key={band} className="space-y-0.5">
                      <label className={`text-xs font-semibold ${color}`}>{label} narrative</label>
                      <Textarea
                        value={cfg.narratives[band]}
                        onChange={e => updateNarrative(key, band, e.target.value)}
                        placeholder={`Narrative for ${label} range...`}
                        className="min-h-[52px] resize-none text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Inline icon for Scoring Criteria button (BarChart2 equivalent)
function BarChart2Icon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
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

  const [aiImportOpen, setAiImportOpen] = useState(true);
  const [aiTab, setAiTab] = useState<"paste" | "upload">("paste");
  const [pasteText, setPasteText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<UploadedFileState | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [formItems, setFormItems] = useState<ImportedFormItem[]>([]);

  const defaultScoringConfig: ScoringConfig = { max: 4, thresholds: { low: 25, mild: 50, moderate: 65 }, domains: {} };
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>(defaultScoringConfig);

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!id.trim() || !name.trim()) return;
    setLookupError(null);
    setLookupLoading(true);
    try {
      const token = localStorage.getItem("raos_token");
      const res = await fetch("/api/assessment-tools/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ toolId: id.trim().toUpperCase(), toolName: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? `Server error ${res.status}`);
      }
      const data = await res.json() as {
        suggestedId?: string;
        name?: string;
        description: string;
        category: string;
        scoringType: "auto" | "manual";
        domains: string[];
        respondentTypes: string[];
      };
      if (data.name && !name.trim()) setName(data.name);
      if (data.description) setDescription(data.description);
      if (data.category) setCategory(data.category);
      if (data.scoringType) setScoringType(data.scoringType);
      if (data.domains?.length) setDomainsRaw(data.domains.join(", "));
      if (data.respondentTypes?.length) setRespondents(data.respondentTypes);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : "AI lookup failed. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  };

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
        data: {
          id: id.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim(),
          category: category.trim(),
          scoringType,
          domains,
          respondentTypes: respondents,
          isRemyndOwned,
          formItems: formItems.length > 0 ? formItems : undefined,
          ...(scoringType === "auto" && { scoringConfig: buildScoringConfig(scoringConfig.max, scoringConfig.thresholds, scoringConfig.domains) }),
        },
      },
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
            <div
              role="button"
              tabIndex={0}
              onClick={() => setAiImportOpen(prev => !prev)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setAiImportOpen(prev => !prev); }}
              className="flex items-center justify-between w-full px-4 py-3 text-left cursor-pointer select-none"
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
            </div>

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

          {id.trim() && name.trim() && (
            <div className="space-y-2">
              <Button
                type="button"
                onClick={handleLookup}
                disabled={lookupLoading}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2 h-9 text-sm"
              >
                {lookupLoading ? (
                  <><Loader2 size={14} className="animate-spin" /> Filling fields with AI...</>
                ) : (
                  <><Sparkles size={14} /> Fill remaining fields with AI</>
                )}
              </Button>
              {lookupError && (
                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {lookupError}
                </div>
              )}
            </div>
          )}

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
                  <option value="auto">Auto-scored</option>
                  <option value="manual">Manual scoring</option>
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

          {/* Editable Form Items */}
          <FormItemsEditor items={formItems} onChange={setFormItems} />

          {/* Scoring Criteria — only for auto-scored tools */}
          {scoringType === "auto" && (
            <ScoringCriteriaEditor
              scoringConfig={scoringConfig}
              onChange={setScoringConfig}
              formItems={formItems}
            />
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
  const [formItems, setFormItems] = useState<ImportedFormItem[]>((tool.formItems ?? []) as ImportedFormItem[]);
  const defaultScoringConfig: ScoringConfig = { max: 4, thresholds: { low: 25, mild: 50, moderate: 65 }, domains: {} };
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>(
    tool.scoringConfig ? (tool.scoringConfig as ScoringConfig) : defaultScoringConfig
  );
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
        id: tool.id,
        data: {
          name: name.trim(),
          description: description.trim(),
          category: category.trim(),
          scoringType,
          domains,
          respondentTypes: respondents,
          formItems: formItems.length > 0 ? formItems : null,
          ...(scoringType === "auto" && { scoringConfig: buildScoringConfig(scoringConfig.max, scoringConfig.thresholds, scoringConfig.domains) }),
        } as Parameters<typeof updateMut.mutate>[0]["data"],
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

          {/* Editable Form Items */}
          <FormItemsEditor items={formItems} onChange={setFormItems} />

          {/* Scoring Criteria — only for auto-scored tools */}
          {scoringType === "auto" && (
            <ScoringCriteriaEditor
              scoringConfig={scoringConfig}
              onChange={setScoringConfig}
              formItems={formItems}
            />
          )}

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
      { id: tool.id },
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
  const [filterRespondent, setFilterRespondent] = useState("all");
  const [adding, setAdding] = useState(false);

  const filtered = (tools ?? []).filter(t => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.domains.some(d => d.toLowerCase().includes(q));
    const matchRespondent =
      filterRespondent === "all" || (t.respondentTypes ?? []).includes(filterRespondent);
    return matchSearch && matchRespondent;
  });


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
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-full sm:w-52 appearance-none pr-8"
            value={filterRespondent}
            onChange={e => setFilterRespondent(e.target.value)}
          >
            <option value="all">All Respondent Types</option>
            {FILTER_RESPONDENT_TYPES.map(rt => (
              <option key={rt} value={rt}>{RESPONDENT_TYPE_LABELS[rt] ?? rt}</option>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(tool => <ToolCard key={tool.id} tool={tool} isAdmin={isAdmin} />)}
        </div>
      )}

      {adding && <AddToolModal onClose={() => setAdding(false)} />}
    </div>
  );
}
