import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Brain, ArrowLeft, Loader2, AlertTriangle, Copy, ExternalLink,
  CheckCircle2, ChevronRight, ChevronLeft, ClipboardCheck,
  Printer, Mail, Send, CheckCheck,
} from "lucide-react";
import { RmraReportPanel, type RmraReportSession } from "./cases/[id]/rmra-report";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

const RMRA_DOMAINS = [
  "Number Sense", "Place Value", "Addition Reasoning", "Subtraction Reasoning",
  "Multiplicative Thinking", "Division Thinking", "Fractions", "Measurement",
  "Patterns & Early Algebra", "Geometry & Spatial Reasoning",
  "Mathematical Language", "Problem Solving & Executive Function",
  "Response to Productive Struggle",
];

type RmraItem = {
  id: string;
  domain: string;
  taskType: string;
  ageBand: string;
  prompts: Record<string, string>;
  showConfidenceSlider: boolean;
  productiveStruggleTrigger: boolean;
};

type ScoringForm = {
  taskId: string;
  accuracy: number | undefined;
  reasoning: number | undefined;
  strategyLevel: number | undefined;
  hintLevel: number;
  attempts: number;
  selfCorrection: boolean;
  productiveStrugglePersistence: number | undefined;
  productiveStruggleFlexibility: number | undefined;
  productiveStruggleEmotionalRegulation: number | undefined;
  productiveStruggleErrorRecovery: number | undefined;
  productiveStruggleHelpUtilization: number | undefined;
  discontinued: boolean;
  discontinuationReason: string;
  examinerNotes: string;
};

const blankForm = (taskId: string): ScoringForm => ({
  taskId,
  accuracy: undefined,
  reasoning: undefined,
  strategyLevel: undefined,
  hintLevel: 0,
  attempts: 1,
  selfCorrection: false,
  productiveStrugglePersistence: undefined,
  productiveStruggleFlexibility: undefined,
  productiveStruggleEmotionalRegulation: undefined,
  productiveStruggleErrorRecovery: undefined,
  productiveStruggleHelpUtilization: undefined,
  discontinued: false,
  discontinuationReason: "",
  examinerNotes: "",
});

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};
const STATUS_BG: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-600 border-slate-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const PS_DIMS = [
  { key: "productiveStrugglePersistence" as const, label: "Persistence" },
  { key: "productiveStruggleFlexibility" as const, label: "Flexibility" },
  { key: "productiveStruggleEmotionalRegulation" as const, label: "Emotional Regulation" },
  { key: "productiveStruggleErrorRecovery" as const, label: "Error Recovery" },
  { key: "productiveStruggleHelpUtilization" as const, label: "Help Utilisation" },
];

