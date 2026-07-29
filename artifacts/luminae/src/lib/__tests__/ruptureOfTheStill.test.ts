import { describe, expect, it } from 'vitest';
import type { GameState } from '@workspace/api-client-react';
import { resolveLuminaryProcedure } from '@/lib/luminaryAnimationProcedures';

describe('Rupture of the Still animation procedure', () => {
  it('uses the server-captured Tier III targets without selecting replacement Artifacts', () => {
    const targetCardIds = ['tier3-a', 'tier3-b', 'tier3-c'];
    const steps = resolveLuminaryProcedure(
      'lum_moth',
      'summon',
      {} as GameState,
      'player-1',
      { targetCardIds },
    );

    expect(steps).toEqual([
      { type: 'luminaryPulse', luminaryId: 'lum_moth' },
      { type: 'targetClaim', targetIds: targetCardIds, keyword: 'burn' },
      {
        type: 'keywordEvents',
        events: [{ keyword: 'burn', targetIds: targetCardIds }],
      },
      { type: 'forgeRefill', slotIds: [] },
    ]);
  });
});
