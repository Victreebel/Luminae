import { describe, expect, it } from 'vitest';
import {
  artifactMarkerBlocksForgeEminence,
  artifactMarkerHasBrand,
  getAddedArtifactBrandTypes,
  getArtifactBrandTypes,
  getPendingArtifactBrandTypes,
  isNullifiedFirstForgeExempt,
} from '../artifactBrands';

describe('Artifact brand normalization', () => {
  it('reads legacy one-brand markers', () => {
    const marker = {
      type: 'forgotten' as const,
      ownerId: 'p1',
      summonedAtTurnCount: 4,
    };

    expect(getArtifactBrandTypes(marker)).toEqual(['forgotten']);
    expect(artifactMarkerHasBrand(marker, 'forgotten')).toBe(true);
  });

  it('preserves cumulative brand order and detects a brand added to an existing card', () => {
    const previous = {
      type: 'forgotten' as const,
      ownerId: 'p1',
      summonedAtTurnCount: 4,
      brands: [
        { type: 'forgotten' as const, ownerId: 'p1', summonedAtTurnCount: 4 },
      ],
    };
    const next = {
      type: 'nullified' as const,
      ownerId: 'p2',
      summonedAtTurnCount: 5,
      brands: [
        { type: 'forgotten' as const, ownerId: 'p1', summonedAtTurnCount: 4 },
        { type: 'nullified' as const, ownerId: 'p2', summonedAtTurnCount: 5 },
      ],
    };

    expect(getArtifactBrandTypes(next)).toEqual(['forgotten', 'nullified']);
    expect(getAddedArtifactBrandTypes(previous, next)).toEqual(['nullified']);
    expect(artifactMarkerBlocksForgeEminence(next)).toBe(true);
    expect(isNullifiedFirstForgeExempt(next, 'p2', null)).toBe(true);
    expect(artifactMarkerBlocksForgeEminence(next, true)).toBe(true);
  });

  it('exempts only the allied player while the first Nullified forge remains unused', () => {
    const marker = {
      type: 'nullified' as const,
      ownerId: 'p1',
      summonedAtTurnCount: 4,
    };

    expect(isNullifiedFirstForgeExempt(marker, 'p1', null)).toBe(true);
    expect(isNullifiedFirstForgeExempt(marker, 'p2', null)).toBe(false);
    expect(isNullifiedFirstForgeExempt(marker, 'p1', { cardId: 'used' })).toBe(false);
    expect(artifactMarkerBlocksForgeEminence(marker, true)).toBe(false);
  });

  it('treats a refreshed persistent brand as a new strike without duplicating it', () => {
    const previous = {
      type: 'forgotten' as const,
      ownerId: 'p1',
      summonedAtTurnCount: 4,
    };
    const refreshed = {
      type: 'forgotten' as const,
      ownerId: 'p1',
      summonedAtTurnCount: 5,
    };

    expect(getAddedArtifactBrandTypes(previous, refreshed)).toEqual(['forgotten']);
    expect(getArtifactBrandTypes(refreshed)).toEqual(['forgotten']);
  });

  it('maps pending activation payloads to the exact brands awaiting presentation', () => {
    const pending = getPendingArtifactBrandTypes([
      {
        luminaryId: 'lum_compass',
        effectType: 'summon',
        targetCardIds: ['a', 'b'],
      },
      {
        luminaryId: 'lum_null',
        effectType: 'summon',
        targetCardIds: ['b'],
      },
      {
        luminaryId: 'lum_ember',
        effectType: 'end_of_turn',
        targetCardIds: ['c'],
      },
    ]);

    expect(pending.get('a')).toEqual(['forgotten']);
    expect(pending.get('b')).toEqual(['forgotten', 'nullified']);
    expect(pending.has('c')).toBe(false);
  });
});
