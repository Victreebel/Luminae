import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { ArtifactCard, GameState } from '@workspace/api-client-react';
import { CARD_ART } from '@/pages/game-constants';
import type { AnimationProcedureStep } from '@/lib/animationProcedure';
import {
  createLuminaryEffectSequence,
  type LuminaryEffectSequenceController,
  type LuminaryEffectPhaseContext,
} from '@/lib/luminaryEffectSequence';
import {
  LuminaryEffectSkipControl,
} from './LuminaryEffectChrome';
import {
  boundedLuminaryStagger,
  luminaryPacedDuration,
  type LuminaryPlaybackMode,
} from '@/lib/luminaryPresentationPacing';
import { gameAudio } from '@/lib/audio';
import { playLuminaryEffectPhaseSound } from '@/lib/luminaryEffectSound';
import { ARCHIVE_CAPACITY_BY_TIER } from '@/lib/archivePresentation';
import { FORGE_REFILL_DURATION_MS, FORGE_REFILL_REDUCED_DURATION_MS, FORGE_REFILL_COMPLETION_BUFFER_MS, FORGE_REFILL_STAGGER_MS } from '@/lib/forgeRefillTiming';
import { ForgeReplacementDealAnimation } from './ForgeReplacementDealAnimation';
import { ArtifactCardView } from '@/pages/game-card';
import { CompactForgeCardReadout } from '@/pages/game-board-forge-card-slot';

type Tier = 1 | 2 | 3;

const ANNOUNCE_MS = 80;
const CAMERA_SETTLE_MS = 800;
const TREMOR_MS = 550;
const SHOCKWAVE_MS = 850;
const WAVE_LIFT_STAGGER_MS = 500;
const LIFT_MS = 450;
const IMPACT_HOLD_MS = 100;
const RETURN_FLIGHT_MS = 850;
const RETURN_STAGGER_MS = 90;
const SHUFFLE_MS = 750;
const AFTERMATH_MS = 200;

interface Point {
  x: number;
  y: number;
}

export interface IronHarbingerResetSlot {
  cardId: string;
  card?: ArtifactCard | null;
  tier: Tier;
  slotIndex: number;
  slotKey: string;
}

export interface IronHarbingerResetActions {
  prepare: (
    procedure: AnimationProcedureStep[],
    onSettled?: () => void,
    options?: { forceOrchestrate?: boolean },
  ) => void;
  setAnimEndTime: (durationMs: number) => void;
  onLiftSlots: (slotKeys: string[]) => void;
  onRefillReveal?: (slotKey: string) => void;
  onRevealSlot: (slotKey: string) => void;
  onFinish: (slotKeys: string[]) => void;
  playShuffle: () => void;
  playArchiveImpact: (index: number) => void;
  playDeal: (index: number) => void;
  getRefillCosts?: (card: ArtifactCard) => Partial<ArtifactCard['cost']> | undefined;
}

interface IronHarbingerResetDirectorProps {
  targetCardIds: string[];
  capturedSlots: IronHarbingerResetSlot[];
  state: GameState | null;
  reducedMotion: boolean;
  playbackMode?: LuminaryPlaybackMode;
  timelinePlaybackRate?: number;
  triggeringPlayerName?: string;
  queuePosition?: number;
  queueTotal?: number;
  actions: IronHarbingerResetActions;
  onComplete: (skipped: boolean) => void;
}

interface ReturnVisual {
  slot: IronHarbingerResetSlot;
  element: HTMLElement;
  rect: DOMRect;
}

interface ArchiveVisual {
  tier: Tier;
  element: HTMLElement;
  rect: DOMRect;
  finalCount: number;
  displayCount: number;
}

interface RefillVisual {
  slot: IronHarbingerResetSlot;
  card: ArtifactCard;
  rect: { x: number; y: number; w: number; h: number };
  compact: boolean;
  delayMs: number;
  reveal: () => void;
  complete: () => void;
}

function tierFromCardId(cardId: string): Tier {
  if (cardId.startsWith('t3')) return 3;
  if (cardId.startsWith('t2')) return 2;
  return 1;
}

