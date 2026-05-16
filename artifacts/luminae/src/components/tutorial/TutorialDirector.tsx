import { useEffect, useReducer, useRef, useState } from "react";
import { DevTutorialNav } from "./DevTutorialNav";
import { saveTutorialProgress, clearTutorialProgress, markTutorialSeen, hasTutorialSeen, markTutorialComplete, markIntroSeen } from "@/lib/tutorialProgress";
import { Sparkles, ChevronUp, RotateCcw, X, Lock } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLocation } from "wouter";
import { GEM_META, type GemKey } from "@/lib/gemMeta";
import {
  TUTORIAL_BEATS,
  TUTORIAL_CARDS,
  T3_PURCHASABLE_IDS,
  T3_IMPOSSIBLE_ID,
  FAST_FORWARD_CARDS,
  FINAL_T2_ID,
  FIRST_FORGE_ID,
  RESERVE_CARD_ID,
  TIER2_SINGULARITY_ID,
  AFFINITY_SEQ_KEYS,
  AFFINITY_SEQ_NAMES,
  BEAT_INDEX,
  VERDANCE_LUMINARY_ID,
  type TutorialCard as TutorialCardData,
  type TutorialMarketView,
  type LumiiPointerDir,
} from "@/lib/tutorialData";
import {
  INIT_STATE,
  tutorialReducer as reducer,
  effectiveCost,
  canAfford,
  type TutState,
  type TAction,
} from "@/lib/tutorialReducer";
import { LuminarySummonCutscene, LuminaryPanelArt } from "@/lib/luminaryAssets";
import { gameAudio } from "@/lib/audio";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";

