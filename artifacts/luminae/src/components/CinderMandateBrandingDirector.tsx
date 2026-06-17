/**
 * CinderMandateBrandingDirector
 *
 * Purpose-built director for the Ember Sovereign `summon` activation event.
 * Owns the full brand-strike sequence:
 *   1. Camera prepare (compact + frame condemned cards)
 *   2. "CINDER MANDATE" beat overlay (BEAT_HOLD_MS)
 *   3. Source portal pulse + brand-strike beams
 *   4. Aftermath hold
 *   5. Calls onComplete — camera stays compact (no restore)
 *
 * Does NOT call viewOrchestrator.restore() — the camera remains in whatever
 * state the prepare() call leaves it until the caller's onComplete handler
 * decides to release it (or the next director takes over).
 *
 * Implementation note — NO useState, only useRef + single useEffect
 * ──────────────────────────────────────────────────────────────────
 * React 19 concurrent mode can abort and retry a render mid-flight, which
 * resets ReactCurrentDispatcher.current to ContextOnlyDispatcher between
 * hook slots.  With multiple useState hooks, a re-render triggered by
 * setBeatDone(true) from a setTimeout reliably crashes with "Invalid hook
 * call" at the first useEffect registration on that second pass.
 *
 * The solution: remove all state so the component never triggers a re-render
 * of itself.  The beat overlay is animated imperatively via framer-motion's
 * standalone animate() function, which requires no React hook.  The entire
 * sequence runs inside a single mount useEffect via a setTimeout chain.
 */
