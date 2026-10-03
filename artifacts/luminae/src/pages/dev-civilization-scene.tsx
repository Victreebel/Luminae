import React from 'react';
import {
  Archive,
  Factory,
  Handshake,
  Leaf,
  LockKeyhole,
  Orbit,
  Route,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import type { ArtifactCard, CardLoreCatalog, CivilizationPublicState } from '@workspace/api-client-react';
import type {
  BlueprintId,
  CivilizationCoreCondition,
  CivilizationDyadId,
  CivilizationEnvironmentVariantId,
  CivilizationStabilityBand,
  StandardAffinityKey,
} from '@workspace/game-types';
import {
  ARTIFACT_CATALOG,
  ARTIFACT_CANON,
  ARTIFACT_DEPICTION_SCALE_BY_ID,
  BLUEPRINT_DEFINITIONS,
  CIVILIZATION_DYAD_DEFINITIONS,
  CIVILIZATION_ENVIRONMENT_VARIANTS,
  CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID,
  CIVILIZATION_IDENTITY_LAYERS,
  CIVILIZATION_STATE_VERSION,
  createCivilizationEnvironmentIdentity,
  createInitialCivilizationState,
  civilizationProjectId,
  reconcileCivilizationDerivedState,
  reconcileCivilizationManifestationAssignments,
  STANDARD_AFFINITY_KEYS,
} from '@workspace/game-types';
import { CivilizationScenePanel } from '@/components/CivilizationScenePanel';
import { ArtifactFunctionTags } from '@/components/ArtifactFunctionTags';
import {
  BoardCivilizationTraceNotice,
} from '@/pages/game-civilization-preview';
import { buildCivilizationDeploymentSites } from '@/lib/civilizationDeploymentSites';
import type { CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';
import {
  deriveCivilizationArchetype,
  type CivilizationArchetypeSignals,
} from '@/lib/civilizationArchetypes';
import {
  getCivilizationEnvironmentDressing,
  getCivilizationPlateArtSlot,
  getCivilizationEnvironmentPlateArtSlot,
  getCivilizationSiteArtSlot,
  type CivilizationArtScene,
} from '@/lib/civilizationArtRegistry';
import {
  buildCivilizationProfile,
} from '@/lib/civilizationProfile';
import {
  type KardashevTier,
} from '@/lib/kardashev';
import { AFFINITY_META } from '@/lib/affinityMeta';
import { CARD_NAME_FALLBACK } from '@/lib/cardNameFallback';
import { CARD_RUNTIME_ART } from '@/lib/cardArtManifest';
import { CIVILIZATION_PARCEL_PROOFS, getCivilizationParcelProof } from '@/lib/civilizationParcelProof';
import {
  CIVILIZATION_PROOF_BLUEPRINT_IDS,
  CIVILIZATION_DISTRICT_DYAD_PROOF_IDS,
  CIVILIZATION_PROOF_LOADOUT_A_IDS,
  CIVILIZATION_PROOF_LOADOUT_B_IDS,
  getCivilizationSaturatedPreviewIds,
} from '@/lib/civilizationArtifactProof';

type PreviewSceneKind = 'surface' | 'orbit' | 'stellar' | 'galaxy';
type PreviewPresetId = 'balanced' | 'recovery' | 'foundry' | 'hazard' | 'routes' | 'accord' | 'archive' | 'chronicle' | 'sealed';
type TracePreviewMode = 'scan' | 'notice';
export type CivilizationCollectionProofState =
  | 'preset'
  | 'zero'
  | 'one'
  | 'two'
  | 'developing-three'
  | 'established-city'
  | 'planetary-city'
  | 'stellar-conversion'
  | 'stellar-city'
  | 'galactic-conversion'
  | 'galactic-city'
  | 'loadout-a'
  | 'loadout-b'
  | 'saturated'
  | 'evolution'
  | 'district-dyad'
  | 'parcel-coverage';

const DISTRICT_DYAD_PROOF_STEPS = [
  'No districts yet',
  'Flare founds a neutral Industrial district',
  'Second Flare leaves the Industrial district neutral',
  'Abyss permanently locks the district as Chrysalis',
  'Continuum opens an underused compatible Civic district',
  'Continuum founds a neutral Observatory district',
  'Abyss locks the Observatory district as Echo',
  'Continuum founds a neutral Containment district',
  'Second Continuum leaves the Containment district neutral',
  'Abyss locks the Civic district as Echo; hysteresis holds Chrysalis',
  'Verdance founds a neutral Subsurface district',
  'Abyss locks the Subsurface district as Spore',
  'Continuum founds a neutral Habitat district',
  'Abyss reinforces the locked Spore district; hysteresis still holds Chrysalis',
  'Entropy Veil locks Containment as Echo and changes the surrounding civilization',
  'Damage changes operation, not district influence',
  'Repair restores the same resident bay and preserves district history',
] as const;

// Lifecycle frames follow the completed forge history. Keep their meaning
// stable when another review frame is appended to the timeline.
const DISTRICT_DYAD_PROOF_ECHO_STEP = CIVILIZATION_DISTRICT_DYAD_PROOF_IDS.length;
const DISTRICT_DYAD_PROOF_DAMAGE_STEP = DISTRICT_DYAD_PROOF_ECHO_STEP + 1;

const CITY_PROGRESSION_PROOFS = [
  { stage: 0, label: 'Landscape', proof: 'zero', tier: 1 },
  { stage: 1, label: 'First Civic Nucleus', proof: 'one', tier: 1 },
  { stage: 2, label: 'Young City', proof: 'two', tier: 1 },
  { stage: 3, label: 'Expanding City', proof: 'developing-three', tier: 1 },
  { stage: 4, label: 'Established City', proof: 'established-city', tier: 1 },
  { stage: 5, label: 'Planetary Metropolis', proof: 'planetary-city', tier: 1 },
  { stage: 6, label: 'Stellar Conversion', proof: 'stellar-conversion', tier: 2 },
  { stage: 7, label: 'Stellar Metropolis', proof: 'stellar-city', tier: 2 },
  { stage: 8, label: 'Galactic Conversion', proof: 'galactic-conversion', tier: 3 },
  { stage: 9, label: 'Galactic Metropolis', proof: 'galactic-city', tier: 3 },
] as const satisfies readonly {
  stage: number;
  label: string;
  proof: CivilizationCollectionProofState;
  tier: KardashevTier;
}[];

const CIVILIZATION_EVOLUTION_PROOF_IDS = [
  // Legacy scale-lock fixture retained only to verify migration compatibility.
  't1r01', 't1r02', 't1e01', 't1e02',
  't1s01', 't1s02', 't1o01', 't1o02',
  't1r03', 't1r04', 't1p01', 't1p02',
  't1s03', 't1s04', 't1e03', 't1e04',
] as const;

interface PreviewPreset {
  id: PreviewPresetId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  tone: string;
  artifactIds: readonly string[];
  blueprintIds: readonly BlueprintId[];
  luminaryAffinity?: 'flare' | 'continuum' | 'verdance' | 'abyss' | 'radiance';
  includeSealedProtocol?: boolean;
  includeChronicle?: boolean;
}

const TIERS: Array<{ label: string; tier: KardashevTier }> = [
  { label: 'Planetary', tier: 1 },
  { label: 'Stellar', tier: 2 },
  { label: 'Galactic', tier: 3 },
];

const TIER_QUERY_LABELS: Record<KardashevTier, string> = {
  0: 'emergent',
  1: 'planetary',
  2: 'stellar',
  3: 'galactic',
};

function getInitialTier(): KardashevTier {
  if (typeof window === 'undefined') return 2;
  const params = new URLSearchParams(window.location.search);
  const proof = params.get('proof')?.toLowerCase();
  const progressionProof = CITY_PROGRESSION_PROOFS.find((entry) => entry.proof === proof);
  if (progressionProof) return progressionProof.tier;
  const tier = params.get('tier')?.toLowerCase();
  if (tier === '1' || tier === 'planetary') return 1;
  if (tier === '2' || tier === 'stellar') return 2;
  if (tier === '3' || tier === 'galactic') return 3;
  return 2;
}

function getInitialScanState(): boolean {
  if (typeof window === 'undefined') return false;
  const scan = new URLSearchParams(window.location.search).get('scan')?.toLowerCase();
  return scan === '1' || scan === 'true' || scan === 'open';
}

function getInitialNoticePreviewState(): boolean {
  if (typeof window === 'undefined') return false;
  const notice = new URLSearchParams(window.location.search).get('notice')?.toLowerCase();
  return notice === '1' || notice === 'true' || notice === 'board';
}

function getInitialScene(): PreviewSceneKind | undefined {
  if (typeof window === 'undefined') return undefined;
  const scene = new URLSearchParams(window.location.search).get('scene')?.toLowerCase();
  if (scene === 'surface' || scene === 'orbit' || scene === 'stellar' || scene === 'galaxy') {
    return scene;
  }
  return undefined;
}

function getInitialPreset(): PreviewPresetId {
  if (typeof window === 'undefined') return 'balanced';
  const preset = new URLSearchParams(window.location.search).get('preset')?.toLowerCase();
  if (
    preset === 'recovery' ||
    preset === 'foundry' ||
    preset === 'hazard' ||
    preset === 'routes' ||
    preset === 'accord' ||
    preset === 'archive' ||
    preset === 'chronicle' ||
    preset === 'sealed'
  ) {
    return preset;
  }
  return 'balanced';
}

function getInitialDyad(): CivilizationDyadId {
  if (typeof window === 'undefined') return 'chrysalis';
  const dyad = new URLSearchParams(window.location.search).get('dyad');
  return CIVILIZATION_DYAD_DEFINITIONS.some((definition) => definition.id === dyad)
    ? dyad as CivilizationDyadId
    : 'chrysalis';
}

function getInitialDyadPriority(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('dyadPriority') === '1';
}

function getInitialEnvironment(): CivilizationEnvironmentVariantId {
  if (typeof window === 'undefined') return 'aurora_basin';
  const value = new URLSearchParams(window.location.search).get('environment');
  return CIVILIZATION_ENVIRONMENT_VARIANTS.some((variant) => variant.id === value)
    ? value as CivilizationEnvironmentVariantId
    : 'aurora_basin';
}

function getInitialForgePreviewCount(): number {
  if (typeof window === 'undefined') return 0;
  const count = Number(new URLSearchParams(window.location.search).get('forge') ?? '0');
  if (!Number.isFinite(count)) return 0;
  return Math.min(FORGE_PREVIEW_ARTIFACTS.length, Math.max(0, Math.trunc(count)));
}

function getInitialRecentSiteIds(): string[] {
  if (typeof window === 'undefined') return [];
  const recent = new URLSearchParams(window.location.search).get('recent');
  if (!recent) return [];
  return recent
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getInitialStability(): CivilizationStabilityBand {
  if (typeof window === 'undefined') return 'stable';
  const value = new URLSearchParams(window.location.search).get('stability');
  return value === 'strained' || value === 'unstable' || value === 'crisis' ? value : 'stable';
}

function getInitialCondition(): CivilizationCoreCondition | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('condition');
  return value === 'damaged' || value === 'isolated' || value === 'quarantined' || value === 'disrupted'
    ? value
    : null;
}

function getInitialCollectionProofState(): CivilizationCollectionProofState {
  if (typeof window === 'undefined') return 'loadout-a';
  const params = new URLSearchParams(window.location.search);
  const proof = params.get('proof')?.toLowerCase();
  if (proof === 'base' || proof === 'baseline' || proof === 'zero') return 'zero';
  if (proof === 'one' || proof === 'nucleus') return 'one';
  if (proof === 'two' || proof === 'city') return 'two';
  if (proof === 'developing-three' || proof === 'developing-3') return 'developing-three';
  if (proof === 'established-city' || proof === 'established') return 'established-city';
  if (proof === 'planetary-city') return 'planetary-city';
  if (proof === 'stellar-conversion') return 'stellar-conversion';
  if (proof === 'stellar-city') return 'stellar-city';
  if (proof === 'galactic-conversion') return 'galactic-conversion';
  if (proof === 'galactic-city') return 'galactic-city';
  if (proof === 'b' || proof === 'loadout-b') return 'loadout-b';
  if (proof === 'all' || proof === 'saturated') return 'saturated';
  if (proof === 'evolution' || proof === 'history') return 'evolution';
  if (proof === 'district-dyad' || proof === 'districts') return 'district-dyad';
  if (proof === 'parcel-coverage') return 'parcel-coverage';
  if (proof === 'preset' || proof === 'curated') return 'preset';
  if (proof === 'a' || proof === 'loadout-a') return 'loadout-a';
  return params.get('preset') && params.get('preset') !== 'balanced' ? 'preset' : 'loadout-a';
}

function getInitialDistrictDyadProofStep(): number {
  if (typeof window === 'undefined') return DISTRICT_DYAD_PROOF_STEPS.length - 1;
  const value = Number.parseInt(
    new URLSearchParams(window.location.search).get('districtStep') ?? '',
    10,
  );
  return Number.isFinite(value)
    ? Math.max(0, Math.min(DISTRICT_DYAD_PROOF_STEPS.length - 1, value))
    : DISTRICT_DYAD_PROOF_STEPS.length - 1;
}

function getInitialLegacyProofState(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('legacy') === '1';
}

function getInitialParcelProof() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const witness = getCivilizationParcelProof(params.get('parcelWitness'));
  const requestedStep = Number.parseInt(params.get('parcelStep') ?? '', 10);
  return { family: witness.family, step: Number.isFinite(requestedStep)
    ? Math.max(0, Math.min(witness.artifactIds.length, requestedStep)) : witness.artifactIds.length };
}

function updateParcelProofQuery(family: string, step: number) {
  const params = new URLSearchParams(window.location.search);
  params.set('proof', 'parcel-coverage');
  params.set('parcelWitness', family);
  params.set('parcelStep', String(step));
  params.set('scene', 'surface');
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
}

function updateCollectionProofQuery(state: CivilizationCollectionProofState) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.set('proof', state);
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
}

