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
    instructionCard: "bg-indigo-900/30 border border-indigo-700/30 text-indigo-200",
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
    instructionCard: "bg-sky-50 border border-sky-200 text-sky-800",
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
    instructionCard: "bg-rose-50 border border-rose-200 text-rose-700",
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
    instructionCard: "bg-zinc-800/50 border border-zinc-700 text-teal-300",
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
    instructionCard: "bg-amber-900/40 border border-amber-700/30 text-amber-200",
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
const SUBITIZING_FLASH_MS = 2000;

type FlashPhase = "waiting" | "showing" | "done";

function DotArrayVisual({ taskId, dotCount, taskType, accent, flashPhase, groupA, groupB, theme }: {
  taskId: string; dotCount: number; taskType: string; accent: string; flashPhase: FlashPhase;
  groupA?: number; groupB?: number; theme?: string;
}) {
  const count = Math.min(dotCount, 30);
  const rng = seededRand(strSeed(taskId));
  const isComparison = taskType === "quantity_comparison";
  const isEstimation = taskType === "estimation";

  if (isComparison) {
    // Side-by-side two groups
    const leftN = groupA ?? count; const rightN = groupB ?? Math.round(count * (0.6 + rng() * 0.6));
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

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>
        {taskType === "subitizing" ? "How many — just look!" : "Estimate — don't count one by one"}
      </p>

      {taskType === "subitizing" && flashPhase === "waiting" ? (
        /* Waiting for examiner to trigger */
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="text-5xl animate-pulse">
            {({ space_mission: "⭐", city_builder: "🧱", bakery_math: "🍪", robot_factory: "🔩", treasure_builder: "💎" } as Record<string,string>)[theme ?? ""] ?? "🧱"}
          </div>
          <p className="text-center font-semibold text-slate-600 text-base">Get ready…</p>
          <p className="text-center text-slate-400 text-sm">
            Your teacher will show the {({ space_mission: "stars", city_builder: "bricks", bakery_math: "cookies", robot_factory: "bolts", treasure_builder: "gems" } as Record<string,string>)[theme ?? ""] ?? "items"}
          </p>
        </div>
      ) : taskType === "subitizing" && flashPhase === "done" ? (
        /* Bricks hidden — student types their count */
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="text-5xl">👀</div>
          <p className="text-center font-semibold text-slate-700 text-lg">How many did you see?</p>
          <p className="text-center text-slate-500 text-sm">Type your answer below</p>
        </div>
      ) : isEstimation && flashPhase === "waiting" ? (
        /* Waiting for examiner to trigger the stimulus */
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="text-5xl animate-pulse">🎯</div>
          <p className="text-center font-semibold text-slate-600 text-base">Get ready…</p>
          <p className="text-center text-slate-400 text-sm">Your teacher will show the picture</p>
        </div>
      ) : isEstimation && flashPhase === "done" ? (
        /* Timer expired — student speaks their estimate */
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="text-5xl">🤔</div>
          <p className="text-center font-semibold text-slate-700 text-lg">What's your estimate?</p>
          <p className="text-center text-slate-500 text-sm">Speak your answer aloud</p>
        </div>
      ) : (
        /* Bricks (subitizing) or dots (estimation) */
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[220px] mx-auto">
          {Array.from({ length: count }, (_, i) => {
            const col = i % cols; const row = Math.floor(i / cols);
            if (taskType === "subitizing") {
              const cx = col * cellSize + cellSize / 2 + 10;
              const cy = row * cellSize + cellSize / 2 + 10;
              // robot_factory → bolt
              if (theme === "robot_factory") {
                const hr = Math.min(7, cellSize * 0.21);
                const shaftW = hr * 0.52; const shaftH = hr * 1.4;
                const headCy = cy - shaftH * 0.35;
                const hexPts = Array.from({ length: 6 }, (_, k) => {
                  const a = (k * Math.PI) / 3;
                  return `${cx + Math.cos(a) * hr},${headCy + Math.sin(a) * hr * 0.75}`;
                }).join(" ");
                return (
                  <g key={i}>
                    <polygon points={hexPts} fill={accent + "d0"} stroke={accent} strokeWidth={1.2} />
                    <rect x={cx - shaftW / 2} y={headCy + hr * 0.65} width={shaftW} height={shaftH} rx={1} fill={accent + "d0"} stroke={accent} strokeWidth={1.2} />
                  </g>
                );
              }
              // space_mission → star
              if (theme === "space_mission") {
                const r = Math.min(11, cellSize * 0.32); const ir = r * 0.42;
                const pts = Array.from({ length: 10 }, (_, k) => {
                  const a = (k * Math.PI) / 5 - Math.PI / 2;
                  return `${cx + Math.cos(a) * (k % 2 === 0 ? r : ir)},${cy + Math.sin(a) * (k % 2 === 0 ? r : ir)}`;
                }).join(" ");
                return <polygon key={i} points={pts} fill={accent + "d0"} stroke={accent} strokeWidth={1.2} />;
              }
              // bakery_math → cookie
              if (theme === "bakery_math") {
                const r = Math.min(11, cellSize * 0.32);
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r={r} fill={accent + "d0"} stroke={accent} strokeWidth={1.5} />
                    <line x1={cx - r * 0.45} y1={cy - r * 0.45} x2={cx + r * 0.45} y2={cy + r * 0.45} stroke={accent} strokeWidth={0.8} opacity={0.6} />
                    <line x1={cx + r * 0.45} y1={cy - r * 0.45} x2={cx - r * 0.45} y2={cy + r * 0.45} stroke={accent} strokeWidth={0.8} opacity={0.6} />
                  </g>
                );
              }
              // treasure_builder → gold coin (circle with inner ring)
              if (theme === "treasure_builder") {
                const r = Math.min(11, cellSize * 0.32);
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r={r} fill="#f59e0b" stroke="#d97706" strokeWidth={1.5} />
                    <circle cx={cx} cy={cy} r={r * 0.6} fill="none" stroke="#d97706" strokeWidth={1} opacity={0.6} />
                  </g>
                );
              }
              // city_builder (default) → brick
              const bw = cellSize * 0.82; const bh = cellSize * 0.44;
              const x = col * cellSize + (cellSize - bw) / 2 + 10;
              const y = row * cellSize + (cellSize - bh) / 2 + 10;
              return (
                <g key={i}>
                  <rect x={x} y={y} width={bw} height={bh} rx={3} fill={accent + "d0"} stroke={accent} strokeWidth={1.5} />
                  <line x1={x + bw * 0.33} y1={y} x2={x + bw * 0.33} y2={y + bh} stroke={accent} strokeWidth={0.8} opacity={0.5} />
                  <line x1={x + bw * 0.66} y1={y} x2={x + bw * 0.66} y2={y + bh} stroke={accent} strokeWidth={0.8} opacity={0.5} />
                </g>
              );
            }
            // Top-down car shape — only for the city_builder parking lot task
            if (!(taskId === "RMRA_NS_EP_003" && theme === "city_builder")) {
              const cx = col * cellSize + cellSize / 2 + 10 + (rng() - 0.5) * (cellSize * 0.2);
              const cy = row * cellSize + cellSize / 2 + 10 + (rng() - 0.5) * (cellSize * 0.2);
              if (theme === "space_mission") {
                // 5-pointed star for space mission
                const r = Math.min(11, cellSize * 0.32); const ir = r * 0.42;
                const pts = Array.from({ length: 10 }, (_, k) => {
                  const a = (k * Math.PI) / 5 - Math.PI / 2;
                  const rad = k % 2 === 0 ? r : ir;
                  return `${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`;
                }).join(" ");
                return <polygon key={i} points={pts} fill={accent + "d0"} stroke={accent} strokeWidth={1.2} />;
              }
              if (theme === "robot_factory") {
                // Bolt: flat-top hexagon head + rectangular shaft
                const hr = Math.min(7, cellSize * 0.21);
                const shaftW = hr * 0.52; const shaftH = hr * 1.4;
                const headCy = cy - shaftH * 0.35;
                const hexPts = Array.from({ length: 6 }, (_, k) => {
                  const a = (k * Math.PI) / 3;
                  return `${cx + Math.cos(a) * hr},${headCy + Math.sin(a) * hr * 0.75}`;
                }).join(" ");
                return (
                  <g key={i}>
                    <polygon points={hexPts} fill={accent + "d0"} stroke={accent} strokeWidth={1.2} />
                    <rect x={cx - shaftW / 2} y={headCy + hr * 0.65} width={shaftW} height={shaftH} rx={1} fill={accent + "d0"} stroke={accent} strokeWidth={1.2} />
                  </g>
                );
              }
              if (theme === "bakery_math") {
                // Cookie: circle with small cross-hatch lines
                const r = Math.min(11, cellSize * 0.32);
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r={r} fill={accent + "d0"} stroke={accent} strokeWidth={1.5} />
                    <line x1={cx - r * 0.45} y1={cy - r * 0.45} x2={cx + r * 0.45} y2={cy + r * 0.45} stroke={accent} strokeWidth={0.8} opacity={0.6} />
                    <line x1={cx + r * 0.45} y1={cy - r * 0.45} x2={cx - r * 0.45} y2={cy + r * 0.45} stroke={accent} strokeWidth={0.8} opacity={0.6} />
                  </g>
                );
              }
              if (theme === "treasure_builder") {
                const r = Math.min(11, cellSize * 0.32);
                const pts = `${cx},${cy - r} ${cx + r * 0.8},${cy} ${cx},${cy + r} ${cx - r * 0.8},${cy}`;
                return (
                  <g key={i}>
                    <polygon points={pts} fill="#FFD700" stroke="#B8860B" strokeWidth={1.5} />
                    <polygon points={`${cx},${cy - r * 0.55} ${cx + r * 0.45},${cy - r * 0.1} ${cx},${cy + r * 0.35} ${cx - r * 0.45},${cy - r * 0.1}`} fill="#FFF176" opacity={0.4} />
                  </g>
                );
              }
              if (theme === "city_builder") {
                // Brick: wide rectangle with mortar lines
                const bw = Math.min(22, cellSize * 0.65); const bh = bw * 0.45;
                const bx = cx - bw / 2; const by = cy - bh / 2;
                return (
                  <g key={i}>
                    <rect x={bx} y={by} width={bw} height={bh} rx={1.5} fill={accent + "d0"} stroke={accent} strokeWidth={1.2} />
                    <line x1={bx + bw * 0.35} y1={by} x2={bx + bw * 0.35} y2={by + bh} stroke={accent} strokeWidth={0.8} opacity={0.5} />
                    <line x1={bx + bw * 0.7} y1={by} x2={bx + bw * 0.7} y2={by + bh} stroke={accent} strokeWidth={0.8} opacity={0.5} />
                  </g>
                );
              }
              return <circle key={i} cx={cx} cy={cy} r={Math.min(12, cellSize * 0.35)} fill={accent + "d0"} stroke={accent} strokeWidth={1.5} />;
            }
            const cw = cellSize * 0.78; const ch = cellSize * 0.52;
            const cx2 = col * cellSize + (cellSize - cw) / 2 + 10;
            const cy2 = row * cellSize + (cellSize - ch) / 2 + 10;
            const ww = cw * 0.18; const wh = ch * 0.28;
            return (
              <g key={i}>
                {/* Body */}
                <rect x={cx2} y={cy2} width={cw} height={ch} rx={4} fill={accent + "d0"} stroke={accent} strokeWidth={1.2} />
                {/* Cabin */}
                <rect x={cx2 + cw * 0.22} y={cy2 + ch * 0.18} width={cw * 0.56} height={ch * 0.64} rx={3} fill={accent + "60"} stroke={accent} strokeWidth={0.8} />
                {/* Wheels */}
                <rect x={cx2 - ww * 0.4} y={cy2 + ch * 0.1} width={ww} height={wh} rx={2} fill="#475569" />
                <rect x={cx2 + cw - ww * 0.6} y={cy2 + ch * 0.1} width={ww} height={wh} rx={2} fill="#475569" />
                <rect x={cx2 - ww * 0.4} y={cy2 + ch * 0.62} width={ww} height={wh} rx={2} fill="#475569" />
                <rect x={cx2 + cw - ww * 0.6} y={cy2 + ch * 0.62} width={ww} height={wh} rx={2} fill="#475569" />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ── Visual: Building Comparison ──────────────────────────────────────────────

const BUILDING_COMPARISON_LABELS: Record<string, { card: string; labelA: string; labelB: string }> = {
  space_mission:    { card: "Which has more stars?",   labelA: "Red Rocket",    labelB: "Blue Rocket" },
  city_builder:     { card: "Which has more windows?", labelA: "Tall",          labelB: "Short" },
  bakery_math:      { card: "Which has more?",         labelA: "Big Tray",      labelB: "Small Tray" },
  robot_factory:    { card: "Which has more gears?",   labelA: "Green Robot",   labelB: "Yellow Robot" },
  treasure_builder: { card: "Which has more jewels?",  labelA: "Wooden Chest",  labelB: "Stone Chest" },
};

function BuildingComparisonVisual({ groupA, groupB, accent, theme }: { groupA: number; groupB: number; accent: string; theme?: string }) {
  const labels = BUILDING_COMPARISON_LABELS[theme ?? ""] ?? BUILDING_COMPARISON_LABELS.city_builder;

  // Helper: 5-pointed star path centred at (cx,cy) outer radius r, inner radius ir
  const starPath = (cx: number, cy: number, r = 7, ir = 3) =>
    Array.from({ length: 10 }, (_, i) => {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : ir;
      return `${i === 0 ? "M" : "L"}${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`;
    }).join("") + "Z";

  // Helper: item grid positions inside a container (cols=2, cell=16px)
  const itemPositions = (n: number, originX: number, originY: number, cols = 2, cell = 16) =>
    Array.from({ length: n }, (_, i) => ({
      x: originX + (i % cols) * cell + cell / 2,
      y: originY + Math.floor(i / cols) * cell + cell / 2,
    }));

  // ── space_mission: two rockets (red / blue) with stars ──────────────────────
  if (theme === "space_mission") {
    const RED = "#ef4444"; const BLUE = "#3b82f6";
    const RW = 46; const NOSE = 22; const FIN = 16; const PAD = 8; const COLS = 2; const CELL = 17;
    const rocketH = (n: number) => Math.ceil(n / COLS) * CELL + PAD * 2;
    const aH = rocketH(groupA); const bH = rocketH(groupB);
    const maxH = Math.max(aH, bH);
    const totalH = NOSE + maxH + FIN + 14;
    const W = RW * 2 + 50 + 20; const GAP = 50;
    const aX = 5; const bX = aX + RW + GAP;
    const renderRocket = (n: number, x: number, color: string, bodyH: number) => {
      const yBody = NOSE + (maxH - bodyH); // align bottoms
      const stars = itemPositions(n, x + PAD, yBody + PAD, COLS, CELL);
      return (
        <g key={x}>
          <polygon points={`${x + RW / 2},${yBody - NOSE} ${x},${yBody} ${x + RW},${yBody}`} fill={color} opacity={0.85} />
          <rect x={x} y={yBody} width={RW} height={bodyH} rx={3} fill={color} opacity={0.18} stroke={color} strokeWidth={1.5} />
          {stars.map((s, i) => <path key={i} d={starPath(s.x, s.y, 6, 2.5)} fill={color} opacity={0.9} />)}
          <polygon points={`${x},${yBody + bodyH} ${x - 10},${yBody + bodyH + FIN} ${x},${yBody + bodyH + FIN}`} fill={color} opacity={0.65} />
          <polygon points={`${x + RW},${yBody + bodyH} ${x + RW + 10},${yBody + bodyH + FIN} ${x + RW},${yBody + bodyH + FIN}`} fill={color} opacity={0.65} />
          <ellipse cx={x + RW / 2} cy={yBody + bodyH + FIN} rx={9} ry={5} fill="#fbbf24" opacity={0.85} />
        </g>
      );
    };
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>{labels.card}</p>
        <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full max-w-[240px] mx-auto">
          {renderRocket(groupA, aX, RED, aH)}
          {renderRocket(groupB, bX, BLUE, bH)}
          <text x={aX + RW / 2} y={totalH - 2} textAnchor="middle" fontSize={10} fill="#ef4444" fontWeight="700">{labels.labelA}</text>
          <text x={bX + RW / 2} y={totalH - 2} textAnchor="middle" fontSize={10} fill="#3b82f6" fontWeight="700">{labels.labelB}</text>
        </svg>
      </div>
    );
  }

  // ── bakery_math: two trays with cupcake circles ──────────────────────────────
  if (theme === "bakery_math") {
    const TRAY_W = 56; const PAD = 8; const COLS = 2; const CELL = 16; const TRAY_BOT = 10;
    const trayH = (n: number) => Math.ceil(n / COLS) * CELL + PAD * 2 + TRAY_BOT;
    const aH = trayH(groupA); const bH = trayH(groupB);
    const maxH = Math.max(aH, bH);
    const W = TRAY_W * 2 + 40 + 20; const GAP = 40; const LABEL_H = 14;
    const aX = 5; const bX = aX + TRAY_W + GAP;
    const renderTray = (n: number, x: number, h: number) => {
      const yTop = maxH - h + LABEL_H;
      const items = itemPositions(n, x + PAD, yTop + PAD, COLS, CELL);
      return (
        <g key={x}>
          <rect x={x} y={yTop} width={TRAY_W} height={h - TRAY_BOT} rx={4} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.5} />
          <rect x={x - 3} y={yTop + h - TRAY_BOT - 4} width={TRAY_W + 6} height={TRAY_BOT} rx={3} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1} />
          {items.map((s, i) => (
            <g key={i}>
              <ellipse cx={s.x} cy={s.y + 2} rx={6} ry={3} fill={accent + "99"} />
              <ellipse cx={s.x} cy={s.y - 2} rx={5} ry={5} fill={accent + "dd"} stroke={accent} strokeWidth={0.8} />
              <circle cx={s.x} cy={s.y - 4} r={1.5} fill="#fbbf24" />
            </g>
          ))}
        </g>
      );
    };
    const totalH = maxH + LABEL_H + 16;
    const labelY = totalH - 4;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>{labels.card}</p>
        <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full max-w-[240px] mx-auto">
          {renderTray(groupA, aX, aH)}
          {renderTray(groupB, bX, bH)}
          <text x={aX + TRAY_W / 2} y={labelY} textAnchor="middle" fontSize={10} fill="#475569" fontWeight="700">{labels.labelA}</text>
          <text x={bX + TRAY_W / 2} y={labelY} textAnchor="middle" fontSize={10} fill="#475569" fontWeight="700">{labels.labelB}</text>
        </svg>
      </div>
    );
  }

  // ── robot_factory: two robots with gear circles ───────────────────────────────
  if (theme === "robot_factory") {
    const GREEN = "#22c55e"; const YELLOW = "#eab308";
    const RBW = 50; const HEAD = 18; const PAD = 6; const COLS = 2; const CELL = 16; const FOOT = 10;
    const bodyH = (n: number) => Math.ceil(n / COLS) * CELL + PAD * 2;
    const aH = bodyH(groupA); const bH = bodyH(groupB);
    const maxBH = Math.max(aH, bH);
    const totalH = HEAD + maxBH + FOOT + 18;
    const W = RBW * 2 + 40 + 20; const GAP = 40;
    const aX = 5; const bX = aX + RBW + GAP;
    const renderRobot = (n: number, x: number, color: string, bh: number) => {
      // Body aligns to bottom; head sits directly on top of body
      const yBody = HEAD + (maxBH - bh);
      const yHead = yBody - HEAD;
      const gears = itemPositions(n, x + PAD, yBody + PAD, COLS, CELL);
      return (
        <g key={x}>
          {/* Head — always directly above body */}
          <rect x={x + 5} y={yHead} width={RBW - 10} height={HEAD} rx={4} fill={color} opacity={0.25} stroke={color} strokeWidth={1.5} />
          <circle cx={x + RBW / 2 - 7} cy={yHead + HEAD / 2} r={3} fill={color} opacity={0.9} />
          <circle cx={x + RBW / 2 + 7} cy={yHead + HEAD / 2} r={3} fill={color} opacity={0.9} />
          {/* Body */}
          <rect x={x} y={yBody} width={RBW} height={bh} rx={3} fill={color} opacity={0.15} stroke={color} strokeWidth={1.5} />
          {gears.map((g, i) => (
            <g key={i}>
              <circle cx={g.x} cy={g.y} r={6} fill="none" stroke={color} strokeWidth={2} opacity={0.9} />
              <circle cx={g.x} cy={g.y} r={2.5} fill={color} opacity={0.8} />
              {[0, 60, 120, 180, 240, 300].map(deg => {
                const rad = (deg * Math.PI) / 180;
                return <rect key={deg} x={g.x + Math.cos(rad) * 5.5 - 1.5} y={g.y + Math.sin(rad) * 5.5 - 1.5} width={3} height={3} rx={0.5} fill={color} opacity={0.9} />;
              })}
            </g>
          ))}
          {/* Feet */}
          <rect x={x + 8} y={yBody + bh} width={10} height={FOOT} rx={2} fill={color} opacity={0.5} />
          <rect x={x + RBW - 18} y={yBody + bh} width={10} height={FOOT} rx={2} fill={color} opacity={0.5} />
        </g>
      );
    };
    const labelY = totalH - 4;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>{labels.card}</p>
        <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full max-w-[240px] mx-auto">
          {renderRobot(groupA, aX, GREEN, aH)}
          {renderRobot(groupB, bX, YELLOW, bH)}
          <text x={aX + RBW / 2} y={labelY} textAnchor="middle" fontSize={10} fill="#22c55e" fontWeight="700">{labels.labelA}</text>
          <text x={bX + RBW / 2} y={labelY} textAnchor="middle" fontSize={10} fill="#ca8a04" fontWeight="700">{labels.labelB}</text>
        </svg>
      </div>
    );
  }

  // ── treasure_builder: two chests with jewel diamonds ─────────────────────────
  if (theme === "treasure_builder") {
    const WOOD = "#92400e"; const STONE = "#64748b";
    const CW = 54; const LID = 14; const PAD = 8; const COLS = 2; const CELL = 15;
    const chestBodyH = (n: number) => Math.ceil(n / COLS) * CELL + PAD * 2;
    const aH = chestBodyH(groupA); const bH = chestBodyH(groupB);
    const maxBH = Math.max(aH, bH);
    const totalH = LID + maxBH + 16;
    const W = CW * 2 + 40 + 20; const GAP = 40;
    const aX = 5; const bX = aX + CW + GAP;
    const diamond = (cx: number, cy: number, color: string) =>
      <polygon key={`${cx}-${cy}`} points={`${cx},${cy - 6} ${cx + 5},${cy} ${cx},${cy + 5} ${cx - 5},${cy}`} fill={color} opacity={0.85} stroke={color} strokeWidth={0.5} />;
    const renderChest = (n: number, x: number, color: string, bh: number) => {
      const yBody = LID + (maxBH - bh);
      const jewels = itemPositions(n, x + PAD, yBody + PAD, COLS, CELL);
      return (
        <g key={x}>
          <rect x={x} y={LID + (maxBH - bh) - LID} width={CW} height={LID} rx={4} fill={color} opacity={0.4} stroke={color} strokeWidth={1.5} />
          <rect x={x} y={yBody} width={CW} height={bh} rx={2} fill={color} opacity={0.15} stroke={color} strokeWidth={1.5} />
          <rect x={x + CW / 2 - 8} y={yBody - 4} width={16} height={8} rx={2} fill={color} opacity={0.6} />
          {jewels.map((j, i) => diamond(j.x, j.y, i % 2 === 0 ? "#a855f7" : "#f59e0b"))}
        </g>
      );
    };
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>{labels.card}</p>
        <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full max-w-[240px] mx-auto">
          {renderChest(groupA, aX, WOOD, aH)}
          {renderChest(groupB, bX, STONE, bH)}
          <text x={aX + CW / 2} y={totalH} textAnchor="middle" fontSize={10} fill="#92400e" fontWeight="700">{labels.labelA}</text>
          <text x={bX + CW / 2} y={totalH} textAnchor="middle" fontSize={10} fill="#64748b" fontWeight="700">{labels.labelB}</text>
        </svg>
      </div>
    );
  }

  // ── city_builder (default): two buildings with windows ───────────────────────
  const WIN_COLS = 2; const WIN_W = 18; const WIN_H = 14; const WIN_GAP = 8;
  const WALL_PAD_X = 12; const WALL_PAD_TOP = 12; const WALL_PAD_BOT = 20;
  const buildingW = WIN_COLS * WIN_W + (WIN_COLS - 1) * WIN_GAP + WALL_PAD_X * 2;
  const buildSVG = (n: number) => {
    const rows = Math.ceil(n / WIN_COLS);
    const bldH = rows * WIN_H + (rows - 1) * WIN_GAP + WALL_PAD_TOP + WALL_PAD_BOT;
    const windows = Array.from({ length: n }, (_, i) => {
      const col = i % WIN_COLS; const row = Math.floor(i / WIN_COLS);
      return { wx: WALL_PAD_X + col * (WIN_W + WIN_GAP), wy: WALL_PAD_TOP + row * (WIN_H + WIN_GAP) };
    });
    return { bldH, windows };
  };
  const a = buildSVG(groupA); const b = buildSVG(groupB);
  const maxH = Math.max(a.bldH, b.bldH);
  const LABEL_TOP = 26; const GAP = 30; const W = buildingW * 2 + GAP + 20; const H = maxH + 30 + LABEL_TOP;
  const aX = 5; const bX = aX + buildingW + GAP;
  const renderBuilding = (info: ReturnType<typeof buildSVG>, xOff: number) => (
    <g key={xOff}>
      <rect x={xOff} y={H - info.bldH - 20} width={buildingW} height={info.bldH} rx={2} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1.5} />
      {info.windows.map(({ wx, wy }, i) => (
        <rect key={i} x={xOff + wx} y={H - info.bldH - 20 + wy} width={WIN_W} height={WIN_H} rx={2} fill={accent + "cc"} stroke={accent} strokeWidth={1} />
      ))}
      <rect x={xOff + buildingW / 2 - 7} y={H - 20} width={14} height={18} rx={2} fill="#94a3b8" stroke="#64748b" strokeWidth={1} />
      <line x1={xOff - 4} y1={H - 2} x2={xOff + buildingW + 4} y2={H - 2} stroke="#94a3b8" strokeWidth={2} />
    </g>
  );
  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>{labels.card}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[240px] mx-auto">
        {renderBuilding(a, aX)}
        {renderBuilding(b, bX)}
        <text x={aX + buildingW / 2} y={H - a.bldH - 24} textAnchor="middle" fontSize={10} fill="#475569" fontWeight="700">{labels.labelA}</text>
        <text x={bX + buildingW / 2} y={H - b.bldH - 24} textAnchor="middle" fontSize={10} fill="#475569" fontWeight="700">{labels.labelB}</text>
      </svg>
    </div>
  );
}

