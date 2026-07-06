import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { Loader2 } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const POLL_MS = 3000;

// ── Theme Config ──────────────────────────────────────────────────────────────

const THEME_CFG = {
  space_mission: {
    bg: "bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900",
    header: "bg-indigo-900/40 border-indigo-700/30",
    promptCard: "bg-indigo-950/80 border-indigo-600/40",
    promptText: "text-white",
    taskCard: "bg-white",
    hint: "bg-amber-900/40 border-amber-600/40 text-amber-200",
    sub: "text-indigo-300",
    bodyText: "text-white",
    dimText: "text-white/40",
    mascot: "🚀",
    name: "Space Mission",
    accent: "#818cf8",
    accentDark: "#6366f1",
    waitTitle: "Mission Control is preparing your task…",
    waitSub: "Take a deep breath — you've got this, space explorer! 🌟",
    doneTitle: "Mission Accomplished! 🌟",
    doneSub: "Outstanding work, space explorer! Your math skills are out of this world.",
    dark: true,
  },
  city_builder: {
    bg: "bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100",
    header: "bg-white/80 border-sky-200",
    promptCard: "bg-white border-sky-300 shadow-sm",
    promptText: "text-slate-900",
    taskCard: "bg-white",
    hint: "bg-amber-50 border-amber-300 text-amber-800",
    sub: "text-sky-700",
    bodyText: "text-slate-900",
    dimText: "text-slate-400",
    mascot: "🏙️",
    name: "City Builder",
    accent: "#f97316",
    accentDark: "#ea580c",
    waitTitle: "Getting your next challenge ready…",
    waitSub: "A great city builder always thinks before building! 🏗️",
    doneTitle: "City Built! 🏆",
    doneSub: "Amazing work! You built a great foundation of math knowledge.",
    dark: false,
  },
  bakery_math: {
    bg: "bg-gradient-to-br from-amber-50 via-rose-50 to-orange-100",
    header: "bg-white/90 border-rose-200",
    promptCard: "bg-white border-rose-300 shadow-sm",
    promptText: "text-slate-900",
    taskCard: "bg-white",
    hint: "bg-amber-50 border-amber-300 text-amber-800",
    sub: "text-rose-600",
    bodyText: "text-slate-900",
    dimText: "text-slate-400",
    mascot: "🧁",
    name: "Bakery Math",
    accent: "#f43f5e",
    accentDark: "#e11d48",
    waitTitle: "Chef's kitchen is getting ready…",
    waitSub: "Great bakers always take their time! 🎂",
    doneTitle: "Perfectly Baked! 🎂",
    doneSub: "Delicious work! Your math is as sweet as ever.",
    dark: false,
  },
  robot_factory: {
    bg: "bg-gradient-to-br from-zinc-950 via-gray-900 to-slate-950",
    header: "bg-zinc-800/60 border-zinc-700/50",
    promptCard: "bg-zinc-800/90 border-zinc-600",
    promptText: "text-white",
    taskCard: "bg-white",
    hint: "bg-amber-900/40 border-amber-600/40 text-amber-200",
    sub: "text-teal-400",
    bodyText: "text-white",
    dimText: "text-white/40",
    mascot: "🤖",
    name: "Robot Factory",
    accent: "#2dd4bf",
    accentDark: "#0d9488",
    waitTitle: "Systems initialising…",
    waitSub: "Your robot brain is warming up! ⚡",
    doneTitle: "All Systems Go! ⚡",
    doneSub: "Excellent processing! Your math circuits are fully operational.",
    dark: true,
  },
  treasure_builder: {
    bg: "bg-gradient-to-br from-amber-950 via-yellow-900 to-orange-950",
    header: "bg-amber-900/50 border-amber-700/40",
    promptCard: "bg-amber-950/80 border-amber-700/50",
    promptText: "text-white",
    taskCard: "bg-white",
    hint: "bg-amber-900/40 border-amber-600/40 text-amber-200",
    sub: "text-yellow-300",
    bodyText: "text-white",
    dimText: "text-white/40",
    mascot: "🏴‍☠️",
    name: "Treasure Builder",
    accent: "#fbbf24",
    accentDark: "#d97706",
    waitTitle: "The treasure chest is being filled…",
    waitSub: "Every great pirate thinks carefully! 💰",
    doneTitle: "Treasure Found! 💰",
    doneSub: "X marks the spot — you solved all the challenges!",
    dark: true,
  },
} as const;

type ThemeKey = keyof typeof THEME_CFG;

// ── PRNG ──────────────────────────────────────────────────────────────────────

function seededRand(seed: number) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = s ^ (s >>> 16);
    return (s >>> 0) / 0xffffffff;
  };
}

function strSeed(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}

function parseFrac(val: string | number | undefined): [number, number] | null {
  if (val === undefined) return null;
  if (typeof val === "number") return null;
  const m = String(val).match(/^(\d+)\/(\d+)$/);
  return m ? [parseInt(m[1]), parseInt(m[2])] : null;
}

// ── Shared style tokens ───────────────────────────────────────────────────────

const TASK_LABEL = "text-[11px] uppercase tracking-widest font-semibold text-slate-400 mb-2";
const CARD_INNER = "rounded-xl border border-slate-200 p-4 bg-white";

// ── Visual: Dot Array ─────────────────────────────────────────────────────────
// Structured groups for subitizing; scattered for estimation

const ESTIMATION_FLASH_MS = 3000;

function DotArrayVisual({ taskId, dotCount, taskType, accent, timerStartedAt }: {
  taskId: string; dotCount: number; taskType: string; accent: string; timerStartedAt: string | null;
}) {
  const count = Math.min(dotCount, 30);
  const rng = seededRand(strSeed(taskId));
  const isComparison = taskType === "quantity_comparison";
  const isEstimation = taskType === "estimation";

  // Server-driven flash timer: starts when examiner broadcasts timerStartedAt
  const calcRemaining = () =>
    timerStartedAt
      ? Math.max(0, ESTIMATION_FLASH_MS - (Date.now() - new Date(timerStartedAt).getTime()))
      : ESTIMATION_FLASH_MS;

  const [msLeft, setMsLeft] = useState(calcRemaining);
  const [dotsHidden, setDotsHidden] = useState(() =>
    isEstimation && timerStartedAt
      ? Date.now() - new Date(timerStartedAt).getTime() >= ESTIMATION_FLASH_MS
      : false
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isEstimation) return;
    if (!timerStartedAt) {
      // Examiner hasn't started the timer yet — stay in waiting state
      setMsLeft(ESTIMATION_FLASH_MS);
      setDotsHidden(false);
      return;
    }
    const remaining = calcRemaining();
    if (remaining <= 0) {
      setMsLeft(0);
      setDotsHidden(true);
      return;
    }
    setMsLeft(remaining);
    setDotsHidden(false);
    const TICK = 100;
    intervalRef.current = setInterval(() => {
      const left = calcRemaining();
      setMsLeft(left);
      if (left <= 0) {
        clearInterval(intervalRef.current!);
        setDotsHidden(true);
      }
    }, TICK);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [taskId, isEstimation, timerStartedAt]);

  if (isComparison) {
    // Side-by-side two groups
    const leftN = count; const rightN = Math.round(count * (0.6 + rng() * 0.6));
    const cols = (n: number) => Math.ceil(Math.sqrt(n));
    const renderGroup = (n: number, xOff: number) =>
      Array.from({ length: n }, (_, i) => {
        const c = cols(n);
        const cx = xOff + (i % c) * 22 + 11;
        const cy = Math.floor(i / c) * 22 + 11;
        return <circle key={i} cx={cx} cy={cy} r={9} fill={accent + "d0"} stroke={accent} strokeWidth={1} />;
      });
    const lCols = cols(leftN); const rCols = cols(rightN);
    const lW = lCols * 22 + 10; const rW = rCols * 22 + 10;
    const h = Math.max(Math.ceil(leftN / lCols), Math.ceil(rightN / rCols)) * 22 + 10;
    const totalW = lW + 40 + rW;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Which group has more?</p>
        <svg viewBox={`0 0 ${totalW} ${h}`} className="w-full max-w-xs mx-auto">
          {renderGroup(leftN, 5)}
          <text x={lW + 20} y={h / 2 + 5} textAnchor="middle" fontSize={20} fill="#64748b" fontWeight="bold">?</text>
          {renderGroup(rightN, lW + 40)}
        </svg>
      </div>
    );
  }

  // Subitizing / estimation — structured grid with slight jitter
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cellSize = Math.min(36, Math.floor(220 / cols));
  const W = cols * cellSize + 20; const H = rows * cellSize + 20;

  // Countdown ring dimensions
  const R = 22; const CIRC = 2 * Math.PI * R;
  const progress = msLeft / ESTIMATION_FLASH_MS;

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>
        {taskType === "subitizing" ? "How many — just look!" : "Estimate — don't count one by one"}
      </p>

      {isEstimation && !timerStartedAt ? (
        /* Waiting for examiner to trigger the stimulus */
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="text-5xl animate-pulse">🎯</div>
          <p className="text-center font-semibold text-slate-600 text-base">Get ready…</p>
          <p className="text-center text-slate-400 text-sm">Your teacher will show the picture</p>
        </div>
      ) : dotsHidden ? (
        /* Timer expired — student speaks their estimate */
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="text-5xl">🤔</div>
          <p className="text-center font-semibold text-slate-700 text-lg">What's your estimate?</p>
          <p className="text-center text-slate-500 text-sm">Speak your answer aloud</p>
        </div>
      ) : (
        /* Dots visible + countdown ring */
        <>
          {isEstimation && (
            <div className="flex justify-center mb-2">
              <svg width={56} height={56} viewBox="0 0 56 56">
                <circle cx={28} cy={28} r={R} fill="none" stroke="#e2e8f0" strokeWidth={4} />
                <circle
                  cx={28} cy={28} r={R}
                  fill="none"
                  stroke={accent}
                  strokeWidth={4}
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - progress)}
                  strokeLinecap="round"
                  transform="rotate(-90 28 28)"
                  style={{ transition: "stroke-dashoffset 0.1s linear" }}
                />
                <text x={28} y={33} textAnchor="middle" fontSize={16} fontWeight="700" fill={accent}>
                  {Math.ceil(msLeft / 1000)}
                </text>
              </svg>
            </div>
          )}
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[220px] mx-auto">
            {Array.from({ length: count }, (_, i) => {
              const col = i % cols; const row = Math.floor(i / cols);
              const cx = col * cellSize + cellSize / 2 + 10 + (rng() - 0.5) * (cellSize * 0.2);
              const cy = row * cellSize + cellSize / 2 + 10 + (rng() - 0.5) * (cellSize * 0.2);
              return <circle key={i} cx={cx} cy={cy} r={Math.min(12, cellSize * 0.35)} fill={accent + "d0"} stroke={accent} strokeWidth={1.5} />;
            })}
          </svg>
        </>
      )}
    </div>
  );
}

