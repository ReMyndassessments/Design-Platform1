import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, CheckCircle2, Loader2, ChevronRight, ChevronLeft,
  Play, Square, RotateCcw, AlertTriangle, Info, X, Brain,
  Timer, BookOpen, Target, Lightbulb, Save, Flag, Copy, ExternalLink, Zap,
} from "lucide-react";
import { RmraReportPanel } from "./rmra-report";
import { QRCodeSVG } from "qrcode.react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Constants ─────────────────────────────────────────────────────────────────

const RMRA_DOMAINS = [
  "Number Sense", "Place Value", "Addition Reasoning", "Subtraction Reasoning",
  "Multiplicative Thinking", "Division Thinking", "Fractions", "Measurement",
  "Patterns & Early Algebra", "Geometry & Spatial Reasoning", "Mathematical Language",
  "Problem Solving & Executive Function", "Response to Productive Struggle",
] as const;

const STRATEGY_HIERARCHY = [
  "Cannot do / guesses",
  "Counts all",
  "Counts on or counts back",
  "Uses fingers",
  "Uses known facts",
  "Uses doubles / near doubles",
  "Uses make-ten",
  "Uses number line",
  "Uses place value",
  "Uses partitioning",
  "Uses compensation",
  "Uses benchmark reasoning",
  "Uses estimation and checks reasonableness",
  "Explains multiple strategies",
  "Generalizes concept",
];

const PRODUCTIVE_STRUGGLE_RUBRIC: Record<string, string[]> = {
  persistence: [
    "Gives up immediately",
    "Needs encouragement to continue",
    "Remains engaged briefly",
    "Persists independently",
    "Persists and explores alternatives",
  ],
  flexibility: [
    "Repeats same ineffective strategy",
    "Changes only after direct prompt",
    "Tries one alternate strategy",
    "Independently shifts strategy",
    "Generates multiple strategies",
  ],
  emotionalRegulation: [
    "Shuts down / refuses",
    "Visibly frustrated",
    "Anxious / negative self-talk",
    "Mildly frustrated but continues",
    "Calm and engaged",
  ],
  errorRecovery: [
    "Cannot recover after error",
    "Recovers only with direct teaching",
    "Improves after hint",
    "Self-corrects with prompt",
    "Independently detects and corrects error",
  ],
  helpUtilization: [
    "Refuses help",
    "Over-relies on help",
    "Uses hints passively",
    "Uses hints effectively",
    "Applies hint independently to new problem",
  ],
};

const PS_LABELS: Record<string, string> = {
  persistence: "Persistence",
  flexibility: "Strategy Flexibility",
  emotionalRegulation: "Emotional Regulation",
  errorRecovery: "Error Recovery",
  helpUtilization: "Help Utilization",
};

const AGE_BANDS = [
  { value: "early_primary", label: "Early Primary", desc: "Ages 5–8 · K–Yr 2" },
  { value: "upper_primary", label: "Upper Primary", desc: "Ages 8–11 · Yr 3–5" },
  { value: "middle_school", label: "Middle School", desc: "Ages 11–14 · Yr 6–8" },
  { value: "secondary", label: "Secondary", desc: "Ages 14–16 · Yr 9–10" },
];

const THEMES = [
  { value: "space_mission", label: "Space Mission", emoji: "🚀" },
  { value: "city_builder", label: "City Builder", emoji: "🏙️" },
  { value: "bakery_math", label: "Bakery Math", emoji: "🧁" },
  { value: "robot_factory", label: "Robot Factory", emoji: "🤖" },
  { value: "treasure_builder", label: "Treasure Builder", emoji: "🏴‍☠️" },
];

const ACCURACY_LABELS = ["No response / Cannot attempt", "Partial / Emerging", "Correct"];
const CONFIDENCE_LABELS = ["Not sure at all", "A little sure", "Mostly sure", "Very sure"];

// ── Types ─────────────────────────────────────────────────────────────────────

type RmraItem = {
  id: string;
  domain: string;
  ageBand: string;
  taskType: string;
  visualType: string;
  prompts: Record<string, string>;
  exactAnswer?: number | string;
  expectedAnswerRange?: [number, number];
  primaryConstruct: string;
  secondaryConstructs: string[];
  strategyOptions: string[];
  productiveStruggleTrigger: boolean;
  showConfidenceSlider: boolean;
  hints: [string, string, string, string];
  scoring: { accuracy: number; reasoning: number; strategy: number };
  briefVersion: boolean;
};

type RmraSession = {
  id: string;
  caseId: string;
  assignmentId: string;
  ageBand: string;
  version: "full" | "brief";
  theme: string;
  status: "not_started" | "in_progress" | "completed";
  currentTaskId: string | null;
  generalNotes: string | null;
  domainScores: Record<string, any> | null;
  reportData?: Record<string, any> | null;
  startedAt: string | null;
  completedAt: string | null;
};

