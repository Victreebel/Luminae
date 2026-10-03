import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CivilizationEventInstance } from '@workspace/api-client-react';
import { useCosmicEventLane } from '../use-cosmic-event-lane';

const event: CivilizationEventInstance = {
  eventId: 'event-one', definitionId: 'event_stellar_containment_cascade',
  triggerWindow: 'authored', triggerTurnCount: 1, phase: 'receipt',
  affectedPlayerIds: [], outcomesByPlayerId: {}, createdAt: 1,
};

describe('local cosmic Event lane', () => {
  it('retains the receipt when a faster client clears the server queue', () => {
    const { result, rerender } = renderHook(({ pending }) => useCosmicEventLane(pending, [], 1), {
      initialProps: { pending: [event] },
    });
    rerender({ pending: [] });
    expect(result.current.presentation?.event.eventId).toBe(event.eventId);
    expect(result.current.ingressBlocked).toBe(true);
    act(() => result.current.complete(event.eventId));
    expect(result.current.presentation).toBeNull();
    expect(result.current.ingressBlocked).toBe(false);
  });

  it('does not replay a completed receipt while its acknowledgement is in flight', () => {
    const { result, rerender } = renderHook(({ pending }) => useCosmicEventLane(pending, [], 1), {
      initialProps: { pending: [event] },
    });
    act(() => result.current.complete(event.eventId));
    rerender({ pending: [{ ...event }] });
    expect(result.current.presentation).toBeNull();
    expect(result.current.ingressBlocked).toBe(false);
  });
});