// ── Visual: Number Line ───────────────────────────────────────────────────────

function NumberLineVisual({ scaleMin, scaleMax, accent }: {
  scaleMin: number; scaleMax: number; accent: string;
}) {
  const minVal = scaleMin; const maxVal = scaleMax;
  const range = maxVal - minVal;
  const step = range <= 20 ? 1 : range <= 100 ? 10 : range <= 1000 ? 100 : 1000;
  const [markerPos, setMarkerPos] = useState(0.5);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const W = 300; const lineY = 55; const L = 28; const R = W - 28;
  const toX = (t: number) => L + t * (R - L);
  const fromClientX = (cx: number) => {
    if (!svgRef.current) return markerPos;
    const rect = svgRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (cx - rect.left) / rect.width * W - L) / (R - L));
  };

  const tickCount = Math.min(10, Math.ceil((maxVal - minVal) / step));
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i / tickCount);

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Point to your answer on the number line</p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} 90`}
        className="w-full max-w-sm mx-auto touch-none select-none"
        style={{ cursor: "col-resize" }}
        onMouseDown={e => { dragging.current = true; setMarkerPos(fromClientX(e.clientX)); }}
        onMouseMove={e => { if (dragging.current) setMarkerPos(fromClientX(e.clientX)); }}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
        onTouchStart={e => { dragging.current = true; setMarkerPos(fromClientX(e.touches[0].clientX)); e.preventDefault(); }}
        onTouchMove={e => { if (dragging.current) setMarkerPos(fromClientX(e.touches[0].clientX)); e.preventDefault(); }}
        onTouchEnd={() => { dragging.current = false; }}
      >
        <line x1={L} y1={lineY} x2={R} y2={lineY} stroke="#334155" strokeWidth={3} strokeLinecap="round" />
        <polygon points={`${R + 2},${lineY} ${R - 9},${lineY - 4} ${R - 9},${lineY + 4}`} fill="#334155" />
        {ticks.map((t, i) => {
          const x = toX(t);
          const val = Math.round(minVal + t * (maxVal - minVal));
          const isMain = i === 0 || i === tickCount || i === Math.floor(tickCount / 2);
          return (
            <g key={i}>
              <line x1={x} y1={lineY - (isMain ? 10 : 6)} x2={x} y2={lineY + (isMain ? 10 : 6)} stroke="#475569" strokeWidth={isMain ? 2.5 : 1.5} />
              {isMain && <text x={x} y={lineY + 22} textAnchor="middle" fontSize={12} fill="#475569" fontWeight="600">{val}</text>}
            </g>
          );
        })}
        {/* Draggable pointer — no value label */}
        <line x1={toX(markerPos)} y1={lineY - 22} x2={toX(markerPos)} y2={lineY + 2} stroke={accent} strokeWidth={2} strokeDasharray="3,2" />
        <polygon points={`${toX(markerPos)},${lineY - 22} ${toX(markerPos) - 8},${lineY - 36} ${toX(markerPos) + 8},${lineY - 36}`} fill={accent} />
      </svg>
    </div>
  );
}

// ── Visual: Base Ten Blocks ───────────────────────────────────────────────────

type BlockKey = "th" | "h" | "t" | "o";
const BLOCK_DEFS: { key: BlockKey; label: string; name: string; color: string; w: number; h: number }[] = [
  { key: "th", label: "1000", name: "Th.", color: "#6366f1", w: 30, h: 30 },
  { key: "h",  label: "100",  name: "H.",  color: "#0ea5e9", w: 24, h: 24 },
  { key: "t",  label: "10",   name: "T.",  color: "#10b981", w: 10, h: 40 },
  { key: "o",  label: "1",    name: "O.",  color: "#f59e0b", w: 14, h: 14 },
];

function BaseTenBlocksVisual({ thousands, hundreds, tens, ones, accent }: {
  thousands: number; hundreds: number; tens: number; ones: number; accent: string;
}) {
  // Workspace: student builds their answer by dragging blocks from the palette
  const [ws, setWs] = useState<Record<BlockKey, number>>({ th: 0, h: 0, t: 0, o: 0 });
  const dragKey = useRef<BlockKey | null>(null);
  const [dropping, setDropping] = useState(false);

  // Palette block counts from the stimulus
  const palette: Record<BlockKey, number> = {
    th: Math.min(thousands, 5), h: Math.min(hundreds, 5),
    t: Math.min(tens, 9), o: Math.min(ones, 9),
  };

  const addToWorkspace = (key: BlockKey) => setWs(w => ({ ...w, [key]: Math.min((w[key] ?? 0) + 1, 9) }));
  const removeFromWorkspace = (key: BlockKey) => setWs(w => ({ ...w, [key]: Math.max((w[key] ?? 0) - 1, 0) }));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropping(false);
    if (dragKey.current) { addToWorkspace(dragKey.current); dragKey.current = null; }
  };

  const Block = ({ color, w, h }: { color: string; w: number; h: number }) => (
    <div style={{ width: w, height: h, backgroundColor: color + "40", border: `2.5px solid ${color}`, borderRadius: 3, flexShrink: 0 }} />
  );

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Drag blocks into the workspace — build the number</p>

      {/* Palette (stimulus) */}
      <div className="flex items-end justify-center gap-3 pb-2 border-b border-slate-100 mb-2">
        {BLOCK_DEFS.filter(d => palette[d.key] > 0).map(({ key, label, color, w, h }) => (
          <div key={key} className="flex flex-col items-center gap-1">
            <div className="flex flex-col gap-0.5 items-center cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={() => { dragKey.current = key; }}
              onClick={() => addToWorkspace(key)}
            >
              {Array.from({ length: palette[key] }, (_, i) => (
                <Block key={i} color={color} w={w} h={h} />
              ))}
            </div>
            <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Drop Zone / Workspace */}
      <div
        className={`min-h-[64px] rounded-xl border-2 border-dashed p-2 transition-colors ${dropping ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
        onDragOver={e => { e.preventDefault(); setDropping(true); }}
        onDragLeave={() => setDropping(false)}
        onDrop={handleDrop}
      >
        <p className="text-[10px] text-slate-400 text-center mb-1">
          {Object.values(ws).every(v => v === 0) ? "Drag or tap blocks above ↑ to add here" : "Workspace"}
        </p>
        <div className="flex items-end gap-3 flex-wrap justify-center">
          {BLOCK_DEFS.filter(d => ws[d.key] > 0).map(({ key, label, color, w, h }) => (
            <button key={key} onClick={() => removeFromWorkspace(key)}
              className="flex flex-col items-center gap-0.5 hover:opacity-70 transition-opacity"
              title={`Remove ${label}`}>
              {Array.from({ length: ws[key] }, (_, i) => <Block key={i} color={color} w={w} h={h} />)}
              <span className="text-[9px] font-bold" style={{ color }}>{ws[key]}×{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Visual: Fraction Bar ──────────────────────────────────────────────────────

function FractionBarVisual({ numerator, denominator, accent }: {
  numerator: number; denominator: number; accent: string;
}) {
  const den = Math.max(denominator, 2);
  const [selected, setSelected] = useState(0); // number of shaded cells (0 = student hasn't answered)
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const W = 280; const H = 52; const PAD = 10;
  const barW = W - PAD * 2;
  const cellW = barW / den;

  const posToCount = (clientX: number) => {
    if (!svgRef.current) return selected;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width * W - PAD;
    return Math.max(0, Math.min(den, Math.round(relX / cellW)));
  };

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Drag to shade — how many parts?</p>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H + 24}`}
        className="w-full max-w-xs mx-auto touch-none select-none"
        style={{ cursor: "col-resize" }}
        onMouseDown={e => { dragging.current = true; setSelected(posToCount(e.clientX)); }}
        onMouseMove={e => { if (dragging.current) setSelected(posToCount(e.clientX)); }}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
        onTouchStart={e => { dragging.current = true; setSelected(posToCount(e.touches[0].clientX)); e.preventDefault(); }}
        onTouchMove={e => { if (dragging.current) setSelected(posToCount(e.touches[0].clientX)); e.preventDefault(); }}
        onTouchEnd={() => { dragging.current = false; }}
      >
        {/* Cell backgrounds */}
        {Array.from({ length: den }, (_, i) => (
          <rect key={i} x={PAD + i * cellW} y={4} width={cellW - 1} height={H}
            fill={i < selected ? accent + "c0" : "#f1f5f9"}
            stroke={i < selected ? accent : "#94a3b8"} strokeWidth={i < selected ? 2 : 1.5} />
        ))}
        {/* Drag handle at boundary */}
        {selected > 0 && selected < den && (
          <rect x={PAD + selected * cellW - 4} y={2} width={8} height={H + 4} rx={3}
            fill={accent} opacity={0.9} style={{ cursor: "col-resize" }} />
        )}
        {/* Instruction hint */}
        <text x={W / 2} y={H + 20} textAnchor="middle" fontSize={11} fill="#94a3b8">
          {selected === 0 ? "Drag across the bar ↑" : `${selected} of ${den} parts shaded`}
        </text>
      </svg>
    </div>
  );
}

// ── Visual: Fraction Circle ───────────────────────────────────────────────────

function FractionCircleVisual({ numerator, denominator, accent }: {
  numerator: number; denominator: number; accent: string;
}) {
  const den = Math.max(denominator, 2);
  const [selected, setSelected] = useState(0);
  const R = 72; const cx = 100; const cy = 95;

  const makeSlice = (i: number) => {
    const a1 = (i / den) * 2 * Math.PI - Math.PI / 2;
    const a2 = ((i + 1) / den) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + R * Math.cos(a1); const y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2); const y2 = cy + R * Math.sin(a2);
    return `M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${1 / den > 0.5 ? 1 : 0},1 ${x2},${y2}Z`;
  };

  const handleSlice = (i: number) => setSelected(prev => (i + 1 === prev ? i : i + 1));

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Tap the slices — how many are shaded?</p>
      <svg viewBox="0 0 200 185" className="w-48 mx-auto touch-none select-none">
        {Array.from({ length: den }, (_, i) => (
          <path key={i} d={makeSlice(i)}
            fill={i < selected ? accent + "c0" : "#f1f5f9"}
            stroke={i < selected ? accent : "#94a3b8"}
            strokeWidth={i < selected ? 2 : 1.5}
            style={{ cursor: "pointer" }}
            onClick={() => handleSlice(i)}
          />
        ))}
      </svg>
      <p className="text-center text-xs text-slate-500 mt-1">
        {selected === 0 ? "Tap a slice to shade it" : `${selected} of ${den} slices shaded`}
      </p>
    </div>
  );
}

// ── Visual: Balance Scale ─────────────────────────────────────────────────────

const WEIGHT_TOKENS = [1, 2, 3, 5, 10];

function BalanceScaleVisual({ taskId, accent }: { taskId: string; accent: string }) {
  const [leftW, setLeftW] = useState<number[]>([]);
  const [rightW, setRightW] = useState<number[]>([]);
  const [dropHighlight, setDropHighlight] = useState<"left" | "right" | null>(null);
  const dragVal = useRef<number | null>(null);

  const leftTotal = leftW.reduce((s, v) => s + v, 0);
  const rightTotal = rightW.reduce((s, v) => s + v, 0);
  // Tilt: positive = right side down (right heavier), negative = left side down
  const rawTilt = (rightTotal - leftTotal);
  const tiltDeg = Math.max(-28, Math.min(28, rawTilt * 3));
  const tiltRad = (tiltDeg * Math.PI) / 180;
  const arm = 80; const cx = 130; const cy = 72;
  const lx = cx - arm * Math.cos(tiltRad); const ly = cy - arm * Math.sin(tiltRad);
  const rx = cx + arm * Math.cos(tiltRad); const ry = cy + arm * Math.sin(tiltRad);
  const panH = 40;

  const onDrop = (side: "left" | "right") => {
    if (dragVal.current === null) return;
    const v = dragVal.current; dragVal.current = null;
    if (side === "left") setLeftW(w => [...w, v]);
    else setRightW(w => [...w, v]);
    setDropHighlight(null);
  };
  const removeLeft = (i: number) => setLeftW(w => w.filter((_, j) => j !== i));
  const removeRight = (i: number) => setRightW(w => w.filter((_, j) => j !== i));

  const panHighlight = (side: "left" | "right") => dropHighlight === side ? "#dbeafe" : accent + "18";

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Drag weights onto the pans — balance the scale</p>

      {/* Weight token palette */}
      <div className="flex justify-center gap-2 mb-2">
        {WEIGHT_TOKENS.map(v => (
          <div key={v} draggable
            onDragStart={() => { dragVal.current = v; }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold cursor-grab active:cursor-grabbing border-2 select-none"
            style={{ backgroundColor: accent + "22", borderColor: accent, color: accent }}>
            {v}
          </div>
        ))}
      </div>

      {/* Scale SVG */}
      <svg viewBox="0 0 260 200" className="w-full max-w-xs mx-auto">
        {/* Pole */}
        <line x1={cx} y1={10} x2={cx} y2={cy} stroke="#64748b" strokeWidth={5} strokeLinecap="round" />
        {/* Beam */}
        <line x1={lx} y1={ly} x2={rx} y2={ry} stroke="#334155" strokeWidth={5} strokeLinecap="round"
          style={{ transition: "all 0.35s ease" }} />
        {/* Strings */}
        <line x1={lx} y1={ly} x2={lx} y2={ly + panH} stroke="#64748b" strokeWidth={2.5}
          style={{ transition: "all 0.35s ease" }} />
        <line x1={rx} y1={ry} x2={rx} y2={ry + panH} stroke="#64748b" strokeWidth={2.5}
          style={{ transition: "all 0.35s ease" }} />
        {/* Fulcrum */}
        <polygon points={`${cx},${cy + 2} ${cx - 14},${cy + 52} ${cx + 14},${cy + 52}`} fill="#94a3b8" />
        <line x1={cx - 20} y1={cy + 52} x2={cx + 20} y2={cy + 52} stroke="#64748b" strokeWidth={4} />
      </svg>

      {/* Pans as HTML drop zones (below SVG to avoid SVG hit-area issues) */}
      <div className="grid grid-cols-2 gap-3 -mt-2">
        {(["left", "right"] as const).map((side, si) => {
          const weights = side === "left" ? leftW : rightW;
          const total = side === "left" ? leftTotal : rightTotal;
          const remove = side === "left" ? removeLeft : removeRight;
          return (
            <div key={side}
              onDragOver={e => { e.preventDefault(); setDropHighlight(side); }}
              onDragLeave={() => setDropHighlight(null)}
              onDrop={e => { e.preventDefault(); onDrop(side); }}
              className="rounded-xl border-2 border-dashed min-h-[52px] p-2 text-center transition-colors"
              style={{ borderColor: accent, backgroundColor: panHighlight(side) }}>
              <p className="text-[10px] font-bold mb-1" style={{ color: accent }}>
                {side === "left" ? "Left Pan" : "Right Pan"}
                {total > 0 ? ` (${total})` : ""}
              </p>
              <div className="flex flex-wrap justify-center gap-1">
                {weights.map((v, i) => (
                  <button key={i} onClick={() => remove(i)}
                    className="w-7 h-7 rounded-full text-[10px] font-bold border"
                    style={{ backgroundColor: accent + "30", borderColor: accent, color: accent }}
                    title="Tap to remove">
                    {v}
                  </button>
                ))}
              </div>
              {weights.length === 0 && <p className="text-[9px] text-slate-400">drop here</p>}
            </div>
          );
        })}
      </div>

      {/* Balance readout */}
      <p className="text-center text-xs mt-2 font-semibold"
        style={{ color: leftTotal === rightTotal && leftTotal > 0 ? "#16a34a" : "#94a3b8" }}>
        {leftTotal === 0 && rightTotal === 0 ? "Add weights to both pans" :
          leftTotal === rightTotal ? "⚖️ Balanced!" :
          leftTotal > rightTotal ? `Left heavier by ${leftTotal - rightTotal}` : `Right heavier by ${rightTotal - leftTotal}`}
      </p>
    </div>
  );
}

// ── Visual: Pattern Builder ───────────────────────────────────────────────────

function PatternBuilderVisual({ taskId, accent }: { taskId: string; accent: string }) {
  const rng = seededRand(strSeed(taskId));
  const SHAPES = ["circle", "square", "triangle", "diamond"];
  const COLORS = [accent, "#0ea5e9", "#10b981", "#f59e0b"];
  const patternLen = 2 + Math.floor(rng() * 2);
  const unit: { shape: string; color: string }[] = Array.from({ length: patternLen }, () => ({
    shape: SHAPES[Math.floor(rng() * 3)],
    color: COLORS[Math.floor(rng() * COLORS.length)],
  }));
  const fullRow = [...unit, ...unit];

  // Student fills the third row: starts empty, each cell filled by tapping palette
  const [filled, setFilled] = useState<(null | { shape: string; color: string })[]>(
    Array(fullRow.length).fill(null)
  );
  const [selected, setSelected] = useState<{ shape: string; color: string } | null>(null);

  const fillNext = (ci: number) => {
    if (filled[ci] !== null) {
      // Clear cell on second tap
      setFilled(prev => { const n = [...prev]; n[ci] = null; return n; });
    } else if (selected) {
      setFilled(prev => { const n = [...prev]; n[ci] = selected; return n; });
    }
  };

  const S = 36; const gap = 6; const rowH = S + gap;
  const W = fullRow.length * (S + gap) + 4; const H = 3 * rowH + 8;

  const renderShape = (shape: string, color: string, x: number, y: number) => {
    if (shape === "circle") return <circle cx={x + S / 2} cy={y + S / 2} r={S / 2 - 2} fill={color + "b0"} stroke={color} strokeWidth={2} />;
    if (shape === "triangle") return <polygon points={`${x + S / 2},${y + 3} ${x + S - 3},${y + S - 3} ${x + 3},${y + S - 3}`} fill={color + "b0"} stroke={color} strokeWidth={2} />;
    if (shape === "diamond") return <polygon points={`${x + S / 2},${y + 2} ${x + S - 2},${y + S / 2} ${x + S / 2},${y + S - 2} ${x + 2},${y + S / 2}`} fill={color + "b0"} stroke={color} strokeWidth={2} />;
    return <rect x={x + 2} y={y + 2} width={S - 4} height={S - 4} rx={5} fill={color + "b0"} stroke={color} strokeWidth={2} />;
  };

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Continue the pattern — pick a shape from the palette, then tap each blank</p>

      {/* Palette: one of each shape in the pattern */}
      <div className="flex justify-center gap-2 mb-2">
        {unit.map((item, i) => {
          const isSel = selected?.shape === item.shape && selected?.color === item.color;
          return (
            <button key={i} onClick={() => setSelected(isSel ? null : item)}
              className="rounded-lg border-2 p-0.5 transition-all"
              style={{ borderColor: isSel ? item.color : "#cbd5e1", backgroundColor: isSel ? item.color + "18" : "transparent" }}>
              <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S}>
                {renderShape(item.shape, item.color, 0, 0)}
              </svg>
            </button>
          );
        })}
      </div>

      {/* Pattern rows */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto touch-none select-none">
        {/* Row 1 and 2: example pattern */}
        {[0, 1].map(ri =>
          fullRow.map((item, ci) => (
            <g key={`${ri}-${ci}`} transform={`translate(${2 + ci * (S + gap)}, ${2 + ri * rowH})`}>
              {renderShape(item.shape, item.color, 0, 0)}
            </g>
          ))
        )}
        {/* Row 3: blank cells student fills */}
        {fullRow.map((_, ci) => {
          const f = filled[ci];
          return (
            <g key={`fill-${ci}`} style={{ cursor: "pointer" }}
              transform={`translate(${2 + ci * (S + gap)}, ${2 + 2 * rowH})`}
              onClick={() => fillNext(ci)}>
              <rect x={0} y={0} width={S} height={S} rx={6}
                fill={f ? "#f8fafc" : selected ? accent + "10" : "#f8fafc"}
                stroke={f ? "#94a3b8" : selected ? accent : "#cbd5e1"}
                strokeWidth={f ? 1.5 : 2} strokeDasharray={f ? "0" : "5,4"} />
              {f && renderShape(f.shape, f.color, 0, 0)}
              {!f && <text x={S / 2} y={S / 2 + 5} textAnchor="middle" fontSize={14} fill="#cbd5e1" fontWeight="bold">?</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Visual: Place Value Chart ─────────────────────────────────────────────────

function PlaceValueChartVisual({ thousands, hundreds, tens, ones, accent }: {
  thousands: number; hundreds: number; tens: number; ones: number; accent: string;
}) {
  const digits = [thousands || null, hundreds || null, tens, ones] as (number | null)[];
  const cols = ["Thousands", "Hundreds", "Tens", "Ones"];
  const abbr = ["Th.", "H.", "T.", "O."];

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Place value chart</p>
      <div className="overflow-hidden rounded-lg border border-slate-200 max-w-xs mx-auto">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr style={{ backgroundColor: accent + "20" }}>
              {cols.map((c, i) => (
                <th key={c} className="py-2 border-r border-slate-200 last:border-r-0 text-xs font-bold text-slate-600 hidden sm:table-cell">{c}</th>
              ))}
              {abbr.map((a, i) => (
                <th key={a} className="py-2 border-r border-slate-200 last:border-r-0 text-xs font-bold text-slate-600 sm:hidden">{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {digits.map((d, i) => (
                <td key={i} className="py-4 text-3xl font-bold text-slate-800 border-r border-slate-200 last:border-r-0" style={{ width: "25%", color: d !== null ? "#1e293b" : "#e2e8f0" }}>
                  {d !== null ? d : <span style={{ color: accent }}>?</span>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Visual: Clock ─────────────────────────────────────────────────────────────

function ClockVisual({ hour, minute, accent }: { hour: number; minute: number; accent: string }) {
  const initH = ((hour % 12) + minute / 60) / 12 * 360 - 90;
  const initM = minute / 60 * 360 - 90;
  const [hDeg, setHDeg] = useState(initH);
  const [mDeg, setMDeg] = useState(initM);
  const dragging = useRef<"hour" | "minute" | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cx = 90; const cy = 90; const R = 78;
  const toRad = (deg: number) => deg * Math.PI / 180;

  const getAngle = (clientX: number, clientY: number) => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = 180 / rect.width; const sy = 180 / rect.height;
    const dx = (clientX - rect.left) * sx - cx;
    const dy = (clientY - rect.top) * sy - cy;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  };

  const onMove = (clientX: number, clientY: number) => {
    if (!dragging.current) return;
    const a = getAngle(clientX, clientY);
    if (dragging.current === "minute") setMDeg(a);
    else setHDeg(a);
  };

  const hTip = { x: cx + 42 * Math.cos(toRad(hDeg)), y: cy + 42 * Math.sin(toRad(hDeg)) };
  const mTip = { x: cx + 60 * Math.cos(toRad(mDeg)), y: cy + 60 * Math.sin(toRad(mDeg)) };

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Drag the hands — what time is it?</p>
      <svg ref={svgRef} viewBox="0 0 180 180" className="w-40 mx-auto touch-none select-none"
        style={{ cursor: dragging.current ? "grabbing" : "default" }}
        onMouseMove={e => onMove(e.clientX, e.clientY)}
        onMouseUp={() => { dragging.current = null; }}
        onMouseLeave={() => { dragging.current = null; }}
        onTouchMove={e => { onMove(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }}
        onTouchEnd={() => { dragging.current = null; }}
      >
        <circle cx={cx} cy={cy} r={R} fill="white" stroke="#334155" strokeWidth={4} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
          const isMain = i % 3 === 0;
          const r1 = R - 5; const r2 = R - (isMain ? 18 : 12);
          return (
            <g key={i}>
              <line x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)} x2={cx + r2 * Math.cos(a)} y2={cy + r2 * Math.sin(a)} stroke="#475569" strokeWidth={isMain ? 3 : 1.5} />
              {isMain && <text x={cx + (R - 26) * Math.cos(a)} y={cy + (R - 26) * Math.sin(a) + 4} textAnchor="middle" fontSize={12} fill="#334155" fontWeight="700">{i === 0 ? 12 : i}</text>}
            </g>
          );
        })}
        {/* Hour hand */}
        <line x1={cx} y1={cy} x2={hTip.x} y2={hTip.y} stroke="#1e293b" strokeWidth={6} strokeLinecap="round" />
        <circle cx={hTip.x} cy={hTip.y} r={8} fill={accent + "30"} stroke={accent} strokeWidth={2}
          style={{ cursor: "grab" }}
          onMouseDown={e => { dragging.current = "hour"; e.stopPropagation(); }}
          onTouchStart={e => { dragging.current = "hour"; e.stopPropagation(); }}
        />
        {/* Minute hand */}
        <line x1={cx} y1={cy} x2={mTip.x} y2={mTip.y} stroke="#475569" strokeWidth={4} strokeLinecap="round" />
        <circle cx={mTip.x} cy={mTip.y} r={7} fill="#f1f5f9" stroke="#475569" strokeWidth={2}
          style={{ cursor: "grab" }}
          onMouseDown={e => { dragging.current = "minute"; e.stopPropagation(); }}
          onTouchStart={e => { dragging.current = "minute"; e.stopPropagation(); }}
        />
        <circle cx={cx} cy={cy} r={5} fill={accent} />
      </svg>
    </div>
  );
}

// ── Visual: Money Coins ───────────────────────────────────────────────────────

function MoneyCoinsVisual({ taskId, accent }: { taskId: string; accent: string }) {
  const rng = seededRand(strSeed(taskId));
  const COIN_DEFS = [
    { label: "$1", cents: 100, r: 26, color: "#d97706" },
    { label: "50¢", cents: 50, r: 22, color: "#94a3b8" },
    { label: "25¢", cents: 25, r: 19, color: "#94a3b8" },
    { label: "10¢", cents: 10, r: 15, color: "#94a3b8" },
    { label: "5¢", cents: 5, r: 13, color: "#78716c" },
  ];
  const count = 4 + Math.floor(rng() * 4);
  const coins = Array.from({ length: count }, () => COIN_DEFS[Math.floor(rng() * COIN_DEFS.length)]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (i: number) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  const total = [...selected].reduce((sum, i) => sum + coins[i].cents, 0);
  const totalStr = total >= 100 ? `$${(total / 100).toFixed(2)}` : `${total}¢`;

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Tap coins to count — what is the total?</p>
      <svg viewBox="0 0 280 100" className="w-full max-w-xs mx-auto touch-none select-none">
        {coins.map((c, i) => {
          const x = 28 + i * (280 / count) * 0.9;
          const y = 40 + (rng() - 0.5) * 20;
          const isSelected = selected.has(i);
          return (
            <g key={i} style={{ cursor: "pointer" }} onClick={() => toggle(i)}>
              <circle cx={x} cy={y} r={c.r}
                fill={isSelected ? c.color + "60" : c.color + "20"}
                stroke={c.color} strokeWidth={isSelected ? 3 : 2}
                style={{ filter: isSelected ? `drop-shadow(0 0 4px ${c.color})` : "none" }}
              />
              <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fill="#1e293b" fontWeight="700">{c.label}</text>
            </g>
          );
        })}
      </svg>
      <p className="text-center text-sm font-bold mt-1" style={{ color: selected.size > 0 ? accent : "#94a3b8" }}>
        {selected.size === 0 ? "Tap coins to select them" : `Selected: ${totalStr}`}
      </p>
    </div>
  );
}

// ── Visual: Matching Task ─────────────────────────────────────────────────────
// SVG-based drag-to-draw line connections

function MatchingTaskVisual({ taskId, accent }: { taskId: string; accent: string }) {
  const rng = seededRand(strSeed(taskId));
  const PAIRS = [
    ["2 × 3", "6"], ["4 + 5", "9"], ["10 − 4", "6"],
    ["3 × 4", "12"], ["15 − 8", "7"], ["6 + 7", "13"],
  ];
  const pairsRef = useRef(PAIRS.sort(() => rng() - 0.5).slice(0, 4));
  const rightRef = useRef([...pairsRef.current.map(p => p[1])].sort(() => rng() - 0.5));
  const pairs = pairsRef.current;
  const right = rightRef.current;

  // connections: left index → right index
  const [connections, setConnections] = useState<Record<number, number>>({});
  const [dragging, setDragging] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const itemH = 38; const itemGap = 10; const topPad = 8;
  const leftX = 85; const rightX = 175; const W = 270;
  const totalH = topPad * 2 + pairs.length * (itemH + itemGap);

  const getLeftCY = (i: number) => topPad + i * (itemH + itemGap) + itemH / 2;
  const getRightCY = (i: number) => topPad + i * (itemH + itemGap) + itemH / 2;

  const svgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * W,
      y: ((clientY - rect.top) / rect.height) * totalH,
    };
  };

  const hitRightItem = (x: number, y: number): number | null => {
    for (let i = 0; i < right.length; i++) {
      const cy = getRightCY(i);
      if (x >= rightX && x <= W && Math.abs(y - cy) <= itemH / 2) return i;
    }
    return null;
  };

  const finishDrag = (clientX: number, clientY: number) => {
    if (dragging === null) return;
    const pt = svgPoint(clientX, clientY);
    const ri = hitRightItem(pt.x, pt.y);
    if (ri !== null) setConnections(prev => ({ ...prev, [dragging]: ri }));
    setDragging(null);
  };

  const ACCENT_COLORS = [accent, "#0ea5e9", "#10b981", "#f59e0b"];

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Drag from left to right to draw a connecting line</p>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${totalH}`}
        className="w-full max-w-sm mx-auto touch-none select-none"
        style={{ cursor: dragging !== null ? "crosshair" : "default" }}
        onMouseMove={e => { if (dragging !== null) setCursorPos(svgPoint(e.clientX, e.clientY)); }}
        onMouseUp={e => finishDrag(e.clientX, e.clientY)}
        onTouchMove={e => { if (dragging !== null) setCursorPos(svgPoint(e.touches[0].clientX, e.touches[0].clientY)); }}
        onTouchEnd={e => { if (e.changedTouches[0]) finishDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY); }}
      >
        {/* Permanent connection lines */}
        {Object.entries(connections).map(([li, ri]) => {
          const color = ACCENT_COLORS[Number(li) % ACCENT_COLORS.length];
          return (
            <line key={li}
              x1={leftX + 1} y1={getLeftCY(Number(li))}
              x2={rightX - 1} y2={getRightCY(Number(ri))}
              stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
          );
        })}
        {/* In-progress drag line */}
        {dragging !== null && (
          <line x1={leftX + 1} y1={getLeftCY(dragging)}
            x2={cursorPos.x} y2={cursorPos.y}
            stroke={accent} strokeWidth={2.5} strokeDasharray="6,4" opacity={0.7} strokeLinecap="round" />
        )}
        {/* Left items */}
        {pairs.map((p, i) => {
          const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
          const isConnected = connections[i] !== undefined;
          const isDragging = dragging === i;
          return (
            <g key={i} style={{ cursor: "grab" }}
              onMouseDown={e => { e.preventDefault(); setDragging(i); setCursorPos(svgPoint(e.clientX, e.clientY)); }}
              onTouchStart={e => { e.preventDefault(); setDragging(i); setCursorPos(svgPoint(e.touches[0].clientX, e.touches[0].clientY)); }}>
              <rect x={0} y={topPad + i * (itemH + itemGap)} width={leftX} height={itemH} rx={8}
                fill={isDragging ? color + "30" : isConnected ? color + "20" : "#f8fafc"}
                stroke={isDragging || isConnected ? color : "#cbd5e1"} strokeWidth={isDragging ? 2.5 : 1.5} />
              <text x={leftX / 2} y={getLeftCY(i) + 5} textAnchor="middle" fontSize={13} fill="#1e293b" fontWeight="600">{p[0]}</text>
              {/* Right-side connector dot */}
              <circle cx={leftX + 1} cy={getLeftCY(i)} r={5} fill={color} opacity={isConnected || isDragging ? 1 : 0.35} />
            </g>
          );
        })}
        {/* Right items */}
        {right.map((val, i) => {
          const connectedBy = Object.entries(connections).find(([, ri]) => Number(ri) === i);
          const color = connectedBy ? ACCENT_COLORS[Number(connectedBy[0]) % ACCENT_COLORS.length] : "#94a3b8";
          return (
            <g key={i}>
              <circle cx={rightX - 1} cy={getRightCY(i)} r={5} fill={color} opacity={connectedBy ? 1 : 0.35} />
              <rect x={rightX} y={topPad + i * (itemH + itemGap)} width={W - rightX} height={itemH} rx={8}
                fill={connectedBy ? color + "20" : "#f8fafc"}
                stroke={connectedBy ? color : "#cbd5e1"} strokeWidth={connectedBy ? 2 : 1.5} />
              <text x={rightX + (W - rightX) / 2} y={getRightCY(i) + 5} textAnchor="middle" fontSize={13} fill="#1e293b" fontWeight="600">{val}</text>
            </g>
          );
        })}
      </svg>
      {/* Reset button */}
      {Object.keys(connections).length > 0 && (
        <button onClick={() => setConnections({})}
          className="mx-auto block text-[10px] text-slate-400 hover:text-slate-600 mt-1 transition-colors">
          Clear lines
        </button>
      )}
    </div>
  );
}

// ── Visual: Sorting Task ──────────────────────────────────────────────────────

function SortingTaskVisual({ taskId, accent }: { taskId: string; accent: string }) {
  const rng = seededRand(strSeed(taskId));
  const items = Array.from({ length: 6 }, (_, i) => Math.floor(rng() * 50) + 1);
  const [sorted, setSorted] = useState<Record<"under" | "over", number[]>>({ under: [], over: [] });
  const [remaining, setRemaining] = useState(items);
  const [binOver, setBinOver] = useState<"under" | "over" | null>(null);
  const dragVal = useRef<number | null>(null);
  // Touch fallback: tap-to-select, tap-bin-to-place
  const [tapSelected, setTapSelected] = useState<number | null>(null);
  const threshold = 25;

  const dropIntoBin = (bin: "under" | "over", val: number) => {
    setSorted(s => ({ ...s, [bin]: [...s[bin], val] }));
    setRemaining(r => r.filter(v => v !== val));
    setBinOver(null);
    setTapSelected(null);
    dragVal.current = null;
  };

  const handleTapItem = (val: number) => setTapSelected(prev => prev === val ? null : val);
  const handleTapBin = (bin: "under" | "over") => {
    if (tapSelected !== null) dropIntoBin(bin, tapSelected);
  };

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Drag numbers into the correct group (or tap a number, then tap a group)</p>
      {/* Draggable items */}
      <div className="flex flex-wrap justify-center gap-2 mb-3 min-h-[36px]">
        {remaining.map((n, i) => (
          <div key={i} draggable
            onDragStart={() => { dragVal.current = n; setTapSelected(null); }}
            onClick={() => handleTapItem(n)}
            className={`px-3 py-1.5 rounded-lg border-2 text-sm font-bold transition-all cursor-grab active:cursor-grabbing select-none ${tapSelected === n ? "text-white scale-110 shadow-md" : "border-slate-300 bg-slate-50 text-slate-700 hover:border-blue-400"}`}
            style={tapSelected === n ? { backgroundColor: accent, borderColor: accent } : {}}>
            {n}
          </div>
        ))}
        {remaining.length === 0 && <p className="text-xs text-slate-400 self-center">All sorted!</p>}
      </div>
      {/* Drop bins */}
      <div className="grid grid-cols-2 gap-3">
        {(["under", "over"] as const).map(bin => (
          <div key={bin}
            onDragOver={e => { e.preventDefault(); setBinOver(bin); }}
            onDragLeave={() => setBinOver(null)}
            onDrop={e => { e.preventDefault(); if (dragVal.current !== null) dropIntoBin(bin, dragVal.current); }}
            onClick={() => handleTapBin(bin)}
            className={`rounded-lg border-2 border-dashed p-3 text-left min-h-[64px] transition-all cursor-pointer ${binOver === bin ? "scale-[1.02] shadow" : ""} ${tapSelected !== null ? "opacity-100 border-current" : "opacity-80"}`}
            style={{ borderColor: binOver === bin ? "#3b82f6" : accent, backgroundColor: binOver === bin ? "#eff6ff" : undefined }}>
            <p className="text-xs font-bold mb-1" style={{ color: accent }}>
              {bin === "under" ? `< ${threshold}` : `≥ ${threshold}`}
              {tapSelected !== null && <span className="ml-1 text-slate-400 font-normal">← tap to place</span>}
            </p>
            <div className="flex flex-wrap gap-1">
              {sorted[bin].map((n, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 rounded font-bold text-white" style={{ backgroundColor: accent }}>{n}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Visual: Tally Marks ───────────────────────────────────────────────────────

function TallyMarksVisual({ count, accent }: { count: number; accent: string }) {
  count = Math.min(count, 25);
  const groups = Math.floor(count / 5);
  const rem = count % 5;
  const groupW = 56; const groupH = 50; const totalW = (groups + (rem > 0 ? 1 : 0)) * groupW + 20;

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Count the tally marks</p>
      <svg viewBox={`0 0 ${totalW} ${groupH + 30}`} className="w-full max-w-xs mx-auto">
        {Array.from({ length: groups }, (_, g) => {
          const x = 10 + g * groupW;
          return (
            <g key={g}>
              {[0, 1, 2, 3].map(i => <line key={i} x1={x + 10 + i * 10} y1={8} x2={x + 10 + i * 10} y2={groupH - 8} stroke="#334155" strokeWidth={3} strokeLinecap="round" />)}
              <line x1={x + 4} y1={groupH - 10} x2={x + 44} y2={8} stroke="#334155" strokeWidth={3} strokeLinecap="round" />
              <text x={x + groupW / 2} y={groupH + 18} textAnchor="middle" fontSize={10} fill="#94a3b8">(5)</text>
            </g>
          );
        })}
        {Array.from({ length: rem }, (_, i) => {
          const x = 10 + groups * groupW + 10 + i * 10;
          return <line key={i} x1={x} y1={8} x2={x} y2={groupH - 8} stroke="#334155" strokeWidth={3} strokeLinecap="round" />;
        })}
        <text x={totalW / 2} y={groupH + 28} textAnchor="middle" fontSize={11} fill="#94a3b8">Count the tally marks ↑</text>
      </svg>
    </div>
  );
}

// ── Visual: Number Bond ───────────────────────────────────────────────────────

function NumberBondVisual({ total, accent }: { total: number; accent: string }) {
  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Number bond — how does it break apart?</p>
      <svg viewBox="0 0 200 145" className="w-48 mx-auto">
        <circle cx={100} cy={35} r={28} fill={accent + "20"} stroke={accent} strokeWidth={2.5} />
        <text x={100} y={41} textAnchor="middle" fontSize={18} fill="#1e293b" fontWeight="bold">{total}</text>
        <line x1={78} y1={58} x2={55} y2={98} stroke="#94a3b8" strokeWidth={2.5} />
        <line x1={122} y1={58} x2={145} y2={98} stroke="#94a3b8" strokeWidth={2.5} />
        <circle cx={50} cy={115} r={24} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5,3" />
        <text x={50} y={121} textAnchor="middle" fontSize={16} fill="#94a3b8" fontWeight="bold">?</text>
        <circle cx={150} cy={115} r={24} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5,3" />
        <text x={150} y={121} textAnchor="middle" fontSize={16} fill="#94a3b8" fontWeight="bold">?</text>
      </svg>
    </div>
  );
}

// ── Visual: Bar Model ─────────────────────────────────────────────────────────

function BarModelVisual({ total, accent }: { total: number; accent: string }) {
  const safe = total;
  const part = Math.round(safe * 0.6);
  const W = 260; const H = 42; const ratio = part / safe;

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Bar model — find the missing part</p>
      <svg viewBox={`0 0 ${W} ${H + 60}`} className="w-full max-w-xs mx-auto">
        {/* Full bar outline */}
        <rect x={10} y={10} width={W - 20} height={H} rx={5} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={2} />
        {/* Shaded part */}
        <rect x={10} y={10} width={(W - 20) * ratio} height={H} rx={5} fill={accent + "80"} />
        <line x1={10 + (W - 20) * ratio} y1={10} x2={10 + (W - 20) * ratio} y2={10 + H} stroke="white" strokeWidth={2} />
        {/* Labels inside */}
        <text x={10 + (W - 20) * ratio / 2} y={10 + H / 2 + 5} textAnchor="middle" fontSize={14} fill="#1e293b" fontWeight="bold">{part}</text>
        <text x={10 + (W - 20) * ratio + (W - 20) * (1 - ratio) / 2} y={10 + H / 2 + 5} textAnchor="middle" fontSize={18} fill="#94a3b8" fontWeight="bold">?</text>
        {/* Total label */}
        <line x1={10} y1={H + 22} x2={W - 10} y2={H + 22} stroke="#94a3b8" strokeWidth={1.5} />
        <line x1={10} y1={H + 16} x2={10} y2={H + 28} stroke="#94a3b8" strokeWidth={1.5} />
        <line x1={W - 10} y1={H + 16} x2={W - 10} y2={H + 28} stroke="#94a3b8" strokeWidth={1.5} />
        <text x={W / 2} y={H + 42} textAnchor="middle" fontSize={12} fill="#94a3b8">Find the missing part ↑</text>
      </svg>
    </div>
  );
}

// ── Visual: Area Model ────────────────────────────────────────────────────────

function AreaModelVisual({ cols, rows, accent }: { cols: number; rows: number; accent: string }) {
  const cellW = Math.floor(200 / cols); const cellH = Math.floor(100 / rows);
  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Area model</p>
      <svg viewBox={`0 0 ${cols * cellW + 20} ${rows * cellH + 20}`} className="w-full max-w-xs mx-auto">
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <rect key={`${r}-${c}`} x={10 + c * cellW} y={10 + r * cellH}
              width={cellW - 1} height={cellH - 1} rx={2}
              fill={accent + "50"} stroke={accent} strokeWidth={1}
            />
          ))
        )}
      </svg>
    </div>
  );
}

