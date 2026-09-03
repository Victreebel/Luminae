/**
 * @workspace/game-types
 *
 * Shared game constants and types used by both the frontend (luminae) and the
 * backend (api-server).  Keeping them here ensures a single source of truth:
 * adding a new aura style in this file immediately produces TypeScript errors
 * in both packages if the LUMINARIES array or LUMINARY_VISUALS map does not
 * include a matching value.
 */

import { ARTIFACT_DEFINITION_BY_ID } from './artifacts';
import {
  ARTIFACT_CIVILIZATION_CAPABILITY_BY_ID,
  ARTIFACT_CIVILIZATION_CAPABILITY_DOMAIN_BY_ID,
  type ArtifactCivilizationCapabilityId,
  type CivilizationCapabilityDomain,
} from './civilization-capabilities';
import {
  assessCivilizationPressureResponse,
  assessCivilizationPressureResponses,
  type CivilizationPressureCapabilityCoverage,
  type CivilizationPressureResponseAssessment,
} from './civilization-pressure';
import { ARTIFACT_TECHNOLOGY_METADATA_BY_ID } from './technology';
import type { CampaignContentState, CampaignProgressProjection } from './chronicles';

export * from './artifacts';
export * from './civilization-capabilities';
export * from './civilization-pressure';
export * from './chronicles';
export * from './recurrenceChronicle';
export * from './traceChronicle';
export * from './triangulationChronicle';
export * from './technology';

/** Duration of the opening first-player selector shared by client and server. */
export const OPENING_TURN_ORDER_PRESENTATION_MS = 3400;

/**
 * Match-length policy shared by room setup, simulation, tutorial, and UI.
 * Fifteen remains a supported shorter custom format; new standard matches use
 * twenty so the complete three-tier civilization arc has room to develop.
 */
export const MIN_VICTORY_REQUIREMENT = 15 as const;
export const DEFAULT_VICTORY_REQUIREMENT = 20 as const;
export const VICTORY_REQUIREMENT_OPTIONS = [15, 20, 25] as const;
export type VictoryRequirementOption = (typeof VICTORY_REQUIREMENT_OPTIONS)[number];

/**
 * Canonical set of Luminary ID string literals.  This is the authoritative
 * list — both the backend LuminaryDef interface and the frontend
 * LUMINARY_VISUALS map type their `id` field (and map key) as `LuminaryId`, so
 * an ID that is not in this list is a compile-time error in both packages.
 *
 * When adding a new Luminary:
 *   1. Add its ID here.
 *   2. Add a matching entry to LUMINARIES in gameEngine.ts.
 *   3. Add a matching entry to LUMINARY_VISUALS in luminaryAssets.tsx.
 *   4. TypeScript will flag every incomplete usage automatically.
 *
 * The lint:summon-colors script remains a secondary safety net that checks
 * summonColor / summonSecondaryColor / auraStyle values match at runtime; the
 * primary guard for ID correctness is this compile-time union type.
 */
export const LUMINARY_IDS = [
  'lum_ember',
  'lum_tide',
  'lum_verdant',
  'lum_void',
  'lum_radiant',
  'lum_astral',
  'lum_bloom',
  'lum_forge',
  'lum_compass',
  'lum_seed',
  'lum_orchard',
  'lum_pale',
  'lum_hunger',
  'lum_moth',
  'lum_null',
  'lum_oracle',
  'lum_scholar',
] as const;

export type LuminaryId = (typeof LUMINARY_IDS)[number];

/**
 * Canonical set of aura animation style keys recognised by the frontend aura
 * renderer.  This is the authoritative list — both the backend LuminaryDef
 * interface and the frontend LUMINARY_VISUALS map type their `auraStyle` field
 * as `AuraStyle`, so an unknown value is a compile-time error in both packages.
 *
 * When adding a new animation variant:
 *   1. Add its key here.
 *   2. Add a matching case to the aura renderer in luminaryAssets.tsx
 *      (AURA_VARIANTS record).
 *   3. TypeScript will flag every incomplete usage automatically.
 */
export const KNOWN_AURA_STYLES = [
  'fire',
  'tide',
  'verdant',
  'void',
  'radiant',
  'astral',
  'storm',
  'pale',
  'bloom',
  'compass',
  'oracle',
  'null',
  'distorted',
] as const;

export type AuraStyle = (typeof KNOWN_AURA_STYLES)[number];

/**
 * Canonical Luminae affinity vocabulary.
 *
 * The string values are stable transport/storage identifiers used by existing
 * games and clients. Application code should treat them as opaque keys and use
 * AFFINITY_NAMES whenever a player-facing name is needed.
 */
export const AFFINITY_KEYS = [
  'flare',
  'radiance',
  'verdance',
  'continuum',
  'abyss',
  'singularity',
] as const;

export type AffinityKey = (typeof AFFINITY_KEYS)[number];

export const STANDARD_AFFINITY_KEYS = [
  'flare',
  'radiance',
  'verdance',
  'continuum',
  'abyss',
] as const satisfies readonly AffinityKey[];

export type StandardAffinityKey = (typeof STANDARD_AFFINITY_KEYS)[number];

export type AffinityCounts = Record<AffinityKey, number>;

export const AFFINITY_NAMES: Record<AffinityKey, string> = {
  flare: 'Flare',
  radiance: 'Radiance',
  verdance: 'Verdance',
  continuum: 'Continuum',
  abyss: 'Abyss',
  singularity: 'Singularity',
};

/**
 * Versioned, backend-owned Civilization history for one player in one match.
 *
 * This deliberately separates historical mastery from the current operational
 * implementation. An implementation may be damaged or annihilated without
 * erasing the fact that the civilization mastered the Artifact.
 */
export const CIVILIZATION_STATE_VERSION = 2 as const;

export const CIVILIZATION_ARTIFACT_IMPLEMENTATION_STATES = [
  'operational',
  'damaged',
  'archived',
  'annihilated',
] as const;

export type CivilizationArtifactImplementationState =
  (typeof CIVILIZATION_ARTIFACT_IMPLEMENTATION_STATES)[number];

export type CivilizationHistoryEvidence = 'recorded' | 'legacy_inferred';

export interface CivilizationArtifactChangeSource {
  sourceType: 'artifact' | 'blueprint' | 'chronicle' | 'scenario' | 'system';
  sourceId: string | null;
}

