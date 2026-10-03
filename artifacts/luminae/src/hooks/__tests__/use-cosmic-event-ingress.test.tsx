import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CivilizationEventInstance, GamePlayerState } from '@workspace/api-client-react';
import { useAcceptedCosmicEventLane, type CosmicEventLaneSnapshot } from '../use-cosmic-event-lane';
import { useLuminaryPresentationEngine, type LuminaryPresentationRuntimeSignals } from '../use-luminary-presentation-engine';
import { canStartCosmicEventPresentation } from '@/lib/cosmicEventSequenceGate';

interface Snapshot extends CosmicEventLaneSnapshot {
  version: number;
  pendingActivationCount: number;
  pendingSummonCount: number;
  pendingTurnTransition: boolean;
}

const event: CivilizationEventInstance = {
  eventId: 'event-after-activation', definitionId: 'event_planetary_affinity_bloom',
  triggerWindow: 'deck_reveal', triggerTurnCount: 3, phase: 'reveal',
  affectedPlayerIds: ['p1'], outcomesByPlayerId: {}, createdAt: 100,
};
const players = [{ playerId: 'p1', playerName: 'Architect' }] as GamePlayerState[];
const prior: Snapshot = {
  version: 10, startedAt: 1, players,
  pendingCivilizationEventCards: [],
  pendingActivationCount: 1, pendingSummonCount: 0, pendingTurnTransition: true,
};
const eventSnapshot: Snapshot = {
  ...prior, version: 11, pendingActivationCount: 0,
  pendingCivilizationEventCards: [event],
};
const afterEvent: Snapshot = {
  ...prior, version: 12, pendingActivationCount: 0,
  pendingSummonCount: 1, pendingCivilizationEventCards: [],
};

/** Compose the production lane and ingress, with separate query-cache and accepted snapshots. */
function useEventIngressHarness({
  published,
  initialAccepted,
  localActivation,
}: { published: Snapshot; initialAccepted: Snapshot; localActivation: boolean }) {
  const [accepted, setAccepted] = React.useState(initialAccepted);
  const acceptedRef = React.useRef(accepted);
  const processedVersions = React.useRef<number[]>([]);
  const lane = useAcceptedCosmicEventLane(published, acceptedRef.current);
  const signals: LuminaryPresentationRuntimeSignals = {
    visibleArrivalActive: false,
    activationGateActive: false,
    activationQueueLength: localActivation ? 1 : 0,
    activationAftermathActive: false,
    activeDelayedResult: false,
    delayedResultQueueLength: 0,
    seedBoardEffectActive: false,
    brandStrikeCount: 0,
    pendingTurnTransition: accepted.pendingTurnTransition,
    pendingSummonCount: accepted.pendingSummonCount,
    pendingActivationCount: accepted.pendingActivationCount,
    devSequenceActive: false,
    cameraSequenceActive: true,
    cameraMotionActive: false,
  };
  const process = React.useCallback((next: Snapshot) => {
    acceptedRef.current = next;
    processedVersions.current.push(next.version);
    setAccepted(next);
  }, []);
  const noop = React.useCallback(() => undefined, []);
  const engine = useLuminaryPresentationEngine<Snapshot>({
    signals,
    externalPresentationActive: lane.ingressBlocked,
    getProcessedVersion: () => acceptedRef.current.version,
    processAuthoritativeState: process,
    beginCameraSequence: noop,
    endCameraSequence: noop,
  });
  const accept = engine.ingress.accept;
  React.useEffect(() => { accept(published, 'polling'); }, [accept, published]);
  const eventReady = canStartCosmicEventPresentation({
    animationLockUntil: 0,
    luminaryPresentationActive: engine.status.presentationActive,
    activationGateActive: false,
    pendingSummonCount: accepted.pendingSummonCount,
    pendingActivationCount: accepted.pendingActivationCount,
    coreActionAnimationActive: false,
    boardEffectAnimationActive: false,
    cameraMotionActive: false,
    blueprintPresentationPending: false,
    chroniclePresentationActive: false,
    turnPresentationActive: false,
  });
  return { accepted, lane, engine, eventReady, processedVersions: processedVersions.current };
}

