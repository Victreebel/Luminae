import { describe, expect, it } from 'vitest';
import { getCivilizationCivilianParcelArt } from '@/lib/civilizationCivilianArtRegistry';
import { getCivilizationNeutralSettlementArt } from '@/lib/civilizationManifestationArtRegistry';

const CELLS = [
  ['terrace', 0, 0, 487],
  ['campus', 1, 0, 498],
  ['garden', 2, 0, 500],
  ['works', 0, 1, 426],
  ['edge', 1, 1, 431],
] as const;

describe('civilian parcel art registry', () => {
  it.each(CELLS)('uses dedicated civilian artwork and the measured foundation for %s', (variant, column, row, groundPixel) => {
    const art = getCivilizationCivilianParcelArt('chrysalis', 'galactic', variant)!;
    expect(art.src).toContain('civilian-galactic-atlas-v1.webp');
    expect(art.src).not.toBe(getCivilizationNeutralSettlementArt('surface', 'civic_core')?.src);
    expect(art.atlas).toEqual({ columns: 3, rows: 2, column, row });
    expect(art.groundLine).toBe(groundPixel / 512);
    expect(art.anchor).toEqual({ x: 50, y: 94 });
  });

  it.each([
    ['echo', 'galactic'], ['chrysalis', 'stellar'], ['chrysalis', 'planetary'],
    ['future-triad', 'galactic'],
  ] as const)('leaves unsupported %s %s editions unavailable without borrowing specialist art', (theme, maturity) => {
    expect(getCivilizationCivilianParcelArt(theme, maturity, 'terrace')).toBeNull();
  });
});
