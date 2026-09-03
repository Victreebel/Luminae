import { describe, expect, it } from 'vitest';
import {
  canAcknowledgeLuminaryActivations,
  delayedResultBelongsToActivation,
  getLuminaryActivationGateDecision,
  isActivationAftermathBlockingHead,
  isActivationAftermathInFlight,
  isLuminaryActivationGateActive,
  isLuminaryArrivalSequenceActive,
  isLuminaryCameraLeaseRequested,
  partitionDeferredBrandStrikesByActivation,
  reconcileDeferredLuminaryActivations,
  type LuminaryActivationGateReason,
  type LuminarySequenceGateSnapshot,
} from '../luminarySequenceGate';

function snapshot(overrides: Partial<LuminarySequenceGateSnapshot> = {}): LuminarySequenceGateSnapshot {
  return {
    arrivalQueueLength: 0,
    enqueuingCount: 0,
    pendingSuppressCount: 0,
    visualHoldCount: 0,
    returningCount: 0,
    pendingArrivalLuminaryIds: new Set(),
    summonActivationLockedLuminaryIds: new Set(),
    ...overrides,
  };
}

describe('luminarySequenceGate', () => {
  it('treats visible arrival phases as an active arrival sequence', () => {
    expect(isLuminaryArrivalSequenceActive(snapshot({ arrivalQueueLength: 1 }))).toBe(true);
    expect(isLuminaryArrivalSequenceActive(snapshot({ visualHoldCount: 1 }))).toBe(true);
    expect(isLuminaryArrivalSequenceActive(snapshot({ returningCount: 1 }))).toBe(true);
    expect(isLuminaryArrivalSequenceActive(snapshot())).toBe(false);
  });

  it('treats pre-render arrival work as an active activation gate', () => {
    expect(isLuminaryActivationGateActive(snapshot({ enqueuingCount: 1 }))).toBe(true);
    expect(isLuminaryActivationGateActive(snapshot({ pendingSuppressCount: 1 }))).toBe(true);
    expect(isLuminaryActivationGateActive(snapshot())).toBe(false);
  });

  it('blocks every activation while any arrival sequence is active', () => {
    const decision = getLuminaryActivationGateDecision(
      { eventId: 'act-1', luminaryId: 'lum_ember', effectType: 'end_of_turn' },
      snapshot({ returningCount: 1 }),
    );

    expect(decision).toEqual({ allowed: false, reason: 'arrival-active' });
  });

  it('blocks activations while arrival work has been detected but not mounted yet', () => {
    expect(getLuminaryActivationGateDecision(
      { eventId: 'act-1', luminaryId: 'lum_ember', effectType: 'end_of_turn' },
      snapshot({ enqueuingCount: 1 }),
    )).toEqual({ allowed: false, reason: 'arrival-active' });

    expect(getLuminaryActivationGateDecision(
      { eventId: 'act-2', luminaryId: 'lum_ember', effectType: 'end_of_turn' },
      snapshot({ pendingSuppressCount: 1 }),
    )).toEqual({ allowed: false, reason: 'arrival-active' });
  });

  it('blocks summon activations while their matching arrival event is pending', () => {
    const decision = getLuminaryActivationGateDecision(
      { eventId: 'act-1', luminaryId: 'lum_oracle', effectType: 'summon' },
      snapshot({ pendingArrivalLuminaryIds: new Set(['lum_oracle']) }),
    );

    expect(decision).toEqual({ allowed: false, reason: 'summon-arrival-pending' });
  });

  it('keeps summon activations blocked until the return flight releases their lock', () => {
    const decision = getLuminaryActivationGateDecision(
      { eventId: 'act-1', luminaryId: 'lum_oracle', effectType: 'summon' },
      snapshot({ summonActivationLockedLuminaryIds: new Set(['lum_oracle']) }),
    );

    expect(decision).toEqual({ allowed: false, reason: 'summon-returning' });
  });

  it('allows a summon activation only after arrival and return locks are clear', () => {
    const decision = getLuminaryActivationGateDecision(
      { eventId: 'act-1', luminaryId: 'lum_oracle', effectType: 'summon' },
      snapshot(),
    );

    expect(decision).toEqual({ allowed: true, reason: 'ready' });
  });

  it('allows summon activation only after every arrival phase has fully cleared', () => {
    const event = { eventId: 'act-1', luminaryId: 'lum_oracle', effectType: 'summon' } as const;
    const blockedPhases: Array<[Partial<LuminarySequenceGateSnapshot>, LuminaryActivationGateReason]> = [
      [{ pendingArrivalLuminaryIds: new Set(['lum_oracle']) }, 'summon-arrival-pending'],
      [{ enqueuingCount: 1 }, 'arrival-active'],
      [{ pendingSuppressCount: 1 }, 'arrival-active'],
      [{ arrivalQueueLength: 1 }, 'arrival-active'],
      [{ visualHoldCount: 1 }, 'arrival-active'],
      [{ returningCount: 1 }, 'arrival-active'],
      [{ summonActivationLockedLuminaryIds: new Set(['lum_oracle']) }, 'summon-returning'],
    ];

    for (const [phaseSnapshot, reason] of blockedPhases) {
      expect(getLuminaryActivationGateDecision(event, snapshot(phaseSnapshot))).toEqual({
        allowed: false,
        reason,
      });
    }

    expect(getLuminaryActivationGateDecision(event, snapshot())).toEqual({ allowed: true, reason: 'ready' });
  });

  it('keeps a delayed payoff attached to its exact activation event', () => {
    const first = { eventId: 'act-1', luminaryId: 'lum_bloom', effectType: 'summon' };
    const second = { eventId: 'act-2', luminaryId: 'lum_bloom', effectType: 'start_of_turn' };
    const result = { luminaryId: 'lum_bloom', activationEventId: 'act-1' };

    expect(delayedResultBelongsToActivation(result, first)).toBe(true);
    expect(delayedResultBelongsToActivation(result, second)).toBe(false);
  });

  it('recovers an authoritative activation that missed the local deferred snapshot', () => {
    const earlyBloom = {
      eventId: 'early-bloom-1',
      luminaryId: 'lum_verdant',
      effectType: 'summon',
    };

    expect(reconcileDeferredLuminaryActivations([], [earlyBloom])).toEqual([earlyBloom]);
  });

  it('deduplicates deferred activations and excludes events already in the queue', () => {
    const earlyBloom = {
      eventId: 'early-bloom-1',
      luminaryId: 'lum_verdant',
      effectType: 'summon',
    };

    expect(reconcileDeferredLuminaryActivations(
      [earlyBloom],
      [earlyBloom],
      new Set([earlyBloom.eventId]),
    )).toEqual([]);
  });

  it('keeps deferred brands attached to their originating Luminary activation', () => {
    const tide = { eventId: 'tide-1', luminaryId: 'lum_tide', effectType: 'summon' };
    const forgotten = { eventId: 'forgotten-1', luminaryId: 'lum_compass', effectType: 'summon' };
    const tideStrike = { id: 'tide-strike', srcMeta: { lumId: 'lum_tide' } };
    const forgottenStrike = { id: 'forgotten-strike', srcMeta: { lumId: 'lum_compass' } };
    const legacyStrike = { id: 'legacy-strike', srcMeta: null };

    expect(partitionDeferredBrandStrikesByActivation(
      [forgottenStrike, tideStrike, legacyStrike],
      [tide, forgotten],
    )).toEqual({
      owned: [forgottenStrike, tideStrike],
      unowned: [legacyStrike],
    });

    expect(partitionDeferredBrandStrikesByActivation(
      [forgottenStrike],
      [tide],
    )).toEqual({
      owned: [],
      unowned: [forgottenStrike],
    });
  });

  it('holds camera ownership only for semantic developer-sequence work', () => {
    const idle = {
      presentationActive: false,
      authoritativeSequenceActive: false,
      seedBoardEffectActive: false,
      brandStrikeCount: 0,
      devSequenceActive: false,
      devSequenceLaunchPending: false,
    };

    expect(isLuminaryCameraLeaseRequested(idle)).toBe(false);
    expect(isLuminaryCameraLeaseRequested({
      ...idle,
      devSequenceLaunchPending: true,
    })).toBe(true);
    expect(isLuminaryCameraLeaseRequested({
      ...idle,
      devSequenceActive: true,
    })).toBe(true);
    expect(isLuminaryCameraLeaseRequested({
      ...idle,
      authoritativeSequenceActive: true,
    })).toBe(true);
  });

  it('falls back to Luminary identity for legacy payoff requests', () => {
    expect(delayedResultBelongsToActivation(
      { luminaryId: 'lum_orchard' },
      { eventId: 'act-1', luminaryId: 'lum_orchard', effectType: 'summon' },
    )).toBe(true);
  });

  it('allows an activation to finish its own aftermath but blocks the next one', () => {
    const now = 1_000;
    expect(isActivationAftermathInFlight('act-1', 2_000, now)).toBe(true);
    expect(isActivationAftermathBlockingHead('act-1', 'act-1', 2_000, now)).toBe(false);
    expect(isActivationAftermathBlockingHead('act-1', 'act-2', 2_000, now)).toBe(true);
    expect(isActivationAftermathBlockingHead('act-1', 'act-2', 900, now)).toBe(false);
  });

  it('acknowledges server activation events only after the entire visual lane clears', () => {
    const clear = {
      activationQueueLength: 0,
      activationGateActive: false,
      activationAftermathActive: false,
      activeDelayedResult: false,
      delayedResultQueueLength: 0,
      seedBoardEffectActive: false,
      brandStrikeCount: 0,
      animationLockUntil: 900,
    };
    const now = 1_000;

    expect(canAcknowledgeLuminaryActivations(clear, now)).toBe(true);
    expect(canAcknowledgeLuminaryActivations({ ...clear, activationQueueLength: 1 }, now)).toBe(false);
    expect(canAcknowledgeLuminaryActivations({ ...clear, activationAftermathActive: true }, now)).toBe(false);
    expect(canAcknowledgeLuminaryActivations({ ...clear, activeDelayedResult: true }, now)).toBe(false);
    expect(canAcknowledgeLuminaryActivations({ ...clear, seedBoardEffectActive: true }, now)).toBe(false);
    expect(canAcknowledgeLuminaryActivations({ ...clear, brandStrikeCount: 1 }, now)).toBe(false);
    expect(canAcknowledgeLuminaryActivations({ ...clear, animationLockUntil: 1_100 }, now)).toBe(false);
  });
});
