import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { CipherSigil } from '@/components/CipherApertureAnimation';
import type {
  GameState,
  AffinityCounts,
  GamePlayerState,
  LuminaryActiveState,
} from '@workspace/api-client-react';
import { AFFINITY_META, AFFINITY_KEYS, type AffinityKey } from '@/lib/affinityMeta';
import { gameAudio } from '@/lib/audio';
import { AffinityEmblem } from '@/components/AffinityEmblem';
import type { LumiiAttentionState } from '@/components/LumiiTutorial';

const AFFINITIES: AffinityKey[] = [...AFFINITY_KEYS];

// Cell width used for all six modules
const CELL_W = 'var(--well-cell-w, 64px)';

type AffinityWellPlayerState = Pick<GamePlayerState, 'affinities' | 'bonuses' | 'reservedArtifacts'>;
type AffinityWellGameState = Pick<GameState, 'affinityWell' | 'luminaryAffinities' | 'turnCount'> & {
  players: readonly unknown[];
};

export interface AffinityWellCellsProps {
  me: AffinityWellPlayerState;
  state: AffinityWellGameState;
  selectedAffinities: Partial<AffinityCounts>;
  isMyTurn: boolean;
  canPlan: boolean;
  isActivePlayer: boolean;
  isTutorial: boolean;
  tutorialZone: string | null;
  tutorialAttention: LumiiAttentionState | null;
  sessionPlayerId: string | undefined;
  harnessBurstKeys?: Partial<Record<AffinityKey, number>>;
  harnessBlockedKeys?: Partial<Record<AffinityKey, number>>;
  forgeDeductions?: Partial<Record<AffinityKey, number>>;
  singularityAbsorbKey?: number;
  onAffinityClick: (color: keyof AffinityCounts) => void;
  onPromoteToTake2: (color: AffinityKey) => void;
  onOpenReserved: () => void;
  onOpenForged: (color: AffinityKey) => void;
}

// ─── Horizontal Well Meter ─────────────────────────────────────────────────────
// Left-to-right pip row showing the shared-bank fill level for one affinity.
// Animates pip-by-pip with sequential delays when filledCount changes.

