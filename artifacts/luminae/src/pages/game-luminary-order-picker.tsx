import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Luminary } from '@workspace/api-client-react';
import { useSubmitAction } from '@workspace/api-client-react';
import { LuminaryPanelArt, getLuminaryVisuals } from '@/lib/luminaryAssets';
import { BOARD_CARD_W, BOARD_CARD_H } from '@/lib/constants';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { EminenceDiamond } from './game-card';

// ── LuminaryOrderPicker ────────────────────────────────────────────────────────
//
// Full-screen modal overlay shown when a player simultaneously qualifies for
// multiple Luminaries.  The player clicks cards to assign claim order (1st, 2nd
// …), then confirms.  Claim order matters: each Luminary's passive effect
// activates immediately after its claim, so later claims benefit from earlier
// passives.
//
// When isMyChoice=false a simpler "Waiting for X" banner is shown instead.
// ─────────────────────────────────────────────────────────────────────────────

interface LuminaryOrderPickerProps {
  candidates: Luminary[];
  isMyChoice: boolean;
  choosingPlayerName: string;
  roomId: string;
  sessionToken: string;
}

export const LuminaryOrderPicker = React.memo(function LuminaryOrderPicker({
  candidates,
  isMyChoice,
  choosingPlayerName,
  roomId,
  sessionToken,
}: LuminaryOrderPickerProps) {
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const containerRef = useRef<HTMLElement | null>(null);
  const submitAction = useSubmitAction();

  const isConfirmReady = isMyChoice && selectedOrder.length === candidates.length;

  useFocusTrap(containerRef, isMyChoice, () => {});

  const handleCardClick = (lumId: string) => {
    setSelectedOrder((prev) => {
      if (prev.includes(lumId)) {
        return prev.filter((id) => id !== lumId);
      }
      return [...prev, lumId];
    });
  };

  const handleReset = () => setSelectedOrder([]);

  const handleConfirm = () => {
    if (!isConfirmReady) return;
    submitAction.mutate({
      roomId,
      data: {
        sessionToken,
        type: 'choose_luminary_order',
        orderedIds: selectedOrder,
      },
    });
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
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
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
              Tap in the order you want to claim. Each Luminary's effect activates
              immediately, so your first claim benefits the second.
            </p>
          </div>

          {/* Candidate cards */}
          <div className="flex flex-wrap justify-center gap-3">
            {candidates.map((lum) => {
              const rank = selectedOrder.indexOf(lum.id);
              const isSelected = rank !== -1;
              const visuals = getLuminaryVisuals(lum.id);
              const glowHex = visuals.summonColor; // API contract field

              return (
                <motion.button
                  key={lum.id}
                  onClick={() => handleCardClick(lum.id)}
                  whileTap={{ scale: 0.95 }}
                  animate={isSelected ? {} : {
                    boxShadow: [
                      `0 0 0 1.5px ${glowHex}88, 0 0 10px 3px ${glowHex}33`,
                      `0 0 0 2.5px ${glowHex}ff, 0 0 22px 8px ${glowHex}66`,
                      `0 0 0 1.5px ${glowHex}88, 0 0 10px 3px ${glowHex}33`,
                    ],
                  }}
                  transition={isSelected ? {} : {
                    duration: 2, repeat: Infinity, ease: 'easeInOut',
                  }}
                  className="relative rounded-xl overflow-hidden shrink-0 focus-visible:outline-none"
                  style={{
                    width: BOARD_CARD_W,
                    height: BOARD_CARD_H,
                    boxShadow: isSelected
                      ? `0 0 0 2.5px ${glowHex}ff, 0 0 24px 8px ${glowHex}88`
                      : undefined,
                    opacity: isSelected ? 1 : 0.88,
                  }}
                  aria-label={`${lum.name} — click to select as ${ordinalLabel(selectedOrder.length + 1)} claim`}
                  aria-pressed={isSelected}
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
                      <span className="bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-sm font-serif font-bold text-amber-100 drop-shadow-[0_1px_3px_rgba(0,0,0,1)] flex items-center gap-0.5">
                        {lum.oblivion ? `-${lum.oblivion}` : lum.lumens}
                        <EminenceDiamond size={9} />
                      </span>
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
                ? 'Tap a Luminary to claim it first'
                : selectedOrder.length < candidates.length
                ? `${candidates.length - selectedOrder.length} more to place`
                : 'All placed — confirm when ready'}
            </p>

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
                disabled={!isConfirmReady || submitAction.isPending}
                whileTap={isConfirmReady ? { scale: 0.96 } : {}}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                  isConfirmReady
                    ? 'bg-amber-500 hover:brightness-110 text-black shadow-lg'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                {submitAction.isPending ? 'Claiming…' : 'Confirm Order'}
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
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-amber-300"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
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
