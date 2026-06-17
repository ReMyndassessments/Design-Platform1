import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, AlertTriangle, BarChart3, Brain, Printer, Sparkles, RefreshCw, TrendingUp } from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Cell,
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────

const DOMAIN_LABELS: Record<string, string> = {
  attention: "Attention",
  executive_function: "Executive Function",
  emotional_regulation: "Emotional Reg.",
  social_communication: "Social Comm.",
  academic_persistence: "Academic Persistence",
  sustained_attention: "Sustained Attention",
  distractibility: "Distractibility",
  impulse_regulation: "Impulse Regulation",
  task_initiation: "Task Initiation",
  behavioral_modulation: "Behavioral Modulation",
  attention_regulation: "Attention Regulation",
  executive_functioning: "Executive Functioning",
  functional_impact: "Functional Impact",
  protective_factors: "Protective Factors",
  working_memory: "Working Memory",
  planning: "Planning",
  inhibition: "Inhibition",
  cognitive_flexibility: "Cognitive Flexibility",
  self_monitoring: "Self-Monitoring",
  organization: "Organization",
  internalizing: "Internalizing",
  externalizing: "Externalizing",
  general: "General",
};

function dLabel(key: string): string {
  return DOMAIN_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const RESPONDENT_LABEL: Record<string, string> = {
  parent: "Parent",
  teacher1: "Teacher 1",
  teacher2: "Teacher 2",
  self: "Self-Report",
  school_counselor: "Counselor",
  boarding_staff: "Boarding Staff",
  referring_teacher: "Ref. Teacher",
  invigilator: "Invigilator",
};

function rLabel(key: string): string {
  return RESPONDENT_LABEL[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const RESPONDENT_COLORS: Record<string, string> = {
  parent: "#6366f1",
  teacher1: "#14b8a6",
  teacher2: "#8b5cf6",
  self: "#f59e0b",
  school_counselor: "#06b6d4",
  boarding_staff: "#84cc16",
  referring_teacher: "#f97316",
  invigilator: "#ec4899",
};

function rColor(key: string): string {
  return RESPONDENT_COLORS[key] ?? "#6b7280";
}

type RiskBand = "low" | "mild" | "moderate" | "elevated";

const RISK_META: Record<RiskBand, { label: string; bg: string; text: string; border: string; hex: string }> = {
  low:      { label: "Low",      bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", hex: "#10b981" },
  mild:     { label: "Mild",     bg: "bg-amber-50",   text: "text-amber-800",   border: "border-amber-200",   hex: "#f59e0b" },
  moderate: { label: "Moderate", bg: "bg-orange-50",  text: "text-orange-800",  border: "border-orange-200",  hex: "#f97316" },
  elevated: { label: "Elevated", bg: "bg-red-50",     text: "text-red-800",     border: "border-red-200",     hex: "#ef4444" },
};

function getRiskBand(score: number): RiskBand {
  if (score <= 25) return "low";
  if (score <= 50) return "mild";
  if (score <= 65) return "moderate";
  return "elevated";
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Respondent {
  respondentType: string;
  respondentLabel: string;
  normalizedScores: Record<string, number>;
  rawScore: number;
}

interface Discrepancy {
  domain: string;
  spread: number;
  isHigh: boolean;
  min: number;
  max: number;
}

interface ToolData {
  toolId: string;
  toolName: string;
  domains: string[];
  respondents: Respondent[];
  discrepancies: Discrepancy[];
}

interface IndexEntry {
  average: number;
  sources: string[];
  riskBand: string;
}

interface RemyndIndexResponse {
  tools: ToolData[];
  index: Record<string, IndexEntry>;
  cachedInsights: string | null;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function RiskBadge({ score }: { score: number }) {
  const band = getRiskBand(score);
  const m = RISK_META[band];
  return (
    <Badge className={`text-[10px] border ${m.bg} ${m.text} ${m.border} font-medium`}>
      {m.label}
    </Badge>
  );
}

function ToolComparisonCard({ tool }: { tool: ToolData }) {
  const respondentTypes = tool.respondents.map(r => r.respondentType);

  const chartData = tool.domains.map(domain => {
    const row: Record<string, string | number> = { domainLabel: dLabel(domain) };
    for (const r of tool.respondents) {
      const val = r.normalizedScores[domain];
      if (val !== undefined) row[r.respondentType] = val;
    }
    return row;
  });

  const highDiscrepDomains = tool.discrepancies.filter(d => d.isHigh);

  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <BarChart3 size={14} className="text-violet-500" />
          {tool.toolName}
          <span className="text-xs font-normal text-slate-500 ml-1">
            — {tool.respondents.length} respondent{tool.respondents.length !== 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 px-5 pb-5">
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No domain scores available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="domainLabel"
                tick={{ fontSize: 10, fill: "#64748b" }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#64748b" }}
                label={{ value: "Concern %", angle: -90, position: "insideLeft", offset: 14, fontSize: 10, fill: "#94a3b8" }}
              />
              <ReferenceLine y={25} stroke="#10b981" strokeDasharray="3 2" strokeWidth={1} />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 2" strokeWidth={1} />
              <ReferenceLine y={65} stroke="#f97316" strokeDasharray="3 2" strokeWidth={1} />
              <Tooltip
                formatter={(val: number, name: string) => [`${val}/100`, rLabel(name)]}
                contentStyle={{ fontSize: 11, borderRadius: 6 }}
              />
              <Legend
                formatter={(val: string) => <span style={{ fontSize: 11, color: "#475569" }}>{rLabel(val)}</span>}
                wrapperStyle={{ paddingTop: 36 }}
              />
              {respondentTypes.map(rt => (
                <Bar key={rt} dataKey={rt} fill={rColor(rt)} radius={[3, 3, 0, 0]} maxBarSize={28} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}

        {highDiscrepDomains.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {highDiscrepDomains.map(d => (
              <span key={d.domain} className="inline-flex items-center gap-1 text-[10px] bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                <AlertTriangle size={9} />
                {dLabel(d.domain)} — {Math.round(d.spread)}pt spread
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RemyndIndexSection({ index }: { index: Record<string, IndexEntry> }) {
  const entries = Object.entries(index).sort((a, b) => b[1].average - a[1].average);
  if (entries.length === 0) return null;

  const radarData = entries.map(([domain, e]) => ({
    domain: dLabel(domain),
    score: e.average,
    fullMark: 100,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Brain size={14} className="text-violet-500" />
              ReMynd Index — Cross-Tool Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="domain" tick={{ fontSize: 9, fill: "#64748b" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: "#94a3b8" }} />
                <Radar
                  name="Avg Concern"
                  dataKey="score"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip formatter={(v: number) => [`${v}/100`, "Avg Concern"]} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              </RadarChart>
            </ResponsiveContainer>
            <p className="text-center text-[10px] text-slate-400 mt-1">Larger area = higher cross-informant concern</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp size={14} className="text-violet-500" />
              Domain Risk Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 px-5 pb-5">
            <div className="space-y-2.5">
              {entries.map(([domain, e]) => {
                const band = getRiskBand(e.average);
                const m = RISK_META[band];
                return (
                  <div key={domain} className="flex items-center gap-3">
                    <div className="w-32 flex-shrink-0 text-xs text-slate-700 font-medium truncate">{dLabel(domain)}</div>
                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${e.average}%`, backgroundColor: m.hex }}
                      />
                    </div>
                    <div className="w-8 text-right text-[10px] text-slate-500 flex-shrink-0">{e.average}</div>
                    <div className="w-20 flex-shrink-0">
                      <RiskBadge score={e.average} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
          <CardTitle className="text-sm font-semibold text-slate-800">Risk Heatmap</CardTitle>
        </CardHeader>
        <CardContent className="pt-3 px-5 pb-5 overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-max">
            <thead>
              <tr>
                <th className="text-left py-1.5 pr-3 font-medium text-slate-500 w-36">Domain</th>
                <th className="py-1.5 px-2 font-medium text-slate-500 w-16">Avg</th>
                <th className="py-1.5 px-2 font-medium text-slate-500 w-20">Risk Band</th>
                <th className="py-1.5 px-2 font-medium text-slate-500 text-left">Sources</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([domain, e]) => {
                const band = getRiskBand(e.average);
                const m = RISK_META[band];
                return (
                  <tr key={domain} className={`border-t border-slate-100 ${m.bg}`}>
                    <td className={`py-1.5 pr-3 font-medium ${m.text}`}>{dLabel(domain)}</td>
                    <td className={`py-1.5 px-2 text-center font-bold ${m.text}`}>{e.average}</td>
                    <td className="py-1.5 px-2">
                      <Badge className={`text-[9px] border ${m.bg} ${m.text} ${m.border}`}>{m.label}</Badge>
                    </td>
                    <td className={`py-1.5 px-2 text-[10px] ${m.text} opacity-80`}>
                      {[...new Set(e.sources)].join("; ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function DiscrepancySection({ tools }: { tools: ToolData[] }) {
  const allDiscrepancies: Array<{ label: string; spread: number; isHigh: boolean }> = [];
  for (const tool of tools) {
    for (const d of tool.discrepancies) {
      allDiscrepancies.push({
        label: `${dLabel(d.domain)} (${tool.toolName})`,
        spread: d.spread,
        isHigh: d.isHigh,
      });
    }
  }
  const sorted = allDiscrepancies.sort((a, b) => b.spread - a.spread).slice(0, 12);
  if (sorted.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          Cross-Informant Discrepancy Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 px-5 pb-5">
        <p className="text-[11px] text-slate-500 mb-3">
          Domains where respondents disagree most (score spread in normalized %). ≥20pt spread is flagged.
        </p>
        <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 28)}>
          <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} unit="pt" />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: "#64748b" }} width={160} />
            <ReferenceLine x={20} stroke="#f97316" strokeDasharray="3 2" strokeWidth={1.5} />
            <Tooltip formatter={(v: number) => [`${Math.round(v)}pt`, "Spread"]} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
            <Bar dataKey="spread" radius={[0, 3, 3, 0]} maxBarSize={16}>
              {sorted.map((entry, idx) => (
                <Cell key={idx} fill={entry.isHigh ? "#f97316" : "#94a3b8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-slate-400 mt-2">Orange dashed line = 20pt threshold. Orange bars indicate clinically significant disagreement.</p>
      </CardContent>
    </Card>
  );
}

function AIInsightsSection({
  caseId,
  cachedInsights,
}: {
  caseId: string;
  cachedInsights: string | null;
}) {
  const queryClient = useQueryClient();
  const [localInsights, setLocalInsights] = useState<string | null>(cachedInsights);

  const generateMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}/remynd-index/insights`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to generate insights");
      }
      return res.json() as Promise<{ insights: string }>;
    },
    onSuccess: (data) => {
      setLocalInsights(data.insights);
      queryClient.invalidateQueries({ queryKey: ["remynd-index", caseId] });
    },
  });

  const insights = localInsights ?? cachedInsights;

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Sparkles size={14} className="text-violet-500" />
          AI Clinical Interpretation
          {insights && (
            <button
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending}
              className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 hover:text-violet-600 transition-colors no-print"
              title="Regenerate"
            >
              <RefreshCw size={10} />
              Regenerate
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 px-5 pb-5">
        {insights ? (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{insights}</p>
        ) : (
          <div className="text-center py-6">
            <Brain size={28} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-4">
              Generate an AI clinical interpretation narrative based on the cross-informant score data above.
            </p>
            <Button
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending}
              variant="outline"
              size="sm"
              className="border-violet-200 text-violet-700 hover:bg-violet-50 gap-1.5 no-print"
            >
              {generateMut.isPending ? (
                <><Loader2 size={13} className="animate-spin" /> Generating…</>
              ) : (
                <><Sparkles size={13} /> Generate Insights</>
              )}
            </Button>
          </div>
        )}
        {generateMut.isError && (
          <p className="mt-2 text-xs text-red-500">{generateMut.error?.message}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function RemyndDashboardPage() {
  const { id: caseId } = useParams<{ id: string }>();

  const { data: caseData, isLoading: loadingCase } = useQuery({
    queryKey: ["case", caseId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to load case");
      return res.json();
    },
    enabled: !!caseId,
  });

  const { data: indexData, isLoading: loadingIndex, error: indexError } = useQuery<RemyndIndexResponse>({
    queryKey: ["remynd-index", caseId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}/remynd-index`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to load ReMynd index");
      return res.json();
    },
    enabled: !!caseId,
  });

  const studentName = caseData?.studentName ?? "";
  const school = caseData?.school ?? "";
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const isLoading = loadingCase || loadingIndex;
  const hasData = (indexData?.tools?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          body, html { background: white !important; }
          .print-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
          .recharts-wrapper { break-inside: avoid; }
          .page-break-before { break-before: page; }
        }
        @media screen {
          .print-header { display: none; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 no-print">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600">
              <ArrowLeft size={14} /> Back to Case
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-slate-200 text-slate-600"
            onClick={() => window.print()}
          >
            <Printer size={13} /> Print / Export PDF
          </Button>
        </div>

        <div className="print-header mb-6 border-b pb-4">
          <div className="flex items-center gap-2 mb-1">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="h-5 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="text-sm font-semibold text-slate-700">ReMynd Assessment Operating System</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">ReMynd Scoring Dashboard</h1>
          <p className="text-sm text-slate-500">{studentName} · {school} · Generated {today}</p>
        </div>

        <div className="mb-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Brain size={18} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">ReMynd Scoring Dashboard</h1>
              {studentName && (
                <p className="text-sm text-slate-500">{studentName}{school ? ` · ${school}` : ""} · {today}</p>
              )}
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-violet-400" />
          </div>
        )}

        {!isLoading && indexError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 flex items-center gap-2 text-red-700 text-sm">
              <AlertTriangle size={16} /> Failed to load ReMynd scores. Please try refreshing.
            </CardContent>
          </Card>
        )}

        {!isLoading && !indexError && !hasData && (
          <Card className="border-dashed border-slate-200">
            <CardContent className="pt-10 pb-10 text-center">
              <BarChart3 size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600 mb-1">No ReMynd Scores Yet</p>
              <p className="text-xs text-slate-400">Complete at least one ReMynd auto-scored tool (e.g. RCS-80, REFI, RSCP) to see the dashboard.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !indexError && hasData && indexData && (
          <div className="space-y-6">
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-slate-800">Per-Tool Respondent Comparison</h2>
                <span className="text-xs text-slate-400">{indexData.tools.length} tool{indexData.tools.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-4">
                {indexData.tools.map(tool => (
                  <ToolComparisonCard key={tool.toolId} tool={tool} />
                ))}
              </div>
            </section>

            {Object.keys(indexData.index).length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-slate-800">ReMynd Index — Cross-Tool Summary</h2>
                </div>
                <RemyndIndexSection index={indexData.index} />
              </section>
            )}

            {indexData.tools.some(t => t.discrepancies.length > 0) && (
              <section className="page-break-before">
                <DiscrepancySection tools={indexData.tools} />
              </section>
            )}

            <section>
              <AIInsightsSection caseId={caseId ?? ""} cachedInsights={indexData.cachedInsights} />
            </section>

            <div className="text-[10px] text-slate-400 text-center pt-2 pb-6">
              ReMynd RAOS · Risk bands: Low (0–25) · Mild (26–50) · Moderate (51–65) · Elevated (66–100)
              · Scores normalized 0–100 where higher = greater reported concern.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