export interface CivilizationArtifactLifecycleState {
  artifactId: string;
  /** Null means the match predates turn-level Civilization history. */
  firstMasteredTurnCount: number | null;
  /** Lifetime mastery count in this match, including lost implementations. */
  masteryCount: number;
  /** Null means the current implementation state cannot be known truthfully. */
  implementationState: CivilizationArtifactImplementationState | null;
  /** Null for legacy state whose transition timing was never recorded. */
  implementationStateChangedTurnCount: number | null;
  implementationChangeSource: CivilizationArtifactChangeSource | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export type CivilizationNaturalAffinityCounts = Record<StandardAffinityKey, number>;

export const CIVILIZATION_DYAD_DEFINITIONS = [
  { id: 'vortex', name: 'Vortex', affinities: ['flare', 'radiance'] },
  { id: 'flux', name: 'Flux', affinities: ['flare', 'continuum'] },
  { id: 'bloom', name: 'Bloom', affinities: ['flare', 'verdance'] },
  { id: 'chrysalis', name: 'Chrysalis', affinities: ['flare', 'abyss'] },
  { id: 'orbit', name: 'Orbit', affinities: ['radiance', 'continuum'] },
  { id: 'canopy', name: 'Canopy', affinities: ['radiance', 'verdance'] },
  { id: 'eclipse', name: 'Eclipse', affinities: ['radiance', 'abyss'] },
  { id: 'lineage', name: 'Lineage', affinities: ['continuum', 'verdance'] },
  { id: 'echo', name: 'Echo', affinities: ['continuum', 'abyss'] },
  { id: 'spore', name: 'Spore', affinities: ['verdance', 'abyss'] },
] as const satisfies readonly {
  id: string;
  name: string;
  affinities: readonly [StandardAffinityKey, StandardAffinityKey];
}[];

export type CivilizationDyadId = (typeof CIVILIZATION_DYAD_DEFINITIONS)[number]['id'];

export type CivilizationAffinityIdentityForm =
  | 'unformed'
  | 'singular'
  | 'dyad'
  | 'plural';

export interface CivilizationRankedAffinity {
  affinity: StandardAffinityKey;
  historicalWeight: number;
  operationalWeight: number;
}

export interface CivilizationAffinityIdentity {
  /** Centralized compatibility policy; final confidence calibration is deferred. */
  policyId: 'provisional-ratio-v1';
  form: CivilizationAffinityIdentityForm;
  historicalCounts: CivilizationNaturalAffinityCounts;
  operationalCounts: CivilizationNaturalAffinityCounts;
  rankedAffinities: CivilizationRankedAffinity[];
  dominantAffinity: StandardAffinityKey | null;
  dominantDyad: CivilizationDyadId | null;
  thirdAffinity: StandardAffinityKey | null;
  dominantShare: number;
  secondaryToPrimaryRatio: number;
  thirdToPrimaryRatio: number;
}

export const CIVILIZATION_MATURITY_LEVELS = [
  'planetary',
  'stellar',
  'galactic',
] as const;

export type CivilizationMaturity = (typeof CIVILIZATION_MATURITY_LEVELS)[number];
export type CivilizationOperationalReach = CivilizationMaturity | 'unknown';

export const CIVILIZATION_REACH_CONDITIONS = [
  'intact',
  'degraded',
  'fractured',
  'unknown',
] as const;

export type CivilizationReachCondition = (typeof CIVILIZATION_REACH_CONDITIONS)[number];
export type LiteralKardashevType = 0 | 1 | 2 | 3;

export interface CivilizationScaleEvidence {
  sourceType: 'artifact' | 'blueprint' | 'chronicle' | 'scenario' | 'system';
  sourceId: string | null;
  turnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationScaleState {
  historicalMaturity: CivilizationMaturity;
  historicalMaturityEvidence: CivilizationScaleEvidence[];
  currentReach: CivilizationOperationalReach;
  currentReachCondition: CivilizationReachCondition;
  currentReachEvidence: CivilizationScaleEvidence[];
  /** Historical scientific metadata only; never a Civilization Maturity alias. */
  literalKardashevType: LiteralKardashevType;
  literalKardashevEvidence: CivilizationHistoryEvidence;
}

export const CIVILIZATION_CORE_CONDITIONS = [
  'damaged',
  'isolated',
  'quarantined',
  'disrupted',
] as const;

export type CivilizationCoreCondition = (typeof CIVILIZATION_CORE_CONDITIONS)[number];

export const CIVILIZATION_CONDITION_NAMESPACES = [
  'blueprint',
  'chronicle',
  'scenario',
] as const;

export type CivilizationConditionNamespace =
  (typeof CIVILIZATION_CONDITION_NAMESPACES)[number];
export type CivilizationConditionType =
  | CivilizationCoreCondition
  | `${CivilizationConditionNamespace}:${string}`;

/**
 * The stable cross-content pressure vocabulary. Content may combine tags, but
 * must not invent synonyms for these causal families.
 */
export const CIVILIZATION_PRESSURE_TAGS = [
  'disruption',
  'isolation',
  'proliferation',
  'exposure',
  'attrition',
  'coordination',
  'transformation',
] as const;

export type CivilizationPressureTag = (typeof CIVILIZATION_PRESSURE_TAGS)[number];

export const CIVILIZATION_CAPABILITY_NAMESPACES = [
  'artifact',
  'project',
  'chronicle',
  'scenario',
  'system',
] as const;

export type CivilizationCapabilityNamespace =
  (typeof CIVILIZATION_CAPABILITY_NAMESPACES)[number];
export type CivilizationCapabilityId = `${CivilizationCapabilityNamespace}:${string}`;

/** Project capabilities already established by authoritative first-pool rules. */
export const CIVILIZATION_PROJECT_CAPABILITIES = {
  antimatterClaimAnnihilation: 'project:claim_annihilation',
  foundryForge: 'project:foundry_forge',
  hostileClaimInterception: 'project:hostile_claim_interception',
  claimDeferralObservation: 'project:claim_deferral_observation',
} as const satisfies Record<string, CivilizationCapabilityId>;

export interface CivilizationCapabilityDefinition {
  id: CivilizationCapabilityId;
  label: string;
  description: string;
}

export const CIVILIZATION_PROJECT_CAPABILITY_DEFINITIONS = [
  {
    id: CIVILIZATION_PROJECT_CAPABILITIES.antimatterClaimAnnihilation,
    label: 'Claim annihilation',
    description: 'Erase a marked Artifact claim at the authorized interception window.',
  },
  {
    id: CIVILIZATION_PROJECT_CAPABILITIES.foundryForge,
    label: 'Orbital foundry fabrication',
    description: 'Convert mantle feedstock into a reduced-cost Artifact through the Foundry.',
  },
  {
    id: CIVILIZATION_PROJECT_CAPABILITIES.hostileClaimInterception,
    label: 'Hostile claim interception',
    description: 'Intercept a hostile effect before it can cancel or destroy a legal claim.',
  },
  {
    id: CIVILIZATION_PROJECT_CAPABILITIES.claimDeferralObservation,
    label: 'Claim deferral observation',
    description: 'Verify and publish a civilization\'s repeated deferral of an available claim.',
  },
] as const satisfies readonly CivilizationCapabilityDefinition[];

const CIVILIZATION_PROJECT_CAPABILITY_BY_ID = Object.fromEntries(
  CIVILIZATION_PROJECT_CAPABILITY_DEFINITIONS.map((definition) => [definition.id, definition]),
) as Record<
  (typeof CIVILIZATION_PROJECT_CAPABILITY_DEFINITIONS)[number]['id'],
  (typeof CIVILIZATION_PROJECT_CAPABILITY_DEFINITIONS)[number]
>;

/** Returns authored copy for known capabilities and legible fallback copy for future namespaces. */
export function getCivilizationCapabilityDefinition(
  capabilityId: CivilizationCapabilityId,
): CivilizationCapabilityDefinition {
  const artifactDefinition = ARTIFACT_CIVILIZATION_CAPABILITY_BY_ID[
    capabilityId as keyof typeof ARTIFACT_CIVILIZATION_CAPABILITY_BY_ID
  ];
  if (artifactDefinition) return artifactDefinition;
  const projectDefinition = CIVILIZATION_PROJECT_CAPABILITY_BY_ID[
    capabilityId as keyof typeof CIVILIZATION_PROJECT_CAPABILITY_BY_ID
  ];
  if (projectDefinition) return projectDefinition;
  const [, rawLabel = capabilityId] = capabilityId.split(':', 2);
  const label = rawLabel
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return {
    id: capabilityId,
    label,
    description: 'An authored Civilization capability exposed by the current historical state.',
  };
}

export type CivilizationEntityReference =
  | { kind: 'world'; id: string }
  | { kind: 'artifact_implementation'; id: string }
  | { kind: 'network'; id: string }
  | { kind: 'installation'; id: string }
  | { kind: 'project'; id: string };

export interface CivilizationCondition {
  id: string;
  type: CivilizationConditionType;
  coreType: CivilizationCoreCondition | null;
  target: CivilizationEntityReference;
  source: CivilizationArtifactChangeSource;
  appliedTurnCount: number | null;
  resolvedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationWorld {
  id: string;
  role: 'homeworld' | 'settled_world';
  name: string | null;
  state: 'active' | 'annihilated';
  establishedTurnCount: number | null;
  stateChangedTurnCount: number | null;
  conditionIds: string[];
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationEntity {
  id: string;
  kind: 'network' | 'installation' | 'project';
  state: 'operational' | 'disabled' | 'annihilated';
  worldId: string | null;
  sourceId: string | null;
  establishedTurnCount: number | null;
  stateChangedTurnCount: number | null;
  conditionIds: string[];
  historyEvidence: CivilizationHistoryEvidence;
}

export const CIVILIZATION_STABILITY_BANDS = [
  'stable',
  'strained',
  'unstable',
  'crisis',
] as const;

export type CivilizationStabilityBand = (typeof CIVILIZATION_STABILITY_BANDS)[number];

export interface CivilizationStabilityContributor {
  id: string;
  direction: 'support' | 'pressure';
  magnitude: number;
  label: string;
  source: CivilizationArtifactChangeSource;
  target: CivilizationEntityReference | null;
  appliedTurnCount: number | null;
  resolvedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationStabilityState {
  band: CivilizationStabilityBand;
  /** Null until an explicitly selected calibration is available. */
  score: number | null;
  calibrationId: string | null;
  contributors: CivilizationStabilityContributor[];
  calculatedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export const CIVILIZATION_HISTORICAL_QUALITY_DIMENSIONS = [
  'continuity',
  'agency',
  'achievement',
] as const;

export type CivilizationHistoricalQualityDimension =
  (typeof CIVILIZATION_HISTORICAL_QUALITY_DIMENSIONS)[number];

/**
 * Authored historical meaning that cannot be inferred safely from structural
 * state alone. Magnitudes reuse the Stability vocabulary without altering the
 * Stability track.
 */
export interface CivilizationOutcomeSignal {
  signalId: string;
  dimension: CivilizationHistoricalQualityDimension;
  direction: 'support' | 'pressure';
  magnitude: CivilizationStabilityImpact;
  label: string;
}

/** Adversity is context for recovery credit, never a fifth quality dimension. */
export interface CivilizationAdversityEvidence {
  evidenceId: string;
  magnitude: CivilizationStabilityImpact;
  label: string;
  recoveryEligible: boolean;
}

export interface CivilizationEventHistoryEntry {
  eventId: string;
  source: CivilizationArtifactChangeSource;
  turnCount: number | null;
  form: CivilizationResolutionForm;
  pressureTags: CivilizationPressureTag[];
  selectedTrajectoryId: string;
  outcome: 'success' | 'failure';
  summary: string;
  history: Record<string, string>;
  outcomeSignals: CivilizationOutcomeSignal[];
  adversity: CivilizationAdversityEvidence | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationStabilityCalibration {
  id: string;
  baseline: number;
  minimum: number;
  maximum: number;
  stableMinimum: number;
  strainedMinimum: number;
  unstableMinimum: number;
}

/**
 * Competitive v1 Stability calibration. The 80-point baseline leaves room for
 * visible support while ensuring one modest pressure does not immediately
 * change band. Crisis requires compound systemic harm or homeworld loss.
 */
export const CIVILIZATION_STABILITY_CALIBRATION_V1 = {
  id: 'civilization-stability-v1',
  baseline: 80,
  minimum: 0,
  maximum: 100,
  stableMinimum: 70,
  strainedMinimum: 45,
  unstableMinimum: 20,
} as const satisfies CivilizationStabilityCalibration;

export const CIVILIZATION_STABILITY_IMPACT_MAGNITUDES = {
  trace: 3,
  minor: 5,
  material: 10,
  severe: 20,
  catastrophic: 35,
} as const;

export type CivilizationStabilityImpact =
  keyof typeof CIVILIZATION_STABILITY_IMPACT_MAGNITUDES;

export interface CivilizationState {
  version: typeof CIVILIZATION_STATE_VERSION;
  artifacts: Record<string, CivilizationArtifactLifecycleState>;
  affinityIdentity: CivilizationAffinityIdentity;
  scale: CivilizationScaleState;
  homeworldId: string;
  worlds: Record<string, CivilizationWorld>;
  entities: Record<string, CivilizationEntity>;
  conditions: Record<string, CivilizationCondition>;
  stability: CivilizationStabilityState;
  events: CivilizationEventHistoryEntry[];
}

/**
 * Public, identity-safe Civilization projection carried by live game state.
 *
 * Internal causal IDs are intentionally absent: a Condition or Stability
 * contributor may originate in a sealed Blueprint, Chronicle, or scenario.
 * The public projection preserves the inspectable consequence without leaking
 * the concealed source record.
 */
export interface CivilizationPublicArtifactState {
  artifactId: string;
  firstMasteredTurnCount: number | null;
  masteryCount: number;
  implementationState: CivilizationArtifactImplementationState | null;
  implementationStateChangedTurnCount: number | null;
  changeSourceType: CivilizationArtifactChangeSource['sourceType'] | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationPublicConditionState {
  type: CivilizationConditionType;
  coreType: CivilizationCoreCondition | null;
  targetKind: CivilizationEntityReference['kind'];
  sourceType: CivilizationArtifactChangeSource['sourceType'];
  appliedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationPublicStabilityContributor {
  direction: CivilizationStabilityContributor['direction'];
  magnitude: number;
  label: string;
  sourceType: CivilizationArtifactChangeSource['sourceType'];
  targetKind: CivilizationEntityReference['kind'] | null;
  appliedTurnCount: number | null;
  resolvedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationPublicEventHistoryEntry {
  eventId: string;
  sourceType: CivilizationArtifactChangeSource['sourceType'];
  turnCount: number | null;
  form: CivilizationResolutionForm;
  pressureTags: CivilizationPressureTag[];
  outcome: 'success' | 'failure';
  summary: string;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationPublicState {
  version: typeof CIVILIZATION_STATE_VERSION;
  artifacts: CivilizationPublicArtifactState[];
  affinityIdentity: CivilizationAffinityIdentity;
  scale: Pick<
    CivilizationScaleState,
    | 'historicalMaturity'
    | 'currentReach'
    | 'currentReachCondition'
    | 'literalKardashevType'
    | 'literalKardashevEvidence'
  >;
  stability: {
    band: CivilizationStabilityBand;
    score: number | null;
    calibrationId: string | null;
    contributors: CivilizationPublicStabilityContributor[];
    calculatedTurnCount: number | null;
    historyEvidence: CivilizationHistoryEvidence;
  };
  activeConditions: CivilizationPublicConditionState[];
  activeCapabilityIds: CivilizationCapabilityId[];
  events: CivilizationPublicEventHistoryEntry[];
}

const CIVILIZATION_AFFINITY_INDEX = Object.fromEntries(
  STANDARD_AFFINITY_KEYS.map((affinity, index) => [affinity, index]),
) as Record<StandardAffinityKey, number>;

const CIVILIZATION_DYAD_BY_PAIR = Object.fromEntries(
  CIVILIZATION_DYAD_DEFINITIONS.map((definition) => [
    [...definition.affinities]
      .sort((a, b) => CIVILIZATION_AFFINITY_INDEX[a] - CIVILIZATION_AFFINITY_INDEX[b])
      .join(':'),
    definition,
  ]),
) as Record<string, (typeof CIVILIZATION_DYAD_DEFINITIONS)[number]>;

export function emptyCivilizationNaturalAffinityCounts(): CivilizationNaturalAffinityCounts {
  return { flare: 0, radiance: 0, verdance: 0, continuum: 0, abyss: 0 };
}

export function getCivilizationDyad(
  first: StandardAffinityKey,
  second: StandardAffinityKey,
): (typeof CIVILIZATION_DYAD_DEFINITIONS)[number] | null {
  const key = [first, second]
    .sort((a, b) => CIVILIZATION_AFFINITY_INDEX[a] - CIVILIZATION_AFFINITY_INDEX[b])
    .join(':');
  return CIVILIZATION_DYAD_BY_PAIR[key] ?? null;
}

/**
 * Derives historical identity from mastered Artifact bonuses and operational
 * capability from current implementations. Singularity and held Affinities
 * cannot enter either profile.
 */
export function deriveCivilizationAffinityIdentity(
  artifacts: Readonly<Record<string, CivilizationArtifactLifecycleState>>,
): CivilizationAffinityIdentity {
  const historicalCounts = emptyCivilizationNaturalAffinityCounts();
  const operationalCounts = emptyCivilizationNaturalAffinityCounts();

  for (const lifecycle of Object.values(artifacts)) {
    const definition = ARTIFACT_DEFINITION_BY_ID[lifecycle.artifactId as keyof typeof ARTIFACT_DEFINITION_BY_ID];
    if (!definition) continue;
    historicalCounts[definition.bonusAffinity] += Math.max(0, lifecycle.masteryCount);
    if (lifecycle.implementationState === 'operational') {
      operationalCounts[definition.bonusAffinity] += 1;
    }
  }

  const rankedAffinities = STANDARD_AFFINITY_KEYS
    .map((affinity) => ({
      affinity,
      historicalWeight: historicalCounts[affinity],
      operationalWeight: operationalCounts[affinity],
    }))
    .sort((a, b) =>
      b.historicalWeight - a.historicalWeight ||
      CIVILIZATION_AFFINITY_INDEX[a.affinity] - CIVILIZATION_AFFINITY_INDEX[b.affinity],
    );
  const total = rankedAffinities.reduce((sum, entry) => sum + entry.historicalWeight, 0);
  const primary = rankedAffinities[0];
  const secondary = rankedAffinities[1];
  const third = rankedAffinities[2];
  const primaryWeight = primary?.historicalWeight ?? 0;
  const topTieCount = primaryWeight > 0
    ? rankedAffinities.filter((entry) => entry.historicalWeight === primaryWeight).length
    : 0;
  const secondaryRatio = primaryWeight > 0 ? (secondary?.historicalWeight ?? 0) / primaryWeight : 0;
  const thirdRatio = primaryWeight > 0 ? (third?.historicalWeight ?? 0) / primaryWeight : 0;
  const plural = topTieCount >= 3;
  const dyad = !plural && secondaryRatio >= 0.45
    ? getCivilizationDyad(primary.affinity, secondary.affinity)
    : null;

  return {
    policyId: 'provisional-ratio-v1',
    form: total === 0 ? 'unformed' : plural ? 'plural' : dyad ? 'dyad' : 'singular',
    historicalCounts,
    operationalCounts,
    rankedAffinities,
    dominantAffinity: topTieCount === 1 ? primary.affinity : null,
    dominantDyad: dyad?.id ?? null,
    thirdAffinity: dyad && thirdRatio >= 0.45 ? third.affinity : null,
    dominantShare: total > 0 ? primaryWeight / total : 0,
    secondaryToPrimaryRatio: secondaryRatio,
    thirdToPrimaryRatio: thirdRatio,
  };
}

export function createInitialCivilizationState(): CivilizationState {
  const homeworldId = 'world:home';
  return {
    version: CIVILIZATION_STATE_VERSION,
    artifacts: {},
    affinityIdentity: deriveCivilizationAffinityIdentity({}),
    scale: {
      historicalMaturity: 'planetary',
      historicalMaturityEvidence: [],
      currentReach: 'planetary',
      currentReachCondition: 'intact',
      currentReachEvidence: [],
      literalKardashevType: 0,
      literalKardashevEvidence: 'recorded',
    },
    homeworldId,
    worlds: {
      [homeworldId]: {
        id: homeworldId,
        role: 'homeworld',
        name: null,
        state: 'active',
        establishedTurnCount: 0,
        stateChangedTurnCount: 0,
        conditionIds: [],
        historyEvidence: 'recorded',
      },
    },
    entities: {},
    conditions: {},
    stability: {
      band: 'stable',
      score: CIVILIZATION_STABILITY_CALIBRATION_V1.baseline,
      calibrationId: CIVILIZATION_STABILITY_CALIBRATION_V1.id,
      contributors: [],
      calculatedTurnCount: 0,
      historyEvidence: 'recorded',
    },
    events: [],
  };
}

export function advanceCivilizationMaturity(
  scale: CivilizationScaleState,
  target: CivilizationMaturity,
  evidence: CivilizationScaleEvidence,
): CivilizationScaleState {
  const currentIndex = CIVILIZATION_MATURITY_LEVELS.indexOf(scale.historicalMaturity);
  const targetIndex = CIVILIZATION_MATURITY_LEVELS.indexOf(target);
  if (targetIndex <= currentIndex) return scale;
  return {
    ...scale,
    historicalMaturity: target,
    historicalMaturityEvidence: [...scale.historicalMaturityEvidence, evidence],
  };
}

export function setCivilizationOperationalReach(
  scale: CivilizationScaleState,
  currentReach: CivilizationOperationalReach,
  currentReachCondition: CivilizationReachCondition,
  evidence: CivilizationScaleEvidence,
): CivilizationScaleState {
  return {
    ...scale,
    currentReach,
    currentReachCondition,
    currentReachEvidence: [...scale.currentReachEvidence, evidence],
  };
}

export function upsertCivilizationWorld(
  state: CivilizationState,
  world: CivilizationWorld,
): CivilizationState {
  const role = world.id === state.homeworldId ? 'homeworld' : world.role;
  return {
    ...state,
    worlds: {
      ...state.worlds,
      [world.id]: { ...world, role },
    },
  };
}

export function upsertCivilizationEntity(
  state: CivilizationState,
  entity: CivilizationEntity,
): CivilizationState {
  return {
    ...state,
    entities: {
      ...state.entities,
      [entity.id]: entity,
    },
  };
}

export function applyCivilizationCondition(
  state: CivilizationState,
  condition: CivilizationCondition,
): CivilizationState {
  const next: CivilizationState = {
    ...state,
    conditions: {
      ...state.conditions,
      [condition.id]: condition,
    },
  };
  if (condition.target.kind === 'world') {
    const world = next.worlds[condition.target.id];
    if (world && !world.conditionIds.includes(condition.id)) {
      next.worlds = {
        ...next.worlds,
        [world.id]: { ...world, conditionIds: [...world.conditionIds, condition.id] },
      };
    }
  } else if (
    condition.target.kind === 'network' ||
    condition.target.kind === 'installation' ||
    condition.target.kind === 'project'
  ) {
    const entity = next.entities[condition.target.id];
    if (entity && !entity.conditionIds.includes(condition.id)) {
      next.entities = {
        ...next.entities,
        [entity.id]: { ...entity, conditionIds: [...entity.conditionIds, condition.id] },
      };
    }
  }
  return next;
}

export function resolveCivilizationCondition(
  state: CivilizationState,
  conditionId: string,
  resolvedTurnCount: number,
): CivilizationState {
  const condition = state.conditions[conditionId];
  if (!condition || condition.resolvedTurnCount !== null) return state;
  const next: CivilizationState = {
    ...state,
    conditions: {
      ...state.conditions,
      [conditionId]: { ...condition, resolvedTurnCount },
    },
  };
  if (condition.target.kind === 'world') {
    const world = next.worlds[condition.target.id];
    if (world) {
      next.worlds = {
        ...next.worlds,
        [world.id]: {
          ...world,
          conditionIds: world.conditionIds.filter((id) => id !== conditionId),
        },
      };
    }
  } else if (
    condition.target.kind === 'network' ||
    condition.target.kind === 'installation' ||
    condition.target.kind === 'project'
  ) {
    const entity = next.entities[condition.target.id];
    if (entity) {
      next.entities = {
        ...next.entities,
        [entity.id]: {
          ...entity,
          conditionIds: entity.conditionIds.filter((id) => id !== conditionId),
        },
      };
    }
  }
  return next;
}

export function addCivilizationStabilityContributor(
  state: CivilizationStabilityState,
  contributor: CivilizationStabilityContributor,
  calibration: CivilizationStabilityCalibration = CIVILIZATION_STABILITY_CALIBRATION_V1,
): CivilizationStabilityState {
  const contributors = [
    ...state.contributors.filter((entry) => entry.id !== contributor.id),
    contributor,
  ];
  const next = { ...state, contributors };
  return recalculateCivilizationStability(next, calibration, contributor.appliedTurnCount);
}

export function recalculateCivilizationStability(
  state: CivilizationStabilityState,
  calibration: CivilizationStabilityCalibration,
  turnCount: number | null,
): CivilizationStabilityState {
  const delta = state.contributors
    .filter((contributor) => contributor.resolvedTurnCount === null)
    .reduce(
      (sum, contributor) =>
        sum + (contributor.direction === 'support' ? contributor.magnitude : -contributor.magnitude),
      0,
    );
  const score = Math.max(calibration.minimum, Math.min(calibration.maximum, calibration.baseline + delta));
  const band: CivilizationStabilityBand = score >= calibration.stableMinimum
    ? 'stable'
    : score >= calibration.strainedMinimum
      ? 'strained'
      : score >= calibration.unstableMinimum
        ? 'unstable'
        : 'crisis';
  return {
    ...state,
    band,
    score,
    calibrationId: calibration.id,
    calculatedTurnCount: turnCount,
  };
}

export function resolveCivilizationStabilityCause(
  state: CivilizationStabilityState,
  source: CivilizationArtifactChangeSource,
  resolvedTurnCount: number,
  calibration: CivilizationStabilityCalibration = CIVILIZATION_STABILITY_CALIBRATION_V1,
): CivilizationStabilityState {
  const contributors = state.contributors.map((contributor) =>
    contributor.resolvedTurnCount === null &&
    contributor.source.sourceType === source.sourceType &&
    contributor.source.sourceId === source.sourceId
      ? { ...contributor, resolvedTurnCount }
      : contributor,
  );
  const next = { ...state, contributors };
  return recalculateCivilizationStability(next, calibration, resolvedTurnCount);
}

const CIVILIZATION_STRUCTURAL_STABILITY_PREFIX = 'structural:';
const CIVILIZATION_STABILITY_SYSTEM_SOURCE: CivilizationArtifactChangeSource = {
  sourceType: 'system',
  sourceId: CIVILIZATION_STABILITY_CALIBRATION_V1.id,
};

function structuralContributor(
  id: string,
  magnitude: number,
  label: string,
  target: CivilizationEntityReference,
  historyEvidence: CivilizationHistoryEvidence,
  source: CivilizationArtifactChangeSource = CIVILIZATION_STABILITY_SYSTEM_SOURCE,
): CivilizationStabilityContributor {
  return {
    id: `${CIVILIZATION_STRUCTURAL_STABILITY_PREFIX}${id}`,
    direction: 'pressure',
    magnitude,
    label,
    source,
    target,
    appliedTurnCount: null,
    resolvedTurnCount: null,
    historyEvidence,
  };
}

function conditionMagnitude(
  condition: CivilizationCoreCondition,
  targetKind: CivilizationEntityReference['kind'],
): number {
  switch (condition) {
    case 'damaged':
      return CIVILIZATION_STABILITY_IMPACT_MAGNITUDES.minor;
    case 'isolated':
      return targetKind === 'world' ? 12 : 8;
    case 'quarantined':
      return targetKind === 'world' ? 8 : 5;
    case 'disrupted':
      return targetKind === 'world' ? 10 : 7;
  }
}

/**
 * Converts concrete live harm into inspectable global Stability pressure.
 * Ordinary capability ownership never grants generic Stability; authored
 * supports remain explicit contributors tied to their actual cause.
 */
export function deriveCivilizationStructuralStabilityContributors(
  state: Pick<CivilizationState, 'artifacts' | 'worlds' | 'entities' | 'conditions' | 'homeworldId'>,
): CivilizationStabilityContributor[] {
  const contributors: CivilizationStabilityContributor[] = [];
  const damagedArtifactIds = new Set<string>();

  for (const lifecycle of Object.values(state.artifacts)) {
    if (lifecycle.implementationState === 'damaged') {
      damagedArtifactIds.add(lifecycle.artifactId);
      contributors.push(structuralContributor(
        `artifact:${lifecycle.artifactId}:damaged`,
        CIVILIZATION_STABILITY_IMPACT_MAGNITUDES.minor,
        'Artifact implementation damaged',
        { kind: 'artifact_implementation', id: lifecycle.artifactId },
        lifecycle.historyEvidence,
        lifecycle.implementationChangeSource ?? CIVILIZATION_STABILITY_SYSTEM_SOURCE,
      ));
    } else if (lifecycle.implementationState === 'annihilated') {
      contributors.push(structuralContributor(
        `artifact:${lifecycle.artifactId}:annihilated`,
        8,
        'Artifact implementation annihilated',
        { kind: 'artifact_implementation', id: lifecycle.artifactId },
        lifecycle.historyEvidence,
        lifecycle.implementationChangeSource ?? CIVILIZATION_STABILITY_SYSTEM_SOURCE,
      ));
    }
  }

  for (const world of Object.values(state.worlds)) {
    if (world.state !== 'annihilated') continue;
    const homeworld = world.id === state.homeworldId;
    contributors.push(structuralContributor(
      `world:${world.id}:annihilated`,
      homeworld ? 65 : 30,
      homeworld ? 'Homeworld annihilated' : 'Settled world annihilated',
      { kind: 'world', id: world.id },
      world.historyEvidence,
    ));
  }

  for (const entity of Object.values(state.entities)) {
    if (entity.state === 'operational') continue;
    contributors.push(structuralContributor(
      `entity:${entity.id}:${entity.state}`,
      entity.state === 'annihilated' ? 15 : 8,
      `${entity.kind === 'project' ? 'Project' : entity.kind === 'network' ? 'Network' : 'Installation'} ${entity.state}`,
      { kind: entity.kind, id: entity.id },
      entity.historyEvidence,
    ));
  }

  for (const condition of Object.values(state.conditions)) {
    if (condition.resolvedTurnCount !== null || !condition.coreType) continue;
    if (
      condition.target.kind === 'world' &&
      state.worlds[condition.target.id]?.state === 'annihilated'
    ) {
      continue;
    }
    if (
      (
        condition.target.kind === 'network' ||
        condition.target.kind === 'installation' ||
        condition.target.kind === 'project'
      ) &&
      state.entities[condition.target.id] !== undefined &&
      state.entities[condition.target.id]?.state !== 'operational'
    ) {
      continue;
    }
    if (
      condition.coreType === 'damaged' &&
      condition.target.kind === 'artifact_implementation' &&
      damagedArtifactIds.has(condition.target.id)
    ) {
      continue;
    }
    contributors.push(structuralContributor(
      `condition:${condition.id}`,
      conditionMagnitude(condition.coreType, condition.target.kind),
      `${condition.coreType.charAt(0).toUpperCase()}${condition.coreType.slice(1)} ${condition.target.kind.replace('_', ' ')}`,
      condition.target,
      condition.historyEvidence,
      condition.source,
    ));
  }

  return contributors.sort((left, right) => left.id.localeCompare(right.id));
}

export function recalculateCivilizationStabilityFromState(
  state: CivilizationState,
  turnCount: number | null,
  calibration: CivilizationStabilityCalibration = CIVILIZATION_STABILITY_CALIBRATION_V1,
): CivilizationStabilityState {
  const authoredContributors = state.stability.contributors.filter(
    (contributor) => !contributor.id.startsWith(CIVILIZATION_STRUCTURAL_STABILITY_PREFIX),
  );
  return recalculateCivilizationStability(
    {
      ...state.stability,
      contributors: [
        ...authoredContributors,
        ...deriveCivilizationStructuralStabilityContributors(state),
      ],
    },
    calibration,
    turnCount,
  );
}

export const CIVILIZATION_RESOLUTION_FORMS = [
  'automatic',
  'contextual',
  'state_modified',
] as const;

export type CivilizationResolutionForm = (typeof CIVILIZATION_RESOLUTION_FORMS)[number];

export type CivilizationTrajectoryRequirement =
  | { type: 'capability_active'; capabilityId: CivilizationCapabilityId }
  | { type: 'capability_absent'; capabilityId: CivilizationCapabilityId }
  | {
      type: 'pressure_capability_coverage';
      pressureTag: CivilizationPressureTag;
      minimum: Exclude<CivilizationPressureCapabilityCoverage, 'none'>;
    }
  | { type: 'minimum_pressure_aptitude'; pressureTag: CivilizationPressureTag; score: number }
  | { type: 'maximum_pressure_risk'; pressureTag: CivilizationPressureTag; score: number }
  | { type: 'condition_present'; conditionType: CivilizationConditionType }
  | { type: 'condition_absent'; conditionType: CivilizationConditionType }
  | { type: 'minimum_stability'; band: CivilizationStabilityBand }
  | { type: 'minimum_reach'; reach: CivilizationMaturity }
  | { type: 'historical_affinity'; affinity: StandardAffinityKey; minimumWeight: number }
  | { type: 'operational_affinity'; affinity: StandardAffinityKey; minimumWeight: number }
  | { type: 'dominant_dyad'; dyad: CivilizationDyadId };

export interface CivilizationResolutionSnapshot {
  activeCapabilityIds: readonly CivilizationCapabilityId[];
  activeConditionTypes: readonly CivilizationConditionType[];
  stabilityBand: CivilizationStabilityBand;
  currentReach: CivilizationOperationalReach;
  affinityIdentity: CivilizationAffinityIdentity;
}

export function buildCivilizationResolutionSnapshot(
  state: CivilizationState,
  additionalCapabilityIds: readonly CivilizationCapabilityId[] = [],
  manifestedDevices: readonly ManifestedDevicePublicState[] = [],
): CivilizationResolutionSnapshot {
  return {
    activeCapabilityIds: [
      ...new Set([
        ...deriveOperationalArtifactCapabilityIds(state),
        ...deriveOperationalProjectCapabilityIds(manifestedDevices),
        ...additionalCapabilityIds,
      ]),
    ].sort(),
    activeConditionTypes: Object.values(state.conditions)
      .filter((condition) => condition.resolvedTurnCount === null)
      .map((condition) => condition.type)
      .filter((condition, index, conditions) => conditions.indexOf(condition) === index)
      .sort(),
    stabilityBand: state.stability.band,
    currentReach: state.scale.currentReach,
    affinityIdentity: state.affinityIdentity,
  };
}

/**
 * Derives Artifact capabilities from current implementation state only.
 * Historical mastery remains visible in Civilization history and Affinity
 * identity, but damaged, archived, annihilated, and unknown implementations
 * cannot satisfy an operational capability requirement.
 */
export function deriveOperationalArtifactCapabilityIds(
  state: Pick<CivilizationState, 'artifacts'>,
  capabilityIdsByArtifactId: Readonly<
    Partial<Record<
      string,
      | readonly CivilizationCapabilityId[]
      | { readonly capabilityIds: readonly CivilizationCapabilityId[] }
    >>
  > = ARTIFACT_TECHNOLOGY_METADATA_BY_ID,
): CivilizationCapabilityId[] {
  const capabilityIds = new Set<CivilizationCapabilityId>();
  for (const lifecycle of Object.values(state.artifacts)) {
    if (lifecycle.implementationState !== 'operational') continue;
    const metadataOrCapabilities = capabilityIdsByArtifactId[lifecycle.artifactId];
    const artifactCapabilityIds = Array.isArray(metadataOrCapabilities)
      ? metadataOrCapabilities
      : (
          metadataOrCapabilities as
            | { readonly capabilityIds: readonly CivilizationCapabilityId[] }
            | undefined
        )?.capabilityIds ?? [];
    for (const capabilityId of artifactCapabilityIds) {
      capabilityIds.add(capabilityId);
    }
  }
  return [...capabilityIds].sort();
}

/** Historical mastery remains evidence even when the local implementation is unavailable. */
export function deriveHistoricalArtifactCapabilityIds(
  state: Pick<CivilizationState, 'artifacts'>,
): ArtifactCivilizationCapabilityId[] {
  const capabilityIds = new Set<ArtifactCivilizationCapabilityId>();
  for (const lifecycle of Object.values(state.artifacts)) {
    if (lifecycle.masteryCount <= 0) continue;
    const metadata = ARTIFACT_TECHNOLOGY_METADATA_BY_ID[
      lifecycle.artifactId as keyof typeof ARTIFACT_TECHNOLOGY_METADATA_BY_ID
    ];
    for (const capabilityId of metadata?.capabilityIds ?? []) {
      capabilityIds.add(capabilityId);
    }
  }
  return [...capabilityIds].sort();
}

export interface CivilizationUncertaintyModifier {
  id: string;
  delta: number;
  label: string;
  requirements: readonly CivilizationTrajectoryRequirement[];
}

export interface CivilizationAuthoredUncertainty {
  baseSuccessChance: number;
  modifiers: readonly CivilizationUncertaintyModifier[];
}

export type CivilizationConsequence =
  | { type: 'apply_condition'; condition: CivilizationCondition }
  | { type: 'resolve_condition'; conditionId: string; resolvedTurnCount: number }
  | {
      type: 'set_artifact_implementation';
      artifactId: string;
      implementationState: CivilizationArtifactImplementationState;
      turnCount: number;
      source: CivilizationArtifactChangeSource;
    }
  | {
      type: 'set_entity_state';
      entityId: string;
      state: CivilizationEntity['state'];
      turnCount: number;
    }
  | {
      type: 'set_world_state';
      worldId: string;
      state: CivilizationWorld['state'];
      turnCount: number;
    }
  | { type: 'add_stability_contributor'; contributor: CivilizationStabilityContributor }
  | { type: 'advance_maturity'; maturity: CivilizationMaturity; evidence: CivilizationScaleEvidence }
  | {
      type: 'set_reach';
      reach: CivilizationOperationalReach;
      condition: CivilizationReachCondition;
      evidence: CivilizationScaleEvidence;
    }
  | { type: 'record_history'; key: string; value: string };

export interface CivilizationResolutionTrajectory {
  id: string;
  label: string;
  requirements: readonly CivilizationTrajectoryRequirement[];
  uncertainty: CivilizationAuthoredUncertainty | null;
  successConsequences: readonly CivilizationConsequence[];
  failureConsequences: readonly CivilizationConsequence[];
}

export interface CivilizationResolutionRequest {
  eventId: string;
  source: CivilizationArtifactChangeSource;
  form: CivilizationResolutionForm;
  /** Contextual resolution occurs inside its cause and never consumes a normal turn. */
  timing: 'trigger_window';
  pressureTags: readonly CivilizationPressureTag[];
  snapshot: CivilizationResolutionSnapshot;
  trajectories: readonly CivilizationResolutionTrajectory[];
  selectedTrajectoryId?: string | null;
  /** Authored random value in [0, 1); absent until the uncertainty step resolves. */
  uncertaintyRoll?: number | null;
}

export interface CivilizationRequirementEvaluation {
  requirement: CivilizationTrajectoryRequirement;
  satisfied: boolean;
  explanation: string;
}

export interface CivilizationTrajectoryEvaluation {
  trajectoryId: string;
  label: string;
  available: boolean;
  requirements: CivilizationRequirementEvaluation[];
  successChance: number | null;
  uncertaintyModifiers: Array<{
    id: string;
    delta: number;
    label: string;
    applied: boolean;
  }>;
}

export type CivilizationResolutionStatus =
  | 'awaiting_choice'
  | 'awaiting_uncertainty'
  | 'resolved'
  | 'no_available_trajectory'
  | 'invalid_selection';

export interface CivilizationResolutionResult {
  eventId: string;
  source: CivilizationArtifactChangeSource;
  pressureTags: readonly CivilizationPressureTag[];
  pressureResponses: CivilizationPressureResponseAssessment[];
  status: CivilizationResolutionStatus;
  form: CivilizationResolutionForm;
  selectedTrajectoryId: string | null;
  outcome: 'success' | 'failure' | null;
  evaluations: CivilizationTrajectoryEvaluation[];
  consequences: readonly CivilizationConsequence[];
  explanation: string[];
}

const STABILITY_EXECUTION_ORDER: Record<CivilizationStabilityBand, number> = {
  crisis: 0,
  unstable: 1,
  strained: 2,
  stable: 3,
};

const REACH_EXECUTION_ORDER: Record<CivilizationMaturity, number> = {
  planetary: 0,
  stellar: 1,
  galactic: 2,
};

const PRESSURE_COVERAGE_ORDER: Record<CivilizationPressureCapabilityCoverage, number> = {
  none: 0,
  partial: 1,
  strong: 2,
};

function evaluateCivilizationRequirement(
  requirement: CivilizationTrajectoryRequirement,
  snapshot: CivilizationResolutionSnapshot,
): CivilizationRequirementEvaluation {
  const capabilities = new Set(snapshot.activeCapabilityIds);
  const conditions = new Set(snapshot.activeConditionTypes);
  let satisfied = false;
  let explanation = '';

  switch (requirement.type) {
    case 'capability_active':
      satisfied = capabilities.has(requirement.capabilityId);
      explanation = `${requirement.capabilityId} ${satisfied ? 'is' : 'is not'} operational`;
      break;
    case 'capability_absent':
      satisfied = !capabilities.has(requirement.capabilityId);
      explanation = `${requirement.capabilityId} ${satisfied ? 'is absent' : 'is operational'}`;
      break;
    case 'pressure_capability_coverage': {
      const assessment = assessCivilizationPressureResponse(
        requirement.pressureTag,
        snapshot.activeCapabilityIds,
        snapshot.affinityIdentity,
      );
      satisfied = PRESSURE_COVERAGE_ORDER[assessment.capabilityCoverage] >=
        PRESSURE_COVERAGE_ORDER[requirement.minimum];
      explanation = `${requirement.pressureTag} capability coverage is ${assessment.capabilityCoverage}; requires ${requirement.minimum}`;
      break;
    }
    case 'minimum_pressure_aptitude': {
      const assessment = assessCivilizationPressureResponse(
        requirement.pressureTag,
        snapshot.activeCapabilityIds,
        snapshot.affinityIdentity,
      );
      satisfied = assessment.aptitudeScore >= requirement.score;
      explanation = `${requirement.pressureTag} aptitude is ${assessment.aptitudeScore}; requires ${requirement.score}`;
      break;
    }
    case 'maximum_pressure_risk': {
      const assessment = assessCivilizationPressureResponse(
        requirement.pressureTag,
        snapshot.activeCapabilityIds,
        snapshot.affinityIdentity,
      );
      satisfied = assessment.riskScore <= requirement.score;
      explanation = `${requirement.pressureTag} characteristic risk is ${assessment.riskScore}; maximum ${requirement.score}`;
      break;
    }
    case 'condition_present':
      satisfied = conditions.has(requirement.conditionType);
      explanation = `${requirement.conditionType} ${satisfied ? 'is active' : 'is not active'}`;
      break;
    case 'condition_absent':
      satisfied = !conditions.has(requirement.conditionType);
      explanation = `${requirement.conditionType} ${satisfied ? 'is absent' : 'is active'}`;
      break;
    case 'minimum_stability':
      satisfied = STABILITY_EXECUTION_ORDER[snapshot.stabilityBand] >= STABILITY_EXECUTION_ORDER[requirement.band];
      explanation = `Stability is ${snapshot.stabilityBand}; requires ${requirement.band} or stronger`;
      break;
    case 'minimum_reach':
      satisfied = snapshot.currentReach !== 'unknown' &&
        REACH_EXECUTION_ORDER[snapshot.currentReach] >= REACH_EXECUTION_ORDER[requirement.reach];
      explanation = `Reach is ${snapshot.currentReach}; requires ${requirement.reach}`;
      break;
    case 'historical_affinity': {
      const weight = snapshot.affinityIdentity.historicalCounts[requirement.affinity];
      satisfied = weight >= requirement.minimumWeight;
      explanation = `Historical ${requirement.affinity} weight is ${weight}; requires ${requirement.minimumWeight}`;
      break;
    }
    case 'operational_affinity': {
      const weight = snapshot.affinityIdentity.operationalCounts[requirement.affinity];
      satisfied = weight >= requirement.minimumWeight;
      explanation = `Operational ${requirement.affinity} weight is ${weight}; requires ${requirement.minimumWeight}`;
      break;
    }
    case 'dominant_dyad':
      satisfied = snapshot.affinityIdentity.dominantDyad === requirement.dyad;
      explanation = `Dominant dyad is ${snapshot.affinityIdentity.dominantDyad ?? 'none'}; requires ${requirement.dyad}`;
      break;
  }

  return { requirement, satisfied, explanation };
}

function evaluateCivilizationTrajectory(
  trajectory: CivilizationResolutionTrajectory,
  snapshot: CivilizationResolutionSnapshot,
): CivilizationTrajectoryEvaluation {
  const requirements = trajectory.requirements.map((requirement) =>
    evaluateCivilizationRequirement(requirement, snapshot),
  );
  const available = requirements.every((requirement) => requirement.satisfied);
  if (!trajectory.uncertainty) {
    return {
      trajectoryId: trajectory.id,
      label: trajectory.label,
      available,
      requirements,
      successChance: null,
      uncertaintyModifiers: [],
    };
  }

  const uncertaintyModifiers = trajectory.uncertainty.modifiers.map((modifier) => {
    const applied = modifier.requirements.every((requirement) =>
      evaluateCivilizationRequirement(requirement, snapshot).satisfied,
    );
    return { id: modifier.id, delta: modifier.delta, label: modifier.label, applied };
  });
  const successChance = Math.max(
    0,
    Math.min(
      1,
      trajectory.uncertainty.baseSuccessChance +
        uncertaintyModifiers.reduce((sum, modifier) => sum + (modifier.applied ? modifier.delta : 0), 0),
    ),
  );
  return {
    trajectoryId: trajectory.id,
    label: trajectory.label,
    available,
    requirements,
    successChance,
    uncertaintyModifiers,
  };
}

export function resolveCivilizationEvent(
  request: CivilizationResolutionRequest,
): CivilizationResolutionResult {
  const pressureResponses = assessCivilizationPressureResponses(
    request.pressureTags,
    request.snapshot.activeCapabilityIds,
    request.snapshot.affinityIdentity,
  );
  const evaluations = request.trajectories.map((trajectory) =>
    evaluateCivilizationTrajectory(trajectory, request.snapshot),
  );
  const available = evaluations.filter((evaluation) => evaluation.available);
  if (available.length === 0) {
    return {
      eventId: request.eventId,
      source: request.source,
      pressureTags: request.pressureTags,
      pressureResponses,
      status: 'no_available_trajectory',
      form: request.form,
      selectedTrajectoryId: null,
      outcome: null,
      evaluations,
      consequences: [],
      explanation: ['No authored trajectory can be executed from the current Civilization state.'],
    };
  }

  const selectedId = request.form === 'automatic'
    ? available[0].trajectoryId
    : request.selectedTrajectoryId ?? null;
  if (!selectedId) {
    return {
      eventId: request.eventId,
      source: request.source,
      pressureTags: request.pressureTags,
      pressureResponses,
      status: 'awaiting_choice',
      form: request.form,
      selectedTrajectoryId: null,
      outcome: null,
      evaluations,
      consequences: [],
      explanation: ['A contextual trajectory must be selected inside the trigger window.'],
    };
  }

  const evaluation = evaluations.find((entry) => entry.trajectoryId === selectedId);
  const trajectory = request.trajectories.find((entry) => entry.id === selectedId);
  if (!evaluation?.available || !trajectory) {
    return {
      eventId: request.eventId,
      source: request.source,
      pressureTags: request.pressureTags,
      pressureResponses,
      status: 'invalid_selection',
      form: request.form,
      selectedTrajectoryId: selectedId,
      outcome: null,
      evaluations,
      consequences: [],
      explanation: ['The selected trajectory is unavailable in the current Civilization state.'],
    };
  }

  if (evaluation.successChance !== null && request.uncertaintyRoll == null) {
    return {
      eventId: request.eventId,
      source: request.source,
      pressureTags: request.pressureTags,
      pressureResponses,
      status: 'awaiting_uncertainty',
      form: request.form,
      selectedTrajectoryId: selectedId,
      outcome: null,
      evaluations,
      consequences: [],
      explanation: [
        `Authored uncertainty remains: ${(evaluation.successChance * 100).toFixed(1)}% success.`,
      ],
    };
  }

  const success = evaluation.successChance === null ||
    (
      typeof request.uncertaintyRoll === 'number' &&
      request.uncertaintyRoll >= 0 &&
      request.uncertaintyRoll < 1 &&
      request.uncertaintyRoll < evaluation.successChance
    );
  return {
    eventId: request.eventId,
    source: request.source,
    pressureTags: request.pressureTags,
    pressureResponses,
    status: 'resolved',
    form: request.form,
    selectedTrajectoryId: selectedId,
    outcome: success ? 'success' : 'failure',
    evaluations,
    consequences: success ? trajectory.successConsequences : trajectory.failureConsequences,
    explanation: [
      ...evaluation.requirements.map((requirement) => requirement.explanation),
      evaluation.successChance === null
        ? 'Preparation determines the result; no random roll is used.'
        : `Authored uncertainty resolved at ${(evaluation.successChance * 100).toFixed(1)}% success.`,
    ],
  };
}

export interface ApplyCivilizationConsequencesOptions {
  stabilityCalibration?: CivilizationStabilityCalibration;
  outcomeSignals?: readonly CivilizationOutcomeSignal[];
  adversity?: CivilizationAdversityEvidence | null;
}

export interface AppliedCivilizationConsequences {
  state: CivilizationState;
  history: Record<string, string>;
}

export interface AppliedCivilizationResolution extends AppliedCivilizationConsequences {
  event: CivilizationEventHistoryEntry;
}

export function applyCivilizationConsequences(
  current: CivilizationState,
  consequences: readonly CivilizationConsequence[],
  options: ApplyCivilizationConsequencesOptions = {},
): AppliedCivilizationConsequences {
  let state = current;
  const history: Record<string, string> = {};
  for (const consequence of consequences) {
    switch (consequence.type) {
      case 'apply_condition':
        state = applyCivilizationCondition(state, consequence.condition);
        break;
      case 'resolve_condition':
        state = resolveCivilizationCondition(state, consequence.conditionId, consequence.resolvedTurnCount);
        break;
      case 'set_artifact_implementation': {
        const prior = state.artifacts[consequence.artifactId];
        state = {
          ...state,
          artifacts: {
            ...state.artifacts,
            [consequence.artifactId]: {
              artifactId: consequence.artifactId,
              firstMasteredTurnCount: prior?.firstMasteredTurnCount ?? null,
              masteryCount: Math.max(1, prior?.masteryCount ?? 0),
              implementationState: consequence.implementationState,
              implementationStateChangedTurnCount: consequence.turnCount,
              implementationChangeSource: consequence.source,
              historyEvidence: prior?.historyEvidence ?? 'legacy_inferred',
            },
          },
        };
        state = {
          ...state,
          affinityIdentity: deriveCivilizationAffinityIdentity(state.artifacts),
        };
        break;
      }
      case 'set_entity_state': {
        const entity = state.entities[consequence.entityId];
        if (entity) {
          state = upsertCivilizationEntity(state, {
            ...entity,
            state: consequence.state,
            stateChangedTurnCount: consequence.turnCount,
          });
        }
        break;
      }
      case 'set_world_state': {
        const world = state.worlds[consequence.worldId];
        if (world) {
          state = upsertCivilizationWorld(state, {
            ...world,
            state: consequence.state,
            stateChangedTurnCount: consequence.turnCount,
          });
        }
        break;
      }
      case 'add_stability_contributor':
        state = {
          ...state,
          stability: addCivilizationStabilityContributor(
            state.stability,
            consequence.contributor,
            options.stabilityCalibration,
          ),
        };
        break;
      case 'advance_maturity':
        state = {
          ...state,
          scale: advanceCivilizationMaturity(state.scale, consequence.maturity, consequence.evidence),
        };
        break;
      case 'set_reach':
        state = {
          ...state,
          scale: setCivilizationOperationalReach(
            state.scale,
            consequence.reach,
            consequence.condition,
            consequence.evidence,
          ),
        };
        break;
      case 'record_history':
        history[consequence.key] = consequence.value;
        break;
    }
  }
  const consequenceTurns = consequences.flatMap((consequence) => {
    switch (consequence.type) {
      case 'apply_condition':
        return consequence.condition.appliedTurnCount ?? [];
      case 'resolve_condition':
        return consequence.resolvedTurnCount;
      case 'set_artifact_implementation':
      case 'set_entity_state':
      case 'set_world_state':
        return consequence.turnCount;
      case 'add_stability_contributor':
        return consequence.contributor.appliedTurnCount ?? [];
      case 'advance_maturity':
        return consequence.evidence.turnCount ?? [];
      case 'set_reach':
        return consequence.evidence.turnCount ?? [];
      case 'record_history':
        return [];
    }
  });
  const calculatedTurnCount = consequenceTurns.length > 0
    ? Math.max(...consequenceTurns)
    : state.stability.calculatedTurnCount;
  state = {
    ...state,
    affinityIdentity: deriveCivilizationAffinityIdentity(state.artifacts),
  };
  state = {
    ...state,
    stability: recalculateCivilizationStabilityFromState(
      state,
      calculatedTurnCount,
      options.stabilityCalibration ?? CIVILIZATION_STABILITY_CALIBRATION_V1,
    ),
  };
  return { state, history };
}

/**
 * Applies a completed authored resolution and appends one deduplicated causal
 * record. Live state retains a bounded ledger while the immutable match record
 * captures its final contents at closure.
 */
export function applyCivilizationResolution(
  current: CivilizationState,
  resolution: CivilizationResolutionResult,
  turnCount: number | null,
  summary: string,
  options: ApplyCivilizationConsequencesOptions = {},
): AppliedCivilizationResolution {
  if (
    resolution.status !== 'resolved' ||
    resolution.selectedTrajectoryId === null ||
    resolution.outcome === null
  ) {
    throw new Error(`Civilization resolution ${resolution.eventId} is not complete`);
  }

  const applied = applyCivilizationConsequences(current, resolution.consequences, options);
  const event: CivilizationEventHistoryEntry = {
    eventId: resolution.eventId,
    source: resolution.source,
    turnCount,
    form: resolution.form,
    pressureTags: [...resolution.pressureTags],
    selectedTrajectoryId: resolution.selectedTrajectoryId,
    outcome: resolution.outcome,
    summary,
    history: applied.history,
    outcomeSignals: [...(options.outcomeSignals ?? [])],
    adversity: options.adversity ?? null,
    historyEvidence: 'recorded',
  };
  const events = [
    ...applied.state.events.filter((entry) => entry.eventId !== event.eventId),
    event,
  ].slice(-64);

  return {
    ...applied,
    state: { ...applied.state, events },
    event,
  };
}

export const BLUEPRINT_IDS = [
  'bp_antimatter_detonator',
  'bp_mantle_to_orbit_foundry',
  'bp_ascension_registry',
  'bp_worldshield_covenant',
] as const;

export type BlueprintId = (typeof BLUEPRINT_IDS)[number];

/** Records physically exposed by the first Lumii clearance threshold. */
export const OUTER_VAULT_BLUEPRINT_IDS = [
  'bp_antimatter_detonator',
  'bp_mantle_to_orbit_foundry',
  'bp_worldshield_covenant',
] as const satisfies readonly BlueprintId[];

export const BLUEPRINT_CLAIM_ACTIONS = [
  'foundry_sustainable',
  'foundry_overdrive',
  'foundry_recovery',
] as const;

export type BlueprintClaimAction = (typeof BLUEPRINT_CLAIM_ACTIONS)[number];

export const CHRONICLE_IDS = [
  'chronicle_outer_vault_access',
] as const;

export type ChronicleId = (typeof CHRONICLE_IDS)[number];

export const CHRONICLE_STATUSES = [
  'sealed',
  'available',
  'recovered',
] as const;

export type ChronicleStatus = (typeof CHRONICLE_STATUSES)[number];

export const BLUEPRINT_PRESENTATION_VARIANTS = [
  'armored',
  'original',
  'asymmetric',
  'lattice',
] as const;

export type BlueprintPresentationVariant =
  (typeof BLUEPRINT_PRESENTATION_VARIANTS)[number];

export const GAME_MODES = [
  'standard',
  'campaign',
  'custom',
  'competitive',
] as const;

export type GameMode = (typeof GAME_MODES)[number];

export const BLUEPRINT_POLICIES = [
  'none',
  'owned',
  'all',
  'seasonal',
  'scenario',
] as const;

export type BlueprintPolicy = (typeof BLUEPRINT_POLICIES)[number];

export const BLUEPRINT_CLEARANCE_STATUSES = [
  'classified',
  'challenge_ready',
  'challenge_active',
  'cleared',
] as const;

export type BlueprintClearanceStatus =
  (typeof BLUEPRINT_CLEARANCE_STATUSES)[number];

export const BLUEPRINT_CLEARANCE_REQUIRED_WINS = 5;

export const LUMII_THRESHOLD_APPROACHES = [
  'kinship',
  'inquiry',
  'dominion',
] as const;

export type LumiiThresholdApproach =
  (typeof LUMII_THRESHOLD_APPROACHES)[number];

export const LUMII_THRESHOLD_DIALOGUE_CHOICE_IDS = [
  'kinship-want',
  'kinship-fear',
  'kinship-familiar',
  'kinship-with-you',
  'kinship-help',
  'kinship-grow',
  'inquiry-answer',
  'inquiry-warning',
  'inquiry-relation',
  'inquiry-unsayable',
  'inquiry-warning-against',
  'inquiry-preserve',
  'inquiry-risk',
  'inquiry-pattern',
  'dominion-decide',
  'dominion-cipher',
  'dominion-stand',
  'dominion-stop',
] as const;

export type LumiiThresholdDialogueChoiceId =
  (typeof LUMII_THRESHOLD_DIALOGUE_CHOICE_IDS)[number];

export const LUMII_THRESHOLD_DIALOGUE_RESOLUTIONS = [
  'left',
  'continued',
] as const;

export type LumiiThresholdDialogueResolution =
  (typeof LUMII_THRESHOLD_DIALOGUE_RESOLUTIONS)[number];

export const LUMII_THRESHOLD_DIALOGUE_PATHS: Record<
  LumiiThresholdApproach,
  readonly (readonly LumiiThresholdDialogueChoiceId[])[]
> = {
  kinship: [
    ['kinship-want', 'kinship-with-you'],
    ['kinship-fear', 'kinship-help'],
    ['kinship-familiar', 'kinship-grow'],
  ],
  inquiry: [
    ['inquiry-answer', 'inquiry-unsayable'],
    ['inquiry-warning', 'inquiry-warning-against', 'inquiry-risk'],
    ['inquiry-relation', 'inquiry-pattern'],
  ],
  dominion: [
    ['dominion-decide'],
    ['dominion-cipher'],
    ['dominion-stand'],
  ],
};

export type BlueprintDeviceState =
  | 'armed'
  | 'ready'
  | 'recovering'
  | 'vigilant'
  | 'spent';

export interface BlueprintComponentDefinition {
  artifactId: string;
  stage: string;
  function: string;
}

export interface BlueprintPresentationMetadata {
  serialCode: string;
  scaleLabel: 'Planetary' | 'Stellar';
  canonicalVariant: BlueprintPresentationVariant;
  manifestationTreatment: 'dedicated' | 'shared';
  detonationTreatment: 'dedicated' | 'none';
}

export const BLUEPRINT_CIVILIZATION_TRIGGER_WINDOWS = [
  'legal_forge_before_payment',
  'legal_encrypt_before_reserve',
  'project_claim',
  'hostile_claim_interception',
  'turn_start_observation',
] as const;

export type BlueprintCivilizationTriggerWindow =
  (typeof BLUEPRINT_CIVILIZATION_TRIGGER_WINDOWS)[number];

export interface BlueprintCivilizationMetadata {
  projectForm: string;
  scaleBand: 'planetary' | 'stellar' | 'galactic';
  affinity: StandardAffinityKey;
  siteTitle: string;
  visibleAs: string;
  siteSummary: string;
  laneLabel: string;
  manifestation: 'automatic';
  triggerWindows: readonly BlueprintCivilizationTriggerWindow[];
  resolutionForm: CivilizationResolutionForm;
  pressureTags: readonly CivilizationPressureTag[];
  providedCapabilityIds: readonly CivilizationCapabilityId[];
  interactingCapabilityIds: readonly CivilizationCapabilityId[];
  consequencePolicyStatus:
    | 'deferred_by_civilization_spec'
    | 'requires_runtime_reconciliation'
    | 'runtime_aligned';
}

export interface BlueprintDefinition {
  id: BlueprintId;
  name: string;
  family: 'catastrophe_engine' | 'industrial_chain' | 'institution' | 'covenant';
  components: readonly BlueprintComponentDefinition[];
  publicEffect: string;
  initialDeviceState: BlueprintDeviceState;
  competitiveApproved: boolean;
  presentation: BlueprintPresentationMetadata;
  civilization: BlueprintCivilizationMetadata;
}

export const BLUEPRINT_DEFINITIONS: Record<BlueprintId, BlueprintDefinition> = {
  bp_antimatter_detonator: {
    id: 'bp_antimatter_detonator',
    name: 'Antimatter Detonator',
    family: 'catastrophe_engine',
    components: [
      {
        artifactId: 't1r01',
        stage: 'Reaction Core',
        function: 'Supplies the controlled reaction mass and the first ignition event inside the containment field.',
      },
      {
        artifactId: 't1p04',
        stage: 'Containment Cage',
        function: 'Suspends matter and antimatter across a governed magnetic boundary until firing is authorized.',
      },
      {
        artifactId: 't1r04',
        stage: 'Governed Trigger',
        function: 'Orders the ignition sequence and prevents the reaction from beginning without a valid command.',
      },
      {
        artifactId: 't2o01',
        stage: 'Annihilation Sink',
        function: 'Draws the annihilation boundary away from the civilization and absorbs the reaction horizon.',
      },
    ],
    publicEffect:
      'Uniformly mark a face-up Tier II Artifact. A legal Forge or Encrypt Annihilates it before payment; gain 2 Eminence and become Spent. Broken Covenant also Annihilates two random eligible Tier I implementations belonging to the claimant.',
    initialDeviceState: 'armed',
    competitiveApproved: true,
    presentation: {
      serialCode: 'BP-AD-01',
      scaleLabel: 'Stellar',
      canonicalVariant: 'armored',
      manifestationTreatment: 'dedicated',
      detonationTreatment: 'dedicated',
    },
    civilization: {
      projectForm: 'Stellar Device',
      scaleBand: 'stellar',
      affinity: 'abyss',
      siteTitle: 'Antimatter Quarantine Orbit',
      visibleAs: 'a cold red exclusion path around the inhabited system',
      siteSummary: 'Controlled annihilation infrastructure, warning lanes, and a reserved catastrophe orbit make the device visible at civilization scale.',
      laneLabel: 'Controlled catastrophe',
      manifestation: 'automatic',
      triggerWindows: ['legal_forge_before_payment', 'legal_encrypt_before_reserve'],
      resolutionForm: 'automatic',
      pressureTags: ['disruption', 'attrition'],
      providedCapabilityIds: [CIVILIZATION_PROJECT_CAPABILITIES.antimatterClaimAnnihilation],
      interactingCapabilityIds: [CIVILIZATION_PROJECT_CAPABILITIES.hostileClaimInterception],
      consequencePolicyStatus: 'runtime_aligned',
    },
  },
  bp_mantle_to_orbit_foundry: {
    id: 'bp_mantle_to_orbit_foundry',
    name: 'Mantle-to-Orbit Foundry',
    family: 'industrial_chain',
    components: [
      {
        artifactId: 't1r07',
        stage: 'Thermal Baffle',
        function: 'Routes mantle heat and decay into useful work before either can destroy the ascent chambers.',
      },
      {
        artifactId: 't1s02',
        stage: 'Mantlelift Coil',
        function: 'Accelerates sealed feedstock capsules from the deep crust into stable orbit along a timed induction line.',
      },
      {
        artifactId: 't1o05',
        stage: 'Vacuum Forge Die',
        function: 'Forms lifted feedstock into precise orbital structures without atmosphere, convection, or contaminating vapor.',
      },
    ],
    publicEffect:
      'Gain 1 Eminence. Twice, Foundry Forge a face-up Tier II Artifact with each nonzero printed natural Affinity channel reduced by 1. Then Overdrive may repeat the discount and seal the three Foundry components in Cipher storage.',
    initialDeviceState: 'ready',
    competitiveApproved: true,
    presentation: {
      serialCode: 'BP-MO-01',
      scaleLabel: 'Planetary',
      canonicalVariant: 'armored',
      manifestationTreatment: 'dedicated',
      detonationTreatment: 'none',
    },
    civilization: {
      projectForm: 'Planetary Infrastructure',
      scaleBand: 'planetary',
      affinity: 'flare',
      siteTitle: 'Mantle-to-Orbit Freight Lane',
      visibleAs: 'a forged ascent corridor connecting deep crust to orbital industry',
      siteSummary: 'Repeated launch paths, feedstock traffic, and orbital manufacturing traces make the Foundry visible at civilization scale.',
      laneLabel: 'Orbital industry',
      manifestation: 'automatic',
      triggerWindows: ['project_claim'],
      resolutionForm: 'contextual',
      pressureTags: [],
      providedCapabilityIds: [CIVILIZATION_PROJECT_CAPABILITIES.foundryForge],
      interactingCapabilityIds: [],
      consequencePolicyStatus: 'runtime_aligned',
    },
  },
  bp_ascension_registry: {
    id: 'bp_ascension_registry',
    name: 'Ascension Registry',
    family: 'institution',
    components: [
      {
        artifactId: 't1p05',
        stage: 'Readiness Verification',
        function: 'Verifies that a civilization began its turn with a legal Tier II claim available.',
      },
      {
        artifactId: 't1s03',
        stage: 'Deferral Boundary',
        function: 'Distinguishes a genuine deferred claim from a claim that was attempted and interrupted.',
      },
      {
        artifactId: 't1r08',
        stage: 'Public Record',
        function: 'Publishes each qualifying deferral and clears the record when any legal Tier II claim is made.',
      },
    ],
    publicEffect:
      'When another civilization begins a turn with a legal Tier II claim but makes none, add 1 public Deferral, at most once per round. Any legal Tier II claim clears all Deferrals. At 2, gain 2 Eminence and become Spent; under Broken Covenant, clear Deferrals and remain Active.',
    initialDeviceState: 'ready',
    competitiveApproved: false,
    presentation: {
      serialCode: 'BP-AR-01',
      scaleLabel: 'Stellar',
      canonicalVariant: 'armored',
      manifestationTreatment: 'shared',
      detonationTreatment: 'none',
    },
    civilization: {
      projectForm: 'Stellar Institution',
      scaleBand: 'stellar',
      affinity: 'radiance',
      siteTitle: 'Ascension Registry Beacon',
      visibleAs: 'a public stellar readiness ledger carried across civic signal lanes',
      siteSummary: 'Verification beacons, public deferral records, and coordinated claim-readiness signals reveal the distributed institution.',
      laneLabel: 'Public coordination',
      manifestation: 'automatic',
      triggerWindows: ['turn_start_observation'],
      resolutionForm: 'automatic',
      pressureTags: ['coordination'],
      providedCapabilityIds: [CIVILIZATION_PROJECT_CAPABILITIES.claimDeferralObservation],
      interactingCapabilityIds: [],
      consequencePolicyStatus: 'runtime_aligned',
    },
  },
  bp_worldshield_covenant: {
    id: 'bp_worldshield_covenant',
    name: 'Worldshield Covenant',
    family: 'covenant',
    components: [
      {
        artifactId: 't1s01',
        stage: 'Early Warning',
        function: 'Models the point where a hostile effect would interrupt a legal claim.',
      },
      {
        artifactId: 't1o01',
        stage: 'Concealed Defense',
        function: 'Hides the protected claim inside a controlled decay shadow until the hostile effect is spent.',
      },
      {
        artifactId: 't1p06',
        stage: 'Civic Repair',
        function: 'Restores the legal claim path after the hostile source has been expended.',
      },
    ],
    publicEffect:
      'Gain 1 Eminence. Intercept the first hostile effect that would Burn, Annihilate, Nullify, or cancel your legal Artifact claim; continue the claim normally, then become Spent. Under Broken Covenant, remain Vigilant.',
    initialDeviceState: 'vigilant',
    competitiveApproved: false,
    presentation: {
      serialCode: 'BP-WC-01',
      scaleLabel: 'Planetary',
      canonicalVariant: 'armored',
      manifestationTreatment: 'dedicated',
      detonationTreatment: 'none',
    },
    civilization: {
      projectForm: 'Planetary Network',
      scaleBand: 'planetary',
      affinity: 'radiance',
      siteTitle: 'Worldshield Covenant Veil',
      visibleAs: 'a treaty-lit defense envelope wrapped around the civilization',
      siteSummary: 'Public warning, concealment, and repair infrastructure make the Covenant visible without reducing it to a single machine.',
      laneLabel: 'Civic defense',
      manifestation: 'automatic',
      triggerWindows: ['hostile_claim_interception'],
      resolutionForm: 'automatic',
      pressureTags: [],
      providedCapabilityIds: [CIVILIZATION_PROJECT_CAPABILITIES.hostileClaimInterception],
      interactingCapabilityIds: [CIVILIZATION_PROJECT_CAPABILITIES.antimatterClaimAnnihilation],
      consequencePolicyStatus: 'runtime_aligned',
    },
  },
};

export interface ChronicleDefinition {
  id: ChronicleId;
  title: string;
  chapterLabel: string;
  summary: string;
  relatedBlueprintIds: readonly BlueprintId[];
  civilization: ChronicleCivilizationAuthoring;
}

export const CHRONICLE_CIVILIZATION_ROLES = [
  'account_record',
  'runtime_pressure',
] as const;

export type ChronicleCivilizationRole =
  (typeof CHRONICLE_CIVILIZATION_ROLES)[number];

export interface ChronicleCivilizationOutcomeProfile {
  resolutionId: string;
  pressureTags: readonly CivilizationPressureTag[];
  outcomeSignals: readonly CivilizationOutcomeSignal[];
  adversity: CivilizationAdversityEvidence | null;
}

export interface ChronicleCivilizationAuthoring {
  role: ChronicleCivilizationRole;
  /** Runtime-pressure Chronicles author one profile for every recorded resolution. */
  outcomeProfiles: readonly ChronicleCivilizationOutcomeProfile[];
}

export const CHRONICLE_DEFINITIONS: Record<ChronicleId, ChronicleDefinition> = {
  chronicle_outer_vault_access: {
    id: 'chronicle_outer_vault_access',
    title: 'Outer Vault Access',
    chapterLabel: 'Threshold Record',
    summary:
      'The first recovered Vault thread: Lumii yields the outer threshold, Antimatter Detonator is recovered, and deeper records remain corrupted.',
    relatedBlueprintIds: ['bp_antimatter_detonator'],
    civilization: {
      role: 'account_record',
      outcomeProfiles: [],
    },
  },
};

export interface BlueprintLoadout {
  mode: GameMode;
  slots: Array<BlueprintId | null>;
}

export interface BlueprintPrivateState {
  blueprintId: BlueprintId;
  slotIndex: number;
  matchedComponentIds: string[];
  manifested: boolean;
  secretTargetCardId?: string | null;
  safePreManifestActionPlayerIds?: string[];
  /** Owner-only Foundry components held in exceptional Cipher storage after Overdrive. */
  foundryStoredArtifactIds?: string[];
  /** @deprecated Compatibility read for Broken-Covenant saves created before Foundry storage. */
  foundryRecoveryArtifactIds?: string[];
  /** Server observation cursor for Ascension Registry; never projected to opponents. */
  ascensionObservedPlayerId?: string | null;
  ascensionObservedTurnCount?: number | null;
  ascensionLastDeferralRound?: number | null;
}

export interface EncryptedArtifactState {
  reservedArtifactIds?: readonly string[];
  blueprintPrivateStates?: readonly BlueprintPrivateState[];
}

/** Canonical Foundry storage read, with legacy Broken-Covenant recovery compatibility. */
export function foundryStoredArtifactIds(state: EncryptedArtifactState): string[] {
  const foundry = state.blueprintPrivateStates?.find(
    (entry) => entry.blueprintId === 'bp_mantle_to_orbit_foundry',
  );
  const stored = foundry?.foundryStoredArtifactIds ?? foundry?.foundryRecoveryArtifactIds ?? [];
  return [...new Set(stored)];
}

/** Counts only ordinary Encrypted Artifacts; Foundry-bound overflow never consumes capacity. */
export function ordinaryEncryptedCount(state: EncryptedArtifactState): number {
  const stored = new Set(foundryStoredArtifactIds(state));
  return (state.reservedArtifactIds ?? []).filter((artifactId) => !stored.has(artifactId)).length;
}

export interface ManifestedDevicePublicState {
  blueprintId: BlueprintId;
  ownerPlayerId: string;
  slotIndex: number;
  state: BlueprintDeviceState;
  presentationVariant: BlueprintPresentationVariant;
  /** Canonical v2 Foundry state. Legacy readiness fields remain optional below. */
  foundryUsesRemaining?: number;
  /** Public Deferral pressure recorded by Ascension Registry. */
  ascensionDeferrals?: number;
  /** Legacy v1 Foundry fields retained for compatibility reads only. */
  foundryTier2Ready?: boolean;
  foundryTier3Ready?: boolean;
}

/**
 * Projects provide their authored capabilities only while their public device
 * is operational. Recovery preserves the Project's history but suspends its
 * capability until the recovery sequence completes.
 */
export function deriveOperationalProjectCapabilityIds(
  devices: readonly ManifestedDevicePublicState[],
): CivilizationCapabilityId[] {
  const capabilityIds = new Set<CivilizationCapabilityId>();
  for (const device of devices) {
    if (device.state === 'spent' || device.state === 'recovering') continue;
    const definition = BLUEPRINT_DEFINITIONS[device.blueprintId];
    for (const capabilityId of definition?.civilization.providedCapabilityIds ?? []) {
      capabilityIds.add(capabilityId);
    }
  }
  return [...capabilityIds].sort();
}

export const CIVILIZATION_MATURITY_POLICY_ID = 'civilization-maturity-v1' as const;

export interface CivilizationMaturityCriterion {
  id: string;
  label: string;
  satisfied: boolean;
  observed: number | boolean;
  required: number | boolean;
}

export interface CivilizationMaturityAssessment {
  policyId: typeof CIVILIZATION_MATURITY_POLICY_ID;
  mode: 'historical' | 'operational';
  candidateMaturity: CivilizationMaturity;
  artifactImplementationCount: number;
  capabilityIds: ArtifactCivilizationCapabilityId[];
  capabilityDomains: CivilizationCapabilityDomain[];
  manifestedProjectCount: number;
  stellarProjectCount: number;
  galacticProjectCount: number;
  settledWorldCount: number;
  networkCount: number;
  interstellarCapabilityTriad: boolean;
  stellarFoundationSignalCount: number;
  stellarCriteria: CivilizationMaturityCriterion[];
  galacticCriteria: CivilizationMaturityCriterion[];
  explanation: string[];
}

const INTERSTELLAR_COORDINATION_CAPABILITIES = new Set<ArtifactCivilizationCapabilityId>([
  'artifact:temporal_coordination',
  'artifact:distributed_coordination',
  'artifact:secure_communication',
]);

const INTERSTELLAR_SUSTAINMENT_CAPABILITIES = new Set<ArtifactCivilizationCapabilityId>([
  'artifact:controlled_energy',
  'artifact:energy_conversion',
  'artifact:habitat_engineering',
  'artifact:ecological_adaptation',
  'artifact:resource_reclamation',
]);

function artifactCapabilityDomains(
  capabilityIds: readonly ArtifactCivilizationCapabilityId[],
): CivilizationCapabilityDomain[] {
  return [...new Set(capabilityIds.map((capabilityId) =>
    ARTIFACT_CIVILIZATION_CAPABILITY_DOMAIN_BY_ID[capabilityId],
  ))].sort();
}

function hasAnyCapability(
  capabilityIds: ReadonlySet<ArtifactCivilizationCapabilityId>,
  candidates: ReadonlySet<ArtifactCivilizationCapabilityId>,
): boolean {
  return [...candidates].some((capabilityId) => capabilityIds.has(capabilityId));
}

function criterion(
  id: string,
  label: string,
  observed: number | boolean,
  required: number | boolean,
): CivilizationMaturityCriterion {
  const satisfied = typeof observed === 'boolean'
    ? observed === required
    : observed >= (required as number);
  return { id, label, satisfied, observed, required };
}

/**
 * Derives demonstrated scale from breadth plus independent scale signals.
 * Artwork depiction scale, Artifact tier, and literal Kardashev Type are
 * intentionally absent from this calculation.
 */
export function assessCivilizationMaturity(
  state: CivilizationState,
  manifestedDevices: readonly ManifestedDevicePublicState[] = [],
  mode: CivilizationMaturityAssessment['mode'] = 'historical',
): CivilizationMaturityAssessment {
  const historical = mode === 'historical';
  const artifactLifecycles = Object.values(state.artifacts).filter((lifecycle) =>
    lifecycle.masteryCount > 0 && (historical || lifecycle.implementationState === 'operational'),
  );
  const capabilityIds = historical
    ? deriveHistoricalArtifactCapabilityIds({ artifacts: Object.fromEntries(
        artifactLifecycles.map((lifecycle) => [lifecycle.artifactId, lifecycle]),
      ) })
    : deriveOperationalArtifactCapabilityIds({ artifacts: Object.fromEntries(
        artifactLifecycles.map((lifecycle) => [lifecycle.artifactId, lifecycle]),
      ) }) as ArtifactCivilizationCapabilityId[];
  const capabilitySet = new Set(capabilityIds);
  const capabilityDomains = artifactCapabilityDomains(capabilityIds);
  const devices = manifestedDevices.filter((device) =>
    historical || (device.state !== 'spent' && device.state !== 'recovering'),
  );
  const projectScaleBands = devices.map((device) =>
    BLUEPRINT_DEFINITIONS[device.blueprintId]?.civilization.scaleBand ?? 'planetary',
  );
  const stellarProjectCount = projectScaleBands.filter((scale) => scale !== 'planetary').length;
  const galacticProjectCount = projectScaleBands.filter((scale) => scale === 'galactic').length;
  const settledWorldCount = Object.values(state.worlds).filter((world) =>
    world.role === 'settled_world' && (historical || world.state === 'active'),
  ).length;
  const networkCount = Object.values(state.entities).filter((entity) =>
    entity.kind === 'network' && (historical || entity.state === 'operational'),
  ).length;
  const interstellarCapabilityTriad =
    capabilitySet.has('artifact:transit_navigation') &&
    hasAnyCapability(capabilitySet, INTERSTELLAR_COORDINATION_CAPABILITIES) &&
    hasAnyCapability(capabilitySet, INTERSTELLAR_SUSTAINMENT_CAPABILITIES);
  const stellarFoundationSignalCount =
    Number(stellarProjectCount > 0) +
    Number(settledWorldCount > 0) +
    Number(networkCount > 0) +
    Number(interstellarCapabilityTriad);

  const stellarCriteria = [
    criterion('stellar-artifact-breadth', 'At least six distinct mastered implementations', artifactLifecycles.length, 6),
    criterion('stellar-capability-breadth', 'At least six qualitative capabilities', capabilityIds.length, 6),
    criterion('stellar-domain-breadth', 'At least three capability domains', capabilityDomains.length, 3),
    criterion('stellar-scale-signal', 'At least one independent stellar foundation signal', stellarFoundationSignalCount, 1),
  ];
  const hasGalacticAnchor = galacticProjectCount > 0 || (
    interstellarCapabilityTriad && (
      stellarProjectCount >= 2 ||
      settledWorldCount >= 2 ||
      (stellarProjectCount >= 1 && settledWorldCount >= 1)
    )
  );
  const galacticCriteria = [
    criterion('galactic-artifact-breadth', 'At least twelve distinct mastered implementations', artifactLifecycles.length, 12),
    criterion('galactic-capability-breadth', 'At least twelve qualitative capabilities', capabilityIds.length, 12),
    criterion('galactic-domain-breadth', 'At least six capability domains', capabilityDomains.length, 6),
    criterion('galactic-foundations', 'At least two independent stellar foundation signals', stellarFoundationSignalCount, 2),
    criterion('galactic-anchor', 'A galactic Project or distributed interstellar anchor', hasGalacticAnchor, true),
  ];
  const stellarSatisfied = stellarCriteria.every((entry) => entry.satisfied);
  const galacticSatisfied = stellarSatisfied && galacticCriteria.every((entry) => entry.satisfied);
  const candidateMaturity: CivilizationMaturity = galacticSatisfied
    ? 'galactic'
    : stellarSatisfied
      ? 'stellar'
      : 'planetary';

  return {
    policyId: CIVILIZATION_MATURITY_POLICY_ID,
    mode,
    candidateMaturity,
    artifactImplementationCount: artifactLifecycles.length,
    capabilityIds,
    capabilityDomains,
    manifestedProjectCount: devices.length,
    stellarProjectCount,
    galacticProjectCount,
    settledWorldCount,
    networkCount,
    interstellarCapabilityTriad,
    stellarFoundationSignalCount,
    stellarCriteria,
    galacticCriteria,
    explanation: [
      `${artifactLifecycles.length} ${historical ? 'historically mastered' : 'operational'} implementations expose ${capabilityIds.length} capabilities across ${capabilityDomains.length} domains.`,
      `${stellarFoundationSignalCount} independent stellar foundation signal${stellarFoundationSignalCount === 1 ? '' : 's'} detected.`,
      `Derived ${mode} scale: ${candidateMaturity}.`,
    ],
  };
}

function scaleEvidence(
  sourceId: string,
  turnCount: number | null,
  historyEvidence: CivilizationHistoryEvidence,
): CivilizationScaleEvidence {
  return {
    sourceType: 'system',
    sourceId,
    turnCount,
    historyEvidence,
  };
}

function scaleIndex(scale: CivilizationMaturity): number {
  return CIVILIZATION_MATURITY_LEVELS.indexOf(scale);
}

function deriveReachCondition(
  state: CivilizationState,
  historicalMaturity: CivilizationMaturity,
  currentReach: CivilizationMaturity,
): CivilizationReachCondition {
  const homeworldLost = state.worlds[state.homeworldId]?.state === 'annihilated';
  const activeSystemicCondition = Object.values(state.conditions).some((condition) =>
    condition.resolvedTurnCount === null &&
    (condition.coreType === 'isolated' || condition.coreType === 'disrupted'),
  );
  const disabledInfrastructure = Object.values(state.entities).some((entity) =>
    entity.state !== 'operational',
  );
  const gap = scaleIndex(historicalMaturity) - scaleIndex(currentReach);
  if (homeworldLost || gap >= 2) return 'fractured';
  if (gap === 1 || activeSystemicCondition || disabledInfrastructure) return 'degraded';
  return 'intact';
}

export function deriveCivilizationScaleState(
  state: CivilizationState,
  manifestedDevices: readonly ManifestedDevicePublicState[] = [],
  turnCount: number | null = null,
): CivilizationScaleState {
  const historicalAssessment = assessCivilizationMaturity(state, manifestedDevices, 'historical');
  const operationalAssessment = assessCivilizationMaturity(state, manifestedDevices, 'operational');
  const historicalMaturity = scaleIndex(historicalAssessment.candidateMaturity) >
      scaleIndex(state.scale.historicalMaturity)
    ? historicalAssessment.candidateMaturity
    : state.scale.historicalMaturity;
  const historyEvidence: CivilizationHistoryEvidence = Object.values(state.artifacts)
    .some((lifecycle) => lifecycle.historyEvidence === 'legacy_inferred')
    ? 'legacy_inferred'
    : 'recorded';
  const maturityAdvanced = historicalMaturity !== state.scale.historicalMaturity;
  const latestReachEvidence = state.scale.currentReachEvidence.at(-1);
  const authoredReachIsActive = latestReachEvidence !== undefined &&
    latestReachEvidence.sourceType !== 'system';
  const currentReach = authoredReachIsActive
    ? state.scale.currentReach
    : operationalAssessment.candidateMaturity;
  const currentReachCondition = authoredReachIsActive
    ? state.scale.currentReachCondition
    : deriveReachCondition(
        state,
        historicalMaturity,
        operationalAssessment.candidateMaturity,
      );
  const reachChanged = currentReach !== state.scale.currentReach ||
    currentReachCondition !== state.scale.currentReachCondition;

  return {
    ...state.scale,
    historicalMaturity,
    historicalMaturityEvidence: maturityAdvanced
      ? [
          ...state.scale.historicalMaturityEvidence,
          scaleEvidence(`${CIVILIZATION_MATURITY_POLICY_ID}:${historicalMaturity}`, turnCount, historyEvidence),
        ]
      : state.scale.historicalMaturityEvidence,
    currentReach,
    currentReachCondition,
    currentReachEvidence: reachChanged
      ? [
          ...state.scale.currentReachEvidence,
          scaleEvidence(
            `${CIVILIZATION_MATURITY_POLICY_ID}:reach:${currentReach}:${currentReachCondition}`,
            turnCount,
            historyEvidence,
          ),
        ]
      : state.scale.currentReachEvidence,
  };
}

/** Reconciles every deterministic Civilization view of the same causal state. */
export function reconcileCivilizationDerivedState(
  state: CivilizationState,
  manifestedDevices: readonly ManifestedDevicePublicState[] = [],
  turnCount: number | null = null,
): CivilizationState {
  const affinityIdentity = deriveCivilizationAffinityIdentity(state.artifacts);
  const withIdentity = { ...state, affinityIdentity };
  const withScale = {
    ...withIdentity,
    scale: deriveCivilizationScaleState(withIdentity, manifestedDevices, turnCount),
  };
  return {
    ...withScale,
    stability: recalculateCivilizationStabilityFromState(withScale, turnCount),
  };
}

export interface BlueprintManifestationEvent {
  eventId: string;
  blueprintId: BlueprintId;
  ownerPlayerId: string;
  slotIndex: number;
  presentationVariant: BlueprintPresentationVariant;
  createdAt: number;
}

export interface BlueprintArtifactSnapshot {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  bonusAffinity: StandardAffinityKey;
  eminence: number;
  cost: AffinityCounts;
  flavor: string;
}

export interface BlueprintDetonationEvent {
  eventId: string;
  blueprintId: BlueprintId;
  ownerPlayerId: string;
  triggeringPlayerId: string;
  targetCardId: string;
  trigger?: 'forged' | 'encrypted';
  hostileEffect?: 'burn' | 'annihilation' | 'nullification' | 'claim_cancellation';
  targetArtifact?: BlueprintArtifactSnapshot;
  collateralCardIds?: string[];
  collateralArtifacts?: BlueprintArtifactSnapshot[];
  interceptedByBlueprintId?: BlueprintId;
  presentationVariant: BlueprintPresentationVariant;
  createdAt: number;
}

export type ScenarioProtocolId =
  | 'sealed_protocol_01'
  | 'sealed_protocol_02'
  | 'sealed_protocol_03';

export interface ScenarioProtocolPublicState {
  protocolId: ScenarioProtocolId;
  ownerPlayerId: string;
  slotIndex: number;
  state: BlueprintDeviceState;
  publicEffect: string;
  foundryUsesRemaining?: number;
  ascensionDeferrals?: number;
  foundryTier2Ready?: boolean;
  foundryTier3Ready?: boolean;
}

export interface ScenarioProtocolEvent {
  eventId: string;
  protocolId: ScenarioProtocolId;
  ownerPlayerId: string;
  slotIndex: number;
  kind: 'manifestation' | 'effect';
  publicEffect: string;
  triggeringPlayerId?: string;
  targetCardId?: string;
  trigger?: 'forged' | 'encrypted';
  hostileEffect?: 'burn' | 'annihilation' | 'nullification' | 'claim_cancellation';
  targetArtifact?: BlueprintArtifactSnapshot;
  collateralCardIds?: string[];
  collateralArtifacts?: BlueprintArtifactSnapshot[];
  intercepted?: boolean;
  createdAt: number;
}

export type CosmeticSlot =
  | 'card_back'
  | 'civilization_ambience'
  | 'luminary_arrival_sound'
  | 'blueprint_presentation'
  | 'vault_seal';

export type LuminaryArrivalSoundVariant = 'standard' | 'first_resonance';

export interface CosmeticLoadoutItem {
  slot: CosmeticSlot;
  scopeKey: string;
  itemId: string;
}

export interface BlueprintClearanceSummary {
  qualifyingWins: number;
  requiredWins: number;
  status: BlueprintClearanceStatus;
  challengeRoomId: string | null;
  cipherDeactivated: boolean;
  thresholdApproach: LumiiThresholdApproach | null;
  thresholdDialoguePath: LumiiThresholdDialogueChoiceId[];
  thresholdDialogueResolution: LumiiThresholdDialogueResolution | null;
  thresholdRuptured: boolean;
  /** @deprecated Compatibility alias for Threshold rupture. */
  covenantBroken: boolean;
  decryptionKeyBypassActive: boolean;
  revealPending: boolean;
}

export interface BlueprintVaultState {
  clearance: BlueprintClearanceSummary & { warningSeen: boolean };
  decryptionKeyAvailable: boolean;
  slotCount: number;
  competitiveEnabled: boolean;
  unlockedBlueprintIds: BlueprintId[];
  blueprints: BlueprintDefinition[];
  corruptedRecordCount: number | null;
  campaignNodes: Array<{
    id: string;
    blueprintId: BlueprintId;
    title: string;
    status: CampaignContentState;
  }>;
  campaignProgress: CampaignProgressProjection;
  loadouts: BlueprintLoadout[];
  mastery: Array<{
    blueprintId: BlueprintId;
    manifestations: number;
    triggers: number;
    armedMatchFinishes: number;
  }>;
  chronicles?: AccountArchiveChronicle[];
}

export interface BlueprintChallengeSession {
  roomId: string;
  inviteCode: string;
  playerId: string;
  sessionToken: string;
  resumed: boolean;
  scenarioId: string;
  lumiiThresholdApproach: LumiiThresholdApproach;
  campaignAssistance: string;
}

export interface BlueprintVaultThresholdResult {
  ok: true;
  status: BlueprintClearanceStatus;
  cipherDeactivated: boolean;
  thresholdApproach: LumiiThresholdApproach | null;
  thresholdDialoguePath: LumiiThresholdDialogueChoiceId[];
  thresholdDialogueResolution: LumiiThresholdDialogueResolution | null;
  decryptionKeyBypassActive: boolean;
}

export interface BlueprintDecryptionKeyUseResult {
  ok: true;
  status: 'challenge_ready';
  alreadyActive: boolean;
  decryptionKeyAvailable: false;
  decryptionKeyBypassActive: true;
}

export interface BlueprintChallengeWithdrawal {
  roomId: string;
  status: Extract<BlueprintClearanceStatus, 'classified' | 'challenge_ready'>;
}

export interface AccountArchiveArtifact {
  id: string;
  name: string;
  flavor: string;
  tier: 1 | 2 | 3;
  bonusAffinity: string;
  eminence: number;
  forgeCount: number;
}

export interface AccountArchiveLuminary {
  id: string;
  name: string;
  domain: string;
  eminence: number;
  flavor: string;
  effectName: string | null;
  effectDescription: string | null;
  summonColor: string;
  summonSecondaryColor: string;
  allianceCount: number;
}

export interface AccountArchiveChronicle {
  id: ChronicleId;
  title: string;
  chapterLabel: string;
  summary: string;
  status: ChronicleStatus;
  unlockedAt: string | null;
  relatedBlueprintIds: BlueprintId[];
}

export interface AccountArchiveSummary {
  artifacts: {
    discovered: AccountArchiveArtifact[];
    total: number;
    discoveredByTier: Record<1 | 2 | 3, number>;
    totalByTier: Record<1 | 2 | 3, number>;
  };
  luminaries: {
    encountered: AccountArchiveLuminary[];
    total: number;
  };
  identity: {
    totalForges: number;
    totalAlliances: number;
    signatureArtifactId: string | null;
    closestLuminaryId: string | null;
  };
  vault: {
    qualifyingWins: number;
    requiredWins: number;
    unlocked: boolean;
    status: BlueprintClearanceStatus;
    challengeRoomId: string | null;
  };
  chronicles?: {
    entries: AccountArchiveChronicle[];
    recovered: number;
    total: number;
  };
}

export const CIVILIZATION_RECORD_VERSION = 2 as const;
export type CivilizationRecordVersion = 1 | typeof CIVILIZATION_RECORD_VERSION;

export type CivilizationRecordEvidence =
  | 'recorded'
  | 'partial_legacy'
  | 'legacy_unavailable';

export type CivilizationRecordFinishReason = 'win' | 'surrender' | 'unknown';

export interface CivilizationRecordProject {
  blueprintId: BlueprintId;
  state: BlueprintDeviceState;
  slotIndex: number;
}

export interface CivilizationRecordLuminaryRelationship {
  luminaryId: LuminaryId;
  allianceCount: number;
}

export const CIVILIZATION_OUTCOME_POLICY_ID = 'civilization-outcome-v1' as const;
export const CIVILIZATION_LUME_POLICY_ID = 'civilization-lume-v1' as const;

export const CIVILIZATION_OUTCOME_CATEGORIES = [
  'ascendant',
  'enduring',
  'precarious',
  'subordinated',
  'collapsed',
] as const;

export type CivilizationOutcomeCategory =
  (typeof CIVILIZATION_OUTCOME_CATEGORIES)[number];

export type CivilizationOutcomeDimension =
  | CivilizationHistoricalQualityDimension
  | 'stability';

export interface CivilizationOutcomeFactor {
  factorId: string;
  direction: 'support' | 'pressure';
  points: number;
  label: string;
  source: 'structural' | 'authored';
}

export interface CivilizationOutcomeDimensionAssessment {
  dimension: CivilizationOutcomeDimension;
  score: number;
  baseline: number;
  factors: CivilizationOutcomeFactor[];
  explanation: string;
}

export interface CivilizationAdversityAssessment {
  /** Context only; never included as a fifth weighted dimension. */
  intensity: number;
  recoveryEligibleIntensity: number;
  recoveryCredit: number;
  explanation: string;
}

export interface CivilizationOutcomeAssessment {
  policyId: typeof CIVILIZATION_OUTCOME_POLICY_ID;
  evidence: CivilizationRecordEvidence;
  category: CivilizationOutcomeCategory;
  qualityScore: number;
  dimensions: {
    continuity: CivilizationOutcomeDimensionAssessment;
    agency: CivilizationOutcomeDimensionAssessment;
    achievement: CivilizationOutcomeDimensionAssessment;
    stability: CivilizationOutcomeDimensionAssessment;
  };
  adversity: CivilizationAdversityAssessment;
  explanation: string[];
}

export interface CivilizationOutcomeSummary {
  policyId: typeof CIVILIZATION_OUTCOME_POLICY_ID;
  evidence: CivilizationRecordEvidence;
  category: CivilizationOutcomeCategory;
  qualityScore: number;
  continuity: number;
  agency: number;
  achievement: number;
  stability: number;
  adversityIntensity: number;
  recoveryCredit: number;
  primaryFactors: Record<CivilizationOutcomeDimension, CivilizationOutcomePublicFactor[]>;
  explanation: string[];
}

export interface CivilizationOutcomePublicFactor {
  direction: 'support' | 'pressure';
  points: number;
  label: string;
}

export const CIVILIZATION_LUME_AWARD_STATUSES = [
  'awarded',
  'insufficient_evidence',
  'retroactive_ineligible',
  'campaign_record_only',
  'campaign_policy_required',
  'custom_ineligible',
  'unavailable',
] as const;

export type CivilizationLumeAwardStatus =
  (typeof CIVILIZATION_LUME_AWARD_STATUSES)[number];

export const CIVILIZATION_CAMPAIGN_LUME_POLICIES = [
  'award',
  'record_only',
] as const;

export type CivilizationCampaignLumePolicy =
  (typeof CIVILIZATION_CAMPAIGN_LUME_POLICIES)[number];

export const CIVILIZATION_HISTORICAL_CONTEXTS = [
  'historical',
  'forecast',
  'rehearsal',
  'interface_simulation',
  'unknown',
] as const;

export type CivilizationHistoricalContext =
  (typeof CIVILIZATION_HISTORICAL_CONTEXTS)[number];

export interface CivilizationLumeAssessment {
  policyId: typeof CIVILIZATION_LUME_POLICY_ID;
  status: CivilizationLumeAwardStatus;
  amount: number;
  qualityScore: number | null;
  recoveryCredit: number;
  explanation: string[];
}

export interface AssessCivilizationOutcomeInput {
  civilization: CivilizationState;
  projects: readonly CivilizationRecordProject[];
  evidence: CivilizationRecordEvidence;
}

export interface AssessCivilizationLumeInput {
  outcome: CivilizationOutcomeAssessment | null;
  evidence: CivilizationRecordEvidence;
  gameMode: GameMode;
  liveClosure: boolean;
  campaignLumePolicy?: CivilizationCampaignLumePolicy;
}

function clampOutcomeScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function outcomeImpactPoints(magnitude: CivilizationStabilityImpact): number {
  return CIVILIZATION_STABILITY_IMPACT_MAGNITUDES[magnitude];
}

function dimensionAssessment(
  dimension: CivilizationOutcomeDimension,
  baseline: number,
  factors: CivilizationOutcomeFactor[],
): CivilizationOutcomeDimensionAssessment {
  const deduplicatedFactors = [...new Map(
    factors.map((factor) => [factor.factorId, factor]),
  ).values()];
  const score = clampOutcomeScore(deduplicatedFactors.reduce(
    (total, factor) => total + (factor.direction === 'support' ? factor.points : -factor.points),
    baseline,
  ));
  const strongestSupport = deduplicatedFactors
    .filter((factor) => factor.direction === 'support')
    .sort((left, right) => right.points - left.points)[0];
  const strongestPressure = deduplicatedFactors
    .filter((factor) => factor.direction === 'pressure')
    .sort((left, right) => right.points - left.points)[0];
  const explanation = strongestPressure
    ? `${dimension} closes at ${score}; strongest pressure: ${strongestPressure.label}.`
    : strongestSupport
      ? `${dimension} closes at ${score}; strongest support: ${strongestSupport.label}.`
      : `${dimension} closes at ${score} from its recorded baseline.`;
  return { dimension, score, baseline, factors: deduplicatedFactors, explanation };
}

function eventOutcomeFactors(
  state: CivilizationState,
  dimension: CivilizationHistoricalQualityDimension,
): CivilizationOutcomeFactor[] {
  return state.events.flatMap((event) => (event.outcomeSignals ?? [])
    .filter((signal) => signal.dimension === dimension)
    .map((signal) => ({
      factorId: `${event.eventId}:${signal.signalId}`,
      direction: signal.direction,
      points: outcomeImpactPoints(signal.magnitude),
      label: signal.label,
      source: 'authored' as const,
    })));
}

function continuityFactors(state: CivilizationState): CivilizationOutcomeFactor[] {
  const factors: CivilizationOutcomeFactor[] = [];
  const settledWorlds = Object.values(state.worlds).filter((world) => world.role === 'settled_world');
  const activeSettledWorlds = settledWorlds.filter((world) => world.state === 'active').length;
  const annihilatedSettledWorlds = settledWorlds.length - activeSettledWorlds;
  const homeworld = state.worlds[state.homeworldId];
  if (!homeworld) {
    factors.push({
      factorId: 'homeworld-unrecorded',
      direction: 'pressure',
      points: 35,
      label: 'Homeworld continuity is unrecorded',
      source: 'structural',
    });
  } else if (homeworld.state === 'annihilated') {
    factors.push({
      factorId: 'homeworld-annihilated',
      direction: 'pressure',
      points: activeSettledWorlds > 0 ? 55 : 70,
      label: activeSettledWorlds > 0
        ? 'Homeworld annihilated; off-world continuity remains'
        : 'Homeworld annihilated with no viable settled world',
      source: 'structural',
    });
  }

  if (activeSettledWorlds > 0) {
    factors.push({
      factorId: 'active-settled-worlds',
      direction: 'support',
      points: Math.min(10, activeSettledWorlds * 4),
      label: 'Viable settled worlds preserve multiple futures',
      source: 'structural',
    });
  }
  if (annihilatedSettledWorlds > 0) {
    factors.push({
      factorId: 'annihilated-settled-worlds',
      direction: 'pressure',
      points: Math.min(40, annihilatedSettledWorlds * 20),
      label: 'Settled worlds were annihilated',
      source: 'structural',
    });
  }

  if (state.scale.currentReachCondition === 'degraded') {
    factors.push({
      factorId: 'reach-degraded',
      direction: 'pressure',
      points: 8,
      label: 'Operational reach is degraded',
      source: 'structural',
    });
  } else if (state.scale.currentReachCondition === 'fractured') {
    factors.push({
      factorId: 'reach-fractured',
      direction: 'pressure',
      points: 18,
      label: 'Operational reach is fractured',
      source: 'structural',
    });
  }

  const annihilatedEntities = Object.values(state.entities)
    .filter((entity) => entity.state === 'annihilated').length;
  if (annihilatedEntities > 0) {
    factors.push({
      factorId: 'annihilated-infrastructure',
      direction: 'pressure',
      points: Math.min(12, annihilatedEntities * 4),
      label: 'Consequential infrastructure was annihilated',
      source: 'structural',
    });
  }

  const activeSystemicConditions = Object.values(state.conditions).filter((condition) =>
    condition.resolvedTurnCount === null &&
    (condition.target.kind === 'world' || condition.target.kind === 'network'),
  );
  if (activeSystemicConditions.length > 0) {
    factors.push({
      factorId: 'active-systemic-conditions',
      direction: 'pressure',
      points: Math.min(20, activeSystemicConditions.reduce((total, condition) => {
        if (condition.coreType === 'isolated') return total + 10;
        if (condition.coreType === 'quarantined') return total + 7;
        if (condition.coreType === 'disrupted') return total + 8;
        return total + 4;
      }, 0)),
      label: 'Worlds or networks remain systemically constrained',
      source: 'structural',
    });
  }
  return [...factors, ...eventOutcomeFactors(state, 'continuity')];
}

function achievementFactors(
  state: CivilizationState,
  projects: readonly CivilizationRecordProject[],
): CivilizationOutcomeFactor[] {
  const masteredArtifacts = Object.values(state.artifacts)
    .filter((artifact) => artifact.masteryCount > 0).length;
  const capabilityCount = deriveHistoricalArtifactCapabilityIds(state).length;
  const maturityPoints = state.scale.historicalMaturity === 'galactic'
    ? 30
    : state.scale.historicalMaturity === 'stellar'
      ? 15
      : 0;
  const factors: CivilizationOutcomeFactor[] = [
    {
      factorId: 'mastered-implementations',
      direction: 'support',
      points: Math.min(20, masteredArtifacts * 2),
      label: 'Distinct Artifact implementations were mastered',
      source: 'structural',
    },
    {
      factorId: 'capability-breadth',
      direction: 'support',
      points: Math.min(25, capabilityCount * 2),
      label: 'Mastered capabilities span a broad technological history',
      source: 'structural',
    },
  ];
  if (maturityPoints > 0) {
    factors.push({
      factorId: 'historical-maturity',
      direction: 'support',
      points: maturityPoints,
      label: `${state.scale.historicalMaturity} Maturity was historically demonstrated`,
      source: 'structural',
    });
  }
  const uniqueProjectCount = new Set(projects.map((project) => project.blueprintId)).size;
  if (uniqueProjectCount > 0) {
    factors.push({
      factorId: 'manifested-projects',
      direction: 'support',
      points: Math.min(16, uniqueProjectCount * 8),
      label: 'Blueprint Projects manifested',
      source: 'structural',
    });
  }
  return [...factors, ...eventOutcomeFactors(state, 'achievement')];
}

function stabilityAssessment(state: CivilizationState): CivilizationOutcomeDimensionAssessment {
  const factors = state.stability.contributors
    .filter((contributor) => contributor.resolvedTurnCount === null)
    .map((contributor): CivilizationOutcomeFactor => ({
      factorId: contributor.id,
      direction: contributor.direction,
      points: contributor.magnitude,
      label: contributor.label,
      source: contributor.id.startsWith('structural:') ? 'structural' : 'authored',
    }));
  const score = clampOutcomeScore(
    state.stability.score ?? CIVILIZATION_STABILITY_CALIBRATION_V1.baseline,
  );
  return {
    dimension: 'stability',
    score,
    baseline: CIVILIZATION_STABILITY_CALIBRATION_V1.baseline,
    factors,
    explanation: `stability closes at ${score} (${state.stability.band}).`,
  };
}

function adversityAssessment(
  state: CivilizationState,
  continuity: number,
  stability: number,
): CivilizationAdversityAssessment {
  const authoredById = new Map<string, CivilizationAdversityEvidence>();
  for (const event of state.events) {
    if (event.adversity) {
      authoredById.set(`${event.eventId}:${event.adversity.evidenceId}`, event.adversity);
    }
  }
  const authored = [...authoredById.values()];
  const resolvedPressures = [...new Map(
    state.stability.contributors
      .filter((contributor) =>
        contributor.direction === 'pressure' && contributor.resolvedTurnCount !== null,
      )
      .map((contributor) => [contributor.id, contributor] as const),
  ).values()];
  const authoredIntensity = authored.reduce(
    (total, evidence) => total + outcomeImpactPoints(evidence.magnitude),
    0,
  );
  const resolvedIntensity = resolvedPressures.reduce(
    (total, contributor) => total + contributor.magnitude,
    0,
  );
  const recoveryEligibleIntensity = Math.min(100, authored
    .filter((evidence) => evidence.recoveryEligible)
    .reduce((total, evidence) => total + outcomeImpactPoints(evidence.magnitude), 0) +
    resolvedIntensity);
  const intensity = Math.min(100, authoredIntensity + resolvedIntensity);
  const recoveryStrength = Math.min(continuity, stability) / 100;
  const recoveryCredit = continuity >= 50 && stability >= 45
    ? Math.min(8, Math.round((recoveryEligibleIntensity / 5) * recoveryStrength))
    : 0;
  return {
    intensity,
    recoveryEligibleIntensity,
    recoveryCredit,
    explanation: recoveryCredit > 0
      ? `Recovered from qualifying adversity contributes ${recoveryCredit} quality points.`
      : intensity > 0
        ? 'Adversity is recorded as context; unresolved harm grants no recovery credit.'
        : 'No qualifying recovery adversity was recorded.',
  };
}

/**
 * Assesses historical quality without consulting competitive result, Eminence,
 * turn count, held Affinities, or cosmetic/account state.
 */
export function assessCivilizationOutcome(
  input: AssessCivilizationOutcomeInput,
): CivilizationOutcomeAssessment {
  const continuity = dimensionAssessment('continuity', 82, continuityFactors(input.civilization));
  const agency = dimensionAssessment(
    'agency',
    75,
    eventOutcomeFactors(input.civilization, 'agency'),
  );
  const achievement = dimensionAssessment(
    'achievement',
    10,
    achievementFactors(input.civilization, input.projects),
  );
  const stability = stabilityAssessment(input.civilization);
  const adversity = adversityAssessment(
    input.civilization,
    continuity.score,
    stability.score,
  );
  let qualityScore = clampOutcomeScore(
    continuity.score * 0.30 +
    agency.score * 0.25 +
    achievement.score * 0.25 +
    stability.score * 0.20 +
    adversity.recoveryCredit,
  );
  if (continuity.score < 20) qualityScore = Math.min(qualityScore, 30);
  if (agency.score < 20) qualityScore = Math.min(qualityScore, 40);
  if (stability.score < 20) qualityScore = Math.min(qualityScore, 65);

  const category: CivilizationOutcomeCategory = continuity.score < 20
    ? 'collapsed'
    : agency.score < 25
      ? 'subordinated'
      : continuity.score < 50 || stability.score < 30 ||
        input.civilization.scale.currentReachCondition === 'fractured'
        ? 'precarious'
        : achievement.score >= 70 && qualityScore >= 70
          ? 'ascendant'
          : 'enduring';

  return {
    policyId: CIVILIZATION_OUTCOME_POLICY_ID,
    evidence: input.evidence,
    category,
    qualityScore,
    dimensions: { continuity, agency, achievement, stability },
    adversity,
    explanation: [
      `Historical outcome: ${category}.`,
      `Quality ${qualityScore}/100 from Continuity ${continuity.score}, Agency ${agency.score}, Achievement ${achievement.score}, and Stability ${stability.score}.`,
      adversity.explanation,
      'Competitive result and Eminence are not assessment inputs.',
    ],
  };
}

export function summarizeCivilizationOutcome(
  outcome: CivilizationOutcomeAssessment | null,
): CivilizationOutcomeSummary | null {
  if (!outcome) return null;
  const summarizeFactors = (
    assessment: CivilizationOutcomeDimensionAssessment,
  ): CivilizationOutcomePublicFactor[] => {
    const strongest = (direction: CivilizationOutcomePublicFactor['direction']) => assessment.factors
      .filter((factor) => factor.direction === direction)
      .sort((left, right) => right.points - left.points)[0];
    return (['support', 'pressure'] as const).flatMap((direction) => {
      const factor = strongest(direction);
      if (!factor) return [];
      return [{
        direction,
        points: factor.points,
        label: factor.source === 'structural'
          ? factor.label
          : `Recorded ${assessment.dimension} ${direction}`,
      }];
    });
  };
  return {
    policyId: outcome.policyId,
    evidence: outcome.evidence,
    category: outcome.category,
    qualityScore: outcome.qualityScore,
    continuity: outcome.dimensions.continuity.score,
    agency: outcome.dimensions.agency.score,
    achievement: outcome.dimensions.achievement.score,
    stability: outcome.dimensions.stability.score,
    adversityIntensity: outcome.adversity.intensity,
    recoveryCredit: outcome.adversity.recoveryCredit,
    primaryFactors: {
      continuity: summarizeFactors(outcome.dimensions.continuity),
      agency: summarizeFactors(outcome.dimensions.agency),
      achievement: summarizeFactors(outcome.dimensions.achievement),
      stability: summarizeFactors(outcome.dimensions.stability),
    },
    explanation: [...outcome.explanation],
  };
}

export function assessCivilizationLume(
  input: AssessCivilizationLumeInput,
): CivilizationLumeAssessment {
  if (!input.outcome) {
    return {
      policyId: CIVILIZATION_LUME_POLICY_ID,
      status: 'unavailable',
      amount: 0,
      qualityScore: null,
      recoveryCredit: 0,
      explanation: ['No recorded Civilization state exists; no Lume was assessed.'],
    };
  }
  const qualityAmount = Math.max(
    0,
    Math.min(10, Math.round((input.outcome.qualityScore - 20) / 8)),
  );
  const achievementScore = input.outcome.dimensions.achievement.score;
  const achievementCeiling = achievementScore < 20
    ? 2
    : achievementScore < 35
      ? 4
      : achievementScore < 50
        ? 6
        : achievementScore < 70
          ? 8
          : 10;
  const potentialAmount = Math.min(qualityAmount, achievementCeiling);
  let status: CivilizationLumeAwardStatus = 'awarded';
  if (input.evidence !== 'recorded') status = 'insufficient_evidence';
  else if (!input.liveClosure) status = 'retroactive_ineligible';
  else if (input.gameMode === 'custom') status = 'custom_ineligible';
  else if (input.gameMode === 'campaign') {
    if (input.campaignLumePolicy === 'record_only') status = 'campaign_record_only';
    else if (input.campaignLumePolicy !== 'award') status = 'campaign_policy_required';
  }
  const amount = status === 'awarded' ? potentialAmount : 0;
  const explanation = status === 'awarded'
    ? [
        `${amount} Lume awarded from historical quality ${input.outcome.qualityScore}/100.`,
        ...(achievementCeiling < qualityAmount
          ? [`Achievement ${achievementScore}/100 limits this award to ${achievementCeiling} Lume.`]
          : []),
        'Competitive result and Eminence were not reward inputs.',
      ]
    : status === 'retroactive_ineligible'
      ? ['Historical quality was assessed, but prior matches are never awarded Lume retroactively.']
      : status === 'campaign_record_only'
        ? ['This authored campaign records its forecast but does not award historical Lume.']
      : status === 'campaign_policy_required'
        ? ['This authored campaign has no explicit Lume reward policy.']
        : status === 'custom_ineligible'
          ? ['Custom matches record their histories but do not award Lume.']
          : ['The record contains incomplete historical evidence; no Lume was awarded.'];
  return {
    policyId: CIVILIZATION_LUME_POLICY_ID,
    status,
    amount,
    qualityScore: input.outcome.qualityScore,
    recoveryCredit: input.outcome.adversity.recoveryCredit,
    explanation,
  };
}

/** Immutable server-side closure snapshot for one civilization in one match. */
export interface CivilizationRecord {
  version: typeof CIVILIZATION_RECORD_VERSION;
  evidence: CivilizationRecordEvidence;
  matchInstanceId: string;
  roomId: string;
  playerId: string;
  accountId: string;
  gameMode: GameMode;
  scenarioId: string | null;
  historicalContext: CivilizationHistoricalContext;
  startedAt: number | null;
  finishedAt: string;
  finishReason: CivilizationRecordFinishReason;
  competitiveResult: 'win' | 'loss' | 'tie';
  finalEminence: number;
  totalPlayers: number;
  civilization: CivilizationState | null;
  projects: CivilizationRecordProject[];
  luminaryRelationships: CivilizationRecordLuminaryRelationship[];
  outcome: CivilizationOutcomeAssessment | null;
  lume: CivilizationLumeAssessment;
  unavailableFields: string[];
}

/** Identity-safe account-history projection of a stored Civilization Record. */
export interface CivilizationRecordSummary {
  version: CivilizationRecordVersion;
  evidence: CivilizationRecordEvidence;
  historicalContext: CivilizationHistoricalContext;
  historicalMaturity: CivilizationMaturity | null;
  currentReach: CivilizationOperationalReach | null;
  currentReachCondition: CivilizationReachCondition | null;
  stabilityBand: CivilizationStabilityBand | null;
  stabilityScore: number | null;
  affinityForm: CivilizationAffinityIdentityForm | null;
  dominantAffinity: StandardAffinityKey | null;
  dominantDyad: CivilizationDyadId | null;
  masteredArtifactCount: number | null;
  operationalArtifactCount: number | null;
  damagedArtifactCount: number | null;
  annihilatedArtifactCount: number | null;
  manifestedProjectCount: number;
  civilizationEventCount: number | null;
  outcome: CivilizationOutcomeSummary | null;
  lume: CivilizationLumeAssessment;
  unavailableFields: string[];
}

export function summarizeCivilizationRecord(
  record: CivilizationRecord | null,
): CivilizationRecordSummary | null {
  if (!record) return null;
  const civilization = record.civilization;
  const artifacts = civilization ? Object.values(civilization.artifacts) : [];
  const unavailableLume: CivilizationLumeAssessment = {
    policyId: CIVILIZATION_LUME_POLICY_ID,
    status: 'unavailable',
    amount: 0,
    qualityScore: null,
    recoveryCredit: 0,
    explanation: ['This record predates Civilization Outcome and Lume assessment.'],
  };
  const recordWithOptionalAssessment = record as CivilizationRecord & {
    outcome?: CivilizationOutcomeAssessment | null;
    lume?: CivilizationLumeAssessment;
  };
  const lume = recordWithOptionalAssessment.lume ?? unavailableLume;
  return {
    version: record.version as CivilizationRecordVersion,
    evidence: record.evidence,
    historicalContext: recordWithOptionalAssessment.historicalContext ?? 'unknown',
    historicalMaturity: civilization?.scale.historicalMaturity ?? null,
    currentReach: civilization?.scale.currentReach ?? null,
    currentReachCondition: civilization?.scale.currentReachCondition ?? null,
    stabilityBand: civilization?.stability.band ?? null,
    stabilityScore: civilization?.stability.score ?? null,
    affinityForm: civilization?.affinityIdentity.form ?? null,
    dominantAffinity: civilization?.affinityIdentity.dominantAffinity ?? null,
    dominantDyad: civilization?.affinityIdentity.dominantDyad ?? null,
    masteredArtifactCount: civilization
      ? artifacts.filter((artifact) => artifact.masteryCount > 0).length
      : null,
    operationalArtifactCount: civilization
      ? artifacts.filter((artifact) => artifact.implementationState === 'operational').length
      : null,
    damagedArtifactCount: civilization
      ? artifacts.filter((artifact) => artifact.implementationState === 'damaged').length
      : null,
    annihilatedArtifactCount: civilization
      ? artifacts.filter((artifact) => artifact.implementationState === 'annihilated').length
      : null,
    manifestedProjectCount: record.projects.length,
    civilizationEventCount: civilization?.events.length ?? null,
    outcome: summarizeCivilizationOutcome(recordWithOptionalAssessment.outcome ?? null),
    lume: { ...lume, explanation: [...lume.explanation] },
    unavailableFields: [...record.unavailableFields],
  };
}

export interface GameHistoryEntry {
  roomId: string;
  inviteCode: string;
  finishedAt: string;
  result: 'win' | 'loss' | 'tie';
  eminenceEarned: number;
  totalPlayers: number;
  civilizationRecord?: CivilizationRecordSummary | null;
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  avgEminence: number;
  totalLume: number;
  recentGames: GameHistoryEntry[];
  matchHistory?: GameHistoryEntry[];
  archive?: AccountArchiveSummary;
}

export type EquippableStoreItemKind = Extract<
  CosmeticSlot,
  | 'card_back'
  | 'civilization_ambience'
  | 'luminary_arrival_sound'
  | 'blueprint_presentation'
  | 'vault_seal'
>;
export type StoreItemKind = EquippableStoreItemKind | 'consumable';
export type StoreItemRarity = 'foundational' | 'rare' | 'mythic';
export type StoreItemVisibility = 'player_only' | 'all_participants';
export type StoreItemPreviewKind =
  | 'card_back'
  | 'civilization_ambience'
  | 'luminary_arrival_sound'
  | 'blueprint_device'
  | 'vault_seal'
  | 'consumable';

export interface StoreContentDescriptor {
  assetKey: string;
  previewKind: StoreItemPreviewKind;
  tags: string[];
}

export interface StoreItem {
  id: string;
  name: string;
  kind: StoreItemKind;
  rarity: StoreItemRarity;
  visibility: StoreItemVisibility;
  scopeKey: string;
  included?: boolean;
  blueprintId?: BlueprintId;
  presentationVariant?: BlueprintPresentationVariant;
  priceLabel: string;
  lumePrice: number | null;
  shortDescription: string;
  description: string;
  previewClass: string;
  assetKey: string;
  previewKind: StoreItemPreviewKind;
  contentTags: string[];
}

export interface StoreEngagement {
  lumeBalance: number;
  lifetimeEarnedLume: number;
  lifetimePurchasedLume: number;
  lifetimeGrantedLume: number;
  lifetimeSpentLume: number;
  lifetimeRefundedLume: number;
  dailyClaimStreak: number;
  lastDailyClaimDate: string | null;
  canClaimDaily: boolean;
  currencyName: string;
}

export type NativeStoreProvider = "google_play" | "samsung_iap";
export type LumePackId = "lume_100" | "lume_300" | "lume_700";

export interface LumePackDefinition {
  id: LumePackId;
  lumeAmount: 100 | 300 | 700;
  productIds: Record<NativeStoreProvider, string>;
}

export interface NativeLumePackOffer {
  packId: LumePackId;
  productId: string;
  lumeAmount: number;
  localizedPrice: string;
  currencyCode?: string;
}

export interface NativeLumePurchaseResult {
  status: "pending" | "credited" | "already_credited" | "settlement_pending";
  provider: NativeStoreProvider;
  packId: LumePackId;
  lumeAmount: number;
  lumeBalance: number;
}

export interface StoreState {
  items: StoreItem[];
  ownedItemIds: string[];
  equippedItemIds: Record<EquippableStoreItemKind, string | null>;
  equippedItems: CosmeticLoadoutItem[];
  testCheckoutEnabled: boolean;
  lumePacks: LumePackDefinition[];
  engagement: StoreEngagement;
}

export interface VictoryArtifactSummary {
  tier: number;
  bonusAffinity: string;
}

export interface VictoryStandingSummary {
  eminence: number;
  reservedArtifactCount: number;
  forgedArtifacts: ReadonlyArray<VictoryArtifactSummary>;
}

/** Tier counts ordered from the strongest tie-break value to the weakest. */
export type ArtifactTierCounts = [
  tier3: number,
  tier2: number,
  tier1: number,
];

export function getArtifactTierCounts(
  artifacts: ReadonlyArray<VictoryArtifactSummary>,
): ArtifactTierCounts {
  const counts: ArtifactTierCounts = [0, 0, 0];
  for (const artifact of artifacts) {
    if (artifact.tier === 3) counts[0]++;
    else if (artifact.tier === 2) counts[1]++;
    else if (artifact.tier === 1) counts[2]++;
  }
  return counts;
}

function compareArtifactTierCounts(
  a: ArtifactTierCounts,
  b: ArtifactTierCounts,
): number {
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return b[index] - a[index];
  }
  return 0;
}

export function getStrongestAffinityTierCounts(
  artifacts: ReadonlyArray<VictoryArtifactSummary>,
): ArtifactTierCounts {
  const byAffinity = new Map<string, VictoryArtifactSummary[]>();
  for (const artifact of artifacts) {
    const affinityArtifacts = byAffinity.get(artifact.bonusAffinity) ?? [];
    affinityArtifacts.push(artifact);
    byAffinity.set(artifact.bonusAffinity, affinityArtifacts);
  }

  let strongest: ArtifactTierCounts = [0, 0, 0];
  for (const affinityArtifacts of byAffinity.values()) {
    const counts = getArtifactTierCounts(affinityArtifacts);
    if (compareArtifactTierCounts(counts, strongest) < 0) strongest = counts;
  }
  return strongest;
}

/**
 * Sort comparator for final standings. A negative result means `a` ranks ahead
 * of `b`. Exact ties retain the game's existing stable player order.
 */
export function compareVictoryStandings(
  a: VictoryStandingSummary,
  b: VictoryStandingSummary,
): number {
  if (a.eminence !== b.eminence) return b.eminence - a.eminence;
  if (a.reservedArtifactCount !== b.reservedArtifactCount) {
    return a.reservedArtifactCount - b.reservedArtifactCount;
  }

  const overallTierComparison = compareArtifactTierCounts(
    getArtifactTierCounts(a.forgedArtifacts),
    getArtifactTierCounts(b.forgedArtifacts),
  );
  if (overallTierComparison !== 0) return overallTierComparison;

  return compareArtifactTierCounts(
    getStrongestAffinityTierCounts(a.forgedArtifacts),
    getStrongestAffinityTierCounts(b.forgedArtifacts),
  );
}