// ─── Card art ─────────────────────────────────────────────────────────────────
const CARD_ART_MODULES = import.meta.glob(
  "../../assets/cards/*.png",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;
const CARD_ART: Record<string, string> = {};
for (const [path, url] of Object.entries(CARD_ART_MODULES)) {
  const id = path.split("/").pop()!.replace(".png", "");
  CARD_ART[id] = url;
}

// ─── Gem images ───────────────────────────────────────────────────────────────
const ALL_GEMS: GemKey[] = ["ruby", "sapphire", "emerald", "onyx", "pearl", "flux"];
const GEM_KEYS_NO_FLUX: GemKey[] = ["ruby", "sapphire", "emerald", "onyx", "pearl"];

// ─── LumiiOrb zone palette (mirrors LumiiTutorial.tsx ZONE_PALETTE) ───────────
// Each row is 6 node colours subtly shifted toward the zone's affinity theme.
// "none" restores the default full-spectrum palette.
const LUMII_ORB_ZONE_PALETTE: Record<"harvest" | "market" | "filters" | "luminaries" | "none", readonly string[]> = {
  none:       ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#e2e8f0", "#fbbf24"],
  harvest:    ["#f97316", "#60a5fa", "#86c874", "#cb7c40", "#fde8b0", "#f5a332"],
  luminaries: ["#d97b9a", "#818cf8", "#6fc4b0", "#a855f7", "#e2e8f0", "#d4b8f5"],
  market:     ["#f5a832", "#90b8e8", "#98c87a", "#c48cd4", "#f0e4c0", "#fbbf24"],
  filters:    ["#f5a832", "#90b8e8", "#98c87a", "#c48cd4", "#f0e4c0", "#fbbf24"],
};

// ─── LumiiOrb ─────────────────────────────────────────────────────────────────
// ─── Ember / spark particles ──────────────────────────────────────────────────
const EMBER_PALETTE_ORB = ["#f87171","#60a5fa","#4ade80","#c084fc","#f8fafc","#fbbf24"] as const;
const MUTED_ORB_PALETTE  = ["#7888a8","#6070a0","#8898c0","#5868a8","#9aaac0","#6878b0"] as const;
interface OrbEmberDef { angle: number; r0f: number; r1f: number; szf: number; col: string; delay: number; dur: number; }
const ORB_EMBERS: OrbEmberDef[] = [
  { angle:  14, r0f: 0.30, r1f: 0.62, szf: 0.072, col: EMBER_PALETTE_ORB[0], delay: 0.0, dur: 2.1 },
  { angle:  48, r0f: 0.34, r1f: 0.70, szf: 0.060, col: EMBER_PALETTE_ORB[1], delay: 0.6, dur: 1.9 },
  { angle:  92, r0f: 0.28, r1f: 0.60, szf: 0.084, col: EMBER_PALETTE_ORB[2], delay: 1.3, dur: 2.4 },
  { angle: 145, r0f: 0.33, r1f: 0.66, szf: 0.068, col: EMBER_PALETTE_ORB[3], delay: 0.3, dur: 2.0 },
  { angle: 188, r0f: 0.29, r1f: 0.65, szf: 0.076, col: EMBER_PALETTE_ORB[5], delay: 2.1, dur: 1.8 },
  { angle: 234, r0f: 0.36, r1f: 0.73, szf: 0.064, col: EMBER_PALETTE_ORB[4], delay: 0.9, dur: 2.6 },
  { angle: 278, r0f: 0.30, r1f: 0.64, szf: 0.080, col: EMBER_PALETTE_ORB[1], delay: 1.7, dur: 2.2 },
  { angle: 320, r0f: 0.33, r1f: 0.69, szf: 0.068, col: EMBER_PALETTE_ORB[0], delay: 0.5, dur: 1.9 },
  { angle:  65, r0f: 0.32, r1f: 0.67, szf: 0.064, col: EMBER_PALETTE_ORB[5], delay: 2.8, dur: 2.3 },
  { angle: 165, r0f: 0.28, r1f: 0.61, szf: 0.084, col: EMBER_PALETTE_ORB[2], delay: 1.4, dur: 2.0 },
  { angle: 260, r0f: 0.34, r1f: 0.72, szf: 0.068, col: EMBER_PALETTE_ORB[3], delay: 3.2, dur: 2.5 },
  { angle: 340, r0f: 0.29, r1f: 0.62, szf: 0.072, col: EMBER_PALETTE_ORB[4], delay: 0.8, dur: 1.7 },
];

// Direction → SVG rotation angle for the pointer arrow
const POINTER_ROTATE: Record<LumiiPointerDir, number> = {
  right:  0,
  down:  90,
  left:  180,
  up:   270,
};

function LumiiOrb({ size = 64, excited = false, highlightZone = null, beatKey, pointing, muted = false }: { size?: number; excited?: boolean; highlightZone?: "harvest" | "market" | "filters" | "luminaries" | null; beatKey?: string | number; pointing?: LumiiPointerDir; muted?: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const blur = Math.round(size * 0.45);
  const mask = "radial-gradient(circle, rgba(0,0,0,0.95) 22%, rgba(0,0,0,0.45) 52%, transparent 74%)";
  const p = muted ? MUTED_ORB_PALETTE : LUMII_ORB_ZONE_PALETTE[highlightZone ?? "none"];
  // Build conic gradients from zone palette so colour tinting stays consistent
  // with LumiiTutorial.tsx when a zone is active (or renders neutral when null).
  const outerBg = `conic-gradient(from 0deg,${p[0]}aa,${p[1]}aa,${p[2]}aa,${p[3]}aa,${p[4]}66,${p[5]}aa,${p[0]}aa)`;
  const midBg   = `conic-gradient(from 0deg,${p[0]}cc,${p[5]}99,${p[2]}cc,${p[1]}cc,${p[3]}cc,${p[4]}55,${p[0]}cc)`;
  const innerBg = `conic-gradient(from 90deg,${p[1]}bb,${p[2]}99,${p[5]}bb,${p[3]}bb,${p[0]}99,${p[1]}bb)`;
  return (
    <motion.div
      style={{ width: size, height: size, position: "relative", pointerEvents: "none" }}
      initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={prefersReducedMotion ? undefined : { type: "spring", stiffness: 280, damping: 16, mass: 0.7 }}
    >
      <motion.div
        animate={{ scale: excited ? [1, 1.4, 1.1, 1.4, 1] : [1, 1.18, 1], opacity: excited ? [0.7, 1, 0.78, 1, 0.7] : [0.52, 0.84, 0.52] }}
        transition={{ duration: excited ? 1.6 : 3.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", inset: "-62%", borderRadius: "50%", background: outerBg, filter: `blur(${blur}px)` }}
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: excited ? 4.5 : 11, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", inset: 0, borderRadius: "50%", background: midBg, maskImage: mask, WebkitMaskImage: mask }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: excited ? 7 : 17, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", inset: "13%", borderRadius: "50%", background: innerBg, maskImage: mask, WebkitMaskImage: mask }}
      />
      <div style={{ position: "absolute", inset: "30%", borderRadius: "50%",
        background: muted
          ? "radial-gradient(circle,rgba(160,185,210,0.55) 0%,rgba(100,130,160,0.32) 45%,transparent 70%)"
          : "radial-gradient(circle,rgba(255,255,255,0.92) 0%,rgba(220,240,255,0.65) 45%,transparent 70%)",
        boxShadow: muted ? "0 0 8px 2px rgba(80,110,140,0.35)" : "0 0 12px 4px rgba(180,220,255,0.5)" }} />
      {/* Multicolored ember / spark particles — drift outward from the orb and fade */}
      <svg style={{ position: "absolute", left: "50%", top: "50%", overflow: "visible", pointerEvents: "none", width: 0, height: 0 }}>
        {ORB_EMBERS.map((e, i) => {
          const rad = (e.angle * Math.PI) / 180;
          const r0 = e.r0f * size;
          const r1 = e.r1f * size;
          const sz = e.szf * size;
          const x0 = r0 * Math.cos(rad);
          const y0 = r0 * Math.sin(rad);
          const x1 = r1 * Math.cos(rad);
          const y1 = r1 * Math.sin(rad);
          const col = muted ? MUTED_ORB_PALETTE[i % MUTED_ORB_PALETTE.length] : e.col;
          return (
            <motion.g
              key={`orb-ember-${i}`}
              style={{ filter: `drop-shadow(0 0 3px ${col})` }}
              initial={{ x: x0, y: y0, opacity: 0, scale: 0.6 }}
              animate={{
                x: [x0, x1, x1],
                y: [y0, y1, y1],
                opacity: [0, 0.88, 0],
                scale: [0.6, 1.0, 0.2],
              }}
              transition={{
                duration: e.dur,
                delay: e.delay,
                repeat: Infinity,
                repeatDelay: 0.5 + (i % 3) * 0.3,
                times: [0, 0.55, 1],
                ease: "easeOut",
              }}
            >
              <circle r={sz} fill={col} />
            </motion.g>
          );
        })}
      </svg>

      {/* Pointing arrow — scales with orb size, SVG width/height 0 so it doesn't affect layout */}
      <AnimatePresence>
        {pointing && (
          <motion.svg
            key={`ptr-${pointing}`}
            style={{ position: "absolute", left: "50%", top: "50%", overflow: "visible", pointerEvents: "none", width: 0, height: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.30 }}
          >
            <g
              transform={`rotate(${POINTER_ROTATE[pointing]})`}
              filter="drop-shadow(0 0 3px rgba(255,255,255,0.55))"
            >
              <motion.path
                d={`M ${(size * 0.56).toFixed(1)} 0 L ${(size * 0.98).toFixed(1)} 0`}
                stroke="rgba(255,255,255,0.72)"
                strokeWidth={1.2}
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1, strokeOpacity: [0.55, 0.88, 0.55] }}
                transition={{
                  pathLength: { duration: 0.38, ease: "easeOut" },
                  strokeOpacity: { duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 },
                }}
              />
              <motion.g
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.55 }}
              >
                <polygon
                  points={`${(size * 1.10).toFixed(1)},0 ${(size * 0.96).toFixed(1)},${-(size * 0.072).toFixed(1)} ${(size * 0.96).toFixed(1)},${(size * 0.072).toFixed(1)}`}
                  fill="rgba(255,255,255,0.72)"
                />
              </motion.g>
            </g>
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── MiniGem ──────────────────────────────────────────────────────────────────
function MiniGem({ gem, size = 14 }: { gem: GemKey; size?: number }) {
  const meta = GEM_META[gem];
  return (
    <img
      src={meta.image}
      alt={meta.name}
      style={{ width: size, height: size, objectFit: "contain", filter: `drop-shadow(0 0 3px ${meta.glowHex}88)` }}
      draggable={false}
    />
  );
}

// ─── DialogueBox ──────────────────────────────────────────────────────────────
function DialogueBox({
  lines, lineIndex, onTap, nudge, mode, showOrb = true, muted = false,
  playerResponse, onPlayerResponse, choices, onChoice,
}: {
  lines: { text: string }[];
  lineIndex: number;
  onTap: () => void;
  nudge: string | null;
  mode: string;
  showOrb?: boolean;
  muted?: boolean;
  playerResponse?: string;
  onPlayerResponse?: () => void;
  choices?: { label: string; value: string }[];
  onChoice?: (value: string) => void;
}) {
  const text = nudge ?? (lines[lineIndex]?.text ?? "");
  const isLast = lineIndex >= lines.length - 1;
  const isPassiveMode = mode === "listen" || mode === "look";
  const showChoices    = !nudge && isLast && !!choices?.length && !!onChoice;
  const showResponseBtn = !showChoices && !nudge && isLast && !!playerResponse && !!onPlayerResponse;
  const canTap = !showResponseBtn && !showChoices && (isPassiveMode || !isLast);

  const hintText = (() => {
    if (nudge || showResponseBtn || showChoices) return null;
    if (!isLast) return "tap to continue";
    if (isPassiveMode) return "tap to continue";
    return null;
  })();

  return (
    <motion.div
      key={nudge ? "nudge" : `line-${lineIndex}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="relative"
    >
      <div
        className={`bg-slate-950/95 border border-white/10 rounded-2xl px-5 py-4 max-w-sm mx-auto shadow-2xl backdrop-blur-md select-none ${canTap ? "cursor-pointer" : ""}`}
        onClick={canTap ? onTap : undefined}
        style={{ boxShadow: nudge ? "0 0 0 2px rgba(251,191,36,0.5), 0 8px 32px rgba(0,0,0,0.8)" : "0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.9)" }}
      >
        <div className="flex items-start gap-3">
          {showOrb && <LumiiOrb size={32} excited={!!nudge} highlightZone={null} muted={muted} />}
          <div className="flex-1">
            <p className="text-sm text-white/90 leading-relaxed">{text}</p>
            {hintText && (
              <p className="text-[10px] text-white/35 mt-2">{hintText}</p>
            )}
          </div>
        </div>
        {showResponseBtn && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            onClick={onPlayerResponse}
            className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium tracking-wide text-amber-200 select-none cursor-pointer"
            style={{
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.3)",
              boxShadow: "0 0 12px rgba(251,191,36,0.1)",
            }}
          >
            {playerResponse}
          </motion.button>
        )}
        {showChoices && (
          <div className="mt-3 flex flex-col gap-2">
            {choices!.map((c, i) => (
              <motion.button
                key={c.value}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
                onClick={() => onChoice!(c.value)}
                className="w-full py-2.5 rounded-xl text-sm font-medium tracking-wide select-none cursor-pointer transition-all active:scale-[0.98]"
                style={i === 0 ? {
                  background: "rgba(251,191,36,0.12)",
                  border: "1px solid rgba(251,191,36,0.45)",
                  boxShadow: "0 0 16px rgba(251,191,36,0.15)",
                  color: "rgba(253,230,138,1)",
                } : {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {c.label}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── TutorialCard ─────────────────────────────────────────────────────────────
function TutorialCard({
  card,
  bonuses,
  crystals,
  highlighted,
  foreground,
  forged,
  impossible,
  viewMode = "all",
  wellSel = {},
  onTap,
}: {
  card: TutorialCardData;
  bonuses: Record<GemKey, number>;
  crystals: Record<GemKey, number>;
  highlighted?: boolean;
  foreground?: boolean;
  forged?: boolean;
  impossible?: boolean;
  viewMode?: TutorialMarketView;
  wellSel?: Partial<Record<GemKey, number>>;
  onTap?: () => void;
}) {
  const eff = effectiveCost(card, bonuses);
  const artUrl = CARD_ART[card.id];
  const bonusMeta = GEM_META[card.bonusColor];
  const affordable = canAfford(card, crystals, bonuses);

  const bgStyle: React.CSSProperties = artUrl
    ? { backgroundImage: `url(${artUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(175deg, #021005 0%, #063020 50%, #020c04 100%)` };

  // Compute the displayed cost value and styling per affinity based on viewMode
  const getCostDisplay = (k: GemKey, baseCost: number): { value: number | "✓"; showStrike: boolean; strikeValue: number; bgClass: string; textClass: string } => {
    if (viewMode === "discounted") {
      const effCost = eff[k] ?? 0;
      const reduced = effCost < baseCost;
      const free = effCost === 0;
      return {
        value: free ? "✓" : effCost,
        showStrike: reduced && !free,
        strikeValue: baseCost,
        bgClass: free ? "bg-green-900/80" : reduced ? "bg-blue-900/80" : "bg-black/60",
        textClass: free ? "text-green-300" : reduced ? "text-blue-200" : "text-white",
      };
    }
    if (viewMode === "needed") {
      const effCost = eff[k] ?? 0;
      const held = crystals[k] ?? 0;
      const inWell = wellSel[k] ?? 0;
      const shortfall = Math.max(0, effCost - held - inWell);
      const free = shortfall === 0;
      return {
        value: free ? "✓" : shortfall,
        showStrike: false,
        strikeValue: baseCost,
        bgClass: free ? "bg-green-900/80" : "bg-black/60",
        textClass: free ? "text-green-300" : "text-white",
      };
    }
    // "all" mode — show base (printed) cost, no discounting
    return {
      value: baseCost,
      showStrike: false,
      strikeValue: baseCost,
      bgClass: "bg-black/60",
      textClass: "text-white",
    };
  };

  return (
    <motion.div
      animate={foreground ? { scale: 1.06, y: -6 } : { scale: 1, y: 0 }}
      whileTap={onTap && !forged ? { scale: 0.94 } : undefined}
      onClick={onTap && !forged ? onTap : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`relative shrink-0 ${onTap && !forged ? "cursor-pointer" : ""}`}
      style={{ width: 112, height: 160 }}
    >
      <div
        className={`absolute inset-0 rounded-xl overflow-hidden shadow-xl ${highlighted ? "ring-2 ring-amber-400 shadow-amber-400/30" : "ring-1 ring-white/10"} ${forged ? "opacity-40 grayscale" : ""} ${impossible ? "opacity-50" : ""}`}
        style={bgStyle}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/90" />
        {highlighted && (
          <motion.div
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 bg-amber-400/15 rounded-xl"
          />
        )}
        <div className="relative z-10 h-full p-2 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-base font-serif font-bold text-white drop-shadow">{card.lumens > 0 ? card.lumens : ""}</span>
            <div className="w-4 h-4 rounded-full ring-1 ring-black/40 overflow-hidden">
              <img src={bonusMeta.image} alt={bonusMeta.name} className="w-full h-full object-contain" draggable={false} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[8px] font-semibold text-white drop-shadow line-clamp-2 leading-tight">{card.name}</div>
            <div className="flex flex-wrap gap-0.5 justify-end">
              {(Object.entries(card.cost) as [GemKey, number][]).map(([k, v]) => {
                if (!v || v <= 0) return null;
                const display = getCostDisplay(k, v);
                const isFree = display.value === "✓";
                return (
                  <motion.div
                    key={`${k}-${String(display.value)}`}
                    initial={{ scale: isFree ? 1.85 : 1.35, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={isFree
                      ? { type: "spring", stiffness: 480, damping: 13, mass: 0.55 }
                      : { type: "spring", stiffness: 340, damping: 24, mass: 0.65 }
                    }
                    className={`flex items-center gap-0.5 rounded px-1 py-0.5 ${display.bgClass}`}
                  >
                    {display.showStrike && <span className="text-[6px] text-white/30 line-through mr-0.5">{display.strikeValue}</span>}
                    <span className={`text-[9px] font-bold ${display.textClass}`}>{display.value}</span>
                    <MiniGem gem={k} size={9} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
        {forged && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-white/50 font-semibold bg-black/60 rounded px-2 py-0.5">Forged</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Tutorial Card Sheet ──────────────────────────────────────────────────────
// Bottom sheet that slides up when a card is tapped — matches real game's action
// sheet pattern. Forge/Reserve actions happen here rather than below the card.
function TutorialCardSheet({
  card, bonuses, crystals, viewMode, wellSel,
  forgeEnabled, reserveEnabled, onForge, onReserve, onClose,
}: {
  card: TutorialCardData;
  bonuses: Record<GemKey, number>;
  crystals: Record<GemKey, number>;
  viewMode: TutorialMarketView;
  wellSel: Partial<Record<GemKey, number>>;
  forgeEnabled: boolean;
  reserveEnabled: boolean;
  onForge?: () => void;
  onReserve?: () => void;
  onClose: () => void;
}) {
  const artUrl = CARD_ART[card.id];
  const bonusMeta = GEM_META[card.bonusColor];
  const eff = effectiveCost(card, bonuses);
  const affordable = canAfford(card, crystals, bonuses);

  const bgStyle: React.CSSProperties = artUrl
    ? { backgroundImage: `url(${artUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(175deg, #021005 0%, #063020 50%, #020c04 100%)` };

  const getCostDisplay = (k: GemKey, baseCost: number): { value: number | "✓"; showStrike: boolean; strikeValue: number; bgClass: string; textClass: string } => {
    if (viewMode === "discounted") {
      const effCost = eff[k] ?? 0;
      const reduced = effCost < baseCost;
      const free = effCost === 0;
      return { value: free ? "✓" : effCost, showStrike: reduced && !free, strikeValue: baseCost, bgClass: free ? "bg-green-900/80" : reduced ? "bg-blue-900/80" : "bg-black/60", textClass: free ? "text-green-300" : reduced ? "text-blue-200" : "text-white" };
    }
    if (viewMode === "needed") {
      const effCost = eff[k] ?? 0;
      const held = crystals[k] ?? 0;
      const inWell = wellSel[k] ?? 0;
      const shortfall = Math.max(0, effCost - held - inWell);
      const free = shortfall === 0;
      return { value: free ? "✓" : shortfall, showStrike: false, strikeValue: baseCost, bgClass: free ? "bg-green-900/80" : "bg-black/60", textClass: free ? "text-green-300" : "text-white" };
    }
    return { value: baseCost, showStrike: false, strikeValue: baseCost, bgClass: "bg-black/60", textClass: "text-white" };
  };

  const hasCost = Object.values(card.cost).some(v => v > 0);

  return (
    <>
      <motion.div
        key="card-sheet-backdrop"
        className="fixed inset-0 z-[80] bg-black/50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      <motion.div
        key="card-sheet-panel"
        className="fixed left-0 right-0 bottom-0 z-[81] rounded-t-2xl border-t border-white/15 shadow-2xl"
        style={{ background: "rgba(6,6,17,0.97)" }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-2" />
        <div className="px-4 pb-8">
          <div className="flex gap-4 mb-5">
            {/* Card art */}
            <div className="relative rounded-xl overflow-hidden shadow-xl ring-1 ring-white/15 shrink-0"
              style={{ width: 80, height: 116, ...bgStyle }}>
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/80" />
              <div className="relative z-10 h-full p-1.5 flex flex-col justify-between">
                <span className="text-sm font-serif font-bold text-white drop-shadow">{card.lumens > 0 ? card.lumens : ""}</span>
                <div className="w-3.5 h-3.5 rounded-full ring-1 ring-black/40 overflow-hidden ml-auto">
                  <img src={bonusMeta.image} alt={bonusMeta.name} className="w-full h-full object-contain" draggable={false} />
                </div>
              </div>
            </div>
            {/* Card details */}
            <div className="flex-1 flex flex-col gap-1.5 pt-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full ring-1 ring-black/40 overflow-hidden shrink-0">
                  <img src={bonusMeta.image} alt={bonusMeta.name} className="w-full h-full object-contain" draggable={false} />
                </div>
                <span className="text-[10px] text-white/45 truncate">{bonusMeta.name} affinity</span>
              </div>
              <span className="text-sm font-semibold text-white leading-tight">{card.name}</span>
              {card.lumens > 0 && (
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
                  <span className="text-[11px] text-amber-300 font-bold">+{card.lumens} Eminence</span>
                </div>
              )}
              <div className="text-[9px] text-white/30 mt-0.5">
                Forging grants <span style={{ color: bonusMeta.glowHex }}>+1 {bonusMeta.shortName}</span> bonus permanently
              </div>
              {hasCost ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {(Object.entries(card.cost) as [GemKey, number][]).map(([k, v]) => {
                    if (!v || v <= 0) return null;
                    const display = getCostDisplay(k, v);
                    return (
                      <div key={k} className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 ${display.bgClass}`}>
                        {display.showStrike && <span className="text-[7px] text-white/30 line-through mr-0.5">{display.strikeValue}</span>}
                        <span className={`text-[10px] font-bold ${display.textClass}`}>{display.value}</span>
                        <MiniGem gem={k} size={10} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[9px] text-green-400 font-bold mt-1">Free to forge</div>
              )}
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={forgeEnabled && affordable ? onForge : undefined}
              disabled={!forgeEnabled || !affordable}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.97] ${
                forgeEnabled && affordable
                  ? "bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20"
                  : "bg-white/8 text-white/25 cursor-not-allowed"
              }`}
            >
              {forgeEnabled ? (affordable ? "Forge" : "Need more affinities") : "Not yet"}
            </button>
            {onReserve !== undefined && (
              <button
                type="button"
                onClick={reserveEnabled ? onReserve : undefined}
                disabled={!reserveEnabled}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.97] ${
                  reserveEnabled
                    ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                    : "bg-white/8 text-white/25 cursor-not-allowed"
                }`}
              >
                {reserveEnabled ? "Reserve" : "Not yet"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Affinity Well ─────────────────────────────────────────────────────────────
function AffinityWell({
  s, dispatch, beatId, subStep, wellEnabled, fluxLocked = true, harnessFlash = false, onHarnessFlash,
}: {
  s: TutState;
  dispatch: React.Dispatch<TAction>;
  beatId: string;
  subStep: number;
  wellEnabled: boolean;
  fluxLocked?: boolean;
  harnessFlash?: boolean;
  onHarnessFlash?: () => void;
}) {
  const totalSel = Object.values(s.wellSel).reduce((a, b) => a + b, 0);

  const guidedGems: Partial<Record<GemKey, number>> = (() => {
    if (beatId === "b8_first_harness") return { ruby: 1, sapphire: 1, pearl: 1 };
    if (beatId === "b11_forge_reserved" && subStep === 0) return { onyx: 2, pearl: 1 };
    if (beatId === "b12_tier2" && subStep === 1) return { onyx: 2 };
    if (beatId === "b16_final_forge" && subStep === 0) return { sapphire: 2 };
    return {};
  })();

  const isGuidedBeat = Object.keys(guidedGems).length > 0;

  return (
    <motion.div
      className={`border rounded-2xl p-3 backdrop-blur-md transition-colors ${harnessFlash ? "border-emerald-400/70" : "border-white/10"}`}
      animate={harnessFlash
        ? { boxShadow: ["0 0 6px rgba(52,211,153,0.15)", "0 0 28px rgba(52,211,153,0.50)", "0 0 14px rgba(52,211,153,0.22)"] }
        : { boxShadow: "none" }
      }
      transition={{ duration: 0.85, ease: "easeOut" }}
      style={{ background: "rgba(3,3,12,0.78)" }}
    >
      <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2">Affinity Well</div>
      <div className="flex gap-2 flex-wrap justify-center mb-3">
        {ALL_GEMS.map(gem => {
          const isFlux = gem === "flux";
          const isLocked = isFlux && fluxLocked;
          const meta = GEM_META[gem];
          const cur = s.wellSel[gem] ?? 0;
          const guided = guidedGems[gem] ?? 0;
          const isHighlighted = isGuidedBeat && guided > 0 && !isFlux;
          const wouldExceedSameLimit = (cur + 1) > 2;
          const canAdd = !isLocked && wellEnabled && !wouldExceedSameLimit && (!isGuidedBeat || guided > cur);
          const canRemove = !isLocked && wellEnabled && cur > 0;

          return (
            <div key={gem} className={`flex flex-col items-center gap-1.5 ${isLocked ? "opacity-35" : ""}`}>
              <div className="relative">
                <motion.button
                  animate={isHighlighted && cur < guided ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                  onClick={() => canAdd ? dispatch({ type: "SEL_AFF", gem, delta: 1 }) : undefined}
                  disabled={!canAdd}
                  className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all
                    ${isHighlighted ? "shadow-[0_0_12px_rgba(251,191,36,0.6)]" : ""}
                    ${canAdd ? "cursor-pointer active:scale-90" : "cursor-default opacity-40"}
                    ${cur > 0 ? "bg-white/10" : "bg-black/30"}`}
                  style={{ borderColor: cur > 0 ? meta.hex : isHighlighted ? "#fbbf24" : "rgba(255,255,255,0.15)" }}
                >
                  <img src={meta.image} alt={meta.name} className="w-7 h-7 object-contain" draggable={false} />
                  {cur > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center text-white shadow"
                      style={{ background: meta.hex }}>{cur}</span>
                  )}
                </motion.button>
                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full pointer-events-none">
                    <Lock className="h-3.5 w-3.5 text-white/40" />
                  </div>
                )}
              </div>
              <button
                onClick={() => canRemove ? dispatch({ type: "SEL_AFF", gem, delta: -1 }) : undefined}
                disabled={!canRemove}
                className={`text-[10px] font-bold w-6 h-5 rounded transition-all ${canRemove ? "bg-white/10 text-white/70 hover:bg-white/20" : "opacity-0 pointer-events-none"}`}
              >−</button>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 items-center justify-between">
        <div className="text-[10px] text-white/40">
          {totalSel > 0 ? `${totalSel} selected` : "Tap a gem to select it"}
        </div>
        <div className="flex gap-1">
          {totalSel > 0 && (
            <button onClick={() => dispatch({ type: "CLEAR_SEL" })}
              className="text-[10px] px-2 py-1.5 rounded-lg bg-white/8 text-white/50 hover:bg-white/15">Clear</button>
          )}
          <button
            onClick={() => {
              if (wellEnabled && totalSel > 0) {
                dispatch({ type: "HARNESS" });
                onHarnessFlash?.();
              }
            }}
            disabled={!wellEnabled || totalSel === 0}
            className={`text-[11px] font-bold px-4 py-1.5 rounded-lg transition-all ${wellEnabled && totalSel > 0 ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md" : "bg-white/8 text-white/20 cursor-not-allowed"}`}
          >Harness</button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Player Hand (reserved) ───────────────────────────────────────────────────
function PlayerHand({
  s, dispatch, beatId, subStep, onCardTap,
}: {
  s: TutState;
  dispatch: React.Dispatch<TAction>;
  beatId: string;
  subStep: number;
  onCardTap?: (card: TutorialCardData, forgeEnabled: boolean, reserveEnabled: boolean, onForge?: () => void, onReserve?: () => void) => void;
}) {
  if (s.reserved.length === 0) return null;
  const isForgeReservedBeat = beatId === "b11_forge_reserved";
  const forgeEnabled = isForgeReservedBeat && subStep >= 1;

  return (
    <div className="border border-white/10 rounded-2xl p-3 backdrop-blur-md" style={{ background: "rgba(3,3,12,0.78)" }}>
      <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2">Reserved</div>
      <div className="flex gap-3 flex-wrap">
        {s.reserved.map(id => {
          const card = TUTORIAL_CARDS[id];
          if (!card) return null;
          const isHighlighted = isForgeReservedBeat;
          return (
            <TutorialCard
              key={id}
              card={card}
              bonuses={s.bonuses}
              crystals={s.crystals}
              highlighted={isHighlighted}
              foreground={isHighlighted}
              viewMode={s.view}
              wellSel={s.wellSel}
              onTap={onCardTap ? () => onCardTap(
                card,
                forgeEnabled,
                false,
                () => dispatch({ type: "FORGE_RESERVED", cardId: id }),
                undefined,
              ) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Player Storage (forged) ──────────────────────────────────────────────────
function PlayerStorage({ s, highlighted }: { s: TutState; highlighted: boolean }) {
  const bonusTotals: Partial<Record<GemKey, number>> = {};
  for (const [k, v] of Object.entries(s.bonuses) as [GemKey, number][]) {
    if (v > 0) bonusTotals[k] = v;
  }

  return (
    <div className={`border rounded-2xl p-3 backdrop-blur-md transition-all ${highlighted ? "border-amber-400/50 shadow-amber-400/20 shadow-lg" : "border-white/10"}`}
      style={{ background: "rgba(3,3,12,0.78)" }}>
      <div className="flex justify-between items-center mb-2">
        <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Forged Artifacts</div>
        {Object.keys(bonusTotals).length > 0 && (
          <div className="flex gap-1">
            {(Object.entries(bonusTotals) as [GemKey, number][]).map(([k, v]) => (
              <div key={k} className="flex items-center gap-0.5 bg-black/40 rounded px-1.5 py-0.5">
                <span className="text-[9px] text-emerald-300 font-bold">+{v}</span>
                <MiniGem gem={k} size={9} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1 flex-wrap min-h-[36px] items-center">
        {s.forged.length === 0 && <span className="text-[10px] text-white/20">No artifacts yet</span>}
        {s.forged.map(id => {
          const card = TUTORIAL_CARDS[id];
          if (!card) return null;
          const bonusMeta = GEM_META[card.bonusColor];
          return (
            <div key={id} className="flex items-center gap-1 bg-black/40 rounded-lg px-2 py-1 border border-white/10">
              <img src={bonusMeta.image} alt="" className="w-3 h-3 object-contain" draggable={false} />
              <span className="text-[8px] text-white/70">{card.name}</span>
              {card.lumens > 0 && <span className="text-[8px] font-bold text-amber-300">+{card.lumens}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Player Stats ─────────────────────────────────────────────────────────────
function PlayerStats({ s, highlighted }: { s: TutState; highlighted: boolean }) {
  return (
    <div className={`border rounded-2xl p-3 backdrop-blur-md transition-all ${highlighted ? "border-amber-400/50 shadow-amber-400/20 shadow-lg" : "border-white/10"}`}
      style={{ background: "rgba(3,3,12,0.82)" }}>
      {/* Eminence row */}
      <div className="flex items-center gap-3 mb-2.5">
        <div>
          <div className="text-[9px] text-white/40 uppercase tracking-wider">Eminence</div>
          <motion.div
            key={s.eminence}
            initial={{ scale: 1.3, color: "#fbbf24" }}
            animate={{ scale: 1, color: "#ffffff" }}
            className="text-2xl font-serif font-bold text-white leading-none"
          >{s.eminence}</motion.div>
          <div className="text-[9px] text-white/30">of 15</div>
        </div>
        <div className="flex-1 bg-white/5 rounded-full h-1.5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
            animate={{ width: `${Math.min(100, (s.eminence / 15) * 100)}%` }}
            transition={{ type: "spring", stiffness: 100 }}
          />
        </div>
      </div>
      {/* 6-column affinity boxes — matches the game's player panel */}
      <div className="flex gap-1">
        {ALL_GEMS.map(gem => {
          const meta = GEM_META[gem];
          const held = s.crystals[gem] ?? 0;
          const bonus = gem !== "flux" ? (s.bonuses[gem] ?? 0) : 0;
          const reserved = gem === "flux" ? s.reserved.length : 0;
          const hasContent = gem === "flux" ? (held > 0 || reserved > 0) : (held > 0 || bonus > 0);
          return (
            <div
              key={gem}
              className="flex-1 min-h-[64px] flex flex-col items-center gap-0.5 rounded-lg relative overflow-hidden pt-1.5 pb-1.5"
              style={{
                background: hasContent
                  ? `linear-gradient(180deg, #060611 0%, ${meta.hex}33 100%)`
                  : "linear-gradient(180deg, #07070b 0%, #0e0e14 100%)",
                border: `1px solid ${hasContent ? meta.hex + "AA" : meta.hex + "22"}`,
                boxShadow: hasContent ? `inset 0 0 14px ${meta.hex}22, 0 0 8px ${meta.hex}33` : "none",
              }}
            >
              {hasContent && (
                <div className="absolute inset-x-0 top-0 h-[1px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${meta.glowHex}AA, transparent)` }} />
              )}
              <div className="flex items-center gap-0.5 justify-center">
                <span className="text-[7px] font-semibold tracking-wide leading-none truncate"
                  style={{ color: meta.glowHex }}>{meta.shortName}</span>
                <MiniGem gem={gem} size={7} />
              </div>
              <span
                className="text-xl font-black leading-none tracking-tight"
                style={{
                  color: hasContent ? "#fff" : meta.hex + "40",
                  textShadow: hasContent ? `0 0 10px ${meta.glowHex}` : "none",
                }}
              >{held}</span>
              {gem !== "flux" && bonus > 0 && (
                <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>+{bonus}</span>
              )}
              {gem === "flux" && reserved > 0 && (
                <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>{reserved}r</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Market view tabs ─────────────────────────────────────────────────────────
function MarketTabs({
  view, dispatch, beatId, subStep, highlightDiscounted, highlightNeeded,
}: {
  view: TutorialMarketView;
  dispatch: React.Dispatch<TAction>;
  beatId: string;
  subStep: number;
  highlightDiscounted: boolean;
  highlightNeeded: boolean;
}) {
  const tabs: { key: TutorialMarketView; label: string }[] = [
    { key: "all", label: "All" },
    { key: "discounted", label: "Discounted" },
    { key: "needed", label: "Needed" },
  ];
  return (
    <div className="flex gap-1 mb-3">
      {tabs.map(tab => {
        const isActive = view === tab.key;
        const isHl = (tab.key === "discounted" && highlightDiscounted) || (tab.key === "needed" && highlightNeeded);
        return (
          <motion.button
            key={tab.key}
            onClick={() => dispatch({ type: "SET_VIEW", view: tab.key })}
            animate={isHl ? { boxShadow: ["0 0 0px transparent", "0 0 10px rgba(251,191,36,0.6)", "0 0 0px transparent"] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all ${isActive ? "bg-white/15 text-white" : "bg-black/30 text-white/40 hover:bg-white/8"} ${isHl ? "ring-1 ring-amber-400" : ""}`}
          >{tab.label}</motion.button>
        );
      })}
    </div>
  );
}

// ─── Deck Pile Visual ─────────────────────────────────────────────────────────
function DeckPile({ tier, count }: { tier: number; count: number }) {
  const colors: Record<number, string> = { 1: "#1a2435", 2: "#121c28", 3: "#1a1225" };
  const accents: Record<number, string> = { 1: "#3a6a5a", 2: "#2a4a6a", 3: "#5a3a6a" };
  const bg = colors[tier] ?? "#1a2435";
  const ac = accents[tier] ?? "#555";
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="relative rounded-lg shadow-lg border border-white/8" style={{ width: 52, height: 72, background: bg }}>
        <div className="absolute rounded-lg border border-white/5" style={{ inset: "3px -3px -3px 3px", background: bg, opacity: 0.65 }} />
        <div className="relative h-full flex flex-col items-center justify-center gap-1 p-1">
          <div className="w-6 h-6 rounded-full border-2 opacity-50" style={{ borderColor: ac }} />
          <div className="text-[6px] font-bold text-white/25 uppercase tracking-wider">Deck</div>
        </div>
        {count > 0 && (
          <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-md"
            style={{ background: ac }}>{count}</div>
        )}
      </div>
      <span className="text-[6px] text-white/20 font-semibold tracking-wide">Blind</span>
    </div>
  );
}

// ─── Scripted Market ──────────────────────────────────────────────────────────
function ScriptedMarket({ s, dispatch, beatId, subStep, onCardTap }: {
  s: TutState;
  dispatch: React.Dispatch<TAction>;
  beatId: string;
  subStep: number;
  onCardTap: (card: TutorialCardData, forgeEnabled: boolean, reserveEnabled: boolean, onForge?: () => void, onReserve?: () => void) => void;
}) {
  const inFF = beatId === "b15_fast_forward" || s.ffDone;

  // Determine which cards appear per tier per beat phase
  const t1Cards: string[] = [];
  const t2Cards: string[] = [];
  const t3Cards: string[] = [];

  const earlyBeats = ["b6_forge_appears", "b7_artifact_cost", "b8_first_harness", "b9_first_forge", "b9b_forge_complete"];
  const midBeats = ["b10_reserve", "b10b_reserve_granted", "b10c_needed_peek", "b11_forge_reserved", "b12_tier2"];
  const lateBeats = ["b13_tier3", "b14_win_condition", "b15_fast_forward"];
  const finalBeat = ["b16_final_forge"];

  if (earlyBeats.includes(beatId)) {
    t1Cards.push(FIRST_FORGE_ID);
  } else if (midBeats.includes(beatId)) {
    if (!s.forged.includes(FIRST_FORGE_ID)) t1Cards.push(FIRST_FORGE_ID);
    else t1Cards.push(FIRST_FORGE_ID); // show as forged
    t1Cards.push(RESERVE_CARD_ID);
    if (!s.forged.includes(TIER2_SINGULARITY_ID) && !s.reserved.includes(TIER2_SINGULARITY_ID)) {
      t2Cards.push(TIER2_SINGULARITY_ID);
    }
  } else if (lateBeats.includes(beatId)) {
    t3Cards.push(...T3_PURCHASABLE_IDS, T3_IMPOSSIBLE_ID);
  } else if (finalBeat.includes(beatId)) {
    t2Cards.push(FINAL_T2_ID);
  }

  // Beat-specific card interactions
  const isForgeMarketBeat = ["b9_first_forge", "b12_tier2", "b13_tier3", "b16_final_forge"].includes(beatId);
  const isReserveBeat = beatId === "b10_reserve";
  const highlightDiscounted = beatId === "b10_reserve";
  const highlightNeeded = (beatId === "b12_tier2" && subStep === 0) || beatId === "b10c_needed_peek";

  const getCardForgeEnabled = (cardId: string) => {
    if (!isForgeMarketBeat) return false;
    if (beatId === "b9_first_forge") return cardId === FIRST_FORGE_ID;
    if (beatId === "b12_tier2") return cardId === TIER2_SINGULARITY_ID && subStep >= 2;
    if (beatId === "b13_tier3") return T3_PURCHASABLE_IDS.includes(cardId);
    if (beatId === "b16_final_forge") return cardId === FINAL_T2_ID && subStep >= 1;
    return false;
  };

  const getCardReserveEnabled = (cardId: string) => {
    if (!isReserveBeat) return false;
    return cardId === RESERVE_CARD_ID && (s.subStep >= 1 || subStep >= 1);
  };

  const getHighlighted = (cardId: string) => {
    if (beatId === "b6_forge_appears" || beatId === "b7_artifact_cost") return cardId === FIRST_FORGE_ID;
    if (beatId === "b9_first_forge") return cardId === FIRST_FORGE_ID;
    if (beatId === "b10_reserve") return cardId === RESERVE_CARD_ID && (s.subStep >= 1 || subStep >= 1);
    if (beatId === "b12_tier2") return cardId === TIER2_SINGULARITY_ID;
    if (beatId === "b13_tier3") return T3_PURCHASABLE_IDS.includes(cardId) && !s.forged.includes(cardId);
    if (beatId === "b16_final_forge") return cardId === FINAL_T2_ID;
    return false;
  };

  const getForeground = (cardId: string) => {
    if (beatId === "b6_forge_appears" || beatId === "b7_artifact_cost") return cardId === FIRST_FORGE_ID;
    if (beatId === "b9_first_forge") return cardId === FIRST_FORGE_ID;
    if (beatId === "b12_tier2") return cardId === TIER2_SINGULARITY_ID;
    if (beatId === "b16_final_forge") return cardId === FINAL_T2_ID;
    return false;
  };

  const renderTierRow = (tier: number, cardIds: string[], label: string) => {
    if (cardIds.length === 0) return null;
    const visible = cardIds.filter(() => true);
    if (visible.length === 0) return null;
    const deckCounts: Record<number, number> = { 1: 20, 2: 15, 3: 10 };
    const deckCount = Math.max(0, (deckCounts[tier] ?? 10) - visible.length);
    return (
      <div key={tier} className="mb-4">
        <div className="text-[9px] text-white/30 font-semibold uppercase tracking-wider mb-3">Tier {tier} — {label}</div>
        <div className="flex gap-3 overflow-x-auto pb-2 items-start">
          <DeckPile tier={tier} count={deckCount} />
          {visible.map(cardId => {
            const card = TUTORIAL_CARDS[cardId];
            if (!card) return null;
            const isForged = s.forged.includes(cardId);
            const isReserved = s.reserved.includes(cardId);
            if (isReserved) return null;
            const isImpossible = cardId === T3_IMPOSSIBLE_ID;
            const affordable = canAfford(card, s.crystals, s.bonuses);
            return (
              <TutorialCard
                key={cardId}
                card={card}
                bonuses={s.bonuses}
                crystals={s.crystals}
                highlighted={getHighlighted(cardId)}
                foreground={getForeground(cardId)}
                forged={isForged}
                impossible={isImpossible}
                viewMode={s.view}
                wellSel={s.wellSel}
                onTap={isImpossible
                  ? () => dispatch({ type: "NUDGE", msg: TUTORIAL_BEATS[s.beat]?.wrongClickNudge ?? "That artifact is beyond reach right now." })
                  : () => onCardTap(
                      card,
                      getCardForgeEnabled(cardId) && affordable,
                      getCardReserveEnabled(cardId),
                      () => dispatch({ type: "FORGE_MARKET", cardId }),
                      () => dispatch({ type: "RESERVE", cardId }),
                    )
                }
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <MarketTabs
        view={s.view}
        dispatch={dispatch}
        beatId={beatId}
        subStep={subStep}
        highlightDiscounted={highlightDiscounted}
        highlightNeeded={highlightNeeded}
      />
      {renderTierRow(3, t3Cards, "Frontier")}
      {renderTierRow(2, t2Cards, "Ascendant")}
      {renderTierRow(1, t1Cards, "Foundation")}
    </div>
  );
}

// ─── Fullscreen Shatter Overlay ───────────────────────────────────────────────
// Matches the exact phase structure, 4-layer crack paint, 3-D shard scatter,
// and audio timing of the Luminary summon cutscene.

const FS_PHASE_ORDER = [
  'pressure', 'firstcrack', 'leaking', 'secondcrack',
  'cracking', 'shattering', 'flashing', 'gone',
] as const;
type FSPhase = typeof FS_PHASE_ORDER[number];

// Phase durations (ms) — identical to PHASE_DURATIONS in luminaryAssets.tsx
const FS_DURS: Partial<Record<FSPhase, number>> = {
  pressure: 90, firstcrack: 320, leaking: 850, secondcrack: 360,
  cracking: 1100, shattering: 1000, flashing: 950,
};

// Six-shard geometry — same polygon network as PANEL_PIECES in luminaryAssets,
// already expressed in percentage coordinates so they tile the full viewport.
const FS_SHARDS = [
  { clip: 'polygon(0% 0%, 35.7% 0%, 28.6% 15%, 50% 42.5%, 39.3% 40%, 19.6% 37.5%, 0% 40%)',
    dx: '-38%', dy: '-32%', rX: -12, rY:   9, rZ:  10 },
  { clip: 'polygon(35.7% 0%, 100% 0%, 100% 35%, 60.7% 35%, 50% 42.5%, 28.6% 15%)',
    dx:  '36%', dy: '-30%', rX: -10, rY: -10, rZ:  -9 },
  { clip: 'polygon(0% 40%, 19.6% 37.5%, 39.3% 40%, 50% 42.5%, 41.1% 57.5%, 25% 72.5%, 16.1% 76.25%, 0% 80%)',
    dx: '-42%', dy:   '3%', rX:   4, rY:  11, rZ:   7 },
  { clip: 'polygon(100% 35%, 100% 72.5%, 71.4% 70%, 46.4% 70%, 25% 72.5%, 41.1% 57.5%, 50% 42.5%, 60.7% 35%)',
    dx:  '44%', dy:   '2%', rX:  -3, rY: -12, rZ:  -6 },
  { clip: 'polygon(25% 72.5%, 33.9% 85%, 39.3% 100%, 0% 100%, 0% 80%, 16.1% 76.25%)',
    dx: '-32%', dy:  '36%', rX:  13, rY:   8, rZ:  12 },
  { clip: 'polygon(25% 72.5%, 46.4% 70%, 71.4% 70%, 100% 72.5%, 100% 100%, 39.3% 100%, 33.9% 85%)',
    dx:  '30%', dy:  '36%', rX:  11, rY:  -9, rZ: -10 },
] as const;

// Crack network — paths in viewBox 0-100 using the same percentage coords
// as the shard polygon vertices (junction P=50,42.5  Q=25,72.5).
type CrackDef = { d: string; d1: number; isDetail?: true };

const FS_CRACKS_1: CrackDef[] = [
  { d: 'M35.7,0 L28.6,15 L50,42.5',           d1: 0.00 }, // main  TA→K1→P
  { d: 'M50,42.5 L60.7,35 L100,35',            d1: 0.06 }, // branch P→K2→RA
  { d: 'M50,42.5 L39.3,40 L19.6,37.5 L0,40',  d1: 0.08 }, // branch P→K3a→K3b→LA2
  { d: 'M28.6,15 L19.6,8.75 L10.7,3.1',        d1: 0.05, isDetail: true },
];
const FS_CRACKS_2: CrackDef[] = [
  { d: 'M50,42.5 L41.1,57.5 L25,72.5 L33.9,85 L39.3,100', d1: 0.00 }, // main P→K4→Q→K8→BA
  { d: 'M25,72.5 L46.4,70 L71.4,70 L100,72.5',            d1: 0.22 }, // branch Q→K5→K6→RB
  { d: 'M25,72.5 L16.1,76.25 L0,80',                      d1: 0.25 }, // branch Q→K7→LA
  { d: 'M41.1,57.5 L33.9,52.5 L25,51.25',                 d1: 0.20, isDetail: true },
];

const FSO_GOLD = '#c8cdd6';

// 4-layer crack painter: white snap → chasing glow → residual wound → tinted seam
// Stroke widths are scaled for a 100-unit viewBox rendered at ~1280 px wide.
function FSOCrack({ d, d1, isDetail }: CrackDef) {
  if (isDetail) {
    return (
      <motion.path d={d} stroke="white" strokeWidth="0.18" fill="none"
        filter="url(#fso-cgb)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0.65, 0.55] }}
        transition={{ duration: 0.08, delay: d1, ease: 'easeOut' }}
      />
    );
  }
  return (
    <>
      {/* L1 white snap */}
      <motion.path d={d} stroke="white" strokeWidth="0.22" fill="none"
        filter="url(#fso-cgb)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 1.0, 0.95] }}
        transition={{ duration: 0.10, delay: d1, ease: 'easeOut' }}
      />
      {/* L2 chasing glow */}
      <motion.path d={d} stroke={FSO_GOLD} strokeWidth="3.5" fill="none"
        filter="url(#fso-cgw)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0.80, 0.20, 0] }}
        transition={{
          pathLength: { duration: 0.28, delay: d1 + 0.04, ease: 'easeOut' },
          opacity:    { duration: 0.56, delay: d1 + 0.04, times: [0, 0.14, 0.55, 1.0] },
        }}
      />
      {/* L3 residual wound glow */}
      <motion.path d={d} stroke={FSO_GOLD} strokeWidth="2.2" fill="none"
        filter="url(#fso-cgw)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0, 0.46, 0.64, 0.56] }}
        transition={{ duration: 0.62, delay: d1 + 0.14, ease: 'easeOut' }}
      />
      {/* L4 tinted seam */}
      <motion.path d={d} stroke={FSO_GOLD} strokeWidth="0.45" fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0, 0.32, 0.52, 0.45] }}
        transition={{ duration: 0.58, delay: d1 + 0.16, ease: 'easeOut' }}
      />
    </>
  );
}

function FullscreenShatterOverlay({ onDone, onRevealCosmos, onShattering }: {
  onDone: () => void;
  onRevealCosmos?: () => void;
  onShattering?: () => void;
}) {
  const [phase, setPhase] = useState<FSPhase>('pressure');
  const doneRef = useRef(onDone);
  const revealRef = useRef(onRevealCosmos);
  const shatteringRef = useRef(onShattering);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);
  useEffect(() => { revealRef.current = onRevealCosmos; }, [onRevealCosmos]);
  useEffect(() => { shatteringRef.current = onShattering; }, [onShattering]);

  // Advance through phases at the same durations as the summon cutscene.
  // onShattering fires when shards begin flying (cosmos underlight starts).
  // onRevealCosmos fires at the same moment so the cosmos fades in through the gaps.
  useEffect(() => {
    gameAudio.playTutorialShatter();
    let t = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    FS_PHASE_ORDER.slice(1).forEach((p, i) => {
      t += FS_DURS[FS_PHASE_ORDER[i] as FSPhase] ?? 0;
      timers.push(setTimeout(() => {
        setPhase(p);
        if (p === 'shattering') {
          shatteringRef.current?.();
          // Delay cosmos reveal so the yellow flash blazes first,
          // then the star-field fades in through the dying light.
          setTimeout(() => revealRef.current?.(), 620);
        }
      }, t));
    });
    timers.push(setTimeout(() => doneRef.current(), t + 300));
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'gone') return null;

  const phaseIdx  = FS_PHASE_ORDER.indexOf(phase);
  const past = (p: FSPhase) => phaseIdx >= FS_PHASE_ORDER.indexOf(p);

  const isShattering = past('shattering');
  const isFlashing   = phase === 'flashing';
  const BG = 'radial-gradient(ellipse at 50% 43%, #0c0c1f 0%, #040408 100%)';

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">

      {/* ── Pale silver fill behind the shards — dim glow through gaps as they scatter */}
      {isShattering && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 43%, #e8eaf0 0%, #c8cdd6 18%, #9aaabb 45%, #6e7a8c 75%, transparent 100%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.22, 0.22, 0.16, 0.07, 0] }}
          transition={{ duration: 4.0, times: [0, 0.03, 0.18, 0.48, 0.78, 1.0], ease: 'easeOut' }}
        />
      )}

      {/* ── Six crystal shard panels ────────────────────────────────────── */}
      {FS_SHARDS.map((sh, i) => (
        <motion.div key={i} className="absolute inset-0"
          style={{
            clipPath: sh.clip, background: BG,
            transformPerspective: 1400,
            transformStyle: 'preserve-3d',
          }}
          animate={isShattering ? {
            x: [0, `${parseFloat(sh.dx) * 0.08}`, sh.dx],
            y: [0, `${parseFloat(sh.dy) * 0.08}`, sh.dy],
            rotateX: [0, sh.rX], rotateY: [0, sh.rY], rotateZ: [0, sh.rZ],
            opacity: [1, 1, 0.96, 0.66, 0],
            filter: [
              'brightness(1.0)',
              'brightness(1.4) drop-shadow(0 0 6px rgba(251,191,36,0.60))',
              'brightness(2.2) drop-shadow(0 0 12px rgba(251,191,36,0.85))',
              'brightness(4.0) drop-shadow(0 0 20px rgba(251,191,36,0.95))',
              'brightness(7.0) drop-shadow(0 0 28px rgba(255,255,255,0.80))',
            ],
          } : { x: '0%', y: '0%', rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1, filter: 'brightness(1.0)' }}
          transition={isShattering ? {
            duration: 4.5, delay: i * 0.04,
            x:       { times: [0, 0.06, 1.0], ease: ['easeIn', [0.10, 0.70, 0.30, 1.0]] },
            y:       { times: [0, 0.06, 1.0], ease: ['easeIn', [0.10, 0.70, 0.30, 1.0]] },
            rotateX: { ease: 'easeOut' }, rotateY: { ease: 'easeOut' }, rotateZ: { ease: 'easeOut' },
            opacity: { times: [0, 0.08, 0.26, 0.56, 1.0], ease: 'easeInOut' },
            filter:  { times: [0, 0.12, 0.34, 0.60, 0.82], ease: 'easeInOut' },
          } : { duration: 0 }}
        >
          {/* Gold screen-blend transmutation overlay on each shard */}
          {isShattering && (
            <motion.div className="absolute inset-0 pointer-events-none"
              style={{ background: FSO_GOLD, mixBlendMode: 'screen' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0.18, 0.70, 1.00, 0.85] }}
              transition={{ duration: 4.5, times: [0, 0.10, 0.34, 0.58, 0.78, 1.0], ease: 'easeInOut', delay: i * 0.04 }}
            />
          )}
        </motion.div>
      ))}

      {/* ── Crack SVG — four-layer paint, hidden during shattering ──────── */}
      <AnimatePresence>
        {!isShattering && (
          <motion.svg exit={{ opacity: 0, transition: { duration: 0.08 } }}
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100" preserveAspectRatio="none"
          >
            <defs>
              {/* Tight bloom for crisp white fracture line */}
              <filter id="fso-cgb" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="0.25" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {/* Wide glow for chasing + residual layers */}
              <filter id="fso-cgw" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            {/* First crack network — mounts on firstcrack phase, stays visible */}
            {past('firstcrack') && FS_CRACKS_1.map((c, i) => <FSOCrack key={`c1-${i}`} {...c} />)}

            {/* Second crack network — mounts on secondcrack phase */}
            {past('secondcrack') && FS_CRACKS_2.map((c, i) => <FSOCrack key={`c2-${i}`} {...c} />)}

            {/* Ambient junction glow during leaking phase */}
            {past('leaking') && !past('cracking') && (
              <>
                <motion.circle cx="50" cy="42.5" r="6" fill={FSO_GOLD} filter="url(#fso-cgw)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.18, 0.09, 0.22, 0.10, 0.20] }}
                  transition={{ duration: 3.2, ease: 'easeOut', repeat: Infinity, repeatType: 'mirror', delay: 0.4 }}
                />
                <motion.circle cx="50" cy="42.5" r="0.7" fill="white" filter="url(#fso-cgb)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.56, 0.10, 0.76, 0.24, 0.48, 0] }}
                  transition={{ duration: 2.8, ease: 'easeInOut', repeat: Infinity, delay: 0.25 }}
                />
              </>
            )}

            {/* Energy burst at junctions during cracking phase */}
            {past('cracking') && (
              <>
                <motion.circle cx="50" cy="42.5" r="0"
                  fill={FSO_GOLD} filter="url(#fso-cgw)"
                  animate={{ r: 8, opacity: [0, 0.55, 0.22] }}
                  transition={{ duration: 0.70, ease: 'easeOut' }}
                />
                <motion.circle cx="25" cy="72.5" r="0"
                  fill={FSO_GOLD} filter="url(#fso-cgw)"
                  animate={{ r: 6, opacity: [0, 0.45, 0.18] }}
                  transition={{ duration: 0.58, delay: 0.12, ease: 'easeOut' }}
                />
              </>
            )}
          </motion.svg>
        )}
      </AnimatePresence>

      {/* ── Pre-shatter ambient glow build-up ───────────────────────────── */}
      {!isShattering && (
        <motion.div className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: past('firstcrack') ? 0.55 : 0.18 }}
          transition={{ duration: past('firstcrack') ? 0.6 : 0.5, ease: 'easeOut' }}
          style={{ background: 'radial-gradient(ellipse at 50% 42.5%, rgba(251,191,36,0.30) 0%, rgba(251,191,36,0.08) 40%, transparent 68%)' }}
        />
      )}

      {/* Full-panel flash removed — replaced with no-op to keep phase timing intact */}
      {isFlashing && null}
    </div>
  );
}

// ─── Architect Assembly Cinematic ─────────────────────────────────────────────
function ArchitectAssembly({
  affKeys,
  onComplete,
}: {
  affKeys: GemKey[];
  onComplete: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(onComplete, prefersReducedMotion ? 200 : 3800);
    return () => clearTimeout(t);
  }, [onComplete, prefersReducedMotion]);

  const [phase, setPhase] = useState(prefersReducedMotion ? 4 : 0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const timers = [
      setTimeout(() => setPhase(1), 280),
      setTimeout(() => setPhase(2), 1050),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 2600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [prefersReducedMotion]);

  const regions = [
    { label: "The Forge",     top: "7%",  height: 96, bg: "rgba(3,3,12,0.72)", ghostDy: -58, ghostDx: -18 },
    { label: "Hand",          top: "30%", height: 52, bg: "rgba(3,3,12,0.78)", ghostDy: -22, ghostDx: 26 },
    { label: "Storage",       top: "44%", height: 52, bg: "rgba(3,3,12,0.78)", ghostDy: -10, ghostDx: -22 },
    { label: "Affinity Well", top: "57%", height: 78, bg: "rgba(3,3,12,0.78)", ghostDy: 28,  ghostDx: 14 },
    { label: "Status",        top: "79%", height: 48, bg: "rgba(3,3,12,0.80)", ghostDy: 52,  ghostDx: 0  },
  ] as const;

  const linePairs: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[0,3]];
  const centerYs = [14, 34, 50, 63, 83];
  const lineColors = ["rgba(255,255,255,0.18)","rgba(255,255,255,0.14)","rgba(255,255,255,0.16)","rgba(255,255,255,0.14)","rgba(255,255,255,0.12)"];

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      {/* Blueprint label */}
      <motion.div
        className="absolute inset-x-0 flex justify-center"
        style={{ top: "1.5%" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 0.7 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="text-[9px] font-semibold text-indigo-300/70 uppercase tracking-[0.38em]">
          Assembling interface
        </span>
      </motion.div>

      {/* Ghost region outlines — styled to match real GameplayPhase sections */}
      {regions.map((region, i) => (
        <motion.div
          key={region.label}
          className="absolute left-3 right-3 rounded-2xl backdrop-blur-md"
          style={{
            top: region.top,
            height: region.height,
            border: "1px solid rgba(255,255,255,0.10)",
            background: region.bg,
          }}
          initial={{
            opacity: 0,
            y: region.ghostDy,
            x: region.ghostDx,
            scale: 0.93,
          }}
          animate={{
            opacity: phase >= 1 ? (phase >= 2 ? 1 : 0.48) : 0,
            y: phase >= 2 ? 0 : region.ghostDy,
            x: phase >= 2 ? 0 : region.ghostDx,
            scale: phase >= 2 ? 1 : 0.93,
          }}
          transition={
            phase >= 2
              ? {
                  type: "spring" as const,
                  stiffness: 150,
                  damping: 22,
                  delay: i * 0.11,
                  opacity: { duration: 0.25 },
                  scale: { type: "spring", stiffness: 150, damping: 22, delay: i * 0.11 },
                }
              : { duration: 0.4, delay: i * 0.09 }
          }
        >
          {/* Section label — matches real board: text-[10px] text-white/40 font-semibold uppercase tracking-wider */}
          <span className="absolute left-3 top-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {region.label}
          </span>
          {/* Content placeholder bars — hint at real section content */}
          <div className="absolute left-3 right-3 bottom-2.5 flex gap-1.5 opacity-25">
            <div className="h-1 flex-1 rounded-full bg-white/30" />
            <div className="h-1 flex-[2] rounded-full bg-white/20" />
            <div className="h-1 flex-1 rounded-full bg-white/15" />
          </div>
        </motion.div>
      ))}

      {/* Constellation SVG lines between regions */}
      <AnimatePresence>
        {phase === 2 && (
          <motion.svg
            key="constellation"
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
          >
            {linePairs.map(([a, b], i) => (
              <motion.line
                key={i}
                x1={50} y1={centerYs[a]}
                x2={50} y2={centerYs[b]}
                stroke={lineColors[i]}
                strokeWidth="0.35"
                strokeDasharray="1.5 1.0"
                initial={{ strokeOpacity: 0 }}
                animate={{ strokeOpacity: 0.55 }}
                exit={{ strokeOpacity: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
              />
            ))}
          </motion.svg>
        )}
      </AnimatePresence>

      {/* Affinity tokens fly from center to Affinity Well */}
      <AnimatePresence>
        {phase >= 4 && (
          <>
            {affKeys.map((key, i) => {
              const spreadX = (i - 2) * 40;
              return (
                <motion.div
                  key={`fly-${key}`}
                  className="absolute"
                  style={{
                    left: "50%",
                    top: "45%",
                    marginLeft: -16,
                    marginTop: -16,
                  }}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.7 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    x: [0, spreadX, spreadX * 0.4, 0],
                    y: [0, -24, 48, 100],
                    scale: [0.7, 1.1, 0.9, 0.55],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1.05,
                    delay: i * 0.1,
                    times: [0, 0.28, 0.65, 1],
                    ease: "easeInOut",
                  }}
                >
                  <img
                    src={GEM_META[key].image}
                    alt=""
                    className="w-8 h-8 object-contain"
                    draggable={false}
                    style={{
                      filter: `drop-shadow(0 0 8px ${GEM_META[key].glowHex})`,
                    }}
                  />
                </motion.div>
              );
            })}
            {/* Per-affinity well pulse on each token arrival */}
            {affKeys.map((key, i) => (
              <motion.div
                key={`well-pulse-${key}`}
                className="absolute left-3 right-3 rounded-2xl pointer-events-none"
                style={{ top: "57%", height: 78 }}
                initial={{ boxShadow: `0 0 0px ${GEM_META[key].glowHex}00` }}
                animate={{
                  boxShadow: [
                    `0 0 0px ${GEM_META[key].glowHex}00`,
                    `0 0 20px ${GEM_META[key].glowHex}72`,
                    `0 0 6px ${GEM_META[key].glowHex}18`,
                  ],
                }}
                transition={{ duration: 0.85, delay: 0.5 + i * 0.2, times: [0, 0.32, 1] }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Cinematic Phase ──────────────────────────────────────────────────────────
function CinematicPhase({ s, dispatch, onSkip }: { s: TutState; dispatch: React.Dispatch<TAction>; onSkip?: () => void }) {
  const beat = TUTORIAL_BEATS[s.beat];
  const [showLumii, setShowLumii] = useState(false);
  const [panDone, setPanDone] = useState(false);
  const [affIdx, setAffIdx] = useState(-1);
  const [shatterReady, setShatterReady] = useState(false);
  const [cosmosVisible, setCosmosVisible] = useState(false);
  const [shatteringStarted, setShatteringStarted] = useState(false);
  const [affinityNames] = useState(["Flare", "Radiance", "Verdance", "Continuum", "Abyss"]);
  const [affKeys] = useState<GemKey[]>(["ruby", "pearl", "emerald", "sapphire", "onyx"]);

  const SKIP_CINEMATIC_IDS = ["b4_shatter", "b5_affinities", "b5b_affinity_tokens", "b5c_architect_assembly"];
  // Pre-shatter dialogue beats that can also be skipped — excludes b3b_farewell ("take me home" branch)
  const SKIP_PRE_SHATTER_IDS = ["b0_contact", "b1_locate", "b2_lumii_intro", "b3_architect", "b3c_border"];
  const isSkippableBeat = SKIP_CINEMATIC_IDS.includes(beat.id) || SKIP_PRE_SHATTER_IDS.includes(beat.id);
  const [skipVisible, setSkipVisible] = useState(false);
  const skipDelay = hasTutorialSeen() ? 300 : 1500;

  useEffect(() => {
    if (!isSkippableBeat) { setSkipVisible(false); return; }
    setSkipVisible(false);
    const t = setTimeout(() => setSkipVisible(true), skipDelay);
    return () => clearTimeout(t);
  }, [s.beat, isSkippableBeat, skipDelay]);

  const handleSkipCinematic = () => {
    onSkip?.();
  };

  const isContact = beat.id === "b0_contact";
  const isLocate = beat.id === "b1_locate";
  const isShatter = beat.id === "b4_shatter";
  const isAffinityTokens = beat.id === "b5b_affinity_tokens";
  const isArchitectAssembly = beat.id === "b5c_architect_assembly";

  // Beat 1: pan then reveal lumii
  useEffect(() => {
    if (!isLocate) return;
    const t1 = setTimeout(() => setShowLumii(true), 600);
    const t2 = setTimeout(() => { setPanDone(true); }, 1800);
    const t3 = setTimeout(() => { dispatch({ type: "NEXT_BEAT" }); }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isLocate, dispatch]);

  // Reset shatterReady whenever the beat changes
  useEffect(() => { setShatterReady(false); }, [s.beat]);

  // Auto-start shatter when b4_shatter has no dialogue to tap through
  useEffect(() => {
    if (!isShatter || beat.dialogue.length > 0) return;
    const t = setTimeout(() => setShatterReady(true), 420);
    return () => clearTimeout(t);
  }, [isShatter, beat.dialogue.length]);

  // Beat b5b: init affinity token sequence on entry
  useEffect(() => {
    if (!isAffinityTokens) return;
    setAffIdx(0);
  }, [isAffinityTokens]);

  // Tap handler — advances token or exits when all 5 seen
  // Note: dispatch must NOT be called inside a state updater (React 18 concurrent mode).
  const handleAffTap = () => {
    if (affIdx >= 4) {
      dispatch({ type: "NEXT_BEAT" });
    } else {
      setAffIdx(i => i + 1);
    }
  };

  const dlgText = beat.dialogue[s.dlgLine]?.text ?? "";
  const isLastDlg = s.dlgLine >= beat.dialogue.length - 1;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center select-none"
      style={{ background: "radial-gradient(ellipse at 50% 60%, #0a0a1a 0%, #000000 100%)" }}
    >
      {/* Cosmos fades in when shattering starts — veil begins transparent so the
          initial reveal is a bright star-field that gradually settles to dark */}
      {(cosmosVisible || s.beat >= 7) && (
        <motion.div
          className="absolute inset-0"
          style={{ backgroundImage: `url(${backgroundCosmos})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.2, ease: [0.20, 0, 0.10, 1] }}
        >
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: isArchitectAssembly ? 0.38 : 0.60 }}
            transition={{ duration: isArchitectAssembly ? 0.6 : 3.5, ease: 'easeIn' }}
          />
        </motion.div>
      )}

      {/* Soft underlighting — dim cool-white glow from behind the shards.
          Lives at z-15, below the shatter overlay (z-20), so it shines through
          the transparent gaps between the flying shard clip-path regions. */}
      {shatteringStarted && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 15,
            background: 'radial-gradient(ellipse at 50% 43%, rgba(220,224,232,0.9) 0%, rgba(180,190,210,0.7) 18%, rgba(140,158,185,0.5) 38%, rgba(100,120,150,0.25) 62%, transparent 85%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.25, 0.25, 0.18, 0.08, 0] }}
          transition={{ duration: 2.4, times: [0, 0.04, 0.22, 0.52, 0.78, 1.0], ease: 'easeOut' }}
        />
      )}

      {/* Fullscreen shatter animation — only starts after player taps "Welcome to Luminae." */}
      {isShatter && shatterReady && (
        <FullscreenShatterOverlay
          onDone={() => dispatch({ type: "NEXT_BEAT" })}
          onRevealCosmos={() => setCosmosVisible(true)}
          onShattering={() => setShatteringStarted(true)}
        />
      )}

      {/* Architect Assembly cinematic */}
      {isArchitectAssembly && (
        <ArchitectAssembly
          affKeys={affKeys}
          onComplete={() => dispatch({ type: "NEXT_BEAT" })}
        />
      )}

      {/* Affinity token sequence — click-gated, Lumii stays in front at z-30 */}
      {isAffinityTokens && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
          onClick={handleAffTap}
        >
          <AnimatePresence mode="wait">
            {affIdx >= 0 && affIdx < 5 && (
              <motion.div
                key={affIdx}
                className="flex flex-col items-center gap-4 pointer-events-none"
                style={{ transformPerspective: 900 }}
                initial={{ x: -380, rotateY: -90, opacity: 0 }}
                animate={{ x: 0, rotateY: 0, opacity: 1 }}
                exit={{ x: 380, rotateY: 90, opacity: 0 }}
                transition={{ duration: 0.52, ease: [0.22, 1.0, 0.36, 1.0] }}
              >
                <img
                  src={GEM_META[affKeys[affIdx]].image}
                  alt=""
                  className="w-32 h-32 object-contain drop-shadow-[0_0_36px_rgba(255,255,255,0.55)]"
                  draggable={false}
                />
                <motion.span
                  className="text-white font-serif text-3xl tracking-widest"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 }}
                >
                  {affinityNames[affIdx]}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Tap hint */}
          <motion.p
            className="absolute text-white/35 text-xs tracking-widest font-serif"
            style={{ bottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            tap to continue
          </motion.p>
        </div>
      )}

      {/* Lumii orb — slides down during the affinity token sweep so it clears the animation path */}
      <AnimatePresence>
        {(s.beat >= 2 || showLumii) && (
          <motion.div
            initial={isLocate ? { x: 160, opacity: 0 } : { opacity: 0, scale: 0.8 }}
            animate={{
              x: 0,
              opacity: 1,
              scale: 1,
              top: isAffinityTokens ? "70%" : isArchitectAssembly ? "26%" : "50%",
              left: isArchitectAssembly ? "87%" : "50%",
            }}
            transition={isArchitectAssembly ? {
              top:   { type: "spring" as const, stiffness: 100, damping: 22, delay: 2.8 },
              left:  { type: "spring" as const, stiffness: 100, damping: 22, delay: 2.8 },
              x:     { type: "spring" as const, stiffness: 120, damping: 20 },
              opacity: { duration: 0.3 },
              scale: { type: "spring" as const, stiffness: 120, damping: 20 },
            } : { type: "spring", stiffness: 120, damping: 20, delay: isLocate ? 0.3 : 0 }}
            className="absolute z-30"
          >
            <div style={{ transform: "translate(-50%, -50%)" }}>
              <LumiiOrb size={88} excited={s.beat === 2} highlightZone={null} beatKey={s.beat} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogue */}
      {!isLocate && !isAffinityTokens && !isArchitectAssembly && !(isShatter && shatterReady) && (
        <div className="absolute left-0 right-0 z-30 px-6" style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
          <AnimatePresence mode="wait">
            <DialogueBox
              key={`${s.beat}-${s.dlgLine}`}
              lines={beat.dialogue}
              lineIndex={s.dlgLine}
              onTap={() => {
                if (isShatter) {
                  // Tapping "Welcome to Luminae." triggers the unskippable shatter
                  setShatterReady(true);
                } else {
                  dispatch({ type: "NEXT_DLG" });
                }
              }}
              nudge={null}
              mode="listen"
              showOrb={false}
              playerResponse={beat.playerResponse}
              onPlayerResponse={() => dispatch({ type: "PLAYER_RESPONSE" })}
              choices={beat.choices}
              onChoice={(c) => dispatch({ type: "BRANCH_CHOICE", choice: c as "go" | "home" })}
            />
          </AnimatePresence>
        </div>
      )}

      {/* Beat 1 locate: "over here" text */}
      {isLocate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute z-30 text-white/80 font-serif text-xl"
          style={{ right: "10%", top: "50%" }}
        >
          Over here.
        </motion.div>
      )}


      {/* Subtle star field for early beats */}
      {s.beat <= 4 && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 2 + 1,
                height: Math.random() * 2 + 1,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.1,
              }}
              animate={{ opacity: [0.1, 0.6, 0.1] }}
              transition={{ duration: Math.random() * 4 + 2, repeat: Infinity, delay: Math.random() * 3 }}
            />
          ))}
        </div>
      )}

      {/* Skip intro button — fades in after 1.5s, only during skippable cinematic beats */}
      <AnimatePresence>
        {isSkippableBeat && skipVisible && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            onClick={handleSkipCinematic}
            className="absolute right-5 z-50 text-white/40 hover:text-white/80 text-xs font-semibold tracking-widest uppercase transition-colors bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10"
            style={{ top: "calc(20px + env(safe-area-inset-top, 0px))" }}
          >
            Skip intro
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Fast-forward Cinematic ───────────────────────────────────────────────────
function FastForwardCinematic({ s, dispatch }: { s: TutState; dispatch: React.Dispatch<TAction> }) {
  const remaining = FAST_FORWARD_CARDS.filter(id => id !== s.t3choice);
  const [cardStep, setCardStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setCardStep(1), 1200);
    const t2 = setTimeout(() => setCardStep(2), 2600);
    const t3 = setTimeout(() => dispatch({ type: "FF_DONE" }), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [dispatch]);

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: `url(${backgroundCosmos}) center/cover` }}>
      <div className="absolute inset-0 bg-black/70" />
      {/* Blue time-stream */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0, 0.4, 0.6, 0.3, 0] }}
        transition={{ duration: 4, times: [0, 0.2, 0.5, 0.8, 1] }}
        style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.3) 30%, rgba(99,179,237,0.4) 50%, rgba(59,130,246,0.3) 70%, transparent)" }}
      />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white/80 font-serif text-xl text-center px-8"
        >Now I will let the centuries pass.</motion.div>
        <LumiiOrb size={64} excited highlightZone={null} />
        <div className="flex gap-8 mt-4">
          {remaining.map((cardId, idx) => {
            const card = TUTORIAL_CARDS[cardId];
            if (!card) return null;
            return (
              <AnimatePresence key={cardId}>
                {cardStep > idx && (
                  <motion.div
                    initial={{ y: -60, opacity: 0, scale: 0.7 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <TutorialCard card={card} bonuses={s.bonuses} crystals={s.crystals} />
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-[10px] text-emerald-400 font-semibold"
                    >+{card.lumens} Eminence</motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Luminary Phase ───────────────────────────────────────────────────────────
function LuminaryPhase({ s, dispatch }: { s: TutState; dispatch: React.Dispatch<TAction> }) {
  const beat = TUTORIAL_BEATS[s.beat];
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: `url(${backgroundCosmos}) center/cover` }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 flex flex-col items-center gap-6 w-full">
        <LuminarySummonCutscene
          luminaryId="lum_verdant"
          luminaryName="The Verdant Oracle"
          domain="Verdance"
          lumens={2}
          flavor="She reads the future in the rings of trees that have not yet been planted."
          onComplete={() => dispatch({ type: "LUM_DONE" })}
          onSkip={() => dispatch({ type: "LUM_DONE" })}
        />
        <div className="px-6 w-full max-w-sm">
          <AnimatePresence mode="wait">
            <DialogueBox
              key={`lum-${s.dlgLine}`}
              lines={beat.dialogue}
              lineIndex={s.dlgLine}
              onTap={() => dispatch({ type: "NEXT_DLG" })}
              nudge={null}
              mode="listen"
              showOrb={false}
            />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Victory Phase ────────────────────────────────────────────────────────────
function VictoryPhase({ s, dispatch }: { s: TutState; dispatch: React.Dispatch<TAction> }) {
  const beat = TUTORIAL_BEATS[s.beat];
  const [, setLocation] = useLocation();
  const showButtons = s.dlgLine >= beat.dialogue.length - 1;

  useEffect(() => {
    markTutorialSeen();
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: `url(${backgroundCosmos}) center/cover` }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm px-6">
        <LumiiOrb size={80} excited highlightZone={null} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="font-serif text-3xl font-bold text-white mb-1">{s.eminence} Eminence</div>
          <div className="text-white/50 text-sm">Victory through Verdance</div>
        </motion.div>
        <div className="w-full">
          <AnimatePresence mode="wait">
            <DialogueBox
              key={`vic-${s.dlgLine}`}
              lines={beat.dialogue}
              lineIndex={s.dlgLine}
              onTap={() => dispatch({ type: "NEXT_DLG" })}
              nudge={null}
              mode="listen"
              showOrb={false}
            />
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {showButtons && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3 w-full"
            >
              <button
                onClick={() => { clearTutorialProgress(); markTutorialSeen(); setLocation("/"); }}
                className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition-all shadow-lg"
              >Begin a Full Game</button>
              <button
                onClick={() => { clearTutorialProgress(); dispatch({ type: "RESET" }); }}
                className="w-full py-2 rounded-2xl bg-white/8 text-white/60 text-sm hover:bg-white/15 transition-all"
              >Replay Tutorial</button>
              <button
                onClick={() => { clearTutorialProgress(); setLocation("/"); }}
                className="w-full py-2 rounded-xl text-white/40 text-sm hover:text-white/70 transition-all"
              >Return Home</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Tutorial Forge Burst ─────────────────────────────────────────────────────
// Full card-lift animation that matches the real game's cardActionBurst feel:
// dims the board, slides the card from its approximate market slot to center,
// scales + Y-rotates, shows player info + "Forged!", then fades out.
function TutorialForgeBurst({
  animKey,
  cardId,
  lumens,
  name,
}: {
  animKey: number;
  cardId: string;
  lumens: number;
  name: string;
}) {
  const card = TUTORIAL_CARDS[cardId];
  const artUrl = card ? CARD_ART[card.id] : undefined;
  const bonusMeta = card ? GEM_META[card.bonusColor] : null;

  // Card visual — a lightweight card face rendered at full size for the animation
  const CardFace = () => {
    if (!card) return null;
    const bgStyle: React.CSSProperties = artUrl
      ? { backgroundImage: `url(${artUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: `linear-gradient(175deg, #021005 0%, #063020 50%, #020c04 100%)` };
    return (
      <div className="relative rounded-xl overflow-hidden shadow-2xl ring-2 ring-amber-400/60" style={{ width: 112, height: 156, ...bgStyle }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/85" />
        <div className="relative z-10 h-full p-2 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-base font-serif font-bold text-white drop-shadow">{card.lumens > 0 ? card.lumens : ""}</span>
            {bonusMeta && (
              <div className="w-4 h-4 rounded-full ring-1 ring-black/40 overflow-hidden">
                <img src={bonusMeta.image} alt={bonusMeta.name} className="w-full h-full object-contain" draggable={false} />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-[8px] font-semibold text-white drop-shadow line-clamp-2 leading-tight">{card.name}</div>
          </div>
        </div>
        {/* Amber sheen on forge */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.22) 0%, transparent 60%)", mixBlendMode: "screen" }}
          animate={{ opacity: [0, 1, 0.5, 0] }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
      </div>
    );
  };

  return (
    <motion.div
      key={animKey}
      className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 2.2, times: [0, 0.75, 1], ease: "easeIn" }}
    >
      {/* Board dim */}
      <motion.div
        className="absolute inset-0 bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.2, times: [0, 0.12, 0.75, 1] }}
      />

      {/* Radial gold glow at center */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 320, height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(251,191,36,0.28) 0%, transparent 70%)",
        }}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: [0.3, 1.4, 1.1], opacity: [0, 0.9, 0] }}
        transition={{ duration: 1.6, ease: "easeOut" }}
      />

      {/* Card lift: starts from top-center (market zone) → center, scale + rotateY */}
      <motion.div
        className="relative flex flex-col items-center gap-3"
        initial={{ y: -160, scale: 0.55, rotateY: -35, opacity: 0 }}
        animate={{
          y: [null, 0, 0, -40],
          scale: [null, 1.12, 1.08, 0.85],
          rotateY: [null, 0, 6, 0],
          opacity: [null, 1, 1, 0],
        }}
        transition={{
          duration: 2.0,
          times: [0, 0.28, 0.65, 1],
          ease: "easeOut",
        }}
        style={{ perspective: 800 }}
      >
        {/* Player label above card */}
        <motion.div
          className="flex items-center gap-1.5 bg-black/70 rounded-full px-3 py-1 border border-white/10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, -8] }}
          transition={{ duration: 2.0, times: [0, 0.20, 0.65, 1] }}
        >
          <div className="w-4 h-4 rounded-full bg-indigo-700/80 border border-indigo-400/40 flex items-center justify-center">
            <span className="text-[7px] font-bold text-white">Y</span>
          </div>
          <span className="text-[11px] font-semibold text-white/80">You</span>
        </motion.div>

        <CardFace />

        {/* "Forged!" text + eminence */}
        <motion.div
          className="flex flex-col items-center gap-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -10] }}
          transition={{ duration: 2.0, times: [0, 0.22, 0.65, 1], delay: 0.1 }}
        >
          <span className="text-2xl font-serif font-black text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.85)]">
            Forged!
          </span>
          {lumens > 0 && (
            <span className="flex items-center gap-1.5 text-base font-bold text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.7)]">
              +{lumens} Eminence
            </span>
          )}
          <span className="text-[11px] text-white/50 font-medium mt-0.5">{name}</span>
        </motion.div>
      </motion.div>

      {/* Expanding ring accent */}
      <motion.div
        className="absolute rounded-full border border-amber-400/60"
        initial={{ width: 80, height: 80, opacity: 0.8 }}
        animate={{ width: 380, height: 380, opacity: 0 }}
        transition={{ duration: 1.1, ease: "easeOut", delay: 0.1 }}
      />
    </motion.div>
  );
}

// ─── Tutorial Luminary Section ────────────────────────────────────────────────
function TutorialLuminarySection({ beatId: _beatId }: { beatId: string }) {
  return (
    <div className="border border-white/10 rounded-2xl p-3 backdrop-blur-md" style={{ background: "rgba(3,3,12,0.72)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Luminaries</div>
        <div className="text-[9px] text-white/20 italic">Patron cosmic entities</div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 items-start">
        <div className="relative shrink-0">
          <div style={{ width: 112, height: 160, overflow: "hidden", borderRadius: 12 }}>
            <LuminaryPanelArt luminaryId={VERDANCE_LUMINARY_ID} size={160} />
          </div>
          <div className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 40%, transparent 100%)" }}>
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <div className="text-[7px] font-bold text-white/60 uppercase tracking-widest">Verdant Oracle</div>
              <div className="text-[6px] text-white/30 mt-0.5">Verdance affinity</div>
            </div>
          </div>
        </div>
        <div className="shrink-0 rounded-xl border border-white/8 flex items-center justify-center"
          style={{ width: 112, height: 160, background: "rgba(255,255,255,0.02)" }}>
          <div className="text-center px-3">
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 mx-auto mb-2 flex items-center justify-center">
              <span className="text-white/20 text-lg">?</span>
            </div>
            <div className="text-[7px] text-white/15 uppercase tracking-wider font-semibold">Unknown</div>
            <div className="text-[6px] text-white/10 mt-0.5">Each game differs</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Gameplay Phase ───────────────────────────────────────────────────────────
function GameplayPhase({ s, dispatch }: { s: TutState; dispatch: React.Dispatch<TAction> }) {
  const beat = TUTORIAL_BEATS[s.beat];
  const beatId = beat.id;
  const subStep = s.subStep;
  const [menuOpen, setMenuOpen] = useState(false);

  // Card action sheet
  const [selectedCardData, setSelectedCardData] = useState<{
    card: TutorialCardData;
    forgeEnabled: boolean;
    reserveEnabled: boolean;
    onForge?: () => void;
    onReserve?: () => void;
  } | null>(null);

  // Harness flash — green border pulse on AffinityWell after Harness
  const [harnessFlash, setHarnessFlash] = useState(false);
  const harnessFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerHarnessFlash = () => {
    if (harnessFlashTimerRef.current) clearTimeout(harnessFlashTimerRef.current);
    setHarnessFlash(true);
    harnessFlashTimerRef.current = setTimeout(() => setHarnessFlash(false), 800);
  };
  useEffect(() => () => { if (harnessFlashTimerRef.current) clearTimeout(harnessFlashTimerRef.current); }, []);

  // ── Burst animation state ──────────────────────────────────────────────────
  const [purchaseBurst, setPurchaseBurst] = useState<{ key: number; lumens: number; name: string; cardId: string } | null>(null);
  const purchaseBurstKeyRef = useRef(0);
  const [gemBurst, setGemBurst] = useState<{ key: number; gems: GemKey[] } | null>(null);
  const gemBurstKeyRef = useRef(0);
  const [forgeJustHappened, setForgeJustHappened] = useState(false);

  useEffect(() => {
    const trigger = s.animTrigger;
    if (!trigger) return;
    if (trigger.type === "forge") {
      purchaseBurstKeyRef.current += 1;
      setPurchaseBurst({ key: purchaseBurstKeyRef.current, lumens: trigger.lumens, name: trigger.name, cardId: trigger.cardId });
      setTimeout(() => setPurchaseBurst(null), 2400);
      setForgeJustHappened(true);
      setTimeout(() => setForgeJustHappened(false), 3600);
    } else if (trigger.type === "harvest") {
      const { gems } = trigger;
      gemBurstKeyRef.current += 1;
      const key = gemBurstKeyRef.current;
      setGemBurst({ key, gems });
      const burstDuration = (gems.length - 1) * 0.78 + 1.25 + 0.5 + 0.05;
      setTimeout(() => setGemBurst(null), (burstDuration + 0.35) * 1000);
    }
  }, [s.animTrigger]);

  const isDimmed = beat.mode === "listen" || beat.mode === "look";
  const isWellEnabled = (beat.mode === "act" || beat.mode === "semiOpen") &&
    ["b8_first_harness", "b11_forge_reserved", "b12_tier2", "b13_tier3", "b16_final_forge"].includes(beatId) &&
    !(beatId === "b11_forge_reserved" && subStep >= 1) &&
    !(beatId === "b12_tier2" && subStep === 0) &&
    !(beatId === "b16_final_forge" && subStep >= 1);

  const isStorageHighlighted = beatId === "b9b_forge_complete" || beatId === "b14_win_condition";
  const isEminenceHighlighted = beatId === "b14_win_condition";
  const isHandHighlighted = beatId === "b10b_reserve_granted";

  // Flux column locked until Singularity is introduced at b12_tier2
  const fluxLocked = s.beat < (BEAT_INDEX["b12_tier2"] ?? 14);

  const lumiiTarget = beat.lumiiZone;
  const LUMII_ZONE_POS: Record<string, { x: string; y: string }> = {
    "market-t1":      { x: "87%", y: "26%" },
    "market-t2":      { x: "87%", y: "20%" },
    "market-t3":      { x: "87%", y: "14%" },
    "card-cost":      { x: "78%", y: "40%" },
    // "well" was at 12% which caused Lumii to overlap the top-[54px] dialogue box
    // when cameraFocus === "well" — moved down to 24% to clear it on all screen sizes
    well:             { x: "87%", y: "24%" },
    hand:             { x: "13%", y: "20%" },
    storage:          { x: "13%", y: "20%" },
    eminence:         { x: "88%", y: "20%" },
    "discounted-tab": { x: "13%", y: "20%" },
    "needed-tab":     { x: "13%", y: "20%" },
    "top-center":     { x: "50%", y: "18%" },
    center:           { x: "50%", y: "38%" },
    luminary:         { x: "50%", y: "28%" },
  };
  const lumiiPos = LUMII_ZONE_POS[lumiiTarget] ?? { x: "88%", y: "88%" };

  const isActMode = beat.mode === "act" || beat.mode === "semiOpen";
  const totalCrystals = Object.values(s.crystals).reduce((a, b) => a + b, 0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const cameraFocus: "market" | "well" | "storage" = (() => {
    if (beatId === "b8_first_harness") return "well";
    if (beatId === "b11_forge_reserved" && subStep === 0) return "well";
    if (beatId === "b12_tier2" && subStep === 1) return "well";
    if (beatId === "b16_final_forge" && subStep === 0) return "well";
    if (beatId === "b9b_forge_complete" || beatId === "b14_win_condition") return "storage";
    if (beatId === "b10b_reserve_granted") return "storage";
    return "market";
  })();

  // Close card sheet on beat/subStep change
  useEffect(() => {
    setSelectedCardData(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatId, subStep]);

  // Auto-scroll (camera is programmatic)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (cameraFocus === "well") {
      container.scrollTo({ top: maxScroll, behavior: "smooth" });
    } else {
      container.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [beatId, subStep, cameraFocus]);

  // Lock scroll (camera is programmatic)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const prevent = (e: Event) => e.preventDefault();
    container.addEventListener("wheel", prevent, { passive: false });
    container.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      container.removeEventListener("wheel", prevent);
      container.removeEventListener("touchmove", prevent);
    };
  }, []);

  // Card tap → open action sheet
  const handleCardTap = (
    card: TutorialCardData,
    forgeEnabled: boolean,
    reserveEnabled: boolean,
    onForge?: () => void,
    onReserve?: () => void,
  ) => { setSelectedCardData({ card, forgeEnabled, reserveEnabled, onForge, onReserve }); };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Cosmos background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url(${backgroundCosmos})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        animation: "cosmic-breathe 12s ease-in-out infinite",
      }} />
      <div className="absolute inset-0 bg-black/55 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" style={{
        background:
          "radial-gradient(ellipse 55% 35% at 100% 0%,   #3D6BFF0F 0%, transparent 70%)," +
          "radial-gradient(ellipse 45% 30% at 0%   100%, #FF5A3C0C 0%, transparent 70%)," +
          "radial-gradient(ellipse 40% 28% at 0%   0%,   #7B1FA20C 0%, transparent 65%)," +
          "radial-gradient(ellipse 42% 30% at 100% 100%, #2ECC710B 0%, transparent 65%)",
      }} />
      {isDimmed && <div className="absolute inset-0 bg-black/30 z-20 pointer-events-none" />}

      {/* Header */}
      <header className="shrink-0 z-30 flex items-center justify-between px-4 py-2 border-b border-white/10 backdrop-blur-md" style={{ background: "rgba(3,3,12,0.82)" }}>
        <div className="flex items-center gap-2">
          <div className="flex flex-col leading-none">
            <span className="text-sm font-serif font-bold text-indigo-300 tracking-wide">Luminae</span>
            <span className="text-[9px] text-white/35 tracking-widest">Tutorial</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <LumiiOrb size={22} excited={isActMode} highlightZone={null} />
            <span className="text-[10px] text-white/50 font-medium">Lumii</span>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center justify-center w-7 h-7 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
            aria-label="Tutorial menu"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <span className="text-base leading-none font-bold tracking-tighter">···</span>}
          </button>
        </div>
      </header>

      {/* ── Tutorial menu drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="menu-backdrop"
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              key="menu-drawer"
              className="absolute top-[48px] right-3 z-50 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
              style={{ background: "rgba(8,8,24,0.96)", minWidth: 196 }}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="px-3 pt-2.5 pb-1">
                <span className="text-[9px] text-white/30 uppercase tracking-widest font-semibold">Tutorial</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  clearTutorialProgress();
                  dispatch({ type: "RESET" });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/75 hover:bg-white/8 hover:text-white transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                Replay from beginning
              </button>
              <div className="h-px bg-white/8 mx-3" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/40 hover:bg-white/8 hover:text-white/60 transition-all"
              >
                <X className="h-3.5 w-3.5 shrink-0" />
                Close menu
              </button>
              <div className="h-2" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Board content area ───────────────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-3 flex flex-col gap-3 pb-4">
          <TutorialLuminarySection beatId={beatId} />
          <div className="border border-white/10 rounded-2xl p-3 backdrop-blur-md" style={{ background: "rgba(3,3,12,0.72)" }}>
            <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2">The Forge</div>
            <ScriptedMarket s={s} dispatch={dispatch} beatId={beatId} subStep={subStep} onCardTap={handleCardTap} />
          </div>
          <AffinityWell s={s} dispatch={dispatch} beatId={beatId} subStep={subStep} wellEnabled={isWellEnabled}
            fluxLocked={fluxLocked} harnessFlash={harnessFlash} onHarnessFlash={triggerHarnessFlash} />
          {(s.reserved.length > 0 || s.forged.length > 0) && (
            <>
              {s.reserved.length > 0 && (
                <div className={isHandHighlighted ? "ring-1 ring-amber-400/50 rounded-2xl" : ""}>
                  <PlayerHand s={s} dispatch={dispatch} beatId={beatId} subStep={subStep} onCardTap={handleCardTap} />
                </div>
              )}
              <PlayerStorage s={s} highlighted={isStorageHighlighted} />
            </>
          )}
        </div>
      </div>

      {/* ── Pinned Player Panel ────────────────────────────────────────── */}
      <motion.div
        className={`shrink-0 z-20 border-t px-3 pt-2 backdrop-blur-md transition-all ${
          isEminenceHighlighted ? "border-amber-400/60" : isActMode ? "border-indigo-500/40" : "border-white/10"
        }`}
        animate={isEminenceHighlighted
          ? { boxShadow: ["0 0 18px rgba(251,191,36,0.17)", "0 0 22px rgba(251,191,36,0.28)", "0 0 18px rgba(251,191,36,0.17)"] }
          : isActMode ? { boxShadow: "0 0 12px rgba(99,102,241,0.20)" } : { boxShadow: "none" }
        }
        transition={isEminenceHighlighted ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
        style={{ background: "rgba(3,3,12,0.80)", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="w-[22px] h-[22px] rounded-full bg-indigo-700/70 border border-indigo-400/40 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-white">Y</span>
            </div>
            {isActMode && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />}
            <span className="text-xs font-semibold text-white truncate">You</span>
            {isActMode && (
              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded-full shrink-0">your turn</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-baseline gap-1">
              <span className="font-serif font-black text-lg text-white leading-none">{totalCrystals}</span>
              <span className="text-[10px] text-white/40">Affinity</span>
            </span>
            <div className="inline-flex items-center gap-1 rounded-md px-1 py-0.5">
              <motion.span key={s.eminence} initial={{ scale: 1.4, color: "#a5b4fc" }} animate={{ scale: 1, color: "#818cf8" }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="font-serif font-black text-lg leading-none">{s.eminence}</motion.span>
              <Sparkles className="h-3 w-3 text-indigo-400" />
            </div>
          </div>
        </div>
        <div className="flex gap-1.5">
          {ALL_GEMS.map(gem => {
            const meta = GEM_META[gem];
            const held = s.crystals[gem] ?? 0;
            const bonus = gem !== "flux" ? (s.bonuses[gem] ?? 0) : 0;
            const reservedCount = gem === "flux" ? s.reserved.length : 0;
            const hasContent = gem === "flux" ? (held > 0 || reservedCount > 0) : (held > 0 || bonus > 0);
            return (
              <div key={gem} className="flex-1 min-h-[72px] flex flex-col items-center gap-0.5 rounded-lg relative overflow-hidden pt-1.5 pb-1.5"
                style={{
                  background: hasContent ? `linear-gradient(180deg, #060611 0%, ${meta.hex}33 100%)` : "linear-gradient(180deg, #07070b 0%, #0e0e14 100%)",
                  border: `1px solid ${hasContent ? meta.hex + "AA" : meta.hex + "22"}`,
                  boxShadow: hasContent ? `inset 0 0 14px ${meta.hex}22, 0 0 8px ${meta.hex}33` : "none",
                }}>
                {hasContent && <div className="absolute inset-x-0 top-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${meta.glowHex}AA, transparent)` }} />}
                <div className="flex items-center gap-0.5 justify-center">
                  <span className="text-[7px] font-semibold tracking-wide leading-none" style={{ color: meta.glowHex }}>{meta.shortName}</span>
                  <MiniGem gem={gem} size={7} />
                </div>
                <span className="text-2xl font-black leading-none tracking-tight"
                  style={{ color: hasContent ? "#fff" : meta.hex + "40", textShadow: hasContent ? `0 0 10px ${meta.glowHex}` : "none" }}
                >{held}</span>
                {gem !== "flux" && bonus > 0 && <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>+{bonus}</span>}
                {gem === "flux" && reservedCount > 0 && <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>{reservedCount}r</span>}
              </div>
            );
          })}
        </div>
      </motion.div>


      {/* Floating Lumii — moves between zones, bounces to draw attention */}
      {(() => {
        const hintVisible = isActMode && s.dlgLine >= beat.dialogue.length - 1;
        const lumiiClickable = hintVisible && s.dlgLine < beat.dialogue.length;
        // Dart to top-right corner while burst animations are playing
        const burstActive = !!(purchaseBurst || gemBurst);
        const effectiveLumiiPos = burstActive ? { x: "90%", y: "7%" } : lumiiPos;
        // Beats where dialogue floats beside Lumii instead of fixed at bottom
        const CARD_DLG_BEATS = new Set(["b6_forge_appears", "b7_artifact_cost"]);
        const showFloatingDlg = CARD_DLG_BEATS.has(beatId) && s.dlgLine < beat.dialogue.length;
        // Bubble goes to the opposite side from Lumii so it doesn't clip off-screen
        const lumiiIsLeft = parseFloat(effectiveLumiiPos.x) < 50;
        // Excited bounce: action hint pending OR Lumii just celebrated a forge
        const shouldExcitedBounce = hintVisible || forgeJustHappened;
        // Dialogue-line excited state: true when the current line has excited:true
        const currentLineExcited = beat.dialogue[s.dlgLine]?.excited ?? false;
        return (
          <motion.div
            animate={{ left: effectiveLumiiPos.x, top: effectiveLumiiPos.y }}
            transition={
              burstActive
                ? { type: "spring", stiffness: 260, damping: 22 }
                : { type: "spring", stiffness: 80, damping: 18 }
            }
            className="fixed z-[60] pointer-events-none"
          >
            <div style={{ transform: "translate(-50%, -50%)" }}>
            {/* Speech bubble anchored to Lumii for card-explanation beats */}
            {showFloatingDlg && (
              <div
                className="absolute pointer-events-auto"
                style={lumiiIsLeft
                  ? { left: 36, top: -64, width: 216 }
                  : { right: 36, top: -64, width: 216 }
                }
              >
                <AnimatePresence mode="wait">
                  <DialogueBox
                    key={`float-${beatId}-${s.dlgLine}`}
                    lines={beat.dialogue}
                    lineIndex={s.dlgLine}
                    onTap={() => {
                      if (s.nudge) dispatch({ type: "NUDGE", msg: null });
                      else dispatch({ type: "NEXT_DLG" });
                    }}
                    nudge={s.nudge}
                    mode={beat.mode}
                    showOrb={false}
                  />
                </AnimatePresence>
              </div>
            )}
            {/* Orb: excited bounce when action pending or forge just fired; gentle float otherwise */}
            <motion.div
              animate={shouldExcitedBounce
                ? { y: [0, -22, 3, -15, 1, -8, 0, 0, 0] }
                : { y: [0, -6, 0] }
              }
              transition={shouldExcitedBounce
                ? {
                    duration: 2.0,
                    repeat: Infinity,
                    repeatDelay: 0.8,
                    times: [0, 0.12, 0.24, 0.34, 0.44, 0.54, 0.64, 0.82, 1],
                    ease: "easeOut",
                  }
                : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <div
                className={lumiiClickable ? "pointer-events-auto cursor-pointer active:scale-90 transition-transform" : ""}
                onClick={lumiiClickable ? (e) => { e.stopPropagation(); dispatch({ type: "PLAYER_RESPONSE" }); } : undefined}
              >
                <LumiiOrb size={48} excited={isActMode || forgeJustHappened || currentLineExcited} highlightZone={null} beatKey={beatId} pointing={beat.lumiiPointer} />
              </div>
            </motion.div>
            </div>
          </motion.div>
        );
      })()}

      {/* ── Card Action Sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedCardData && (
          <TutorialCardSheet
            card={selectedCardData.card}
            bonuses={s.bonuses}
            crystals={s.crystals}
            viewMode={s.view}
            wellSel={s.wellSel}
            forgeEnabled={selectedCardData.forgeEnabled}
            reserveEnabled={selectedCardData.reserveEnabled}
            onForge={selectedCardData.onForge ? () => { setSelectedCardData(null); selectedCardData.onForge!(); } : undefined}
            onReserve={selectedCardData.onReserve ? () => { setSelectedCardData(null); selectedCardData.onReserve!(); } : undefined}
            onClose={() => setSelectedCardData(null)}
          />
        )}
      </AnimatePresence>

      {/* Dialogue box */}
      {s.dlgLine < beat.dialogue.length && !["b6_forge_appears", "b7_artifact_cost"].includes(beatId) && (
        <div
          className="fixed left-0 right-0 z-50 px-4"
          style={cameraFocus === "well"
            ? { top: "calc(54px + env(safe-area-inset-top, 0px))" }
            : { bottom: "calc(160px + env(safe-area-inset-bottom, 0px))" }
          }
        >
          <AnimatePresence mode="wait">
            <DialogueBox
              key={`${beatId}-${s.dlgLine}-${s.nudge}`}
              lines={beat.dialogue}
              lineIndex={s.dlgLine}
              onTap={() => {
                if (s.nudge) dispatch({ type: "NUDGE", msg: null });
                else dispatch({ type: "NEXT_DLG" });
              }}
              nudge={s.nudge}
              mode={beat.mode}
              showOrb={false}
              playerResponse={beat.playerResponse}
              onPlayerResponse={() => dispatch({ type: "PLAYER_RESPONSE" })}
            />
          </AnimatePresence>
        </div>
      )}

      {/* ── Forge Burst Overlay — full card-lift animation ─────────────── */}
      <AnimatePresence>
        {purchaseBurst && (
          <TutorialForgeBurst
            animKey={purchaseBurst.key}
            cardId={purchaseBurst.cardId}
            lumens={purchaseBurst.lumens}
            name={purchaseBurst.name}
          />
        )}
      </AnimatePresence>

      {/* ── Gem Pickup Burst Overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {gemBurst && (() => {
          const count = gemBurst.gems.length;
          const spacing = 74;
          const offset = ((count - 1) / 2) * spacing;
          const burstDuration = (count - 1) * 0.78 + 1.25 + 0.5 + 0.05;
          return (
            <motion.div
              key={gemBurst.key}
              className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="absolute inset-0 bg-black/35"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
              />
              <div className="relative h-72 w-[18rem]">
                {gemBurst.gems.map((gem, index) => {
                  const x = index * spacing - offset;
                  const delay = index * 0.78 + 0.05;
                  return (
                    <motion.div
                      key={`${gemBurst.key}-${gem}-${index}`}
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0, rotateY: 0, scale: 0.4, x: 0, y: 64 }}
                      animate={{
                        opacity: [0, 0, 1, 1, 0],
                        rotateY: [0, 180, 360, 540, 720],
                        scale: [0.4, 0.68, 1.12, 1.02, 0.9],
                        x: [0, x * 0.35, x * 0.95, x, x],
                        y: [64, 18, 0, -6, -18],
                      }}
                      transition={{ duration: 1.25, delay, times: [0, 0.18, 0.46, 0.74, 1] }}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="rounded-full bg-black/50 p-2 shadow-[0_0_24px_rgba(255,255,255,0.2)]">
                          <MiniGem gem={gem} size={52} />
                        </div>
                        <span
                          className="text-xs font-bold uppercase tracking-widest"
                          style={{ color: GEM_META[gem].glowHex }}
                        >
                          {GEM_META[gem].shortName}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <motion.div
                className="fixed left-0 right-0 flex items-center justify-center"
                style={{ bottom: "22%" }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: [0, 1, 1, 0], y: [16, 0, 0, -8] }}
                transition={{ duration: burstDuration, times: [0, 0.15, 0.75, 1] }}
              >
                <span className="text-sm font-semibold text-white/80 tracking-widest uppercase">
                  Affinities gathered
                </span>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function TutorialDirector({ startBeat }: { startBeat?: number }) {
  const clampedBeat = startBeat != null
    ? Math.max(0, Math.min(startBeat, TUTORIAL_BEATS.length - 1))
    : hasTutorialSeen() ? BEAT_INDEX["b4_shatter"] : 0;
  const initState = clampedBeat > 0
    ? { ...INIT_STATE, beat: clampedBeat }
    : INIT_STATE;
  const [s, dispatch] = useReducer(reducer, initState);
  const [, navigate] = useLocation();
  const [skipTransition, setSkipTransition] = useState(false);
  const beatRef = useRef(s.beat);
  useEffect(() => { beatRef.current = s.beat; }, [s.beat]);
  const skipTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { skipTimersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (s.beat >= TUTORIAL_BEATS.length - 1) {
      clearTutorialProgress();
      markTutorialComplete();
    } else if (s.beat > 0 && TUTORIAL_BEATS[s.beat]?.id !== "b3b_farewell") {
      saveTutorialProgress(s.beat);
    }
    if (s.beat >= BEAT_INDEX["b6_forge_appears"]) {
      markIntroSeen(BEAT_INDEX["b6_forge_appears"]);
    }
  }, [s.beat]);

  useEffect(() => {
    if (s.navigateTo) {
      clearTutorialProgress();
      markTutorialSeen();
      navigate(s.navigateTo);
    }
  }, [s.navigateTo, navigate]);

  const handleSkip = () => {
    if (skipTransition) return;
    setSkipTransition(true);
    const targetIdx = BEAT_INDEX["b6_forge_appears"];
    const t1 = setTimeout(() => {
      const steps = Math.max(0, targetIdx - beatRef.current);
      for (let i = 0; i < steps; i++) {
        dispatch({ type: "NEXT_BEAT" });
      }
    }, 150);
    const t2 = setTimeout(() => setSkipTransition(false), 360);
    skipTimersRef.current = [t1, t2];
  };

  const beat = TUTORIAL_BEATS[s.beat];
  if (!beat) return null;

  const devNav = import.meta.env.DEV
    ? <DevTutorialNav beatIndex={s.beat} dispatch={dispatch} />
    : null;

  const skipOverlay = (
    <AnimatePresence>
      {skipTransition && (
        <motion.div
          key="skip-transition"
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none"
          style={{ background: "rgba(0,0,0,0.92)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18, ease: "easeIn" } }}
          transition={{ duration: 0.20, ease: "easeOut" }}
        >
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: [0, 0.65, 0.65] }}
            transition={{ duration: 0.55, times: [0, 0.25, 1], ease: "easeOut" }}
            className="text-white/60 text-xs tracking-[0.22em] uppercase font-semibold font-serif"
          >
            Resuming tutorial…
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const isCinematicPhase = s.beat <= 9;

  // Determine which gameplay sub-component to render (beats 10+)
  // Sub-phase key: b15 and b17 get their own keys so a nested AnimatePresence
  // can blur-out on exit before the next phase blurs in.
  const subPhaseKey = beat.id === "b15_fast_forward"
    ? "ff"
    : beat.id === "b17_luminary"
      ? "luminary"
      : beat.id === "b18_victory"
        ? "victory"
        : "gameplay-main";

  const subPhaseContent = beat.id === "b15_fast_forward"
    ? <FastForwardCinematic s={s} dispatch={dispatch} />
    : beat.id === "b17_luminary"
      ? <LuminaryPhase s={s} dispatch={dispatch} />
      : beat.id === "b18_victory"
        ? <VictoryPhase s={s} dispatch={dispatch} />
        : <GameplayPhase s={s} dispatch={dispatch} />;

  // Single AnimatePresence so Framer Motion can coordinate the cinematic exit
  // before the gameplay enter — mode="wait" guarantees the old key exits fully
  // before the new key mounts.
  return (
    <>
      <AnimatePresence mode="wait">
        {isCinematicPhase ? (
          <motion.div
            key="cinematic"
            className="fixed inset-0"
            initial={false}
            exit={{ opacity: 0, filter: "blur(14px)", transition: { duration: 0.42, ease: "easeIn" as const } }}
          >
            <CinematicPhase s={s} dispatch={dispatch} onSkip={handleSkip} />
          </motion.div>
        ) : (
          <motion.div
            key="gameplay"
            className="fixed inset-0"
            initial={{ opacity: 0, filter: "blur(14px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            {/* Nested AnimatePresence so b15→b16 and b17→b18 also blur-out/blur-in.
                initial={false} suppresses the inner enter blur on the first mount so it
                doesn't stack on top of the outer cinematic→gameplay blur. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={subPhaseKey}
                className="fixed inset-0"
                initial={{ opacity: 0, filter: "blur(14px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(14px)", transition: { duration: 0.42, ease: "easeIn" as const } }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                {subPhaseContent}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      {skipOverlay}{devNav}
    </>
  );
}
