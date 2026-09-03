import { beforeEach, describe, expect, it } from 'vitest';
import {
  AVATARS,
  LUMII_AVATAR_ID,
  getAvatarForPlayer,
  getSavedAvatarId,
  saveAvatarId,
} from '@/lib/avatars';

describe('Lumii avatar availability', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders as a system avatar without appearing in the player catalog', () => {
    expect(AVATARS.some(avatar => avatar.id === LUMII_AVATAR_ID)).toBe(false);
    expect(getAvatarForPlayer(LUMII_AVATAR_ID)).toMatchObject({
      id: LUMII_AVATAR_ID,
      name: 'Lumii',
    });
  });

  it('cannot be persisted as a player-selected avatar', () => {
    saveAvatarId(LUMII_AVATAR_ID);

    expect(localStorage.getItem('luminae_avatar')).toBeNull();
    expect(getSavedAvatarId()).toBe('stargazer');
  });
});
