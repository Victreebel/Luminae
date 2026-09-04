import { describe, expect, it } from 'vitest';
import { getBoardLayoutPolicyForViewport } from '../pages/game-layout';

describe('game board viewport policy', () => {
  it.each([
    [390, 844, 'phone-portrait', 'stacked', 'base', false, true],
    [844, 390, 'phone-landscape', 'cockpit', 'base', true, true],
    [940, 600, 'phone-landscape', 'efficient', 'base', true, true],
    [768, 1024, 'tablet', 'stacked', 'base', false, false],
    [1024, 768, 'tablet', 'efficient', 'base', true, false],
    [1440, 900, 'desktop', 'efficient', 'base', true, false],
    [1599, 900, 'desktop', 'comfortable', 'base', true, false],
    [1600, 899, 'desktop', 'comfortable', 'base', true, false],
    [1600, 900, 'desktop', 'comfortable', 'left-civ', true, false],
    [1920, 1080, 'desktop', 'showcase', 'left-civ', true, false],
  ] as const)(
    'maps %sx%s to the intended %s layout',
    (width, height, viewportClass, density, layout, sideAffinityWell, forceCompactForge) => {
      expect(getBoardLayoutPolicyForViewport(width, height)).toMatchObject({
        layout,
        density,
        viewportClass,
        sideAffinityWell,
        forceCompactForge,
      });
    },
  );

  it('moves a rotated phone into the compact side-Well cockpit', () => {
    const portrait = getBoardLayoutPolicyForViewport(430, 932);
    const landscape = getBoardLayoutPolicyForViewport(932, 430);

    expect(portrait.viewportClass).toBe('phone-portrait');
    expect(landscape.viewportClass).toBe('phone-landscape');
    expect(portrait.density).toBe('stacked');
    expect(landscape.density).toBe('cockpit');
    expect(portrait.forceCompactForge).toBe(true);
    expect(landscape.forceCompactForge).toBe(true);
    expect(landscape.sideAffinityWell).toBe(true);
  });
});