function HorizontalWellMeter({
  capacity,
  filledCount,
  hex,
  glowHex,
  burstKey = 0,
}: {
  capacity: number;
  filledCount: number;
  hex: string;
  glowHex: string;
  burstKey?: number;
}) {
  const [pipFilled, setPipFilled] = useState<boolean[]>(() =>
    Array.from({ length: capacity }, (_, i) => i < filledCount),
  );
  const [burstId, setBurstId] = useState(0);
  const prevBurstKeyRef = useRef(burstKey);
  const prevFilledRef   = useRef(filledCount);
  const timerIds        = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (burstKey !== prevBurstKeyRef.current) {
      prevBurstKeyRef.current = burstKey;
      setBurstId((n) => n + 1);
    }
  }, [burstKey]);

  useEffect(() => {
    if (filledCount === prevFilledRef.current) return;
    timerIds.current.forEach(clearTimeout);
    timerIds.current = [];

    const prev = prevFilledRef.current;
    prevFilledRef.current = filledCount;

    if (filledCount < prev) {
      // Draining: clear pips right-to-left
      for (let i = prev - 1; i >= filledCount; i--) {
        const seq = prev - 1 - i;
        timerIds.current.push(
          setTimeout(() => setPipFilled((p) => { const n = [...p]; n[i] = false; return n; }), seq * 110),
        );
      }
    } else {
      // Filling: light pips left-to-right
      for (let i = prev; i < filledCount; i++) {
        const seq = i - prev;
        timerIds.current.push(
          setTimeout(() => setPipFilled((p) => { const n = [...p]; n[i] = true; return n; }), seq * 110),
        );
      }
    }
    return () => { timerIds.current.forEach(clearTimeout); };
  }, [filledCount]);

  return (
    <div className="affinity-well-meter" data-reservoir-meter style={{ display: 'flex', gap: 'var(--well-pip-gap, 2px)', alignItems: 'center', position: 'relative' }}>
      {Array.from({ length: capacity }, (_, i) => {
        const filled = pipFilled[i] ?? false;
        return (
          <motion.div
            key={i}
            data-reservoir-pip={filled ? 'filled' : 'empty'}
            animate={
              filled
                ? { backgroundColor: hex, opacity: 0.90 }
                : { backgroundColor: 'transparent', opacity: 0.38 }
            }
            transition={{ duration: 0.14, ease: 'easeOut' }}
            style={{
              width: 'var(--well-pip-size, 4px)', height: 'var(--well-pip-size, 4px)', borderRadius: 'var(--well-pip-radius, 2px)', flexShrink: 0,
              border: filled ? `1px solid ${glowHex}60` : `1px solid ${glowHex}22`,
              boxShadow: filled ? `0 0 4px ${glowHex}55` : 'none',
            }}
          />
        );
      })}

      {/* Burst flash when a Harness action resolves. */}
      <AnimatePresence>
        {burstId > 0 && (
          <motion.div
            key={burstId}
            style={{
              position: 'absolute', left: '50%', top: '50%',
              width: 8, height: 8, marginLeft: -4, marginTop: -4,
              borderRadius: '50%',
              background: `radial-gradient(ellipse at center, ${hex}cc 0%, transparent 72%)`,
              pointerEvents: 'none',
            }}
            initial={{ opacity: 0.9, scale: 0.4 }}
            animate={{ opacity: 0, scale: 3.2 }}
            exit={{}}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


// ─── AffinityWellCells ─────────────────────────────────────────────────────────
// Single-row horizontal carousel of 6 affinity modules.
// Overflows intentionally on narrow viewports; right-edge fade signals scrollability.

export function AffinityWellCells({
  me,
  state,
  selectedAffinities,
  isMyTurn,
  canPlan,
  isActivePlayer,
  isTutorial: _isTutorial,
  tutorialZone: _tutorialZone,
  tutorialAttention: _tutorialAttention,
  sessionPlayerId,
  harnessBurstKeys,
  harnessBlockedKeys,
  forgeDeductions,
  singularityAbsorbKey,
  onAffinityClick,
  onPromoteToTake2,
  onOpenReserved,
  onOpenForged,
}: AffinityWellCellsProps) {
  const playerCount    = state.players.length;
  const gaugeCapacity  = playerCount === 2 ? 4 : playerCount === 3 ? 5 : 7;
  const isPlanningMode = !isActivePlayer && canPlan;
  const affinityMap     = me.affinities as Partial<Record<AffinityKey, number>>;
  const bonusMap       = me.bonuses as Partial<Record<AffinityKey, number>>;
  const selectedMap    = selectedAffinities as Partial<Record<AffinityKey, number>>;
  const forgeDeductionMap = forgeDeductions ?? {};
  const bankMap        = state.affinityWell as Partial<Record<AffinityKey, number>>;
  const anyPending     = AFFINITIES.some((c) => (selectedMap[c] ?? 0) > 0);
  const showPlanningCue = isPlanningMode && anyPending;

  // Scroll-vs-tap disambiguation: if a touch moves >6px horizontally we
  // treat it as a scroll gesture and suppress the subsequent click on any cell.
  const isDragging    = useRef(false);
  const dragStartX    = useRef(0);

  // ── Singularity absorption flash + token jump-spin ───────────────────────────
  const [absorbFlash, setAbsorbFlash] = useState(0);
  const prevAbsorbKeyRef = useRef(singularityAbsorbKey ?? 0);
  const tokenControls = useAnimation();
  useEffect(() => {
    if (singularityAbsorbKey !== undefined && singularityAbsorbKey !== prevAbsorbKeyRef.current) {
      prevAbsorbKeyRef.current = singularityAbsorbKey;
      setAbsorbFlash(k => k + 1);
      // Slight delay so the jump starts as the implosion flash fades
      setTimeout(() => {
        void tokenControls.start({
          y:      [0, -9, 0, 0,   0],
          rotate: [0,  0, 0, 360, 360],
          transition: {
            duration: 1.1,
            times:    [0, 0.18, 0.32, 0.88, 1],
            ease:     'easeInOut',
          },
        });
      }, 220);
    }
  }, [singularityAbsorbKey, tokenControls]);

  // ── Per-Affinity Harness token jump + rotateY spin ─────────────────────────
  // One controller per non-singularity Affinity, in AFFINITY_KEYS order (flare, radiance, verdance, continuum, abyss).
  // Hooks must be called unconditionally so we declare all 5 up-front.
  const ctrlFlare     = useAnimation();
  const ctrlRadiance    = useAnimation();
  const ctrlVerdance  = useAnimation();
  const ctrlContinuum = useAnimation();
  const ctrlAbyss     = useAnimation();
  const affinityTokenControls: Partial<Record<AffinityKey, ReturnType<typeof useAnimation>>> = {
    flare: ctrlFlare, radiance: ctrlRadiance, verdance: ctrlVerdance,
    continuum: ctrlContinuum, abyss: ctrlAbyss,
  };
  const prevHarnessBurstRef = useRef<Partial<Record<AffinityKey, number>>>({});
  // Timer IDs for in-flight Harness landing sounds, cleared on cleanup or re-fire.
  const harnessSoundTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    // Cancel any previously scheduled landing sounds before starting new ones.
    harnessSoundTimers.current.forEach(id => clearTimeout(id));
    harnessSoundTimers.current = [];

    const prev = prevHarnessBurstRef.current;
    const curr = harnessBurstKeys ?? {};
    for (let i = 0; i < AFFINITY_KEYS.length; i++) {
      const key = AFFINITY_KEYS[i];
      if (key === 'singularity') continue;
      const prevVal = prev[key] ?? 0;
      const currVal = curr[key] ?? 0;
      if (currVal > prevVal) {
        const delay = i * 0.09;
        void affinityTokenControls[key]?.start({
          y:       [0, -9, 0,   0,   0],
          rotateY: [0, 180, 360, 540, 720],
          transition: { duration: 1.25, times: [0, 0.18, 0.46, 0.74, 1], delay },
        });
        // Schedule the landing chime to coincide with times[2]=0.46 of duration=1.25 s.
        // Landing offset = stagger delay + 0.46 * 1250 ms = i*90 + 575 ms.
        const landMs = Math.round(delay * 1000 + 0.46 * 1250);
        const affinityKey = key; // capture for closure
        harnessSoundTimers.current.push(
          setTimeout(() => gameAudio.playHarnessLand(affinityKey), landMs),
        );
      }
    }
    prevHarnessBurstRef.current = { ...curr };

    return () => {
      harnessSoundTimers.current.forEach(id => clearTimeout(id));
      harnessSoundTimers.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [harnessBurstKeys]);

  // ── Blocked-Harness shake + full-flash indicator ────────────────────────────
  // When a Harness resolves but held Affinities are capped, affected slots shake
  // and briefly flash an amber border to signal the slot is full.
  const [fullFlashKeys, setFullFlashKeys] = useState<Partial<Record<AffinityKey, number>>>({});
  const prevBlockedRef = useRef<Partial<Record<AffinityKey, number>>>({});
  useEffect(() => {
    const prev = prevBlockedRef.current;
    const curr = harnessBlockedKeys ?? {};
    const toShake: AffinityKey[] = [];
    for (const key of AFFINITY_KEYS) {
      if (key === 'singularity') continue;
      if ((curr[key] ?? 0) > (prev[key] ?? 0)) {
        toShake.push(key);
      }
    }
    if (toShake.length > 0) {
      for (const key of toShake) {
        void affinityTokenControls[key]?.start({
          x: [0, -5, 5, -4, 4, -2, 2, 0],
          transition: { duration: 0.32, ease: 'easeInOut' },
        });
      }
      setFullFlashKeys(prev => {
        const next = { ...prev };
        for (const key of toShake) {
          next[key] = (next[key] ?? 0) + 1;
        }
        return next;
      });
    }
    prevBlockedRef.current = { ...curr };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [harnessBlockedKeys]);

  // ── Bonus chip pulse animation ──────────────────────────────────────────────
  // Track previous total bonus (card bonus + luminary bonus) per affinity.
  // When the value increases, increment the pulse key so the motion.span
  // remounts and replays its initial→animate sequence. Skip on initial mount.
  const prevBonusRef  = useRef<Partial<Record<AffinityKey, number>>>({});
  const isMountedRef  = useRef(false);
  const [bonusPulseKeys, setBonusPulseKeys] = useState<Partial<Record<AffinityKey, number>>>({});

  useEffect(() => {
    const luminaryAffinities = ((state as any)?.luminaryAffinities as LuminaryActiveState[] ?? []);
    const turnCount = ((state as any)?.turnCount ?? 0) as number;

    const newTotals: Partial<Record<AffinityKey, number>> = {};
    for (const c of AFFINITIES) {
      if (c === 'singularity') continue;
      const bonus    = me.bonuses[c as keyof AffinityCounts] ?? 0;
      const lumBonus = luminaryAffinities.filter(
        (la: LuminaryActiveState) =>
          la.ownerId === sessionPlayerId &&
          turnCount > la.summonedAtTurnCount &&
          la.activeAffinity === c,
      ).length;
      newTotals[c] = bonus + lumBonus;
    }

    if (!isMountedRef.current) {
      isMountedRef.current = true;
      prevBonusRef.current = newTotals;
      return;
    }

    const changedKeys: AffinityKey[] = [];
    for (const c of AFFINITIES) {
      if (c === 'singularity') continue;
      const prev = prevBonusRef.current[c] ?? 0;
      const next = newTotals[c] ?? 0;
      if (next > prev) changedKeys.push(c);
    }
    prevBonusRef.current = newTotals;

    if (changedKeys.length > 0) {
      setBonusPulseKeys((prev) => {
        const next = { ...prev };
        for (const c of changedKeys) next[c] = (prev[c] ?? 0) + 1;
        return next;
      });
    }
  }, [me.bonuses, state, sessionPlayerId]);

  return (
    <div className="affinity-well-cells relative">

      {/* Planning-mode banner — floats above the rail */}
      <AnimatePresence>
        {showPlanningCue && (
          <motion.div
            key="planning-cue"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          >
            <span
              className="text-[9px] font-semibold tracking-wide px-2 py-[2px] rounded-full"
              style={{
                color: '#fbbf24',
                background: 'rgba(251,191,36,0.12)',
                border: '1px solid rgba(251,191,36,0.35)',
                letterSpacing: '0.06em',
              }}
            >
              Planning
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Carousel container — flex row: scrollable rail */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>

        {/* Inner wrapper keeps the right-edge fade clipped to the rail */}
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>

        {/* Right-edge fade — signals that more cells lie off-screen */}
        <div
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: 'var(--well-edge-fade-w, 36px)', zIndex: 2, pointerEvents: 'none',
            background: 'linear-gradient(to left, rgba(4,2,14,0.92), transparent)',
          }}
        />

        {/* Scrollable rail */}
        <motion.div
          animate={
            showPlanningCue
              ? { boxShadow: '0 0 0 1px rgba(251,191,36,0.30)' }
              : { boxShadow: '0 0 0 1px transparent' }
          }
          transition={{ duration: 0.25 }}
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',         // Firefox
            // pan-x: browser owns horizontal; vertical falls through to panel
            // overscrollBehaviorX: contain prevents context leaking to parent
            touchAction: 'pan-x',
            overscrollBehaviorX: 'contain',
          }}
          // data-well-carousel lets the panel's scroll-forwarding code skip
          // vertical forwarding when a touch starts inside the carousel
          data-well-carousel=""
          className="[&::-webkit-scrollbar]:hidden"
          onTouchStart={(e) => {
            isDragging.current = false;
            dragStartX.current = e.touches[0].clientX;
          }}
          onTouchMove={(e) => {
            if (Math.abs(e.touches[0].clientX - dragStartX.current) > 6) {
              isDragging.current = true;
            }
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 'var(--well-rail-gap, 4px)',
              padding: 'var(--well-rail-pad, 4px 8px 6px 6px)',
              width: 'max-content',
            }}
          >
            {AFFINITIES.map((c) => {
              const meta         = AFFINITY_META[c];
              const isSingularity       = c === 'singularity';
              const heldCount         = affinityMap[c] ?? 0;
              const bonus        = bonusMap[c] ?? 0;
              const lumBonus     = (
                ((state as any)?.luminaryAffinities as LuminaryActiveState[] ?? [])
                  .filter(
                    (la: LuminaryActiveState) =>
                      la.ownerId === sessionPlayerId &&
                      ((state as any)?.turnCount ?? 0) > la.summonedAtTurnCount &&
                      la.activeAffinity === c,
                  ).length
              );
              const reservedCount = me.reservedArtifacts.length;
              const pending       = selectedMap[c] ?? 0;
              const forgeDed      = forgeDeductionMap[c] ?? 0;
              const bankCount     = bankMap[c] ?? 0;
              const selectable    = isMyTurn || (!isActivePlayer && canPlan);
              const bankEmpty     = bankCount === 0;
              const canTake2      = selectable && !isSingularity && bankCount >= 4 && pending !== 2;
              const showForgedLink = !isSingularity && bonus > 0;
              const gaugeFilledCount = Math.max(0, bankCount - pending);
              const tentativeCount   = heldCount + pending;
              const hasContent       = isSingularity
                ? heldCount > 0 || reservedCount > 0
                : heldCount > 0 || bonus > 0 || lumBonus > 0;
              const bankDim         = bankEmpty && !isSingularity && pending === 0;

              // ── Cell background style ──────────────────────────────────────
              const cellStyle: React.CSSProperties =
                pending > 0
                  ? {
                      background: `linear-gradient(180deg, ${meta.hex}44 0%, ${meta.hex}20 100%)`,
                      border: `1.5px solid ${meta.glowHex}cc`,
                      boxShadow: `0 0 14px #a8c5ff55, inset 0 0 10px #a8c5ff2a`,
                    }
                  : hasContent
                  ? {
                      background: `linear-gradient(180deg, ${meta.hex}1c 0%, ${meta.hex}0a 100%)`,
                      border: `1px solid ${meta.hex}60`,
                      boxShadow: `inset 0 0 8px #a8c5ff12`,
                    }
                  : {
                      background: `linear-gradient(180deg, ${meta.hex}08 0%, transparent 100%)`,
                      border: `1px solid ${meta.hex}18`,
                    };

              // ── Emblem filter ──────────────────────────────────────────────
              const emblemFilter =
                pending > 0
                  ? `drop-shadow(0 0 7px ${meta.glowHex}) brightness(1.25)`
                  : forgeDed > 0
                  ? 'drop-shadow(0 0 5px #ef4444bb) brightness(0.55) saturate(0.3)'
                  : bankDim
                  ? 'grayscale(0.55)'
                  : `drop-shadow(0 0 5px ${meta.glowHex}70)`;

              return (
                <div
                  key={c}
                  data-testid="affinity-channel"
                  data-affinity={c}
                  className="affinity-well-cell"
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--well-cell-stack-gap, 2px)', width: CELL_W, flexShrink: 0 }}
                >
                  {/* ── Main cell button ── */}
                  <motion.button
                    type="button"
                    className="affinity-well-cell-button"
                    data-well-cell-style="instrument"
                    data-selected={pending > 0 ? 'true' : undefined}
                    data-reservoir-dry={bankDim ? 'true' : undefined}
                    // Singularity always tappable; others need selectable + non-empty bank
                    disabled={isSingularity ? false : !selectable && !showForgedLink || bankEmpty && !showForgedLink}
                    {...(isSingularity ? { 'data-singularity-well': '' } : { 'data-affinity-well': c })}
                    whileTap={
                      (isSingularity || (selectable && !bankEmpty) || showForgedLink)
                        ? { opacity: 0.82 }
                        : {}
                    }
                    onClick={() => {
                      if (isDragging.current) return;
                      if (isSingularity) {
                        onOpenReserved();
                      } else if (showForgedLink && !selectable) {
                        // Off-turn: tapping a cell with a forged bonus shows the forged list
                        onOpenForged(c);
                      } else if (selectable && !bankEmpty) {
                        // On turn and available in the Well: select this Affinity.
                        onAffinityClick(c as keyof AffinityCounts);
                      }
                      // On-turn + bankEmpty → do nothing (well is dry)
                    }}
                    style={{
                      width: CELL_W,
                      borderRadius: 'var(--well-cell-radius, 10px)',
                      padding: 'var(--well-cell-pad, 6px 3px 5px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 'var(--well-cell-gap, 2px)',
                      cursor:
                        isSingularity || selectable || showForgedLink
                          ? 'pointer'
                          : 'default',
                      position: 'relative',
                      overflow: 'hidden',
                      opacity: 1,
                      transition: 'opacity 0.35s ease',
                      ...cellStyle,
                    }}
                  >
                    {/* Top ornamental rule */}
                    <div
                      style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                        background: `linear-gradient(90deg, transparent, #a8c5ff38, transparent)`,
                        pointerEvents: 'none',
                      }}
                    />

                    {/* ── Singularity absorption flash ── */}
                    {isSingularity && (
                      <AnimatePresence>
                        {absorbFlash > 0 && (
                          <motion.div
                            key={absorbFlash}
                            style={{
                              position: 'absolute', inset: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              pointerEvents: 'none',
                              zIndex: 10,
                            }}
                            initial={{}}
                            exit={{}}
                          >
                            {/* Implosion ring — contracts inward */}
                            <motion.div
                              style={{
                                position: 'absolute',
                                width: 56, height: 56,
                                borderRadius: '50%',
                                border: `1.5px solid ${meta.glowHex}`,
                                boxShadow: `0 0 10px 3px ${meta.glowHex}66`,
                              }}
                              initial={{ scale: 2.2, opacity: 0.85 }}
                              animate={{ scale: 0.05, opacity: 0 }}
                              transition={{ duration: 0.5, ease: [0.30, 0, 0.70, 1] }}
                            />
                            {/* Central core flash */}
                            <motion.div
                              style={{
                                position: 'absolute',
                                width: 20, height: 20,
                                borderRadius: '50%',
                                background: `radial-gradient(circle, ${meta.glowHex}ff 0%, ${meta.glowHex}00 70%)`,
                              }}
                              initial={{ scale: 0.2, opacity: 0 }}
                              animate={{ scale: [0.2, 1.4, 0], opacity: [0, 1, 0] }}
                              transition={{ duration: 0.45, times: [0, 0.35, 1], ease: 'easeOut' }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}

                    {/* Full-slot amber border flash for blocked Harness feedback. */}
                    {!isSingularity && (
                      <AnimatePresence>
                        {(fullFlashKeys[c] ?? 0) > 0 && (
                          <motion.div
                            key={fullFlashKeys[c]}
                            style={{
                              position: 'absolute', inset: 0,
                              borderRadius: 'var(--well-cell-radius, 10px)',
                              border: '1.5px solid #f59e0b',
                              boxShadow: '0 0 8px #f59e0b66, inset 0 0 8px #f59e0b1a',
                              pointerEvents: 'none',
                              zIndex: 5,
                            }}
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                        )}
                      </AnimatePresence>
                    )}

                    {/* ── Dimming wrapper: name label + emblem (dims when bank is dry) ── */}
                    <div className="affinity-well-cell-core" style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      width: '100%',
                      opacity: bankDim ? 0.38 : 1,
                      transition: 'opacity 0.35s ease',
                    }}>

                    {/* ── Affinity name label ── */}
                    <span
                      className="affinity-well-affinity-name"
                      style={{
                        fontSize: 'var(--well-label-size, 6.5px)',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        lineHeight: 1,
                        color: `#a8c5ffcc`,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%',
                        textAlign: 'center',
                      }}
                    >
                      {meta.name}
                    </span>

                    {/* ── Emblem (visual hero) ── */}
                    <div style={{ perspective: '180px' }}>
                    <motion.div
                      data-affinity-symbol={c}
                      animate={isSingularity ? tokenControls : (affinityTokenControls[c] ?? {})}
                      style={{
                        position: 'relative', width: 'var(--well-icon-size, 32px)', height: 'var(--well-icon-size, 32px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transformOrigin: 'center',
                      }}
                    >
                      <AffinityEmblem
                        color={c}
                      className="affinity-well-cell-emblem object-contain pointer-events-none select-none"
                        style={{ width: 'var(--well-icon-size, 32px)', height: 'var(--well-icon-size, 32px)', filter: emblemFilter }}
                      />
                      {/* Forge-cost deduction badge */}
                      {forgeDed > 0 && (
                        <span
                          className="lum-aw-forge-pulse"
                          style={{
                            position: 'absolute', top: -2, right: -2, zIndex: 10,
                            fontSize: 'var(--well-badge-size, 8px)', fontWeight: 900, lineHeight: 1,
                            padding: '1px 3px', borderRadius: 999,
                            background: '#1a0505', color: '#f87171',
                            border: '1px solid #ef444455',
                            boxShadow: '0 0 5px #ef4444aa',
                          }}
                        >
                          −{forgeDed}
                        </span>
                      )}
                    </motion.div>
                    </div>

                    </div>{/* end dimming wrapper */}

                    {/* ── Count + bonus chip row ── */}
                    <div className="affinity-well-count-row" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      {isSingularity ? (
                        /* Singularity: owned singularity count */
                        <span
                          style={{
                            fontSize: 'var(--well-count-size, 16px)', fontWeight: 900, lineHeight: 1,
                            color: heldCount > 0 ? '#fff' : `${meta.hex}28`,
                            textShadow: heldCount > 0 ? `0 0 8px ${meta.glowHex}` : 'none',
                          }}
                        >
                          {heldCount}
                        </span>
                      ) : forgeDed > 0 ? (
                        /* Forge-cost preview: projected post-spend count, amber pulse */
                        <span
                          className="lum-aw-forge-pulse"
                          style={{
                            fontSize: 'var(--well-count-size, 16px)', fontWeight: 900, lineHeight: 1,
                            color: '#f59e0b',
                            textShadow: '0 0 10px #f59e0bcc',
                          }}
                        >
                          {heldCount - forgeDed}
                        </span>
                      ) : pending > 0 ? (
                        /* Selected: tentative post-harness count with glow pulse */
                        <span
                          className="lum-aw-pending-pulse"
                          style={{
                            fontSize: 'var(--well-count-size, 16px)', fontWeight: 900, lineHeight: 1,
                            color: meta.glowHex,
                            textShadow: `0 0 10px ${meta.glowHex}cc, 0 0 22px ${meta.glowHex}44`,
                          }}
                        >
                          {tentativeCount}
                        </span>
                      ) : (
                        /* Normal owned count */
                        <span
                          style={{
                            fontSize: 'var(--well-count-size, 16px)', fontWeight: 900, lineHeight: 1,
                            color: hasContent ? '#fff' : `${meta.hex}28`,
                            textShadow: hasContent ? `0 0 7px ${meta.glowHex}` : 'none',
                          }}
                        >
                          {heldCount}
                        </span>
                      )}

                      {/* ── Inline bonus chip (non-singularity only) ── */}
                      {!isSingularity && (bonus + lumBonus > 0) && (
                        <motion.span
                          className="affinity-well-bonus-chip"
                          key={bonusPulseKeys[c] ?? 'static'}
                          initial={
                            bonusPulseKeys[c] !== undefined
                              ? { scale: 1.55, opacity: 0.6 }
                              : false
                          }
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                          style={{
                            fontSize: 'var(--well-badge-size, 8px)',
                            fontWeight: 800,
                            lineHeight: 1,
                            padding: '1px 3px',
                            borderRadius: 4,
                            border: `1px solid ${meta.glowHex}55`,
                            background: `${meta.hex}1a`,
                            color: meta.glowHex,
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        >
                          +{bonus + lumBonus}
                        </motion.span>
                      )}
                    </div>

                    {/* ── Singularity reservoir meter ── */}
                    {isSingularity && (
                      <div
                        className="affinity-well-reservoir affinity-well-singularity-details"
                        style={{
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 2, marginTop: 1,
                          width: '100%',
                        }}
                      >
                        <span className="sr-only">
                          Reservoir {gaugeFilledCount} of 5
                        </span>
                        <HorizontalWellMeter
                          capacity={5}
                          filledCount={gaugeFilledCount}
                          hex={meta.hex}
                          glowHex={meta.glowHex}
                          burstKey={harnessBurstKeys?.[c] ?? 0}
                        />
                      </div>
                    )}

                    {/* ── Well section (normal affinities only) ── */}
                    {!isSingularity && (
                      <div
                        className="affinity-well-reservoir"
                        style={{
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 2, marginTop: 1,
                          opacity: bankDim ? 0.38 : 1,
                          transition: 'opacity 0.35s ease',
                        }}
                      >
                        <span className="sr-only">
                          Reservoir {gaugeFilledCount} of {gaugeCapacity}
                        </span>
                        <HorizontalWellMeter
                          capacity={gaugeCapacity}
                          filledCount={gaugeFilledCount}
                          hex={meta.hex}
                          glowHex={meta.glowHex}
                          burstKey={harnessBurstKeys?.[c] ?? 0}
                        />
                      </div>
                    )}

                  </motion.button>

                  {/* Singularity uses the shared lower control strip for encrypted Artifacts. */}
                  {isSingularity && (
                    <motion.button
                      type="button"
                      data-singularity-reserve-target=""
                      data-cipher-landing={absorbFlash > 0 ? 'true' : undefined}
                      aria-label={`Open encrypted Artifacts, ${reservedCount} of 3`}
                      whileTap={{ scale: 0.96 }}
                      onClick={(e) => {
                        if (isDragging.current) return;
                        e.stopPropagation();
                        onOpenReserved();
                      }}
                      className="affinity-well-take2 affinity-well-singularity-footer"
                    >
                      <span>{reservedCount}/3</span>
                      <span className="affinity-well-singularity-footer-sigil">
                        <CipherSigil
                          affinityHex={reservedCount > 0 ? meta.glowHex : `${meta.glowHex}50`}
                          id={99}
                        />
                      </span>
                      <AnimatePresence>
                        {absorbFlash > 0 && (
                          <motion.span
                            key={`cipher-landing-${absorbFlash}`}
                            className="affinity-well-cipher-landing"
                            initial={{ opacity: 0, scale: 0.28 }}
                            animate={{ opacity: [0, 0.95, 0], scale: [0.28, 1.05, 1.65] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.72, ease: 'easeOut' }}
                          />
                        )}
                      </AnimatePresence>
                    </motion.button>
                  )}

                  {/* ── ×2 sub-button: take 2 of the same — non-singularity only ── */}
                  {!isSingularity && (
                    (() => {
                      const takeTwoSelected = pending === 2;
                      const takeTwoInteractive = canTake2;
                      const takeTwoStyle = takeTwoInteractive
                        ? {
                            '--well-take2-border': `${meta.hex}${takeTwoSelected ? 'd9' : '72'}`,
                            '--well-take2-top': `${meta.hex}${takeTwoSelected ? '82' : '30'}`,
                            '--well-take2-bottom': `${meta.hex}${takeTwoSelected ? '42' : '12'}`,
                            '--well-take2-text': takeTwoSelected ? '#fff' : meta.glowHex,
                            '--well-take2-shadow': takeTwoSelected
                              ? `0 0 11px ${meta.hex}82`
                              : `0 -2px 7px ${meta.hex}2e`,
                          }
                        : {
                            '--well-take2-border': 'rgba(123, 156, 255, 0.22)',
                            '--well-take2-top': 'rgba(45, 65, 126, 0.22)',
                            '--well-take2-bottom': 'rgba(15, 21, 54, 0.50)',
                            '--well-take2-text': 'rgba(200, 218, 255, 0.45)',
                            '--well-take2-shadow': 'none',
                          };
                      return (
                        <motion.button
                          type="button"
                          aria-label={takeTwoSelected ? `2 ${meta.name} selected` : `Take 2 ${meta.name}`}
                          aria-pressed={takeTwoSelected}
                          tabIndex={canTake2 ? 0 : -1}
                          animate={{ opacity: takeTwoSelected || canTake2 ? 1 : 0.32 }}
                          transition={{ duration: 0.15 }}
                          onClick={(e) => {
                            if (!canTake2 || isDragging.current) return;
                            e.stopPropagation();
                            onPromoteToTake2(c);
                          }}
                          style={{
                            pointerEvents: canTake2 ? 'auto' : 'none',
                            visibility: 'visible',
                            width: CELL_W,
                            height: 'var(--well-take2-h, auto)',
                            paddingBlock: 'var(--well-take2-pad-y, 0.25rem)',
                            ...takeTwoStyle,
                          } as React.CSSProperties}
                          className="affinity-well-take2 text-[9px] font-bold rounded-md leading-none transition-colors"
                        >
                          ×2
                        </motion.button>
                      );
                    })()
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
        </div>{/* end inner wrapper */}


      </div>{/* end carousel flex row */}
    </div>
  );
}
