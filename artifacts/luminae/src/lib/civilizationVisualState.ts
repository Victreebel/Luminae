import type {
  CivilizationPublicState,
} from '@workspace/api-client-react';
import {
  CIVILIZATION_DYAD_DEFINITIONS,
  getCivilizationDyad,
  type CivilizationAffinityIdentity,
  type CivilizationDyadId,
  type CivilizationIdentityLayer,
  type CivilizationIdentityStatus,
  type StandardAffinityKey,
} from '@workspace/game-types';
import type { KardashevTier } from '@/lib/kardashev';
import { AFFINITY_META } from '@/lib/affinityMeta';
import type { CivilizationArchetypeId } from '@/lib/civilizationArchetypes';
import type { CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';
import type { CivilizationProfile } from '@/lib/civilizationProfile';

export const CIVILIZATION_SCENE_KINDS = ['surface', 'orbit', 'stellar', 'galaxy'] as const;

export type CivilizationSceneKind = (typeof CIVILIZATION_SCENE_KINDS)[number];
export type CivilizationComplexityStage = 0 | 1 | 2 | 3;
export type CivilizationSettlementPhase = 'wilderness' | 'nucleus' | 'city' | 'metropolis';
export type CivilizationCityDevelopmentStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type CivilizationCityDevelopmentLabel =
  | 'Non-Artifact Landscape'
  | 'First Civic Nucleus'
  | 'Young City'
  | 'Expanding City'
  | 'Established City'
  | 'Planetary Metropolis'
  | 'Stellar Conversion'
  | 'Stellar Metropolis'
  | 'Galactic Conversion'
  | 'Galactic Metropolis';
export type CivilizationReachPresentation =
  | 'operational'
  | 'degraded'
  | 'fractured'
  | 'historical'
  | 'unknown';

type NaturalAffinity = StandardAffinityKey;
type CivilizationMaturity = 'planetary' | 'stellar' | 'galactic';

export type CivilizationMorphologyId =
  | CivilizationDyadId
  | `singular-${NaturalAffinity}`
  | 'plural'
  | 'unformed';

export interface CivilizationDyadVisualRule {
  id: CivilizationDyadId;
  label: string;
  affinities: readonly [NaturalAffinity, NaturalAffinity];
  plateArchetype: CivilizationArchetypeId;
  composition:
    | 'radial-convergence'
    | 'kinetic-helix'
    | 'incandescent-branching'
    | 'armored-metamorphosis'
    | 'harmonic-orbits'
    | 'luminous-canopy'
    | 'occluded-corona'
    | 'braided-lineage'
    | 'recursive-echo'
    | 'spore-lattice';
}

export const CIVILIZATION_DYAD_VISUALS: Record<CivilizationDyadId, CivilizationDyadVisualRule> = {
  vortex: {
    id: 'vortex',
    label: 'Vortex',
    affinities: ['flare', 'radiance'],
    plateArchetype: 'accord_beacon',
    composition: 'radial-convergence',
  },
  flux: {
    id: 'flux',
    label: 'Flux',
    affinities: ['flare', 'continuum'],
    plateArchetype: 'route_network',
    composition: 'kinetic-helix',
  },
  bloom: {
    id: 'bloom',
    label: 'Bloom',
    affinities: ['flare', 'verdance'],
    plateArchetype: 'living_arcology',
    composition: 'incandescent-branching',
  },
  chrysalis: {
    id: 'chrysalis',
    label: 'Chrysalis',
    affinities: ['flare', 'abyss'],
    plateArchetype: 'containment_sentinel',
    composition: 'armored-metamorphosis',
  },
  orbit: {
    id: 'orbit',
    label: 'Orbit',
    affinities: ['radiance', 'continuum'],
    plateArchetype: 'route_network',
    composition: 'harmonic-orbits',
  },
  canopy: {
    id: 'canopy',
    label: 'Canopy',
    affinities: ['radiance', 'verdance'],
    plateArchetype: 'living_arcology',
    composition: 'luminous-canopy',
  },
  eclipse: {
    id: 'eclipse',
    label: 'Eclipse',
    affinities: ['radiance', 'abyss'],
    plateArchetype: 'containment_sentinel',
    composition: 'occluded-corona',
  },
  lineage: {
    id: 'lineage',
    label: 'Lineage',
    affinities: ['continuum', 'verdance'],
    plateArchetype: 'route_network',
    composition: 'braided-lineage',
  },
  echo: {
    id: 'echo',
    label: 'Echo',
    affinities: ['continuum', 'abyss'],
    plateArchetype: 'archive_lattice',
    composition: 'recursive-echo',
  },
  spore: {
    id: 'spore',
    label: 'Spore',
    affinities: ['verdance', 'abyss'],
    plateArchetype: 'living_arcology',
    composition: 'spore-lattice',
  },
};

export interface CivilizationVisualIdentity {
  layer: CivilizationIdentityLayer | null;
  status: CivilizationIdentityStatus;
  form: CivilizationAffinityIdentity['form'];
  key: string;
  label: string;
  morphologyId: CivilizationMorphologyId;
  dyad: CivilizationDyadId | null;
  primaryAffinity: NaturalAffinity | null;
  secondaryAffinity: NaturalAffinity | null;
  thirdAffinity: NaturalAffinity | null;
  primaryTone: string;
  secondaryTone: string;
  thirdTone: string | null;
  plateArchetype: CivilizationArchetypeId | null;
  seed: number;
}

export interface CivilizationSceneProgress {
  stage: CivilizationComplexityStage;
  label: 'Foundation' | 'Established' | 'Integrated' | 'Ascendant';
  score: number;
  artifactCount: number;
  settlementPhase: CivilizationSettlementPhase;
  cityDevelopmentStage: CivilizationCityDevelopmentStage;
  cityDevelopmentLabel: CivilizationCityDevelopmentLabel;
  unlocked: boolean;
  reach: CivilizationReachPresentation;
}

export interface CivilizationVisualMilestone {
  id: string;
  kind: 'artifact' | 'blueprint' | 'luminary' | 'protocol' | 'chronicle' | 'condition' | 'event' | 'maturity';
  artifactId: string | null;
  label: string;
  detail: string;
  turnCount: number | null;
  tone: string;
  siteId: string | null;
  scene: CivilizationSceneKind | null;
  outcome?: 'success' | 'failure';
}

export interface CivilizationVisualState {
  /** Compatibility alias; scene rendering must use `identities[scene]`. */
  identity: CivilizationVisualIdentity;
  identities: Record<CivilizationSceneKind, CivilizationVisualIdentity>;
  historicalMaturity: CivilizationMaturity;
  currentReach: CivilizationPublicState['scale']['currentReach'];
  currentReachCondition: CivilizationPublicState['scale']['currentReachCondition'];
  globalComplexity: CivilizationComplexityStage;
  globalComplexityLabel: CivilizationSceneProgress['label'];
  globalComplexityScore: number;
  artifactCount: number;
  settlementPhase: CivilizationSettlementPhase;
  cityDevelopmentStage: CivilizationCityDevelopmentStage;
  cityDevelopmentLabel: CivilizationCityDevelopmentLabel;
  scenes: Record<CivilizationSceneKind, CivilizationSceneProgress>;
  milestones: CivilizationVisualMilestone[];
}

export interface DeriveCivilizationVisualStateInput {
  civilization?: CivilizationPublicState | null;
  deploymentSites: readonly CivilizationDeploymentSite[];
  profile: CivilizationProfile;
  fallbackTier: KardashevTier;
}

const MATURITY_INDEX: Record<CivilizationMaturity, number> = {
  planetary: 0,
  stellar: 1,
  galactic: 2,
};

const SCENE_REQUIRED_MATURITY: Record<CivilizationSceneKind, CivilizationMaturity> = {
  surface: 'planetary',
  orbit: 'planetary',
  stellar: 'stellar',
  galaxy: 'galactic',
};

const SCENE_IDENTITY_LAYER: Record<CivilizationSceneKind, CivilizationIdentityLayer> = {
  surface: 'city',
  orbit: 'planet',
  stellar: 'system',
  galaxy: 'galaxy',
};

const COMPLEXITY_LABELS: Record<CivilizationComplexityStage, CivilizationSceneProgress['label']> = {
  0: 'Foundation',
  1: 'Established',
  2: 'Integrated',
  3: 'Ascendant',
};

export const CIVILIZATION_CITY_DEVELOPMENT_LABELS: Record<
  CivilizationCityDevelopmentStage,
  CivilizationCityDevelopmentLabel
> = {
  0: 'Non-Artifact Landscape',
  1: 'First Civic Nucleus',
  2: 'Young City',
  3: 'Expanding City',
  4: 'Established City',
  5: 'Planetary Metropolis',
  6: 'Stellar Conversion',
  7: 'Stellar Metropolis',
  8: 'Galactic Conversion',
  9: 'Galactic Metropolis',
};

const SINGULAR_ARCHETYPES: Record<NaturalAffinity, CivilizationArchetypeId> = {
  flare: 'forge_spine',
  radiance: 'accord_beacon',
  verdance: 'living_arcology',
  continuum: 'route_network',
  abyss: 'containment_sentinel',
};

function hash(value: string): number {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function fallbackMaturity(tier: KardashevTier): CivilizationMaturity {
  if (tier >= 3) return 'galactic';
  if (tier >= 2) return 'stellar';
  return 'planetary';
}

function fallbackIdentity(profile: CivilizationProfile): CivilizationAffinityIdentity {
  const affinities: NaturalAffinity[] = ['flare', 'radiance', 'verdance', 'continuum', 'abyss'];
  const historicalCounts = Object.fromEntries(
    affinities.map((affinity) => [affinity, profile.affinityCounts[affinity] ?? 0]),
  ) as Record<NaturalAffinity, number>;
  const rankedAffinities = affinities
    .map((affinity) => ({
      affinity,
      historicalWeight: historicalCounts[affinity],
      operationalWeight: historicalCounts[affinity],
    }))
    .sort((left, right) => right.historicalWeight - left.historicalWeight || affinities.indexOf(left.affinity) - affinities.indexOf(right.affinity));
  const total = rankedAffinities.reduce((sum, entry) => sum + entry.historicalWeight, 0);
  const primary = rankedAffinities[0]!;
  const secondary = rankedAffinities[1]!;
  const third = rankedAffinities[2]!;
  const primaryWeight = primary.historicalWeight;
  const topTieCount = primaryWeight > 0
    ? rankedAffinities.filter((entry) => entry.historicalWeight === primaryWeight).length
    : 0;
  const secondaryToPrimaryRatio = primaryWeight > 0 ? secondary.historicalWeight / primaryWeight : 0;
  const thirdToPrimaryRatio = primaryWeight > 0 ? third.historicalWeight / primaryWeight : 0;
  const plural = topTieCount >= 3;
  const dyad = !plural && secondaryToPrimaryRatio >= 0.45
    ? getCivilizationDyad(primary.affinity, secondary.affinity)
    : null;
  const normalizedHistoricalShares = Object.fromEntries(affinities.map((affinity) => [
    affinity,
    total > 0 ? historicalCounts[affinity] / total : 0,
  ])) as Record<NaturalAffinity, number>;

  return {
    policyId: 'provisional-ratio-v1',
    form: total === 0 ? 'unformed' : plural ? 'plural' : dyad ? 'dyad' : 'singular',
    historicalCounts,
    operationalCounts: historicalCounts,
    rankedAffinities,
    dominantAffinity: topTieCount === 1 ? primary.affinity : null,
    dominantDyad: dyad?.id ?? null,
    foundingDyad: dyad?.id ?? null,
    presentationDyad: dyad?.id ?? null,
    identityEpochs: dyad ? [{
      epochIndex: 0,
      dyad: dyad.id,
      startedTurnCount: null,
      endedTurnCount: null,
      historicalSharesAtStart: normalizedHistoricalShares,
      historyEvidence: 'legacy_inferred',
    }] : [],
    normalizedHistoricalShares,
    normalizedOperationalShares: normalizedHistoricalShares,
    thirdAffinity: dyad && thirdToPrimaryRatio >= 0.45 ? third.affinity : null,
    dominantShare: total > 0 ? primaryWeight / total : 0,
    secondaryToPrimaryRatio,
    thirdToPrimaryRatio,
  };
}

function rankedNaturalAffinities(identity: CivilizationAffinityIdentity): NaturalAffinity[] {
  return identity.rankedAffinities
    .filter((entry) => entry.historicalWeight > 0)
    .map((entry) => entry.affinity as NaturalAffinity);
}

function deriveVisualIdentity(
  identity: CivilizationAffinityIdentity,
  layer: CivilizationIdentityLayer | null = null,
  status: CivilizationIdentityStatus = identity.form === 'unformed' ? 'plain' : 'committed',
): CivilizationVisualIdentity {
  const ranked = rankedNaturalAffinities(identity);
  const dyad = (identity.presentationDyad ?? identity.dominantDyad) as CivilizationDyadId | null;
  const rule = dyad ? CIVILIZATION_DYAD_VISUALS[dyad] : null;
  const dyadAffinities = rule?.affinities ?? null;
  const rankedDyadAffinities = dyadAffinities
    ? ranked.filter((affinity) => dyadAffinities.includes(affinity)).slice(0, 2)
    : [];
  const primaryAffinity = (rankedDyadAffinities[0] ?? identity.dominantAffinity ?? ranked[0] ?? null) as NaturalAffinity | null;
  const secondaryAffinity = (rankedDyadAffinities[1]
    ?? dyadAffinities?.find((affinity) => affinity !== primaryAffinity)
    ?? (identity.form === 'plural' ? ranked[1] : null)
    ?? null) as NaturalAffinity | null;
  const thirdAffinity = identity.thirdAffinity as NaturalAffinity | null;
  const morphologyId: CivilizationMorphologyId = dyad
    ?? (identity.form === 'plural'
      ? 'plural'
      : primaryAffinity
        ? `singular-${primaryAffinity}`
        : 'unformed');
  const label = rule
    ? `${rule.label} Dyad`
    : identity.form === 'plural'
      ? 'Plural Civilization'
      : primaryAffinity
        ? `${capitalize(primaryAffinity)} Civilization`
        : 'Unformed Civilization';
  const key = `${morphologyId}:${thirdAffinity ?? 'none'}`;

  return {
    layer,
    status,
    form: identity.form,
    key,
    label,
    morphologyId,
    dyad,
    primaryAffinity,
    secondaryAffinity,
    thirdAffinity,
    primaryTone: primaryAffinity ? AFFINITY_META[primaryAffinity].hex : '#82ddff',
    secondaryTone: secondaryAffinity ? AFFINITY_META[secondaryAffinity].hex : '#dfb86b',
    thirdTone: thirdAffinity ? AFFINITY_META[thirdAffinity].hex : null,
    plateArchetype: rule?.plateArchetype ?? (primaryAffinity ? SINGULAR_ARCHETYPES[primaryAffinity] : null),
    seed: hash(key),
  };
}

function complexityScore(
  civilization: CivilizationPublicState | null | undefined,
  deploymentSites: readonly CivilizationDeploymentSite[],
): number {
  const artifactTierById = new Map(
    deploymentSites
      .filter((site) => site.kind === 'artifact' && site.artifactId)
      .map((site) => [site.artifactId!, Math.max(1, site.artifactTier ?? 1)]),
  );
  const artifactScore = civilization
    ? civilization.artifacts.reduce((total, artifact) => (
        total + (artifactTierById.get(artifact.artifactId) ?? 1) * Math.min(2, Math.max(1, artifact.masteryCount))
      ), 0)
    : deploymentSites
        .filter((site) => site.kind === 'artifact')
        .reduce((total, site) => total + Math.max(1, site.artifactTier ?? 1), 0);
  const uniqueSites = (kind: CivilizationDeploymentSite['kind']) => new Set(
    deploymentSites.filter((site) => site.kind === kind).map((site) => site.id),
  ).size;
  const projectScore = uniqueSites('blueprint') * 3;
  const luminaryScore = uniqueSites('luminary') * 2;
  const chronicleScore = uniqueSites('chronicle');
  const eventScore = Math.min(6, civilization?.events.length ?? 0);
  return artifactScore + projectScore + luminaryScore + chronicleScore + eventScore;
}

function toComplexityStage(score: number, maturity: CivilizationMaturity): CivilizationComplexityStage {
  const scoreStage: CivilizationComplexityStage = score <= 0 ? 0 : score < 7 ? 1 : score < 17 ? 2 : 3;
  const maturityFloor: CivilizationComplexityStage = maturity === 'galactic' ? 3 : maturity === 'stellar' ? 2 : score > 0 ? 1 : 0;
  return Math.max(scoreStage, maturityFloor) as CivilizationComplexityStage;
}

function countUniqueArtifacts(
  civilization: CivilizationPublicState | null | undefined,
  deploymentSites: readonly CivilizationDeploymentSite[],
  profile: CivilizationProfile,
): number {
  if (civilization) {
    return new Set(civilization.artifacts.map((artifact) => artifact.artifactId)).size;
  }

  const deploymentCount = new Set(
    deploymentSites
      .filter((site) => site.kind === 'artifact')
      .map((site) => site.artifactId ?? site.id),
  ).size;
  return Math.max(profile.artifactCount, deploymentCount);
}

function settlementPhaseForArtifactCount(artifactCount: number): CivilizationSettlementPhase {
  if (artifactCount <= 0) return 'wilderness';
  if (artifactCount === 1) return 'nucleus';
  if (artifactCount < 7) return 'city';
  return 'metropolis';
}

/**
 * The city has a longer visual history than the four camera-scale complexity
 * bands. Early Artifact counts establish three cumulative urban eras before
 * mature planetary, stellar, and galactic capability reshape that same city.
 */
export interface CivilizationCityDevelopmentContext {
  stellarArrivalArtifactCount?: number | null;
  galacticArrivalArtifactCount?: number | null;
  legacyCompleted?: boolean;
}

function infrastructureStageForArtifactCount(
  artifactCount: number,
): CivilizationCityDevelopmentStage {
  if (artifactCount <= 0) return 0;
  if (artifactCount === 1) return 1;
  if (artifactCount < 5) return 2;
  if (artifactCount < 8) return 3;
  if (artifactCount < 10) return 4;
  if (artifactCount < 11) return 5;
  if (artifactCount < 12) return 6;
  if (artifactCount < 13) return 7;
  if (artifactCount < 14) return 8;
  return 9;
}

export function deriveCivilizationCityDevelopmentStage(
  artifactCount: number,
  maturity: CivilizationMaturity,
  context: CivilizationCityDevelopmentContext = {},
): CivilizationCityDevelopmentStage {
  const infrastructureStage = infrastructureStageForArtifactCount(artifactCount);
  if (maturity === 'planetary') return Math.min(infrastructureStage, 5) as CivilizationCityDevelopmentStage;

  if (maturity === 'stellar') {
    const arrivalCount = context.stellarArrivalArtifactCount ?? artifactCount;
    const technologyStage = artifactCount > arrivalCount ? 7 : 6;
    return Math.min(infrastructureStage, technologyStage) as CivilizationCityDevelopmentStage;
  }

  const arrivalCount = context.galacticArrivalArtifactCount ?? artifactCount;
  const technologyStage = artifactCount > arrivalCount || context.legacyCompleted ? 9 : 8;
  return Math.min(infrastructureStage, technologyStage) as CivilizationCityDevelopmentStage;
}

function sceneComplexityStage(
  scene: CivilizationSceneKind,
  maturity: CivilizationMaturity,
  artifactCount: number,
  legacyCompleted: boolean,
): CivilizationComplexityStage {
  if (MATURITY_INDEX[maturity] < MATURITY_INDEX[SCENE_REQUIRED_MATURITY[scene]]) return 0;

  if (maturity === 'planetary') {
    return artifactCount > 0 ? 1 : 0;
  }

  if (maturity === 'stellar') {
    return 2;
  }

  if (scene === 'galaxy') {
    return legacyCompleted ? 3 : 2;
  }

  return 3;
}

function sceneReach(
  scene: CivilizationSceneKind,
  currentReach: CivilizationPublicState['scale']['currentReach'],
  condition: CivilizationPublicState['scale']['currentReachCondition'],
): CivilizationReachPresentation {
  if (currentReach === 'unknown' || condition === 'unknown') return 'unknown';
  const required = SCENE_REQUIRED_MATURITY[scene];
  if (MATURITY_INDEX[currentReach] < MATURITY_INDEX[required]) return 'historical';
  if (condition === 'fractured') return 'fractured';
  if (condition === 'degraded') return 'degraded';
  return 'operational';
}

function siteScene(site: CivilizationDeploymentSite): CivilizationSceneKind {
  if (site.nativeArtworkLayer) return site.nativeArtworkLayer;
  if (site.scaleBand === 'galactic') return 'galaxy';
  if (site.scaleBand === 'stellar') return 'stellar';
  return 'orbit';
}

function deriveMilestones(
  civilization: CivilizationPublicState | null | undefined,
  deploymentSites: readonly CivilizationDeploymentSite[],
  maturity: CivilizationMaturity,
): CivilizationVisualMilestone[] {
  const siteByArtifactId = new Map(
    deploymentSites
      .filter((site) => site.artifactId)
      .map((site) => [site.artifactId!, site]),
  );
  const artifactMilestones = (civilization?.artifacts ?? []).map((artifact): CivilizationVisualMilestone => {
    const site = siteByArtifactId.get(artifact.artifactId);
    const state = artifact.implementationState;
    return {
      id: `artifact:${artifact.artifactId}`,
      kind: 'artifact',
      artifactId: artifact.artifactId,
      label: site?.title ?? artifact.artifactId,
      detail: state === 'operational'
        ? 'Implemented Artifact'
        : state === 'damaged'
          ? 'Damaged implementation retained in history'
          : state === 'annihilated'
            ? 'Annihilated implementation retained in history'
            : 'Archived implementation retained in history',
      turnCount: artifact.firstMasteredTurnCount,
      tone: site ? AFFINITY_META[site.affinity].hex : '#82ddff',
      siteId: site?.id ?? null,
      scene: site ? siteScene(site) : null,
    };
  });
  const eventMilestones = (civilization?.events ?? []).map((event): CivilizationVisualMilestone => ({
    id: `event:${event.eventId}`,
    kind: 'event',
    artifactId: null,
    label: event.summary,
    detail: event.pressureTags.length > 0
      ? event.pressureTags.map(capitalize).join(' / ')
      : capitalize(event.sourceType),
    turnCount: event.turnCount,
    tone: event.outcome === 'success' ? '#8dd9b0' : '#ef927d',
    siteId: null,
    scene: null,
    outcome: event.outcome,
  }));
  const conditionMilestones = (civilization?.activeConditions ?? []).map((condition, index): CivilizationVisualMilestone => ({
    id: `condition:${condition.type}:${condition.appliedTurnCount ?? index}`,
    kind: 'condition',
    artifactId: null,
    label: capitalize(condition.coreType ?? condition.type.replaceAll('_', ' ')),
    detail: `${capitalize(condition.targetKind.replaceAll('_', ' '))} condition`,
    turnCount: condition.appliedTurnCount,
    tone: '#ef927d',
    siteId: null,
    scene: null,
  }));
  const maturityMilestone: CivilizationVisualMilestone = {
    id: `maturity:${maturity}`,
    kind: 'maturity',
    artifactId: null,
    label: `${capitalize(maturity)} maturity`,
    detail: 'Highest historical civilization scale',
    turnCount: null,
    tone: '#dfb86b',
    siteId: null,
    scene: maturity === 'galactic' ? 'galaxy' : maturity === 'stellar' ? 'stellar' : 'orbit',
  };
  const siteMilestones = deploymentSites
    .filter((site) => site.kind !== 'artifact')
    .map((site): CivilizationVisualMilestone => ({
      id: `site:${site.id}`,
      kind: site.kind,
      artifactId: null,
      label: site.title,
      detail: site.summary,
      turnCount: null,
      tone: AFFINITY_META[site.affinity].hex,
      siteId: site.id,
      scene: siteScene(site),
    }));

  return [
    ...artifactMilestones,
    ...siteMilestones,
    ...eventMilestones,
    ...conditionMilestones,
    maturityMilestone,
  ].sort((left, right) => (
    (left.turnCount ?? Number.MAX_SAFE_INTEGER) - (right.turnCount ?? Number.MAX_SAFE_INTEGER) ||
    left.id.localeCompare(right.id)
  ));
}

export function deriveCivilizationVisualState({
  civilization,
  deploymentSites,
  profile,
  fallbackTier,
}: DeriveCivilizationVisualStateInput): CivilizationVisualState {
  const aggregateIdentity = civilization?.affinityIdentity ?? fallbackIdentity(profile);
  const liveIdentityStatus: CivilizationIdentityStatus = aggregateIdentity.presentationDyad
    ? 'committed'
    : aggregateIdentity.dominantDyad
      ? 'forming'
      : 'plain';
  const identities = Object.fromEntries(CIVILIZATION_SCENE_KINDS.map((scene) => {
    const layer = SCENE_IDENTITY_LAYER[scene];
    return [scene, deriveVisualIdentity(aggregateIdentity, layer, liveIdentityStatus)];
  })) as Record<CivilizationSceneKind, CivilizationVisualIdentity>;
  const historicalMaturity = civilization?.scale.historicalMaturity ?? fallbackMaturity(fallbackTier);
  const currentReach = civilization?.scale.currentReach ?? historicalMaturity;
  const currentReachCondition = civilization?.scale.currentReachCondition ?? 'intact';
  const score = complexityScore(civilization, deploymentSites);
  const artifactCount = countUniqueArtifacts(civilization, deploymentSites, profile);
  const settlementPhase = settlementPhaseForArtifactCount(artifactCount);
  const legacyCompleted = civilization?.legacy?.completedTurnCount !== null &&
    civilization?.legacy?.completedTurnCount !== undefined;
  const cityDevelopmentStage = deriveCivilizationCityDevelopmentStage(
    artifactCount,
    historicalMaturity,
    {
      stellarArrivalArtifactCount: profile.kardashevArrivalArtifactCounts?.[2] ?? null,
      galacticArrivalArtifactCount: profile.kardashevArrivalArtifactCounts?.[3] ?? null,
      legacyCompleted,
    },
  );
  const cityDevelopmentLabel = CIVILIZATION_CITY_DEVELOPMENT_LABELS[cityDevelopmentStage];
  const globalComplexity = toComplexityStage(score, historicalMaturity);
  const scenes = Object.fromEntries(CIVILIZATION_SCENE_KINDS.map((scene) => {
    const unlocked = MATURITY_INDEX[historicalMaturity] >= MATURITY_INDEX[SCENE_REQUIRED_MATURITY[scene]];
    const stage = sceneComplexityStage(
      scene,
      historicalMaturity,
      artifactCount,
      legacyCompleted,
    );
    return [scene, {
      stage,
      label: COMPLEXITY_LABELS[stage],
      score,
      artifactCount,
      settlementPhase,
      cityDevelopmentStage,
      cityDevelopmentLabel,
      unlocked,
      reach: sceneReach(scene, currentReach, currentReachCondition),
    }];
  })) as Record<CivilizationSceneKind, CivilizationSceneProgress>;

  return {
    identity: identities.surface,
    identities,
    historicalMaturity,
    currentReach,
    currentReachCondition,
    globalComplexity,
    globalComplexityLabel: COMPLEXITY_LABELS[globalComplexity],
    globalComplexityScore: score,
    artifactCount,
    settlementPhase,
    cityDevelopmentStage,
    cityDevelopmentLabel,
    scenes,
    milestones: deriveMilestones(civilization, deploymentSites, historicalMaturity),
  };
}

export function getCivilizationDyadDefinition(dyad: CivilizationDyadId) {
  return CIVILIZATION_DYAD_DEFINITIONS.find((definition) => definition.id === dyad) ?? null;
}
