import { useQuery } from "@tanstack/react-query";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { ShieldCheck } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function authHeaders() {
  const token = localStorage.getItem("raos_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

type CompetencyStatus = "not_started" | "observing" | "guided_practice" | "competent";

interface Competency {
  id: string | null;
  apprenticeUserId: string;
  competencyKey: string;
  competencyLabel: string;
  status: CompetencyStatus;
  mentorUserId: string | null;
  updatedAt: string | null;
  mentorNotes: string | null;
}

const STATUS_META: Record<CompetencyStatus, { label: string; pct: number; color: string }> = {
  not_started: { label: "Not started", pct: 5, color: "bg-slate-300" },
  observing: { label: "Observing", pct: 35, color: "bg-amber-400" },
  guided_practice: { label: "Guided practice", pct: 70, color: "bg-blue-400" },
  competent: { label: "Competent", pct: 100, color: "bg-emerald-500" },
};

export default function ApprenticeCompetenciesPage() {
  const { data: user } = useGetCurrentUser();

  const { data: competencies, isLoading } = useQuery<Competency[]>({
    queryKey: ["apprentice-competencies", user?.id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/apprentices/${user!.id}/competencies`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load competencies");
      return res.json();
    },
    enabled: !!user?.id,
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
          <ShieldCheck size={22} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Competencies</h1>
          <p className="text-slate-500 mt-0.5">Progress tracked by your mentor across core clinical skills.</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-7 h-7 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      )}

      {!isLoading && (competencies?.length ?? 0) === 0 && (
        <div className="text-center py-14 bg-white border border-dashed border-slate-200 rounded-xl">
          <ShieldCheck size={30} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm font-medium">No competency tracking yet</p>
          <p className="text-slate-400 text-xs mt-1">Your mentor will set up competency tracking as your training begins.</p>
        </div>
      )}

      {!isLoading && (competencies?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {competencies!.map((c) => {
            const meta = STATUS_META[c.status];
            return (
              <div key={c.competencyKey} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-800">{c.competencyLabel}</p>
                  <span className="text-xs font-medium text-slate-500">{meta.label}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${meta.color} rounded-full transition-all`} style={{ width: `${meta.pct}%` }} />
                </div>
                {c.mentorNotes && <p className="text-xs text-slate-500 mt-2">{c.mentorNotes}</p>}
                {c.updatedAt && <p className="text-[11px] text-slate-400 mt-1.5">Last updated {new Date(c.updatedAt).toLocaleDateString()}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
