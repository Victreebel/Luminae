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
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ opacity: 0.13 }}>
      <circle cx={cx} cy={cx} r={r} stroke={glowHex} strokeWidth="0.6" />
      <line x1={cx} y1={2} x2={cx} y2={2 + tick} stroke={glowHex} strokeWidth="0.8" />
      <line x1={cx} y1={size - 2} x2={cx} y2={size - 2 - tick} stroke={glowHex} strokeWidth="0.8" />
      <line x1={2} y1={cx} x2={2 + tick} y2={cx} stroke={glowHex} strokeWidth="0.8" />
      <line x1={size - 2} y1={cx} x2={size - 2 - tick} y2={cx} stroke={glowHex} strokeWidth="0.8" />
      <line x1={6} y1={6} x2={6 + diag} y2={6 + diag} stroke={glowHex} strokeWidth="0.5" />
      <line x1={size - 6} y1={6} x2={size - 6 - diag} y2={6 + diag} stroke={glowHex} strokeWidth="0.5" />
      <line x1={6} y1={size - 6} x2={6 + diag} y2={size - 6 - diag} stroke={glowHex} strokeWidth="0.5" />
      <line x1={size - 6} y1={size - 6} x2={size - 6 - diag} y2={size - 6 - diag} stroke={glowHex} strokeWidth="0.5" />
    </svg>
  );
}

