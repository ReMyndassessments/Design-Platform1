import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Save, Upload, Trash2, Loader2, CheckCircle2,
  AlertTriangle, FileText, Sparkles, ChevronRight, BookOpen,
  Layers, Star, BarChart3, RefreshCw, Eye, ClipboardList,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────

const DOMAINS = [
  "Social Communication English","Academic Listening","Academic Speaking",
  "Academic Reading","Academic Writing","General Academic Vocabulary",
  "Subject-Specific Vocabulary","Understanding of Classroom Directions",
  "Explanation and Elaboration","Sequencing and Organization",
  "Comparison and Classification","Cause-and-Effect Reasoning",
  "Inference and Prediction","Justification and Evidence",
  "Evaluation and Hypothesizing","Mathematics Language",
  "Science Language","Humanities Language",
  "Academic Independence","Response to Scaffolding",
];

const MODULES = [
  { id: "social_communication", name: "Module 1: Social Communication Baseline", domains: ["Social Communication English"], required: true },
  { id: "academic_listening",   name: "Module 2: Academic Listening",  domains: ["Academic Listening","Understanding of Classroom Directions"] },
  { id: "academic_speaking",    name: "Module 3: Academic Speaking",    domains: ["Academic Speaking","Explanation and Elaboration","Sequencing and Organization"] },
  { id: "academic_reading",     name: "Module 4: Academic Reading",     domains: ["Academic Reading","Inference and Prediction","General Academic Vocabulary"] },
  { id: "academic_writing",     name: "Module 5: Academic Writing",     domains: ["Academic Writing","Comparison and Classification","Justification and Evidence"] },
  { id: "mathematics_language", name: "Module 6: Mathematics Language", domains: ["Mathematics Language"] },
  { id: "science_language",     name: "Module 7: Science Language",     domains: ["Science Language","Cause-and-Effect Reasoning"] },
  { id: "humanities_language",  name: "Module 8: Humanities Language",  domains: ["Humanities Language","Evaluation and Hypothesizing"] },
  { id: "literature",           name: "Module 9: Literature and Extended Text", domains: ["Subject-Specific Vocabulary"] },
  { id: "academic_independence",name: "Module 10: Academic Independence", domains: ["Academic Independence","Response to Scaffolding"] },
];

const LANGUAGE_FUNCTIONS = [
  "identify","recall","describe","sequence","classify","compare",
  "summarize","explain","infer","predict","justify","evaluate",
  "hypothesize","argue","support with evidence",
];

const SCORE_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: "Not Demonstrated", color: "text-red-700", bg: "bg-red-100 border-red-300" },
  1: { label: "Emerging",         color: "text-orange-700", bg: "bg-orange-100 border-orange-300" },
  2: { label: "Developing",       color: "text-amber-700",  bg: "bg-amber-100 border-amber-300" },
  3: { label: "Functional",       color: "text-blue-700",   bg: "bg-blue-100 border-blue-300" },
  4: { label: "Independent",      color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-300" },
};

const FUNCTION_LEVELS: Record<string, { label: string; color: string }> = {
  not_assessed:    { label: "Not Assessed",    color: "text-slate-400" },
  not_demonstrated:{ label: "Not Demonstrated",color: "text-red-600" },
  emerging:        { label: "Emerging",         color: "text-orange-600" },
  developing:      { label: "Developing",       color: "text-amber-600" },
  functional:      { label: "Functional",       color: "text-blue-600" },
  independent:     { label: "Independent",      color: "text-emerald-600" },
};

const SUBJECTS = ["English / Language Arts","Mathematics","Science","Humanities / Social Studies","History","Geography","Literature","General / Homeroom","Other"];
const GRADE_LEVELS = ["Year 1","Year 2","Year 3","Year 4","Year 5","Year 6","Year 7","Year 8","Year 9","Year 10","Year 11","Year 12","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
const LANGUAGES = ["Mandarin Chinese","Cantonese","Korean","Japanese","Thai","Vietnamese","Malay","Tamil","Hindi","Tagalog","Indonesian","Arabic","Spanish","French","German","English","Other"];
const PATHWAYS = [
  { value: "standalone", label: "Standalone RAEPA", desc: "Full 90–120 min independent assessment" },
  { value: "comprehensive", label: "Add-on (Comprehensive Assessment)", desc: "Supplement to a broader assessment package" },
];

const TABS = [
  { id: "setup",     label: "Setup",         icon: ClipboardList },
  { id: "samples",   label: "Work Samples",  icon: FileText },
  { id: "scoring",   label: "Domain Scoring",icon: BarChart3 },
  { id: "functions", label: "Language Functions", icon: Layers },
  { id: "report",    label: "Report",        icon: BookOpen },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("raos_token")}` });

function api(path: string, options?: RequestInit) {
  return fetch(`${BASE_URL}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeader(), ...(options?.headers ?? {}) },
    ...options,
  });
}

