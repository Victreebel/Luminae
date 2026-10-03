/**
 * CinderMandateBurnDirector
 *
 * Purpose-built visuals for the Ember Sovereign `end_of_turn` activation event,
 * advanced through the shared announce → frame → target → resolve → reveal →
 * aftermath contract.
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
 * animated imperatively via framer-motion's standalone animate() function.
 * Phase advancement and exactly-once completion belong to the shared sequence
 * controller.
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
import type { ArtifactCard } from '@workspace/api-client-react';
import {
  luminaryPacedDuration,
  type LuminaryPlaybackMode,
} from '@/lib/luminaryPresentationPacing';
import { gameAudio } from '@/lib/audio';
import { playLuminaryEffectPhaseSound } from '@/lib/luminaryEffectSound';
import { FORGE_REFILL_LOCK_MS, FORGE_REFILL_STAGGER_MS } from '@/lib/forgeRefillTiming';

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
   * reflect the pre-refill layout even after the Forge is replenished.
   */
  pendingBurnSlots: DirectorBurnSlot[];
  reducedMotion: boolean;
  playbackMode?: LuminaryPlaybackMode;
  timelinePlaybackRate?: number;
  triggeringPlayerName?: string;
  queuePosition?: number;
  queueTotal?: number;
  actions: CinderMandateBurnActions;
  onComplete: (skipped?: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CinderMandateBurnDirector({
  targetCardIds,
  pendingBurnSlots,
  reducedMotion,
  playbackMode = 'standard',
  timelinePlaybackRate = 1,
  actions,
  onComplete,
}: CinderMandateBurnDirectorProps) {
  // Stable refs — updated each render so setTimeout callbacks always capture
  // the latest values without needing to be in effect dep arrays.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const sequenceRef = useRef<LuminaryEffectSequenceController | null>(null);
  // Snapshot of slots at mount time (the ref in game.tsx is cleared after this)
  const slotsRef = useRef(pendingBurnSlots);
  // Capture targetCardIds at mount so shudder closure uses the stable value
  const targetIdsRef = useRef(targetCardIds);

  // DOM refs for imperative animation (no useState — see module comment)
  const decreeRef = useRef<HTMLDivElement | null>(null);
  const heatWashRef = useRef<HTMLDivElement | null>(null);

  // ── Single mount effect — phases are advanced by the shared controller ─────
  useEffect(() => {
    const slots = slotsRef.current;
    const ids = targetIdsRef.current;

    // ── Phase 0: set condemned ghost cards immediately at mount ─────────────
    // The server burns condemned cards (replacing them in The Forge) in the
    // same staged transition that pushes the activation event. By the time
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

    const paced = (durationMs: number) => luminaryPacedDuration(
      durationMs,
      playbackMode,
      timelinePlaybackRate,
    );
    const announceLeadMs = reducedMotion ? 0 : paced(80);
    const cameraSettleMs = paced(800);
    const shudderMs = paced(SHUDDER_MS);
    const heatWashMs = paced(HEAT_WASH_MS);
    const burnFlashMs = timelinePlaybackRate > 1
      ? paced(BURN_FLASH_TOTAL_MS)
      : BURN_FLASH_TOTAL_MS;
    // The shared refill has its own real-time lifetime, including each slot's
    // stagger. Keep the camera and hidden slots owned until the final cast ends.
    const refillMs = slots.length > 0
      ? FORGE_REFILL_LOCK_MS + (slots.length - 1) * FORGE_REFILL_STAGGER_MS
      : 0;
    const aftermathMs = Math.max(paced(260), refillMs);
    const totalMs =
      announceLeadMs + cameraSettleMs + shudderMs + burnFlashMs + aftermathMs;
    actionsRef.current.setAnimEndTime(totalMs);

    const sequence = createLuminaryEffectSequence({
      reducedMotion,
      phases: [
        {
          id: 'announce',
          durationMs: announceLeadMs,
          run: () => {
            const decree = decreeRef.current;
            if (decree) {
              void animate(
                decree,
                { opacity: 1 },
                { duration: reducedMotion ? 0.06 : 0.28, ease: 'easeOut' },
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
            cameraSettleMs,
          ),
        },
        {
          id: 'target',
          run: async ({ wait, signal }) => {
            const elements: HTMLElement[] = [];
            for (const id of ids) {
              const card = document.querySelector(`[data-card-id="${id}"]`);
              const slot = card?.closest('[data-slot-key]') as HTMLElement | null;
              if (slot) elements.push(slot);
            }
            elements.forEach(element => {
              element.style.animation =
                'cinder-shudder 0.08s ease-in-out 5 alternate';
            });

            const heatDelay = reducedMotion
              ? 0
              : Math.round(shudderMs * 0.4);
            await wait(heatDelay);
            if (!signal.aborted && heatWashRef.current) {
              void animate(
                heatWashRef.current,
                { opacity: [0, 0.17, 0] },
                {
                  duration: reducedMotion ? 0.08 : heatWashMs / 1000,
                  ease: 'easeInOut',
                  times: [0, 0.35, 1],
                },
              );
            }
            await wait(Math.max(0, shudderMs - heatDelay));
            elements.forEach(element => {
              element.style.animation = '';
              element.style.transform = '';
            });
          },
        },
        {
          id: 'resolve',
          run: async ({ wait, signal }) => {
            const chip = document.querySelector('[data-burn-pile-chip]');
            const chipRect = chip?.getBoundingClientRect() ?? null;

            slots.forEach(({ slotKey, sourceLuminaryId }, index) => {
              const slot = document.querySelector(`[data-slot-key="${slotKey}"]`);
              const liveRect =
                slot?.getBoundingClientRect() ??
                new DOMRect(0, 0, 0, 0);

              actionsRef.current.playCardBurn(index, slots.length);
              actionsRef.current.onBurnFlash({
                id: `director-burn-${slotKey}-${Date.now()}-${index}`,
                slotRect: liveRect,
                sourceLuminaryId,
              });

              if (chipRect && liveRect.width > 0) {
                void (async () => {
                  await wait(380 + index * 80);
                  if (!signal.aborted) {
                    actionsRef.current.onBurnPileParticle(liveRect, chipRect);
                  }
                })();
              }
            });

            if (slots.length > 0) {
              actionsRef.current.onBurnChipPulse();
            }
            await wait(burnFlashMs);
          },
        },
        {
          id: 'reveal',
          run: () => {
            const keys = slots.map(slot => slot.slotKey);
            if (keys.length > 0) actionsRef.current.onRefillPulse(keys);
            const decree = decreeRef.current;
            if (decree) {
              void animate(
                decree,
                { opacity: 0 },
                { duration: reducedMotion ? 0.06 : 0.22, ease: 'easeOut' },
              );
            }
          },
        },
        {
          id: 'aftermath',
          durationMs: aftermathMs,
        },
      ],
      onPhaseChange: phase => {
        const decree = decreeRef.current;
        if (decree) decree.dataset.effectPhase = phase;
        playLuminaryEffectPhaseSound('lum_ember', phase, '#ff5a3c');
      },
      onSkip: () => {
        gameAudio.stopActivationSting();
        const decree = decreeRef.current;
        if (decree) decree.style.opacity = '0';
        actionsRef.current.unlockBoardScroll();
        actionsRef.current.restore({ immediate: true });
      },
      onComplete: skipped => {
        actionsRef.current.unlockBoardScroll();
        actionsRef.current.restore({ immediate: skipped || reducedMotion });
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
  // Both overlays are always present in the DOM (opacity 0 initially) so their
  // refs are available the moment the mount effect fires.
  // No AnimatePresence or state needed — animation is fully imperative.
  return createPortal(
    <>
      {/* Subtle effect wash; the shared source flash owns effect identification. */}
      <div
        ref={(el) => { decreeRef.current = el; }}
        data-testid="cinder-mandate-burn-director"
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
        <LuminaryEffectSkipControl
          color="#ef4444"
          reducedMotion={reducedMotion}
          onAdvance={() => sequenceRef.current?.advance()}
          onSkip={() => sequenceRef.current?.skip()}
          label="Advance Cinder Mandate; hold to skip"
          docked
        />
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
