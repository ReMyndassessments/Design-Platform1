import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import {
  Users, Globe, Building2, Download, Search, X, CheckCircle2,
  ChevronDown, Filter, Mail, MailCheck, MailX, ExternalLink, BookOpen, Copy, Link,
  Plus, Calendar, Clock, MapPin, Monitor, Pencil, Trash2, Eye, ArrowLeft,
  Upload, DollarSign, QrCode, Award, Wifi, Loader2, AlertCircle, Check,
  ChevronRight, RefreshCw, MoreHorizontal,
} from "lucide-react";
import { useI18n } from "../../lib/i18n";

const TRAINING_URL = "https://remyndassessments.com/training";

function getWorkshopPublicUrl(slug: string): string {
  const prefix = window.location.pathname.startsWith("/raos") ? "/raos" : "";
  return `${window.location.origin}${prefix}/training/${slug}`;
}

// ── Workshop types ────────────────────────────────────────────────────────────
type SessionDate = { date: string; start_time: string; end_time: string };
type Workshop = {
  id: string; slug: string; title: string; subtitle?: string;
  description?: string; additional_info?: string;
  image_object_id?: string; image_alt?: string;
  session_dates: SessionDate[]; timezone: string;
  delivery_method: string; venue_info?: string;
  facilitator_name?: string; pl_hours?: number | null;
  registration_opens_at?: string | null; registration_closes_at?: string | null;
  max_participants?: number | null;
  is_free: boolean; price?: number | null; currency: string; contact_email?: string;
  status: string; registration_count: number;
  created_at: string; updated_at: string;
};
type WorkshopReg = {
  id: string; workshop_id: string;
  first_name: string; last_name: string; email: string;
  professional_role?: string; school_name?: string; country?: string; phone?: string;
  payment_status: string; payment_intent_id?: string;
  status: string; confirmation_email_status?: string;
  internal_notes?: string; created_at: string;
};

type WorkshopFormState = {
  title: string; subtitle: string; description: string;
  session_dates: SessionDate[];
  timezone: string; delivery_method: string; venue_info: string;
  facilitator_name: string; pl_hours: string;
  registration_opens_at: string; registration_closes_at: string;
  max_participants: string; is_free: boolean;
  price: string; currency: string; contact_email: string;
  additional_info: string; image_object_id: string; image_alt: string; status: string;
};

const defaultWorkshopForm: WorkshopFormState = {
  title: "", subtitle: "", description: "",
  session_dates: [{ date: "", start_time: "", end_time: "" }],
  timezone: "Asia/Hong_Kong", delivery_method: "online", venue_info: "",
  facilitator_name: "", pl_hours: "",
  registration_opens_at: "", registration_closes_at: "",
  max_participants: "", is_free: true,
  price: "", currency: "USD", contact_email: "", additional_info: "",
  image_object_id: "", image_alt: "", status: "draft",
};

const TIMEZONES = [
  "Asia/Hong_Kong","Asia/Singapore","Asia/Tokyo","Asia/Seoul",
  "Asia/Shanghai","Asia/Taipei","Australia/Sydney","Europe/London",
  "America/New_York","America/Los_Angeles","Pacific/Auckland",
];
const CURRENCIES = ["USD","HKD","SGD","AUD","CNY","JPY","KRW","GBP","EUR"];

const WS_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-emerald-100 text-emerald-700",
  full: "bg-amber-100 text-amber-700",
  closed: "bg-red-100 text-red-600",
};

