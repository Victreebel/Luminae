/**
 * ArtifactBrandingDirector
 *
 * Shared branded-effect director for Cinder Mandate, Forgotten Hour, and Black
 * Domain. Each keeps its own colors and keyword while following the canonical
 * announce → frame → target → resolve → reveal → aftermath contract.
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
 * standalone animate() function, which requires no React hook. Phase advancement
 * and exactly-once completion belong to the shared sequence controller.
 */
import { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';
import { createPortal } from 'react-dom';
import { LuminaryEffectSkipControl } from './LuminaryEffectChrome';
import type { AnimationProcedureStep } from '@/lib/animationProcedure';
import {
  createLuminaryEffectSequence,
  type LuminaryEffectSequenceController,
} from '@/lib/luminaryEffectSequence';
import {
  boundedLuminaryStagger,
  luminaryPacedDuration,
  type LuminaryPlaybackMode,
} from '@/lib/luminaryPresentationPacing';
import { gameAudio } from '@/lib/audio';
import { playLuminaryEffectPhaseSound } from '@/lib/luminaryEffectSound';

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
 * Short buffer so the camera restore fires promptly after the aura clears.
 * The aura window (1420 + 400 ms) already covers the crackle tail.
 */
export const AFTERMATH_HOLD_MS = 200;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArtifactBrandingActions {
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
      staggerMs?: number;
    },
  ) => string | null;
}

