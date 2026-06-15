import { useParams, Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Save, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronRight,
  Mic, Hash, BookOpen, Info, Loader2, FileCheck, Play, Square, RotateCcw,
  Sparkles, Printer, RefreshCw
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ──────────────────────────────────────────────────────────────────

interface ItemAnswer {
  response: string;
  score: number | null;
  excluded: boolean;
  notes: string;
}

interface RapidNamingData {
  time: string;
  errors: string;
  corrections: string;
  rating: string;
  notes: string;
}

interface RppiAnswers {
  mode: string;
  items: Record<string, ItemAnswer>;
  rapidNaming: { letters: RapidNamingData; digits: RapidNamingData };
  generalNotes: string;
}

interface FormItem {
  id: string;
  type: string;
  domain: string;
  text: string;
  note?: string;
  options?: string[];
}

interface RppiSession {
  assignment: { id: string; status: string; toolName: string; submittedAt?: string; createdAt?: string };
  case: { studentName: string; dob?: string; id: string } | null;
  formItems: FormItem[];
  draft: RppiAnswers | null;
  existingAnswers: RppiAnswers | null;
  summary: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DOMAINS = [
  { key: "rhyming",      label: "Domain 1: Rhyming Awareness" },
  { key: "blending",     label: "Domain 2: Phoneme Blending" },
  { key: "segmentation", label: "Domain 3: Phoneme Segmentation" },
  { key: "deletion",     label: "Domain 4: Phoneme Deletion / Elision" },
  { key: "substitution", label: "Domain 5: Phoneme Substitution" },
  { key: "nonword",      label: "Domain 6: Nonword Repetition" },
  { key: "rapid_naming", label: "Domain 7: Rapid Naming" },
];

const RAPID_NAMING_RATINGS = ["Typical", "Mild Concern", "Moderate Concern", "Significant Concern"];

const LETTER_GRID = ["A","M","T","R","S","P","N","K","D","L"];
const DIGIT_GRID  = ["2","7","4","8","3","5","9","1","2","7"];

function calcAge(dob?: string): string {
  if (!dob) return "";
  const birth = new Date(dob);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const adj = months < 0 || (months === 0 && now.getDate() < birth.getDate()) ? -1 : 0;
  return `${years + adj}`;
}

function getRiskBadge(pct: number | null) {
  if (pct === null) return null;
  if (pct >= 85) return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Low Concern ({pct}%)</Badge>;
  if (pct >= 70) return <Badge className="bg-sky-100 text-sky-800 border-sky-200">Mild Concern ({pct}%)</Badge>;
  if (pct >= 50) return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Moderate Concern ({pct}%)</Badge>;
  return <Badge className="bg-red-100 text-red-800 border-red-200">Significant Concern ({pct}%)</Badge>;
}

function computeDomainScore(items: FormItem[], domain: string, answers: Record<string, ItemAnswer>): { raw: number; pct: number; administered: number } | null {
  const domainItems = items.filter(i => i.type === "rppi_item" && i.domain === domain);
  if (!domainItems.length) return null;
  let total = 0, administered = 0;
  for (const item of domainItems) {
    const a = answers[item.id];
    if (a && !a.excluded) {
      total += a.score ?? 0;
      administered++;
    }
  }
  if (!administered) return null;
  return { raw: Math.round(total * 100) / 100, pct: Math.round((total / administered) * 100), administered };
}

function defaultRapidNaming(): RapidNamingData {
  return { time: "", errors: "", corrections: "", rating: "", notes: "" };
}

function defaultAnswers(): RppiAnswers {
  return { mode: "Virtual", items: {}, rapidNaming: { letters: defaultRapidNaming(), digits: defaultRapidNaming() }, generalNotes: "" };
}

// ─── Score dropdown ───────────────────────────────────────────────────────────

function ScoreSelect({ value, excluded, onChange, onExclude }: {
  value: number | null;
  excluded: boolean;
  onChange: (v: number | null) => void;
  onExclude: (v: boolean) => void;
}) {
  const display = excluded ? "na" : value === null ? "" : String(value);
  return (
    <Select
      value={display}
      onValueChange={v => {
        if (v === "na") { onExclude(true); onChange(null); }
        else { onExclude(false); onChange(v === "" ? null : parseFloat(v)); }
      }}
    >
      <SelectTrigger className={`w-40 text-sm ${excluded ? "bg-slate-100 text-slate-400" : value === 1 ? "bg-emerald-50 border-emerald-300 text-emerald-800" : value === 0.5 ? "bg-amber-50 border-amber-300 text-amber-800" : value === 0 ? "bg-red-50 border-red-300 text-red-800" : ""}`}>
        <SelectValue placeholder="Score…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">1 — Correct</SelectItem>
        <SelectItem value="0.5">0.5 — Partial / self-corrected</SelectItem>
        <SelectItem value="0">0 — Incorrect / No response</SelectItem>
        <SelectItem value="na">N/A — Not administered</SelectItem>
      </SelectContent>
    </Select>
  );
}

// ─── Single scored item row ────────────────────────────────────────────────

function ItemRow({ item, itemNum, answer, onChange }: {
  item: FormItem;
  itemNum: number;
  answer: ItemAnswer;
  onChange: (a: ItemAnswer) => void;
}) {
  const borderColor = answer.excluded
    ? "border-slate-200"
    : answer.score === 1 ? "border-emerald-300"
    : answer.score === 0.5 ? "border-amber-300"
    : answer.score === 0 ? "border-red-300"
    : "border-slate-200";

  const bgColor = answer.excluded
    ? "bg-slate-50 opacity-60"
    : answer.score === 1 ? "bg-emerald-50/30"
    : answer.score === 0.5 ? "bg-amber-50/30"
    : answer.score === 0 ? "bg-red-50/20"
    : "bg-white";

  return (
    <div className={`border-2 rounded-xl overflow-hidden transition-colors ${borderColor} ${bgColor}`}>
      {/* Prompt bar — what the examiner reads aloud */}
      <div className="bg-slate-900 px-4 py-3 flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center mt-0.5">
          {itemNum}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-1">Say aloud</span>
          <p className="text-white font-semibold text-base leading-snug tracking-wide">{item.text}</p>
        </div>
      </div>

      {/* Expected answer hint */}
      {item.note && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
          <span className="text-emerald-600 text-xs font-bold">✓ Expected:</span>
          <span className="text-emerald-800 text-sm font-medium">{item.note}</span>
        </div>
      )}

      {/* Scoring row */}
      <div className="px-4 pt-3 pb-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-500 font-medium block mb-1">Student's verbal response</label>
            <Input
              value={answer.response}
              onChange={e => onChange({ ...answer, response: e.target.value })}
              placeholder="Type what the student said…"
              className="text-sm h-9"
              disabled={answer.excluded}
            />
          </div>
          <div className="flex-shrink-0">
            <label className="text-xs text-slate-500 font-medium block mb-1">Score</label>
            <ScoreSelect
              value={answer.score}
              excluded={answer.excluded}
              onChange={v => onChange({ ...answer, score: v })}
              onExclude={v => onChange({ ...answer, excluded: v })}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">Examiner notes (optional)</label>
          <Input
            value={answer.notes}
            onChange={e => onChange({ ...answer, notes: e.target.value })}
            placeholder="e.g. hesitated, self-corrected, distracted…"
            className="text-sm h-8"
            disabled={answer.excluded}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Domain section ───────────────────────────────────────────────────────────

function DomainSection({ domain, label, items, answers, onChange }: {
  domain: string;
  label: string;
  items: FormItem[];
  answers: Record<string, ItemAnswer>;
  onChange: (id: string, a: ItemAnswer) => void;
}) {
  const [open, setOpen] = useState(true);
  const headerItem = items.find(i => i.domain === domain && i.type === "section_header");
  const scoredItems = items.filter(i => i.domain === domain && i.type === "rppi_item");
  const scored = scoredItems.filter(i => answers[i.id]?.score !== null && answers[i.id] !== undefined && !answers[i.id]?.excluded).length;
  const total = scoredItems.filter(i => !answers[i.id]?.excluded).length;
  const score = computeDomainScore(items, domain, answers);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
          <span className="font-semibold text-slate-800">{label}</span>
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{scored}/{total} scored</span>
        </div>
        {score && <div className="flex items-center gap-2">{getRiskBadge(score.pct)}</div>}
      </button>
      {open && (
        <div className="p-4 space-y-3">
          {headerItem?.note && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
              <Info size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
              <span>{headerItem.note}</span>
            </div>
          )}
          {scoredItems.map((item, idx) => (
            <ItemRow
              key={item.id}
              item={item}
              itemNum={idx + 1}
              answer={answers[item.id] ?? { response: "", score: null, excluded: false, notes: "" }}
              onChange={a => onChange(item.id, a)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stopwatch hook ───────────────────────────────────────────────────────────

function useStopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);

  const start = useCallback(() => {
    if (isRunning) return;
    startTimeRef.current = Date.now() - elapsedRef.current * 1000;
    intervalRef.current = setInterval(() => {
      const next = Math.floor((Date.now() - startTimeRef.current) / 1000);
      elapsedRef.current = next;
      setElapsed(next);
    }, 100);
    setIsRunning(true);
  }, [isRunning]);

  const stop = useCallback((): number => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    return elapsedRef.current;
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    elapsedRef.current = 0;
    setIsRunning(false);
    setElapsed(0);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return { elapsed, isRunning, start, stop, reset };
}

function formatStopwatch(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Rapid naming auto-scorer ─────────────────────────────────────────────────
// Adjusted time = raw seconds + (errors × 3) + (self-corrections × 1)
// Thresholds (50-item grid):  ≤50 → Typical | 51–75 → Mild | 76–110 → Moderate | >110 → Significant

function computeRapidNamingRating(
  time: string, errors: string, corrections: string
): { rating: string; adjustedTime: number } | null {
  const t = parseFloat(time);
  if (!t || t <= 0) return null;
  const e = parseFloat(errors) || 0;
  const c = parseFloat(corrections) || 0;
  const adj = t + e * 3 + c * 1;
  const rating =
    adj <= 50  ? "Typical" :
    adj <= 75  ? "Mild Concern" :
    adj <= 110 ? "Moderate Concern" :
                 "Significant Concern";
  return { rating, adjustedTime: Math.round(adj * 10) / 10 };
}

// ─── Rapid naming grid ────────────────────────────────────────────────────────

function RapidNamingGrid({ symbols, rows = 5 }: { symbols: string[]; rows?: number }) {
  const cells: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (const s of symbols) cells.push(s);
  }
  return (
    <div className="font-mono text-lg font-bold text-slate-800 bg-white border-2 border-slate-300 rounded-lg p-4 select-none">
      <div className={`grid gap-x-3 gap-y-2`} style={{ gridTemplateColumns: `repeat(${symbols.length}, minmax(0, 1fr))` }}>
        {cells.map((c, i) => (
          <span key={i} className="text-center text-xl leading-tight tracking-widest">{c}</span>
        ))}
      </div>
    </div>
  );
}

function RapidNamingSection({ items, rapidNaming, onChange }: {
  items: FormItem[];
  rapidNaming: { letters: RapidNamingData; digits: RapidNamingData };
  onChange: (v: { letters: RapidNamingData; digits: RapidNamingData }) => void;
}) {
  const [open, setOpen] = useState(true);
  const headerItem = items.find(i => i.domain === "rapid_naming" && i.type === "section_header");
  const letterItem = items.find(i => i.id === "rppi_d7_letters");
  const digitItem  = items.find(i => i.id === "rppi_d7_digits");

  const lettersTimer = useStopwatch();
  const digitsTimer  = useStopwatch();

  const [lettersOverride, setLettersOverride] = useState(false);
  const [digitsOverride,  setDigitsOverride]  = useState(false);

  const updateTask = (task: "letters" | "digits", field: keyof RapidNamingData, value: string) => {
    onChange({ ...rapidNaming, [task]: { ...rapidNaming[task], [field]: value } });
  };

  // Auto-score letters whenever time / errors / corrections change (unless overridden)
  useEffect(() => {
    if (lettersOverride) return;
    const result = computeRapidNamingRating(
      rapidNaming.letters.time, rapidNaming.letters.errors, rapidNaming.letters.corrections
    );
    const next = result?.rating ?? "";
    if (next !== rapidNaming.letters.rating) {
      onChange({ ...rapidNaming, letters: { ...rapidNaming.letters, rating: next } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rapidNaming.letters.time, rapidNaming.letters.errors, rapidNaming.letters.corrections, lettersOverride]);

  // Auto-score digits
  useEffect(() => {
    if (digitsOverride) return;
    const result = computeRapidNamingRating(
      rapidNaming.digits.time, rapidNaming.digits.errors, rapidNaming.digits.corrections
    );
    const next = result?.rating ?? "";
    if (next !== rapidNaming.digits.rating) {
      onChange({ ...rapidNaming, digits: { ...rapidNaming.digits, rating: next } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rapidNaming.digits.time, rapidNaming.digits.errors, rapidNaming.digits.corrections, digitsOverride]);

  const RnTaskCard = ({ task, title, item, grid }: { task: "letters" | "digits"; title: string; item?: FormItem; grid: string[] }) => {
    const data     = rapidNaming[task];
    const timer    = task === "letters" ? lettersTimer : digitsTimer;
    const override = task === "letters" ? lettersOverride : digitsOverride;
    const setOverride = task === "letters" ? setLettersOverride : setDigitsOverride;

    const autoResult = computeRapidNamingRating(data.time, data.errors, data.corrections);
    const ratingRisk = data.rating === "Typical" ? "low" : data.rating === "Mild Concern" ? "mild" : data.rating === "Moderate Concern" ? "moderate" : data.rating === "Significant Concern" ? "significant" : null;
    const ratingColour = ratingRisk === "low" ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : ratingRisk === "mild"     ? "bg-sky-100 text-sky-800 border-sky-200"
      : ratingRisk === "moderate" ? "bg-amber-100 text-amber-800 border-amber-200"
      : ratingRisk === "significant" ? "bg-red-100 text-red-800 border-red-200"
      : "bg-slate-100 text-slate-500 border-slate-200";

    const handleStop = () => {
      const secs = timer.stop();
      if (secs > 0) updateTask(task, "time", String(secs));
    };

    return (
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 flex items-center gap-2">
          <Hash size={14} className="text-slate-500" />
          <span className="font-semibold text-sm text-slate-800">{title}</span>
          {data.rating && (
            <Badge className={`text-xs ${ratingRisk === "low" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : ratingRisk === "mild" ? "bg-sky-100 text-sky-800 border-sky-200" : ratingRisk === "moderate" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-red-100 text-red-800 border-red-200"}`}>
              {data.rating}
            </Badge>
          )}
        </div>
        <div className="p-4 space-y-4">
          {item?.note && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800">
              <Info size={12} className="mt-0.5 flex-shrink-0" />
              <span>{item.note}</span>
            </div>
          )}

          {/* ── Stopwatch ── */}
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <span className={`font-mono text-3xl font-bold tabular-nums w-20 text-center select-none ${timer.isRunning ? "text-emerald-700" : timer.elapsed > 0 ? "text-slate-800" : "text-slate-400"}`}>
              {formatStopwatch(timer.elapsed)}
            </span>
            <div className="flex items-center gap-2">
              {!timer.isRunning ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={timer.start}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 px-3"
                >
                  <Play size={13} /> Start
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleStop}
                  className="bg-red-600 hover:bg-red-700 text-white gap-1.5 h-8 px-3"
                >
                  <Square size={13} /> Stop
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={timer.reset}
                disabled={timer.elapsed === 0 && !timer.isRunning}
                className="h-8 px-2"
              >
                <RotateCcw size={13} />
              </Button>
            </div>
            {!timer.isRunning && timer.elapsed > 0 && (
              <span className="text-xs text-emerald-600 font-medium">Time auto-filled ✓</span>
            )}
            <span className="ml-auto text-xs text-slate-400 hidden sm:block">Student completes the full grid</span>
          </div>

          <RapidNamingGrid symbols={grid} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Time (seconds)</label>
              <Input type="number" min="0" value={data.time} onChange={e => updateTask(task, "time", e.target.value)} placeholder="e.g. 45" className="text-sm h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Errors</label>
              <Input type="number" min="0" value={data.errors} onChange={e => updateTask(task, "errors", e.target.value)} placeholder="0" className="text-sm h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Self-corrections</label>
              <Input type="number" min="0" value={data.corrections} onChange={e => updateTask(task, "corrections", e.target.value)} placeholder="0" className="text-sm h-9" />
            </div>
          </div>

          {/* ── Auto-scored rating ── */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Rating</span>
                {!override && (
                  <span className="text-[10px] bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5 font-medium">Auto-scored</span>
                )}
              </div>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-700 underline underline-offset-2 transition-colors"
                onClick={() => {
                  if (override) {
                    setOverride(false);
                  } else {
                    setOverride(true);
                  }
                }}
              >
                {override ? "Use auto-score" : "Override"}
              </button>
            </div>

            {override ? (
              <Select value={data.rating} onValueChange={v => updateTask(task, "rating", v)}>
                <SelectTrigger className="text-sm h-9 bg-white">
                  <SelectValue placeholder="Select rating…" />
                </SelectTrigger>
                <SelectContent>
                  {RAPID_NAMING_RATINGS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                {autoResult ? (
                  <div className="flex items-center gap-3">
                    <Badge className={`text-sm px-3 py-1 border font-semibold ${ratingColour}`}>
                      {autoResult.rating}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {parseFloat(data.time)}s + {parseFloat(data.errors) || 0} errors×3 + {parseFloat(data.corrections) || 0} corrections×1 = <strong>{autoResult.adjustedTime}s adjusted</strong>
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Enter time above to auto-score</p>
                )}
              </>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Notes</label>
            <Textarea value={data.notes} onChange={e => updateTask(task, "notes", e.target.value)} placeholder="Any observations about this task…" className="text-sm min-h-[60px] resize-none" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
          <span className="font-semibold text-slate-800">Domain 7: Rapid Naming</span>
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">2 tasks</span>
        </div>
      </button>
      {open && (
        <div className="p-4 space-y-4">
          {headerItem?.note && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
              <Info size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
              <span>{headerItem.note}</span>
            </div>
          )}
          <RnTaskCard task="letters" title="Task A: Rapid Letter Naming" item={letterItem} grid={LETTER_GRID} />
          <RnTaskCard task="digits" title="Task B: Rapid Digit Naming"  item={digitItem}  grid={DIGIT_GRID} />
        </div>
      )}
    </div>
  );
}

// ─── Live score summary ────────────────────────────────────────────────────────

function ScoreSummaryPanel({ formItems, answers, rapidNaming }: {
  formItems: FormItem[];
  answers: Record<string, ItemAnswer>;
  rapidNaming: { letters: RapidNamingData; digits: RapidNamingData };
}) {
  const scored_domains = ["rhyming", "blending", "segmentation", "deletion", "substitution", "nonword"];
  const paScore = computeDomainScore(formItems, "rhyming", answers);

  const paTotal = scored_domains.slice(0, 5).reduce((sum, d) => {
    const s = computeDomainScore(formItems, d, answers);
    return sum + (s?.raw ?? 0);
  }, 0);
  const paPct = Math.round((paTotal / 50) * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 sticky top-4">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen size={14} className="text-primary" />
        <span className="text-sm font-semibold text-slate-700">Live Scores</span>
      </div>
      {scored_domains.map(domain => {
        const s = computeDomainScore(formItems, domain, answers);
        return (
          <div key={domain} className="flex items-center justify-between text-xs">
            <span className="text-slate-600 capitalize">{domain.replace("_", " ")}</span>
            {s ? (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-800">{s.raw}/{s.administered}</span>
                {getRiskBadge(s.pct)}
              </div>
            ) : <span className="text-slate-300">—</span>}
          </div>
        );
      })}
      <div className="border-t pt-2 mt-1">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-700">PA Composite</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-800">{Math.round(paTotal * 100) / 100}/50</span>
            {paTotal > 0 && getRiskBadge(paPct)}
          </div>
        </div>
      </div>
      {(rapidNaming.letters.rating || rapidNaming.digits.rating) && (
        <div className="border-t pt-2">
          <div className="text-xs text-slate-500 font-medium mb-1">Rapid Naming</div>
          {rapidNaming.letters.rating && <div className="text-xs flex justify-between"><span>Letters</span><span className="font-medium">{rapidNaming.letters.rating}</span></div>}
          {rapidNaming.digits.rating && <div className="text-xs flex justify-between mt-0.5"><span>Digits</span><span className="font-medium">{rapidNaming.digits.rating}</span></div>}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RppiAdminPage() {
  const params = useParams<{ id: string; assignmentId: string }>();
  const caseId = params.id;
  const assignmentId = params.assignmentId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>({});
  const [rapidNaming, setRapidNaming] = useState<{ letters: RapidNamingData; digits: RapidNamingData }>({ letters: defaultRapidNaming(), digits: defaultRapidNaming() });
  const [mode, setMode] = useState("Virtual");
  const [generalNotes, setGeneralNotes] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError } = useQuery<RppiSession>({
    queryKey: [`/api/cases/${caseId}/assignments/${assignmentId}/rppi`],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rppi`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  useEffect(() => {
    if (!data || initialized) return;
    const source = data.existingAnswers ?? data.draft;
    if (source) {
      setAnswers(source.items ?? {});
      setRapidNaming(source.rapidNaming ?? { letters: defaultRapidNaming(), digits: defaultRapidNaming() });
      setMode(source.mode ?? "Virtual");
      setGeneralNotes(source.generalNotes ?? "");
    }
    if (data.summary) setSummary(data.summary);
    setInitialized(true);
  }, [data, initialized]);

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/response/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      if (!r.ok) throw new Error(await r.text());
      const { summary: s } = await r.json();
      setSummary(s);
      setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      toast({ title: "Summary generated", description: "AI clinical summary is ready." });
    } catch {
      toast({ title: "Summary failed", description: "Could not generate summary. Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const buildAnswers = useCallback((): RppiAnswers => ({
    mode,
    items: answers,
    rapidNaming,
    generalNotes,
  }), [mode, answers, rapidNaming, generalNotes]);

  const saveDraft = useCallback(async (silent = true) => {
    if (!initialized) return;
    setSaving(true);
    try {
      await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rppi/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
        body: JSON.stringify(buildAnswers()),
      });
      setSavedAt(new Date());
    } catch {
      if (!silent) toast({ title: "Save failed", description: "Could not save draft.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [initialized, caseId, assignmentId, buildAnswers, toast]);

  useEffect(() => {
    if (!initialized) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => saveDraft(true), 15000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [answers, rapidNaming, mode, generalNotes, initialized, saveDraft]);

  const handleItemChange = (id: string, a: ItemAnswer) => {
    setAnswers(prev => ({ ...prev, [id]: a }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rppi/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
        body: JSON.stringify(buildAnswers()),
      });
      if (!r.ok) throw new Error(await r.text());
      await queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      toast({ title: "RPPI submitted", description: "Scores have been saved to the case profile." });
      setLocation(`/cases/${caseId}`);
    } catch {
      toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  const formItems = data?.formItems ?? [];
  const isCompleted = data?.assignment.status === "completed";

  const scoredItemIds = formItems.filter(i => i.type === "rppi_item").map(i => i.id);
  const totalScorable = scoredItemIds.filter(id => !answers[id]?.excluded).length;
  const totalScored = scoredItemIds.filter(id => answers[id]?.score !== null && answers[id] !== undefined && !answers[id]?.excluded).length;
  const progress = totalScorable > 0 ? Math.round((totalScored / totalScorable) * 100) : 0;

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-primary" />
    </div>
  );

  if (isError || !data) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">
      Failed to load RPPI session.
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600">
              <ArrowLeft size={15} /> Back to Case
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-900 text-sm sm:text-base truncate">
              ReMynd Phonological Processing Index (RPPI)
            </h1>
            {data.case && (
              <p className="text-xs text-slate-500 truncate">
                {data.case.studentName}{data.case.dob ? ` · Age ${calcAge(data.case.dob)}` : ""} · Case {caseId.slice(0, 8)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <>
                {summary && (
                  <Button variant="ghost" size="sm" onClick={() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="gap-1.5 text-violet-600 hover:text-violet-700 hidden sm:flex">
                    <Sparkles size={14} /> View Summary
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleGenerateSummary} disabled={isGenerating} className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50">
                  {isGenerating ? <><RefreshCw size={13} className="animate-spin" /> Generating…</> : <><Sparkles size={13} /> {summary ? "Regenerate" : "Generate Summary"}</>}
                </Button>
                <Button size="sm" onClick={() => window.print()} className="gap-1.5">
                  <Printer size={13} /> Print / Download PDF
                </Button>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 hidden sm:flex">
                  <CheckCircle2 size={12} /> Submitted
                </Badge>
              </>
            ) : (
              <>
                <span className="text-xs text-slate-400 hidden sm:block">
                  {saving ? (
                    <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Saving…</span>
                  ) : savedAt ? (
                    <span className="flex items-center gap-1"><Save size={10} /> Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  ) : null}
                </span>
                <Button variant="outline" size="sm" onClick={() => saveDraft(false)} disabled={saving} className="gap-1.5 hidden sm:flex">
                  <Save size={14} /> Save Draft
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => setShowSubmitConfirm(true)} disabled={submitting}>
                  <FileCheck size={14} /> Submit RPPI
                </Button>
              </>
            )}
          </div>
        </div>
        {/* Progress bar */}
        {!isCompleted && (
          <div className="h-1 bg-slate-100">
            <div className="h-1 bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {isCompleted && (
          <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-800 text-sm">
            <CheckCircle2 size={16} />
            <span>This RPPI session has been submitted. Results are saved to the case profile. To amend, contact your Assessment Lead.</span>
          </div>
        )}

        {/* ── AI Summary panel ── */}
        {isCompleted && summary && (
          <div ref={summaryRef} className="mb-6 bg-white border border-violet-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-violet-50 border-b border-violet-100">
              <Sparkles size={14} className="text-violet-600" />
              <span className="text-sm font-semibold text-violet-800">AI Clinical Summary</span>
              <span className="ml-auto text-[10px] text-violet-400 bg-violet-100 rounded-full px-2 py-0.5">AI-generated · Review before use</span>
            </div>
            <div className="p-5">
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">
                {summary}
              </div>
            </div>
          </div>
        )}

        {/* Clinical disclaimer */}
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-900 text-xs">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>The RPPI is a non-diagnostic educational decision-support tool. It does not diagnose dyslexia or any other condition. Results should be interpreted alongside developmental history, academic achievement, classroom performance, and other assessment findings.</span>
        </div>

        {/* Administration instructions */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-900">
          <p className="font-semibold mb-1 flex items-center gap-2"><Mic size={14} /> Administration Instructions</p>
          <p>Read each item aloud <strong>exactly as written</strong>. Do not teach, correct, or give feedback during the assessment. The student should respond verbally. Type the student's response as closely as possible. Score each item before moving to the next item.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-6">
          <div className="space-y-4">
            {/* Session info */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Clock size={14} className="text-slate-400" /> Session Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Student name</label>
                  <p className="text-sm font-semibold text-slate-800">{data.case?.studentName ?? "—"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Date</label>
                  <p className="text-sm text-slate-800">{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Administration mode</label>
                  <Select value={mode} onValueChange={setMode} disabled={isCompleted}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Virtual">Virtual</SelectItem>
                      <SelectItem value="In-Person">In-Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-2 bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs text-slate-500 whitespace-nowrap">{totalScored}/{totalScorable} items scored</span>
              </div>
            </div>

            {/* Domains 1–6 */}
            {DOMAINS.slice(0, 6).map(d => (
              <DomainSection
                key={d.key}
                domain={d.key}
                label={d.label}
                items={formItems}
                answers={answers}
                onChange={handleItemChange}
              />
            ))}

            {/* Domain 7: Rapid Naming */}
            <RapidNamingSection
              items={formItems}
              rapidNaming={rapidNaming}
              onChange={setRapidNaming}
            />

            {/* General notes */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <label className="text-sm font-semibold text-slate-700 block mb-2">General Examiner Notes</label>
              <p className="text-xs text-slate-400 mb-3">Record any observations about the administration, student behaviour, or contextual factors that may have affected performance.</p>
              <Textarea
                value={generalNotes}
                onChange={e => setGeneralNotes(e.target.value)}
                placeholder="e.g. Student appeared anxious at the start but settled after the practice items. Fatigue noted toward the end of Domain 6…"
                className="min-h-[100px] text-sm resize-none"
                disabled={isCompleted}
              />
            </div>

            {/* Submit button (bottom) */}
            {!isCompleted && (
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => saveDraft(false)} disabled={saving} className="gap-1.5">
                  <Save size={14} /> Save Draft
                </Button>
                <Button onClick={() => setShowSubmitConfirm(true)} disabled={submitting} className="gap-1.5">
                  <FileCheck size={14} /> Submit RPPI
                </Button>
              </div>
            )}
          </div>

          {/* Score panel (sidebar) */}
          <div className="hidden xl:block">
            <ScoreSummaryPanel formItems={formItems} answers={answers} rapidNaming={rapidNaming} />
          </div>
        </div>
      </div>

      {/* Submit confirmation dialog */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Submit RPPI?</h2>
            <p className="text-sm text-slate-600 mb-1">
              You have scored <strong>{totalScored} of {totalScorable}</strong> administered items ({progress}% complete).
            </p>
            <p className="text-sm text-slate-500 mb-5">
              Submitting will save all scores to the case profile and mark this session as complete.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowSubmitConfirm(false)} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {submitting ? "Submitting…" : "Yes, Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