export default function RmraStandaloneSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { toast } = useToast();

  const [session, setSession] = useState<RmraReportSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const [items, setItems] = useState<RmraItem[]>([]);
  const [savedResponses, setSavedResponses] = useState<Record<string, ScoringForm>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [form, setForm] = useState<ScoringForm>(blankForm(""));
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Examiner token — read from ?et= URL param, persisted to sessionStorage keyed by
  // sessionId so it survives page refreshes. URL param is cleared immediately after
  // reading to prevent it appearing in browser history, referrer headers, or server logs.
  const examinerToken = useMemo(() => {
    const storageKey = `rmra_et_${sessionId}`;
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("et");
    if (urlToken) {
      sessionStorage.setItem(storageKey, urlToken);
      params.delete("et");
      const newSearch = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
      return urlToken;
    }
    return sessionStorage.getItem(storageKey) ?? "";
  }, [sessionId]);
  const [emailInput, setEmailInput] = useState("");
  const [emailName, setEmailName] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const studentUrl = `${window.location.origin}${BASE_URL}/student-view/rmra/${sessionId}`;

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/rmra/standalone/sessions/${sessionId}`, {
          headers: { "X-Examiner-Token": examinerToken },
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: "Session not found" }));
          setError(err.error ?? "Session not found");
          return;
        }
        const data = await r.json();
        setSession(data.session);
        setGeneralNotes(data.session?.generalNotes ?? "");
        const resMap: Record<string, ScoringForm> = {};
        for (const resp of data.responses ?? []) {
          resMap[resp.taskId] = {
            taskId: resp.taskId,
            accuracy: resp.accuracy ?? undefined,
            reasoning: resp.reasoning ?? undefined,
            strategyLevel: resp.strategyLevel ?? undefined,
            hintLevel: resp.hintLevel ?? 0,
            attempts: resp.attempts ?? 1,
            selfCorrection: resp.selfCorrection ?? false,
            productiveStrugglePersistence: resp.productiveStrugglePersistence ?? undefined,
            productiveStruggleFlexibility: resp.productiveStruggleFlexibility ?? undefined,
            productiveStruggleEmotionalRegulation: resp.productiveStruggleEmotionalRegulation ?? undefined,
            productiveStruggleErrorRecovery: resp.productiveStruggleErrorRecovery ?? undefined,
            productiveStruggleHelpUtilization: resp.productiveStruggleHelpUtilization ?? undefined,
            discontinued: resp.discontinued ?? false,
            discontinuationReason: resp.discontinuationReason ?? "",
            examinerNotes: resp.examinerNotes ?? "",
          };
        }
        setSavedResponses(resMap);
      } catch {
        setError("Could not load session. Check your connection.");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  useEffect(() => {
    if (!session || (session.status as string) === "completed" || !sessionId) return;
    (async () => {
      try {
        const ageBand = (session as any).ageBand ?? "upper_primary";
        const version = (session as any).version ?? "full";
        const r = await fetch(
          `${BASE_URL}/api/rmra/standalone/sessions/${sessionId}/items?ageBand=${ageBand}&version=${version}`,
          { headers: { "X-Examiner-Token": examinerToken } }
        );
        if (r.ok) {
          const data = await r.json();
          const loadedItems = data.items ?? [];
          setItems(loadedItems);
          // Broadcast the first task immediately so the student view doesn't stay stuck
          if (loadedItems.length > 0 && !(session as any).currentTaskId) {
            await fetch(`${BASE_URL}/api/rmra/standalone/sessions/${sessionId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", "X-Examiner-Token": examinerToken },
              body: JSON.stringify({ currentTaskId: loadedItems[0].id }),
            });
          }
        }
      } catch { /* ignore */ }
    })();
  }, [session?.status, sessionId]);

  const currentItem = items[currentIdx];

  useEffect(() => {
    if (!currentItem) return;
    const saved = savedResponses[currentItem.id];
    setForm(saved ? { ...saved, taskId: currentItem.id } : blankForm(currentItem.id));
  }, [currentIdx, currentItem?.id]);

  const handleSave = useCallback(async (andNext?: boolean) => {
    if (!currentItem || !sessionId) return;
    setSaving(true);
    try {
      const body = {
        domain: currentItem.domain,
        ageBand: (session as any)?.ageBand ?? "upper_primary",
        accuracy: form.accuracy,
        reasoning: form.reasoning,
        strategyLevel: form.strategyLevel,
        hintLevel: form.hintLevel,
        attempts: form.attempts,
        selfCorrection: form.selfCorrection,
        productiveStrugglePersistence: form.productiveStrugglePersistence,
        productiveStruggleFlexibility: form.productiveStruggleFlexibility,
        productiveStruggleEmotionalRegulation: form.productiveStruggleEmotionalRegulation,
        productiveStruggleErrorRecovery: form.productiveStruggleErrorRecovery,
        productiveStruggleHelpUtilization: form.productiveStruggleHelpUtilization,
        discontinued: form.discontinued,
        discontinuationReason: form.discontinuationReason || undefined,
        examinerNotes: form.examinerNotes || undefined,
      };
      const r = await fetch(
        `${BASE_URL}/api/rmra/standalone/sessions/${sessionId}/tasks/${currentItem.id}/response`,
        { method: "POST", headers: { "Content-Type": "application/json", "X-Examiner-Token": examinerToken }, body: JSON.stringify(body) }
      );
      if (!r.ok) throw new Error("Save failed");
      setSavedResponses(prev => ({ ...prev, [currentItem.id]: { ...form } }));
      await fetch(`${BASE_URL}/api/rmra/standalone/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Examiner-Token": examinerToken },
        body: JSON.stringify({ currentTaskId: currentItem.id, status: "in_progress" }),
      });
      setSession(prev => prev ? { ...prev, status: "in_progress" } as RmraReportSession : prev);
      if (andNext && currentIdx < items.length - 1) {
        setCurrentIdx(idx => idx + 1);
      } else {
        toast({ title: "Response saved" });
      }
    } catch {
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [currentItem, sessionId, form, session, currentIdx, items.length]);

  const handleSaveNotes = useCallback(async () => {
    if (!sessionId) return;
    setNoteSaving(true);
    try {
      await fetch(`${BASE_URL}/api/rmra/standalone/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Examiner-Token": examinerToken },
        body: JSON.stringify({ generalNotes }),
      });
      toast({ title: "Notes saved" });
    } catch {
      toast({ title: "Failed to save notes", variant: "destructive" });
    } finally {
      setNoteSaving(false);
    }
  }, [sessionId, generalNotes]);

  const handleComplete = useCallback(async () => {
    if (!sessionId) return;
    setCompleting(true);
    try {
      const r = await fetch(
        `${BASE_URL}/api/rmra/standalone/sessions/${sessionId}/complete`,
        { method: "POST", headers: { "Content-Type": "application/json", "X-Examiner-Token": examinerToken } }
      );
      if (!r.ok) throw new Error("Completion failed");
      const data = await r.json();
      setSession(prev => prev
        ? { ...prev, ...data.session, status: "completed", domainScores: data.domainScores } as RmraReportSession
        : prev
      );
      toast({ title: "Scores computed — generating AI report…" });

      // Auto-trigger AI report generation
      setGeneratingReport(true);
      try {
        const genR = await fetch(
          `${BASE_URL}/api/rmra/standalone/sessions/${sessionId}/generate-report`,
          { method: "POST", headers: { "Content-Type": "application/json", "X-Examiner-Token": examinerToken } }
        );
        if (genR.ok) {
          const genData = await genR.json();
          setSession(prev => prev ? { ...prev, reportData: genData.reportData } as RmraReportSession : prev);
          toast({ title: "AI report ready", description: "Export as PDF or email the report below." });
        } else {
          toast({ title: "Session completed", description: "AI report generation pending — refresh to retry." });
        }
      } catch {
        toast({ title: "Session completed", description: "Domain scores saved. AI report generation pending." });
      } finally {
        setGeneratingReport(false);
      }
    } catch {
      toast({ title: "Completion failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setCompleting(false);
    }
  }, [sessionId]);

  const handleSendEmail = useCallback(async () => {
    if (!sessionId || !emailInput) return;
    setEmailSending(true);
    try {
      const r = await fetch(
        `${BASE_URL}/api/rmra/standalone/sessions/${sessionId}/email-report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Examiner-Token": examinerToken },
          body: JSON.stringify({ recipientEmail: emailInput, recipientName: emailName || undefined }),
        }
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Send failed");
      }
      setEmailSent(true);
      toast({ title: "Report sent", description: `Emailed to ${emailInput}` });
    } catch (e: unknown) {
      toast({
        title: "Email failed",
        description: e instanceof Error ? e.message : "Could not send email. Check the address and try again.",
        variant: "destructive",
      });
    } finally {
      setEmailSending(false);
    }
  }, [sessionId, emailInput, emailName]);

  const handleCopyStudentLink = () => {
    navigator.clipboard.writeText(studentUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied", description: "Send this to your student." });
    });
  };

  const domainSummary = useMemo(() =>
    RMRA_DOMAINS.map(domain => {
      const domainItems = items.filter(i => i.domain === domain);
      const scored = domainItems.filter(i => !!savedResponses[i.id]).length;
      return { domain, total: domainItems.length, scored };
    }).filter(d => d.total > 0),
    [items, savedResponses]
  );

  const totalScored = Object.keys(savedResponses).length;
  const totalItems = items.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/rmra">
          <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600 hover:text-slate-800 h-8 px-2">
            <ArrowLeft size={14} /> Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center">
            <Brain size={12} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-800">RMRA Standalone Session</span>
        </div>
        {session && (
          <Badge className={`text-[10px] border ml-1 ${STATUS_BG[(session as any).status ?? ""] ?? ""}`}>
            {STATUS_LABELS[(session as any).status ?? ""] ?? (session as any).status}
          </Badge>
        )}
        {session && (session as any).status !== "completed" && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-slate-400">{totalScored}/{totalItems} tasks scored</span>
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleComplete}
              disabled={completing || totalScored === 0}
            >
              {completing ? <Loader2 size={12} className="animate-spin" /> : <ClipboardCheck size={12} />}
              Complete Session
            </Button>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5">
        {loading && (
          <div className="flex justify-center items-center py-24">
            <Loader2 size={24} className="animate-spin text-violet-500" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mt-4">
            <AlertTriangle size={24} className="text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium">{error}</p>
            <Link href="/rmra">
              <Button variant="outline" size="sm" className="mt-4 gap-1.5">
                <ArrowLeft size={12} /> Back to RMRA
              </Button>
            </Link>
          </div>
        )}

        {!loading && session && (
          <>
            {/* Completed — export actions + full report */}
            {(session as any).status === "completed" && session.domainScores && (
              <div className="mt-2 space-y-4">
                {/* Delivery banner */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">Session Complete</span>
                    {generatingReport && (
                      <span className="flex items-center gap-1.5 text-xs text-violet-600 ml-2">
                        <Loader2 size={11} className="animate-spin" /> Generating AI report…
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* PDF export */}
                    <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Printer size={12} className="text-slate-500" /> Export as PDF
                      </p>
                      <p className="text-xs text-slate-500 mb-3">
                        Print this page or save as PDF using your browser's print dialog.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-slate-700 h-8"
                        onClick={() => window.print()}
                      >
                        <Printer size={12} /> Print / Save PDF
                      </Button>
                    </div>

                    {/* Email delivery */}
                    <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Mail size={12} className="text-slate-500" /> Email Report
                      </p>
                      <p className="text-xs text-slate-500 mb-3">
                        Send a formatted HTML report summary to any email address.
                      </p>
                      {emailSent ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                          <CheckCheck size={13} /> Report sent successfully
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            placeholder="Recipient name (optional)"
                            value={emailName}
                            onChange={e => setEmailName(e.target.value)}
                            className="h-7 text-xs"
                          />
                          <div className="flex gap-2">
                            <Input
                              type="email"
                              placeholder="Email address"
                              value={emailInput}
                              onChange={e => setEmailInput(e.target.value)}
                              className="h-7 text-xs flex-1"
                            />
                            <Button
                              size="sm"
                              className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white h-7 px-3"
                              onClick={handleSendEmail}
                              disabled={emailSending || !emailInput}
                            >
                              {emailSending
                                ? <Loader2 size={11} className="animate-spin" />
                                : <Send size={11} />}
                              Send
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <RmraReportPanel
                  sessionId={sessionId}
                  caseId=""
                  session={session}
                  isStandalone={true}
                  examinerToken={examinerToken}
                />
              </div>
            )}

            {/* Admin interface */}
            {(session as any).status !== "completed" && (
              <div className="mt-2 space-y-4">
                {/* Student link */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 mb-0.5 flex items-center gap-1.5">
                        <ExternalLink size={11} className="text-violet-500" /> Student Session Link
                      </p>
                      <code className="text-xs font-mono text-slate-500 truncate block">{studentUrl}</code>
                    </div>
                    <div className="flex gap-1.5 shrink-0 flex-wrap">
                      <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={handleCopyStudentLink}>
                        {copied ? <CheckCircle2 size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                      <a href={studentUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="gap-1.5 h-8">
                          <ExternalLink size={11} /> Open Student View
                        </Button>
                      </a>
                      <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setShowQr(v => !v)}>
                        {showQr ? "Hide QR" : "Show QR"}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 w-full pt-1">
                      Session: <code className="font-mono">{sessionId}</code>
                      {" · "}Age Band: <span className="capitalize">{((session as any).ageBand ?? "").replace(/_/g, " ")}</span>
                      {" · "}Version: <span className="capitalize">{(session as any).version}</span>
                    </p>
                  </div>
                  {showQr && (
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <div className="p-3 bg-white border border-slate-200 rounded-xl inline-block">
                        <QRCodeSVG value={studentUrl} size={180} level="H" />
                      </div>
                      <p className="text-xs text-slate-400">Point the student's camera at this code to open their view.</p>
                    </div>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                    <Loader2 size={18} className="animate-spin text-violet-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Loading assessment items…</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-[240px_1fr] gap-4 items-start">
                    {/* Task list sidebar */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden sticky top-[62px]">
                      <div className="px-3 py-2 bg-slate-50 border-b text-xs font-semibold text-slate-700 flex items-center justify-between">
                        <span>Tasks by Domain</span>
                        <span className="font-normal text-slate-400">{totalScored}/{totalItems}</span>
                      </div>
                      <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                        {domainSummary.map(({ domain, total, scored }) => {
                          const domainItems = items.filter(i => i.domain === domain);
                          return (
                            <div key={domain}>
                              <div className="px-3 py-1 bg-slate-50 border-b border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide truncate max-w-[160px]">{domain}</span>
                                <span className="text-[10px] text-slate-400 shrink-0">{scored}/{total}</span>
                              </div>
                              {domainItems.map(item => {
                                const idx = items.indexOf(item);
                                const isActive = idx === currentIdx;
                                const isScored = !!savedResponses[item.id];
                                return (
                                  <button
                                    key={item.id}
                                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs border-b border-slate-50 transition-colors ${
                                      isActive ? "bg-violet-50 text-violet-700 font-medium" : "text-slate-600 hover:bg-slate-50"
                                    }`}
                                    onClick={() => setCurrentIdx(idx)}
                                  >
                                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                      isScored ? "bg-emerald-500 border-emerald-500" : isActive ? "border-violet-400" : "border-slate-300"
                                    }`}>
                                      {isScored && <CheckCircle2 size={9} className="text-white" />}
                                    </span>
                                    <span className="truncate font-mono text-[11px]">{item.id}</span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Scoring panel */}
                    {currentItem && (
                      <Card>
                        <CardHeader className="pb-2 pt-3 px-4 bg-slate-50 border-b flex-row items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-sm font-semibold text-slate-800">
                              {currentItem.id}
                              <span className="mx-2 text-slate-300">·</span>
                              <span className="text-slate-500 font-normal">{currentItem.domain}</span>
                            </CardTitle>
                            <p className="text-[11px] text-slate-400 mt-0.5">{currentItem.taskType}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm" variant="outline" className="h-7 w-7 p-0"
                              onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                              disabled={currentIdx === 0}
                            >
                              <ChevronLeft size={13} />
                            </Button>
                            <span className="text-xs text-slate-400 w-16 text-center">{currentIdx + 1} / {items.length}</span>
                            <Button
                              size="sm" variant="outline" className="h-7 w-7 p-0"
                              onClick={() => setCurrentIdx(i => Math.min(items.length - 1, i + 1))}
                              disabled={currentIdx === items.length - 1}
                            >
                              <ChevronRight size={13} />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-5">
                          {/* Task prompt */}
                          {currentItem.prompts?.space_mission && (
                            <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-3">
                              <p className="text-[10px] font-semibold text-violet-600 mb-1 uppercase tracking-wide">Task Prompt</p>
                              <p className="text-sm text-slate-800 leading-relaxed">{currentItem.prompts.space_mission}</p>
                            </div>
                          )}

                          {/* Accuracy */}
                          <div>
                            <Label className="text-xs font-semibold text-slate-700 mb-2 block">Accuracy</Label>
                            <div className="flex gap-2">
                              {[
                                { value: 0, label: "Incorrect", cls: "border-red-300 text-red-700 bg-red-50" },
                                { value: 1, label: "Partial", cls: "border-orange-300 text-orange-700 bg-orange-50" },
                                { value: 2, label: "Correct", cls: "border-emerald-300 text-emerald-700 bg-emerald-50" },
                              ].map(opt => (
                                <button
                                  key={opt.value}
                                  className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                                    form.accuracy === opt.value
                                      ? opt.cls + " ring-2 ring-offset-1 ring-violet-400"
                                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                                  }`}
                                  onClick={() => setForm(f => ({ ...f, accuracy: opt.value }))}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Reasoning */}
                          <div>
                            <Label className="text-xs font-semibold text-slate-700 mb-2 block">
                              Reasoning Quality <span className="text-slate-400 font-normal">(0 = none · 4 = sophisticated)</span>
                            </Label>
                            <div className="flex gap-1.5">
                              {[0, 1, 2, 3, 4].map(val => (
                                <button
                                  key={val}
                                  className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                                    form.reasoning === val
                                      ? "border-violet-400 bg-violet-50 text-violet-700 ring-1 ring-violet-300"
                                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                                  }`}
                                  onClick={() => setForm(f => ({ ...f, reasoning: val }))}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Strategy level */}
                          <div>
                            <Label className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                              <span>Strategy Level <span className="text-slate-400 font-normal">(0–14)</span></span>
                              <span className="text-violet-600 font-bold text-sm">{form.strategyLevel ?? "—"}</span>
                            </Label>
                            <Slider
                              value={[form.strategyLevel ?? 0]}
                              min={0} max={14} step={1}
                              onValueChange={([v]) => setForm(f => ({ ...f, strategyLevel: v }))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                              <span>Pre-strategy (0)</span><span>Developing (7)</span><span>Sophisticated (14)</span>
                            </div>
                          </div>

                          {/* Hints */}
                          <div>
                            <Label className="text-xs font-semibold text-slate-700 mb-2 block">
                              Hints Given <span className="text-slate-400 font-normal">(0 = none · 4 = maximum)</span>
                            </Label>
                            <div className="flex gap-1.5">
                              {[0, 1, 2, 3, 4].map(val => (
                                <button
                                  key={val}
                                  className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                                    form.hintLevel === val
                                      ? "border-amber-400 bg-amber-50 text-amber-700 ring-1 ring-amber-300"
                                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                                  }`}
                                  onClick={() => setForm(f => ({ ...f, hintLevel: val }))}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Productive Struggle */}
                          {currentItem.productiveStruggleTrigger && (
                            <div className="border border-blue-200 rounded-lg p-3.5 bg-blue-50 space-y-3">
                              <p className="text-xs font-semibold text-blue-700">Productive Struggle Dimensions (0–4 each)</p>
                              {PS_DIMS.map(dim => (
                                <div key={dim.key} className="flex items-center gap-3">
                                  <span className="text-xs text-slate-600 w-44 shrink-0">{dim.label}</span>
                                  <div className="flex gap-1 flex-1">
                                    {[0, 1, 2, 3, 4].map(val => (
                                      <button
                                        key={val}
                                        className={`flex-1 py-1 rounded border text-[11px] font-semibold transition-all ${
                                          form[dim.key] === val
                                            ? "border-blue-400 bg-blue-600 text-white"
                                            : "border-blue-200 text-blue-500 hover:bg-blue-100"
                                        }`}
                                        onClick={() => setForm(f => ({ ...f, [dim.key]: val }))}
                                      >
                                        {val}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Attempts + flags */}
                          <div className="flex items-center gap-6 flex-wrap">
                            <div>
                              <Label className="text-xs font-semibold text-slate-700 mb-1 block">Attempts</Label>
                              <div className="flex gap-1">
                                {[1, 2, 3].map(val => (
                                  <button
                                    key={val}
                                    className={`w-8 h-8 rounded border text-xs font-semibold transition-all ${
                                      form.attempts === val
                                        ? "border-slate-500 bg-slate-700 text-white"
                                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                                    }`}
                                    onClick={() => setForm(f => ({ ...f, attempts: val }))}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="sc"
                                checked={form.selfCorrection}
                                onCheckedChange={v => setForm(f => ({ ...f, selfCorrection: !!v }))}
                              />
                              <Label htmlFor="sc" className="text-xs text-slate-600 cursor-pointer">Self-corrected</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="disc"
                                checked={form.discontinued}
                                onCheckedChange={v => setForm(f => ({ ...f, discontinued: !!v }))}
                              />
                              <Label htmlFor="disc" className="text-xs text-slate-600 cursor-pointer">Discontinued</Label>
                            </div>
                          </div>

                          {form.discontinued && (
                            <div>
                              <Label className="text-xs font-semibold text-slate-700 mb-1 block">Discontinuation Reason</Label>
                              <Textarea
                                value={form.discontinuationReason}
                                onChange={e => setForm(f => ({ ...f, discontinuationReason: e.target.value }))}
                                className="text-xs min-h-[52px]"
                                placeholder="Reason for discontinuing this task…"
                              />
                            </div>
                          )}

                          <div>
                            <Label className="text-xs font-semibold text-slate-700 mb-1 block">Examiner Notes</Label>
                            <Textarea
                              value={form.examinerNotes}
                              onChange={e => setForm(f => ({ ...f, examinerNotes: e.target.value }))}
                              className="text-xs min-h-[60px]"
                              placeholder="Verbatim responses, observable behaviours, notable strategies…"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                            <Button
                              size="sm" variant="outline" className="gap-1.5"
                              onClick={() => handleSave(false)}
                              disabled={saving}
                            >
                              {saving && <Loader2 size={11} className="animate-spin" />}
                              Save
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1.5 bg-violet-600 hover:bg-violet-700"
                              onClick={() => handleSave(true)}
                              disabled={saving || currentIdx === items.length - 1}
                            >
                              {saving
                                ? <Loader2 size={11} className="animate-spin" />
                                : <ChevronRight size={11} />
                              }
                              Save & Next
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* General notes + completion */}
                <Card>
                  <CardHeader className="pb-2 pt-3 px-4 bg-slate-50 border-b">
                    <CardTitle className="text-xs font-semibold text-slate-700">Session Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <Textarea
                      value={generalNotes}
                      onChange={e => setGeneralNotes(e.target.value)}
                      className="text-sm min-h-[80px] mb-3"
                      placeholder="General behavioural observations, administration conditions, student presentation…"
                    />
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleSaveNotes} disabled={noteSaving}>
                        {noteSaving && <Loader2 size={11} className="animate-spin" />}
                        Save Notes
                      </Button>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{totalScored}/{totalItems} tasks scored</span>
                        <Button
                          size="sm"
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={handleComplete}
                          disabled={completing || totalScored === 0}
                        >
                          {completing ? <Loader2 size={12} className="animate-spin" /> : <ClipboardCheck size={12} />}
                          Complete Session & Generate Scores
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
