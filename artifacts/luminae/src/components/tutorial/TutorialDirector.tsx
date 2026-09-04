import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { DevTutorialNav } from "./DevTutorialNav";
import { TutorialDebugOverlay } from "./TutorialDebugOverlay";
import { TutorialSemanticText } from "./TutorialSemanticText";
import { CipherApertureAnimation } from "@/components/CipherApertureAnimation";
import { ForgeReplacementDealAnimation } from "@/components/ForgeReplacementDealAnimation";
import { saveTutorialProgress, saveTutorialProgressId, saveTutorialState, loadTutorialState, clearTutorialProgress, markTutorialSeen, hasTutorialSeen, markTutorialComplete, markIntroSeen, recordFirstContactStance } from "@/lib/tutorialProgress";
import { getLocalFirstContactStance } from "@/lib/firstContactMemory";
import { ChevronRight, ChevronsRight, Droplets, Hammer, Hand, Landmark, LayoutGrid, List, MoreHorizontal, RotateCcw, Undo2, Volume2, VolumeX, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion, useMotionValue, animate as fmAnimate } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { AFFINITY_META, AFFINITY_KEYS, type AffinityKey } from "@/lib/affinityMeta";
import {
  TUTORIAL_BEATS,
  TUTORIAL_AFFINITY_DESCRIPTORS,
  TUTORIAL_CORE_ACTION_RECAP,
  TUTORIAL_CARDS,
  FAST_FORWARD_CARDS,
  ENCRYPTION_REPLACEMENT_ID,
  FINAL_T2_ID,
  FIRST_FORGE_ID,
  RESERVE_CARD_ID,
  TUTORIAL_FORGE_CARD_BY_BEAT,
  TUTORIAL_FORGE_CARD_SLOTS,
  getTutorialHarnessPattern,
  AFFINITY_SEQ_KEYS,
  BEAT_INDEX,
  getTutorialChapter,
  isTutorialActionInstructionVisible,
  usesTutorialCinematicPhase,
  VERDANCE_LUMINARY_ID,
  VERDANCE_LUMINARY_EMINENCE,
  type TutorialCard as TutorialCardData,
  type TutorialBranchChoice,
  type TutorialForgeView,
} from "@/lib/tutorialData";
import {
  INIT_STATE,
  tutorialReducer as reducer,
  buildTutorialEntryState,
  effectiveCost,
  canAfford,
  type TutState,
  type TAction,
} from "@/lib/tutorialReducer";
import { LuminaryArrivalCutscene, LuminaryPanelArt } from "@/lib/luminaryAssets";
import { BOARD_CARD_W, BOARD_CARD_H } from "@/lib/constants";
import { CardBackTier1, CardBackTier2, CardBackTier3 } from "@/components/ArtifactCardBack";
import { AffinityEmblem } from "@/components/AffinityEmblem";
import { ArtifactCardView, EminenceBadge, EminenceDiamond, EminenceProgress } from "@/pages/game-card";
import { PlayerAvatar } from "@/pages/game-player";
import { FORGE_PHASE_MS, ForgeAnimation } from "@/pages/game-forge-animation";
import { AffinityWellCells } from "@/components/AffinityWell";
import { AffinityReservoirSymbol } from "@/components/AffinityReservoirSymbol";
import { EncryptButton, ForgeButton } from "@/components/ForgeEncryptButton";
import { ForgeDeckPile } from "@/pages/game-board-forge-deck";
import { CompactForgeCardReadout } from "@/pages/game-board-forge-card-slot";
import { HarnessConvergenceLayer } from "@/pages/game-causal-motion";
import { CIPHER_DEAL_FIRE_DELAY_MS, CIPHER_GAME_TOTAL_MS, CIPHER_TAIL_BUFFER_MS, TIER_CIVILIZATION } from "@/pages/game-constants";
import { useBoardLayoutPolicy } from "@/pages/game-layout";
import { getReplacementDealMotion, type ReplacementDealMotion } from "@/pages/game-replacement-motion";
import { artifactFrameUsesArtCrop } from "@/lib/artifactFramePresentation";
import { ApiError, addAiPlayer, createRoom, startGame, type ArtifactCard, type AffinityCounts } from "@workspace/api-client-react";
import {
  DEFAULT_VICTORY_REQUIREMENT,
  isArchitectFirstContactStance,
} from "@workspace/game-types";
import { gameAudio } from "@/lib/audio";
import {
  getTutorialSoundMoment,
  TUTORIAL_ASSEMBLY_SOUND_TIMING,
} from "@/lib/tutorialAudio";
import { getAccountSession, getAccountToken } from "@/lib/accountSession";
import { getSession, saveSession } from "@/lib/session";
import { LumiiOrb } from "@/components/LumiiTutorial";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";
import { CARD_ART } from "@/lib/cardArtManifest";
import {
  calculateTutorialCameraScrollTop,
  calculateTutorialGuidePosition,
  calculateTutorialTetherEndpoint,
  tutorialCostRegion,
  type TutorialGuidePoint,
  type TutorialGuideRect,
} from "@/lib/tutorialGuidance";

// ─── Card art ─────────────────────────────────────────────────────────────────
function asGameCard(card: TutorialCardData): ArtifactCard {
  return {
    id: card.id,
    tier: card.tier,
    bonusAffinity: card.bonusAffinity === "singularity" ? "radiance" : card.bonusAffinity,
    eminence: card.eminence,
    cost: {
      flare: 0,
      radiance: 0,
      verdance: 0,
      continuum: 0,
      abyss: 0,
      singularity: 0,
      ...card.cost,
    },
    name: card.name,
    flavor: "A guided Luminae artifact.",
  };
}

// ─── Affinity emblems ─────────────────────────────────────────────────────────
const ALL_AFFINITIES: AffinityKey[] = [...AFFINITY_KEYS];

function chooseTutorialBranch(
  dispatch: React.Dispatch<TAction>,
  choice: TutorialBranchChoice,
): void {
  const isDebugReplay = import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("tutorialDebug") === "1";
  if (!isDebugReplay && isArchitectFirstContactStance(choice)) {
    recordFirstContactStance(choice);
  }
  dispatch({ type: "BRANCH_CHOICE", choice });
}

// ─── AffinityToken ──────────────────────────────────────────────────────────────────
function AffinityToken({ affinity, size = 14 }: { affinity: AffinityKey; size?: number }) {
  return <AffinityEmblem color={affinity} size={size} />;
}

