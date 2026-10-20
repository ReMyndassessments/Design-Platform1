import { useParams, Link } from "wouter";
import { useGetCase, useGetCdpProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock, CircleDashed, Info, Printer, Users } from "lucide-react";
import { buildMultiInformantReport } from "@/lib/multi-informant-report";

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

  // Count coverage without pooling ratings across unlike domains or respondents.
  const respondentsWithScores = new Set<string>();
  let scoredFormResponseCount = 0;
  if (profile) {
    for (const form of profile.forms) {
      const rows = (form as any).respondentScores?.length
        ? (form as any).respondentScores
        : form.score?.normalizedScores ? [form.score] : [];
      for (const score of rows) {
        if (!score.normalizedScores) continue;
        scoredFormResponseCount++;
        respondentsWithScores.add(`${score.respondentType ?? "respondent"}\u0000${score.sourceLabel ?? ""}`);
      }
    }
  }

  const caseName = caseData ? caseData.studentName?.trim() || "Unnamed" : "Loading...";
  const cdpComparison = (() => {
    const sourceMap = new Map<string, { respondentType: string; sourceLabel: string; normalizedScores: Record<string, number> }>();
    const domainLabels: Record<string, string> = {};
    for (const form of (profile?.forms ?? []) as any[]) {
      const configDomains = form.scoringConfig?.domains ?? {};
      for (const respondentScore of form.respondentScores ?? []) {
        const sourceLabel = respondentScore.sourceLabel || RESPONDENT_LABELS[respondentScore.respondentType] || respondentScore.respondentType;
        const sourceKey = `${respondentScore.respondentType}\u0000${sourceLabel}`;
        if (!sourceMap.has(sourceKey)) {
          sourceMap.set(sourceKey, { respondentType: respondentScore.respondentType, sourceLabel, normalizedScores: {} });
        }
        const source = sourceMap.get(sourceKey)!;
        for (const [domain, value] of Object.entries(respondentScore.normalizedScores ?? {})) {
          if (domain === "general" || typeof value !== "number" || !Number.isFinite(value)) continue;
          const reportDomain = `${form.toolId}:${domain}`;
          const domainLabel = configDomains[domain]?.label ?? domain.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
          domainLabels[reportDomain] = `${CDP_FORM_LABELS[form.toolId]?.short ?? form.toolName} — ${domainLabel}`;
          source.normalizedScores[reportDomain] = value;
        }
      }
    }
    const scores = Array.from(sourceMap.values());
    return scores.length > 0
      ? buildMultiInformantReport(scores, {
          studentName: caseName,
          higherIsBetter: true,
          profile: "cdp",
          domainLabels,
        })
      : null;
  })();

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
            {/* Evidence coverage stays separate from descriptive scores; no cross-domain totals. */}
            {completedCount > 0 && (
              <Card className="mb-6 border-violet-100 bg-violet-50/40">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Info size={15} className="text-violet-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-violet-800">Evidence coverage</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700">
                    {completedCount} of {totalCount} CDP forms are complete, representing {respondentsWithScores.size} respondent{respondentsWithScores.size === 1 ? "" : "s"} across {scoredFormResponseCount} scored form response{scoredFormResponseCount === 1 ? "" : "s"}. The report keeps each respondent and developmental domain distinct; it does not total concern labels across unlike areas.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Combined comparative report: each informant remains a separate source. */}
            {completedCount > 0 && (
              <Card className="mb-6 border-violet-200" data-testid="cdp-comparative-report">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                      <Users size={17} className="text-violet-600" />
                      Combined Respondent Narrative and Recommendations
                    </CardTitle>
                    <p className="mt-1 text-xs text-slate-500">
                      Parent, teacher, and other completed CDP records are compared by matching domains. Their scores remain separate and are never averaged.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 gap-1.5 print:hidden" onClick={() => window.print()}>
                    <Printer size={14} /> Print report
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cdpComparison ? (
                    <>
                      <section className="rounded-lg border bg-violet-50/50 p-4">
                        <h3 className="mb-2 text-sm font-semibold text-slate-900">Integrated descriptive narrative</h3>
                        <div className="space-y-3 text-sm leading-relaxed text-slate-700">
                          {cdpComparison.summary.split("\n\n").map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                          ))}
                        </div>
                      </section>
                      {cdpComparison.strengths.length > 0 && (
                        <section className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                          <h3 className="mb-2 text-sm font-semibold text-slate-900">Reported capabilities to build on</h3>
                          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
                            {cdpComparison.strengths.map((strength, index) => (
                              <li key={`${strength.domain}-${strength.sourceLabel}-${index}`}>
                                <strong>{strength.label} — {strength.sourceLabel} ({strength.value}%):</strong> {strength.interpretation}
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                      <section>
                        <h3 className="mb-3 text-sm font-semibold text-slate-900">Interpretation and practical meaning by domain</h3>
                        {cdpComparison.domainFindings.length > 0 ? (
                          <div className="space-y-3">
                            {cdpComparison.domainFindings.map(finding => (
                              <article key={finding.domain} className="rounded-lg border border-slate-200 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <h4 className="text-sm font-semibold text-slate-800">{finding.label}</h4>
                                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${finding.pattern === "similar" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                                    {finding.pattern === "similar" ? "Similar reports" : "Different reports"}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {finding.ratings.map(rating => (
                                    <span key={rating.sourceKey} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                                      <strong>{rating.sourceLabel}:</strong> {rating.value}% · {rating.band}
                                    </span>
                                  ))}
                                </div>
                                <p className="mt-3 text-sm leading-relaxed text-slate-700">{finding.interpretation}</p>
                                {finding.supportIdea && (
                                  <p className="mt-3 border-l-2 border-violet-300 pl-3 text-sm leading-relaxed text-slate-700">
                                    <strong>Practical support to consider:</strong> {finding.supportIdea}
                                  </p>
                                )}
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                            The completed records do not share matching domains for direct comparison. Each respondent’s available scores are retained separately.
                          </p>
                        )}
                      </section>
                      {cdpComparison.singleSourceDomains.length > 0 && (
                        <section className="rounded-lg border border-slate-200 p-4">
                          <h3 className="text-sm font-semibold text-slate-800">Domains reported by one source only</h3>
                          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
                            {cdpComparison.singleSourceDomains.map(item => (
                              <li key={item.domain}>
                                <strong>{item.label} — {item.rating.sourceLabel}:</strong> {item.rating.value}% ({item.rating.band}). This is an individual report, not evidence of a shared pattern. Seek an additional observation or the learner's perspective if the area will guide planning.
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                      <section className="rounded-lg border border-violet-200 bg-violet-50/40 p-4">
                        <h3 className="mb-2 text-sm font-semibold text-slate-900">Recommendations</h3>
                        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
                          {cdpComparison.recommendations.map((recommendation, index) => <li key={index}>{recommendation}</li>)}
                        </ol>
                      </section>
                      <p className="text-xs leading-relaxed text-slate-500">
                        {cdpComparison.coverageNote} {cdpComparison.limitations} CDP percentages describe performance on this form and are not diagnostic conclusions.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm leading-relaxed text-slate-600">
                      A comparative narrative will appear when scored responses from at least two separate respondents are available. Completed responses are kept independently; no source is substituted for another.
                    </p>
                  )}
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
                const scoreRows = (form as any)?.respondentScores?.length
                  ? (form as any).respondentScores
                  : form?.score?.normalizedScores ? [{ ...form.score, sourceLabel: "Most recent scored record" }] : [];
                const hasDomains = scoreRows.some((score: any) => Object.keys(score.normalizedScores ?? {}).length > 0);

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
                        <div className="space-y-4 border-t border-slate-100 pt-3">
                          {scoreRows.map((score: any, index: number) => {
                            const sourceName = score.sourceLabel || RESPONDENT_LABELS[score.respondentType] || `Respondent ${index + 1}`;
                            const entries = Object.entries(score.normalizedScores ?? {})
                              .filter(([key]) => key !== "general")
                              .sort((a, b) => (b[1] as number) - (a[1] as number));
                            if (!entries.length) return null;
                            return (
                              <section key={`${sourceName}-${index}`} className="rounded-lg bg-slate-50 p-3">
                                <h3 className="mb-2 text-xs font-semibold text-slate-700">{sourceName}</h3>
                                {entries.map(([domain, pct]) => (
                                  <DomainBar
                                    key={domain}
                                    label={domainLabels[domain] ?? domain.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                                    pct={pct as number}
                                  />
                                ))}
                              </section>
                            );
                          })}
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
