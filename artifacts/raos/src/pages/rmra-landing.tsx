import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Brain, CheckCircle2, Loader2, ArrowRight, Lock, BookOpen,
  Target, Lightbulb, Activity, AlertTriangle, Copy, ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

const FEATURE_ITEMS = [
  {
    Icon: Target,
    title: "13-Domain Mathematical Profile",
    desc: "Comprehensive assessment across Number Sense, Fractions, Geometry, Problem Solving, and more.",
    color: "text-violet-500",
    bg: "bg-violet-50 border-violet-100",
  },
  {
    Icon: Brain,
    title: "Dyscalculia Risk Screening",
    desc: "Evidence-based risk indicator across core mathematical domains with appropriate clinical disclaimers.",
    color: "text-blue-500",
    bg: "bg-blue-50 border-blue-100",
  },
  {
    Icon: Lightbulb,
    title: "AI-Generated Clinical Reports",
    desc: "Detailed narrative reports with behavioral observations, strengths, areas of need, and recommendations.",
    color: "text-amber-500",
    bg: "bg-amber-50 border-amber-100",
  },
  {
    Icon: Activity,
    title: "Bobby Agent OS",
    desc: "Generate 12-week support plans, parent summaries, teacher accommodations, and confidence-building strategies.",
    color: "text-emerald-500",
    bg: "bg-emerald-50 border-emerald-100",
  },
];

const DOMAIN_CLUSTERS = [
  { label: "Number Operations", domains: ["Number Sense", "Place Value", "Addition Reasoning", "Subtraction Reasoning"] },
  { label: "Multiplicative Reasoning", domains: ["Multiplicative Thinking", "Division Thinking", "Fractions"] },
  { label: "Space & Measurement", domains: ["Measurement", "Geometry & Spatial Reasoning"] },
  { label: "Language & Algebra", domains: ["Mathematical Language", "Patterns & Early Algebra"] },
  { label: "Process & Reasoning", domains: ["Problem Solving & Executive Function", "Response to Productive Struggle"] },
];

type SessionReady = {
  sessionId: string;
  studentUrl: string;
  examinerUrl: string;
  copied: boolean;
};

