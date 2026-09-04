import {
  ARTIFACT_DEFINITION_BY_ID,
  BLUEPRINT_DEFINITIONS,
  CIVILIZATION_PROJECT_CAPABILITIES,
  applyCivilizationResolution,
  buildCivilizationResolutionSnapshot,
  resolveCivilizationEvent,
  type BlueprintCivilizationMetadata,
  type BlueprintId,
  type CivilizationResolutionResult,
  type CivilizationState,
} from '@workspace/game-types';

export const SPECIFIED_BLUEPRINT_PROJECT_IDS = [
  'bp_antimatter_detonator',
  'bp_mantle_to_orbit_foundry',
  'bp_ascension_registry',
  'bp_worldshield_covenant',
] as const;

export type SpecifiedBlueprintProjectId =
  (typeof SPECIFIED_BLUEPRINT_PROJECT_IDS)[number];

export interface BlueprintProjectIntegrationRecord {
  id: SpecifiedBlueprintProjectId;
  runtimeBlueprintId: BlueprintId | null;
  name: string;
  components: ReadonlyArray<{ artifactId: string; stage: string }>;
  implementationStatus:
    | 'implemented_policy_aligned'
    | 'implemented_reconciliation_required'
    | 'specified_not_implemented';
  civilization: BlueprintCivilizationMetadata;
}

function currentProject(
  blueprintId: BlueprintId,
  implementationStatus: Extract<
    BlueprintProjectIntegrationRecord['implementationStatus'],
    'implemented_policy_aligned' | 'implemented_reconciliation_required'
  >,
): BlueprintProjectIntegrationRecord {
  const definition = BLUEPRINT_DEFINITIONS[blueprintId];
  return {
    id: blueprintId,
    runtimeBlueprintId: blueprintId,
    name: definition.name,
    components: definition.components.map(({ artifactId, stage }) => ({ artifactId, stage })),
    implementationStatus,
    civilization: definition.civilization,
  };
}

/**
 * Server-owned integration inventory for the canonical first pool.
 *
 * Project capabilities are sufficient for the Antimatter vertical slice.
 * Individual Artifact capability authoring remains independent future work.
 */
export const BLUEPRINT_PROJECT_INTEGRATION = {
  bp_antimatter_detonator: currentProject(
    'bp_antimatter_detonator',
    'implemented_policy_aligned',
  ),
  bp_mantle_to_orbit_foundry: currentProject(
    'bp_mantle_to_orbit_foundry',
    'implemented_policy_aligned',
  ),
  bp_ascension_registry: currentProject(
    'bp_ascension_registry',
    'implemented_policy_aligned',
  ),
  bp_worldshield_covenant: currentProject(
    'bp_worldshield_covenant',
    'implemented_policy_aligned',
  ),
} as const satisfies Record<SpecifiedBlueprintProjectId, BlueprintProjectIntegrationRecord>;

export const ANTIMATTER_CIVILIZATION_POLICY = {
  resolutionForm: 'automatic',
  pressureTags: ['disruption', 'attrition'],
  targetSemantics: 'prospective_implementation',
  collateralSemantics: 'operational_implementation',
  worldshieldCapabilityId: CIVILIZATION_PROJECT_CAPABILITIES.hostileClaimInterception,
  preservesDiscovery: true,
  preservesEarnedEminence: true,
  stabilityEffect: 'derive_from_terminal_loss_after_calibration',
  affinityAptitude: 'not_applicable_to_authored_trap',
  authoredUncertainty: false,
} as const;

export interface AntimatterCivilizationPolicyInput {
  eventId: string;
  civilization: CivilizationState;
  targetArtifactId: string;
  collateralArtifactIds: readonly string[];
  turnCount: number;
  hostileClaim: boolean;
  worldshieldVigilant: boolean;
  brokenCovenant: boolean;
}

export interface AntimatterCivilizationPolicyResult {
  outcome: 'intercepted' | 'detonated';
  civilization: CivilizationState;
  collateralArtifactIds: readonly string[];
  history: Record<string, string>;
  resolution: CivilizationResolutionResult;
}

export const BLUEPRINT_CIVILIZATION_EVENT_KINDS = [
  'manifestation',
  'foundry_sustainable',
  'foundry_overdrive',
  'foundry_recovery',
  'ascension_judgment',
  'worldshield_interception',
] as const;

export type BlueprintCivilizationEventKind =
  (typeof BLUEPRINT_CIVILIZATION_EVENT_KINDS)[number];

