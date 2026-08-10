import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import {
  Shield, Database, Building2, Globe, Users, Activity,
  Bot, FileText, AlertTriangle, ChevronDown, ChevronRight,
  CheckCircle2, Clock, XCircle, HelpCircle, Info, RefreshCw,
  Lock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type RiskLevel = "critical" | "high" | "medium" | "low" | "unknown";
type ReviewLabel = "reviewed_appropriate" | "review_required" | "removal_recommended" | "role_clarification_required" | null;

const RISK_COLORS: Record<RiskLevel, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-green-100 text-green-700 border-green-200",
  unknown: "bg-slate-100 text-slate-600 border-slate-200",
};

const REVIEW_LABELS: { value: ReviewLabel; label: string; color: string }[] = [
  { value: "reviewed_appropriate", label: "Reviewed — Appropriate", color: "text-green-700" },
  { value: "review_required", label: "Review Required", color: "text-amber-700" },
  { value: "removal_recommended", label: "Removal Recommended", color: "text-red-700" },
  { value: "role_clarification_required", label: "Role Clarification Required", color: "text-orange-700" },
];

const POLICY_STATUSES = ["not_started", "drafting", "under_legal_review", "approved", "effective"];
const POLICY_STATUS_LABELS: Record<string, string> = {
  not_started: "Not started", drafting: "Drafting",
  under_legal_review: "Under legal review", approved: "Approved", effective: "Effective",
};
const POLICY_STATUS_COLORS: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-500",
  drafting: "bg-blue-100 text-blue-700",
  under_legal_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  effective: "bg-green-100 text-green-700",
};

