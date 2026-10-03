import type { CivilizationEventInstance } from '@workspace/game-types';

type EventSource = CivilizationEventInstance['sourceCard'];

export function getCosmicEventSourceAnchor(source: EventSource) {
  if (source?.forgeSlotIndex != null) {
    return document.querySelector<HTMLElement>(`[data-slot-key="${source.tier}-${source.forgeSlotIndex}"]`);
  }
  if (source?.origin === 'scheduled') {
    return document.querySelector<HTMLElement>(`[data-testid="forge-tier-shelf"][data-tier="${source.tier}"] .board-forge-card-row`)
      ?? document.querySelector<HTMLElement>('[data-forge-section]');
  }
  return document.querySelector<HTMLElement>(`[data-deck-tier="${source?.tier ?? 2}"]`);
}

export function measureCosmicEventSource(source: EventSource, anchor = getCosmicEventSourceAnchor(source)) {
  const rect = anchor?.getBoundingClientRect();
  if (!rect) return null;
  if (source?.forgeSlotIndex != null || source?.origin !== 'scheduled') return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  // Keep receipts saved before Events occupied real molds playable. New
  // scheduled Events carry a physical slot and never use this fallback.
  const card = anchor?.querySelector<HTMLElement>('[data-slot-key]')?.getBoundingClientRect();
  const width = Math.min(160, card?.width || 120);
  const height = width * 1.4;
  return { left: rect.left + rect.width / 2 - width / 2, top: rect.top + rect.height / 2 - height / 2, width, height };
}
