import { describe, expect, it } from 'vitest';
import type { ArtifactCard, CivilizationEventInstance } from '@workspace/api-client-react';
import { getCompletedCosmicEventRefill } from '../cosmicEventRefill';

const card = (id: string): ArtifactCard => ({ id, name: id, tier: 2, cost: {}, eminence: 0, bonusAffinity: 'flare' });
const event: CivilizationEventInstance = {
  eventId: 'event-1', definitionId: 'event_planetary_affinity_bloom',
  triggerWindow: 'deck_reveal', triggerTurnCount: 6, phase: 'reveal',
  affectedPlayerIds: [], outcomesByPlayerId: {}, createdAt: 1,
  sourceCard: { id: 'event_planetary_affinity_bloom', tier: 2, origin: 'scheduled', forgeSlotIndex: 1 },
};
const neighbor = card('old-neighbor');
const replacement = card('archive-draw');
const previous = { pendingCivilizationEventCards: [event], forgeTier1: [], forgeTier2: [neighbor, null], forgeTier3: [] };
const next = { ...previous, pendingCivilizationEventCards: [], forgeTier2: [neighbor, replacement] };

describe('Artifact refill after an Event', () => {
  it('uses the physical source tier even when the Event belongs to another tier', () => {
    expect(getCompletedCosmicEventRefill(previous, next)).toEqual({ card: replacement, tier: 2, slotKey: '2-1' });
  });

  it('survives a peer acknowledgement followed by an unrelated published action', () => {
    const laterPublishedState = { ...next, lastAction: { type: 'cancel_plan' } };
    expect(getCompletedCosmicEventRefill(previous, laterPublishedState))
      .toEqual({ card: replacement, tier: 2, slotKey: '2-1' });
    expect(getCompletedCosmicEventRefill(next, next)).toBeNull();
  });

  it('does not draw while the Event remains pending or from a legacy temporary reveal', () => {
    expect(getCompletedCosmicEventRefill(previous, { ...next, pendingCivilizationEventCards: [event] })).toBeNull();
    const legacy = { ...event, sourceCard: { ...event.sourceCard!, forgeSlotIndex: null } };
    expect(getCompletedCosmicEventRefill({ ...previous, pendingCivilizationEventCards: [legacy] }, next)).toBeNull();
    expect(getCompletedCosmicEventRefill(null, next)).toBeNull();
  });

  it('does not refill an exhausted mold or animate a neighbor shifted into it', () => {
    expect(getCompletedCosmicEventRefill(previous, { ...next, forgeTier2: [neighbor] })).toBeNull();
    const withTrailingNeighbor = { ...previous, forgeTier2: [card('first'), null, neighbor] };
    expect(getCompletedCosmicEventRefill(withTrailingNeighbor, { ...next, forgeTier2: [card('first'), neighbor] })).toBeNull();
  });
});