// ── Series-registration types (existing) ──────────────────────────────────────
type Registration = {
  id: string;
  first_name: string; last_name: string; email: string;
  job_title?: string; professional_role?: string; professional_role_other?: string;
  school_name?: string; city?: string; country?: string;
  school_type?: string; school_size?: string;
  workshop_1_selected: boolean; workshop_2_selected: boolean;
  workshop_3_selected: boolean; workshop_4_selected: boolean; full_series_selected: boolean;
  areas_of_interest?: string[] | null;
  school_support_challenge?: string;
  interested_future_learning: boolean; interested_school_training: boolean;
  interested_assessment_services: boolean; interested_partner_school: boolean; training_only: boolean;
  marketing_consent: boolean; marketing_consent_timestamp?: string;
  privacy_consent: boolean; privacy_consent_timestamp?: string;
  registration_source?: string; status: string;
  confirmation_email_status?: string; admin_notification_status?: string;
  internal_notes?: string;
  created_at: string; updated_at: string;
};
const STATUSES = ["registered", "confirmed", "attended", "no_show", "cancelled"];
const STATUS_COLORS: Record<string, string> = {
  registered: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  attended: "bg-green-100 text-green-700",
  no_show: "bg-slate-100 text-slate-500",
  cancelled: "bg-red-100 text-red-600",
};
const WS_LABELS = ["Foundations & Philosophy", "Assessment Ecosystem", "Thinking Like a Clinician", "Profile & Support Plan"];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TrainingRegistrationsPage() {
  const [mainView, setMainView] = useState<"workshops" | "series">("workshops");
  const { t } = useI18n();
  const qc = useQueryClient();

  // Series-specific state
  const [search, setSearch] = useState("");
  const [workshopFilter, setWorkshopFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [marketingFilter, setMarketingFilter] = useState("");
  const [assessmentFilter, setAssessmentFilter] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [selected, setSelected] = useState<Registration | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(TRAINING_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { data: statsData } = useQuery({
    queryKey: ["training-stats"],
    queryFn: () => customFetch("/api/training/registrations/stats"),
    enabled: mainView === "series",
  });
  const stats = statsData?.stats ?? {};

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (workshopFilter) params.set("workshop", workshopFilter);
  if (statusFilter) params.set("status", statusFilter);
  if (marketingFilter) params.set("marketing_consent", marketingFilter);
  if (assessmentFilter) params.set("assessment_interest", assessmentFilter);
  if (partnerFilter) params.set("partner_school", partnerFilter);

  const { data: listData, isLoading } = useQuery({
    queryKey: ["training-registrations", params.toString()],
    queryFn: () => customFetch(`/api/training/registrations?${params.toString()}`),
    enabled: mainView === "series",
  });
  const registrations: Registration[] = listData?.registrations ?? [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status, internal_notes }: { id: string; status?: string; internal_notes?: string }) =>
      customFetch(`/api/training/registrations/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, internal_notes }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-registrations"] });
      qc.invalidateQueries({ queryKey: ["training-stats"] });
    },
  });

  const handleExport = () => {
    window.open(`/api/training/registrations/export/csv?${params.toString()}`, "_blank");
  };

  const clearFilters = () => {
    setSearch(""); setWorkshopFilter(""); setStatusFilter("");
    setMarketingFilter(""); setAssessmentFilter(""); setPartnerFilter("");
  };

  const hasFilters = !!(search || workshopFilter || statusFilter || marketingFilter || assessmentFilter || partnerFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Training</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage workshops and series registrations</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-fit">
        {(["workshops", "series"] as const).map(tab => (
          <button key={tab} onClick={() => setMainView(tab)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${mainView === tab ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            {tab === "workshops" ? "Workshops" : "Series Registrations"}
          </button>
        ))}
      </div>

      {/* Workshops tab */}
      {mainView === "workshops" && <WorkshopsSection />}

      {/* Series tab */}
      {mainView === "series" && (
        <>
          {/* Share panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Link size={14} className="text-teal-600" />
              <p className="text-sm font-semibold text-slate-700">Registration Page Link & QR Code</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 mb-2">Share this link with your network so people can register:</p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-sm font-mono text-slate-700 truncate">{TRAINING_URL}</span>
                  <button onClick={copyLink}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex-shrink-0 ${copied ? "bg-green-100 text-green-700 border border-green-200" : "bg-[#0c1a2e] text-white hover:bg-slate-700"}`}
                  >
                    {copied ? <><CheckCircle2 size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <a href={TRAINING_URL} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
                    <ExternalLink size={11} /> Open page
                  </a>
                </div>
              </div>
              <div className="flex-shrink-0">
                <button onClick={() => setShowQr(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-400 text-slate-600 hover:text-slate-800 transition-colors">
                  {showQr ? "Hide QR Code" : "Show QR Code"}
                </button>
                {showQr && (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    <img src="/images/training-qr.png" alt="QR code" className="w-36 h-36 rounded-xl border border-slate-200 shadow-sm" />
                    <a href="/images/training-qr.png" download="training-registration-qr.png"
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                      <Download size={11} /> Download
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={Users} label="Total" value={stats.total ?? 0} color="text-indigo-600" bg="bg-indigo-50" />
            <StatCard icon={BookOpen} label="Full Series" value={stats.full_series ?? 0} color="text-violet-600" bg="bg-violet-50" />
            <StatCard icon={Building2} label="Schools" value={stats.schools ?? 0} color="text-teal-600" bg="bg-teal-50" />
            <StatCard icon={Globe} label="Countries" value={stats.countries ?? 0} color="text-blue-600" bg="bg-blue-50" />
            <StatCard icon={Mail} label="Marketing Opt-ins" value={stats.marketing_opt_ins ?? 0} color="text-amber-600" bg="bg-amber-50" />
            <StatCard icon={CheckCircle2} label="Assessment Interest" value={stats.assessment_inquiries ?? 0} color="text-green-600" bg="bg-green-50" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{n}</div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Workshop {n}</p>
                  <p className="text-base font-bold text-slate-900">{(stats as any)[`workshop_${n}`] ?? 0}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Export + Filters */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-bold text-slate-900">ReMynd Assessment System Training Series — September–October 2026</p>
            <div className="flex gap-2">
              <a href="/training" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-600 hover:text-slate-900 hover:border-slate-400 transition-colors">
                <ExternalLink size={12} /> View Public Page
              </a>
              <button onClick={handleExport}
                className="flex items-center gap-1.5 text-xs bg-[#0c1a2e] text-white rounded-xl px-4 py-2 hover:bg-slate-800 transition-colors font-semibold">
                <Download size={12} /> Export CSV
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                  placeholder="Search name, email, school…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className={filterCls} value={workshopFilter} onChange={e => setWorkshopFilter(e.target.value)}>
                <option value="">All Workshops</option>
                {[1, 2, 3, 4].map(n => <option key={n} value={String(n)}>Workshop {n}</option>)}
              </select>
              <select className={filterCls} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
              <select className={filterCls} value={marketingFilter} onChange={e => setMarketingFilter(e.target.value)}>
                <option value="">Marketing Consent</option>
                <option value="true">Opted in</option>
                <option value="false">Not opted in</option>
              </select>
              <select className={filterCls} value={assessmentFilter} onChange={e => setAssessmentFilter(e.target.value)}>
                <option value="">Assessment Interest</option>
                <option value="true">Interested</option>
              </select>
              <select className={filterCls} value={partnerFilter} onChange={e => setPartnerFilter(e.target.value)}>
                <option value="">Partner School</option>
                <option value="true">Interested</option>
              </select>
              {hasFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-3 py-2 border border-slate-200 rounded-xl transition-colors">
                  <X size={11} /> Clear
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400">{registrations.length} registration{registrations.length !== 1 ? "s" : ""} shown</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading…</div>
            ) : registrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Users size={32} className="mb-3 opacity-30" />
                <p className="text-sm">No registrations found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className={thCls}>Name</th>
                      <th className={thCls}>School / Role</th>
                      <th className={thCls}>Country</th>
                      <th className={thCls}>Workshops</th>
                      <th className={thCls}>Consents</th>
                      <th className={thCls}>Status</th>
                      <th className={thCls}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map(r => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelected(r)}>
                        <td className={tdCls}>
                          <p className="font-medium text-slate-900 text-sm">{r.first_name} {r.last_name}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[160px]">{r.email}</p>
                        </td>
                        <td className={tdCls}>
                          <p className="text-sm text-slate-800 truncate max-w-[180px]">{r.school_name ?? "—"}</p>
                          <p className="text-xs text-slate-400">{r.professional_role ?? r.job_title ?? "—"}</p>
                        </td>
                        <td className={tdCls}><p className="text-sm text-slate-700">{r.country ?? "—"}</p></td>
                        <td className={tdCls}>
                          <div className="flex gap-1 flex-wrap">
                            {r.full_series_selected
                              ? <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">All 4</span>
                              : [1, 2, 3, 4].filter(n => (r as any)[`workshop_${n}_selected`]).map(n => (
                                <span key={n} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">W{n}</span>
                              ))}
                          </div>
                        </td>
                        <td className={tdCls}>
                          <div className="flex gap-1.5 items-center">
                            <span title={`Marketing: ${r.marketing_consent ? "Yes" : "No"}`}>
                              {r.marketing_consent ? <MailCheck size={13} className="text-teal-500" /> : <MailX size={13} className="text-slate-300" />}
                            </span>
                            {r.interested_assessment_services && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-medium">ASMT</span>}
                            {r.interested_partner_school && <span className="text-[9px] bg-violet-100 text-violet-700 px-1 py-0.5 rounded font-medium">PRTNR</span>}
                          </div>
                        </td>
                        <td className={tdCls}>
                          <select className={`text-xs px-2 py-1 rounded-lg border border-slate-200 ${STATUS_COLORS[r.status] ?? ""} cursor-pointer`}
                            value={r.status} onClick={e => e.stopPropagation()}
                            onChange={e => statusMutation.mutate({ id: r.id, status: e.target.value })}>
                            {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                          </select>
                        </td>
                        <td className={tdCls}>
                          <p className="text-xs text-slate-500 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selected && (
            <RegistrantDetail reg={selected} onClose={() => setSelected(null)}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })} />
          )}
        </>
      )}
    </div>
  );
}

