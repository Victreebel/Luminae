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
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { AnimationProcedureStep } from '@/lib/animationProcedure';

// ─── Timing constants ─────────────────────────────────────────────────────────

/**
 * How long to wait after the Luminary portal fires its source pulse before
 * brand-strike beams begin.  Must match SOURCE_PULSE_LEAD_MS in game-luminary-effects.
 */
const SOURCE_PULSE_LEAD_MS = 300;

/** "CINDER MANDATE" beat overlay is visible for this long before strikes begin. */
const BEAT_HOLD_MS = 820;

/** Conservative camera-settle budget used when pre-sizing the drain gate. */
const SETTLE_ESTIMATE_MS = 800;

/**
 * Aftermath hold after the last brand-strike aura fades.
 * Chosen to let the aura crackle fully clear before the game drains.
 */
const AFTERMATH_HOLD_MS = 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CinderMandateBrandingActions {
  /** Prepare the camera (compact + scroll to show condemned cards). */
  prepare: (
    procedure: AnimationProcedureStep[],
    onSettled?: () => void,
    options?: { forceOrchestrate?: boolean },
  ) => void;
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
  marketMarkers: Record<string, { type: string }>;
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
  marketMarkers,
  reducedMotion,
  actions,
  onComplete,
}: CinderMandateBrandingDirectorProps) {
  const [showBeat, setShowBeat] = useState(false);
  const [beatDone, setBeatDone] = useState(false);

  // Stable ref so setTimeout callbacks capture the latest onComplete
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  // Stable ref so beatDone effect captures latest actions
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // ── Phase 0: prepare camera, then show beat overlay ───────────────────────
  useEffect(() => {
    if (targetCardIds.length === 0) {
      // Nothing to brand — skip immediately
      onCompleteRef.current(false);
      return;
    }

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
      400 + // buffer
      AFTERMATH_HOLD_MS;
    actionsRef.current.setAnimEndTime(estimatedTotalMs);

    actionsRef.current.prepare(
      procedure,
      () => {
        // Camera has settled — start the beat overlay
        setShowBeat(true);
      },
      { forceOrchestrate: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Beat overlay auto-advance ──────────────────────────────────────────────
  useEffect(() => {
    if (!showBeat) return;
    const t = setTimeout(() => {
      setShowBeat(false);
      setBeatDone(true);
    }, BEAT_HOLD_MS);
    return () => clearTimeout(t);
  }, [showBeat]);

  // ── Phase 2: fire brand strikes after beat overlay exits ──────────────────
  useEffect(() => {
    if (!beatDone) return;

    // Capture source-portal rect now that layout has settled
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

    const lead = reducedMotion ? 0 : SOURCE_PULSE_LEAD_MS;
    const usedLead = source ? lead : 0;

    actionsRef.current.playBrandStrike();
    const strikeId = actionsRef.current.fireBrandStrikes(targetCardIds, marketMarkers, {
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

    if (!strikeId) {
      // No visible DOM targets — complete after a short delay
      const t = setTimeout(() => onCompleteRef.current(false), 200);
      return () => clearTimeout(t);
    }

    // After strikes settle + aftermath hold: call onComplete.
    // Camera stays compact — no restore() here.
    const t = setTimeout(() => onCompleteRef.current(false), strikeTotalMs + AFTERMATH_HOLD_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatDone]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return createPortal(
    <AnimatePresence>
      {showBeat && (
        <motion.div
          key="cinder-branding-beat"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
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
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.97 }}
            transition={{ duration: 0.20, ease: 'easeOut' }}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
