import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetCurrentUser, useListCases } from "@workspace/api-client-react";
import { GraduationCap, ClipboardList, ChevronRight, BookOpen, ShieldCheck, Eye } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function authHeaders() {
  const token = localStorage.getItem("raos_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

interface ApprenticeCaseSummary {
  assignmentId: string;
  caseId: string;
  assignedAt: string;
  caseLabel: string;
  phase: string | null;
  status: string | null;
  productIds: string[];
}

const PHASE_LABELS: Record<string, string> = {
  pre_commitment: "Pre-commitment",
  assessment: "Assessment",
  scoring: "Scoring",
  report: "Report",
  debrief: "Debrief",
  closed: "Closed",
};

export default function ApprenticeDashboard() {
  const { data: user } = useGetCurrentUser();

  const { data: cases, isLoading } = useQuery<ApprenticeCaseSummary[]>({
    queryKey: ["apprentice-cases"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/apprentice/cases`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load assigned cases");
      return res.json();
    },
  });

  // In addition to explicitly-assigned learning cases above, apprentices get
  // full read-only parity on every live case — surface that count/link here
  // too so the dashboard doesn't understate what they can already see via
  // the "Cases" sidebar link.
  const { data: allCases, isLoading: isLoadingAllCases } = useListCases();
  const liveCasesCount = allCases?.filter(c => c.caseMode === "live").length ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
          <GraduationCap size={22} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name?.split(" ")[0] ?? "Apprentice"}</h1>
          <p className="text-slate-500 mt-0.5">Your assigned learning cases and training progress.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/apprentice/resources" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition-all flex items-center gap-3">
          <BookOpen size={18} className="text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Training Resources</p>
            <p className="text-xs text-slate-400">Guides & references</p>
          </div>
        </Link>
        <Link href="/apprentice/competencies" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition-all flex items-center gap-3">
          <ShieldCheck size={18} className="text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-slate-800">My Competencies</p>
            <p className="text-xs text-slate-400">Track your growth</p>
          </div>
        </Link>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <ClipboardList size={18} className="text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-slate-800">{cases?.length ?? 0} Assigned Cases</p>
            <p className="text-xs text-slate-400">Read-only, for learning</p>
          </div>
        </div>
        <Link href="/cases" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition-all flex items-center gap-3">
          <Eye size={18} className="text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-slate-800">{isLoadingAllCases ? "…" : liveCasesCount} Live Cases</p>
            <p className="text-xs text-slate-400">Read-only, for reference</p>
          </div>
        </Link>
      </div>

      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">My Learning Cases</h2>
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-7 h-7 border-4 border-amber-500 border-t-transparent rounded-full" />
          </div>
        )}
        {!isLoading && (cases?.length ?? 0) === 0 && (
          <div className="text-center py-14 bg-white border border-dashed border-slate-200 rounded-xl">
            <GraduationCap size={30} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm font-medium">No cases assigned yet</p>
            <p className="text-slate-400 text-xs mt-1">Your mentor will assign learning cases as they become available.</p>
          </div>
        )}
        {!isLoading && (cases?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {cases!.map((c) => (
              <Link
                key={c.assignmentId}
                href={`/cases/${c.caseId}`}
                className="flex items-center gap-4 py-4 px-5 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 flex-shrink-0">
                  {c.caseLabel}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">Case {c.caseLabel}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.phase ? PHASE_LABELS[c.phase] ?? c.phase : "Phase unknown"}
                    {c.status ? ` · ${c.status}` : ""}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
