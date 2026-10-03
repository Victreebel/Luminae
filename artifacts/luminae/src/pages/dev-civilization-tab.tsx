import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Circle,
  CircleDot,
  FlaskConical,
  Hammer,
  Landmark,
  LayoutGrid,
  List,
  Menu,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Shield,
  SkipForward,
  Sparkles,
  Zap,
  X,
} from 'lucide-react';
import type {
  AffinityCounts,
  ArtifactCard,
  BlueprintDefinition,
  BlueprintDetonationEvent,
  BlueprintManifestationEvent,
  CardLoreCatalog,
  CivilizationEventInstance,
  CivilizationPublicEventHistoryEntry,
  CivilizationPublicState,
  GamePlayerState,
  GameState,
  ManifestedDevicePublicState,
} from '@workspace/api-client-react';
import {
  ARTIFACT_DEFINITION_BY_ID,
  ARTIFACT_MANIFESTATION_PROFILE_BY_ID,
  BLUEPRINT_DEFINITIONS,
  CIVILIZATION_STATE_VERSION,
  DEFAULT_VICTORY_REQUIREMENT,
  civilizationProjectId,
  createCivilizationEnvironmentIdentity,
  createInitialCivilizationState,
  getCivilizationLegacyProgress,
  LEGACY_BLUEPRINT_REQUIREMENT,
  reconcileCivilizationDerivedState,
  reconcileCivilizationManifestationAssignments,
  type ArtifactId,
  type CivilizationArtifactLifecycleState,
  type BlueprintDeviceState,
  type BlueprintId,
} from '@workspace/game-types';
import backgroundCosmos from '@assets/generated_images/background_cosmos.png';
import { BlueprintPresentationOverlay } from '@/components/blueprints/BlueprintPresentationOverlay';
import { CivilizationEventPresentationOverlay } from '@/components/CivilizationEventPresentationOverlay';
import { ArtifactFunctionTags } from '@/components/ArtifactFunctionTags';
import { AffinityWellPanel, type AffinityWellPanelScope } from '@/pages/game-affinity-well-panel';
import { HandTab, type HandTabScope } from '@/pages/game-tabs';
import { CARD_NAME_FALLBACK } from '@/lib/cardNameFallback';
import { CARD_RUNTIME_ART } from '@/lib/cardArtManifest';
import { buildCivilizationDeploymentSites } from '@/lib/civilizationDeploymentSites';
import { buildCivilizationProfile } from '@/lib/civilizationProfile';
import { useBoardLayoutPolicy } from '@/pages/game-layout';
import {
  getDominantAffinityPalette,
  getKardashevTier,
} from '@/lib/kardashev';

const PLAYER_ID = 'blueprint-lab-player';
const ANTIMATTER_ID = 'bp_antimatter_detonator' as const;
const FOUNDRY_ID = 'bp_mantle_to_orbit_foundry' as const;
const ASCENSION_ID = 'bp_ascension_registry' as const;
const WORLDSHIELD_ID = 'bp_worldshield_covenant' as const;
const LAB_BLUEPRINT_IDS = [
  ANTIMATTER_ID,
  FOUNDRY_ID,
  ASCENSION_ID,
  WORLDSHIELD_ID,
] as const satisfies readonly BlueprintId[];
const DEFAULT_BLUEPRINT_IDS = [ANTIMATTER_ID, FOUNDRY_ID] as const;
const BASE_EMINENCE = 7;
const CHRYSALIS_FOUNDATION_ARTIFACT_IDS = [
  't1r01',
  't1r02',
  't1r03',
  't1r04',
  't1r05',
  't1r06',
  't1r07',
  't1r08',
  't1o01',
  't1o02',
  't1o03',
  't1o04',
  't1o05',
  't1o06',
  't1o07',
  't1o08',
] as const satisfies readonly ArtifactId[];

const AUTHORED_LORE: CardLoreCatalog = {
  t1r01: {
    name: 'Ignition Kernel',
    flavor: '',
    artifactForm: 'Power Component / Control Instrument',
    practicalCapability: 'bounded ignition and thermal regulation',
    civLane: 'controlled reaction infrastructure',
    engineeringScale: 'Planetary',
    depictionScale: 'room',
  },
  t1p04: {
    name: 'Magnetic Bottle',
    flavor: '',
    artifactForm: 'Containment / Power Component',
    practicalCapability: 'plasma and field containment',
    civLane: 'containment infrastructure',
    engineeringScale: 'Planetary',
    depictionScale: 'room',
  },
  t1r04: {
    name: 'Causal Spark Coil',
    flavor: '',
    artifactForm: 'Control Instrument / Protocol Object',
    practicalCapability: 'consequence-gated ignition',
    civLane: 'governed trigger infrastructure',
    engineeringScale: 'Planetary',
    depictionScale: 'room',
  },
  t2o01: {
    name: 'Horizon Extractor',
    flavor: '',
    artifactForm: 'Sensor / Containment',
    practicalCapability: 'sampling dangerous physical boundaries',
    civLane: 'horizon engineering',
    engineeringScale: 'Star-system',
    depictionScale: 'stellar',
  },
  t1r07: {
    name: 'Entropy Pyre Baffle',
    flavor: '',
    artifactForm: 'Thermal Component / Shielding',
    practicalCapability: 'routes mantle heat into useful work',
    civLane: 'mantle-to-orbit industry',
    engineeringScale: 'Planetary',
    depictionScale: 'room',
  },
  t1s02: {
    name: 'Mantlelift Driver Coil',
    flavor: '',
    artifactForm: 'Transit Component / Power Component',
    practicalCapability: 'planetary-to-orbit mass acceleration',
    civLane: 'orbital logistics',
    engineeringScale: 'Planetary',
    depictionScale: 'room',
  },
  t1o05: {
    name: 'Blackglass Forge Die',
    flavor: '',
    artifactForm: 'Fabrication Component / Material Tool',
    practicalCapability: 'precision fabrication in vacuum',
    civLane: 'orbital manufacturing',
    engineeringScale: 'Planetary',
    depictionScale: 'room',
  },
};

const LORE: CardLoreCatalog = Object.values(BLUEPRINT_DEFINITIONS).reduce<CardLoreCatalog>(
  (catalog, definition) => {
    for (const component of definition.components) {
      catalog[component.artifactId] ??= {
        name: CARD_NAME_FALLBACK[component.artifactId] ?? component.artifactId,
        flavor: '',
        artifactForm: component.stage,
        practicalCapability: component.function,
        civLane: definition.civilization.laneLabel,
        engineeringScale: definition.civilization.scaleBand === 'stellar' ? 'Star-system' : 'Planetary',
        depictionScale: 'room',
      };
    }
    return catalog;
  },
  { ...AUTHORED_LORE },
);

interface LabProjectState {
  blueprintId: BlueprintId;
  matchedComponentIds: string[];
  manifested: boolean;
  deviceState: BlueprintDeviceState;
  foundryUsesRemaining: number;
  foundryStoredCount: number;
  ascensionDeferrals: number;
  operationEminence: number;
}

interface LabPresentationState {
  kind: 'manifestation' | 'detonation';
  blueprintId: BlueprintId;
  serial: number;
  detonation?: BlueprintDetonationEvent;
}

interface LabLegacyCriteriaState {
  galacticIdentity: boolean;
  continuity: boolean;
  definingTrial: boolean;
}

const DEFAULT_LEGACY_CRITERIA: LabLegacyCriteriaState = {
  galacticIdentity: false,
  continuity: true,
  definingTrial: false,
};

function isBlueprintId(value: string | null): value is BlueprintId {
  return value !== null && LAB_BLUEPRINT_IDS.includes(value as BlueprintId);
}

function createLabProject(
  blueprintId: BlueprintId,
  matchedCount = 0,
  manifested = false,
): LabProjectState {
  const definition = BLUEPRINT_DEFINITIONS[blueprintId];
  const normalizedMatchedCount = manifested
    ? definition.components.length
    : Math.max(0, Math.min(definition.components.length, Math.floor(matchedCount)));
  return {
    blueprintId,
    matchedComponentIds: definition.components
      .slice(0, normalizedMatchedCount)
      .map((component) => component.artifactId),
    manifested,
    deviceState: definition.initialDeviceState,
    foundryUsesRemaining: blueprintId === FOUNDRY_ID ? 2 : 0,
    foundryStoredCount: 0,
    ascensionDeferrals: 0,
    operationEminence: 0,
  };
}

