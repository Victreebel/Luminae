import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Luminary } from '@workspace/api-client-react';
import { LuminaryPanelArt, getLuminaryVisuals } from '@/lib/luminaryAssets';
import { BOARD_CARD_W, BOARD_CARD_H } from '@/lib/constants';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { EminenceBadge } from './game-card';

// ── LuminaryOrderPicker ────────────────────────────────────────────────────────
//
// Full-screen modal overlay shown when a player simultaneously qualifies for
// multiple Luminaries.  The player taps cards to assign claim order (1st, 2nd
// ...), taps placed cards to remove them, then confirms.  Claim order matters:
// each Luminary's passive effect
// activates immediately after its claim, so later claims benefit from earlier
// passives.
//
// When isMyChoice=false a simpler "Waiting for X" banner is shown instead.
// ─────────────────────────────────────────────────────────────────────────────

interface LuminaryOrderPickerProps {
  candidates: Luminary[];
  isMyChoice: boolean;
  choosingPlayerName: string;
  onConfirmOrder: (orderedIds: string[]) => Promise<void>;
}

export const LuminaryOrderPicker = React.memo(function LuminaryOrderPicker({
  candidates,
  isMyChoice,
  choosingPlayerName,
  onConfirmOrder,
}: LuminaryOrderPickerProps) {
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const candidateById = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.id, candidate] as const)),
    [candidates],
  );

  const isConfirmReady = isMyChoice && selectedOrder.length === candidates.length && candidates.length > 0;

  useFocusTrap(containerRef, isMyChoice, () => {});

  const placeLuminary = (lumId: string) => {
    setSubmitError(null);
    setSelectedOrder((prev) => {
      if (prev.includes(lumId) || prev.length >= candidates.length) return prev;
      return [...prev, lumId];
    });
  };

  const removeLuminary = (lumId: string) => {
    setSubmitError(null);
    setSelectedOrder((prev) => prev.filter((id) => id !== lumId));
  };

  const handleCardClick = (lumId: string) => {
    if (!isMyChoice || isSubmitting) return;
    setSubmitError(null);
    if (selectedOrder.includes(lumId)) {
      removeLuminary(lumId);
      return;
    }
    placeLuminary(lumId);
  };

  const handleReset = () => {
    setSubmitError(null);
    setSelectedOrder([]);
  };

  const handleConfirm = async () => {
    if (!isConfirmReady || isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onConfirmOrder(selectedOrder);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit Luminary order');
      setIsSubmitting(false);
    }
  };

  const ordinalLabel = (n: number) => {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
  };

  return (
    <motion.div
      key="luminary-order-picker"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.82)'}}
    >
      {isMyChoice ? (
        <div
          ref={(el) => { containerRef.current = el; }}
          role="dialog"
          aria-modal="true"
          aria-label="Choose Luminary claim order"
          className="flex flex-col items-center gap-5 px-4 max-w-screen-sm w-full"
        >
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-lg font-serif font-bold text-amber-100 drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
              Choose Claim Order
            </h2>
            <p className="text-xs text-white/70 leading-snug max-w-xs mx-auto">
              Tap a Luminary to place it next. Tap a placed Luminary to remove it.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: candidates.length }, (_, index) => {
              const lumId = selectedOrder[index];
              const lum = lumId ? candidateById.get(lumId) : null;
              const glowHex = lum ? getLuminaryVisuals(lum.id).summonColor : '#fbbf24';
              return (
                <div
                  key={index}
                  className="flex min-h-[46px] items-center gap-2 rounded-lg border px-3 py-2"
                  style={{
                    borderColor: lum ? `${glowHex}66` : 'rgba(255,255,255,0.12)',
                    background: lum ? `${glowHex}14` : 'rgba(255,255,255,0.045)',
                  }}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-serif text-sm font-black text-black"
                    style={{ background: lum ? glowHex : 'rgba(255,255,255,0.28)' }}
                  >
                    {index + 1}
                  </span>
                  <span className={`min-w-0 truncate text-xs font-semibold ${lum ? 'text-white/90' : 'text-white/35'}`}>
                    {lum?.name ?? 'Unplaced'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Candidate cards */}
          <div className="flex flex-wrap justify-center gap-3">
            {candidates.map((lum) => {
              const rank = selectedOrder.indexOf(lum.id);
              const isSelected = rank !== -1;
              const nextRank = selectedOrder.length + 1;
              const visuals = getLuminaryVisuals(lum.id);
              const glowHex = visuals.summonColor; // API contract field

              return (
                <motion.button
                  key={lum.id}
                  onClick={() => handleCardClick(lum.id)}
                  onContextMenu={(event) => event.preventDefault()}
                  whileTap={{ scale: 0.95 }}
                  className="relative rounded-xl overflow-hidden shrink-0 focus-visible:outline-none"
                  style={{
                    width: BOARD_CARD_W,
                    height: BOARD_CARD_H,
                    boxShadow: isSelected
                      ? `0 0 0 2.5px ${glowHex}ff, 0 0 24px 8px ${glowHex}88`
                      : `0 0 0 1.5px ${glowHex}88, 0 0 10px 3px ${glowHex}33`,
                    opacity: isSelected ? 1 : 0.88,
                    touchAction: 'manipulation',
                    userSelect: 'none',
                  }}
                  aria-label={isSelected
                    ? `${lum.name} — placed ${ordinalLabel(rank + 1)}. Tap to remove.`
                    : `${lum.name} — tap to place as ${ordinalLabel(nextRank)} claim`}
                  aria-pressed={isSelected}
                  disabled={isSubmitting}
                >
                  {/* Panel art */}
                  <div className="absolute inset-0 pointer-events-none">
                    <LuminaryPanelArt luminaryId={lum.id} width={BOARD_CARD_W} height={BOARD_CARD_H} claimed={false} />
                  </div>

                  {/* Dark gradient */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/80 pointer-events-none" />

                  {/* Card info */}
                  <div className="relative z-10 h-full p-2 flex flex-col justify-between pointer-events-none">
                    <div className="flex justify-end">
                      {(lum.eminence ?? 0) > 0 && (
                        <EminenceBadge
                          value={lum.eminence}
                          title={`+${lum.eminence} Eminence`}
                        />
                      )}
                    </div>
                    <div className="text-[9px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] line-clamp-2">
                      {lum.name}
                    </div>
                  </div>

                  {/* Order badge */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        key="badge"
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{ background: 'rgba(0,0,0,0.55)' }}
                      >
                        <div
                          className="flex flex-col items-center justify-center rounded-full font-serif font-bold text-black leading-none"
                          style={{
                            width: 48, height: 48,
                            background: glowHex,
                            boxShadow: `0 0 16px 4px ${glowHex}aa`,
                            fontSize: 22,
                          }}
                        >
                          {rank + 1}
                        </div>
                        <div
                          className="absolute bottom-6 text-[9px] font-bold uppercase tracking-widest text-white/80"
                        >
                          {ordinalLabel(rank + 1)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-2">
            {/* Selection progress hint */}
            <p className="text-[11px] text-white/50">
              {selectedOrder.length === 0
                ? 'Tap a Luminary to place it first'
                : selectedOrder.length < candidates.length
                ? `Tap to place ${ordinalLabel(selectedOrder.length + 1)} — ${candidates.length - selectedOrder.length} remaining`
                : 'All placed — confirm when ready'}
            </p>
            {submitError && (
              <p className="max-w-xs text-center text-[11px] font-semibold text-red-300">
                {submitError}
              </p>
            )}

            <div className="flex items-center gap-3">
              {selectedOrder.length > 0 && (
                <button
                  onClick={handleReset}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors underline underline-offset-2"
                >
                  Reset
                </button>
              )}
              <motion.button
                onClick={handleConfirm}
                disabled={!isConfirmReady || isSubmitting}
                whileTap={isConfirmReady ? { scale: 0.96 } : {}}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                  isConfirmReady
                    ? 'bg-amber-500 hover:brightness-110 text-black shadow-lg'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Claiming…' : 'Confirm Order'}
              </motion.button>
            </div>
          </div>
        </div>
      ) : (
        /* Waiting banner shown to other players */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="flex gap-1.5 items-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-amber-300 loading-dot-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <p className="text-sm text-amber-100 font-serif">
            {choosingPlayerName} is choosing claim order…
          </p>
          <p className="text-[10px] text-white/40">
            Multiple Luminaries unlocked simultaneously
          </p>
        </motion.div>
      )}
    </motion.div>
  );
});
