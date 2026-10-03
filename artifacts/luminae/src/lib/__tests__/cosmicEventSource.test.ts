import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCosmicEventSourceAnchor, measureCosmicEventSource } from '../cosmicEventSource';

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

describe('Event manifestation origin', () => {
  it('keeps the row fallback for a legacy scheduled receipt without a physical mold', () => {
    document.body.innerHTML = '<div data-deck-tier="2"></div><div data-testid="forge-tier-shelf" data-tier="2"><div class="board-forge-card-row"><div data-slot-key="2-0"></div></div></div>';
    const row = document.querySelector<HTMLElement>('.board-forge-card-row')!;
    vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 200, width: 600, height: 180 } as DOMRect);
    const source = { tier: 2 as const, forgeSlotIndex: null, origin: 'scheduled' as const };
    expect(getCosmicEventSourceAnchor(source)).toBe(row);
    const rect = measureCosmicEventSource(source)!;
    expect(rect.left + rect.width / 2).toBe(400);
    expect(rect.top + rect.height / 2).toBe(290);
    expect(rect.width).toBeLessThan(200);
    expect(document.querySelectorAll('[data-slot-key]')).toHaveLength(1);
  });

  it('uses the exact physical mold for a scheduled Event before considering its legacy row origin', () => {
    document.body.innerHTML = '<div data-deck-tier="1"></div><div data-testid="forge-tier-shelf" data-tier="1"><div class="board-forge-card-row"><div data-slot-key="1-0"></div><div data-slot-key="1-2"></div></div></div>';
    const slot = document.querySelector<HTMLElement>('[data-slot-key="1-2"]')!;
    vi.spyOn(slot, 'getBoundingClientRect').mockReturnValue({ left: 280, top: 400, width: 90, height: 60 } as DOMRect);
    const source = { id: 'event_galactic_entropy_storm', tier: 1 as const, forgeSlotIndex: 2, origin: 'scheduled' as const };
    expect(getCosmicEventSourceAnchor(source)).toBe(slot);
    expect(measureCosmicEventSource(source)).toEqual({ left: 280, top: 400, width: 90, height: 60 });
  });

  it('does not invent another mold when a recorded physical source is absent', () => {
    document.body.innerHTML = '<div data-deck-tier="1"></div><div data-testid="forge-tier-shelf" data-tier="1"><div class="board-forge-card-row"><div data-slot-key="1-0"></div></div></div>';
    expect(getCosmicEventSourceAnchor({ tier: 1, forgeSlotIndex: 2, origin: 'scheduled' })).toBeNull();
  });

  it('keeps old Archive and Forge slot origins intact', () => {
    document.body.innerHTML = '<div data-deck-tier="3"></div><div data-slot-key="3-1"></div>';
    expect(getCosmicEventSourceAnchor({ tier: 3, forgeSlotIndex: null, origin: 'archive' })).toBe(document.querySelector('[data-deck-tier]'));
    expect(getCosmicEventSourceAnchor({ tier: 3, forgeSlotIndex: 1 })).toBe(document.querySelector('[data-slot-key]'));
  });
});
