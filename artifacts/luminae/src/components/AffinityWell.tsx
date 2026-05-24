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

function CompassRing({ glowHex, size = 40 }: { glowHex: string; size?: number }) {
  const cx = size / 2;
  const r = size / 2 - 2;
  const tick = 3.5;
  const diag = 2.5;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ opacity: 0.07 }}>
      <circle cx={cx} cy={cx} r={r} stroke={glowHex} strokeWidth="0.5" />
      <line x1={cx} y1={2} x2={cx} y2={2 + tick} stroke={glowHex} strokeWidth="0.7" />
      <line x1={cx} y1={size - 2} x2={cx} y2={size - 2 - tick} stroke={glowHex} strokeWidth="0.7" />
      <line x1={2} y1={cx} x2={2 + tick} y2={cx} stroke={glowHex} strokeWidth="0.7" />
      <line x1={size - 2} y1={cx} x2={size - 2 - tick} y2={cx} stroke={glowHex} strokeWidth="0.7" />
      <line x1={6} y1={6} x2={6 + diag} y2={6 + diag} stroke={glowHex} strokeWidth="0.4" />
      <line x1={size - 6} y1={6} x2={size - 6 - diag} y2={6 + diag} stroke={glowHex} strokeWidth="0.4" />
      <line x1={6} y1={size - 6} x2={6 + diag} y2={size - 6 - diag} stroke={glowHex} strokeWidth="0.4" />
      <line x1={size - 6} y1={size - 6} x2={size - 6 - diag} y2={size - 6 - diag} stroke={glowHex} strokeWidth="0.4" />
    </svg>
  );
}

