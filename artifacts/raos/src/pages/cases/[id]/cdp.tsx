import { useParams, Link } from "wouter";
import { useGetCase, useGetCdpProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock, CircleDashed, Info } from "lucide-react";

const CDP_ORDER = ["CDP-CL", "CDP-SI", "CDP-SR", "CDP-CI"];

const CDP_FORM_LABELS: Record<string, { short: string; color: string }> = {
  "CDP-CL": { short: "Cognition & Learning",                    color: "bg-blue-500" },
  "CDP-SI": { short: "Social Interaction & Awareness",          color: "bg-violet-500" },
  "CDP-SR": { short: "Self-Regulation & Executive Function",    color: "bg-emerald-500" },
  "CDP-CI": { short: "Communication & Interaction",             color: "bg-amber-500" },
};

function getSeverity(pct: number): { label: string; color: string; bg: string; bar: string } {
  if (pct >= 75) return { label: "Typical",              color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",   bar: "bg-emerald-500" };
  if (pct >= 50) return { label: "Mild Concern",         color: "text-yellow-700",  bg: "bg-yellow-50 border-yellow-200",     bar: "bg-yellow-400" };
  if (pct >= 25) return { label: "Moderate Concern",     color: "text-orange-700",  bg: "bg-orange-50 border-orange-200",     bar: "bg-orange-500" };
  return           { label: "Significant Concern",       color: "text-red-700",     bg: "bg-red-50 border-red-200",           bar: "bg-red-500"    };
}

function DomainBar({ label, pct }: { label: string; pct: number }) {
  const sev = getSeverity(pct);
  return (
    <div className="mb-2.5">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[13px] text-slate-700 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${sev.bg} ${sev.color}`}>{sev.label}</span>
          <span className="text-[12px] text-slate-500 w-8 text-right">{pct}%</span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${sev.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 size={16} className="text-emerald-500" />;
  if (status === "pending")   return <Clock size={16} className="text-amber-400" />;
  return <CircleDashed size={16} className="text-slate-300" />;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Completed</span>;
  if (status === "pending")   return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Pending</span>;
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Not Assigned</span>;
}

const RESPONDENT_LABELS: Record<string, string> = {
  parent: "Parent / Guardian",
  teacher1: "Class Teacher",
  teacher2: "Support Teacher",
  special_needs_teacher: "Special Needs Teacher",
  school_counselor: "School Counselor",
};

export default function CdpProfilePage() {
  const { id: caseId } = useParams<{ id: string }>();
  const { data: caseData } = useGetCase(caseId!);
  const { data: profile, isLoading } = useGetCdpProfile(caseId!);

  const completedCount = profile?.forms.filter(f => f.status === "completed").length ?? 0;
  const totalCount = 4;

  // Aggregate severity counts across all completed domains
  const allDomainSeverities = { typical: 0, mild: 0, moderate: 0, significant: 0 };
  if (profile) {
    for (const form of profile.forms) {
      if (!form.score?.normalizedScores) continue;
      for (const pct of Object.values(form.score.normalizedScores)) {
        if (pct >= 75) allDomainSeverities.typical++;
        else if (pct >= 50) allDomainSeverities.mild++;
        else if (pct >= 25) allDomainSeverities.moderate++;
        else allDomainSeverities.significant++;
      }
    }
  }

  const caseName = caseData ? `${caseData.firstName ?? ""} ${caseData.lastName ?? ""}`.trim() || "Unnamed" : "Loading...";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Link href={`/cases/${caseId}`}>
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700 -ml-2 mb-2 gap-1.5">
                <ArrowLeft size={15} /> Back to Case
              </Button>
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-bold bg-violet-100 text-violet-700 px-2 py-1 rounded">CDP</span>
              <h1 className="text-2xl font-bold text-slate-900">Child Development Profile</h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              ReMynd CDP Battery · {caseName}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-sm font-medium text-slate-700">{completedCount} / {totalCount}</p>
            <p className="text-xs text-slate-400">forms completed</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Loading CDP profile...</div>
        ) : (
          <>
            {/* Summary Banner */}
            {completedCount > 0 && (
              <Card className="mb-6 border-violet-100 bg-violet-50/40">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Info size={15} className="text-violet-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-violet-800">Domain Summary — {completedCount} form{completedCount > 1 ? "s" : ""} scored</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Typical",            count: allDomainSeverities.typical,     color: "bg-emerald-100 border-emerald-200 text-emerald-800" },
                      { label: "Mild Concern",        count: allDomainSeverities.mild,        color: "bg-yellow-100 border-yellow-200 text-yellow-800" },
                      { label: "Moderate Concern",    count: allDomainSeverities.moderate,    color: "bg-orange-100 border-orange-200 text-orange-800" },
                      { label: "Significant Concern", count: allDomainSeverities.significant, color: "bg-red-100 border-red-200 text-red-800" },
                    ].map(item => (
                      <div key={item.label} className={`rounded-lg border p-3 text-center ${item.color}`}>
                        <p className="text-2xl font-bold">{item.count}</p>
                        <p className="text-[11px] font-medium mt-0.5">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Form Cards */}
            <div className="space-y-4">
              {CDP_ORDER.map(toolId => {
                const form = profile?.forms.find(f => f.toolId === toolId);
                const formLabel = CDP_FORM_LABELS[toolId];
                const cfg = form?.scoringConfig as any;
                const domainLabels: Record<string, string> = cfg?.domains
                  ? Object.fromEntries(Object.entries(cfg.domains).map(([k, v]: [string, any]) => [k, v.label ?? k]))
                  : {};
                const normalizedScores = form?.score?.normalizedScores ?? {};
                const hasDomains = Object.keys(normalizedScores).length > 0;

                return (
                  <Card key={toolId} className="overflow-hidden">
                    <CardHeader className="pb-3 pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${formLabel.color}`} />
                          <div>
                            <CardTitle className="text-base font-semibold text-slate-900">
                              {formLabel.short}
                            </CardTitle>
                            <p className="text-[12px] text-slate-400 mt-0.5 font-mono">{toolId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusIcon status={form?.status ?? "not_assigned"} />
                          <StatusBadge status={form?.status ?? "not_assigned"} />
                        </div>
                      </div>

                      {/* Respondent info */}
                      {form?.assignments && form.assignments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {form.assignments.map(a => (
                            <span key={a.id} className="inline-flex items-center gap-1 text-[12px] text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                              {RESPONDENT_LABELS[a.respondentType] ?? a.respondentType}
                              {a.assignedToName ? `: ${a.assignedToName}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="pt-0 pb-4">
                      {form?.status === "not_assigned" ? (
                        <p className="text-sm text-slate-400 italic">This form has not been assigned yet.</p>
                      ) : form?.status === "pending" ? (
                        <p className="text-sm text-slate-400 italic">Waiting for respondent to complete this form.</p>
                      ) : hasDomains ? (
                        <div>
                          <div className="border-t border-slate-100 pt-3">
                            {Object.entries(normalizedScores)
                              .filter(([k]) => k !== "general")
                              .sort((a, b) => b[1] - a[1])
                              .map(([domain, pct]) => (
                                <DomainBar
                                  key={domain}
                                  label={domainLabels[domain] ?? domain.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                                  pct={pct as number}
                                />
                              ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">Form completed — score not yet calculated.</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Scoring Legend */}
            <div className="mt-6 p-4 bg-white border border-slate-100 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Scoring Legend</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
                {[
                  { range: "≥ 75%", label: "Typical",              color: "bg-emerald-500" },
                  { range: "50–74%", label: "Mild Concern",        color: "bg-yellow-400" },
                  { range: "25–49%", label: "Moderate Concern",    color: "bg-orange-500" },
                  { range: "< 25%",  label: "Significant Concern", color: "bg-red-500" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${item.color}`} />
                    <span className="text-slate-600">{item.range} — {item.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2.5">CDP uses a higher-is-better model (Always = 3, Often = 2, Rarely = 1, Never = 0). Scores represent the percentage of maximum possible score per domain.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
