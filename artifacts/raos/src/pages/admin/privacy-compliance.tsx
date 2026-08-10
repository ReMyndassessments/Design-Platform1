import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useI18n, LanguageSwitcherLight } from "../../lib/i18n";
import {
  Shield, Database, Building2, Globe, Users, Activity,
  Bot, FileText, AlertTriangle, ChevronDown, ChevronRight,
  CheckCircle2, Clock, XCircle, HelpCircle, Info, Lock,
  Eye, X, Copy, Check,
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

const POLICY_STATUSES = ["not_started", "drafting", "under_legal_review", "approved", "effective"] as const;
type PolicyStatus = typeof POLICY_STATUSES[number];

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
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {level.toUpperCase()}
    </span>
  );
}

// ── Loading state ─────────────────────────────────────────────────────────────
function TabLoading({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-xs text-slate-400">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-indigo-200 animate-pulse" />
        {msg}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PrivacyCompliancePage() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: userLoading } = useGetCurrentUser({ query: { retry: false } });
  const [activeTab, setActiveTab] = useState("overview");
  const { t } = useI18n();
  const c = t.compliance;

  // Redirect non-admins
  if (!userLoading && user?.role !== "admin") {
    navigate("/dashboard");
    return null;
  }

  const TABS = [
    { id: "overview",    label: c.tabs.overview,    icon: Shield },
    { id: "inventory",   label: c.tabs.inventory,   icon: Database },
    { id: "vendors",     label: c.tabs.vendors,      icon: Building2 },
    { id: "crossborder", label: c.tabs.crossborder,  icon: Globe },
    { id: "access",      label: c.tabs.access,       icon: Users },
    { id: "events",      label: c.tabs.events,       icon: Activity },
    { id: "ai",          label: c.tabs.ai,            icon: Bot },
    { id: "policies",    label: c.tabs.policies,     icon: FileText },
    { id: "findings",    label: c.tabs.findings,     icon: AlertTriangle },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{c.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{c.subtitle}</p>
          </div>
        </div>
        <LanguageSwitcherLight className="shrink-0 mt-1" />
      </div>

      {/* Disclaimer banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Info size={15} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">{c.disclaimer}</p>
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
      {activeTab === "overview"    && <OverviewTab />}
      {activeTab === "inventory"   && <InventoryTab />}
      {activeTab === "vendors"     && <VendorsTab />}
      {activeTab === "crossborder" && <CrossBorderTab />}
      {activeTab === "access"      && <AccessReviewTab />}
      {activeTab === "events"      && <SecurityEventsTab />}
      {activeTab === "ai"          && <AiReviewTab />}
      {activeTab === "policies"    && <PoliciesTab />}
      {activeTab === "findings"    && <FindingsTab />}
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────────
function OverviewTab() {
  const { t } = useI18n();
  const c = t.compliance;
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-dashboard"],
    queryFn: () => customFetch("/api/compliance/dashboard"),
  });

  if (isLoading) return <TabLoading msg={c.loading} />;
  if (!data) return null;

  const stats = [
    { label: c.overview.dataCategories,     value: data.inventory.total,                color: "text-slate-900" },
    { label: c.overview.involvingMinors,     value: data.inventory.involvingMinors,      color: "text-orange-700" },
    { label: c.overview.sensitiveData,       value: data.inventory.sensitive,            color: "text-red-700" },
    { label: c.overview.externalVendors,     value: data.vendors.total,                  color: "text-slate-900" },
    { label: c.overview.unknownRegion,       value: data.vendors.unknownRegion,          color: "text-amber-700" },
    { label: c.overview.crossBorderPossible, value: data.vendors.possibleCrossBorder,   color: "text-red-700" },
    { label: c.overview.aiFunctionsReviewed, value: data.aiReview.functionsReviewed,    color: "text-slate-900" },
    { label: c.overview.unresolvedHigh,      value: data.aiReview.unresolvedHigh,       color: "text-red-700" },
    { label: c.overview.awaitingLegal,       value: data.policies.awaitingLegal,         color: "text-amber-700" },
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
        <p className="text-xs text-slate-500">
          {c.overview.lastAccessReview}: {new Date(data.lastAccessReview).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

// ── Data Inventory Tab ─────────────────────────────────────────────────────────
function InventoryTab() {
  const { t } = useI18n();
  const c = t.compliance;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-inventory"],
    queryFn: () => customFetch("/api/compliance/data-inventory"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      customFetch(`/api/compliance/data-inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-inventory"] }),
  });

  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return <TabLoading msg={c.loading} />;
  const items = data?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <Info size={12} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-800">{c.inventory.infoNote}</p>
      </div>
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
                {item.is_sensitive && (
                  <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full font-medium">
                    {c.inventory.sensitive}
                  </span>
                )}
                {item.involves_minor && (
                  <span className="text-[10px] bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full font-medium">
                    {c.inventory.minors}
                  </span>
                )}
                {item.review_status === "pending" && (
                  <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
                    {c.inventory.systemDraft}
                  </span>
                )}
                {item.review_status === "reviewed" && (
                  <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded-full font-medium">
                    {c.inventory.reviewed}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {item.data_subject} · {item.system_location}
              </p>
            </div>
            {expanded === item.id
              ? <ChevronDown size={14} className="text-slate-400 shrink-0" />
              : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
          </button>

          {expanded === item.id && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {([
                  [c.inventory.purpose,           item.purpose],
                  [c.inventory.source,             item.source],
                  [c.inventory.storageRegion,      item.storage_region],
                  [c.inventory.overseasAccess,     item.overseas_access],
                  [c.inventory.retentionPractice,  item.retention_practice],
                  [c.inventory.deletionMethod,     item.deletion_method],
                  [c.inventory.securityControls,   item.security_controls],
                  [c.inventory.authorizedRoles,    item.authorized_roles],
                  [c.inventory.externalRecipients, item.external_recipients],
                  [c.inventory.exampleFields,      item.example_fields],
                ] as [string, string | null][]).map(([label, val]) =>
                  val ? (
                    <div key={label}>
                      <span className="text-slate-400 font-medium">{label}</span>
                      <p className="text-slate-700 mt-0.5">{val}</p>
                    </div>
                  ) : null
                )}
              </div>
              {item.compliance_notes && (
                <p className="text-xs text-slate-500 italic">{item.compliance_notes}</p>
              )}
              {item.review_status === "pending" && (
                <div className="flex gap-2 pt-2 flex-wrap">
                  <button
                    onClick={() =>
                      updateMutation.mutate({ id: item.id, body: { review_status: "reviewed", risk_level: item.risk_level } })
                    }
                    className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    {c.inventory.markReviewed}
                  </button>
                  {(["low", "medium", "high", "critical"] as RiskLevel[]).map(r => (
                    <button
                      key={r}
                      onClick={() => updateMutation.mutate({ id: item.id, body: { risk_level: r } })}
                      className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${RISK_COLORS[r]} hover:opacity-80`}
                    >
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
  const { t } = useI18n();
  const c = t.compliance;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-vendors"],
    queryFn: () => customFetch("/api/compliance/vendors"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      customFetch(`/api/compliance/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-vendors"] }),
  });

  const [expanded, setExpanded] = useState<string | null>(null);
  if (isLoading) return <TabLoading msg={c.loading} />;
  const items = data?.items ?? [];

  return (
    <div className="space-y-3">
      {items.map((v: any) => (
        <div key={v.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
            onClick={() => setExpanded(expanded === v.id ? null : v.id)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-800">{v.vendor_name}</span>
                <RiskBadge level={v.risk_level ?? "unknown"} />
                {v.leaves_mainland && (
                  <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full font-medium">
                    {c.vendors.crossBorder}
                  </span>
                )}
                {v.minors_possible && (
                  <span className="text-[10px] bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full font-medium">
                    {c.vendors.minors}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{v.service_purpose}</p>
            </div>
            {expanded === v.id
              ? <ChevronDown size={14} className="text-slate-400 shrink-0" />
              : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
          </button>

          {expanded === v.id && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {([
                  [c.vendors.dataCategories,  v.data_categories],
                  [c.vendors.hostingRegion,   v.hosting_region ?? c.vendors.unknown],
                  [c.vendors.leavesMainland,  v.leaves_mainland === true ? c.vendors.yes : v.leaves_mainland === false ? c.vendors.no : c.vendors.unknown],
                  [c.vendors.contractReviewed, v.contract_reviewed],
                  [c.vendors.trainingUse,     v.training_use],
                  [c.vendors.retentionKnown,  v.retention_terms_known ? c.vendors.yes : c.vendors.no],
                  [c.vendors.deletionCapable, v.deletion_capable ? c.vendors.yes : c.vendors.no],
                  [c.vendors.studentInfo,     v.student_info_possible ? c.vendors.yes : c.vendors.no],
                  [c.vendors.sensitiveInfo,   v.sensitive_info_possible ? c.vendors.yes : c.vendors.no],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label}>
                    <span className="text-slate-400 font-medium">{label}</span>
                    <p className="text-slate-700 mt-0.5">{val ?? "—"}</p>
                  </div>
                ))}
              </div>
              {v.required_followup && (
                <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-800">
                  {v.required_followup}
                </div>
              )}
              {v.notes && <p className="text-xs text-slate-500 italic">{v.notes}</p>}
              <div className="flex gap-2 pt-1 flex-wrap">
                {(["low", "medium", "high", "critical", "unknown"] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => updateMutation.mutate({ id: v.id, body: { risk_level: r } })}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${RISK_COLORS[r as RiskLevel]} hover:opacity-80`}
                  >
                    {r}
                  </button>
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
  const { t } = useI18n();
  const c = t.compliance;
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-vendors"],
    queryFn: () => customFetch("/api/compliance/vendors"),
  });
  if (isLoading) return <TabLoading msg={c.loading} />;
  const xborder = (data?.items ?? []).filter((v: any) => v.leaves_mainland !== false);

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
        <p className="font-semibold mb-1">{c.crossborder.title}</p>
        <p>{c.crossborder.body}</p>
      </div>
      <div className="space-y-2">
        {xborder.map((v: any) => (
          <div key={v.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Globe size={14} className="text-red-500 shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-slate-800">{v.vendor_name}</span>
              <p className="text-xs text-slate-500">
                {v.service_purpose} · {v.hosting_region ?? c.crossborder.regionUnknown}
              </p>
            </div>
            <RiskBadge level={v.risk_level ?? "unknown"} />
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        {c.crossborder.showing.replace("{n}", String(xborder.length))}
      </p>
    </div>
  );
}

// ── Access Review Tab ──────────────────────────────────────────────────────────
function AccessReviewTab() {
  const { t } = useI18n();
  const c = t.compliance;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-access"],
    queryFn: () => customFetch("/api/compliance/access-review"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, label }: { userId: string; label: ReviewLabel }) =>
      customFetch(`/api/compliance/access-review/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_label: label }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-access"] }),
  });

  if (isLoading) return <TabLoading msg={c.loading} />;
  const users = data?.users ?? [];

  const REVIEW_LABEL_OPTIONS: { value: ReviewLabel; color: string }[] = [
    { value: "reviewed_appropriate",      color: "text-green-700" },
    { value: "review_required",           color: "text-amber-700" },
    { value: "removal_recommended",       color: "text-red-700" },
    { value: "role_clarification_required", color: "text-orange-700" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <Info size={12} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-800">{c.access.note}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {[c.access.name, c.access.role, c.access.school, c.access.cases, c.access.reviewStatus, c.access.action].map(h => (
                <th key={h} className="text-left py-2.5 px-3 text-slate-500 font-semibold whitespace-nowrap">{h}</th>
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
                    <span className={`font-medium ${REVIEW_LABEL_OPTIONS.find(r => r.value === u.reviewLabel)?.color ?? "text-slate-600"}`}>
                      {c.access.labels[u.reviewLabel as keyof typeof c.access.labels] ?? u.reviewLabel}
                    </span>
                  ) : (
                    <span className="text-slate-400">{c.access.notReviewed}</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  <select
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
                    value={u.reviewLabel ?? ""}
                    onChange={e =>
                      updateMutation.mutate({ userId: u.id, label: (e.target.value || null) as ReviewLabel })
                    }
                  >
                    <option value="">{c.access.setLabel}</option>
                    {REVIEW_LABEL_OPTIONS.map(r => (
                      <option key={r.value ?? ""} value={r.value ?? ""}>
                        {c.access.labels[r.value as keyof typeof c.access.labels]}
                      </option>
                    ))}
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
  const { t } = useI18n();
  const c = t.compliance;
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-events"],
    queryFn: () => customFetch("/api/compliance/security-events?limit=50"),
  });
  if (isLoading) return <TabLoading msg={c.loading} />;
  const events = data?.events ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        {data?.total ?? 0} {c.events.totalEvents}
      </p>
      {events.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-12 text-center">
          <Activity size={24} className="mx-auto text-slate-300 mb-3" />
          <p className="text-xs text-slate-400 max-w-sm mx-auto">{c.events.noEvents}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((e: any) => (
            <div key={e.id} className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
              <Activity size={13} className="text-indigo-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-slate-700">{e.event_type}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                      e.outcome === "success"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {e.outcome}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{e.description}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(e.occurred_at).toLocaleString()} · {e.actor_role ?? "system"}
                  {e.vendor_name ? ` · ${e.vendor_name}` : ""}
                </p>
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
  const { t } = useI18n();
  const c = t.compliance;
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-ai"],
    queryFn: () => customFetch("/api/compliance/ai-review"),
  });
  if (isLoading) return <TabLoading msg={c.loading} />;

  const STATUS_ICONS: Record<string, React.ReactNode> = {
    partial_mitigation:      <Clock size={13} className="text-amber-500" />,
    reviewed_no_action:      <CheckCircle2 size={13} className="text-green-500" />,
    requires_manual_review:  <HelpCircle size={13} className="text-blue-500" />,
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
                <p className="text-slate-400 font-medium mb-1">{c.aiReview.categories}</p>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  {fn.dataCategories.map((d: string) => <li key={d}>{d}</li>)}
                </ul>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 font-medium">{c.aiReview.directIdentifiers}: </span>
                  <span className="text-slate-700">{fn.directIdentifiers}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">{c.aiReview.hostingRegion}: </span>
                  <span className="text-slate-700">{fn.hostingRegion}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">{c.aiReview.leavesMainland}: </span>
                  <span className={fn.leavesMainland ? "text-red-600 font-medium" : "text-green-600"}>
                    {fn.leavesMainland ? c.aiReview.yes : c.aiReview.no}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">{c.aiReview.trainingUse}: </span>
                  <span className="text-slate-700">{fn.trainingUse}</span>
                </div>
              </div>
            </div>
            <div
              className={`px-4 py-2 text-xs border-t ${
                fn.riskLevel === "critical" || fn.status === "deferred_priority_review"
                  ? "bg-red-50 border-red-100 text-red-800"
                  : "bg-slate-50 border-slate-100 text-slate-600"
              }`}
            >
              <span className="font-semibold">{c.aiReview.phase1Action}: </span>{fn.phase1Action}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Policies Tab ───────────────────────────────────────────────────────────────
// ── Policy Viewer Modal ───────────────────────────────────────────────────────
function PolicyViewerModal({ policy, onClose }: { policy: any; onClose: () => void }) {
  const { t, lang } = useI18n();
  const c = t.compliance;
  const [viewLang, setViewLang] = useState<"en" | "zh" | "ko">(lang as "en" | "zh" | "ko");
  const [copied, setCopied] = useState(false);

  const content: string = policy[`content_${viewLang}`] || policy.content_en || "";

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Render markdown-lite: bold, headings, tables, lists, horizontal rules
  const renderContent = (md: string) => {
    const lines = md.split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Horizontal rule
      if (/^---+$/.test(line.trim())) {
        elements.push(<hr key={i} className="border-slate-200 my-4" />);
        i++; continue;
      }
      // H1
      if (line.startsWith("# ")) {
        elements.push(<h1 key={i} className="text-xl font-bold text-slate-900 mb-3 mt-4">{line.slice(2)}</h1>);
        i++; continue;
      }
      // H2
      if (line.startsWith("## ")) {
        elements.push(<h2 key={i} className="text-base font-semibold text-slate-800 mb-2 mt-5">{line.slice(3)}</h2>);
        i++; continue;
      }
      // H3
      if (line.startsWith("### ")) {
        elements.push(<h3 key={i} className="text-sm font-semibold text-slate-700 mb-1 mt-4">{line.slice(4)}</h3>);
        i++; continue;
      }
      // Table — collect all table lines
      if (line.startsWith("|")) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].startsWith("|")) {
          tableLines.push(lines[i]);
          i++;
        }
        const rows = tableLines.filter(l => !l.match(/^\|[\s\-:|]+\|$/));
        elements.push(
          <div key={`table-${i}`} className="overflow-x-auto my-3">
            <table className="w-full text-xs border-collapse">
              {rows.map((row, ri) => {
                const cells = row.split("|").slice(1, -1).map(c => c.trim());
                return (
                  <tr key={ri} className={ri === 0 ? "bg-slate-50" : "border-t border-slate-100"}>
                    {cells.map((cell, ci) => ri === 0
                      ? <th key={ci} className="px-2 py-1.5 text-left font-semibold text-slate-700 border border-slate-200">{inlineFormat(cell)}</th>
                      : <td key={ci} className="px-2 py-1.5 text-slate-600 border border-slate-200">{inlineFormat(cell)}</td>
                    )}
                  </tr>
                );
              })}
            </table>
          </div>
        );
        continue;
      }
      // Bullet list items
      if (line.startsWith("- ") || line.startsWith("* ")) {
        elements.push(
          <li key={i} className="text-sm text-slate-700 ml-4 list-disc mb-0.5">{inlineFormat(line.slice(2))}</li>
        );
        i++; continue;
      }
      // Numbered list
      if (/^\d+\.\s/.test(line)) {
        elements.push(
          <li key={i} className="text-sm text-slate-700 ml-4 list-decimal mb-0.5">{inlineFormat(line.replace(/^\d+\.\s/, ""))}</li>
        );
        i++; continue;
      }
      // Checkbox items
      if (line.startsWith("☐") || line.startsWith("☑")) {
        elements.push(
          <p key={i} className="text-sm text-slate-700 mb-1">{inlineFormat(line)}</p>
        );
        i++; continue;
      }
      // Blank line
      if (line.trim() === "") {
        elements.push(<div key={i} className="h-1" />);
        i++; continue;
      }
      // Normal paragraph
      elements.push(<p key={i} className="text-sm text-slate-700 mb-2 leading-relaxed">{inlineFormat(line)}</p>);
      i++;
    }
    return elements;
  };

  const inlineFormat = (text: string): React.ReactNode => {
    // Bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>
        : p
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{c.policies.viewerTitle}</p>
            <p className="text-sm font-semibold text-slate-900 truncate">{policy.policy_name}</p>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            {/* Language switcher */}
            <span className="text-[10px] text-slate-400">{c.policies.viewerLang}</span>
            {(["en", "zh", "ko"] as const).map(l => (
              <button
                key={l}
                onClick={() => setViewLang(l)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                  viewLang === l ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {l === "en" ? "EN" : l === "zh" ? "中文" : "한국어"}
              </button>
            ))}
            {/* Copy */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              {copied ? <Check size={10} className="text-green-600" /> : <Copy size={10} />}
              {copied ? c.policies.copied : c.policies.copyText}
            </button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        {/* Status badge */}
        <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2 shrink-0">
          <Info size={11} className="text-amber-600 shrink-0" />
          <p className="text-[11px] text-amber-700">{c.policies.warningNote}</p>
        </div>
        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {content ? renderContent(content) : (
            <p className="text-sm text-slate-400 text-center py-8">No content available</p>
          )}
        </div>
        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-400">{c.policies.downloadNote}</p>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            {c.policies.closeViewer}
          </button>
        </div>
      </div>
    </div>
  );
}

function PoliciesTab() {
  const { t } = useI18n();
  const c = t.compliance;
  const qc = useQueryClient();
  const [viewing, setViewing] = useState<any | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-policies"],
    queryFn: () => customFetch("/api/compliance/policies"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      customFetch(`/api/compliance/policies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-policies"] }),
  });

  if (isLoading) return <TabLoading msg={c.loading} />;
  const items = data?.items ?? [];

  return (
    <>
      {viewing && <PolicyViewerModal policy={viewing} onClose={() => setViewing(null)} />}
      <div className="space-y-3">
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Info size={12} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">{c.policies.warningNote}</p>
        </div>
        <div className="space-y-2">
          {items.map((p: any) => {
            const status = (p.status ?? "not_started") as PolicyStatus;
            const hasContent = !!(p.content_en || p.content_zh || p.content_ko);
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <FileText size={14} className="text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{p.policy_name}</p>
                  {p.internal_notes && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{p.internal_notes}</p>
                  )}
                </div>
                {hasContent && (
                  <button
                    onClick={() => setViewing(p)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg border border-indigo-200 hover:border-indigo-300 bg-indigo-50 hover:bg-indigo-100 transition-colors shrink-0"
                  >
                    <Eye size={11} />
                    {c.policies.viewPolicy}
                  </button>
                )}
                <select
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white shrink-0"
                  value={status}
                  onChange={e => updateMutation.mutate({ id: p.id, body: { status: e.target.value } })}
                >
                  {POLICY_STATUSES.map(s => (
                    <option key={s} value={s}>{c.policies.statuses[s]}</option>
                  ))}
                </select>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${POLICY_STATUS_COLORS[status]}`}>
                  {c.policies.statuses[status]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Phase 1 Findings Tab ───────────────────────────────────────────────────────
function FindingsTab() {
  const { t } = useI18n();
  const c = t.compliance;
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-findings"],
    queryFn: () => customFetch("/api/compliance/phase1-findings"),
  });
  if (isLoading) return <TabLoading msg={c.loading} />;

  const PRIORITY_COLORS: Record<string, string> = {
    critical: "bg-red-50 border-red-200 text-red-800",
    high:     "bg-orange-50 border-orange-200 text-orange-800",
    medium:   "bg-amber-50 border-amber-200 text-amber-800",
    low:      "bg-slate-50 border-slate-200 text-slate-700",
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <p className="text-sm font-bold text-indigo-800">{data?.programmeLabel}</p>
        <p className="text-xs text-indigo-700 mt-1">{data?.disclaimer}</p>
        <p className="text-xs text-indigo-500 mt-2">
          Phase 1 completed: {data?.completedDate}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-1">{c.findings.deferredTitle}</h3>
        <p className="text-xs text-slate-500 mb-3">{c.findings.deferredNote}</p>
        <div className="space-y-2">
          {(data?.deferredItems ?? []).map((item: any) => (
            <div key={item.id} className={`border rounded-xl p-3 ${PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS.low}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <div className="flex-1">
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
        <p className="text-xs font-bold text-slate-700 flex items-center gap-2">
          <Lock size={13} />{c.findings.checklist}
        </p>
        {c.findings.checkItems.map((item, i) => (
          <label key={i} className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" className="mt-0.5 shrink-0" />
            {item}
          </label>
        ))}
      </div>
    </div>
  );
}