export interface BlueprintCivilizationEventPolicyInput {
  eventId: string;
  civilization: CivilizationState;
  blueprintId: BlueprintId;
  kind: BlueprintCivilizationEventKind;
  turnCount: number;
  summary: string;
  historyValue?: string;
}

export interface BlueprintCivilizationEventPolicyResult {
  civilization: CivilizationState;
  resolution: CivilizationResolutionResult;
  history: Record<string, string>;
}

/**
 * Resolves the Civilization meaning of an Antimatter claim. The marked Forge
 * card is only a prospective implementation, so it never enters the claimant's
 * mastery history. Broken-Covenant collateral is already operational and is
 * therefore recorded as terminal implementation loss.
 */
export function resolveAntimatterCivilizationPolicy(
  input: AntimatterCivilizationPolicyInput,
): AntimatterCivilizationPolicyResult {
  const worldshieldCanIntercept = input.hostileClaim && input.worldshieldVigilant;
  const collateralArtifactIds = worldshieldCanIntercept || !input.brokenCovenant
    ? []
    : [...new Set(input.collateralArtifactIds)]
        .filter((artifactId) => {
          const definition = ARTIFACT_DEFINITION_BY_ID[
            artifactId as keyof typeof ARTIFACT_DEFINITION_BY_ID
          ];
          return definition?.tier === 1 &&
            input.civilization.artifacts[artifactId]?.implementationState === 'operational';
        })
        .slice(0, 2);
  const activeCapabilityIds = worldshieldCanIntercept
    ? [CIVILIZATION_PROJECT_CAPABILITIES.hostileClaimInterception]
    : [];
  const historyKey = `antimatter:${input.eventId}`;
  const resolution = resolveCivilizationEvent({
    eventId: input.eventId,
    source: { sourceType: 'blueprint', sourceId: 'bp_antimatter_detonator' },
    form: ANTIMATTER_CIVILIZATION_POLICY.resolutionForm,
    timing: 'trigger_window',
    pressureTags: ANTIMATTER_CIVILIZATION_POLICY.pressureTags,
    snapshot: buildCivilizationResolutionSnapshot(input.civilization, activeCapabilityIds),
    trajectories: [
      {
        id: 'worldshield_intercept',
        label: 'Worldshield intercepts the hostile claim effect',
        requirements: [{
          type: 'capability_active',
          capabilityId: CIVILIZATION_PROJECT_CAPABILITIES.hostileClaimInterception,
        }],
        uncertainty: null,
        successConsequences: [{
          type: 'record_history',
          key: historyKey,
          value: `intercepted:${input.targetArtifactId}`,
        }],
        failureConsequences: [],
      },
      {
        id: 'detonate',
        label: 'The claim is annihilated before implementation',
        requirements: [{
          type: 'capability_absent',
          capabilityId: CIVILIZATION_PROJECT_CAPABILITIES.hostileClaimInterception,
        }],
        uncertainty: null,
        successConsequences: [
          {
            type: 'record_history',
            key: historyKey,
            value: `detonated:${input.targetArtifactId};collateral:${collateralArtifactIds.join(',')}`,
          },
          ...collateralArtifactIds.map((artifactId) => ({
            type: 'set_artifact_implementation' as const,
            artifactId,
            implementationState: 'annihilated' as const,
            turnCount: input.turnCount,
            source: {
              sourceType: 'blueprint' as const,
              sourceId: 'bp_antimatter_detonator',
            },
          })),
        ],
        failureConsequences: [],
      },
    ],
  });

  if (resolution.status !== 'resolved') {
    throw new Error(`Antimatter policy did not resolve automatically: ${resolution.status}`);
  }
  const applied = applyCivilizationResolution(
    input.civilization,
    resolution,
    input.turnCount,
    resolution.selectedTrajectoryId === 'worldshield_intercept'
      ? 'Worldshield Covenant intercepted a hostile Antimatter claim'
      : collateralArtifactIds.length > 0
        ? `Antimatter annihilated a prospective claim and ${collateralArtifactIds.length} operational implementation(s)`
        : 'Antimatter annihilated a prospective Artifact claim before implementation',
    resolution.selectedTrajectoryId === 'worldshield_intercept'
      ? {
          outcomeSignals: [{
            signalId: 'continuity-preserved',
            dimension: 'continuity',
            direction: 'support',
            magnitude: 'minor',
            label: 'A hostile annihilation was intercepted before historical capability was lost',
          }],
          adversity: {
            evidenceId: 'hostile-claim-intercepted',
            magnitude: 'material',
            label: 'A hostile claim-annihilation event was survived',
            recoveryEligible: true,
          },
        }
      : collateralArtifactIds.length > 0
        ? {
            outcomeSignals: [{
              signalId: 'operational-history-annihilated',
              dimension: 'continuity',
              direction: 'pressure',
              magnitude: 'material',
              label: 'Operational implementations were permanently annihilated',
            }],
            adversity: {
              evidenceId: 'broken-covenant-collateral',
              magnitude: 'material',
              label: 'Broken-Covenant collateral damaged the civilization',
              recoveryEligible: false,
            },
          }
        : {},
  );
  return {
    outcome: resolution.selectedTrajectoryId === 'worldshield_intercept'
      ? 'intercepted'
      : 'detonated',
    civilization: applied.state,
    collateralArtifactIds,
    history: applied.history,
    resolution,
  };
}

