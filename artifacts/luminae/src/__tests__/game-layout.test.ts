import { describe, expect, it } from 'vitest';
import { getBoardLayoutPolicyForViewport } from '../pages/game-layout';

describe('game board viewport policy', () => {
  it.each([
    [390, 844, 'phone-portrait'],
    [844, 390, 'phone-portrait'],
    [940, 600, 'phone-portrait'],
    [768, 1024, 'tablet'],
    [1024, 768, 'tablet'],
    [1440, 900, 'desktop'],
    [1599, 900, 'desktop'],
    [1600, 899, 'desktop'],
    [1600, 900, 'desktop'],
    [1920, 1080, 'desktop'],
  ] as const)(
    'maps %sx%s to vertical %s layout',
    (width, height, viewportClass) => {
      expect(getBoardLayoutPolicyForViewport(width, height)).toMatchObject({
        layout: 'base',
        density: 'stacked',
        viewportClass,
        sideAffinityWell: false,
        forceCompactForge: false,
      });
    },
  );

  it('keeps phone rotation in the vertical policy', () => {
    const portrait = getBoardLayoutPolicyForViewport(430, 932);
    const landscape = getBoardLayoutPolicyForViewport(932, 430);

    expect(portrait.viewportClass).toBe('phone-portrait');
    expect(landscape.viewportClass).toBe('phone-portrait');
    expect(portrait.density).toBe('stacked');
    expect(landscape.density).toBe('stacked');
    expect(portrait.forceCompactForge).toBe(false);
    expect(landscape.forceCompactForge).toBe(false);
  });
});
