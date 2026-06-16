/**
 * CinderMandateBurnDirector
 *
 * Purpose-built director for the Ember Sovereign `end_of_turn` activation event.
 * Owns the full condemned-card burn sequence:
 *   1. Camera prepare (compact + frame condemned cards)
 *   2. Decree interstitial: "CINDER MANDATE / The condemned are burned." (DECREE_MS)
 *   3. Shudder (SHUDDER_MS) + heat wash (HEAT_WASH_MS) on condemned slots
 *   4. Director-owned BurnFlash for each condemned slot
 *   5. Burn pile particle + chip pulse
 *   6. Market refill pulse (after BurnFlash completes)
 *   7. Aftermath hold → restore camera → onComplete
 *
 * BurnFlash suppression: game.tsx detects lum_ember burns in the state-diff
 * block and saves the pre-measured slot rects to a ref instead of firing
 * BurnFlash immediately. This director receives those slots via `pendingBurnSlots`
 * and fires BurnFlash at the correct point in its timeline.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { AnimationProcedureStep } from '@/lib/animationProcedure';

// ─── Timing constants ─────────────────────────────────────────────────────────

/** Decree interstitial display window. */
const DECREE_MS = 1800;

/** Card-slot shudder duration. */
const SHUDDER_MS = 400;

/** Heat-wash overlay duration (starts 40% into shudder). */
const HEAT_WASH_MS = 600;

/**
 * BurnFlash sequence total: badge (320 ms) + flash animation (~1200 ms).
 * Used to schedule the refill pulse after the last flash completes.
 */
const BURN_FLASH_TOTAL_MS = 1520;

/** Hold after refill pulse before calling onComplete. */
const AFTERMATH_HOLD_MS = 800;

// ─── Types ────────────────────────────────────────────────────────────────────

/** A condemned card slot whose BurnFlash is owned by this director. */
export interface DirectorBurnSlot {
  slotRect: DOMRect;
  slotKey: string; // "tier-slotIndex"
  sourceLuminaryId?: string;
}

export interface CinderMandateBurnActions {
  /** Prepare the camera (compact + scroll to show condemned cards). */
  prepare: (
    procedure: AnimationProcedureStep[],
    onSettled?: () => void,
    options?: { forceOrchestrate?: boolean },
  ) => void;
  /** Release the camera after the sequence ends. */
  restore: (opts?: { immediate?: boolean }) => void;
  /** Extend the animation drain gate by `ms` from now. */
  setAnimEndTime: (ms: number) => void;
  /** Trigger BurnFlash on a single slot via game.tsx state. */
  onBurnFlash: (entry: {
    id: string;
    slotRect: DOMRect;
    sourceLuminaryId?: string;
  }) => void;
  /** Pulse the 🔥 burn-pile chip counter. */
  onBurnChipPulse: () => void;
  /** Launch a charred-fragment particle from the card slot toward the chip. */
  onBurnPileParticle: (fromRect: DOMRect, toRect: DOMRect) => void;
  /** Trigger the ↺ refill-pulse animation on one or more slot keys. */
  onRefillPulse: (slotKeys: string[]) => void;
  /** Play the card-burn audio cue (staggered by index). */
  playCardBurn: (index: number, total: number) => void;
}

