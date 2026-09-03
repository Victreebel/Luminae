import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

  it('uses five natural-Affinity nodes around a separate identity core', () => {
    const source = readFileSync(
      resolve(__dirname, '../../assets/avatars/avatar_lumii.svg'),
      'utf8',
    );

    expect(source.match(/data-lumii-node="/g)).toHaveLength(5);
    expect(source).toContain('data-lumii-node-count="5"');
    expect(source).toContain('data-lumii-core-role="identity"');
    expect(source).toContain('data-lumii-node="flare" cx="64" cy="28" r="5" fill="#FF5A3C"');
    expect(source).toContain('data-lumii-node="radiance" cx="35" cy="52" r="5" fill="#DFC878"');
    expect(source).toContain('data-lumii-node="verdance" cx="82" cy="91" r="5" fill="#2ECC71"');
    expect(source).toContain('data-lumii-node="continuum" cx="93" cy="52" r="5" fill="#3D6BFF"');
    expect(source).toContain('data-lumii-node="abyss" cx="46" cy="91" r="5" fill="#A832D4"');
  });
});
