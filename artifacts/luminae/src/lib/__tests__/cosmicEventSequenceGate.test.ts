import { describe, expect, it } from 'vitest';
import {
  canStartCosmicEventPresentation,
  type CosmicEventSequenceSnapshot,
} from '../cosmicEventSequenceGate';

const idle: CosmicEventSequenceSnapshot = {
  animationLockUntil: 0,
  luminaryPresentationActive: false,
  activationGateActive: false,
  pendingSummonCount: 0,
  pendingActivationCount: 0,
  coreActionAnimationActive: false,
  boardEffectAnimationActive: false,
  cameraMotionActive: false,
  blueprintPresentationPending: false,
  chroniclePresentationActive: false,
  turnPresentationActive: false,
};

describe('cosmic Event presentation sequencing', () => {
  it('waits through a Forge departure, replacement deal and residual lock', () => {
    const phases: CosmicEventSequenceSnapshot[] = [
      { ...idle, coreActionAnimationActive: true, animationLockUntil: 3_000 },
      { ...idle, coreActionAnimationActive: true, animationLockUntil: 3_000 },
      { ...idle, animationLockUntil: 3_000 },
    ];
    phases.forEach(phase => expect(canStartCosmicEventPresentation(phase, 2_000)).toBe(false));
    expect(canStartCosmicEventPresentation(phases[2], 3_000)).toBe(true);
  });

  it('covers the arrival gap before mounting and aftermath after the queue empties', () => {
    const priorWork: Partial<CosmicEventSequenceSnapshot>[] = [
      { pendingSummonCount: 1 },
      { activationGateActive: true },
      { luminaryPresentationActive: true },
      { pendingActivationCount: 1 },
      { boardEffectAnimationActive: true },
      { cameraMotionActive: true },
    ];
    priorWork.forEach(phase => {
      expect(canStartCosmicEventPresentation({ ...idle, ...phase }, 5_000)).toBe(false);
    });
    expect(canStartCosmicEventPresentation(idle, 5_000)).toBe(true);
  });

  it('serializes Blueprint, Chronicle and turn presentations ahead of an Event', () => {
    expect(canStartCosmicEventPresentation({ ...idle, blueprintPresentationPending: true })).toBe(false);
    expect(canStartCosmicEventPresentation({ ...idle, chroniclePresentationActive: true })).toBe(false);
    expect(canStartCosmicEventPresentation({ ...idle, turnPresentationActive: true })).toBe(false);
    expect(canStartCosmicEventPresentation(idle)).toBe(true);
  });

  it('allows the Event to release its own authoritative turn and camera hold', () => {
    const eventHoldingTurn = {
      ...idle,
      pendingTurnTransition: true,
      pendingEventCount: 1,
      cameraSequenceActive: true,
    };
    expect(canStartCosmicEventPresentation(eventHoldingTurn)).toBe(true);
  });
});
