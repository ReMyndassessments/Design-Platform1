import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetCurrentUser, customFetch } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type LscSub = {
  subscriptionStatus: string;
  monthlyUsage: number;
  monthlyAllowance: number;
  trialUsedAt: string | null;
};

type Case = {
  id: string;
  studentName: string;
  currentPhase: string;
  parentEmail: string | null;
};

const PHASE_LABELS: Record<string, string> = {
  pre_commitment: "Pre-commitment",
  intake: "Intake",
  assessment: "Assessment",
  scoring: "Scoring",
  report: "Report",
  final_review: "Final Review",
  debrief: "Debrief",
  complete: "Complete",
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  trial_available:      { label: "Trial available",   bg: "bg-amber-100",  text: "text-amber-800"  },
  trial_used:           { label: "Trial used",        bg: "bg-red-100",    text: "text-red-700"    },
  active_monthly:       { label: "Active — monthly",  bg: "bg-emerald-100",text: "text-emerald-800"},
  active_annual:        { label: "Active — annual",   bg: "bg-emerald-100",text: "text-emerald-800"},
  complimentary:        { label: "Complimentary",     bg: "bg-violet-100", text: "text-violet-800" },
  administrator_override:{ label: "Admin override",   bg: "bg-emerald-100",text: "text-emerald-800"},
};

const ACTIVE = ["active_monthly", "active_annual", "complimentary", "administrator_override"];
const VALID_PHASES = ["scoring", "report", "final_review", "debrief", "complete"];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "bg-slate-100", text: "text-slate-700" };
  return (
    <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap", cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  );
}

function CaseRow({ c, onUpdated }: { c: Case; onUpdated: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [sub, setSub] = useState<LscSub | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    customFetch<LscSub>(`/api/cases/${c.id}/lsc/subscription`)
      .then(d => setSub(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [c.id]);

  const update = async (status?: string, resetUsage?: boolean) => {
    setSaving(true);
    try {
      const updated = await customFetch<LscSub>(`/api/cases/${c.id}/lsc/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionStatus: status, resetUsage }),
      });
      setSub(updated);
      toast({ title: "Subscription updated" });
      onUpdated();
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 px-5 border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors group">
      {/* Student info */}
      <div className="flex-1 min-w-0">
        <button
          className="text-sm font-semibold text-slate-800 hover:text-violet-700 transition-colors flex items-center gap-1 group/link"
          onClick={() => setLocation(`/cases/${c.id}`)}
        >
          {c.studentName}
          <ChevronRight size={13} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
        </button>
        <p className="text-xs text-slate-400 mt-0.5">
          {PHASE_LABELS[c.currentPhase] ?? c.currentPhase}
          {c.parentEmail && <> · {c.parentEmail}</>}
        </p>
      </div>

      {/* Status */}
      <div className="shrink-0 w-36 flex justify-start sm:justify-center">
        {loading
          ? <span className="text-xs text-slate-400 animate-pulse">Loading…</span>
          : sub
            ? <StatusBadge status={sub.subscriptionStatus} />
            : <span className="text-xs text-slate-400">—</span>
        }
      </div>

      {/* Usage */}
      <div className="shrink-0 w-28 text-xs text-slate-500 text-right hidden lg:block">
        {sub && ACTIVE.includes(sub.subscriptionStatus)
          ? `${sub.monthlyUsage} / ${sub.monthlyAllowance} used`
          : sub?.subscriptionStatus === "trial_available" ? "Trial pending" : ""}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex flex-wrap gap-1.5 sm:justify-end">
        {!sub || loading ? null : <>
          {/* Activate */}
          {!ACTIVE.includes(sub.subscriptionStatus) && (
            <>
              <Button size="sm" variant="outline" className="text-xs h-7 px-2.5" disabled={saving}
                onClick={() => update("administrator_override")}>
                Activate
              </Button>
              {sub.subscriptionStatus === "trial_used" && (
                <Button size="sm" variant="outline" className="text-xs h-7 px-2.5" disabled={saving}
                  onClick={() => update("trial_available", true)}>
                  Restore Trial
                </Button>
              )}
            </>
          )}

          {/* Active controls */}
          {ACTIVE.includes(sub.subscriptionStatus) && (
            <>
              <Button size="sm" variant="outline" className="text-xs h-7 px-2.5" disabled={saving || sub.monthlyUsage === 0}
                onClick={() => update(undefined, true)}>
                Reset Usage
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7 px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50" disabled={saving}
                onClick={() => update("trial_used")}>
                Revoke
              </Button>
            </>
          )}
        </>}
      </div>
    </div>
  );
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "trial_available", label: "Trial available" },
  { value: "trial_used", label: "Trial used" },
  { value: "active", label: "Active" },
];

export default function SubscriptionsPage() {
  const { data: user } = useGetCurrentUser();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subs, setSubs] = useState<Record<string, LscSub>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: cases = [], isLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases", refreshKey],
    queryFn: () => customFetch<Case[]>("/api/cases"),
    enabled: !!user,
  });

  // Only show cases that have reached scoring or beyond (LSC-eligible)
  const eligibleCases = cases.filter(c => VALID_PHASES.includes(c.currentPhase));

  const filtered = eligibleCases.filter(c => {
    const matchesSearch = !search || c.studentName.toLowerCase().includes(search.toLowerCase()) ||
      (c.parentEmail ?? "").toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    const sub = subs[c.id];
    if (!sub) return statusFilter === "trial_available"; // default state
    if (statusFilter === "active") return ACTIVE.includes(sub.subscriptionStatus);
    return sub.subscriptionStatus === statusFilter;
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Admin access required.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <Sparkles size={18} className="text-violet-600" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Subscriptions</h1>
          </div>
          <p className="text-sm text-slate-500">
            Manage Learning Support Coach access for all cases. Only cases in Scoring phase or later appear here.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0 mt-1"
          onClick={() => setRefreshKey(k => k + 1)}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by student or parent email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-md transition-all",
                statusFilter === f.value
                  ? "bg-white shadow-sm text-slate-800"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Column headers */}
        <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <div className="flex-1">Student</div>
          <div className="w-36 text-center">Status</div>
          <div className="w-28 text-right hidden lg:block">Usage</div>
          <div className="shrink-0 w-44 text-right">Actions</div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400 animate-pulse">Loading cases…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            {eligibleCases.length === 0
              ? "No cases have reached Scoring phase yet."
              : "No cases match your search or filter."}
          </div>
        ) : (
          filtered.map(c => (
            <CaseRow
              key={c.id}
              c={c}
              onUpdated={() => setRefreshKey(k => k + 1)}
            />
          ))
        )}
      </div>

      {eligibleCases.length > 0 && (
        <p className="text-xs text-slate-400 text-center">
          Showing {filtered.length} of {eligibleCases.length} eligible cases
        </p>
      )}
    </div>
  );
}
