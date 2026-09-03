// Central presentation metadata for five natural Affinities plus Singularity.
// Keys are stable transport/storage identifiers; player-facing code should use
// the names and visuals defined here rather than interpreting the key strings.

import {
  AFFINITY_KEYS,
  AFFINITY_NAMES,
  type AffinityKey,
} from '@workspace/game-types';

import radianceEmblem from '@assets/luminae_radiance_emblem_v2.png';
import flareEmblem from '@assets/generated_images/affinity_flare.png';
import continuumEmblem from '@assets/generated_images/affinity_continuum.png';
import verdanceEmblem from '@assets/generated_images/affinity_verdance.png';
import abyssEmblem from '@assets/generated_images/affinity_abyss.png';
import singularityEmblem from '@assets/luminae_singularity_emblem_v1.png';

export type { AffinityKey } from '@workspace/game-types';

export interface AffinityMeta {
  key: AffinityKey;
  name: string;
  shortName: string;
  hex: string;
  glowHex: string;
  image: string;
  tagline: string;
  /** Optional CSS filter applied to the base image pixels before any glow/shadow. */
  imageFilter?: string;
}

export const AFFINITY_META: Record<AffinityKey, AffinityMeta> = {
  radiance: {
    key: 'radiance',
    name: AFFINITY_NAMES.radiance,
    shortName: AFFINITY_NAMES.radiance,
    hex: '#DFC878',
    glowHex: '#F5E8B8',
    image: radianceEmblem,
    tagline: 'Clarity \u00b7 Protection',
  },
  flare: {
    key: 'flare',
    name: AFFINITY_NAMES.flare,
    shortName: AFFINITY_NAMES.flare,
    hex: '#FF5A3C',
    glowHex: '#FF8A6A',
    image: flareEmblem,
    tagline: 'Energy \u00b7 Passion',
  },
  continuum: {
    key: 'continuum',
    name: AFFINITY_NAMES.continuum,
    shortName: AFFINITY_NAMES.continuum,
    hex: '#3D6BFF',
    glowHex: '#7090FF',
    image: continuumEmblem,
    tagline: 'Time \u00b7 Order',
  },
  verdance: {
    key: 'verdance',
    name: AFFINITY_NAMES.verdance,
    shortName: AFFINITY_NAMES.verdance,
    hex: '#2ECC71',
    glowHex: '#5BE197',
    image: verdanceEmblem,
    tagline: 'Life \u00b7 Growth',
  },
  abyss: {
    key: 'abyss',
    name: AFFINITY_NAMES.abyss,
    shortName: AFFINITY_NAMES.abyss,
    hex: '#A832D4',
    glowHex: '#CC70F0',
    image: abyssEmblem,
    tagline: 'Void \u00b7 Gravity',
  },
  singularity: {
    key: 'singularity',
    name: AFFINITY_NAMES.singularity,
    shortName: AFFINITY_NAMES.singularity,
    hex: '#E8E4FF',
    glowHex: '#C8C0FF',
    image: singularityEmblem,
    tagline: 'Convergence \u00b7 Wildcard',
  },
};

export { AFFINITY_KEYS };