function normalizeSlots(
  targetCardIds: string[],
  capturedSlots: IronHarbingerResetSlot[],
): IronHarbingerResetSlot[] {
  const capturedById = new Map(capturedSlots.map(slot => [slot.cardId, slot]));
  const nextIndex: Record<Tier, number> = { 1: 0, 2: 0, 3: 0 };

  return targetCardIds.map((cardId) => {
    const captured = capturedById.get(cardId);
    if (captured) {
      nextIndex[captured.tier] = Math.max(
        nextIndex[captured.tier],
        captured.slotIndex + 1,
      );
      return captured;
    }

    const tier = tierFromCardId(cardId);
    const slotIndex = nextIndex[tier]++;
    return {
      cardId,
      tier,
      slotIndex,
      slotKey: `${tier}-${slotIndex}`,
    };
  });
}

function centerOf(rect: DOMRect): Point {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function rowForTier(state: GameState | null, tier: Tier): (ArtifactCard | null)[] {
  if (!state) return [];
  if (tier === 1) return state.forgeTier1 ?? [];
  if (tier === 2) return state.forgeTier2 ?? [];
  return state.forgeTier3 ?? [];
}

function deckCountForTier(state: GameState | null, tier: Tier): number {
  if (!state) return 0;
  if (tier === 1) return state.deckCounts?.tier1 ?? 0;
  if (tier === 2) return state.deckCounts?.tier2 ?? 0;
  return state.deckCounts?.tier3 ?? 0;
}

function stripCloneIdentity(element: HTMLElement) {
  element.removeAttribute('data-slot-key');
  element.removeAttribute('data-card-id');
  element.removeAttribute('data-deck-tier');
  element.removeAttribute('data-testid');
  element.removeAttribute('tabindex');
  element.setAttribute('aria-hidden', 'true');
  element.querySelectorAll<HTMLElement>(
    '[data-slot-key], [data-card-id], [data-deck-tier], [data-testid], [tabindex]',
  ).forEach((child) => {
    child.removeAttribute('data-slot-key');
    child.removeAttribute('data-card-id');
    child.removeAttribute('data-deck-tier');
    child.removeAttribute('data-testid');
    child.removeAttribute('tabindex');
  });
  element.querySelectorAll('button').forEach(button => button.remove());
}

function makeFallbackArtifact(
  cardId: string,
  tier: Tier,
  rect: DOMRect,
): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute('aria-hidden', 'true');
  Object.assign(element.style, {
    position: 'fixed',
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    overflow: 'hidden',
    borderRadius: '7px',
    border: '1px solid rgba(245, 196, 92, 0.72)',
    background: '#05070b',
    boxShadow:
      '0 7px 18px rgba(0,0,0,0.68), inset 0 0 14px rgba(249,115,22,0.18)',
  });

  const art = CARD_ART[cardId];
  if (art) {
    const image = document.createElement('img');
    image.src = art;
    image.alt = '';
    Object.assign(image.style, {
      width: '100%',
      height: '100%',
      display: 'block',
      objectFit: 'cover',
    });
    element.appendChild(image);
  } else {
    const label = document.createElement('span');
    label.textContent = `TIER ${tier}`;
    Object.assign(label.style, {
      display: 'grid',
      width: '100%',
      height: '100%',
      placeItems: 'center',
      color: 'rgba(254,243,199,0.74)',
      fontSize: '10px',
      fontWeight: '700',
    });
    element.appendChild(label);
  }

  return element;
}

