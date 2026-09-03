import { describe, expect, it } from 'vitest';
import {
  getLuminaryAnnouncementCopy,
  getLuminaryEffectResultReceiptCopy,
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
  it('matches the current base effect mechanics for every active Luminary', () => {
    const expected = {
      lum_moth: [
        'Burn Tier III Artifacts without a 5+ Flare cost.',
        'Artifacts below 5 Flare burn, then immediately redraw.',
      ],
      lum_tide: [
        'The Observer Effect opens all three Archives to its ally.',
        'Archive tops revealed. One may be Forged directly.',
      ],
      lum_verdant: [
        'Gain 1 Verdance from the Affinity Well.',
        'Gain 1 Verdance from the Affinity Well.',
      ],
      lum_void: [
        'Raise the shared victory requirement by 8.',
        'Victory rises by 8.',
      ],
      lum_radiant: [
        'Reach a Radiance milestone to gain 2 Eminence.',
        'Radiance milestone reached. Gain +2 Eminence.',
      ],
      lum_astral: [
        'Return future Burned Artifacts to their Archives.',
        'Future Burned Artifacts return to their Archives.',
      ],
      lum_bloom: [
        'Gain 1 Eminence per Burn effect since your last turn.',
        'Gain +1 Eminence for each recorded Burn effect.',
      ],
      lum_forge: [
        'Return Forge Artifacts, randomize Archives, then refill the Forge.',
        'Artifacts return, Archives randomize, and the Forge refills.',
      ],
      lum_compass: [
        'Brand Forge Artifacts Forgotten; raise victory by 1.',
        'Forge Artifacts become Forgotten; victory rises by 1.',
      ],
      lum_seed: [
        'Permanently seed one random mold in each tier.',
        'Three Forge molds are permanently marked.',
      ],
      lum_orchard: [
        'Your first eligible Forge grants another bonus Affinity.',
        'That Artifact grants a second permanent bonus Affinity.',
      ],
      lum_pale: [
        'Players holding half an Affinity supply return 2 tokens.',
        'Qualifying holdings return 2 tokens per Affinity.',
      ],
      lum_ember: [
        'Brand eligible Forge Artifacts as Condemned.',
        'Eligible Forge Artifacts are marked Condemned.',
      ],
      lum_hunger: [
        'Assimilate an Artifact to gain only its permanent Affinity.',
        'Gain its permanent Affinity bonus; gain no Eminence.',
      ],
      lum_null: [
        'Brand eligible Tier III Artifacts as Nullified.',
        'Eligible Tier III Artifacts are marked Nullified.',
      ],
    } as const;

    for (const [luminaryId, [source, resolution]] of Object.entries(expected)) {
      expect(getLuminaryAnnouncementCopy(luminaryId, 'source')).toBe(source);
      expect(getLuminaryAnnouncementCopy(luminaryId, 'resolution')).toBe(resolution);
    }
  });

  it('keeps source and resolution beats distinct for multi-part effects', () => {
    const source = getLuminaryAnnouncementCopy('lum_compass', 'source');
    const resolution = getLuminaryAnnouncementCopy('lum_compass', 'resolution');

    expect(source).toBe('Brand Forge Artifacts Forgotten; raise victory by 1.');
    expect(resolution).toBe('Forge Artifacts become Forgotten; victory rises by 1.');
    expect(source).not.toBe(resolution);
  });

  it('uses the concise Cinder burn announcement', () => {
    expect(
      getLuminaryAnnouncementCopy('lum_ember', 'resolution', undefined, 'end_of_turn'),
    ).toBe('All condemned Artifacts are burned.');
  });

  it('describes the deferred Phoenix return only at start of turn', () => {
    expect(
      getLuminaryAnnouncementCopy('lum_astral', 'source', undefined, 'start_of_turn'),
    ).toBe('Return the Burn Pile; refill empty Forge positions.');
    expect(
      getLuminaryAnnouncementCopy('lum_astral', 'resolution', undefined, 'start_of_turn'),
    ).toBe('Those Artifacts return; empty Forge positions refill.');
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

  it('summarizes authoritative multi-player Balance Due results', () => {
    expect(getLuminaryEffectResultReceiptCopy({
      luminaryId: 'lum_pale',
      effectType: 'summon',
      affinityReturns: [
        { affinityAmount: 2 },
        { affinityAmount: 2 },
        { affinityAmount: 2 },
      ],
    })).toBe('3 holdings returned 6 Affinity tokens to the Well.');
  });

  it('reports actual target counts instead of restating an effect rule', () => {
    expect(getLuminaryEffectResultReceiptCopy({
      luminaryId: 'lum_compass',
      effectType: 'summon',
      targetCardIds: ['a', 'b', 'c'],
    })).toBe('3 Artifacts became Forgotten. Victory condition increased by 1.');

    expect(getLuminaryEffectResultReceiptCopy({
      luminaryId: 'lum_ember',
      effectType: 'end_of_turn',
      targetCardIds: ['a', 'b', 'c'],
    })).toBe('3 Artifacts burned.');

    expect(getLuminaryEffectResultReceiptCopy({
      luminaryId: 'lum_null',
      effectType: 'summon',
      targetCardIds: [],
    })).toBe('No eligible Tier III Artifacts became Nullified.');
  });
});
