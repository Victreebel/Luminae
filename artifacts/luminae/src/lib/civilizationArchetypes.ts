import type { AffinityKey } from '@workspace/game-types';
import { AFFINITY_META } from '@/lib/affinityMeta';
import type { CivilizationProfile } from '@/lib/civilizationProfile';

export type CivilizationArchetypeId =
  | 'living_arcology'
  | 'forge_spine'
  | 'containment_sentinel'
  | 'route_network'
  | 'accord_beacon'
  | 'archive_lattice';

export type CivilizationArchetypeScene = 'surface' | 'orbit' | 'stellar' | 'galaxy';

export interface CivilizationArchetypeSignals {
  living: boolean;
  foundry: boolean;
  hazard: boolean;
  luminary: boolean;
  route: boolean;
  redaction: boolean;
  blueprintCount: number;
}

export interface CivilizationArchetypeVisualRule {
  id: CivilizationArchetypeId;
  label: string;
  affinity: Exclude<AffinityKey, 'singularity'>;
  assetSlots: Record<CivilizationArchetypeScene, string>;
  compositionKey: string;
}

function archetypeAssetSlots(id: CivilizationArchetypeId): Record<CivilizationArchetypeScene, string> {
  return {
    surface: `civilization.archetype.${id}.surface`,
    orbit: `civilization.archetype.${id}.orbit`,
    stellar: `civilization.archetype.${id}.stellar`,
    galaxy: `civilization.archetype.${id}.galaxy`,
  };
}

export const CIVILIZATION_ARCHETYPE_VISUALS: Record<CivilizationArchetypeId, CivilizationArchetypeVisualRule> = {
  living_arcology: {
    id: 'living_arcology',
    label: 'Living Arcology',
    affinity: 'verdance',
    assetSlots: archetypeAssetSlots('living_arcology'),
    compositionKey: 'bio-canopy',
  },
  forge_spine: {
    id: 'forge_spine',
    label: 'Forge Spine',
    affinity: 'flare',
    assetSlots: archetypeAssetSlots('forge_spine'),
    compositionKey: 'ascent-spine',
  },
  containment_sentinel: {
    id: 'containment_sentinel',
    label: 'Containment Sentinel',
    affinity: 'abyss',
    assetSlots: archetypeAssetSlots('containment_sentinel'),
    compositionKey: 'quarantine-field',
  },
  route_network: {
    id: 'route_network',
    label: 'Route Network',
    affinity: 'continuum',
    assetSlots: archetypeAssetSlots('route_network'),
    compositionKey: 'transit-web',
  },
  accord_beacon: {
    id: 'accord_beacon',
    label: 'Accord Beacon',
    affinity: 'radiance',
    assetSlots: archetypeAssetSlots('accord_beacon'),
    compositionKey: 'treaty-aurora',
  },
  archive_lattice: {
    id: 'archive_lattice',
    label: 'Archive Lattice',
    affinity: 'continuum',
    assetSlots: archetypeAssetSlots('archive_lattice'),
    compositionKey: 'memory-citadel',
  },
};

export function deriveCivilizationArchetype(
  profile: CivilizationProfile,
  signals: CivilizationArchetypeSignals,
): CivilizationArchetypeId | null {
  const traits = new Set(profile.dominantTraits);
  if (profile.artifactCount === 0 && signals.blueprintCount === 0 && !signals.luminary) return null;
  if (signals.hazard || signals.redaction || traits.has('containment') || traits.has('veil')) return 'containment_sentinel';
  if (signals.living || traits.has('biosphere') || traits.has('replication') || traits.has('lattice')) return 'living_arcology';
  if (signals.foundry || traits.has('ignition') || traits.has('entropy')) return 'forge_spine';
  if (signals.route || traits.has('transit') || traits.has('chronology') || traits.has('aperture')) return 'route_network';
  if (signals.luminary || traits.has('accord')) return 'accord_beacon';
  if (traits.has('archive')) return 'archive_lattice';
  return profile.artifactCount > 0 ? 'archive_lattice' : null;
}

export function getCivilizationArchetypeTone(
  archetype: CivilizationArchetypeId,
  fallback: string,
): string {
  return AFFINITY_META[CIVILIZATION_ARCHETYPE_VISUALS[archetype].affinity].hex ?? fallback;
}

export function getCivilizationArchetypeAssetSlot(
  archetype: CivilizationArchetypeId,
  scene: CivilizationArchetypeScene,
): string {
  return CIVILIZATION_ARCHETYPE_VISUALS[archetype].assetSlots[scene];
}