export default function RmraLandingPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [sessionReady, setSessionReady] = useState<SessionReady | null>(null);

  const handleValidateCode = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setValidating(true);
    try {
      const r = await fetch(`${BASE_URL}/api/rmra/access-codes/${encodeURIComponent(trimmed)}/validate`);
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Invalid or expired access code." }));
        toast({ title: "Access denied", description: err.error ?? "Invalid or expired code.", variant: "destructive" });
        return;
      }

      const createRes = await fetch(`${BASE_URL}/api/rmra/standalone/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({ error: "Could not create session." }));
        toast({ title: "Session error", description: err.error ?? "Could not create session.", variant: "destructive" });
        return;
      }

      const { sessionToken } = await createRes.json();
      const studentUrl = `${window.location.origin}${BASE_URL}/student-view/rmra/${sessionToken}`;
      const examinerUrl = `${window.location.origin}${BASE_URL}/rmra/session/${sessionToken}`;
      setSessionReady({ sessionId: sessionToken, studentUrl, examinerUrl, copied: false });
    } catch {
      toast({ title: "Network error", description: "Please check your connection and try again.", variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied", description: "Share it with your student." });
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Brain size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">ReMynd</div>
            <div className="text-[10px] text-white/50 -mt-0.5">Assessment Operating System</div>
          </div>
        </div>
        <Link href="/login">
          <Button variant="outline" size="sm" className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white h-8 text-xs">
            Clinician Login
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <Badge className="bg-violet-600/30 text-violet-200 border-violet-500/30 mb-6 text-xs px-3 py-1">
          ReMynd Mathematical Reasoning Assessment
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-5 leading-tight">
          Understand Every Student's{" "}
          <span className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">
            Mathematical Mind
          </span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
          The RMRA is a structured examiner-administered assessment covering 13 mathematical domains.
          It identifies dyscalculia risk, pinpoints learning profiles, and generates AI-powered clinical reports
          for students aged 5–16.
        </p>

        {/* Access code box or Session Ready */}
        {!sessionReady ? (
          <Card className="max-w-md mx-auto bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock size={14} className="text-violet-400" />
                <span className="text-sm font-semibold text-white">Access Code Required</span>
              </div>
              <p className="text-xs text-white/50 mb-4 text-left">
                Enter the access code provided by your clinician to begin the assessment session.
              </p>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleValidateCode()}
                  placeholder="e.g. RMRA-2025-ABC1"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 font-mono text-sm tracking-widest uppercase"
                  maxLength={24}
                />
                <Button
                  onClick={handleValidateCode}
                  disabled={!code.trim() || validating}
                  className="gap-1.5 bg-violet-600 hover:bg-violet-700 shrink-0"
                >
                  {validating ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  {validating ? "Checking…" : "Start"}
                </Button>
              </div>
              <div className="mt-3 text-[11px] text-white/30 text-left">
                Don't have a code? Contact your school's assessment coordinator or ReMynd clinician.
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-lg mx-auto bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 size={16} />
                <span className="text-sm font-semibold">Session Created</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-white/60 font-medium uppercase tracking-wide">Student Link — share this with your student</p>
                <div className="flex gap-2 items-center">
                  <code className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-xs font-mono text-white/80 truncate">
                    {sessionReady.studentUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white/70 hover:bg-white/10 shrink-0 gap-1 h-8"
                    onClick={() => handleCopy(sessionReady.studentUrl)}
                  >
                    <Copy size={11} /> Copy
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-white/60 font-medium uppercase tracking-wide">Examiner Dashboard — your private view</p>
                <div className="flex gap-2 items-center">
                  <code className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-xs font-mono text-white/80 truncate">
                    {sessionReady.examinerUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white/70 hover:bg-white/10 shrink-0 gap-1 h-8"
                    onClick={() => handleCopy(sessionReady.examinerUrl)}
                  >
                    <Copy size={11} /> Copy
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 bg-violet-600 hover:bg-violet-700 gap-1.5"
                  onClick={() => navigate(`/rmra/session/${sessionReady.sessionId}`)}
                >
                  <ExternalLink size={13} /> Open Examiner Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white/60 hover:bg-white/10"
                  onClick={() => setSessionReady(null)}
                >
                  New Session
                </Button>
              </div>
              <p className="text-[11px] text-white/30">
                Bookmark the Examiner Dashboard link — once the student completes the assessment, that page will display the full clinical report and Bobby Agent OS outputs.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 pb-14">
        <h2 className="text-xl font-semibold text-center text-white/80 mb-8">What the RMRA Measures</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {FEATURE_ITEMS.map(({ Icon, title, desc, color, bg }) => (
            <div key={title} className={`rounded-xl border p-5 ${bg} bg-opacity-10 border-opacity-20`}>
              <div className="flex items-start gap-3">
                <Icon size={18} className={color} />
                <div>
                  <div className="text-sm font-semibold text-white mb-1">{title}</div>
                  <div className="text-xs text-white/50 leading-relaxed">{desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Domain list */}
        <h2 className="text-xl font-semibold text-center text-white/80 mb-6">13 Assessment Domains</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DOMAIN_CLUSTERS.map(cluster => (
            <div key={cluster.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-semibold text-violet-300 uppercase tracking-wider mb-2.5">
                {cluster.label}
              </div>
              {cluster.domains.map(d => (
                <div key={d} className="flex items-center gap-2 py-1">
                  <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                  <span className="text-xs text-white/70">{d}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-10 bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-white/40 leading-relaxed">
            The RMRA dyscalculia risk indicator is a screening tool only. It does not constitute a clinical
            diagnosis of dyscalculia or any other condition. All results should be interpreted by a qualified
            clinician in the context of a broader psychoeducational assessment.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <div className="text-xs text-white/30 mb-2">
            © {new Date().getFullYear()} ReMynd Pty Ltd · All rights reserved
          </div>
          <div className="text-xs text-white/20">
            Clinician portal:{" "}
            <Link href="/login">
              <span className="text-violet-400 hover:underline cursor-pointer">Sign in</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
