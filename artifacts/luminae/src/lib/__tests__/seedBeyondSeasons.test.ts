import { describe, expect, it } from 'vitest';
import type { GameState } from '@workspace/api-client-react';
import { resolveLuminaryProcedure } from '../luminaryAnimationProcedures';

const state: GameState = {
  ...({} as GameState),
  avatarSeedMoldSlots: ['1-2', '2-0', '3-3'],
  forgeTier1: [],
  forgeTier2: [],
  forgeTier3: [],
  players: [],
};

describe('Seed Beyond Seasons animation procedure', () => {
  it('frames the three permanent molds on arrival', () => {
    expect(resolveLuminaryProcedure('lum_seed', 'summon', state, 'p1')).toEqual([
      { type: 'luminaryPulse', luminaryId: 'lum_seed' },
      { type: 'targetClaim', targetIds: ['1-2', '2-0', '3-3'] },
    ]);
  });

  it('brands only the server-selected end-of-turn Artifacts', () => {
    expect(resolveLuminaryProcedure(
      'lum_seed',
      'end_of_turn',
      state,
      'p1',
      { targetCardIds: ['t1a', 't3c'] },
    )).toEqual([
      { type: 'luminaryPulse', luminaryId: 'lum_seed' },
      { type: 'targetClaim', targetIds: ['t1a', 't3c'], keyword: 'seeded' },
      { type: 'residue', keyword: 'seeded', targetIds: ['t1a', 't3c'] },
    ]);
  });

  it('routes a forged Seeded Artifact into its matching permanent Affinity gain', () => {
    expect(resolveLuminaryProcedure(
      'lum_seed',
      'action',
      state,
      'p1',
      {
        targetCardIds: ['t1a'],
        targetSlotIds: ['1-2'],
        affinityType: 'continuum',
        affinityAmount: 1,
      },
    )).toEqual([
      { type: 'luminaryPulse', luminaryId: 'lum_seed' },
      { type: 'targetClaim', targetIds: ['1-2'] },
      { type: 'affinityGain', playerIds: ['p1'], affinityType: 'continuum', amount: 1 },
    ]);
  });
});