export function IronHarbingerResetDirector({
  targetCardIds,
  capturedSlots,
  state,
  reducedMotion,
  playbackMode = 'standard',
  timelinePlaybackRate = 1,
  actions,
  onComplete,
}: IronHarbingerResetDirectorProps) {
  const sequenceRef = useRef<LuminaryEffectSequenceController | null>(null);
  const shockwaveRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef(actions);
  const onCompleteRef = useRef(onComplete);
  const slotsRef = useRef(normalizeSlots(targetCardIds, capturedSlots));
  const stateRef = useRef(state);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const animationControlsRef = useRef<Array<{ stop: () => void }>>([]);
  const returnVisualsRef = useRef<ReturnVisual[]>([]);
  const dealVisualsRef = useRef<HTMLElement[]>([]);
  const archiveVisualsRef = useRef(new Map<Tier, ArchiveVisual>());
  const [refills, setRefills] = useState<RefillVisual[]>([]);

  actionsRef.current = actions;
  onCompleteRef.current = onComplete;
  stateRef.current = state;

  useEffect(() => {
    gameAudio.preloadImpactExtinctionShockwave();
    const slots = slotsRef.current;
    const slotKeys = slots.map(slot => slot.slotKey);
    const paced = (durationMs: number) => luminaryPacedDuration(
      durationMs,
      playbackMode,
      timelinePlaybackRate,
    );
    const announceMs = reducedMotion ? 0 : paced(ANNOUNCE_MS);
    const cameraSettleMs = paced(CAMERA_SETTLE_MS);
    const tremorMs = paced(TREMOR_MS);
    const shockwaveMs = paced(SHOCKWAVE_MS);
    const waveLiftStaggerMs = paced(WAVE_LIFT_STAGGER_MS);
    const liftMs = paced(LIFT_MS);
    const impactHoldMs = paced(IMPACT_HOLD_MS);
    const returnFlightMs = paced(RETURN_FLIGHT_MS);
    const returnStaggerMs = boundedLuminaryStagger(
      slots.length,
      RETURN_STAGGER_MS,
      playbackMode,
      timelinePlaybackRate,
    );
    const shuffleMs = paced(SHUFFLE_MS);
    const refillDurationMs = reducedMotion ? FORGE_REFILL_REDUCED_DURATION_MS : FORGE_REFILL_DURATION_MS;
    const dealStaggerMs = boundedLuminaryStagger(
      slots.length,
      FORGE_REFILL_STAGGER_MS,
      playbackMode,
      timelinePlaybackRate,
    );
    const aftermathMs = paced(AFTERMATH_MS);

    const rememberTimer = (callback: () => void, delayMs: number) => {
      const timer = setTimeout(callback, delayMs);
      timersRef.current.push(timer);
    };

    const trackAnimation = (control: { stop: () => void }) => {
      animationControlsRef.current.push(control);
      return control;
    };

    const stopVisualWork = () => {
      setRefills([]);
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
      animationControlsRef.current.forEach(control => control.stop());
      animationControlsRef.current = [];
    };

    const removeVisuals = () => {
      returnVisualsRef.current.forEach(visual => visual.element.remove());
      returnVisualsRef.current = [];
      dealVisualsRef.current.forEach(element => element.remove());
      dealVisualsRef.current = [];
      archiveVisualsRef.current.forEach(visual => visual.element.remove());
      archiveVisualsRef.current.clear();
    };

    const createArchiveVisuals = () => {
      for (const tier of [3, 2, 1] as const) {
        const source = document.querySelector<HTMLElement>(
          `[data-deck-tier="${tier}"]`,
        );
        if (!source) continue;
        const rect = source.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;

        const clone = source.cloneNode(true) as HTMLElement;
        stripCloneIdentity(clone);
        clone.dataset.archiveCinematic = String(tier);
        Object.assign(clone.style, {
          position: 'fixed',
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          margin: '0',
          opacity: '0',
          pointerEvents: 'none',
          zIndex: '9052',
          background:
            'linear-gradient(180deg, rgba(8,12,15,0.98), rgba(2,5,8,0.98))',
          filter: 'none',
        });
        document.body.appendChild(clone);

        const finalCount = deckCountForTier(stateRef.current, tier);
        archiveVisualsRef.current.set(tier, {
          tier,
          element: clone,
          rect,
          finalCount,
          displayCount: finalCount,
        });
      }
    };

    const updateArchiveCount = (tier: Tier, nextCount: number, pulse = true) => {
      const visual = archiveVisualsRef.current.get(tier);
      if (!visual) return;
      const spent = visual.displayCount - Math.max(0, nextCount);
      visual.displayCount = Math.max(0, nextCount);
      const count = visual.element.querySelector<HTMLElement>(
        '.board-forge-archive-count',
      );
      if (count) {
        const label = document.createElement('span');
        label.textContent = String(visual.displayCount);
        if (spent > 0 && pulse) label.className = 'archive-count-settle';
        count.replaceChildren(label);
      }
      const vessel = visual.element.querySelector<HTMLElement>('.archive-vessel');
      if (vessel) {
        const fill = Math.min(
          100,
          (visual.displayCount / ARCHIVE_CAPACITY_BY_TIER[tier]) * 100,
        );
        vessel.style.setProperty('--archive-fill', `${fill}%`);
        vessel.dataset.archiveRemaining = String(visual.displayCount);
        vessel.querySelector('.archive-vessel__release')?.remove();
        if (spent > 0 && pulse) {
          vessel.style.setProperty('--archive-depleted-fill', `${spent / ARCHIVE_CAPACITY_BY_TIER[tier] * 100}%`);
          const release = document.createElement('span');
          release.className = 'archive-vessel__release';
          vessel.querySelector('.archive-vessel__crystal')?.append(release);
        }
      }
      visual.element.querySelector('.archive-draw-amount')?.remove();
      if (spent > 0 && pulse) {
        const amount = document.createElement('span');
        amount.className = 'archive-draw-amount';
        amount.textContent = `−${spent}`;
        visual.element.append(amount);
      }
      if (pulse) {
        trackAnimation(animate(
          visual.element,
          {
            filter: [
              'brightness(1)',
              'brightness(1.7) saturate(1.25)',
              'brightness(1)',
            ],
            scale: [1, 1.055, 1],
          },
          { duration: reducedMotion ? 0.12 : 0.28, ease: 'easeOut' },
        ));
      }
    };

    const createReturnVisuals = () => {
      returnVisualsRef.current = slots.flatMap((slot) => {
        const source = document.querySelector<HTMLElement>(
          `[data-slot-key="${slot.slotKey}"]`,
        );
        const rect = source?.getBoundingClientRect();
        if (!source || !rect || rect.width <= 0 || rect.height <= 0) return [];

        let element: HTMLElement;
        const sourceCardId =
          source.querySelector<HTMLElement>('[data-card-id]')?.dataset.cardId ??
          source.dataset.cardId;
        if (sourceCardId === slot.cardId) {
          element = source.cloneNode(true) as HTMLElement;
          stripCloneIdentity(element);
        } else {
          element = makeFallbackArtifact(slot.cardId, slot.tier, rect);
        }
        Object.assign(element.style, {
          position: 'fixed',
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          margin: '0',
          opacity: '1',
          pointerEvents: 'none',
          transformOrigin: '50% 50%',
          zIndex: '9055',
          willChange: 'transform, opacity, filter',
        });
        document.body.appendChild(element);
        dealVisualsRef.current.push(element);
        return [{ slot, element, rect }];
      });
    };

    const positionShockwave = () => {
      const forge = document.querySelector<HTMLElement>('[data-forge-tiers]');
      const rect = forge?.getBoundingClientRect();
      const shockwave = shockwaveRef.current;
      if (!rect || !shockwave) return null;
      const width = Math.max(90, Math.min(220, rect.width * 0.24));
      const height = Math.max(34, Math.min(82, rect.height * 0.11));
      Object.assign(shockwave.style, {
        left: `${rect.left + rect.width / 2 - width / 2}px`,
        top: `${rect.top + rect.height / 2 - height / 2}px`,
        width: `${width}px`,
        height: `${height}px`,
        opacity: '1',
      });
      return {
        rect,
        finalScaleX: (rect.width * 1.08) / width,
        finalScaleY: (rect.height * 1.08) / height,
      };
    };

    const runImpact = async (
      wait: (durationMs: number) => Promise<void>,
    ) => {
      createArchiveVisuals();
      createReturnVisuals();
      const shockwaveGeometry = positionShockwave();
      actionsRef.current.onLiftSlots(slotKeys);

      archiveVisualsRef.current.forEach((visual) => {
        trackAnimation(animate(
          visual.element,
          { opacity: [0, 1] },
          { duration: reducedMotion ? 0.08 : 0.22, ease: 'easeOut' },
        ));
      });

      // Beat one: the entire Forge becomes unstable before the force arrives.
      gameAudio.playImpactExtinctionTremor();
      gameAudio.playImpactExtinctionShockwave(tremorMs);
      returnVisualsRef.current.forEach((visual, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        trackAnimation(animate(
          visual.element,
          {
            x: [0, 2.4 * direction, -2.8 * direction, 1.8 * direction, 0],
            y: [0, -1.5, 1, -1, 0],
            rotateZ: [0, 0.7 * direction, -0.85 * direction, 0.45 * direction, 0],
            filter: ['brightness(1)', 'brightness(1.13)', 'brightness(1)'],
          },
          {
            duration: (reducedMotion ? Math.min(180, tremorMs) : tremorMs) / 1000,
            ease: 'easeInOut',
          },
        ));
      });
      await wait(tremorMs);

      const shockwave = shockwaveRef.current;
      if (shockwave && shockwaveGeometry) {
        shockwave.querySelectorAll<HTMLElement>('[data-impact-ring]').forEach(
          (ring, index) => {
            trackAnimation(animate(
              ring,
              {
                opacity: [0, 0.95, 0],
                scaleX: [
                  0.12,
                  shockwaveGeometry.finalScaleX * (0.94 + index * 0.03),
                ],
                scaleY: [
                  0.16,
                  shockwaveGeometry.finalScaleY * (0.94 + index * 0.03),
                ],
                filter: [
                  'brightness(1)',
                  'brightness(2.2)',
                  'brightness(0.8)',
                ],
              },
              {
                duration:
                  (reducedMotion ? Math.min(220, shockwaveMs) : shockwaveMs) / 1000,
                delay: index * (reducedMotion ? 0.03 : 0.1),
                ease: [0.16, 0.76, 0.22, 1],
              },
            ));
          },
        );
      }

      const forgeRect = shockwaveGeometry?.rect;
      const forgeCenter = forgeRect ? centerOf(forgeRect) : null;
      returnVisualsRef.current.forEach((visual, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        const cardCenter = centerOf(visual.rect);
        const normalizedDistance = forgeRect && forgeCenter
          ? Math.min(1, Math.hypot(
              (cardCenter.x - forgeCenter.x) / Math.max(1, forgeRect.width / 2),
              (cardCenter.y - forgeCenter.y) / Math.max(1, forgeRect.height / 2),
            ) / Math.SQRT2)
          : index / Math.max(1, returnVisualsRef.current.length - 1);
        const delayMs = reducedMotion
          ? 0
          : normalizedDistance * waveLiftStaggerMs;

        trackAnimation(animate(
          visual.element,
          {
            x: [0, -2 * direction, 1.5 * direction, 0],
            y: [0, -5, -13, -16],
            rotateZ: [0, -0.65 * direction, 0.45 * direction, 0],
            scale: [1, 1.02, 1.04, 1.04],
            filter: [
              'brightness(1)',
              'brightness(1.45) saturate(1.12)',
              'brightness(1.22)',
            ],
          },
          {
            duration: (reducedMotion ? Math.min(180, liftMs) : liftMs) / 1000,
            delay: delayMs / 1000,
            ease: [0.18, 0.76, 0.22, 1],
          },
        ));
      });

      await wait(
        Math.max(shockwaveMs, waveLiftStaggerMs + liftMs) + impactHoldMs,
      );
    };

    const returnArtifacts = async (
      wait: (durationMs: number) => Promise<void>,
      signal: AbortSignal,
    ) => {
      const durationMs = returnFlightMs;
      const staggerMs = returnStaggerMs;

      returnVisualsRef.current.forEach((visual, index) => {
        const archive = archiveVisualsRef.current.get(visual.slot.tier);
        if (!archive) return;
        const start = centerOf(visual.rect);
        const destination = centerOf(archive.rect);
        const dx = destination.x - start.x;
        const dy = destination.y - start.y + 13;
        const arcY = Math.min(-34, dy * 0.34 - 50 - (index % 3) * 9);
        const fan = ((index % 4) - 1.5) * 8;
        const delayMs = index * staggerMs;

        trackAnimation(animate(
          visual.element,
          {
            x: [0, 0, dx * 0.52 + fan, dx],
            y: [-16, -16, arcY, dy],
            opacity: [1, 1, 0.96, 0],
            scale: [1.04, 1.04, 0.9, 0.26],
            rotateZ: [0, 0, fan * 0.4, 0],
            rotateY: [0, 88, 180, 180],
            filter: [
              'brightness(1.24)',
              'brightness(0.7)',
              'brightness(1.08)',
              'brightness(1.75)',
            ],
          },
          {
            duration: (reducedMotion ? Math.min(220, durationMs) : durationMs) / 1000,
            delay: delayMs / 1000,
            ease: [0.24, 0.72, 0.2, 1],
            times: [0, 0.24, 0.5, 1],
          },
        ));

        rememberTimer(() => {
          if (signal.aborted) return;
          actionsRef.current.playArchiveImpact(index);
          const latest = archiveVisualsRef.current.get(visual.slot.tier);
          if (latest) updateArchiveCount(
            visual.slot.tier,
            latest.displayCount + 1,
          );
        }, delayMs + durationMs - 30);
      });

      const totalMs =
        durationMs +
        Math.max(0, returnVisualsRef.current.length - 1) * staggerMs +
        90;
      await wait(totalMs);
    };

    const randomizeArchives = async (
      wait: (durationMs: number) => Promise<void>,
    ) => {
      actionsRef.current.playShuffle();
      archiveVisualsRef.current.forEach((visual, index) => {
        const crystal = visual.element.querySelector<HTMLElement>(
          '.archive-vessel__crystal',
        );
        const target = crystal ?? visual.element;
        trackAnimation(animate(
          target,
          {
            x: [0, -3, 4, -2, 2, 0],
            scaleX: [1, 0.76, 1.1, 0.82, 1.04, 1],
            scaleY: [1, 1.05, 0.96, 1.06, 0.98, 1],
            rotateY: [0, 72, 158, 248, 326, 360],
            filter: [
              'brightness(1)',
              'brightness(1.8) saturate(1.4)',
              'brightness(1.15)',
              'brightness(2)',
              'brightness(1)',
            ],
          },
          {
            duration: (reducedMotion ? Math.min(220, shuffleMs) : shuffleMs) / 1000,
            delay: index * (reducedMotion ? 0.035 : 0.09),
            ease: 'easeInOut',
          },
        ));
      });
      await wait(shuffleMs + paced(80));
    };

    const dealForge = async ({ waitFor, signal }: LuminaryEffectPhaseContext) => {
      const sortedSlots = [...slots].sort((a, b) => (
        b.tier - a.tier || a.slotIndex - b.slotIndex
      ));
      const totalMs = refillDurationMs + FORGE_REFILL_COMPLETION_BUFFER_MS
        + Math.max(0, sortedSlots.length - 1) * dealStaggerMs;

      await waitFor(done => {
        const pending = new Set<string>();
        const entries: RefillVisual[] = [];
        sortedSlots.forEach((slot, index) => {
          const destination = document.querySelector<HTMLElement>(`[data-slot-key="${slot.slotKey}"]`);
          const rect = destination?.getBoundingClientRect();
          const card = rowForTier(stateRef.current, slot.tier)[slot.slotIndex];
          if (!destination || !rect || rect.width <= 0 || rect.height <= 0 || !card) {
            actionsRef.current.onRevealSlot(slot.slotKey);
            return;
          }
          pending.add(slot.slotKey);
          let revealed = false;
          const reveal = () => {
            if (signal.aborted || revealed || !pending.has(slot.slotKey)) return;
            revealed = true;
            const archive = archiveVisualsRef.current.get(slot.tier);
            if (archive) updateArchiveCount(slot.tier, Math.max(archive.finalCount, archive.displayCount - 1));
            actionsRef.current.onRefillReveal?.(slot.slotKey);
          };
          entries.push({
            slot, card,
            rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
            compact: destination.classList.contains('board-forge-compact-chip'),
            delayMs: index * dealStaggerMs,
            reveal,
            complete: () => {
              if (signal.aborted || !pending.has(slot.slotKey)) return;
              reveal();
              pending.delete(slot.slotKey);
              actionsRef.current.onRevealSlot(slot.slotKey);
              setRefills(current => current.filter(refill => refill.slot.slotKey !== slot.slotKey));
              if (pending.size === 0) done();
            },
          });
        });
        setRefills(entries);
        if (pending.size === 0) done();
      }, totalMs + 250);

      // Advance/skip and missing-slot fallbacks always leave an authoritative board.
      setRefills([]);
      sortedSlots.forEach(slot => actionsRef.current.onRevealSlot(slot.slotKey));
      if (signal.aborted) return;
      archiveVisualsRef.current.forEach((visual) => {
        updateArchiveCount(visual.tier, visual.finalCount, false);
        trackAnimation(animate(
          visual.element,
          { opacity: [1, 0] },
          { duration: reducedMotion ? 0.08 : 0.28, ease: 'easeOut' },
        ));
      });
    };

    const procedure: AnimationProcedureStep[] = [
      { type: 'targetClaim', targetIds: targetCardIds },
      { type: 'archiveReturn', cardIds: targetCardIds },
      { type: 'deckScry', tierIds: ['tier1', 'tier2', 'tier3'] },
      { type: 'forgeRefill', slotIds: slotKeys },
    ];
    const impactEstimate =
      tremorMs + Math.max(shockwaveMs, waveLiftStaggerMs + liftMs) + impactHoldMs;
    const returnEstimate =
      returnFlightMs + Math.max(0, slots.length - 1) * returnStaggerMs + 90;
    const shuffleEstimate = shuffleMs + paced(80);
    const dealEstimate =
      refillDurationMs + Math.max(0, slots.length - 1) * dealStaggerMs + FORGE_REFILL_COMPLETION_BUFFER_MS + 250;
    const totalEstimate =
      announceMs + cameraSettleMs + impactEstimate + returnEstimate +
      shuffleEstimate + dealEstimate + aftermathMs + paced(250);
    actionsRef.current.setAnimEndTime(totalEstimate);

    const sequence = createLuminaryEffectSequence({
      reducedMotion,
      phases: [
        {
          id: 'announce',
          durationMs: announceMs,
          reducedDurationMs: 0,
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
          run: ({ wait }) => runImpact(wait),
        },
        {
          id: 'resolve',
          run: async ({ wait, signal }) => {
            await returnArtifacts(wait, signal);
            if (signal.aborted) return;
            await randomizeArchives(wait);
          },
        },
        {
          id: 'reveal',
          run: context => dealForge(context),
        },
        {
          id: 'aftermath',
          durationMs: aftermathMs,
        },
      ],
      onPhaseChange: (phase) => {
        playLuminaryEffectPhaseSound('lum_forge', phase, '#f97316');
      },
      onSkip: () => {
        gameAudio.stopActivationSting();
        stopVisualWork();
        actionsRef.current.onFinish(slotKeys);
        removeVisuals();
      },
      onComplete: (skipped) => {
        stopVisualWork();
        actionsRef.current.onFinish(slotKeys);
        removeVisuals();
        onCompleteRef.current(skipped);
      },
      onError: () => {
        actionsRef.current.onFinish(slotKeys);
      },
    });
    sequenceRef.current = sequence;
    sequence.start();

    return () => {
      sequence.cancel();
      if (sequenceRef.current === sequence) sequenceRef.current = null;
      gameAudio.stopActivationSting();
      stopVisualWork();
      actionsRef.current.onFinish(slotKeys);
      removeVisuals();
    };
    // The director snapshots its authoritative event payload at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 9048 }}
      data-testid="iron-harbinger-reset-director"
      role="status"
      aria-label="Iron Harbinger is returning the Forge to the Archives"
    >
      <div
        ref={shockwaveRef}
        className="fixed pointer-events-none"
        style={{ opacity: 0, zIndex: 9053 }}
        aria-hidden="true"
      >
        {[0, 1, 2].map(index => (
          <span
            key={index}
            data-impact-ring={index}
            className="absolute inset-0 rounded-full"
            style={{
              opacity: 0,
              border: `${index === 0 ? 2 : 1}px solid ${
                index === 0
                  ? 'rgba(255,218,145,0.92)'
                  : 'rgba(249,115,22,0.68)'
              }`,
              boxShadow:
                '0 0 18px rgba(249,115,22,0.62), inset 0 0 12px rgba(255,218,145,0.34)',
            }}
          />
        ))}
      </div>

      {refills.map(refill => (
        <ForgeReplacementDealAnimation
          key={refill.slot.slotKey}
          animKey={`iron-${refill.slot.slotKey}-${refill.card.id}`}
          cardId={refill.card.id}
          tier={refill.slot.tier}
          bonusAffinity={refill.card.bonusAffinity}
          cost={refill.card.cost}
          compact={refill.compact}
          reducedMotion={reducedMotion}
          targetSlotKey={refill.slot.slotKey}
          slotRect={refill.rect}
          delayMs={refill.delayMs}
          cardFace={<ArtifactCardView card={refill.card} tier={refill.slot.tier} artOnly={refill.compact} effectiveCosts={actionsRef.current.getRefillCosts?.(refill.card)} />}
          cardOverlay={refill.compact ? <CompactForgeCardReadout card={refill.card} costs={actionsRef.current.getRefillCosts?.(refill.card) ?? refill.card.cost} /> : undefined}
          onReveal={refill.reveal}
          onComplete={refill.complete}
        />
      ))}

      <LuminaryEffectSkipControl
        color="#f97316"
        reducedMotion={reducedMotion}
        onAdvance={() => sequenceRef.current?.advance()}
        onSkip={() => sequenceRef.current?.skip()}
        label="Advance Impact Extinction; hold to skip"
      />
    </div>,
    document.body,
  );
}