// ── Visual: Coordinate Grid ───────────────────────────────────────────────────

function CoordinateGridVisual({ accent }: { accent: string }) {
  const cx = 110; const cy = 110; const step = 22; const grid = 4;
  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Coordinate grid</p>
      <svg viewBox="0 0 220 220" className="w-44 mx-auto">
        {Array.from({ length: grid * 2 + 1 }, (_, i) => i - grid).map(v => (
          <g key={v}>
            <line x1={cx + v * step} y1={10} x2={cx + v * step} y2={210} stroke="#e2e8f0" strokeWidth={1} />
            <line x1={10} y1={cy + v * step} x2={210} y2={cy + v * step} stroke="#e2e8f0" strokeWidth={1} />
          </g>
        ))}
        <line x1={cx} y1={8} x2={cx} y2={212} stroke="#334155" strokeWidth={2.5} />
        <line x1={8} y1={cy} x2={212} y2={cy} stroke="#334155" strokeWidth={2.5} />
        <polygon points={`${cx},6 ${cx - 5},16 ${cx + 5},16`} fill="#334155" />
        <polygon points={`213,${cy} 203,${cy - 5} 203,${cy + 5}`} fill="#334155" />
        {[-4, -2, 2, 4].map(v => (
          <g key={v}>
            <text x={cx + v * step} y={cy + 15} textAnchor="middle" fontSize={10} fill="#64748b">{v}</text>
            <text x={cx - 14} y={cy - v * step + 4} textAnchor="middle" fontSize={10} fill="#64748b">{v}</text>
          </g>
        ))}
        <text x={cx + 8} y={14} fontSize={11} fill="#334155" fontWeight="700">y</text>
        <text x={214} y={cy + 4} fontSize={11} fill="#334155" fontWeight="700">x</text>
        <circle cx={cx + 2 * step} cy={cy - 3 * step} r={5} fill={accent} />
      </svg>
    </div>
  );
}