function readNumericParam(params: URLSearchParams, key: string, fallback: number): number {
  const value = Number(params.get(key));
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function readLabLegacyCriteria(): LabLegacyCriteriaState {
  const params = new URLSearchParams(window.location.search);
  return {
    galacticIdentity: params.get('galaxy') === '1',
    continuity: params.get('continuity') !== '0',
    definingTrial: params.get('trial') === '1',
  };
}

function readLabProjects(): [LabProjectState, LabProjectState] {
  const params = new URLSearchParams(window.location.search);
  const legacyAssembly = readNumericParam(params, 'assembly', 0);
  const legacyComplete = params.get('legacy') === '2';
  const requestedFirst = params.get('slot0');
  const requestedSecond = params.get('slot1');
  const firstId = isBlueprintId(requestedFirst) ? requestedFirst : DEFAULT_BLUEPRINT_IDS[0];
  const secondCandidate = isBlueprintId(requestedSecond) ? requestedSecond : DEFAULT_BLUEPRINT_IDS[1];
  const secondId = secondCandidate === firstId
    ? LAB_BLUEPRINT_IDS.find((blueprintId) => blueprintId !== firstId) ?? DEFAULT_BLUEPRINT_IDS[1]
    : secondCandidate;
  const manifestedSlots = new Set(
    (params.get('manifested') ?? '')
      .split(',')
      .map((value) => Number(value))
      .filter((value) => value === 0 || value === 1),
  );
  const hasNewFixtureState = params.has('match0') || params.has('match1') || params.has('manifested');
  const firstCount = readNumericParam(params, 'match0', firstId === ANTIMATTER_ID ? legacyAssembly : 0);
  const secondCount = readNumericParam(
    params,
    'match1',
    legacyComplete && secondId === FOUNDRY_ID ? BLUEPRINT_DEFINITIONS[secondId].components.length : 0,
  );
  const firstManifested = hasNewFixtureState
    ? manifestedSlots.has(0)
    : firstId === ANTIMATTER_ID && legacyAssembly >= BLUEPRINT_DEFINITIONS[firstId].components.length;
  const secondManifested = hasNewFixtureState
    ? manifestedSlots.has(1)
    : legacyComplete && secondId === FOUNDRY_ID;
  const projects: [LabProjectState, LabProjectState] = [
    createLabProject(firstId, firstCount, firstManifested),
    createLabProject(secondId, secondCount, secondManifested),
  ];

  projects.forEach((project, slotIndex) => {
    const requestedState = params.get(`state${slotIndex}`);
    if (
      requestedState === 'armed' ||
      requestedState === 'ready' ||
      requestedState === 'recovering' ||
      requestedState === 'vigilant' ||
      requestedState === 'spent'
    ) {
      project.deviceState = requestedState;
    }
    project.foundryUsesRemaining = Math.min(
      2,
      readNumericParam(params, `uses${slotIndex}`, project.foundryUsesRemaining),
    );
    project.foundryStoredCount = Math.min(
      BLUEPRINT_DEFINITIONS[project.blueprintId].components.length,
      readNumericParam(params, `stored${slotIndex}`, 0),
    );
    project.ascensionDeferrals = Math.min(
      2,
      readNumericParam(params, `deferrals${slotIndex}`, 0),
    );
    project.operationEminence = readNumericParam(params, `reward${slotIndex}`, 0);
  });
  return projects;
}

function writeLabQuery(
  projects: readonly LabProjectState[],
  brokenCovenant: boolean,
  legacyCriteria: LabLegacyCriteriaState,
) {
  const url = new URL(window.location.href);
  url.searchParams.delete('assembly');
  url.searchParams.delete('legacy');
  projects.forEach((project, slotIndex) => {
    url.searchParams.set(`slot${slotIndex}`, project.blueprintId);
    url.searchParams.set(`match${slotIndex}`, String(project.matchedComponentIds.length));
    url.searchParams.set(`state${slotIndex}`, project.deviceState);
    url.searchParams.set(`uses${slotIndex}`, String(project.foundryUsesRemaining));
    url.searchParams.set(`stored${slotIndex}`, String(project.foundryStoredCount));
    url.searchParams.set(`deferrals${slotIndex}`, String(project.ascensionDeferrals));
    url.searchParams.set(`reward${slotIndex}`, String(project.operationEminence));
  });
  const manifested = projects.flatMap((project, index) => project.manifested ? [index] : []);
  if (manifested.length > 0) url.searchParams.set('manifested', manifested.join(','));
  else url.searchParams.delete('manifested');
  if (brokenCovenant) url.searchParams.set('covenant', 'broken');
  else url.searchParams.delete('covenant');
  if (legacyCriteria.galacticIdentity) url.searchParams.set('galaxy', '1');
  else url.searchParams.delete('galaxy');
  if (legacyCriteria.continuity) url.searchParams.delete('continuity');
  else url.searchParams.set('continuity', '0');
  if (legacyCriteria.definingTrial) url.searchParams.set('trial', '1');
  else url.searchParams.delete('trial');
  window.history.replaceState(null, '', url);
}

function emptyAffinities(): AffinityCounts {
  return {
    flare: 0,
    continuum: 0,
    verdance: 0,
    abyss: 0,
    radiance: 0,
    singularity: 0,
  };
}

function artifactCard(id: string): ArtifactCard {
  const definition = ARTIFACT_DEFINITION_BY_ID[id as ArtifactId];
  if (!definition) throw new Error(`Unknown Blueprint component: ${id}`);
  return {
    ...definition,
    name: CARD_NAME_FALLBACK[id] ?? id,
    flavor: LORE[id]?.flavor ?? '',
  } as ArtifactCard;
}

function clonedDefinition(id: BlueprintId): BlueprintDefinition {
  const source = BLUEPRINT_DEFINITIONS[id];
  return {
    id: source.id,
    name: source.name,
    family: source.family,
    components: source.components.map((component) => ({
      artifactId: component.artifactId,
      stage: component.stage,
      function: component.function,
    })),
    publicEffect: source.publicEffect,
    initialDeviceState: source.initialDeviceState,
    competitiveApproved: source.competitiveApproved,
    presentation: {
      serialCode: source.presentation.serialCode,
      scaleLabel: source.presentation.scaleLabel,
      canonicalVariant: source.presentation.canonicalVariant,
      manifestationTreatment: source.presentation.manifestationTreatment,
      detonationTreatment: source.presentation.detonationTreatment,
    },
    civilization: {
      projectForm: source.civilization.projectForm,
      scaleBand: source.civilization.scaleBand,
      manifestationScale: source.civilization.manifestationScale,
      manifestationMotion: source.civilization.manifestationMotion,
      affinity: source.civilization.affinity,
      siteTitle: source.civilization.siteTitle,
      visibleAs: source.civilization.visibleAs,
      siteSummary: source.civilization.siteSummary,
      laneLabel: source.civilization.laneLabel,
      manifestation: source.civilization.manifestation,
      triggerWindows: [...source.civilization.triggerWindows],
      resolutionForm: source.civilization.resolutionForm,
      pressureTags: [...source.civilization.pressureTags],
      providedCapabilityIds: [...source.civilization.providedCapabilityIds],
      interactingCapabilityIds: [...source.civilization.interactingCapabilityIds],
      consequencePolicyStatus: source.civilization.consequencePolicyStatus,
    },
  };
}

const PUBLIC_BLUEPRINT_DEFINITIONS = Object.fromEntries(
  LAB_BLUEPRINT_IDS.map((blueprintId) => [blueprintId, clonedDefinition(blueprintId)]),
) as Record<BlueprintId, BlueprintDefinition>;

function manifestationEminence(blueprintId: BlueprintId): number {
  return blueprintId === FOUNDRY_ID || blueprintId === WORLDSHIELD_ID ? 1 : 0;
}

function availableDeviceStates(blueprintId: BlueprintId): BlueprintDeviceState[] {
  if (blueprintId === ANTIMATTER_ID) return ['armed', 'spent'];
  if (blueprintId === FOUNDRY_ID) return ['ready', 'recovering', 'spent'];
  if (blueprintId === ASCENSION_ID) return ['ready', 'spent'];
  return ['vigilant', 'spent'];
}

function buildCivilization(
  artifacts: readonly ArtifactCard[],
  devices: readonly ManifestedDevicePublicState[],
  legacyCriteria: LabLegacyCriteriaState,
): CivilizationPublicState {
  const lifecycleArtifacts = Object.fromEntries(artifacts.map((artifact, index) => [
    artifact.id,
    {
      artifactId: artifact.id,
      firstMasteredTurnCount: index + 1,
      masteryCount: 1,
      implementationState: 'operational',
      implementationStateChangedTurnCount: null,
      implementationChangeSource: null,
      historyEvidence: 'recorded',
    } satisfies CivilizationArtifactLifecycleState,
  ]));
  const environmentIdentity = createCivilizationEnvironmentIdentity(
    'civilization-tab-lab',
    'aurora_basin',
  );
  const assignmentState = createInitialCivilizationState(environmentIdentity);
  assignmentState.artifacts = lifecycleArtifacts;
  if (legacyCriteria.galacticIdentity) {
    assignmentState.scale.historicalMaturity = 'galactic';
    assignmentState.scale.currentReach = 'galactic';
    assignmentState.identityScales.galaxy = {
      ...assignmentState.identityScales.galaxy,
      status: 'forming',
      eraStartedTurnCount: 7,
      evidence: [
        {
          evidenceId: 'lab:legacy:galaxy:flare',
          artifactId: 't1r01',
          masteryOrdinal: 1,
          affinity: 'flare',
          routedTurnCount: 7,
          historyEvidence: 'recorded',
        },
        {
          evidenceId: 'lab:legacy:galaxy:abyss',
          artifactId: 't1o01',
          masteryOrdinal: 1,
          affinity: 'abyss',
          routedTurnCount: 8,
          historyEvidence: 'recorded',
        },
      ],
    };
  }
  if (legacyCriteria.definingTrial) {
    assignmentState.events.push({
      eventId: 'event:lab:defining-trial',
      source: { sourceType: 'scenario', sourceId: 'event_stellar_containment_cascade' },
      turnCount: 9,
      form: 'automatic',
      pressureTags: ['disruption'],
      selectedTrajectoryId: 'containment_response',
      outcome: 'success',
      summary: 'The Stellar Containment Cascade was resolved.',
      history: { response: 'containment_response' },
      outcomeSignals: [],
      adversity: null,
      historyEvidence: 'recorded',
    });
  }
  devices.forEach((device) => {
    const projectId = civilizationProjectId(device.blueprintId, device.slotIndex);
    assignmentState.projects[projectId] = {
      projectId,
      blueprintId: device.blueprintId,
      slotIndex: device.slotIndex,
      status: 'manifested',
      matchedComponentIds: BLUEPRINT_DEFINITIONS[device.blueprintId].components.map(
        (component) => component.artifactId,
      ),
      deviceState: device.state,
      presentationVariant: device.presentationVariant,
      manifestedTurnCount: 9,
      stateChangedTurnCount: 9,
      historyEvidence: 'recorded',
    };
  });
  let reconciledAssignmentState = reconcileCivilizationDerivedState(assignmentState, devices, 9);
  reconciledAssignmentState = {
    ...reconciledAssignmentState,
    stability: {
      ...reconciledAssignmentState.stability,
      band: legacyCriteria.continuity ? 'stable' : 'unstable',
      score: legacyCriteria.continuity ? 84 : 31,
    },
  };
  if (getCivilizationLegacyProgress(
    reconciledAssignmentState,
    LEGACY_BLUEPRINT_REQUIREMENT,
  ).achieved) {
    reconciledAssignmentState.legacy = {
      completedTurnCount: 9,
      historyEvidence: 'recorded',
    };
    reconciledAssignmentState = reconcileCivilizationDerivedState(
      reconciledAssignmentState,
      devices,
      9,
    );
  }
  const manifestationAssignments = Object.values(
    reconcileCivilizationManifestationAssignments(reconciledAssignmentState, 9),
  );

  return {
    version: CIVILIZATION_STATE_VERSION,
    environmentIdentity,
    artifacts: artifacts.map((artifact, index) => ({
      artifactId: artifact.id,
      firstMasteredTurnCount: index + 1,
      masteryCount: 1,
      implementationState: 'operational',
      implementationStateChangedTurnCount: null,
      changeSourceType: 'artifact',
      historyEvidence: 'recorded',
    })),
    affinityIdentity: reconciledAssignmentState.affinityIdentity,
    districtIdentity: reconciledAssignmentState.districtIdentity,
    identityScales: reconciledAssignmentState.identityScales,
    scale: {
      historicalMaturity: reconciledAssignmentState.scale.historicalMaturity,
      currentReach: reconciledAssignmentState.scale.currentReach,
      currentReachCondition: reconciledAssignmentState.scale.currentReachCondition,
      literalKardashevType: reconciledAssignmentState.scale.literalKardashevType,
      literalKardashevEvidence: reconciledAssignmentState.scale.literalKardashevEvidence,
    },
    stability: {
      band: legacyCriteria.continuity ? 'stable' : 'unstable',
      score: legacyCriteria.continuity ? 84 : 31,
      calibrationId: reconciledAssignmentState.stability.calibrationId,
      contributors: reconciledAssignmentState.stability.contributors.map((contributor) => ({
        direction: contributor.direction,
        magnitude: contributor.magnitude,
        label: contributor.label,
        sourceType: contributor.source.sourceType,
        targetKind: contributor.target?.kind ?? null,
        appliedTurnCount: contributor.appliedTurnCount,
        resolvedTurnCount: contributor.resolvedTurnCount,
        historyEvidence: contributor.historyEvidence,
      })),
      calculatedTurnCount: reconciledAssignmentState.stability.calculatedTurnCount,
      historyEvidence: reconciledAssignmentState.stability.historyEvidence,
    },
    activeConditions: [],
    projects: devices.map((device) => ({
      projectId: `project:${device.slotIndex}:${device.blueprintId}`,
      blueprintId: device.blueprintId,
      slotIndex: device.slotIndex,
      status: 'manifested',
      deviceState: device.state,
      presentationVariant: device.presentationVariant,
      manifestedTurnCount: 9,
      stateChangedTurnCount: 9,
      activeCapabilityIds: device.state === 'spent' || device.state === 'recovering'
        ? []
        : [...(BLUEPRINT_DEFINITIONS[device.blueprintId]?.civilization.providedCapabilityIds ?? [])],
      historyEvidence: 'recorded',
    })),
    activeCapabilityIds: devices.flatMap((device) => (
      BLUEPRINT_DEFINITIONS[device.blueprintId]?.civilization.providedCapabilityIds ?? []
    )),
    manifestationAssignments,
    events: [
      ...devices.map((device, index): CivilizationPublicEventHistoryEntry => ({
        eventId: `blueprint-lab-event-${index}`,
        turnCount: 8 + index,
        sourceType: 'blueprint' as const,
        form: 'automatic' as const,
        pressureTags: device.blueprintId === ANTIMATTER_ID
          ? ['disruption', 'attrition']
          : ['transformation'],
        outcome: 'success' as const,
        summary: `${device.definition?.name ?? 'Blueprint project'} manifested.`,
        historyEvidence: 'recorded' as const,
      })),
      ...reconciledAssignmentState.events.map((event): CivilizationPublicEventHistoryEntry => ({
        eventId: event.eventId,
        turnCount: event.turnCount,
        sourceType: event.source.sourceType,
        form: event.form,
        pressureTags: event.pressureTags,
        outcome: event.outcome,
        summary: event.summary,
        historyEvidence: event.historyEvidence,
      })),
    ],
    legacy: reconciledAssignmentState.legacy,
  };
}

function opponentPlayer(): GamePlayerState {
  return {
    playerId: 'blueprint-lab-opponent',
    playerName: 'Thalia',
    avatarId: 'avatar_verdance',
    isAi: true,
    aiDifficulty: null,
    affinities: emptyAffinities(),
    bonuses: emptyAffinities(),
    eminence: 8,
    reservedArtifacts: [],
    forgedArtifactIds: [],
    discountedForgeIds: [],
    forgedArtifacts: [],
    isConnected: true,
    claimedLuminaryIds: [],
    plannedAction: null,
    plannedActionCancelReason: null,
    civName: 'Verdant Conclave',
  };
}

function civilizationEventPreview(serial: number): CivilizationEventInstance {
  return {
    eventId: `event_stellar_containment_cascade:dev:${serial}`,
    definitionId: 'event_stellar_containment_cascade',
    triggerWindow: 'first_contact',
    triggerTurnCount: 9,
    phase: 'receipt',
    affectedPlayerIds: [PLAYER_ID, 'blueprint-lab-opponent'],
    outcomesByPlayerId: {
      [PLAYER_ID]: {
        playerId: PLAYER_ID,
        outcomeId: 'protected',
        capabilityCoverage: 'strong',
        respondingCapabilityIds: ['artifact:failure_isolation'],
        respondingManifestations: [{
          sourceType: 'artifact',
          sourceId: 't2r05',
          capabilityIds: ['artifact:failure_isolation'],
        }],
        appliedConditionType: null,
        stabilityPressure: 0,
        summary: 'Operational containment prevented the Disruption.',
      },
      'blueprint-lab-opponent': {
        playerId: 'blueprint-lab-opponent',
        outcomeId: 'exposed',
        capabilityCoverage: 'none',
        respondingCapabilityIds: [],
        respondingManifestations: [],
        appliedConditionType: 'disrupted',
        stabilityPressure: 10,
        summary: 'The cascade Disrupted the homeworld.',
      },
    },
    createdAt: serial,
  };
}

export default function DevCivilizationTab() {
  const boardLayoutPolicy = useBoardLayoutPolicy();
  const [saturatedPopulation] = useState(() => (
    new URLSearchParams(window.location.search).get('population') === 'saturated'
  ));
  const [projects, setProjects] = useState<[LabProjectState, LabProjectState]>(readLabProjects);
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const [brokenCovenant, setBrokenCovenant] = useState(
    () => new URLSearchParams(window.location.search).get('covenant') === 'broken',
  );
  const [legacyCriteria, setLegacyCriteria] = useState<LabLegacyCriteriaState>(
    readLabLegacyCriteria,
  );
  const [presentation, setPresentation] = useState<LabPresentationState | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const openedFromLegacyFixture = params.has('assembly') && projects[0].manifested;
    return openedFromLegacyFixture
      ? { kind: 'manifestation', blueprintId: projects[0].blueprintId, serial: 0 }
      : null;
  });
  const presentationSerial = useRef(0);
  const [civilizationEventPresentation, setCivilizationEventPresentation] = useState<CivilizationEventInstance | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('event') === '1' ? civilizationEventPreview(0) : null;
  });
  const [recentSiteIds, setRecentSiteIds] = useState<string[]>([]);
  const [lastLabEvent, setLastLabEvent] = useState('Ready to test Blueprint assembly.');
  const [devControlsOpen, setDevControlsOpen] = useState(() => (
    new URLSearchParams(window.location.search).get('lab') === 'open'
  ));
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactCard | null>(null);
  const [civLabel, setCivLabel] = useState('The Chrysalis Compact');
  const [civEditValue, setCivEditValue] = useState('The Chrysalis Compact');
  const [isEditingCivName, setIsEditingCivName] = useState(false);
  const [forgedView, setForgedView] = useState<'cards' | 'timeline'>('cards');
  const [showForgedArtifacts, setShowForgedArtifacts] = useState(false);
  const [showActiveLuminaries, setShowActiveLuminaries] = useState(false);
  const [expandedLumEffects, setExpandedLumEffects] = useState<Set<string>>(new Set());
  const [selectedAffinities, setSelectedAffinities] = useState({});
  const [returnSelections, setReturnSelections] = useState({});
  const [harnessPulseKey, setHarnessPulseKey] = useState(0);
  const playerPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    writeLabQuery(projects, brokenCovenant, legacyCriteria);
  }, [brokenCovenant, legacyCriteria, projects]);

  const fixture = useMemo(() => {
    const foundryStoredIds = new Set(projects.flatMap((project) => (
      project.blueprintId === FOUNDRY_ID && project.foundryStoredCount > 0
        ? BLUEPRINT_DEFINITIONS[project.blueprintId].components
          .slice(0, project.foundryStoredCount)
          .map((component) => component.artifactId)
        : []
    )));
    const matchedArtifactIds = [...new Set(projects.flatMap((project) => project.matchedComponentIds))];
    const forgedArtifactIds = [...new Set([
      ...(saturatedPopulation
        ? (Object.keys(ARTIFACT_DEFINITION_BY_ID) as ArtifactId[]).filter(id => (
            ARTIFACT_MANIFESTATION_PROFILE_BY_ID[id].nativeCameraScale === 'surface'
          ))
        : CHRYSALIS_FOUNDATION_ARTIFACT_IDS),
      ...matchedArtifactIds,
    ])];
    const forgedArtifacts = forgedArtifactIds
      .filter((artifactId) => !foundryStoredIds.has(artifactId))
      .map(artifactCard);
    const reservedArtifacts = [...foundryStoredIds].map(artifactCard);
    const devices: ManifestedDevicePublicState[] = projects.flatMap((project, slotIndex) => (
      project.manifested
        ? [{
            blueprintId: project.blueprintId,
            ownerPlayerId: PLAYER_ID,
            slotIndex,
            state: project.deviceState,
            presentationVariant: 'armored' as const,
            definition: PUBLIC_BLUEPRINT_DEFINITIONS[project.blueprintId],
            ...(project.blueprintId === FOUNDRY_ID
              ? { foundryUsesRemaining: project.foundryUsesRemaining }
              : {}),
            ...(project.blueprintId === ASCENSION_ID
              ? { ascensionDeferrals: project.ascensionDeferrals }
              : {}),
          }]
        : []
    ));

    const bonuses = forgedArtifacts.reduce((counts, artifact) => {
      counts[artifact.bonusAffinity] += 1;
      return counts;
    }, emptyAffinities());
    const civilization = buildCivilization(forgedArtifacts, devices, legacyCriteria);
    const eminence = BASE_EMINENCE + projects.reduce((total, project) => (
      total + (project.manifested ? manifestationEminence(project.blueprintId) : 0) + project.operationEminence
    ), 0);
    const legacyProgress = getCivilizationLegacyProgress(
      civilization,
      LEGACY_BLUEPRINT_REQUIREMENT,
    );
    const localPlayer: GamePlayerState = {
      playerId: PLAYER_ID,
      playerName: 'Architect',
      avatarId: 'avatar_abyss',
      isAi: false,
      aiDifficulty: null,
      affinities: { ...emptyAffinities(), abyss: 2, continuum: 1 },
      bonuses,
      eminence,
      reservedArtifacts,
      forgedArtifactIds: forgedArtifacts.map((artifact) => artifact.id),
      discountedForgeIds: [],
      forgedArtifacts,
      civilization,
      isConnected: true,
      claimedLuminaryIds: [],
      plannedAction: null,
      plannedActionCancelReason: null,
      civName: civLabel,
      blueprintPrivateStates: projects.map((project, slotIndex) => ({
        blueprintId: project.blueprintId,
        slotIndex,
        matchedComponentIds: project.matchedComponentIds,
        manifested: project.manifested,
        definition: PUBLIC_BLUEPRINT_DEFINITIONS[project.blueprintId],
        ...(project.blueprintId === FOUNDRY_ID && project.foundryStoredCount > 0
          ? {
              foundryStoredArtifactIds: BLUEPRINT_DEFINITIONS[project.blueprintId].components
                .slice(0, project.foundryStoredCount)
                .map((component) => component.artifactId),
            }
          : {}),
      })),
      manifestedBlueprintDevices: devices,
    };
    const opponent = opponentPlayer();
    const state: GameState = {
      roomId: 'dev-civilization-tab',
      status: 'playing',
      scenarioId: null,
      finishReason: null,
      lumiiThresholdApproach: null,
      traceScenario: null,
      recurrenceScenario: null,
      triangulationScenario: null,
      startedAt: 1,
      openingTurnOrder: null,
      canReplaySameBoard: false,
      currentPlayerIndex: 0,
      roundNumber: 4,
      turnCount: 9,
      victoryRequirement: DEFAULT_VICTORY_REQUIREMENT,
      legacyVictoryRequirement: LEGACY_BLUEPRINT_REQUIREMENT,
      cinematicMode: 'standard',
      affinityWell: {
        flare: 4,
        continuum: 3,
        verdance: 4,
        abyss: 2,
        radiance: 4,
        singularity: 4,
      },
      forgeTier1: [],
      forgeTier2: [],
      forgeTier3: [],
      deckCounts: { tier1: 22, tier2: 18, tier3: 12 },
      luminaries: [],
      luminaryAffinities: [],
      players: [localPlayer, opponent],
      winnerId: null,
      legacyWinnerId: legacyProgress.achieved ? PLAYER_ID : null,
      winTriggerLuminaryId: null,
      lastAction: null,
      actionLog: [],
      turnTimerSeconds: null,
      turnDeadline: null,
      version: projects.reduce((version, project) => (
        version + project.matchedComponentIds.length + Number(project.manifested) * 10 + project.operationEminence
      ), 0),
      pendingSummonEvents: [],
      pendingLuminaryActivationEvents: [],
      pendingBlueprintManifestationEvents: [],
      pendingBlueprintDetonationEvents: [],
      pendingCivilizationEventCards: [],
      civilizationEventDeck: {
        definitionIds: ['event_stellar_containment_cascade'],
        nextIndex: 0,
        firedWindows: [],
        completedEventIds: [],
      },
      scenarioProtocols: [],
      pendingScenarioProtocolEvents: [],
      pendingTurnTransition: null,
    };
    const tier = getKardashevTier(forgedArtifacts);
    const profile = buildCivilizationProfile(forgedArtifacts);
    const palette = getDominantAffinityPalette(forgedArtifacts);
    const deploymentSites = buildCivilizationDeploymentSites({
      forgedArtifacts,
      loreCatalog: LORE,
      tier,
      ownerPlayerId: PLAYER_ID,
      turnCount: state.turnCount,
      manifestedBlueprintDevices: devices,
      civilizationArtifacts: civilization.artifacts,
      manifestationAssignments: civilization.manifestationAssignments,
      activeCapabilityIds: civilization.activeCapabilityIds,
    });

    return {
      deploymentSites,
      forgedArtifacts,
      localPlayer,
      palette,
      profile,
      state,
      tier,
    };
  }, [civLabel, legacyCriteria, projects, saturatedPopulation]);

  const presentationActive = presentation !== null || civilizationEventPresentation !== null;
  const activeProject = projects[activeSlot];
  const activeDefinition = BLUEPRINT_DEFINITIONS[activeProject.blueprintId];
  const missingComponents = activeDefinition.components.filter(
    (component) => !activeProject.matchedComponentIds.includes(component.artifactId),
  );
  const legacyProgress = getCivilizationLegacyProgress(
    fixture.localPlayer.civilization,
    LEGACY_BLUEPRINT_REQUIREMENT,
  );

  const manifestationEvent: BlueprintManifestationEvent | null = presentation?.kind === 'manifestation'
    ? {
        eventId: `dev-${presentation.blueprintId}-manifestation-${presentation.serial}`,
        blueprintId: presentation.blueprintId,
        ownerPlayerId: PLAYER_ID,
        slotIndex: projects.findIndex((project) => project.blueprintId === presentation.blueprintId),
        presentationVariant: 'armored',
        definition: PUBLIC_BLUEPRINT_DEFINITIONS[presentation.blueprintId],
        createdAt: presentation.serial,
      }
    : null;

  const updateProject = (
    slotIndex: 0 | 1,
    updater: (project: LabProjectState) => LabProjectState,
  ) => {
    setProjects((current) => {
      const next = [...current] as [LabProjectState, LabProjectState];
      next[slotIndex] = updater(current[slotIndex]);
      return next;
    });
  };

  const beginManifestation = (slotIndex: 0 | 1) => {
    const project = projects[slotIndex];
    const definition = BLUEPRINT_DEFINITIONS[project.blueprintId];
    presentationSerial.current += 1;
    setRecentSiteIds([]);
    updateProject(slotIndex, (current) => ({
      ...current,
      matchedComponentIds: definition.components.map((component) => component.artifactId),
      manifested: true,
      deviceState: definition.initialDeviceState,
      foundryUsesRemaining: current.blueprintId === FOUNDRY_ID ? 2 : 0,
      foundryStoredCount: 0,
      ascensionDeferrals: 0,
      operationEminence: 0,
    }));
    setLastLabEvent(`${definition.name} completed its recipe and entered manifestation.`);
    setPresentation({
      kind: 'manifestation',
      blueprintId: project.blueprintId,
      serial: presentationSerial.current,
    });
  };

  const forgeComponent = (artifactId: string) => {
    if (activeProject.manifested || presentationActive) return;
    const nextMatched = activeProject.matchedComponentIds.includes(artifactId)
      ? activeProject.matchedComponentIds.filter((candidate) => candidate !== artifactId)
      : [...activeProject.matchedComponentIds, artifactId];
    const recipeComplete = activeDefinition.components.every((component) => (
      nextMatched.includes(component.artifactId)
    ));
    if (recipeComplete) {
      updateProject(activeSlot, (current) => ({ ...current, matchedComponentIds: nextMatched }));
      window.setTimeout(() => beginManifestation(activeSlot), 0);
      return;
    }
    updateProject(activeSlot, (current) => ({ ...current, matchedComponentIds: nextMatched }));
    setLastLabEvent(
      `${LORE[artifactId]?.name ?? artifactId} ${nextMatched.includes(artifactId) ? 'matched' : 'removed'} in Slot ${activeSlot + 1}.`,
    );
  };

  const forgeNextComponent = () => {
    const nextComponent = missingComponents[0];
    if (nextComponent) forgeComponent(nextComponent.artifactId);
  };

  const completeRecipe = () => {
    if (activeProject.manifested || presentationActive) return;
    beginManifestation(activeSlot);
  };

  const resetProject = (slotIndex: 0 | 1) => {
    const blueprintId = projects[slotIndex].blueprintId;
    updateProject(slotIndex, () => createLabProject(blueprintId));
    setPresentation(null);
    setRecentSiteIds((current) => current.filter((siteId) => siteId !== `blueprint:${blueprintId}`));
    setSelectedArtifact(null);
    setLastLabEvent(`${BLUEPRINT_DEFINITIONS[blueprintId].name} returned to an empty assembly state.`);
  };

  const resetLab = () => {
    setProjects([
      createLabProject(DEFAULT_BLUEPRINT_IDS[0]),
      createLabProject(DEFAULT_BLUEPRINT_IDS[1]),
    ]);
    setActiveSlot(0);
    setBrokenCovenant(false);
    setLegacyCriteria(DEFAULT_LEGACY_CRITERIA);
    setPresentation(null);
    setCivilizationEventPresentation(null);
    setRecentSiteIds([]);
    setSelectedArtifact(null);
    setLastLabEvent('Lab reset to the default Antimatter and Foundry loadout.');
  };

  const selectBlueprint = (blueprintId: BlueprintId) => {
    if (projects.some((project, slotIndex) => slotIndex !== activeSlot && project.blueprintId === blueprintId)) return;
    updateProject(activeSlot, () => createLabProject(blueprintId));
    setPresentation(null);
    setRecentSiteIds([]);
    setLastLabEvent(`${BLUEPRINT_DEFINITIONS[blueprintId].name} loaded into Slot ${activeSlot + 1}.`);
  };

  const replayManifestation = () => {
    if (!activeProject.manifested || presentationActive) return;
    presentationSerial.current += 1;
    setPresentation({
      kind: 'manifestation',
      blueprintId: activeProject.blueprintId,
      serial: presentationSerial.current,
    });
  };

  const setDeviceState = (deviceState: BlueprintDeviceState) => {
    updateProject(activeSlot, (current) => ({
      ...current,
      deviceState,
      foundryStoredCount: current.blueprintId !== FOUNDRY_ID
        ? current.foundryStoredCount
        : deviceState === 'ready'
          ? 0
          : Math.max(1, current.foundryStoredCount || activeDefinition.components.length),
    }));
    setLastLabEvent(`${activeDefinition.name} staged as ${deviceState}.`);
  };

  const operateActiveProject = () => {
    if (!activeProject.manifested || presentationActive) return;
    if (activeProject.blueprintId === ANTIMATTER_ID && activeProject.deviceState === 'armed') {
      const target = artifactCard('t2p01');
      presentationSerial.current += 1;
      const detonation: BlueprintDetonationEvent = {
        eventId: `dev-antimatter-detonation-${presentationSerial.current}`,
        blueprintId: ANTIMATTER_ID,
        ownerPlayerId: PLAYER_ID,
        triggeringPlayerId: 'blueprint-lab-opponent',
        targetCardId: target.id,
        trigger: 'forged',
        targetArtifact: {
          id: target.id,
          name: target.name,
          tier: target.tier as 1 | 2 | 3,
          bonusAffinity: target.bonusAffinity,
          eminence: target.eminence,
          cost: target.cost,
          flavor: target.flavor,
        },
        collateralCardIds: [],
        collateralArtifacts: [],
        presentationVariant: 'armored',
        createdAt: presentationSerial.current,
      };
      updateProject(activeSlot, (current) => ({
        ...current,
        deviceState: 'spent',
        operationEminence: current.operationEminence + 2,
      }));
      setPresentation({
        kind: 'detonation',
        blueprintId: ANTIMATTER_ID,
        serial: presentationSerial.current,
        detonation,
      });
      setLastLabEvent('The marked Tier II claim was Annihilated. Antimatter Detonator became Spent; 2 Eminence awarded.');
      return;
    }
    if (activeProject.blueprintId === FOUNDRY_ID) {
      if (activeProject.deviceState === 'recovering') {
        const remaining = Math.max(0, activeProject.foundryStoredCount - 1);
        updateProject(activeSlot, (current) => ({
          ...current,
          foundryStoredCount: remaining,
          deviceState: remaining === 0 ? 'ready' : 'recovering',
        }));
        setLastLabEvent(remaining === 0
          ? 'The final Foundry component returned from Cipher storage. Recovery complete.'
          : `One Foundry component recovered; ${remaining} remain in Cipher storage.`);
        return;
      }
      if (activeProject.deviceState !== 'ready') return;
      if (activeProject.foundryUsesRemaining > 0) {
        const remaining = activeProject.foundryUsesRemaining - 1;
        updateProject(activeSlot, (current) => ({ ...current, foundryUsesRemaining: remaining }));
        setLastLabEvent(`Sustainable Foundry Forge resolved. ${remaining} sustainable use${remaining === 1 ? '' : 's'} remain.`);
        return;
      }
      updateProject(activeSlot, (current) => ({
        ...current,
        deviceState: brokenCovenant ? 'recovering' : 'spent',
        foundryStoredCount: activeDefinition.components.length,
      }));
      setLastLabEvent(brokenCovenant
        ? 'Foundry Overdrive resolved. Components entered Cipher storage and recovery is active.'
        : 'Foundry Overdrive resolved. Components entered Cipher storage; the Foundry became Spent.');
      return;
    }
    if (activeProject.blueprintId === ASCENSION_ID && activeProject.deviceState === 'ready') {
      const nextDeferral = activeProject.ascensionDeferrals + 1;
      const resolves = nextDeferral >= 2;
      updateProject(activeSlot, (current) => ({
        ...current,
        ascensionDeferrals: resolves && brokenCovenant ? 0 : Math.min(2, nextDeferral),
        deviceState: resolves && !brokenCovenant ? 'spent' : 'ready',
        operationEminence: current.operationEminence + (resolves ? 2 : 0),
      }));
      setLastLabEvent(resolves
        ? `Second Deferral recorded. 2 Eminence awarded; Registry ${brokenCovenant ? 'cleared and remained active' : 'became Spent'}.`
        : 'First public Deferral recorded.');
      return;
    }
    if (activeProject.blueprintId === WORLDSHIELD_ID && activeProject.deviceState === 'vigilant') {
      const target = artifactCard('t2p01');
      presentationSerial.current += 1;
      const detonation: BlueprintDetonationEvent = {
        eventId: `dev-worldshield-interception-${presentationSerial.current}`,
        blueprintId: ANTIMATTER_ID,
        ownerPlayerId: 'blueprint-lab-opponent',
        triggeringPlayerId: PLAYER_ID,
        targetCardId: target.id,
        hostileEffect: 'annihilation',
        targetArtifact: {
          id: target.id,
          name: target.name,
          tier: target.tier as 1 | 2 | 3,
          bonusAffinity: target.bonusAffinity,
          eminence: target.eminence,
          cost: target.cost,
          flavor: target.flavor,
        },
        collateralCardIds: [],
        collateralArtifacts: [],
        interceptedByBlueprintId: WORLDSHIELD_ID,
        presentationVariant: 'armored',
        createdAt: presentationSerial.current,
      };
      updateProject(activeSlot, (current) => ({
        ...current,
        deviceState: brokenCovenant ? 'vigilant' : 'spent',
      }));
      setPresentation({
        kind: 'detonation',
        blueprintId: WORLDSHIELD_ID,
        serial: presentationSerial.current,
        detonation,
      });
      setLastLabEvent(`Hostile Annihilation intercepted. The claim continued; Worldshield ${brokenCovenant ? 'remained Vigilant' : 'became Spent'}.`);
    }
  };

  const finishPresentation = () => {
    if (presentation?.kind === 'manifestation') {
      setRecentSiteIds([`blueprint:${presentation.blueprintId}`]);
      setLastLabEvent(`${BLUEPRINT_DEFINITIONS[presentation.blueprintId].name} is now visible in the Civilization scene.`);
    }
    setPresentation(null);
  };

  const beginCivilizationEventPresentation = () => {
    if (presentationActive) return;
    presentationSerial.current += 1;
    setCivilizationEventPresentation(civilizationEventPreview(presentationSerial.current));
    setLastLabEvent('Stellar Containment Cascade entered the first-contact resolution lane.');
  };

  const finishCivilizationEventPresentation = () => {
    setCivilizationEventPresentation(null);
    setLastLabEvent('Stellar Containment Cascade resolved and entered the Civilization Record.');
  };

  const recoverFoundryComponent = (artifactId: string) => {
    const slotIndex = projects.findIndex((project) => project.blueprintId === FOUNDRY_ID);
    if (slotIndex < 0) return;
    const foundry = projects[slotIndex];
    if (foundry.deviceState !== 'recovering' || foundry.foundryStoredCount <= 0) return;
    const remaining = Math.max(0, foundry.foundryStoredCount - 1);
    updateProject(slotIndex as 0 | 1, (current) => ({
      ...current,
      foundryStoredCount: remaining,
      deviceState: remaining === 0 ? 'ready' : 'recovering',
    }));
    setActiveSlot(slotIndex as 0 | 1);
    setLastLabEvent(remaining === 0
      ? `${LORE[artifactId]?.name ?? artifactId} restored the Foundry to Ready.`
      : `${LORE[artifactId]?.name ?? artifactId} recovered; ${remaining} component${remaining === 1 ? '' : 's'} remain stored.`);
  };

  const noOp = () => undefined;
  const handScope: HandTabScope = {
    activationGateActive: presentationActive,
    activationQueue: [],
    brandDelayMap: new Map(),
    cardDetailDiscovered: true,
    civEditValue,
    civLabel,
    civilizationDeploymentSites: fixture.deploymentSites,
    civilizationProfile: fixture.profile,
    computeCosts: (card) => card.cost,
    costMode: 'needed_now',
    expandedLumEffects,
    forgedView,
    hintsEnabled: true,
    handleCancelPlan: noOp,
    handleCardTap: (card) => setSelectedArtifact(card),
    handleFoundryRecovery: recoverFoundryComponent,
    isEditingCivName,
    isMyTurn: true,
    kardashevPalette: fixture.palette,
    kardashevProgressFraction: Math.min(1, fixture.forgedArtifacts.length / 6),
    kardashevTier: fixture.tier,
    loreCatalog: LORE,
    me: fixture.localPlayer,
    myReservedCount: fixture.localPlayer.reservedArtifacts.length,
    newlyMarkedCardIds: new Set(),
    openForgedCardSheet: setSelectedArtifact,
    recentCivilizationSiteIds: recentSiteIds,
    acknowledgeRecentCivilizationSites: () => setRecentSiteIds([]),
    pendingGameOver: false,
    plannedCardId: null,
    plannedCardLabel: '',
    safePlayers: fixture.state.players,
    selectedCard: null,
    session: { playerId: PLAYER_ID, avatarId: fixture.localPlayer.avatarId ?? undefined },
    setCivEditValue,
    setCivLabel,
    setExpandedLumEffects,
    setForgedView,
    setIsEditingCivName,
    setShowActiveLuminaries,
    setShowForgedArtifacts,
    setTracedSourceLumId: noOp,
    showActiveLuminaries,
    showCinematic: presentationActive,
    showForgedArtifacts,
    showWinOverlay: false,
    state: fixture.state,
    strikeAuraMap: new Map(),
    suppressedMarkerIds: new Set(),
    victoryRequirement: fixture.state.victoryRequirement,
  };

  const affinityScope: AffinityWellPanelScope = {
    canPlan: false,
    cancelReturnPhase: noOp,
    confirmAffinities: noOp,
    confirmReturnPhase: noOp,
    coreActionSubmitted: true,
    affinityQueueActive: false,
    dismissUndoHint: noOp,
    eminencePanelImpact: null,
    flashSent: noOp,
    forgeDeductions: {},
    handleAffinityClick: noOp,
    handlePlanAction: noOp,
    handleUndoAffinity: noOp,
    harnessPulseKey,
    harnessBlockedKeys: {},
    harnessBurstKeys: {},
    isActivePlayer: true,
    isMyTurn: true,
    isMyTurnForCoreAction: false,
    isSideAffinityWell: false,
    isTutorial: false,
    me: fixture.localPlayer,
    playerPanelRef,
    promoteToTake2: noOp,
    harnessLegality: { ok: false, reason: 'Blueprint lab' },
    returnPhase: null,
    returnSelections,
    selectedAffinities,
    sentFlashBtn: null,
    session: { playerId: PLAYER_ID, avatarId: fixture.localPlayer.avatarId },
    setActionMode: noOp,
    setAffinityHistory: noOp,
    setForgedFilter: noOp,
    setHarnessPulseKey,
    setPrePromotionHistory: noOp,
    setReturnSelections,
    setSelectedAffinities,
    setShowEminenceBreakdown: noOp,
    setShowForgedOverlay: noOp,
    setShowReservedOverlay: noOp,
    showForgeHint: false,
    showReserveHint: false,
    showUndoHint: false,
    singularityAbsorbKey: 0,
    state: fixture.state,
    tutorialAttention: null,
    tutorialStep: null,
    tutorialZone: null,
    victoryRequirement: fixture.state.victoryRequirement,
    wellExpanded: typeof window.matchMedia !== 'function'
      || !window.matchMedia('(max-width: 680px) and (max-height: 650px)').matches,
  };

  const nextComponentName = missingComponents[0]
    ? LORE[missingComponents[0].artifactId]?.name ?? missingComponents[0].artifactId
    : null;
  const activeStatus = activeProject.manifested
    ? activeProject.deviceState
    : activeProject.matchedComponentIds.length === activeDefinition.components.length
      ? 'ready to manifest'
      : 'assembling';
  const operationLabel = activeProject.blueprintId === ANTIMATTER_ID
    ? activeProject.deviceState === 'armed' ? 'Resolve marked claim' : 'Detonator spent'
    : activeProject.blueprintId === FOUNDRY_ID
      ? activeProject.deviceState === 'recovering'
        ? 'Recover next component'
        : activeProject.deviceState === 'ready'
          ? activeProject.foundryUsesRemaining > 0
            ? 'Test sustainable Forge'
            : 'Test Foundry Overdrive'
          : 'Foundry spent'
      : activeProject.blueprintId === ASCENSION_ID
        ? activeProject.deviceState === 'ready' ? 'Record qualifying deferral' : 'Registry spent'
        : activeProject.deviceState === 'vigilant' ? 'Test hostile interception' : 'Worldshield spent';
  const canOperate = activeProject.manifested && !presentationActive && (
    (activeProject.blueprintId === ANTIMATTER_ID && activeProject.deviceState === 'armed') ||
    (activeProject.blueprintId === FOUNDRY_ID && activeProject.deviceState !== 'spent') ||
    (activeProject.blueprintId === ASCENSION_ID && activeProject.deviceState === 'ready') ||
    (activeProject.blueprintId === WORLDSHIELD_ID && activeProject.deviceState === 'vigilant')
  );

  return (
    <div
      className="game-shell relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground"
      data-dev-civilization-tab="true"
      data-artifact-population={saturatedPopulation ? 'saturated' : 'foundation'}
      data-civilization-slice="chrysalis"
      data-active-blueprint={activeProject.blueprintId}
      data-active-blueprint-status={activeStatus}
      data-board-layout="base"
      data-board-density="stacked"
      data-board-viewport={boardLayoutPolicy.viewportClass}
    >
      <div
        className="game-cosmic-background pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `url(${backgroundCosmos})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-background/75" />

      {devControlsOpen && (
        <section
          id="civilization-lab-controls"
          className="fixed inset-x-0 top-14 z-[12000] mx-auto w-full max-w-[1180px] border border-amber-200/15 bg-[#050912]/95 shadow-[0_16px_44px_rgba(0,0,0,0.58)]"
          aria-label="Civilization Blueprint Lab controls"
        >
          <div className="flex h-9 w-full items-center justify-between gap-3 px-3 text-left text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/70">
          <span className="flex min-w-0 items-center gap-2">
            <FlaskConical className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Chrysalis Civilization Lab</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-white/46">
            Legacy {legacyProgress.completedCriterionCount}/{legacyProgress.requiredCriterionCount}
            <span aria-hidden="true">·</span>
            {activeProject.matchedComponentIds.length}/{activeDefinition.components.length}
            <button
              type="button"
              onClick={() => setDevControlsOpen(false)}
              className="ml-1 grid h-7 w-7 place-items-center border border-white/10 text-white/52 hover:text-white"
              aria-label="Close Civilization Blueprint Lab controls"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
          </div>
          <div className="max-h-[min(46dvh,430px)] overflow-y-auto border-t border-white/8 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/dev/civilization-scene"
                className="inline-flex h-8 items-center gap-1.5 border border-white/12 bg-white/[0.035] px-2.5 text-[9px] font-black uppercase text-white/55 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Scene lab
              </a>
              <div className="inline-grid h-8 grid-cols-2 border border-white/12" aria-label="Blueprint loadout slots">
                {projects.map((project, slotIndex) => (
                  <button
                    key={`${slotIndex}-${project.blueprintId}`}
                    type="button"
                    className={`min-w-[112px] px-2.5 text-[9px] font-black uppercase ${activeSlot === slotIndex
                      ? 'bg-amber-300/15 text-amber-100'
                      : 'bg-white/[0.025] text-white/45 hover:text-white/70'}`}
                    onClick={() => setActiveSlot(slotIndex as 0 | 1)}
                    aria-pressed={activeSlot === slotIndex}
                    aria-label={`Select Blueprint slot ${slotIndex + 1}: ${BLUEPRINT_DEFINITIONS[project.blueprintId].name}`}
                  >
                    Slot {slotIndex + 1} · {project.manifested ? 'Manifested' : `${project.matchedComponentIds.length}/${BLUEPRINT_DEFINITIONS[project.blueprintId].components.length}`}
                  </button>
                ))}
              </div>
              <label className="ml-auto inline-flex h-8 items-center gap-2 border border-white/12 bg-white/[0.025] px-2.5 text-[9px] font-black uppercase text-white/55">
                <input
                  type="checkbox"
                  checked={brokenCovenant}
                  onChange={(event) => setBrokenCovenant(event.target.checked)}
                  className="h-3.5 w-3.5 accent-amber-300"
                />
                Broken Covenant
              </label>
              <button
                type="button"
                onClick={resetLab}
                className="inline-flex h-8 items-center gap-1.5 border border-white/12 bg-white/[0.035] px-2.5 text-[9px] font-black uppercase text-white/55 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset lab
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/8 pt-2" aria-label="Legacy Path test conditions">
              <span className="mr-1 text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/48">
                Legacy conditions
              </span>
              <label className="inline-flex h-8 items-center gap-2 border border-white/12 bg-white/[0.025] px-2.5 text-[8px] font-black uppercase text-white/55">
                <input
                  type="checkbox"
                  checked={legacyCriteria.galacticIdentity}
                  onChange={(event) => setLegacyCriteria((current) => ({
                    ...current,
                    galacticIdentity: event.target.checked,
                  }))}
                  className="h-3.5 w-3.5 accent-cyan-300"
                />
                Galactic Identity
              </label>
              <label className="inline-flex h-8 items-center gap-2 border border-white/12 bg-white/[0.025] px-2.5 text-[8px] font-black uppercase text-white/55">
                <input
                  type="checkbox"
                  checked={legacyCriteria.continuity}
                  onChange={(event) => setLegacyCriteria((current) => ({
                    ...current,
                    continuity: event.target.checked,
                  }))}
                  className="h-3.5 w-3.5 accent-cyan-300"
                />
                Continuity
              </label>
              <label className="inline-flex h-8 items-center gap-2 border border-white/12 bg-white/[0.025] px-2.5 text-[8px] font-black uppercase text-white/55">
                <input
                  type="checkbox"
                  checked={legacyCriteria.definingTrial}
                  onChange={(event) => setLegacyCriteria((current) => ({
                    ...current,
                    definingTrial: event.target.checked,
                  }))}
                  className="h-3.5 w-3.5 accent-cyan-300"
                />
                Defining Trial
              </label>
              <span className={`ml-auto text-[8px] font-black uppercase tracking-[0.12em] ${
                legacyProgress.achieved ? 'text-cyan-100' : 'text-white/32'
              }`}>
                {legacyProgress.achieved ? 'Legacy complete' : `${legacyProgress.completedCriterionCount} of ${legacyProgress.requiredCriterionCount}`}
              </span>
              <button
                type="button"
                onClick={beginCivilizationEventPresentation}
                disabled={presentationActive}
                className="inline-flex h-8 items-center gap-1.5 border border-cyan-100/22 bg-cyan-300/[0.07] px-2.5 text-[8px] font-black uppercase text-cyan-50/70 enabled:hover:bg-cyan-300/12 disabled:opacity-35"
              >
                <Zap className="h-3.5 w-3.5" /> Test first-contact Event
              </button>
            </div>

            <div className="mt-2.5 grid gap-2.5 border-t border-white/8 pt-2.5 lg:grid-cols-[minmax(220px,0.72fr)_minmax(0,1.28fr)]">
              <div className="min-w-0 border-r-0 border-white/8 lg:border-r lg:pr-3">
                <div className="flex items-center gap-2">
                  <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.14em] text-white/38">Blueprint in Slot {activeSlot + 1}</span>
                    <select
                      aria-label={`Blueprint in slot ${activeSlot + 1}`}
                      value={activeProject.blueprintId}
                      onChange={(event) => selectBlueprint(event.target.value as BlueprintId)}
                      disabled={presentationActive}
                      className="h-9 w-full border border-white/12 bg-[#090d14] px-2 text-[11px] font-semibold text-white/78 outline-none focus:border-amber-200/45"
                    >
                      {LAB_BLUEPRINT_IDS.map((blueprintId) => (
                        <option
                          key={blueprintId}
                          value={blueprintId}
                          disabled={projects.some((project, slotIndex) => slotIndex !== activeSlot && project.blueprintId === blueprintId)}
                        >
                          {BLUEPRINT_DEFINITIONS[blueprintId].name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="mt-4 inline-flex h-9 shrink-0 items-center gap-1.5 border border-amber-200/20 bg-amber-300/[0.07] px-2 text-[8px] font-black uppercase text-amber-100/68">
                    {activeProject.manifested ? <CircleDot className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                    {activeStatus}
                  </span>
                </div>
                <p className="mt-2 text-[9px] leading-relaxed text-white/42">
                  {activeDefinition.civilization.projectForm} · {activeDefinition.civilization.siteTitle}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={forgeNextComponent}
                    disabled={!nextComponentName || activeProject.manifested || presentationActive}
                    className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 border border-amber-200/40 bg-amber-300/12 px-2 text-[8px] font-black uppercase text-amber-100 enabled:hover:bg-amber-300/20 disabled:opacity-35"
                  >
                    <Hammer className="h-3.5 w-3.5" />
                    {nextComponentName ? `Forge next · ${nextComponentName}` : 'Recipe complete'}
                  </button>
                  <button
                    type="button"
                    onClick={completeRecipe}
                    disabled={activeProject.manifested || presentationActive}
                    className="inline-flex h-8 items-center gap-1.5 border border-cyan-100/20 bg-cyan-300/[0.06] px-2 text-[8px] font-black uppercase text-cyan-50/65 enabled:hover:bg-cyan-300/10 disabled:opacity-35"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Complete recipe
                  </button>
                  <button
                    type="button"
                    onClick={() => resetProject(activeSlot)}
                    disabled={presentationActive}
                    className="grid h-8 w-8 place-items-center border border-white/12 bg-white/[0.035] text-white/48 hover:text-white disabled:opacity-35"
                    aria-label={`Reset ${activeDefinition.name}`}
                    title="Reset active project"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="min-w-0">
                <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4" aria-label={`${activeDefinition.name} component controls`}>
                  {activeDefinition.components.map((component, index) => {
                    const matched = activeProject.matchedComponentIds.includes(component.artifactId);
                    return (
                      <button
                        key={component.artifactId}
                        type="button"
                        disabled={activeProject.manifested || presentationActive}
                        onClick={() => forgeComponent(component.artifactId)}
                        aria-pressed={matched}
                        aria-label={`${matched ? 'Remove' : 'Forge'} ${LORE[component.artifactId]?.name ?? component.artifactId}`}
                        className={`flex min-h-[54px] min-w-0 items-center gap-2 border px-2 py-1.5 text-left disabled:cursor-default ${matched
                          ? 'border-amber-200/35 bg-amber-300/[0.09]'
                          : 'border-white/10 bg-black/25 enabled:hover:bg-white/[0.045]'}`}
                      >
                        <span className={`grid h-6 w-6 shrink-0 place-items-center border ${matched ? 'border-amber-200/50 text-amber-200' : 'border-white/15 text-white/28'}`}>
                          {matched ? <Check className="h-3.5 w-3.5" /> : <span className="font-mono text-[9px]">{index + 1}</span>}
                        </span>
                        <span className="min-w-0">
                          <strong className={`block truncate text-[9px] ${matched ? 'text-amber-100/90' : 'text-white/58'}`}>
                            {LORE[component.artifactId]?.name ?? component.artifactId}
                          </strong>
                          <small className="block truncate text-[7px] font-black uppercase tracking-wide text-white/30">{component.stage}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {activeProject.manifested && (
                  <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-white/8 pt-2">
                    <label>
                      <span className="mb-1 block text-[7px] font-black uppercase tracking-[0.13em] text-white/34">Device state override</span>
                      <select
                        aria-label="Device state override"
                        value={activeProject.deviceState}
                        onChange={(event) => setDeviceState(event.target.value as BlueprintDeviceState)}
                        disabled={presentationActive}
                        className="h-8 border border-white/12 bg-[#090d14] px-2 text-[9px] font-bold uppercase text-white/65 outline-none focus:border-amber-200/45"
                      >
                        {availableDeviceStates(activeProject.blueprintId).map((deviceState) => (
                          <option key={deviceState} value={deviceState}>{deviceState}</option>
                        ))}
                      </select>
                    </label>
                    {activeProject.blueprintId === FOUNDRY_ID && (
                      <div>
                        <span className="mb-1 block text-[7px] font-black uppercase tracking-[0.13em] text-white/34">Sustainable uses</span>
                        <div className="flex h-8 items-center border border-white/12 bg-[#090d14]">
                          <button
                            type="button"
                            className="grid h-full w-8 place-items-center text-white/48 hover:text-white disabled:opacity-30"
                            disabled={activeProject.foundryUsesRemaining <= 0 || presentationActive}
                            onClick={() => updateProject(activeSlot, (current) => ({ ...current, foundryUsesRemaining: Math.max(0, current.foundryUsesRemaining - 1) }))}
                            aria-label="Decrease Foundry sustainable uses"
                          ><Minus className="h-3 w-3" /></button>
                          <strong className="w-7 text-center font-mono text-[11px] text-amber-100">{activeProject.foundryUsesRemaining}</strong>
                          <button
                            type="button"
                            className="grid h-full w-8 place-items-center text-white/48 hover:text-white disabled:opacity-30"
                            disabled={activeProject.foundryUsesRemaining >= 2 || presentationActive}
                            onClick={() => updateProject(activeSlot, (current) => ({ ...current, foundryUsesRemaining: Math.min(2, current.foundryUsesRemaining + 1) }))}
                            aria-label="Increase Foundry sustainable uses"
                          ><Plus className="h-3 w-3" /></button>
                        </div>
                      </div>
                    )}
                    {activeProject.blueprintId === ASCENSION_ID && (
                      <span className="inline-flex h-8 items-center border border-white/12 bg-[#090d14] px-2 font-mono text-[9px] uppercase text-white/55">
                        Deferrals {activeProject.ascensionDeferrals}/2
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={operateActiveProject}
                      disabled={!canOperate}
                      className="inline-flex h-8 min-w-[160px] items-center justify-center gap-1.5 border border-red-200/28 bg-red-400/[0.08] px-3 text-[8px] font-black uppercase text-red-100/72 enabled:hover:bg-red-400/14 disabled:opacity-35"
                    >
                      {activeProject.blueprintId === WORLDSHIELD_ID ? <Shield className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                      {operationLabel}
                    </button>
                    <button
                      type="button"
                      onClick={replayManifestation}
                      disabled={presentationActive}
                      className="inline-flex h-8 items-center gap-1.5 border border-white/12 bg-white/[0.035] px-2.5 text-[8px] font-black uppercase text-white/52 enabled:hover:text-white disabled:opacity-35"
                    >
                      <Play className="h-3.5 w-3.5" /> Replay manifestation
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-2 border-t border-white/8 pt-2" aria-live="polite">
              <CircleDot className="h-3 w-3 shrink-0 text-cyan-200/55" />
              <p className="min-w-0 flex-1 text-[8px] leading-relaxed text-white/42">{lastLabEvent}</p>
              <span className="hidden shrink-0 text-[7px] font-black uppercase tracking-[0.12em] text-white/25 sm:inline">Projected runtime state · collapse to inspect player view</span>
            </div>
          </div>
        </section>
      )}

      <header className="game-header relative z-20 flex min-h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#05080d]/94 px-4 pt-[env(safe-area-inset-top)]">
        <span className="font-serif text-base font-semibold tracking-[0.18em] text-amber-100">LUMINAE</span>
        <div className="flex items-center gap-2">
          <span className="border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-semibold text-white/65">
            Architect <span className="ml-1 text-amber-200">{fixture.localPlayer.eminence}</span>
          </span>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center border border-white/12 text-white/45"
            onClick={() => setDevControlsOpen((open) => !open)}
            aria-expanded={devControlsOpen}
            aria-controls="civilization-lab-controls"
            aria-label="Toggle Civilization Blueprint Lab controls"
            title="Civilization Lab controls"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main
        data-game-board="true"
        data-testid="game-board"
        data-active-tab="hand"
        data-board-layout="base"
        data-board-density="stacked"
        data-board-viewport={boardLayoutPolicy.viewportClass}
        className="game-main relative z-10 flex-1 overflow-y-auto overflow-x-hidden outline-none"
      >
        <HandTab scope={handScope} />
      </main>

      <AffinityWellPanel scope={affinityScope} />

      <nav className="game-bottom-nav relative z-20 grid shrink-0 grid-cols-3 border-t border-border bg-card pt-2 pb-[max(env(safe-area-inset-bottom,0px),8px)]">
        {[
          { label: 'Board', icon: LayoutGrid, active: false },
          { label: 'Civilization', icon: Landmark, active: true },
          { label: 'Log', icon: List, active: false },
        ].map(({ label, icon: Icon, active }) => (
          <button
            key={label}
            type="button"
            disabled={!active}
            className={`relative flex flex-col items-center justify-center gap-0.5 ${active ? 'text-primary' : 'text-muted-foreground'}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-semibold">{label}</span>
            {active && <span className="absolute -top-2 inset-x-4 h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </nav>

      {selectedArtifact && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/72 p-3 sm:items-center" onClick={() => setSelectedArtifact(null)}>
          <section className="relative grid w-full max-w-lg grid-cols-[104px_minmax(0,1fr)] gap-4 border border-white/15 bg-[#080b13] p-4" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="absolute right-2 top-2 grid h-8 w-8 place-items-center text-white/55 hover:text-white" onClick={() => setSelectedArtifact(null)} aria-label="Close Artifact details">
              <X className="h-4 w-4" />
            </button>
            <img src={CARD_RUNTIME_ART[selectedArtifact.id]} alt="" className="aspect-[2/3] w-full object-cover" />
            <div className="min-w-0 pr-6">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-200/55">Blueprint component</p>
              <h2 className="mt-1 font-serif text-xl text-white">{selectedArtifact.name}</h2>
              <p className="mt-2 text-xs leading-relaxed text-white/58">{LORE[selectedArtifact.id]?.practicalCapability}</p>
              <ArtifactFunctionTags artifactId={selectedArtifact.id} compact className="mt-3" />
            </div>
          </section>
        </div>
      )}

      {presentationActive && (
        presentation ? <>
          <BlueprintPresentationOverlay
            key={presentation ? `${presentation.kind}-${presentation.blueprintId}-${presentation.serial}` : 'blueprint-presentation'}
            manifestation={manifestationEvent}
            detonation={presentation?.kind === 'detonation' ? presentation.detonation : null}
            players={fixture.state.players}
            reducedMotion={false}
            onComplete={finishPresentation}
          />
          <button
            type="button"
            className="fixed right-3 top-3 z-[13000] inline-flex h-9 items-center gap-1.5 border border-white/20 bg-black/75 px-3 text-[9px] font-black uppercase text-white/70 hover:text-white"
            onClick={finishPresentation}
          >
            <SkipForward className="h-3.5 w-3.5" /> Skip cinematic
          </button>
        </> : civilizationEventPresentation ? (
          <CivilizationEventPresentationOverlay
            event={civilizationEventPresentation}
            players={fixture.state.players}
            reducedMotion={false}
            onComplete={finishCivilizationEventPresentation}
          />
        ) : null
      )}
    </div>
  );
}
