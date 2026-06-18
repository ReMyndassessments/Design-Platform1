import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, Loader2, AlertTriangle, BarChart3, Brain, Printer, Sparkles, RefreshCw, TrendingUp, Settings2, Save } from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Cell,
} from "recharts";

// ── Constants ─────────────────────────────────────────────────────────────────

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

type RiskBand = "low" | "mild" | "moderate" | "elevated";

const RISK_META: Record<RiskBand, { label: string; bg: string; text: string; border: string; hex: string; tailwindBg: string }> = {
  low:      { label: "Low",      bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", hex: "#10b981", tailwindBg: "#ecfdf5" },
  mild:     { label: "Mild",     bg: "bg-amber-50",   text: "text-amber-800",   border: "border-amber-200",   hex: "#f59e0b", tailwindBg: "#fffbeb" },
  moderate: { label: "Moderate", bg: "bg-orange-50",  text: "text-orange-800",  border: "border-orange-200",  hex: "#f97316", tailwindBg: "#fff7ed" },
  elevated: { label: "Elevated", bg: "bg-red-50",     text: "text-red-800",     border: "border-red-200",     hex: "#ef4444", tailwindBg: "#fef2f2" },
};

const RISK_BAND_LEGEND = [
  { band: "low" as RiskBand, range: "0–25" },
  { band: "mild" as RiskBand, range: "26–50" },
  { band: "moderate" as RiskBand, range: "51–65" },
  { band: "elevated" as RiskBand, range: "66–100" },
];

type ToolThresholds = { low: number; mild: number; moderate: number };
const DEFAULT_THRESHOLDS: ToolThresholds = { low: 25, mild: 50, moderate: 65 };

function getRiskBand(score: number, t: ToolThresholds = DEFAULT_THRESHOLDS): RiskBand {
  if (score <= t.low) return "low";
  if (score <= t.mild) return "mild";
  if (score <= t.moderate) return "moderate";
  return "elevated";
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Respondent {
  respondentType: string;
  respondentLabel: string;
  domainScores: Record<string, number>;
  normalizedScores: Record<string, number>;
  rawScore: number;
}

interface Discrepancy {
  domain: string;
  rawSpread: number;
  isHigh: boolean;
  normalizedSpread: number;
}

interface ToolData {
  toolId: string;
  toolName: string;
  thresholds: ToolThresholds;
  domains: string[];
  respondents: Respondent[];
  discrepancies: Discrepancy[];
}

interface IndexEntry {
  average: number;
  sources: string[];
  riskBand: string;
}

interface DashboardConfig {
  excludedToolIds: string[];
  hiddenSections: string[];
}

interface RemyndIndexResponse {
  tools: ToolData[];
  index: Record<string, IndexEntry>;
  cachedInsights: string | null;
  dashboardConfig: DashboardConfig | null;
}

function computeFilteredIndex(tools: ToolData[]): Record<string, IndexEntry> {
  const domainAcc = new Map<string, {
    total: number; count: number; sources: string[];
    minMild: number; minModerate: number;
  }>();
  for (const tool of tools) {
    const t = tool.thresholds ?? DEFAULT_THRESHOLDS;
    for (const respondent of tool.respondents) {
      for (const [domain, score] of Object.entries(respondent.normalizedScores)) {
        if (!domainAcc.has(domain)) {
          domainAcc.set(domain, { total: 0, count: 0, sources: [], minMild: t.mild, minModerate: t.moderate });
        }
        const entry = domainAcc.get(domain)!;
        entry.total += score;
        entry.count++;
        entry.sources.push(`${tool.toolName} (${respondent.respondentLabel})`);
        entry.minMild = Math.min(entry.minMild, t.mild);
        entry.minModerate = Math.min(entry.minModerate, t.moderate);
      }
    }
  }
  const result: Record<string, IndexEntry> = {};
  for (const [domain, { total, count, sources, minMild, minModerate }] of domainAcc) {
    const average = Math.round(total / count);
    const thresholds: ToolThresholds = { low: DEFAULT_THRESHOLDS.low, mild: minMild, moderate: minModerate };
    result[domain] = { average, sources, riskBand: getRiskBand(average, thresholds) };
  }
  return result;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function RiskBadge({ score, size = "sm" }: { score: number; size?: "sm" | "xs" }) {
  const band = getRiskBand(score);
  const m = RISK_META[band];
  return (
    <Badge className={`border ${m.bg} ${m.text} ${m.border} font-medium ${size === "xs" ? "text-[9px] px-1 py-0" : "text-[10px]"}`}>
      {m.label}
    </Badge>
  );
}

/** Single-respondent: horizontal bar chart, bars colored by domain risk band */
function SingleRespondentChart({ tool }: { tool: ToolData }) {
  const r = tool.respondents[0];
  const t = tool.thresholds ?? DEFAULT_THRESHOLDS;
  const chartData = tool.domains.map(domain => ({
    domainLabel: dLabel(domain),
    value: r.normalizedScores[domain] ?? 0,
    band: getRiskBand(r.normalizedScores[domain] ?? 0, t),
  }));

  return (
    <div>
      <p className="text-[11px] text-slate-500 mb-2">
        Respondent: <span className="font-medium text-slate-700">{r.respondentLabel}</span>
        <span className="ml-2 text-slate-400">— bars colored by risk band</span>
      </p>
      <ResponsiveContainer width="100%" height={Math.max(180, tool.domains.length * 36)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 50, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} unit="%" />
          <YAxis type="category" dataKey="domainLabel" tick={{ fontSize: 10, fill: "#64748b" }} width={130} />
          <ReferenceLine x={t.low} stroke="#10b981" strokeDasharray="3 2" strokeWidth={1} />
          <ReferenceLine x={t.mild} stroke="#f59e0b" strokeDasharray="3 2" strokeWidth={1} />
          <ReferenceLine x={t.moderate} stroke="#f97316" strokeDasharray="3 2" strokeWidth={1} />
          <Tooltip
            formatter={(val: number) => {
              const band = getRiskBand(val, t);
              return [`${val}/100 — ${RISK_META[band].label}`, "Concern Level"];
            }}
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
          />
          <Bar dataKey="value" maxBarSize={18} radius={[0, 3, 3, 0]}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={RISK_META[entry.band].hex} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Multi-respondent: grouped vertical bar chart, each bar colored by its own risk band */
function MultiRespondentChart({ tool }: { tool: ToolData }) {
  const t = tool.thresholds ?? DEFAULT_THRESHOLDS;
  const respondentTypes = tool.respondents.map(r => r.respondentType);

  const chartData = tool.domains.map(domain => {
    const row: Record<string, string | number> = { domainLabel: dLabel(domain) };
    for (const r of tool.respondents) {
      const val = r.normalizedScores[domain];
      if (val !== undefined) row[r.respondentType] = val;
    }
    return row;
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[11px] text-slate-500">Bars colored by risk band · Bar order (L→R):</span>
        {respondentTypes.map((rt, i) => (
          <span key={rt} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
            {i + 1}. {rLabel(rt)}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 52 }}>
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
          <ReferenceLine y={t.low} stroke="#10b981" strokeDasharray="3 2" strokeWidth={1} />
          <ReferenceLine y={t.mild} stroke="#f59e0b" strokeDasharray="3 2" strokeWidth={1} />
          <ReferenceLine y={t.moderate} stroke="#f97316" strokeDasharray="3 2" strokeWidth={1} />
          <Tooltip
            formatter={(val: number, name: string) => {
              const band = getRiskBand(val, t);
              return [`${val}/100 — ${RISK_META[band].label}`, rLabel(name)];
            }}
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
          />
          {respondentTypes.map(rt => (
            <Bar key={rt} dataKey={rt} maxBarSize={20} radius={[3, 3, 0, 0]}>
              {chartData.map((entry, domainIdx) => {
                const score = (entry[rt] as number) ?? 0;
                const band = getRiskBand(score, t);
                return <Cell key={domainIdx} fill={RISK_META[band].hex} />;
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ToolComparisonCard({ tool }: { tool: ToolData }) {
  const isSingle = tool.respondents.length === 1;
  const highDiscrepDomains = tool.discrepancies.filter(d => d.isHigh);

  return (
    <Card className="overflow-hidden">
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
        {tool.domains.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No domain scores available.</p>
        ) : isSingle ? (
          <SingleRespondentChart tool={tool} />
        ) : (
          <MultiRespondentChart tool={tool} />
        )}

        {/* Risk band legend */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {RISK_BAND_LEGEND.map(({ band, range }) => (
            <span key={band} className="flex items-center gap-1 text-[10px] text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: RISK_META[band].hex }} />
              {RISK_META[band].label} ({range})
            </span>
          ))}
        </div>

        {highDiscrepDomains.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-amber-700 font-medium mr-1">⚠ Significant discrepancy (≥1.5 raw pts):</span>
            {highDiscrepDomains.map(d => (
              <span key={d.domain} className="inline-flex items-center gap-1 text-[10px] bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                {dLabel(d.domain)} ({d.rawSpread.toFixed(1)} raw pts)
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** True heatmap: rows = domains, columns = each tool × respondent combination */
function CrossToolHeatmap({ tools }: { tools: ToolData[] }) {
  // Build column definitions
  const columns = tools.flatMap(tool =>
    tool.respondents.map(r => ({
      key: `${tool.toolId}::${r.respondentType}`,
      toolName: tool.toolName,
      toolId: tool.toolId,
      respondentType: r.respondentType,
      respondentLabel: r.respondentLabel,
      normalizedScores: r.normalizedScores,
      thresholds: tool.thresholds ?? DEFAULT_THRESHOLDS,
    }))
  );

  // All unique domains across all tools
  const allDomains = [...new Set(tools.flatMap(t => t.domains))];

  if (columns.length === 0 || allDomains.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
        <CardTitle className="text-sm font-semibold text-slate-800">Risk Heatmap — Domain × Respondent Matrix</CardTitle>
      </CardHeader>
      <CardContent className="pt-3 px-5 pb-5 overflow-x-auto">
        <table className="text-xs border-collapse min-w-max w-full">
          <thead>
            <tr>
              <th className="text-left py-2 pr-3 font-medium text-slate-500 sticky left-0 bg-white w-36 min-w-[9rem]">
                Domain
              </th>
              {columns.map(col => (
                <th key={col.key} className="py-1.5 px-2 text-center font-medium text-slate-500 min-w-[80px]">
                  <div className="text-[10px] font-semibold text-violet-700 truncate max-w-[80px]">{col.toolName}</div>
                  <div className="text-[9px] font-normal text-slate-400 truncate max-w-[80px]">{col.respondentLabel}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allDomains.map(domain => (
              <tr key={domain} className="border-t border-slate-100">
                <td className="py-2 pr-3 font-medium text-slate-700 sticky left-0 bg-white text-[11px]">
                  {dLabel(domain)}
                </td>
                {columns.map(col => {
                  const score = col.normalizedScores[domain];
                  if (score === undefined) {
                    return (
                      <td key={col.key} className="py-1.5 px-2 text-center text-[10px] text-slate-300">—</td>
                    );
                  }
                  const band = getRiskBand(score, col.thresholds);
                  const m = RISK_META[band];
                  return (
                    <td
                      key={col.key}
                      className={`py-1.5 px-2 text-center font-semibold text-[11px] ${m.text}`}
                      style={{ backgroundColor: m.tailwindBg }}
                      title={`${dLabel(domain)} · ${col.toolName} · ${col.respondentLabel}: ${score}/100 (${m.label})`}
                    >
                      {score}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {RISK_BAND_LEGEND.map(({ band, range }) => (
            <span key={band} className="flex items-center gap-1 text-[10px] text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: RISK_META[band].hex }} />
              {RISK_META[band].label} ({range}) · "—" = not assessed by this tool
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RemyndIndexSection({ index, tools, hiddenCharts }: {
  index: Record<string, IndexEntry>;
  tools: ToolData[];
  hiddenCharts: Set<string>;
}) {
  const entries = Object.entries(index).sort((a, b) => b[1].average - a[1].average);
  if (entries.length === 0) return null;

  const showRadar = !hiddenCharts.has("remyndIndex.radar");
  const showBarSummary = !hiddenCharts.has("remyndIndex.barSummary");
  const showHeatmap = !hiddenCharts.has("remyndIndex.heatmap");

  const radarData = entries.map(([domain, e]) => ({
    domain: dLabel(domain),
    score: e.average,
    fullMark: 100,
  }));

  return (
    <div className="space-y-4">
      {(showRadar || showBarSummary) && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {showRadar && (
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
                  <Tooltip
                    formatter={(v: number) => {
                      const band = getRiskBand(v);
                      return [`${v}/100 — ${RISK_META[band].label}`, "Cross-Tool Avg"];
                    }}
                    contentStyle={{ fontSize: 11, borderRadius: 6 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <p className="text-center text-[10px] text-slate-400 mt-1">
                Larger area = higher cross-informant concern
              </p>
            </CardContent>
          </Card>
        )}

        {showBarSummary && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp size={14} className="text-violet-500" />
                Domain Average Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 px-5 pb-5">
              <div className="space-y-2.5">
                {entries.map(([domain, e]) => {
                  const band = (e.riskBand as RiskBand) in RISK_META ? (e.riskBand as RiskBand) : getRiskBand(e.average);
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
                        <Badge className={`border ${m.bg} ${m.text} ${m.border} font-medium text-[10px]`}>{m.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                {RISK_BAND_LEGEND.map(({ band, range }) => (
                  <span key={band} className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: RISK_META[band].hex }} />
                    {RISK_META[band].label} ({range})
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      )}

      {/* Heatmap matrix */}
      {showHeatmap && <CrossToolHeatmap tools={tools} />}
    </div>
  );
}

function DiscrepancySection({ tools }: { tools: ToolData[] }) {
  const allDiscrepancies: Array<{ label: string; normalizedSpread: number; isHigh: boolean }> = [];
  for (const tool of tools) {
    for (const d of tool.discrepancies) {
      allDiscrepancies.push({
        label: `${dLabel(d.domain)} (${tool.toolId})`,
        normalizedSpread: d.normalizedSpread,
        isHigh: d.isHigh,
      });
    }
  }
  const sorted = allDiscrepancies.sort((a, b) => b.normalizedSpread - a.normalizedSpread);
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
          Domains where respondents disagree most (raw domain spread ≥ 1.5 pts flagged; chart shows normalized equivalent).
        </p>
        <ResponsiveContainer width="100%" height={Math.max(160, sorted.length * 30)}>
          <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 50, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} unit="pt" />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: "#64748b" }} width={170} />
            <Tooltip
              formatter={(v: number, _n: string, p) => [
                `${Math.round(v)}pt normalized spread${p.payload.isHigh ? " — Clinically Significant" : ""}`,
                "Discrepancy",
              ]}
              contentStyle={{ fontSize: 11, borderRadius: 6 }}
            />
            <Bar dataKey="normalizedSpread" radius={[0, 3, 3, 0]} maxBarSize={16}>
              {sorted.map((entry, idx) => (
                <Cell key={idx} fill={entry.isHigh ? "#f97316" : "#94a3b8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-slate-400 mt-2">
          Orange = clinically significant discrepancy (raw spread ≥ 1.5 pts). Grey = within acceptable range.
        </p>
      </CardContent>
    </Card>
  );
}

function AIInsightsSection({ caseId, cachedInsights }: { caseId: string; cachedInsights: string | null }) {
  const queryClient = useQueryClient();
  const [localInsights, setLocalInsights] = useState<string | null>(null);

  const generateMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}/remynd-index/insights`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? "Failed to generate insights");
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

// ── Configure Panel (Sheet) ───────────────────────────────────────────────────


function ConfigurePanel({
  open,
  onOpenChange,
  allTools,
  config,
  onChange,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allTools: ToolData[];
  config: DashboardConfig;
  onChange: (config: DashboardConfig) => void;
  isSaving: boolean;
}) {
  const excludedSet = new Set(config.excludedToolIds);
  const hiddenSet = new Set(config.hiddenSections);

  function toggleTool(toolId: string) {
    const next = new Set(excludedSet);
    if (next.has(toolId)) {
      next.delete(toolId);
    } else {
      next.add(toolId);
    }
    onChange({ ...config, excludedToolIds: [...next] });
  }

  function toggleSection(key: string) {
    const next = new Set(hiddenSet);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange({ ...config, hiddenSections: [...next] });
  }

  function resetAll() {
    onChange({ excludedToolIds: [], hiddenSections: [] });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Settings2 size={15} className="text-violet-500" />
            Configure Dashboard
          </SheetTitle>
          <p className="text-xs text-slate-500 mt-1">
            Customise which tools and sections appear in this case's dashboard. Changes are saved automatically.
          </p>
        </SheetHeader>

        {/* Tool selection */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Tools</h3>
            <span className="text-[10px] text-slate-400">
              {allTools.length - excludedSet.size} / {allTools.length} included
            </span>
          </div>
          <div className="space-y-2">
            {allTools.map(tool => {
              const checked = !excludedSet.has(tool.toolId);
              return (
                <label
                  key={tool.toolId}
                  className="flex items-start gap-2.5 cursor-pointer group select-none"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleTool(tool.toolId)}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className={`text-sm font-medium leading-tight transition-colors ${checked ? "text-slate-800" : "text-slate-400 line-through"}`}>
                      {tool.toolName}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {tool.toolId} · {tool.respondents.length} respondent{tool.respondents.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 my-4" />

        {/* Section visibility */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2.5">Sections</h3>
          <div className="space-y-3">
            {/* ReMynd Index — master toggle + sub-chart toggles */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className={`text-sm transition-colors ${!hiddenSet.has("remyndIndex") ? "text-slate-700" : "text-slate-400"}`}>
                  ReMynd Index
                </span>
                <Switch
                  checked={!hiddenSet.has("remyndIndex")}
                  onCheckedChange={() => toggleSection("remyndIndex")}
                  className="shrink-0"
                />
              </div>
              {!hiddenSet.has("remyndIndex") && (
                <div className="ml-4 mt-2 space-y-2 border-l-2 border-slate-100 pl-3">
                  {([
                    ["remyndIndex.radar", "Radar Chart"],
                    ["remyndIndex.barSummary", "Domain Bar Summary"],
                    ["remyndIndex.heatmap", "Heatmap Matrix"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <span className={`text-xs transition-colors ${!hiddenSet.has(key) ? "text-slate-600" : "text-slate-400"}`}>
                        {label}
                      </span>
                      <Switch
                        checked={!hiddenSet.has(key)}
                        onCheckedChange={() => toggleSection(key)}
                        className="shrink-0 scale-90"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discrepancy and AI Insights */}
            {(["discrepancy", "aiInsights"] as const).map(key => {
              const labels: Record<string, string> = { discrepancy: "Discrepancy Analysis", aiInsights: "AI Clinical Interpretation" };
              const visible = !hiddenSet.has(key);
              return (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className={`text-sm transition-colors ${visible ? "text-slate-700" : "text-slate-400"}`}>
                    {labels[key]}
                  </span>
                  <Switch
                    checked={visible}
                    onCheckedChange={() => toggleSection(key)}
                    className="shrink-0"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 my-4" />

        <div className="flex items-center justify-between">
          <button
            onClick={resetAll}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Reset to defaults
          </button>
          {isSaving && (
            <span className="flex items-center gap-1 text-[10px] text-violet-500">
              <Save size={10} /> Saving…
            </span>
          )}
          {!isSaving && (
            <span className="text-[10px] text-slate-400">Auto-saved</span>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function RemyndDashboardPage() {
  const { id: caseId } = useParams<{ id: string }>();

  const authHeader = { Authorization: `Bearer ${localStorage.getItem("raos_token")}` };

  const { data: caseData, isLoading: loadingCase } = useQuery({
    queryKey: ["case", caseId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}`, { headers: authHeader });
      if (!res.ok) throw new Error("Failed to load case");
      return res.json();
    },
    enabled: !!caseId,
  });

  const { data: indexData, isLoading: loadingIndex, error: indexError } = useQuery<RemyndIndexResponse>({
    queryKey: ["remynd-index", caseId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}/remynd-index`, { headers: authHeader });
      if (!res.ok) throw new Error("Failed to load ReMynd index");
      return res.json();
    },
    enabled: !!caseId,
  });

  // ── Dashboard config state ────────────────────────────────────────────────
  const [configOpen, setConfigOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<DashboardConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configInitializedRef = useRef(false);

  // Initialize config from API response on first load
  useEffect(() => {
    if (!indexData || configInitializedRef.current) return;
    configInitializedRef.current = true;
    const saved = indexData.dashboardConfig;
    setLocalConfig({
      excludedToolIds: saved?.excludedToolIds ?? [],
      hiddenSections: saved?.hiddenSections ?? [],
    });
  }, [indexData]);

  // Debounced save when config changes
  const saveMut = useMutation({
    mutationFn: async (cfg: DashboardConfig) => {
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}/remynd-dashboard-config`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) throw new Error("Failed to save config");
    },
    onSettled: () => setIsSaving(false),
  });

  function handleConfigChange(next: DashboardConfig) {
    setLocalConfig(next);
    setIsSaving(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveMut.mutate(next);
    }, 800);
  }

  // ── Derived filtered data ─────────────────────────────────────────────────
  const allTools = indexData?.tools ?? [];
  const excludedSet = new Set(localConfig?.excludedToolIds ?? []);
  const activeTools = excludedSet.size > 0
    ? allTools.filter(t => !excludedSet.has(t.toolId))
    : allTools;
  const filteredIndex = computeFilteredIndex(activeTools);
  const hiddenSections = new Set(localConfig?.hiddenSections ?? []);

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
          .recharts-wrapper { break-inside: avoid; }
          .page-break-before { break-before: page; }
          /* Hide AppLayout sidebar (fixed left nav) */
          .fixed.z-40 { display: none !important; }
          /* Hide mobile menu button and any other fixed overlays */
          .fixed.z-50 { display: none !important; }
          /* Make the layout container block so content fills full width */
          .flex.min-h-screen { display: block !important; }
        }
        @media screen {
          .print-header { display: none; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Screen navigation */}
        <div className="flex items-center justify-between mb-6 no-print">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600">
              <ArrowLeft size={14} /> Back to Case
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {hasData && localConfig && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
                onClick={() => setConfigOpen(true)}
              >
                <Settings2 size={13} /> Configure
                {(localConfig.excludedToolIds.length > 0 || localConfig.hiddenSections.length > 0) && (
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-slate-200 text-slate-600"
              onClick={() => window.print()}
            >
              <Printer size={13} /> Print / Export PDF
            </Button>
          </div>
        </div>

        {/* Configure panel */}
        {hasData && localConfig && (
          <ConfigurePanel
            open={configOpen}
            onOpenChange={setConfigOpen}
            allTools={allTools}
            config={localConfig}
            onChange={handleConfigChange}
            isSaving={isSaving}
          />
        )}

        {/* Print-only header */}
        <div className="print-header mb-6 border-b pb-4">
          <div className="flex items-center gap-2 mb-1">
            <img
              src="/images/remynd-logo.png"
              alt="ReMynd"
              className="h-5 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="text-sm font-semibold text-slate-700">ReMynd Assessment Operating System</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">ReMynd Scoring Dashboard</h1>
          <p className="text-sm text-slate-500">
            {studentName} · {school} · Case ID: {caseId} · Generated {today}
          </p>
        </div>

        {/* Screen header */}
        <div className="mb-6 no-print">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Brain size={18} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">ReMynd Scoring Dashboard</h1>
              {studentName && (
                <p className="text-sm text-slate-500">
                  {studentName}{school ? ` · ${school}` : ""} · Case {caseId} · {today}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-violet-400" />
          </div>
        )}

        {/* Error */}
        {!isLoading && indexError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 flex items-center gap-2 text-red-700 text-sm">
              <AlertTriangle size={16} /> Failed to load ReMynd scores. Please try refreshing.
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !indexError && !hasData && (
          <Card className="border-dashed border-slate-200">
            <CardContent className="pt-10 pb-10 text-center">
              <BarChart3 size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600 mb-1">No ReMynd Scores Yet</p>
              <p className="text-xs text-slate-400">
                Complete at least one ReMynd auto-scored tool (e.g. RCS-80, REFI, RSCP) to see the dashboard.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Dashboard content */}
        {!isLoading && !indexError && hasData && indexData && (
          <div className="space-y-6">
            {/* Section 1: Per-tool respondent comparison */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-slate-800">Per-Tool Respondent Comparison</h2>
                <span className="text-xs text-slate-400">
                  {activeTools.length} of {allTools.length} tool{allTools.length !== 1 ? "s" : ""}
                </span>
              </div>

              {activeTools.length === 0 ? (
                <Card className="border-dashed border-violet-200 bg-violet-50/40">
                  <CardContent className="pt-8 pb-8 text-center">
                    <Settings2 size={24} className="text-violet-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-600 mb-1">All tools are hidden</p>
                    <p className="text-xs text-slate-400 mb-4">
                      Re-enable at least one tool in the dashboard configuration to see scores.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
                      onClick={() => setConfigOpen(true)}
                    >
                      <Settings2 size={12} /> Open Configure
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {activeTools.map(tool => (
                    <ToolComparisonCard key={tool.toolId} tool={tool} />
                  ))}
                </div>
              )}
            </section>

            {/* Section 2: ReMynd Index */}
            {!hiddenSections.has("remyndIndex") && Object.keys(filteredIndex).length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-slate-800">ReMynd Index — Cross-Tool Summary</h2>
                </div>
                <RemyndIndexSection index={filteredIndex} tools={activeTools} hiddenCharts={hiddenSections} />
              </section>
            )}

            {/* Section 3: Discrepancy analysis */}
            {!hiddenSections.has("discrepancy") && activeTools.some(t => t.discrepancies.length > 0) && (
              <section className="page-break-before">
                <DiscrepancySection tools={activeTools} />
              </section>
            )}

            {/* Section 4: AI commentary */}
            {!hiddenSections.has("aiInsights") && (
              <section>
                <AIInsightsSection caseId={caseId ?? ""} cachedInsights={indexData.cachedInsights} />
              </section>
            )}

            {/* Footer */}
            <div className="text-[10px] text-slate-400 text-center pt-2 pb-6">
              ReMynd RAOS · Risk bands: Low (0–25) · Mild (26–50) · Moderate (51–65) · Elevated (66–100)
              · Scores normalized 0–100 where higher = greater reported concern.
              · Discrepancy threshold: raw domain spread ≥ 1.5 pts.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
