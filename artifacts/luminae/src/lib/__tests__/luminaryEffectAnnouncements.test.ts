import { describe, expect, it } from 'vitest';
import {
  getLuminaryAnnouncementCopy,
  MAX_LUMINARY_ANNOUNCEMENT_LENGTH,
  MAX_LUMINARY_ANNOUNCEMENT_WORDS,
} from '@/lib/luminaryEffectAnnouncements';

const knownLuminaryIds = [
  'lum_moth',
  'lum_tide',
  'lum_verdant',
  'lum_void',
  'lum_radiant',
  'lum_astral',
  'lum_bloom',
  'lum_forge',
  'lum_compass',
  'lum_seed',
  'lum_orchard',
  'lum_pale',
  'lum_ember',
  'lum_hunger',
  'lum_null',
  'lum_oracle',
  'lum_scholar',
];

describe('Luminary announcement copy', () => {
  it('keeps source and resolution beats distinct for multi-part effects', () => {
    const source = getLuminaryAnnouncementCopy('lum_compass', 'source');
    const resolution = getLuminaryAnnouncementCopy('lum_compass', 'resolution');

    expect(source).toBe('The Forgotten Hour opens.');
    expect(resolution).toBe('Forge Artifacts become Forgotten; victory rises by 1.');
    expect(source).not.toBe(resolution);
  });

  it('uses the concise Cinder burn announcement', () => {
    expect(
      getLuminaryAnnouncementCopy('lum_ember', 'resolution', undefined, 'end_of_turn'),
    ).toBe('All condemned Artifacts are burned.');
  });

  it('keeps known announcement beats within the readable copy budget', () => {
    for (const luminaryId of knownLuminaryIds) {
      for (const part of ['source', 'resolution'] as const) {
        const copy = getLuminaryAnnouncementCopy(luminaryId, part);

        expect(copy.length, `${luminaryId} ${part}`).toBeLessThanOrEqual(
          MAX_LUMINARY_ANNOUNCEMENT_LENGTH,
        );
        expect(copy, `${luminaryId} ${part}`).not.toMatch(/\bcards?\b/i);
      }
    }
  });

  it('shortens an unknown fallback to its first sentence and copy budget', () => {
    const copy = getLuminaryAnnouncementCopy('unknown', 'resolution', {
      effectName: 'Long Effect',
      effectDescription: `${'A very long rule sentence '.repeat(12)}. A second sentence.`,
    });

    expect(copy.endsWith('...')).toBe(true);
    expect(copy.length).toBeLessThanOrEqual(MAX_LUMINARY_ANNOUNCEMENT_LENGTH);
    expect(copy.trim().split(/\s+/)).toHaveLength(MAX_LUMINARY_ANNOUNCEMENT_WORDS);
  });
});