function calcAge(dob: string) {
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function avgScore(ratings: DomainRating[]): number {
  if (!ratings.length) return 0;
  return ratings.reduce((a, r) => a + r.score, 0) / ratings.length;
}

function profileCategory(avg: number): string {
  if (avg >= 3.5) return "Independent";
  if (avg >= 2.5) return "Functional";
  if (avg >= 1.5) return "Developing";
  if (avg >= 0.5) return "Emerging";
  return "Not Demonstrated";
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Session {
  id: string; case_id: string; status: string; pathway: string;
  language_background: Record<string, string>;
  modules_selected: string[];
  overall_summary?: string; confidence_level?: string; general_notes?: string;
}
interface WorkSample {
  id: string; case_id: string; file_name?: string; file_url?: string; file_type?: string;
  title?: string; subject?: string; task_type?: string; date_completed?: string;
  teacher?: string; grade_level?: string; independent_completion: boolean;
  support_provided?: string; student_selected: boolean;
  ai_analysis_status: string; ai_analysis?: any;
  assessor_approved: boolean; teacher_comments?: string;
  created_at: string;
}
interface DomainRating {
  id: string; session_id: string; domain: string; score: number;
  confidence?: string; evidence?: string; support_level_required?: string;
}
interface LangFunction {
  id: string; session_id: string; function_name: string; level: string;
  evidence?: string; subject_context?: string;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function RaepaPage() {
  const { id: caseId, assignmentId } = useParams<{ id: string; assignmentId: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState("setup");
  const [saving, setSaving] = useState(false);

  // Setup state
  const [pathway, setPathway] = useState("standalone");
  const [selectedModules, setSelectedModules] = useState<string[]>(["social_communication"]);
  const [langBg, setLangBg] = useState<Record<string, string>>({ l1: "", l2: "", years_in_english: "", schooling_language: "", bilingual_home: "" });
  const [generalNotes, setGeneralNotes] = useState("");

  // Domain scoring state
  const [ratings, setRatings] = useState<Record<string, { score: number; confidence: string; evidence: string }>>({});

  // Language functions state
  const [functions, setFunctions] = useState<Record<string, { level: string; evidence: string; subject_context: string }>>({});

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "", subject: "", grade_level: "", teacher: "",
    task_type: "", date_completed: "", independent_completion: true,
    support_provided: "", student_selected: false, teacher_comments: "",
  });

  // ── Data queries ─────────────────────────────────────────────────────────────

  const { data: caseData } = useQuery({
    queryKey: ["case", caseId],
    queryFn: async () => {
      const r = await api(`/cases/${caseId}`);
      return r.ok ? r.json() : null;
    },
  });

  const { data: session, isLoading: sessionLoading } = useQuery<Session | null>({
    queryKey: ["raepa-session", caseId],
    queryFn: async () => {
      const r = await api(`/cases/${caseId}/raepa/session`);
      return r.ok ? r.json() : null;
    },
  });

  const { data: workSamples = [], isLoading: samplesLoading } = useQuery<WorkSample[]>({
    queryKey: ["raepa-samples", caseId],
    queryFn: async () => {
      const r = await api(`/cases/${caseId}/raepa/work-samples`);
      return r.ok ? r.json() : [];
    },
  });

  const { data: domainRatings = [], isLoading: ratingsLoading } = useQuery<DomainRating[]>({
    queryKey: ["raepa-ratings", caseId],
    queryFn: async () => {
      const r = await api(`/cases/${caseId}/raepa/domain-ratings`);
      return r.ok ? r.json() : [];
    },
  });

  const { data: langFunctions = [], isLoading: functionsLoading } = useQuery<LangFunction[]>({
    queryKey: ["raepa-functions", caseId],
    queryFn: async () => {
      const r = await api(`/cases/${caseId}/raepa/language-functions`);
      return r.ok ? r.json() : [];
    },
  });

  // ── Sync state from server ───────────────────────────────────────────────────

  useEffect(() => {
    if (session) {
      setPathway(session.pathway ?? "standalone");
      setSelectedModules(Array.isArray(session.modules_selected) ? session.modules_selected : ["social_communication"]);
      setLangBg(typeof session.language_background === "object" ? session.language_background : {});
      setGeneralNotes(session.general_notes ?? "");
    }
  }, [session]);

  useEffect(() => {
    const init: Record<string, { score: number; confidence: string; evidence: string }> = {};
    for (const r of domainRatings) {
      init[r.domain] = { score: r.score, confidence: r.confidence ?? "", evidence: r.evidence ?? "" };
    }
    setRatings(init);
  }, [domainRatings]);

  useEffect(() => {
    const init: Record<string, { level: string; evidence: string; subject_context: string }> = {};
    for (const f of langFunctions) {
      init[f.function_name] = { level: f.level, evidence: f.evidence ?? "", subject_context: f.subject_context ?? "" };
    }
    setFunctions(init);
  }, [langFunctions]);

  // ── Save session ─────────────────────────────────────────────────────────────

  const saveSession = useCallback(async () => {
    setSaving(true);
    try {
      const r = await api(`/cases/${caseId}/raepa/session`, {
        method: "POST",
        body: JSON.stringify({
          pathway, modules_selected: selectedModules,
          language_background: langBg, general_notes: generalNotes,
          status: session?.status ?? "setup",
        }),
      });
      if (!r.ok) throw new Error("Save failed");
      qc.invalidateQueries({ queryKey: ["raepa-session", caseId] });
      toast({ title: "Session saved" });
      setActiveTab("samples");
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [caseId, pathway, selectedModules, langBg, generalNotes, session, qc, toast]);

  // ── Save domain ratings ───────────────────────────────────────────────────────

  const saveRatings = useCallback(async () => {
    setSaving(true);
    try {
      const ratingsList = DOMAINS.map(d => ({
        domain: d,
        score: ratings[d]?.score ?? 0,
        confidence: ratings[d]?.confidence ?? "",
        evidence: ratings[d]?.evidence ?? "",
      }));
      const r = await api(`/cases/${caseId}/raepa/domain-ratings`, {
        method: "POST",
        body: JSON.stringify({ ratings: ratingsList }),
      });
      if (!r.ok) throw new Error("Save failed");
      qc.invalidateQueries({ queryKey: ["raepa-ratings", caseId] });
      toast({ title: "Domain ratings saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [caseId, ratings, qc, toast]);

  // ── Save language functions ───────────────────────────────────────────────────

  const saveFunctions = useCallback(async () => {
    setSaving(true);
    try {
      const fnList = LANGUAGE_FUNCTIONS.map(fn => ({
        function_name: fn,
        level: functions[fn]?.level ?? "not_assessed",
        evidence: functions[fn]?.evidence ?? "",
        subject_context: functions[fn]?.subject_context ?? "",
      }));
      const r = await api(`/cases/${caseId}/raepa/language-functions`, {
        method: "POST",
        body: JSON.stringify({ functions: fnList }),
      });
      if (!r.ok) throw new Error("Save failed");
      qc.invalidateQueries({ queryKey: ["raepa-functions", caseId] });
      toast({ title: "Language function profile saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [caseId, functions, qc, toast]);

  // ── Upload work sample ─────────────────────────────────────────────────────────

  const uploadSample = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", uploadForm.title || file.name);
      formData.append("subject", uploadForm.subject);
      formData.append("grade_level", uploadForm.grade_level);
      formData.append("teacher", uploadForm.teacher);
      formData.append("task_type", uploadForm.task_type);
      formData.append("date_completed", uploadForm.date_completed);
      formData.append("independent_completion", String(uploadForm.independent_completion));
      formData.append("support_provided", uploadForm.support_provided);
      formData.append("student_selected", String(uploadForm.student_selected));
      formData.append("teacher_comments", uploadForm.teacher_comments);
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/raepa/work-samples`, {
        method: "POST",
        credentials: "include",
        headers: authHeader(),
        body: formData,
      });
      if (!r.ok) throw new Error("Upload failed");
      qc.invalidateQueries({ queryKey: ["raepa-samples", caseId] });
      setUploadForm({ title: "", subject: "", grade_level: "", teacher: "", task_type: "", date_completed: "", independent_completion: true, support_provided: "", student_selected: false, teacher_comments: "" });
      toast({ title: "Work sample uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [caseId, uploadForm, qc, toast]);

  // ── Delete work sample ────────────────────────────────────────────────────────

  const deleteSample = useCallback(async (sampleId: string) => {
    if (!confirm("Delete this work sample?")) return;
    const r = await api(`/cases/${caseId}/raepa/work-samples/${sampleId}`, { method: "DELETE" });
    if (r.ok) {
      qc.invalidateQueries({ queryKey: ["raepa-samples", caseId] });
      toast({ title: "Work sample deleted" });
    }
  }, [caseId, qc, toast]);

  // ── AI analysis ───────────────────────────────────────────────────────────────

  const analyzeWithAI = useCallback(async (sampleId: string) => {
    const r = await api(`/cases/${caseId}/raepa/work-samples/${sampleId}/analyze`, { method: "POST" });
    if (r.ok) {
      toast({ title: "AI analysis started — refreshing shortly" });
      setTimeout(() => qc.invalidateQueries({ queryKey: ["raepa-samples", caseId] }), 4000);
    } else {
      toast({ title: "AI analysis failed", variant: "destructive" });
    }
  }, [caseId, qc, toast]);

  // ── Computed values ───────────────────────────────────────────────────────────

  const client = caseData?.client ?? caseData;
  const clientName = client ? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() : "Client";
  const clientAge = client?.dateOfBirth ? calcAge(client.dateOfBirth) : null;

  const savedRatings = domainRatings.map(r => ({ ...r, score: ratings[r.domain]?.score ?? r.score }));
  const profileAvg = DOMAINS.length ? DOMAINS.reduce((sum, d) => sum + (ratings[d]?.score ?? 0), 0) / DOMAINS.length : 0;

  const progressCounts = {
    total: DOMAINS.length,
    rated: DOMAINS.filter(d => d in ratings && ratings[d].score > 0).length,
  };

  const fnProgressCounts = {
    total: LANGUAGE_FUNCTIONS.length,
    assessed: LANGUAGE_FUNCTIONS.filter(fn => functions[fn]?.level && functions[fn].level !== "not_assessed").length,
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Case
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                AE
              </div>
              <div>
                <h1 className="text-lg font-semibold">RAEPA — Academic English Performance Assessment</h1>
                <p className="text-sm text-slate-400">
                  {clientName}{clientAge ? `, ${clientAge} years old` : ""}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session?.status && (
              <Badge className={`capitalize ${session.status === "report" ? "bg-emerald-900 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                {session.status}
              </Badge>
            )}
            <Badge className="bg-indigo-900 text-indigo-300 font-mono text-xs">
              {pathway === "comprehensive" ? "Add-on" : "Standalone"}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 pb-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === "scoring" && progressCounts.rated > 0 && (
                    <span className="ml-1 text-xs bg-indigo-900 text-indigo-300 rounded px-1.5 py-0.5">
                      {progressCounts.rated}/{progressCounts.total}
                    </span>
                  )}
                  {tab.id === "functions" && fnProgressCounts.assessed > 0 && (
                    <span className="ml-1 text-xs bg-purple-900 text-purple-300 rounded px-1.5 py-0.5">
                      {fnProgressCounts.assessed}/{fnProgressCounts.total}
                    </span>
                  )}
                  {tab.id === "samples" && workSamples.length > 0 && (
                    <span className="ml-1 text-xs bg-slate-700 text-slate-300 rounded px-1.5 py-0.5">
                      {workSamples.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* ── SETUP TAB ─────────────────────────────────────────────── */}
        {activeTab === "setup" && (
          <div className="space-y-6">
            {/* Pathway */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-base font-semibold text-slate-100 mb-4">Assessment Pathway</h2>
              <div className="grid grid-cols-2 gap-3">
                {PATHWAYS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPathway(p.value)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      pathway === p.value
                        ? "border-indigo-500 bg-indigo-950"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="font-medium text-sm mb-1">{p.label}</div>
                    <div className="text-xs text-slate-400">{p.desc}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Language Background */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-base font-semibold text-slate-100 mb-4">Language Background</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">First Language (L1)</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={langBg.l1 ?? ""}
                    onChange={e => setLangBg(prev => ({ ...prev, l1: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Second Language (L2)</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={langBg.l2 ?? ""}
                    onChange={e => setLangBg(prev => ({ ...prev, l2: e.target.value }))}
                  >
                    <option value="">— Select or N/A —</option>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Years of English-medium schooling</label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    placeholder="e.g. 3 years"
                    value={langBg.years_in_english ?? ""}
                    onChange={e => setLangBg(prev => ({ ...prev, years_in_english: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Primary language of schooling</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={langBg.schooling_language ?? ""}
                    onChange={e => setLangBg(prev => ({ ...prev, schooling_language: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Bilingual / multilingual home environment</label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    placeholder="Describe language use at home"
                    value={langBg.bilingual_home ?? ""}
                    onChange={e => setLangBg(prev => ({ ...prev, bilingual_home: e.target.value }))}
                  />
                </div>
              </div>
            </section>

            {/* Module Selection */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-base font-semibold text-slate-100 mb-1">Module Selection</h2>
              <p className="text-xs text-slate-400 mb-4">Module 1 is always administered. Select additional modules based on referral reason and time available.</p>
              <div className="space-y-2">
                {MODULES.map(mod => {
                  const selected = selectedModules.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selected
                          ? "border-indigo-600 bg-indigo-950"
                          : mod.required
                          ? "border-slate-600 bg-slate-800 cursor-not-allowed opacity-70"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                      onClick={() => {
                        if (mod.required) return;
                        setSelectedModules(prev =>
                          prev.includes(mod.id) ? prev.filter(m => m !== mod.id) : [...prev, mod.id]
                        );
                      }}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selected ? "bg-indigo-500 border-indigo-500" : "border-slate-500"
                      }`}>
                        {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{mod.name}</span>
                          {mod.required && <Badge className="bg-indigo-900 text-indigo-300 text-xs">Required</Badge>}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Domains: {mod.domains.join(" · ")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* General Notes */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-base font-semibold text-slate-100 mb-3">Session Notes</h2>
              <Textarea
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 min-h-[100px]"
                placeholder="General assessment notes, referral reason, relevant background…"
                value={generalNotes}
                onChange={e => setGeneralNotes(e.target.value)}
              />
            </section>

            <div className="flex justify-end">
              <Button onClick={saveSession} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Setup
              </Button>
            </div>
          </div>
        )}

        {/* ── WORK SAMPLES TAB ──────────────────────────────────────── */}
        {activeTab === "samples" && (
          <div className="space-y-6">
            {/* Upload area */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-base font-semibold text-slate-100 mb-4">Upload Work Sample</h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Title / Description</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    placeholder="e.g. Science lab report"
                    value={uploadForm.title}
                    onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Subject</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={uploadForm.subject}
                    onChange={e => setUploadForm(p => ({ ...p, subject: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Grade Level</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={uploadForm.grade_level}
                    onChange={e => setUploadForm(p => ({ ...p, grade_level: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Teacher</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    placeholder="Teacher name"
                    value={uploadForm.teacher}
                    onChange={e => setUploadForm(p => ({ ...p, teacher: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Task Type</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    placeholder="e.g. written explanation"
                    value={uploadForm.task_type}
                    onChange={e => setUploadForm(p => ({ ...p, task_type: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date Completed</label>
                  <input
                    type="date"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={uploadForm.date_completed}
                    onChange={e => setUploadForm(p => ({ ...p, date_completed: e.target.value }))}
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-slate-400 mb-1">Teacher Comments / Marking Notes</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    placeholder="Optional — any teacher marking or notes on this work"
                    value={uploadForm.teacher_comments}
                    onChange={e => setUploadForm(p => ({ ...p, teacher_comments: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-4 col-span-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-600"
                      checked={uploadForm.independent_completion}
                      onChange={e => setUploadForm(p => ({ ...p, independent_completion: e.target.checked }))}
                    />
                    <span className="text-sm text-slate-300">Completed independently</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-600"
                      checked={uploadForm.student_selected}
                      onChange={e => setUploadForm(p => ({ ...p, student_selected: e.target.checked }))}
                    />
                    <span className="text-sm text-slate-300">Student self-selected</span>
                  </label>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
                onChange={e => { if (e.target.files?.[0]) uploadSample(e.target.files[0]); }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? "Uploading…" : "Choose File & Upload"}
              </Button>
              <p className="text-xs text-slate-500 mt-2">Accepts PDF, JPEG, PNG, DOCX — max 30 MB</p>
            </section>

            {/* Work samples list */}
            {samplesLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : workSamples.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No work samples uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workSamples.map(sample => (
                  <div key={sample.id} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-sm">{sample.title || sample.file_name || "Untitled"}</span>
                          {sample.subject && <Badge className="bg-slate-700 text-slate-300 text-xs">{sample.subject}</Badge>}
                          {sample.grade_level && <Badge className="bg-slate-700 text-slate-300 text-xs">{sample.grade_level}</Badge>}
                          {sample.student_selected && <Badge className="bg-blue-900 text-blue-300 text-xs">Student-selected</Badge>}
                          {sample.assessor_approved && <Badge className="bg-emerald-900 text-emerald-300 text-xs">Approved</Badge>}
                        </div>
                        <div className="text-xs text-slate-400 space-x-3">
                          {sample.teacher && <span>Teacher: {sample.teacher}</span>}
                          {sample.date_completed && <span>Date: {sample.date_completed.split("T")[0]}</span>}
                          {sample.task_type && <span>Type: {sample.task_type}</span>}
                          <span>{sample.independent_completion ? "✓ Independent" : "⚠ Supported"}</span>
                        </div>

                        {/* AI Analysis */}
                        {sample.ai_analysis_status === "complete" && sample.ai_analysis && (
                          <div className="mt-3 bg-slate-800 rounded-lg p-3 text-xs space-y-1.5">
                            <div className="flex items-center gap-1.5 font-medium text-indigo-400 mb-2">
                              <Sparkles className="w-3.5 h-3.5" /> AI Analysis
                            </div>
                            {sample.ai_analysis.task_type && (
                              <div><span className="text-slate-400">Task type:</span> {sample.ai_analysis.task_type}</div>
                            )}
                            {sample.ai_analysis.reading_demand && (
                              <div><span className="text-slate-400">Reading demand:</span> {sample.ai_analysis.reading_demand} &nbsp;|&nbsp; <span className="text-slate-400">Writing demand:</span> {sample.ai_analysis.writing_demand}</div>
                            )}
                            {sample.ai_analysis.academic_vocabulary?.length > 0 && (
                              <div><span className="text-slate-400">Academic vocab:</span> {sample.ai_analysis.academic_vocabulary.slice(0,8).join(", ")}</div>
                            )}
                            {sample.ai_analysis.command_words?.length > 0 && (
                              <div><span className="text-slate-400">Command words:</span> {sample.ai_analysis.command_words.join(", ")}</div>
                            )}
                            {sample.ai_analysis.language_functions_required?.length > 0 && (
                              <div><span className="text-slate-400">Language functions:</span> {sample.ai_analysis.language_functions_required.join(", ")}</div>
                            )}
                            {sample.ai_analysis.potential_barriers?.length > 0 && (
                              <div className="text-orange-400">
                                <span className="text-slate-400">Potential barriers:</span> {sample.ai_analysis.potential_barriers.join(" · ")}
                              </div>
                            )}
                          </div>
                        )}
                        {sample.ai_analysis_status === "processing" && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-indigo-400">
                            <Loader2 className="w-3 h-3 animate-spin" /> Analysing…
                          </div>
                        )}
                        {sample.ai_analysis_status === "error" && (
                          <div className="mt-2 text-xs text-red-400">AI analysis failed — try again</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {sample.file_url && (
                          <a href={sample.file_url} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        {sample.ai_analysis_status !== "processing" && (
                          <Button
                            variant="ghost" size="sm"
                            className="text-indigo-400 hover:text-indigo-200"
                            onClick={() => analyzeWithAI(sample.id)}
                          >
                            <Sparkles className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="sm"
                          className="text-red-400 hover:text-red-200"
                          onClick={() => deleteSample(sample.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DOMAIN SCORING TAB ────────────────────────────────────── */}
        {activeTab === "scoring" && (
          <div className="space-y-4">
            {/* Profile overview */}
            {progressCounts.rated > 0 && (
              <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-4 flex items-center gap-4">
                <BarChart3 className="w-8 h-8 text-indigo-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-indigo-300">Overall Academic English Profile</div>
                  <div className="text-lg font-bold text-white">{profileCategory(profileAvg)} <span className="text-sm font-normal text-indigo-400">({profileAvg.toFixed(1)}/4.0)</span></div>
                </div>
                <div className="text-xs text-indigo-400">{progressCounts.rated}/{progressCounts.total} domains rated</div>
              </div>
            )}

            <p className="text-xs text-slate-400 mb-2">
              Rate each domain using the 5-point academic English performance scale: <span className="font-medium">0</span> Not Demonstrated · <span className="font-medium">1</span> Emerging · <span className="font-medium">2</span> Developing · <span className="font-medium">3</span> Functional · <span className="font-medium">4</span> Independent
            </p>

            <div className="space-y-3">
              {DOMAINS.map((domain, idx) => {
                const current = ratings[domain] ?? { score: 0, confidence: "", evidence: "" };
                const scoreInfo = SCORE_LABELS[current.score];
                return (
                  <div key={domain} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm mb-3">{domain}</div>

                        {/* Score buttons */}
                        <div className="flex gap-2 flex-wrap mb-3">
                          {[0, 1, 2, 3, 4].map(s => {
                            const info = SCORE_LABELS[s];
                            const active = current.score === s;
                            return (
                              <button
                                key={s}
                                onClick={() => setRatings(prev => ({
                                  ...prev,
                                  [domain]: { ...prev[domain] ?? { confidence: "", evidence: "" }, score: s },
                                }))}
                                className={`flex flex-col items-center px-3 py-2 rounded-lg border-2 text-xs transition-all ${
                                  active
                                    ? `${info.bg} ${info.color} border-current font-semibold`
                                    : "border-slate-700 text-slate-500 hover:border-slate-500"
                                }`}
                              >
                                <span className="text-base font-bold">{s}</span>
                                <span className="text-xs leading-tight">{info.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Evidence & confidence */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Evidence / Observation</label>
                            <input
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                              placeholder="Brief evidence note…"
                              value={current.evidence}
                              onChange={e => setRatings(prev => ({
                                ...prev,
                                [domain]: { ...prev[domain] ?? { score: 0, confidence: "" }, evidence: e.target.value },
                              }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Confidence</label>
                            <select
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                              value={current.confidence}
                              onChange={e => setRatings(prev => ({
                                ...prev,
                                [domain]: { ...prev[domain] ?? { score: 0, evidence: "" }, confidence: e.target.value },
                              }))}
                            >
                              <option value="">— Select —</option>
                              <option value="high">High — clear and consistent evidence</option>
                              <option value="moderate">Moderate — adequate evidence</option>
                              <option value="preliminary">Preliminary — limited evidence</option>
                              <option value="insufficient">Insufficient — not enough evidence</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={saveRatings} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Domain Ratings
              </Button>
            </div>
          </div>
        )}

        {/* ── LANGUAGE FUNCTIONS TAB ──────────────────────────────────── */}
        {activeTab === "functions" && (
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h2 className="text-base font-semibold mb-1">Language Function Profile</h2>
              <p className="text-xs text-slate-400 mb-5">
                Assess the student's ability to use each of the 15 academic language functions. Rate based on evidence observed during the assessment session and from work sample analysis.
              </p>
              <div className="space-y-4">
                {LANGUAGE_FUNCTIONS.map((fn, idx) => {
                  const current = functions[fn] ?? { level: "not_assessed", evidence: "", subject_context: "" };
                  const levelInfo = FUNCTION_LEVELS[current.level] ?? FUNCTION_LEVELS.not_assessed;
                  return (
                    <div key={fn} className="border border-slate-800 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-6 h-6 rounded-full bg-purple-900 flex items-center justify-center text-purple-300 text-xs font-bold">{idx + 1}</span>
                        <span className="font-medium text-sm capitalize">{fn}</span>
                        <span className={`ml-auto text-xs font-medium ${levelInfo.color}`}>{levelInfo.label}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Level</label>
                          <select
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-purple-500 outline-none"
                            value={current.level}
                            onChange={e => setFunctions(prev => ({
                              ...prev,
                              [fn]: { ...prev[fn] ?? { evidence: "", subject_context: "" }, level: e.target.value },
                            }))}
                          >
                            {Object.entries(FUNCTION_LEVELS).map(([val, info]) => (
                              <option key={val} value={val}>{info.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Subject Context</label>
                          <input
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-purple-500 outline-none"
                            placeholder="Subject area…"
                            value={current.subject_context}
                            onChange={e => setFunctions(prev => ({
                              ...prev,
                              [fn]: { ...prev[fn] ?? { level: "not_assessed", evidence: "" }, subject_context: e.target.value },
                            }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Evidence</label>
                          <input
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-purple-500 outline-none"
                            placeholder="Evidence note…"
                            value={current.evidence}
                            onChange={e => setFunctions(prev => ({
                              ...prev,
                              [fn]: { ...prev[fn] ?? { level: "not_assessed", subject_context: "" }, evidence: e.target.value },
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveFunctions} disabled={saving} className="bg-purple-700 hover:bg-purple-600">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Language Function Profile
              </Button>
            </div>
          </div>
        )}

        {/* ── REPORT TAB ────────────────────────────────────────────── */}
        {activeTab === "report" && (
          <div className="space-y-6">
            {/* Readiness check */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-base font-semibold mb-4">Assessment Readiness</h2>
              <div className="space-y-3">
                {[
                  { label: "Session setup complete", done: !!session, tip: "Complete the Setup tab" },
                  { label: "Work samples uploaded", done: workSamples.length > 0, tip: "Upload at least one work sample" },
                  { label: "Domain ratings complete", done: progressCounts.rated === progressCounts.total, tip: `${progressCounts.rated}/${progressCounts.total} domains rated` },
                  { label: "Language function profile", done: fnProgressCounts.assessed > 0, tip: `${fnProgressCounts.assessed}/${fnProgressCounts.total} functions assessed` },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    {item.done
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      : <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    }
                    <div>
                      <div className={`text-sm ${item.done ? "text-emerald-300" : "text-slate-300"}`}>{item.label}</div>
                      {!item.done && <div className="text-xs text-slate-500">{item.tip}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Domain score summary */}
            {progressCounts.rated > 0 && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h2 className="text-base font-semibold mb-4">Domain Score Summary</h2>
                <div className="grid grid-cols-2 gap-2">
                  {DOMAINS.map(domain => {
                    const score = ratings[domain]?.score ?? 0;
                    const info = SCORE_LABELS[score];
                    const pct = (score / 4) * 100;
                    return (
                      <div key={domain} className="flex items-center gap-2">
                        <div className="text-xs text-slate-400 w-44 truncate">{domain}</div>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              score >= 4 ? "bg-emerald-500" :
                              score >= 3 ? "bg-blue-500" :
                              score >= 2 ? "bg-amber-500" :
                              score >= 1 ? "bg-orange-500" : "bg-red-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className={`text-xs font-bold w-4 ${info.color}`}>{score}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Language function summary */}
            {fnProgressCounts.assessed > 0 && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h2 className="text-base font-semibold mb-4">Language Function Profile Summary</h2>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_FUNCTIONS.map(fn => {
                    const level = functions[fn]?.level ?? "not_assessed";
                    const info = FUNCTION_LEVELS[level];
                    return (
                      <div key={fn} className="flex items-center gap-1.5 bg-slate-800 rounded-full px-3 py-1">
                        <span className="text-xs text-slate-300 capitalize">{fn}</span>
                        <span className={`text-xs font-medium ${info.color}`}>— {info.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
              <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-3 opacity-70" />
              <p className="text-sm text-slate-400 mb-1">AI-generated narrative report</p>
              <p className="text-xs text-slate-500 mb-4">Complete domain scoring and language function profile first. AI report generation will be available in the next phase.</p>
              <Button disabled className="bg-indigo-600 hover:bg-indigo-700 opacity-50 cursor-not-allowed">
                <Sparkles className="w-4 h-4 mr-2" /> Generate RAEPA Report
              </Button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
