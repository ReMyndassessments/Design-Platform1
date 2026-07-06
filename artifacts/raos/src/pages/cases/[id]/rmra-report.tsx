import { useState, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ScatterChart, Scatter, ZAxis, ReferenceLine,
} from "recharts";
import {
  Brain, Sparkles, ArrowLeft, ChevronDown, ChevronRight,
  AlertTriangle, BookOpen, Target, Lightbulb, Clock, CheckCircle2,
  Loader2, Calendar, User, Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

type DomainScore = {
  accuracy: number;
  reasoning: number;
  strategyLevel: number;
  hintDependency: number;
  productiveStruggle: number;
  confidence: number;
  tasksAdministered: number;
  tasksDiscontinued: number;
  level: "strength" | "developing" | "vulnerable" | "high_concern";
};

export type ReportNarrative = {
  overview: string;
  behavioralObservations: string;
  mathematicalProfile: string;
  strategyUseProfile: string;
  strengths: string[];
  areasOfNeed: string[];
  classroomRecommendations: string[];
  parentRecommendations: string[];
};

export type RmraReportSession = {
  id: string;
  caseId: string | null;
  ageBand: string;
  version: string;
  domainScores: Record<string, DomainScore> | null;
  generalNotes: string | null;
  completedAt: string | null;
  reportData?: {
    narrative: ReportNarrative;
    generatedAt: string;
  } | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const RMRA_DOMAINS = [
  "Number Sense", "Place Value", "Addition Reasoning", "Subtraction Reasoning",
  "Multiplicative Thinking", "Division Thinking", "Fractions", "Measurement",
  "Patterns & Early Algebra", "Geometry & Spatial Reasoning", "Mathematical Language",
  "Problem Solving & Executive Function", "Response to Productive Struggle",
] as const;

const DOMAIN_SHORT: Record<string, string> = {
  "Number Sense": "Num Sense",
  "Place Value": "Place Value",
  "Addition Reasoning": "Addition",
  "Subtraction Reasoning": "Subtraction",
  "Multiplicative Thinking": "Multiplicative",
  "Division Thinking": "Division",
  "Fractions": "Fractions",
  "Measurement": "Measurement",
  "Patterns & Early Algebra": "Patterns/Algebra",
  "Geometry & Spatial Reasoning": "Geometry",
  "Mathematical Language": "Math Language",
  "Problem Solving & Executive Function": "Problem Solving",
  "Response to Productive Struggle": "Prod. Struggle",
};

const LEVEL_COLORS: Record<string, string> = {
  strength: "#10b981",
  developing: "#3b82f6",
  vulnerable: "#f97316",
  high_concern: "#ef4444",
};

const LEVEL_LABELS: Record<string, string> = {
  strength: "Strength",
  developing: "Developing",
  vulnerable: "Vulnerable",
  high_concern: "High Concern",
};

const LEVEL_BG: Record<string, string> = {
  strength: "bg-emerald-100 text-emerald-700 border-emerald-200",
  developing: "bg-blue-100 text-blue-700 border-blue-200",
  vulnerable: "bg-orange-100 text-orange-700 border-orange-200",
  high_concern: "bg-red-100 text-red-700 border-red-200",
};

// ── Dyscalculia Risk Engine — 12 Indicator Dimensions ─────────────────────────
//
// Dimensions mapped to RMRA domains (per spec):
//   1.  Number sense       → Number Sense
//   2.  Magnitude comp.    → Number Sense (accuracy component proxy)
//   3.  Subitizing         → Number Sense (hint dependency proxy)
//   4.  Place value        → Place Value
//   5.  Counting strategies→ Addition Reasoning + Subtraction Reasoning
//   6.  Fact retrieval     → Addition + Subtraction + Multiplicative (accuracy avg)
//   7.  Estimation         → Number Sense + Measurement
//   8.  Math language      → Mathematical Language
//   9.  Sequencing         → Patterns & Early Algebra
//   10. Visual-spatial     → Geometry & Spatial Reasoning
//   11. Working memory     → Problem Solving & Executive Function
//   12. Procedural consist.→ avg hintDependency across core domains (proxy)

type DyscRiskLevel = "low" | "mild" | "moderate" | "high";

const DYSC_RISK_META: Record<DyscRiskLevel, {
  label: string;
  description: string;
  headerClass: string;
  badgeClass: string;
  borderClass: string;
}> = {
  low: {
    label: "Low Risk",
    description: "Performance data does not indicate significant dyscalculia risk indicators across the 12 assessed dimensions. Continue with universal screening and monitor progress.",
    headerClass: "bg-emerald-50 border-b border-emerald-100",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    borderClass: "border-emerald-200",
  },
  mild: {
    label: "Mild Risk",
    description: "Some indicators of mathematical difficulty are present across several dimensions. Targeted support and additional diagnostic assessment are recommended.",
    headerClass: "bg-amber-50 border-b border-amber-100",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    borderClass: "border-amber-200",
  },
  moderate: {
    label: "Moderate Risk",
    description: "Multiple risk indicators present across core mathematical indicator dimensions. A comprehensive psychoeducational evaluation is recommended.",
    headerClass: "bg-orange-50 border-b border-orange-100",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
    borderClass: "border-orange-200",
  },
  high: {
    label: "High Risk",
    description: "Significant risk indicators present across a broad range of dimensions, including foundational numerical cognition, working memory, and procedural consistency. Formal neuropsychological evaluation for dyscalculia is strongly recommended.",
    headerClass: "bg-red-50 border-b border-red-100",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    borderClass: "border-red-200",
  },
};

type DyscIndicator = {
  key: string;
  label: string;
  flagged: boolean;
  score: number;
};

function computeDyscalculiaRisk(scores: Record<string, DomainScore>): {
  level: DyscRiskLevel;
  indicators: DyscIndicator[];
  flaggedCount: number;
  behaviourFlags: string[];
} {
  const domainGet = (name: string) => scores[name];
  const avgAcc = (...names: string[]) => {
    const vals = names.map(n => domainGet(n)?.accuracy ?? null).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const avgHint = (...names: string[]) => {
    const vals = names.map(n => domainGet(n)?.hintDependency ?? null).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const isWeakLevel = (d: DomainScore | undefined) =>
    d?.level === "vulnerable" || d?.level === "high_concern";

  const ns = domainGet("Number Sense");
  const pv = domainGet("Place Value");
  const add = domainGet("Addition Reasoning");
  const sub = domainGet("Subtraction Reasoning");
  const mult = domainGet("Multiplicative Thinking");
  const div = domainGet("Division Thinking");
  const frac = domainGet("Fractions");
  const meas = domainGet("Measurement");
  const pat = domainGet("Patterns & Early Algebra");
  const geo = domainGet("Geometry & Spatial Reasoning");
  const ml = domainGet("Mathematical Language");
  const ps = domainGet("Problem Solving & Executive Function");

  const indicators: DyscIndicator[] = [
    {
      key: "number_sense",
      label: "Number Sense & Cardinality",
      score: ns?.accuracy ?? 0,
      flagged: isWeakLevel(ns),
    },
    {
      key: "magnitude_comparison",
      label: "Magnitude Comparison",
      score: ns ? Math.max(0, ns.accuracy - 10) : 0,
      flagged: !!ns && ns.accuracy < 50,
    },
    {
      key: "subitizing",
      label: "Subitizing & Rapid Enumeration",
      score: ns ? Math.max(0, 100 - (ns.hintDependency ?? 0)) : 50,
      flagged: !!ns && (ns.hintDependency ?? 0) > 60 && ns.accuracy < 55,
    },
    {
      key: "place_value",
      label: "Place Value Understanding",
      score: pv?.accuracy ?? 0,
      flagged: isWeakLevel(pv),
    },
    {
      key: "counting_strategies",
      label: "Counting Strategies",
      score: avgAcc("Addition Reasoning", "Subtraction Reasoning") ?? 0,
      flagged: isWeakLevel(add) && isWeakLevel(sub),
    },
    {
      key: "fact_retrieval",
      label: "Arithmetic Fact Retrieval",
      score: avgAcc("Addition Reasoning", "Subtraction Reasoning", "Multiplicative Thinking") ?? 0,
      flagged: [add, sub, mult].filter(d => d && d.level === "high_concern").length >= 2,
    },
    {
      key: "estimation",
      label: "Estimation & Approximation",
      score: avgAcc("Number Sense", "Measurement") ?? 0,
      flagged: isWeakLevel(ns) && isWeakLevel(meas),
    },
    {
      key: "math_language",
      label: "Mathematical Language",
      score: ml?.accuracy ?? 0,
      flagged: isWeakLevel(ml),
    },
    {
      key: "sequencing",
      label: "Sequencing & Patterning",
      score: pat?.accuracy ?? 0,
      flagged: isWeakLevel(pat),
    },
    {
      key: "visual_spatial",
      label: "Visual-Spatial Processing",
      score: geo?.accuracy ?? 0,
      flagged: isWeakLevel(geo),
    },
    {
      key: "working_memory",
      label: "Working Memory & EF",
      score: ps?.accuracy ?? 0,
      flagged: isWeakLevel(ps),
    },
    {
      key: "procedural_consistency",
      label: "Procedural Consistency",
      score: avgHint("Addition Reasoning", "Subtraction Reasoning", "Multiplicative Thinking", "Division Thinking") != null
        ? Math.max(0, 100 - (avgHint("Addition Reasoning", "Subtraction Reasoning", "Multiplicative Thinking", "Division Thinking")!))
        : 50,
      flagged: (avgHint("Addition Reasoning", "Subtraction Reasoning", "Multiplicative Thinking", "Division Thinking") ?? 0) > 65,
    },
  ];

  const flaggedCount = indicators.filter(i => i.flagged).length;

  const behaviourFlags: string[] = [];
  const globalAvgHint = avgHint(...RMRA_DOMAINS as unknown as string[]) ?? 0;
  if (globalAvgHint > 70) behaviourFlags.push("High examiner hint dependency across domains (>70%)");

  const confAccGap = RMRA_DOMAINS.map(d => {
    const s = scores[d]; if (!s) return 0;
    return Math.abs(s.confidence - s.accuracy);
  }).filter(Boolean);
  const avgGap = confAccGap.length ? confAccGap.reduce((a, b) => a + b, 0) / confAccGap.length : 0;
  if (avgGap > 25) behaviourFlags.push("Large confidence–accuracy calibration gap (>25% avg)");

  const highConcernCount = RMRA_DOMAINS.filter(d => scores[d]?.level === "high_concern").length;
  if (highConcernCount >= 5) behaviourFlags.push(`Pervasive high-concern profile (${highConcernCount}/13 domains at High Concern level)`);

  let level: DyscRiskLevel;
  const totalRiskWeight = flaggedCount * 2 + behaviourFlags.length * 3;
  if (flaggedCount >= 8 || totalRiskWeight >= 20) level = "high";
  else if (flaggedCount >= 5 || totalRiskWeight >= 12) level = "moderate";
  else if (flaggedCount >= 2 || totalRiskWeight >= 5) level = "mild";
  else level = "low";

  return { level, indicators, flaggedCount, behaviourFlags };
}

// ── Productive Struggle Index — 5 Dimensions (proxy from domain scores) ────────
//
// Persistence    → avg PS of high-complexity domains (Fractions, Multiplicative, Problem Solving)
// Flexibility    → avg PS of strategy-diversity domains (Division, Patterns/Algebra, Problem Solving)
// Emo Regulation → PS of "Response to Productive Struggle" domain
// Error Recovery → avg PS of computation domains (Addition, Subtraction, Multiplicative)
// Help Utilization → inverse of avg hint dependency (low hint = better help utilisation)

function computeStruggleProfile(scores: Record<string, DomainScore>) {
  const avg = (...domains: string[]) => {
    const vals = domains.map(d => scores[d]?.productiveStruggle ?? null).filter((v): v is number => v !== null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };
  const avgHint = (...domains: string[]) => {
    const vals = domains.map(d => scores[d]?.hintDependency ?? null).filter((v): v is number => v !== null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };

  const allHint = avgHint(...RMRA_DOMAINS as unknown as string[]) ?? 50;

  return [
    {
      subject: "Persistence",
      score: avg("Fractions", "Multiplicative Thinking", "Problem Solving & Executive Function") ?? 50,
    },
    {
      subject: "Flexibility",
      score: avg("Division Thinking", "Patterns & Early Algebra", "Problem Solving & Executive Function") ?? 50,
    },
    {
      subject: "Emotional Regulation",
      score: scores["Response to Productive Struggle"]?.productiveStruggle ?? 50,
    },
    {
      subject: "Error Recovery",
      score: avg("Addition Reasoning", "Subtraction Reasoning", "Multiplicative Thinking") ?? 50,
    },
    {
      subject: "Help Utilisation",
      score: Math.max(0, 100 - allHint),
    },
  ];
}

// ── Intervention Map ──────────────────────────────────────────────────────────

const INTERVENTION_MAP: Record<string, { label: string; strategies: string[] }> = {
  "Number Sense": {
    label: "Number Sense & Counting",
    strategies: [
      "Subitizing games with dot flash cards and ten-frames",
      "Choral counting with visual number lines",
      "Estimation jar activities with justify-and-check discussion",
      "Number talks focused on mental math strategy sharing",
    ],
  },
  "Place Value": {
    label: "Place Value & Number Structure",
    strategies: [
      "Base-10 block trading games (regrouping with bundles)",
      "Place value mat activities with bundling straws",
      "Reading, writing, and building multi-digit numbers",
      "Decomposition games: 'Show me another way to make this number'",
    ],
  },
  "Addition Reasoning": {
    label: "Addition Strategies",
    strategies: [
      "Make-ten strategy with rekenrek and number bond cards",
      "Open number line jumps for addition problems",
      "Doubles and near-doubles fact fluency games",
      "Think-aloud with worked examples demonstrating strategy choice",
    ],
  },
  "Subtraction Reasoning": {
    label: "Subtraction Strategies",
    strategies: [
      "Think-addition: 'What do I add to get there?'",
      "Open number line counting back and counting up",
      "Compensation strategy practice (adjust then correct)",
      "Subtraction story problems with concrete materials first",
    ],
  },
  "Multiplicative Thinking": {
    label: "Multiplicative Thinking",
    strategies: [
      "Array models with rows and columns manipulatives",
      "Skip counting on number lines with visual grouping",
      "Multiplication grid exploration and pattern investigation",
      "Factor and multiple sorting and investigation tasks",
    ],
  },
  "Division Thinking": {
    label: "Division & Sharing",
    strategies: [
      "Equal sharing activities with manipulatives and recording",
      "Grouping: 'How many groups of N can we make from total?'",
      "Division as multiplication inverse: connection building",
      "Partitive vs quotitive division story problems",
    ],
  },
  "Fractions": {
    label: "Fractions & Proportional Reasoning",
    strategies: [
      "Fraction tiles and strips for comparing and ordering",
      "Area models for part-whole understanding",
      "Number line fractions: placing, comparing, and estimating",
      "Equivalent fraction investigations with concrete materials",
    ],
  },
  "Measurement": {
    label: "Measurement Concepts",
    strategies: [
      "Progression from non-standard to standard units",
      "Estimation benchmarks using body and classroom objects",
      "Real-world measurement projects (perimeter walk, area tiling)",
      "Time and money problems in authentic everyday contexts",
    ],
  },
  "Patterns & Early Algebra": {
    label: "Patterns & Algebraic Reasoning",
    strategies: [
      "Growing pattern extension and next-term prediction tasks",
      "Input/output tables with rule discovery and generalisation",
      "Function machine activities: guess the rule",
      "'Always, sometimes, never' statements to build generalisation",
    ],
  },
  "Geometry & Spatial Reasoning": {
    label: "Geometry & Spatial Reasoning",
    strategies: [
      "Tangram activities for composing and decomposing shapes",
      "Spatial reasoning puzzles and mental rotation tasks",
      "3D shape sorting, building, and net folding",
      "Symmetry and transformation investigations",
    ],
  },
  "Mathematical Language": {
    label: "Mathematical Language & Communication",
    strategies: [
      "Math word walls with visual anchors and student examples",
      "Oral explanation protocols: structured 'explain it' routines",
      "Teacher think-aloud modeling of mathematical language",
      "Partner talk using sentence starter cards",
    ],
  },
  "Problem Solving & Executive Function": {
    label: "Problem Solving & Planning",
    strategies: [
      "Polya 4-step problem-solving framework with visual scaffold",
      "Self-monitoring checklists for multi-step problems",
      "Worked examples with progressive support fading",
      "Schema-based instruction for recognising problem types",
    ],
  },
  "Response to Productive Struggle": {
    label: "Productive Struggle & Resilience",
    strategies: [
      "Low-stakes challenge tasks with explicit 'struggle is learning' framing",
      "Growth mindset discussions linked to specific math errors",
      "Error analysis: 'Find the mistake, fix it, explain why'",
      "Self-regulation anchor charts: 'When I get stuck, I can…'",
    ],
  },
};

// ── Bobby Agent ───────────────────────────────────────────────────────────────

const BOBBY_ACTIONS = [
  {
    id: "math_support_plan",
    label: "12-Week Math Support Plan",
    Icon: Calendar,
    description: "Structured weekly intervention plan for educators",
    buttonClass: "bg-violet-600 hover:bg-violet-700 text-white",
    iconClass: "text-violet-500",
    borderClass: "border-violet-100",
    headerClass: "bg-violet-50",
  },
  {
    id: "parent_summary",
    label: "Parent Summary",
    Icon: User,
    description: "Plain language summary for families",
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
    iconClass: "text-blue-500",
    borderClass: "border-blue-100",
    headerClass: "bg-blue-50",
  },
  {
    id: "teacher_accommodation",
    label: "Teacher Accommodation Plan",
    Icon: BookOpen,
    description: "Specific classroom accommodations and modifications",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
    iconClass: "text-emerald-500",
    borderClass: "border-emerald-100",
    headerClass: "bg-emerald-50",
  },
  {
    id: "confidence_plan",
    label: "Math Confidence Support Plan",
    Icon: Activity,
    description: "Strategy for building mathematical self-efficacy",
    buttonClass: "bg-amber-600 hover:bg-amber-700 text-white",
    iconClass: "text-amber-500",
    borderClass: "border-amber-100",
    headerClass: "bg-amber-50",
  },
] as const;

// ── Scatter tooltip ────────────────────────────────────────────────────────────

const ScatterTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded shadow px-3 py-2 text-xs">
      <div className="font-semibold text-slate-700 mb-1">{d.domain}</div>
      <div>Accuracy: <span className="font-mono">{d.x}%</span></div>
      <div>Confidence: <span className="font-mono">{d.y}%</span></div>
      <Badge className={`mt-1 text-[10px] border ${LEVEL_BG[d.level] ?? ""}`}>{LEVEL_LABELS[d.level]}</Badge>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export function RmraReportPanel({
  sessionId,
  caseId,
  session,
  isStandalone = false,
}: {
  sessionId: string;
  caseId: string;
  session: RmraReportSession;
  isStandalone?: boolean;
}) {
  const { toast } = useToast();
  const authHeader = () =>
    isStandalone ? {} : { Authorization: `Bearer ${localStorage.getItem("raos_token")}` };

  const reportEndpoint = isStandalone
    ? `${BASE_URL}/api/rmra/standalone/sessions/${sessionId}/generate-report`
    : `${BASE_URL}/api/cases/${caseId}/rmra/sessions/${sessionId}/generate-report`;

  const bobbyEndpoint = isStandalone
    ? `${BASE_URL}/api/rmra/standalone/sessions/${sessionId}/bobby-agent`
    : `${BASE_URL}/api/cases/${caseId}/rmra/sessions/${sessionId}/bobby-agent`;

  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<{ narrative: ReportNarrative; generatedAt: string } | null>(
    (session.reportData as { narrative: ReportNarrative; generatedAt: string } | null | undefined) ?? null,
  );
  const [bobbyStates, setBobbyStates] = useState<
    Record<string, { loading: boolean; content: string | null; expanded: boolean }>
  >({});

  const domainScores = (session.domainScores ?? {}) as Record<string, DomainScore>;

  // ── Computed chart data ────────────────────────────────────────────────────

  const heatMapData = useMemo(() =>
    RMRA_DOMAINS
      .filter(d => !!domainScores[d])
      .map(d => {
        const s = domainScores[d];
        return {
          domain: DOMAIN_SHORT[d] ?? d,
          fullDomain: d,
          accuracy: s.accuracy,
          reasoning: s.reasoning,
          strategy: s.strategyLevel,
          confidence: s.confidence,
          hint: s.hintDependency,
          score: Math.round((s.accuracy + s.reasoning + s.strategyLevel) / 3),
          level: s.level,
          color: LEVEL_COLORS[s.level],
        };
      }),
    [domainScores],
  );

  // Mathematical profile radar — 5 math cluster averages
  const mathProfileRadarData = useMemo(() => {
    const groupAvg = (domains: string[]) => {
      const vals = domains.map(d => domainScores[d]).filter(Boolean);
      if (!vals.length) return 0;
      return Math.round(vals.reduce((a, v) => a + (v.accuracy + v.reasoning + v.strategyLevel) / 3, 0) / vals.length);
    };
    return [
      { subject: "Number Ops", score: groupAvg(["Number Sense", "Place Value", "Addition Reasoning", "Subtraction Reasoning"]) },
      { subject: "Multiplicative", score: groupAvg(["Multiplicative Thinking", "Division Thinking", "Fractions"]) },
      { subject: "Space & Measure", score: groupAvg(["Measurement", "Geometry & Spatial Reasoning"]) },
      { subject: "Lang & Algebra", score: groupAvg(["Mathematical Language", "Patterns & Early Algebra"]) },
      { subject: "Process & EF", score: groupAvg(["Problem Solving & Executive Function", "Response to Productive Struggle"]) },
    ];
  }, [domainScores]);

  // Productive Struggle Index — 5 dimensional radar
  const psRadarData = useMemo(() => computeStruggleProfile(domainScores), [domainScores]);

  const hintSortedData = useMemo(() =>
    [...heatMapData].sort((a, b) => b.hint - a.hint),
    [heatMapData],
  );

  // Confidence vs Accuracy scatter data
  const scatterData = useMemo(() =>
    RMRA_DOMAINS
      .filter(d => !!domainScores[d])
      .map(d => ({
        x: domainScores[d].accuracy,
        y: domainScores[d].confidence,
        domain: DOMAIN_SHORT[d] ?? d,
        level: domainScores[d].level,
        fill: LEVEL_COLORS[domainScores[d].level],
      })),
    [domainScores],
  );

  const dyscalculiaRisk = useMemo(() => computeDyscalculiaRisk(domainScores), [domainScores]);

  const weakDomains = useMemo(() =>
    RMRA_DOMAINS.filter(d => {
      const s = domainScores[d];
      return s && (s.level === "vulnerable" || s.level === "high_concern");
    }),
    [domainScores],
  );

  // ── API calls ──────────────────────────────────────────────────────────────

  const handleGenerateReport = async () => {
    setGenerating(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const r = await fetch(reportEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        signal: controller.signal,
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setReportData(data.reportData);
      toast({ title: "Report generated", description: "AI clinical narrative is ready." });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        toast({ title: "Request timed out", description: "Report generation took too long. Please try again.", variant: "destructive" });
      } else {
        toast({ title: "Report generation failed", description: "Please try again.", variant: "destructive" });
      }
    } finally {
      clearTimeout(timeout);
      setGenerating(false);
    }
  };

  const handleBobbyAction = useCallback(async (actionId: string) => {
    setBobbyStates(prev => ({ ...prev, [actionId]: { loading: true, content: null, expanded: true } }));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const r = await fetch(bobbyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ action: actionId }),
        signal: controller.signal,
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setBobbyStates(prev => ({ ...prev, [actionId]: { loading: false, content: data.content, expanded: true } }));
    } catch (err: any) {
      setBobbyStates(prev => ({ ...prev, [actionId]: { ...prev[actionId], loading: false } }));
      if (err?.name === "AbortError") {
        toast({ title: "Request timed out", description: "Bobby Agent took too long. Please try again.", variant: "destructive" });
      } else {
        toast({ title: "Bobby Agent failed", description: "Please try again.", variant: "destructive" });
      }
    } finally {
      clearTimeout(timeout);
    }
  }, [bobbyEndpoint, isStandalone, sessionId]);

  const riskMeta = DYSC_RISK_META[dyscalculiaRisk.level];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-800 text-sm">
        <CheckCircle2 size={16} className="shrink-0" />
        <span>Assessment completed. Domain scores saved.</span>
        {!isStandalone && (
          <div className="ml-auto">
            <Link href={`/cases/${caseId}`}>
              <Button variant="outline" size="sm" className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-100 h-7 text-xs">
                <ArrowLeft size={12} /> Back to Case
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Domain Heat Map */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Target size={14} className="text-violet-500" /> Domain Snapshot — 13 Domains
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="divide-y divide-slate-100">
            {heatMapData.map(row => (
              <div key={row.domain} className="flex items-center gap-3 py-2">
                <div className="w-32 shrink-0 text-xs text-slate-600 truncate">{row.domain}</div>
                <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${row.score}%`, backgroundColor: row.color }}
                  />
                </div>
                <div className="text-xs font-mono text-slate-500 w-9 text-right">{row.score}%</div>
                <Badge className={`text-[10px] border ${LEVEL_BG[row.level] ?? ""} px-1.5 py-0 leading-4 shrink-0`}>
                  {LEVEL_LABELS[row.level]}
                </Badge>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-2 border-t border-slate-100">
            {Object.entries(LEVEL_COLORS).map(([k, c]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
                {LEVEL_LABELS[k]}
              </div>
            ))}
            <span className="text-xs text-slate-400 ml-auto">Score = avg(accuracy, reasoning, strategy)</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mathematical Profile Radar */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Brain size={14} className="text-violet-500" /> Mathematical Profile (5 Clusters)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={230}>
              <RadarChart data={mathProfileRadarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#64748b" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: "#94a3b8" }} />
                <Radar name="Avg Score" dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={(v: number) => [`${v}%`, "Avg Score"]} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Productive Struggle Index — 5-Dimension Radar */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Activity size={14} className="text-emerald-500" /> Productive Struggle Index
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={230}>
              <RadarChart data={psRadarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#64748b" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: "#94a3b8" }} />
                <Radar name="Score" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.22} strokeWidth={2} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={(v: number) => [`${v}%`]} />
              </RadarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-slate-400 mt-1 text-center">
              Persistence · Flexibility · Emotional Regulation · Error Recovery · Help Utilisation
            </p>
          </CardContent>
        </Card>

        {/* Strategy Maturity */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-500" /> Strategy Maturity Level
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={heatMapData} layout="vertical" margin={{ top: 2, right: 40, left: 2, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} />
                <YAxis type="category" dataKey="domain" tick={{ fontSize: 8 }} width={72} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [`${v}%`, "Strategy Level"]} />
                <Bar dataKey="strategy" name="Strategy Level" radius={3}>
                  {heatMapData.map((row, i) => (
                    <Cell key={i} fill={LEVEL_COLORS[row.level] ?? "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hint Dependency */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={14} className="text-orange-500" /> Hint Dependency
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={hintSortedData} layout="vertical" margin={{ top: 2, right: 40, left: 2, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} />
                <YAxis type="category" dataKey="domain" tick={{ fontSize: 8 }} width={72} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [`${v}%`, "Hint Dependency"]} />
                <Bar dataKey="hint" name="Hint Dependency" radius={3}>
                  {hintSortedData.map((row, i) => (
                    <Cell key={i} fill={row.hint > 60 ? "#ef4444" : row.hint > 35 ? "#f97316" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Confidence vs Accuracy — Scatter */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Activity size={14} className="text-blue-500" /> Confidence vs Accuracy (per Domain)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 12, right: 20, left: 4, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number" dataKey="x" name="Accuracy" domain={[0, 100]}
                label={{ value: "Accuracy (%)", position: "insideBottom", offset: -14, fontSize: 10, fill: "#94a3b8" }}
                tick={{ fontSize: 9 }}
              />
              <YAxis
                type="number" dataKey="y" name="Confidence" domain={[0, 100]}
                label={{ value: "Confidence (%)", angle: -90, position: "insideLeft", offset: 12, fontSize: 10, fill: "#94a3b8" }}
                tick={{ fontSize: 9 }}
              />
              <ZAxis range={[60, 60]} />
              <ReferenceLine x={50} stroke="#e2e8f0" strokeDasharray="4 4" />
              <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="4 4" />
              <Tooltip content={<ScatterTooltip />} />
              <Scatter
                data={scatterData}
                shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  return <circle cx={cx} cy={cy} r={7} fill={payload.fill} fillOpacity={0.75} stroke={payload.fill} strokeWidth={1.5} />;
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-slate-400 text-center -mt-1">
            Points above the diagonal = overconfident · Points below = underconfident
          </p>
        </CardContent>
      </Card>

      {/* Dyscalculia Risk Indicator — 12 Dimensions */}
      <Card className={`border ${riskMeta.borderClass}`}>
        <CardHeader className={`pb-3 pt-4 px-5 ${riskMeta.headerClass}`}>
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Brain size={14} /> Dyscalculia Risk Indicator — 12 Indicator Dimensions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={`text-sm px-3 py-1 border font-semibold ${riskMeta.badgeClass}`}>
              {riskMeta.label}
            </Badge>
            <span className="text-sm text-slate-500">
              {dyscalculiaRisk.flaggedCount} of 12 indicators flagged
              {dyscalculiaRisk.behaviourFlags.length > 0 ? ` · ${dyscalculiaRisk.behaviourFlags.length} behaviour flag${dyscalculiaRisk.behaviourFlags.length > 1 ? "s" : ""}` : ""}
            </span>
          </div>
          <p className="text-sm text-slate-700">{riskMeta.description}</p>

          {/* 12-indicator grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {dyscalculiaRisk.indicators.map(ind => (
              <div
                key={ind.key}
                className={`rounded-md px-2.5 py-2 flex items-center gap-2 border text-xs ${
                  ind.flagged ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ind.flagged ? "bg-red-500" : "bg-emerald-400"}`} />
                <span className={ind.flagged ? "text-red-700 font-medium" : "text-slate-500"}>{ind.label}</span>
              </div>
            ))}
          </div>

          {/* Behaviour flags */}
          {dyscalculiaRisk.behaviourFlags.length > 0 && (
            <div className="space-y-1">
              {dyscalculiaRisk.behaviourFlags.map((flag, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                  <AlertTriangle size={11} className="shrink-0 text-amber-500" />
                  {flag}
                </div>
              ))}
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-500 flex items-start gap-2">
            <AlertTriangle size={12} className="text-slate-400 shrink-0 mt-0.5" />
            <span>
              This indicator is a screening output only and does not constitute a clinical diagnosis of dyscalculia.
              A formal diagnosis requires a comprehensive psychoeducational evaluation by a registered psychologist
              or suitably qualified practitioner in accordance with relevant professional guidelines.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Targeted Intervention Recommendations */}
      {weakDomains.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-500" /> Targeted Intervention Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {weakDomains.map(domain => {
              const info = INTERVENTION_MAP[domain];
              const score = domainScores[domain];
              if (!info || !score) return null;
              return (
                <div key={domain} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className={`px-4 py-2.5 flex items-center gap-2.5 ${score.level === "high_concern" ? "bg-red-50" : "bg-orange-50"}`}>
                    <Badge className={`text-[10px] border ${LEVEL_BG[score.level]} shrink-0`}>
                      {LEVEL_LABELS[score.level]}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-800">{info.label}</span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {info.strategies.map((s, i) => (
                      <li key={i} className="px-4 py-2 text-sm text-slate-700 flex items-start gap-2">
                        <span className="text-slate-400 shrink-0 mt-0.5">•</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* AI Clinical Narrative */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Sparkles size={14} className="text-violet-500" /> AI Clinical Narrative
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {!reportData ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Brain size={32} className="text-slate-300" />
              <div className="max-w-md">
                <p className="text-sm font-medium text-slate-700 mb-1">Generate a Clinical Report</p>
                <p className="text-xs text-slate-500">
                  AI-written narrative covering behavioral observations, mathematical profile, strategy use,
                  strengths, areas of need, and specific recommendations.
                </p>
              </div>
              <Button
                onClick={handleGenerateReport}
                disabled={generating}
                className="gap-2 bg-violet-600 hover:bg-violet-700 mt-1"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {generating ? "Generating report…" : "Generate RMRA Report"}
              </Button>
              {generating && (
                <p className="text-xs text-slate-400">This typically takes 20–40 seconds.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock size={12} />
                Generated {new Date(reportData.generatedAt).toLocaleString("en-AU", {
                  day: "numeric", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 text-xs text-slate-500 px-2 gap-1"
                  onClick={handleGenerateReport}
                  disabled={generating}
                >
                  {generating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  Regenerate
                </Button>
              </div>

              {[
                { key: "overview" as const, label: "Assessment Overview" },
                { key: "behavioralObservations" as const, label: "Behavioral Observations" },
                { key: "mathematicalProfile" as const, label: "Mathematical Reasoning Profile" },
                { key: "strategyUseProfile" as const, label: "Strategy Use Profile" },
              ].map(({ key, label }) => {
                const text = reportData.narrative[key];
                if (!text || typeof text !== "string") return null;
                return (
                  <div key={key} className="border border-slate-200 rounded-lg p-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</h4>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{text}</p>
                  </div>
                );
              })}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
                  <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">Identified Strengths</h4>
                  <ul className="space-y-1.5">
                    {(reportData.narrative.strengths ?? []).map((s, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                        <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <h4 className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-3">Areas of Need</h4>
                  <ul className="space-y-1.5">
                    {(reportData.narrative.areasOfNeed ?? []).map((s, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                        <AlertTriangle size={12} className="text-orange-500 mt-0.5 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border border-blue-200 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">Classroom Recommendations</h4>
                  <ul className="space-y-1.5">
                    {(reportData.narrative.classroomRecommendations ?? []).map((s, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                        <BookOpen size={12} className="text-blue-500 mt-0.5 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border border-purple-200 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-3">Parent / Home Recommendations</h4>
                  <ul className="space-y-1.5">
                    {(reportData.narrative.parentRecommendations ?? []).map((s, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                        <User size={12} className="text-purple-500 mt-0.5 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bobby Agent OS */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-5 bg-slate-50 border-b">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Brain size={14} className="text-blue-500" /> Bobby Agent OS
            <Badge className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 ml-1 font-medium">AI</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <p className="text-xs text-slate-500 mb-1">
            Generate tailored support documents based on this student's RMRA assessment data.
          </p>
          {BOBBY_ACTIONS.map(({ id, label, Icon, description, buttonClass, iconClass, borderClass, headerClass }) => {
            const state = bobbyStates[id];
            const hasContent = !!state?.content;
            const isExpanded = state?.expanded ?? false;
            return (
              <div key={id} className={`border ${borderClass} rounded-lg overflow-hidden`}>
                <div className={`flex items-center gap-3 px-4 py-3 ${headerClass}`}>
                  <Icon size={14} className={iconClass} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">{label}</div>
                    <div className="text-xs text-slate-500">{description}</div>
                  </div>
                  <Button
                    size="sm"
                    variant={hasContent ? "outline" : "default"}
                    className={`gap-1.5 h-7 text-xs shrink-0 ${!hasContent ? buttonClass : ""}`}
                    onClick={() => {
                      if (hasContent) {
                        setBobbyStates(prev => ({
                          ...prev,
                          [id]: { ...prev[id], expanded: !isExpanded },
                        }));
                      } else {
                        handleBobbyAction(id);
                      }
                    }}
                    disabled={state?.loading}
                  >
                    {state?.loading ? (
                      <><Loader2 size={12} className="animate-spin" /> Generating…</>
                    ) : hasContent ? (
                      isExpanded ? <><ChevronDown size={12} /> Collapse</> : <><ChevronRight size={12} /> Expand</>
                    ) : (
                      <><Sparkles size={12} /> Generate</>
                    )}
                  </Button>
                </div>
                {hasContent && isExpanded && (
                  <div className="px-4 py-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap border-t border-slate-100 bg-white">
                    {state.content}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
