import { describe, expect, it } from 'vitest';
import type { GameState } from '@workspace/api-client-react';
import { resolveLuminaryProcedure } from '../luminaryAnimationProcedures';

describe('Iron Harbinger Forge reset procedure', () => {
  it('returns the authoritative original Forge snapshot before randomizing and refilling', () => {
    const targetCardIds = [
      't3a', 't3b', 't3c', 't3d',
      't2a', 't2b', 't2c', 't2d',
      't1a', 't1b', 't1c', 't1d',
    ];
    const steps = resolveLuminaryProcedure(
      'lum_forge',
      'summon',
      {} as GameState,
      'p1',
      { targetCardIds },
    );

    expect(steps.map(step => step.type)).toEqual([
      'luminaryPulse',
      'targetClaim',
      'archiveReturn',
      'deckScry',
      'forgeRefill',
    ]);
    expect(steps).toContainEqual({
      type: 'archiveReturn',
      cardIds: targetCardIds,
    });
    expect(steps.some(step => step.type === 'keywordEvents')).toBe(false);
  });
});
