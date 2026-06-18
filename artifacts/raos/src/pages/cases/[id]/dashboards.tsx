import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, Brain, BookOpen, Baby, Layers, LayoutGrid, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = localStorage.getItem("raos_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const BASC3_TOOL_IDS = new Set(["BASC3-TRS-A","BASC3-PRS-A","BASC3-TRS-C","BASC3-PRS-C","BASC3-SRP-A","BASC3-SRP-C"]);
const BRIEF2_TOOL_IDS = new Set(["BRIEF2-P","BRIEF2-SR","BRIEF2-T"]);
const CDP_TOOL_IDS   = new Set(["CDP-CL","CDP-SI","CDP-SR","CDP-CI"]);
const LITERACY_TOOL_IDS = new Set(["RRCA","RRFA","RPPI","RDA"]);
const REMYND_AUTO_PREFIXES = ["RCS-80","RASR","RCEP","REFI","RERMS","RSCP","RARPS","RFII","RSSC","RSCA","RARI","EFA","RCS-80P"];

function isRemyndAuto(toolId: string): boolean {
  return REMYND_AUTO_PREFIXES.some(p => toolId === p || toolId.startsWith(p + "-"));
}

interface DashTile {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  icon: React.ReactNode;
  href: string;
  available: boolean;
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

  const assignedToolIds = new Set<string>((c.assignments ?? []).map((a: any) => a.toolId as string));
  const productIds: string[] = (c.productIds as string[]) ?? [];

  const hasRemynd = [...assignedToolIds].some(t => isRemyndAuto(t));
  const hasBasc3  = [...assignedToolIds].some(t => BASC3_TOOL_IDS.has(t));
  const hasBrief2 = [...assignedToolIds].some(t => BRIEF2_TOOL_IDS.has(t));
  const hasCdp    = [...assignedToolIds].some(t => CDP_TOOL_IDS.has(t));
  const hasLiteracy = [...assignedToolIds].some(t => LITERACY_TOOL_IDS.has(t));
  const hasProducts = productIds.length > 0;

  const tiles: DashTile[] = [
    {
      id: "product",
      title: "Product Dashboard",
      subtitle: hasProducts
        ? `${productIds.length} product${productIds.length !== 1 ? "s" : ""} assigned to this case`
        : "No products assigned yet — assign via case page",
      tag: "Products",
      tagColor: "bg-violet-100 text-violet-700",
      icon: <LayoutGrid size={22} className="text-violet-600" />,
      href: `/cases/${caseId}/product-dashboard`,
      available: hasProducts,
    },
    {
      id: "remynd",
      title: "ReMynd Index Dashboard",
      subtitle: "Cross-tool concern index from ReMynd-owned instruments",
      tag: "ReMynd",
      tagColor: "bg-indigo-100 text-indigo-700",
      icon: <Brain size={22} className="text-indigo-600" />,
      href: `/cases/${caseId}/remynd-dashboard`,
      available: hasRemynd,
    },
    {
      id: "basc3",
      title: "BASC-3 Dashboard",
      subtitle: "Behavior Assessment System for Children, Third Edition",
      tag: "BASC-3",
      tagColor: "bg-amber-100 text-amber-700",
      icon: <BarChart3 size={22} className="text-amber-600" />,
      href: `/cases/${caseId}/basc3-dashboard`,
      available: hasBasc3,
    },
    {
      id: "brief2",
      title: "BRIEF-2 Dashboard",
      subtitle: "Behavior Rating Inventory of Executive Function, 2nd Ed.",
      tag: "BRIEF-2",
      tagColor: "bg-teal-100 text-teal-700",
      icon: <BarChart3 size={22} className="text-teal-600" />,
      href: `/cases/${caseId}/brief2-dashboard`,
      available: hasBrief2,
    },
    {
      id: "cdp",
      title: "CDP Profile",
      subtitle: "ReMynd Child Development Profile — developmental domains",
      tag: "CDP",
      tagColor: "bg-emerald-100 text-emerald-700",
      icon: <Baby size={22} className="text-emerald-600" />,
      href: `/cases/${caseId}/cdp`,
      available: hasCdp,
    },
    {
      id: "literacy",
      title: "Literacy Dashboard",
      subtitle: "Literacy & phonological processing assessments",
      tag: "Literacy",
      tagColor: "bg-sky-100 text-sky-700",
      icon: <BookOpen size={22} className="text-sky-600" />,
      href: `/cases/${caseId}/literacy-dashboard`,
      available: hasLiteracy,
    },
  ];

  const availableTiles = tiles.filter(t => t.available);
  const unavailableTiles = tiles.filter(t => !t.available);

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

      {/* Available tiles */}
      {availableTiles.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Available</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTiles.map(tile => (
              <Link key={tile.id} href={tile.href}>
                <Card className="border hover:shadow-md hover:border-violet-200 transition-all cursor-pointer group">
                  <CardContent className="p-5 flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-50 group-hover:border-violet-100 transition-colors">
                      {tile.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tile.tagColor}`}>
                          {tile.tag}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 text-sm leading-tight">{tile.title}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tile.subtitle}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {availableTiles.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Layers size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-700 font-medium mb-1">No dashboards available yet</p>
          <p className="text-sm text-slate-500 max-w-sm">
            Dashboards appear once assessments are assigned to this case. Go to the case page to add products or individual tools.
          </p>
          <Link href={`/cases/${caseId}`}>
            <Button variant="outline" className="mt-5">Go to Case</Button>
          </Link>
        </div>
      )}

      {/* Unavailable (greyed out) */}
      {unavailableTiles.length > 0 && availableTiles.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Not yet applicable</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unavailableTiles.map(tile => (
              <Card key={tile.id} className="border border-dashed border-slate-200 opacity-50">
                <CardContent className="p-5 flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                    {tile.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tile.tagColor}`}>
                        {tile.tag}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm leading-tight">{tile.title}</p>
                    <p className="text-xs text-slate-500 mt-1">No matching tools assigned</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
