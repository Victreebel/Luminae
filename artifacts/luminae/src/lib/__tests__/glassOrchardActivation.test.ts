import { describe, expect, it } from 'vitest';
import type { GameState } from '@workspace/api-client-react';
import { resolveLuminaryProcedure } from '@/lib/luminaryAnimationProcedures';

describe('Glass Orchard activation procedure', () => {
  it('carries the triggering Artifact and copied Affinity into resolution', () => {
    const steps = resolveLuminaryProcedure(
      'lum_orchard',
      'action',
      {} as GameState,
      'player-1',
      {
        targetCardIds: ['t2p04'],
        affinityType: 'continuum',
        affinityAmount: 1,
      },
    );

    expect(steps).toEqual([
      { type: 'luminaryPulse', luminaryId: 'lum_orchard' },
      { type: 'targetClaim', targetIds: ['t2p04'] },
      {
        type: 'affinityGain',
        playerIds: ['player-1'],
        affinityType: 'continuum',
        amount: 1,
      },
    ]);
  });
});