interface CinderMandateBurnDirectorProps {
  targetCardIds: string[];
  /**
   * Pre-measured slot rects for condemned cards.
   * Captured in game.tsx during the state-diff BurnFlash block so they
   * reflect the pre-refill layout even after the market is replenished.
   */
  pendingBurnSlots: DirectorBurnSlot[];
  reducedMotion: boolean;
  actions: CinderMandateBurnActions;
  onComplete: (skipped?: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CinderMandateBurnDirector({
  targetCardIds,
  pendingBurnSlots,
  reducedMotion,
  actions,
  onComplete,
}: CinderMandateBurnDirectorProps) {
  const [showDecree, setShowDecree] = useState(!reducedMotion);
  const [showHeatWash, setShowHeatWash] = useState(false);
  const [shudderActive, setShudderActive] = useState(false);

  // Stable refs for timeout callbacks
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  // Snapshot of slots at mount time (the ref in game.tsx is cleared after this)
  const slotsRef = useRef(pendingBurnSlots);

  // ── Master timeline ────────────────────────────────────────────────────────
  useEffect(() => {
    const slots = slotsRef.current;
    const procedure: AnimationProcedureStep[] =
      targetCardIds.length > 0
        ? [{ type: 'targetClaim', targetIds: targetCardIds, keyword: 'condemned' }]
        : [];

    // Pre-size drain gate for worst-case full sequence
    const totalMs =
      DECREE_MS + SHUDDER_MS + HEAT_WASH_MS + BURN_FLASH_TOTAL_MS + AFTERMATH_HOLD_MS;
    actionsRef.current.setAnimEndTime(totalMs + 800 /* camera settle */);

    // Begin camera framing immediately
    actionsRef.current.prepare(procedure, undefined, { forceOrchestrate: true });

    const timers: ReturnType<typeof setTimeout>[] = [];
    const t = (fn: () => void, ms: number) => {
      const h = setTimeout(fn, reducedMotion ? Math.min(ms, 100) : ms);
      timers.push(h);
    };

    // Decree auto-dismiss
    if (!reducedMotion) {
      t(() => setShowDecree(false), DECREE_MS);
    }

    // Shudder starts when decree ends
    const shudderStart = reducedMotion ? 0 : DECREE_MS;
    t(() => setShudderActive(true), shudderStart);
    t(() => setShudderActive(false), shudderStart + SHUDDER_MS);

    // Heat wash overlaps the second half of shudder
    const heatStart = shudderStart + Math.round(SHUDDER_MS * 0.4);
    t(() => setShowHeatWash(true), heatStart);
    t(() => setShowHeatWash(false), heatStart + HEAT_WASH_MS);

    // BurnFlash fires after shudder completes
    const burnAt = shudderStart + SHUDDER_MS;
    t(() => {
      const chipEl = document.querySelector('[data-burn-pile-chip]');
      const chipRect = chipEl?.getBoundingClientRect() ?? null;

      slots.forEach(({ slotKey, sourceLuminaryId }, i) => {
        // Re-measure slot in case the DOM shifted during compact transition
        const slotEl = document.querySelector(`[data-slot-key="${slotKey}"]`);
        const liveRect: DOMRect =
          slotEl?.getBoundingClientRect() ??
          // eslint-disable-next-line no-restricted-syntax -- DOMRect constructor is fine; we're building a synthetic rect from saved values
          new DOMRect(0, 0, 0, 0);

        actionsRef.current.playCardBurn(i, slots.length);
        actionsRef.current.onBurnFlash({
          id: `director-burn-${slotKey}-${Date.now()}-${i}`,
          slotRect: liveRect,
          sourceLuminaryId,
        });

        // Fragment flies toward burn chip ~400 ms into BurnFlash
        if (chipRect && liveRect.width > 0) {
          setTimeout(() => {
            actionsRef.current.onBurnPileParticle(liveRect, chipRect);
          }, 380 + i * 80);
        }
      });

      if (slots.length > 0) {
        actionsRef.current.onBurnChipPulse();
      }

      // Refill pulse fires after BurnFlash animation completes
      setTimeout(() => {
        const keys = slots.map(s => s.slotKey);
        if (keys.length > 0) actionsRef.current.onRefillPulse(keys);
      }, BURN_FLASH_TOTAL_MS);
    }, burnAt);

    // Aftermath + complete
    const completesAt = burnAt + BURN_FLASH_TOTAL_MS + AFTERMATH_HOLD_MS;
    t(() => {
      actionsRef.current.restore({ immediate: reducedMotion });
      onCompleteRef.current(reducedMotion);
    }, completesAt);

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Shudder: imperatively animate condemned slot DOM elements ─────────────
  useEffect(() => {
    if (targetCardIds.length === 0) return;
    const els: HTMLElement[] = [];
    for (const id of targetCardIds) {
      const cardEl = document.querySelector(`[data-card-id="${id}"]`);
      if (!cardEl) continue;
      const slotEl = cardEl.closest('[data-slot-key]') as HTMLElement | null;
      if (slotEl) els.push(slotEl);
    }
    if (els.length === 0) return;

    if (shudderActive) {
      els.forEach(el => {
        el.style.animation = 'cinder-shudder 0.08s ease-in-out 5 alternate';
      });
    } else {
      els.forEach(el => {
        el.style.animation = '';
        el.style.transform = '';
      });
    }

    return () => {
      els.forEach(el => {
        el.style.animation = '';
        el.style.transform = '';
      });
    };
  }, [shudderActive, targetCardIds]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return createPortal(
    <>
      {/* Decree interstitial */}
      <AnimatePresence>
        {showDecree && (
          <motion.div
            key="cinder-burn-decree"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 195,
              background:
                'radial-gradient(ellipse at 50% 50%, rgba(185,28,28,0.12) 0%, rgba(0,0,0,0.07) 58%, transparent 100%)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
              style={{ textAlign: 'center', userSelect: 'none' }}
            >
              <div
                style={{
                  fontFamily: "'Cinzel', 'Palatino Linotype', serif",
                  fontSize: 19,
                  letterSpacing: '0.22em',
                  fontWeight: 700,
                  color: '#ef4444',
                  textTransform: 'uppercase',
                  textShadow:
                    '0 0 22px rgba(239,68,68,0.80), 0 0 8px rgba(239,68,68,0.50)',
                }}
              >
                Cinder Mandate
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "'Cinzel', 'Palatino Linotype', serif",
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: 'rgba(251,191,36,0.62)',
                  textTransform: 'uppercase',
                }}
              >
                The condemned are burned.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heat wash — ember glow floods the lower board */}
      <AnimatePresence>
        {showHeatWash && (
          <motion.div
            key="cinder-heat-wash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.17, 0] }}
            transition={{
              duration: HEAT_WASH_MS / 1000,
              ease: 'easeInOut',
              times: [0, 0.35, 1],
            }}
            style={{
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 190,
              background:
                'linear-gradient(180deg, rgba(239,68,68,0.0) 0%, rgba(239,68,68,0.22) 55%, rgba(249,115,22,0.07) 100%)',
            }}
          />
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
