import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft, Loader2, AlertTriangle, LayoutGrid, CheckCircle2, Clock, Circle,
  Settings2, Sparkles, ChevronDown, ChevronUp, X, Plus, FileText, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { ALL_PRODUCTS_BY_MARKET, MARKET_LABELS } from "@/lib/products";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = localStorage.getItem("raos_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const MARKET_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  schools:      { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200" },
  parents:      { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200"    },
  corporate:    { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"  },
  universities: { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200"   },
  specialized:  { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200"   },
};

function StatusIcon({ status }: { status: "completed" | "partial" | "none" }) {
  if (status === "completed") return <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />;
  if (status === "partial")   return <Clock size={14} className="text-amber-500 flex-shrink-0" />;
  return <Circle size={14} className="text-slate-300 flex-shrink-0" />;
}

function getToolStatus(assignments: any[]): "completed" | "partial" | "none" {
  if (!assignments.length) return "none";
  const allDone = assignments.every(a => a.status === "completed");
  if (allDone) return "completed";
  return "partial";
}

export default function ProductDashboardPage() {
  const { id: caseId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [customizeProductId, setCustomizeProductId] = useState<string | null>(null);
  const [reportProductId, setReportProductId] = useState<string | null>(null);
  const [reportText, setReportText] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Per-product override draft state (productId -> {added, removed})
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, { addedToolIds: string[]; removedToolIds: string[] }>>({});

  const { data: c, isLoading: caseLoading } = useQuery({
    queryKey: [`/api/cases/${caseId}`],
    queryFn: () => fetch(`${BASE_URL}/api/cases/${caseId}`, { headers: authHeaders() }).then(r => r.json()),
  });

  const { data: pd, isLoading: pdLoading } = useQuery({
    queryKey: [`/api/cases/${caseId}/product-dashboard`],
    queryFn: () => fetch(`${BASE_URL}/api/cases/${caseId}/product-dashboard`, { headers: authHeaders() }).then(r => r.json()),
    enabled: !!caseId,
  });

  const { data: allToolsData } = useQuery({
    queryKey: ["/api/assessment-tools"],
    queryFn: () => fetch(`${BASE_URL}/api/assessment-tools`, { headers: authHeaders() }).then(r => r.json()),
  });

  const saveOverridesMut = useMutation({
    mutationFn: ({ productId, addedToolIds, removedToolIds }: { productId: string; addedToolIds: string[]; removedToolIds: string[] }) =>
      fetch(`${BASE_URL}/api/cases/${caseId}/product-tool-overrides`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ productId, addedToolIds, removedToolIds }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/product-dashboard`] });
      toast({ title: "Tool customization saved" });
      setCustomizeProductId(null);
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  function toggleExpand(pid: string) {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  }

  function openCustomize(pid: string, addedToolIds: string[], removedToolIds: string[]) {
    setOverrideDrafts(prev => ({ ...prev, [pid]: { addedToolIds: [...addedToolIds], removedToolIds: [...removedToolIds] } }));
    setCustomizeProductId(pid);
  }

  function toggleRemoveTool(pid: string, toolId: string, defaultToolIds: string[]) {
    setOverrideDrafts(prev => {
      const draft = prev[pid] ?? { addedToolIds: [], removedToolIds: [] };
      if (defaultToolIds.includes(toolId)) {
        const isRemoved = draft.removedToolIds.includes(toolId);
        return { ...prev, [pid]: { ...draft, removedToolIds: isRemoved ? draft.removedToolIds.filter(t => t !== toolId) : [...draft.removedToolIds, toolId] } };
      } else {
        const isAdded = draft.addedToolIds.includes(toolId);
        return { ...prev, [pid]: { ...draft, addedToolIds: isAdded ? draft.addedToolIds.filter(t => t !== toolId) : [...draft.addedToolIds, toolId] } };
      }
    });
  }

  async function generateReport(productId: string | null) {
    setReportLoading(true);
    setReportText(null);
    setReportProductId(productId);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/product-report`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ productId }),
      });
      const data = await r.json();
      setReportText(data.report ?? "No report generated.");
    } catch {
      toast({ title: "Failed to generate report", variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  }

  const isLoading = caseLoading || pdLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-violet-400" size={28} />
      </div>
    );
  }

  const products: any[] = pd?.products ?? [];
  const allTools: any[] = allToolsData ?? [];

  const currentCustomize = customizeProductId ? products.find(p => p.productId === customizeProductId) : null;
  const currentDraft = customizeProductId ? (overrideDrafts[customizeProductId] ?? { addedToolIds: [], removedToolIds: [] }) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/cases/${caseId}/dashboards`}>
            <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <LayoutGrid size={18} className="text-violet-500" />
              <h1 className="text-2xl font-bold font-display text-slate-900">Product Dashboard</h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {c?.studentName ?? ""} · {c?.school ?? ""}
              {products.length > 0 && <span className="ml-2 text-violet-600 font-medium">· {products.length} product{products.length !== 1 ? "s" : ""}</span>}
            </p>
          </div>
        </div>
        {products.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
            onClick={() => generateReport(null)}
            disabled={reportLoading}
          >
            {reportLoading && !reportProductId ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Full Report
          </Button>
        )}
      </div>

      {/* Empty state */}
      {products.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <LayoutGrid size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-700 font-medium mb-1">No products assigned to this case</p>
          <p className="text-sm text-slate-500 max-w-sm mb-5">
            Use the "Assign by Product" button on the case page to associate assessment products.
          </p>
          <Link href={`/cases/${caseId}`}>
            <Button variant="outline">Go to Case</Button>
          </Link>
        </div>
      )}

      {/* Product cards */}
      {products.map((product: any) => {
        const marketStyle = MARKET_COLORS[product.market] ?? MARKET_COLORS.specialized;
        const isExpanded = expandedProducts.has(product.productId);
        const completedCount = product.effectiveTools.filter((t: any) => getToolStatus(t.assignments) === "completed").length;
        const assignedCount = product.effectiveTools.filter((t: any) => t.isAssigned).length;
        const totalCount = product.effectiveTools.length;

        const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return (
          <Card key={product.productId} className="border overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-5 bg-slate-50 border-b">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className={`border text-[10px] font-semibold ${marketStyle.bg} ${marketStyle.text} ${marketStyle.border}`}>
                      {MARKET_LABELS[product.market] ?? product.market}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-semibold text-slate-800">{product.productName}</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    {assignedCount} of {totalCount} tools assigned · {completedCount} completed
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => openCustomize(product.productId, product.addedToolIds, product.removedToolIds)}
                  >
                    <Settings2 size={11} /> Customize
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 border-violet-200 text-violet-700 hover:bg-violet-50"
                    onClick={() => generateReport(product.productId)}
                    disabled={reportLoading}
                  >
                    {reportLoading && reportProductId === product.productId ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    AI Report
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 flex-shrink-0 w-8 text-right">{progressPct}%</span>
                </div>
              </div>
            </CardHeader>

            {/* Tool list (collapsible) */}
            <button
              className="w-full px-5 py-2 flex items-center gap-2 text-[11px] text-slate-500 hover:bg-slate-50 transition-colors border-b"
              onClick={() => toggleExpand(product.productId)}
            >
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {isExpanded ? "Hide tools" : `Show ${totalCount} tool${totalCount !== 1 ? "s" : ""}`}
              {product.removedToolIds.length > 0 && (
                <span className="ml-1 text-amber-600">· {product.removedToolIds.length} removed</span>
              )}
              {product.addedToolIds.length > 0 && (
                <span className="ml-1 text-emerald-600">· {product.addedToolIds.length} added</span>
              )}
            </button>

            {isExpanded && (
              <CardContent className="pt-0 px-0 pb-0">
                <div className="divide-y divide-slate-50">
                  {product.effectiveTools.map((tool: any) => {
                    const status = getToolStatus(tool.assignments);
                    const isAdded = product.addedToolIds.includes(tool.toolId);
                    const isDefault = product.defaultToolIds.includes(tool.toolId);
                    return (
                      <div key={tool.toolId} className="px-5 py-2.5 flex items-center gap-3">
                        <StatusIcon status={status} />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium text-slate-800">{tool.toolName}</span>
                          <span className="ml-2 text-[10px] text-slate-400">{tool.toolId}</span>
                          {isAdded && <span className="ml-2 text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">added</span>}
                        </div>
                        {tool.assignments.length > 0 && (
                          <div className="flex gap-1 flex-wrap justify-end">
                            {tool.assignments.map((a: any) => (
                              <span key={a.id} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                a.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : a.status === "in_progress" ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}>
                                {a.respondentLabel || a.respondentType}
                              </span>
                            ))}
                          </div>
                        )}
                        {!tool.isAssigned && (
                          <span className="text-[9px] text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full">not assigned</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Customize Tools Sheet */}
      <Sheet open={!!customizeProductId} onOpenChange={open => { if (!open) setCustomizeProductId(null); }}>
        <SheetContent className="max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings2 size={16} className="text-violet-500" />
              Customize Tools
            </SheetTitle>
            {currentCustomize && (
              <p className="text-xs text-slate-500">{currentCustomize.productName}</p>
            )}
          </SheetHeader>

          {currentCustomize && currentDraft && (
            <div className="mt-4 space-y-4">
              {/* Default tools section */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Default Tools</p>
                <div className="space-y-1">
                  {currentCustomize.defaultToolIds.map((toolId: string) => {
                    const tool = allTools.find((t: any) => t.id === toolId);
                    const isRemoved = currentDraft.removedToolIds.includes(toolId);
                    return (
                      <div key={toolId} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${isRemoved ? "bg-slate-50 border-slate-200 opacity-50" : "bg-white border-slate-100"}`}>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-slate-800">{tool?.name ?? toolId}</span>
                          <span className="ml-2 text-[10px] text-slate-400">{toolId}</span>
                        </div>
                        <button
                          className={`p-1 rounded transition-colors ${isRemoved ? "text-emerald-600 hover:text-emerald-700" : "text-slate-400 hover:text-red-500"}`}
                          title={isRemoved ? "Restore tool" : "Remove from this case's product"}
                          onClick={() => toggleRemoveTool(customizeProductId!, toolId, currentCustomize.defaultToolIds)}
                        >
                          {isRemoved ? <Plus size={13} /> : <X size={13} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Added tools section */}
              {currentDraft.addedToolIds.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Added Tools</p>
                  <div className="space-y-1">
                    {currentDraft.addedToolIds.map((toolId: string) => {
                      const tool = allTools.find((t: any) => t.id === toolId);
                      return (
                        <div key={toolId} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-100 bg-emerald-50">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-slate-800">{tool?.name ?? toolId}</span>
                            <span className="ml-2 text-[10px] text-slate-400">{toolId}</span>
                          </div>
                          <button
                            className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
                            onClick={() => toggleRemoveTool(customizeProductId!, toolId, currentCustomize.defaultToolIds)}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add tool from system */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Tool</p>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  defaultValue=""
                  onChange={e => {
                    const toolId = e.target.value;
                    if (!toolId) return;
                    if (currentCustomize.defaultToolIds.includes(toolId)) return;
                    if (!currentDraft.addedToolIds.includes(toolId)) {
                      setOverrideDrafts(prev => ({
                        ...prev,
                        [customizeProductId!]: { ...currentDraft, addedToolIds: [...currentDraft.addedToolIds, toolId] },
                      }));
                    }
                    e.target.value = "";
                  }}
                >
                  <option value="">— Select tool to add —</option>
                  {allTools
                    .filter((t: any) => !currentCustomize.defaultToolIds.includes(t.id) && !currentDraft.addedToolIds.includes(t.id))
                    .map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                    ))
                  }
                </select>
              </div>

              {/* Summary */}
              {(currentDraft.removedToolIds.length > 0 || currentDraft.addedToolIds.length > 0) && (
                <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 text-xs text-violet-700 space-y-1">
                  {currentDraft.removedToolIds.length > 0 && <p>− {currentDraft.removedToolIds.length} tool{currentDraft.removedToolIds.length !== 1 ? "s" : ""} removed from default set</p>}
                  {currentDraft.addedToolIds.length > 0 && <p>+ {currentDraft.addedToolIds.length} extra tool{currentDraft.addedToolIds.length !== 1 ? "s" : ""} added</p>}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCustomizeProductId(null)}>Cancel</Button>
                <Button
                  onClick={() => saveOverridesMut.mutate({
                    productId: customizeProductId!,
                    addedToolIds: currentDraft.addedToolIds,
                    removedToolIds: currentDraft.removedToolIds,
                  })}
                  disabled={saveOverridesMut.isPending}
                >
                  {saveOverridesMut.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Report Sheet */}
      <Sheet open={reportText !== null} onOpenChange={open => { if (!open) { setReportText(null); setReportProductId(null); } }}>
        <SheetContent className="max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText size={16} className="text-violet-500" />
              AI-Generated Report
              {reportProductId && (
                <span className="text-xs font-normal text-slate-500 ml-1">
                  — {products.find(p => p.productId === reportProductId)?.productName ?? ""}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          {reportLoading && (
            <div className="flex items-center gap-2 mt-6 text-slate-500">
              <Loader2 size={16} className="animate-spin text-violet-500" />
              <span className="text-sm">Generating clinical narrative…</span>
            </div>
          )}

          {reportText && (
            <div className="mt-4 space-y-4">
              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap rounded-lg bg-slate-50 border border-slate-100 p-4 text-sm">
                {reportText}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => { navigator.clipboard.writeText(reportText); toast({ title: "Copied to clipboard" }); }}
                >
                  Copy Text
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => generateReport(reportProductId)}
                >
                  <RefreshCw size={12} /> Regenerate
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