function ReservoirGauge({
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
    Array.from({ length: capacity }, (_, i) => i >= capacity - filledCount),
  );

  const [burstId, setBurstId] = useState<number>(0);
  const prevBurstKeyRef = useRef(burstKey);

  useEffect(() => {
    if (burstKey === prevBurstKeyRef.current) return;
    prevBurstKeyRef.current = burstKey;
    setBurstId((n) => n + 1);
  }, [burstKey]);

  const prevFilledRef = useRef(filledCount);
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (filledCount === prevFilledRef.current) return;

    timerIds.current.forEach(clearTimeout);
    timerIds.current = [];

    if (filledCount < prevFilledRef.current) {
      const firstDraining = capacity - prevFilledRef.current;
      const lastDraining = capacity - filledCount - 1;
      for (let i = firstDraining; i <= lastDraining; i++) {
        const seq = i - firstDraining;
        const id = setTimeout(() => {
          setPipFilled((prev) => {
            const next = [...prev];
            next[i] = false;
            return next;
          });
        }, seq * 180);
        timerIds.current.push(id);
      }
    } else {
      const firstFilling = capacity - filledCount;
      const lastFilling = capacity - prevFilledRef.current - 1;
      for (let i = lastFilling; i >= firstFilling; i--) {
        const seq = lastFilling - i;
        const id = setTimeout(() => {
          setPipFilled((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, seq * 180);
        timerIds.current.push(id);
      }
    }

    prevFilledRef.current = filledCount;

    return () => {
      timerIds.current.forEach(clearTimeout);
    };
  }, [filledCount, capacity]);

  return (
    <div className="relative flex flex-col items-center gap-[2px]" style={{ opacity: 0.38 }}>
      {Array.from({ length: capacity }, (_, i) => {
        const isFilled = pipFilled[i] ?? false;
        return (
          <motion.div
            key={i}
            className="rounded-full shrink-0"
            animate={
              isFilled
                ? { scale: 1, opacity: 0.75, backgroundColor: hex }
                : { scale: 1, opacity: 0.3, backgroundColor: 'transparent' }
            }
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              width: 3,
              height: 3,
              border: isFilled ? `1px solid ${glowHex}35` : `1px solid ${glowHex}18`,
              boxShadow: isFilled ? `0 0 2px ${glowHex}40` : 'none',
            }}
          />
        );
      })}
      <AnimatePresence>
        {burstId > 0 && (
          <motion.div
            key={burstId}
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0.9, scale: 0.4 }}
            animate={{ opacity: 0, scale: 2.8 }}
            exit={{}}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            style={{
              borderRadius: '50%',
              background: `radial-gradient(ellipse at center, ${hex}cc 0%, ${glowHex}55 40%, transparent 72%)`,
              top: '50%',
              left: '50%',
              width: 10,
              height: 10,
              marginTop: -5,
              marginLeft: -5,
              position: 'absolute',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function AffinityWellCells({
  me,
  state,
  selectedCrystals,
  isMyTurn,
  canPlan,
  isActivePlayer,
  sessionPlayerId,
  harvestBurstKeys,
  forgeDeductions,
  onCrystalClick,
  onPromoteToTake2,
  onOpenReserved,
  onOpenForged,
}: AffinityWellCellsProps) {
  const playerCount = state.players.length;
  const gaugeCapacity = playerCount === 2 ? 4 : playerCount === 3 ? 5 : 7;

  const isPlanningMode = !isActivePlayer && canPlan;
  const anyPending = CRYSTALS.some((c) => (selectedCrystals[c as keyof CrystalCounts] ?? 0) > 0);
  const showPlanningCue = isPlanningMode && anyPending;

  return (
    <div className="relative">
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
      <motion.div
        animate={
          showPlanningCue
            ? { boxShadow: '0 0 0 1px rgba(251,191,36,0.30)' }
            : { boxShadow: '0 0 0 1px transparent' }
        }
        transition={{ duration: 0.25 }}
        className="flex gap-1 px-2 pb-2 rounded-lg"
      >
      {CRYSTALS.map((c) => {
        const meta = GEM_META[c];
        const isFlux = c === 'flux';
        const gems = me.crystals[c as keyof CrystalCounts] ?? 0;
        const bonus = me.bonuses[c as keyof CrystalCounts] ?? 0;
        const lumBonus = ((state as any)?.luminaryAffinities as LuminaryActiveState[] ?? [])
          .filter(
            (la: LuminaryActiveState) =>
              la.ownerId === sessionPlayerId &&
              ((state as any)?.turnCount ?? 0) > la.summonedAtTurnCount &&
              la.activeAffinity === c,
          ).length;
        const reservedCount = me.reservedCards.length;
        const pending = selectedCrystals[c as keyof CrystalCounts] ?? 0;
        const forgeDed = forgeDeductions?.[c as keyof CrystalCounts] ?? 0;
        const bankCount = state.crystalBank[c as keyof CrystalCounts] ?? 0;
        const selectable = isMyTurn || (!isActivePlayer && canPlan);
        const bankEmpty = bankCount === 0;
        const canTake2 = selectable && !isFlux && bankCount >= 4 && pending !== 2;
        // hasContent drives display logic (forged link, count text color, etc.)
        const hasContent = isFlux
          ? gems > 0 || reservedCount > 0
          : gems > 0 || bonus > 0 || lumBonus > 0;
        // hasGlowContent drives cell border/glow ONLY — bonus does NOT affect glow
        // so ownership never competes visually with selection/queued state
        const hasGlowContent = isFlux
          ? gems > 0 || reservedCount > 0
          : gems > 0;
        const showForgedLink = !isFlux && bonus > 0;
        const showReservedLink = isFlux && reservedCount > 0;

        const gaugeFilledCount = Math.max(0, bankCount - pending);

        const cellStyle: React.CSSProperties =
          pending > 0
            ? {
                background: `linear-gradient(180deg, ${meta.hex}55 0%, ${meta.hex}2a 100%)`,
                border: `2px solid ${meta.glowHex}dd`,
                boxShadow: `0 0 18px ${meta.glowHex}99, inset 0 0 14px ${meta.hex}44`,
              }
            : hasGlowContent
            ? {
                background: `linear-gradient(180deg, ${meta.hex}18 0%, ${meta.hex}0c 100%)`,
                border: `1px solid ${meta.hex}50`,
                boxShadow: `inset 0 0 8px ${meta.hex}10`,
              }
            : {
                background: `linear-gradient(180deg, ${meta.hex}08 0%, transparent 100%)`,
                border: `1px solid ${meta.hex}18`,
              };

        return (
          <div key={c} className="flex-1 flex flex-col gap-0.5 min-w-0">
            <motion.button
              type="button"
              disabled={isFlux ? !showReservedLink : !selectable || bankEmpty}
              whileTap={!isFlux && selectable && !bankEmpty ? { scale: 0.9 } : {}}
              animate={
                pending > 0 ? { scale: [1, 1.06, 1], transition: { duration: 0.2 } } : {}
              }
              onClick={() => {
                if (isFlux) {
                  if (showReservedLink) onOpenReserved();
                } else if (showForgedLink && !selectable) {
                  onOpenForged(c);
                } else if (selectable && !bankEmpty) {
                  onCrystalClick(c as keyof CrystalCounts);
                } else if (showForgedLink) {
                  onOpenForged(c);
                }
              }}
              className="relative w-full rounded-lg overflow-hidden transition-all"
              style={{ minHeight: 66, ...cellStyle }}
            >
              {/* Affinity name — pinned to top */}
              <span
                className="absolute top-[3px] inset-x-0 text-center text-[6px] font-semibold uppercase tracking-wider leading-none pointer-events-none z-10"
                style={{ color: `${meta.glowHex}75` }}
              >
                {meta.shortName}
              </span>

              {/* Top ornamental rule */}
              <div
                className="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, transparent, ${meta.glowHex}55, transparent)`,
                }}
              />
              {/* Bottom ornamental rule */}
              <div
                className="absolute inset-x-0 bottom-0 h-[1px] pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, transparent, ${meta.glowHex}28, transparent)`,
                }}
              />
              {/* Vertical glow channel */}
              <div
                className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
                style={{
                  width: 1,
                  background: `linear-gradient(180deg, transparent, ${meta.glowHex}15, ${meta.glowHex}08, transparent)`,
                }}
              />
              {/* Base glow at cell bottom */}
              <div
                className="absolute bottom-0 inset-x-0 pointer-events-none"
                style={{
                  height: 16,
                  background: `radial-gradient(ellipse 70% 100% at 50% 100%, ${meta.hex}0e, transparent)`,
                }}
              />

              {isFlux ? (
                /* ── Singularity cell ── */
                <div className="flex flex-col items-center pt-[11px] pb-1.5 px-0.5 h-full gap-0">
                  {/* Emblem — visual hero */}
                  <div className="relative flex items-center justify-center w-9 h-9">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <CompassRing glowHex={meta.glowHex} size={36} />
                    </div>
                    <AffinityEmblem
                      color={c}
                      className="w-9 h-9 object-contain pointer-events-none select-none relative z-[1]"
                      style={{ filter: `drop-shadow(0 0 8px ${meta.glowHex}80)` }}
                    />
                  </div>

                  {/* Glass divider */}
                  <div
                    className="w-3/4 mt-[3px] mb-[3px]"
                    style={{
                      height: 1,
                      background: `linear-gradient(90deg, transparent, ${meta.glowHex}18, transparent)`,
                    }}
                  />

                  {/* Owned count */}
                  <span
                    className="text-base font-black leading-none"
                    style={{
                      color: gems > 0 ? '#fff' : `${meta.hex}35`,
                      textShadow: gems > 0 ? `0 0 8px ${meta.glowHex}` : 'none',
                    }}
                  >
                    {gems}
                  </span>

                  {/* Reserved count */}
                  {reservedCount > 0 && (
                    <span
                      className="text-[6px] font-semibold leading-none mt-[3px]"
                      style={{ color: `${meta.glowHex}65` }}
                    >
                      {reservedCount} enc.
                    </span>
                  )}
                </div>
              ) : (
                /* ── Colored affinity cell ── */
                <>
                  {/* Reservoir gauge — slim, left-edge, secondary */}
                  <div
                    className="absolute left-[3px] bottom-[18px] top-[13px] pointer-events-none flex flex-col items-center justify-end"
                    style={{ gap: 2 }}
                  >
                    <ReservoirGauge
                      capacity={gaugeCapacity}
                      filledCount={gaugeFilledCount}
                      hex={meta.hex}
                      glowHex={meta.glowHex}
                      burstKey={harvestBurstKeys?.[c] ?? 0}
                    />
                    {/* X/N fraction */}
                    <span
                      className="font-mono tabular-nums leading-none"
                      style={{
                        fontSize: 5,
                        color: `${meta.glowHex}50`,
                        marginTop: 2,
                      }}
                    >
                      {gaugeFilledCount}/{gaugeCapacity}
                    </span>
                  </div>

                  {/* Main content */}
                  <div className="flex flex-col items-center pt-[11px] pb-[5px] px-0.5">
                    {/* Emblem — visual hero */}
                    <div className="relative flex items-center justify-center w-9 h-9">
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <CompassRing glowHex={meta.glowHex} size={36} />
                      </div>
                      <AffinityEmblem
                        color={c}
                        className="w-9 h-9 object-contain pointer-events-none select-none relative z-[1]"
                        style={{
                          filter:
                            pending > 0
                              ? `drop-shadow(0 0 8px ${meta.glowHex}) brightness(1.3)`
                              : forgeDed > 0
                              ? 'drop-shadow(0 0 6px #ef4444cc) brightness(0.6) saturate(0.35)'
                              : bankEmpty
                              ? 'grayscale(0.7) opacity(0.4)'
                              : `drop-shadow(0 0 6px ${meta.glowHex}80)`,
                        }}
                      />
                      {/* Forge-cost badge — −N in red, top-right corner of emblem */}
                      {forgeDed > 0 && (
                        <motion.span
                          key={`forge-badge-${forgeDed}`}
                          className="absolute -top-1 -right-1 z-10 text-[9px] font-black leading-none px-[3px] py-[1px] rounded-full pointer-events-none select-none"
                          style={{
                            background: '#1a0505',
                            color: '#f87171',
                            border: '1px solid #ef444466',
                            boxShadow: '0 0 6px #ef4444aa',
                          }}
                          animate={{ opacity: [1, 0.6, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          −{forgeDed}
                        </motion.span>
                      )}
                    </div>

                    {/* Glass divider between emblem and count */}
                    <div
                      className="w-3/4 mt-[3px] mb-[2px]"
                      style={{
                        height: 1,
                        background: `linear-gradient(90deg, transparent, ${meta.glowHex}18, transparent)`,
                      }}
                    />

                    {/* Count row — owned count + optional +Y delta badge */}
                    <div className="flex items-baseline justify-center gap-[3px]">
                      {forgeDed > 0 ? (
                        <motion.span
                          key="forge-preview"
                          className="text-base font-black leading-none"
                          style={{
                            color: '#f59e0b',
                            textShadow: '0 0 10px #f59e0bcc',
                          }}
                          animate={{ opacity: [1, 0.55, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          {gems - forgeDed}
                        </motion.span>
                      ) : (
                        <span
                          className="text-base font-black leading-none"
                          style={{
                            color: hasContent ? '#fff' : `${meta.hex}35`,
                            textShadow: hasContent ? `0 0 8px ${meta.glowHex}` : 'none',
                          }}
                        >
                          {gems}
                        </span>
                      )}
                      {/* +Y incoming delta — shown to the right when pending */}
                      {pending > 0 && forgeDed === 0 && (
                        <motion.span
                          key="delta"
                          className="text-[9px] font-bold leading-none"
                          style={{
                            color: meta.glowHex,
                            textShadow: `0 0 6px ${meta.glowHex}`,
                          }}
                          animate={{ opacity: [1, 0.55, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          +{pending}
                        </motion.span>
                      )}
                    </div>

                    {/* Bonus pill — centered beneath count row */}
                    {(bonus > 0 || lumBonus > 0) && (
                      <div
                        className="flex items-center gap-[2px] mt-[3px] px-[3px] py-[1px] rounded-full"
                        style={{
                          background: `${meta.hex}1a`,
                          border: `1px solid ${meta.hex}40`,
                        }}
                      >
                        {bonus > 0 && (
                          <span className="text-[6px] font-bold leading-none text-primary">
                            +{bonus}
                          </span>
                        )}
                        {lumBonus > 0 && (
                          <span
                            className="text-[6px] font-bold leading-none"
                            style={{ color: meta.glowHex }}
                          >
                            +{lumBonus}✦
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.button>

            {/* ×2 sub-button — slim but still tappable */}
            <motion.button
              type="button"
              aria-hidden={!canTake2}
              tabIndex={canTake2 ? 0 : -1}
              animate={{ opacity: canTake2 ? 1 : 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => {
                if (!canTake2) return;
                e.stopPropagation();
                onPromoteToTake2(c);
              }}
              style={{
                pointerEvents: canTake2 ? 'auto' : 'none',
                visibility: canTake2 ? 'visible' : 'hidden',
              }}
              className={`w-full text-[9px] font-bold rounded-md py-1 transition-colors leading-none ${
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
      </motion.div>
    </div>
  );
}
