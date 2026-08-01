import type { ArtifactCard } from '@workspace/api-client-react';

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
  ignition: 'Ignition works',
  biosphere: 'Living worlds',
  chronology: 'Chronology',
  transit: 'Transit lanes',
  archive: 'Memory archives',
  lattice: 'Civic lattices',
  veil: 'Veiled sectors',
  containment: 'Containment',
  replication: 'Replication',
  accord: 'Concordance',
  entropy: 'Entropy works',
  aperture: 'Deep apertures',
};

const ARTIFACT_IDS_BY_TRAIT: Record<CivilizationTrait, readonly string[]> = {
  ignition: [
    't1r01', 't1r03', 't1e03',
    't2r01', 't2r02',
    't3r01',
  ],
  biosphere: [
    't1r02', 't1r06', 't1e04', 't1e07', 't1e08', 't1p08',
    't2r04', 't2e01', 't2e04', 't2o05',
    't3e01', 't3e02', 't3e03',
  ],
  chronology: [
    't1r04', 't1s05', 't1p05', 't1o08',
    't2r05', 't2s03', 't2e02', 't2p05',
    't3s04',
  ],
  transit: [
    't1s02',
    't2r03', 't2s04',
    't3r04', 't3s01',
  ],
  archive: [
    't1s01', 't1s06', 't1s08',
    't2s02', 't2s05', 't2e05',
    't3r03', 't3s03', 't3o02',
  ],
  lattice: [
    't1s04', 't1s07', 't1p06',
    't2e06', 't2p04',
    't3p02',
  ],
  veil: [
    't1o01', 't1o04', 't1o05', 't1o07',
    't2o02',
    't3o01', 't3o03',
  ],
  containment: [
    't1r05', 't1s03', 't1p02', 't1p04',
    't2e03', 't2p01',
  ],
  replication: [
    't1e01', 't1e05', 't1p01',
    't2o04',
  ],
  accord: [
    't1r08',
    't2s06', 't2p02', 't2p03', 't2p06',
    't3r02', 't3s02', 't3e04', 't3p01', 't3p04',
  ],
  entropy: [
    't1r07', 't1e06', 't1o03', 't1o06',
    't2r06', 't2o03',
    't3p03',
  ],
  aperture: [
    't1e02', 't1o02', 't1p03', 't1p07',
    't2s01', 't2o01', 't2o06',
    't3o04',
  ],
};

const ARTIFACT_TRAITS = new Map<string, CivilizationTrait>(
  CIVILIZATION_TRAITS.flatMap((trait) => (
    ARTIFACT_IDS_BY_TRAIT[trait].map((artifactId) => [artifactId, trait] as const)
  )),
);

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
  return ARTIFACT_TRAITS.get(card.id) ?? fallbackTrait(card);
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