describe('cosmic Event and authoritative ingress integration', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('accepts the predecessor queue-clearing poll before acquiring its Event lease', () => {
    const { result, rerender } = renderHook(useEventIngressHarness, {
      initialProps: { published: prior, initialAccepted: prior, localActivation: true },
    });
    rerender({ published: eventSnapshot, initialAccepted: prior, localActivation: true });

    expect(result.current.accepted.version).toBe(10);
    expect(result.current.lane.presentation).toBeNull();
    expect(result.current.lane.ingressBlocked).toBe(false);
    expect(result.current.engine.queuedStateCount).toBe(1);
    expect(result.current.eventReady).toBe(false);

    rerender({ published: eventSnapshot, initialAccepted: prior, localActivation: false });
    act(() => { vi.advanceTimersByTime(1); });

    expect(result.current.processedVersions).toEqual([11]);
    expect(result.current.accepted.pendingActivationCount).toBe(0);
    expect(result.current.lane.presentation?.event.eventId).toBe(event.eventId);
    expect(result.current.lane.ingressBlocked).toBe(true);
    expect(result.current.eventReady).toBe(true);
    // The server turn barrier still owns a stationary camera lease. It must
    // not prevent the Event that will release that same turn barrier.
    expect(result.current.engine.status.cameraLeaseRequested).toBe(true);
  });

  it('holds a faster peer next-phase snapshot until this client finishes the retained Event', () => {
    const { result, rerender } = renderHook(useEventIngressHarness, {
      initialProps: { published: eventSnapshot, initialAccepted: eventSnapshot, localActivation: false },
    });
    rerender({ published: afterEvent, initialAccepted: eventSnapshot, localActivation: false });
    act(() => { vi.advanceTimersByTime(2000); });

    expect(result.current.accepted.version).toBe(11);
    expect(result.current.lane.presentation?.event.eventId).toBe(event.eventId);
    expect(result.current.lane.presentation?.players).toBe(players);
    expect(result.current.engine.queuedStateCount).toBe(1);
    expect(result.current.processedVersions).toEqual([]);

    act(() => { result.current.lane.complete(event.eventId); });
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.accepted.version).toBe(12);
    expect(result.current.accepted.pendingSummonCount).toBe(1);
    expect(result.current.processedVersions).toEqual([12]);
    expect(result.current.lane.presentation).toBeNull();
    expect(result.current.engine.queuedStateCount).toBe(0);
  });

  it('does not replay an acknowledged Event when a duplicate poll arrives before server acknowledgement', () => {
    const { result, rerender } = renderHook(useEventIngressHarness, {
      initialProps: { published: eventSnapshot, initialAccepted: eventSnapshot, localActivation: false },
    });
    act(() => { result.current.lane.complete(event.eventId); });
    rerender({ published: { ...eventSnapshot }, initialAccepted: eventSnapshot, localActivation: false });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.lane.presentation).toBeNull();
    expect(result.current.lane.ingressBlocked).toBe(false);
    expect(result.current.lane.completedPendingEventId).toBe(event.eventId);
    expect(result.current.processedVersions).toEqual([]);
  });

  it('replaces a retained Event on explicit epoch replacement without draining older peer states', () => {
    const { result, rerender } = renderHook(useEventIngressHarness, {
      initialProps: { published: eventSnapshot, initialAccepted: eventSnapshot, localActivation: false },
    });
    rerender({ published: afterEvent, initialAccepted: eventSnapshot, localActivation: false });
    const rematch = { ...prior, version: 1, startedAt: 2, pendingActivationCount: 0, pendingTurnTransition: false };
    act(() => { result.current.engine.ingress.replaceEpoch(rematch, 'websocket'); });
    expect(result.current.lane.presentation).toBeNull();
    expect(result.current.lane.ingressBlocked).toBe(false);
    expect(result.current.accepted.startedAt).toBe(2);
    expect(result.current.engine.queuedStateCount).toBe(0);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.processedVersions).toEqual([1]);
  });

  it('seeds a reconnect directly from published data when no processed snapshot exists', () => {
    const { result } = renderHook(() => useAcceptedCosmicEventLane(eventSnapshot, null));
    expect(result.current.presentation?.event.eventId).toBe(event.eventId);
    expect(result.current.ingressBlocked).toBe(true);
  });
});
