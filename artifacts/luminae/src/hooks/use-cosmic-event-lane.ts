import { useCallback, useEffect, useRef, useState } from 'react';
import type { CivilizationEventInstance, GamePlayerState } from '@workspace/api-client-react';

export interface CosmicEventLaneSnapshot {
  pendingCivilizationEventCards: readonly CivilizationEventInstance[];
  players: GamePlayerState[];
  startedAt?: number;
}

/**
 * Polling publishes to the query cache before presentation ingress accepts it.
 * Only an accepted snapshot may acquire a new Event lease, or that lease can
 * prevent its own predecessor's queue-clearing snapshot from being accepted.
 * Initial load has no predecessor and may seed directly from the published state.
 */
export function useAcceptedCosmicEventLane(
  publishedState: CosmicEventLaneSnapshot | null | undefined,
  processedState: CosmicEventLaneSnapshot | null | undefined,
) {
  const accepted = processedState ?? publishedState;
  return useCosmicEventLane(
    accepted?.pendingCivilizationEventCards ?? [],
    accepted?.players ?? [],
    accepted?.startedAt,
  );
}

/** Keep this client's receipt alive when another client finishes first. */
export function useCosmicEventLane(
  pending: readonly CivilizationEventInstance[],
  players: GamePlayerState[],
  epoch: number | undefined,
) {
  const completed = useRef(new Set<string>());
  const epochRef = useRef(epoch);
  const [retained, setRetained] = useState<{
    event: CivilizationEventInstance;
    players: GamePlayerState[];
  } | null>(null);
  const [, refresh] = useState(0);
  useEffect(() => {
    if (epochRef.current !== epoch) {
      epochRef.current = epoch;
      completed.current.clear();
      setRetained(null);
    }
  }, [epoch]);
  const next = pending.find((event) => !completed.current.has(event.eventId));
  useEffect(() => {
    if (!retained && next) setRetained({ event: next, players });
  }, [next, players, retained]);
  const complete = useCallback((eventId: string) => {
    completed.current.add(eventId);
    setRetained((current) => current?.event.eventId === eventId ? null : current);
    refresh((value) => value + 1);
  }, []);
  return {
    presentation: retained ?? (next ? { event: next, players } : null),
    ingressBlocked: retained !== null || next !== undefined,
    completedPendingEventId: pending.find((event) => completed.current.has(event.eventId))?.eventId,
    complete,
  };
}
