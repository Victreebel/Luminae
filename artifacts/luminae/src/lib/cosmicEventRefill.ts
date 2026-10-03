import type { ArtifactCard, CivilizationEventInstance } from '@workspace/api-client-react';

interface EventForgeSnapshot {
  pendingCivilizationEventCards: readonly CivilizationEventInstance[];
  forgeTier1: (ArtifactCard | null)[];
  forgeTier2: (ArtifactCard | null)[];
  forgeTier3: (ArtifactCard | null)[];
}

/** Detect the refill even when a peer's later update supersedes the acknowledgement action. */
export function getCompletedCosmicEventRefill(previous: EventForgeSnapshot | null, next: EventForgeSnapshot) {
  if (!previous) return null;
  const pendingIds = new Set(next.pendingCivilizationEventCards.map(event => event.eventId));
  for (const event of previous.pendingCivilizationEventCards) {
    const source = event.sourceCard;
    if (!source || source.forgeSlotIndex == null || pendingIds.has(event.eventId)) continue;
    const rowKey = source.tier === 1 ? 'forgeTier1' : source.tier === 2 ? 'forgeTier2' : 'forgeTier3';
    const card = next[rowKey][source.forgeSlotIndex];
    // Exhausted Archives collapse the row; a surviving neighbor is not a draw.
    if (!card || previous[rowKey].some(previousCard => previousCard?.id === card.id)) continue;
    return { card, tier: source.tier, slotKey: `${source.tier}-${source.forgeSlotIndex}` };
  }
  return null;
}
