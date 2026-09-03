import type { ArtifactCard } from '@workspace/api-client-react';
import {
  ARTIFACT_LINEAGE_BY_ID,
  type ArtifactId,
  type TechnologyLineage,
} from '@workspace/game-types';

export const CIVILIZATION_TRAITS = [
  'ignition',
  'biosphere',
  'chronology',
  'transit',
  'archive',
  'lattice',
  'veil',
  'containment',
  'replication',
  'accord',
  'entropy',
  'aperture',
] as const;

export type CivilizationTrait = (typeof CIVILIZATION_TRAITS)[number];

export const CIVILIZATION_TRAIT_LABELS: Record<CivilizationTrait, string> = {
  ignition: 'Reactor district',
  biosphere: 'Biosphere arcology',
  chronology: 'Chronometric array',
  transit: 'Transit gate',
  archive: 'Archive citadel',
  lattice: 'Linked habitats',
  veil: 'Veil emitter field',
  containment: 'Containment vault',
  replication: 'Fabrication yard',
  accord: 'Concord complex',
  entropy: 'Entropy furnace',
  aperture: 'Aperture station',
};

const LINEAGE_TRAIT: Record<TechnologyLineage, CivilizationTrait> = {
  energy: 'ignition',
  ecology: 'biosphere',
  causality: 'chronology',
  transit: 'transit',
  memory: 'archive',
  infrastructure: 'lattice',
  concealment: 'veil',
  containment: 'containment',
  fabrication: 'replication',
  accord: 'accord',
  reclamation: 'entropy',
  boundary_science: 'aperture',
};

type ArtifactAffinity = ArtifactCard['bonusAffinity'];

export interface CivilizationLandmark {
  artifactId: string;
  artifactName: string;
  affinity: ArtifactAffinity;
  trait: CivilizationTrait;
  tier: number;
  eminence: number;
  seed: number;
}

export interface CivilizationProfile {
  key: string;
  seed: number;
  artifactCount: number;
  affinityCounts: Record<ArtifactAffinity, number>;
  traitCounts: Record<CivilizationTrait, number>;
  traitWeights: Record<CivilizationTrait, number>;
  dominantTraits: CivilizationTrait[];
  landmarks: CivilizationLandmark[];
}

function emptyTraitRecord(): Record<CivilizationTrait, number> {
  return Object.fromEntries(
    CIVILIZATION_TRAITS.map((trait) => [trait, 0]),
  ) as Record<CivilizationTrait, number>;
}

function emptyAffinityRecord(): Record<ArtifactAffinity, number> {
  return {
    flare: 0,
    continuum: 0,
    verdance: 0,
    abyss: 0,
    radiance: 0,
  };
}

export function hashCivilizationValue(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function fallbackTrait(card: ArtifactCard): CivilizationTrait {
  const affinityFallbacks: Record<ArtifactAffinity, readonly CivilizationTrait[]> = {
    flare: ['ignition', 'transit', 'entropy'],
    continuum: ['chronology', 'archive', 'transit'],
    verdance: ['biosphere', 'replication', 'lattice'],
    abyss: ['veil', 'entropy', 'aperture'],
    radiance: ['accord', 'containment', 'lattice'],
  };
  const options = affinityFallbacks[card.bonusAffinity];
  return options[hashCivilizationValue(card.id) % options.length]!;
}

export function getArtifactCivilizationTrait(card: ArtifactCard): CivilizationTrait {
  const lineage = ARTIFACT_LINEAGE_BY_ID[card.id as ArtifactId];
  return lineage ? LINEAGE_TRAIT[lineage] : fallbackTrait(card);
}

function landmarkPriority(landmark: CivilizationLandmark): number {
  return landmark.tier * 100 + landmark.eminence * 10;
}

function selectLandmarks(candidates: CivilizationLandmark[], limit: number): CivilizationLandmark[] {
  const ranked = [...candidates].sort((left, right) => (
    landmarkPriority(right) - landmarkPriority(left) ||
    left.artifactId.localeCompare(right.artifactId)
  ));
  const selected: CivilizationLandmark[] = [];
  const representedTraits = new Set<CivilizationTrait>();

  for (const candidate of ranked) {
    if (representedTraits.has(candidate.trait)) continue;
    selected.push(candidate);
    representedTraits.add(candidate.trait);
    if (selected.length === limit) return selected;
  }

  for (const candidate of ranked) {
    if (selected.some((landmark) => landmark.artifactId === candidate.artifactId)) continue;
    selected.push(candidate);
    if (selected.length === limit) break;
  }

  return selected;
}

export function buildCivilizationProfile(
  forgedArtifacts: ReadonlyArray<ArtifactCard>,
): CivilizationProfile {
  const traitCounts = emptyTraitRecord();
  const traitWeights = emptyTraitRecord();
  const affinityCounts = emptyAffinityRecord();
  const landmarks: CivilizationLandmark[] = [];

  forgedArtifacts.forEach((card) => {
    const trait = getArtifactCivilizationTrait(card);
    traitCounts[trait] += 1;
    traitWeights[trait] += card.tier * 2 + Math.max(0, card.eminence);
    affinityCounts[card.bonusAffinity] += 1;
    landmarks.push({
      artifactId: card.id,
      artifactName: card.name,
      affinity: card.bonusAffinity,
      trait,
      tier: card.tier,
      eminence: card.eminence,
      seed: hashCivilizationValue(card.id),
    });
  });

  const dominantTraits = CIVILIZATION_TRAITS
    .filter((trait) => traitCounts[trait] > 0)
    .sort((left, right) => (
      traitWeights[right] - traitWeights[left] ||
      CIVILIZATION_TRAITS.indexOf(left) - CIVILIZATION_TRAITS.indexOf(right)
    ));
  const firstArtifactId = forgedArtifacts[0]?.id ?? 'luminae';
  const key = forgedArtifacts.map((card) => card.id).join('|') || 'unforged';

  return {
    key,
    seed: hashCivilizationValue(firstArtifactId),
    artifactCount: forgedArtifacts.length,
    affinityCounts,
    traitCounts,
    traitWeights,
    dominantTraits,
    landmarks: selectLandmarks(landmarks, 6),
  };
}

export const EMPTY_CIVILIZATION_PROFILE = buildCivilizationProfile([]);
