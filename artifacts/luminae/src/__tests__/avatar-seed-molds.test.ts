import { describe, expect, it } from 'vitest';
import { withPersistentAvatarSeedMolds } from '../pages/game-board-forge';

describe('persistent Avatar Seed molds', () => {
  it('keeps a vacated seeded mold visible after its row contracts', () => {
    const artifact = { id: 't1p01' };

    expect(withPersistentAvatarSeedMolds([artifact], 1, ['1-3'])).toEqual([
      artifact,
      null,
      null,
      null,
    ]);
  });

  it('does not pad unrelated tiers', () => {
    const artifact = { id: 't2p01' };

    expect(withPersistentAvatarSeedMolds([artifact], 2, ['1-3'])).toEqual([artifact]);
  });
});