// ── Visual: Building Groups ───────────────────────────────────────────────────
// Shows N equal-sized buildings each with M windows — for equal-groups multiplication

function BuildingGroupsVisual({ groups, perGroup, accent, theme }: { groups: number; perGroup: number; accent: string; theme?: string }) {
  const GAP = 16;

  // ── Label ──────────────────────────────────────────────────────────────────
  const LABELS: Record<string, { group: string; thing: string }> = {
    space_mission:   { group: "rocket",   thing: "window" },
    city_builder:    { group: "building", thing: "window" },
    bakery_math:     { group: "tray",     thing: "muffin" },
    robot_factory:   { group: "robot",    thing: "arm"    },
    treasure_builder:{ group: "chest",    thing: "gem"    },
  };
  const lbl = LABELS[theme ?? "city_builder"] ?? LABELS.city_builder;
  const label = `${groups} ${lbl.group}${groups !== 1 ? "s" : ""} × ${perGroup} ${lbl.thing}${perGroup !== 1 ? "s" : ""}`;

  // ── Rocket (space_mission) ─────────────────────────────────────────────────
  if (theme === "space_mission") {
    const rW = 44; const rH = 110; const coneH = 24; const finW = 10; const finH = 20;
    const portR = 7; const portRows = Math.ceil(perGroup / 2); const portCols = Math.min(perGroup, 2);
    const W = groups * rW + (groups - 1) * GAP + finW * 2 + 10;
    const H = rH + 24;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>{label}</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[280px] mx-auto">
          {Array.from({ length: groups }, (_, g) => {
            const x = 5 + finW + g * (rW + GAP);
            const y = 8;
            const bodyTop = y + coneH;
            const bodyBot = y + rH - finH;
            const bodyH = bodyBot - bodyTop;
            return (
              <g key={g}>
                {/* Left fin */}
                <polygon points={`${x},${bodyBot} ${x - finW},${bodyBot + finH} ${x},${bodyBot + finH}`} fill="#94a3b8" stroke="#64748b" strokeWidth={1} />
                {/* Right fin */}
                <polygon points={`${x + rW},${bodyBot} ${x + rW + finW},${bodyBot + finH} ${x + rW},${bodyBot + finH}`} fill="#94a3b8" stroke="#64748b" strokeWidth={1} />
                {/* Body */}
                <rect x={x} y={bodyTop} width={rW} height={bodyH + finH} rx={4} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1.5} />
                {/* Nose cone */}
                <polygon points={`${x + rW / 2},${y} ${x},${bodyTop + 6} ${x + rW},${bodyTop + 6}`} fill={accent} stroke={accent} strokeWidth={1} />
                {/* Engine nozzle */}
                <rect x={x + rW * 0.3} y={bodyBot + finH - 4} width={rW * 0.4} height={8} rx={2} fill="#64748b" />
                {/* Portholes (= perGroup items) */}
                {Array.from({ length: perGroup }, (_, w) => {
                  const col = w % portCols; const row = Math.floor(w / portCols);
                  const px = x + rW / 2 + (col - (portCols - 1) / 2) * (portR * 2 + 4);
                  const py = bodyTop + 14 + row * (portR * 2 + 6);
                  return (
                    <g key={w}>
                      <circle cx={px} cy={py} r={portR} fill={accent + "cc"} stroke={accent} strokeWidth={1.5} />
                      <circle cx={px - 2} cy={py - 2} r={2} fill="white" opacity={0.5} />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // ── Tray + muffins (bakery_math) ───────────────────────────────────────────
  if (theme === "bakery_math") {
    const tW = 56; const tH = 14; const mR = 9; const muffCols = Math.min(perGroup, 3);
    const muffRows = Math.ceil(perGroup / muffCols);
    const itemH = muffRows * (mR * 2 + 4) + tH + 8;
    const W = groups * tW + (groups - 1) * GAP + 10;
    const H = itemH + 28;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>{label}</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[280px] mx-auto">
          {Array.from({ length: groups }, (_, g) => {
            const x = 5 + g * (tW + GAP);
            const tY = H - 22 - tH;
            return (
              <g key={g}>
                {/* Tray */}
                <rect x={x} y={tY} width={tW} height={tH} rx={3} fill="#94a3b8" stroke="#64748b" strokeWidth={1.5} />
                {/* Muffins */}
                {Array.from({ length: perGroup }, (_, w) => {
                  const col = w % muffCols; const row = Math.floor(w / muffCols);
                  const mx = x + (tW / muffCols) * col + tW / muffCols / 2;
                  const my = tY - mR - 4 - row * (mR * 2 + 4);
                  return (
                    <g key={w}>
                      {/* Muffin base */}
                      <rect x={mx - mR * 0.8} y={my} width={mR * 1.6} height={mR} rx={2} fill="#d97706cc" stroke="#92400e" strokeWidth={1} />
                      {/* Muffin top dome */}
                      <ellipse cx={mx} cy={my} rx={mR} ry={mR * 0.65} fill={accent + "d0"} stroke={accent} strokeWidth={1} />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // ── Robot (robot_factory) ──────────────────────────────────────────────────
  if (theme === "robot_factory") {
    const rbW = 40; const rbH = 52; const headH = 16; const armLen = 14;
    const W = groups * (rbW + armLen * 2) + (groups - 1) * GAP + 10;
    const H = rbH + headH + 32;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>{label}</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[280px] mx-auto">
          {Array.from({ length: groups }, (_, g) => {
            const x = 5 + armLen + g * (rbW + armLen * 2 + GAP);
            const y = 8;
            const bodyY = y + headH + 4;
            return (
              <g key={g}>
                {/* Head */}
                <rect x={x + rbW * 0.2} y={y} width={rbW * 0.6} height={headH} rx={3} fill="#94a3b8" stroke="#64748b" strokeWidth={1.5} />
                {/* Eyes */}
                <circle cx={x + rbW * 0.35} cy={y + 6} r={3} fill={accent} />
                <circle cx={x + rbW * 0.65} cy={y + 6} r={3} fill={accent} />
                {/* Neck */}
                <rect x={x + rbW * 0.4} y={y + headH} width={rbW * 0.2} height={4} fill="#94a3b8" />
                {/* Body */}
                <rect x={x} y={bodyY} width={rbW} height={rbH} rx={4} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1.5} />
                {/* Arms (= perGroup items) */}
                {Array.from({ length: perGroup }, (_, w) => {
                  const side = w % 2; // 0=left, 1=right
                  const row = Math.floor(w / 2);
                  const ay = bodyY + 10 + row * 14;
                  const ax = side === 0 ? x - armLen : x + rbW;
                  const ax2 = side === 0 ? x : x + rbW + armLen;
                  return (
                    <g key={w}>
                      <line x1={ax} y1={ay} x2={ax2} y2={ay} stroke={accent} strokeWidth={5} strokeLinecap="round" />
                      <circle cx={ax} cy={ay} r={4} fill={accent + "cc"} stroke={accent} strokeWidth={1} />
                    </g>
                  );
                })}
                {/* Legs */}
                <rect x={x + 6} y={bodyY + rbH} width={10} height={12} rx={2} fill="#94a3b8" stroke="#64748b" strokeWidth={1} />
                <rect x={x + rbW - 16} y={bodyY + rbH} width={10} height={12} rx={2} fill="#94a3b8" stroke="#64748b" strokeWidth={1} />
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // ── Treasure chest (treasure_builder) ─────────────────────────────────────
  if (theme === "treasure_builder") {
    const cW = 54; const cH = 36; const lidH = 14; const gemR = 7;
    const gemCols = Math.min(perGroup, 3);
    const W = groups * cW + (groups - 1) * GAP + 10;
    const H = cH + lidH + 32;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>{label}</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[280px] mx-auto">
          {Array.from({ length: groups }, (_, g) => {
            const x = 5 + g * (cW + GAP);
            const y = 8;
            return (
              <g key={g}>
                {/* Chest lid (arc) */}
                <path d={`M ${x} ${y + lidH} Q ${x + cW / 2} ${y - 4} ${x + cW} ${y + lidH}`} fill="#92400e" stroke="#78350f" strokeWidth={1.5} />
                <rect x={x} y={y + lidH} width={cW} height={lidH / 2} fill="#92400e" stroke="#78350f" strokeWidth={1} />
                {/* Chest body */}
                <rect x={x} y={y + lidH * 1.5} width={cW} height={cH} rx={3} fill="#b45309" stroke="#92400e" strokeWidth={1.5} />
                {/* Lock */}
                <rect x={x + cW / 2 - 5} y={y + lidH * 1.2} width={10} height={8} rx={2} fill="#f59e0b" stroke="#d97706" strokeWidth={1} />
                {/* Metal band */}
                <line x1={x} y1={y + lidH * 1.5 + cH / 2} x2={x + cW} y2={y + lidH * 1.5 + cH / 2} stroke="#78350f" strokeWidth={2} />
                {/* Gems (= perGroup items) */}
                {Array.from({ length: perGroup }, (_, w) => {
                  const col = w % gemCols; const row = Math.floor(w / gemCols);
                  const gx = x + (cW / gemCols) * col + cW / gemCols / 2;
                  const gy = y + lidH * 1.5 + cH / 4 + row * (gemR * 2 + 4);
                  const pts = `${gx},${gy - gemR} ${gx + gemR * 0.65},${gy} ${gx},${gy + gemR} ${gx - gemR * 0.65},${gy}`;
                  return <polygon key={w} points={pts} fill="#f59e0bd0" stroke="#d97706" strokeWidth={1.5} />;
                })}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // ── Default: Buildings (city_builder) ──────────────────────────────────────
  const WIN_COLS = 2; const WIN_W = 16; const WIN_H = 12; const WIN_GAP = 6;
  const WALL_PAD_X = 10; const WALL_PAD_TOP = 10; const WALL_PAD_BOT = 18;
  const bldW = WIN_COLS * WIN_W + (WIN_COLS - 1) * WIN_GAP + WALL_PAD_X * 2;
  const rows = Math.ceil(perGroup / WIN_COLS);
  const bldH = rows * WIN_H + (rows - 1) * WIN_GAP + WALL_PAD_TOP + WALL_PAD_BOT;
  const W = groups * bldW + (groups - 1) * GAP + 10;
  const H = bldH + 30;
  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>{label}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[260px] mx-auto">
        {Array.from({ length: groups }, (_, g) => {
          const xOff = 5 + g * (bldW + GAP);
          const yOff = 8;
          return (
            <g key={g}>
              <rect x={xOff} y={yOff} width={bldW} height={bldH} rx={2} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1.5} />
              {Array.from({ length: perGroup }, (_, w) => {
                const col = w % WIN_COLS; const row = Math.floor(w / WIN_COLS);
                const wx = xOff + WALL_PAD_X + col * (WIN_W + WIN_GAP);
                const wy = yOff + WALL_PAD_TOP + row * (WIN_H + WIN_GAP);
                return <rect key={w} x={wx} y={wy} width={WIN_W} height={WIN_H} rx={2} fill={accent + "cc"} stroke={accent} strokeWidth={1} />;
              })}
              <rect x={xOff + bldW / 2 - 6} y={yOff + bldH - 16} width={12} height={15} rx={2} fill="#94a3b8" stroke="#64748b" strokeWidth={1} />
              <line x1={xOff - 2} y1={yOff + bldH + 1} x2={xOff + bldW + 2} y2={yOff + bldH + 1} stroke="#94a3b8" strokeWidth={2} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Visual: Number Line ───────────────────────────────────────────────────────
// Static context-driven illustration — no interactive elements

function NumberLineVisual({ scaleMin, scaleMax, accent, taskType, vp }: {
  scaleMin: number; scaleMax: number; accent: string; taskType: string;
  vp: Record<string, unknown>;
}) {
  const numVP = (k: string, fb: number) => typeof vp[k] === "number" ? vp[k] as number : fb;
  const strVP = (k: string, fb: string) => typeof vp[k] === "string" ? vp[k] as string : fb;
  const fmtNum = (n: number) => Number.isInteger(n) ? n.toLocaleString() : String(n);

  // ── Comparison bars: two values shown as proportion bars (rockets, temperatures, etc.)
  if (taskType === "difference" || taskType === "integer_subtraction" || taskType === "magnitude_comparison") {
    const rawA = numVP("valueA", scaleMax * 0.65);
    const rawB = numVP("valueB", scaleMax * 0.42);
    const labelA = strVP("labelA", "A");
    const labelB = strVP("labelB", "B");
    const maxAbs = Math.max(Math.abs(rawA), Math.abs(rawB)) || 1;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Compare the values</p>
        <div className="flex flex-col gap-3 py-1 w-full max-w-xs mx-auto">
          {([{ val: rawA, label: labelA }, { val: rawB, label: labelB }] as { val: number; label: string }[]).map(({ val, label }) => (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex justify-between items-center px-0.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</span>
                <span className="text-sm font-bold" style={{ color: accent }}>{fmtNum(val)}</span>
              </div>
              <div className="w-full h-7 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max((Math.abs(val) / maxAbs) * 100, 6)}%`, backgroundColor: accent + "cc" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Integer number line: start value with arc showing the change
  if (taskType === "integer_sense") {
    const startVal = numVP("startVal", -45);
    const change = numVP("change", 70);
    const endVal = startVal + change;
    const minV = Math.min(startVal, 0, endVal) - 8;
    const maxV = Math.max(startVal, 0, endVal) + 8;
    const W = 280; const lineY = 56; const L = 20; const R = W - 20;
    const toX = (v: number) => L + ((v - minV) / (maxV - minV)) * (R - L);
    const midX = (toX(startVal) + toX(endVal)) / 2;
    const uniqueVals = Array.from(new Set([startVal, 0, endVal]));
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Number line</p>
        <svg viewBox={`0 0 ${W} 88`} className="w-full max-w-sm mx-auto">
          <line x1={L} y1={lineY} x2={R} y2={lineY} stroke="#475569" strokeWidth={2.5} strokeLinecap="round" />
          <polygon points={`${R + 2},${lineY} ${R - 8},${lineY - 4} ${R - 8},${lineY + 4}`} fill="#475569" />
          {uniqueVals.map(v => {
            const x = toX(v); const isKey = v === startVal || v === endVal;
            return (
              <g key={v}>
                <line x1={x} y1={lineY - 7} x2={x} y2={lineY + 7} stroke={isKey ? accent : "#94a3b8"} strokeWidth={isKey ? 2.5 : 1.5} />
                <text x={x} y={lineY + 20} textAnchor="middle" fontSize={11} fill={isKey ? accent : "#94a3b8"} fontWeight={isKey ? "bold" : "normal"}>{v}</text>
              </g>
            );
          })}
          <path d={`M ${toX(startVal)} ${lineY - 14} Q ${midX} ${lineY - 38} ${toX(endVal)} ${lineY - 14}`} fill="none" stroke={accent} strokeWidth={2} strokeDasharray="4,3" />
          <polygon points={`${toX(endVal)},${lineY - 14} ${toX(endVal) - 5},${lineY - 24} ${toX(endVal) + 5},${lineY - 24}`} fill={accent} />
          <text x={midX} y={lineY - 44} textAnchor="middle" fontSize={11} fill={accent} fontWeight="bold">{change > 0 ? `+${change}` : String(change)}</text>
        </svg>
      </div>
    );
  }

  // ── Rational ordering: value chips to arrange
  if (taskType === "rational_number_sense") {
    const vals = Array.isArray(vp.sortValues) ? vp.sortValues as string[] : ["-1.5", "-\u00be", "-0.5", "1.25", "3/2"];
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Order these values</p>
        <div className="flex flex-wrap justify-center gap-2 py-2">
          {vals.map((v, i) => (
            <div key={i} className="px-3 py-1.5 rounded-lg border-2 text-sm font-bold text-slate-700" style={{ borderColor: accent, backgroundColor: accent + "15" }}>{v}</div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-1">Arrange from smallest \u2192 largest</p>
      </div>
    );
  }

  // ── Scientific notation display
  if (taskType === "scientific_notation") {
    const sci = strVP("sciNotation", "4.56 \u00d7 10\u2077");
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Scientific notation</p>
        <div className="flex flex-col items-center gap-1 py-3">
          <div className="text-2xl font-bold" style={{ color: accent }}>{sci}</div>
          <p className="text-xs text-slate-400 mt-1">Write as an ordinary number</p>
        </div>
      </div>
    );
  }

  // ── number_ordering: show number as chip + EMPTY number line (don't give away the answer)
  if (taskType === "number_ordering") {
    const val = numVP("value", 0);
    const sMin2 = numVP("scaleMin", scaleMin);
    const sMax2 = numVP("scaleMax", scaleMax);
    const range2 = sMax2 - sMin2;
    const step2 = range2 <= 20 ? 1 : range2 <= 100 ? 10 : range2 <= 1000 ? 100 : 1000;
    const tickCount2 = Math.min(10, Math.ceil(range2 / step2));
    const ticks2 = Array.from({ length: tickCount2 + 1 }, (_, i) => i / tickCount2);
    const W2 = 300; const lY2 = 48; const L2 = 28; const R2 = W2 - 28;
    const toX3 = (t: number) => L2 + t * (R2 - L2);
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Place this number</p>
        <div className="flex justify-center mt-2 mb-4">
          <div className="px-6 py-2.5 rounded-xl text-2xl font-extrabold border-2 shadow-sm select-none"
            style={{ color: accent, borderColor: accent, backgroundColor: accent + "12" }}>
            {val.toLocaleString()}
          </div>
        </div>
        <svg viewBox={`0 0 ${W2} 82`} className="w-full max-w-sm mx-auto">
          <line x1={L2} y1={lY2} x2={R2} y2={lY2} stroke="#334155" strokeWidth={3} strokeLinecap="round" />
          <polygon points={`${R2 + 2},${lY2} ${R2 - 9},${lY2 - 4} ${R2 - 9},${lY2 + 4}`} fill="#334155" />
          {ticks2.map((t, i) => {
            const x = toX3(t);
            const v = Math.round(sMin2 + t * range2);
            const isMain = i === 0 || i === tickCount2 || i === Math.floor(tickCount2 / 2);
            return (
              <g key={i}>
                <line x1={x} y1={lY2 - (isMain ? 10 : 6)} x2={x} y2={lY2 + (isMain ? 10 : 6)} stroke="#475569" strokeWidth={isMain ? 2.5 : 1.5} />
                {isMain && <text x={x} y={lY2 + 22} textAnchor="middle" fontSize={11} fill="#475569" fontWeight="600">{v.toLocaleString()}</text>}
              </g>
            );
          })}
        </svg>
        <p className="text-[10px] text-slate-400 text-center mt-1">Where does this number belong on the line?</p>
      </div>
    );
  }

  // ── rounding: chip + benchmark number line — no pre-placed marker
  if (taskType === "rounding") {
    const val = numVP("value", 0);
    const sMin2 = numVP("scaleMin", scaleMin);
    const sMax2 = numVP("scaleMax", scaleMax);
    const rangeR = sMax2 - sMin2;
    const stepR = rangeR <= 20 ? 1 : rangeR <= 100 ? 10 : rangeR <= 1000 ? 100 : 1000;
    const tickCountR = Math.min(10, Math.ceil(rangeR / stepR));
    const ticksR = Array.from({ length: tickCountR + 1 }, (_, i) => i / tickCountR);
    const WR = 300; const lYR = 48; const LR = 28; const RR = WR - 28;
    const toXR = (t: number) => LR + t * (RR - LR);
    // Nearest rounded benchmarks
    const roundingUnit = Math.round(rangeR / 2) || 100;
    const lower = Math.floor(val / roundingUnit) * roundingUnit;
    const upper = Math.ceil(val / roundingUnit) * roundingUnit;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Round this number</p>
        <div className="flex justify-center mt-2 mb-4">
          <div className="px-6 py-2.5 rounded-xl text-2xl font-extrabold border-2 shadow-sm select-none"
            style={{ color: accent, borderColor: accent, backgroundColor: accent + "12" }}>
            {val.toLocaleString()}
          </div>
        </div>
        <svg viewBox={`0 0 ${WR} 82`} className="w-full max-w-sm mx-auto">
          <line x1={LR} y1={lYR} x2={RR} y2={lYR} stroke="#334155" strokeWidth={3} strokeLinecap="round" />
          <polygon points={`${RR + 2},${lYR} ${RR - 9},${lYR - 4} ${RR - 9},${lYR + 4}`} fill="#334155" />
          {ticksR.map((t, i) => {
            const x = toXR(t);
            const v = Math.round(sMin2 + t * rangeR);
            const isLower = Math.abs(v - lower) < stepR * 0.5;
            const isUpper = Math.abs(v - upper) < stepR * 0.5 && upper !== lower;
            const isMain = i === 0 || i === tickCountR || isLower || isUpper || i === Math.floor(tickCountR / 2);
            return (
              <g key={i}>
                <line x1={x} y1={lYR - (isMain ? 10 : 6)} x2={x} y2={lYR + (isMain ? 10 : 6)}
                  stroke={(isLower || isUpper) ? accent : "#475569"} strokeWidth={isMain ? 2.5 : 1.5} />
                {isMain && <text x={x} y={lYR + 22} textAnchor="middle" fontSize={11}
                  fill={(isLower || isUpper) ? accent : "#475569"} fontWeight="600">{v.toLocaleString()}</text>}
              </g>
            );
          })}
        </svg>
        <p className="text-[10px] text-slate-400 text-center mt-1">Which value is it closer to?</p>
      </div>
    );
  }

  // ── Default: static number line with optional value marked
  const sMin = numVP("scaleMin", scaleMin);
  const sMax = numVP("scaleMax", scaleMax);
  const value = numVP("value", NaN);
  const range = sMax - sMin;
  const step = range <= 20 ? 1 : range <= 100 ? 10 : range <= 1000 ? 100 : 1000;
  const tickCount = Math.min(10, Math.ceil(range / step));
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i / tickCount);
  const W = 300; const lineY = 55; const L = 28; const R = W - 28;
  const toX2 = (t: number) => L + t * (R - L);
  const valT = isNaN(value) ? null : Math.max(0, Math.min(1, (value - sMin) / (sMax - sMin)));
  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Number line</p>
      <svg viewBox={`0 0 ${W} 90`} className="w-full max-w-sm mx-auto">
        <line x1={L} y1={lineY} x2={R} y2={lineY} stroke="#334155" strokeWidth={3} strokeLinecap="round" />
        <polygon points={`${R + 2},${lineY} ${R - 9},${lineY - 4} ${R - 9},${lineY + 4}`} fill="#334155" />
        {ticks.map((t, i) => {
          const x = toX2(t); const val = Math.round(sMin + t * range);
          const isMain = i === 0 || i === tickCount || i === Math.floor(tickCount / 2);
          return (
            <g key={i}>
              <line x1={x} y1={lineY - (isMain ? 10 : 6)} x2={x} y2={lineY + (isMain ? 10 : 6)} stroke="#475569" strokeWidth={isMain ? 2.5 : 1.5} />
              {isMain && <text x={x} y={lineY + 22} textAnchor="middle" fontSize={11} fill="#475569" fontWeight="600">{val.toLocaleString()}</text>}
            </g>
          );
        })}
        {valT !== null && (
          <g>
            <line x1={toX2(valT)} y1={lineY - 22} x2={toX2(valT)} y2={lineY + 2} stroke={accent} strokeWidth={2.5} strokeDasharray="3,2" />
            <polygon points={`${toX2(valT)},${lineY - 22} ${toX2(valT) - 8},${lineY - 36} ${toX2(valT) + 8},${lineY - 36}`} fill={accent} />
            <text x={toX2(valT)} y={lineY - 40} textAnchor="middle" fontSize={12} fill={accent} fontWeight="bold">{value.toLocaleString()}</text>
          </g>
        )}
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
  const value = thousands * 1000 + hundreds * 100 + tens * 10 + ones;
  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Build this number</p>
      <div className="flex flex-col items-center justify-center py-6 gap-1">
        <span className="text-7xl font-black tracking-tight" style={{ color: accent }}>{value.toLocaleString()}</span>
        <span className="text-xs text-slate-400 font-medium mt-1">How many tens and ones make this number?</span>
      </div>
    </div>
  );
}

// ── Visual: Fraction Bar ──────────────────────────────────────────────────────
// Static illustration showing two fraction bars side by side (or single)

function FractionBarVisual({ numerator, denominator, accent, vp }: {
  numerator: number; denominator: number; accent: string;
  vp?: Record<string, unknown>;
}) {
  const vpNum = (k: string, fb: number) => typeof vp?.[k] === "number" ? vp![k] as number : fb;
  const strVP = (k: string, fb: string) => typeof vp?.[k] === "string" ? vp![k] as string : fb;

  // Fraction division context (DT_MS_001): show dividend ÷ divisor
  const equation = strVP("equation", "");
  if (equation) {
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Fraction division</p>
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="text-3xl font-bold tracking-wide" style={{ color: accent }}>{equation}</div>
          <div className="text-xs text-slate-400">How many {strVP("divisor", "quarters")} fit in {strVP("dividend", "3½")} wholes?</div>
          {/* Visual: 4 whole bars with the last one half-shaded */}
          <div className="flex gap-1 mt-1">
            {[1, 1, 1, 0.5].map((fill, i) => (
              <div key={i} className="h-8 w-14 rounded border-2 overflow-hidden" style={{ borderColor: accent }}>
                <div className="h-full" style={{ width: `${fill * 100}%`, backgroundColor: accent + "c0" }} />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400">Each bar = 1 whole</p>
        </div>
      </div>
    );
  }

  // Two-fraction comparison (FR_UP_001): frac1 and frac2 side by side
  const f1n = vpNum("frac1Num", numerator); const f1d = vpNum("frac1Den", denominator);
  const f2n = vpNum("frac2Num", numerator); const f2d = vpNum("frac2Den", denominator);
  const hasTwoFractions = vp && vp.frac1Num !== undefined;

  if (hasTwoFractions) {
    const W = 260; const H = 36; const PAD = 8; const barW = W - PAD * 2;
    const row = (num: number, den: number, label: string, y: number) => {
      const cellW = barW / den;
      return (
        <g key={label}>
          {Array.from({ length: den }, (_, i) => (
            <rect key={i} x={PAD + i * cellW} y={y} width={cellW - 1.5} height={H}
              fill={i < num ? accent + "c0" : "#f1f5f9"}
              stroke={i < num ? accent : "#94a3b8"} strokeWidth={i < num ? 2 : 1.5} rx={2} />
          ))}
          <text x={PAD - 4} y={y + H / 2 + 4} textAnchor="end" fontSize={11} fill="#64748b" fontWeight="bold">{num}/{den}</text>
        </g>
      );
    };
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Compare the fractions</p>
        <svg viewBox={`0 0 ${W} 105`} className="w-full max-w-xs mx-auto">
          {row(f1n, f1d, "f1", 8)}
          {row(f2n, f2d, "f2", 58)}
        </svg>
      </div>
    );
  }

  // Default single bar
  const den = Math.max(denominator, 2); const num = Math.min(numerator, den);
  const W = 260; const H = 40; const PAD = 8; const cellW = (W - PAD * 2) / den;
  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Fraction bar</p>
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full max-w-xs mx-auto">
        {Array.from({ length: den }, (_, i) => (
          <rect key={i} x={PAD + i * cellW} y={4} width={cellW - 1.5} height={H}
            fill={i < num ? accent + "c0" : "#f1f5f9"}
            stroke={i < num ? accent : "#94a3b8"} strokeWidth={i < num ? 2 : 1.5} rx={2} />
        ))}
        <text x={W / 2} y={H + 20} textAnchor="middle" fontSize={11} fill="#64748b">{num} of {den} parts</text>
      </svg>
    </div>
  );
}

// ── Visual: Fraction Circle ───────────────────────────────────────────────────
// Static illustration — pre-shaded to show the fraction

function FractionCircleVisual({ numerator, denominator, accent, theme }: {
  numerator: number; denominator: number; accent: string; theme?: string;
}) {
  const den = Math.max(denominator, 2);
  const num = Math.min(numerator, den);
  const R = 68; const cx = 100; const cy = 88;

  const THEME_LABEL: Record<string, string> = {
    space_mission: "The moon",
    city_builder: "The shape",
    bakery_math: "The pizza",
    robot_factory: "The panel",
    treasure_builder: "The treasure zone",
  };
  const label = THEME_LABEL[theme ?? ""] ?? "Fraction circle";

  const makeSlice = (i: number) => {
    const a1 = (i / den) * 2 * Math.PI - Math.PI / 2;
    const a2 = ((i + 1) / den) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + R * Math.cos(a1); const y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2); const y2 = cy + R * Math.sin(a2);
    const large = 1 / den > 0.5 ? 1 : 0;
    return `M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2}Z`;
  };

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>{label}</p>
      <svg viewBox="0 0 200 185" className="w-44 mx-auto">
        {Array.from({ length: den }, (_, i) => (
          <path key={i} d={makeSlice(i)}
            fill={i < num ? accent + "c0" : "#f1f5f9"}
            stroke={i < num ? accent : "#94a3b8"}
            strokeWidth={i < num ? 2 : 1.5} />
        ))}
        {/* Moon craters for space_mission */}
        {theme === "space_mission" && <>
          <circle cx={cx - 22} cy={cy - 18} r={6} fill="none" stroke="#94a3b8" strokeWidth={1.2} opacity={0.45} />
          <circle cx={cx + 20} cy={cy + 22} r={4} fill="none" stroke="#94a3b8" strokeWidth={1} opacity={0.35} />
          <circle cx={cx - 4} cy={cy + 32} r={5} fill="none" stroke="#94a3b8" strokeWidth={1} opacity={0.35} />
        </>}
        {/* Pizza crust for bakery_math */}
        {theme === "bakery_math" && (
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#92400e" strokeWidth={7} opacity={0.35} />
        )}
      </svg>
    </div>
  );
}

// ── Visual: Balance Scale ─────────────────────────────────────────────────────
// Static illustration — shows equation or weights context, no interaction

function BalanceScaleVisual({ accent, vp }: { accent: string; vp: Record<string, unknown> }) {
  const strVP = (k: string, fb: string) => typeof vp[k] === "string" ? vp[k] as string : fb;

  // Equation display (algebraic items: AR_MS_001, AR_SEC_001)
  const equation = strVP("equation", "");
  if (equation) {
    const [lhs, rhs] = equation.includes("=") ? equation.split("=").map(s => s.trim()) : [equation, "?"];
    // Split LHS by " + " so long expressions stack vertically inside the pan
    const lhsTerms = lhs.split(" + ");
    const multiLine = lhsTerms.length > 1;
    const lineH = 13; // SVG units per text line
    // Pan heights: LHS grows with number of lines; RHS stays compact
    const lhsPanH = multiLine ? lhsTerms.length * lineH + 10 : 28;
    const rhsPanH = 28;
    // Hang both pans at the same y; use the taller one for the rope length
    const ropeH = Math.max(lhsPanH, rhsPanH) + 10;
    const lPanW = multiLine ? 90 : 60;
    const rPanW = 60;
    const cx = 130; const cy = 55; const arm = 82;
    const lx = cx - arm; const rx = cx + arm;
    // Pan tops sit at cy + ropeH; text sits inside each pan
    const lPanTop = cy + ropeH;
    const rPanTop = cy + ropeH;
    const svgH = Math.max(lPanTop + lhsPanH, rPanTop + rhsPanH) + 26;
    // Fulcrum triangle: tip just below beam, base just above tallest pan
    const fulcrumBase = lPanTop - 4;
    // Text y: vertically centred inside each pan (SVG text baseline = ~80% from top)
    const lhsFirstY = lPanTop + Math.floor((lhsPanH - lhsTerms.length * lineH) / 2) + lineH - 1;
    const rhsTextY = rPanTop + Math.floor(rhsPanH / 2) + 5;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Balance scale</p>
        <svg viewBox={`0 0 260 ${svgH}`} className="w-full max-w-xs mx-auto">
          {/* Pole */}
          <line x1={cx} y1={12} x2={cx} y2={cy} stroke="#64748b" strokeWidth={5} strokeLinecap="round" />
          {/* Beam */}
          <line x1={lx} y1={cy} x2={rx} y2={cy} stroke="#334155" strokeWidth={5} strokeLinecap="round" />
          {/* Ropes */}
          <line x1={lx} y1={cy} x2={lx} y2={lPanTop} stroke="#64748b" strokeWidth={2.5} />
          <line x1={rx} y1={cy} x2={rx} y2={rPanTop} stroke="#64748b" strokeWidth={2.5} />
          {/* Pans */}
          <rect x={lx - lPanW / 2} y={lPanTop} width={lPanW} height={lhsPanH} rx={6} fill={accent + "22"} stroke={accent} strokeWidth={2} />
          <rect x={rx - rPanW / 2} y={rPanTop} width={rPanW} height={rhsPanH} rx={6} fill={accent + "22"} stroke={accent} strokeWidth={2} />
          {/* LHS text — stacked lines if multi-term */}
          {multiLine ? (
            <text textAnchor="middle" fontSize={11} fontWeight="bold" fill={accent}>
              {lhsTerms.map((term, i) => (
                <tspan key={i} x={lx} y={lhsFirstY + i * lineH}>
                  {i < lhsTerms.length - 1 ? term + " +" : term}
                </tspan>
              ))}
            </text>
          ) : (
            <text x={lx} y={lhsFirstY} textAnchor="middle" fontSize={13} fontWeight="bold" fill={accent}>{lhs}</text>
          )}
          {/* RHS text */}
          <text x={rx} y={rhsTextY} textAnchor="middle" fontSize={13} fontWeight="bold" fill={accent}>{rhs}</text>
          {/* Fulcrum */}
          <polygon points={`${cx},${cy + 2} ${cx - 13},${fulcrumBase} ${cx + 13},${fulcrumBase}`} fill="#94a3b8" />
          <line x1={cx - 18} y1={fulcrumBase} x2={cx + 18} y2={fulcrumBase} stroke="#64748b" strokeWidth={4} />
        </svg>
        <p className="text-center text-xs text-slate-400 -mt-1">{equation}</p>
      </div>
    );
  }

  // Weight tokens display (RPS_EP_001) — student splits all weights across both pans
  const weights = Array.isArray(vp.weights) ? vp.weights as number[] : [];
  if (weights.length > 0) {
    const cx = 130; const cy = 55; const arm = 80; const panH = 42;
    const lx = cx - arm; const rx = cx + arm;
    const panW = 68;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Balance the scale</p>
        <svg viewBox="0 0 260 150" className="w-full max-w-xs mx-auto">
          {/* Pole */}
          <line x1={cx} y1={10} x2={cx} y2={cy} stroke="#64748b" strokeWidth={5} strokeLinecap="round" />
          {/* Beam — level, both sides equal */}
          <line x1={lx} y1={cy} x2={rx} y2={cy} stroke="#334155" strokeWidth={5} strokeLinecap="round" />
          {/* Ropes */}
          <line x1={lx} y1={cy} x2={lx} y2={cy + panH} stroke="#64748b" strokeWidth={2.5} />
          <line x1={rx} y1={cy} x2={rx} y2={cy + panH} stroke="#64748b" strokeWidth={2.5} />
          {/* Left pan — dashed, empty (student fills it) */}
          <rect x={lx - panW / 2} y={cy + panH} width={panW} height={34} rx={6} fill="#f8fafc" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5,3" />
          <text x={lx} y={cy + panH + 22} textAnchor="middle" fontSize={10} fill="#94a3b8">your choice</text>
          {/* Right pan — dashed, empty (student fills it) */}
          <rect x={rx - panW / 2} y={cy + panH} width={panW} height={34} rx={6} fill="#f8fafc" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5,3" />
          <text x={rx} y={cy + panH + 22} textAnchor="middle" fontSize={10} fill="#94a3b8">your choice</text>
          {/* Fulcrum */}
          <polygon points={`${cx},${cy + 2} ${cx - 13},${cy + 46} ${cx + 13},${cy + 46}`} fill="#94a3b8" />
          <line x1={cx - 18} y1={cy + 46} x2={cx + 18} y2={cy + 46} stroke="#64748b" strokeWidth={4} />
        </svg>
        <div className="flex justify-center gap-2 mt-2">
          {weights.map((w, i) => (
            <div key={i} className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2" style={{ borderColor: accent, color: accent, backgroundColor: accent + "18" }}>{w}</div>
          ))}
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-1">Split these numbers across both sides so they balance</p>
      </div>
    );
  }

  // Calculation chain display (RPS_UP_001)
  const steps = Array.isArray(vp.steps) ? vp.steps as string[] : [];
  if (steps.length > 0) {
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Calculation chain</p>
        <div className="flex flex-col gap-2 py-1">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accent + "22", color: accent }}>{i + 1}</div>
              <div className="flex-1 text-sm font-semibold text-slate-700 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200">{s}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback: plain scale illustration
  const cx = 130; const cy = 64; const arm = 80; const panH = 38;
  const lx = cx - arm; const rx = cx + arm;
  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Balance scale</p>
      <svg viewBox="0 0 260 150" className="w-full max-w-xs mx-auto">
        <line x1={cx} y1={12} x2={cx} y2={cy} stroke="#64748b" strokeWidth={5} strokeLinecap="round" />
        <line x1={lx} y1={cy} x2={rx} y2={cy} stroke="#334155" strokeWidth={5} strokeLinecap="round" />
        <line x1={lx} y1={cy} x2={lx} y2={cy + panH} stroke="#64748b" strokeWidth={2.5} />
        <line x1={rx} y1={cy} x2={rx} y2={cy + panH} stroke="#64748b" strokeWidth={2.5} />
        <rect x={lx - 30} y={cy + panH} width={60} height={26} rx={6} fill={accent + "22"} stroke={accent} strokeWidth={2} />
        <rect x={rx - 30} y={cy + panH} width={60} height={26} rx={6} fill={accent + "22"} stroke={accent} strokeWidth={2} />
        <polygon points={`${cx},${cy + 2} ${cx - 13},${cy + 44} ${cx + 13},${cy + 44}`} fill="#94a3b8" />
        <line x1={cx - 18} y1={cy + 44} x2={cx + 18} y2={cy + 44} stroke="#64748b" strokeWidth={4} />
      </svg>
    </div>
  );
}

// ── Visual: Pattern Builder ───────────────────────────────────────────────────

function PatternBuilderVisual({ taskId, accent, vp, theme }: {
  taskId: string; accent: string; vp?: Record<string, unknown>; theme?: string;
}) {
  // ML_MS_001: multiplication pattern rows
  const patternRows = Array.isArray(vp?.patternRows) ? vp!.patternRows as string[] : null;
  if (patternRows) {
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Pattern</p>
        <div className="flex flex-col gap-1.5 py-1 max-w-[200px] mx-auto">
          {patternRows.map((row, i) => {
            const isLast = i === patternRows.length - 1;
            return (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg border text-sm font-mono font-semibold"
                style={{ borderColor: isLast ? accent : "#e2e8f0", backgroundColor: isLast ? accent + "15" : "#f8fafc", color: isLast ? accent : "#334155" }}>
                {row}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // RPS_MS_001: sequence of numbers
  const sequence = Array.isArray(vp?.sequence) ? vp!.sequence : null;
  if (sequence) {
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Sequence</p>
        <div className="flex items-center justify-center gap-2 py-2 flex-wrap">
          {sequence.map((v, i) => (
            <div key={i} className={`px-3 py-2 rounded-lg border-2 text-base font-bold ${v === "?" ? "border-dashed" : ""}`}
              style={{ borderColor: accent, backgroundColor: v === "?" ? "transparent" : accent + "18", color: v === "?" ? "#94a3b8" : accent }}>
              {String(v)}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-1">What comes next?</p>
      </div>
    );
  }

  // Theme-specific sequence from visualData (PA_EP_001 and similar)
  const sequences = vp?.sequences as Record<string, { shape: string; color: string }[]> | undefined;
  const themeSeq = theme && sequences?.[theme];

  const S = 34; const gap = 5;

  const renderShape = (shape: string, color: string, x: number, y: number) => {
    const cx = x + S / 2; const cy = y + S / 2; const r = S / 2 - 2;
    if (shape === "circle") return <circle cx={cx} cy={cy} r={r} fill={color + "b0"} stroke={color} strokeWidth={2} />;
    if (shape === "triangle") return <polygon points={`${cx},${y + 3} ${x + S - 3},${y + S - 3} ${x + 3},${y + S - 3}`} fill={color + "b0"} stroke={color} strokeWidth={2} />;
    if (shape === "diamond") return <polygon points={`${cx},${y + 2} ${x + S - 2},${cy} ${cx},${y + S - 2} ${x + 2},${cy}`} fill={color + "b0"} stroke={color} strokeWidth={2} />;
    if (shape === "star") {
      const ir = r * 0.42;
      const pts = Array.from({ length: 10 }, (_, k) => {
        const a = (k * Math.PI) / 5 - Math.PI / 2;
        const rad = k % 2 === 0 ? r : ir;
        return `${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`;
      }).join(" ");
      return <polygon points={pts} fill={color + "b0"} stroke={color} strokeWidth={2} />;
    }
    if (shape === "rocket") {
      const bH = S * 0.55; const cH = S * 0.25; const bTop = y + cH + 2;
      return (
        <g>
          <polygon points={`${cx},${y + 2} ${x + 4},${bTop + 4} ${x + S - 4},${bTop + 4}`} fill={color + "b0"} stroke={color} strokeWidth={1.5} />
          <rect x={x + 6} y={bTop} width={S - 12} height={bH} rx={2} fill={color + "b0"} stroke={color} strokeWidth={1.5} />
          <polygon points={`${x + 6},${bTop + bH - 4} ${x},${y + S - 2} ${x + 6},${y + S - 2}`} fill={color} opacity={0.5} />
          <polygon points={`${x + S - 6},${bTop + bH - 4} ${x + S},${y + S - 2} ${x + S - 6},${y + S - 2}`} fill={color} opacity={0.5} />
        </g>
      );
    }
    return <rect x={x + 2} y={y + 2} width={S - 4} height={S - 4} rx={5} fill={color + "b0"} stroke={color} strokeWidth={2} />;
  };

  if (themeSeq) {
    const displayRow = [...themeSeq, { shape: "?", color: accent }];
    const W = displayRow.length * (S + gap) + 4; const H = S + 10;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>What comes next?</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto">
          {displayRow.map((item, ci) => {
            const isLast = ci === displayRow.length - 1;
            return (
              <g key={ci} transform={`translate(${2 + ci * (S + gap)}, 2)`}>
                {isLast
                  ? <rect x={0} y={0} width={S} height={S} rx={6} fill="#f1f5f9" stroke={accent} strokeWidth={2} strokeDasharray="5,4" />
                  : renderShape(item.shape, item.color, 0, 0)}
                {isLast && <text x={S / 2} y={S / 2 + 5} textAnchor="middle" fontSize={16} fill={accent} fontWeight="bold">?</text>}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Fallback: seeded random pattern (for tasks without explicit sequences)
  const rng = seededRand(strSeed(taskId));
  const SHAPES = ["circle", "square", "triangle", "diamond"];
  const COLORS = [accent, "#0ea5e9", "#10b981", "#f59e0b"];
  const patternLen = 2 + Math.floor(rng() * 2);
  const unit: { shape: string; color: string }[] = Array.from({ length: patternLen }, () => ({
    shape: SHAPES[Math.floor(rng() * 3)],
    color: COLORS[Math.floor(rng() * COLORS.length)],
  }));
  const displayRow = [...unit, ...unit, { shape: unit[0].shape, color: unit[0].color }];
  const W = displayRow.length * (S + gap) + 4; const H = S + 10;

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>What comes next?</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto">
        {displayRow.map((item, ci) => {
          const isLast = ci === displayRow.length - 1;
          return (
            <g key={ci} transform={`translate(${2 + ci * (S + gap)}, 2)`}>
              {isLast
                ? <rect x={0} y={0} width={S} height={S} rx={6} fill="#f1f5f9" stroke={accent} strokeWidth={2} strokeDasharray="5,4" />
                : renderShape(item.shape, item.color, 0, 0)}
              {isLast && <text x={S / 2} y={S / 2 + 5} textAnchor="middle" fontSize={16} fill={accent} fontWeight="bold">?</text>}
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
  const cx = 90; const cy = 90; const R = 78;
  const toRad = (deg: number) => deg * Math.PI / 180;
  const hDeg = ((hour % 12) + minute / 60) / 12 * 360 - 90;
  const mDeg = minute / 60 * 360 - 90;
  const hTip = { x: cx + 42 * Math.cos(toRad(hDeg)), y: cy + 42 * Math.sin(toRad(hDeg)) };
  const mTip = { x: cx + 60 * Math.cos(toRad(mDeg)), y: cy + 60 * Math.sin(toRad(mDeg)) };
  const hStr = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const mStr = String(minute).padStart(2, "0");

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Clock</p>
      <svg viewBox="0 0 180 180" className="w-40 mx-auto">
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
        <line x1={cx} y1={cy} x2={hTip.x} y2={hTip.y} stroke="#1e293b" strokeWidth={6} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={mTip.x} y2={mTip.y} stroke="#475569" strokeWidth={4} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill={accent} />
      </svg>
      <p className="text-center text-sm font-bold text-slate-600 -mt-1">{hStr}:{mStr}</p>
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
  const total = coins.reduce((s, c) => s + c.cents, 0);
  const totalStr = total >= 100 ? `$${(total / 100).toFixed(2)}` : `${total}¢`;

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Count the coins</p>
      <svg viewBox="0 0 280 90" className="w-full max-w-xs mx-auto">
        {coins.map((c, i) => {
          const x = 24 + i * Math.floor(256 / count);
          const y = 42 + (i % 2 === 0 ? -8 : 8);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={c.r} fill={c.color + "40"} stroke={c.color} strokeWidth={2} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fill="#1e293b" fontWeight="700">{c.label}</text>
            </g>
          );
        })}
      </svg>
      <p className="text-center text-sm font-bold" style={{ color: accent }}>Total: {totalStr}</p>
    </div>
  );
}

// ── Visual: Matching Task ─────────────────────────────────────────────────────
// SVG-based drag-to-draw line connections

function MatchingTaskVisual({ taskId, accent, vp }: {
  taskId: string; accent: string; vp?: Record<string, unknown>;
}) {
  // PS_UP_001: logic clues — with optional colored rocket illustrations
  const clues = Array.isArray(vp?.clues) ? vp!.clues as string[] : null;
  const rockets = Array.isArray(vp?.rockets) ? vp!.rockets as { label: string; color: string }[] : null;
  if (clues) {
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Logic clues</p>
        {rockets && (
          <div className="flex justify-center gap-4 mb-3">
            {rockets.map(({ label, color }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <svg viewBox="0 0 32 56" width={32} height={56}>
                  {/* Fins */}
                  <polygon points="4,44 10,32 10,48" fill={color} opacity="0.7" />
                  <polygon points="28,44 22,32 22,48" fill={color} opacity="0.7" />
                  {/* Body */}
                  <rect x="9" y="20" width="14" height="28" rx="2" fill={color} />
                  {/* Nose cone */}
                  <path d="M9,20 Q16,2 23,20 Z" fill={color} />
                  {/* Window */}
                  <circle cx="16" cy="28" r="4" fill="white" opacity="0.85" />
                  <circle cx="16" cy="28" r="2.5" fill={color} opacity="0.5" />
                  {/* Flame */}
                  <ellipse cx="16" cy="50" rx="4" ry="5" fill="#fbbf24" opacity="0.9" />
                  <ellipse cx="16" cy="51" rx="2.5" ry="3.5" fill="#f97316" opacity="0.9" />
                </svg>
                <span className="text-xs font-bold" style={{ color }}>{label}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1.5 py-1">
          {clues.map((clue, i) => (
            <div key={i} className="flex gap-2 items-start px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: accent + "25", color: accent }}>{i + 1}</span>
              <span className="text-xs text-slate-700">{clue}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // PA_UP_001: input/output function table
  const tableRows = Array.isArray(vp?.tableRows) ? vp!.tableRows as [string | number, string | number][] : null;
  if (tableRows) {
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Function table</p>
        <div className="overflow-hidden rounded-lg border border-slate-200 max-w-[180px] mx-auto">
          <table className="w-full border-collapse text-center text-sm">
            <thead>
              <tr style={{ backgroundColor: accent + "20" }}>
                <th className="py-1.5 px-4 border-r border-slate-200 font-bold text-xs" style={{ color: accent }}>In</th>
                <th className="py-1.5 px-4 font-bold text-xs" style={{ color: accent }}>Out</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map(([inp, out], i) => {
                const prevRow = tableRows[i - 1];
                const isReverseRow = String(inp) === "?" && String(out) !== "?";
                const prevWasForward = prevRow && !(String(prevRow[0]) === "?" && String(prevRow[1]) !== "?");
                const showDivider = isReverseRow && prevWasForward;
                return (
                  <tr key={i} className={`border-t ${showDivider ? "border-t-2" : "border-slate-100"}`} style={showDivider ? { borderTopColor: accent + "60" } : {}}>
                    <td className="py-1.5 border-r border-slate-200 font-semibold" style={{ color: String(inp) === "?" ? "#94a3b8" : "#334155" }}>{inp}</td>
                    <td className="py-1.5 font-semibold" style={{ color: String(out) === "?" ? "#94a3b8" : "#1e293b" }}>{out}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Default: static pairs illustration
  const rng = seededRand(strSeed(taskId));
  const PAIRS = [
    ["2 × 3", "6"], ["4 + 5", "9"], ["10 − 4", "6"],
    ["3 × 4", "12"], ["15 − 8", "7"], ["6 + 7", "13"],
  ];
  const pairs = PAIRS.sort(() => rng() - 0.5).slice(0, 4);
  const ACCENT_COLORS = [accent, "#0ea5e9", "#10b981", "#f59e0b"];
  const itemH = 36; const itemGap = 8; const topPad = 6;
  const leftX = 85; const rightX = 175; const W = 270;
  const totalH = topPad * 2 + pairs.length * (itemH + itemGap);
  const getCY = (i: number) => topPad + i * (itemH + itemGap) + itemH / 2;

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Matching pairs</p>
      <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full max-w-sm mx-auto">
        {pairs.map((p, i) => {
          const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
          const cy = getCY(i);
          return (
            <g key={i}>
              <rect x={0} y={topPad + i * (itemH + itemGap)} width={leftX} height={itemH} rx={8} fill={color + "18"} stroke={color} strokeWidth={1.5} />
              <text x={leftX / 2} y={cy + 5} textAnchor="middle" fontSize={13} fill="#1e293b" fontWeight="600">{p[0]}</text>
              <line x1={leftX + 2} y1={cy} x2={rightX - 2} y2={cy} stroke={color} strokeWidth={2} strokeDasharray="5,3" opacity={0.6} />
              <circle cx={leftX + 2} cy={cy} r={4} fill={color} />
              <circle cx={rightX - 2} cy={cy} r={4} fill={color} />
              <rect x={rightX} y={topPad + i * (itemH + itemGap)} width={W - rightX} height={itemH} rx={8} fill={color + "18"} stroke={color} strokeWidth={1.5} />
              <text x={rightX + (W - rightX) / 2} y={cy + 5} textAnchor="middle" fontSize={13} fill="#1e293b" fontWeight="600">{p[1]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Visual: Sorting Task ──────────────────────────────────────────────────────

function SortingTaskVisual({ taskId, accent, vp, theme }: {
  taskId: string; accent: string; vp?: Record<string, unknown>; theme?: string;
}) {
  // GS_EP_001: actual SVG shapes to sort
  const shapes = Array.isArray(vp?.shapes) ? vp!.shapes as { type: string; color: string }[] : null;
  if (shapes) {
    const S = 38; const gap = 8; const cols = 4;
    const rows = Math.ceil(shapes.length / cols);
    const W = cols * (S + gap) + gap; const H = rows * (S + gap) + gap;
    const renderShape = (type: string, color: string, x: number, y: number) => {
      const cx = x + S / 2; const cy = y + S / 2; const r = S / 2 - 3;
      if (type === "circle") return <circle cx={cx} cy={cy} r={r} fill={color + "99"} stroke={color} strokeWidth={2.5} />;
      if (type === "triangle") return <polygon points={`${cx},${y + 3} ${x + S - 3},${y + S - 3} ${x + 3},${y + S - 3}`} fill={color + "99"} stroke={color} strokeWidth={2.5} />;
      return <rect x={x + 3} y={y + 3} width={S - 6} height={S - 6} rx={4} fill={color + "99"} stroke={color} strokeWidth={2.5} />;
    };
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Sort these shapes into groups</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto my-1">
          {shapes.map((s, i) => {
            const col = i % cols; const row = Math.floor(i / cols);
            const x = gap + col * (S + gap); const y = gap + row * (S + gap);
            return <g key={i}>{renderShape(s.type, s.color, x, y)}</g>;
          })}
        </svg>
      </div>
    );
  }

  // PS_MS_001: budget categories
  const budgetItems = Array.isArray(vp?.budgetItems) ? vp!.budgetItems as { label: string; amount: number; category: string }[] : null;
  if (budgetItems) {
    const categories = [...new Set(budgetItems.map(b => b.category))];
    const catColors: Record<string, string> = {};
    const PALETTE = [accent, "#0ea5e9", "#10b981", "#f59e0b"];
    categories.forEach((c, i) => { catColors[c] = PALETTE[i % PALETTE.length]; });

    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Budget breakdown</p>
        <div className="flex flex-col gap-1.5 py-1">
          {budgetItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-2 py-1 rounded-lg border text-xs"
              style={{ borderColor: catColors[item.category] + "60", backgroundColor: catColors[item.category] + "10" }}>
              <span className="font-semibold text-slate-700">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold" style={{ color: catColors[item.category] }}>${item.amount}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: catColors[item.category] + "25", color: catColors[item.category] }}>{item.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: static sorted groups illustration
  const rng = seededRand(strSeed(taskId));
  const items = Array.from({ length: 6 }, () => Math.floor(rng() * 50) + 1);
  const threshold = 25;
  const under = items.filter(n => n < threshold);
  const over = items.filter(n => n >= threshold);

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Sort by size</p>
      <div className="grid grid-cols-2 gap-3 py-1">
        {([["under", under, `< ${threshold}`], ["over", over, `≥ ${threshold}`]] as [string, number[], string][]).map(([key, nums, label]) => (
          <div key={key} className="rounded-lg border-2 p-2" style={{ borderColor: accent }}>
            <p className="text-xs font-bold mb-1.5" style={{ color: accent }}>{label}</p>
            <div className="flex flex-wrap gap-1">
              {nums.map((n, i) => (
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

function TallyMarksVisual({ count, accent, theme }: { count: number; accent: string; theme?: string }) {
  count = Math.min(count, 25);

  const THEME_LABEL: Record<string, string> = {
    space_mission: "Count the stars",
    city_builder: "Count the sticks",
    bakery_math: "Count the cookies",
    robot_factory: "Count the bolts",
    treasure_builder: "Count the gems",
  };
  const label = THEME_LABEL[theme ?? ""] ?? "Count the marks";

  // city_builder keeps classic tally marks (sticks)
  if (!theme || theme === "city_builder") {
    const groups = Math.floor(count / 5);
    const rem = count % 5;
    const groupW = 56; const groupH = 50; const totalW = (groups + (rem > 0 ? 1 : 0)) * groupW + 20;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>{label}</p>
        <svg viewBox={`0 0 ${totalW} ${groupH + 30}`} className="w-full max-w-xs mx-auto">
          {Array.from({ length: groups }, (_, g) => {
            const x = 10 + g * groupW;
            return (
              <g key={g}>
                {[0, 1, 2, 3].map(i => <line key={i} x1={x + 10 + i * 10} y1={8} x2={x + 10 + i * 10} y2={groupH - 8} stroke="#334155" strokeWidth={3} strokeLinecap="round" />)}
                <line x1={x + 4} y1={groupH - 10} x2={x + 44} y2={8} stroke="#334155" strokeWidth={3} strokeLinecap="round" />
              </g>
            );
          })}
          {Array.from({ length: rem }, (_, i) => {
            const x = 10 + groups * groupW + 10 + i * 10;
            return <line key={i} x1={x} y1={8} x2={x} y2={groupH - 8} stroke="#334155" strokeWidth={3} strokeLinecap="round" />;
          })}
          <text x={totalW / 2} y={groupH + 28} textAnchor="middle" fontSize={11} fill="#94a3b8">{label} ↑</text>
        </svg>
      </div>
    );
  }

  // All other themes: grid of themed shapes
  const cols = Math.min(count, 6);
  const rows = Math.ceil(count / cols);
  const sz = 30; const pad = 10;
  const svgW = cols * (sz + pad) + pad;
  const svgH = rows * (sz + pad) + pad + 22;

  function renderShape(i: number) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = pad + col * (sz + pad) + sz / 2;
    const cy = pad + row * (sz + pad) + sz / 2;
    const r = sz * 0.42;

    if (theme === "space_mission") {
      const ir = r * 0.42;
      const pts = Array.from({ length: 10 }, (_, k) => {
        const a = (k * Math.PI) / 5 - Math.PI / 2;
        const rad = k % 2 === 0 ? r : ir;
        return `${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`;
      }).join(" ");
      return <polygon key={i} points={pts} fill={accent + "d0"} stroke={accent} strokeWidth={1.5} />;
    }
    if (theme === "bakery_math") {
      return (
        <g key={i}>
          <circle cx={cx} cy={cy} r={r} fill="#d97706cc" stroke="#92400e" strokeWidth={1.5} />
          {[[-r*0.3,-r*0.3],[r*0.25,-r*0.1],[-r*0.1,r*0.3],[r*0.3,r*0.3]].map(([dx,dy],j)=>
            <circle key={j} cx={cx+dx} cy={cy+dy} r={r*0.12} fill="#78350f" />
          )}
        </g>
      );
    }
    if (theme === "robot_factory") {
      const pts = Array.from({ length: 6 }, (_, k) => {
        const a = (k * Math.PI) / 3 - Math.PI / 6;
        return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
      }).join(" ");
      return <polygon key={i} points={pts} fill={accent + "d0"} stroke={accent} strokeWidth={1.5} />;
    }
    if (theme === "treasure_builder") {
      const pts = `${cx},${cy - r} ${cx + r * 0.65},${cy} ${cx},${cy + r} ${cx - r * 0.65},${cy}`;
      return (
        <g key={i}>
          <polygon points={pts} fill="#FFD700" stroke="#B8860B" strokeWidth={1.5} />
          <polygon points={`${cx},${cy - r * 0.5} ${cx + r * 0.4},${cy - r * 0.1} ${cx},${cy + r * 0.3} ${cx - r * 0.4},${cy - r * 0.1}`} fill="#FFF176" opacity={0.4} />
        </g>
      );
    }
    return <circle key={i} cx={cx} cy={cy} r={r} fill={accent + "d0"} stroke={accent} strokeWidth={1.5} />;
  }

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>{label}</p>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-xs mx-auto">
        {Array.from({ length: count }, (_, i) => renderShape(i))}
        <text x={svgW / 2} y={svgH - 4} textAnchor="middle" fontSize={11} fill="#94a3b8">{label} ↑</text>
      </svg>
    </div>
  );
}

// ── Visual: Number Bond ───────────────────────────────────────────────────────

function NumberBondVisual({ total, part1, part2, accent }: {
  total: number; part1?: number; part2?: number; accent: string;
}) {
  const additionMode = part1 !== undefined && part2 !== undefined;
  const topLabel = additionMode ? "?" : String(total);
  const topIsFilled = !additionMode;
  const leftLabel = additionMode ? String(part1) : "?";
  const rightLabel = additionMode ? String(part2) : "?";

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Number bond</p>
      <svg viewBox="0 0 200 145" className="w-48 mx-auto">
        <circle cx={100} cy={35} r={28}
          fill={topIsFilled ? accent + "20" : "#f1f5f9"}
          stroke={topIsFilled ? accent : "#94a3b8"}
          strokeWidth={2}
          strokeDasharray={topIsFilled ? "none" : "5,3"}
        />
        <text x={100} y={41} textAnchor="middle" fontSize={topLabel.length > 3 ? 13 : 18}
          fill={topIsFilled ? "#1e293b" : "#94a3b8"} fontWeight="bold">
          {topLabel}
        </text>
        <line x1={78} y1={58} x2={55} y2={98} stroke="#94a3b8" strokeWidth={2.5} />
        <line x1={122} y1={58} x2={145} y2={98} stroke="#94a3b8" strokeWidth={2.5} />
        <circle cx={50} cy={115} r={26}
          fill={additionMode ? accent + "20" : "#f1f5f9"}
          stroke={additionMode ? accent : "#94a3b8"}
          strokeWidth={2}
          strokeDasharray={additionMode ? "none" : "5,3"}
        />
        <text x={50} y={121} textAnchor="middle" fontSize={leftLabel.length > 3 ? 11 : 18}
          fill={additionMode ? "#1e293b" : "#94a3b8"} fontWeight="bold">
          {leftLabel}
        </text>
        <circle cx={150} cy={115} r={26}
          fill={additionMode ? accent + "20" : "#f1f5f9"}
          stroke={additionMode ? accent : "#94a3b8"}
          strokeWidth={2}
          strokeDasharray={additionMode ? "none" : "5,3"}
        />
        <text x={150} y={121} textAnchor="middle" fontSize={rightLabel.length > 3 ? 11 : 18}
          fill={additionMode ? "#1e293b" : "#94a3b8"} fontWeight="bold">
          {rightLabel}
        </text>
      </svg>
      <p className="text-[10px] text-center text-slate-400 mt-1">
        {additionMode ? `${part1} + ${part2} = ?` : `${total} = ? + ?`}
      </p>
    </div>
  );
}

// ── Visual: Bar Model ─────────────────────────────────────────────────────────

function BarModelVisual({ total, accent, vp, theme }: {
  total: number; accent: string; vp?: Record<string, unknown>; theme?: string;
}) {
  const groups = typeof vp?.groups === "number" ? vp!.groups as number : null;
  const vpTotal = typeof vp?.total === "number" ? vp!.total as number : total;

  // Comparison bars (ME_EP_001): two vertical shapes of different heights
  const barA = typeof vp?.barA === "number" ? vp!.barA as number : null;
  const barB = typeof vp?.barB === "number" ? vp!.barB as number : null;
  if (barA !== null && barB !== null) {
    const COMP_LABELS: Record<string, [string, string]> = {
      space_mission:    ["Rocket A",   "Rocket B"  ],
      city_builder:     ["Building A", "Building B"],
      bakery_math:      ["Loaf A",     "Loaf B"    ],
      robot_factory:    ["Robot A",    "Robot B"   ],
      treasure_builder: ["Chest A",    "Chest B"   ],
    };
    const [themeLA, themeLB] = COMP_LABELS[theme ?? ""] ?? ["A", "B"];
    const maxH = 90; const cbW = 44; const W = 220; const pad = 30;
    const baseline = 112;
    const hA = maxH * (barA / Math.max(barA, barB));
    const hB = maxH * (barB / Math.max(barA, barB));
    const coneH = 14; const finW = 8; const finH = 10;
    const xA = pad; const xB = W - pad - cbW;
    const renderItem = (x: number, h: number, col: string, strokeCol: string, lbl: string) => {
      if (theme === "space_mission") {
        const bodyTop = baseline - h;
        return (
          <g key={lbl}>
            <polygon points={`${x + cbW / 2},${bodyTop - coneH} ${x},${bodyTop + 4} ${x + cbW},${bodyTop + 4}`} fill={col} stroke={strokeCol} strokeWidth={1.5} />
            <rect x={x} y={bodyTop} width={cbW} height={h - finH} rx={3} fill={col} stroke={strokeCol} strokeWidth={1.5} />
            <polygon points={`${x},${baseline - finH} ${x - finW},${baseline} ${x},${baseline}`} fill={strokeCol} opacity={0.7} />
            <polygon points={`${x + cbW},${baseline - finH} ${x + cbW + finW},${baseline} ${x + cbW},${baseline}`} fill={strokeCol} opacity={0.7} />
            <text x={x + cbW / 2} y={baseline + 16} textAnchor="middle" fontSize={11} fill="#64748b" fontWeight="bold">{lbl}</text>
          </g>
        );
      }
      return (
        <g key={lbl}>
          <rect x={x} y={baseline - h} width={cbW} height={h} rx={4} fill={col} stroke={strokeCol} strokeWidth={2} />
          <text x={x + cbW / 2} y={baseline + 16} textAnchor="middle" fontSize={11} fill="#64748b" fontWeight="bold">{lbl}</text>
        </g>
      );
    };
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Which is taller?</p>
        <svg viewBox={`0 0 ${W} 138`} className="w-full max-w-xs mx-auto">
          {renderItem(xA, hA, accent + "80", accent, themeLA)}
          {renderItem(xB, hB, "#94a3b880", "#64748b", themeLB)}
          <line x1={pad - 4} y1={baseline} x2={W - pad + 4} y2={baseline} stroke="#e2e8f0" strokeWidth={1.5} />
        </svg>
      </div>
    );
  }

  // Multiplication / unit-cost (MT_MS_001): N equal bars each labeled with unit cost
  const unitCost = typeof vp?.unitCost === "number" ? vp!.unitCost as number : null;
  if (unitCost !== null && groups) {
    const ucW = 260; const ucH = 44; const ucPad = 10;
    const ucCell = (ucW - ucPad * 2) / groups;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Equal groups</p>
        <svg viewBox={`0 0 ${ucW} ${ucH + 52}`} className="w-full max-w-xs mx-auto">
          <text x={ucW / 2} y={10} textAnchor="middle" fontSize={12} fill="#475569" fontWeight="bold">{groups} × ${unitCost.toLocaleString()}</text>
          <line x1={ucPad} y1={14} x2={ucW - ucPad} y2={14} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={ucPad} y1={10} x2={ucPad} y2={18} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={ucW - ucPad} y1={10} x2={ucW - ucPad} y2={18} stroke="#94a3b8" strokeWidth={1.5} />
          {Array.from({ length: groups }, (_, i) => (
            <g key={i}>
              <rect x={ucPad + i * ucCell} y={20} width={ucCell - 1} height={ucH}
                fill={accent + "18"} stroke={accent} strokeWidth={1.5} />
              <text x={ucPad + i * ucCell + ucCell / 2} y={20 + ucH / 2 + 5}
                textAnchor="middle" fontSize={10} fill={accent} fontWeight="bold">${unitCost.toLocaleString()}</text>
            </g>
          ))}
          <text x={ucW / 2} y={ucH + 46} textAnchor="middle" fontSize={11} fill="#94a3b8">
            {groups} × ${unitCost.toLocaleString()} = ?
          </text>
        </svg>
      </div>
    );
  }

  // Proportional / rate context (NS_SEC_001): totalDays bar with queryDays highlighted
  const totalDays = typeof vp?.totalDays === "number" ? vp!.totalDays as number : null;
  const queryDays = typeof vp?.queryDays === "number" ? vp!.queryDays as number : null;
  if (totalDays !== null && queryDays !== null) {
    const distLabels = vp?.distLabels as Record<string, string> | undefined;
    const distLabel = distLabels?.[theme] ?? (typeof vp?.distLabel === "string" ? vp!.distLabel as string : "");
    const prW = 260; const prH = 44; const prPad = 10;
    const segW = (prW - prPad * 2) / totalDays;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Proportional reasoning</p>
        <svg viewBox={`0 0 ${prW} ${prH + 60}`} className="w-full max-w-xs mx-auto">
          <text x={prW / 2} y={10} textAnchor="middle" fontSize={11} fill="#475569" fontWeight="bold">{totalDays} days = {distLabel}</text>
          <line x1={prPad} y1={14} x2={prW - prPad} y2={14} stroke="#94a3b8" strokeWidth={1.5} />
          {Array.from({ length: totalDays }, (_, i) => (
            <rect key={i} x={prPad + i * segW} y={20} width={segW - 1} height={prH}
              fill={i < queryDays ? accent + "50" : "#f1f5f9"}
              stroke={i < queryDays ? accent : "#94a3b8"} strokeWidth={1.5} />
          ))}
          <text x={prPad + queryDays * segW / 2} y={20 + prH / 2 + 5}
            textAnchor="middle" fontSize={12} fill={accent} fontWeight="bold">{queryDays}d</text>
          <text x={prPad + (queryDays + (totalDays - queryDays) / 2) * segW} y={20 + prH / 2 + 5}
            textAnchor="middle" fontSize={11} fill="#94a3b8" fontWeight="bold">{totalDays - queryDays}d</text>
          <text x={prW / 2} y={prH + 46} textAnchor="middle" fontSize={11} fill="#94a3b8">
            Find quantity for {queryDays} of {totalDays} days
          </text>
        </svg>
      </div>
    );
  }

  // Division context: show total bar split into N equal groups each labeled "?"
  if (groups) {
    const W = 260; const H = 44; const PAD = 10;
    const barW = W - PAD * 2;
    const cellW = barW / groups;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Equal groups</p>
        <svg viewBox={`0 0 ${W} ${H + 52}`} className="w-full max-w-xs mx-auto">
          {/* Total label above */}
          <text x={W / 2} y={10} textAnchor="middle" fontSize={13} fill="#475569" fontWeight="bold">{vpTotal.toLocaleString()}</text>
          <line x1={PAD} y1={14} x2={W - PAD} y2={14} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={PAD} y1={10} x2={PAD} y2={18} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={W - PAD} y1={10} x2={W - PAD} y2={18} stroke="#94a3b8" strokeWidth={1.5} />
          {/* Equal group cells */}
          {Array.from({ length: groups }, (_, i) => (
            <g key={i}>
              <rect x={PAD + i * cellW} y={20} width={cellW - 1} height={H} rx={i === 0 ? 5 : 0}
                fill={accent + "18"} stroke={accent} strokeWidth={1.5} />
              <text x={PAD + i * cellW + cellW / 2} y={20 + H / 2 + 6}
                textAnchor="middle" fontSize={16} fill="#94a3b8" fontWeight="bold">?</text>
            </g>
          ))}
          {/* Rounded right cap */}
          <rect x={PAD + (groups - 1) * cellW} y={20} width={cellW} height={H} rx={0}
            fill="none" stroke="none" />
          <text x={W / 2} y={H + 46} textAnchor="middle" fontSize={11} fill="#94a3b8">
            {vpTotal.toLocaleString()} ÷ {groups} = ?
          </text>
        </svg>
      </div>
    );
  }

  // Default part-whole bar model
  const safe = total;
  const part = Math.round(safe * 0.6);
  const W = 260; const H = 42; const ratio = part / safe;

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Bar model</p>
      <svg viewBox={`0 0 ${W} ${H + 60}`} className="w-full max-w-xs mx-auto">
        <rect x={10} y={10} width={W - 20} height={H} rx={5} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={2} />
        <rect x={10} y={10} width={(W - 20) * ratio} height={H} rx={5} fill={accent + "80"} />
        <line x1={10 + (W - 20) * ratio} y1={10} x2={10 + (W - 20) * ratio} y2={10 + H} stroke="white" strokeWidth={2} />
        <text x={10 + (W - 20) * ratio / 2} y={10 + H / 2 + 5} textAnchor="middle" fontSize={14} fill="#1e293b" fontWeight="bold">{part}</text>
        <text x={10 + (W - 20) * ratio + (W - 20) * (1 - ratio) / 2} y={10 + H / 2 + 5} textAnchor="middle" fontSize={18} fill="#94a3b8" fontWeight="bold">?</text>
        <line x1={10} y1={H + 22} x2={W - 10} y2={H + 22} stroke="#94a3b8" strokeWidth={1.5} />
        <line x1={10} y1={H + 16} x2={10} y2={H + 28} stroke="#94a3b8" strokeWidth={1.5} />
        <line x1={W - 10} y1={H + 16} x2={W - 10} y2={H + 28} stroke="#94a3b8" strokeWidth={1.5} />
        <text x={W / 2} y={H + 42} textAnchor="middle" fontSize={12} fill="#94a3b8">Find the missing part ↑</text>
      </svg>
    </div>
  );
}

// ── Visual: Area Model ────────────────────────────────────────────────────────

function AreaModelVisual({ cols, rows, accent, vp }: { cols: number; rows: number; accent: string; vp?: Record<string, unknown> }) {
  // Labeled 2×2 decomposition (MT_UP_001: colLabels/rowLabels, MT_SEC_001: terms1/terms2)
  const colLabels = (Array.isArray(vp?.colLabels) ? vp!.colLabels : Array.isArray(vp?.terms1) ? vp!.terms1 : null) as string[] | null;
  const rowLabels = (Array.isArray(vp?.rowLabels) ? vp!.rowLabels : Array.isArray(vp?.terms2) ? vp!.terms2 : null) as string[] | null;
  if (colLabels && rowLabels && colLabels.length >= 2 && rowLabels.length >= 2) {
    const cW = 80; const rH = 50; const lblW = 36; const lblH = 24; const pad = 6;
    const W = lblW + 2 * cW + 2 * pad; const H = lblH + 2 * rH + 2 * pad;
    const fills = [[accent + "60", accent + "30"], [accent + "30", accent + "15"]];
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Area model</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto">
          {colLabels.slice(0, 2).map((cl, ci) => (
            <text key={ci} x={lblW + ci * cW + cW / 2} y={16} textAnchor="middle" fontSize={12} fill={accent} fontWeight="bold">{cl}</text>
          ))}
          {rowLabels.slice(0, 2).map((rl, ri) => (
            <text key={ri} x={lblW / 2} y={lblH + ri * rH + rH / 2 + 5} textAnchor="middle" fontSize={12} fill={accent} fontWeight="bold">{rl}</text>
          ))}
          {rowLabels.slice(0, 2).map((rl, ri) =>
            colLabels.slice(0, 2).map((cl, ci) => (
              <g key={`${ri}-${ci}`}>
                <rect x={lblW + ci * cW} y={lblH + ri * rH} width={cW - 1} height={rH - 1} rx={3}
                  fill={fills[ri][ci]} stroke={accent} strokeWidth={1.5} />
                <text x={lblW + ci * cW + cW / 2} y={lblH + ri * rH + rH / 2 + 5}
                  textAnchor="middle" fontSize={10} fill="#1e293b" fontWeight="600">{cl} × {rl}</text>
              </g>
            ))
          )}
        </svg>
      </div>
    );
  }

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

// ── Visual: Linear Programming ───────────────────────────────────────────────

function LinearProgramVisual({ accent }: { accent: string }) {
  // Constraints: x + y ≤ 10 (line A) and y ≥ 2x (line B), first quadrant
  // Feasible region vertices: (0,0), (0,10), (10/3, 20/3)
  const OX = 40; const OY = 175; const SC = 15; // origin SVG coords, scale px/unit
  const sx = (x: number) => OX + x * SC;
  const sy = (y: number) => OY - y * SC;
  const MAX = 12;

  const gridVals = [0, 2, 4, 6, 8, 10];
  const ix = 10 / 3; const iy = 20 / 3; // intersection point

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Feasible region</p>
      <svg viewBox="0 0 260 200" className="w-full max-w-xs mx-auto">
        {/* Grid */}
        {gridVals.map(v => (
          <g key={v}>
            <line x1={sx(0)} y1={sy(v)} x2={sx(MAX)} y2={sy(v)} stroke="#e2e8f0" strokeWidth={1} />
            <line x1={sx(v)} y1={sy(0)} x2={sx(v)} y2={sy(MAX)} stroke="#e2e8f0" strokeWidth={1} />
          </g>
        ))}
        {/* Feasible region polygon: (0,0), (0,10), (10/3,20/3) */}
        <polygon
          points={`${sx(0)},${sy(0)} ${sx(0)},${sy(10)} ${sx(ix)},${sy(iy)}`}
          fill={accent + "35"} stroke="none"
        />
        {/* Line A: x + y = 10 */}
        <line x1={sx(0)} y1={sy(10)} x2={sx(10)} y2={sy(0)} stroke={accent} strokeWidth={2} />
        <text x={sx(6)} y={sy(4) - 6} fontSize={10} fill={accent} fontWeight="700">x+y=10</text>
        {/* Line B: y = 2x */}
        <line x1={sx(0)} y1={sy(0)} x2={sx(5)} y2={sy(10)} stroke="#f59e0b" strokeWidth={2} />
        <text x={sx(2.2)} y={sy(5) - 6} fontSize={10} fill="#b45309" fontWeight="700">y=2x</text>
        {/* Axes */}
        <line x1={sx(0)} y1={sy(0)} x2={sx(MAX)} y2={sy(0)} stroke="#334155" strokeWidth={2} />
        <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(MAX)} stroke="#334155" strokeWidth={2} />
        <polygon points={`${sx(0)},${sy(MAX) - 6} ${sx(0) - 4},${sy(MAX) + 4} ${sx(0) + 4},${sy(MAX) + 4}`} fill="#334155" />
        <polygon points={`${sx(MAX) + 6},${sy(0)} ${sx(MAX) - 4},${sy(0) - 4} ${sx(MAX) - 4},${sy(0) + 4}`} fill="#334155" />
        <text x={sx(MAX) + 8} y={sy(0) + 4} fontSize={11} fill="#334155" fontWeight="700">x</text>
        <text x={sx(0) + 4} y={sy(MAX) - 6} fontSize={11} fill="#334155" fontWeight="700">y</text>
        {/* Axis labels */}
        {gridVals.filter(v => v > 0).map(v => (
          <g key={v}>
            <text x={sx(v)} y={sy(0) + 13} textAnchor="middle" fontSize={9} fill="#64748b">{v}</text>
            <text x={sx(0) - 6} y={sy(v) + 3} textAnchor="end" fontSize={9} fill="#64748b">{v}</text>
          </g>
        ))}
        {/* Corner points */}
        {[[0, 0], [0, 10], [ix, iy]].map(([px, py], i) => (
          <circle key={i} cx={sx(px)} cy={sy(py)} r={4} fill={accent} stroke="white" strokeWidth={1.5} />
        ))}
        {/* Vertex labels */}
        <text x={sx(0) + 6} y={sy(10) - 5} fontSize={9} fill="#334155" fontWeight="600">(0,10)</text>
        <text x={sx(ix) + 5} y={sy(iy) - 5} fontSize={9} fill="#334155" fontWeight="600">(⅓·10, ⅔·10)</text>
        <text x={sx(0) + 6} y={sy(0) - 5} fontSize={9} fill="#334155" fontWeight="600">(0,0)</text>
      </svg>
    </div>
  );
}

// ── Visual: Shape Rotation ────────────────────────────────────────────────────

function ShapeRotationVisual({ taskId, accent, vp }: {
  taskId: string; accent: string; vp?: Record<string, unknown>;
}) {
  // GS items: right triangle with labelled sides
  const sideA = typeof vp?.sideA === "number" ? vp!.sideA as number : null;
  const sideB = typeof vp?.sideB === "number" ? vp!.sideB as number : null;
  const missing = typeof vp?.missing === "string" ? vp!.missing as string : null;

  if (sideA !== null && sideB !== null) {
    const hyp = missing === "hyp" ? "?" : String(Math.round(Math.sqrt(sideA ** 2 + sideB ** 2) * 10) / 10);
    const legA = missing === "a" ? "?" : String(sideA);
    const legB = missing === "b" ? "?" : String(sideB);
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Right triangle</p>
        <svg viewBox="0 0 200 160" className="w-full max-w-[200px] mx-auto">
          <polygon points="20,130 20,30 170,130" fill={accent + "15"} stroke={accent} strokeWidth={2.5} />
          <rect x={20} y={118} width={12} height={12} fill="none" stroke={accent} strokeWidth={1.5} />
          <text x={10} y={84} textAnchor="middle" fontSize={13} fill="#1e293b" fontWeight="bold">{legA}</text>
          <text x={95} y={148} textAnchor="middle" fontSize={13} fill="#1e293b" fontWeight="bold">{legB}</text>
          <text x={104} y={78} textAnchor="middle" fontSize={13} fill={missing === "hyp" ? accent : "#1e293b"} fontWeight="bold"
            transform="rotate(-33, 104, 78)">{hyp}</text>
        </svg>
        <p className="text-[10px] text-center text-slate-400 mt-1">Find the missing side</p>
      </div>
    );
  }

  // Trigonometry triangle (GS_SEC_001): angle + hypotenuse, find opposite side
  const triAngle = typeof vp?.angle === "number" ? vp!.angle as number : null;
  const triHyp = typeof vp?.hyp === "number" ? vp!.hyp as number : null;
  if (triAngle !== null && triHyp !== null) {
    const sinA = Math.sin(triAngle * Math.PI / 180);
    const cosA = Math.cos(triAngle * Math.PI / 180);
    const opp = Math.round(triHyp * sinA * 10) / 10;
    const adj = Math.round(triHyp * cosA * 10) / 10;
    const triMissing = typeof vp?.missing === "string" ? vp!.missing as string : "opp";
    const bx = 20; const by = 140; const tx = bx; const ty = 40; const rx = 170; const ry = by;
    const oppLabel = triMissing === "opp" ? "?" : String(opp);
    const adjLabel = triMissing === "adj" ? "?" : String(adj);
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Trigonometry</p>
        <svg viewBox="0 0 200 170" className="w-full max-w-[200px] mx-auto">
          <polygon points={`${bx},${by} ${tx},${ty} ${rx},${ry}`} fill={accent + "15"} stroke={accent} strokeWidth={2.5} />
          <rect x={bx} y={by - 12} width={12} height={12} fill="none" stroke={accent} strokeWidth={1.5} />
          <path d={`M ${rx - 28 * cosA},${ry - 28 * sinA} A 28,28 0 0,0 ${rx - 28},${ry}`} fill="none" stroke="#64748b" strokeWidth={1.5} />
          <text x={rx - 42} y={ry - 10} fontSize={11} fill="#475569" fontWeight="bold">{triAngle}°</text>
          <text x={bx - 10} y={(by + ty) / 2} textAnchor="end" fontSize={13} fill={triMissing === "opp" ? accent : "#1e293b"} fontWeight="bold">{oppLabel}</text>
          {triMissing === "adj" && (
            <text x={(bx + rx) / 2} y={by + 16} textAnchor="middle" fontSize={13} fill={accent} fontWeight="bold">{adjLabel}</text>
          )}
          <text x={(tx + rx) / 2 + 18} y={(ty + ry) / 2 - 4} textAnchor="middle" fontSize={13} fill="#1e293b" fontWeight="bold"
            transform={`rotate(-35, ${(tx + rx) / 2 + 18}, ${(ty + ry) / 2 - 4})`}>{triHyp}</text>
        </svg>
      </div>
    );
  }

  // Default: polygon with two orientations
  const rng = seededRand(strSeed(taskId));
  const sides = [3, 4, 5, 6][Math.floor(rng() * 4)];
  const rotations = [0, 45, 90, 135];
  const rot1 = rotations[Math.floor(rng() * rotations.length)];
  const rot2 = rotations[(rotations.indexOf(rot1) + 1) % rotations.length];
  const R = 40; const toRad = (d: number) => d * Math.PI / 180;

  const polyPoints = (cx: number, cy: number, rot: number) =>
    Array.from({ length: sides }, (_, i) => {
      const a = toRad((i / sides) * 360 + rot - 90);
      return `${cx + R * Math.cos(a)},${cy + R * Math.sin(a)}`;
    }).join(" ");

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Shape rotation</p>
      <div className="flex items-center justify-center gap-4 py-2">
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 100 100" className="w-20">
            <polygon points={polyPoints(50, 50, rot1)} fill={accent + "40"} stroke={accent} strokeWidth={2.5} />
          </svg>
          <span className="text-[10px] text-slate-500 mt-1">Original</span>
        </div>
        <svg viewBox="0 0 30 30" className="w-5 opacity-40">
          <path d="M5 15 L25 15 M20 10 L25 15 L20 20" stroke="#334155" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 100 100" className="w-20">
            <polygon points={polyPoints(50, 50, rot2)} fill={accent + "20"} stroke={accent} strokeWidth={2} strokeDasharray="5,4" />
          </svg>
          <span className="text-[10px] text-slate-500 mt-1">Rotated {rot2 - rot1}°</span>
        </div>
      </div>
    </div>
  );
}

// ── Visual: Visual Word Problem ───────────────────────────────────────────────

function WordProblemVisual({ taskId, accent, vp }: {
  taskId: string; accent: string; vp?: Record<string, unknown>;
}) {
  // GS_UP_001: angle classification — draw labeled angles as SVG
  const angles = Array.isArray(vp?.angles) ? vp!.angles as { label: string; deg: number }[] : null;
  if (angles) {
    const ARM = 44;
    const ARC_R = 15;
    // Vertex centred horizontally so obtuse arms going left stay in-bounds
    const W = 96; const H = 72; const CX = 48; const CY = 60;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Classify these angles</p>
        <div className="flex justify-center gap-3 flex-wrap">
          {angles.map(({ label, deg }) => {
            const rad = (deg * Math.PI) / 180;
            const x2 = CX + ARM;
            const y2 = CY;
            const x3 = CX + ARM * Math.cos(rad);
            const y3 = CY - ARM * Math.sin(rad);
            const arcX = CX + ARC_R * Math.cos(rad);
            const arcY = CY - ARC_R * Math.sin(rad);
            const isRight = deg === 90;
            return (
              <div key={label} className="flex flex-col items-center gap-1">
                <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
                  {isRight ? (
                    <g stroke={accent} strokeWidth="2" fill="none">
                      <line x1={CX} y1={CY} x2={x2} y2={y2} />
                      <line x1={CX} y1={CY} x2={x3} y2={y3} />
                      <polyline points={`${CX + 12},${CY} ${CX + 12},${CY - 12} ${CX},${CY - 12}`} strokeWidth="1.5" />
                    </g>
                  ) : (
                    <g stroke={accent} strokeWidth="2" fill="none">
                      <line x1={CX} y1={CY} x2={x2} y2={y2} />
                      <line x1={CX} y1={CY} x2={x3} y2={y3} />
                      <path d={`M ${CX + ARC_R},${CY} A ${ARC_R},${ARC_R} 0 0,1 ${arcX},${arcY}`} strokeWidth="1.5" />
                    </g>
                  )}
                  <circle cx={CX} cy={CY} r="3" fill={accent} />
                </svg>
                <span className="text-sm font-bold" style={{ color: accent }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Context-driven: highlight key numbers from visualData
  const keyNumbers = Array.isArray(vp?.keyNumbers) ? vp!.keyNumbers as (string | number)[] : null;
  const context = typeof vp?.context === "string" ? vp!.context as string : null;

  if (keyNumbers && context) {
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Key information</p>
        <p className="text-xs text-slate-500 text-center mb-2 italic">{context}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {keyNumbers.map((n, i) => (
            <div key={i} className="px-3 py-2 rounded-xl border-2 text-sm font-bold" style={{ borderColor: accent, backgroundColor: accent + "15", color: accent }}>
              {n}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Cylinder diagram (ME_SEC_001 — radius + height given)
  const cylRadius = typeof vp?.radius === "number" ? vp!.radius as number : null;
  const cylHeight = typeof vp?.height === "number" ? vp!.height as number : null;
  if (cylRadius !== null && cylHeight !== null) {
    // Simple 2-D cylinder SVG: ellipse top, rectangle body, ellipse bottom
    const W = 200; const H = 140;
    const rx = 50; const ry = 14; // ellipse semi-axes
    const cx = W / 2; const bodyTop = 30; const bodyH = 80;
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Cylinder</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[200px] mx-auto">
          {/* Body */}
          <rect x={cx - rx} y={bodyTop} width={rx * 2} height={bodyH} fill={accent + "18"} stroke={accent} strokeWidth={2} />
          {/* Bottom ellipse */}
          <ellipse cx={cx} cy={bodyTop + bodyH} rx={rx} ry={ry} fill={accent + "22"} stroke={accent} strokeWidth={2} />
          {/* Top ellipse (drawn last so it overlaps body top edge) */}
          <ellipse cx={cx} cy={bodyTop} rx={rx} ry={ry} fill={accent + "30"} stroke={accent} strokeWidth={2} />
          {/* Radius arrow */}
          <line x1={cx} y1={bodyTop} x2={cx + rx} y2={bodyTop} stroke="#64748b" strokeWidth={1.5} strokeDasharray="3,2" />
          <text x={cx + rx / 2} y={bodyTop - 5} textAnchor="middle" fontSize={11} fill="#475569" fontWeight="600">r = {cylRadius}</text>
          {/* Height arrow */}
          <line x1={cx + rx + 10} y1={bodyTop} x2={cx + rx + 10} y2={bodyTop + bodyH} stroke="#64748b" strokeWidth={1.5} strokeDasharray="3,2" />
          <text x={cx + rx + 22} y={bodyTop + bodyH / 2 + 4} textAnchor="middle" fontSize={11} fill="#475569" fontWeight="600">h = {cylHeight}</text>
        </svg>
      </div>
    );
  }

  // Algebraic expression display (e.g. SR_SEC_001 polynomial subtraction)
  const expression = typeof vp?.expression === "string" ? vp!.expression as string : null;
  if (expression) {
    return (
      <div className={CARD_INNER}>
        <p className={TASK_LABEL}>Expression</p>
        <div className="flex items-center justify-center py-3 px-2">
          <div className="rounded-xl border-2 px-5 py-3 text-center font-mono text-base font-bold leading-snug" style={{ borderColor: accent, backgroundColor: accent + "12", color: accent }}>
            {expression}
          </div>
        </div>
      </div>
    );
  }

  // Default: seeded word problem illustration
  const rng = seededRand(strSeed(taskId));
  const a = Math.floor(rng() * 8) + 3;
  const b = Math.floor(rng() * 6) + 2;
  const op = rng() > 0.5 ? "+" : "\u2212";
  const ICONS = ["\uD83C\uDF4E", "\u2B50", "\uD83D\uDD35", "\uD83C\uDFC0", "\uD83C\uDF1F", "\uD83D\uDCE6", "\uD83C\uDFAF", "\uD83C\uDF6A"];
  const icon = ICONS[Math.floor(rng() * ICONS.length)];

  return (
    <div className={CARD_INNER}>
      <p className={TASK_LABEL}>Word problem</p>
      <div className="flex items-center justify-center gap-2 flex-wrap py-2">
        <div className="flex flex-wrap gap-0.5 max-w-[100px] border-2 rounded-lg p-1.5 border-slate-200 justify-center">
          {Array.from({ length: Math.min(a, 9) }, (_, i) => <span key={i} className="text-lg">{icon}</span>)}
          <span className="text-xs text-slate-500 w-full text-center font-semibold mt-0.5">{a}</span>
        </div>
        <span className="text-2xl font-bold text-slate-600">{op}</span>
        <div className="flex flex-wrap gap-0.5 max-w-[90px] border-2 rounded-lg p-1.5 border-slate-200 justify-center">
          {Array.from({ length: Math.min(b, 9) }, (_, i) => <span key={i} className="text-lg">{icon}</span>)}
          <span className="text-xs text-slate-500 w-full text-center font-semibold mt-0.5">{b}</span>
        </div>
        <span className="text-xl font-bold" style={{ color: accent }}>= ?</span>
      </div>
    </div>
  );
}

// ── Task Visual Router ────────────────────────────────────────────────────────

function TaskVisual({ task, theme, flashPhase, sessionToken }: { task: TaskData; theme: ThemeKey; flashPhase: FlashPhase; sessionToken?: string }) {
  const accent = THEME_CFG[theme].accent;
  const vt = task.visualType;
  const tt = task.taskType;
  const vp = task.visualParams ?? {};
  const num = (k: string, fallback: number) => (typeof vp[k] === "number" ? vp[k] as number : fallback);
  if (vt === "dot_array") return <DotArrayVisual taskId={task.id} dotCount={num("dotCount", 12)} taskType={tt} accent={accent} flashPhase={flashPhase} groupA={num("groupA", 0) || undefined} groupB={num("groupB", 0) || undefined} theme={theme} />;
  if (vt === "building_comparison") return <BuildingComparisonVisual groupA={num("groupA", 7)} groupB={num("groupB", 5)} accent={accent} theme={theme} />;
  if (vt === "building_groups") return <BuildingGroupsVisual groups={num("groups", 3)} perGroup={num("perGroup", 4)} accent={accent} theme={theme} />;
  if (vt === "number_line") return <NumberLineVisual scaleMin={num("scaleMin", 0)} scaleMax={num("scaleMax", 20)} accent={accent} taskType={tt} vp={vp} />;
  if (vt === "base_ten_blocks") return <BaseTenBlocksVisual thousands={num("thousands", 0)} hundreds={num("hundreds", 0)} tens={num("tens", 2)} ones={num("ones", 3)} accent={accent} />;
  if (vt === "fraction_bar") return <FractionBarVisual numerator={num("numerator", 3)} denominator={num("denominator", 4)} accent={accent} vp={vp} />;
  if (vt === "fraction_circle") return <FractionCircleVisual numerator={num("numerator", 3)} denominator={num("denominator", 4)} accent={accent} theme={theme} />;
  if (vt === "balance_scale") return <BalanceScaleVisual accent={accent} vp={vp} />;
  if (vt === "pattern_builder") return <PatternBuilderVisual taskId={task.id} accent={accent} vp={vp} theme={theme} />;
  if (vt === "clock") return <ClockVisual hour={num("hour", 3)} minute={num("minute", 0)} accent={accent} />;
  if (vt === "money_coins") return <MoneyCoinsVisual taskId={task.id} accent={accent} />;
  if (vt === "place_value_chart") return <PlaceValueChartVisual thousands={num("thousands", 0)} hundreds={num("hundreds", 0)} tens={num("tens", 0)} ones={num("ones", 0)} accent={accent} />;
  if (vt === "area_model") return <AreaModelVisual cols={num("cols", 3)} rows={num("rows", 4)} accent={accent} vp={vp} />;
  if (vt === "number_bond") return <NumberBondVisual total={num("total", 10)} part1={vp.part1 as number | undefined} part2={vp.part2 as number | undefined} accent={accent} />;
  if (vt === "bar_model") return <BarModelVisual total={num("total", 100)} accent={accent} vp={vp} theme={theme} />;
  if (vt === "coordinate_grid") return <CoordinateGridVisual accent={accent} />;
  if (vt === "linear_program") return <LinearProgramVisual accent={accent} />;
  if (vt === "shape_rotation") return <ShapeRotationVisual taskId={task.id} accent={accent} vp={vp} />;
  if (vt === "matching_task") return <MatchingTaskVisual taskId={task.id} accent={accent} vp={vp} />;
  if (vt === "sorting_task") return <SortingTaskVisual taskId={task.id} accent={accent} vp={vp} theme={theme} />;
  if (vt === "tally_marks") return <TallyMarksVisual count={num("count", 13)} accent={accent} theme={theme} />;
  if (vt === "visual_word_problem") return <WordProblemVisual taskId={task.id} accent={accent} vp={vp} />;
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
  studentInstruction?: string;
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
  const [answerText, setAnswerText] = useState("");
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answerError, setAnswerError] = useState("");

  // Flash phase is managed here — not inside DotArrayVisual — so the
  // top-level useEffect fires reliably when the poll delivers timerStartedAt.
  const [flashPhase, setFlashPhase] = useState<FlashPhase>("waiting");
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const r = await fetch(`${BASE_URL}/api/public/rmra/student/${token}?t=${Date.now()}`);
      if (!r.ok) { setFetchError(true); return; }
      const data: SessionState = await r.json();
      setState(data);
      setFetchError(false);
    } catch { }
    finally { setLoading(false); }
  }, [token]);

  // Poll faster (1s) when on an estimation task waiting for the trigger, so the
  // student receives the signal within ~1s and always gets a near-full 3s flash.
  const isEstimationWaiting =
    (state?.currentTask?.taskType === "estimation" || state?.currentTask?.taskType === "subitizing") && !state?.timerStartedAt;
  const activePollMs = isEstimationWaiting ? 1000 : POLL_MS;

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, activePollMs);
    return () => clearInterval(interval);
  }, [token, activePollMs]);

  // Manage flash phase at the top level — watch timerStartedAt directly.
  // When it flips from null → value: show dots for ESTIMATION_FLASH_MS, then hide.
  // When it goes back to null (new task / reset): return to waiting.
  const timerStartedAt = state?.timerStartedAt ?? null;
  const currentTaskId = state?.currentTaskId ?? null;
  const currentTaskType = state?.currentTask?.taskType ?? null;

  useEffect(() => {
    if (timerStartedAt) {
      setFlashPhase("showing");
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      const ms = currentTaskType === "subitizing" ? SUBITIZING_FLASH_MS : ESTIMATION_FLASH_MS;
      flashTimeoutRef.current = setTimeout(() => setFlashPhase("done"), ms);
    } else {
      setFlashPhase("waiting");
      if (flashTimeoutRef.current) { clearTimeout(flashTimeoutRef.current); flashTimeoutRef.current = null; }
    }
    return () => { if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current); };
  }, [timerStartedAt, currentTaskId, currentTaskType]);

  // Reset confidence rating when task changes
  useEffect(() => {
    if (state?.currentTaskId && state.currentTaskId !== lastTaskId) {
      setConfidenceRated(false);
      setAnswerText("");
      setAnswerSubmitted(false);
      setSubmitting(false);
      setAnswerError("");
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

  const submitAnswer = async () => {
    if (!token || !answerText.trim()) return;
    setSubmitting(true);
    setAnswerError("");
    try {
      const res = await fetch(`${BASE_URL}/api/public/rmra/student/${token}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, answer: answerText.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAnswerSubmitted(true);
    } catch {
      setAnswerError("Couldn't save your answer — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Task screen ─────────────────────────────────────────────────────────────
  return (
    <div className={`${cfg.bg} min-h-dvh`}>
      <div className="w-full max-w-2xl mx-auto px-3 pt-3 pb-6 flex flex-col gap-3">

        {/* Header */}
        <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${cfg.header}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{cfg.mascot}</span>
            <span className={`text-sm font-bold ${cfg.bodyText}`}>{cfg.name}</span>
          </div>
          <div className={`text-[11px] px-3 py-1 rounded-full font-semibold uppercase tracking-wide ${cfg.dark ? "bg-white/10 text-white/55" : "bg-black/5 text-slate-500"}`}>
            {task.domain}
          </div>
        </div>

        {/* Hint */}
        {state.hintLevel > 0 && HINT_PROMPTS[state.hintLevel] && (
          <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${cfg.hint}`}>
            <span className="text-lg shrink-0">💡</span>
            <span className="leading-relaxed font-semibold">{HINT_PROMPTS[state.hintLevel]}</span>
          </div>
        )}

        {/* Prompt */}
        <div className={`rounded-2xl border-2 px-4 py-4 ${cfg.promptCard}`}>
          <p className={`text-xl font-bold leading-snug ${cfg.promptText}`}>{task.prompt}</p>
        </div>

        {/* Instruction */}
        {task.studentInstruction && (
          <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-base font-medium ${cfg.instructionCard}`}>
            <span className="shrink-0 text-lg">👉</span>
            <span className="leading-relaxed">{task.studentInstruction}</span>
          </div>
        )}

        {/* Visual */}
        <div className="rounded-2xl shadow-sm overflow-hidden">
          <TaskVisual task={task} theme={theme} flashPhase={flashPhase} sessionToken={token} />
        </div>

        {/* Answer input — always a white card with a clearly visible textarea */}
        {!answerSubmitted && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="px-4 pt-4 pb-2 border-b border-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Your answer</p>
            </div>
            <div className="p-3">
              <textarea
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-base leading-relaxed text-slate-800 resize-none focus:outline-none focus:border-slate-400 placeholder:text-slate-300 transition-colors"
                rows={4}
                placeholder="Type your answer here…"
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="px-4 pb-4">
              <button
                disabled={!answerText.trim() || submitting}
                onClick={submitAnswer}
                className="w-full py-4 rounded-xl font-bold text-base text-white transition-all disabled:opacity-35 active:scale-[0.98]"
                style={{ background: cfg.accentDark }}
              >
                {submitting ? "Submitting…" : "Submit Answer →"}
              </button>
              {answerError && <p className="text-red-500 text-xs mt-2">{answerError}</p>}
            </div>
          </div>
        )}

        {/* Confidence */}
        {answerSubmitted && !confidenceRated && (
          <ConfidenceSlider token={token!} taskId={task.id} theme={theme} onRated={() => setConfidenceRated(true)} />
        )}
        {answerSubmitted && confidenceRated && (
          <div className={`text-center py-4 text-sm font-medium ${cfg.dimText}`}>
            ✓ Answer noted — waiting for the next question…
          </div>
        )}

      </div>
    </div>
  );
}