// ── WorkshopsSection ──────────────────────────────────────────────────────────
function WorkshopsSection() {
  const qc = useQueryClient();
  const [wview, setWview] = useState<"list" | "detail">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-workshops"],
    queryFn: () => customFetch("/api/training/workshops"),
  });
  const workshops: Workshop[] = data?.workshops ?? [];
  const selectedWorkshop = workshops.find(w => w.id === selectedId) ?? null;

  const publishMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/training/workshops/${id}/publish`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-workshops"] }),
  });
  const unpublishMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/training/workshops/${id}/unpublish`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-workshops"] }),
  });
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/training/workshops/${id}/duplicate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-workshops"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/training/workshops/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-workshops"] }),
  });

  const openCreate = () => { setEditingWorkshop(null); setBuilderOpen(true); };
  const openEdit = (w: Workshop) => { setEditingWorkshop(w); setBuilderOpen(true); };
  const openDetail = (id: string) => { setSelectedId(id); setWview("detail"); };
  const backToList = () => { setSelectedId(null); setWview("list"); };

  if (wview === "detail" && selectedWorkshop) {
    return (
      <WorkshopDetail
        workshop={selectedWorkshop}
        onBack={backToList}
        onEdit={() => openEdit(selectedWorkshop)}
        onPublish={() => publishMutation.mutate(selectedWorkshop.id)}
        onUnpublish={() => unpublishMutation.mutate(selectedWorkshop.id)}
        onRefresh={() => qc.invalidateQueries({ queryKey: ["admin-workshops"] })}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-slate-500">Create and manage ReMynd workshops and their registrations.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 text-sm bg-[#0c1a2e] text-white rounded-xl px-4 py-2 hover:bg-slate-800 transition-colors font-semibold">
          <Plus size={14} /> Create New Workshop
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      )}

      {!isLoading && workshops.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Calendar size={24} className="text-slate-400" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-800">No workshops yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first workshop to get started.</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 text-sm bg-[#0c1a2e] text-white rounded-xl px-4 py-2 hover:bg-slate-800 transition-colors font-semibold">
            <Plus size={14} /> Create New Workshop
          </button>
        </div>
      )}

      {!isLoading && workshops.length > 0 && (
        <div className="space-y-3">
          {workshops.map(w => (
            <WorkshopCard key={w.id} workshop={w}
              onView={() => openDetail(w.id)}
              onEdit={() => openEdit(w)}
              onPublish={() => publishMutation.mutate(w.id)}
              onUnpublish={() => unpublishMutation.mutate(w.id)}
              onDuplicate={() => duplicateMutation.mutate(w.id)}
              onDelete={() => { if (window.confirm(`Delete "${w.title}"? This cannot be undone.`)) deleteMutation.mutate(w.id); }}
            />
          ))}
        </div>
      )}

      {builderOpen && (
        <WorkshopBuilder
          workshop={editingWorkshop}
          onClose={() => setBuilderOpen(false)}
          onSaved={() => { setBuilderOpen(false); qc.invalidateQueries({ queryKey: ["admin-workshops"] }); }}
        />
      )}
    </div>
  );
}