/**
 * Registers an already-authorized Blueprint event with the shared causal
 * resolver. It does not add a second gameplay decision or alter the Project's
 * established mechanical effect.
 */
export function resolveBlueprintCivilizationEventPolicy(
  input: BlueprintCivilizationEventPolicyInput,
): BlueprintCivilizationEventPolicyResult {
  const definition = BLUEPRINT_DEFINITIONS[input.blueprintId];
  const manifestation = input.kind === 'manifestation';
  const providedCapabilityIds = manifestation
    ? []
    : definition.civilization.providedCapabilityIds;
  const trajectoryId = `${input.blueprintId}:${input.kind}`;
  const resolution = resolveCivilizationEvent({
    eventId: input.eventId,
    source: { sourceType: 'blueprint', sourceId: input.blueprintId },
    form: manifestation ? 'automatic' : definition.civilization.resolutionForm,
    timing: 'trigger_window',
    pressureTags: definition.civilization.pressureTags,
    snapshot: buildCivilizationResolutionSnapshot(
      input.civilization,
      providedCapabilityIds,
    ),
    trajectories: [{
      id: trajectoryId,
      label: input.summary,
      requirements: providedCapabilityIds.map((capabilityId) => ({
        type: 'capability_active' as const,
        capabilityId,
      })),
      uncertainty: null,
      successConsequences: [{
        type: 'record_history',
        key: `blueprint:${input.eventId}`,
        value: input.historyValue ?? input.kind,
      }],
      failureConsequences: [],
    }],
    selectedTrajectoryId: manifestation ? null : trajectoryId,
  });
  const applied = applyCivilizationResolution(
    input.civilization,
    resolution,
    input.turnCount,
    input.summary,
    input.kind === 'worldshield_interception'
      ? {
          outcomeSignals: [{
            signalId: 'continuity-preserved',
            dimension: 'continuity',
            direction: 'support',
            magnitude: 'minor',
            label: 'A hostile intervention was intercepted before permanent loss',
          }],
          adversity: {
            evidenceId: 'hostile-intervention-survived',
            magnitude: 'material',
            label: 'A hostile intervention was survived',
            recoveryEligible: true,
          },
        }
      : input.kind === 'foundry_recovery'
        ? {
            outcomeSignals: [{
              signalId: 'foundry-recovered',
              dimension: 'continuity',
              direction: 'support',
              magnitude: 'trace',
              label: 'Orbital fabrication capacity recovered from overdrive',
            }],
          }
        : input.kind === 'foundry_sustainable' || input.kind === 'foundry_overdrive' ||
          input.kind === 'ascension_judgment'
          ? {
              outcomeSignals: [{
                signalId: input.kind,
                dimension: 'achievement',
                direction: 'support',
                magnitude: input.kind === 'ascension_judgment' ? 'minor' : 'trace',
                label: input.summary,
              }],
            }
          : {},
  );
  return {
    civilization: applied.state,
    resolution,
    history: applied.history,
  };
}

export interface BlueprintCivilizationIntegrationGate {
  project: BlueprintProjectIntegrationRecord;
  readyForResolutionAuthoring: boolean;
  blockers: readonly (
    | 'pressure_tag_registry'
    | 'artifact_capability_tags'
    | 'project_consequence_policy'
    | 'runtime_rule_reconciliation'
  )[];
}

export function getBlueprintCivilizationIntegrationGate(
  projectId: SpecifiedBlueprintProjectId,
): BlueprintCivilizationIntegrationGate {
  const project = BLUEPRINT_PROJECT_INTEGRATION[projectId];
  const blockers: BlueprintCivilizationIntegrationGate['blockers'] =
    project.implementationStatus === 'implemented_policy_aligned'
      ? []
      : [
          'project_consequence_policy',
          'runtime_rule_reconciliation',
        ];
  return {
    project,
    readyForResolutionAuthoring: blockers.length === 0,
    blockers,
  };
}
