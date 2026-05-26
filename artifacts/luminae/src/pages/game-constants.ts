import { GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import cardTier1Bg from '@assets/generated_images/card_tier1.png';
import cardTier3Bg from '@assets/generated_images/card_tier3.png';

export function hexRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

const CARD_ART_MODULES = import.meta.glob(
  '../assets/cards/*.png',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;
export const CARD_ART: Record<string, string> = {};
for (const [path, url] of Object.entries(CARD_ART_MODULES)) {
  const id = path.split('/').pop()!.replace('.png', '');
  CARD_ART[id] = url;
}

export const CRYSTALS: GemKey[] = GEM_KEYS;

export const TIER_BACKDROPS: Record<number, string> = {
  1: cardTier1Bg,
  3: cardTier3Bg,
};

export const TIER_CIVILIZATION: Record<number, string> = {
  1: 'Planetary',
  2: 'Stellar',
  3: 'Galactic',
};

export const GEM_CARD_GRADIENTS: Record<string, string> = {
  ruby:     'linear-gradient(175deg, #1a0404 0%, #3d0808 35%, #220505 70%, #100202 100%)',
  sapphire: 'linear-gradient(175deg, #020510 0%, #071840 35%, #040a28 70%, #020510 100%)',
  emerald:  'linear-gradient(175deg, #021005 0%, #063020 35%, #041a10 70%, #020c04 100%)',
  onyx:     'linear-gradient(175deg, #060606 0%, #181818 35%, #0e0e0e 70%, #050505 100%)',
  pearl:    'linear-gradient(175deg, #100c02 0%, #2a2008 35%, #1c1606 70%, #0c0a02 100%)',
  flux:     'linear-gradient(175deg, #08080f 0%, #141428 35%, #0e0e1e 70%, #08080f 100%)',
};

export const GEM_KEY_TO_HEX: Record<string, string> = {
  ruby:     '#ff5a3c',
  sapphire: '#60a5fa',
  emerald:  '#2ecc71',
  onyx:     '#0f172a',
  pearl:    '#DFC878',
  flux:     '#E8E4FF',
};

export const opponentTurnVariants = {
  idle:   { scale: 1 },
  active: { scale: [1, 1.14, 1], transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] as const } },
};

export const localTurnVariants = {
  idle:   { scale: 1 },
  active: { scale: [1, 1.07, 1], transition: { duration: 0.4,  ease: [0.34, 1.56, 0.64, 1] as const } },
};
