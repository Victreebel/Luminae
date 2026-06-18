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
 *
 * Implementation note — NO useState, only useRef + single useEffect
 * ──────────────────────────────────────────────────────────────────
 * React 19 concurrent mode can abort and retry a render mid-flight, which
 * resets ReactCurrentDispatcher.current to ContextOnlyDispatcher between
 * hook slots.  With multiple useState hooks, a re-render triggered by a
 * setTimeout callback reliably crashes with "Invalid hook call" on the
 * second render pass.
 *
 * Solution: remove all useState so the component never triggers a re-render
 * of itself.  All overlays are always in the DOM (opacity 0 initially) and
 * animated imperatively via framer-motion's standalone animate() function,
 * which requires no React hook.  The entire sequence runs inside a single
 * mount useEffect via a setTimeout chain.
 */
import React, { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { AnimationProcedureStep } from '@/lib/animationProcedure';
import type { ArtifactCard } from '@workspace/api-client-react';

// ─── Timing constants ─────────────────────────────────────────────────────────

/** Decree interstitial display window. */
export const DECREE_MS = 1800;

/** Card-slot shudder duration. */
export const SHUDDER_MS = 400;

/** Heat-wash overlay duration (starts 40% into shudder). */
export const HEAT_WASH_MS = 600;

/**
 * BurnFlash sequence total: badge (320 ms) + flash animation (~1200 ms).
 * Used to schedule the refill pulse after the last flash completes.
 */
export const BURN_FLASH_TOTAL_MS = 1520;

/** Hold after refill pulse before calling onComplete. */
export const AFTERMATH_HOLD_MS = 800;

// ─── Types ────────────────────────────────────────────────────────────────────

/** A condemned card slot whose BurnFlash is owned by this director. */
export interface DirectorBurnSlot {
  slotRect: DOMRect;
  slotKey: string; // "tier-slotIndex"
  sourceLuminaryId?: string;
  /**
   * The condemned card captured before the state update.
   * Used to show the correct card art as a ghost during BurnFlash so the
   * player sees the condemned card burning (not the replacement card).
   */
  condemnedCard?: ArtifactCard | null;
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
  /**
   * Prevent the player from scrolling the board or the Luminary portal row
   * during the burn cinematic.  Called at the very start of the mount effect
   * so the entire sequence (decree → shudder → heat wash → BurnFlash → refill)
   * is fully protected.
   */
  lockBoardScroll: () => void;
  /** Release the scroll lock applied by lockBoardScroll. */
  unlockBoardScroll: () => void;
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
  /**
   * Show condemned cards as ghost cards in their slots during BurnFlash.
   *
   * Called synchronously at burnAt (Phase 4).  React batches this setState
   * with the subsequent onBurnFlash setState so the condemned card art is
   * visible and BurnFlash fires over it atomically.
   *
   * The ghost blocks the replacement card from showing.  Cleared by
   * onRefillPulse once BurnFlash completes and the replacement card should
   * be revealed.
   */
  onSetCondemnedGhosts: (entries: Array<{ slotKey: string; card: ArtifactCard }>) => void;
  /**
   * Fallback: hide slots that have no condemned card snapshot.
   * Called only when condemnedCard is null/undefined on a slot.
   */
  onHideSlots: (slotKeys: string[]) => void;
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
  // Stable refs — updated each render so setTimeout callbacks always capture
  // the latest values without needing to be in effect dep arrays.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  // Snapshot of slots at mount time (the ref in game.tsx is cleared after this)
  const slotsRef = useRef(pendingBurnSlots);
  // Capture targetCardIds at mount so shudder closure uses the stable value
  const targetIdsRef = useRef(targetCardIds);

  // DOM refs for imperative animation (no useState — see module comment)
  const decreeRef = useRef<HTMLDivElement | null>(null);
  const heatWashRef = useRef<HTMLDivElement | null>(null);

  // ── Single mount effect — entire sequence runs imperatively ────────────────
  useEffect(() => {
    const slots = slotsRef.current;
    const ids = targetIdsRef.current;

    // ── Phase 0: set condemned ghost cards immediately at mount ─────────────
    // The server burns condemned cards (replacing them in the market) in the
    // same advanceTurn call that pushes the activation event.  By the time
    // this director mounts, the TQ state already shows replacement cards in
    // the condemned slots.  We must set ghost cards NOW — before any timer
    // fires — so the condemned card art is visible from the first frame of
    // the cinematic through decree, shudder, and BurnFlash.
    //
    // Ghost cards also supply the data-card-id attribute that the Phase 2
    // shudder uses to locate the slot elements in the DOM.  Without them,
    // document.querySelector('[data-card-id="<condemndedId>"]') returns null
    // and the shudder animation does nothing visible.
    {
      const ghostEntries = slots
        .filter(s => s.condemnedCard != null)
        .map(s => ({ slotKey: s.slotKey, card: s.condemnedCard! }));
      const noGhostKeys = slots
        .filter(s => s.condemnedCard == null)
        .map(s => s.slotKey);
      if (ghostEntries.length > 0) {
        actionsRef.current.onSetCondemnedGhosts(ghostEntries);
      }
      if (noGhostKeys.length > 0) {
        actionsRef.current.onHideSlots(noGhostKeys);
      }
    }

    // Lock scroll immediately — before camera prepare() so the entire sequence
    // (decree → shudder → heat wash → BurnFlash → refill → aftermath) is
    // fully protected from player scrolling.
    actionsRef.current.lockBoardScroll();

    const procedure: AnimationProcedureStep[] =
      ids.length > 0
        ? [{ type: 'targetClaim', targetIds: ids, keyword: 'condemned' }]
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

    // ── Phase 1: decree overlay (animate in immediately) ────────────────────
    // Fades out after BurnFlash completes so the announcement covers its full
    // burn animation segment (decree hold → shudder → BurnFlash).
    const decree = decreeRef.current;
    if (!reducedMotion && decree) {
      void animate(decree, { opacity: 1 }, { duration: 0.28, ease: 'easeOut' });
      t(() => {
        void animate(decree, { opacity: 0 }, { duration: 0.22, ease: 'easeOut' });
      }, DECREE_MS + SHUDDER_MS + BURN_FLASH_TOTAL_MS);
    }

    // ── Phase 2: shudder — direct DOM manipulation, no state ───────────────
    const shudderStart = reducedMotion ? 0 : DECREE_MS;
    t(() => {
      const els: HTMLElement[] = [];
      for (const id of ids) {
        const cardEl = document.querySelector(`[data-card-id="${id}"]`);
        if (!cardEl) continue;
        const slotEl = cardEl.closest('[data-slot-key]') as HTMLElement | null;
        if (slotEl) els.push(slotEl);
      }
      els.forEach(el => {
        el.style.animation = 'cinder-shudder 0.08s ease-in-out 5 alternate';
      });
      // Clear shudder after its duration
      setTimeout(() => {
        els.forEach(el => {
          el.style.animation = '';
          el.style.transform = '';
        });
      }, SHUDDER_MS);
    }, shudderStart);

    // ── Phase 3: heat wash — animate via ref, no state ─────────────────────
    const heatStart = shudderStart + Math.round(SHUDDER_MS * 0.4);
    const wash = heatWashRef.current;
    t(() => {
      if (wash) {
        void animate(wash, { opacity: [0, 0.17, 0] }, {
          duration: HEAT_WASH_MS / 1000,
          ease: 'easeInOut',
          times: [0, 0.35, 1],
        });
      }
    }, heatStart);

    // ── Phase 4: BurnFlash (fires after shudder completes) ─────────────────
    // Ghost cards were already set at Phase 0 (mount), so condemned card art
    // is visible throughout decree and shudder.  Just fire BurnFlash here.
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

    // ── Phase 5: aftermath + complete ──────────────────────────────────────
    const completesAt = burnAt + BURN_FLASH_TOTAL_MS + AFTERMATH_HOLD_MS;
    t(() => {
      actionsRef.current.unlockBoardScroll();
      actionsRef.current.restore({ immediate: reducedMotion });
      onCompleteRef.current(reducedMotion);
    }, completesAt);

    return () => {
      timers.forEach(clearTimeout);
      // Safety: release scroll lock if the component unmounts before the
      // completesAt timer fires (e.g. skip / fast-forward path).
      actionsRef.current.unlockBoardScroll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  // Both overlays are always present in the DOM (opacity 0 initially) so their
  // refs are available the moment the mount effect fires.
  // No AnimatePresence or state needed — animation is fully imperative.
  return createPortal(
    <>
      {/* Decree interstitial — fades in immediately, out at DECREE_MS */}
      <div
        ref={(el) => { decreeRef.current = el; }}
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
          opacity: 0,
        }}
      >
        <div style={{ textAlign: 'center', userSelect: 'none' }}>
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
        </div>
      </div>

      {/* Heat wash — ember glow floods the lower board */}
      <div
        ref={(el) => { heatWashRef.current = el; }}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 190,
          background:
            'linear-gradient(180deg, rgba(239,68,68,0.0) 0%, rgba(239,68,68,0.22) 55%, rgba(249,115,22,0.07) 100%)',
          opacity: 0,
        }}
      />
    </>,
    document.body,
  );
}