function ReservoirGauge({
  capacity,
  filledCount,
  hex,
  glowHex,
  burstKey = 0,
  horizontal = false,
}: {
  capacity: number;
  filledCount: number;
  hex: string;
  glowHex: string;
  burstKey?: number;
  horizontal?: boolean;
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
    <div className={`relative flex items-center ${horizontal ? 'flex-row gap-[4px]' : 'flex-col gap-[3px]'}`}>
      {Array.from({ length: capacity }, (_, i) => {
        const isFilled = horizontal
          ? (pipFilled[capacity - 1 - i] ?? false)
          : (pipFilled[i] ?? false);
        return (
          <motion.div
            key={i}
            className="rounded-full shrink-0"
            animate={
              isFilled
                ? { scale: 1, opacity: 1, backgroundColor: hex }
                : { scale: 1, opacity: 1, backgroundColor: 'transparent' }
            }
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              width: horizontal ? 6 : 5,
              height: horizontal ? 6 : 5,
              border: isFilled ? `1px solid ${glowHex}60` : `1px solid ${glowHex}35`,
              boxShadow: isFilled ? `0 0 4px ${glowHex}80` : 'none',
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
              width: 14,
              height: 14,
              marginTop: -7,
              marginLeft: -7,
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
  onCrystalClick,
  onPromoteToTake2,
  onOpenReserved,
  onOpenForged,
}: AffinityWellCellsProps) {
  const playerCount = state.players.length;
  const gaugeCapacity = playerCount === 2 ? 4 : playerCount === 3 ? 5 : 7;

  return (
    <div className="flex gap-1 px-2 pb-2">
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
        const bankCount = state.crystalBank[c as keyof CrystalCounts] ?? 0;
        const isPlanningMode = !isActivePlayer && canPlan;
        const selectable = isMyTurn || (!isActivePlayer && canPlan);
        const bankEmpty = bankCount === 0;
        const canTake2 = selectable && !isFlux && bankCount >= 4 && pending !== 2;
        const hasContent = isFlux
          ? gems > 0 || reservedCount > 0
          : gems > 0 || bonus > 0 || lumBonus > 0;
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
            : hasContent
            ? {
                background: `linear-gradient(180deg, ${meta.hex}22 0%, ${meta.hex}10 100%)`,
                border: `1px solid ${meta.hex}88`,
                boxShadow: `inset 0 0 10px ${meta.hex}18`,
              }
            : {
                background: `linear-gradient(180deg, ${meta.hex}0a 0%, transparent 100%)`,
                border: `1px solid ${meta.hex}20`,
              };

        return (
          <div key={c} className="flex-1 flex flex-col gap-0.5 min-w-0">
            {/* Affinity name — inside cell as absolute overlay at top */}
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
              style={{ minHeight: 62, ...cellStyle }}
            >
              {/* Affinity name — pinned to top of cell */}
              <span
                className="absolute top-[3px] inset-x-0 text-center text-[6px] font-semibold uppercase tracking-wider leading-none pointer-events-none z-10"
                style={{ color: `${meta.glowHex}80` }}
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
                  background: `linear-gradient(180deg, transparent, ${meta.glowHex}18, ${meta.glowHex}10, transparent)`,
                }}
              />
              {/* Base glow at cell bottom */}
              <div
                className="absolute bottom-0 inset-x-0 pointer-events-none"
                style={{
                  height: 24,
                  background: `radial-gradient(ellipse 70% 100% at 50% 100%, ${meta.hex}1e, transparent)`,
                }}
              />

              {isFlux ? (
                /* ── Singularity cell ── */
                <div className="flex flex-col items-center pt-2 pb-1.5 px-0.5 h-full">
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
                  <span
                    className="text-lg font-black leading-none mt-0.5"
                    style={{
                      color: gems > 0 ? '#fff' : meta.hex + '35',
                      textShadow: gems > 0 ? `0 0 8px ${meta.glowHex}` : 'none',
                    }}
                  >
                    {gems}
                  </span>
                  {/* Reserve dots */}
                  <div className="flex gap-[3px] mt-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className="rounded-full"
                        style={{
                          width: 5,
                          height: 5,
                          background: i < bankCount ? meta.hex : 'transparent',
                          border: i < bankCount
                            ? `1px solid ${meta.glowHex}60`
                            : `1px solid ${meta.glowHex}30`,
                          boxShadow: i < bankCount ? `0 0 4px ${meta.glowHex}80` : 'none',
                        }}
                      />
                    ))}
                  </div>
                  {showReservedLink && (
                    <span
                      className="text-[6px] font-semibold leading-none mt-0.5"
                      style={{ color: `${meta.glowHex}70` }}
                    >
                      {reservedCount} reserved
                    </span>
                  )}
                </div>
              ) : (
                /* ── Colored affinity cell ── */
                <>
                  {/* Reservoir gauge — anchored to bottom-left */}
                  <div className="absolute left-1 bottom-2 pointer-events-none flex flex-col items-center">
                    <ReservoirGauge
                      capacity={gaugeCapacity}
                      filledCount={gaugeFilledCount}
                      hex={meta.hex}
                      glowHex={meta.glowHex}
                      burstKey={harvestBurstKeys?.[c] ?? 0}
                    />
                    <span
                      className="text-[5px] font-mono leading-none mt-[3px] tabular-nums"
                      style={{ color: `${meta.glowHex}55` }}
                    >
                      {gaugeFilledCount}/{gaugeCapacity}
                    </span>
                  </div>

                  {/* Main content */}
                  <div className="flex flex-col items-center pt-2 pb-1 px-0.5">
                    {/* Emblem */}
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
                              : bankEmpty
                              ? 'grayscale(0.7) opacity(0.4)'
                              : `drop-shadow(0 0 6px ${meta.glowHex}80)`,
                        }}
                      />
                    </div>

                    {/* Count — shows predicted value (gems + pending) during harvest selection */}
                    <div className="flex items-baseline gap-0.5 mt-0.5">
                      {pending > 0 ? (
                        <motion.span
                          key="preview"
                          className="text-lg font-black leading-none"
                          style={{
                            color: meta.glowHex,
                            textShadow: `0 0 10px ${meta.glowHex}`,
                          }}
                          animate={{ opacity: [1, 0.55, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          {gems + pending}
                        </motion.span>
                      ) : (
                        <span
                          key="committed"
                          className="text-lg font-black leading-none"
                          style={{
                            color: hasContent ? '#fff' : meta.hex + '35',
                            textShadow: hasContent ? `0 0 8px ${meta.glowHex}` : 'none',
                          }}
                        >
                          {gems}
                        </span>
                      )}
                    </div>

                    {/* Bonus pill — compact, numbers only */}
                    {(bonus > 0 || lumBonus > 0) && (
                      <div
                        className="flex items-center gap-[2px] mt-0.5 px-[3px] py-[1px] rounded-full"
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
    </div>
  );
}