// ── Visual: Shape Rotation ────────────────────────────────────────────────────

function ShapeRotationVisual({ taskId, accent }: { taskId: string; accent: string }) {
  const rng = seededRand(strSeed(taskId));
  const sides = [3, 4, 5, 6][Math.floor(rng() * 4)];
  const rotations = [0, 45, 90, 135];
  const rot1 = rotations[Math.floor(rng() * rotations.length)];
  const [studentRot, setStudentRot] = useState(rot1); // student drags to show their answer
  const R = 40; const toRad = (d: number) => d * Math.PI / 180;
  const dragRef = useRef<{ active: boolean; startAngle: number; startRot: number }>({ active: false, startAngle: 0, startRot: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const polyPoints = (cx: number, cy: number, rot: number) =>
    Array.from({ length: sides }, (_, i) => {
      const a = toRad((i / sides) * 360 + rot - 90);
      return `${cx + R * Math.cos(a)},${cy + R * Math.sin(a)}`;
    }).join(" ");

  const getAngle = (clientX: number, clientY: number) => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 100 / rect.width;
    const scaleY = 100 / rect.height;
    const dx = (clientX - rect.left) * scaleX - 50;
    const dy = (clientY - rect.top) * scaleY - 50;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  };

  const startDrag = (clientX: number, clientY: number) => {
    dragRef.current = { active: true, startAngle: getAngle(clientX, clientY), startRot: studentRot };
  };
  const onDrag = (clientX: number, clientY: number) => {
    if (!dragRef.current.active) return;
    const delta = getAngle(clientX, clientY) - dragRef.current.startAngle;
    setStudentRot(dragRef.current.startRot + delta);
  };
  const stopDrag = () => { dragRef.current.active = false; };

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Shape rotation — drag the right shape to match</p>
      <div className="flex items-center justify-center gap-4 py-2">
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 100 100" className="w-24">
            <polygon points={polyPoints(50, 50, rot1)} fill={accent + "40"} stroke={accent} strokeWidth={2.5} />
          </svg>
          <span className="text-[10px] text-slate-500 mt-1">Original</span>
        </div>
        <svg viewBox="0 0 30 30" className="w-6 opacity-40">
          <path d="M5 15 L25 15 M20 10 L25 15 L20 20" stroke="#334155" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="flex flex-col items-center">
          <svg ref={svgRef} viewBox="0 0 100 100" className="w-24 touch-none select-none" style={{ cursor: "grab" }}
            onMouseDown={e => startDrag(e.clientX, e.clientY)}
            onMouseMove={e => onDrag(e.clientX, e.clientY)}
            onMouseUp={stopDrag} onMouseLeave={stopDrag}
            onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={e => { onDrag(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }}
            onTouchEnd={stopDrag}
          >
            <polygon points={polyPoints(50, 50, studentRot)} fill={accent + "20"} stroke={accent} strokeWidth={2} strokeDasharray="5,4" />
            {/* Rotation handle */}
            <circle cx={50 + R * Math.cos(toRad(studentRot - 90))} cy={50 + R * Math.sin(toRad(studentRot - 90))} r={7}
              fill={accent} opacity={0.8} />
          </svg>
          <span className="text-[10px] text-slate-500 mt-1">Drag to rotate</span>
        </div>
      </div>
    </div>
  );
}

// ── Visual: Visual Word Problem ───────────────────────────────────────────────

function WordProblemVisual({ taskId, accent }: { taskId: string; accent: string }) {
  const rng = seededRand(strSeed(taskId));
  const a = Math.floor(rng() * 8) + 3;
  const b = Math.floor(rng() * 6) + 2;
  const op = rng() > 0.5 ? "+" : "−";
  const ICONS = ["🍎", "⭐", "🔵", "🏀", "🌟", "📦", "🎯", "🍪"];
  const icon = ICONS[Math.floor(rng() * ICONS.length)];

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Word problem — show your working</p>
      <div className="flex items-center justify-center gap-2 flex-wrap py-2">
        <div className="flex flex-wrap gap-1 max-w-[120px] border-2 rounded-lg p-2 border-slate-200">
          {Array.from({ length: a }, (_, i) => <span key={i} className="text-xl">{icon}</span>)}
          <span className="text-xs text-slate-500 w-full text-center font-semibold">{a}</span>
        </div>
        <span className="text-2xl font-bold text-slate-600">{op}</span>
        <div className="flex flex-wrap gap-1 max-w-[100px] border-2 rounded-lg p-2 border-slate-200">
          {Array.from({ length: b }, (_, i) => <span key={i} className="text-xl">{icon}</span>)}
          <span className="text-xs text-slate-500 w-full text-center font-semibold">{b}</span>
        </div>
        <span className="text-2xl font-bold text-slate-600">= ?</span>
      </div>
      <div className="mt-3 flex items-center justify-center gap-3 border-t pt-3">
        <span className="text-lg font-bold text-slate-600">{a} {op} {b} =</span>
        <div className="w-16 h-8 rounded-lg border-2 border-dashed flex items-center justify-center text-slate-300 text-lg font-bold" style={{ borderColor: accent }}>?</div>
      </div>
    </div>
  );
}