import React, { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { AnimationProcedureStep } from '@/lib/animationProcedure';

// ─── Timing constants ─────────────────────────────────────────────────────────

/**
 * How long to wait after the Luminary portal fires its source pulse before
 * brand-strike beams begin.  Must match SOURCE_PULSE_LEAD_MS in game-luminary-effects.
 */
export const SOURCE_PULSE_LEAD_MS = 300;

/** "CINDER MANDATE" beat overlay is visible for this long before strikes begin. */
export const BEAT_HOLD_MS = 820;

/** Conservative camera-settle budget used when pre-sizing the drain gate. */
export const SETTLE_ESTIMATE_MS = 800;

/**
 * Aftermath hold after the last brand-strike aura fades.
 * Chosen to let the aura crackle fully clear before the game drains.
 */
export const AFTERMATH_HOLD_MS = 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CinderMandateBrandingActions {
  /** Prepare the camera (compact + scroll to show condemned cards). */
  prepare: (
    procedure: AnimationProcedureStep[],
    onSettled?: () => void,
    options?: { forceOrchestrate?: boolean },
  ) => void;
  /**
   * Prevent the player from scrolling the board or the Luminary portal row
   * during the brand-strike window.  Brand-strike beams use viewport-relative
   * rects captured at fire-time; any scroll after capture drifts the SVG
   * overlay off its targets.
   */
  lockBoardScroll: () => void;
  /** Release the scroll lock applied by lockBoardScroll. */
  unlockBoardScroll: () => void;
  /** Extend the animation drain gate by `ms` from now. */
  setAnimEndTime: (ms: number) => void;
  /** Remove card IDs from the visual suppression set (reveals overlays + badges). */
  unsuppressMarkers: (ids: string[]) => void;
  /**
   * Fire brand-strike beams for the supplied card IDs.
   * Returns a strike ID (non-null) if at least one beam was drawn.
   */
  fireBrandStrikes: (
    ids: string[],
    markers: Record<string, { type: string }>,
    opts?: {
      source?: {
        rect: { x: number; y: number; w: number; h: number };
        primary: string;
        secondary: string;
      };
      lead?: number;
      orchestrated?: boolean;
      restoreImmediate?: boolean;
    },
  ) => string | null;
  /** Play the brand-strike audio cue. */
  playBrandStrike: () => void;
}

interface CinderMandateBrandingDirectorProps {
  luminaryId: string;
  lumSummonColor?: string;
  lumSummonSecondaryColor?: string;
  targetCardIds: string[];
  reducedMotion: boolean;
  actions: CinderMandateBrandingActions;
  onComplete: (skipped?: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CinderMandateBrandingDirector({
  luminaryId,
  lumSummonColor,
  lumSummonSecondaryColor,
  targetCardIds,
  reducedMotion,
  actions,
  onComplete,
}: CinderMandateBrandingDirectorProps) {
  // Stable refs — updated each render so setTimeout callbacks always capture
  // the latest values without needing to be in effect dep arrays.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  // Ref to the beat overlay DOM node for imperative animation.
  const beatOverlayRef = useRef<HTMLDivElement | null>(null);

  // ── Single mount effect — entire sequence runs imperatively ────────────────
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Nothing to brand — skip immediately
    if (targetCardIds.length === 0) {
      onCompleteRef.current(false);
      return;
    }

    // Lock scroll immediately — before prepare() so the entire cinematic
    // (beat overlay display + camera movement + brand-strike beams) is fully
    // protected.  Brand-strike beams use viewport-relative getBoundingClientRect()
    // snapshots; any scroll before or during capture drifts the SVG overlay off
    // its targets.  The lock is released when onComplete fires (or in cleanup if
    // the component unmounts early).
    actionsRef.current.lockBoardScroll();

    const procedure: AnimationProcedureStep[] = [
      { type: 'targetClaim', targetIds: targetCardIds, keyword: 'condemned' },
    ];

    const lead = reducedMotion ? 0 : SOURCE_PULSE_LEAD_MS;
    // Pre-size the drain gate to cover the worst-case full sequence duration.
    const estimatedTotalMs =
      SETTLE_ESTIMATE_MS +
      BEAT_HOLD_MS +
      lead +
      (targetCardIds.length - 1) * 90 +
      3820 + // aura-complete window
      400 +  // buffer
      AFTERMATH_HOLD_MS;
    actionsRef.current.setAnimEndTime(estimatedTotalMs);

    actionsRef.current.prepare(
      procedure,
      () => {
        // ── Phase 1: animate beat overlay in ────────────────────────────────
        const overlay = beatOverlayRef.current;
        if (overlay) {
          void animate(overlay, { opacity: 1 }, { duration: 0.22, ease: 'easeOut' });
        }

        // ── Phase 2: after beat hold, animate out + fire strikes ─────────────
        const beatTimer = setTimeout(() => {
          if (overlay) {
            void animate(overlay, { opacity: 0 }, { duration: 0.18, ease: 'easeOut' });
          }

          // Scroll is already locked (locked at mount, above).
          // Capture source-portal rect now that layout has settled.
          const portalEl = document.querySelector(`[data-luminary-id="${luminaryId}"]`);
          let source:
            | {
                rect: { x: number; y: number; w: number; h: number };
                primary: string;
                secondary: string;
              }
            | undefined;
          if (portalEl && !reducedMotion) {
            const pr = portalEl.getBoundingClientRect();
            if (pr.width > 0) {
              source = {
                rect: { x: pr.x, y: pr.y, w: pr.width, h: pr.height },
                primary: lumSummonColor ?? '#ef4444',
                secondary: lumSummonSecondaryColor ?? lumSummonColor ?? '#f97316',
              };
            }
          }

          const usedLead = source ? lead : 0;

          actionsRef.current.playBrandStrike();
          // Build synthetic markers: the server encodes condemned IDs into the event payload
          // precisely because state.marketMarkers may be cleared before the animation runs.
          // We know all targets are type "condemned" — do NOT use state.marketMarkers here.
          const syntheticMarkers = Object.fromEntries(
            targetCardIds.map(id => [id, { type: 'condemned' as const }]),
          );
          const strikeId = actionsRef.current.fireBrandStrikes(targetCardIds, syntheticMarkers, {
            source,
            lead: usedLead,
            // orchestrated: false — director owns camera; ArrivalBrandStrike must NOT call restore()
            orchestrated: false,
            restoreImmediate: reducedMotion,
          });

          // Reveal overlays + badges (badges use brandDelayMap timing)
          actionsRef.current.unsuppressMarkers(targetCardIds);

          const strikeTotalMs = usedLead + (targetCardIds.length - 1) * 90 + 3820 + 400;
          // Refine the drain gate to the exact strike duration
          actionsRef.current.setAnimEndTime(strikeTotalMs + AFTERMATH_HOLD_MS);

          const completeDelay = strikeId
            ? strikeTotalMs + AFTERMATH_HOLD_MS
            : 200; // No visible DOM targets — complete quickly

          // After strikes settle + aftermath hold: call onComplete.
          // Camera stays compact — no restore() here.
          const completeTimer = setTimeout(() => {
            actionsRef.current.unlockBoardScroll();
            onCompleteRef.current(false);
          }, completeDelay);
          timers.push(completeTimer);
        }, BEAT_HOLD_MS);

        timers.push(beatTimer);
      },
      { forceOrchestrate: true },
    );

    return () => {
      timers.forEach(clearTimeout);
      // Safety: release scroll lock if the component unmounts before the
      // completeTimer fires (e.g. skip / fast-forward path).
      actionsRef.current.unlockBoardScroll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  // The overlay is always present in the DOM (opacity 0 initially) so that
  // the beatOverlayRef is available the moment the mount effect fires.
  // No AnimatePresence or state needed — animation is fully imperative.
  return createPortal(
    <div
      ref={(el) => { beatOverlayRef.current = el; }}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 195,
        background:
          'radial-gradient(ellipse at 50% 52%, rgba(239,68,68,0.09) 0%, transparent 66%)',
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
              '0 0 22px rgba(239,68,68,0.75), 0 0 7px rgba(239,68,68,0.45)',
          }}
        >
          Cinder Mandate
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: "'Cinzel', 'Palatino Linotype', serif",
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'rgba(251,191,36,0.68)',
            textTransform: 'uppercase',
          }}
        >
          Condemned
        </div>
      </div>
    </div>,
    document.body,
  );
}