function updateDistrictDyadProofStepQuery(step: number) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.set('proof', 'district-dyad');
  params.set('districtStep', String(step));
  params.set('scene', 'surface');
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
}

function updatePreviewQuery(nextTier: KardashevTier, nextPreset?: PreviewPresetId) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.set('tier', TIER_QUERY_LABELS[nextTier]);
  if (nextPreset) params.set('preset', nextPreset);
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
}

function getPreviewRecordScene(
  tier: KardashevTier,
  site: CivilizationDeploymentSite | null,
): CivilizationArtScene {
  if (site?.nativeArtworkLayer) return site.nativeArtworkLayer;
  if (site?.depictionScale === 'galactic' || site?.scaleBand === 'galactic') return 'galaxy';
  if (site?.depictionScale === 'stellar' || site?.scaleBand === 'stellar') return 'stellar';
  if (
    site?.depictionScale === 'macro' ||
    site?.depictionScale === 'tabletop' ||
    site?.depictionScale === 'room' ||
    site?.depictionScale === 'installation'
  ) return 'surface';
  if (tier >= 3) return 'galaxy';
  if (tier >= 2) return 'stellar';
  return 'surface';
}

function getPreviewArchetypeSignals(
  deploymentSites: readonly CivilizationDeploymentSite[],
  blueprintCount: number,
  luminary: boolean,
): CivilizationArchetypeSignals {
  return {
    blueprintCount,
    luminary,
    living: deploymentSites.some((site) => (
      site.trait === 'biosphere' ||
      site.trait === 'replication' ||
      site.trait === 'lattice'
    )),
    foundry: deploymentSites.some((site) => site.trait === 'ignition' || site.trait === 'entropy'),
    hazard: deploymentSites.some((site) => (
      site.trait === 'containment' ||
      site.trait === 'veil' ||
      site.blueprintId === 'bp_antimatter_detonator'
    )),
    route: deploymentSites.some((site) => (
      site.trait === 'transit' ||
      site.trait === 'chronology' ||
      site.trait === 'aperture'
    )),
  redaction: deploymentSites.some((site) => site.kind === 'protocol'),
  };
}