// ── Task Visual Router ────────────────────────────────────────────────────────

function TaskVisual({ task, theme, timerStartedAt }: { task: TaskData; theme: ThemeKey; timerStartedAt: string | null }) {
  const accent = THEME_CFG[theme].accent;
  const vt = task.visualType;
  const tt = task.taskType;
  const vp = task.visualParams ?? {};
  const num = (k: string, fallback: number) => (typeof vp[k] === "number" ? vp[k] as number : fallback);
  if (vt === "dot_array") return <DotArrayVisual taskId={task.id} dotCount={num("dotCount", 12)} taskType={tt} accent={accent} timerStartedAt={timerStartedAt} />;
  if (vt === "number_line") return <NumberLineVisual scaleMin={num("scaleMin", 0)} scaleMax={num("scaleMax", 20)} accent={accent} />;
  if (vt === "base_ten_blocks") return <BaseTenBlocksVisual thousands={num("thousands", 0)} hundreds={num("hundreds", 0)} tens={num("tens", 2)} ones={num("ones", 3)} accent={accent} />;
  if (vt === "fraction_bar") return <FractionBarVisual numerator={num("numerator", 3)} denominator={num("denominator", 4)} accent={accent} />;
  if (vt === "fraction_circle") return <FractionCircleVisual numerator={num("numerator", 3)} denominator={num("denominator", 4)} accent={accent} />;
  if (vt === "balance_scale") return <BalanceScaleVisual taskId={task.id} accent={accent} />;
  if (vt === "pattern_builder") return <PatternBuilderVisual taskId={task.id} accent={accent} />;
  if (vt === "clock") return <ClockVisual hour={num("hour", 3)} minute={num("minute", 0)} accent={accent} />;
  if (vt === "money_coins") return <MoneyCoinsVisual taskId={task.id} accent={accent} />;
  if (vt === "place_value_chart") return <PlaceValueChartVisual thousands={num("thousands", 0)} hundreds={num("hundreds", 0)} tens={num("tens", 0)} ones={num("ones", 0)} accent={accent} />;
  if (vt === "area_model") return <AreaModelVisual cols={num("cols", 3)} rows={num("rows", 4)} accent={accent} />;
  if (vt === "number_bond") return <NumberBondVisual total={num("total", 10)} accent={accent} />;
  if (vt === "bar_model") return <BarModelVisual total={num("total", 100)} accent={accent} />;
  if (vt === "coordinate_grid") return <CoordinateGridVisual accent={accent} />;
  if (vt === "shape_rotation") return <ShapeRotationVisual taskId={task.id} accent={accent} />;
  if (vt === "matching_task") return <MatchingTaskVisual taskId={task.id} accent={accent} />;
  if (vt === "sorting_task") return <SortingTaskVisual taskId={task.id} accent={accent} />;
  if (vt === "tally_marks") return <TallyMarksVisual count={num("count", 13)} accent={accent} />;
  if (vt === "visual_word_problem") return <WordProblemVisual taskId={task.id} accent={accent} />;
  return (
    <div className={CARD_INNER + " text-center py-6"}>
      <div className="text-4xl mb-2">📐</div>
      <p className="text-sm text-slate-500">{vt.replace(/_/g, " ")}</p>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type TaskData = {
  id: string;
  domain: string;
  taskType: string;
  visualType: string;
  prompt: string;
  showConfidenceSlider: boolean;
  productiveStruggleTrigger: boolean;
  visualParams?: Record<string, unknown>;
};

type SessionState = {
  status: "not_started" | "in_progress" | "completed";
  theme: string;
  ageBand: string;
  currentTaskId: string | null;
  timerStartedAt: string | null;
  hintLevel: number;
  currentTask: TaskData | null;
};

// ── Hint messages ─────────────────────────────────────────────────────────────

const HINT_PROMPTS = [
  "",
  "Can you show your thinking? Use the picture to help! 💭",
  "What if you tried looking at it a different way? Take your time! 🔍",
  "Let's think step by step — what do you notice first? 🌟",
  "You're doing great — keep going! Let's work through it together. 💪",
];

// ── Confidence Slider ─────────────────────────────────────────────────────────

function ConfidenceSlider({ token, taskId, theme, onRated }: {
  token: string; taskId: string; theme: ThemeKey; onRated: () => void;
}) {
  const cfg = THEME_CFG[theme];
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const options = [
    { emoji: "😕", label: "Not sure" },
    { emoji: "😐", label: "A little sure" },
    { emoji: "🙂", label: "Mostly sure" },
    { emoji: "😄", label: "Very sure!" },
  ];

  const handleSelect = async (val: number) => {
    if (submitted) return;
    setSelected(val);
    setSubmitted(true);
    try {
      await fetch(`${BASE_URL}/api/public/rmra/student/${token}/confidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: val, taskId }),
      });
    } catch { }
    setTimeout(onRated, 1400);
  };

  return (
    <div className={`rounded-2xl border-2 p-5 bg-white border-slate-200`}>
      {submitted ? (
        <div className="text-center py-2">
          <div className="text-4xl mb-2">{options[selected!].emoji}</div>
          <p className="text-base font-bold text-slate-700">Got it — thank you! 🌟</p>
        </div>
      ) : (
        <>
          <p className="text-center text-sm font-bold text-slate-600 mb-4 uppercase tracking-wide">How sure are you about your answer?</p>
          <div className="flex justify-center gap-2">
            {options.map((opt, i) => (
              <button key={i} onClick={() => handleSelect(i)}
                className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all min-w-[62px] flex-1`}
                style={selected === i ? { borderColor: THEME_CFG[theme].accent, backgroundColor: THEME_CFG[theme].accent + "15" } : { borderColor: "#e2e8f0" }}
              >
                <span className="text-3xl">{opt.emoji}</span>
                <span className="text-[10px] leading-tight text-center text-slate-500 font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Loading Dots ──────────────────────────────────────────────────────────────

function WaitDots({ accent }: { accent: string }) {
  return (
    <div className="flex gap-2 mt-8 justify-center">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-3 h-3 rounded-full"
          style={{ backgroundColor: accent, animation: `pulse 1.4s ease-in-out ${i * 0.22}s infinite`, opacity: 0.7 }} />
      ))}
      <style>{`@keyframes pulse { 0%,80%,100%{transform:scale(1)} 40%{transform:scale(1.4)} }`}</style>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RmraStudentView() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<SessionState | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confidenceRated, setConfidenceRated] = useState(false);
  const [lastTaskId, setLastTaskId] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const r = await fetch(`${BASE_URL}/api/public/rmra/student/${token}?t=${Date.now()}`);
      if (!r.ok) { setFetchError(true); return; }
      const data: SessionState = await r.json();
      setState(data);
      setFetchError(false); // clear any prior transient error on success
    } catch { }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, POLL_MS);
    return () => clearInterval(interval);
  }, [token]);

  // Reset confidence rating when task changes
  useEffect(() => {
    if (state?.currentTaskId && state.currentTaskId !== lastTaskId) {
      setConfidenceRated(false);
      setLastTaskId(state.currentTaskId);
    }
  }, [state?.currentTaskId]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={44} />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (fetchError || !state) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-6xl">🔭</span>
        <h1 className="text-xl font-bold text-white">Hmm, we couldn't find this session.</h1>
        <p className="text-slate-400 text-sm">Ask your teacher to check the link and try again.</p>
      </div>
    );
  }

  const theme = (state.theme in THEME_CFG ? state.theme : "space_mission") as ThemeKey;
  const cfg = THEME_CFG[theme];

  // ── Waiting / not started ───────────────────────────────────────────────────
  if (state.status === "not_started") {
    return (
      <div className={`min-h-screen ${cfg.bg} flex flex-col items-center justify-center px-6 text-center`}>
        <div className="text-7xl mb-6 animate-bounce">{cfg.mascot}</div>
        <h1 className={`text-2xl font-bold mb-3 ${cfg.bodyText}`}>{cfg.waitTitle}</h1>
        <p className={`text-base max-w-xs ${cfg.dark ? "text-white/65" : "text-slate-600"}`}>{cfg.waitSub}</p>
        <WaitDots accent={cfg.accent} />
      </div>
    );
  }

  // ── Completed ───────────────────────────────────────────────────────────────
  if (state.status === "completed") {
    return (
      <div className={`min-h-screen ${cfg.bg} flex flex-col items-center justify-center px-6 text-center`}>
        <div className="text-8xl mb-4">🌟</div>
        <div className="text-5xl mb-5">{cfg.mascot}</div>
        <h1 className={`text-3xl font-bold mb-3 ${cfg.bodyText}`}>{cfg.doneTitle}</h1>
        <p className={`text-lg max-w-sm ${cfg.dark ? "text-white/75" : "text-slate-600"}`}>{cfg.doneSub}</p>
        <div className={`mt-10 text-sm px-6 py-3 rounded-full font-medium ${cfg.dark ? "bg-white/10 text-white/55" : "bg-black/5 text-slate-500"}`}>
          You can close this tab now
        </div>
      </div>
    );
  }

  // ── Between tasks / no task set yet ────────────────────────────────────────
  if (!state.currentTask) {
    return (
      <div className={`min-h-screen ${cfg.bg} flex flex-col items-center justify-center px-6 text-center`}>
        <div className="text-6xl mb-5 animate-pulse">{cfg.mascot}</div>
        <h2 className={`text-xl font-bold mb-2 ${cfg.bodyText}`}>Getting your next question ready…</h2>
        <p className={`text-sm ${cfg.dark ? "text-white/55" : "text-slate-500"}`}>Your teacher is setting up the next task.</p>
        <WaitDots accent={cfg.accent} />
      </div>
    );
  }

  const task = state.currentTask;

  // ── Task screen ─────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${cfg.bg} flex flex-col px-4 py-5`} style={{ minHeight: "100dvh" }}>

      {/* Header bar */}
      <div className={`flex items-center justify-between mb-4 px-3 py-2.5 rounded-xl border ${cfg.header}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{cfg.mascot}</span>
          <span className={`text-sm font-bold ${cfg.bodyText}`}>{cfg.name}</span>
        </div>
        <div className={`text-[11px] px-3 py-1 rounded-full font-semibold uppercase tracking-wide ${cfg.dark ? "bg-white/10 text-white/55" : "bg-black/5 text-slate-500"}`}>
          {task.domain}
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full gap-3">

        {/* Hint */}
        {state.hintLevel > 0 && HINT_PROMPTS[state.hintLevel] && (
          <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${cfg.hint}`}>
            <span className="text-lg shrink-0">💡</span>
            <span className="leading-relaxed font-semibold">{HINT_PROMPTS[state.hintLevel]}</span>
          </div>
        )}

        {/* Prompt */}
        <div className={`rounded-2xl border-2 px-5 py-4 ${cfg.promptCard}`}>
          <p className={`text-lg font-bold leading-snug ${cfg.promptText}`}>{task.prompt}</p>
        </div>

        {/* Visual stimulus — always white card */}
        <div className="rounded-2xl shadow-sm overflow-hidden">
          <TaskVisual task={task} theme={theme} timerStartedAt={state.timerStartedAt} />
        </div>

        {/* Confidence slider */}
        {task.showConfidenceSlider && !confidenceRated && (
          <ConfidenceSlider
            token={token!}
            taskId={task.id}
            theme={theme}
            onRated={() => setConfidenceRated(true)}
          />
        )}

        {confidenceRated && (
          <div className={`text-center py-3 text-sm font-medium ${cfg.dimText}`}>
            ✓ Answer noted — waiting for the next question…
          </div>
        )}
      </div>

      {/* Footer */}
      <p className={`text-center text-xs mt-5 ${cfg.dimText}`}>
        Speak your answer aloud — your teacher is listening
      </p>
    </div>
  );
}
