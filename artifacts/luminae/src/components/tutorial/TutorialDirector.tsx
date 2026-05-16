import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { DevTutorialNav } from "./DevTutorialNav";
import { saveTutorialProgress, saveTutorialProgressId, clearTutorialProgress, markTutorialSeen, hasTutorialSeen, markTutorialComplete, markIntroSeen } from "@/lib/tutorialProgress";
import { Sparkles, ChevronUp, RotateCcw, X, Lock, Volume2, VolumeX, Hammer, Droplets } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion, useMotionValue, animate as fmAnimate } from "framer-motion";
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
import { CardBackTier1, CardBackTier2, CardBackTier3 } from "@/components/ArtifactCardBack";
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
                d={`M ${(size * 0.58).toFixed(1)} 0 L ${(size * 0.78).toFixed(1)} 0`}
                stroke="rgba(255,255,255,0.85)"
                strokeWidth={2.2}
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1, strokeOpacity: [0.70, 1, 0.70] }}
                transition={{
                  pathLength: { duration: 0.24, ease: "easeOut" },
                  strokeOpacity: { duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
                }}
              />
              <motion.g
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              >
                <polygon
                  points={`${(size * 0.98).toFixed(1)},0 ${(size * 0.78).toFixed(1)},${-(size * 0.13).toFixed(1)} ${(size * 0.78).toFixed(1)},${(size * 0.13).toFixed(1)}`}
                  fill="rgba(255,255,255,0.85)"
                  filter="drop-shadow(0 0 4px rgba(255,255,255,0.5))"
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
  // Once any interactive button is pressed, lock out all further clicks so a
  // fast double-tap during the AnimatePresence exit animation can't fire a
  // second action (e.g. "Take me home" after the user already picked "Go").
  const interactedRef = useRef(false);
  // Debounce ref for body taps — prevents two NEXT_DLG dispatches from a fast
  // double-tap before React has time to re-render and update canTap.
  const tappingRef = useRef(false);

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
        className={`bg-slate-950/95 border border-white/10 rounded-2xl px-5 py-4 max-w-sm mx-auto shadow-2xl backdrop-blur-md select-none ${canTap ? "cursor-pointer active:scale-[0.985]" : ""}`}
        onClick={canTap ? () => {
          if (tappingRef.current) return;
          tappingRef.current = true;
          setTimeout(() => { tappingRef.current = false; }, 380);
          gameAudio.playButtonSelect();
          onTap();
        } : undefined}
        style={{ boxShadow: nudge ? "0 0 0 2px rgba(251,191,36,0.5), 0 8px 32px rgba(0,0,0,0.8)" : "0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.9)", transition: "transform 0.08s ease" }}
      >
        <div className="flex items-start gap-3">
          {showOrb && <LumiiOrb size={32} excited={!!nudge} highlightZone={null} muted={muted} />}
          <div className="flex-1">
            <p className="text-sm text-white/90 leading-relaxed">{text}</p>
            {hintText && (
              <motion.p
                animate={{ opacity: [0.28, 0.60, 0.28] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="text-[10px] text-white/35 mt-2"
              >{hintText}</motion.p>
            )}
          </div>
        </div>
        {showResponseBtn && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            onClick={() => { if (interactedRef.current) return; interactedRef.current = true; gameAudio.playButtonConfirm(); onPlayerResponse!(); }}
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
                onClick={() => { if (interactedRef.current) return; interactedRef.current = true; gameAudio.playButtonConfirm(); onChoice!(c.value); }}
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

// ─── CostCallout ──────────────────────────────────────────────────────────────
// Animated SVG rounded-rect that draws itself around the cost pip row, then
// pulses with an amber glow. Used on b7_artifact_cost / b7b_cost_bridge beats.
function CostCallout() {
  const [drawn, setDrawn] = useState(false);
  const perimeter = 284; // approximate for rx=7, w=104, h=38
  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20"
      width={112}
      height={160}
      style={{ overflow: "visible" }}
    >
      {/* Glow fill behind the cost row */}
      <motion.rect
        x={4} y={117} width={104} height={39} rx={7}
        fill="rgba(251,191,36,0.08)"
        stroke="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: drawn ? [0.4, 1, 0.4] : 1 }}
        transition={drawn
          ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.25, delay: 0.35 }
        }
      />
      {/* Draw-in stroke */}
      <motion.rect
        x={4} y={117} width={104} height={39} rx={7}
        fill="none"
        stroke="#fbbf24"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeDasharray={perimeter}
        initial={{ strokeDashoffset: perimeter, opacity: 0 }}
        animate={drawn
          ? { strokeDashoffset: 0, opacity: [1, 0.45, 1] }
          : { strokeDashoffset: 0, opacity: 1 }
        }
        transition={drawn
          ? {
              opacity: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
              strokeDashoffset: { duration: 0 },
            }
          : {
              strokeDashoffset: { duration: 0.7, ease: "easeInOut" },
              opacity: { duration: 0.05 },
            }
        }
        onAnimationComplete={() => { if (!drawn) setDrawn(true); }}
        style={{ filter: "drop-shadow(0 0 5px rgba(251,191,36,0.8))" }}
      />
    </svg>
  );
}

// ─── TutorialCard ─────────────────────────────────────────────────────────────
function TutorialCard({
  card,
  bonuses,
  crystals,
  highlighted,
  foreground,
  costHighlight,
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
  costHighlight?: boolean;
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
      animate={{ scale: 1, y: 0 }}
      whileTap={onTap && !forged ? { scale: 0.94 } : undefined}
      onClick={onTap && !forged ? onTap : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`relative shrink-0 ${onTap && !forged ? "cursor-pointer" : ""}`}
      style={{ width: 112, height: 160 }}
    >
      {foreground && (
        <div className="absolute inset-0 rounded-xl border-2 border-white/80 pointer-events-none z-10" />
      )}
      {costHighlight && <CostCallout />}
      <div
        className={`absolute inset-0 rounded-xl overflow-hidden shadow-xl ${highlighted ? "ring-2 ring-amber-400 shadow-amber-400/30" : "ring-1 ring-white/10"} ${forged ? "opacity-40 grayscale" : ""} ${impossible ? "opacity-50" : ""}`}
        style={bgStyle}
      >
        {foreground && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 100% 90% at 50% 50%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 55%, transparent 100%)",
              zIndex: 5,
            }}
            animate={{ opacity: [0.9, 0, 0.9] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
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

// ─── Landscape detection ──────────────────────────────────────────────────────
// Fires when the device is in landscape orientation with a short viewport
// (typical phone landscape: e.g. 844×390). Used to compact the player panel
// and reposition the dialogue box so nothing clips off-screen.
function useIsShortLandscape() {
  const [is, setIs] = useState(
    () => typeof window !== "undefined" &&
      window.matchMedia("(orientation: landscape) and (max-height: 520px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape) and (max-height: 520px)");
    const handler = (e: MediaQueryListEvent) => setIs(e.matches);
    // `addEventListener` is available in all modern browsers (Safari 14+,
    // Chrome 39+, Firefox 55+). Older Safari used the now-deprecated
    // `addListener` — fall back to it so the hook works without crashing.
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      mq.addListener(handler);
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      return () => mq.removeListener(handler);
    }
  }, []);
  return is;
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
      <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2">
        Affinity Well
        <Droplets className="h-3 w-3 text-cyan-400/70 shrink-0" />
      </div>
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
  const BackComponent = tier === 3 ? CardBackTier3 : tier === 2 ? CardBackTier2 : CardBackTier1;
  const BADGE_COLORS: Record<number, string> = { 1: "#3a6a5a", 2: "#2a4a6a", 3: "#5a3a6a" };
  const badgeColor = BADGE_COLORS[tier] ?? "#555";
  return (
    <div className="flex flex-col items-center shrink-0" style={{ gap: 6 }}>
      <div className="relative shrink-0" style={{ width: 120, height: 168 }}>
        <div className="absolute rounded-xl overflow-hidden border border-white/5"
          style={{ left: 8, top: 8, width: 112, height: 160, opacity: 0.28 }}>
          <BackComponent />
        </div>
        <div className="absolute rounded-xl overflow-hidden border border-white/8"
          style={{ left: 4, top: 4, width: 112, height: 160, opacity: 0.55 }}>
          <BackComponent />
        </div>
        <div className="absolute rounded-xl overflow-hidden border border-white/12 shadow-lg"
          style={{ left: 0, top: 0, width: 112, height: 160 }}>
          <BackComponent />
        </div>
      </div>
      <span className="text-[6px] text-white/20 font-semibold tracking-wide">Blind</span>
    </div>
  );
}

function GhostCardSlot({ tier }: { tier: number }) {
  const BORDER_COLORS: Record<number, string> = {
    1: "rgba(58,106,90,0.16)",
    2: "rgba(42,74,106,0.16)",
    3: "rgba(90,58,106,0.16)",
  };
  return (
    <div className="shrink-0 rounded-xl border flex items-center justify-center"
      style={{
        width: 112, height: 160,
        borderColor: BORDER_COLORS[tier] ?? "rgba(255,255,255,0.09)",
        background: "rgba(255,255,255,0.018)",
      }}>
      <div className="text-center opacity-50">
        <div className="w-7 h-7 rounded-full border border-white/12 mx-auto mb-2 flex items-center justify-center">
          <span className="text-white/25 text-sm">?</span>
        </div>
        <div className="text-[6px] text-white/15 uppercase tracking-widest font-medium">Hidden</div>
      </div>
    </div>
  );
}

function DeckDrawAnimation({ tier }: { tier: number }) {
  const BackComponent = tier === 3 ? CardBackTier3 : tier === 2 ? CardBackTier2 : CardBackTier1;
  return (
    <motion.div
      className="shrink-0 rounded-xl overflow-hidden shadow-xl ring-1 ring-white/10"
      style={{ width: 112, height: 160 }}
      initial={{ x: -60, scale: 0.68, opacity: 0 }}
      animate={{ x: 0, scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.9 }}
    >
      <BackComponent />
    </motion.div>
  );
}

// ─── Card Flip Reveal ─────────────────────────────────────────────────────────
// Shows a card face-down, then flips it over to reveal the card face.
// `shouldAnimate=false` renders children immediately (for resumed / skipped beats).
function CardFlipReveal({
  children,
  shouldAnimate,
  BackFace,
  delay = 720,
}: {
  children: React.ReactNode;
  shouldAnimate: boolean;
  BackFace: React.ComponentType;
  delay?: number;
}) {
  const [phase, setPhase] = useState<"back" | "out" | "in" | "done">(
    shouldAnimate ? "back" : "done"
  );

  useEffect(() => {
    if (!shouldAnimate) return;
    const t = setTimeout(() => setPhase("out"), delay);
    return () => clearTimeout(t);
  }, []); // run once on mount

  if (phase === "done") return <>{children}</>;

  const W = 112, H = 160;
  return (
    <div style={{ width: W, height: H, flexShrink: 0, perspective: "700px" }}>
      {(phase === "back" || phase === "out") && (
        <motion.div
          className="rounded-xl overflow-hidden border border-white/12 shadow-lg"
          style={{ width: W, height: H }}
          animate={phase === "out" ? { rotateY: 90 } : { rotateY: 0 }}
          transition={{ duration: 0.18, ease: "easeIn" }}
          onAnimationComplete={() => { if (phase === "out") { gameAudio.playCardFlip(); setPhase("in"); } }}
        >
          <BackFace />
        </motion.div>
      )}
      {phase === "in" && (
        <motion.div
          className="rounded-xl overflow-hidden"
          style={{ width: W, height: H }}
          initial={{ rotateY: -90 }}
          animate={{ rotateY: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onAnimationComplete={() => setPhase("done")}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

// ─── Scripted Market ──────────────────────────────────────────────────────────
function ScriptedMarket({ s, dispatch, beatId, subStep, onCardTap, tier1Ref }: {
  s: TutState;
  dispatch: React.Dispatch<TAction>;
  beatId: string;
  subStep: number;
  onCardTap: (card: TutorialCardData, forgeEnabled: boolean, reserveEnabled: boolean, onForge?: () => void, onReserve?: () => void) => void;
  tier1Ref?: React.RefObject<HTMLDivElement>;
}) {
  const inFF = beatId === "b15_fast_forward" || s.ffDone;

  // Determine which cards appear per tier per beat phase
  const t1Cards: string[] = [];
  const t2Cards: string[] = [];
  const t3Cards: string[] = [];

  const earlyBeats = ["b6_forge_appears", "b6b_root_lattice", "b7_artifact_cost", "b7b_cost_bridge", "b8_first_harness", "b9_first_forge", "b9b_forge_complete", "b9c_transition"];
  const midBeats = ["b10_reserve", "b10b_reserve_granted", "b10c_needed_peek", "b11_forge_reserved", "b12_tier2"];
  const lateBeats = ["b13_tier3", "b14_win_condition", "b15_fast_forward"];
  const finalBeat = ["b16_final_forge"];

  if (earlyBeats.includes(beatId)) {
    t1Cards.push(FIRST_FORGE_ID);
  } else if (midBeats.includes(beatId)) {
    t1Cards.push(FIRST_FORGE_ID);
    t1Cards.push(RESERVE_CARD_ID);
    t2Cards.push(TIER2_SINGULARITY_ID);
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
    if (beatId === "b6b_root_lattice" || beatId === "b7_artifact_cost" || beatId === "b7b_cost_bridge") return cardId === FIRST_FORGE_ID;
    if (beatId === "b9_first_forge") return cardId === FIRST_FORGE_ID;
    if (beatId === "b10_reserve") return cardId === RESERVE_CARD_ID && (s.subStep >= 1 || subStep >= 1);
    if (beatId === "b12_tier2") return cardId === TIER2_SINGULARITY_ID;
    if (beatId === "b13_tier3") return T3_PURCHASABLE_IDS.includes(cardId) && !s.forged.includes(cardId);
    if (beatId === "b16_final_forge") return cardId === FINAL_T2_ID;
    return false;
  };

  const getForeground = (cardId: string) => {
    if (beatId === "b6b_root_lattice") return cardId === FIRST_FORGE_ID;
    if (beatId === "b9_first_forge") return cardId === FIRST_FORGE_ID;
    if (beatId === "b12_tier2") return cardId === TIER2_SINGULARITY_ID;
    if (beatId === "b16_final_forge") return cardId === FINAL_T2_ID;
    return false;
  };

  // Track deck-draw animations: when a card is forged it briefly shows a card-back
  // sliding in from the deck before settling as a ghost slot.
  const prevForgedRef = useRef<string[]>([]);
  const [drawingSlots, setDrawingSlots] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prevForged = prevForgedRef.current;
    const newlyForged = s.forged.filter(id => !prevForged.includes(id));
    prevForgedRef.current = s.forged;
    if (newlyForged.length === 0) return;
    setDrawingSlots(prev => new Set([...prev, ...newlyForged]));
    const tid = setTimeout(() => {
      setDrawingSlots(prev => {
        const next = new Set(prev);
        newlyForged.forEach(id => next.delete(id));
        return next;
      });
    }, 1100);
    return () => clearTimeout(tid);
  }, [s.forged]);

  // Always render all 3 tier rows so the full market structure is visible.
  // Each row has a deck pile + 4 card slots. Slots are filled with real cards,
  // deck-draw animations (briefly after forge), or ghost placeholders.
  const MARKET_SLOTS = 4;
  const DECK_COUNTS: Record<number, number> = { 1: 40, 2: 30, 3: 20 };

  const renderTierRow = (tier: number, cardIds: string[], label: string) => {
    const deckCount = Math.max(0, (DECK_COUNTS[tier] ?? 10) - MARKET_SLOTS);

    type Slot =
      | { kind: 'real'; cardId: string }
      | { kind: 'draw'; cardId: string }
      | { kind: 'ghost' };

    const slots: Slot[] = [];

    for (const cardId of cardIds) {
      if (s.reserved.includes(cardId)) {
        // Card was reserved — slot is vacated (ghost)
        slots.push({ kind: 'ghost' });
      } else if (drawingSlots.has(cardId)) {
        // Card just forged — play deck-draw animation
        slots.push({ kind: 'draw', cardId });
      } else if (s.forged.includes(cardId)) {
        // Card already forged, animation done — ghost slot
        slots.push({ kind: 'ghost' });
      } else {
        slots.push({ kind: 'real', cardId });
      }
    }

    // Pad to MARKET_SLOTS with ghost placeholders
    while (slots.length < MARKET_SLOTS) {
      slots.push({ kind: 'ghost' });
    }

    return (
      <div key={tier} ref={tier === 1 ? tier1Ref : undefined} className="mb-4">
        <div className="text-[9px] text-white/30 font-semibold uppercase tracking-wider mb-3">
          Tier {tier} — {label}
        </div>
        <div className="flex gap-3 overflow-x-auto pt-1 pb-2 items-start" style={{ minHeight: 170 }}>
          <DeckPile tier={tier} count={deckCount} />
          {slots.map((slot, idx) => {
            if (slot.kind === 'real') {
              const { cardId } = slot;
              const card = TUTORIAL_CARDS[cardId];
              if (!card) return <GhostCardSlot key={`ghost-${cardId}`} tier={tier} />;
              const isImpossible = cardId === T3_IMPOSSIBLE_ID;
              const affordable = canAfford(card, s.crystals, s.bonuses);
              const tutCard = (
                <TutorialCard
                  card={card}
                  bonuses={s.bonuses}
                  crystals={s.crystals}
                  highlighted={getHighlighted(cardId)}
                  foreground={getForeground(cardId)}
                  costHighlight={(beatId === "b7_artifact_cost" || beatId === "b7b_cost_bridge") && cardId === FIRST_FORGE_ID}
                  forged={false}
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
              // Root Lattice flips over from a face-down deck card when first revealed
              if (cardId === FIRST_FORGE_ID) {
                return (
                  <CardFlipReveal
                    key={cardId}
                    shouldAnimate={beatId === "b6b_root_lattice"}
                    BackFace={CardBackTier1}
                    delay={720}
                  >
                    {tutCard}
                  </CardFlipReveal>
                );
              }
              return <React.Fragment key={cardId}>{tutCard}</React.Fragment>;
            }
            if (slot.kind === 'draw') {
              return <DeckDrawAnimation key={`draw-${slot.cardId}`} tier={tier} />;
            }
            return <GhostCardSlot key={`ghost-${idx}`} tier={tier} />;
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
      {renderTierRow(3, t3Cards, "Galactic")}
      {renderTierRow(2, t2Cards, "Stellar")}
      {renderTierRow(1, t1Cards, "Planetary")}
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
  pressure: 620, firstcrack: 520, leaking: 850, secondcrack: 420,
  cracking: 1100, shattering: 1000, flashing: 2800,
};

// Six-shard geometry — same polygon network as PANEL_PIECES in luminaryAssets,
// already expressed in percentage coordinates so they tile the full viewport.
// Rotation magnitudes increased ~50% over the original values for more dramatic tumble.
const FS_SHARDS = [
  { clip: 'polygon(0% 0%, 35.7% 0%, 28.6% 15%, 50% 42.5%, 39.3% 40%, 19.6% 37.5%, 0% 40%)',
    dx: '-38%', dy: '-32%', rX: -18, rY:  14, rZ:  16, zPeak:  85 },
  { clip: 'polygon(35.7% 0%, 100% 0%, 100% 35%, 60.7% 35%, 50% 42.5%, 28.6% 15%)',
    dx:  '36%', dy: '-30%', rX: -15, rY: -16, rZ: -14, zPeak:  78 },
  { clip: 'polygon(0% 40%, 19.6% 37.5%, 39.3% 40%, 50% 42.5%, 41.1% 57.5%, 25% 72.5%, 16.1% 76.25%, 0% 80%)',
    dx: '-42%', dy:   '3%', rX:   6, rY:  17, rZ:  11, zPeak: 120 },
  { clip: 'polygon(100% 35%, 100% 72.5%, 71.4% 70%, 46.4% 70%, 25% 72.5%, 41.1% 57.5%, 50% 42.5%, 60.7% 35%)',
    dx:  '44%', dy:   '2%', rX:  -5, rY: -18, rZ:  -9, zPeak: 110 },
  { clip: 'polygon(25% 72.5%, 33.9% 85%, 39.3% 100%, 0% 100%, 0% 80%, 16.1% 76.25%)',
    dx: '-32%', dy:  '36%', rX:  20, rY:  12, rZ:  18, zPeak:  90 },
  { clip: 'polygon(25% 72.5%, 46.4% 70%, 71.4% 70%, 100% 72.5%, 100% 100%, 39.3% 100%, 33.9% 85%)',
    dx:  '30%', dy:  '36%', rX:  17, rY: -14, rZ: -15, zPeak:  95 },
] as const;

// Per-shard dark-glass material layers — each shard is near-opaque black/obsidian
// with only the faintest surface glint to suggest a glass face. Light comes from
// *behind* the panel through the crack network, not from the shard surfaces.
const FS_SHARD_GLASS = [
  // shard 0 — top-left
  { base: 'linear-gradient(135deg, rgba(3,4,10,0.97) 0%, rgba(7,9,18,0.94) 55%, rgba(2,3,8,0.98) 100%)',
    spec: 'linear-gradient(120deg, transparent 32%, rgba(210,228,255,0.05) 44%, rgba(255,255,255,0.08) 48%, rgba(210,228,255,0.04) 55%, transparent 66%)',
    iri:  'linear-gradient(118deg, transparent 20%, rgba(140,200,255,0.06) 38%, rgba(220,235,255,0.10) 50%, rgba(200,190,255,0.06) 62%, transparent 78%)' },
  // shard 1 — top-right
  { base: 'linear-gradient(220deg, rgba(4,4,12,0.97) 0%, rgba(6,8,17,0.93) 55%, rgba(2,3,9,0.98) 100%)',
    spec: 'linear-gradient(62deg,  transparent 32%, rgba(210,228,255,0.05) 44%, rgba(255,255,255,0.08) 48%, rgba(210,228,255,0.04) 55%, transparent 66%)',
    iri:  'linear-gradient(58deg,  transparent 22%, rgba(160,210,255,0.05) 36%, rgba(230,240,255,0.10) 49%, rgba(190,220,255,0.05) 63%, transparent 76%)' },
  // shard 2 — middle-left
  { base: 'linear-gradient(168deg, rgba(3,4,11,0.97) 0%, rgba(6,8,18,0.94) 50%, rgba(2,3,9,0.98) 100%)',
    spec: 'linear-gradient(153deg, transparent 30%, rgba(210,228,255,0.04) 42%, rgba(255,255,255,0.07) 46%, rgba(210,228,255,0.04) 53%, transparent 64%)',
    iri:  'linear-gradient(150deg, transparent 18%, rgba(130,195,255,0.06) 34%, rgba(215,235,255,0.09) 48%, rgba(185,215,255,0.05) 60%, transparent 75%)' },
  // shard 3 — middle-right
  { base: 'linear-gradient(330deg, rgba(4,4,12,0.97) 0%, rgba(7,9,19,0.94) 55%, rgba(2,3,9,0.98) 100%)',
    spec: 'linear-gradient(338deg, transparent 30%, rgba(210,228,255,0.05) 42%, rgba(255,255,255,0.08) 47%, rgba(210,228,255,0.04) 54%, transparent 63%)',
    iri:  'linear-gradient(334deg, transparent 20%, rgba(150,205,255,0.06) 35%, rgba(225,238,255,0.10) 49%, rgba(195,215,255,0.06) 62%, transparent 78%)' },
  // shard 4 — bottom-left
  { base: 'linear-gradient(48deg,  rgba(3,4,10,0.97) 0%, rgba(6,8,17,0.93) 52%, rgba(2,3,8,0.97) 100%)',
    spec: 'linear-gradient(52deg,  transparent 32%, rgba(210,228,255,0.05) 44%, rgba(255,255,255,0.07) 48%, rgba(210,228,255,0.04) 55%, transparent 64%)',
    iri:  'linear-gradient(46deg,  transparent 24%, rgba(145,200,255,0.05) 37%, rgba(218,235,255,0.09) 50%, rgba(188,210,255,0.05) 62%, transparent 76%)' },
  // shard 5 — bottom-right
  { base: 'linear-gradient(278deg, rgba(4,4,12,0.97) 0%, rgba(6,8,17,0.93) 52%, rgba(2,3,9,0.97) 100%)',
    spec: 'linear-gradient(273deg, transparent 32%, rgba(210,228,255,0.04) 43%, rgba(255,255,255,0.07) 47%, rgba(210,228,255,0.04) 53%, transparent 64%)',
    iri:  'linear-gradient(270deg, transparent 22%, rgba(135,198,255,0.06) 36%, rgba(222,236,255,0.09) 50%, rgba(192,212,255,0.05) 64%, transparent 78%)' },
];

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

// Cool blue-white — the colour of light leaking from behind the dark glass panel.
const FSO_LIGHT = '#a8ccf8';

// Pre-existing crystal facet boundary seams — the natural cleavage planes of the
// crystal, rendered as faint ice-blue lines from the very first frame.
// These are the same geometric edges the crack network follows, but appear as
// the crystal's internal structure rather than damage.
const FS_CRYSTAL_SEAM_PATHS = [
  'M35.7,0 L28.6,15 L50,42.5',
  'M50,42.5 L60.7,35 L100,35',
  'M50,42.5 L39.3,40 L19.6,37.5 L0,40',
  'M50,42.5 L41.1,57.5 L25,72.5',
  'M25,72.5 L46.4,70 L71.4,70 L100,72.5',
  'M25,72.5 L16.1,76.25 L0,80',
  'M25,72.5 L33.9,85 L39.3,100',
] as const;

// 4-layer crack painter: white snap → chasing glow → residual wound → tinted seam.
// All glow layers use FSO_LIGHT so the crack reads as back-lit (light from behind),
// not as a surface marking on the glass.
function FSOCrack({ d, d1, isDetail }: CrackDef) {
  // pathLength={1} tells framer-motion the total length is 1 so it drives
  // stroke-dasharray/offset directly without a DOM measurement — this ensures
  // the path reliably starts hidden (pathLength:0) every time it mounts.

  // Pulse layer — independent MotionValue so the one-shot draw-in and the
  // repeating loop never interfere with each other.
  const pulseOp   = useMotionValue(0);
  const pulseOp4  = useMotionValue(0);
  useEffect(() => {
    if (isDetail) return;
    // Wait for L3/L4 draw-in to settle, then begin breathing loop.
    const settle = (d1 + 0.14 + 0.95) * 1000;
    const id = setTimeout(() => {
      // Wide glow pulse — L3-equivalent, offset timing so each crack segment
      // breathes slightly out of phase with its neighbours.
      fmAnimate(pulseOp,  [0.20, 0.50, 0.16, 0.46, 0.20], { duration: 2.8, repeat: Infinity, ease: 'easeInOut' });
      // Narrow seam pulse — subtler, slightly slower
      fmAnimate(pulseOp4, [0.14, 0.38, 0.10, 0.34, 0.14], { duration: 3.2, delay: 0.4, repeat: Infinity, ease: 'easeInOut' });
    }, settle);
    return () => {
      clearTimeout(id);
      pulseOp.set(0);
      pulseOp4.set(0);
    };
  // d1 and isDetail come from constants — intentionally stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isDetail) {
    return (
      <motion.path d={d} pathLength={1} stroke="white" strokeWidth="0.18" fill="none"
        filter="url(#fso-cgb)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0.70, 0.60] }}
        transition={{ duration: 0.32, delay: d1, ease: 'easeOut' }}
      />
    );
  }
  return (
    <>
      {/* L1 white snap — fracture line drawing across the panel */}
      <motion.path d={d} pathLength={1} stroke="white" strokeWidth="0.22" fill="none"
        filter="url(#fso-cgb)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 1.0, 0.95] }}
        transition={{ duration: 0.42, delay: d1, ease: 'easeOut' }}
      />
      {/* L2 chasing glow — wide light bleed chasing the fracture tip */}
      <motion.path d={d} pathLength={1} stroke={FSO_LIGHT} strokeWidth="4.0" fill="none"
        filter="url(#fso-cgw)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0.90, 0.25, 0] }}
        transition={{
          pathLength: { duration: 0.52, delay: d1 + 0.04, ease: 'easeOut' },
          opacity:    { duration: 0.78, delay: d1 + 0.04, times: [0, 0.12, 0.55, 1.0] },
        }}
      />
      {/* L3 residual wound — sustained light bleeding through the gap */}
      <motion.path d={d} pathLength={1} stroke={FSO_LIGHT} strokeWidth="2.8" fill="none"
        filter="url(#fso-cgw)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0, 0.55, 0.75, 0.65] }}
        transition={{ duration: 0.85, delay: d1 + 0.14, ease: 'easeOut' }}
      />
      {/* L3-pulse — same wide glow, breathes after L3 settles */}
      <motion.path d={d} pathLength={1} stroke={FSO_LIGHT} strokeWidth="3.2" fill="none"
        filter="url(#fso-cgw)"
        style={{ opacity: pulseOp }}
      />
      {/* L4 tinted seam — narrow cool-white line showing the crack edge */}
      <motion.path d={d} pathLength={1} stroke={FSO_LIGHT} strokeWidth="0.45" fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0, 0.38, 0.60, 0.52] }}
        transition={{ duration: 0.80, delay: d1 + 0.16, ease: 'easeOut' }}
      />
      {/* L4-pulse — seam breathes with a slower, softer oscillation */}
      <motion.path d={d} pathLength={1} stroke="white" strokeWidth="0.28" fill="none"
        filter="url(#fso-cgb)"
        style={{ opacity: pulseOp4 }}
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
  const [impactFlash, setImpactFlash] = useState(false);
  const doneRef = useRef(onDone);
  const revealRef = useRef(onRevealCosmos);
  const shatteringRef = useRef(onShattering);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);
  useEffect(() => { revealRef.current = onRevealCosmos; }, [onRevealCosmos]);
  useEffect(() => { shatteringRef.current = onShattering; }, [onShattering]);

  // Fire the impact flash the instant shattering begins, then auto-clear.
  useEffect(() => {
    if (phase !== 'shattering') return;
    setImpactFlash(true);
    const t = setTimeout(() => setImpactFlash(false), 700);
    return () => clearTimeout(t);
  }, [phase]);

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

  // Stable star positions — seeded once on mount, same look as the pre-shatter black/starry backdrop.
  const stars = useMemo(() =>
    Array.from({ length: 30 }, () => ({
      width:    Math.random() * 2 + 1,
      height:   Math.random() * 2 + 1,
      left:     `${Math.random() * 100}%`,
      top:      `${Math.random() * 100}%`,
      opacity:  Math.random() * 0.5 + 0.1,
      duration: Math.random() * 4 + 2,
      delay:    Math.random() * 3,
    })),
  []);

  // ── Tremor / screen-shake ─────────────────────────────────────────────────
  const prefersReducedMotion = useReducedMotion();
  const shakeX = useMotionValue(0);
  const shakeY = useMotionValue(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    let loopX: ReturnType<typeof fmAnimate> | null = null;
    let loopY: ReturnType<typeof fmAnimate> | null = null;

    if (phase === 'firstcrack') {
      // Sharp impact burst — decays over 0.5 s
      fmAnimate(shakeX, [0, -5, 6, -4, 4, -2, 2, -1, 0], { duration: 0.50, ease: 'linear' });
      fmAnimate(shakeY, [0,  3, -4,  2, -2,  1, -1,  0],  { duration: 0.50, ease: 'linear' });
    } else if (phase === 'secondcrack') {
      // Heavier burst
      fmAnimate(shakeX, [0, -7, 8, -6, 6, -4, 4, -2, 1, 0], { duration: 0.65, ease: 'linear' });
      fmAnimate(shakeY, [0,  4, -5, 3, -3, 2, -2, 1,  0],    { duration: 0.65, ease: 'linear' });
    } else if (phase === 'shattering') {
      // Continuous rumble through the scatter — loops until phase changes
      loopX = fmAnimate(shakeX, [0, -3, 3, -2, 3, -1, 2, -3, 1, 0], { duration: 0.60, repeat: Infinity, ease: 'linear' });
      loopY = fmAnimate(shakeY, [0,  2, -2,  1, -1, 2, -1, 1,  0],  { duration: 0.60, repeat: Infinity, ease: 'linear' });
    } else if (phase === 'flashing') {
      // Wind-down rumble — lighter, fades to nothing
      loopX = fmAnimate(shakeX, [0, -2, 2, -1, 2, -1, 1, 0], { duration: 0.75, repeat: Infinity, ease: 'linear' });
      loopY = fmAnimate(shakeY, [0,  1, -1, 1, -1,  0],       { duration: 0.75, repeat: Infinity, ease: 'linear' });
    } else {
      fmAnimate(shakeX, 0, { duration: 0.25 });
      fmAnimate(shakeY, 0, { duration: 0.25 });
    }

    return () => { loopX?.stop(); loopY?.stop(); };
  }, [phase, prefersReducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'gone') return null;

  const phaseIdx  = FS_PHASE_ORDER.indexOf(phase);
  const past = (p: FSPhase) => phaseIdx >= FS_PHASE_ORDER.indexOf(p);

  const isShattering = past('shattering');
  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      {/* Tremor wrapper — translates the glass contents without clipping */}
      <motion.div className="absolute inset-0" style={{ x: shakeX, y: shakeY }}>

      {/* ── Cosmic light reveal behind the shards — floods in as panels scatter */}
      {isShattering && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 43%, rgba(255,255,255,0.95) 0%, rgba(190,220,255,0.82) 12%, rgba(110,165,255,0.52) 38%, rgba(30,70,180,0.22) 68%, transparent 90%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.45, 0.40, 0.28, 0.10, 0] }}
          transition={{ duration: 7.5, times: [0, 0.02, 0.14, 0.42, 0.70, 1.0], ease: 'easeOut' }}
        />
      )}

      {/* ── Impact flash — rendered here (behind shards) so the shards fly
          in front of the fading white burst rather than being buried under it */}
      <AnimatePresence>
        {impactFlash && (
          <motion.div
            key="shatter-flash"
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 45%, #ffffff 0%, #d8e4f0 35%, #b0c8e0 65%, transparent 100%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1.0, 0.90, 0.70] }}
            transition={{ duration: 0.7, times: [0, 0.12, 0.35, 1.0], ease: 'easeOut' }}
            exit={{ opacity: 0, transition: { duration: 2.5, ease: 'easeOut' } }}
          />
        )}
      </AnimatePresence>

      {/* ── Single seamless dark panel (pre-shatter) — fades in over the pressure phase
          so beat 6 → beat 7 looks like the screen is slowly darkening/crystallising
          rather than glass suddenly slamming down. No clip paths = no seam lines. */}
      {!isShattering && (
        <motion.div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(160deg, rgba(4,4,12,0.97) 0%, rgba(6,8,18,0.95) 55%, rgba(2,3,9,0.98) 100%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, ease: 'easeIn' }}
        />
      )}

      {/* ── Six dark-glass shard panels — only mounted during shattering so their
          inset box-shadows and backgrounds don't bleed through before the crack ── */}
      {isShattering && FS_SHARDS.map((sh, i) => (
        <motion.div key={i} className="absolute inset-0"
          style={{
            clipPath: sh.clip,
            background: FS_SHARD_GLASS[i].base,
            transformPerspective: 900,
            transformStyle: 'preserve-3d',
          }}
          animate={{
            x: [0, `${parseFloat(sh.dx) * 0.08}`, sh.dx],
            y: [0, `${parseFloat(sh.dy) * 0.08}`, sh.dy],
            // Protrude toward viewer on burst, then recede as shard tumbles away
            z: [0, sh.zPeak, sh.zPeak * 0.55, sh.zPeak * 0.15, 0],
            rotateX: [0, sh.rX], rotateY: [0, sh.rY], rotateZ: [0, sh.rZ],
            opacity: [1, 1, 0.96, 0.66, 0],
            filter: [
              'brightness(1.0)',
              'brightness(1.4) drop-shadow(0 0 12px rgba(168,204,248,0.70))',
              'brightness(2.0) drop-shadow(0 0 20px rgba(168,204,248,0.85))',
              'brightness(3.2) drop-shadow(0 0 28px rgba(200,225,255,0.92))',
              'brightness(5.0) drop-shadow(0 0 32px rgba(255,255,255,0.75))',
            ],
          }}
          transition={{
            duration: 4.5, delay: i * 0.04,
            x:       { times: [0, 0.06, 1.0], ease: ['easeIn', [0.10, 0.70, 0.30, 1.0]] },
            y:       { times: [0, 0.06, 1.0], ease: ['easeIn', [0.10, 0.70, 0.30, 1.0]] },
            z:       { times: [0, 0.06, 0.22, 0.55, 1.0], ease: 'easeOut' },
            rotateX: { ease: 'easeOut' }, rotateY: { ease: 'easeOut' }, rotateZ: { ease: 'easeOut' },
            opacity: { times: [0, 0.08, 0.26, 0.56, 1.0], ease: 'easeInOut' },
            filter:  { times: [0, 0.06, 0.22, 0.60, 0.82], ease: 'easeInOut' },
          }}
        >
          {/* Ghost-thin surface glint — barely visible, preserves the glass-face feel */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: FS_SHARD_GLASS[i].spec, opacity: 1 }}
          />

          {/* Prismatic iridescence wash — ice-blue/gold/pearl, screen blend, subtle pulse */}
          {isShattering ? (
            <motion.div className="absolute inset-0 pointer-events-none"
              style={{ background: FS_SHARD_GLASS[i].iri, mixBlendMode: 'screen' }}
              initial={{ opacity: 0.32 }}
              animate={{ opacity: [0.32, 0.26, 0.13, 0.22, 0] }}
              transition={{ duration: 4.5, times: [0, 0.18, 0.40, 0.62, 1.0], ease: 'easeInOut', delay: i * 0.04 }}
            />
          ) : (
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: FS_SHARD_GLASS[i].iri, mixBlendMode: 'screen', opacity: 0.32 }}
            />
          )}

          {/* Crystal clarity layer — ice-blue translucent wash that makes the pre-shatter
              surface read as crystalline glass rather than flat dark. Fades at shatter. */}
          {!isShattering && (
            <div className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at 38% 44%, rgba(140,210,255,0.12) 0%, rgba(100,180,255,0.07) 45%, transparent 75%)',
                mixBlendMode: 'screen',
              }}
            />
          )}

          {/* Edge inset glow — light bleeding through the cut perimeter of each shard */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 24px 5px rgba(140,195,255,0.28), inset 0 0 6px 2px rgba(255,255,255,0.18)',
            }}
          />

          {/* Cool light flood — shard catches and transmits back-light as it flies away */}
          {isShattering && (
            <motion.div className="absolute inset-0 pointer-events-none"
              style={{ background: 'rgba(190,220,255,1)', mixBlendMode: 'screen' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0.12, 0.55, 0.90, 0.75] }}
              transition={{ duration: 4.5, times: [0, 0.10, 0.34, 0.58, 0.78, 1.0], ease: 'easeInOut', delay: i * 0.04 }}
            />
          )}
        </motion.div>
      ))}

      {/* ── Star field — same twinkling dots as the pre-shatter black/starry backdrop,
          rendered above the glass so they're always visible */}
      {!isShattering && (
        <div className="absolute inset-0 pointer-events-none">
          {stars.map((st, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{ width: st.width, height: st.height, left: st.left, top: st.top, opacity: st.opacity }}
              animate={{ opacity: [0.1, 0.6, 0.1] }}
              transition={{ duration: st.duration, repeat: Infinity, delay: st.delay }}
            />
          ))}
        </div>
      )}

      {/* ── Crack SVG — four-layer back-lit paint, hidden during shattering ── */}
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
              {/* Wide glow — wider blur so light bleeds broadly from each crack */}
              <filter id="fso-cgw" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur stdDeviation="5.5" />
              </filter>
              {/* Medium glow for crystal seam ambient light */}
              <filter id="fso-csm" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="1.2" />
              </filter>
              {/* Soft bloom for ice-blue junction glow */}
              <filter id="fso-cib" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>

            {/* First crack network — mounts on firstcrack phase, draws in progressively */}
            {past('firstcrack') && FS_CRACKS_1.map((c, i) => <FSOCrack key={`c1-${i}`} {...c} />)}

            {/* Second crack network — mounts on secondcrack phase, after first light finishes */}
            {past('secondcrack') && FS_CRACKS_2.map((c, i) => <FSOCrack key={`c2-${i}`} {...c} />)}

            {/* Ambient junction glow — cool blue-white light pooling at the fracture junction,
                with additional ice-blue bloom building as pressure accumulates inside the crystal */}
            {past('leaking') && !past('cracking') && (
              <>
                <motion.circle cx="50" cy="42.5" r="7" fill={FSO_LIGHT} filter="url(#fso-cgw)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.22, 0.10, 0.28, 0.12, 0.24] }}
                  transition={{ duration: 3.2, ease: 'easeOut', repeat: Infinity, repeatType: 'mirror', delay: 0.4 }}
                />
                <motion.circle cx="50" cy="42.5" r="0.7" fill="white" filter="url(#fso-cgb)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.65, 0.12, 0.85, 0.28, 0.55, 0] }}
                  transition={{ duration: 2.8, ease: 'easeInOut', repeat: Infinity, delay: 0.25 }}
                />
                {/* Ice-blue bloom at P — accumulating pressure visualized as cold light */}
                <motion.circle cx="50" cy="42.5" r="10" fill="rgba(80,180,255,1)" filter="url(#fso-cib)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.28, 0.14, 0.36, 0.18, 0.32] }}
                  transition={{ duration: 2.6, ease: 'easeOut', repeat: Infinity, repeatType: 'mirror', delay: 0.15 }}
                />
                {/* Secondary teal bloom — Q junction pre-announces the second crack */}
                <motion.circle cx="25" cy="72.5" r="7" fill="rgba(50,200,220,1)" filter="url(#fso-cib)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0, 0.12, 0.06, 0.18, 0.08] }}
                  transition={{ duration: 3.4, ease: 'easeOut', repeat: Infinity, repeatType: 'mirror', delay: 0.8 }}
                />
              </>
            )}

            {/* Energy burst at junctions during cracking — cool light eruption */}
            {past('cracking') && (
              <>
                <motion.circle cx="50" cy="42.5" r="0"
                  fill={FSO_LIGHT} filter="url(#fso-cgw)"
                  animate={{ r: 10, opacity: [0, 0.65, 0.25] }}
                  transition={{ duration: 0.70, ease: 'easeOut' }}
                />
                <motion.circle cx="25" cy="72.5" r="0"
                  fill={FSO_LIGHT} filter="url(#fso-cgw)"
                  animate={{ r: 7, opacity: [0, 0.55, 0.20] }}
                  transition={{ duration: 0.58, delay: 0.12, ease: 'easeOut' }}
                />
              </>
            )}
          </motion.svg>
        )}
      </AnimatePresence>

      {/* ── Pre-shatter ambient back-light — cool blue-white seeping through the panel */}
      {!isShattering && (
        <motion.div className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: past('firstcrack') ? 0.50 : 0.14 }}
          transition={{ duration: past('firstcrack') ? 0.6 : 0.5, ease: 'easeOut' }}
          style={{ background: 'radial-gradient(ellipse at 50% 42.5%, rgba(140,195,255,0.32) 0%, rgba(100,160,255,0.10) 42%, transparent 68%)' }}
        />
      )}

      </motion.div>{/* end tremor wrapper */}
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
    const t = setTimeout(onComplete, prefersReducedMotion ? 200 : 4000);
    return () => clearTimeout(t);
  }, [onComplete, prefersReducedMotion]);

  const [phase, setPhase] = useState(prefersReducedMotion ? 4 : 0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const timers = [
      setTimeout(() => setPhase(1), 280),
      setTimeout(() => setPhase(2), 1050),
      setTimeout(() => setPhase(3), 2300),
      setTimeout(() => setPhase(4), 2700),
    ];
    return () => timers.forEach(clearTimeout);
  }, [prefersReducedMotion]);

  // Scale the inner 375×660 canvas to fit the available screen with comfortable margins
  const INNER_W = 375;
  const INNER_H = 660;
  const [scale, setScale] = useState(0.65);
  useEffect(() => {
    const measure = () => {
      const aw = window.innerWidth  * 0.84;
      const ah = window.innerHeight * 0.76;
      setScale(Math.min(aw / INNER_W, ah / INNER_H, 0.70));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Section slide-in helper — each section flies in from its natural direction
  const sectionAnim = (dy: number, delay = 0) => ({
    initial: { opacity: 0, y: dy, scale: 0.94 },
    animate: {
      opacity: phase >= 1 ? 1 : 0,
      y:       phase >= 2 ? 0 : dy,
      scale:   phase >= 2 ? 1 : 0.94,
    },
    transition: {
      type: "spring" as const,
      stiffness: 145, damping: 22,
      delay: phase >= 2 ? delay : 0,
      opacity: { duration: 0.3 },
    },
  });

  // Tracks which affinity slots have been "filled" by the flying tokens
  const [filledKeys, setFilledKeys] = useState<Set<GemKey>>(new Set());
  useEffect(() => {
    if (phase < 4) return;
    // Each token flies for 1.05s with delay i*0.1; it "lands" at ~68% of its travel
    const timers = affKeys.map((key, i) =>
      setTimeout(() => setFilledKeys(prev => new Set([...prev, key])), i * 100 + 680)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Small card dimensions (inside the 375px inner canvas)
  // Keeping cards compact so all 3 tiers + well + panel fit without overlap.
  const CW = 42;  // card width
  const CH = 60;  // card height

  // Luminary portal colours (representative of the 5 in a typical game)
  const lumColors = ["#3d6bff","#ff5a3c","#2ecc71","#4c1d95","#fef9c3"];

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
      {/* "Assembling interface" label above the phone */}
      <motion.div
        className="absolute inset-x-0 flex justify-center"
        style={{ top: "3%" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 0.65 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="text-[9px] font-semibold text-indigo-300/70 uppercase tracking-[0.38em]">
          Assembling interface
        </span>
      </motion.div>

      {/* Scaled inner canvas — exact same visual language as GameplayPhase */}
      <div style={{
        width: INNER_W, height: INNER_H,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        position: "relative",
        flexShrink: 0,
      }}>
        {/* Phone outline */}
        <motion.div className="absolute inset-0 rounded-[24px]"
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.13), 0 0 50px rgba(99,102,241,0.16)" }}
          initial={{ opacity: 0 }} animate={{ opacity: phase >= 2 ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        />

        {/* ── Header bar ── */}
        <motion.div {...sectionAnim(-36, 0)}
          className="absolute left-0 right-0 flex items-center justify-between px-4"
          style={{ top: 0, height: 40, background: "rgba(3,3,12,0.96)", borderBottom: "1px solid rgba(255,255,255,0.10)", borderRadius: "24px 24px 0 0" }}
        >
          <div className="flex flex-col leading-none">
            <span className="text-[11px] font-serif font-bold text-indigo-300 tracking-wide">LUMINAe</span>
            <span className="text-[7px] text-white/35 tracking-widest">Tutorial</span>
          </div>
        </motion.div>

        {/* Scrollable board area background */}
        <motion.div
          className="absolute left-0 right-0"
          style={{ top: 40, bottom: 112, background: "rgba(6,6,18,0.70)" }}
          initial={{ opacity: 0 }} animate={{ opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 0.6 }}
        />

        {/* ── Luminaries row ── */}
        <motion.div {...sectionAnim(-28, 0.05)}
          className="absolute left-0 right-0 px-3 pt-2.5 pb-2"
          style={{ top: 40, background: "rgba(6,6,18,0.92)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="text-[7px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">Luminaries</div>
          <div className="flex gap-1.5">
            {lumColors.map((_, i) => (
              <div key={i} className="shrink-0 rounded-xl flex items-center justify-center"
                style={{ width: CW, height: CH, background: "rgba(255,255,255,0.022)", border: "1px dashed rgba(255,255,255,0.09)" }}>
                <span className="text-white/12 text-base">?</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── The Forge (3 tier rows) ── */}
        <motion.div {...sectionAnim(-16, 0.11)}
          className="absolute left-0 right-0 mx-3 rounded-2xl"
          style={{ top: 148, padding: "10px 10px 12px 10px", background: "rgba(3,3,12,0.80)", border: "1px solid rgba(255,255,255,0.09)" }}
        >
          <div className="flex items-center gap-1.5 text-[8px] text-white/40 font-semibold uppercase tracking-wider mb-2.5">
            The Forge
            <Hammer className="h-2.5 w-2.5 text-amber-500/70 shrink-0" />
          </div>
          {([3, 2, 1] as const).map((tier, ti) => {
            const BackComp = tier === 3 ? CardBackTier3 : tier === 2 ? CardBackTier2 : CardBackTier1;
            const labels = ["III", "II", "I"] as const;
            return (
              <div key={tier} className={ti > 0 ? "mt-2" : ""}>
                <div className="text-[6px] text-white/22 mb-1 ml-0.5">Tier {labels[ti]}</div>
                <div className="flex items-center gap-1.5">
                  {/* Deck pile */}
                  <div className="shrink-0" style={{ width: 36, height: CH }}>
                    <BackComp />
                  </div>
                  {/* 4 ghost card slots */}
                  {[0, 1, 2, 3].map(si => (
                    <div key={si} className="shrink-0 rounded-xl flex items-center justify-center"
                      style={{ width: CW, height: CH, background: "rgba(255,255,255,0.022)", border: "1px dashed rgba(255,255,255,0.09)" }}>
                      <span className="text-white/12 text-base">?</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* ── Affinity Well ── */}
        <motion.div {...sectionAnim(20, 0.17)}
          className="absolute left-0 right-0 mx-3 rounded-2xl"
          style={{ top: 432, padding: "8px 8px 10px 8px", background: "rgba(3,3,12,0.80)", border: "1px solid rgba(255,255,255,0.09)" }}
        >
          <div className="flex items-center gap-1.5 text-[8px] text-white/40 font-semibold uppercase tracking-wider mb-2">
            Affinity Well
            <Droplets className="h-2.5 w-2.5 text-cyan-400/70 shrink-0" />
          </div>
          <div className="flex gap-1">
            {ALL_GEMS.map(gem => {
              const meta = GEM_META[gem];
              const active = filledKeys.has(gem);
              return (
                <motion.div
                  key={gem}
                  className="flex-1 rounded-lg flex flex-col items-center justify-center py-1.5"
                  animate={{ scale: active ? [1, 1.18, 1] : 1 }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                  style={{
                    minHeight: 36,
                    background: active ? `linear-gradient(180deg, #060611 0%, ${meta.hex}2A 100%)` : "rgba(255,255,255,0.025)",
                    border: `1px solid ${active ? meta.hex + "77" : "rgba(255,255,255,0.07)"}`,
                    transition: "background 0.32s ease, border-color 0.32s ease",
                  }}>
                  {active ? (
                    <motion.img
                      src={meta.image} alt={meta.shortName}
                      className="w-4 h-4 object-contain"
                      draggable={false}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      style={{ filter: `drop-shadow(0 0 5px ${meta.glowHex})` }}
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Player Panel (pinned bottom) ── */}
        <motion.div {...sectionAnim(36, 0.24)}
          className="absolute left-0 right-0"
          style={{ bottom: 0, height: 112, background: "rgba(3,3,12,0.92)", borderTop: "1px solid rgba(255,255,255,0.10)", borderRadius: "0 0 24px 24px", padding: "8px 12px 10px" }}
        >
          {/* Identity + stats row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-[18px] h-[18px] rounded-full bg-indigo-700/70 border border-indigo-400/40 flex items-center justify-center">
                <span className="text-[7px] font-bold text-white">Y</span>
              </div>
              <span className="text-[10px] font-semibold text-white">You</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[8px] text-white/35">0 Affinity</span>
              <div className="flex items-center gap-0.5">
                <span className="font-serif font-black text-sm text-indigo-400 leading-none">0</span>
                <Sparkles className="h-2.5 w-2.5 text-indigo-400" />
              </div>
            </div>
          </div>
          {/* Crystal columns */}
          <div className="flex gap-1">
            {ALL_GEMS.map(gem => {
              const meta = GEM_META[gem];
              return (
                <div key={gem} className="flex-1 rounded-md flex flex-col items-center gap-0.5 py-1"
                  style={{ background: "linear-gradient(180deg,#07070b 0%,#0e0e14 100%)", border: `1px solid ${meta.hex}22` }}>
                  <MiniGem gem={gem} size={8} />
                  <span className="text-[9px] font-black leading-none" style={{ color: meta.hex + "38" }}>0</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Affinity tokens fly from center into the well — phase 4 */}
      <AnimatePresence>
        {phase >= 4 && (
          <>
            {affKeys.map((key, i) => {
              const spreadX = (i - 2) * 40;
              return (
                <motion.div
                  key={`fly-${key}`}
                  className="absolute"
                  style={{ left: "50%", top: "45%", marginLeft: -16, marginTop: -16 }}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.7 }}
                  animate={{ opacity: [0, 1, 1, 0], x: [0, spreadX, spreadX * 0.4, 0], y: [0, -24, 48, 100], scale: [0.7, 1.1, 0.9, 0.55] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.05, delay: i * 0.1, times: [0, 0.28, 0.65, 1], ease: "easeInOut" }}
                >
                  <img src={GEM_META[key].image} alt="" className="w-8 h-8 object-contain" draggable={false}
                    style={{ filter: `drop-shadow(0 0 8px ${GEM_META[key].glowHex})` }} />
                </motion.div>
              );
            })}
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
  const [assemblyDone, setAssemblyDone] = useState(false);
  const [lumiSweepDone, setLumiSweepDone] = useState(false);
  const [devMarker, setDevMarker] = useState<{ canvasX: number; canvasY: number } | null>(null);

  // Compute where the Tier-1 right corner of the forge lands in viewport %,
  // using the same scale formula as ArchitectAssembly (INNER_W=375, INNER_H=660).
  // Convert inner-canvas coords (375×660 space) → viewport-% position for LumiiOrb.
  // Canvas is centered on the viewport, so this is viewport-size-independent when
  // the canvas coords come from a reverse-transform of a real click.
  const canvasToViewportPos = (canvasX: number, canvasY: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw * 0.84 / 375, vh * 0.76 / 660, 0.70);
    const vpX = vw / 2 + scale * (canvasX - 375 / 2);
    const vpY = vh / 2 + scale * (canvasY - 660 / 2);
    return {
      left: `${((vpX / vw) * 100).toFixed(1)}%`,
      top:  `${((vpY / vh) * 100).toFixed(1)}%`,
    };
  };

  const computeLumiAssemblyPos = () => {
    // Tier 1 row card-slot layout (inner canvas coords, origin = canvas left):
    //   forge margin(mx-3)=12, pad-left=10 → content starts at x=22
    //   deck=36, gap=6, then 4 cards (CW=42) with gap-1.5(6) between each
    //   card4 center = 22 + 36 + 6 + 42*3 + 6*3 + 21 = 229
    const card4CenterX = 229; // x of rightmost card slot center in inner canvas
    // Tier I row card-center y in inner canvas:
    //   forge top=148, pad=10, forge-label=18, 2 upper tiers each (label≈11 + CH=60 + gap=8) = 158
    //   tier-I label=11, card center=CH/2=30 → total ≈ 148+10+18+158+11+30 = 375
    const tier1CanvasY = 375;
    return canvasToViewportPos(card4CenterX, tier1CanvasY);
  };
  const [lumiAssemblyPos, setLumiAssemblyPos] = useState(computeLumiAssemblyPos);
  useEffect(() => {
    const update = () => {
      // If a dev target is active, re-snap Lumi using canvas coords (viewport-independent)
      if (devMarker) {
        setLumiAssemblyPos(canvasToViewportPos(devMarker.canvasX, devMarker.canvasY));
      } else {
        setLumiAssemblyPos(computeLumiAssemblyPos());
      }
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devMarker]);
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
    const t3 = setTimeout(() => { dispatch({ type: "NEXT_BEAT" }); }, 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isLocate, dispatch]);

  // Reset shatterReady and assemblyDone whenever the beat changes
  useEffect(() => {
    setShatterReady(false);
    setAssemblyDone(false);
    setLumiSweepDone(false);
  }, [s.beat]);

  // After assembly completes: Lumi slides to Tier 1 row and shrinks; dialogue appears once he's settled
  useEffect(() => {
    if (!assemblyDone) return;
    const t = setTimeout(() => setLumiSweepDone(true), 1300);
    return () => clearTimeout(t);
  }, [assemblyDone]);

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
      onClick={import.meta.env.DEV && isArchitectAssembly && assemblyDone ? (e: React.MouseEvent) => {
        // Reverse-transform viewport click → inner canvas coords (375×660 space).
        // Canvas is centered on the viewport with the same scale formula used in computeLumiAssemblyPos.
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const scale = Math.min(vw * 0.84 / 375, vh * 0.76 / 660, 0.70);
        const canvasX = Math.round((e.clientX - (vw / 2 - scale * 375 / 2)) / scale);
        const canvasY = Math.round((e.clientY - (vh / 2 - scale * 660 / 2)) / scale);
        const marker = { canvasX, canvasY };
        setDevMarker(marker);
        // Snap Lumi immediately using the same canvas→viewport conversion
        setLumiAssemblyPos(canvasToViewportPos(canvasX, canvasY));
      } : undefined}
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
          onComplete={() => setAssemblyDone(true)}
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
              scale: (isArchitectAssembly && assemblyDone) ? 0.44 : 1,
              top:  isAffinityTokens                       ? "70%"
                  : (isArchitectAssembly && assemblyDone)  ? lumiAssemblyPos.top
                  : isArchitectAssembly                    ? "26%"
                  : "50%",
              left: (isArchitectAssembly && assemblyDone)  ? lumiAssemblyPos.left
                  : isArchitectAssembly                    ? "87%"
                  : "50%",
            }}
            transition={isArchitectAssembly ? {
              top: assemblyDone
                ? { duration: 0.85, ease: [0.4, 0, 0.2, 1] as const }
                : { type: "spring" as const, stiffness: 100, damping: 22, delay: 2.8 },
              left: assemblyDone
                ? { duration: 0.85, ease: [0.4, 0, 0.2, 1] as const }
                : { type: "spring" as const, stiffness: 100, damping: 22, delay: 2.8 },
              scale: assemblyDone
                ? { duration: 0.85, ease: [0.4, 0, 0.2, 1] as const }
                : { type: "spring" as const, stiffness: 120, damping: 20 },
              x:     { type: "spring" as const, stiffness: 120, damping: 20 },
              opacity: { duration: 0.3 },
            } : { type: "spring", stiffness: 120, damping: 20, delay: isLocate ? 0.3 : 0 }}
            className="absolute z-30"
          >
            <div style={{ transform: "translate(-50%, -50%)" }}>
              <LumiiOrb size={88} excited={s.beat === 2} highlightZone={null} beatKey={s.beat} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DEV: position picker — click anywhere after assembly to mark a target for Lumi */}
      {import.meta.env.DEV && isArchitectAssembly && assemblyDone && devMarker && (() => {
        // Re-derive the viewport position from canvas coords so the crosshair tracks Lumi exactly
        const pos = canvasToViewportPos(devMarker.canvasX, devMarker.canvasY);
        return (
          <div
            className="absolute pointer-events-none z-[200]"
            style={{ left: pos.left, top: pos.top, transform: "translate(-50%,-50%)" }}
          >
            <div className="relative flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-yellow-400 bg-yellow-400/20" />
              <div className="absolute h-px w-8 bg-yellow-400" />
              <div className="absolute w-px h-8 bg-yellow-400" />
            </div>
            <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-mono font-bold text-yellow-300 bg-black/80 border border-yellow-400/40">
              canvasX: {devMarker.canvasX}  canvasY: {devMarker.canvasY}
            </div>
          </div>
        );
      })()}

      {/* Architect Assembly dialogue — appears once Lumi finishes sweeping past Tier 1 */}
      {isArchitectAssembly && lumiSweepDone && beat.dialogue.length > 0 && (
        <div
          className="absolute z-30 left-0 right-0 flex justify-center pointer-events-none"
          style={{ bottom: "6%" }}
        >
          <div className="pointer-events-auto" style={{ width: 280 }}>
            <AnimatePresence mode="wait">
              <DialogueBox
                key={`assembly-${s.dlgLine}`}
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
      )}

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

      {/* Beat 1 locate: "over here" text — fades in after Lumii settles, then dissolves */}
      {isLocate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.85, 0.85, 0] }}
          transition={{ delay: 0, duration: 2, times: [0, 0.05, 0.4, 1], ease: "easeOut" }}
          className="absolute z-30 text-white/80 font-serif text-xl pointer-events-none"
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
            style={{ top: "calc(56px + env(safe-area-inset-top, 0px))" }}
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
    // Fanfare on first landing — give the mount a tick so audio ctx is ready
    setTimeout(() => gameAudio.playWin(), 180);
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
function TutorialLuminarySection({ beatIndex }: { beatIndex: number }) {
  const verdantRevealed = beatIndex >= (BEAT_INDEX["b17_luminary"] ?? 999);
  const unknownSlot = (
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
  );
  return (
    <div className="border border-white/10 rounded-2xl p-3 backdrop-blur-md" style={{ background: "rgba(3,3,12,0.72)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Luminaries</div>
        <div className="text-[9px] text-white/20 italic">Patron cosmic entities</div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 items-start">
        {verdantRevealed ? (
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
        ) : unknownSlot}
        {unknownSlot}
      </div>
    </div>
  );
}

// ─── Collection Sheet ─────────────────────────────────────────────────────────
// Slides up from the bottom to show all forged artifacts — mirrors the real
// game's player-panel tap mechanic.
function CollectionSheet({ forged, bonuses, onClose }: {
  forged: string[];
  bonuses: Record<GemKey, number>;
  onClose: () => void;
}) {
  const bonusTotals = (Object.entries(bonuses) as [GemKey, number][]).filter(([, v]) => v > 0);
  return (
    <>
      <motion.div
        key="coll-backdrop"
        className="fixed inset-0 z-[80] bg-black/55"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      <motion.div
        key="coll-panel"
        className="fixed left-0 right-0 bottom-0 z-[81] rounded-t-2xl border-t border-white/15 shadow-2xl"
        style={{ background: "rgba(6,6,17,0.97)" }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-3" />
        <div className="px-4 pb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-base font-bold text-white">Your Collection</div>
              <div className="text-[10px] text-white/35 mt-0.5">Forged artifacts — permanent bonuses</div>
            </div>
            {bonusTotals.length > 0 && (
              <div className="flex gap-1 flex-wrap justify-end">
                {bonusTotals.map(([k, v]) => (
                  <div key={k} className="flex items-center gap-0.5 bg-emerald-900/40 rounded px-1.5 py-0.5 border border-emerald-500/20">
                    <span className="text-[9px] text-emerald-300 font-bold">+{v}</span>
                    <MiniGem gem={k} size={9} />
                  </div>
                ))}
              </div>
            )}
          </div>
          {forged.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-white/20 text-sm">No artifacts forged yet</div>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {forged.map(id => {
                const card = TUTORIAL_CARDS[id];
                if (!card) return null;
                const artUrl = CARD_ART[id];
                const bonusMeta = GEM_META[card.bonusColor];
                const bgStyle: React.CSSProperties = artUrl
                  ? { backgroundImage: `url(${artUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: `linear-gradient(175deg, #021005 0%, #063020 50%, #020c04 100%)` };
                return (
                  <div key={id} className="shrink-0 rounded-xl overflow-hidden shadow-xl ring-1 ring-white/10 relative"
                    style={{ width: 112, height: 160, ...bgStyle }}>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/90" />
                    <div className="relative z-10 h-full p-2 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <span className="text-base font-serif font-bold text-white drop-shadow">{card.lumens > 0 ? card.lumens : ""}</span>
                        <div className="w-4 h-4 rounded-full ring-1 ring-black/40 overflow-hidden">
                          <img src={bonusMeta.image} alt={bonusMeta.name} className="w-full h-full object-contain" draggable={false} />
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] font-semibold text-white drop-shadow line-clamp-2 leading-tight mb-1.5">{card.name}</div>
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-0.5 bg-emerald-900/60 rounded px-1 py-0.5">
                            <span className="text-[8px] text-emerald-300 font-bold">+1</span>
                            <MiniGem gem={card.bonusColor} size={8} />
                          </div>
                          <span className="text-[7px] text-white/30">per turn</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 text-[9px] text-white/22 text-center">Tap anywhere outside to close</div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Gameplay Phase ───────────────────────────────────────────────────────────
function GameplayPhase({ s, dispatch }: { s: TutState; dispatch: React.Dispatch<TAction> }) {
  const beat = TUTORIAL_BEATS[s.beat];
  const beatId = beat.id;
  const subStep = s.subStep;
  const [menuOpen, setMenuOpen] = useState(false);
  const isShortLandscape = useIsShortLandscape();

  // Card action sheet
  const [selectedCardData, setSelectedCardData] = useState<{
    card: TutorialCardData;
    forgeEnabled: boolean;
    reserveEnabled: boolean;
    onForge?: () => void;
    onReserve?: () => void;
  } | null>(null);

  // Collection sheet — slides up to show all forged artifacts (teaches panel-tap mechanic)
  const [collectionOpen, setCollectionOpen] = useState(false);
  // Beats that explicitly invite the player to tap their panel
  const PANEL_TAP_BEATS = new Set(["b9b_forge_complete", "b11_forge_reserved", "b12_tier2"]);
  const showPanelTapHint = PANEL_TAP_BEATS.has(beatId) && s.forged.length > 0;

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
      gameAudio.playCardPurchased();
      purchaseBurstKeyRef.current += 1;
      setPurchaseBurst({ key: purchaseBurstKeyRef.current, lumens: trigger.lumens, name: trigger.name, cardId: trigger.cardId });
      setTimeout(() => setPurchaseBurst(null), 2400);
      setForgeJustHappened(true);
      setTimeout(() => setForgeJustHappened(false), 3600);
    } else if (trigger.type === "harvest") {
      const { gems } = trigger;
      // Stagger a crystal-pick sound per gem so multi-gem harvests have a satisfying cascade
      gems.forEach((gem, i) => {
        setTimeout(() => gameAudio.playCrystalPicked(gem), i * 95);
      });
      gemBurstKeyRef.current += 1;
      const key = gemBurstKeyRef.current;
      setGemBurst({ key, gems });
      const burstDuration = (gems.length - 1) * 0.78 + 1.25 + 0.5 + 0.05;
      setTimeout(() => setGemBurst(null), (burstDuration + 0.35) * 1000);
    }
  }, [s.animTrigger]);

  // Play the cosmic bell the first time each "act" beat becomes active.
  // Guard with a ref so rapid re-renders don't replay the sound.
  const lastActBeatRef = useRef<string | null>(null);
  useEffect(() => {
    if ((beat.mode === "act" || beat.mode === "semiOpen") && lastActBeatRef.current !== beatId) {
      lastActBeatRef.current = beatId;
      // Small delay so the beat transition animation has time to settle before the sound hits
      setTimeout(() => gameAudio.playTurnStart(), 220);
    }
  }, [beatId, beat.mode]);

  const isDimmed = beat.mode === "listen" || beat.mode === "look";
  const isWellEnabled = (beat.mode === "act" || beat.mode === "semiOpen") &&
    ["b8_first_harness", "b11_forge_reserved", "b12_tier2", "b13_tier3", "b16_final_forge"].includes(beatId) &&
    !(beatId === "b11_forge_reserved" && subStep >= 1) &&
    !(beatId === "b12_tier2" && subStep === 0) &&
    !(beatId === "b16_final_forge" && subStep >= 1);

  const isStorageHighlighted = beatId === "b9b_forge_complete" || beatId === "b9c_transition" || beatId === "b14_win_condition";
  const isEminenceHighlighted = beatId === "b14_win_condition";
  const isHandHighlighted = beatId === "b10b_reserve_granted";
  const isForgeHighlighted = ["b6_forge_appears", "b7_artifact_cost", "b9_first_forge", "b9b_forge_complete", "b11_forge_reserved", "b16_final_forge"].includes(beatId);

  // Flux column locked until Singularity is introduced at b12_tier2
  const fluxLocked = s.beat < (BEAT_INDEX["b12_tier2"] ?? 14);

  // Approximate screen positions for highlight zone targets (fixed-overlay coordinates).
  // Values reflect where elements appear on-screen given the active cameraFocus scroll state.
  const HIGHLIGHT_ZONE_SCREEN_POS: Record<string, { x: string; y: string }> = {
    "well":           { x: "50%", y: "82%" },
    "forge-btn":      { x: "84%", y: "46%" },
    "hand":           { x: "20%", y: "42%" },
    "storage":        { x: "38%", y: "62%" },
    "market-t1":      { x: "50%", y: "40%" },
    "market-t2":      { x: "50%", y: "26%" },
    "market-t3":      { x: "50%", y: "16%" },
    "card-cost":      { x: "76%", y: "38%" },
    "eminence":       { x: "86%", y: "94%" },
    "discounted-tab": { x: "36%", y: "22%" },
    "needed-tab":     { x: "55%", y: "22%" },
  };

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
  const lumiiPosRaw = LUMII_ZONE_POS[lumiiTarget] ?? { x: "88%", y: "62%" };
  // In landscape, the player panel occupies the bottom ~25% of a short viewport.
  // Clamp Lumii's y so it always stays in the visible content area (above panel).
  const lumiiPos = isShortLandscape
    ? { x: lumiiPosRaw.x, y: `${Math.min(parseFloat(lumiiPosRaw.y), 60)}%` }
    : lumiiPosRaw;

  // Hoisted for use in spotlight/tether overlays (same logic as inside Lumii IIFE)
  const lumiiIsBurstActive = !!(purchaseBurst || gemBurst);
  const lumiiEffectivePos = lumiiIsBurstActive ? { x: "90%", y: "7%" } : lumiiPos;

  const isActMode = beat.mode === "act" || beat.mode === "semiOpen";
  const totalCrystals = Object.values(s.crystals).reduce((a, b) => a + b, 0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const forgeRef = useRef<HTMLDivElement>(null);
  const tier1Ref = useRef<HTMLDivElement>(null);
  const cameraFocus: "market" | "well" | "storage" | "forge" | "tier1" = (() => {
    if (beatId === "b6b_root_lattice" || beatId === "b7_artifact_cost" || beatId === "b7b_cost_bridge") return "tier1";
    if (beatId === "b8_first_harness") return "well";
    if (beatId === "b11_forge_reserved" && subStep === 0) return "tier1";
    if (beatId === "b12_tier2" && subStep === 1) return "well";
    if (beatId === "b16_final_forge" && subStep === 0) return "well";
    if (beatId === "b9b_forge_complete" || beatId === "b9c_transition" || beatId === "b14_win_condition") return "storage";
    if (beatId === "b10_reserve" || beatId === "b10b_reserve_granted") return "forge";
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
    } else if (cameraFocus === "forge") {
      // Scroll so the forge section lands flush with the top of the visible area,
      // pushing the luminary section fully out of view.
      // getBoundingClientRect is used instead of offsetTop because offsetTop is
      // relative to the offsetParent (the outer relative wrapper), not the scroll
      // container, which can produce an incorrect value.
      const forgeEl = forgeRef.current;
      if (forgeEl) {
        const forgeTop =
          forgeEl.getBoundingClientRect().top -
          container.getBoundingClientRect().top +
          container.scrollTop;
        container.scrollTo({ top: forgeTop, behavior: "smooth" });
      }
    } else if (cameraFocus === "tier1") {
      // Scroll so the Tier 1 row (Foundation) is visible at the bottom of the
      // viewport, with the Luminary section fully scrolled past.
      // We aim for the top of the Tier 1 row to sit near the top of the
      // scroll container, which naturally hides the Luminary section above.
      const tier1El = tier1Ref.current;
      if (tier1El) {
        const tier1Top =
          tier1El.getBoundingClientRect().top -
          container.getBoundingClientRect().top +
          container.scrollTop;
        container.scrollTo({ top: tier1Top, behavior: "smooth" });
      } else {
        // Fallback: ref not yet populated — scroll to bottom where Tier 1 sits
        container.scrollTo({ top: maxScroll, behavior: "smooth" });
      }
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
  ) => { gameAudio.playButtonSelect(); setSelectedCardData({ card, forgeEnabled, reserveEnabled, onForge, onReserve }); };

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

      {/* Spotlight vignette — dims edges around the highlighted target zone */}
      {(isActMode || beat.mode === "look") && beat.highlightZone && HIGHLIGHT_ZONE_SCREEN_POS[beat.highlightZone] && (
        <motion.div
          key={`spotlight-${beatId}`}
          className="fixed inset-0 pointer-events-none z-[22]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: cameraFocus !== "market" ? 0.82 : 0.25 }}
          style={{
            background: `radial-gradient(ellipse 52% 38% at ${HIGHLIGHT_ZONE_SCREEN_POS[beat.highlightZone]!.x} ${HIGHLIGHT_ZONE_SCREEN_POS[beat.highlightZone]!.y}, transparent 0%, rgba(0,0,0,0.28) 100%)`,
          }}
        />
      )}

      {/* Header */}
      <header className="shrink-0 z-30 flex items-center justify-between px-4 py-2 border-b border-white/10 backdrop-blur-md" style={{ background: "rgba(3,3,12,0.82)" }}>
        <div className="flex items-center gap-2">
          <div className="flex flex-col leading-none">
            <span className="text-sm font-serif font-bold text-indigo-300 tracking-wide">LUMINAe</span>
            <span className="text-[9px] text-white/35 tracking-widest">Tutorial</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
      <motion.div
        className="relative z-10 flex-1 overflow-hidden"
        initial={beatId === "b6_forge_appears" ? { scale: 1.38, y: "-12%" } : false}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 1.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ transformOrigin: "50% 36%" }}
      >
        <div ref={scrollRef} className={`h-full overflow-y-auto px-4 flex flex-col pb-4 ${isShortLandscape ? "py-2 gap-2" : "py-3 gap-3"}`}>
          <TutorialLuminarySection beatIndex={s.beat} />
          <motion.div
            ref={forgeRef}
            className={`border rounded-2xl p-3 backdrop-blur-md`}
            style={{ background: "rgba(3,3,12,0.72)" }}
            animate={isForgeHighlighted
              ? {
                  boxShadow: ["0 0 0px rgba(251,191,36,0)", "0 0 20px rgba(251,191,36,0.35)", "0 0 8px rgba(251,191,36,0.12)", "0 0 24px rgba(251,191,36,0.4)", "0 0 0px rgba(251,191,36,0)"],
                  borderColor: ["rgba(251,191,36,0.2)", "rgba(251,191,36,0.95)", "rgba(251,191,36,0.3)", "rgba(251,191,36,1)", "rgba(251,191,36,0.2)"],
                }
              : { boxShadow: "0 0 0px rgba(251,191,36,0)", borderColor: "rgba(255,255,255,0.1)" }
            }
            transition={isForgeHighlighted
              ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.4 }
            }
          >
            <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider mb-2 ${isForgeHighlighted ? "text-amber-400/70" : "text-white/40"}`}>
              The Forge
              <Hammer className={`h-3 w-3 shrink-0 ${isForgeHighlighted ? "text-amber-400" : "text-amber-500/70"}`} />
            </div>
            <ScriptedMarket s={s} dispatch={dispatch} beatId={beatId} subStep={subStep} onCardTap={handleCardTap} tier1Ref={tier1Ref} />
          </motion.div>
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
      </motion.div>

      {/* ── Pinned Player Panel ────────────────────────────────────────── */}
      <motion.div
        className={`shrink-0 z-20 border-t px-3 backdrop-blur-md transition-all ${
          isShortLandscape ? "pt-1" : "pt-2"
        } ${
          isEminenceHighlighted ? "border-amber-400/60" : isActMode ? "border-indigo-500/40" : "border-white/10"
        }`}
        animate={isEminenceHighlighted
          ? { boxShadow: ["0 0 18px rgba(251,191,36,0.17)", "0 0 22px rgba(251,191,36,0.28)", "0 0 18px rgba(251,191,36,0.17)"] }
          : isActMode ? { boxShadow: "0 0 12px rgba(99,102,241,0.20)" } : { boxShadow: "none" }
        }
        transition={isEminenceHighlighted ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
        style={{ background: "rgba(3,3,12,0.80)", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="button"
          disabled={s.forged.length === 0}
          onClick={() => { if (s.forged.length > 0) { gameAudio.playCardDraw(); setCollectionOpen(true); } }}
          className={`w-full text-left ${s.forged.length > 0 ? "cursor-pointer active:opacity-80" : "cursor-default"} ${isShortLandscape ? "mb-1" : "mb-2"}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className="w-[22px] h-[22px] rounded-full bg-indigo-700/70 border border-indigo-400/40 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-white">Y</span>
              </div>
              {isActMode && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />}
              <span className="text-xs font-semibold text-white truncate">You</span>
              {isActMode && (
                <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded-full shrink-0">your turn</span>
              )}
              {/* Tap-hint badge — shown on beats that explicitly invite panel inspection */}
              {showPanelTapHint && (
                <motion.span
                  animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  className="text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-400/30 px-1.5 py-0.5 rounded-full shrink-0"
                >
                  Tap · see collection
                </motion.span>
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
        </button>
        <div className="flex gap-1.5">
          {ALL_GEMS.map(gem => {
            const meta = GEM_META[gem];
            const held = s.crystals[gem] ?? 0;
            const bonus = gem !== "flux" ? (s.bonuses[gem] ?? 0) : 0;
            const reservedCount = gem === "flux" ? s.reserved.length : 0;
            const hasContent = gem === "flux" ? (held > 0 || reservedCount > 0) : (held > 0 || bonus > 0);
            return (
              <div key={gem}
                className={`flex-1 flex flex-col items-center gap-0.5 rounded-lg relative overflow-hidden ${isShortLandscape ? "min-h-[44px] pt-1 pb-1" : "min-h-[72px] pt-1.5 pb-1.5"}`}
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
                <span className={`${isShortLandscape ? "text-lg" : "text-2xl"} font-black leading-none tracking-tight`}
                  style={{ color: hasContent ? "#fff" : meta.hex + "40", textShadow: hasContent ? `0 0 10px ${meta.glowHex}` : "none" }}
                >{held}</span>
                {gem !== "flux" && bonus > 0 && <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>+{bonus}</span>}
                {gem === "flux" && reservedCount > 0 && <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>{reservedCount}r</span>}
              </div>
            );
          })}
        </div>
      </motion.div>


      {/* Floating Lumii */}
      {(() => {
        const hintVisible = isActMode && s.dlgLine >= beat.dialogue.length - 1;
        const lumiiClickable = hintVisible && s.dlgLine < beat.dialogue.length;
        // Dart to top-right corner while burst animations are playing
        const burstActive = !!(purchaseBurst || gemBurst);
        const effectiveLumiiPos = burstActive ? { x: "90%", y: "7%" } : lumiiPos;
        // Beats where dialogue floats beside Lumii instead of fixed at bottom
        const CARD_DLG_BEATS = new Set(["b6_forge_appears", "b6b_root_lattice", "b7_artifact_cost", "b7b_cost_bridge"]);
        const showFloatingDlg = CARD_DLG_BEATS.has(beatId) && s.dlgLine < beat.dialogue.length;
        // Bubble goes to the opposite side from Lumii so it doesn't clip off-screen
        const lumiiIsLeft = parseFloat(effectiveLumiiPos.x) < 50;
        // Dialogue-line excited state: true when the current line has excited:true
        const currentLineExcited = beat.dialogue[s.dlgLine]?.excited ?? false;
        // Excited bounce: scoped to action hint pending, post-forge, or an explicitly excited line
        const shouldExcitedBounce = hintVisible || forgeJustHappened || currentLineExcited;
        return (
          <motion.div
            animate={{ left: effectiveLumiiPos.x, top: effectiveLumiiPos.y }}
            transition={
              burstActive
                ? { type: "spring", stiffness: 260, damping: 22 }
                : { type: "spring", stiffness: 55, damping: 20 }
            }
            className="fixed z-[60] pointer-events-none"
          >
            <div style={{ transform: "translate(-50%, -50%)" }}>
            {/* Speech bubble anchored to Lumii for card-explanation beats */}
            {showFloatingDlg && (
              <motion.div
                key={`float-settle-${beatId}`}
                className="absolute pointer-events-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: beatId === "b6_forge_appears" ? 1.4 : 0 }}
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
              </motion.div>
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
                <LumiiOrb size={48} excited={hintVisible || forgeJustHappened || currentLineExcited} highlightZone={null} beatKey={beatId} pointing={beat.lumiiPointer} />
              </div>
            </motion.div>
            </div>
          </motion.div>
        );
      })()}

      {/* ── Tether line + target ring — suppressed from beat 15 (index 14) onward */}
      {isActMode && beat.highlightZone && s.beat < 14 && (() => {
        const hp = HIGHLIGHT_ZONE_SCREEN_POS[beat.highlightZone];
        if (!hp) return null;
        const lx = parseFloat(lumiiEffectivePos.x);
        const ly = parseFloat(lumiiEffectivePos.y);
        const tx = parseFloat(hp.x);
        const ty = parseFloat(hp.y);
        const dist = Math.abs(lx - tx) + Math.abs(ly - ty);
        if (dist < 12) return null;
        const gid = `tg-${beatId}`;
        return (
          <svg
            key={`tether-${beatId}`}
            className="fixed inset-0 pointer-events-none z-[27]"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ width: "100vw", height: "100vh" }}
          >
            <defs>
              <linearGradient id={gid} x1={lx} y1={ly} x2={tx} y2={ty} gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
                <stop offset="30%"  stopColor="rgba(255,255,255,0.38)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
              </linearGradient>
            </defs>
            <motion.path
              d={`M ${lx} ${ly} L ${tx} ${ty}`}
              stroke={`url(#${gid})`}
              strokeWidth="0.35"
              strokeDasharray="1.6 2.2"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.65, 0.42, 0.65, 0.42] }}
              transition={{
                pathLength: { duration: 0.6, ease: "easeOut" },
                opacity: { duration: 2.8, repeat: Infinity, times: [0, 0.18, 0.5, 0.7, 1] },
              }}
            />
            <motion.circle
              cx={tx} cy={ty} r={2.0}
              fill="none"
              stroke="rgba(255,255,255,0.42)"
              strokeWidth="0.28"
              initial={{ opacity: 0 }}
              animate={{ r: [2.0, 3.6, 2.0], opacity: [0.52, 0.10, 0.52] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
          </svg>
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
            onReserve={selectedCardData.onReserve ? () => { gameAudio.playCardReserved(); setSelectedCardData(null); selectedCardData.onReserve!(); } : undefined}
            onClose={() => setSelectedCardData(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Collection Sheet ──────────────────────────────────────────── */}
      <AnimatePresence>
        {collectionOpen && (
          <CollectionSheet
            forged={s.forged}
            bonuses={s.bonuses}
            onClose={() => setCollectionOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Dialogue box — fade in after camera has settled on camera-scroll beats */}
      {s.dlgLine < beat.dialogue.length && !["b6_forge_appears", "b6b_root_lattice", "b7_artifact_cost", "b7b_cost_bridge"].includes(beatId) && (
        <motion.div
          key={`dlg-settle-${beatId}-${subStep}`}
          className="fixed left-0 right-0 z-50 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: cameraFocus !== "market" ? 0.68 : 0 }}
          style={cameraFocus === "well"
            ? { top: "calc(54px + env(safe-area-inset-top, 0px))" }
            : {
                // In landscape the player panel is ~90px tall; in portrait ~160px.
                // Keep the dialogue floating just above the panel in both orientations.
                bottom: `calc(${isShortLandscape ? "96px" : "160px"} + env(safe-area-inset-bottom, 0px))`,
              }
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
        </motion.div>
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
  const [muted, setMuted] = useState(() => gameAudio.isMuted());
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
      saveTutorialProgressId(TUTORIAL_BEATS[s.beat]?.id ?? "");
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
      {/* Top-right controls: Leave + Sound toggle */}
      <div
        className="fixed right-4 z-[60] flex items-center gap-3"
        style={{ top: "calc(16px + env(safe-area-inset-top, 0px))" }}
      >
        <button
          onClick={() => { const next = gameAudio.toggleMute(); setMuted(next); }}
          className="flex items-center gap-1.5 text-white/35 hover:text-white/75 text-xs font-semibold tracking-widest uppercase transition-colors bg-black/15 hover:bg-black/35 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10"
          aria-label={muted ? "Unmute sound" : "Mute sound"}
        >
          {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          {muted ? "Sound off" : "Sound on"}
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-white/35 hover:text-white/75 text-xs font-semibold tracking-widest uppercase transition-colors bg-black/15 hover:bg-black/35 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10"
        >
          <X className="h-3 w-3" />
          Leave
        </button>
      </div>
    </>
  );
}