function buildPreviewCivilization(
  dyadId: CivilizationDyadId,
  tier: KardashevTier,
  artifacts: readonly ArtifactCard[],
  stabilityBand: CivilizationStabilityBand,
  activeCondition: CivilizationCoreCondition | null,
  blueprintIds: readonly BlueprintId[] = [],
  environmentVariantId: CivilizationEnvironmentVariantId = 'aurora_basin',
  evolutionProof = false,
  districtDyadProof = false,
  districtDyadProofStep = 0,
  legacyComplete = false,
  chronologicalProof = false,
): CivilizationPublicState {
  const dyad = CIVILIZATION_DYAD_DEFINITIONS.find((definition) => (
    definition.id === (evolutionProof ? 'echo' : dyadId)
  ))
    ?? CIVILIZATION_DYAD_DEFINITIONS[0];
  const historicalCounts = evolutionProof
    ? { flare: 5, radiance: 0, verdance: 5, continuum: 10, abyss: 10 }
    : Object.fromEntries(STANDARD_AFFINITY_KEYS.map((affinity) => [
        affinity,
        affinity === dyad.affinities[0] ? 6 : affinity === dyad.affinities[1] ? 5 : 0,
      ])) as Record<StandardAffinityKey, number>;
  const rankedAffinities = STANDARD_AFFINITY_KEYS
    .map((affinity) => ({
      affinity,
      historicalWeight: historicalCounts[affinity],
      operationalWeight: historicalCounts[affinity],
    }))
    .sort((left, right) => right.historicalWeight - left.historicalWeight);
  const maturity = tier >= 3 ? 'galactic' : tier >= 2 ? 'stellar' : 'planetary';
  const totalHistorical = STANDARD_AFFINITY_KEYS.reduce(
    (total, affinity) => total + historicalCounts[affinity],
    0,
  );
  const normalizedShares = Object.fromEntries(STANDARD_AFFINITY_KEYS.map((affinity) => [
    affinity,
    totalHistorical > 0 ? historicalCounts[affinity] / totalHistorical : 0,
  ])) as Record<StandardAffinityKey, number>;
  const primaryAffinity = rankedAffinities[0]?.affinity ?? null;
  const primaryWeight = rankedAffinities[0]?.historicalWeight ?? 0;
  const secondaryWeight = rankedAffinities[1]?.historicalWeight ?? 0;
  const thirdAffinity = (rankedAffinities[2]?.historicalWeight ?? 0) > 0
    ? rankedAffinities[2].affinity
    : null;
  const thirdWeight = rankedAffinities[2]?.historicalWeight ?? 0;

  const environmentIdentity = createCivilizationEnvironmentIdentity(
    `civilization-scene-lab:${dyadId}`,
    environmentVariantId,
  );
  let assignmentState = createInitialCivilizationState(environmentIdentity);
  const isDistrictProofDamage = (artifactId: string) => (
    districtDyadProof &&
    districtDyadProofStep === DISTRICT_DYAD_PROOF_DAMAGE_STEP &&
    artifactId === CIVILIZATION_DISTRICT_DYAD_PROOF_IDS.at(-1)
  );
  if (districtDyadProof || chronologicalProof) {
    artifacts.forEach((artifact, index) => {
      const turnCount = index + 1;
      assignmentState.artifacts[artifact.id] = {
        artifactId: artifact.id,
        firstMasteredTurnCount: turnCount,
        masteryCount: 1,
        implementationState: isDistrictProofDamage(artifact.id) || (
          chronologicalProof && activeCondition === 'damaged' && index < Math.min(4, artifacts.length)
        ) ? 'damaged' : 'operational',
        implementationStateChangedTurnCount: turnCount,
        implementationChangeSource: null,
        historyEvidence: 'recorded',
      };
      assignmentState = reconcileCivilizationDerivedState(
        assignmentState,
        [],
        turnCount,
        {},
        { commitPresentation: false },
      );
      assignmentState = reconcileCivilizationDerivedState(
        assignmentState,
        [],
        turnCount,
        {},
        { commitPresentation: true },
      );
    });
  } else {
    assignmentState.artifacts = Object.fromEntries(artifacts.map((artifact, index) => [
      artifact.id,
      {
        artifactId: artifact.id,
        firstMasteredTurnCount: index + 1,
        masteryCount: 1,
        implementationState: activeCondition === 'damaged' && index < Math.min(4, artifacts.length)
          ? 'damaged' as const
          : 'operational' as const,
        implementationStateChangedTurnCount: index + 1,
        implementationChangeSource: null,
        historyEvidence: 'recorded' as const,
      },
    ]));
  }
  blueprintIds.forEach((blueprintId, slotIndex) => {
    const projectId = civilizationProjectId(blueprintId, slotIndex);
    assignmentState.projects[projectId] = {
      projectId,
      blueprintId,
      slotIndex,
      status: 'manifested',
      matchedComponentIds: BLUEPRINT_DEFINITIONS[blueprintId].components.map((component) => component.artifactId),
      deviceState: BLUEPRINT_DEFINITIONS[blueprintId].initialDeviceState,
      presentationVariant: 'armored',
      manifestedTurnCount: 8 + slotIndex,
      stateChangedTurnCount: 8 + slotIndex,
      historyEvidence: 'recorded',
    };
  });
  if (legacyComplete && tier >= 3) {
    assignmentState.legacy = {
      completedTurnCount: 9,
      historyEvidence: 'recorded',
    };
  }
  const previewTurnCount = districtDyadProof || chronologicalProof ? artifacts.length : 9;
  const reconciledAssignmentState = reconcileCivilizationDerivedState(
    assignmentState,
    [],
    previewTurnCount,
  );
  const manifestationAssignments = Object.values(
    reconcileCivilizationManifestationAssignments(reconciledAssignmentState, previewTurnCount),
  );
  const identityScales = structuredClone(reconciledAssignmentState.identityScales);
  if (!evolutionProof && !districtDyadProof) {
    for (const layer of CIVILIZATION_IDENTITY_LAYERS) {
      const current = identityScales[layer];
      if (current.status === 'plain') continue;
      const committed = current.status === 'committed';
      identityScales[layer] = {
        ...current,
        affinityCounts: { ...historicalCounts },
        normalizedShares: { ...normalizedShares },
        rankedAffinities: rankedAffinities.map((entry) => ({
          affinity: entry.affinity,
          weight: entry.historicalWeight,
        })),
        dominantAffinity: primaryAffinity,
        candidateDyad: dyad.id,
        committedDyad: committed ? dyad.id : null,
        committedTurnCount: committed ? current.committedTurnCount ?? 1 : null,
      };
    }
  }

  return {
    version: CIVILIZATION_STATE_VERSION,
    environmentIdentity,
    artifacts: artifacts.map((entry, index) => ({
      artifactId: entry.id,
      firstMasteredTurnCount: index + 1,
      masteryCount: 1,
      implementationState: isDistrictProofDamage(entry.id) || (
        activeCondition === 'damaged' && index < Math.min(4, artifacts.length)
      )
        ? 'damaged'
        : 'operational',
      implementationStateChangedTurnCount: null,
      changeSourceType: 'artifact',
      historyEvidence: 'recorded',
    })),
    affinityIdentity: evolutionProof || districtDyadProof || artifacts.length === 0
      ? reconciledAssignmentState.affinityIdentity
      : {
      policyId: 'provisional-ratio-v1',
      form: 'dyad',
      historicalCounts,
      operationalCounts: historicalCounts,
      rankedAffinities,
      dominantAffinity: primaryAffinity,
      dominantDyad: dyad.id,
      foundingDyad: evolutionProof ? 'bloom' : dyad.id,
      presentationDyad: dyad.id,
      identityEpochs: evolutionProof
        ? [{
            epochIndex: 0,
            dyad: 'bloom',
            startedTurnCount: 1,
            endedTurnCount: 11,
            historicalSharesAtStart: { flare: 0.5, radiance: 0, verdance: 0.5, continuum: 0, abyss: 0 },
            historyEvidence: 'recorded',
          }, {
            epochIndex: 1,
            dyad: 'echo',
            startedTurnCount: 11,
            endedTurnCount: null,
            historicalSharesAtStart: normalizedShares,
            historyEvidence: 'recorded',
          }]
        : [{
            epochIndex: 0,
            dyad: dyad.id,
            startedTurnCount: 1,
            endedTurnCount: null,
            historicalSharesAtStart: normalizedShares,
            historyEvidence: 'recorded',
          }],
      normalizedHistoricalShares: normalizedShares,
      normalizedOperationalShares: normalizedShares,
      thirdAffinity,
      dominantShare: totalHistorical > 0 ? primaryWeight / totalHistorical : 0,
      secondaryToPrimaryRatio: primaryWeight > 0 ? secondaryWeight / primaryWeight : 0,
      thirdToPrimaryRatio: primaryWeight > 0 ? thirdWeight / primaryWeight : 0,
    },
    districtIdentity: reconciledAssignmentState.districtIdentity,
    identityScales,
    scale: {
      historicalMaturity: maturity,
      currentReach: activeCondition === 'isolated' ? 'planetary' : maturity,
      currentReachCondition: activeCondition === 'isolated' ? 'fractured' : activeCondition ? 'degraded' : 'intact',
      literalKardashevType: tier,
      literalKardashevEvidence: 'recorded',
    },
    stability: {
      band: stabilityBand,
      score: stabilityBand === 'stable' ? 84 : stabilityBand === 'strained' ? 58 : stabilityBand === 'unstable' ? 32 : 12,
      calibrationId: 'civilization-stability-v1',
      contributors: [],
      calculatedTurnCount: 9,
      historyEvidence: 'recorded',
    },
    activeConditions: activeCondition ? [{
      type: activeCondition,
      coreType: activeCondition,
      targetKind: 'network',
      sourceType: 'system',
      appliedTurnCount: 8,
      historyEvidence: 'recorded',
    }] : [],
    activeCapabilityIds: [],
    manifestationAssignments,
    events: [],
    legacy: reconciledAssignmentState.legacy,
  };
}

const SAMPLE_ARTIFACTS: ArtifactCard[] = ARTIFACT_CATALOG.map((definition) => ({
  id: definition.id,
  name: CARD_NAME_FALLBACK[definition.id] ?? definition.id,
  tier: definition.tier,
  eminence: definition.eminence,
  bonusAffinity: definition.bonusAffinity,
  flavor: `${ARTIFACT_CANON[definition.id].functionalText} ${ARTIFACT_CANON[definition.id].mystery}`,
  cost: { ...definition.cost },
}));

const PREVIEW_PRESETS: readonly PreviewPreset[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    shortLabel: 'BAL',
    icon: Orbit,
    tone: '#82ddff',
    artifactIds: ['t1r02', 't1s02', 't1r01', 't1p04', 't2o01', 't3s01', 't3e01'],
    blueprintIds: ['bp_antimatter_detonator', 'bp_mantle_to_orbit_foundry'],
    luminaryAffinity: 'verdance',
    includeSealedProtocol: true,
  },
  {
    id: 'recovery',
    label: 'Recovery',
    shortLabel: 'REC',
    icon: Leaf,
    tone: '#70efb2',
    artifactIds: ['t1r02', 't3e01'],
    blueprintIds: [],
    luminaryAffinity: 'verdance',
  },
  {
    id: 'foundry',
    label: 'Foundry',
    shortLabel: 'FOU',
    icon: Factory,
    tone: '#dfb86b',
    artifactIds: ['t1s02', 't1r01'],
    blueprintIds: ['bp_mantle_to_orbit_foundry'],
    luminaryAffinity: 'flare',
  },
  {
    id: 'hazard',
    label: 'Hazard',
    shortLabel: 'HAZ',
    icon: ShieldAlert,
    tone: '#ff6972',
    artifactIds: ['t1p04', 't2o01'],
    blueprintIds: ['bp_antimatter_detonator'],
    luminaryAffinity: 'abyss',
  },
  {
    id: 'routes',
    label: 'Routes',
    shortLabel: 'ROU',
    icon: Route,
    tone: '#8bbdff',
    artifactIds: ['t1s02', 't3s01'],
    blueprintIds: [],
    luminaryAffinity: 'continuum',
  },
  {
    id: 'accord',
    label: 'Accord',
    shortLabel: 'ACC',
    icon: Handshake,
    tone: '#ffe4a3',
    artifactIds: ['t2p03', 't3p01'],
    blueprintIds: [],
    luminaryAffinity: 'radiance',
  },
  {
    id: 'archive',
    label: 'Archive',
    shortLabel: 'ARC',
    icon: Archive,
    tone: '#bea2ff',
    artifactIds: ['t1s01', 't2s02', 't3s03'],
    blueprintIds: [],
    luminaryAffinity: 'continuum',
  },
  {
    id: 'chronicle',
    label: 'Chronicle',
    shortLabel: 'CHR',
    icon: Archive,
    tone: '#bea2ff',
    artifactIds: ['t1s01', 't2s02'],
    blueprintIds: [],
    luminaryAffinity: 'radiance',
    includeChronicle: true,
  },
  {
    id: 'sealed',
    label: 'Sealed',
    shortLabel: 'SEA',
    icon: LockKeyhole,
    tone: '#ff6972',
    artifactIds: ['t1p04', 't2o01', 't3s01'],
    blueprintIds: ['bp_antimatter_detonator'],
    luminaryAffinity: 'abyss',
    includeSealedProtocol: true,
  },
];

const SAMPLE_ARTIFACT_BY_ID = new Map(SAMPLE_ARTIFACTS.map((entry) => [entry.id, entry]));

const FORGE_PREVIEW_ARTIFACTS: ArtifactCard[] = (['t1r07', 't1e01'] as const)
  .map((artifactId) => SAMPLE_ARTIFACT_BY_ID.get(artifactId))
  .filter((entry): entry is ArtifactCard => Boolean(entry));

const SAMPLE_LORE: CardLoreCatalog = Object.fromEntries(
  Object.entries(ARTIFACT_CANON).map(([id, canon]) => [id, {
    name: canon.name,
    flavor: `${canon.functionalText} ${canon.mystery}`,
    artifactForm: canon.forms.join(' / '),
    practicalCapability: canon.practicalCapability,
    civLane: canon.civLane,
    engineeringScale: canon.engineeringScale,
    depictionScale: ARTIFACT_DEPICTION_SCALE_BY_ID[id as keyof typeof ARTIFACT_CANON],
  }]),
);