type TaskResponseState = {
  accuracy: number | null;
  reasoning: number | null;
  strategyLevel: number | null;
  strategyLabel: string | null;
  hintLevel: number;
  attempts: number;
  selfCorrection: boolean;
  confidenceRating: number | null;
  responseTimeSeconds: number | null;
  studentAnswer: string;
  firstResponse: string;
  finalResponse: string;
  examinerNotes: string;
  productiveStrugglePersistence: number | null;
  productiveStruggleFlexibility: number | null;
  productiveStruggleEmotionalRegulation: number | null;
  productiveStruggleErrorRecovery: number | null;
  productiveStruggleHelpUtilization: number | null;
  discontinued: boolean;
  discontinuationReason: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyResponse(): TaskResponseState {
  return {
    accuracy: null, reasoning: null, strategyLevel: null, strategyLabel: null,
    hintLevel: 0, attempts: 1, selfCorrection: false, confidenceRating: null,
    responseTimeSeconds: null, studentAnswer: "", firstResponse: "", finalResponse: "",
    examinerNotes: "", productiveStrugglePersistence: null,
    productiveStruggleFlexibility: null, productiveStruggleEmotionalRegulation: null,
    productiveStruggleErrorRecovery: null, productiveStruggleHelpUtilization: null,
    discontinued: false, discontinuationReason: "",
  };
}

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function calcAge(dob: string) {
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function levelColor(level?: string) {
  if (level === "strength") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (level === "developing") return "bg-amber-100 text-amber-700 border-amber-200";
  if (level === "vulnerable") return "bg-orange-100 text-orange-700 border-orange-200";
  if (level === "high_concern") return "bg-red-100 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function domainShort(d: string) {
  const map: Record<string, string> = {
    "Number Sense": "Num Sense",
    "Place Value": "Place Value",
    "Addition Reasoning": "Addition",
    "Subtraction Reasoning": "Subtraction",
    "Multiplicative Thinking": "Mult. Thinking",
    "Division Thinking": "Division",
    "Fractions": "Fractions",
    "Measurement": "Measurement",
    "Patterns & Early Algebra": "Patterns/Algebra",
    "Geometry & Spatial Reasoning": "Geometry",
    "Mathematical Language": "Math Language",
    "Problem Solving & Executive Function": "Problem Solving",
    "Response to Productive Struggle": "Prod. Struggle",
  };
  return map[d] ?? d;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function RmraAdminPage() {
  const { id: caseId, assignmentId } = useParams<{ id: string; assignmentId: string }>();
  const { toast } = useToast();

  // Session + items
  const [session, setSession] = useState<RmraSession | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [caseInfo, setCaseInfo] = useState<{ studentName?: string; dob?: string; grade?: string } | null>(null);
  const [items, setItems] = useState<RmraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Assignment token (for student view link)
  const [assignmentToken, setAssignmentToken] = useState<string | null>(null);

  // Unscored-task confirmation dialog
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Item counts per age band (kept in sync with rmra-items.ts briefVersion flags)
  const ITEM_COUNTS: Record<string, { full: number; brief: number }> = {
    early_primary:  { full: 16, brief: 15 },
    upper_primary:  { full: 16, brief: 14 },
    middle_school:  { full: 14, brief: 11 },
    secondary:      { full: 14, brief: 6  },
  };

  // Setup (pre-start) state
  const [setupAgeBand, setSetupAgeBand] = useState("upper_primary");
  const [setupVersion, setSetupVersion] = useState<"full" | "brief">("full");
  const [setupTheme, setSetupTheme] = useState("space_mission");
  const [showSetupQr, setShowSetupQr] = useState(false);
  const [starting, setStarting] = useState(false);

  // Task navigation
  const [currentTaskIdx, setCurrentTaskIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, TaskResponseState>>({});
  const [discontinuedDomains, setDiscontinuedDomains] = useState<Set<string>>(new Set());
  const [generalNotes, setGeneralNotes] = useState("");
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [completing, setCompleting] = useState(false);
  const [showDiscontinueConfirm, setShowDiscontinueConfirm] = useState<string | null>(null);
  const [showHintTooltip, setShowHintTooltip] = useState<number | null>(null);

  // Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Stimulus flash timer (estimation tasks — examiner-triggered)
  const [stimulusTimerStartedAt, setStimulusTimerStartedAt] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTaskRef = useRef<string | null>(null);

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("raos_token")}` });

  // ── Initialize session on mount ─────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/cases/${caseId}/rmra/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ assignmentId }),
        });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        const s: RmraSession = data.session;
        setSession(s);
        setSessionId(s.id);
        setSetupAgeBand(s.ageBand);
        setSetupVersion(s.version);
        setSetupTheme(s.theme);
        if (s.generalNotes) setGeneralNotes(s.generalNotes);
        if (data.case) setCaseInfo(data.case);
        if (data.assignmentToken) setAssignmentToken(data.assignmentToken);

        // Load existing responses
        const respMap: Record<string, TaskResponseState> = {};
        const discontinued = new Set<string>();
        for (const resp of data.responses ?? []) {
          respMap[resp.taskId] = {
            accuracy: resp.accuracy ?? null,
            reasoning: resp.reasoning ?? null,
            strategyLevel: resp.strategyLevel ?? null,
            strategyLabel: resp.strategyLabel ?? null,
            hintLevel: resp.hintLevel ?? 0,
            attempts: resp.attempts ?? 1,
            selfCorrection: resp.selfCorrection ?? false,
            confidenceRating: resp.confidenceRating ?? null,
            responseTimeSeconds: resp.responseTimeSeconds ?? null,
            studentAnswer: resp.studentAnswer ?? "",
            firstResponse: resp.firstResponse ?? "",
            finalResponse: resp.finalResponse ?? "",
            examinerNotes: resp.examinerNotes ?? "",
            productiveStrugglePersistence: resp.productiveStrugglePersistence ?? null,
            productiveStruggleFlexibility: resp.productiveStruggleFlexibility ?? null,
            productiveStruggleEmotionalRegulation: resp.productiveStruggleEmotionalRegulation ?? null,
            productiveStruggleErrorRecovery: resp.productiveStruggleErrorRecovery ?? null,
            productiveStruggleHelpUtilization: resp.productiveStruggleHelpUtilization ?? null,
            discontinued: resp.discontinued ?? false,
            discontinuationReason: resp.discontinuationReason ?? "",
          };
          if (resp.discontinued) discontinued.add(resp.domain);
        }
        setResponses(respMap);
        setDiscontinuedDomains(discontinued);

        // If session is in progress, load items now
        if (s.status !== "not_started") {
          await loadItems(s.ageBand, s.version, s.currentTaskId, data.responses ?? []);
        }
      } catch (e) {
        setPageError(String(e));
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Poll for student-submitted data (confidence + typed answer) while session is active.
  // Only updates student-submitted fields — never overwrites examiner-entered scores.
  useEffect(() => {
    if (!sessionId || !caseId || session?.status === "completed") return;
    const poll = async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/cases/${caseId}/rmra/sessions/${sessionId}?t=${Date.now()}`, {
          headers: authHeader(),
        });
        if (!r.ok) return;
        const data = await r.json();
        const serverResponses: Array<{ taskId: string; confidenceRating: number | null; studentAnswer?: string | null; firstResponse?: string | null }> = data.responses ?? [];
        setResponses(prev => {
          let changed = false;
          const next = { ...prev };
          for (const sr of serverResponses) {
            const existing = prev[sr.taskId];
            const updates: Partial<TaskResponseState> = {};
            // Always apply server confidence when non-null — student-submitted, never overwrite with null
            if (sr.confidenceRating !== null && sr.confidenceRating !== undefined) {
              if (!existing || existing.confidenceRating !== sr.confidenceRating) {
                updates.confidenceRating = sr.confidenceRating;
              }
            }
            if (sr.studentAnswer && (!existing || existing.studentAnswer !== sr.studentAnswer)) {
              updates.studentAnswer = sr.studentAnswer;
            }
            if (sr.firstResponse && (!existing || !existing.firstResponse)) {
              updates.firstResponse = sr.firstResponse;
            }
            if (Object.keys(updates).length > 0) {
              next[sr.taskId] = { ...(existing ?? emptyResponse()), ...updates };
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      } catch { }
    };
    poll(); // run immediately on mount so confidence appears without waiting 3 s
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [sessionId, caseId, session?.status]);

  const loadItems = async (ageBand: string, version: string, currentTaskId: string | null, existingResponses: any[]): Promise<RmraItem[]> => {
    const r = await fetch(`${BASE_URL}/api/rmra/items?ageBand=${ageBand}&version=${version}`, {
      headers: authHeader(),
    });
    if (!r.ok) return [];
    const data = await r.json();
    const loadedItems: RmraItem[] = data.items ?? [];
    setItems(loadedItems);
    // Restore position
    if (currentTaskId) {
      const idx = loadedItems.findIndex(i => i.id === currentTaskId);
      if (idx >= 0) setCurrentTaskIdx(idx);
    } else if (existingResponses.length > 0) {
      // Jump to first unanswered
      const answered = new Set(existingResponses.map((r: any) => r.taskId));
      const firstUnanswered = loadedItems.findIndex(i => !answered.has(i.id));
      if (firstUnanswered >= 0) setCurrentTaskIdx(firstUnanswered);
    }
    return loadedItems;
  };

  // ── Derived state ────────────────────────────────────────────────────────────

  const currentTask = items[currentTaskIdx] ?? null;
  const currentResponse = useMemo(
    () => (currentTask ? (responses[currentTask.id] ?? emptyResponse()) : emptyResponse()),
    [currentTask?.id, responses],
  );

  const domainStats = useMemo(() => {
    const stats: Record<string, { total: number; done: number; discontinued: boolean; canDoFails: number }> = {};
    for (const domain of RMRA_DOMAINS) {
      const domainItems = items.filter(i => i.domain === domain);
      const done = domainItems.filter(i => responses[i.id] !== undefined).length;
      const discontinued = discontinuedDomains.has(domain);
      // Count consecutive cannot-do at end
      const answered = domainItems.filter(i => responses[i.id] !== undefined).map(i => responses[i.id]);
      let canDoFails = 0;
      for (let k = answered.length - 1; k >= 0; k--) {
        if (answered[k].accuracy === 0 && (answered[k].strategyLevel ?? 1) <= 1) canDoFails++;
        else break;
      }
      stats[domain] = { total: domainItems.length, done, discontinued, canDoFails };
    }
    return stats;
  }, [items, responses, discontinuedDomains]);

  // Check discontinuation prompt after each save
  useEffect(() => {
    if (!currentTask || !domainStats[currentTask.domain]) return;
    const { canDoFails, discontinued } = domainStats[currentTask.domain];
    if (!discontinued && canDoFails >= 3) {
      setShowDiscontinueConfirm(currentTask.domain);
    }
  }, [domainStats, currentTask?.id]);

  // Keep currentTaskId in the DB in sync with the examiner's local position.
  // This fires on first load (restoring from DB), on navigation, and after Begin,
  // so the student view always receives the correct task regardless of how the
  // examiner arrived at the current task.
  useEffect(() => {
    if (!sessionId || !caseId || session?.status !== "in_progress" || !currentTask) return;
    const t = setTimeout(async () => {
      try {
        await fetch(`${BASE_URL}/api/cases/${caseId}/rmra/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ currentTaskId: currentTask.id }),
        });
      } catch { }
    }, 400);
    return () => clearTimeout(t);
  }, [sessionId, caseId, currentTask?.id, session?.status]);

  // ── Timer ────────────────────────────────────────────────────────────────────

  const startTimer = () => {
    if (timerRunning) return;
    setTimerRunning(true);
    timerRef.current = setInterval(() => setTimerElapsed(e => e + 1), 1000);
  };
  const stopTimer = () => {
    if (!timerRunning) return;
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    updateCurrentResponse("responseTimeSeconds", timerElapsed);
  };
  const resetTimer = () => {
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerElapsed(0);
    updateCurrentResponse("responseTimeSeconds", null);
  };

  const handleShowAndStartTimer = async () => {
    if (!sessionId || !currentTask) return;
    const now = new Date().toISOString();
    setStimulusTimerStartedAt(now);
    await fetch(`${BASE_URL}/api/cases/${caseId}/rmra/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ timerStartedAt: now }),
    });
  };

  // ── Response updates ─────────────────────────────────────────────────────────

  const updateCurrentResponse = useCallback((field: keyof TaskResponseState, value: any) => {
    if (!currentTask) return;
    setResponses(prev => ({
      ...prev,
      [currentTask.id]: { ...(prev[currentTask.id] ?? emptyResponse()), [field]: value },
    }));
  }, [currentTask?.id]);

  const updatePS = (field: keyof TaskResponseState, value: number) => {
    updateCurrentResponse(field, value);
  };

  // ── Auto-save ────────────────────────────────────────────────────────────────

  const saveTask = useCallback(async (taskId: string, resp: TaskResponseState, sid: string, domain: string, ageBand: string) => {
    setSavingStatus("saving");
    try {
      await fetch(`${BASE_URL}/api/cases/${caseId}/rmra/sessions/${sid}/tasks/${taskId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ domain, ageBand, ...resp }),
      });
      setSavingStatus("saved");
      setTimeout(() => setSavingStatus(s => s === "saved" ? "idle" : s), 2000);
    } catch {
      setSavingStatus("idle");
    }
  }, [caseId]);

  useEffect(() => {
    if (!currentTask || !sessionId || session?.status === "completed") return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTask(currentTask.id, currentResponse, sessionId, currentTask.domain, currentTask.ageBand);
    }, 1200);
  }, [responses, currentTask?.id]);

  // ── Begin assessment ─────────────────────────────────────────────────────────

  const handleBegin = async () => {
    if (!sessionId) return;
    setStarting(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/rmra/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ ageBand: setupAgeBand, version: setupVersion, theme: setupTheme, status: "in_progress" }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setSession(data.session);
      const loadedItems = await loadItems(setupAgeBand, setupVersion, null, []);
      // Immediately broadcast first task so the student view stops waiting
      const firstTask = loadedItems[0];
      if (firstTask) {
        await fetch(`${BASE_URL}/api/cases/${caseId}/rmra/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ currentTaskId: firstTask.id }),
        });
      }
    } catch {
      toast({ title: "Could not start session", variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  // ── Navigation ───────────────────────────────────────────────────────────────

  const handleSaveAndNext = async () => {
    if (!currentTask || !sessionId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    await saveTask(currentTask.id, currentResponse, sessionId, currentTask.domain, currentTask.ageBand);
    const nextIdx = Math.min(currentTaskIdx + 1, items.length - 1);
    const nextTask = items[nextIdx];
    if (nextTask && nextTask.id !== currentTask.id) {
      setStimulusTimerStartedAt(null);
      await fetch(`${BASE_URL}/api/cases/${caseId}/rmra/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ currentTaskId: nextTask.id, timerStartedAt: null }),
      });
    }
    setCurrentTaskIdx(nextIdx);
    setTimerElapsed(0);
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setShowHintTooltip(null);
  };

  const handleBack = async () => {
    if (currentTaskIdx === 0) return;
    if (currentTask && sessionId) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      await saveTask(currentTask.id, currentResponse, sessionId, currentTask.domain, currentTask.ageBand);
    }
    const prevTask = items[currentTaskIdx - 1];
    if (prevTask && sessionId) {
      setStimulusTimerStartedAt(null);
      await fetch(`${BASE_URL}/api/cases/${caseId}/rmra/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ currentTaskId: prevTask.id, timerStartedAt: null }),
      });
    }
    setCurrentTaskIdx(currentTaskIdx - 1);
    setTimerElapsed(0);
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setShowHintTooltip(null);
  };

  // ── Discontinue domain ───────────────────────────────────────────────────────

  const handleDiscontinueDomain = async (domain: string) => {
    if (!sessionId) return;
    const domainItems = items.filter(i => i.domain === domain && !responses[i.id]);
    const newResponses = { ...responses };
    for (const item of domainItems) {
      const discontinuedResp = { ...emptyResponse(), discontinued: true, discontinuationReason: "Domain discontinued by examiner" };
      newResponses[item.id] = discontinuedResp;
      fetch(`${BASE_URL}/api/cases/${caseId}/rmra/sessions/${sessionId}/tasks/${item.id}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ domain: item.domain, ageBand: item.ageBand, ...discontinuedResp }),
      });
    }
    setResponses(newResponses);
    setDiscontinuedDomains(prev => new Set([...prev, domain]));
    setShowDiscontinueConfirm(null);
    toast({ title: `${domain} discontinued`, description: "Remaining tasks marked as not administered." });
  };

  // Tasks with no accuracy score and not intentionally discontinued
  const unscoredItems = useMemo(() =>
    items.filter(i => {
      const r = responses[i.id];
      if (!r) return true;
      if (r.discontinued) return false;
      return r.accuracy === null;
    }),
    [items, responses]
  );

  // ── Complete assessment ──────────────────────────────────────────────────────

  const handleComplete = async () => {
    if (!sessionId) return;
    if (currentTask && saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      await saveTask(currentTask.id, currentResponse, sessionId, currentTask.domain, currentTask.ageBand);
    }
    // Save general notes
    if (generalNotes) {
      await fetch(`${BASE_URL}/api/cases/${caseId}/rmra/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ generalNotes }),
      });
    }
    setCompleting(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/rmra/sessions/${sessionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setSession(data.session);
      toast({ title: "Assessment completed", description: "Domain scores saved. Generating report view…" });
    } catch {
      toast({ title: "Could not complete session", variant: "destructive" });
    } finally {
      setCompleting(false);
    }
  };

  const handleCompleteClick = () => {
    if (unscoredItems.length > 0) {
      setShowSkipConfirm(true);
    } else {
      handleComplete();
    }
  };

  // ── Render guards ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm">
          <AlertTriangle size={32} className="mx-auto mb-3 text-red-500" />
          <p className="font-semibold text-red-600 mb-1">Failed to load RMRA session.</p>
          <p className="text-xs text-slate-400 mb-4">{pageError}</p>
          <p className="text-xs text-slate-500 mb-4">
            This usually means the assignment link is stale. Go back to the case and click <strong>Administer RMRA</strong> again to get a fresh link.
          </p>
          <a
            href={caseId ? `/cases/${caseId}` : "/"}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-800 underline"
          >
            ← Back to Case
          </a>
        </div>
      </div>
    );
  }

  const isCompleted = session?.status === "completed";
  const theme = session?.theme ?? setupTheme;

  // ── Header ───────────────────────────────────────────────────────────────────

  const header = (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link href={`/cases/${caseId}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500 shrink-0">
            <ArrowLeft size={14} /> Back to Case
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-slate-800 truncate">RMRA — ReMynd Mathematical Reasoning Assessment</h1>
          {caseInfo && (
            <p className="text-xs text-slate-500 truncate">
              {caseInfo.studentName}{caseInfo.dob ? ` · Age ${calcAge(caseInfo.dob)}` : ""}
              {session?.ageBand ? ` · ${AGE_BANDS.find(b => b.value === session.ageBand)?.label}` : ""}
              {session?.version ? ` · ${session.version === "full" ? "Full Battery" : "Brief Battery"}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isCompleted && session?.status === "in_progress" && (
            <>
              <span className="text-xs text-slate-400 hidden sm:flex items-center gap-1">
                {savingStatus === "saving" ? <><Loader2 size={10} className="animate-spin" /> Saving…</> :
                 savingStatus === "saved" ? <><CheckCircle2 size={10} className="text-emerald-500" /> Saved</> :
                 "Auto-saving"}
              </span>
              {assignmentToken && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 hidden sm:flex"
                  title="Copy student view link"
                  onClick={() => {
                    const _url = __REPLIT_DEV_DOMAIN__
                      ? `https://${__REPLIT_DEV_DOMAIN__}${import.meta.env.BASE_URL}student-view/rmra/${assignmentToken}`
                      : `${window.location.origin}${import.meta.env.BASE_URL}student-view/rmra/${assignmentToken}`;
                    navigator.clipboard.writeText(_url);
                    toast({ title: "Link copied!", description: "Paste it into the student's browser." });
                  }}
                >
                  <Copy size={13} /> Student Link
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleCompleteClick}
                disabled={completing}
                className="gap-1.5 bg-violet-600 hover:bg-violet-700"
              >
                {completing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Complete Assessment
              </Button>
            </>
          )}
          {isCompleted && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
              <CheckCircle2 size={12} /> Completed
            </Badge>
          )}
        </div>
      </div>
      {/* Task progress bar */}
      {session?.status === "in_progress" && items.length > 0 && (
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: `${((currentTaskIdx + 1) / items.length) * 100}%` }}
          />
        </div>
      )}
    </div>
  );

  // ── Setup screen ─────────────────────────────────────────────────────────────

  if (session?.status === "not_started") {
    return (
      <div className="min-h-screen bg-slate-50">
        {header}
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-900 text-xs">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>Ensure the student is seated comfortably and testing conditions are optimal before beginning.</span>
          </div>

          {/* Age Band */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Age Band</h2>
            <div className="grid grid-cols-2 gap-3">
              {AGE_BANDS.map(b => (
                <button
                  key={b.value}
                  onClick={() => setSetupAgeBand(b.value)}
                  className={`p-3 rounded-lg text-left border transition-colors ${
                    setupAgeBand === b.value
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white text-slate-700 border-slate-200 hover:border-violet-300"
                  }`}
                >
                  <div className="text-sm font-medium">{b.label}</div>
                  <div className={`text-xs mt-0.5 ${setupAgeBand === b.value ? "text-violet-200" : "text-slate-400"}`}>{b.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Battery version */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Battery Version</h2>
            <div className="flex gap-3">
              {(["full", "brief"] as const).map(v => {
                const counts = ITEM_COUNTS[setupAgeBand] ?? { full: 16, brief: 14 };
                const n = counts[v];
                const label = v === "full" ? "Full Battery" : "Brief Battery";
                const time  = v === "full" ? "30–60 min" : "15–25 min";
                const note  = v === "full" ? "all domains" : "core domains only";
                return (
                  <button
                    key={v}
                    onClick={() => setSetupVersion(v)}
                    className={`flex-1 p-3 rounded-lg text-left border transition-colors ${
                      setupVersion === v
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-violet-300"
                    }`}
                  >
                    <div className="text-sm font-medium">{label}</div>
                    <div className={`text-xs mt-0.5 ${setupVersion === v ? "text-violet-200" : "text-slate-400"}`}>
                      {time} · <span className="font-semibold">{n} tasks</span> · {note}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Visual Theme</h2>
            <p className="text-xs text-slate-400 mb-4">The student will see tasks framed in this context. Choose what best engages them.</p>
            <div className="grid grid-cols-5 gap-2">
              {THEMES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setSetupTheme(t.value)}
                  className={`p-3 rounded-xl text-center border-2 transition-colors ${
                    setupTheme === t.value
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 bg-white hover:border-violet-300"
                  }`}
                >
                  <div className="text-2xl mb-1">{t.emoji}</div>
                  <div className="text-[10px] font-medium text-slate-600 leading-tight">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Student View Link */}
          {assignmentToken && (() => {
            const svUrl = __REPLIT_DEV_DOMAIN__
              ? `https://${__REPLIT_DEV_DOMAIN__}${import.meta.env.BASE_URL}student-view/rmra/${assignmentToken}`
              : `${window.location.origin}${import.meta.env.BASE_URL}student-view/rmra/${assignmentToken}`;
            return (
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-1">Student View Link</h2>
                <p className="text-xs text-slate-400 mb-3">Share this URL or scan the QR code on the student's device. They will see the task stimuli on their own screen.</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 font-mono truncate">
                    {svUrl}
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1.5"
                    onClick={() => { navigator.clipboard.writeText(svUrl); toast({ title: "Link copied!", description: "Paste it into the student's browser." }); }}>
                    <Copy size={13} /> Copy
                  </Button>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1.5"
                    onClick={() => window.open(svUrl, "_blank")}>
                    <ExternalLink size={13} /> Open
                  </Button>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1.5"
                    onClick={() => setShowSetupQr(v => !v)}>
                    {showSetupQr ? "Hide QR" : "Show QR"}
                  </Button>
                </div>
                {showSetupQr && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl inline-block">
                      <QRCodeSVG value={svUrl} size={180} level="H" />
                    </div>
                    <p className="text-xs text-slate-400">Point the student's camera at this code to open their view.</p>
                  </div>
                )}
              </div>
            );
          })()}

          <Button
            onClick={handleBegin}
            disabled={starting}
            className="w-full gap-2 bg-violet-600 hover:bg-violet-700 h-11 text-sm font-semibold"
          >
            {starting ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
            Begin Assessment
          </Button>
        </div>
      </div>
    );
  }

  // ── Completed screen — full report panel ──────────────────────────────────────

  if (isCompleted && session?.domainScores) {
    return (
      <div className="min-h-screen bg-slate-50">
        {header}
        <div className="max-w-5xl mx-auto px-4 py-6">
          <RmraReportPanel
            sessionId={sessionId}
            caseId={caseId}
            session={session as any}
          />
        </div>
      </div>
    );
  }

  // ── In-progress: main administration view ────────────────────────────────────

  if (!currentTask) {
    return (
      <div className="min-h-screen bg-slate-50">
        {header}
        <div className="flex items-center justify-center mt-20">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      </div>
    );
  }

  const themeObj = THEMES.find(t => t.value === theme);
  const prompt = currentTask.prompts[theme] ?? currentTask.prompts.space_mission;
  const isCurrentDiscontinued = discontinuedDomains.has(currentTask.domain);
  const totalAnswered = Object.keys(responses).length;

  return (<>
    <div className="min-h-screen bg-slate-50">
      {header}

      {/* Discontinue prompt */}
      {showDiscontinueConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowDiscontinueConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Discontinue {showDiscontinueConfirm}?</h2>
                <p className="text-sm text-slate-500 mt-1">
                  3 consecutive cannot-do responses detected. The standard is to discontinue this domain and move on. Remaining tasks will be marked as not administered.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowDiscontinueConfirm(null)}>Continue anyway</Button>
              <Button size="sm" onClick={() => handleDiscontinueDomain(showDiscontinueConfirm)} className="bg-amber-600 hover:bg-amber-700">
                <Flag size={13} className="mr-1.5" /> Discontinue Domain
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-screen-xl mx-auto px-4 py-5 flex gap-5">

        {/* ── Domain Sidebar ─────────────────────────────────────────────────── */}
        <div className="w-52 shrink-0 hidden lg:block">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden sticky top-20">
            <div className="px-3 py-2.5 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Domains</span>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-160px)]">
              {RMRA_DOMAINS.map(domain => {
                const stat = domainStats[domain] ?? { total: 0, done: 0, discontinued: false, canDoFails: 0 };
                const isCurrent = currentTask.domain === domain;
                const isDisc = stat.discontinued;
                const allDone = stat.total > 0 && stat.done >= stat.total;
                return (
                  <div
                    key={domain}
                    className={`px-3 py-2 border-b border-slate-50 last:border-0 ${isCurrent ? "bg-violet-50 border-l-2 border-l-violet-500" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-medium leading-tight truncate ${isCurrent ? "text-violet-700" : isDisc ? "text-slate-400" : "text-slate-700"}`}>
                        {domainShort(domain)}
                      </span>
                      {isDisc ? (
                        <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1 font-mono shrink-0">DNF</span>
                      ) : allDone ? (
                        <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                      ) : stat.total > 0 ? (
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">{stat.done}/{stat.total}</span>
                      ) : null}
                    </div>
                    {isCurrent && !isDisc && !isCompleted && stat.total > 0 && (
                      <button
                        onClick={() => setShowDiscontinueConfirm(domain)}
                        className="mt-1.5 text-[10px] text-amber-600 hover:text-amber-800 flex items-center gap-0.5"
                      >
                        <Flag size={9} /> Discontinue
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Task Panel ─────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Navigation + task counter */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleBack} disabled={currentTaskIdx === 0 || isCompleted} className="gap-1">
                <ChevronLeft size={14} /> Back
              </Button>
              <span className="text-xs text-slate-500 font-mono">
                {currentTaskIdx + 1} / {items.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isCurrentDiscontinued && (
                <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200">Domain Discontinued</Badge>
              )}
              <Button
                onClick={handleSaveAndNext}
                disabled={isCompleted || currentTaskIdx === items.length - 1}
                size="sm"
                className="gap-1 bg-violet-600 hover:bg-violet-700"
              >
                Save & Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>

          {/* Task prompt card */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-wrap">
              <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs">{currentTask.domain}</Badge>
              <Badge variant="outline" className="text-xs text-slate-500">{currentTask.taskType.replace(/_/g, " ")}</Badge>
              <Badge variant="outline" className="text-xs text-slate-500">{currentTask.visualType.replace(/_/g, " ")}</Badge>
              {themeObj && <span className="text-xs text-slate-400">{themeObj.emoji} {themeObj.label}</span>}
              <span className="ml-auto text-xs text-slate-400 font-mono">{currentTask.id}</span>
            </div>
            <div className="p-5">
              <p className="text-base font-semibold text-slate-900 leading-relaxed mb-4">{prompt}</p>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="font-medium text-slate-600 mb-0.5">Primary Construct</div>
                  <div className="text-slate-800">{currentTask.primaryConstruct}</div>
                </div>
                {currentTask.secondaryConstructs.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="font-medium text-slate-600 mb-0.5">Secondary Constructs</div>
                    <div className="text-slate-800">{currentTask.secondaryConstructs.join(", ")}</div>
                  </div>
                )}
                {currentTask.exactAnswer !== undefined && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <div className="font-medium text-emerald-700 mb-0.5">Expected Answer</div>
                    <div className="text-emerald-900 font-mono">{String(currentTask.exactAnswer)}</div>
                  </div>
                )}
                {currentResponse.studentAnswer && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="font-medium text-amber-700 mb-0.5">Student Submitted</div>
                    <div className="text-amber-900 font-mono font-bold text-base">{currentResponse.studentAnswer}</div>
                  </div>
                )}
                {currentTask.expectedAnswerRange && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <div className="font-medium text-blue-700 mb-0.5">Acceptable Range</div>
                    <div className="text-blue-900 font-mono">{currentTask.expectedAnswerRange[0]} – {currentTask.expectedAnswerRange[1]}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Estimation flash trigger — own section above scoring */}
          {(currentTask.taskType === "estimation" || currentTask.taskType === "subitizing") && !isCompleted && (
            <div className="mb-4">
              {!stimulusTimerStartedAt ? (
                <Button
                  onClick={handleShowAndStartTimer}
                  className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5 text-sm"
                >
                  <Zap size={13} />
                  {currentTask.taskType === "subitizing" ? "Start" : "Show & Start Flash"}
                </Button>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <Zap size={13} className="text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-800 font-medium flex-1">
                    {currentTask.taskType === "subitizing"
                      ? `${({ space_mission: "Stars", city_builder: "Bricks", bakery_math: "Cookies", robot_factory: "Bolts", treasure_builder: "Gems" } as Record<string,string>)[theme] ?? "Items"} shown — student sees them for 2 s, then must type their count`
                      : "Stimulus shown — student sees items for 3 s, then must estimate"}
                  </p>
                  <button
                    onClick={() => {
                      updateCurrentResponse("attempts", Math.min(9, currentResponse.attempts + 1));
                      handleShowAndStartTimer();
                    }}
                    className="text-xs text-amber-700 border border-amber-300 rounded-lg px-2.5 py-1 hover:bg-amber-100 font-medium shrink-0 flex items-center gap-1"
                  >
                    <Zap size={11} /> {currentTask.taskType === "subitizing" ? "Start Again" : "Flash Again"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Scoring Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Target size={14} className="text-violet-500" /> Scoring
            </h3>

            <div className="grid sm:grid-cols-2 gap-5">
              {/* Accuracy */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">
                  Accuracy <span className="text-slate-400">(max {currentTask.scoring.accuracy})</span>
                </label>
                <div className="flex gap-2">
                  {ACCURACY_LABELS.slice(0, currentTask.scoring.accuracy + 1).map((label, i) => (
                    <button
                      key={i}
                      onClick={() => !isCompleted && updateCurrentResponse("accuracy", i)}
                      disabled={isCompleted}
                      title={label}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                        currentResponse.accuracy === i
                          ? i === 0 ? "bg-red-500 text-white border-red-500"
                          : i === 1 ? "bg-amber-400 text-white border-amber-400"
                          : "bg-emerald-500 text-white border-emerald-500"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      } ${isCompleted ? "opacity-70" : ""}`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {currentResponse.accuracy !== null ? ACCURACY_LABELS[currentResponse.accuracy] : "Not recorded"}
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">
                  Reasoning Quality <span className="text-slate-400">(0–{currentTask.scoring.reasoning})</span>
                </label>
                <div className="flex gap-1.5">
                  {Array.from({ length: currentTask.scoring.reasoning + 1 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => !isCompleted && updateCurrentResponse("reasoning", i)}
                      disabled={isCompleted}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                        currentResponse.reasoning === i
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-violet-200"
                      } ${isCompleted ? "opacity-70" : ""}`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              {/* Strategy Level */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-600">Strategy Level</label>
                  {currentResponse.strategyLabel && (
                    <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
                      Level {currentResponse.strategyLevel} selected
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {STRATEGY_HIERARCHY.map((opt, i) => {
                    const isSelected = currentResponse.strategyLabel === opt;
                    return (
                      <button
                        key={i}
                        disabled={isCompleted}
                        onClick={() => {
                          if (isSelected) {
                            updateCurrentResponse("strategyLevel", null);
                            updateCurrentResponse("strategyLabel", null);
                          } else {
                            updateCurrentResponse("strategyLevel", i);
                            updateCurrentResponse("strategyLabel", opt);
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-colors disabled:opacity-50 ${
                          isSelected
                            ? "bg-violet-600 text-white border-violet-600"
                            : "bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:bg-violet-50"
                        }`}
                      >
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                        }`}>{i}</span>
                        <span className="text-xs leading-tight">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hints */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">
                  <Lightbulb size={11} className="inline mr-0.5 text-amber-500" /> Hint Level Used
                </label>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map(level => (
                    <div key={level} className="relative flex-1">
                      <button
                        onClick={() => !isCompleted && updateCurrentResponse("hintLevel", level)}
                        onMouseEnter={() => setShowHintTooltip(level)}
                        onMouseLeave={() => setShowHintTooltip(null)}
                        disabled={isCompleted}
                        className={`w-full py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                          currentResponse.hintLevel === level
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
                        } ${isCompleted ? "opacity-70" : ""}`}
                      >
                        {level}
                      </button>
                      {showHintTooltip === level && level > 0 && (
                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] rounded-lg p-2.5 w-52 z-10 shadow-lg leading-relaxed whitespace-normal pointer-events-none">
                          <div className="font-semibold text-amber-300 mb-1">Hint {level}:</div>
                          {currentTask.hints[level - 1] ?? "—"}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {currentResponse.hintLevel === 0 ? "No hints given" : `Hint ${currentResponse.hintLevel} given`}
                </div>
              </div>

              {/* Attempts + Self-Correction */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-600 mb-2 block">Attempts</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => !isCompleted && updateCurrentResponse("attempts", Math.max(1, currentResponse.attempts - 1))}
                      disabled={isCompleted}
                      className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:border-slate-300 font-bold"
                    >−</button>
                    <span className="text-base font-bold text-slate-800 w-6 text-center">{currentResponse.attempts}</span>
                    <button
                      onClick={() => !isCompleted && updateCurrentResponse("attempts", Math.min(9, currentResponse.attempts + 1))}
                      disabled={isCompleted}
                      className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:border-slate-300 font-bold"
                    >+</button>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-600 mb-2 block">Self-Correction</label>
                  <button
                    onClick={() => !isCompleted && updateCurrentResponse("selfCorrection", !currentResponse.selfCorrection)}
                    disabled={isCompleted}
                    className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                      currentResponse.selfCorrection
                        ? "bg-teal-500 text-white border-teal-500"
                        : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
                    } ${isCompleted ? "opacity-70" : ""}`}
                  >
                    {currentResponse.selfCorrection ? "✓ Yes" : "No"}
                  </button>
                </div>
              </div>

              {/* Confidence Rating — always shown; auto-populated from student submission */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1.5 block">
                  Student Confidence
                  {currentResponse.confidenceRating !== null && (
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">Student submitted</span>
                  )}
                </label>
                <div className="flex gap-1.5">
                  {CONFIDENCE_LABELS.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => !isCompleted && updateCurrentResponse("confidenceRating", i)}
                      disabled={isCompleted}
                      title={label}
                      className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-colors text-center ${
                        currentResponse.confidenceRating === i
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                      } ${isCompleted ? "opacity-70" : ""}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {currentResponse.confidenceRating !== null ? CONFIDENCE_LABELS[currentResponse.confidenceRating] : "Not yet submitted by student"}
                </div>
              </div>

              {/* Timer */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1.5 block">
                  <Timer size={11} className="text-slate-400" /> Response Timer
                </label>
                  <div className="flex items-center gap-2">
                  <span className={`font-mono text-xl font-bold tabular-nums ${timerRunning ? "text-violet-600" : "text-slate-800"}`}>
                    {fmtTime(timerElapsed)}
                  </span>
                  {!isCompleted && (
                    <div className="flex gap-1.5">
                      {!timerRunning ? (
                        <Button size="sm" onClick={startTimer} className="h-7 bg-emerald-600 hover:bg-emerald-700 px-2 gap-1">
                          <Play size={11} />
                        </Button>
                      ) : (
                        <Button size="sm" onClick={stopTimer} className="h-7 bg-red-600 hover:bg-red-700 px-2">
                          <Square size={11} />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={resetTimer} disabled={timerRunning} className="h-7 px-2">
                        <RotateCcw size={11} />
                      </Button>
                    </div>
                  )}
                  {currentResponse.responseTimeSeconds != null && !timerRunning && (
                    <span className="text-xs text-slate-400">{currentResponse.responseTimeSeconds}s recorded</span>
                  )}
                </div>
              </div>

              {/* First / Final Response */}
              <div className="sm:col-span-2">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">First Response (verbatim)</label>
                    <Textarea
                      value={currentResponse.firstResponse}
                      onChange={e => !isCompleted && updateCurrentResponse("firstResponse", e.target.value)}
                      disabled={isCompleted}
                      placeholder="Record the student's first answer exactly…"
                      className="min-h-[60px] text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">Final Response</label>
                    <Textarea
                      value={currentResponse.finalResponse}
                      onChange={e => !isCompleted && updateCurrentResponse("finalResponse", e.target.value)}
                      disabled={isCompleted}
                      placeholder="Final answer after prompts / hints…"
                      className="min-h-[60px] text-sm resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Examiner Notes */}
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Task Notes</label>
                <Textarea
                  value={currentResponse.examinerNotes}
                  onChange={e => !isCompleted && updateCurrentResponse("examinerNotes", e.target.value)}
                  disabled={isCompleted}
                  placeholder="Behavioural observations, error analysis, qualitative notes…"
                  className="min-h-[60px] text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Productive Struggle Panel */}
          {currentTask.productiveStruggleTrigger && (
            <div className="bg-white border border-amber-200 rounded-xl p-5 mb-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-1 flex items-center gap-2">
                <Brain size={14} className="text-amber-600" /> Productive Struggle Observation
              </h3>
              <p className="text-xs text-amber-600 mb-4">This task is flagged as a productive struggle trigger. Rate the student on each dimension (0 = lowest, 4 = highest).</p>

              <div className="space-y-4">
                {Object.entries(PRODUCTIVE_STRUGGLE_RUBRIC).map(([key, labels]) => {
                  const field = `productiveStruggle${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof TaskResponseState;
                  const val = currentResponse[field] as number | null;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-slate-700">{PS_LABELS[key]}</span>
                        <span className="text-xs text-slate-400">{val !== null ? labels[val] : "Not rated"}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {labels.map((label, i) => (
                          <button
                            key={i}
                            title={label}
                            onClick={() => !isCompleted && updatePS(field, i)}
                            disabled={isCompleted}
                            className={`flex-1 py-2 rounded-lg border-2 text-xs font-bold transition-colors ${
                              val === i
                                ? "bg-amber-500 text-white border-amber-500"
                                : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
                            } ${isCompleted ? "opacity-70" : ""}`}
                          >
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Session General Notes */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <BookOpen size={14} className="text-slate-400" /> Session Notes
            </h3>
            <Textarea
              value={generalNotes}
              onChange={e => {
                if (!isCompleted) setGeneralNotes(e.target.value);
              }}
              disabled={isCompleted}
              placeholder="General session observations, conditions, student affect…"
              className="min-h-[70px] text-sm resize-none"
            />
          </div>

          {/* Bottom navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handleBack} disabled={currentTaskIdx === 0 || isCompleted} className="gap-1">
              <ChevronLeft size={14} /> Back
            </Button>
            <div className="flex items-center gap-2">
              {currentTaskIdx < items.length - 1 ? (
                <Button onClick={handleSaveAndNext} disabled={isCompleted} size="sm" className="gap-1 bg-violet-600 hover:bg-violet-700">
                  Save & Next <ChevronRight size={14} />
                </Button>
              ) : (
                <Button
                  onClick={handleCompleteClick}
                  disabled={completing || isCompleted}
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                >
                  {completing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Complete Assessment
                </Button>
              )}
            </div>
          </div>

          {/* Domain task count — mobile fallback */}
          <div className="mt-5 lg:hidden bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-600">Domain Progress · {totalAnswered}/{items.length} tasks</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-slate-100">
              {RMRA_DOMAINS.map(domain => {
                const stat = domainStats[domain] ?? { total: 0, done: 0, discontinued: false, canDoFails: 0 };
                const isCurrent = currentTask.domain === domain;
                return (
                  <div key={domain} className={`bg-white px-3 py-2 flex items-center justify-between gap-1 ${isCurrent ? "ring-1 ring-inset ring-violet-400" : ""}`}>
                    <span className={`text-xs truncate ${stat.discontinued ? "text-slate-400" : isCurrent ? "text-violet-700 font-medium" : "text-slate-600"}`}>
                      {domainShort(domain)}
                    </span>
                    {stat.discontinued ? (
                      <span className="text-[10px] text-slate-400 font-mono">DNF</span>
                    ) : stat.total > 0 ? (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{stat.done}/{stat.total}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Unscored-task confirmation dialog */}
    <Dialog open={showSkipConfirm} onOpenChange={setShowSkipConfirm}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle size={16} className="text-amber-500" />
            {unscoredItems.length} task{unscoredItems.length !== 1 ? "s" : ""} not yet scored
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          The following tasks have no score recorded. You can go back and score them, or complete the session as-is (they will count as 0%).
        </p>
        <div className="rounded-lg border border-amber-200 bg-amber-50 divide-y divide-amber-100 max-h-56 overflow-y-auto">
          {unscoredItems.map(item => {
            const idx = items.indexOf(item);
            return (
              <button
                key={item.id}
                className="w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-amber-100 transition-colors group"
                onClick={() => {
                  setShowSkipConfirm(false);
                  setCurrentTaskIdx(idx);
                }}
              >
                <div>
                  <p className="text-xs font-medium text-slate-700 group-hover:text-violet-700">{item.domain}</p>
                  <p className="text-[11px] text-slate-400">{item.id}</p>
                </div>
                <span className="text-[11px] text-violet-600 font-medium shrink-0 opacity-0 group-hover:opacity-100">Go to task →</span>
              </button>
            );
          })}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowSkipConfirm(false)}
          >
            <ChevronLeft size={13} /> Go back and score
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => { setShowSkipConfirm(false); handleComplete(); }}
            disabled={completing}
          >
            {completing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Complete anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>);
}