interface ArtifactBrandingDirectorProps {
  luminaryId: string;
  lumSummonColor?: string;
  lumSummonSecondaryColor?: string;
  targetCardIds: string[];
  reducedMotion: boolean;
  playbackMode?: LuminaryPlaybackMode;
  timelinePlaybackRate?: number;
  markerType?: 'condemned' | 'forgotten' | 'nullified' | 'avatar_seed';
  effectName?: string;
  resultLabel?: string;
  effectDescription?: string;
  luminaryName?: string;
  triggeringPlayerName?: string;
  effectType?: 'summon' | 'end_of_turn' | 'start_of_turn';
  queuePosition?: number;
  queueTotal?: number;
  actions: ArtifactBrandingActions;
  onComplete: (skipped?: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ArtifactBrandingDirector({
  luminaryId,
  lumSummonColor,
  lumSummonSecondaryColor,
  targetCardIds,
  reducedMotion,
  playbackMode = 'standard',
  timelinePlaybackRate = 1,
  markerType = 'condemned',
  effectName = 'Cinder Mandate',
  actions,
  onComplete,
}: ArtifactBrandingDirectorProps) {
  // Stable refs — updated each render so setTimeout callbacks always capture
  // the latest values without needing to be in effect dep arrays.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const sequenceRef = useRef<LuminaryEffectSequenceController | null>(null);
  // Ref to the beat overlay DOM node for imperative animation.
  const beatOverlayRef = useRef<HTMLDivElement | null>(null);

  // ── Single mount effect — phases are advanced by the shared controller ─────
  useEffect(() => {
    if (targetCardIds.length === 0) {
      onCompleteRef.current(false);
      return;
    }

    actionsRef.current.lockBoardScroll();

    const markerKeyword = markerType === 'avatar_seed' ? 'seeded' : markerType;
    const procedure: AnimationProcedureStep[] = [
      { type: 'targetClaim', targetIds: targetCardIds, keyword: markerKeyword },
    ];
    const paced = (durationMs: number) => luminaryPacedDuration(
      durationMs,
      playbackMode,
      timelinePlaybackRate,
    );
    const announceLeadMs = reducedMotion ? 0 : paced(80);
    const settleEstimateMs = paced(SETTLE_ESTIMATE_MS);
    const lead = reducedMotion ? 0 : paced(SOURCE_PULSE_LEAD_MS);
    const staggerMs = boundedLuminaryStagger(
      targetCardIds.length,
      90,
      playbackMode,
      timelinePlaybackRate,
    );
    // Swift mode removes dead air around the strike, but the brand beam and
    // aura still need their complete visual envelope. Reduced motion has a
    // separate crisp-flash implementation with a shorter fixed duration.
    const strikeVisualMs = reducedMotion ? 350 : 1_420;
    const strikeTotalMs =
      lead +
      Math.max(0, targetCardIds.length - 1) * staggerMs +
      strikeVisualMs +
      paced(240);
    const estimatedTotalMs =
      announceLeadMs + settleEstimateMs + strikeTotalMs + paced(AFTERMATH_HOLD_MS);
    actionsRef.current.setAnimEndTime(estimatedTotalMs);

    let source:
      | {
          rect: { x: number; y: number; w: number; h: number };
          primary: string;
          secondary: string;
        }
      | undefined;
    let usedLead = 0;

    const sequence = createLuminaryEffectSequence({
      reducedMotion,
      phases: [
        {
          id: 'announce',
          durationMs: announceLeadMs,
          run: () => {
            const overlay = beatOverlayRef.current;
            if (overlay) {
              void animate(
                overlay,
                { opacity: 1 },
                { duration: reducedMotion ? 0.06 : 0.22, ease: 'easeOut' },
              );
            }
          },
        },
        {
          id: 'frame',
          run: ({ waitFor }) => waitFor(
            done => actionsRef.current.prepare(
              procedure,
              done,
              { forceOrchestrate: true },
            ),
            settleEstimateMs,
          ),
        },
        {
          id: 'target',
          run: () => {
            const portalEl = document.querySelector(
              `[data-luminary-id="${luminaryId}"]`,
            );
            if (portalEl && !reducedMotion) {
              const rect = portalEl.getBoundingClientRect();
              if (rect.width > 0) {
                source = {
                  rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
                  primary: lumSummonColor ?? '#ef4444',
                  secondary:
                    lumSummonSecondaryColor ??
                    lumSummonColor ??
                    '#f97316',
                };
              }
            }
            usedLead = source ? lead : 0;
          },
        },
        {
          id: 'resolve',
          run: async ({ wait }) => {
            const syntheticMarkers = Object.fromEntries(
              targetCardIds.map(id => [id, { type: markerType }]),
            );
            const strikeId = actionsRef.current.fireBrandStrikes(
              targetCardIds,
              syntheticMarkers,
              {
                source,
                lead: usedLead,
                orchestrated: false,
                restoreImmediate: reducedMotion,
                staggerMs,
              },
            );
            actionsRef.current.unsuppressMarkers(targetCardIds);

            actionsRef.current.setAnimEndTime(
              strikeTotalMs + paced(AFTERMATH_HOLD_MS),
            );
            await wait(strikeId ? strikeTotalMs : 200);
          },
        },
        {
          id: 'reveal',
          run: () => {
            const overlay = beatOverlayRef.current;
            if (overlay) {
              void animate(
                overlay,
                { opacity: 0 },
                { duration: reducedMotion ? 0.06 : 0.28, ease: 'easeOut' },
              );
            }
          },
        },
        {
          id: 'aftermath',
          durationMs: paced(AFTERMATH_HOLD_MS),
        },
      ],
      onPhaseChange: phase => {
        const overlay = beatOverlayRef.current;
        if (overlay) overlay.dataset.effectPhase = phase;
        playLuminaryEffectPhaseSound(luminaryId, phase, lumSummonColor);
      },
      onSkip: () => {
        gameAudio.stopActivationSting();
        const overlay = beatOverlayRef.current;
        if (overlay) overlay.style.opacity = '0';
        actionsRef.current.unsuppressMarkers(targetCardIds);
        actionsRef.current.unlockBoardScroll();
      },
      onComplete: skipped => {
        actionsRef.current.unlockBoardScroll();
        onCompleteRef.current(skipped);
      },
    });
    sequenceRef.current = sequence;
    sequence.start();

    return () => {
      sequence.cancel();
      if (sequenceRef.current === sequence) sequenceRef.current = null;
      gameAudio.stopActivationSting();
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
      data-testid="luminary-branding-director"
    >
      <LuminaryEffectSkipControl
        color={lumSummonColor ?? '#ef4444'}
        reducedMotion={reducedMotion}
        onAdvance={() => sequenceRef.current?.advance()}
        onSkip={() => sequenceRef.current?.skip()}
        label={`Advance ${effectName}; hold to skip`}
        docked
      />
    </div>,
    document.body,
  );
}

// Compatibility aliases for existing imports and timing tests.
export type CinderMandateBrandingActions = ArtifactBrandingActions;
export const CinderMandateBrandingDirector = ArtifactBrandingDirector;