// ── WorkshopCard ──────────────────────────────────────────────────────────────
function WorkshopCard({ workshop: w, onView, onEdit, onPublish, onUnpublish, onDuplicate, onDelete }: {
  workshop: Workshop; onView: () => void; onEdit: () => void;
  onPublish: () => void; onUnpublish: () => void;
  onDuplicate: () => void; onDelete: () => void;
}) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const workshopUrl = getWorkshopPublicUrl(w.slug);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(workshopUrl)}&size=300x300`;

  const copyLink = () => {
    navigator.clipboard.writeText(workshopUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sessions = Array.isArray(w.session_dates) ? w.session_dates : [];
  const dateStr = sessions.filter(s => s.date).map(s => {
    const parts = [s.date];
    if (s.start_time) parts.push(`${s.start_time}${s.end_time ? `–${s.end_time}` : ""}`);
    return parts.join(" ");
  }).join(" · ");

  const imageUrl = w.image_object_id && w.status !== "draft"
    ? `/api/training/workshops/public/${w.slug}/image`
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col sm:flex-row hover:border-slate-300 transition-colors">
      {/* Thumbnail */}
      {imageUrl ? (
        <div className="sm:w-36 h-32 sm:h-auto bg-slate-100 flex-shrink-0 overflow-hidden">
          <img src={imageUrl} alt={w.image_alt ?? w.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="sm:w-36 h-32 sm:h-auto bg-gradient-to-br from-slate-100 to-slate-200 flex-shrink-0 flex items-center justify-center">
          <Calendar size={28} className="text-slate-300" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 min-w-0">
        <div className="flex items-start gap-3 justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${WS_STATUS_COLORS[w.status] ?? "bg-slate-100 text-slate-600"}`}>
                {w.status}
              </span>
              {!w.is_free && <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">
                {w.price} {w.currency}
              </span>}
              {w.is_free && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Free</span>}
            </div>
            <h3 className="font-bold text-slate-900 truncate">{w.title}</h3>
            {w.subtitle && <p className="text-xs text-slate-400 truncate">{w.subtitle}</p>}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onView} title="View registrations"
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
              <Users size={14} />
            </button>
            <button onClick={onEdit} title="Edit workshop"
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
              <Pencil size={14} />
            </button>
            <a href={workshopUrl} target="_blank" rel="noopener noreferrer" title="Preview public page"
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
              <Eye size={14} />
            </a>
            {w.status === "published" || w.status === "full" ? (
              <button onClick={onUnpublish} title="Unpublish"
                className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 hover:text-amber-700 transition-colors">
                <AlertCircle size={14} />
              </button>
            ) : (
              <button onClick={onPublish} title="Publish"
                className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 hover:text-emerald-700 transition-colors">
                <Check size={14} />
              </button>
            )}
            <button onClick={copyLink} title="Copy link"
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
            <button onClick={() => setShowQr(v => !v)} title="QR code"
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
              <QrCode size={14} />
            </button>
            <button onClick={onDuplicate} title="Duplicate"
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
              <RefreshCw size={14} />
            </button>
            <button onClick={onDelete} title="Delete"
              className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="mt-2 flex gap-4 text-xs text-slate-500 flex-wrap items-center">
          {dateStr && <span className="flex items-center gap-1"><Calendar size={10} />{dateStr}</span>}
          {w.timezone && <span>{w.timezone}</span>}
          <span className="flex items-center gap-1">
            <Users size={10} />
            {w.registration_count}{w.max_participants ? `/${w.max_participants}` : ""} registered
          </span>
          {w.delivery_method && <span className="capitalize">{w.delivery_method.replace("_", " ")}</span>}
          {w.facilitator_name && <span>{w.facilitator_name}</span>}
        </div>

        {/* QR code panel */}
        {showQr && (
          <div className="mt-3 flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
            <img src={qrUrl} alt="QR code" className="w-20 h-20 rounded-lg" />
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">Public registration link</p>
              <p className="text-xs text-slate-500 break-all mb-2">{workshopUrl}</p>
              <a href={qrUrl} download={`workshop-${w.slug}-qr.png`}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                <Download size={11} /> Download QR
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── WorkshopDetail ────────────────────────────────────────────────────────────
function WorkshopDetail({ workshop: w, onBack, onEdit, onPublish, onUnpublish, onRefresh }: {
  workshop: Workshop; onBack: () => void; onEdit: () => void;
  onPublish: () => void; onUnpublish: () => void; onRefresh: () => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["workshop-registrations", w.id],
    queryFn: () => customFetch(`/api/training/workshops/${w.id}/registrations`),
  });
  const regs: WorkshopReg[] = data?.registrations ?? [];
  const workshopUrl = getWorkshopPublicUrl(w.slug);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(workshopUrl)}&size=300x300`;
  const [copied, setCopied] = useState(false);

  const statusMutation = useMutation({
    mutationFn: ({ regId, status }: { regId: string; status: string }) =>
      customFetch(`/api/training/workshops/${w.id}/registrations/${regId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workshop-registrations", w.id] }),
  });

  const REG_STATUSES = ["registered", "confirmed", "attended", "no_show", "pending_payment", "cancelled"];
  const PAY_COLORS: Record<string, string> = {
    free: "bg-slate-100 text-slate-500",
    pending: "bg-amber-100 text-amber-700",
    paid: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-600",
  };

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={14} /> All Workshops
        </button>
        <ChevronRight size={12} className="text-slate-300" />
        <span className="text-sm font-semibold text-slate-800 truncate">{w.title}</span>
      </div>

      {/* Workshop info card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${WS_STATUS_COLORS[w.status] ?? ""}`}>{w.status}</span>
              {!w.is_free && <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">{w.price} {w.currency}</span>}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{w.title}</h2>
            {w.subtitle && <p className="text-sm text-slate-500">{w.subtitle}</p>}
            {w.facilitator_name && <p className="text-xs text-slate-400 mt-1">{w.facilitator_name}</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={onEdit} className="flex items-center gap-1.5 text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-600 hover:border-slate-400 transition-colors">
              <Pencil size={12} /> Edit
            </button>
            <a href={workshopUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-600 hover:border-slate-400 transition-colors">
              <ExternalLink size={12} /> Preview
            </a>
            {w.status === "published" || w.status === "full"
              ? <button onClick={onUnpublish} className="flex items-center gap-1.5 text-xs bg-amber-100 text-amber-700 rounded-xl px-3 py-2 hover:bg-amber-200 transition-colors font-semibold">
                  <AlertCircle size={12} /> Unpublish
                </button>
              : <button onClick={onPublish} className="flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-xl px-3 py-2 hover:bg-emerald-200 transition-colors font-semibold">
                  <Check size={12} /> Publish
                </button>
            }
            <button onClick={() => { navigator.clipboard.writeText(workshopUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="flex items-center gap-1.5 text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-600 hover:border-slate-400 transition-colors">
              {copied ? <><Check size={12} className="text-emerald-500" /> Copied!</> : <><Copy size={12} /> Copy Link</>}
            </button>
            <a href={`/api/training/workshops/${w.id}/registrations/export/csv`}
              className="flex items-center gap-1.5 text-xs bg-[#0c1a2e] text-white rounded-xl px-3 py-2 hover:bg-slate-800 transition-colors font-semibold">
              <Download size={12} /> Export CSV
            </a>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 mb-0.5">Registered</p>
            <p className="text-2xl font-bold text-slate-900">{w.registration_count}</p>
          </div>
          {w.max_participants && (
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">Capacity</p>
              <p className="text-2xl font-bold text-slate-900">{w.max_participants}</p>
            </div>
          )}
          {w.pl_hours != null && (
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">PL Hours</p>
              <p className="text-2xl font-bold text-slate-900">{w.pl_hours}</p>
            </div>
          )}
          <div className="bg-slate-50 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 mb-0.5">Cost</p>
            <p className="text-lg font-bold text-slate-900">{w.is_free ? "Free" : `${w.price} ${w.currency}`}</p>
          </div>
        </div>

        {/* QR code */}
        <div className="mt-4 flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100 w-fit">
          <img src={qrUrl} alt="QR code" className="w-16 h-16 rounded-lg" />
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Public QR Code</p>
            <a href={qrUrl} download={`workshop-${w.slug}-qr.png`}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
              <Download size={11} /> Download
            </a>
          </div>
        </div>
      </div>

      {/* Registrations table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="font-semibold text-slate-800 text-sm">Registrations ({regs.length})</p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 size={20} className="animate-spin" /></div>
        ) : regs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Users size={28} className="mb-2 opacity-30" />
            <p className="text-sm">No registrations yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className={thCls}>Name</th>
                  <th className={thCls}>School / Role</th>
                  <th className={thCls}>Country</th>
                  <th className={thCls}>Payment</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Registered</th>
                </tr>
              </thead>
              <tbody>
                {regs.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className={tdCls}>
                      <p className="font-medium text-slate-900 text-sm">{r.first_name} {r.last_name}</p>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </td>
                    <td className={tdCls}>
                      <p className="text-sm text-slate-700 truncate max-w-[160px]">{r.school_name ?? "—"}</p>
                      <p className="text-xs text-slate-400">{r.professional_role ?? "—"}</p>
                    </td>
                    <td className={tdCls}><p className="text-sm text-slate-600">{r.country ?? "—"}</p></td>
                    <td className={tdCls}>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PAY_COLORS[r.payment_status] ?? "bg-slate-100 text-slate-500"}`}>
                        {r.payment_status}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <select className={`text-xs px-2 py-1 rounded-lg border border-slate-200 ${STATUS_COLORS[r.status] ?? ""} cursor-pointer`}
                        value={r.status}
                        onChange={e => statusMutation.mutate({ regId: r.id, status: e.target.value })}>
                        {REG_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                    </td>
                    <td className={tdCls}>
                      <p className="text-xs text-slate-500 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── WorkshopBuilder ───────────────────────────────────────────────────────────
function WorkshopBuilder({ workshop, onClose, onSaved }: {
  workshop: Workshop | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!workshop;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const additionalInfoRef = useRef<HTMLTextAreaElement>(null);

  const [form, setForm] = useState<WorkshopFormState>(() => {
    if (!workshop) return defaultWorkshopForm;
    const sessions: SessionDate[] = Array.isArray(workshop.session_dates) && workshop.session_dates.length
      ? workshop.session_dates.map(s => ({ date: s.date ?? "", start_time: s.start_time ?? "", end_time: s.end_time ?? "" }))
      : [{ date: "", start_time: "", end_time: "" }];
    return {
      title: workshop.title ?? "",
      subtitle: workshop.subtitle ?? "",
      description: workshop.description ?? "",
      session_dates: sessions,
      timezone: workshop.timezone ?? "Asia/Hong_Kong",
      delivery_method: workshop.delivery_method ?? "online",
      venue_info: workshop.venue_info ?? "",
      facilitator_name: workshop.facilitator_name ?? "",
      pl_hours: workshop.pl_hours != null ? String(workshop.pl_hours) : "",
      registration_opens_at: workshop.registration_opens_at ? workshop.registration_opens_at.substring(0, 10) : "",
      registration_closes_at: workshop.registration_closes_at ? workshop.registration_closes_at.substring(0, 10) : "",
      max_participants: workshop.max_participants != null ? String(workshop.max_participants) : "",
      is_free: workshop.is_free,
      price: workshop.price != null ? String(workshop.price) : "",
      currency: workshop.currency ?? "USD",
      contact_email: workshop.contact_email ?? "",
      additional_info: workshop.additional_info ?? "",
      image_object_id: workshop.image_object_id ?? "",
      image_alt: workshop.image_alt ?? "",
      status: workshop.status ?? "draft",
    };
  });

  const setField = <K extends keyof WorkshopFormState>(key: K, value: WorkshopFormState[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const addSession = () => setField("session_dates", [...form.session_dates, { date: "", start_time: "", end_time: "" }]);
  const removeSession = (i: number) => setField("session_dates", form.session_dates.filter((_, idx) => idx !== i));
  const updateSession = (i: number, key: keyof SessionDate, val: string) => {
    const next = form.session_dates.map((s, idx) => idx === i ? { ...s, [key]: val } : s);
    setField("session_dates", next);
  };

  const insertMarkdown = (before: string, after = "") => {
    const ta = additionalInfoRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const selected = form.additional_info.substring(start, end);
    const newVal = form.additional_info.substring(0, start) + before + selected + after + form.additional_info.substring(end);
    setField("additional_info", newVal);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + selected.length); }, 0);
  };

  async function handleImageFile(file: File) {
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    setImageUploading(true);
    try {
      const { uploadURL, objectPath } = await customFetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setField("image_object_id", objectPath);
    } catch {
      setError("Image upload failed. Please try again.");
      setImagePreviewUrl(null);
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSave(publishAfter = false) {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        session_dates: form.session_dates.filter(s => s.date),
        pl_hours: form.pl_hours ? parseFloat(form.pl_hours) : null,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        price: form.price ? parseFloat(form.price) : null,
        status: publishAfter ? "published" : form.status,
      };

      if (isEdit) {
        await customFetch(`/api/training/workshops/${workshop!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await customFetch("/api/training/workshops", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save workshop.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400";
  const labelCls = "block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-black/40 backdrop-blur-sm">
      <div className="ml-auto w-full max-w-2xl bg-white flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0 bg-[#0c1a2e]">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              {isEdit ? "Edit Workshop" : "New Workshop"}
            </p>
            <p className="font-bold text-white text-base">{form.title || "Untitled Workshop"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <AlertCircle size={12} /> {error}
            </p>
          )}

          {/* Basic Info */}
          <FormSection title="Basic Information">
            <div>
              <label className={labelCls}>Title *</label>
              <input className={inputCls} value={form.title} onChange={e => setField("title", e.target.value)} placeholder="Workshop title" />
            </div>
            <div>
              <label className={labelCls}>Subtitle</label>
              <input className={inputCls} value={form.subtitle} onChange={e => setField("subtitle", e.target.value)} placeholder="Optional subtitle or tagline" />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea rows={3} className={inputCls} value={form.description} onChange={e => setField("description", e.target.value)} placeholder="Brief description of the workshop…" />
            </div>
          </FormSection>

          {/* Promotional Image */}
          <FormSection title="Promotional Image">
            {imagePreviewUrl ? (
              <img src={imagePreviewUrl} alt="Preview" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
            ) : form.image_object_id && !imagePreviewUrl ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 border border-emerald-200">
                <Check size={14} /> Image saved
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm cursor-pointer border border-dashed border-slate-300 rounded-xl px-4 py-3 hover:border-slate-400 hover:bg-slate-50 transition-colors text-slate-500">
              <Upload size={14} />
              <span>{imageUploading ? "Uploading…" : form.image_object_id ? "Replace image" : "Upload promotional image"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]); }} />
            </label>
            {form.image_object_id && (
              <div>
                <label className={labelCls}>Image alt text</label>
                <input className={inputCls} value={form.image_alt} onChange={e => setField("image_alt", e.target.value)} placeholder="Describe the image for accessibility" />
              </div>
            )}
          </FormSection>

          {/* Schedule */}
          <FormSection title="Schedule">
            <div>
              <label className={labelCls}>Session dates</label>
              <div className="space-y-2">
                {form.session_dates.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="date" value={s.date} onChange={e => updateSession(i, "date", e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 flex-1" />
                    <input type="time" value={s.start_time} onChange={e => updateSession(i, "start_time", e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 w-28" placeholder="Start" />
                    <input type="time" value={s.end_time} onChange={e => updateSession(i, "end_time", e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 w-28" placeholder="End" />
                    {form.session_dates.length > 1 && (
                      <button onClick={() => removeSession(i)} className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addSession} className="mt-2 flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
                <Plus size={12} /> Add session
              </button>
            </div>
            <div>
              <label className={labelCls}>Time zone</label>
              <select className={inputCls + " bg-white"} value={form.timezone} onChange={e => setField("timezone", e.target.value)}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </FormSection>

          {/* Delivery */}
          <FormSection title="Delivery">
            <div>
              <label className={labelCls}>Delivery method</label>
              <div className="flex gap-2">
                {[["online", "Online"], ["in_person", "In Person"], ["hybrid", "Hybrid"]].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setField("delivery_method", val)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${form.delivery_method === val ? "bg-[#0c1a2e] text-white border-[#0c1a2e]" : "border-slate-200 text-slate-600 hover:border-slate-400"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {(form.delivery_method === "in_person" || form.delivery_method === "hybrid") && (
              <div>
                <label className={labelCls}>Venue / Location</label>
                <input className={inputCls} value={form.venue_info} onChange={e => setField("venue_info", e.target.value)} placeholder="Address or venue name" />
              </div>
            )}
          </FormSection>

          {/* Details */}
          <FormSection title="Workshop Details">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Facilitator name</label>
                <input className={inputCls} value={form.facilitator_name} onChange={e => setField("facilitator_name", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>PL hours</label>
                <input type="number" min="0" step="0.5" className={inputCls} value={form.pl_hours} onChange={e => setField("pl_hours", e.target.value)} placeholder="e.g. 3" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Contact email</label>
              <input type="email" className={inputCls} value={form.contact_email} onChange={e => setField("contact_email", e.target.value)} placeholder="workshop@remyndassessments.com" />
            </div>
          </FormSection>

          {/* Registration */}
          <FormSection title="Registration">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Registration opens</label>
                <input type="date" className={inputCls} value={form.registration_opens_at} onChange={e => setField("registration_opens_at", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Registration closes</label>
                <input type="date" className={inputCls} value={form.registration_closes_at} onChange={e => setField("registration_closes_at", e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Max participants</label>
              <input type="number" min="1" className={inputCls} value={form.max_participants} onChange={e => setField("max_participants", e.target.value)} placeholder="Leave empty for unlimited" />
            </div>
          </FormSection>

          {/* Pricing */}
          <FormSection title="Pricing">
            <div className="flex gap-3">
              {[["true", "Free"], ["false", "Paid"]].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setField("is_free", val === "true")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${(val === "true") === form.is_free ? "bg-[#0c1a2e] text-white border-[#0c1a2e]" : "border-slate-200 text-slate-600 hover:border-slate-400"}`}>
                  {label}
                </button>
              ))}
            </div>
            {!form.is_free && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Price</label>
                  <input type="number" min="0" step="0.01" className={inputCls} value={form.price} onChange={e => setField("price", e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelCls}>Currency</label>
                  <select className={inputCls + " bg-white"} value={form.currency} onChange={e => setField("currency", e.target.value)}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}
          </FormSection>

          {/* Additional info */}
          <FormSection title="Additional Information">
            <p className="text-xs text-slate-400 -mt-1">Supports basic Markdown: **bold**, *italic*, ## headings, - bullet lists, [link](url)</p>
            <div className="flex gap-1 flex-wrap mb-1">
              {[["**", "**", "B"], ["*", "*", "I"], ["## ", "", "H2"], ["### ", "", "H3"], ["- ", "", "• List"], ["1. ", "", "1. List"]].map(([b, a, label]) => (
                <button key={label} type="button" onClick={() => insertMarkdown(b, a)}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors font-mono">
                  {label}
                </button>
              ))}
            </div>
            <textarea ref={additionalInfoRef} rows={8} className={inputCls + " font-mono text-xs resize-none"} value={form.additional_info}
              onChange={e => setField("additional_info", e.target.value)} placeholder="Optional additional content, programme details, FAQs…" />
          </FormSection>

          {/* Status */}
          <FormSection title="Status">
            <div className="grid grid-cols-2 gap-2">
              {["draft", "published", "full", "closed"].map(s => (
                <button key={s} type="button" onClick={() => setField("status", s)}
                  className={`py-2 rounded-xl text-sm font-semibold border transition-all capitalize ${form.status === s ? "bg-[#0c1a2e] text-white border-[#0c1a2e]" : "border-slate-200 text-slate-600 hover:border-slate-400"}`}>
                  {s}
                </button>
              ))}
            </div>
          </FormSection>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3 shrink-0 bg-slate-50">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={() => handleSave(false)} disabled={saving}
            className="flex-1 py-2.5 bg-slate-700 text-white rounded-xl text-sm font-semibold hover:bg-slate-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save as Draft
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="flex-1 py-2.5 bg-[#0c1a2e] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save & Publish
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Form section helper ───────────────────────────────────────────────────────
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{title}</p>
      {children}
    </div>
  );
}

// ── Detail Modal (existing series registrations) ───────────────────────────────
function RegistrantDetail({ reg, onClose, onStatusChange }: {
  reg: Registration; onClose: () => void; onStatusChange: (id: string, status: string) => void;
}) {
  const interests = Array.isArray(reg.areas_of_interest) ? reg.areas_of_interest : [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Registration Detail</p>
            <p className="font-bold text-slate-900">{reg.first_name} {reg.last_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <select className={`text-xs px-2 py-1 rounded-lg border border-slate-200 ${STATUS_COLORS[reg.status] ?? ""}`}
              value={reg.status} onChange={e => onStatusChange(reg.id, e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          <Section title="Contact Information">
            <Row label="Name" value={`${reg.first_name} ${reg.last_name}`} />
            <Row label="Email" value={reg.email} />
            <Row label="Job Title" value={reg.job_title} />
            <Row label="Role" value={reg.professional_role + (reg.professional_role_other ? ` — ${reg.professional_role_other}` : "")} />
          </Section>
          <Section title="School Information">
            <Row label="School" value={reg.school_name} />
            <Row label="City" value={reg.city} />
            <Row label="Country" value={reg.country} />
            <Row label="School Type" value={reg.school_type} />
            <Row label="School Size" value={reg.school_size} />
          </Section>
          <Section title="Workshop Selections">
            <div className="flex flex-wrap gap-2">
              {reg.full_series_selected
                ? <span className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1 rounded-full font-semibold">Complete 4-Part Series</span>
                : [1, 2, 3, 4].filter(n => (reg as any)[`workshop_${n}_selected`]).map(n => (
                  <span key={n} className="bg-slate-100 text-slate-700 text-xs px-3 py-1 rounded-full">Workshop {n} — {WS_LABELS[n - 1]}</span>
                ))
              }
              {![1, 2, 3, 4].some(n => (reg as any)[`workshop_${n}_selected`]) && !reg.full_series_selected && (
                <p className="text-xs text-slate-400">No workshops selected</p>
              )}
            </div>
          </Section>
          {interests.length > 0 && (
            <Section title="Areas of Interest">
              <div className="flex flex-wrap gap-1.5">
                {interests.map((a: string) => (
                  <span key={a} className="bg-teal-50 text-teal-700 text-xs px-2.5 py-1 rounded-full border border-teal-200">{a}</span>
                ))}
              </div>
            </Section>
          )}
          {reg.school_support_challenge && (
            <Section title="School Support Challenge">
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">{reg.school_support_challenge}</p>
            </Section>
          )}
          <Section title="Future Service Interest">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Future Learning Events", val: reg.interested_future_learning },
                { label: "School Training", val: reg.interested_school_training },
                { label: "Assessment Services", val: reg.interested_assessment_services },
                { label: "Partner School", val: reg.interested_partner_school },
                { label: "Training Series Only", val: reg.training_only },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center gap-2">
                  {val ? <CheckCircle2 size={12} className="text-teal-500" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                  <span className="text-xs text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Consent & Privacy">
            <Row label="Marketing Consent" value={reg.marketing_consent ? "Yes ✓" : "No"} />
            {reg.marketing_consent_timestamp && <Row label="Marketing Consent Timestamp" value={new Date(reg.marketing_consent_timestamp).toISOString()} />}
            <Row label="Privacy Consent" value={reg.privacy_consent ? "Yes ✓" : "No"} />
            {reg.privacy_consent_timestamp && <Row label="Privacy Consent Timestamp" value={new Date(reg.privacy_consent_timestamp).toISOString()} />}
          </Section>
          <Section title="Registration">
            <Row label="Source" value={reg.registration_source ?? "direct"} />
            <Row label="Registered At" value={new Date(reg.created_at).toISOString()} />
            <Row label="Last Updated" value={new Date(reg.updated_at).toISOString()} />
            <Row label="Confirmation Email" value={reg.confirmation_email_status ?? "—"} />
            <Row label="Admin Notification" value={reg.admin_notification_status ?? "—"} />
          </Section>
        </div>
      </div>
    </div>
  );
}

// ── UI Helpers ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: number; color: string; bg: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
        <Icon size={14} className={color} />
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-400 font-medium leading-tight">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-400 shrink-0 w-40 text-xs pt-0.5">{label}</span>
      <span className="text-slate-800 break-all">{value}</span>
    </div>
  );
}

const thCls = "text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3";
const tdCls = "px-4 py-3";
const filterCls = "text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-[130px]";
