import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  GameState,
  CrystalCounts,
  GamePlayerState,
  LuminaryActiveState,
} from '@workspace/api-client-react';
import { GEM_META, GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import { AffinityEmblem } from '@/components/AffinityEmblem';
import type { LumiiAttentionState } from '@/components/LumiiTutorial';

const CRYSTALS: GemKey[] = GEM_KEYS;

// Cell width used for all six modules
const CELL_W = 64;

export interface AffinityWellCellsProps {
  me: GamePlayerState;
  state: GameState;
  selectedCrystals: Partial<CrystalCounts>;
  isMyTurn: boolean;
  canPlan: boolean;
  isActivePlayer: boolean;
  isTutorial: boolean;
  tutorialZone: string | null;
  tutorialAttention: LumiiAttentionState | null;
  sessionPlayerId: string | undefined;
  harvestBurstKeys?: Partial<Record<GemKey, number>>;
  forgeDeductions?: Partial<Record<GemKey, number>>;
  onCrystalClick: (color: keyof CrystalCounts) => void;
  onPromoteToTake2: (color: GemKey) => void;
  onOpenReserved: () => void;
  onOpenForged: (color: GemKey) => void;
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
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', position: 'relative' }}>
      {Array.from({ length: capacity }, (_, i) => {
        const filled = pipFilled[i] ?? false;
        return (
          <motion.div
            key={i}
            animate={
              filled
                ? { backgroundColor: hex, opacity: 0.90, scale: 1 }
                : { backgroundColor: 'transparent', opacity: 0.70, scale: 1 }
            }
            transition={{ duration: 0.14, ease: 'easeOut' }}
            style={{
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              border: filled
                ? `1px solid ${glowHex}88`
                : `1.5px solid ${glowHex}65`,
              boxShadow: filled
                ? `0 0 5px ${glowHex}66`
                : `inset 0 0 2px ${glowHex}18`,
            }}
          />
        );
      })}

      {/* Burst flash when harvest is received */}
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
  selectedCrystals,
  isMyTurn,
  canPlan,
  isActivePlayer,
  isTutorial: _isTutorial,
  tutorialZone: _tutorialZone,
  tutorialAttention: _tutorialAttention,
  sessionPlayerId,
  harvestBurstKeys,
  forgeDeductions,
  onCrystalClick,
  onPromoteToTake2,
  onOpenReserved,
  onOpenForged,
}: AffinityWellCellsProps) {
  const playerCount    = state.players.length;
  const gaugeCapacity  = playerCount === 2 ? 4 : playerCount === 3 ? 5 : 7;
  const isPlanningMode = !isActivePlayer && canPlan;
  const anyPending     = CRYSTALS.some((c) => (selectedCrystals[c as keyof CrystalCounts] ?? 0) > 0);
  const showPlanningCue = isPlanningMode && anyPending;

  // Scroll-vs-tap disambiguation: if a touch moves >6px horizontally we
  // treat it as a scroll gesture and suppress the subsequent click on any cell.
  const isDragging    = useRef(false);
  const dragStartX    = useRef(0);

  // ── Bonus chip pulse animation ──────────────────────────────────────────────
  // Track previous total bonus (card bonus + luminary bonus) per affinity.
  // When the value increases, increment the pulse key so the motion.span
  // remounts and replays its initial→animate sequence. Skip on initial mount.
  const prevBonusRef  = useRef<Partial<Record<GemKey, number>>>({});
  const isMountedRef  = useRef(false);
  const [bonusPulseKeys, setBonusPulseKeys] = useState<Partial<Record<GemKey, number>>>({});

  useEffect(() => {
    const luminaryAffinities = ((state as any)?.luminaryAffinities as LuminaryActiveState[] ?? []);
    const turnCount = ((state as any)?.turnCount ?? 0) as number;

    const newTotals: Partial<Record<GemKey, number>> = {};
    for (const c of CRYSTALS) {
      if (c === 'flux') continue;
      const bonus    = me.bonuses[c as keyof CrystalCounts] ?? 0;
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

    const changedKeys: GemKey[] = [];
    for (const c of CRYSTALS) {
      if (c === 'flux') continue;
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
    <div className="relative">

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
            width: 36, zIndex: 2, pointerEvents: 'none',
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
              gap: 4,
              padding: '4px 8px 6px 6px',
              width: 'max-content',
            }}
          >
            {CRYSTALS.map((c) => {
              const meta         = GEM_META[c];
              const isFlux       = c === 'flux';
              const gems         = me.crystals[c as keyof CrystalCounts] ?? 0;
              const bonus        = me.bonuses[c as keyof CrystalCounts] ?? 0;
              const lumBonus     = (
                ((state as any)?.luminaryAffinities as LuminaryActiveState[] ?? [])
                  .filter(
                    (la: LuminaryActiveState) =>
                      la.ownerId === sessionPlayerId &&
                      ((state as any)?.turnCount ?? 0) > la.summonedAtTurnCount &&
                      la.activeAffinity === c,
                  ).length
              );
              const reservedCount = me.reservedCards.length;
              const pending       = selectedCrystals[c as keyof CrystalCounts] ?? 0;
              const forgeDed      = forgeDeductions?.[c as keyof CrystalCounts] ?? 0;
              const bankCount     = state.crystalBank[c as keyof CrystalCounts] ?? 0;
              const selectable    = isMyTurn || (!isActivePlayer && canPlan);
              const bankEmpty     = bankCount === 0;
              const canTake2      = selectable && !isFlux && bankCount >= 4 && pending !== 2;
              const showForgedLink = !isFlux && bonus > 0;
              const gaugeFilledCount = Math.max(0, bankCount - pending);
              const tentativeCount   = gems + pending;
              const hasContent       = isFlux
                ? gems > 0 || reservedCount > 0
                : gems > 0 || bonus > 0 || lumBonus > 0;

              // ── Cell background style ──────────────────────────────────────
              const cellStyle: React.CSSProperties =
                pending > 0
                  ? {
                      background: `linear-gradient(180deg, ${meta.hex}44 0%, ${meta.hex}20 100%)`,
                      border: `1.5px solid ${meta.glowHex}cc`,
                      boxShadow: `0 0 14px ${meta.glowHex}55, inset 0 0 10px ${meta.hex}2a`,
                    }
                  : hasContent
                  ? {
                      background: `linear-gradient(180deg, ${meta.hex}1c 0%, ${meta.hex}0a 100%)`,
                      border: `1px solid ${meta.hex}60`,
                      boxShadow: `inset 0 0 8px ${meta.hex}12`,
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
                  : bankEmpty && !isFlux
                  ? 'grayscale(0.65) opacity(0.4)'
                  : `drop-shadow(0 0 5px ${meta.glowHex}70)`;

              return (
                <div
                  key={c}
                  style={{ display: 'flex', flexDirection: 'column', gap: 2, width: CELL_W, flexShrink: 0 }}
                >
                  {/* ── Main cell button ── */}
                  <motion.button
                    type="button"
                    // Singularity always tappable; others need selectable + non-empty bank
                    disabled={isFlux ? false : !selectable && !showForgedLink || bankEmpty && !showForgedLink}
                    whileTap={
                      (isFlux || (selectable && !bankEmpty) || showForgedLink)
                        ? { scale: 0.91 }
                        : {}
                    }
                    animate={
                      pending > 0
                        ? { scale: [1, 1.03, 1], transition: { duration: 0.18 } }
                        : {}
                    }
                    onClick={() => {
                      if (isDragging.current) return;
                      if (isFlux) {
                        onOpenReserved();
                      } else if (showForgedLink && !selectable) {
                        onOpenForged(c);
                      } else if (selectable && !bankEmpty) {
                        onCrystalClick(c as keyof CrystalCounts);
                      } else if (showForgedLink) {
                        onOpenForged(c);
                      }
                    }}
                    style={{
                      width: CELL_W,
                      borderRadius: 10,
                      padding: '6px 3px 5px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      cursor:
                        isFlux || selectable || showForgedLink
                          ? 'pointer'
                          : 'default',
                      position: 'relative',
                      overflow: 'hidden',
                      opacity: bankEmpty && !isFlux && pending === 0 ? 0.42 : 1,
                      transition: 'opacity 0.35s ease',
                      ...cellStyle,
                    }}
                  >
                    {/* Top ornamental rule */}
                    <div
                      style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                        background: `linear-gradient(90deg, transparent, ${meta.glowHex}38, transparent)`,
                        pointerEvents: 'none',
                      }}
                    />

                    {/* ── Affinity name label ── */}
                    <span
                      style={{
                        fontSize: 6.5,
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        lineHeight: 1,
                        color: `${meta.glowHex}70`,
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
                    <div
                      style={{
                        position: 'relative', width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <AffinityEmblem
                        color={c}
                        className="object-contain pointer-events-none select-none"
                        style={{ width: 32, height: 32, filter: emblemFilter }}
                      />
                      {/* Forge-cost deduction badge */}
                      {forgeDed > 0 && (
                        <motion.span
                          style={{
                            position: 'absolute', top: -2, right: -2, zIndex: 10,
                            fontSize: 8, fontWeight: 900, lineHeight: 1,
                            padding: '1px 3px', borderRadius: 999,
                            background: '#1a0505', color: '#f87171',
                            border: '1px solid #ef444455',
                            boxShadow: '0 0 5px #ef4444aa',
                          }}
                          animate={{ opacity: [1, 0.55, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          −{forgeDed}
                        </motion.span>
                      )}
                    </div>

                    {/* ── Count + bonus chip row ── */}
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      {isFlux ? (
                        /* Singularity: owned flux count */
                        <span
                          style={{
                            fontSize: 16, fontWeight: 900, lineHeight: 1,
                            color: gems > 0 ? '#fff' : `${meta.hex}28`,
                            textShadow: gems > 0 ? `0 0 8px ${meta.glowHex}` : 'none',
                          }}
                        >
                          {gems}
                        </span>
                      ) : forgeDed > 0 ? (
                        /* Forge-cost preview: projected post-spend count, amber pulse */
                        <motion.span
                          style={{
                            fontSize: 16, fontWeight: 900, lineHeight: 1,
                            color: '#f59e0b',
                            textShadow: '0 0 10px #f59e0bcc',
                          }}
                          animate={{ opacity: [1, 0.55, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          {gems - forgeDed}
                        </motion.span>
                      ) : pending > 0 ? (
                        /* Selected: tentative post-harness count with glow pulse */
                        <motion.span
                          style={{
                            fontSize: 16, fontWeight: 900, lineHeight: 1,
                            color: meta.glowHex,
                            textShadow: `0 0 10px ${meta.glowHex}cc, 0 0 22px ${meta.glowHex}44`,
                          }}
                          animate={{ opacity: [1, 0.68, 1] }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          {tentativeCount}
                        </motion.span>
                      ) : (
                        /* Normal owned count */
                        <span
                          style={{
                            fontSize: 16, fontWeight: 900, lineHeight: 1,
                            color: hasContent ? '#fff' : `${meta.hex}28`,
                            textShadow: hasContent ? `0 0 7px ${meta.glowHex}` : 'none',
                          }}
                        >
                          {gems}
                        </span>
                      )}

                      {/* ── Inline bonus chip (non-flux only) ── */}
                      {!isFlux && (bonus + lumBonus > 0) && (
                        <motion.span
                          key={bonusPulseKeys[c] ?? 'static'}
                          initial={
                            bonusPulseKeys[c] !== undefined
                              ? { scale: 1.55, opacity: 0.6 }
                              : false
                          }
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                          style={{
                            fontSize: 8,
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

                    {/* ── Well section: Singularity shows encrypted-pile meter ── */}
                    {isFlux && (
                      <div
                        style={{
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 2, marginTop: 1,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 5.5, fontWeight: 700, lineHeight: 1,
                            color: `${meta.glowHex}99`,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Available {gaugeFilledCount}/5
                        </span>
                        <HorizontalWellMeter
                          capacity={5}
                          filledCount={gaugeFilledCount}
                          hex={meta.hex}
                          glowHex={meta.glowHex}
                          burstKey={harvestBurstKeys?.[c] ?? 0}
                        />
                      </div>
                    )}

                    {/* ── Well section (normal affinities only) ── */}
                    {!isFlux && (
                      <div
                        style={{
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 2, marginTop: 1,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 5.5, fontWeight: 700, lineHeight: 1,
                            color: `${meta.glowHex}99`,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Available {gaugeFilledCount}/{gaugeCapacity}
                        </span>
                        <HorizontalWellMeter
                          capacity={gaugeCapacity}
                          filledCount={gaugeFilledCount}
                          hex={meta.hex}
                          glowHex={meta.glowHex}
                          burstKey={harvestBurstKeys?.[c] ?? 0}
                        />
                      </div>
                    )}

                  </motion.button>

                  {/* ── ×2 sub-button: take 2 of the same — only visible when eligible ── */}
                  <motion.button
                    type="button"
                    aria-hidden={!canTake2}
                    tabIndex={canTake2 ? 0 : -1}
                    animate={{ opacity: canTake2 ? 1 : 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={(e) => {
                      if (!canTake2 || isDragging.current) return;
                      e.stopPropagation();
                      onPromoteToTake2(c);
                    }}
                    style={{
                      pointerEvents: canTake2 ? 'auto' : 'none',
                      visibility: canTake2 ? 'visible' : 'hidden',
                      width: CELL_W,
                    }}
                    className={`text-[9px] font-bold rounded-md py-1 leading-none transition-colors ${
                      isPlanningMode
                        ? 'text-amber-400/80 bg-amber-400/10 active:bg-amber-400/25'
                        : 'text-primary/80 bg-primary/10 active:bg-primary/25'
                    }`}
                  >
                    ×2
                  </motion.button>
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
