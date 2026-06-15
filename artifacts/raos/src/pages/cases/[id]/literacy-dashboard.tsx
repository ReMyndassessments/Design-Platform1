import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, AlertTriangle, BookOpen, Printer, BarChart3 } from "lucide-react";

function calcAge(dob: string) {
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

type RiskLevel = "low" | "mild" | "moderate" | "significant" | null;

const RISK_LABEL: Record<string, string> = {
  low: "Low Concern",
  mild: "Mild Concern",
  moderate: "Moderate Concern",
  significant: "Significant Concern",
};

const RISK_COLOR: Record<string, { bar: string; badge: string; bg: string; text: string; border: string }> = {
  low:         { bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  mild:        { bar: "bg-amber-400",   badge: "bg-amber-100 text-amber-700 border-amber-200",       bg: "bg-amber-50",   text: "text-amber-800",   border: "border-amber-200"   },
  moderate:    { bar: "bg-orange-500",  badge: "bg-orange-100 text-orange-700 border-orange-200",     bg: "bg-orange-50",  text: "text-orange-800",  border: "border-orange-200"  },
  significant: { bar: "bg-red-500",     badge: "bg-red-100 text-red-700 border-red-200",               bg: "bg-red-50",     text: "text-red-800",     border: "border-red-200"     },
};

function riskToPercent(r: RiskLevel): number {
  if (r === "low") return 90;
  if (r === "mild") return 70;
  if (r === "moderate") return 55;
  if (r === "significant") return 30;
  return 0;
}

interface DomainRow {
  key: string;
  label: string;
  shortLabel: string;
  toolId: string;
  toolLabel: string;
  risk: RiskLevel;
  scoreText: string;
  detail: string;
  assignmentId?: string;
}

function DomainBar({ row }: { row: DomainRow }) {
  const pct = riskToPercent(row.risk);
  const c = row.risk ? RISK_COLOR[row.risk] : null;
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-b-0">
      <div className="w-36 flex-shrink-0">
        <div className="text-sm font-medium text-slate-700">{row.label}</div>
        <div className="text-xs text-slate-400">{row.toolLabel}</div>
      </div>
      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
        {row.risk ? (
          <div
            className={`h-full rounded-full transition-all duration-500 ${c!.bar}`}
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="h-full rounded-full bg-slate-200 w-full opacity-50" />
        )}
      </div>
      <div className="w-28 flex-shrink-0 text-right">
        {row.risk ? (
          <Badge className={`text-xs border ${c!.badge}`}>{RISK_LABEL[row.risk]}</Badge>
        ) : (
          <span className="text-xs text-slate-400 italic">Not assessed</span>
        )}
      </div>
      <div className="w-24 flex-shrink-0 text-right text-xs text-slate-500">{row.scoreText || "–"}</div>
    </div>
  );
}

function computeOverallRisk(rows: DomainRow[]): RiskLevel {
  const assessed = rows.filter(r => r.risk !== null);
  if (assessed.length === 0) return null;
  const order: RiskLevel[] = ["significant", "moderate", "mild", "low"];
  for (const level of order) {
    if (assessed.some(r => r.risk === level)) return level;
  }
  return "low";
}

function computeFlags(rows: DomainRow[]): string[] {
  const flags: string[] = [];
  const byKey: Record<string, RiskLevel> = {};
  for (const r of rows) byKey[r.key] = r.risk;

  const isConcern = (k: string) => byKey[k] === "moderate" || byKey[k] === "significant";

  if (isConcern("phonological") && isConcern("decoding"))
    flags.push("Elevated Dyslexia Risk — both phonological processing and decoding performance raise concern.");
  if (isConcern("phonological") && !isConcern("comprehension") && byKey["comprehension"] !== null)
    flags.push("Phonological Processing Weakness — phonological difficulties present without broad comprehension concern.");
  if (isConcern("decoding") && isConcern("fluency"))
    flags.push("Reading Automaticity Weakness — both decoding and fluency performance raise concern.");
  if (isConcern("comprehension") && !isConcern("decoding") && !isConcern("fluency") && byKey["decoding"] !== null && byKey["fluency"] !== null)
    flags.push("Language Comprehension Weakness — comprehension difficulties present despite adequate decoding and fluency.");
  if (isConcern("comprehension") && isConcern("fluency") && !isConcern("decoding"))
    flags.push("Comprehension may be affected by reading fluency difficulties.");
  const weakCount = rows.filter(r => isConcern(r.key)).length;
  if (weakCount >= 3)
    flags.push("Comprehensive Literacy Intervention Recommended — multiple literacy domains raise concern.");
  return flags;
}

export default function LiteracyDashboardPage() {
  const { id: caseId } = useParams<{ id: string }>();

  const { data: caseData, isLoading: loadingCase } = useQuery({
    queryKey: ["case", caseId],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      if (!r.ok) throw new Error("Failed to load case");
      return r.json();
    },
  });

  const { data: scoresData, isLoading: loadingScores } = useQuery({
    queryKey: ["literacy-scores", caseId],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/scores`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      if (!r.ok) throw new Error("Failed to load scores");
      return r.json();
    },
  });

  const { data: assignmentsData } = useQuery({
    queryKey: ["literacy-assignments", caseId],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      if (!r.ok) return null;
      return r.json();
    },
  });

  const isLoading = loadingCase || loadingScores;

  const getScore = (toolId: string) => {
    if (!scoresData) return null;
    const scores = Array.isArray(scoresData) ? scoresData : (scoresData.scores ?? []);
    return scores.find((s: { toolId: string }) => s.toolId === toolId) ?? null;
  };

  const getAssignmentId = (toolId: string): string | undefined => {
    if (!assignmentsData) return undefined;
    const all = Array.isArray(assignmentsData) ? assignmentsData : (assignmentsData.assignments ?? []);
    return all.find((a: { toolId: string; status: string }) => a.toolId === toolId && a.status === "completed")?.id;
  };

  const rppiScore = getScore("RPPI");
  const rdaScore = getScore("RDA");
  const rrfaScore = getScore("RRFA");
  const rrcaScore = getScore("RRCA");

  const parseNotes = (s: { notes?: string } | null) => {
    if (!s?.notes) return {};
    try { return JSON.parse(s.notes as string) as Record<string, unknown>; } catch { return {}; }
  };

  const rppiNotes = parseNotes(rppiScore);
  const rdaNotes = parseNotes(rdaScore);
  const rrfaNotes = parseNotes(rrfaScore);
  const rrcaNotes = parseNotes(rrcaScore);

  const rppiRisk = rppiScore ? (rppiNotes.overallRisk as RiskLevel ?? null) : null;
  const rdaRisk = rdaScore ? (rdaNotes.riskLevel as RiskLevel ?? null) : null;
  const rrfaRisk = rrfaScore ? (rrfaNotes.riskLevel as RiskLevel ?? null) : null;
  const rrcaRisk = rrcaScore ? (rrcaNotes.riskLevel as RiskLevel ?? null) : null;

  const domains: DomainRow[] = [
    {
      key: "phonological",
      label: "Phonological Processing",
      shortLabel: "Phonological",
      toolId: "RPPI",
      toolLabel: "RPPI",
      risk: rppiRisk,
      scoreText: rppiScore ? `${rppiNotes.overallRisk ? RISK_LABEL[rppiNotes.overallRisk as string] : "–"}` : "",
      detail: (rppiNotes.interpretationText as string) ?? "",
      assignmentId: getAssignmentId("RPPI"),
    },
    {
      key: "decoding",
      label: "Decoding",
      shortLabel: "Decoding",
      toolId: "RDA",
      toolLabel: "RDA",
      risk: rdaRisk,
      scoreText: rdaScore ? `${rdaNotes.rawScore ?? "–"}/${rdaNotes.maxScore ?? 20} (${rdaNotes.percentage ?? "–"}%)` : "",
      detail: (rdaNotes.interpretationText as string) ?? "",
      assignmentId: getAssignmentId("RDA"),
    },
    {
      key: "fluency",
      label: "Reading Fluency",
      shortLabel: "Fluency",
      toolId: "RRFA",
      toolLabel: "RRFA",
      risk: rrfaRisk,
      scoreText: rrfaScore ? `${rrfaNotes.wordsPerMinute ?? "–"} WPM · ${rrfaNotes.accuracyPercentage ?? "–"}%` : "",
      detail: (rrfaNotes.interpretationText as string) ?? "",
      assignmentId: getAssignmentId("RRFA"),
    },
    {
      key: "comprehension",
      label: "Reading Comprehension",
      shortLabel: "Comprehension",
      toolId: "RRCA",
      toolLabel: "RRCA",
      risk: rrcaRisk,
      scoreText: rrcaScore ? `${rrcaNotes.rawScore ?? "–"}/${rrcaNotes.maxScore ?? 10} (${rrcaNotes.percentage ?? "–"}%)` : "",
      detail: (rrcaNotes.interpretationText as string) ?? "",
      assignmentId: getAssignmentId("RRCA"),
    },
  ];

  const overallRisk = computeOverallRisk(domains);
  const flags = computeFlags(domains);
  const assessedCount = domains.filter(d => d.risk !== null).length;

  const studentName = caseData?.studentName ?? caseData?.case?.studentName ?? "";
  const dob = caseData?.dob ?? caseData?.case?.dob ?? "";

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500">
              <ArrowLeft size={14} /> Back to Case
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <BarChart3 size={15} className="text-violet-600" />
              <h1 className="text-sm font-semibold text-slate-800">Literacy Performance Dashboard</h1>
            </div>
            {studentName && (
              <p className="text-xs text-slate-500 truncate">
                {studentName}{dob ? ` · Age ${calcAge(dob)}` : ""} · Case {caseId.slice(0, 8)}
              </p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5 print:hidden">
            <Printer size={13} /> Print / Export
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Overall Risk Banner */}
        {overallRisk && (
          <div className={`mb-6 flex items-center gap-4 rounded-xl border px-5 py-4 ${RISK_COLOR[overallRisk].bg} ${RISK_COLOR[overallRisk].border}`}>
            <div className="flex-1">
              <div className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${RISK_COLOR[overallRisk].text} opacity-70`}>Overall Literacy Risk</div>
              <div className={`text-xl font-bold ${RISK_COLOR[overallRisk].text}`}>{RISK_LABEL[overallRisk]}</div>
              <div className={`text-xs mt-0.5 ${RISK_COLOR[overallRisk].text} opacity-70`}>{assessedCount} of 4 domains assessed</div>
            </div>
            <BookOpen size={28} className={`opacity-30 ${RISK_COLOR[overallRisk].text}`} />
          </div>
        )}

        {assessedCount === 0 && (
          <div className="mb-6 flex items-center gap-3 bg-slate-100 border border-slate-200 rounded-xl px-5 py-4 text-slate-500 text-sm">
            <BarChart3 size={16} />
            <span>No literacy assessments have been completed yet for this case. Administer RPPI, RDA, RRFA, and/or RRCA to see results here.</span>
          </div>
        )}

        {/* Profile Chart */}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <BarChart3 size={14} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Literacy Profile</span>
            <span className="ml-auto text-xs text-slate-400">Higher bar = stronger performance</span>
          </div>
          <div className="p-5">
            {domains.map(row => (
              <DomainBar key={row.key} row={row} />
            ))}
          </div>
          {/* Legend */}
          <div className="px-5 pb-4 flex items-center gap-4 flex-wrap">
            {(["low", "mild", "moderate", "significant"] as const).map(level => (
              <div key={level} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${RISK_COLOR[level].bar}`} />
                <span className="text-xs text-slate-500">{RISK_LABEL[level]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Domain Details */}
        <div className="mb-6 grid sm:grid-cols-2 gap-4">
          {domains.map(row => {
            const c = row.risk ? RISK_COLOR[row.risk] : null;
            const path = row.toolId === "RPPI" ? "rppi" : row.toolId === "RDA" ? "rda" : row.toolId === "RRFA" ? "rrfa" : "rrca";
            return (
              <div key={row.key} className={`bg-white border rounded-xl overflow-hidden ${row.risk ? c!.border : "border-slate-200"}`}>
                <div className={`px-4 py-3 border-b flex items-center gap-2 ${row.risk ? c!.bg + " " + c!.border : "bg-slate-50 border-slate-200"}`}>
                  <span className={`text-sm font-semibold ${row.risk ? c!.text : "text-slate-600"}`}>{row.label}</span>
                  <span className="text-xs text-slate-400 ml-0.5">· {row.toolLabel}</span>
                  <div className="ml-auto flex items-center gap-2">
                    {row.risk && <Badge className={`text-[10px] border ${c!.badge}`}>{RISK_LABEL[row.risk]}</Badge>}
                    {row.assignmentId ? (
                      <Link href={`/cases/${caseId}/${path}/${row.assignmentId}`}>
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-slate-500 hover:text-violet-600">View</Button>
                      </Link>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Not assessed</span>
                    )}
                  </div>
                </div>
                <div className="px-4 py-3">
                  {row.risk ? (
                    <>
                      {row.scoreText && <div className="text-xs font-mono text-slate-600 mb-2">{row.scoreText}</div>}
                      {row.detail && <p className="text-xs text-slate-600 leading-relaxed">{row.detail}</p>}
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Awaiting assessment</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Flags */}
        {flags.length > 0 && (
          <div className="mb-6 bg-white border border-orange-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-orange-50 border-b border-orange-200 flex items-center gap-2">
              <AlertTriangle size={14} className="text-orange-600" />
              <span className="text-sm font-semibold text-orange-800">Literacy Flags</span>
            </div>
            <div className="p-4 space-y-2">
              {flags.map((flag, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-orange-900">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                  {flag}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-900 text-xs">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>These assessments are non-diagnostic educational decision-support tools. They do not diagnose dyslexia, ADHD, language disorder, or any other condition. Results should be interpreted alongside developmental history, academic achievement, classroom performance, and other assessment findings.</span>
        </div>
      </div>
    </div>
  );
}
