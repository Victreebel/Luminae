import avatarStargazer from '@/assets/avatars/avatar_stargazer.png';
import avatarForgemaster from '@/assets/avatars/avatar_forgemaster.png';
import avatarVoidcaller from '@/assets/avatars/avatar_voidcaller.png';
import avatarArchivist from '@/assets/avatars/avatar_archivist.png';
import avatarCultivator from '@/assets/avatars/avatar_cultivator.png';
import avatarSentinel from '@/assets/avatars/avatar_sentinel.png';
import avatarOracle from '@/assets/avatars/avatar_oracle.png';
import avatarSovereign from '@/assets/avatars/avatar_sovereign.png';

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

const AVATAR_MAP = new Map<string, AvatarDef>(AVATARS.map(a => [a.id, a]));

const DEFAULT_AVATAR_ID = 'stargazer';

const AVATAR_KEY = 'luminae_avatar';

export function getSavedAvatarId(): string {
  return localStorage.getItem(AVATAR_KEY) ?? DEFAULT_AVATAR_ID;
}

export function saveAvatarId(id: string): void {
  localStorage.setItem(AVATAR_KEY, id);
}

export function getAvatarForPlayer(avatarId?: string | null): AvatarDef {
  return AVATAR_MAP.get(avatarId ?? '') ?? AVATARS[0];
}