// ── Risk Badge ─────────────────────────────────────────────────────────────────
function RiskBadge({ level }: { level: string }) {
  const cls = RISK_COLORS[(level as RiskLevel)] ?? RISK_COLORS.unknown;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{level.toUpperCase()}</span>;
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, badge }: { title: string; icon: any; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
        <Icon size={18} className="text-indigo-600 shrink-0" />
        <h2 className="text-sm font-bold text-slate-800 flex-1">{title}</h2>
        {badge}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview", icon: Shield },
  { id: "inventory", label: "Data Inventory", icon: Database },
  { id: "vendors", label: "Vendors", icon: Building2 },
  { id: "crossborder", label: "Cross-Border", icon: Globe },
  { id: "access", label: "Access Review", icon: Users },
  { id: "events", label: "Security Activity", icon: Activity },
  { id: "ai", label: "AI Review", icon: Bot },
  { id: "policies", label: "Policies", icon: FileText },
  { id: "findings", label: "Phase 1 Findings", icon: AlertTriangle },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function PrivacyCompliancePage() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: userLoading } = useGetCurrentUser({ query: { retry: false } });
  const [activeTab, setActiveTab] = useState("overview");

  // Redirect non-admins
  if (!userLoading && user?.role !== "admin") {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Privacy &amp; Compliance</h1>
          <p className="text-xs text-slate-500 mt-0.5">RAOS PIPL Compliance Programme — Phase 1 Foundation</p>
        </div>
      </div>

      {/* Disclaimer banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Info size={15} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          This dashboard supports ReMynd's compliance review. It does not certify that RAOS or ReMynd is legally compliant with PIPL or any other law.
          Final legal determinations require qualified mainland Chinese legal review.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.id ? "bg-white shadow text-indigo-700" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "inventory" && <InventoryTab />}
      {activeTab === "vendors" && <VendorsTab />}
      {activeTab === "crossborder" && <CrossBorderTab />}
      {activeTab === "access" && <AccessReviewTab />}
      {activeTab === "events" && <SecurityEventsTab />}
      {activeTab === "ai" && <AiReviewTab />}
      {activeTab === "policies" && <PoliciesTab />}
      {activeTab === "findings" && <FindingsTab />}
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-dashboard"],
    queryFn: () => customFetch("/api/compliance/dashboard").then(r => r.json()),
  });

  if (isLoading) return <div className="text-xs text-slate-400 py-8 text-center">Loading…</div>;
  if (!data) return null;

  const stats = [
    { label: "Data categories identified", value: data.inventory.total, color: "text-slate-900" },
    { label: "Involving minors", value: data.inventory.involvingMinors, color: "text-orange-700" },
    { label: "Involving sensitive data", value: data.inventory.sensitive, color: "text-red-700" },
    { label: "External vendors", value: data.vendors.total, color: "text-slate-900" },
    { label: "Unknown processing region", value: data.vendors.unknownRegion, color: "text-amber-700" },
    { label: "Possible cross-border transfers", value: data.vendors.possibleCrossBorder, color: "text-red-700" },
    { label: "AI functions reviewed", value: data.aiReview.functionsReviewed, color: "text-slate-900" },
    { label: "Unresolved high-risk items", value: data.aiReview.unresolvedHigh, color: "text-red-700" },
    { label: "Policies awaiting legal review", value: data.policies.awaitingLegal, color: "text-amber-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1 leading-snug">{s.label}</p>
          </div>
        ))}
      </div>
      {data.lastAccessReview && (
        <p className="text-xs text-slate-500">Last access review: {new Date(data.lastAccessReview).toLocaleDateString()}</p>
      )}
    </div>
  );
}

// ── Data Inventory Tab ─────────────────────────────────────────────────────────
function InventoryTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-inventory"],
    queryFn: () => customFetch("/api/compliance/data-inventory").then(r => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      customFetch(`/api/compliance/data-inventory/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-inventory"] }),
  });

  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return <div className="text-xs text-slate-400 py-8 text-center">Loading…</div>;
  const items = data?.items ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <Info size={12} className="inline mr-1" />
        Entries marked <span className="font-semibold">System-identified draft</span> require human review before they are considered complete. No actual student records are stored here.
      </p>
      {items.map((item: any) => (
        <div key={item.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
            onClick={() => setExpanded(expanded === item.id ? null : item.id)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-800">{item.category}</span>
                <RiskBadge level={item.risk_level ?? "unknown"} />
                {item.is_sensitive && <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full font-medium">Sensitive</span>}
                {item.involves_minor && <span className="text-[10px] bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full font-medium">Minors</span>}
                {item.review_status === "pending" && <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">System-identified draft</span>}
                {item.review_status === "reviewed" && <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded-full font-medium">Reviewed</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{item.data_subject} · {item.system_location}</p>
            </div>
            {expanded === item.id ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
          </button>
          {expanded === item.id && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ["Purpose", item.purpose],
                  ["Source", item.source],
                  ["Storage region", item.storage_region],
                  ["Overseas access", item.overseas_access],
                  ["Retention practice", item.retention_practice],
                  ["Deletion method", item.deletion_method],
                  ["Security controls", item.security_controls],
                  ["Authorized roles", item.authorized_roles],
                  ["External recipients", item.external_recipients],
                  ["Example fields", item.example_fields],
                ].map(([label, val]) => val ? (
                  <div key={label as string}>
                    <span className="text-slate-400 font-medium">{label}</span>
                    <p className="text-slate-700 mt-0.5">{val}</p>
                  </div>
                ) : null)}
              </div>
              {item.compliance_notes && <p className="text-xs text-slate-500 italic">{item.compliance_notes}</p>}
              {item.review_status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => updateMutation.mutate({ id: item.id, body: { review_status: "reviewed", risk_level: item.risk_level } })}
                    className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Mark as reviewed
                  </button>
                  {(["low","medium","high","critical"] as RiskLevel[]).map(r => (
                    <button key={r} onClick={() => updateMutation.mutate({ id: item.id, body: { risk_level: r } })}
                      className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${RISK_COLORS[r]} hover:opacity-80`}>
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Vendors Tab ────────────────────────────────────────────────────────────────
function VendorsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-vendors"],
    queryFn: () => customFetch("/api/compliance/vendors").then(r => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      customFetch(`/api/compliance/vendors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-vendors"] }),
  });

  const [expanded, setExpanded] = useState<string | null>(null);
  if (isLoading) return <div className="text-xs text-slate-400 py-8 text-center">Loading…</div>;
  const items = data?.items ?? [];

  return (
    <div className="space-y-3">
      {items.map((v: any) => (
        <div key={v.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
            onClick={() => setExpanded(expanded === v.id ? null : v.id)}>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-800">{v.vendor_name}</span>
                <RiskBadge level={v.risk_level ?? "unknown"} />
                {v.leaves_mainland && <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full font-medium">Cross-border</span>}
                {v.minors_possible && <span className="text-[10px] bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full font-medium">Minors</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{v.service_purpose}</p>
            </div>
            {expanded === v.id ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
          </button>
          {expanded === v.id && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ["Data categories", v.data_categories],
                  ["Hosting region", v.hosting_region ?? "Unknown"],
                  ["Leaves mainland China", v.leaves_mainland === true ? "Yes" : v.leaves_mainland === false ? "No" : "Unknown"],
                  ["Contract reviewed", v.contract_reviewed],
                  ["Training use", v.training_use],
                  ["Retention terms known", v.retention_terms_known ? "Yes" : "No"],
                  ["Deletion capable", v.deletion_capable ? "Yes" : "No"],
                  ["Student info possible", v.student_info_possible ? "Yes" : "No"],
                  ["Sensitive info possible", v.sensitive_info_possible ? "Yes" : "No"],
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <span className="text-slate-400 font-medium">{label}</span>
                    <p className="text-slate-700 mt-0.5">{val ?? "—"}</p>
                  </div>
                ))}
              </div>
              {v.required_followup && <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-800">{v.required_followup}</div>}
              {v.notes && <p className="text-xs text-slate-500 italic">{v.notes}</p>}
              <div className="flex gap-2 pt-1">
                {(["low","medium","high","critical","unknown"] as const).map(r => (
                  <button key={r} onClick={() => updateMutation.mutate({ id: v.id, body: { risk_level: r } })}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${RISK_COLORS[r as RiskLevel]} hover:opacity-80`}>{r}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Cross-Border Tab ───────────────────────────────────────────────────────────
function CrossBorderTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-vendors"],
    queryFn: () => customFetch("/api/compliance/vendors").then(r => r.json()),
  });
  if (isLoading) return <div className="text-xs text-slate-400 py-8 text-center">Loading…</div>;
  const xborder = (data?.items ?? []).filter((v: any) => v.leaves_mainland !== false);

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
        <p className="font-semibold mb-1">Cross-Border Data Transfer Notice</p>
        <p>The following services may receive or process data outside mainland China. PIPL Article 38 requires that cross-border transfers either meet a security assessment, a certification, or a standard contract. None of these have been confirmed for Phase 1 — legal review is required.</p>
      </div>
      <div className="space-y-2">
        {xborder.map((v: any) => (
          <div key={v.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Globe size={14} className="text-red-500 shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-slate-800">{v.vendor_name}</span>
              <p className="text-xs text-slate-500">{v.service_purpose} · {v.hosting_region ?? "Region unknown"}</p>
            </div>
            <RiskBadge level={v.risk_level ?? "unknown"} />
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400">Showing {xborder.length} vendors where cross-border transfer is possible or unknown.</p>
    </div>
  );
}

// ── Access Review Tab ──────────────────────────────────────────────────────────
function AccessReviewTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-access"],
    queryFn: () => customFetch("/api/compliance/access-review").then(r => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, label }: { userId: string; label: ReviewLabel }) =>
      customFetch(`/api/compliance/access-review/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ review_label: label }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-access"] }),
  });

  if (isLoading) return <div className="text-xs text-slate-400 py-8 text-center">Loading…</div>;
  const users = data?.users ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <Info size={12} className="inline mr-1" />
        This view is read-only. Review labels are for internal compliance tracking only. Actual role or access changes must use the existing RAOS Team management process.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              {["Name", "Role", "School", "Cases", "Review Status", "Action"].map(h => (
                <th key={h} className="text-left py-2 px-3 text-slate-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3">
                  <p className="font-medium text-slate-800">{u.name}</p>
                  <p className="text-slate-400">{u.email}</p>
                </td>
                <td className="py-2 px-3 text-slate-600">{u.role}</td>
                <td className="py-2 px-3 text-slate-500">{u.school ?? "—"}</td>
                <td className="py-2 px-3 text-slate-600">{u.caseCount}</td>
                <td className="py-2 px-3">
                  {u.reviewLabel ? (
                    <span className={`font-medium ${REVIEW_LABELS.find(r => r.value === u.reviewLabel)?.color ?? "text-slate-600"}`}>
                      {REVIEW_LABELS.find(r => r.value === u.reviewLabel)?.label ?? u.reviewLabel}
                    </span>
                  ) : <span className="text-slate-400">Not reviewed</span>}
                </td>
                <td className="py-2 px-3">
                  <select
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
                    value={u.reviewLabel ?? ""}
                    onChange={e => updateMutation.mutate({ userId: u.id, label: (e.target.value || null) as ReviewLabel })}
                  >
                    <option value="">Set label…</option>
                    {REVIEW_LABELS.map(r => <option key={r.value ?? ""} value={r.value ?? ""}>{r.label}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Security Events Tab ────────────────────────────────────────────────────────
function SecurityEventsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-events"],
    queryFn: () => customFetch("/api/compliance/security-events?limit=50").then(r => r.json()),
  });
  if (isLoading) return <div className="text-xs text-slate-400 py-8 text-center">Loading…</div>;
  const events = data?.events ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{data?.total ?? 0} total events · showing most recent 50</p>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-slate-400 py-8 text-center">No security events recorded yet. Events will appear here as compliance register changes and other security-relevant actions are recorded.</p>
      ) : (
        <div className="space-y-2">
          {events.map((e: any) => (
            <div key={e.id} className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
              <Activity size={13} className="text-indigo-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-700">{e.event_type}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${e.outcome === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>{e.outcome}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{e.description}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(e.occurred_at).toLocaleString()} · {e.actor_role ?? "system"}{e.vendor_name ? ` · ${e.vendor_name}` : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI Review Tab ──────────────────────────────────────────────────────────────
function AiReviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-ai"],
    queryFn: () => customFetch("/api/compliance/ai-review").then(r => r.json()),
  });
  if (isLoading) return <div className="text-xs text-slate-400 py-8 text-center">Loading…</div>;

  const STATUS_ICONS: Record<string, React.ReactNode> = {
    partial_mitigation: <Clock size={13} className="text-amber-500" />,
    reviewed_no_action: <CheckCircle2 size={13} className="text-green-500" />,
    requires_manual_review: <HelpCircle size={13} className="text-blue-500" />,
    deferred_priority_review: <XCircle size={13} className="text-red-500" />,
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
        {data?.disclaimer}
      </div>
      <div className="space-y-3">
        {(data?.functions ?? []).map((fn: any) => (
          <div key={fn.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <div className="shrink-0">{STATUS_ICONS[fn.status] ?? <HelpCircle size={13} />}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800">{fn.name}</span>
                  <RiskBadge level={fn.riskLevel} />
                  <span className="text-[10px] text-slate-500">{fn.provider}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{fn.file}</p>
              </div>
            </div>
            <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium mb-1">Data categories transmitted</p>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  {fn.dataCategories.map((d: string) => <li key={d}>{d}</li>)}
                </ul>
              </div>
              <div className="space-y-2">
                <div><span className="text-slate-400 font-medium">Direct identifiers: </span><span className="text-slate-700">{fn.directIdentifiers}</span></div>
                <div><span className="text-slate-400 font-medium">Hosting region: </span><span className="text-slate-700">{fn.hostingRegion}</span></div>
                <div><span className="text-slate-400 font-medium">Leaves mainland: </span><span className={fn.leavesMainland ? "text-red-600 font-medium" : "text-green-600"}>{fn.leavesMainland ? "Yes" : "No"}</span></div>
                <div><span className="text-slate-400 font-medium">Training use: </span><span className="text-slate-700">{fn.trainingUse}</span></div>
              </div>
            </div>
            <div className={`px-4 py-2 text-xs border-t ${fn.riskLevel === "critical" || fn.status === "deferred_priority_review" ? "bg-red-50 border-red-100 text-red-800" : "bg-slate-50 border-slate-100 text-slate-600"}`}>
              <span className="font-semibold">Phase 1 action: </span>{fn.phase1Action}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Policies Tab ───────────────────────────────────────────────────────────────
function PoliciesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-policies"],
    queryFn: () => customFetch("/api/compliance/policies").then(r => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      customFetch(`/api/compliance/policies/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-policies"] }),
  });

  if (isLoading) return <div className="text-xs text-slate-400 py-8 text-center">Loading…</div>;
  const items = data?.items ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        These are internal placeholder records only. No policy documents have been generated. Do not display to users, parents or schools until legally reviewed and approved.
      </p>
      <div className="space-y-2">
        {items.map((p: any) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <FileText size={14} className="text-slate-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">{p.policy_name}</p>
              {p.internal_notes && <p className="text-xs text-slate-400 mt-0.5">{p.internal_notes}</p>}
            </div>
            <select
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
              value={p.status ?? "not_started"}
              onChange={e => updateMutation.mutate({ id: p.id, body: { status: e.target.value } })}
            >
              {POLICY_STATUSES.map(s => <option key={s} value={s}>{POLICY_STATUS_LABELS[s]}</option>)}
            </select>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${POLICY_STATUS_COLORS[p.status ?? "not_started"]}`}>
              {POLICY_STATUS_LABELS[p.status ?? "not_started"]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Phase 1 Findings Tab ───────────────────────────────────────────────────────
function FindingsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-findings"],
    queryFn: () => customFetch("/api/compliance/phase1-findings").then(r => r.json()),
  });
  if (isLoading) return <div className="text-xs text-slate-400 py-8 text-center">Loading…</div>;

  const PRIORITY_COLORS: Record<string, string> = {
    critical: "bg-red-50 border-red-200 text-red-800",
    high: "bg-orange-50 border-orange-200 text-orange-800",
    medium: "bg-amber-50 border-amber-200 text-amber-800",
    low: "bg-slate-50 border-slate-200 text-slate-700",
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <p className="text-sm font-bold text-indigo-800">{data?.programmeLabel}</p>
        <p className="text-xs text-indigo-700 mt-1">{data?.disclaimer}</p>
        <p className="text-xs text-indigo-500 mt-2">Phase 1 completed: {data?.completedDate}</p>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3">Deferred Risk Register</h3>
        <p className="text-xs text-slate-500 mb-3">Items that cannot be addressed in Phase 1 without disrupting existing workflows or requiring legal approval.</p>
        <div className="space-y-2">
          {(data?.deferredItems ?? []).map((item: any) => (
            <div key={item.id} className={`border rounded-xl p-3 ${PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS.low}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">{item.title}</p>
                  <p className="text-xs mt-0.5 opacity-80">{item.reason}</p>
                </div>
                <span className="ml-auto text-[10px] font-bold uppercase shrink-0">{item.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
        <p className="text-xs font-bold text-slate-700 flex items-center gap-2"><Lock size={13} />Production Activation Checklist</p>
        {[
          "Admin has reviewed all data inventory entries",
          "Admin has reviewed all vendor entries and confirmed risk levels",
          "Legal counsel has been briefed on cross-border transfer findings",
          "DeepSeek and Groq training-use terms confirmed",
          "Recording consent framework confirmed with legal counsel",
          "Phase 1 deferred items logged in legal risk register",
          "Access review completed for all active users",
        ].map((item, i) => (
          <label key={i} className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" className="mt-0.5 shrink-0" />
            {item}
          </label>
        ))}
      </div>
    </div>
  );
}
