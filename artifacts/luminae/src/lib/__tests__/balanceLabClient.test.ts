import { describe, expect, it } from 'vitest';
import {
  balanceLabEncryptAwardsPortableSingularity,
  balanceLabFocusOptions,
  balanceLabRemovesLuminaryEminence,
  normalizeBalanceLabCandidate,
  resolveBalanceLabForgeCost,
} from '../balanceLabClient';

const player = {
  affinities: {
    flare: 1,
    radiance: 0,
    verdance: 0,
    continuum: 0,
    abyss: 0,
    singularity: 0,
  },
  forgedArtifactIds: [] as string[],
};

describe('balance laboratory client rules', () => {
  it('normalizes public laboratory aliases without enabling unknown values', () => {
    expect(normalizeBalanceLabCandidate('reach')).toBe('reach_gate');
    expect(normalizeBalanceLabCandidate('luminary-relationship')).toBe('luminary_relationship');
    expect(normalizeBalanceLabCandidate('not-a-rule')).toBeNull();
  });

  it('uses Focus only for the encrypted Artifact and never creates a portable token', () => {
    const ordinaryCost = { flare: 2, radiance: 1, verdance: 0, continuum: 0, abyss: 0 };
    const publicCost = resolveBalanceLabForgeCost({
      candidate: 'focus',
      card: { id: 't1r01', tier: 1 },
      player,
      ordinaryCost,
      fromReserve: false,
    });
    const reservedCost = resolveBalanceLabForgeCost({
      candidate: 'focus',
      card: { id: 't1r01', tier: 1 },
      player,
      ordinaryCost,
      fromReserve: true,
      focusAffinity: 'flare',
    });

    expect(publicCost.cost.flare).toBe(2);
    expect(reservedCost.cost.flare).toBe(1);
    expect(reservedCost.focusApplied).toBe(true);
    expect(balanceLabEncryptAwardsPortableSingularity('focus')).toBe(false);
    expect(balanceLabEncryptAwardsPortableSingularity('encrypt_none')).toBe(false);
  });

  it('offers every remaining component and applies the selected Focus requirement', () => {
    const ordinaryCost = { flare: 2, radiance: 0, verdance: 1, continuum: 0, abyss: 0 };
    expect(balanceLabFocusOptions({
      candidate: 'focus',
      ordinaryCost,
      fromReserve: true,
    })).toEqual(['flare', 'verdance']);
    expect(balanceLabFocusOptions({
      candidate: 'focus',
      ordinaryCost,
      fromReserve: false,
    })).toEqual([]);

    const selectedCost = resolveBalanceLabForgeCost({
      candidate: 'focus',
      card: { id: 't1r01', tier: 1 },
      player,
      ordinaryCost,
      fromReserve: true,
      focusAffinity: 'verdance',
    });
    expect(selectedCost.cost.flare).toBe(2);
    expect(selectedCost.cost.verdance).toBe(0);

    const awaitingChoice = resolveBalanceLabForgeCost({
      candidate: 'focus',
      card: { id: 't1r01', tier: 1 },
      player,
      ordinaryCost,
      fromReserve: true,
    });
    expect(awaitingChoice.cost.flare).toBe(2);
    expect(awaitingChoice.cost.verdance).toBe(1);
    expect(awaitingChoice.focusApplied).toBe(false);
  });

  it('requires a held natural Affinity for an otherwise free advanced Forge', () => {
    const withPayment = resolveBalanceLabForgeCost({
      candidate: 'payment_floor',
      card: { id: 't2r01', tier: 2 },
      player,
      ordinaryCost: {},
      fromReserve: false,
    });
    const withoutPayment = resolveBalanceLabForgeCost({
      candidate: 'payment_floor',
      card: { id: 't2r01', tier: 2 },
      player: { ...player, affinities: {} },
      ordinaryCost: {},
      fromReserve: false,
    });

    expect(withPayment.cost.flare).toBe(1);
    expect(withPayment.paymentFloorSatisfied).toBe(true);
    expect(withoutPayment.paymentFloorSatisfied).toBe(false);
  });

  it('lets a valid Built On predecessor waive the advanced payment floor', () => {
    const withLineage = resolveBalanceLabForgeCost({
      candidate: 'lineage_floor',
      card: { id: 't2r01', tier: 2 },
      player: { ...player, forgedArtifactIds: ['t1s04'] },
      ordinaryCost: { flare: 1 },
      fromReserve: false,
    });

    expect(withLineage.cost.flare).toBe(0);
    expect(withLineage.lineageApplied).toBe(true);
    expect(withLineage.paymentFloorSatisfied).toBe(true);
  });

  it('suppresses only the tested Luminary base-Eminence variants', () => {
    expect(balanceLabRemovesLuminaryEminence('luminary_relationship')).toBe(true);
    expect(balanceLabRemovesLuminaryEminence('integrated')).toBe(true);
    expect(balanceLabRemovesLuminaryEminence('control')).toBe(false);
  });
});
