import { describe, expect, it } from 'vitest';
import {
  INITIAL_LUMINARY_SEQUENCE_RUN_STATE,
  deriveLuminarySequenceStatus,
  luminarySequenceRunReducer,
  type LuminarySequenceObservation,
  type LuminarySequenceSignals,
} from '../luminarySequenceController';

function signals(
  overrides: Partial<LuminarySequenceSignals> = {},
): LuminarySequenceSignals {
  return {
    visibleArrivalActive: false,
    activationGateActive: false,
    activationQueueLength: 0,
    activationAftermathActive: false,
    activeDelayedResult: false,
    delayedResultQueueLength: 0,
    seedBoardEffectActive: false,
    brandStrikeCount: 0,
    pendingTurnTransition: false,
    pendingSummonCount: 0,
    pendingActivationCount: 0,
    devSequenceActive: false,
    devSequenceLaunchPending: false,
    cameraSequenceActive: false,
    cameraMotionActive: false,
    ...overrides,
  };
}

function observation(
  overrides: Partial<LuminarySequenceSignals> = {},
  ingressQueuedCount = 0,
): LuminarySequenceObservation {
  const nextSignals = signals(overrides);
  return {
    signals: nextSignals,
    status: deriveLuminarySequenceStatus(nextSignals),
    ingressQueuedCount,
  };
}

describe('luminarySequenceController', () => {
  it('orders visible sequence phases by causal priority', () => {
    expect(deriveLuminarySequenceStatus(signals({
      visibleArrivalActive: true,
      activationQueueLength: 1,
    })).phase).toBe('arrival');
    expect(deriveLuminarySequenceStatus(signals({
      activationGateActive: true,
    })).phase).toBe('arrival-settle');
    expect(deriveLuminarySequenceStatus(signals({
      activationQueueLength: 1,
      activationAftermathActive: true,
    })).phase).toBe('activation');
    expect(deriveLuminarySequenceStatus(signals({
      activationAftermathActive: true,
    })).phase).toBe('aftermath');
  });

  it('holds the camera while server authority is between visible phases', () => {
    const status = deriveLuminarySequenceStatus(signals({
      pendingTurnTransition: true,
    }));
    expect(status.phase).toBe('awaiting-state');
    expect(status.cameraLeaseRequested).toBe(true);
    expect(status.cameraControlled).toBe(true);
  });

  it('distinguishes camera restoration from semantic sequence work', () => {
    const status = deriveLuminarySequenceStatus(signals({
      cameraMotionActive: true,
    }));
    expect(status.phase).toBe('restoring');
    expect(status.cameraLeaseRequested).toBe(false);
    expect(status.cameraControlled).toBe(true);
  });

  it('passes a lab run only after activity and complete release', () => {
    const begun = luminarySequenceRunReducer(
      INITIAL_LUMINARY_SEQUENCE_RUN_STATE,
      { type: 'begin', now: 100 },
    );
    const active = luminarySequenceRunReducer(begun, {
      type: 'observe',
      now: 200,
      observation: observation({ visibleArrivalActive: true, activationGateActive: true }),
    });
    const restoring = luminarySequenceRunReducer(active, {
      type: 'observe',
      now: 300,
      observation: observation({ cameraMotionActive: true }),
    });
    const released = luminarySequenceRunReducer(restoring, {
      type: 'observe',
      now: 400,
      observation: observation(),
    });

    expect(active.status).toBe('running');
    expect(restoring.status).toBe('running');
    expect(released.status).toBe('passed');
    expect(released.trace.map(entry => entry.phase)).toEqual([
      'arrival',
      'restoring',
      'idle',
    ]);
  });

  it('does not pass while ingress still contains a future state', () => {
    const begun = luminarySequenceRunReducer(
      INITIAL_LUMINARY_SEQUENCE_RUN_STATE,
      { type: 'begin', now: 100 },
    );
    const active = luminarySequenceRunReducer(begun, {
      type: 'observe',
      now: 200,
      observation: observation({ devSequenceLaunchPending: true }),
    });
    const queued = luminarySequenceRunReducer(active, {
      type: 'observe',
      now: 300,
      observation: observation({}, 1),
    });

    expect(queued.status).toBe('running');
  });
});
