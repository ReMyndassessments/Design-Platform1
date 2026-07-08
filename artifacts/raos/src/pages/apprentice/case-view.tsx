import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, FileText, ClipboardList, BarChart3, NotebookPen, MessageSquareQuote, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function authHeaders() {
  const token = localStorage.getItem("raos_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

interface CaseBundle {
  caseOverview: {
    id: string;
    caseLabel: string;
    grade: string | null;
    currentPhase: string;
    caseStatus: string;
    productIds: string[];
    debriefMeetingDate: string | null;
  };
  battery: Array<{ id: string; toolId: string; toolName: string; respondentLabel: string; status: string; dueDate: string | null; submittedAt: string | null }>;
  scoringSummary: Array<{ toolId: string; toolName: string; respondentType: string; domainScores: Record<string, number>; hasHighDiscrepancy: boolean }>;
}

interface ReflectionNote {
  id: string;
  noteText: string;
  visibility: "private_to_apprentice" | "visible_to_mentor";
  createdAt: string;
}

interface MentorFeedback {
  id: string;
  feedbackText: string;
  competencyArea: string | null;
  createdAt: string;
}

type TabKey = "overview" | "battery" | "scoring" | "reflections" | "feedback";

export default function ApprenticeCaseView() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabKey>("overview");
  const { toast } = useToast();
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState("");

  const { data: bundle, isLoading, error } = useQuery<CaseBundle>({
    queryKey: ["apprentice-case", id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/apprentice/cases/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(res.status === 403 ? "You are not assigned to this case" : "Failed to load case");
      return res.json();
    },
  });

  const { data: notes } = useQuery<ReflectionNote[]>({
    queryKey: ["apprentice-notes", id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/cases/${id}/apprentice-notes`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!bundle,
  });

  const { data: feedback } = useQuery<MentorFeedback[]>({
    queryKey: ["apprentice-feedback", id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/cases/${id}/apprentice-feedback`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!bundle,
  });

  const addNoteMut = useMutation({
    mutationFn: async (payload: { noteText: string; visibility: string }) => {
      const res = await fetch(`${BASE_URL}/api/cases/${id}/apprentice-notes`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save note");
      return res.json();
    },
    onSuccess: () => {
      setNoteText("");
      qc.invalidateQueries({ queryKey: ["apprentice-notes", id] });
      toast({ title: "Reflection saved" });
    },
    onError: () => toast({ title: "Could not save reflection", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <Lock size={32} className="mx-auto text-red-400 mb-3" />
        <p className="text-slate-600 font-medium">{(error as Error)?.message ?? "Case not found"}</p>
        <Link href="/apprentice/dashboard" className="text-amber-600 text-sm mt-3 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: typeof FileText }[] = [
    { key: "overview", label: "Overview", icon: FileText },
    { key: "battery", label: "Battery", icon: ClipboardList },
    { key: "scoring", label: "Scoring Summary", icon: BarChart3 },
    { key: "reflections", label: "My Reflections", icon: NotebookPen },
    { key: "feedback", label: "Mentor Feedback", icon: MessageSquareQuote },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/apprentice/dashboard" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5 w-fit">
        <ArrowLeft size={14} /> Back to my cases
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">
          {bundle.caseOverview.caseLabel}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Case {bundle.caseOverview.caseLabel}</h1>
          <p className="text-xs text-slate-500">Read-only learning view · {bundle.caseOverview.caseStatus}</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key ? "border-amber-500 text-amber-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-400 text-xs uppercase tracking-wide">Phase</p><p className="font-medium text-slate-800 capitalize">{bundle.caseOverview.currentPhase.replace(/_/g, " ")}</p></div>
            <div><p className="text-slate-400 text-xs uppercase tracking-wide">Grade</p><p className="font-medium text-slate-800">{bundle.caseOverview.grade ?? "—"}</p></div>
            <div><p className="text-slate-400 text-xs uppercase tracking-wide">Products</p><p className="font-medium text-slate-800">{bundle.caseOverview.productIds.join(", ") || "—"}</p></div>
            <div><p className="text-slate-400 text-xs uppercase tracking-wide">Debrief Date</p><p className="font-medium text-slate-800">{bundle.caseOverview.debriefMeetingDate ?? "Not scheduled"}</p></div>
          </div>
          <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
            Identifying student details are hidden in this training view to protect confidentiality.
          </p>
        </div>
      )}

      {tab === "battery" && (
        <div className="space-y-2">
          {bundle.battery.length === 0 && <p className="text-sm text-slate-400 text-center py-10">No assessment tools assigned yet.</p>}
          {bundle.battery.map((a) => (
            <div key={a.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">{a.toolName}</p>
                <p className="text-xs text-slate-500">{a.respondentLabel}</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">{a.status.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "scoring" && (
        <div className="space-y-3">
          {bundle.scoringSummary.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Scores not yet available for this case.</p>}
          {bundle.scoringSummary.map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-800">{s.toolName} <span className="text-xs font-normal text-slate-400">({s.respondentType})</span></p>
                {s.hasHighDiscrepancy && <span className="text-xs text-amber-600 font-medium">High discrepancy</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(s.domainScores).map(([domain, score]) => (
                  <span key={domain} className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600">
                    {domain}: <span className="font-semibold text-slate-800">{score}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "reflections" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <label className="text-sm font-semibold text-slate-700">Add a reflection note</label>
            <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={4} placeholder="What did you observe or learn from this case?" />
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!noteText.trim() || addNoteMut.isPending}
                onClick={() => addNoteMut.mutate({ noteText: noteText.trim(), visibility: "visible_to_mentor" })}
                className="gap-1.5"
              >
                <Send size={13} /> {addNoteMut.isPending ? "Saving..." : "Share with mentor"}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {(notes ?? []).length === 0 && <p className="text-sm text-slate-400 text-center py-6">No reflections yet.</p>}
            {(notes ?? []).map((n) => (
              <div key={n.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{n.noteText}</p>
                <p className="text-xs text-slate-400 mt-2">{new Date(n.createdAt).toLocaleString()} · {n.visibility === "visible_to_mentor" ? "Shared with mentor" : "Private"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "feedback" && (
        <div className="space-y-2">
          {(feedback ?? []).length === 0 && <p className="text-sm text-slate-400 text-center py-10">No mentor feedback for this case yet.</p>}
          {(feedback ?? []).map((f) => (
            <div key={f.id} className="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
              {f.competencyArea && <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">{f.competencyArea}</p>}
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{f.feedbackText}</p>
              <p className="text-xs text-slate-400 mt-2">{new Date(f.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
