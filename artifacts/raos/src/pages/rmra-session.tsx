import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowLeft, Loader2, AlertTriangle, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { RmraReportPanel, type RmraReportSession } from "./cases/[id]/rmra-report";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function RmraStandaloneSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { toast } = useToast();

  const [session, setSession] = useState<RmraReportSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/rmra/standalone/sessions/${sessionId}`);
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: "Session not found" }));
          setError(err.error ?? "Session not found");
          return;
        }
        const data = await r.json();
        setSession(data.session);
      } catch {
        setError("Could not load session. Check your connection.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  const studentUrl = `${window.location.origin}${BASE_URL}/student-view/rmra/${sessionId}`;

  const handleCopyStudentLink = () => {
    navigator.clipboard.writeText(studentUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied", description: "Send this to your student." });
    });
  };

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
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
          <Badge className={`text-[10px] border ml-1 ${STATUS_BG[session.status as string] ?? ""}`}>
            {STATUS_LABELS[session.status as string] ?? session.status}
          </Badge>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-24">
            <Loader2 size={24} className="animate-spin text-violet-500" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertTriangle size={24} className="text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium">{error}</p>
            <Link href="/rmra">
              <Button variant="outline" size="sm" className="mt-4 gap-1.5">
                <ArrowLeft size={12} /> Back to RMRA
              </Button>
            </Link>
          </div>
        )}

        {/* Session loaded */}
        {!loading && session && (
          <>
            {/* Student link card */}
            {session.status !== "completed" && (
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <ExternalLink size={14} className="text-violet-500" /> Student Session Link
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Share this link with your student to begin the assessment. The student view is
                  designed to be used on a separate device. This page (examiner dashboard) is for your use only.
                </p>
                <div className="flex gap-2 items-center">
                  <code className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono text-slate-700 truncate">
                    {studentUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 shrink-0"
                    onClick={handleCopyStudentLink}
                  >
                    {copied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <a href={studentUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                      <ExternalLink size={12} /> Open
                    </Button>
                  </a>
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  Session ID: <code className="font-mono">{sessionId}</code>
                  {" · "}Age Band: <span className="capitalize">{(session.ageBand ?? "").replace(/_/g, " ")}</span>
                  {" · "}Version: <span className="capitalize">{session.version}</span>
                </div>
              </div>
            )}

            {/* Status: not started or in progress */}
            {session.status === "not_started" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                <p className="text-sm text-amber-800 font-medium">The student has not yet started this session.</p>
                <p className="text-xs text-amber-600 mt-1">Share the link above and return to this page once the session is complete.</p>
              </div>
            )}

            {session.status === "in_progress" && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
                <Loader2 size={16} className="animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-blue-800 font-medium">Session is in progress.</p>
                <p className="text-xs text-blue-600 mt-1">Refresh this page once the student has completed the assessment.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => window.location.reload()}
                >
                  Refresh
                </Button>
              </div>
            )}

            {/* Completed — show full report */}
            {session.status === "completed" && session.domainScores && (
              <RmraReportPanel
                sessionId={sessionId}
                caseId=""
                session={session}
                isStandalone={true}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
