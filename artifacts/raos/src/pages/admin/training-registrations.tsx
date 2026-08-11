import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import {
  Users, Globe, Building2, Download, Search, X, CheckCircle2,
  ChevronDown, Filter, Mail, MailCheck, MailX, ExternalLink, BookOpen,
} from "lucide-react";
import { useI18n } from "../../lib/i18n";

// ── Types ─────────────────────────────────────────────────────────────────────
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
  const { t } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [workshopFilter, setWorkshopFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [marketingFilter, setMarketingFilter] = useState("");
  const [assessmentFilter, setAssessmentFilter] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [selected, setSelected] = useState<Registration | null>(null);

  const { data: statsData } = useQuery({
    queryKey: ["training-stats"],
    queryFn: () => customFetch("/api/training/registrations/stats"),
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
          <h1 className="text-2xl font-bold text-slate-900">Training Registrations</h1>
          <p className="text-sm text-slate-500 mt-0.5">ReMynd Assessment System Training Series — September–October 2026</p>
        </div>
        <div className="flex gap-2">
          <a href="/training" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-600 hover:text-slate-900 hover:border-slate-400 transition-colors"
          >
            <ExternalLink size={12} /> View Public Page
          </a>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 text-xs bg-[#0c1a2e] text-white rounded-xl px-4 py-2 hover:bg-slate-800 transition-colors font-semibold"
          >
            <Download size={12} /> Export CSV
          </button>
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

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Search name, email, school…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
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

      {/* Table */}
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
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelected(r)}
                  >
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
                          ))
                        }
                      </div>
                    </td>
                    <td className={tdCls}>
                      <div className="flex gap-1.5 items-center">
                        <span title={`Marketing consent: ${r.marketing_consent ? "Yes" : "No"}`}>
                          {r.marketing_consent
                            ? <MailCheck size={13} className="text-teal-500" />
                            : <MailX size={13} className="text-slate-300" />
                          }
                        </span>
                        {r.interested_assessment_services && (
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-medium">ASMT</span>
                        )}
                        {r.interested_partner_school && (
                          <span className="text-[9px] bg-violet-100 text-violet-700 px-1 py-0.5 rounded font-medium">PRTNR</span>
                        )}
                      </div>
                    </td>
                    <td className={tdCls}>
                      <select
                        className={`text-xs px-2 py-1 rounded-lg border border-slate-200 ${STATUS_COLORS[r.status] ?? ""} cursor-pointer`}
                        value={r.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => statusMutation.mutate({ id: r.id, status: e.target.value })}
                      >
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

      {/* Detail Modal */}
      {selected && (
        <RegistrantDetail
          reg={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
        />
      )}
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function RegistrantDetail({ reg, onClose, onStatusChange }: {
  reg: Registration;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const interests = Array.isArray(reg.areas_of_interest) ? reg.areas_of_interest : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Registration Detail</p>
            <p className="font-bold text-slate-900">{reg.first_name} {reg.last_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className={`text-xs px-2 py-1 rounded-lg border border-slate-200 ${STATUS_COLORS[reg.status] ?? ""}`}
              value={reg.status}
              onChange={e => onStatusChange(reg.id, e.target.value)}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Contact */}
          <Section title="Contact Information">
            <Row label="Name" value={`${reg.first_name} ${reg.last_name}`} />
            <Row label="Email" value={reg.email} />
            <Row label="Job Title" value={reg.job_title} />
            <Row label="Role" value={reg.professional_role + (reg.professional_role_other ? ` — ${reg.professional_role_other}` : "")} />
          </Section>

          {/* School */}
          <Section title="School Information">
            <Row label="School" value={reg.school_name} />
            <Row label="City" value={reg.city} />
            <Row label="Country" value={reg.country} />
            <Row label="School Type" value={reg.school_type} />
            <Row label="School Size" value={reg.school_size} />
          </Section>

          {/* Workshops */}
          <Section title="Workshop Selections">
            <div className="flex flex-wrap gap-2">
              {reg.full_series_selected
                ? <span className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1 rounded-full font-semibold">Complete 4-Part Series</span>
                : [1, 2, 3, 4].filter(n => (reg as any)[`workshop_${n}_selected`]).map(n => (
                  <span key={n} className="bg-slate-100 text-slate-700 text-xs px-3 py-1 rounded-full">
                    Workshop {n} — {WS_LABELS[n - 1]}
                  </span>
                ))
              }
              {![1, 2, 3, 4].some(n => (reg as any)[`workshop_${n}_selected`]) && !reg.full_series_selected && (
                <p className="text-xs text-slate-400">No workshops selected</p>
              )}
            </div>
          </Section>

          {/* Interests */}
          {interests.length > 0 && (
            <Section title="Areas of Interest">
              <div className="flex flex-wrap gap-1.5">
                {interests.map((a: string) => (
                  <span key={a} className="bg-teal-50 text-teal-700 text-xs px-2.5 py-1 rounded-full border border-teal-200">{a}</span>
                ))}
              </div>
            </Section>
          )}

          {/* School challenge */}
          {reg.school_support_challenge && (
            <Section title="School Support Challenge">
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                {reg.school_support_challenge}
              </p>
            </Section>
          )}

          {/* Future interests */}
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

          {/* Consent */}
          <Section title="Consent & Privacy">
            <Row label="Marketing Consent" value={reg.marketing_consent ? "Yes ✓" : "No"} />
            {reg.marketing_consent_timestamp && (
              <Row label="Marketing Consent Timestamp" value={new Date(reg.marketing_consent_timestamp).toISOString()} />
            )}
            <Row label="Privacy Consent" value={reg.privacy_consent ? "Yes ✓" : "No"} />
            {reg.privacy_consent_timestamp && (
              <Row label="Privacy Consent Timestamp" value={new Date(reg.privacy_consent_timestamp).toISOString()} />
            )}
          </Section>

          {/* Registration meta */}
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