export default function DevCivilizationScene() {
  const [tier, setTier] = React.useState<KardashevTier>(() => getInitialTier());
  const [presetId, setPresetId] = React.useState<PreviewPresetId>(() => getInitialPreset());
  const [collectionProofState, setCollectionProofState] = React.useState<CivilizationCollectionProofState>(() => (
    getInitialCollectionProofState()
  ));
  const [districtDyadProofStep, setDistrictDyadProofStep] = React.useState(
    () => getInitialDistrictDyadProofStep(),
  );
  const [parcelProof, setParcelProof] = React.useState(getInitialParcelProof);
  const parcelWitness = getCivilizationParcelProof(parcelProof.family);
  const [dyadId, setDyadId] = React.useState<CivilizationDyadId>(() => getInitialDyad());
  const [dyadPriority, setDyadPriority] = React.useState(() => getInitialDyadPriority());
  const [placementProofVisible, setPlacementProofVisible] = React.useState(() => (
    new URLSearchParams(window.location.search).get('placementProof') === '1'
  ));
  const [environmentVariantId, setEnvironmentVariantId] = React.useState<CivilizationEnvironmentVariantId>(() => (
    getInitialEnvironment()
  ));
  const [defaultScanActive, setDefaultScanActive] = React.useState(() => getInitialScanState());
  const [noticePreviewActive, setNoticePreviewActive] = React.useState(() => getInitialNoticePreviewState());
  const [legacyProofComplete, setLegacyProofComplete] = React.useState(() => getInitialLegacyProofState());
  const [stabilityBand, setStabilityBand] = React.useState<CivilizationStabilityBand>(() => getInitialStability());
  const [activeCondition, setActiveCondition] = React.useState<CivilizationCoreCondition | null>(() => getInitialCondition());
  const defaultScene = React.useMemo(() => getInitialScene(), []);
  const initialRecentSiteIds = React.useMemo(() => getInitialRecentSiteIds(), []);
  const [selectedCard, setSelectedCard] = React.useState<ArtifactCard | null>(null);
  const [previewRecentSiteIds, setPreviewRecentSiteIds] = React.useState<string[]>(initialRecentSiteIds);
  const [previewPendingRepairIds, setPreviewPendingRepairIds] = React.useState<string[]>([]);
  const [forgePreviewArtifacts, setForgePreviewArtifacts] = React.useState<ArtifactCard[]>(() => (
    FORGE_PREVIEW_ARTIFACTS.slice(0, getInitialForgePreviewCount())
  ));
  const activePreset = React.useMemo(() => (
    PREVIEW_PRESETS.find((preset) => preset.id === presetId) ?? PREVIEW_PRESETS[0]
  ), [presetId]);
  const presetArtifacts = React.useMemo(() => (
    activePreset.artifactIds
      .map((artifactId) => SAMPLE_ARTIFACT_BY_ID.get(artifactId))
      .filter((entry): entry is ArtifactCard => Boolean(entry))
  ), [activePreset]);
  const isSaturatedProof = collectionProofState === 'saturated' || collectionProofState === 'galactic-city';
  const isParcelProof = collectionProofState === 'parcel-coverage';
  const saturatedPreviewIds = React.useMemo(() => (
    isSaturatedProof ? getCivilizationSaturatedPreviewIds(dyadId, dyadPriority) : []
  ), [dyadId, dyadPriority, isSaturatedProof]);
  const proofArtifacts = React.useMemo(() => {
    const proofIds = collectionProofState === 'parcel-coverage'
      ? parcelWitness.artifactIds.slice(0, parcelProof.step)
      : collectionProofState === 'one'
      ? CIVILIZATION_PROOF_LOADOUT_A_IDS.slice(0, 1)
      : collectionProofState === 'two'
        ? CIVILIZATION_PROOF_LOADOUT_A_IDS.slice(0, 2)
      : collectionProofState === 'developing-three'
          ? CIVILIZATION_PROOF_LOADOUT_A_IDS.slice(0, 5)
          : collectionProofState === 'established-city'
            ? CIVILIZATION_PROOF_LOADOUT_A_IDS.slice(0, 8)
            : collectionProofState === 'planetary-city'
              ? CIVILIZATION_PROOF_LOADOUT_A_IDS.slice(0, 10)
              : collectionProofState === 'stellar-conversion' ||
                  collectionProofState === 'galactic-conversion'
                ? CIVILIZATION_PROOF_LOADOUT_A_IDS.slice(0, 13)
                : collectionProofState === 'stellar-city'
                  ? CIVILIZATION_PROOF_LOADOUT_A_IDS.slice(0, 14)
                  : collectionProofState === 'galactic-city'
                    ? saturatedPreviewIds
        : collectionProofState === 'loadout-a'
      ? CIVILIZATION_PROOF_LOADOUT_A_IDS
      : collectionProofState === 'loadout-b'
        ? CIVILIZATION_PROOF_LOADOUT_B_IDS
        : collectionProofState === 'saturated'
          ? saturatedPreviewIds
          : collectionProofState === 'evolution'
            ? CIVILIZATION_EVOLUTION_PROOF_IDS
            : collectionProofState === 'district-dyad'
              ? CIVILIZATION_DISTRICT_DYAD_PROOF_IDS.slice(
                  0,
                  Math.min(districtDyadProofStep, CIVILIZATION_DISTRICT_DYAD_PROOF_IDS.length),
                )
            : [];
    const cards = proofIds
      .map((artifactId) => SAMPLE_ARTIFACT_BY_ID.get(artifactId))
      .filter((entry): entry is ArtifactCard => Boolean(entry));
    if (collectionProofState !== 'galactic-conversion' && collectionProofState !== 'galactic-city') {
      return cards;
    }
    const firstTierThreeIndex = cards.findIndex((artifact) => artifact.tier === 3);
    return cards.map((artifact, index) => index === firstTierThreeIndex
      ? { ...artifact, bonusesAtForge: { ...artifact.cost } }
      : artifact);
  }, [collectionProofState, districtDyadProofStep, saturatedPreviewIds, parcelWitness, parcelProof.step]);
  const previewArtifacts = React.useMemo(() => (
    collectionProofState === 'preset'
      ? [...presetArtifacts, ...forgePreviewArtifacts]
      : proofArtifacts
  ), [collectionProofState, forgePreviewArtifacts, presetArtifacts, proofArtifacts]);
  React.useEffect(() => {
    if (activeCondition !== 'damaged') {
      setPreviewPendingRepairIds([]);
      return;
    }
    const availableIds = new Set(previewArtifacts.map((artifact) => artifact.id));
    setPreviewPendingRepairIds((current) => current.filter((artifactId) => availableIds.has(artifactId)));
  }, [activeCondition, previewArtifacts]);
  const previewBlueprintIds = React.useMemo(() => (
    collectionProofState === 'loadout-a' ||
      collectionProofState === 'loadout-b' ||
      collectionProofState === 'galactic-city' ||
      collectionProofState === 'saturated'
      ? CIVILIZATION_PROOF_BLUEPRINT_IDS
      : collectionProofState === 'preset'
        ? activePreset.blueprintIds
        : []
  ), [activePreset.blueprintIds, collectionProofState]);
  const selectedCityProgressionStage = React.useMemo(() => (
    CITY_PROGRESSION_PROOFS.find((proof) => proof.proof === collectionProofState)?.stage ?? ''
  ), [collectionProofState]);
  const previewLuminaryAffinity = collectionProofState === 'preset'
    ? activePreset.luminaryAffinity
    : undefined;
  const includePreviewSealedProtocol = collectionProofState === 'preset' && activePreset.includeSealedProtocol;
  const includePreviewChronicle = collectionProofState === 'preset' && activePreset.includeChronicle;
  const profile = React.useMemo(() => buildCivilizationProfile(previewArtifacts), [previewArtifacts]);
  const selectedDyad = React.useMemo(() => (
    CIVILIZATION_DYAD_DEFINITIONS.find((definition) => definition.id === (
      collectionProofState === 'district-dyad'
        ? districtDyadProofStep >= DISTRICT_DYAD_PROOF_ECHO_STEP ? 'echo' : 'chrysalis'
        : dyadId
    ))
      ?? CIVILIZATION_DYAD_DEFINITIONS[0]
  ), [collectionProofState, districtDyadProofStep, dyadId]);
  const palette = React.useMemo(() => (
    collectionProofState === 'evolution'
      ? {
          primary: '#82ddff',
          secondary: '#dfb86b',
          accent: '#b9efff',
        }
      : {
          primary: AFFINITY_META[selectedDyad.affinities[0]].hex,
          secondary: AFFINITY_META[selectedDyad.affinities[1]].hex,
          accent: AFFINITY_META[selectedDyad.affinities[0]].glowHex,
        }
  ), [collectionProofState, selectedDyad]);
  const previewCivilization = React.useMemo(() => buildPreviewCivilization(
    dyadId,
    tier,
    previewArtifacts,
    stabilityBand,
    activeCondition,
    previewBlueprintIds,
    environmentVariantId,
    collectionProofState === 'evolution',
    collectionProofState === 'district-dyad' || isParcelProof,
    // Parcel witnesses derive identity from history without the timeline's
    // special final-resident damage frame.
    isParcelProof ? 0 : districtDyadProofStep,
    legacyProofComplete,
    isSaturatedProof || isParcelProof,
  ), [
    activeCondition,
    collectionProofState,
    districtDyadProofStep,
    dyadId,
    environmentVariantId,
    legacyProofComplete,
    isSaturatedProof,
    isParcelProof,
    previewArtifacts,
    previewBlueprintIds,
    stabilityBand,
    tier,
  ]);
  const saturatedDistrictCounts = React.useMemo(() => {
    const districts = Object.values(previewCivilization.districtIdentity.districts)
      .filter((district) => district.residentArtifactIds.length > 0);
    return {
      matching: districts.filter((district) => district.permanentDyad === dyadId).length,
      neutral: districts.filter((district) => district.permanentDyad === null).length,
      total: districts.length,
    };
  }, [dyadId, previewCivilization.districtIdentity.districts]);
  const deploymentSites = React.useMemo(() => buildCivilizationDeploymentSites({
    forgedArtifacts: previewArtifacts,
    loreCatalog: SAMPLE_LORE,
    tier,
    ownerPlayerId: 'preview',
    turnCount: 9,
    luminaryAffinities: previewLuminaryAffinity ? [{
      luminaryId: `lum_${previewLuminaryAffinity}`,
      ownerId: 'preview',
      activeAffinity: previewLuminaryAffinity,
      eligibleAffinities: [previewLuminaryAffinity],
      summonedAtTurnCount: 3,
    }] : [],
    manifestedBlueprintDevices: previewBlueprintIds.map((blueprintId, index) => ({
      blueprintId,
      definition: BLUEPRINT_DEFINITIONS[blueprintId] as never,
      ownerPlayerId: 'preview',
      slotIndex: index,
      state: index === 0 ? 'armed' : 'ready',
      presentationVariant: 'armored',
    })),
    scenarioProtocols: includePreviewSealedProtocol ? [{
      protocolId: 'sealed_protocol_01',
      ownerPlayerId: 'preview',
      slotIndex: 0,
      state: 'armed',
      publicEffect: 'A sealed consequence is active.',
    }] : [],
    chronicleRecords: includePreviewChronicle ? [{
      chronicleId: 'outer_vault_access',
      ownerPlayerId: 'preview',
      title: 'Outer Vault Access',
      summary: 'The recovered thread changes how the civilization remembers the first opened threshold.',
      visibleAs: 'a restored archive signal threaded through civic memory and threshold records',
      laneLabel: 'Recovered story thread',
      publicEffect: 'A recovered story-mode thread is available for future campaign context.',
      scaleBand: 'planetary',
      affinity: 'radiance',
      trait: 'archive',
    }] : [],
    civilizationArtifacts: previewCivilization.artifacts,
    manifestationAssignments: previewCivilization.manifestationAssignments,
  }), [
    includePreviewChronicle,
    includePreviewSealedProtocol,
    previewArtifacts,
    previewBlueprintIds,
    previewCivilization.artifacts,
    previewCivilization.manifestationAssignments,
    previewLuminaryAffinity,
    tier,
  ]);

  const hasRemainingForgePreview = forgePreviewArtifacts.length < FORGE_PREVIEW_ARTIFACTS.length;
  const tracePreviewMode: TracePreviewMode = noticePreviewActive ? 'notice' : 'scan';
  const setTracePreviewMode = React.useCallback((mode: TracePreviewMode) => {
    const nextNoticePreviewActive = mode === 'notice';
    setNoticePreviewActive(nextNoticePreviewActive);
    if (nextNoticePreviewActive) {
      setDefaultScanActive(false);
    }
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (nextNoticePreviewActive) {
      params.set('notice', '1');
      params.delete('scan');
    } else {
      params.delete('notice');
    }
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);
  const openScanPreview = React.useCallback(() => {
    setNoticePreviewActive(false);
    setDefaultScanActive(true);
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.delete('notice');
    params.set('scan', '1');
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);
  const acknowledgeRecentPreviewSites = React.useCallback((siteIds: readonly string[]) => {
    setPreviewRecentSiteIds((current) => current.filter((siteId) => !siteIds.includes(siteId)));
  }, []);
  const totalEminence = React.useMemo(() => (
    previewArtifacts.reduce((total, card) => total + Math.max(0, card.eminence), 0)
  ), [previewArtifacts]);
  const selectedTierLabel = TIERS.find((item) => item.tier === tier)?.label ?? 'Civilization';
  const commandFocusSite = React.useMemo(() => {
    const recentFocus = previewRecentSiteIds
      .map((siteId) => deploymentSites.find((site) => site.id === siteId))
      .find((site): site is NonNullable<typeof site> => Boolean(site));
    return recentFocus ?? deploymentSites[0] ?? null;
  }, [deploymentSites, previewRecentSiteIds]);
  const commandFocusCard = React.useMemo(() => (
    commandFocusSite?.artifactId
      ? previewArtifacts.find((card) => card.id === commandFocusSite.artifactId) ?? null
      : null
  ), [commandFocusSite, previewArtifacts]);
  const selectedCardSite = React.useMemo(() => (
    selectedCard
      ? deploymentSites.find((site) => site.artifactId === selectedCard.id) ?? null
      : null
  ), [deploymentSites, selectedCard]);
  const activeRecordSite = selectedCardSite ?? commandFocusSite;
  const activeRecordSource = selectedCard ?? commandFocusCard;
  const activeRecordScene = React.useMemo(() => (
    getPreviewRecordScene(tier, activeRecordSite)
  ), [activeRecordSite, tier]);
  const previewArchetype = React.useMemo(() => deriveCivilizationArchetype(
    profile,
    getPreviewArchetypeSignals(
      deploymentSites,
      previewBlueprintIds.length,
      Boolean(previewLuminaryAffinity),
    ),
  ), [deploymentSites, previewBlueprintIds.length, previewLuminaryAffinity, profile]);
  const activeRecordPlate = React.useMemo(() => (
    getCivilizationPlateArtSlot(activeRecordScene, true, previewArchetype)
  ), [activeRecordScene, previewArchetype]);
  const activeRecordArtSlot = React.useMemo(() => (
    activeRecordSite ? getCivilizationSiteArtSlot(activeRecordSite) : null
  ), [activeRecordSite]);
  const activeRecordTone = activeRecordSite ? palette.primary : '#82ddff';
  const activeRecordTitle = activeRecordSite?.title ?? activeRecordPlate.label;
  const activeRecordTitleCompact = activeRecordTitle.length > 28;
  const activeRecordTypeLabel = activeRecordSite
    ? activeRecordSite.kind === 'blueprint'
      ? 'Recovered Blueprint'
      : activeRecordSite.kind === 'luminary'
        ? 'Luminary Influence'
        : activeRecordSite.kind === 'protocol'
          ? 'Sealed Protocol'
          : activeRecordSite.kind === 'chronicle'
            ? 'Chronicle Thread'
            : activeRecordSource?.name ?? activeRecordSite.laneLabel
    : 'Civilization Record';

  return (
    <main
      className="relative overflow-hidden text-white"
      style={{ minHeight: '100dvh', backgroundColor: '#03050d' }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 18% 18%, rgba(80,154,255,0.18), transparent 34%)',
            'radial-gradient(circle at 82% 22%, rgba(223,184,107,0.12), transparent 30%)',
            'linear-gradient(rgba(130,221,255,0.055) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(130,221,255,0.05) 1px, transparent 1px)',
          ].join(','),
          backgroundSize: 'auto, auto, 64px 64px, 64px 64px',
        }}
        aria-hidden="true"
      />
      <div
        className="relative z-10 mx-auto flex w-full flex-col gap-2 px-2 py-2 sm:gap-4 sm:px-5 sm:py-4 lg:px-6"
        style={{ maxWidth: 1600 }}
      >
        <header
          className="relative overflow-hidden border border-[#82ddff]/16"
          style={{
            backgroundColor: 'rgba(7,16,31,0.86)',
            boxShadow: '0 22px 80px rgba(0,0,0,0.34)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#82ddff]/60 to-transparent"
            aria-hidden="true"
          />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 px-3 py-2 sm:px-4 sm:py-3 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1fr)_auto] lg:gap-4">
            <div className="col-start-1 row-start-1 min-w-0">
              <p
                className="text-[10px] font-black uppercase"
                style={{ letterSpacing: '0.26em', color: 'rgba(130,221,255,0.48)' }}
              >
                Civilization View
              </p>
              <h1 className="mt-1 text-sm font-semibold leading-tight text-white sm:text-lg">
                {selectedTierLabel} Command Portrait
              </h1>
            </div>
            <div className="col-span-2 row-start-2 grid w-full grid-cols-3 gap-1.5 sm:gap-2 lg:col-span-1 lg:row-auto lg:justify-center">
              {TIERS.map((item) => (
                <button
                  key={item.tier}
                  type="button"
                  className="min-w-0 rounded-[7px] border px-1.5 py-1.5 text-[8px] font-black uppercase tracking-widest transition-colors sm:px-3 sm:py-2 sm:text-[10px]"
                  style={{
                    borderColor: tier === item.tier ? palette.primary : 'rgba(255,255,255,0.14)',
                    background: tier === item.tier ? `${palette.primary}22` : 'rgba(255,255,255,0.035)',
                    color: tier === item.tier ? palette.accent : 'rgba(255,255,255,0.62)',
                  }}
                  onClick={() => {
                    setTier(item.tier);
                    setSelectedCard(null);
                    updatePreviewQuery(item.tier, presetId);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="col-start-2 row-start-1 justify-self-end rounded-[7px] border border-[#dfb86b]/45 bg-[#dfb86b]/10 px-2 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#ffe4a3] transition-colors hover:border-[#dfb86b]/70 hover:bg-[#dfb86b]/16 sm:px-3 sm:py-2 sm:text-[10px] lg:col-auto lg:row-auto lg:justify-self-end"
              onClick={() => {
                if (collectionProofState !== 'preset') {
                  setCollectionProofState('preset');
                  setSelectedCard(null);
                  setForgePreviewArtifacts([]);
                  setPreviewRecentSiteIds([]);
                  updateCollectionProofQuery('preset');
                  return;
                }
                setSelectedCard(null);
                setForgePreviewArtifacts((current) => {
                  if (current.length >= FORGE_PREVIEW_ARTIFACTS.length) {
                    setPreviewRecentSiteIds([]);
                    return [];
                  }
                  const nextArtifact = FORGE_PREVIEW_ARTIFACTS[current.length];
                  if (nextArtifact) setPreviewRecentSiteIds([`artifact:${nextArtifact.id}`]);
                  return nextArtifact ? [...current, nextArtifact] : current;
                });
              }}
            >
              {collectionProofState !== 'preset' ? (
                <>
                  <span className="sm:hidden">Curated Lab</span>
                  <span className="hidden sm:inline">Return to Curated Lab</span>
                </>
              ) : hasRemainingForgePreview ? (
                <>
                  <span className="sm:hidden">Forge Work</span>
                  <span className="hidden sm:inline">Simulate Artifact Forge</span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">Reset</span>
                  <span className="hidden sm:inline">Reset Forge Test</span>
                </>
              )}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/8 px-3 pb-2 pt-2 sm:px-4 lg:justify-center">
            <span className="mr-1 text-[8px] font-black uppercase tracking-[0.22em] text-white/36">
              Lab controls
            </span>
            <a
              href="/dev/civilization-tab"
              className="rounded-[7px] border border-amber-200/25 bg-amber-300/[0.06] px-2 py-1.5 text-[8px] font-black uppercase tracking-wider text-amber-100/70 hover:bg-amber-300/10"
            >
              Production tab test
            </a>
            {collectionProofState === 'evolution' || collectionProofState === 'district-dyad' || isParcelProof ? (
              <span
                className="rounded-[7px] border border-[#82ddff]/22 bg-[#82ddff]/[0.06] px-2 py-1.5 text-[8px] font-black uppercase tracking-wider text-[#bdeeff]/70"
                data-testid="civilization-history-derived-identity"
              >
                {collectionProofState === 'district-dyad' || isParcelProof
                  ? 'Civilization direction from permanent districts'
                  : 'Retired scale-lock data ignored by presentation'}
              </span>
            ) : (
              <select
                aria-label="Preview Dyad"
                className="rounded-[7px] border border-white/13 bg-[#07101f] px-2 py-1.5 text-[9px] text-white/72"
                value={dyadId}
                onChange={(event) => {
                  const next = event.target.value as CivilizationDyadId;
                  setDyadId(next);
                  const params = new URLSearchParams(window.location.search);
                  params.set('dyad', next);
                  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
                }}
              >
                {CIVILIZATION_DYAD_DEFINITIONS.map((definition) => (
                  <option key={definition.id} value={definition.id}>{definition.name} Dyad</option>
                ))}
              </select>
            )}
            <select
              aria-label="City Progression"
              className="rounded-[7px] border border-white/13 bg-[#07101f] px-2 py-1.5 text-[9px] text-white/72"
              value={selectedCityProgressionStage}
              onChange={(event) => {
                const nextStage = Number(event.target.value);
                const proof = CITY_PROGRESSION_PROOFS.find((entry) => entry.stage === nextStage);
                if (!proof) return;
                setCollectionProofState(proof.proof);
                setTier(proof.tier);
                setSelectedCard(null);
                setForgePreviewArtifacts([]);
                setPreviewRecentSiteIds([]);
                const params = new URLSearchParams(window.location.search);
                params.set('proof', proof.proof);
                params.set('tier', TIER_QUERY_LABELS[proof.tier]);
                params.set('scene', 'surface');
                window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
              }}
            >
              <option value="" disabled>City progression</option>
              {CITY_PROGRESSION_PROOFS.map((proof) => (
                <option key={proof.stage} value={proof.stage}>
                  {proof.stage}. {proof.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Preview Stability"
              className="rounded-[7px] border border-white/13 bg-[#07101f] px-2 py-1.5 text-[9px] text-white/72"
              value={stabilityBand}
              onChange={(event) => {
                const next = event.target.value as CivilizationStabilityBand;
                setStabilityBand(next);
                const params = new URLSearchParams(window.location.search);
                params.set('stability', next);
                window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
              }}
            >
              {(['stable', 'strained', 'unstable', 'crisis'] as const).map((band) => (
                <option key={band} value={band}>{band}</option>
              ))}
            </select>
            <select
              aria-label="Preview Environment Dressing"
              className="rounded-[7px] border border-white/13 bg-[#07101f] px-2 py-1.5 text-[9px] text-white/72"
              value={environmentVariantId}
              onChange={(event) => {
                const next = event.target.value as CivilizationEnvironmentVariantId;
                setEnvironmentVariantId(next);
                const params = new URLSearchParams(window.location.search);
                params.set('environment', next);
                window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
              }}
            >
              {CIVILIZATION_ENVIRONMENT_VARIANTS.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {getCivilizationEnvironmentDressing(variant.id).label}
                </option>
              ))}
            </select>
            <select
              aria-label="Preview Condition"
              className="rounded-[7px] border border-white/13 bg-[#07101f] px-2 py-1.5 text-[9px] text-white/72"
              value={activeCondition ?? 'none'}
              onChange={(event) => {
                const next = event.target.value === 'none'
                  ? null
                  : event.target.value as CivilizationCoreCondition;
                setActiveCondition(next);
                const params = new URLSearchParams(window.location.search);
                if (next) params.set('condition', next);
                else params.delete('condition');
                window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
              }}
            >
              <option value="none">no condition</option>
              {(['damaged', 'isolated', 'quarantined', 'disrupted'] as const).map((condition) => (
                <option key={condition} value={condition}>{condition}</option>
              ))}
            </select>
            <button
              type="button"
              aria-pressed={legacyProofComplete}
              className="rounded-[7px] border px-2 py-1.5 text-[8px] font-black uppercase tracking-wider transition-colors"
              style={{
                borderColor: legacyProofComplete ? palette.primary : 'rgba(255,255,255,0.13)',
                background: legacyProofComplete ? `${palette.primary}1D` : 'rgba(255,255,255,0.032)',
                color: legacyProofComplete ? palette.accent : 'rgba(255,255,255,0.56)',
              }}
              onClick={() => {
                const next = !legacyProofComplete;
                setLegacyProofComplete(next);
                const params = new URLSearchParams(window.location.search);
                if (next) params.set('legacy', '1');
                else params.delete('legacy');
                window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
              }}
            >
              Legacy complete
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/8 px-3 pb-2 pt-2 sm:px-4 lg:justify-center">
            <span className="mr-1 text-[8px] font-black uppercase tracking-[0.22em] text-white/36">
              Recent work
            </span>
            {([
              ['scan', 'Scan Response'],
              ['notice', 'Board Notice'],
            ] as const).map(([mode, label]) => {
              const active = tracePreviewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={active}
                  className="rounded-[7px] border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest transition-colors sm:px-3 sm:text-[9px]"
                  style={{
                    borderColor: active ? palette.primary : 'rgba(255,255,255,0.13)',
                    background: active ? `${palette.primary}1D` : 'rgba(255,255,255,0.032)',
                    color: active ? palette.accent : 'rgba(255,255,255,0.56)',
                  }}
                  onClick={() => setTracePreviewMode(mode)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </header>

        <details
          className="border border-white/10"
          style={{ backgroundColor: 'rgba(7,16,31,0.72)' }}
          data-testid="civilization-four-player-environment-proof"
        >
          <summary className="cursor-pointer px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/58">
            Shared construction-plan proof
          </summary>
          <label className="flex items-center gap-2 border-t border-white/8 px-3 py-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={placementProofVisible}
              onChange={(event) => {
                const visible = event.target.checked;
                setPlacementProofVisible(visible);
                const params = new URLSearchParams(window.location.search);
                if (visible) params.set('placementProof', '1');
                else params.delete('placementProof');
                window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
              }}
            />
            Show district placement guides
          </label>
          <div className="grid grid-cols-2 gap-2 border-t border-white/8 p-2 lg:grid-cols-4">
            {CIVILIZATION_ENVIRONMENT_VARIANTS.map((variant, seatIndex) => {
              const identity = createCivilizationEnvironmentIdentity(
                `four-player-proof:${seatIndex}`,
                variant.id,
              );
              const plate = getCivilizationEnvironmentPlateArtSlot('surface', false, identity);
              const dressing = getCivilizationEnvironmentDressing(variant.id);
              return (
                <figure
                  key={variant.id}
                  className="relative overflow-hidden border border-white/12 bg-black"
                  style={{ aspectRatio: '16 / 9' }}
                  data-environment-variant={variant.id}
                  data-construction-plan={CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID}
                >
                  <img
                    src={plate.src}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{
                      objectPosition: plate.position,
                      filter: `${plate.contrast} ${dressing.artFilter}`,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: dressing.surfaceAtmosphere, mixBlendMode: 'color' }}
                    aria-hidden="true"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-black/74 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-white/82">
                    Seat {seatIndex + 1} / {dressing.label}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </details>

        <details
          className="border border-white/10"
          style={{ backgroundColor: 'rgba(7,16,31,0.72)' }}
          data-testid="civilization-nested-identity-proof"
          open={collectionProofState === 'evolution'}
        >
          <summary className="cursor-pointer px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/58">
            Legacy scale-lock ledger (non-authoritative)
          </summary>
          <div className="grid gap-1.5 border-t border-white/8 p-2 sm:grid-cols-4">
            {CIVILIZATION_IDENTITY_LAYERS.map((layer) => {
              const identity = previewCivilization.identityScales[layer];
              const dyadId = identity.committedDyad ?? identity.candidateDyad;
              const dyadName = CIVILIZATION_DYAD_DEFINITIONS.find(
                (definition) => definition.id === dyadId,
              )?.name;
              return (
                <div
                  key={layer}
                  className="border border-white/10 bg-black/20 px-2.5 py-2"
                  data-testid={`civilization-identity-${layer}`}
                  data-status={identity.status}
                  data-dyad={dyadId ?? 'none'}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-[9px] font-black uppercase tracking-[0.16em] text-white/72">
                      {layer}
                    </strong>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-white/38">
                      {identity.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-white/88">
                    {dyadName ? `${dyadName}${identity.status === 'forming' ? ' forming' : ''}` : 'Plain foundation'}
                  </div>
                  <div className="mt-1 text-[9px] text-white/42">
                    {identity.evidence.length} era evidence
                  </div>
                </div>
              );
            })}
          </div>
        </details>

        {isParcelProof && (
          <section className="border border-white/15 bg-black/20 p-3" aria-label="Parcel coverage history">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Parcel history"
                className="border border-white/20 bg-[#07101f] p-2 text-xs text-white/80"
                value={parcelProof.family}
                onChange={(event) => {
                  const witness = getCivilizationParcelProof(event.target.value);
                  setParcelProof({ family: witness.family, step: witness.artifactIds.length });
                  setSelectedCard(null);
                  updateParcelProofQuery(witness.family, witness.artifactIds.length);
                }}
              >
                {CIVILIZATION_PARCEL_PROOFS.map((witness) => (
                  <option key={witness.family} value={witness.family}>{witness.label}</option>
                ))}
              </select>
              {([-1, 1] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  className="border border-white/20 px-3 py-2 text-xs text-white/80 disabled:opacity-35"
                  disabled={direction < 0 ? parcelProof.step === 0 : parcelProof.step === parcelWitness.artifactIds.length}
                  onClick={() => {
                    const step = parcelProof.step + direction;
                    setParcelProof({ ...parcelProof, step });
                    setSelectedCard(null);
                    updateParcelProofQuery(parcelProof.family, step);
                  }}
                >{direction < 0 ? 'Previous forge' : 'Next forge'}</button>
              ))}
              <span className="text-xs text-white/65" data-testid="civilization-parcel-proof-step">
                {parcelProof.step} / {parcelWitness.artifactIds.length} forges
              </span>
            </div>
            <p className="mt-2 text-xs text-white/55">
              Chronological allocation witness. Inspect the last forge opening the third district; resources and match economy are not simulated.
            </p>
          </section>
        )}

        {collectionProofState === 'district-dyad' && (
          <details
            className="border border-[#82ddff]/18"
            style={{ backgroundColor: 'rgba(7,16,31,0.82)' }}
            data-testid="civilization-district-dyad-proof"
            open
          >
            <summary className="cursor-pointer px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/64">
              District identity timeline
            </summary>
            <div className="border-t border-white/8 p-2.5 sm:p-3">
              <div className="flex gap-1.5 overflow-x-auto pb-2" role="group" aria-label="District identity proof timeline">
                {DISTRICT_DYAD_PROOF_STEPS.map((label, step) => {
                  const active = step === districtDyadProofStep;
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={active}
                      title={label}
                      className="min-w-9 shrink-0 border px-2 py-2 text-[9px] font-black transition-colors"
                      style={{
                        borderColor: active ? '#82ddff' : 'rgba(255,255,255,0.12)',
                        background: active ? 'rgba(130,221,255,0.16)' : 'rgba(255,255,255,0.025)',
                        color: active ? '#ffffff' : 'rgba(255,255,255,0.52)',
                      }}
                      data-testid={`civilization-district-step-${step}`}
                      onClick={() => {
                        setDistrictDyadProofStep(step);
                        setSelectedCard(null);
                        setCollectionProofState('district-dyad');
                        updateDistrictDyadProofStepQuery(step);
                      }}
                    >
                      {step}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-y border-white/8 py-2">
                <strong className="text-xs text-white/88">
                  {DISTRICT_DYAD_PROOF_STEPS[districtDyadProofStep]}
                </strong>
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-white/48">
                  Raw {previewCivilization.districtIdentity.rawDominantDyad ?? 'none'}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#bdeeff]/76">
                  Presented {previewCivilization.districtIdentity.presentationDyad ?? 'none'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CIVILIZATION_DYAD_DEFINITIONS
                  .filter((definition) => previewCivilization.districtIdentity.influenceByDyad[definition.id] > 0)
                  .map((definition) => (
                    <span
                      key={definition.id}
                      className="border border-white/12 bg-black/25 px-2 py-1 text-[9px] text-white/66"
                    >
                      {definition.name} {previewCivilization.districtIdentity.influenceByDyad[definition.id]}
                    </span>
                  ))}
                <span className="border border-white/10 bg-black/20 px-2 py-1 text-[9px] text-white/42">
                  Blueprints excluded
                </span>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {Object.values(previewCivilization.districtIdentity.districts)
                  .filter((district) => district.residentArtifactIds.length > 0)
                  .sort((left, right) => left.family.localeCompare(right.family) || left.instance - right.instance)
                  .map((district) => (
                    <article
                      key={district.districtId}
                      className="border border-white/10 bg-black/24 p-2.5"
                      data-testid="civilization-district-inspector-card"
                      data-district-id={district.districtId}
                      data-district-dyad={district.permanentDyad ?? 'neutral'}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="block text-[10px] font-black uppercase tracking-[0.12em] text-white/78">
                            {district.family.replaceAll('_', ' ')} {district.instance + 1}
                          </strong>
                          <span className="mt-0.5 block text-[9px] text-white/46">
                            {district.permanentDyad
                              ? `${district.permanentDyad} district`
                              : 'neutral district'}
                          </span>
                        </div>
                        <span className="text-right text-[9px] font-bold text-white/56">
                          {district.residentArtifactIds.length}/{district.softCapacity} soft<br />
                          {district.hardCapacity} hard
                        </span>
                      </div>
                      <dl className="mt-2 grid gap-1 text-[9px] leading-relaxed">
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 uppercase tracking-wider text-white/32">Residents</dt>
                          <dd className="text-white/64">
                            {district.residentArtifactIds.map((artifactId) => (
                              CARD_NAME_FALLBACK[artifactId as keyof typeof CARD_NAME_FALLBACK] ?? artifactId
                            )).join(', ')}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 uppercase tracking-wider text-white/32">Founders</dt>
                          <dd className="text-white/64">
                            {district.foundingAffinities.join(' + ') || 'none'}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 uppercase tracking-wider text-white/32">Influence</dt>
                          <dd className="text-white/64">{district.influence}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
              </div>
            </div>
          </details>
        )}

        <section
          className="border border-[#82ddff]/14 px-2.5 py-2.5 sm:px-3.5 sm:py-3"
          style={{
            backgroundColor: 'rgba(5,10,20,0.88)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
          }}
          data-testid="civilization-collection-proof"
          data-proof-state={collectionProofState}
        >
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#82ddff]/58">
                Artifact identity proof
              </p>
              <p className="mt-1 text-xs font-semibold text-white/86 sm:text-sm">
                {collectionProofState === 'zero'
                  ? 'Zero Artifacts: sparse neutral environment'
                  : collectionProofState === 'one'
                    ? 'One Artifact: a neutral settlement nucleus forms around it'
                    : collectionProofState === 'two'
                      ? 'Two Artifacts: supporting construction creates an emerging cityscape'
                      : collectionProofState === 'developing-three'
                        ? 'Five Artifacts: a developed pre-Type-I city preserves its earlier districts'
                        : collectionProofState === 'established-city'
                          ? 'Eight Artifacts: an established city bridges growth into planetary maturity'
                        : collectionProofState === 'planetary-city'
                          ? 'Planetary Metropolis: mature Type I construction across the same terrain'
                          : collectionProofState === 'stellar-conversion'
                            ? 'Stellar Conversion: existing districts begin absorbing Type II infrastructure'
                          : collectionProofState === 'stellar-city'
                            ? 'Stellar Metropolis: the same city after Type II integration'
                            : collectionProofState === 'galactic-conversion'
                              ? 'Galactic Conversion: Type III systems grow from the established stellar city'
                            : collectionProofState === 'galactic-city'
                              ? `Galactic Metropolis: ${previewArtifacts.length} catalog Artifacts and ${CIVILIZATION_PROOF_BLUEPRINT_IDS.length} Blueprints integrated at Type III maturity`
                      : collectionProofState === 'loadout-a'
                    ? 'Loadout A: 16 distinct Artifacts on the shared camera'
                    : collectionProofState === 'loadout-b'
                      ? 'Loadout B: 16 different Artifacts on the shared camera'
                      : collectionProofState === 'saturated'
                        ? `${previewArtifacts.length} catalog Artifacts and ${CIVILIZATION_PROOF_BLUEPRINT_IDS.length} Blueprints across their native scales`
                      : collectionProofState === 'evolution'
                          ? 'Legacy save fixture: retired per-scale locks remain inspectable, but one live direction renders every view'
                        : collectionProofState === 'district-dyad'
                          ? DISTRICT_DYAD_PROOF_STEPS[districtDyadProofStep]
                          : isParcelProof
                            ? `${parcelWitness.label}: ${parcelProof.step} chronological forges`
                          : 'Curated scene preset'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-5 lg:grid-cols-9" role="group" aria-label="Artifact identity comparison">
              {([
                ['zero', '0 Artifacts'],
                ['one', '1 Artifact'],
                ['two', '2 Artifacts'],
                ['loadout-a', 'Loadout A'],
                ['loadout-b', 'Loadout B'],
                ['saturated', 'Saturated'],
                ['evolution', 'Legacy Data'],
                ['district-dyad', 'District Dyads'],
                ['parcel-coverage', 'Parcel Histories'],
                ['preset', 'Curated'],
              ] as const).map(([state, label]) => {
                const active = collectionProofState === state;
                return (
                  <button
                    key={state}
                    type="button"
                    aria-pressed={active}
                    className="min-h-9 border px-2 text-[8px] font-black uppercase tracking-[0.12em] transition-colors sm:min-h-10 sm:px-3 sm:text-[9px]"
                    style={{
                      borderColor: active ? palette.primary : 'rgba(255,255,255,0.12)',
                      background: active ? `${palette.primary}20` : 'rgba(255,255,255,0.025)',
                      color: active ? '#ffffff' : 'rgba(255,255,255,0.54)',
                      boxShadow: active ? `inset 0 0 16px ${palette.primary}12` : undefined,
                    }}
                    onClick={() => {
                      setCollectionProofState(state);
                      setSelectedCard(null);
                      setForgePreviewArtifacts([]);
                      setPreviewRecentSiteIds([]);
                      if (state === 'district-dyad') {
                        updateDistrictDyadProofStepQuery(districtDyadProofStep);
                      } else {
                        updateCollectionProofQuery(state);
                      }
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {isSaturatedProof && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/8 pt-2.5">
              <label className="flex min-h-9 cursor-pointer items-center gap-2 text-xs text-white/80">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#82ddff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  checked={dyadPriority}
                  aria-describedby="civilization-saturated-district-count"
                  onChange={(event) => {
                    const next = event.target.checked;
                    setDyadPriority(next);
                    setSelectedCard(null);
                    const params = new URLSearchParams(window.location.search);
                    if (next) params.set('dyadPriority', '1');
                    else params.delete('dyadPriority');
                    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
                  }}
                />
                Prioritize {selectedDyad.name} districts
              </label>
              <p
                id="civilization-saturated-district-count"
                className="text-xs text-white/58"
                role="status"
                data-matching-districts={saturatedDistrictCounts.matching}
                data-total-districts={saturatedDistrictCounts.total}
                data-neutral-districts={saturatedDistrictCounts.neutral}
              >
                {saturatedDistrictCounts.matching} of {saturatedDistrictCounts.total} districts permanently founded as {selectedDyad.name}; {saturatedDistrictCounts.neutral} neutral
              </p>
            </div>
          )}
          <div className="mt-2.5 flex min-h-12 items-center gap-1.5 overflow-x-auto border-t border-white/8 pt-2.5" data-testid="civilization-proof-roster">
            {previewArtifacts.length > 0 ? previewArtifacts.map((card) => {
              const artwork = CARD_RUNTIME_ART[card.id] ?? null;
              const tone = AFFINITY_META[card.bonusAffinity].hex;
              return (
                <button
                  key={card.id}
                  type="button"
                  className="relative h-12 w-9 shrink-0 overflow-hidden border transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-14 sm:w-10"
                  style={{
                    borderColor: `${tone}82`,
                    backgroundColor: '#030711',
                    clipPath: 'polygon(10% 0, 90% 0, 100% 8%, 100% 92%, 90% 100%, 10% 100%, 0 92%, 0 8%)',
                  }}
                  title={`${card.name} // Tier ${card.tier}`}
                  aria-label={`Open ${card.name}`}
                  data-artifact-id={card.id}
                  onClick={() => setSelectedCard(card)}
                >
                  {artwork && (
                    <img src={artwork} alt="" className="h-full w-full object-cover" decoding="async" draggable={false} />
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-black/74 py-0.5 text-[7px] font-black text-white">
                    {card.tier}
                  </span>
                </button>
              );
            }) : (
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/38">
                Clean plate: no Artifact manifestations
              </p>
            )}
            <span className="ml-auto shrink-0 border-l border-white/10 pl-3 pr-1 text-right">
              <strong className="block text-xs font-semibold text-white/88" data-testid="civilization-proof-mapping-count">
                {deploymentSites.filter((site) => site.kind === 'artifact').length}/{previewArtifacts.length}
              </strong>
              <span className="block text-[7px] font-black uppercase tracking-[0.16em] text-white/38">
                mapped
              </span>
            </span>
          </div>
        </section>

        <div
          className={`grid min-h-0 gap-3 sm:gap-4 ${
            collectionProofState !== 'preset'
              ? 'lg:grid-cols-[minmax(0,1fr)]'
              : 'lg:grid-cols-[72px_minmax(0,1fr)]'
          }`}
        >
          {collectionProofState === 'preset' && (
            <nav
              className="flex gap-1 overflow-x-auto border border-white/10 bg-black/32 p-1 sm:gap-2 sm:p-2 lg:flex-col lg:overflow-visible"
              aria-label="Civilization preview presets"
            >
              {PREVIEW_PRESETS.map((preset) => {
                const active = presetId === preset.id;
                const PresetIcon = preset.icon;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={active}
                    className="group grid min-h-9 min-w-9 place-items-center rounded-[7px] border px-1 text-[8px] font-black uppercase tracking-widest transition-colors sm:min-h-12 sm:min-w-12 sm:px-2 sm:text-[9px] lg:min-w-0"
                    title={preset.label}
                    style={{
                      borderColor: active ? preset.tone : 'rgba(255,255,255,0.12)',
                      background: active
                        ? `linear-gradient(135deg, ${preset.tone}30, rgba(255,255,255,0.045))`
                        : 'rgba(255,255,255,0.028)',
                      color: active ? '#ffffff' : 'rgba(255,255,255,0.52)',
                      boxShadow: active ? `0 0 24px ${preset.tone}1F` : undefined,
                    }}
                    onClick={() => {
                      setCollectionProofState('preset');
                      setPresetId(preset.id);
                      setSelectedCard(null);
                      setForgePreviewArtifacts([]);
                      setPreviewRecentSiteIds([]);
                      updatePreviewQuery(tier, preset.id);
                      updateCollectionProofQuery('preset');
                    }}
                  >
                    <span
                      className="mb-0.5 grid h-5 w-5 place-items-center border sm:mb-1 sm:h-7 sm:w-7"
                      style={{
                        borderColor: active ? `${preset.tone}A8` : `${preset.tone}55`,
                        background: active ? `${preset.tone}1F` : 'rgba(255,255,255,0.035)',
                        boxShadow: active ? `inset 0 0 16px ${preset.tone}14` : undefined,
                      }}
                      aria-hidden="true"
                    >
                      <PresetIcon
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        style={{
                          color: active ? preset.tone : 'rgba(255,255,255,0.48)',
                          filter: active ? `drop-shadow(0 0 7px ${preset.tone}99)` : undefined,
                        }}
                        strokeWidth={active ? 2.3 : 1.7}
                      />
                    </span>
                    <span className="hidden lg:block">{preset.shortLabel}</span>
                    <span className="sr-only">{preset.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          <section className="min-w-0">
            <CivilizationScenePanel
              key={`${presetId}:${defaultScanActive ? 'scan' : 'default'}:${tracePreviewMode}:${defaultScene ?? 'tier'}`}
              tier={tier}
              palette={palette}
              profile={profile}
              civilization={previewCivilization}
              progressFraction={1}
              paused={false}
              defaultScanActive={defaultScanActive}
              defaultScene={defaultScene}
              placementProof={placementProofVisible}
              showAllArtifactPins={collectionProofState !== 'preset'}
              deploymentSites={deploymentSites}
              forgedArtifacts={previewArtifacts}
              stabilityBand={stabilityBand}
              activeConditions={activeCondition ? [activeCondition] : []}
              guidanceEnabled={false}
              externalRecentSiteIds={defaultScanActive && !noticePreviewActive ? previewRecentSiteIds : []}
              pendingRepairArtifactIds={previewPendingRepairIds}
              onRecentSiteIdsSeen={acknowledgeRecentPreviewSites}
              onRepairArtifacts={(artifactIds) => {
                setPreviewPendingRepairIds((current) => [...new Set([...current, ...artifactIds])]);
              }}
              onOpenArtifact={setSelectedCard}
            />
          </section>

          <aside className="hidden">
            <section
              className="overflow-hidden border border-[#82ddff]/16"
              style={{
                background: `linear-gradient(155deg, rgba(7,16,31,0.86), ${palette.primary}0D 52%, rgba(3,5,13,0.86))`,
                boxShadow: 'inset 0 0 32px rgba(130,221,255,0.045), 0 18px 60px rgba(0,0,0,0.34)',
              }}
            >
              <div className="border-b border-white/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#82ddff]/58">
                  Command Telemetry
                </p>
                <div className="mt-4 grid gap-3">
                  {[
                    ['Eminence', totalEminence],
                    ['Artifacts', previewArtifacts.length],
                    ['Traces', deploymentSites.length],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="grid items-center gap-2"
                      style={{ gridTemplateColumns: '82px 1fr auto' }}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/42">
                        {label}
                      </span>
                      <span className="h-1.5 overflow-hidden bg-white/10">
                        <span
                          className="block h-full"
                          style={{
                            width: `${Math.min(100, Number(value) * 8 + 16)}%`,
                            background: `linear-gradient(90deg, ${palette.primary}, ${palette.accent})`,
                          }}
                        />
                      </span>
                      <span className="text-xs font-semibold text-white/82">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="relative overflow-hidden border-b border-white/10"
                style={{ minHeight: 248 }}
              >
                <img
                  src={activeRecordPlate.src}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-74"
                  style={{
                    objectPosition: activeRecordPlate.position,
                    filter: `${activeRecordPlate.contrast} saturate(1.08) brightness(0.78)`,
                    transform: `scale(${activeRecordPlate.scanScale + 0.035})`,
                    transformOrigin: activeRecordPlate.transformOrigin,
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: [
                      'linear-gradient(180deg, rgba(3,5,13,0.06), rgba(3,5,13,0.84))',
                      'radial-gradient(circle at 50% 42%, transparent 0 30%, rgba(3,5,13,0.48) 72%)',
                    ].join(','),
                  }}
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute inset-4 border border-white/14"
                  style={{
                    boxShadow: `inset 0 0 24px ${activeRecordTone}18, 0 0 26px ${activeRecordTone}12`,
                  }}
                  aria-hidden="true"
                />
                <div
                  className="relative z-10 flex flex-col justify-between p-4"
                  style={{ minHeight: 248 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/46">
                        Deployment Dossier
                      </p>
                      <p
                        className={`mt-1 font-semibold text-white ${
                          activeRecordTitleCompact ? 'text-[16px] leading-[1.08]' : 'text-lg leading-tight'
                        }`}
                        style={{ maxWidth: 246, filter: 'drop-shadow(0 1px 12px rgba(0,0,0,0.95))' }}
                      >
                        {activeRecordTitle}
                      </p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/52">
                        {activeRecordTypeLabel}
                      </p>
                    </div>
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center border"
                      style={{
                        borderColor: `${activeRecordTone}90`,
                        background: `${activeRecordTone}16`,
                        boxShadow: `0 0 28px ${activeRecordTone}28`,
                      }}
                      aria-hidden="true"
                    >
                      <span
                        className="h-4 w-4 rotate-45 border"
                        style={{
                          borderColor: activeRecordTone,
                          boxShadow: `0 0 18px ${activeRecordTone}`,
                        }}
                      />
                    </span>
                  </div>

                  <div>
                    <div className="mb-3 grid grid-cols-5 gap-1">
                      {Array.from({ length: 10 }).map((_, index) => (
                        <span
                          key={index}
                          className="h-1 bg-white/12"
                          style={index < Math.min(10, deploymentSites.length + 2) ? {
                            background: `linear-gradient(90deg, ${activeRecordTone}, rgba(255,255,255,0.28))`,
                            opacity: 0.78 - index * 0.045,
                          } : undefined}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <p className="line-clamp-3 text-xs leading-relaxed text-white/72 drop-shadow-[0_1px_10px_rgba(0,0,0,0.9)]">
                      {activeRecordSite?.summary ?? 'Civilization work is surfaced here as a focused command dossier.'}
                    </p>
                    {activeRecordSite?.kind === 'artifact' && activeRecordSource && (
                      <ArtifactFunctionTags artifactId={activeRecordSource.id} compact className="mt-3" />
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[activeRecordArtSlot?.label, activeRecordSource?.name, activeRecordSite?.laneLabel]
                        .filter((entry): entry is string => Boolean(entry))
                        .slice(0, 3)
                        .map((entry, index) => (
                          <span
                            key={`${index}:${entry}`}
                            className="border border-white/12 bg-black/34 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/52 backdrop-blur"
                          >
                            {entry}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
                  Civilization Consequence
                </p>
                {activeRecordSite ? (
                  <div className="mt-3 grid gap-3">
                    <p
                      className="border-l pl-3 text-xs leading-relaxed text-white/68"
                      style={{ borderColor: `${palette.primary}55` }}
                    >
                      {activeRecordSite.visibleAs}.
                    </p>
                    <div className="grid gap-2 text-[10px] leading-relaxed text-white/54">
                      <p>
                        <span className="mb-0.5 block font-black uppercase tracking-widest text-white/34">
                          Civic role
                        </span>
                        <span className="text-white/62">{activeRecordSite.laneLabel}</span>
                      </p>
                      {activeRecordSite.synergySummary && (
                        <p>
                          <span className="mb-0.5 block font-black uppercase tracking-widest text-white/34">
                            Network interaction
                          </span>
                          <span className="text-white/62">{activeRecordSite.synergySummary}</span>
                        </p>
                      )}
                      {activeRecordSite.gameplayEffect && (
                        <p>
                          <span className="mb-0.5 block font-black uppercase tracking-widest text-white/34">
                            Game effect
                          </span>
                          <span className="text-white/62">{activeRecordSite.gameplayEffect}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-white/72">
                    Civilization traces will appear here as artifacts, Blueprints, and alliances reshape the portrait.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
      {previewRecentSiteIds.length > 0 && noticePreviewActive && !defaultScanActive && (
        <BoardCivilizationTraceNotice
          deploymentSites={deploymentSites}
          recentSiteIds={previewRecentSiteIds}
          palette={palette}
          civilizationModel={{
            name: 'Preview Civilization',
            tier,
            palette,
            profile,
            forgedCount: previewArtifacts.length,
            civilization: previewCivilization,
          }}
          progressFraction={1}
          onOpenCivilization={() => {
            openScanPreview();
          }}
        />
      )}
    </main>
  );
}