// ─── DialogueBox ──────────────────────────────────────────────────────────────
function DialogueBox({
  beatId, lines, lineIndex, onTap, nudge, mode,
  playerResponse, onPlayerResponse, choices, onChoice, requireAction = false,
}: {
  beatId: string;
  lines: { text: string }[];
  lineIndex: number;
  onTap: () => void;
  nudge: string | null;
  mode: string;
  playerResponse?: string;
  onPlayerResponse?: () => void;
  choices?: { label: string; value: string }[];
  onChoice?: (value: string) => void;
  requireAction?: boolean;
}) {
  // Once any interactive button is pressed, lock out all further clicks so a
  // fast double-tap during the AnimatePresence exit animation can't fire a
  // second action (e.g. "Take me home" after the user already picked "Go").
  const interactedRef = useRef(false);
  // Debounce ref for body taps — prevents two NEXT_DLG dispatches from a fast
  // double-tap before React has time to re-render and update canTap.
  const tappingRef = useRef(false);

  const text = nudge ?? (lines[lineIndex]?.text ?? "");
  const hasText = text.trim().length > 0;
  const isLast = lineIndex >= lines.length - 1;
  const isPassiveMode = mode === "listen" || mode === "look";
  const showChoices    = !nudge && isLast && !!choices?.length && !!onChoice;
  const showResponseBtn = !showChoices && !nudge && isLast && !!playerResponse && !!onPlayerResponse;
  const canTap = !requireAction && !showResponseBtn && !showChoices && (isPassiveMode || !isLast);

  const hintText = (() => {
    if (nudge || showResponseBtn || showChoices || requireAction) return null;
    if (!isLast) return "tap to continue";
    if (isPassiveMode) return "tap to continue";
    return null;
  })();

  useEffect(() => {
    if (!showChoices && !showResponseBtn) return;
    const timer = setTimeout(
      () => gameAudio.playTutorialCue("choice-presented"),
      90,
    );
    return () => clearTimeout(timer);
  }, [showChoices, showResponseBtn]);

  return (
    <motion.div
      key={nudge ? "nudge" : `line-${lineIndex}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      className="relative"
    >
      <div
        className={`tutorial-dialogue-card bg-slate-950/95 border border-white/10 rounded-2xl px-5 py-4 max-w-sm mx-auto shadow-2xl select-none ${canTap ? "cursor-pointer active:scale-[0.985]" : ""}`}
        onClick={canTap ? () => {
          if (tappingRef.current) return;
          tappingRef.current = true;
          setTimeout(() => { tappingRef.current = false; }, 380);
          gameAudio.playButtonSelect();
          onTap();
        } : undefined}
        style={{ boxShadow: nudge ? "0 0 0 2px rgba(251,191,36,0.5), 0 8px 32px rgba(0,0,0,0.8)" : "0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.9)", transition: "transform 0.08s ease" }}
      >
        {hasText && (
          <div className="flex items-start">
            <div className="flex-1">
              <p className="tutorial-dialogue-text text-sm text-white/90 leading-relaxed">
                <TutorialSemanticText
                  text={text}
                  beatId={beatId}
                  lineIndex={lineIndex}
                  animateIntroductions={!nudge}
                />
              </p>
              {hintText && (
                <p className="tutorial-dialogue-hint text-[10px] text-white/35 mt-2 tut-hint-twinkle">{hintText}</p>
              )}
            </div>
          </div>
        )}
        {showResponseBtn && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.04, duration: 0.16, ease: "easeOut" }}
            onClick={() => { if (interactedRef.current) return; interactedRef.current = true; gameAudio.playButtonConfirm(); onPlayerResponse!(); }}
            className={`${hasText ? "mt-3" : ""} flex min-h-11 w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm font-medium tracking-wide text-amber-200 select-none cursor-pointer transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.985]`}
            style={{
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.3)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 12px rgba(251,191,36,0.1)",
            }}
          >
            <span>{playerResponse}</span>
            <ChevronRight aria-hidden="true" className="ml-3 h-4 w-4 shrink-0 text-amber-200/55" />
          </motion.button>
        )}
        {showChoices && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.04, duration: 0.16, ease: "easeOut" }}
            className="mt-3 flex flex-col gap-2 border-t border-white/[0.07] pt-3"
          >
            {choices!.map((c, i) => (
              <button
                key={c.value}
                onClick={() => { if (interactedRef.current) return; interactedRef.current = true; gameAudio.playButtonConfirm(); onChoice!(c.value); }}
                className="group flex min-h-11 w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm font-medium tracking-wide select-none cursor-pointer transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.985]"
                style={i === 0 ? {
                  background: "rgba(251,191,36,0.12)",
                  border: "1px solid rgba(251,191,36,0.45)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 16px rgba(251,191,36,0.13)",
                  color: "rgba(253,230,138,1)",
                } : {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.035)",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                <span>{c.label}</span>
                <ChevronRight
                  aria-hidden="true"
                  className={`ml-3 h-4 w-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${i === 0 ? "text-amber-200/55" : "text-white/25"}`}
                />
              </button>
            ))}
          </motion.div>
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
  // Drive drawn via timeout — onAnimationComplete is unreliable inside
  // AnimatePresence initial={false} because the initial draw-in animation
  // is suppressed on first mount, so the callback never fires.
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 820); // draw-in ~750ms + buffer
    return () => clearTimeout(t);
  }, []);
  const perimeter = 246; // approximate for rx=6, w=104, h=24
  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20"
      width={BOARD_CARD_W}
      height={BOARD_CARD_H}
      style={{ overflow: "visible" }}
    >
      {/* Draw-in stroke */}
      <motion.rect
        x={4} y={134} width={104} height={24} rx={6}
        fill="none"
        stroke="#fbbf24"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeDasharray={perimeter}
        initial={{ strokeDashoffset: perimeter, opacity: 0, filter: "drop-shadow(0 0 3px rgba(251,191,36,0.5))" }}
        animate={drawn ? { strokeDashoffset: 0 } : { strokeDashoffset: 0, opacity: 1, filter: "drop-shadow(0 0 5px rgba(251,191,36,0.8))" }}
        transition={drawn ? { strokeDashoffset: { duration: 0 } } : { strokeDashoffset: { duration: 0.7, ease: "easeInOut" }, opacity: { duration: 0.05 }, filter: { duration: 0.05 } }}
        onAnimationComplete={() => { if (!drawn) setDrawn(true); }}
        className={drawn ? "tut-forge-pulse" : ""}
      />
    </svg>
  );
}

// ─── TutorialCard ─────────────────────────────────────────────────────────────
function TutorialCard({
  card,
  bonuses,
  heldAffinities,
  highlighted,
  foreground,
  costHighlight,
  ringPulse,
  forged,
  impossible,
  compact = false,
  slotKey,
  concealedForCipher,
  viewMode = "all",
  wellSel = {},
  onTap,
}: {
  card: TutorialCardData;
  bonuses: Record<AffinityKey, number>;
  heldAffinities: Record<AffinityKey, number>;
  highlighted?: boolean;
  foreground?: boolean;
  costHighlight?: boolean;
  ringPulse?: boolean;
  forged?: boolean;
  impossible?: boolean;
  compact?: boolean;
  slotKey?: string;
  concealedForCipher?: boolean;
  viewMode?: TutorialForgeView;
  wellSel?: Partial<Record<AffinityKey, number>>;
  onTap?: () => void;
}) {
  const eff = effectiveCost(card, bonuses);
  const artUrl = CARD_ART[card.id];
  const bonusMeta = AFFINITY_META[card.bonusAffinity];

  const bgStyle: React.CSSProperties = artUrl
    ? { backgroundImage: `url(${artUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(175deg, #021005 0%, #063020 50%, #020c04 100%)` };

  // The normal Forge view now uses the live game's Artifact renderer. The two
  // teaching-only cost modes below retain their bespoke chips until they can
  // be expressed through the shared renderer without losing their lesson.
  const sharedCosts = viewMode === "discounted"
    ? eff
    : viewMode === "needed"
      ? Object.fromEntries(
          (Object.entries(card.cost) as [AffinityKey, number][]).map(([affinity, cost]) => [
            affinity,
            Math.max(0, (eff[affinity] ?? cost) - (heldAffinities[affinity] ?? 0) - (wellSel[affinity] ?? 0)),
          ]),
        ) as Partial<Record<AffinityKey, number>>
      : undefined;

  if (compact) {
    const gameCard = asGameCard(card);
    const displayedCosts = sharedCosts ?? gameCard.cost;
    const affordable = canAfford(card, heldAffinities, bonuses);
    const interactive = Boolean(onTap && !forged);
    const cardLabel = `${card.name}, Tier ${card.tier} Artifact${card.eminence > 0 ? `, ${card.eminence} Eminence` : ""}`;
    const forgeStyle = {
      "--forge-affinity": bonusMeta.hex,
      "--forge-affinity-glow": bonusMeta.glowHex,
    } as React.CSSProperties;

    return (
      <motion.div
        data-testid="forge-card-slot"
        data-tutorial-card-id={card.id}
        data-card-id={card.id}
        data-slot-key={slotKey}
        data-bonus-affinity={card.bonusAffinity}
        data-affordable={affordable ? "true" : undefined}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? cardLabel : undefined}
        animate={{ scale: 1, y: 0 }}
        whileTap={interactive ? { scale: 0.94 } : undefined}
        onClick={interactive ? onTap : undefined}
        onKeyDown={interactive ? (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onTap?.();
        } : undefined}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className={`forge-foundry-mold board-forge-compact-chip relative min-w-0 shrink-0 overflow-hidden ${interactive ? "cursor-pointer" : ""}`}
        style={{ ...forgeStyle, visibility: concealedForCipher ? "hidden" : undefined }}
      >
        <div className="compact-forge-card-stage pointer-events-none origin-top-left">
          <ArtifactCardView card={gameCard} tier={card.tier} artOnly />
        </div>
        <CompactForgeCardReadout card={gameCard} costs={displayedCosts} />
        {highlighted && (
          <div className="pointer-events-none absolute inset-0 z-20 tut-card-highlight" style={{ boxShadow: "inset 0 0 0 2px rgba(251,191,36,0.9), 0 0 14px rgba(251,191,36,0.55)" }} />
        )}
        {costHighlight && (
          <div className="pointer-events-none absolute inset-x-1 bottom-1 z-20 h-[20px] border border-amber-300/90" style={{ boxShadow: "0 0 9px rgba(251,191,36,0.7)", animation: "card-ring-pulse 1.6s ease-in-out infinite" }} />
        )}
        {ringPulse && <div className="pointer-events-none absolute inset-0 z-20" style={{ animation: "card-ring-pulse 1.6s ease-in-out infinite" }} />}
      </motion.div>
    );
  }

  if (["all", "discounted", "needed"].includes(viewMode)) {
    return (
      <motion.div
        data-tutorial-card-id={card.id}
        animate={{ scale: 1, y: 0 }}
        whileTap={onTap && !forged ? { scale: 0.94 } : undefined}
        onClick={onTap && !forged ? onTap : undefined}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className={`tutorial-forge-card-shell relative shrink-0 ${onTap && !forged ? "cursor-pointer" : ""}`}
        style={{ visibility: concealedForCipher ? "hidden" : undefined }}
      >
        {costHighlight && <CostCallout />}
        <div className={highlighted ? "rounded-xl ring-2 ring-amber-400 tut-card-highlight" : "rounded-xl"}>
          <ArtifactCardView
            card={asGameCard(card)}
            tier={card.tier}
            tapped={foreground}
            effectiveCosts={sharedCosts}
            bonusCosts={viewMode === "needed" ? eff : undefined}
            hideStrike={viewMode === "needed"}
            onTap={onTap && !forged ? onTap : undefined}
          />
        </div>
        {ringPulse && <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ animation: "card-ring-pulse 1.6s ease-in-out infinite" }} />}
        {forged && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-[10px] text-white/60 font-semibold bg-black/70 rounded px-2 py-0.5">Forged</span></div>}
      </motion.div>
    );
  }

  // Compute the displayed cost value and styling per affinity based on viewMode
  const getCostDisplay = (k: AffinityKey, baseCost: number): { value: number | "✓"; showStrike: boolean; strikeValue: number; bgClass: string; textClass: string } => {
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
      const held = heldAffinities[k] ?? 0;
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
      data-tutorial-card-id={card.id}
      animate={{ scale: 1, y: 0 }}
      whileTap={onTap && !forged ? { scale: 0.94 } : undefined}
      onClick={onTap && !forged ? onTap : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`tutorial-forge-card-shell relative shrink-0 ${onTap && !forged ? "cursor-pointer" : ""}`}
      style={{ width: BOARD_CARD_W, height: BOARD_CARD_H, visibility: concealedForCipher ? "hidden" : undefined }}
    >
      {costHighlight && <CostCallout />}
      {ringPulse && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none z-10"
          style={{ animation: "card-ring-pulse 1.6s ease-in-out infinite" }}
        />
      )}
      <div
        className={`absolute inset-0 rounded-xl overflow-hidden shadow-xl ${highlighted ? "ring-2 ring-amber-400" : "ring-1 ring-white/10"} ${forged ? "opacity-40 grayscale" : ""} ${impossible ? "opacity-50" : ""}`}
        style={{ ...bgStyle }}
      >
        {foreground && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 90% 80% at 50% 40%, rgba(255,240,180,0.18) 0%, transparent 70%)",
              zIndex: 5,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/90" />
        {highlighted && (
          <div className="absolute inset-0 bg-amber-400/15 rounded-xl tut-card-highlight" />
        )}
        <div className="relative z-10 h-full p-2 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            {card.eminence > 0 ? <EminenceBadge value={card.eminence} /> : <span />}
            <div className="w-4 h-4 rounded-full ring-1 ring-black/40 overflow-hidden">
              <img src={bonusMeta.image} alt={bonusMeta.name} className="w-full h-full object-contain" draggable={false} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[8px] font-semibold text-white drop-shadow line-clamp-2 leading-tight">{card.name}</div>
            <div className="flex flex-wrap gap-0.5 justify-end">
              {(Object.entries(card.cost) as [AffinityKey, number][]).map(([k, v]) => {
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
                    <AffinityToken affinity={k} size={9} />
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
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, []);
  return is;
}

// ─── Tutorial Card Sheet ──────────────────────────────────────────────────────
// Bottom sheet that slides up when a card is tapped — matches real game's action
// sheet pattern. Forge/Reserve actions happen here rather than below the card.
function TutorialCardSheet({
  card, bonuses, heldAffinities, viewMode, wellSel,
  forgeEnabled, reserveEnabled, onForge, onReserve, onClose,
}: {
  card: TutorialCardData;
  bonuses: Record<AffinityKey, number>;
  heldAffinities: Record<AffinityKey, number>;
  viewMode: TutorialForgeView;
  wellSel: Partial<Record<AffinityKey, number>>;
  forgeEnabled: boolean;
  reserveEnabled: boolean;
  onForge?: () => void;
  onReserve?: () => void;
  onClose: () => void;
}) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const [pendingAction, setPendingAction] = useState<"forge" | "reserve" | null>(null);
  // Sheet is always mounted when visible (AnimatePresence controls lifecycle).
  useFocusTrap(sheetRef, true, onClose);

  const artUrl = CARD_ART[card.id];
  const bonusMeta = AFFINITY_META[card.bonusAffinity];
  const eff = effectiveCost(card, bonuses);
  const affordable = canAfford(card, heldAffinities, bonuses);

  const bgStyle: React.CSSProperties = artUrl
    ? { backgroundImage: `url(${artUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(175deg, #021005 0%, #063020 50%, #020c04 100%)` };

  const getCostDisplay = (k: AffinityKey, baseCost: number): { value: number | "✓"; showStrike: boolean; strikeValue: number; bgClass: string; textClass: string } => {
    if (viewMode === "discounted") {
      const effCost = eff[k] ?? 0;
      const reduced = effCost < baseCost;
      const free = effCost === 0;
      return { value: free ? "✓" : effCost, showStrike: reduced && !free, strikeValue: baseCost, bgClass: free ? "bg-green-900/80" : reduced ? "bg-blue-900/80" : "bg-black/60", textClass: free ? "text-green-300" : reduced ? "text-blue-200" : "text-white" };
    }
    if (viewMode === "needed") {
      const effCost = eff[k] ?? 0;
      const held = heldAffinities[k] ?? 0;
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
        className="fixed inset-0 z-[90] bg-black/50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      <motion.div
        ref={(el) => { sheetRef.current = el; }}
        role="dialog"
        aria-modal="true"
        aria-label="Artifact actions"
        key="card-sheet-panel"
        className="fixed left-0 right-0 bottom-0 z-[91] rounded-t-2xl border-t border-white/15 shadow-2xl"
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
                {card.eminence > 0 && <EminenceBadge value={card.eminence} compact />}
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
              {card.eminence > 0 && (
                <div className="flex items-center gap-1">
                  <EminenceBadge value={card.eminence} compact />
                  <span className="text-[11px] text-amber-300 font-bold">Eminence</span>
                </div>
              )}
              <div className="text-[9px] text-white/30 mt-0.5">
                Forging grants <span style={{ color: bonusMeta.glowHex }}>+1 {bonusMeta.shortName}</span> bonus permanently
              </div>
              {hasCost ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {(Object.entries(card.cost) as [AffinityKey, number][]).map(([k, v]) => {
                    if (!v || v <= 0) return null;
                    const display = getCostDisplay(k, v);
                    return (
                      <div key={k} className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 ${display.bgClass}`}>
                        {display.showStrike && <span className="text-[7px] text-white/30 line-through mr-0.5">{display.strikeValue}</span>}
                        <span className={`text-[10px] font-bold ${display.textClass}`}>{display.value}</span>
                        <AffinityToken affinity={k} size={10} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[9px] text-green-400 font-bold mt-1">Free to forge</div>
              )}
            </div>
          </div>
          {/* Real game action controls, with tutorial-specific availability rules. */}
          <div className={onReserve !== undefined ? "grid grid-cols-2 gap-3" : "w-full"}>
            <ForgeButton
              onClick={() => {
                if (pendingAction === "forge") {
                  gameAudio.playButtonConfirm();
                  onForge?.();
                } else {
                  gameAudio.playButtonSelect();
                  setPendingAction("forge");
                }
              }}
              disabled={!forgeEnabled || !affordable || !onForge}
              isPending={pendingAction === "forge"}
              label={pendingAction === "forge" ? "CONFIRM" : "FORGE"}
              subtitle={pendingAction === "forge"
                ? "Tap to forge"
                : forgeEnabled
                  ? (affordable ? "Forge Artifact" : "Need more affinities")
                  : "Follow Lumii's lead"}
              confirmHex={bonusMeta.hex}
              confirmGlow={bonusMeta.glowHex}
              darkText={["radiance", "verdance", "singularity"].includes(card.bonusAffinity)}
            />
            {onReserve !== undefined && (
              <EncryptButton
                onClick={() => {
                  if (pendingAction === "reserve") {
                    gameAudio.playButtonConfirm();
                    onReserve?.();
                  } else {
                    gameAudio.playButtonSelect();
                    setPendingAction("reserve");
                  }
                }}
                disabled={!reserveEnabled}
                isPending={pendingAction === "reserve"}
                label={pendingAction === "reserve" ? "CONFIRM" : "ENCRYPT"}
                subtitle={pendingAction === "reserve"
                  ? "Tap to encrypt"
                  : reserveEnabled ? "Encrypt Artifact" : "Follow Lumii's lead"}
                sigilId={card.id.length}
              />
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Affinity Well ─────────────────────────────────────────────────────────────
function AffinityWell({
  s, dispatch, beatId, subStep, wellEnabled, singularityLocked = true, harnessBurstKeys, singularityAbsorbKey, onOpenReserved, embedded = false,
}: {
  s: TutState;
  dispatch: React.Dispatch<TAction>;
  beatId: string;
  subStep: number;
  wellEnabled: boolean;
  singularityLocked?: boolean;
  harnessBurstKeys?: Partial<Record<AffinityKey, number>>;
  singularityAbsorbKey?: number;
  onOpenReserved?: () => void;
  embedded?: boolean;
}) {
  const totalSel = Object.values(s.wellSel).reduce((a, b) => a + b, 0);
  const guidedAffinities = getTutorialHarnessPattern(beatId, subStep);
  const isGuidedBeat = guidedAffinities !== null;
  const selectedEntries = Object.entries(s.wellSel).filter(([, count]) => count > 0) as [AffinityKey, number][];
  const guidedSelectionIsValid = !guidedAffinities || selectedEntries.every(
    ([affinity, count]) => guidedAffinities[affinity] === count,
  );
  const guidedSelectionIsComplete = Boolean(guidedAffinities) && guidedSelectionIsValid && Object.entries(guidedAffinities ?? {}).every(
    ([affinity, count]) => (s.wellSel[affinity as AffinityKey] ?? 0) === count,
  );

  useEffect(() => {
    if (guidedSelectionIsValid) return;
    dispatch({ type: "CLEAR_SEL" });
  }, [dispatch, guidedSelectionIsValid]);

  const allowedSingleAffinities: readonly AffinityKey[] | undefined = guidedAffinities
    ? (Object.entries(guidedAffinities) as [AffinityKey, number][])
        .filter(([affinity, amount]) => amount === 1 && (s.wellSel[affinity] ?? 0) === 0)
        .map(([affinity]) => affinity)
    : wellEnabled ? undefined : [];
  const allowedTakeTwoAffinities: readonly AffinityKey[] | undefined = guidedAffinities
    ? (Object.entries(guidedAffinities) as [AffinityKey, number][])
        .filter(([, amount]) => amount === 2 && totalSel === 0)
        .map(([affinity]) => affinity)
    : wellEnabled ? undefined : [];
  const singularityInteractive = !singularityLocked && beatId === "b11_forge_reserved" && subStep >= 1 && Boolean(onOpenReserved);

  const isWellPulse = beatId === "b7b_cost_bridge";
  const tutorialPlayer = {
    playerId: "tutorial-you",
    playerName: "You",
    affinities: s.affinities,
    bonuses: s.bonuses,
    reservedArtifacts: s.reserved.map((id) => asGameCard(TUTORIAL_CARDS[id])).filter(Boolean),
    forgedArtifacts: s.forged.map((id) => asGameCard(TUTORIAL_CARDS[id])).filter(Boolean),
  };
  const tutorialGame = {
    players: [tutorialPlayer],
    affinityWell: s.wellBank,
    luminaryAffinities: [],
    turnCount: 0,
  };

  const handleAffinityClick = (affinity: keyof AffinityCounts) => {
    const key = affinity as AffinityKey;
    const current = s.wellSel[key] ?? 0;
    const guided = guidedAffinities?.[key] ?? 0;
    const isLocked = key === "singularity" && singularityLocked;
    const canAdd = !isLocked && wellEnabled && current === 0 && (s.wellBank[key] ?? 0) > 0 && (!isGuidedBeat || guided === 1);
    if (!canAdd) return;

    const selected = Object.entries(s.wellSel).filter(([, count]) => count > 0) as [AffinityKey, number][];
    const hasOtherAffinity = selected.some(([selectedAffinity]) => selectedAffinity !== key);
    const prospectiveTotal = totalSel + 1;
    const isValidThreeDifferent = current === 0 && !hasOtherAffinity ? prospectiveTotal <= 3 : current === 0 && hasOtherAffinity && selected.length < 3;
    const isValidTwoOfSame = false;
    if (!isValidThreeDifferent && !isValidTwoOfSame) {
      dispatch({ type: "NUDGE", msg: "Harness up to 3 different affinities, or 2 of the same affinity." });
      return;
    }
    gameAudio.playAffinitySelected(key);
    dispatch({ type: "SEL_AFF", affinity: key, delta: 1 });
  };
  const handleTakeTwo = (affinity: AffinityKey) => {
    const current = s.wellSel[affinity] ?? 0;
    const guided = guidedAffinities?.[affinity];
    if (isGuidedBeat && guided !== 2) {
      const target = (Object.entries(guidedAffinities ?? {}) as [AffinityKey, number][]).find(([, amount]) => amount === 2)?.[0];
      dispatch({ type: "NUDGE", msg: target ? `Use ×2 on ${AFFINITY_META[target].name}.` : "Follow Lumii's highlighted Harness pattern." });
      return;
    }
    if (!wellEnabled || current !== 0 || totalSel !== 0 || (s.wellBank[affinity] ?? 0) < 4) {
      dispatch({ type: "NUDGE", msg: "×2 needs 4 or more of that affinity remaining in the Well." });
      return;
    }
    gameAudio.playAffinitySelected(affinity);
    dispatch({ type: "SEL_AFF", affinity, delta: 2 });
  };
  const selectedKeys = Object.keys(s.wellSel).filter((affinity) => (s.wellSel[affinity as AffinityKey] ?? 0) > 0) as AffinityKey[];
  const canHarness = wellEnabled && totalSel > 0 && (!isGuidedBeat || guidedSelectionIsComplete);
  const undoLastAffinity = () => {
    const lastAffinity = [...selectedKeys].pop();
    if (!lastAffinity) return;
    if ((s.wellSel[lastAffinity] ?? 0) === 2) {
      dispatch({ type: "CLEAR_SEL" });
      return;
    }
    dispatch({ type: "SEL_AFF", affinity: lastAffinity, delta: -1 });
  };
  const selectedMetas = selectedKeys
    .map((affinity) => ({ affinity, meta: AFFINITY_META[affinity] }))
    .filter((entry): entry is { affinity: AffinityKey; meta: (typeof AFFINITY_META)[AffinityKey] } =>
      !!entry.meta && typeof entry.meta.hex === "string"
    );
  const firstSelectedMeta = selectedMetas[0]?.meta;
  const harnessGradient = selectedMetas.length === 0
    ? "transparent"
    : [
        ...selectedMetas.map(({ meta }, index) => {
          const positions = [
            ["18%", "48%"],
            ["50%", "22%"],
            ["80%", "52%"],
          ];
          const [x, y] = positions[index % positions.length];
          return `radial-gradient(circle at ${x} ${y}, ${meta.hex} 0%, ${meta.hex}cc 13%, transparent 33%)`;
        }),
        `linear-gradient(90deg, ${firstSelectedMeta?.hex ?? "#ffffff"}55, rgba(255,255,255,0.10), ${selectedMetas[selectedMetas.length - 1]?.meta.hex ?? firstSelectedMeta?.hex ?? "#ffffff"}55)`,
      ].join(", ");
  const actionInstruction = beatId === "b12_tier2" && s.tier2GrantPending
    ? "Lumii is bringing the missing Verdance."
    : beatId === "b13_tier3"
    ? [
        s.tier3GrantPending ? "Lumii is bringing Affinities from the Well." : "Use Continuum ×2 to Harness 2.",
        "Worldroot Lattice is ready to Forge.",
      ][Math.min(subStep, 1)]
    : beatId === "b16_final_forge" && s.finalGrantPending
      ? "Lumii is bringing 5 Continuum."
    : beatId === "b16_final_forge" && s.finalDeliveryComplete
      ? "Epoch Graft Ledger is ready to Forge."
    : null;

  const wellContent = (
    <>
      {!embedded && <div className="flex items-center justify-between px-3 pt-2">
        <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${isWellPulse ? "text-cyan-300/80" : "text-[#a8c5ff]/65"}`}>
          The Affinity Well <Droplets className="h-3 w-3 shrink-0" />
        </div>
        <span className="text-[9px] text-white/30">{totalSel ? `${totalSel} selected` : "Harness"}</span>
      </div>}
      <AffinityWellCells
        me={tutorialPlayer}
        state={tutorialGame}
        selectedAffinities={s.wellSel as Partial<AffinityCounts>}
        isMyTurn={wellEnabled}
        canPlan={false}
        isActivePlayer
        isTutorial={false}
        tutorialZone={null}
        tutorialAttention={null}
        sessionPlayerId="tutorial-you"
        harnessBurstKeys={harnessBurstKeys}
        singularityAbsorbKey={singularityAbsorbKey}
        allowedSingleAffinities={allowedSingleAffinities}
        allowedTakeTwoAffinities={allowedTakeTwoAffinities}
        singularityInteractive={singularityInteractive}
        onAffinityClick={handleAffinityClick}
        onPromoteToTake2={handleTakeTwo}
        onOpenReserved={onOpenReserved ?? (() => undefined)}
        onOpenForged={() => undefined}
      />
      <div className="affinity-well-action-zone px-2 pb-2 pt-1 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
            {selectedKeys.length > 0 ? selectedKeys.map((affinity) => (
              <div key={affinity} className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-black/50 py-0.5 pl-1.5 pr-2">
                <AffinityToken affinity={affinity} size={12} />
                <span className="text-xs font-bold text-white">×{s.wellSel[affinity]}</span>
              </div>
            )) : <span className="text-[10px] text-white/40">{actionInstruction ?? "Pick affinities"}</span>}
          </div>
          <button
            type="button"
            onClick={undoLastAffinity}
            disabled={selectedKeys.length === 0}
            aria-label="Undo last affinity"
            className="h-7 w-7 shrink-0 rounded-lg border border-white/10 bg-white/[0.03] text-white/55 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <Undo2 className="mx-auto h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "CLEAR_SEL" })}
            disabled={selectedKeys.length === 0}
            aria-label="Clear selected affinities"
            className="h-7 w-7 shrink-0 rounded-lg border border-white/10 bg-white/[0.03] text-white/55 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <X className="mx-auto h-3.5 w-3.5" />
          </button>
          <motion.button
            type="button"
            data-testid="harness-button"
            onClick={() => { if (canHarness) dispatch({ type: "HARNESS" }); }}
            disabled={!canHarness}
            whileTap={canHarness ? { scale: 0.93, transition: { duration: 0.07 } } : undefined}
            className="relative h-7 shrink-0 overflow-hidden rounded-lg border px-3 text-xs font-bold transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: firstSelectedMeta ? `${firstSelectedMeta.hex}70` : "rgba(255,255,255,0.18)",
              boxShadow: firstSelectedMeta ? `inset 0 1px 0 rgba(255,255,255,0.18), 0 0 14px ${firstSelectedMeta.hex}44` : "inset 0 1px 0 rgba(255,255,255,0.08)",
              color: canHarness ? "#fff" : "rgba(255,255,255,0.35)",
              cursor: canHarness ? "pointer" : "not-allowed",
            }}
          >
            {selectedKeys.length > 0 && <span className="absolute -inset-[60%] opacity-50 harness-swirl-ring harness-swirl-soft" style={{ background: harnessGradient }} />}
            <span className="relative z-10" style={{ textShadow: canHarness ? "0 1px 5px rgba(0,0,0,0.85)" : "none" }}>Harness</span>
          </motion.button>
        </div>
      </div>
    </>
  );

  if (embedded) return wellContent;

  return (
    <motion.div
      className={`tutorial-affinity-well relative overflow-hidden border-t border-b transition-colors ${isWellPulse ? "border-cyan-300/40" : "border-[#a8c5ff]/20"}`}
      style={{
        background: "linear-gradient(180deg, rgba(7,6,18,0.96) 0%, rgba(3,2,12,0.98) 100%)",
        animation: isWellPulse ? "well-pulse 1.6s ease-in-out infinite" : undefined,
      }}
    >
      {wellContent}
    </motion.div>
  );
}

function LumiiAffinityDelivery({ drops }: { drops: Array<{ affinity: AffinityKey; amount: number }> }) {
  const [targets, setTargets] = useState<Array<{ affinity: AffinityKey; x: number; y: number }>>([]);
  const [source, setSource] = useState(() => ({
    x: window.innerWidth * 0.86,
    y: Math.min(window.innerHeight * 0.28, 230),
  }));
  const dropKey = drops.map(({ affinity, amount }) => `${affinity}:${amount}`).join("|");

  useLayoutEffect(() => {
    const updateTargets = () => {
      const lumii = document
        .querySelector('[data-tutorial-lumii-presence="primary"] [data-lumii-core]')
        ?.getBoundingClientRect();
      if (lumii) {
        setSource({
          x: lumii.left + lumii.width / 2,
          y: lumii.top + lumii.height / 2,
        });
      }
      const nextTargets = drops.flatMap(({ affinity, amount }) => {
        const selector = affinity === "singularity"
          ? "[data-singularity-well]"
          : `[data-affinity-well=\"${affinity}\"]`;
        const cell = document.querySelector(selector)?.getBoundingClientRect();
        if (!cell) return [];
        return Array.from({ length: amount }, () => ({
          affinity,
          x: cell.left + cell.width / 2,
          y: cell.top + cell.height / 2,
        }));
      });
      setTargets(nextTargets);
    };

    const frame = requestAnimationFrame(updateTargets);
    const settleTimer = window.setTimeout(updateTargets, 320);
    window.addEventListener("resize", updateTargets);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.removeEventListener("resize", updateTargets);
    };
    // The parent supplies inline arrays; dropKey captures their meaningful value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropKey]);

  return (
    <div
      className="fixed inset-0 z-[65] pointer-events-none overflow-hidden"
      data-tutorial-affinity-source="lumii"
    >
      {targets.map((drop, index) => (
        <motion.div
          key={`${drop.affinity}-${index}`}
          className="fixed"
          style={{ translateX: "-50%", translateY: "-50%" }}
          initial={{ left: source.x, top: source.y, opacity: 0, scale: 0.35 }}
          animate={{
            left: [source.x, source.x, drop.x],
            top: [source.y, source.y + 20, drop.y],
            opacity: [0, 1, 1, 0],
            scale: [0.35, 1.15, 0.78, 0.4],
          }}
          transition={{ delay: 0.48 + index * 0.12, duration: 0.82, ease: "easeInOut" }}
        >
          <AffinityEmblem color={drop.affinity} size={28} />
        </motion.div>
      ))}
    </div>
  );
}

function ForgeAffinityReturn({ affinities }: { affinities: AffinityKey[] }) {
  const reducedMotion = useReducedMotion();
  const [targets, setTargets] = useState<Array<{ affinity: AffinityKey; x: number; y: number }>>([]);
  const affinityKey = affinities.join("|");

  useLayoutEffect(() => {
    const occurrence = new Map<AffinityKey, number>();
    setTargets(affinities.flatMap((affinity) => {
      const selector = affinity === "singularity"
        ? "[data-singularity-well]"
        : `[data-affinity-well="${affinity}"]`;
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      if (!rect) return [];
      const index = occurrence.get(affinity) ?? 0;
      occurrence.set(affinity, index + 1);
      return [{
        affinity,
        x: rect.left + rect.width / 2 + index * 5,
        y: rect.top + rect.height / 2,
      }];
    }));
    // affinityKey captures the meaningful contents of the inline array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affinityKey]);

  const sourceX = window.innerWidth / 2;
  const sourceY = window.innerHeight * 0.43;
  return (
    <div className="pointer-events-none fixed inset-0 z-[66] overflow-hidden" aria-label="Forged Affinities returning to the Well">
      {targets.map((target, index) => (
        <motion.div
          key={`${target.affinity}-${index}`}
          className="fixed"
          style={{ translateX: "-50%", translateY: "-50%" }}
          initial={reducedMotion
            ? { left: target.x, top: target.y, opacity: 0, scale: 0.7 }
            : { left: sourceX, top: sourceY, opacity: 0, scale: 0.55 }}
          animate={reducedMotion
            ? { opacity: [0, 1, 0], scale: [0.7, 1, 0.82] }
            : {
                left: [sourceX, sourceX, target.x],
                top: [sourceY, sourceY - 18, target.y],
                opacity: [0, 1, 1, 0],
                scale: [0.55, 1.18, 0.82, 0.5],
              }}
          transition={{ delay: index * 0.12, duration: reducedMotion ? 0.62 : 0.92, ease: "easeInOut" }}
        >
          <AffinityEmblem color={target.affinity} size={26} />
        </motion.div>
      ))}
    </div>
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
    <div className="border border-white/10 rounded-2xl p-3" style={{ background: "rgba(3,3,12,0.78)" }}>
      <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2">Encrypted</div>
      <div className="flex gap-3 flex-wrap">
        {s.reserved.map(id => {
          const card = TUTORIAL_CARDS[id];
          if (!card) return null;
          const isHighlighted = isForgeReservedBeat;
          return (
            <div
              key={id}
              className={isHighlighted ? "rounded-xl ring-2 ring-amber-400 tut-card-highlight" : "rounded-xl"}
            >
              <ArtifactCardView
                card={asGameCard(card)}
                effectiveCosts={effectiveCost(card, s.bonuses)}
                tier={card.tier}
                onTap={onCardTap ? () => onCardTap(
                  card,
                  forgeEnabled,
                  false,
                  () => dispatch({ type: "FORGE_RESERVED", cardId: id }),
                  undefined,
                ) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Forge view tabs ──────────────────────────────────────────────────────────
function ForgeViewTabs({
  view,
  dispatch,
}: {
  view: TutorialForgeView;
  dispatch: React.Dispatch<TAction>;
}) {
  const options: Array<{ value: TutorialForgeView; label: string; title: string }> = [
    { value: "all", label: "Full", title: "Show original printed cost" },
    { value: "discounted", label: "Discounted", title: "Cost after permanent bonuses" },
    { value: "needed", label: "Needed", title: "What remains after bonuses and held affinities" },
  ];

  return (
    <div data-testid="forge-cost-controls" className="board-forge-controls relative flex items-center gap-2 px-3 pb-2">
      <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>Cost View</span>
      <div className="flex items-center gap-0.5 rounded-full border border-border/30 bg-secondary/50 p-0.5">
        {options.map(({ value, label, title }) => (
          <button
            key={value}
            type="button"
            data-tutorial-forge-view={value}
            title={title}
            aria-pressed={view === value}
            onClick={() => dispatch({ type: "SET_VIEW", view: value })}
            className={`rounded-full px-2 py-0.5 text-[9px] font-semibold leading-none transition-all ${
              view === value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        data-testid="forge-density-toggle"
        className="board-forge-density-toggle flex h-[22px] shrink-0 items-center gap-1 border px-1.5 text-amber-400"
        title="The guided match keeps every Forge mold visible"
        aria-label="Compact Forge view is active"
        aria-pressed="true"
        onClick={() => dispatch({ type: "NUDGE", msg: "Every Forge mold stays visible; Lumii reveals only the card this lesson uses." })}
      >
        <LayoutGrid className="h-3 w-3 shrink-0" />
        <span className="text-[9px] font-bold uppercase leading-none">Compact</span>
      </button>
      <span className="board-forge-burn-pile-anchor relative ml-auto flex min-h-[22px] min-w-[30px] shrink-0" />
    </div>
  );
}

function GhostCardSlot({ tier, slotKey }: { tier: number; slotKey: string }) {
  return (
    <div
      data-testid="forge-card-slot-empty"
      data-slot-key={slotKey}
      data-tier={tier}
      aria-hidden="true"
      className="forge-foundry-mold forge-foundry-mold--empty board-forge-compact-chip min-w-0 shrink-0"
    />
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
  compact = false,
  slotKey,
}: {
  children: React.ReactNode;
  shouldAnimate: boolean;
  BackFace: React.ComponentType;
  delay?: number;
  compact?: boolean;
  slotKey?: string;
}) {
  const [phase, setPhase] = useState<"back" | "out" | "in" | "done">(
    shouldAnimate ? "back" : "done"
  );

  useEffect(() => {
    if (!shouldAnimate) return;
    const soundLead = 80; // ms before flip starts
    const ts = setTimeout(() => gameAudio.playCardFlip(), Math.max(0, delay - soundLead));
    const tf = setTimeout(() => setPhase("out"), delay);
    return () => { clearTimeout(ts); clearTimeout(tf); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  if (phase === "done") return <>{children}</>;

  if (compact) {
    return (
      <div className="tutorial-compact-flip-reveal relative h-full min-w-0" style={{ perspective: "700px" }}>
        {(phase === "back" || phase === "out") && (
          <motion.div
            data-slot-key={slotKey}
            className="forge-foundry-mold board-forge-compact-chip absolute inset-0 overflow-hidden"
            animate={phase === "out" ? { rotateY: 90 } : { rotateY: 0 }}
            transition={{ duration: 0.18, ease: "easeIn" }}
            onAnimationComplete={() => { if (phase === "out") setPhase("in"); }}
          >
            <BackFace />
          </motion.div>
        )}
        {phase === "in" && (
          <motion.div
            className="absolute inset-0"
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

  const W = BOARD_CARD_W, H = BOARD_CARD_H;
  return (
    <div className="tutorial-forge-card-shell" style={{ width: W, height: H, flexShrink: 0, perspective: "700px" }}>
      {(phase === "back" || phase === "out") && (
        <motion.div
          className="rounded-xl overflow-hidden border border-white/12 shadow-lg"
          style={{ width: W, height: H }}
          animate={phase === "out" ? { rotateY: 90 } : { rotateY: 0 }}
          transition={{ duration: 0.18, ease: "easeIn" }}
          onAnimationComplete={() => { if (phase === "out") setPhase("in"); }}
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

// ─── Scripted Forge ───────────────────────────────────────────────────────────
function ScriptedForge({ s, dispatch, beatId, onCardTap, tier1Ref, tier2Ref, tier3Ref, encryptingCardId, showEncryptionReplacement }: {
  s: TutState;
  dispatch: React.Dispatch<TAction>;
  beatId: string;
  onCardTap: (card: TutorialCardData, forgeEnabled: boolean, reserveEnabled: boolean, onForge?: () => void, onReserve?: () => void) => void;
  tier1Ref?: React.RefObject<HTMLDivElement | null>;
  tier2Ref?: React.RefObject<HTMLDivElement | null>;
  tier3Ref?: React.RefObject<HTMLDivElement | null>;
  encryptingCardId?: string;
  showEncryptionReplacement?: boolean;
}) {
  const isForgeBeat = ["b9_first_forge", "b16_final_forge"].includes(beatId);
  const isReserveBeat = beatId === "b10_reserve";

  const getCardForgeEnabled = (cardId: string) => {
    if (!isForgeBeat) return false;
    // Locked until the action instruction is visible.
    if (beatId === "b9_first_forge") {
      return cardId === FIRST_FORGE_ID &&
        isTutorialActionInstructionVisible(s.beat, s.dlgLine);
    }
    if (beatId === "b16_final_forge") {
      return cardId === FINAL_T2_ID && s.finalDeliveryComplete && !s.showLuminary;
    }
    return false;
  };

  const getCardReserveEnabled = (cardId: string) => {
    if (!isReserveBeat) return false;
    return cardId === RESERVE_CARD_ID;
  };

  const getHighlighted = (cardId: string) => {
    if (beatId === "b6b_root_lattice" || beatId === "b7_artifact_cost" || beatId === "b8_first_harness") return cardId === FIRST_FORGE_ID;
    if (beatId === "b9_first_forge") return cardId === FIRST_FORGE_ID;
    if (beatId === "b10_reserve") return cardId === RESERVE_CARD_ID;
    if (beatId === "b16_final_forge") return cardId === FINAL_T2_ID;
    return false;
  };

  const getForeground = (cardId: string) => {
    if (beatId === "b6b_root_lattice" || beatId === "b8_first_harness") return cardId === FIRST_FORGE_ID;
    if (beatId === "b9_first_forge") return cardId === FIRST_FORGE_ID;
    if (beatId === "b16_final_forge") return cardId === FINAL_T2_ID;
    return false;
  };

  const FORGE_SLOTS = 4;
  const DECK_COUNTS: Record<number, number> = { 1: 40, 2: 30, 3: 20 };
  const activeCardId = TUTORIAL_FORGE_CARD_BY_BEAT[beatId];
  const activeCardSlot = activeCardId ? TUTORIAL_FORGE_CARD_SLOTS[activeCardId] : undefined;

  const renderTierRow = (tier: 1 | 2 | 3) => {
    const deckCount = Math.max(0, (DECK_COUNTS[tier] ?? 10) - FORGE_SLOTS);
    const shelfAccent = tier === 3
      ? "rgba(244, 208, 118, 0.9)"
      : tier === 2
        ? "rgba(205, 159, 84, 0.62)"
        : "rgba(166, 132, 82, 0.44)";
    const tierRoman = tier === 3 ? "III" : tier === 2 ? "II" : "I";

    type Slot =
      | { kind: 'real'; cardId: string }
      | { kind: 'ghost' };

    const slots: Slot[] = Array.from({ length: FORGE_SLOTS }, (_, index) => {
      if (activeCardId && activeCardSlot?.tier === tier && activeCardSlot.index === index) {
        return { kind: 'real', cardId: activeCardId };
      }
      if (showEncryptionReplacement && tier === 1 && index === TUTORIAL_FORGE_CARD_SLOTS[RESERVE_CARD_ID].index) {
        return { kind: 'real', cardId: ENCRYPTION_REPLACEMENT_ID };
      }
      return { kind: 'ghost' };
    });

    return (
      <div
        key={tier}
        ref={tier === 1 ? tier1Ref : tier === 2 ? tier2Ref : tier3Ref}
        data-testid="forge-tier-shelf"
        data-tier={tier}
        data-plate-count={slots.length}
        className="board-forge-shelf relative"
        style={{ padding: "8px 8px 4px", "--shelf-accent": shelfAccent } as React.CSSProperties}
      >
        <div className="board-forge-tier-header flex items-center gap-2 px-0.5">
          <div className="board-forge-tier-mark" aria-label={`Tier ${tierRoman}`}>
            <span className="board-forge-tier-kicker">Tier</span>
            <span className="board-forge-tier-roman">{tierRoman}</span>
          </div>
          <span className="board-forge-tier-separator" aria-hidden="true"> · </span>
          <div className="board-forge-tier-name flex shrink-0 flex-col leading-none">
            <span className="board-forge-tier-full-label text-[10px] font-black uppercase">{TIER_CIVILIZATION[tier]}</span>
          </div>
          <div className="divider-brass h-px flex-1" />
          <ChevronsRight className="board-forge-scroll-cue" aria-hidden="true" />
        </div>
        <div className="board-forge-shelf-content">
          <div className="board-forge-card-row grid grid-cols-4 gap-1 pb-1">
            {slots.map((slot, idx) => {
              const slotKey = `${tier}-${idx}`;
              if (slot.kind === 'ghost') {
                return <GhostCardSlot key={`ghost-${tier}-${idx}`} tier={tier} slotKey={slotKey} />;
              }

              const { cardId } = slot;
              const card = TUTORIAL_CARDS[cardId];
              if (!card) return <GhostCardSlot key={`ghost-${cardId}`} tier={tier} slotKey={slotKey} />;
              const affordable = canAfford(card, s.affinities, s.bonuses);
              const forgeEnabled = getCardForgeEnabled(cardId);
              const reserveEnabled = getCardReserveEnabled(cardId);
              const actionTarget = forgeEnabled || reserveEnabled;
              const actionInstructionVisible = isTutorialActionInstructionVisible(
                s.beat,
                s.dlgLine,
              );
              const tutCard = (
                <TutorialCard
                  card={card}
                  bonuses={s.bonuses}
                  heldAffinities={s.affinities}
                  highlighted={getHighlighted(cardId)}
                  ringPulse={beatId === "b9_first_forge" && cardId === FIRST_FORGE_ID}
                  foreground={getForeground(cardId)}
                  costHighlight={beatId === "b7_artifact_cost" && cardId === FIRST_FORGE_ID}
                  forged={false}
                  impossible={false}
                  compact
                  slotKey={slotKey}
                  concealedForCipher={encryptingCardId === cardId}
                  viewMode={s.view}
                  wellSel={s.wellSel}
                  onTap={
                    actionTarget
                      ? () => onCardTap(
                          card,
                          forgeEnabled && affordable,
                          reserveEnabled,
                          () => dispatch({ type: "FORGE_ARTIFACT", cardId }),
                          () => dispatch({ type: "RESERVE", cardId }),
                        )
                      : (isForgeBeat || isReserveBeat) && actionInstructionVisible
                        ? () => dispatch({ type: "NUDGE", msg: TUTORIAL_BEATS[s.beat]?.wrongClickNudge ?? "Follow Lumii's highlighted action." })
                        : undefined
                  }
                />
              );

              if (cardId === FIRST_FORGE_ID) {
                if (beatId === "b6_forge_appears") {
                  return (
                    <div key={cardId} data-slot-key={slotKey} className="forge-foundry-mold board-forge-compact-chip relative min-w-0 overflow-hidden">
                      <CardBackTier1 />
                    </div>
                  );
                }
                return (
                  <CardFlipReveal
                    key={cardId}
                    shouldAnimate={beatId === "b6b_root_lattice"}
                    BackFace={CardBackTier1}
                    delay={720}
                    compact
                    slotKey={slotKey}
                  >
                    {tutCard}
                  </CardFlipReveal>
                );
              }
              if (cardId === RESERVE_CARD_ID || cardId === FINAL_T2_ID) {
                const BackFace = card.tier === 2 ? CardBackTier2 : CardBackTier1;
                return (
                  <CardFlipReveal
                    key={cardId}
                    shouldAnimate
                    BackFace={BackFace}
                    delay={420}
                    compact
                    slotKey={slotKey}
                  >
                    {tutCard}
                  </CardFlipReveal>
                );
              }
              return <Fragment key={cardId}>{tutCard}</Fragment>;
            })}
          </div>
          <aside className="board-forge-archive-rail" data-forge-archive-rail={`tier-${tier}`}>
            <ForgeDeckPile
              deckCount={deckCount}
              deckDisabled={false}
              deckTitle="Encrypt a concealed Artifact"
              isDeckPending={false}
              forgeCompact
              onCancelPlan={() => undefined}
              onDeckTap={() => dispatch({ type: "NUDGE", msg: "Lumii reveals only the Artifact used in the current lesson." })}
              tier={tier}
            />
          </aside>
        </div>
      </div>
    );
  };

  return (
    <>
      <ForgeViewTabs view={s.view} dispatch={dispatch} />
      <div data-forge-tiers="true" data-testid="forge-tier-list" className="relative flex flex-col gap-3 px-3 pb-3">
        {renderTierRow(3)}
        {renderTierRow(2)}
        {renderTierRow(1)}
      </div>
    </>
  );
}

// ─── Fullscreen Shatter Overlay ───────────────────────────────────────────────
// Matches the exact phase structure, 4-layer crack paint, 3-D shard scatter,
// and audio timing of the Luminary arrival cutscene.

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
  const isMobile = useIsMobile();
  useEffect(() => {
    if (isDetail || isMobile) return;
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
  const isMobile = useIsMobile();
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

  // Advance through phases at the same durations as the arrival cutscene.
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
  }, []);

  // Stable star positions — seeded once on mount, same look as the pre-shatter black/starry backdrop.
  // Reduced count on mobile to ease GPU pressure during the heavy shard animation.
  const stars = useMemo(() =>
    Array.from({ length: isMobile ? 12 : 30 }, () => ({
      width:    Math.random() * 2 + 1,
      height:   Math.random() * 2 + 1,
      left:     `${Math.random() * 100}%`,
      top:      `${Math.random() * 100}%`,
      opacity:  Math.random() * 0.5 + 0.1,
      duration: Math.random() * 4 + 2,
      delay:    Math.random() * 3,
    })),
  [isMobile]);

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
            willChange: 'transform, opacity',
            ...(isMobile ? {} : {
              transformPerspective: 900,
              transformStyle: 'preserve-3d',
            }),
          }}
          animate={{
            x: [0, `${parseFloat(sh.dx) * 0.08}`, sh.dx],
            y: [0, `${parseFloat(sh.dy) * 0.08}`, sh.dy],
            // Protrude toward viewer on burst, then recede as shard tumbles away
            ...(isMobile ? {} : {
              z: [0, sh.zPeak, sh.zPeak * 0.55, sh.zPeak * 0.15, 0],
            }),
            rotateX: [0, sh.rX], rotateY: [0, sh.rY], rotateZ: [0, sh.rZ],
            opacity: [1, 1, 0.96, 0.66, 0],
            filter: isMobile
              ? [
                  'brightness(1.0)',
                  'brightness(2.0) drop-shadow(0 0 8px rgba(168,204,248,0.70))',
                ]
              : [
                  'brightness(1.0)',
                  'brightness(1.4) drop-shadow(0 0 12px rgba(168,204,248,0.70))',
                  'brightness(2.0) drop-shadow(0 0 20px rgba(168,204,248,0.85))',
                  'brightness(3.2) drop-shadow(0 0 28px rgba(200,225,255,0.92))',
                  'brightness(5.0) drop-shadow(0 0 32px rgba(255,255,255,0.75))',
                ],
          }}
          transition={{
            duration: isMobile ? 3.2 : 4.5,
            delay: i * 0.04,
            x:       { times: [0, 0.06, 1.0], ease: ['easeIn', [0.10, 0.70, 0.30, 1.0]] },
            y:       { times: [0, 0.06, 1.0], ease: ['easeIn', [0.10, 0.70, 0.30, 1.0]] },
            ...(isMobile ? {} : {
              z:       { times: [0, 0.06, 0.22, 0.55, 1.0], ease: 'easeOut' },
            }),
            rotateX: { ease: 'easeOut' }, rotateY: { ease: 'easeOut' }, rotateZ: { ease: 'easeOut' },
            opacity: { times: [0, 0.08, 0.26, 0.56, 1.0], ease: 'easeInOut' },
            filter:  isMobile
              ? { times: [0, 1.0], ease: 'easeInOut' }
              : { times: [0, 0.06, 0.22, 0.60, 0.82], ease: 'easeInOut' },
          }}
        >
          {/* Ghost-thin surface glint — barely visible, preserves the glass-face feel */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: FS_SHARD_GLASS[i].spec, opacity: 1 }}
          />

          {/* Prismatic iridescence wash — ice-blue/gold/radiance, screen blend, subtle pulse */}
          {isShattering && !isMobile && (
            <motion.div className="absolute inset-0 pointer-events-none"
              style={{ background: FS_SHARD_GLASS[i].iri, mixBlendMode: 'screen' }}
              initial={{ opacity: 0.32 }}
              animate={{ opacity: [0.32, 0.26, 0.13, 0.22, 0] }}
              transition={{ duration: isMobile ? 3.2 : 4.5, times: [0, 0.18, 0.40, 0.62, 1.0], ease: 'easeInOut', delay: i * 0.04 }}
            />
          )}
          {!isShattering && (
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
          {!isMobile && (
            <div className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: 'inset 0 0 24px 5px rgba(140,195,255,0.28), inset 0 0 6px 2px rgba(255,255,255,0.18)',
              }}
            />
          )}

          {/* Cool light flood — shard catches and transmits back-light as it flies away */}
          {isShattering && !isMobile && (
            <motion.div className="absolute inset-0 pointer-events-none"
              style={{ background: 'rgba(190,220,255,1)', mixBlendMode: 'screen' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0.12, 0.55, 0.90, 0.75] }}
              transition={{ duration: isMobile ? 3.2 : 4.5, times: [0, 0.10, 0.34, 0.58, 0.78, 1.0], ease: 'easeInOut', delay: i * 0.04 }}
            />
          )}
        </motion.div>
      ))}

      {/* ── Star field — same twinkling dots as the pre-shatter black/starry backdrop,
          rendered above the glass so they're always visible */}
      {!isShattering && (
        <div className="absolute inset-0 pointer-events-none">
          {stars.map((st, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white tut-star-twinkle"
              style={{ width: st.width, height: st.height, left: st.left, top: st.top, opacity: st.opacity, ['--lum-dur' as string]: `${st.duration}s`, ['--lum-delay' as string]: `${st.delay}s` }}
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
                <circle cx="50" cy="42.5" r="7" fill={FSO_LIGHT} filter="url(#fso-cgw)"
                  className="tut-ambient-cool-1"
                  style={{ ['--lum-dur' as string]: '3.2s', ['--lum-delay' as string]: '0.4s' }}
                />
                <circle cx="50" cy="42.5" r="0.7" fill="white" filter="url(#fso-cgb)"
                  className="tut-ambient-cool-2"
                  style={{ ['--lum-dur' as string]: '2.8s', ['--lum-delay' as string]: '0.25s' }}
                />
                {/* Ice-blue bloom at P — accumulating pressure visualized as cold light */}
                <circle cx="50" cy="42.5" r="10" fill="rgba(80,180,255,1)" filter="url(#fso-cib)"
                  className="tut-ambient-cool-3"
                  style={{ ['--lum-dur' as string]: '2.6s', ['--lum-delay' as string]: '0.15s' }}
                />
                {/* Secondary teal bloom — Q junction pre-announces the second crack */}
                <circle cx="25" cy="72.5" r="7" fill="rgba(50,200,220,1)" filter="url(#fso-cib)"
                  className="tut-ambient-cool-4"
                  style={{ ['--lum-dur' as string]: '3.4s', ['--lum-delay' as string]: '0.8s' }}
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
  affKeys: AffinityKey[];
  onComplete: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const timing = prefersReducedMotion
      ? TUTORIAL_ASSEMBLY_SOUND_TIMING.reduced
      : TUTORIAL_ASSEMBLY_SOUND_TIMING.full;
    const interfaceTimer = setTimeout(
      () => gameAudio.playTutorialCue("simulation-open"),
      timing.interfaceMs,
    );
    const wellTimer = setTimeout(
      () => gameAudio.playTutorialCue("well-infusion"),
      timing.wellMs,
    );
    return () => {
      clearTimeout(interfaceTimer);
      clearTimeout(wellTimer);
    };
  }, [prefersReducedMotion]);

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
  const [filledKeys, setFilledKeys] = useState<Set<AffinityKey>>(new Set());
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

  // A two-player guided game uses the same three-card Terminus as live play.
  const lumColors = ["#ff5a3c", "#2ecc71", "#3d6bff"];

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
            <span className="text-[7px] text-[#a8c5ff]/45 tracking-widest uppercase">Guided game</span>
          </div>
        </motion.div>

        {/* Scrollable board area background */}
        <motion.div
          className="absolute left-0 right-0"
          style={{ top: 40, bottom: 144, background: "rgba(6,6,18,0.70)" }}
          initial={{ opacity: 0 }} animate={{ opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 0.6 }}
        />

        {/* ── The Terminus ── */}
        <motion.div {...sectionAnim(-28, 0.05)}
          className="absolute left-0 right-0 px-3 pt-2.5 pb-2"
          style={{ top: 40, background: "linear-gradient(180deg, rgba(15,8,40,0.55) 0%, rgba(8,5,28,0.40) 100%)", borderBottom: "1px solid rgba(120,80,220,0.22)" }}
        >
          <div className="flex items-center mb-1.5">
            <svg width="7" height="13" viewBox="0 0 10 18" fill="none" className="mr-1.5 shrink-0" style={{ color: "#C4AAFF", opacity: 0.85 }}>
              <polygon points="5,0 1.5,4.5 8.5,4.5" fill="currentColor" />
              <polygon points="1.5,4.5 2.2,15.5 7.8,15.5 8.5,4.5" fill="currentColor" />
              <rect x="0.5" y="15.5" width="9" height="2" rx="0.5" fill="currentColor" />
            </svg>
            <div className="flex flex-col leading-none">
              <span className="text-[5px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(160,130,255,0.55)" }}>The</span>
              <span className="text-[9px] font-black uppercase tracking-[0.06em]" style={{ color: "#C4AAFF", textShadow: "0 0 14px rgba(180,140,255,0.5)" }}>Terminus</span>
            </div>
            <div className="ml-1.5 h-px w-5" style={{ background: "linear-gradient(90deg, rgba(160,120,255,0.5), transparent)" }} />
          </div>
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
          className="absolute left-0 right-0 overflow-hidden"
          style={{ top: 148, padding: "10px 10px 12px", background: "linear-gradient(180deg, rgba(28,14,6,0.50) 0%, rgba(20,10,4,0.38) 100%)", borderTop: "1px solid rgba(160,100,30,0.18)", borderBottom: "1px solid rgba(160,100,30,0.18)" }}
        >
          <div className="flex items-center mb-2.5">
            <Hammer className="mr-1.5 h-3 w-3 shrink-0" style={{ color: "#D4A84B", opacity: 0.85 }} />
            <div className="flex flex-col leading-none">
              <span className="text-[5px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(192,140,60,0.55)" }}>The</span>
              <span className="text-[9px] font-black uppercase tracking-[0.06em]" style={{ color: "#D4A84B", textShadow: "0 0 14px rgba(212,168,75,0.45)" }}>Forge</span>
            </div>
            <div className="ml-1.5 h-px w-5" style={{ background: "linear-gradient(90deg, rgba(192,140,60,0.5), transparent)" }} />
          </div>
          {([3, 2, 1] as const).map((tier, ti) => {
            const BackComp = tier === 3 ? CardBackTier3 : tier === 2 ? CardBackTier2 : CardBackTier1;
            const labels = ["Galactic", "Stellar", "Planetary"] as const;
            return (
              <div key={tier} className={ti > 0 ? "mt-2" : ""}>
                <div className="flex items-center gap-1 mb-1 ml-0.5">
                  <span className="text-[6px] font-bold uppercase" style={{ color: "#C0A472", letterSpacing: "0.10em" }}>Tier {tier}, {labels[ti]}</span>
                  <div className="h-px w-5" style={{ background: "linear-gradient(90deg, rgba(192,164,114,0.36), transparent)" }} />
                </div>
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

        {/* ── Player Panel (pinned bottom) ── */}
        <motion.div {...sectionAnim(36, 0.24)}
          className="absolute left-0 right-0"
          style={{ bottom: 0, height: 144, background: "linear-gradient(180deg, rgba(6,4,20,0.97) 0%, rgba(4,2,14,0.99) 100%)", borderTop: "1px solid rgba(168,197,255,0.45)", borderRadius: "0 0 24px 24px", padding: "7px 10px 8px" }}
        >
          {/* Current game Well header: zone, player, then holdings and Eminence. */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 mb-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <Droplets className="h-2.5 w-2.5 shrink-0" style={{ color: "#a8c5ff", opacity: 0.85 }} />
              <div className="flex flex-col leading-none">
                <span className="text-[5px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(168,197,255,0.5)" }}>The</span>
                <span className="text-[8px] font-black uppercase tracking-[0.06em] whitespace-nowrap" style={{ color: "#a8c5ff" }}>Affinity Well</span>
              </div>
            </div>
            <div className="flex items-center gap-1 justify-self-center">
              <div className="w-[16px] h-[16px] rounded-full bg-indigo-700/70 border border-indigo-400/40 flex items-center justify-center">
                <span className="text-[6px] font-bold text-white">Y</span>
              </div>
              <span className="text-[8px] font-semibold text-white">You</span>
              <span className="h-1 w-1 rounded-full bg-indigo-400" />
              <span className="text-[7px] font-bold text-indigo-300 bg-indigo-500/15 px-1 py-0.5 rounded-full">your century</span>
            </div>
            <div className="flex items-center justify-self-end gap-2">
              <div className="flex items-center gap-0.5 text-white/80">
                <Hand className="h-2.5 w-2.5" />
                <span className="text-[8px] font-mono font-black">0<span className="text-white/40">/10</span></span>
              </div>
              <div className="flex items-center gap-0.5 text-indigo-300">
                <span className="font-serif font-black text-[10px] leading-none">0</span>
                <EminenceDiamond size={7} />
              </div>
            </div>
          </div>
          {/* Same six-cell affinity rail used by the current Well. */}
          <div className="flex gap-1 overflow-hidden pb-1">
            {ALL_AFFINITIES.map(affinity => {
              const meta = AFFINITY_META[affinity];
              const active = filledKeys.has(affinity);
              const isSingularity = affinity === "singularity";
              return (
                <div key={affinity} className="shrink-0 flex flex-col items-center gap-0.5" style={{ width: 52 }}>
                  <motion.div
                    className="w-full rounded-lg flex flex-col items-center gap-0.5 py-1"
                    animate={{ scale: active ? [1, 1.11, 1] : 1 }}
                    transition={{ duration: 0.38, ease: "easeOut" }}
                    style={{ background: active ? `linear-gradient(180deg, ${meta.hex}24 0%, ${meta.hex}0c 100%)` : `linear-gradient(180deg, ${meta.hex}08 0%, transparent 100%)`, border: `1px solid ${active ? `${meta.hex}77` : `${meta.hex}22`}` }}
                  >
                    <span className="text-[5px] font-semibold leading-none" style={{ color: "#a8c5ffcc" }}>{meta.shortName}</span>
                    <AffinityEmblem color={affinity} size={13} style={{ filter: `drop-shadow(0 0 4px ${meta.glowHex})` }} />
                    <span className="text-[10px] font-black leading-none" style={{ color: active ? "#fff" : meta.hex + "45" }}>0</span>
                    <span className="text-[5px] leading-none" style={{ color: meta.hex + "99" }}>{isSingularity ? "0/3" : "WELL 7/7"}</span>
                  </motion.div>
                  {!isSingularity && <span className="w-full rounded-md bg-blue-950/50 py-[1px] text-center text-[6px] font-bold text-blue-400">×2</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex items-center border-t border-white/10 pt-1">
            <span className="flex-1 text-[7px] text-white/35">Pick affinities</span>
            <span className="mr-1 flex h-4 w-4 items-center justify-center rounded border border-white/10 text-[8px] text-white/30">×</span>
            <span className="rounded border border-white/15 px-2 py-0.5 text-[7px] font-bold text-white/35">Harness</span>
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
                  animate={{ opacity: [0, 1, 1, 0], x: [0, spreadX, spreadX * 0.4, 0], y: [0, -24, 82, 214], scale: [0.7, 1.1, 0.9, 0.55] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.05, delay: i * 0.1, times: [0, 0.28, 0.65, 1], ease: "easeInOut" }}
                >
                  <AffinityEmblem
                    color={key as AffinityKey}
                    size={32}
                    style={{ filter: `drop-shadow(0 0 8px ${AFFINITY_META[key].glowHex})` }}
                  />
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
  const [, setPanDone] = useState(false);
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
  const affKeys = AFFINITY_SEQ_KEYS;
  const affinityNames = useMemo(() => AFFINITY_SEQ_KEYS.map(k => AFFINITY_META[k].name), []);

  // Stable random values for the background star field — prevents framer-motion
  // from restarting animations on every re-render due to new Math.random() calls.
  const bgStars = useMemo(() =>
    Array.from({ length: 30 }, () => ({
      w: Math.random() * 2 + 1,
      h: Math.random() * 2 + 1,
      left: `${(Math.random() * 100).toFixed(1)}%`,
      top:  `${(Math.random() * 100).toFixed(1)}%`,
      opacity: Math.random() * 0.5 + 0.1,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 3,
    })),
  []);

  const SKIP_CINEMATIC_IDS = [
    "b4_shatter",
    "b5_luminae_interface",
    "b5a_luminae_origin",
    "b5a2_luminae_reassurance",
    "b5a3_luminae_expected",
    "b5_affinities",
    "b5b_affinity_tokens",
    "b5b2_affinity_question",
    "b5b3_affinity_accept",
    "b5c_architect_assembly",
  ];
  // Pre-shatter dialogue beats that can also be skipped — excludes b3b_farewell ("take me home" branch)
  const SKIP_PRE_SHATTER_IDS = [
    "b0_contact",
    "b1_locate",
    "b2_lumii_intro",
    "b3_architect",
    "b3a_stance_curious",
    "b3a_stance_guarded",
    "b3a_stance_resolute",
    "b3c_border",
  ];
  const firstContactRecorded = getLocalFirstContactStance() != null;
  const isSkippableBeat = (SKIP_CINEMATIC_IDS.includes(beat.id) || SKIP_PRE_SHATTER_IDS.includes(beat.id)) &&
    (firstContactRecorded || !SKIP_PRE_SHATTER_IDS.includes(beat.id));
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

  useEffect(() => {
    if (!isAffinityTokens || affIdx < 0 || affIdx >= affKeys.length) return;
    const affinity = affKeys[affIdx] as AffinityKey;
    const timer = setTimeout(
      () => gameAudio.playTutorialCue("affinity-reveal", affinity),
      90,
    );
    return () => clearTimeout(timer);
  }, [affIdx, affKeys, isAffinityTokens]);

  // Tap handler — advances token or exits when all 5 seen
  // Note: dispatch must NOT be called inside a state updater (React 18 concurrent mode).
  const handleAffTap = () => {
    if (affIdx >= 4) {
      dispatch({ type: "NEXT_BEAT" });
    } else {
      setAffIdx(i => i + 1);
    }
  };

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
      {(cosmosVisible || s.beat >= BEAT_INDEX.b5_luminae_interface) && (
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

      {/* Affinity token sequence — click-gated and kept legible above Lumii's white core */}
      {isAffinityTokens && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center cursor-pointer"
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
                <AffinityEmblem
                  color={affKeys[affIdx] as AffinityKey}
                  size={128}
                  style={{ filter: "drop-shadow(0 0 36px rgba(255,255,255,0.55))" }}
                />
                <motion.div
                  className="flex flex-col items-center gap-1 font-serif"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 }}
                >
                  <span className="text-white text-3xl tracking-widest">
                    {affinityNames[affIdx]}
                  </span>
                  <span
                    className="text-[11px] font-bold uppercase"
                    style={{
                      color: AFFINITY_META[affKeys[affIdx] as AffinityKey].hex,
                      letterSpacing: 0,
                      WebkitTextStroke: "0.55px rgba(0, 0, 0, 0.98)",
                      paintOrder: "stroke fill",
                      textShadow: `0 1px 2px rgba(0, 0, 0, 1), 0 0 6px rgba(0, 0, 0, 0.95), 0 0 12px ${AFFINITY_META[affKeys[affIdx] as AffinityKey].glowHex}`,
                    }}
                  >
                    {TUTORIAL_AFFINITY_DESCRIPTORS[affKeys[affIdx] as AffinityKey]}
                  </span>
                </motion.div>
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

      {/* Lumii watches from a bounded lower-right position during the Affinity
          sweep, keeping her white core clear of the centered philosophy label. */}
      <AnimatePresence>
        {(s.beat >= BEAT_INDEX.b2_lumii_intro || showLumii) && (
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
              left: isAffinityTokens                       ? "calc(50% + clamp(100px, 24vw, 200px))"
                  : (isArchitectAssembly && assemblyDone)  ? lumiAssemblyPos.left
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
              <LumiiOrb size={88} excited={beat.id === "b2_lumii_intro"} highlightZone={null} beatKey={s.beat} whiteGlow />
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
          className="tutorial-dialogue-dock absolute z-30 left-0 right-0 flex justify-center pointer-events-none"
        >
          <div className="pointer-events-auto w-full max-w-sm">
            <AnimatePresence mode="wait">
              <DialogueBox
                key={`assembly-${s.dlgLine}`}
                beatId={beat.id}
                lines={beat.dialogue}
                lineIndex={s.dlgLine}
                onTap={() => dispatch({ type: "NEXT_DLG" })}
                nudge={null}
                mode="listen"
              />
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Dialogue */}
      {!isLocate && !isAffinityTokens && !isArchitectAssembly && !(isShatter && shatterReady) && (
        <div className="tutorial-dialogue-dock absolute left-0 right-0 z-30 px-6">
          <AnimatePresence mode="wait">
            <DialogueBox
              key={`${s.beat}-${s.dlgLine}`}
              beatId={beat.id}
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
              playerResponse={beat.playerResponse}
              onPlayerResponse={() => dispatch({ type: "PLAYER_RESPONSE" })}
              choices={beat.choices}
              onChoice={(c) => chooseTutorialBranch(dispatch, c as TutorialBranchChoice)}
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
      {s.beat < BEAT_INDEX.b4_shatter && (
        <div className="absolute inset-0 pointer-events-none">
          {bgStars.map((star, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white tut-star-twinkle"
              style={{
                width: star.w,
                height: star.h,
                left: star.left,
                top: star.top,
                opacity: star.opacity,
                ['--lum-dur' as string]: `${star.duration}s`,
                ['--lum-delay' as string]: `${star.delay}s`,
              }}
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
            className="absolute right-5 z-50 text-white/40 hover:text-white/80 text-xs font-semibold tracking-widest uppercase transition-colors bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded-lg border border-white/10"
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
function FastForwardCinematic({ dispatch }: { dispatch: React.Dispatch<TAction> }) {
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
      <button
        type="button"
        onClick={() => dispatch({ type: "FF_DONE" })}
        className="absolute right-4 top-4 z-20 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-semibold uppercase text-white/55 hover:text-white"
      >
        Skip
      </button>
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
        >A few centuries later...</motion.div>
        <LumiiOrb size={64} excited highlightZone={null} whiteGlow />
        <AnimatePresence>
          {cardStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex gap-3">
                {FAST_FORWARD_CARDS.map((cardId) => {
                  const card = TUTORIAL_CARDS[cardId];
                  if (!card) return null;
                  const scale = 70 / BOARD_CARD_W;
                  return (
                    <div key={cardId} className="overflow-hidden rounded-lg ring-1 ring-emerald-300/25" style={{ width: 70, height: BOARD_CARD_H * scale }}>
                      <div style={{ width: BOARD_CARD_W, height: BOARD_CARD_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                        <ArtifactCardView card={asGameCard(card)} tier={card.tier} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <span className="text-[10px] font-semibold text-emerald-200/75">Two Verdance Artifacts forged during the time jump</span>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {cardStep >= 2 && (
            <motion.div
              initial={{ y: -40, opacity: 0, scale: 0.82 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 20 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="overflow-hidden rounded-xl border border-emerald-300/30 shadow-[0_0_32px_rgba(74,222,128,0.25)]" style={{ width: BOARD_CARD_W, height: BOARD_CARD_H }}>
                <LuminaryPanelArt luminaryId={VERDANCE_LUMINARY_ID} width={BOARD_CARD_W} height={BOARD_CARD_H} />
              </div>
              <span className="text-[10px] font-semibold text-emerald-300">Verdant Oracle stirs</span>
            </motion.div>
          )}
        </AnimatePresence>
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
        <LuminaryArrivalCutscene
          luminaryId="lum_verdant"
          luminaryName="The Verdant Oracle"
          domain="Verdance"
          eminence={VERDANCE_LUMINARY_EMINENCE}
          flavor="She reads the future in the rings of trees that have not yet been planted."
          onComplete={() => dispatch({ type: "LUM_DONE" })}
          onSkip={() => dispatch({ type: "LUM_DONE" })}
        />
        <div className="tutorial-dialogue-dock px-6 w-full max-w-sm">
          <AnimatePresence mode="wait">
            <DialogueBox
              key={`lum-${s.dlgLine}`}
              beatId={beat.id}
              lines={beat.dialogue}
              lineIndex={s.dlgLine}
              onTap={() => dispatch({ type: "NEXT_DLG" })}
              nudge={null}
              mode="act"
            />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Victory Phase ────────────────────────────────────────────────────────────
function getGuidedMatchErrorMessage(error: unknown): string {
  if (
    (error instanceof ApiError && error.status >= 500) ||
    (error instanceof TypeError && /fetch|network/i.test(error.message))
  ) {
    return "The game service is unavailable. Please try again in a moment.";
  }

  return error instanceof Error ? error.message : "Could not start the guided match.";
}

function VictoryPhase({ s, dispatch }: { s: TutState; dispatch: React.Dispatch<TAction> }) {
  const beat = TUTORIAL_BEATS[s.beat];
  const [, setLocation] = useLocation();
  const showButtons = s.dlgLine >= beat.dialogue.length - 1;
  const [isStartingGuidedMatch, setIsStartingGuidedMatch] = useState(false);
  const [guidedMatchError, setGuidedMatchError] = useState<string | null>(null);

  useEffect(() => {
    markTutorialSeen();
    // Fanfare on first landing — give the mount a tick so audio ctx is ready
    setTimeout(() => gameAudio.playLuminaryFanfare("#4ade80"), 180);
  }, []);

  const startGuidedMatch = async () => {
    if (isStartingGuidedMatch) return;
    setIsStartingGuidedMatch(true);
    setGuidedMatchError(null);

    const accountSession = getAccountSession();
    const priorSession = getSession();
    const playerName = accountSession?.account.username ?? priorSession?.playerName ?? "You";
    const accountToken = getAccountToken();
    const requestOptions = accountToken
      ? { headers: { Authorization: `Bearer ${accountToken}` } }
      : undefined;

    try {
      const created = await createRoom({
        hostName: playerName,
        maxPlayers: 2,
        turnTimerSeconds: null,
      }, requestOptions);

      await addAiPlayer(created.room.id, {
        sessionToken: created.sessionToken,
        difficulty: "passive",
      }, requestOptions);

      await startGame(created.room.id, {
        sessionToken: created.sessionToken,
      }, requestOptions);

      saveSession({
        roomId: created.room.id,
        inviteCode: created.room.inviteCode,
        playerId: created.player.id,
        sessionToken: created.sessionToken,
        playerName: created.player.name,
        isHost: true,
        isGuidedMatch: true,
      });
      clearTutorialProgress();
      markTutorialSeen();
      setLocation(`/game/${created.room.id}?guided=1`);
    } catch (error) {
      setGuidedMatchError(getGuidedMatchErrorMessage(error));
      setIsStartingGuidedMatch(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: `url(${backgroundCosmos}) center/cover` }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4 px-6">
        <LumiiOrb size={72} excited highlightZone={null} whiteGlow />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300/75">Tutorial complete</div>
          <div className="font-serif text-3xl font-bold text-white">
            {s.eminence}<span className="text-lg text-white/55"> / {DEFAULT_VICTORY_REQUIREMENT} Eminence</span>
          </div>
          <div className="mt-1 text-white/50 text-sm">First Luminary awakened</div>
        </motion.div>
        <div
          className="w-full border-y border-emerald-200/15 bg-emerald-300/[0.035] py-2.5"
          aria-label="Verdant Oracle projection result and core actions"
        >
          <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
            <span className="px-1">
              <strong className="block text-sm text-emerald-100">+1</strong>
              <small className="block text-[9px] uppercase text-white/45">Eminence</small>
            </span>
            <span className="px-1">
              <strong className="inline-flex items-center gap-1 text-sm text-emerald-100">
                +1 <AffinityEmblem color="verdance" size={12} />
              </strong>
              <small className="block text-[9px] uppercase text-white/45">Drawn now</small>
            </span>
            <span className="px-1">
              <strong className="inline-flex items-center gap-1 text-sm text-emerald-100">
                +1 <AffinityEmblem color="verdance" size={12} />
              </strong>
              <small className="block text-[9px] uppercase text-white/45">Future Forge</small>
            </span>
          </div>
          <p className="mt-2 text-center text-[9px] uppercase tracking-wide text-white/40">
            Core actions · {TUTORIAL_CORE_ACTION_RECAP.join(" · ")}
          </p>
        </div>
        <div className="tutorial-dialogue-dock w-full">
          <AnimatePresence mode="wait">
            <DialogueBox
              key={`vic-${s.dlgLine}`}
              beatId={beat.id}
              lines={beat.dialogue}
              lineIndex={s.dlgLine}
              onTap={() => dispatch({ type: "NEXT_DLG" })}
              nudge={null}
              mode="act"
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
                type="button"
                onClick={startGuidedMatch}
                disabled={isStartingGuidedMatch}
                className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition-all shadow-lg disabled:cursor-wait disabled:opacity-60"
              >{isStartingGuidedMatch ? "Preparing Lumii's match..." : "Play a Guided Match"}</button>
              {guidedMatchError && (
                <p className="text-center text-xs leading-relaxed text-rose-200/85">{guidedMatchError}</p>
              )}
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

// ─── Tutorial Luminary Section ────────────────────────────────────────────────
function TutorialLuminarySection({ beatIndex, verdanceDepth }: { beatIndex: number; verdanceDepth: number }) {
  const verdantRevealed = beatIndex >= (BEAT_INDEX["b16_final_forge"] ?? 999);
  const verdantClaimed = beatIndex >= (BEAT_INDEX["b17_luminary"] ?? 999);
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
    <div data-tutorial-luminary-section="" className="relative shrink-0 overflow-hidden border border-white/10 rounded-2xl" style={{ background: "rgba(3,3,12,0.72)" }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(180deg, rgba(15,8,40,0.55) 0%, rgba(8,5,28,0.40) 100%)",
        borderBottom: "1px solid rgba(120,80,220,0.22)",
      }} />
      <div className="relative flex items-center px-4 pt-3 pb-2">
        <svg width="10" height="18" viewBox="0 0 10 18" fill="none" className="mr-2.5 shrink-0" style={{ color: "#C4AAFF", opacity: 0.85 }}>
          <polygon points="5,0 1.5,4.5 8.5,4.5" fill="currentColor" />
          <polygon points="1.5,4.5 2.2,15.5 7.8,15.5 8.5,4.5" fill="currentColor" />
          <rect x="0.5" y="15.5" width="9" height="2" rx="0.5" fill="currentColor" />
        </svg>
        <div className="flex flex-col leading-none">
          <span className="text-[8px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(160,130,255,0.55)" }}>The</span>
          <span className="text-[15px] font-black uppercase tracking-[0.06em] leading-none" style={{ color: "#C4AAFF", textShadow: "0 0 24px rgba(180,140,255,0.5), 0 1px 0 rgba(0,0,0,0.8)" }}>Terminus</span>
        </div>
        <div className="ml-2.5 h-px w-8" style={{ background: "linear-gradient(90deg, rgba(160,120,255,0.5), transparent)" }} />
      </div>
      <div className="relative flex gap-3 overflow-x-auto px-3 pb-3 items-start">
        {verdantRevealed ? (
          <div className="relative shrink-0">
            <div style={{ width: BOARD_CARD_W, height: BOARD_CARD_H, overflow: "hidden", borderRadius: 12 }}>
              <LuminaryPanelArt luminaryId={VERDANCE_LUMINARY_ID} width={BOARD_CARD_W} height={BOARD_CARD_H} />
            </div>
            <div className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 40%, transparent 100%)" }}>
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <div className="text-[7px] font-bold text-white/60 uppercase tracking-widest">Verdant Oracle</div>
                <div className="text-[6px] text-white/30 mt-0.5">
                  {verdantClaimed ? "Awakened: +1 Eminence, +1 Verdance token" : `${Math.min(verdanceDepth, 5)} / 5 Verdance to awaken`}
                </div>
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
function CollectionSheet({ forged, bonuses, filterAffinity, onClose }: {
  forged: string[];
  bonuses: Record<AffinityKey, number>;
  filterAffinity?: AffinityKey | null;
  onClose: () => void;
}) {
  const collSheetRef = useRef<HTMLElement | null>(null);
  // Sheet is always mounted when visible (AnimatePresence controls lifecycle).
  useFocusTrap(collSheetRef, true, onClose);

  const bonusTotals = (Object.entries(bonuses) as [AffinityKey, number][]).filter(([, v]) => v > 0);
  const visibleCards = filterAffinity
    ? forged.filter(id => TUTORIAL_CARDS[id]?.bonusAffinity === filterAffinity)
    : forged;
  const filterMeta = filterAffinity ? AFFINITY_META[filterAffinity] : null;
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
        ref={(el) => { collSheetRef.current = el; }}
        role="dialog"
        aria-modal="true"
        aria-label="Your collection"
        key="coll-panel"
        className="fixed left-0 right-0 bottom-0 z-[81] rounded-t-2xl border-t border-white/15 shadow-2xl"
        style={{ background: "rgba(6,6,17,0.97)" }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-3" />
        <div className="px-4 pb-8">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-base font-bold text-white">Your Collection</div>
              <div className="text-[10px] text-white/35 mt-0.5">Forged artifacts — permanent bonuses</div>
            </div>
            {bonusTotals.length > 0 && (
              <div className="flex gap-1 flex-wrap justify-end">
                {bonusTotals.map(([k, v]) => (
                  <div key={k} className="flex items-center gap-0.5 bg-emerald-900/40 rounded px-1.5 py-0.5 border border-emerald-500/20">
                    <span className="text-[9px] text-emerald-300 font-bold">+{v}</span>
                    <AffinityToken affinity={k} size={9} />
                  </div>
                ))}
              </div>
            )}
          </div>
          {filterMeta && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border"
                style={{ background: filterMeta.hex + "22", borderColor: filterMeta.hex + "66", color: filterMeta.glowHex }}>
                <AffinityToken affinity={filterAffinity!} size={10} />
                {filterMeta.name} artifacts
              </div>
            </div>
          )}
          {visibleCards.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-white/20 text-sm">No artifacts forged yet</div>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {visibleCards.map(id => {
                const card = TUTORIAL_CARDS[id];
                if (!card) return null;
                const artUrl = CARD_ART[id];
                const bonusMeta = AFFINITY_META[card.bonusAffinity];
                const bgStyle: React.CSSProperties = artUrl
                  ? { backgroundImage: `url(${artUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: `linear-gradient(175deg, #021005 0%, #063020 50%, #020c04 100%)` };
                return (
                  <div key={id} className="shrink-0 rounded-xl overflow-hidden shadow-xl ring-1 ring-white/10 relative"
                    style={{ width: BOARD_CARD_W, height: BOARD_CARD_H, ...bgStyle }}>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/90" />
                    <div className="relative z-10 h-full p-2 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        {card.eminence > 0 ? <EminenceBadge value={card.eminence} /> : <span />}
                        <div className="w-4 h-4 rounded-full ring-1 ring-black/40 overflow-hidden">
                          <img src={bonusMeta.image} alt={bonusMeta.name} className="w-full h-full object-contain" draggable={false} />
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] font-semibold text-white drop-shadow line-clamp-2 leading-tight mb-1.5">{card.name}</div>
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-0.5 bg-emerald-900/60 rounded px-1 py-0.5">
                            <span className="text-[8px] text-emerald-300 font-bold">+1</span>
                            <AffinityToken affinity={card.bonusAffinity} size={8} />
                          </div>
                          <span className="text-[7px] text-white/30">permanent</span>
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
interface TutorialGuidanceTarget {
  key: string;
  selector: string;
  region?: "cost";
}

interface TutorialMeasuredGuidance {
  key: string;
  target: TutorialGuideRect;
  viewportWidth: number;
  viewportHeight: number;
  safeTop: number;
  safeBottom: number;
  dialogue: TutorialGuideRect | null;
}

function toTutorialGuideRect(rect: DOMRect): TutorialGuideRect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  };
}

function GameplayPhase({
  s,
  dispatch,
  muted,
  onToggleMute,
  onLeave,
}: {
  s: TutState;
  dispatch: React.Dispatch<TAction>;
  muted: boolean;
  onToggleMute: () => void;
  onLeave: () => void;
}) {
  const beat = TUTORIAL_BEATS[s.beat];
  const beatId = beat.id;
  const chapter = getTutorialChapter(s.beat);
  const subStep = s.subStep;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuDrawerRef = useRef<HTMLElement | null>(null);
  useFocusTrap(menuDrawerRef, menuOpen, () => setMenuOpen(false));
  const isShortLandscape = useIsShortLandscape();
  const reducedMotion = Boolean(useReducedMotion());
  const boardLayoutPolicy = useBoardLayoutPolicy();

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
  const [collectionInitialAffinity, setCollectionInitialAffinity] = useState<AffinityKey | null>(null);
  const [reservedPanelOpen, setReservedPanelOpen] = useState(false);
  const openedReservedForgeRef = useRef(false);
  useEffect(() => {
    if (beatId !== "b11_forge_reserved" || subStep < 1 || openedReservedForgeRef.current) return;
    openedReservedForgeRef.current = true;
    setReservedPanelOpen(true);
  }, [beatId, subStep]);

  // ── Burst animation state ──────────────────────────────────────────────────
  const [forgeBurst, setForgeBurst] = useState<{
    key: number; eminence: number; name: string; cardId: string;
    startRect: { x: number; y: number; w: number; h: number };
    destPos: { x: number; y: number };
    spentColors: AffinityKey[];
  } | null>(null);
  const forgeBurstKeyRef = useRef(0);
  const [settledForgeCardId, setSettledForgeCardId] = useState<string | null>(null);
  const [harnessBurstKeys, setHarnessBurstKeys] = useState<Partial<Record<AffinityKey, number>>>({});
  const [forgeJustHappened, setForgeJustHappened] = useState(false);
  const [forgeAffinityReturn, setForgeAffinityReturn] = useState<{
    key: number;
    affinities: AffinityKey[];
  } | null>(null);
  const [encryptBurst, setEncryptBurst] = useState<{
    key: number;
    sourceRect: { x: number; y: number; w: number; h: number };
    affinityHex: string;
    cardName: string;
    gotSingularity: boolean;
    cardId: string;
    destPos?: { x: number; y: number };
  } | null>(null);
  const encryptBurstKeyRef = useRef(0);
  const pendingEncryptCommitRef = useRef<(() => void) | null>(null);
  const [singularityAbsorbKey, setSingularityAbsorbKey] = useState(0);
  const [encryptionReplacementDeal, setEncryptionReplacementDeal] = useState<({
    key: number;
    cardId: string;
    tier: 1;
  } & ReplacementDealMotion) | null>(null);
  const [encryptionReplacementRevealed, setEncryptionReplacementRevealed] = useState(
    () => beatId !== "b10b_reserve_granted",
  );
  const encryptionReplacementEntryQueuedRef = useRef(false);
  const encryptionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => {
    encryptionTimersRef.current.forEach(clearTimeout);
    encryptionTimersRef.current = [];
  }, []);

  const queueEncryptionReplacementDeal = useCallback((key: number, delayMs?: number) => {
    const delay = delayMs ?? Math.max(0, CIPHER_DEAL_FIRE_DELAY_MS - CIPHER_GAME_TOTAL_MS);
    const timer = setTimeout(() => {
      const deckRect = document.querySelector('[data-deck-tier="1"]')?.getBoundingClientRect();
      const slotIndex = TUTORIAL_FORGE_CARD_SLOTS[RESERVE_CARD_ID].index;
      const slotRect = document.querySelector(`[data-slot-key="1-${slotIndex}"]`)?.getBoundingClientRect();
      if (!deckRect || !slotRect) {
        setEncryptionReplacementRevealed(true);
        return;
      }

      const rawCardWidth = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--card-w'),
      ) || 112;
      setEncryptionReplacementDeal({
        key,
        cardId: ENCRYPTION_REPLACEMENT_ID,
        tier: 1,
        ...getReplacementDealMotion(deckRect, slotRect, rawCardWidth),
      });
      gameAudio.playCardDraw();
    }, delay);
    encryptionTimersRef.current.push(timer);
  }, []);

  useEffect(() => {
    if (
      beatId !== "b10b_reserve_granted" ||
      !s.reserved.includes(RESERVE_CARD_ID) ||
      encryptionReplacementRevealed ||
      encryptBurst ||
      encryptionReplacementDeal ||
      encryptionReplacementEntryQueuedRef.current
    ) {
      return;
    }

    encryptionReplacementEntryQueuedRef.current = true;
    encryptBurstKeyRef.current += 1;
    queueEncryptionReplacementDeal(encryptBurstKeyRef.current, 320);
  }, [
    beatId,
    encryptBurst,
    encryptionReplacementDeal,
    encryptionReplacementRevealed,
    queueEncryptionReplacementDeal,
    s.reserved,
  ]);

  useEffect(() => {
    const trigger = s.animTrigger;
    if (!trigger) return;
    if (trigger.type === "forge") {
      gameAudio.playArtifactForged();
      forgeBurstKeyRef.current += 1;
      const source = document.querySelector(`[data-tutorial-card-id="${trigger.cardId}"]`)?.getBoundingClientRect();
      const destination = document.querySelector("[data-nav-hand]")?.getBoundingClientRect();
      const startRect = source
        ? { x: source.left, y: source.top, w: source.width, h: source.height }
        : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H };
      const destPos = destination
        ? { x: destination.left + destination.width / 2, y: destination.top + destination.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight * 0.94 };
      const spentColors = trigger.paidAffinities;
      setForgeBurst({ key: forgeBurstKeyRef.current, eminence: trigger.eminence, name: trigger.name, cardId: trigger.cardId, startRect, destPos, spentColors });
      setTimeout(() => {
        setForgeBurst(null);
        setSettledForgeCardId(trigger.cardId);
      }, 1300);
      const returnKey = forgeBurstKeyRef.current;
      setTimeout(() => {
        setForgeAffinityReturn({ key: returnKey, affinities: trigger.paidAffinities });
        gameAudio.playTutorialAffinityReturn(trigger.paidAffinities);
      }, 1120);
      setTimeout(() => setForgeAffinityReturn(null), 2450);
      setForgeJustHappened(true);
      setTimeout(() => setForgeJustHappened(false), 3600);
    } else if (trigger.type === "harness") {
      const { affinities } = trigger;
      setHarnessBurstKeys(previous => {
        const next = { ...previous };
        affinities.forEach(affinity => {
          next[affinity] = (next[affinity] ?? 0) + 1;
        });
        return next;
      });
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
  useEffect(() => {
    if (beatId === "b13_tier3" && s.tier3PlanVersion < 3) dispatch({ type: "INIT_TIER3_PLAN" });
  }, [beatId, dispatch, s.tier3PlanVersion]);
  useEffect(() => {
    if (beatId === "b12_tier2" && s.dlgLine >= 1 && subStep === 0 && !s.tier2GrantPending && !s.tier2DeliveryComplete) dispatch({ type: "START_TIER2_DELIVERY" });
  }, [beatId, dispatch, s.dlgLine, subStep, s.tier2GrantPending, s.tier2DeliveryComplete]);
  useEffect(() => {
    if (beatId === "b13_tier3" && s.dlgLine >= 1 && s.tier3PlanVersion === 3 && !s.tier3GrantPending) dispatch({ type: "START_TIER3_DELIVERY" });
  }, [beatId, dispatch, s.dlgLine, s.tier3PlanVersion, s.tier3GrantPending]);
  useEffect(() => {
    if (!s.tier2GrantPending) return;
    const timer = setTimeout(() => dispatch({ type: "GRANT_TIER2_RESERVE" }), 1450);
    return () => clearTimeout(timer);
  }, [dispatch, s.tier2GrantPending]);
  useEffect(() => {
    if (!s.tier3GrantPending) return;
    const timer = setTimeout(() => dispatch({ type: "GRANT_TIER3_RESERVE" }), 2200);
    return () => clearTimeout(timer);
  }, [dispatch, s.tier3GrantPending]);
  const isActionInstructionVisible = isTutorialActionInstructionVisible(
    s.beat,
    s.dlgLine,
  );
  useEffect(() => {
    if (beatId === "b16_final_forge" && isActionInstructionVisible && !s.finalGrantPending && !s.finalDeliveryComplete) dispatch({ type: "START_FINAL_DELIVERY" });
  }, [beatId, dispatch, isActionInstructionVisible, s.finalGrantPending, s.finalDeliveryComplete]);
  useEffect(() => {
    if (!s.finalGrantPending) return;
    const timer = setTimeout(() => dispatch({ type: "GRANT_FINAL_RESERVE" }), 2000);
    return () => clearTimeout(timer);
  }, [dispatch, s.finalGrantPending]);
  useEffect(() => {
    if (beatId !== "b16_final_forge" || !s.showLuminary) return;
    // Keep the board mounted through the complete stamp-and-flight sequence.
    // The Luminary cinematic may begin only after the forged card has cleared.
    const timer = setTimeout(
      () => dispatch({ type: "FINAL_FORGE_PRESENTED" }),
      FORGE_PHASE_MS.total + 320,
    );
    return () => clearTimeout(timer);
  }, [beatId, dispatch, s.showLuminary]);
  const isWellEnabled = (beat.mode === "act" || beat.mode === "semiOpen") &&
    ["b8_first_harness", "b11_forge_reserved", "b12_tier2", "b13_tier3"].includes(beatId) &&
    !(beatId === "b8_first_harness" && !isActionInstructionVisible) &&
    !(beatId === "b11_forge_reserved" && subStep >= 1) &&
    !(beatId === "b12_tier2" && (s.dlgLine < 2 || s.tier2GrantPending)) &&
    !(beatId === "b13_tier3" && (s.dlgLine < 2 || subStep >= 1 || s.tier3GrantPending));

  const isEminenceHighlighted = beatId === "b14_win_condition";
  const isForgeHighlighted = ["b6_forge_appears", "b11_forge_reserved", "b16_final_forge"].includes(beatId);
  const encryptionReplacementStageActive = beatId === "b10b_reserve_granted"
    && s.reserved.includes(RESERVE_CARD_ID)
    && !encryptionReplacementRevealed;
  const singularitySubstitutionStageActive = beatId === "b11b_singularity_substitution"
    && s.animTrigger?.type === "forge"
    && settledForgeCardId !== s.animTrigger.cardId;

  // Encrypt introduces Singularity before the player opens that storage cell.
  const singularityLocked = s.beat < BEAT_INDEX.b10b_reserve_granted;

  const isActMode = beat.mode === "act" || beat.mode === "semiOpen";
  const totalAffinities = Object.values(s.affinities).reduce((a, b) => a + b, 0);

  const gameplayRootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const forgeRef = useRef<HTMLDivElement>(null);
  const tier1Ref = useRef<HTMLDivElement>(null);
  const tier2Ref = useRef<HTMLDivElement>(null);
  const tier3Ref = useRef<HTMLDivElement>(null);
  const cameraFocus: "overview" | "well" | "storage" | "tier1" | "tier2" | "tier3" = (() => {
    if (beatId === "b6b_root_lattice" || beatId === "b7_artifact_cost" || beatId === "b7b_cost_bridge" || beatId === "b8_first_harness" || beatId === "b9_first_forge") return "tier1";
    if (encryptionReplacementStageActive) return "tier1";
    if (beatId === "b9b_forge_complete" || beatId === "b10b_reserve_granted") return "well";
    if (beatId === "b10_reserve") return "tier1";
    if (beatId === "b11_forge_reserved") return "well";
    if (beatId === "b11b_singularity_substitution") return "well";
    if (beatId === "b12_tier2" && subStep === 0 && s.dlgLine < 1) return "tier2";
    if (beatId === "b12_tier2" && subStep === 0) return "well";
    if (beatId === "b12_tier2" && subStep >= 1) return "tier2";
    if (beatId === "b13_tier3" && subStep >= 1) return "tier3";
    if (beatId === "b13_tier3") return "well";
    if (beatId === "b16_final_forge" && !isActionInstructionVisible) return "overview";
    if (beatId === "b16_final_forge" && !s.finalDeliveryComplete) return "well";
    if (beatId === "b16_final_forge") return "tier2";
    if (beatId === "b14_win_condition") return "storage";
    return "overview";
  })();
  const activeHighlightZone = beatId === "b9_first_forge" && s.dlgLine >= 1
    ? "forge-t1"
    : beatId === "b10_reserve"
    ? "forge-t1"
    : beatId === "b16_final_forge" && isActionInstructionVisible
      ? "forge-t2"
    : beatId === "b11_forge_reserved" && subStep >= 1
      ? "well"
    : beatId === "b12_tier2" && subStep >= 1
      ? "forge-t2"
    : beat.highlightZone;
  const guidanceZone = activeHighlightZone ?? (beat.mode === "look" ? beat.lumiiZone : null);
  const guidanceTarget = useMemo<TutorialGuidanceTarget | null>(() => {
    if (!guidanceZone) return null;
    const activeCardId = beat.foregroundCardId ?? TUTORIAL_FORGE_CARD_BY_BEAT[beatId];
    const activeCardSelector = activeCardId
      ? `[data-tutorial-card-id="${activeCardId}"]`
      : "[data-tutorial-card-id]";
    let selector: string | null = null;
    let region: TutorialGuidanceTarget["region"];

    if (guidanceZone === "well") {
      const pattern = getTutorialHarnessPattern(beatId, subStep);
      const nextAffinity = pattern
        ? (Object.entries(pattern) as [AffinityKey, number][]).find(
            ([affinity, amount]) => (s.wellSel[affinity] ?? 0) < amount,
          )?.[0]
        : null;
      if (nextAffinity) {
        selector = nextAffinity === "singularity"
          ? "[data-singularity-well]"
          : `[data-affinity-well="${nextAffinity}"]`;
      } else if (pattern) {
        selector = '[data-testid="harness-button"]';
      } else if (beatId === "b11_forge_reserved" && subStep >= 1) {
        selector = "[data-singularity-well]";
      } else if (beatId === "b11b_singularity_substitution") {
        selector = "[data-singularity-well]";
      } else {
        selector = '[data-testid="affinity-well-panel"]';
      }
    } else if (guidanceZone === "forge-btn") {
      selector = activeCardSelector;
    } else if (guidanceZone === "card-cost") {
      selector = activeCardSelector;
      region = "cost";
    } else if (["forge-t1", "forge-t2", "forge-t3"].includes(guidanceZone)) {
      const tier = guidanceZone.slice(-1);
      selector = activeCardId
        ? activeCardSelector
        : `[data-testid="forge-tier-shelf"][data-tier="${tier}"]`;
    } else if (guidanceZone === "storage") {
      selector = "[data-nav-hand]";
    } else if (guidanceZone === "hand") {
      selector = "[data-tutorial-reserved-panel]";
    } else if (guidanceZone === "eminence") {
      selector = '[data-eminence-panel="player"]';
    } else if (guidanceZone === "discounted-tab" || guidanceZone === "needed-tab") {
      selector = `[data-tutorial-forge-view="${guidanceZone.replace("-tab", "")}"]`;
    } else if (guidanceZone === "luminary") {
      selector = "[data-tutorial-luminary-section]";
    }

    return selector
      ? { key: `${beatId}:${subStep}:${guidanceZone}:${selector}:${region ?? "full"}`, selector, region }
      : null;
  }, [beat.foregroundCardId, beatId, guidanceZone, s.wellSel, subStep]);

  const lumiiTarget = beat.lumiiZone;
  const fallbackLumiiPositions: Record<string, { x: string; y: string }> = {
    "forge-t1": { x: "87%", y: "26%" },
    "forge-t2": { x: "87%", y: "20%" },
    "forge-t3": { x: "87%", y: "14%" },
    "card-cost": { x: "78%", y: "40%" },
    well: { x: "87%", y: "24%" },
    hand: { x: "13%", y: "20%" },
    storage: { x: "13%", y: "20%" },
    eminence: { x: "88%", y: "20%" },
    "discounted-tab": { x: "13%", y: "20%" },
    "needed-tab": { x: "13%", y: "20%" },
    "top-center": { x: "50%", y: "18%" },
    center: { x: "50%", y: "38%" },
    luminary: { x: "50%", y: "28%" },
    "forge-header": { x: "87%", y: "44%" },
    "player-panel": { x: "87%", y: "88%" },
    "verdance-panel": { x: "40%", y: "88%" },
  };
  const fallbackLumiiPosition = fallbackLumiiPositions[lumiiTarget] ?? { x: "88%", y: "62%" };
  const clampedFallbackLumiiPosition = isShortLandscape
    ? { x: fallbackLumiiPosition.x, y: `${Math.min(parseFloat(fallbackLumiiPosition.y), 60)}%` }
    : fallbackLumiiPosition;
  const [measuredGuidance, setMeasuredGuidance] = useState<TutorialMeasuredGuidance | null>(null);

  // Close card sheet on beat/subStep change
  useEffect(() => {
    setSelectedCardData(null);
  }, [beatId, subStep]);

  const frameTutorialCamera = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    if (cameraFocus === "overview") {
      container.scrollTo({ top: 0, behavior });
      return;
    }
    if (cameraFocus === "well" || cameraFocus === "storage") {
      container.scrollTo({ top: maxScroll, behavior });
      return;
    }

    const target = cameraFocus === "tier1"
      ? tier1Ref.current
      : cameraFocus === "tier2"
        ? tier2Ref.current
        : tier3Ref.current;
    if (!target) return;
    const focusRatio = cameraFocus === "tier1" ? 0.64 : cameraFocus === "tier3" ? 0.38 : 0.5;
    const top = calculateTutorialCameraScrollTop({
      currentScrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      containerTop: container.getBoundingClientRect().top,
      target: toTutorialGuideRect(target.getBoundingClientRect()),
      focusRatio,
    });
    container.scrollTo({ top, behavior });
  }, [cameraFocus, reducedMotion]);

  // The camera frames the real shelf dimensions on every layout, including the
  // compact phone board. A second frame handles late font/image sizing.
  useLayoutEffect(() => {
    frameTutorialCamera();
    const frame = requestAnimationFrame(frameTutorialCamera);
    const container = scrollRef.current;
    const target = cameraFocus === "tier1"
      ? tier1Ref.current
      : cameraFocus === "tier2"
        ? tier2Ref.current
        : cameraFocus === "tier3"
          ? tier3Ref.current
          : null;
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(frameTutorialCamera);
    if (container) observer?.observe(container);
    if (target) observer?.observe(target);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [beatId, cameraFocus, frameTutorialCamera, subStep]);

  const measureTutorialGuidance = useCallback(() => {
    const root = gameplayRootRef.current;
    if (!root || !guidanceTarget) {
      setMeasuredGuidance(null);
      return;
    }
    const element = root.querySelector(guidanceTarget.selector);
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
      setMeasuredGuidance(null);
      return;
    }
    const rawTarget = toTutorialGuideRect(element.getBoundingClientRect());
    const target = guidanceTarget.region === "cost" ? tutorialCostRegion(rawTarget) : rawTarget;
    const dialogueElement = root.querySelector(".tutorial-dialogue-card");
    const headerElement = root.querySelector(".game-header");
    const navElement = root.querySelector(".game-bottom-nav");
    const dialogue = dialogueElement ? toTutorialGuideRect(dialogueElement.getBoundingClientRect()) : null;
    const headerBottom = headerElement?.getBoundingClientRect().bottom ?? 0;
    const navTop = navElement?.getBoundingClientRect().top ?? window.innerHeight;
    setMeasuredGuidance({
      key: guidanceTarget.key,
      target,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      safeTop: Math.max(8, headerBottom + 4),
      safeBottom: Math.min(window.innerHeight - 8, navTop - 4),
      dialogue,
    });
  }, [guidanceTarget]);

  // Pointer geometry follows the actual target while the camera scrolls and
  // remeasures after responsive layout, card flips, or developer scene jumps.
  useLayoutEffect(() => {
    let frame = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measureTutorialGuidance);
    };
    scheduleMeasure();
    const root = gameplayRootRef.current;
    const container = scrollRef.current;
    const target = root && guidanceTarget ? root.querySelector(guidanceTarget.selector) : null;
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(scheduleMeasure);
    if (root) resizeObserver?.observe(root);
    if (container) resizeObserver?.observe(container);
    if (target) resizeObserver?.observe(target);
    const mutationObserver = root && typeof MutationObserver !== "undefined"
      ? new MutationObserver(scheduleMeasure)
      : null;
    mutationObserver?.observe(root!, { childList: true, subtree: true });
    container?.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);
    window.visualViewport?.addEventListener("resize", scheduleMeasure);
    window.visualViewport?.addEventListener("scroll", scheduleMeasure);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      container?.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      window.visualViewport?.removeEventListener("resize", scheduleMeasure);
      window.visualViewport?.removeEventListener("scroll", scheduleMeasure);
    };
  }, [guidanceTarget, measureTutorialGuidance]);

  const activeMeasuredGuidance = measuredGuidance?.key === guidanceTarget?.key
    ? measuredGuidance
    : null;
  const measuredLumiiPosition = activeMeasuredGuidance
    ? calculateTutorialGuidePosition({
        target: activeMeasuredGuidance.target,
        viewportWidth: activeMeasuredGuidance.viewportWidth,
        safeTop: activeMeasuredGuidance.safeTop,
        safeBottom: activeMeasuredGuidance.safeBottom,
        avoid: activeMeasuredGuidance.dialogue,
      })
    : null;
  const lumiiEffectivePos: { x: string | number; y: string | number } = measuredLumiiPosition
    ? measuredLumiiPosition
    : clampedFallbackLumiiPosition;

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
    <div
      ref={gameplayRootRef}
      className="tutorial-gameplay game-shell fixed inset-0 flex flex-col overflow-hidden bg-[#060412]"
      data-game-board="true"
      data-tutorial-gameplay="true"
      data-tutorial-beat={beatId}
      data-board-presentation="celestial"
      data-board-layout={boardLayoutPolicy.layout}
      data-board-density={boardLayoutPolicy.density}
      data-board-viewport={boardLayoutPolicy.viewportClass}
      data-forge-density="compact"
    >
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

      {s.tier2GrantPending && <LumiiAffinityDelivery drops={[
        { affinity: "verdance", amount: 1 },
        { affinity: "abyss", amount: 1 },
      ]} />}

      {s.tier3GrantPending && <LumiiAffinityDelivery drops={[
        { affinity: "continuum", amount: 3 },
        { affinity: "radiance", amount: 2 },
        { affinity: "singularity", amount: 1 },
      ]} />}

      {s.finalGrantPending && <LumiiAffinityDelivery drops={[
        { affinity: "continuum", amount: 5 },
      ]} />}

      {/* Spotlight vignette — dims edges around the highlighted target zone */}
      {(isActMode || beat.mode === "look") && activeHighlightZone && activeMeasuredGuidance && (
        <motion.div
          key={`spotlight-${beatId}`}
          className="fixed inset-0 pointer-events-none z-[22]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: cameraFocus !== "overview" ? 0.82 : 0.25 }}
          style={{
            background: `radial-gradient(ellipse ${Math.min(activeMeasuredGuidance.viewportWidth * 0.42, Math.max(76, activeMeasuredGuidance.target.width * 0.9))}px ${Math.min(activeMeasuredGuidance.viewportHeight * 0.32, Math.max(58, activeMeasuredGuidance.target.height * 1.15))}px at ${activeMeasuredGuidance.target.left + activeMeasuredGuidance.target.width / 2}px ${activeMeasuredGuidance.target.top + activeMeasuredGuidance.target.height / 2}px, transparent 0%, rgba(0,0,0,0.28) 100%)`,
          }}
        />
      )}

      {/* Header */}
      <header className="game-header shrink-0 z-30 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 py-2 border-b border-[#a8c5ff]/20" style={{ background: "linear-gradient(180deg, rgba(6,4,20,0.97) 0%, rgba(4,2,14,0.94) 100%)", boxShadow: "0 2px 18px rgba(0,0,0,0.34)" }}>
        <div className="min-w-0">
          <div className="flex flex-col leading-none">
            <span className="text-sm font-serif font-bold text-indigo-200 tracking-wide">LUMINAe</span>
            <span className="text-[9px] text-[#a8c5ff]/45 tracking-widest uppercase">Tutorial</span>
          </div>
        </div>
        <div
          className="tutorial-guide-pill flex min-w-0 items-center gap-1.5 justify-self-center rounded-full border border-indigo-300/20 bg-indigo-950/35 py-1 pl-1 pr-2.5"
          aria-label={`Tutorial lesson ${chapter.chapterNumber} of ${chapter.totalChapters}: ${chapter.label}`}
        >
          <span
            aria-hidden="true"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-indigo-300/25 bg-indigo-300/10 text-[9px] font-black text-indigo-100"
          >
            {chapter.chapterNumber}
          </span>
          <div className="min-w-0 text-left leading-none">
            <span className="block text-[10px] font-semibold text-indigo-100">
              Lesson {chapter.chapterNumber} of {chapter.totalChapters}
            </span>
            <span className="mt-0.5 block max-w-[116px] truncate text-[8px] font-semibold text-indigo-200/55">
              {chapter.label}
            </span>
          </div>
        </div>
        <div className="justify-self-end">
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center justify-center w-7 h-7 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
            aria-label="Tutorial menu"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
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
              ref={(el) => { menuDrawerRef.current = el; }}
              role="menu"
              aria-label="Tutorial options"
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
                onClick={onToggleMute}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/75 hover:bg-white/8 hover:text-white transition-all"
              >
                {muted
                  ? <VolumeX className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                  : <Volume2 className="h-3.5 w-3.5 shrink-0 text-indigo-400" />}
                {muted ? "Turn sound on" : "Turn sound off"}
              </button>
              <div className="h-px bg-white/8 mx-3" />
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
                onClick={onLeave}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/65 hover:bg-white/8 hover:text-white transition-all"
              >
                <X className="h-3.5 w-3.5 shrink-0" />
                Leave tutorial
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

      <AnimatePresence>
        {forgeAffinityReturn && (
          <ForgeAffinityReturn
            key={forgeAffinityReturn.key}
            affinities={forgeAffinityReturn.affinities}
          />
        )}
      </AnimatePresence>

      {/* ── Board content area ───────────────────────────────────────── */}
      <motion.div
        className="tutorial-board-main game-main relative z-10 flex-1 overflow-hidden"
        data-active-tab="board"
        initial={beatId === "b6_forge_appears" ? { scale: 1.38, y: "-12%" } : false}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 1.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ transformOrigin: "50% 36%" }}
      >
        <div ref={scrollRef} className={`tutorial-board-scroll h-full overflow-y-auto px-3 flex flex-col pb-3 ${isShortLandscape ? "py-2 gap-2" : "py-3 gap-3"}`}>
          <div className="tutorial-secondary-board">
            <TutorialLuminarySection beatIndex={s.beat} verdanceDepth={s.bonuses.verdance ?? 0} />
          </div>
          <div
            ref={forgeRef}
            data-luminae-tutorial-zone="forge"
            data-forge-section="true"
            data-forge-compact="true"
            data-testid="forge-module"
            className="board-forge board-module board-module--forge board-forge--compact relative shrink-0"
            style={{
              boxShadow: isForgeHighlighted ? "0 0 0 2px rgba(212,168,75,0.65), 0 0 28px 8px rgba(212,168,75,0.16)" : "none",
              transition: "box-shadow 0.3s",
            }}
          >
            <div className="board-forge-bg absolute inset-0 pointer-events-none" />
            <div aria-hidden="true" className="board-forge-frame" />
            <div className="board-forge-header relative flex items-center justify-between px-4 pb-2 pt-3">
              <div className="board-forge-title flex items-center gap-2.5">
                <Hammer className="h-4 w-4 shrink-0" style={{ color: "#D4A84B", opacity: 0.85 }} />
                <div className="board-forge-title-text flex flex-col leading-none">
                <span className="text-[8px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(192,140,60,0.55)" }}>The</span>
                <span className="text-[15px] font-black uppercase leading-none" style={{ color: "#D4A84B", letterSpacing: "0.06em", textShadow: "0 0 24px rgba(212,168,75,0.45), 0 1px 0 rgba(0,0,0,0.8)" }}>Forge</span>
                </div>
              </div>
              <span aria-hidden="true" className="board-forge-header-spacer min-h-[28px] min-w-[30px] shrink-0" />
            </div>
            <ScriptedForge
              s={s}
              dispatch={dispatch}
              beatId={beatId}
              onCardTap={handleCardTap}
              tier1Ref={tier1Ref}
              tier2Ref={tier2Ref}
              tier3Ref={tier3Ref}
              encryptingCardId={encryptBurst?.cardId}
              showEncryptionReplacement={
                s.reserved.includes(RESERVE_CARD_ID)
                && encryptionReplacementRevealed
                && !encryptBurst
                && !encryptionReplacementDeal
              }
            />
          </div>
        </div>
      </motion.div>

      {/* ── Pinned Player Panel ────────────────────────────────────────── */}
      <div
        data-testid="affinity-well-panel"
        data-shared-affinity-well=""
        data-well-expanded="true"
        className={`tutorial-affinity-panel affinity-well-panel shrink-0 z-20 transition-all ${isEminenceHighlighted ? "tut-bar-glow" : ""}`}
        style={{
          background: "linear-gradient(180deg, rgba(6,4,20,0.97) 0%, rgba(4,2,14,0.99) 100%)",
          borderTop: isEminenceHighlighted
            ? "1px solid rgba(251,191,36,0.7)"
            : isActMode
              ? "1px solid rgba(168,197,255,0.5)"
              : "1px solid rgba(168,197,255,0.2)",
        }}
      >
        <HarnessConvergenceLayer selectedAffinities={s.wellSel} harnessBurstKeys={harnessBurstKeys} />
        <div className="affinity-well-header">
          <div className="affinity-well-title flex items-center gap-2">
            <span data-affinity-held-target="">
              <AffinityReservoirSymbol
                value={totalAffinities}
                title={`${totalAffinities} affinities held`}
                ariaLabel={`${totalAffinities} affinities held`}
              />
            </span>
            <div className="affinity-well-title-text flex min-w-0 flex-col leading-none">
              <span className="text-[7px] font-bold uppercase" style={{ color: "rgba(168,197,255,0.5)" }}>The</span>
              <span className="truncate whitespace-nowrap text-[12px] font-black uppercase leading-none" style={{ color: "#a8c5ff", textShadow: "0 0 18px rgba(168,197,255,0.35)" }}>Affinity Well</span>
            </div>
          </div>
          <motion.div className="affinity-well-player flex min-w-0 items-center gap-1.5" initial={false} animate={isActMode ? { scale: [1, 1.07, 1] } : { scale: 1 }}>
            <span data-player-affinity-source="tutorial-you" className="inline-flex min-w-0 items-center gap-1.5">
              <PlayerAvatar avatarId={null} name="You" size={18} />
              {isActMode && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary animate-pulse" />}
              <span className="max-w-[80px] truncate text-[11px] font-semibold">You</span>
              {isActMode && (
                <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">your century</span>
              )}
            </span>
          </motion.div>
          <div className="affinity-well-status shrink-0">
            <button
              type="button"
              data-eminence-panel="player"
              className="affinity-well-eminence rounded-md"
              onClick={() => dispatch({
                type: "NUDGE",
                msg: `Reach ${DEFAULT_VICTORY_REQUIREMENT} Eminence to begin the final round.`,
              })}
              aria-label={`Eminence ${s.eminence} of ${DEFAULT_VICTORY_REQUIREMENT}`}
            >
              <EminenceProgress
                value={s.eminence}
                target={DEFAULT_VICTORY_REQUIREMENT}
                sigilTarget="player"
              />
            </button>
          </div>
        </div>
        <AffinityWell
          s={s}
          dispatch={dispatch}
          beatId={beatId}
          subStep={subStep}
          wellEnabled={isWellEnabled}
          singularityLocked={singularityLocked}
          harnessBurstKeys={harnessBurstKeys}
          singularityAbsorbKey={singularityAbsorbKey}
          onOpenReserved={s.reserved.length > 0 ? () => setReservedPanelOpen(true) : undefined}
          embedded
        />
      </div>

      <nav className="game-bottom-nav shrink-0 grid grid-cols-3 border-t border-border bg-card z-20 pt-2 pb-[max(env(safe-area-inset-bottom,0px),8px)]">
        <button type="button" className="relative flex flex-col items-center justify-center gap-0.5 text-primary" aria-current="page">
          <LayoutGrid className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Board</span>
          <span className="absolute -top-2 inset-x-4 h-0.5 rounded-full bg-primary" />
        </button>
        <button
          type="button"
          data-nav-hand=""
          onClick={() => {
            if (s.forged.length > 0) {
              gameAudio.playCardDraw();
              setCollectionOpen(true);
            } else {
              dispatch({ type: "NUDGE", msg: "Your Civilization will hold the Artifacts you Forge." });
            }
          }}
          className="relative flex flex-col items-center justify-center gap-0.5 text-muted-foreground"
        >
          <Landmark className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Civilization</span>
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "NUDGE", msg: "The action log becomes available in a full match." })}
          className="relative flex flex-col items-center justify-center gap-0.5 text-muted-foreground"
        >
          <List className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Log</span>
        </button>
      </nav>


      {/* Floating Lumii */}
      {(() => {
        const hintVisible = isActMode && isActionInstructionVisible;
        const lumiiClickable = false;
        const effectiveLumiiPos = lumiiEffectivePos;

        // Dialogue-line excited state: true when the current line has excited:true
        const currentLineExcited = beat.dialogue[s.dlgLine]?.excited ?? false;
        // Excited bounce: scoped to action hint pending, post-forge, or an explicitly excited
        // dialogue line — but only during act/semiOpen beats (never during listen/look narration).
        const shouldExcitedBounce = hintVisible || forgeJustHappened || (currentLineExcited && isActMode);
        return (
          <motion.div
            animate={{ left: effectiveLumiiPos.x, top: effectiveLumiiPos.y }}
            transition={{ type: "spring", stiffness: 55, damping: 20 }}
            className="tutorial-lumii fixed z-[60] pointer-events-none"
            data-tutorial-lumii-presence="primary"
            data-lumii-target={lumiiTarget}
          >
            <div style={{ transform: "translate(-50%, -50%)" }}>
              {/* Orb: excited bounce when action pending or forge just fired; gentle float otherwise */}
              <div className={shouldExcitedBounce ? "tut-orb-excited" : "tut-orb-float"}>
                <div
                  className={lumiiClickable ? "pointer-events-auto cursor-pointer active:scale-90 transition-transform" : ""}
                  onClick={lumiiClickable ? (e) => { e.stopPropagation(); dispatch({ type: "PLAYER_RESPONSE" }); } : undefined}
                >
                  <LumiiOrb size={48} excited={hintVisible || forgeJustHappened || currentLineExcited} highlightZone={null} beatKey={`${beatId}-${s.dlgLine}`} whiteGlow />
                </div>
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* ── Tether line + target ring — suppressed once the Eminence lesson begins */}
      {!encryptBurst && isActMode && activeHighlightZone && s.beat < BEAT_INDEX.b14_win_condition && activeMeasuredGuidance && measuredLumiiPosition && (() => {
        const guide: TutorialGuidePoint = measuredLumiiPosition;
        const target = activeMeasuredGuidance.target;
        const endpoint = calculateTutorialTetherEndpoint(guide, target);
        const distance = Math.hypot(guide.x - endpoint.x, guide.y - endpoint.y);
        if (distance < 28) return null;
        const width = activeMeasuredGuidance.viewportWidth;
        const height = activeMeasuredGuidance.viewportHeight;
        const ringLeft = Math.max(2, target.left - 4);
        const ringTop = Math.max(2, target.top - 4);
        const ringRight = Math.min(width - 2, target.right + 4);
        const ringBottom = Math.min(height - 2, target.bottom + 4);
        const gid = `tg-${beatId}-${subStep}-${s.dlgLine}`;
        return (
          <svg
            key={`tether-${guidanceTarget?.key ?? beatId}`}
            className="fixed inset-0 pointer-events-none z-[27]"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            style={{ width: "100vw", height: "100vh" }}
            data-tutorial-guidance-target={guidanceTarget?.key}
          >
            <defs>
              <linearGradient id={gid} x1={guide.x} y1={guide.y} x2={endpoint.x} y2={endpoint.y} gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
                <stop offset="30%"  stopColor="rgba(255,255,255,0.38)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
              </linearGradient>
            </defs>
            <motion.path
              d={`M ${guide.x} ${guide.y} L ${endpoint.x} ${endpoint.y}`}
              stroke={`url(#${gid})`}
              strokeWidth="1.5"
              strokeDasharray="6 8"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ pathLength: { duration: 0.6, ease: "easeOut" } }}
              className="tut-tether-pulse"
            />
            <rect
              x={ringLeft}
              y={ringTop}
              width={Math.max(1, ringRight - ringLeft)}
              height={Math.max(1, ringBottom - ringTop)}
              rx={Math.min(12, Math.max(5, target.height * 0.12))}
              fill="none"
              stroke="rgba(255,255,255,0.42)"
              strokeWidth="1.2"
              className="tut-tether-ring"
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
            heldAffinities={s.affinities}
            viewMode={s.view}
            wellSel={s.wellSel}
            forgeEnabled={selectedCardData.forgeEnabled}
            reserveEnabled={selectedCardData.reserveEnabled}
            onForge={selectedCardData.onForge ? () => { setSelectedCardData(null); selectedCardData.onForge!(); } : undefined}
            onReserve={selectedCardData.onReserve ? () => {
              const commitEncryption = selectedCardData.onReserve!;
              const affHex = AFFINITY_META[selectedCardData.card.bonusAffinity as AffinityKey]?.glowHex ?? '#7090FF';
              const source = document.querySelector(`[data-tutorial-card-id="${selectedCardData.card.id}"]`)?.getBoundingClientRect();
              const destination = document.querySelector("[data-singularity-reserve-target]")?.getBoundingClientRect();
              encryptBurstKeyRef.current += 1;
              pendingEncryptCommitRef.current = commitEncryption;
              encryptionReplacementEntryQueuedRef.current = false;
              setEncryptionReplacementRevealed(false);
              setEncryptBurst({
                key: encryptBurstKeyRef.current,
                sourceRect: source
                  ? { x: source.left, y: source.top, w: source.width, h: source.height }
                  : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight * 0.32, w: BOARD_CARD_W, h: BOARD_CARD_H },
                affinityHex: affHex,
                cardName: selectedCardData.card.name,
                gotSingularity: true,
                cardId: selectedCardData.card.id,
                destPos: destination
                  ? { x: destination.left + destination.width / 2, y: destination.top + destination.height / 2 }
                  : { x: window.innerWidth * 0.92, y: window.innerHeight * 0.82 },
              });
              gameAudio.playSingularityToken();
              gameAudio.playCipherSeal();
              setSelectedCardData(null);
            } : undefined}
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
            filterAffinity={collectionInitialAffinity}
            onClose={() => {
              setCollectionOpen(false);
              setCollectionInitialAffinity(null);
              if (beatId === "b9b_forge_complete") dispatch({ type: "PANEL_VIEWED" });
            }}
          />
        )}
      </AnimatePresence>

      {/* Encrypted artifacts live behind the Singularity cell, matching the game board. */}
      <AnimatePresence>
        {reservedPanelOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[80] bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReservedPanelOpen(false)}
            />
            <motion.section
              data-tutorial-reserved-panel=""
              className="fixed inset-x-0 bottom-0 z-[81] border-t border-white/15 px-4 pt-3 pb-8"
              style={{ background: "rgba(6,6,17,0.98)" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              aria-label="Encrypted artifacts"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">Singularity</div>
                  <div className="text-sm font-semibold text-white">Encrypted artifacts</div>
                </div>
                <button type="button" onClick={() => setReservedPanelOpen(false)} aria-label="Close encrypted artifacts" className="h-8 w-8 rounded-lg text-white/55 hover:bg-white/10 hover:text-white">
                  <X className="mx-auto h-4 w-4" />
                </button>
              </div>
              <PlayerHand
                s={s}
                dispatch={dispatch}
                beatId={beatId}
                subStep={subStep}
                onCardTap={(...args) => {
                  setReservedPanelOpen(false);
                  handleCardTap(...args);
                }}
              />
            </motion.section>
          </>
        )}
      </AnimatePresence>

      {/* Dialogue stays in one reading position while Lumii and the camera move. */}
      {!encryptBurst && !encryptionReplacementStageActive && !singularitySubstitutionStageActive && s.dlgLine < beat.dialogue.length && (
        <motion.div
          key={`dlg-settle-${beatId}-${subStep}`}
          className="tutorial-dialogue tutorial-dialogue-dock fixed left-0 right-0 z-50 px-4"
          data-camera-focus={cameraFocus}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.4,
            delay: beatId === "b6_forge_appears" || beatId === "b6b_root_lattice"
              ? 1.4
              : cameraFocus !== "overview"
                ? 0.68
                : 0,
          }}
        >
          <AnimatePresence mode="wait">
            <DialogueBox
              key={`${beatId}-${s.dlgLine}-${s.nudge}`}
              beatId={beatId}
              lines={beat.dialogue}
              lineIndex={s.dlgLine}
              onTap={() => {
                if (s.nudge) dispatch({ type: "NUDGE", msg: null });
                else dispatch({ type: "NEXT_DLG" });
              }}
              nudge={s.nudge}
              mode={beat.mode}
              requireAction={beatId === "b11_forge_reserved" && subStep === 0}
              playerResponse={beat.playerResponse}
              onPlayerResponse={() => dispatch({ type: "PLAYER_RESPONSE" })}
              choices={beat.choices}
              onChoice={(c) => chooseTutorialBranch(dispatch, c as TutorialBranchChoice)}
            />
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Forge Burst Overlay — same stamp-and-fly animation as the game ── */}
      <AnimatePresence>
        {forgeBurst && TUTORIAL_CARDS[forgeBurst.cardId] && (
          <ForgeAnimation
            animKey={forgeBurst.key}
            card={asGameCard(TUTORIAL_CARDS[forgeBurst.cardId])}
            tier={TUTORIAL_CARDS[forgeBurst.cardId].tier}
            startRect={forgeBurst.startRect}
            destPos={forgeBurst.destPos}
            destinationKind="tab"
            spentColors={forgeBurst.spentColors}
            eminence={forgeBurst.eminence}
            eminenceTotal={s.eminence}
            eminenceTarget={DEFAULT_VICTORY_REQUIREMENT}
            eminenceTargetSelector='[data-eminence-sigil="player"]'
            gotSingularity={false}
            playerName="You"
            isCompact
          />
        )}
      </AnimatePresence>

      {/* ── Cipher Aperture Burst (Encrypt / tutorial reserve) ──────────── */}
      {encryptBurst && (() => {
        const tCard = TUTORIAL_CARDS[encryptBurst.cardId];
        if (!tCard) return null;
        return (
          <CipherApertureAnimation
            animKey={encryptBurst.key}
            mode="game"
            sourceRect={encryptBurst.sourceRect}
            affinityHex={encryptBurst.affinityHex}
            cardName={encryptBurst.cardName}
            cardFace={<ArtifactCardView card={asGameCard(tCard)} tier={tCard.tier} />}
            gotSingularity={encryptBurst.gotSingularity}
            destPos={encryptBurst.destPos}
            skipForefront
            overlayZIndex={100}
            onComplete={() => {
              const commitEncryption = pendingEncryptCommitRef.current;
              pendingEncryptCommitRef.current = null;
              commitEncryption?.();
              setSingularityAbsorbKey(key => key + 1);
              queueEncryptionReplacementDeal(encryptBurst.key);
              const timer = setTimeout(() => setEncryptBurst(null), CIPHER_TAIL_BUFFER_MS);
              encryptionTimersRef.current.push(timer);
            }}
          />
        );
      })()}

      {encryptionReplacementDeal && (() => {
        const replacement = TUTORIAL_CARDS[encryptionReplacementDeal.cardId];
        if (!replacement) return null;
        const usesCompactFrame = artifactFrameUsesArtCrop(
          encryptionReplacementDeal.slotRect.w,
          encryptionReplacementDeal.slotRect.h,
        );
        const replacementCard = asGameCard(replacement);
        return (
          <ForgeReplacementDealAnimation
            animKey={`tutorial-encrypt-${encryptionReplacementDeal.key}`}
            cardId={replacement.id}
            tier={encryptionReplacementDeal.tier}
            deckRect={encryptionReplacementDeal.deckRect}
            slotRect={encryptionReplacementDeal.slotRect}
            animX={encryptionReplacementDeal.animX}
            animY={encryptionReplacementDeal.animY}
            animRotateY={encryptionReplacementDeal.animRotateY}
            animScale={encryptionReplacementDeal.animScale}
            faceScale={encryptionReplacementDeal.faceScale}
            cardFace={(
              <ArtifactCardView
                card={replacementCard}
                tier={replacement.tier}
                artOnly={usesCompactFrame}
              />
            )}
            cardOverlay={usesCompactFrame ? (
              <CompactForgeCardReadout
                card={replacementCard}
                costs={effectiveCost(replacement, s.bonuses)}
              />
            ) : undefined}
            onComplete={() => {
              setEncryptionReplacementRevealed(true);
              setEncryptionReplacementDeal(null);
            }}
          />
        );
      })()}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function TutorialDirector({ startBeat }: { startBeat?: number }) {
  const clampedBeat = startBeat != null
    ? Math.max(0, Math.min(startBeat, TUTORIAL_BEATS.length - 1))
    : hasTutorialSeen() ? BEAT_INDEX["b4_shatter"] : 0;
  const savedState = startBeat != null ? loadTutorialState<Partial<TutState>>() : null;
  const savedFirstForgeResourcesAreValid = clampedBeat !== BEAT_INDEX.b9_first_forge || (
    (savedState?.affinities?.flare ?? 0) >= 1 &&
    (savedState?.affinities?.radiance ?? 0) >= 1 &&
    (savedState?.affinities?.continuum ?? 0) >= 1
  );
  const canResumeState = savedState?.beat === clampedBeat && clampedBeat > 0 && savedFirstForgeResourcesAreValid;
  const legacyResumeState = buildTutorialEntryState(clampedBeat);
  const initState: TutState = canResumeState
    ? {
        ...INIT_STATE,
        ...savedState,
        view: savedState.view ?? "needed",
        affinities: { ...INIT_STATE.affinities, ...savedState.affinities },
        wellBank: { ...INIT_STATE.wellBank, ...savedState.wellBank },
        bonuses: { ...INIT_STATE.bonuses, ...savedState.bonuses },
        wellSel: {},
        animTrigger: undefined,
        nudge: null,
      }
    : clampedBeat > 0
      ? legacyResumeState
      : INIT_STATE;
  const [s, dispatch] = useReducer(reducer, initState);
  const [devSceneEpoch, setDevSceneEpoch] = useState(0);
  const [, navigate] = useLocation();
  const devPreviewRef = useRef(false);
  const finalBeatIndex = TUTORIAL_BEATS.length - 1;
  const isTutorialComplete = s.beat === finalBeatIndex
    && s.dlgLine >= TUTORIAL_BEATS[finalBeatIndex].dialogue.length - 1;
  const [skipTransition, setSkipTransition] = useState(false);
  const [muted, setMuted] = useState(() => gameAudio.isMuted());
  const toggleTutorialSound = () => {
    const next = gameAudio.toggleMute();
    setMuted(next);
  };
  const beatRef = useRef(s.beat);
  useEffect(() => { beatRef.current = s.beat; }, [s.beat]);
  const skipTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { skipTimersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (import.meta.env.DEV && devPreviewRef.current) return;
    if (isTutorialComplete) {
      clearTutorialProgress();
      markTutorialComplete();
    } else if (s.beat > 0 && TUTORIAL_BEATS[s.beat]?.id !== "b3b_farewell") {
      saveTutorialProgress(s.beat);
      saveTutorialProgressId(TUTORIAL_BEATS[s.beat]?.id ?? "");
    }
    if (s.beat >= BEAT_INDEX["b6_forge_appears"]) {
      markIntroSeen(BEAT_INDEX["b6_forge_appears"]);
    }
  }, [isTutorialComplete, s.beat]);

  useEffect(() => {
    if (import.meta.env.DEV && devPreviewRef.current) return;
    if (s.beat <= 0 || isTutorialComplete || TUTORIAL_BEATS[s.beat]?.id === "b3b_farewell") return;
    const { animTrigger: _animTrigger, nudge: _nudge, wellSel: _wellSel, ...persistedState } = s;
    saveTutorialState(persistedState);
  }, [isTutorialComplete, s]);

  useEffect(() => {
    if (s.navigateTo) {
      if (!(import.meta.env.DEV && devPreviewRef.current)) {
        clearTutorialProgress();
        markTutorialSeen();
      }
      navigate(s.navigateTo);
    }
  }, [s.navigateTo, navigate]);

  const handleDevSceneJump = (toIndex: number) => {
    const target = Math.max(0, Math.min(toIndex, TUTORIAL_BEATS.length - 1));
    devPreviewRef.current = true;
    gameAudio.resetTransientAudio();
    const url = new URL(window.location.href);
    url.searchParams.set("beat", String(target));
    url.searchParams.set("tutorialDebug", "1");
    window.history.replaceState(window.history.state, "", url);
    setDevSceneEpoch(epoch => epoch + 1);
    dispatch({
      type: "JUMP_BEAT",
      toIndex: target,
      entryState: buildTutorialEntryState(target),
    });
  };

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
  const soundMoment = beat
    ? getTutorialSoundMoment(beat.id, s.dlgLine)
    : null;
  useEffect(() => {
    if (!soundMoment) return;
    const timer = setTimeout(
      () => gameAudio.playTutorialCue(soundMoment.cue, soundMoment.affinity),
      soundMoment.delayMs ?? 0,
    );
    return () => clearTimeout(timer);
  }, [beat?.id, s.dlgLine, soundMoment]);
  if (!beat) return null;

  const showTutorialDebug = import.meta.env.DEV
    && new URLSearchParams(window.location.search).get("tutorialDebug") === "1";
  const devNav = import.meta.env.DEV
    ? (
      <>
        <DevTutorialNav beatIndex={s.beat} onJump={handleDevSceneJump} />
        {showTutorialDebug && <TutorialDebugOverlay s={s} dispatch={dispatch} />}
      </>
    )
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

  const isCinematicPhase = usesTutorialCinematicPhase(s.beat);

  // Determine which gameplay sub-component to render once the board appears.
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
    ? <FastForwardCinematic dispatch={dispatch} />
    : beat.id === "b17_luminary"
      ? <LuminaryPhase s={s} dispatch={dispatch} />
      : beat.id === "b18_victory"
        ? <VictoryPhase s={s} dispatch={dispatch} />
        : (
          <GameplayPhase
            key={`gameplay-${devSceneEpoch}`}
            s={s}
            dispatch={dispatch}
            muted={muted}
            onToggleMute={toggleTutorialSound}
            onLeave={() => navigate("/")}
          />
        );

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
            exit={{ opacity: 0, transition: { duration: 0.42, ease: "easeIn" as const } }}
          >
            <CinematicPhase
              key={`cinematic-${devSceneEpoch}`}
              s={s}
              dispatch={dispatch}
              onSkip={handleSkip}
            />
          </motion.div>
        ) : (
          <motion.div
            key="gameplay"
            className="fixed inset-0"
            initial={{ opacity: 0}}
            animate={{ opacity: 1}}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            {/* Nested AnimatePresence so b15→b16 and b17→b18 also blur-out/blur-in.
                initial={false} suppresses the inner enter blur on the first mount so it
                doesn't stack on top of the outer cinematic→gameplay blur. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={subPhaseKey}
                className="fixed inset-0"
                initial={{ opacity: 0}}
                animate={{ opacity: 1}}
                exit={{ opacity: 0, transition: { duration: 0.42, ease: "easeIn" as const } }}
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
      {(isCinematicPhase || subPhaseKey === "victory") && (
        <div
          className="fixed right-4 z-[60] flex items-center gap-3"
          style={{ top: "calc(16px + env(safe-area-inset-top, 0px))" }}
        >
          <button
            onClick={toggleTutorialSound}
            className="flex items-center gap-1.5 text-white/35 hover:text-white/75 text-xs font-semibold tracking-widest uppercase transition-colors bg-black/15 hover:bg-black/35 px-3 py-1.5 rounded-lg border border-white/10"
            aria-label={muted ? "Unmute sound" : "Mute sound"}
          >
            {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            {muted ? "Sound off" : "Sound on"}
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-white/35 hover:text-white/75 text-xs font-semibold tracking-widest uppercase transition-colors bg-black/15 hover:bg-black/35 px-3 py-1.5 rounded-lg border border-white/10"
          >
            <X className="h-3 w-3" />
            Leave
          </button>
        </div>
      )}
    </>
  );
}
