import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Brain, BookOpen, Baby, Layers, LayoutGrid, Loader2, AlertTriangle, CheckCircle2, Zap, Activity, Cpu, Users, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ASSESSMENT_PRODUCTS } from "@/lib/products";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = localStorage.getItem("raos_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const REMYND_AUTO_PREFIXES = ["RCS-80","RASR","RCEP","REFI","RERMS","RSCP","RARPS","RFII","RSSC","RSCA","RARI","EFA"];
const CDP_TOOL_IDS    = new Set(["CDP-CL","CDP-SI","CDP-SR","CDP-CI"]);
const LITERACY_TOOL_IDS = new Set(["RRCA","RRFA","RPPI","RDA"]);

// Battery tiles — appear automatically when any of their forms are assigned
const BATTERY_TILE_DEFS: Array<{
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  icon: React.ReactNode;
  toolIds: Set<string>;
}> = [
  {
    id: "snap",
    title: "SNAP-IV Dashboard",
    subtitle: "SNAP-IV 26 cross-informant ADHD rating scales",
    tag: "SNAP-IV",
    tagColor: "bg-orange-100 text-orange-700",
    icon: <Zap size={22} className="text-orange-500" />,
    toolIds: new Set(["SNAPIV26"]),
  },
  {
    id: "basc3",
    title: "BASC-3 Dashboard",
    subtitle: "Behavior Assessment System for Children — multi-informant",
    tag: "BASC-3",
    tagColor: "bg-rose-100 text-rose-700",
    icon: <Activity size={22} className="text-rose-500" />,
    toolIds: new Set(["BASC3-PRS-A","BASC3-TRS-A","BASC3-SRP-A","BASC3-PRS-C","BASC3-TRS-C","BASC3-SRP-C","BASC3-PRS-P","BASC3-TRS-P"]),
  },
  {
    id: "brief2",
    title: "BRIEF-2 Dashboard",
    subtitle: "Behavior Rating Inventory of Executive Function",
    tag: "BRIEF-2",
    tagColor: "bg-cyan-100 text-cyan-700",
    icon: <Cpu size={22} className="text-cyan-500" />,
    toolIds: new Set(["BRIEF2-P","BRIEF2-T","BRIEF2-SR"]),
  },
  {
    id: "sdq",
    title: "SDQ Dashboard",
    subtitle: "Strengths and Difficulties Questionnaire — multi-informant",
    tag: "SDQ",
    tagColor: "bg-teal-100 text-teal-700",
    icon: <Users size={22} className="text-teal-500" />,
    toolIds: new Set(["SDQ-P4","SDQ-T4","SDQ-SR4","SDQ-P11","SDQ-T11","SDQ-SR"]),
  },
  {
    id: "vanderbilt",
    title: "Vanderbilt Dashboard",
    subtitle: "Vanderbilt ADHD Diagnostic Rating Scales",
    tag: "Vanderbilt",
    tagColor: "bg-amber-100 text-amber-700",
    icon: <Target size={22} className="text-amber-500" />,
    toolIds: new Set(["VADPRS","VADTRS"]),
  },
];

function isRemyndAuto(toolId: string): boolean {
  return REMYND_AUTO_PREFIXES.some(p => toolId === p || toolId.startsWith(p + "-"));
}

function completionForSet(assignments: any[], matchFn: (toolId: string) => boolean) {
  const matched = assignments.filter((a: any) => matchFn(a.toolId ?? ""));
  const uniqueTools = new Set(matched.map((a: any) => a.toolId as string));
  // Completion = number of unique tools where every assignment is completed
  let completedTools = 0;
  for (const tid of uniqueTools) {
    const toolAssignments = matched.filter((a: any) => a.toolId === tid);
    if (toolAssignments.every((a: any) => a.status === "completed")) completedTools++;
  }
  return { matched: uniqueTools.size, completed: completedTools };
}

interface DashTile {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  icon: React.ReactNode;
  href: string;
  matched: number;
  completed: number;
}

export default function DashboardsHub() {
  const { id: caseId } = useParams();

  const { data: c, isLoading, isError } = useQuery({
    queryKey: [`/api/cases/${caseId}`],
    queryFn: () =>
      fetch(`${BASE_URL}/api/cases/${caseId}`, { headers: authHeaders() }).then(r => r.json()),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-violet-400" size={28} />
      </div>
    );
  }

  if (isError || !c) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-6 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800">
        <AlertTriangle size={20} />
        <span>Failed to load case data.</span>
      </div>
    );
  }

  const assignments: any[] = c.assignments ?? [];
  const productIds: string[] = (c.productIds as string[]) ?? [];

  // Build the set of tool IDs that belong to any assigned product
  const productToolSet = new Set<string>();
  for (const pid of productIds) {
    const product = ASSESSMENT_PRODUCTS.find(p => p.id === pid);
    if (product) product.toolIds.forEach(t => productToolSet.add(t));
  }

  // Compute completions per dashboard
  const productCompletion  = completionForSet(assignments, t => productToolSet.has(t));
  const remyndCompletion   = completionForSet(assignments, isRemyndAuto);
  const cdpCompletion      = completionForSet(assignments, t => CDP_TOOL_IDS.has(t));
  const literacyCompletion = completionForSet(assignments, t => LITERACY_TOOL_IDS.has(t));

  // Auto-detect battery tiles
  const batteryTiles: DashTile[] = BATTERY_TILE_DEFS
    .map(def => {
      const completion = completionForSet(assignments, t => def.toolIds.has(t));
      if (completion.matched === 0) return null;
      return {
        id: def.id,
        title: def.title,
        subtitle: def.subtitle,
        tag: def.tag,
        tagColor: def.tagColor,
        icon: def.icon,
        href: `/cases/${caseId}/scoring`,
        ...completion,
      };
    })
    .filter(Boolean) as DashTile[];

  const candidateTiles: (DashTile | null)[] = [
    productIds.length > 0 ? {
      id: "product",
      title: "Product Dashboard",
      subtitle: `${productIds.length} product${productIds.length !== 1 ? "s" : ""} assigned`,
      tag: "Products",
      tagColor: "bg-violet-100 text-violet-700",
      icon: <LayoutGrid size={22} className="text-violet-600" />,
      href: `/cases/${caseId}/product-dashboard`,
      ...productCompletion,
    } : null,

    remyndCompletion.matched > 0 ? {
      id: "remynd",
      title: "ReMynd Index Dashboard",
      subtitle: "Cross-tool concern index from ReMynd-owned instruments",
      tag: "ReMynd",
      tagColor: "bg-indigo-100 text-indigo-700",
      icon: <Brain size={22} className="text-indigo-600" />,
      href: `/cases/${caseId}/remynd-dashboard`,
      ...remyndCompletion,
    } : null,

    cdpCompletion.matched > 0 ? {
      id: "cdp",
      title: "CDP Profile",
      subtitle: "ReMynd Child Development Profile — developmental domains",
      tag: "CDP",
      tagColor: "bg-emerald-100 text-emerald-700",
      icon: <Baby size={22} className="text-emerald-600" />,
      href: `/cases/${caseId}/cdp`,
      ...cdpCompletion,
    } : null,

    literacyCompletion.matched > 0 ? {
      id: "literacy",
      title: "Literacy Dashboard",
      subtitle: "Literacy & phonological processing assessments",
      tag: "Literacy",
      tagColor: "bg-sky-100 text-sky-700",
      icon: <BookOpen size={22} className="text-sky-600" />,
      href: `/cases/${caseId}/literacy-dashboard`,
      ...literacyCompletion,
    } : null,
  ];

  const tiles = [...(candidateTiles.filter(Boolean) as DashTile[]), ...batteryTiles];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/cases/${caseId}`}>
          <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-violet-500" />
            <h1 className="text-2xl font-bold font-display text-slate-900">Dashboards</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {c.studentName} · {c.school}
          </p>
        </div>
      </div>

      {tiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map(tile => {
            const allDone = tile.matched > 0 && tile.completed === tile.matched;
            return (
              <Link key={tile.id} href={tile.href}>
                <Card className="border hover:shadow-md hover:border-violet-200 transition-all cursor-pointer group">
                  <CardContent className="p-5 flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-50 group-hover:border-violet-100 transition-colors">
                      {tile.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tile.tagColor}`}>
                          {tile.tag}
                        </span>
                        {allDone && <CheckCircle2 size={12} className="text-emerald-500" />}
                      </div>
                      <p className="font-semibold text-slate-800 text-sm leading-tight">{tile.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{tile.subtitle}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-1 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all"
                            style={{ width: tile.matched > 0 ? `${Math.round((tile.completed / tile.matched) * 100)}%` : "0%" }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {tile.completed}/{tile.matched}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {tiles.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Layers size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-700 font-medium mb-1">No dashboards available yet</p>
          <p className="text-sm text-slate-500 max-w-sm">
            Dashboards appear once assessments are assigned to this case.
          </p>
          <Link href={`/cases/${caseId}`}>
            <Button variant="outline" className="mt-5">Go to Case</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
