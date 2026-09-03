import avatarStargazer from '@/assets/avatars/avatar_stargazer.png';
import avatarForgemaster from '@/assets/avatars/avatar_forgemaster.png';
import avatarVoidcaller from '@/assets/avatars/avatar_voidcaller.png';
import avatarArchivist from '@/assets/avatars/avatar_archivist.png';
import avatarCultivator from '@/assets/avatars/avatar_cultivator.png';
import avatarSentinel from '@/assets/avatars/avatar_sentinel.png';
import avatarOracle from '@/assets/avatars/avatar_oracle.png';
import avatarSovereign from '@/assets/avatars/avatar_sovereign.png';
import avatarLumii from '@/assets/avatars/avatar_lumii.svg';

export interface AvatarDef {
  id: string;
  name: string;
  image: string;
  accent: string;
}

export const AVATARS: AvatarDef[] = [
  { id: 'stargazer',   name: 'Stargazer',   image: avatarStargazer,   accent: '#7c6fe0' },
  { id: 'forgemaster', name: 'Forgemaster', image: avatarForgemaster, accent: '#ff6b35' },
  { id: 'voidcaller',  name: 'Voidcaller',  image: avatarVoidcaller,  accent: '#9b59b6' },
  { id: 'archivist',   name: 'Archivist',   image: avatarArchivist,   accent: '#3d9be9' },
  { id: 'cultivator',  name: 'Cultivator',  image: avatarCultivator,  accent: '#2ecc71' },
  { id: 'sentinel',    name: 'Sentinel',    image: avatarSentinel,    accent: '#ecf0f1' },
  { id: 'oracle',      name: 'Oracle',      image: avatarOracle,      accent: '#ffc43d' },
  { id: 'sovereign',   name: 'Sovereign',   image: avatarSovereign,   accent: '#c0392b' },
];

export const LUMII_AVATAR_ID = 'lumii';

export const LUMII_AVATAR: AvatarDef = {
  id: LUMII_AVATAR_ID,
  name: 'Lumii',
  image: avatarLumii,
  accent: '#818cf8',
};

// System identities are renderable in matches but intentionally absent from
// AVATARS, which is the player-facing selection catalog.
const AVATAR_MAP = new Map<string, AvatarDef>([
  ...AVATARS.map(a => [a.id, a] as const),
  [LUMII_AVATAR.id, LUMII_AVATAR] as const,
]);

const DEFAULT_AVATAR_ID = 'stargazer';

const AVATAR_KEY = 'luminae_avatar';

export function getSavedAvatarId(): string {
  const saved = localStorage.getItem(AVATAR_KEY);
  return AVATARS.some(avatar => avatar.id === saved) ? saved! : DEFAULT_AVATAR_ID;
}

export function saveAvatarId(id: string): void {
  if (AVATARS.some(avatar => avatar.id === id)) {
    localStorage.setItem(AVATAR_KEY, id);
  }
}

export function getAvatarForPlayer(avatarId?: string | null): AvatarDef {
  return AVATAR_MAP.get(avatarId ?? '') ?? AVATARS[0];
}

const AVATAR_CIV_NAMES: Record<string, string> = {
  stargazer:   'The Astral Observatory',
  forgemaster: 'The Iron Foundry',
  voidcaller:  'The Void Dominion',
  archivist:   'The Eternal Archive',
  cultivator:  'The Living Canopy',
  sentinel:    'The Radiant Bastion',
  oracle:      'The Farseer Circle',
  sovereign:   'The Grand Sovereignty',
};

/**
 * Returns a thematic civilization name derived from the given avatar ID.
 * Falls back to a generic name using the player's display name.
 */
export function getDefaultCivName(avatarId: string | null | undefined, playerName: string | undefined): string {
  if (avatarId && AVATAR_CIV_NAMES[avatarId]) {
    return AVATAR_CIV_NAMES[avatarId];
  }
  return `${playerName ?? 'Unknown'}'s Civilization`;
}
