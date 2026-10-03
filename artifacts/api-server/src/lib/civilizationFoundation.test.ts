import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_CATALOG,
  ARTIFACT_CANON,
  ARTIFACT_TIER_AUDIT_BY_ID,
  ARTIFACT_BUILT_ON,
  ARTIFACT_CIVILIZATION_CAPABILITY_BY_ID,
  ARTIFACT_CIVILIZATION_CAPABILITY_DOMAIN_BY_ID,
  ARTIFACT_CIVILIZATION_CAPABILITY_DEFINITIONS,
  ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID,
  ARTIFACT_CIVILIZATION_ONTOLOGY,
  ARTIFACT_DEFINITION_BY_ID,
  ARTIFACT_DEPICTION_SCALE_BY_ID,
  ARTIFACT_LINEAGE_BY_ID,
  ARTIFACT_TECHNOLOGY_METADATA_BY_ID,
  CIVILIZATION_DYAD_DEFINITIONS,
  CIVILIZATION_MATURITY_POLICY_ID,
  CIVILIZATION_PRESSURE_TAGS,
  CIVILIZATION_PRESSURE_RESPONSE_PROFILES,
  CIVILIZATION_PROJECT_CAPABILITIES,
  CIVILIZATION_STABILITY_CALIBRATION_V1,
  addCivilizationStabilityContributor,
  assessCivilizationMaturity,
  assessCivilizationPressureResponse,
  assessCivilizationPressureResponses,
  applyCivilizationConsequences,
  applyCivilizationResolution,
  advanceCivilizationMaturity,
  applyCivilizationCondition,
  buildCivilizationResolutionSnapshot,
  createInitialCivilizationState,
  deriveCivilizationAffinityIdentity,
  deriveCivilizationStructuralStabilityContributors,
  deriveOperationalArtifactCapabilityIds,
  deriveOperationalProjectCapabilityIds,
  recalculateCivilizationStability,
  reconcileCivilizationDerivedState,
  resolveCivilizationCondition,
  resolveCivilizationEvent,
  resolveCivilizationStabilityCause,
  setCivilizationOperationalReach,
  TIER_THREE_ARTIFACT_CANON,
  upsertCivilizationEntity,
  upsertCivilizationWorld,
} from '@workspace/game-types';
import type {
  CivilizationCapabilityId,
  CivilizationArtifactLifecycleState,
  CivilizationStabilityCalibration,
  StandardAffinityKey,
} from '@workspace/game-types';
import { initializeGame, normalizeState } from './gameEngine';
import { getCardLore } from './cardLore';
import {
  ANTIMATTER_CIVILIZATION_POLICY,
  BLUEPRINT_PROJECT_INTEGRATION,
  getBlueprintCivilizationIntegrationGate,
  resolveAntimatterCivilizationPolicy,
  resolveBlueprintCivilizationEventPolicy,
} from './civilizationBlueprintIntegration';

const ARTIFACT_BY_AFFINITY: Record<StandardAffinityKey, string> = {
  flare: 't1r01',
  continuum: 't1s01',
  verdance: 't1e01',
  abyss: 't1o01',
  radiance: 't1p01',
};

function lifecycle(
  artifactId: string,
  masteryCount: number,
  implementationState: CivilizationArtifactLifecycleState['implementationState'] = 'operational',
): CivilizationArtifactLifecycleState {
  return {
    artifactId,
    firstMasteredTurnCount: 1,
    masteryCount,
    implementationState,
    implementationStateChangedTurnCount: 1,
    implementationChangeSource: null,
    historyEvidence: 'recorded',
  };
}

describe('shared Artifact authority', () => {
  it('provides one canonical tier decision and public function for every playable Artifact', () => {
    const ids = ARTIFACT_CATALOG.map(artifact => artifact.id).sort();
    expect(Object.keys(ARTIFACT_CANON).sort()).toEqual(ids);
    expect(Object.keys(ARTIFACT_TIER_AUDIT_BY_ID).sort()).toEqual(ids);
    for (const artifact of ARTIFACT_CATALOG) {
      const canon = ARTIFACT_CANON[artifact.id];
      const audit = ARTIFACT_TIER_AUDIT_BY_ID[artifact.id];
      expect(audit.tier).toBe(artifact.tier);
      expect(audit.confinementTest.trim()).not.toBe('');
      expect(getCardLore(artifact.id).flavor).toBe(`${canon.functionalText} ${canon.mystery}`);
      expect(canon.engineeringScale).toBe(({ 1: 'Planetary', 2: 'Star-system', 3: 'Galactic' })[artifact.tier]);
    }
  });

  it('contains the complete unique 45/30/20 mechanical catalog', () => {
    expect(ARTIFACT_CATALOG).toHaveLength(95);
    expect(new Set(ARTIFACT_CATALOG.map((artifact) => artifact.id)).size).toBe(95);
    expect(ARTIFACT_CATALOG.filter((artifact) => artifact.tier === 1)).toHaveLength(45);
    expect(ARTIFACT_CATALOG.filter((artifact) => artifact.tier === 2)).toHaveLength(30);
    expect(ARTIFACT_CATALOG.filter((artifact) => artifact.tier === 3)).toHaveLength(20);
    expect(ARTIFACT_CATALOG.every((artifact) => artifact.cost.singularity === 0)).toBe(true);
  });

  it('preserves the five-way bonus distribution', () => {
    for (const affinity of Object.keys(ARTIFACT_BY_AFFINITY) as StandardAffinityKey[]) {
      expect(ARTIFACT_CATALOG.filter((artifact) => artifact.bonusAffinity === affinity)).toHaveLength(19);
    }
  });

  it('covers all 95 Artifacts with explicit lineage and depiction metadata', () => {
    const ids = ARTIFACT_CATALOG.map((artifact) => artifact.id);
    expect(Object.keys(ARTIFACT_LINEAGE_BY_ID)).toHaveLength(95);
    expect(Object.keys(ARTIFACT_DEPICTION_SCALE_BY_ID)).toHaveLength(95);
    expect(Object.keys(ARTIFACT_TECHNOLOGY_METADATA_BY_ID)).toHaveLength(95);
    for (const id of ids) {
      expect(ARTIFACT_LINEAGE_BY_ID[id]).toBeTruthy();
      expect(ARTIFACT_DEPICTION_SCALE_BY_ID[id]).toBeTruthy();
      expect(ARTIFACT_TECHNOLOGY_METADATA_BY_ID[id].builtOn).toEqual(
        (ARTIFACT_BUILT_ON as Partial<Record<string, readonly string[]>>)[id] ?? [],
      );
      const capabilityIds = ARTIFACT_TECHNOLOGY_METADATA_BY_ID[id].capabilityIds;
      expect(capabilityIds.length).toBeGreaterThanOrEqual(1);
      expect(capabilityIds.length).toBeLessThanOrEqual(2);
      for (const capabilityId of capabilityIds) {
        expect(ARTIFACT_CIVILIZATION_CAPABILITY_BY_ID[capabilityId]).toBeTruthy();
      }
    }
  });

  it('adopts translated capability classes without replacing Technology v2', () => {
    expect(ARTIFACT_CIVILIZATION_ONTOLOGY).toMatchObject({
      artifactMeaning: 'translated_capability_class',
      implementationMeaning: 'local_operational_realization',
      lineageMeaning: 'credible_developmental_route_not_standard_prerequisite',
      catalyticReplacementStatus: 'not_adopted',
    });
    expect(ARTIFACT_CIVILIZATION_CAPABILITY_DEFINITIONS).toHaveLength(32);
    expect(Object.keys(ARTIFACT_CIVILIZATION_CAPABILITY_DOMAIN_BY_ID)).toHaveLength(32);
    expect(new Set(ARTIFACT_CIVILIZATION_CAPABILITY_DEFINITIONS.map(({ id }) => id)).size)
      .toBe(32);
    const usedCapabilityIds = new Set(Object.values(
      ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID,
    ).flat());
    expect([...usedCapabilityIds].sort()).toEqual(
      ARTIFACT_CIVILIZATION_CAPABILITY_DEFINITIONS.map(({ id }) => id).sort(),
    );
    for (const capabilityIds of Object.values(ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID)) {
      expect(new Set(capabilityIds).size).toBe(capabilityIds.length);
    }
  });

  it('anchors first-pool Blueprint components in coherent qualitative capabilities', () => {
    expect(ARTIFACT_TECHNOLOGY_METADATA_BY_ID.t1r01.capabilityIds)
      .toContain('artifact:controlled_energy');
    expect(ARTIFACT_TECHNOLOGY_METADATA_BY_ID.t1p04.capabilityIds)
      .toContain('artifact:hazard_containment');
    expect(ARTIFACT_TECHNOLOGY_METADATA_BY_ID.t1s02.capabilityIds)
      .toContain('artifact:transit_navigation');
    expect(ARTIFACT_TECHNOLOGY_METADATA_BY_ID.t1o05.capabilityIds)
      .toContain('artifact:precision_fabrication');
    expect(ARTIFACT_TECHNOLOGY_METADATA_BY_ID.t1p05.capabilityIds)
      .toContain('artifact:evidence_verification');
  });

  it('tags Tier III achievements by the functions they actually perform', () => {
    expect(ARTIFACT_TECHNOLOGY_METADATA_BY_ID.t3r01.capabilityIds).toEqual([
      'artifact:controlled_energy',
      'artifact:transit_navigation',
    ]);
    expect(ARTIFACT_TECHNOLOGY_METADATA_BY_ID.t3e04.capabilityIds).toEqual([
      'artifact:cross_ecology_mediation',
      'artifact:hazard_containment',
    ]);
    expect(ARTIFACT_TECHNOLOGY_METADATA_BY_ID.t3p01.capabilityIds).toEqual([
      'artifact:plural_governance',
      'artifact:evidence_verification',
    ]);
  });

  it('derives Artifact capabilities from operational implementations only', () => {
    const civilization = createInitialCivilizationState();
    civilization.artifacts = {
      t1r01: lifecycle('t1r01', 1, 'operational'),
      t1s01: lifecycle('t1s01', 1, 'damaged'),
      t1e01: lifecycle('t1e01', 1, 'archived'),
      t1o01: lifecycle('t1o01', 1, 'annihilated'),
    };

    expect(deriveOperationalArtifactCapabilityIds(civilization, {
      t1r01: ['artifact:bounded_ignition'],
      t1s01: ['artifact:event_detection'],
      t1e01: ['artifact:ecological_recovery'],
      t1o01: ['artifact:concealment'],
    })).toEqual(['artifact:bounded_ignition']);

    expect(deriveOperationalArtifactCapabilityIds(civilization)).toEqual([
      'artifact:controlled_energy',
    ]);
  });

  it('derives Project capabilities from active public device states', () => {
    const devices = [
      {
        blueprintId: 'bp_worldshield_covenant',
        ownerPlayerId: 'p1',
        slotIndex: 0,
        state: 'vigilant',
        presentationVariant: 'armored',
      },
      {
        blueprintId: 'bp_mantle_to_orbit_foundry',
        ownerPlayerId: 'p1',
        slotIndex: 1,
        state: 'recovering',
        presentationVariant: 'armored',
      },
      {
        blueprintId: 'bp_ascension_registry',
        ownerPlayerId: 'p1',
        slotIndex: 2,
        state: 'spent',
        presentationVariant: 'armored',
      },
    ] as const;

    expect(deriveOperationalProjectCapabilityIds(devices))
      .toEqual([CIVILIZATION_PROJECT_CAPABILITIES.hostileClaimInterception]);
    expect(buildCivilizationResolutionSnapshot(
      createInitialCivilizationState(),
      ['system:baseline'],
      devices,
    ).activeCapabilityIds).toEqual([
      CIVILIZATION_PROJECT_CAPABILITIES.hostileClaimInterception,
      'system:baseline',
    ]);
  });

  it('keeps every Built On edge semantically compatible with printed costs', () => {
    for (const [targetId, predecessors] of Object.entries(ARTIFACT_BUILT_ON)) {
      const target = ARTIFACT_DEFINITION_BY_ID[targetId as keyof typeof ARTIFACT_DEFINITION_BY_ID];
      for (const predecessorId of predecessors) {
        const predecessor = ARTIFACT_DEFINITION_BY_ID[predecessorId];
        expect(target.cost[predecessor.bonusAffinity], `${predecessorId} -> ${targetId}`)
          .toBeGreaterThan(0);
      }
    }
  });

  it('projects complete galactic achievements through their actual artwork viewpoint', () => {
    expect(Object.keys(TIER_THREE_ARTIFACT_CANON)).toHaveLength(20);
    for (const [id, canon] of Object.entries(TIER_THREE_ARTIFACT_CANON)) {
      expect(getCardLore(id).name).toBe(canon.name);
      expect(getCardLore(id).artifactForm).toBe(canon.forms.join(' / '));
      expect(getCardLore(id).flavor).toBe(`${canon.practicalCapability} ${canon.mystery}`);
      expect(getCardLore(id).artPrompt).toBe(canon.artPrompt);
      expect(getCardLore(id).engineeringScale).toBe('Galactic');
      const artifactNames = Object.values(TIER_THREE_ARTIFACT_CANON).map(({ name }) => name);
      for (const lead of canon.projectLeads) expect(artifactNames).not.toContain(lead.name);
      expect(['installation', 'planetary', 'stellar', 'galactic'])
        .toContain(ARTIFACT_DEPICTION_SCALE_BY_ID[id as keyof typeof ARTIFACT_DEPICTION_SCALE_BY_ID]);
    }
  });
});

describe('Blueprint Civilization integration boundary', () => {
  it('inventories all four specified first-pool Projects against their runtime definitions', () => {
    expect(Object.keys(BLUEPRINT_PROJECT_INTEGRATION)).toEqual([
      'bp_antimatter_detonator',
      'bp_mantle_to_orbit_foundry',
      'bp_ascension_registry',
      'bp_worldshield_covenant',
    ]);
    expect(BLUEPRINT_PROJECT_INTEGRATION.bp_ascension_registry.runtimeBlueprintId)
      .toBe('bp_ascension_registry');
    expect(BLUEPRINT_PROJECT_INTEGRATION.bp_ascension_registry.implementationStatus)
      .toBe('implemented_policy_aligned');
    expect(BLUEPRINT_PROJECT_INTEGRATION.bp_ascension_registry.components.map((entry) => entry.artifactId))
      .toEqual(['t1p05', 't1s03', 't1r08']);
  });

  it('exposes the resolved automatic Antimatter policy without requiring Artifact tags', () => {
    const gate = getBlueprintCivilizationIntegrationGate('bp_antimatter_detonator');
    expect(gate.readyForResolutionAuthoring).toBe(true);
    expect(gate.project.civilization.triggerWindows).toEqual([
      'legal_forge_before_payment',
      'legal_encrypt_before_reserve',
    ]);
    expect(gate.project.civilization.resolutionForm).toBe('automatic');
    expect(gate.project.civilization.pressureTags).toEqual(['disruption', 'attrition']);
    expect(gate.project.civilization.consequencePolicyStatus)
      .toBe('runtime_aligned');
    expect(gate.blockers).toEqual([]);
  });

  it('ratifies the bounded pressure vocabulary and namespaced Project capabilities', () => {
    expect(CIVILIZATION_PRESSURE_TAGS).toEqual([
      'disruption',
      'isolation',
      'proliferation',
      'exposure',
      'attrition',
      'coordination',
      'transformation',
    ]);
    expect(CIVILIZATION_PROJECT_CAPABILITIES.hostileClaimInterception)
      .toBe('project:hostile_claim_interception');
  });

  it('keeps a destroyed Forge candidate out of mastery while preserving collateral history', () => {
    const civilization = createInitialCivilizationState();
    civilization.artifacts.t1e01 = lifecycle('t1e01', 1);
    civilization.affinityIdentity = deriveCivilizationAffinityIdentity(civilization.artifacts);

    const result = resolveAntimatterCivilizationPolicy({
      eventId: 'event:antimatter',
      civilization,
      targetArtifactId: 't2r01',
      collateralArtifactIds: ['t1e01'],
      turnCount: 7,
      hostileClaim: true,
      worldshieldVigilant: false,
      brokenCovenant: true,
    });

    expect(result.outcome).toBe('detonated');
    expect(result.resolution.pressureTags).toEqual(['disruption', 'attrition']);
    expect(result.resolution.source).toEqual({
      sourceType: 'blueprint',
      sourceId: 'bp_antimatter_detonator',
    });
    expect(result.civilization.artifacts.t2r01).toBeUndefined();
    expect(result.civilization.artifacts.t1e01).toMatchObject({
      masteryCount: 1,
      implementationState: 'annihilated',
    });
    expect(result.civilization.affinityIdentity.historicalCounts.verdance).toBe(1);
    expect(result.civilization.affinityIdentity.operationalCounts.verdance).toBe(0);
    expect(result.civilization.stability.contributors).toEqual([
      expect.objectContaining({
        id: 'structural:artifact:t1e01:annihilated',
        direction: 'pressure',
        magnitude: 8,
      }),
    ]);
    expect(result.civilization.stability.score).toBe(72);
  });

  it('lets Worldshield prevent all Antimatter loss without random uncertainty', () => {
    const civilization = createInitialCivilizationState();
    civilization.artifacts.t1e01 = lifecycle('t1e01', 1);
    const result = resolveAntimatterCivilizationPolicy({
      eventId: 'event:worldshield',
      civilization,
      targetArtifactId: 't2r01',
      collateralArtifactIds: ['t1e01'],
      turnCount: 7,
      hostileClaim: true,
      worldshieldVigilant: true,
      brokenCovenant: true,
    });

    expect(result.outcome).toBe('intercepted');
    expect(result.collateralArtifactIds).toEqual([]);
    expect(result.civilization.artifacts.t1e01.implementationState).toBe('operational');
    expect(result.resolution.evaluations.every((entry) => entry.successChance === null)).toBe(true);
    expect(ANTIMATTER_CIVILIZATION_POLICY.preservesEarnedEminence).toBe(true);
  });
});

describe('Civilization pressure-response matrix', () => {
  it('covers every bounded pressure with valid, non-overlapping capability roles', () => {
    expect(Object.keys(CIVILIZATION_PRESSURE_RESPONSE_PROFILES).sort())
      .toEqual([...CIVILIZATION_PRESSURE_TAGS].sort());
    for (const profile of Object.values(CIVILIZATION_PRESSURE_RESPONSE_PROFILES)) {
      expect(profile.primaryCapabilityIds.length).toBeGreaterThan(0);
      expect(profile.supportingCapabilityIds.length).toBeGreaterThan(0);
      const allCapabilityIds = [
        ...profile.primaryCapabilityIds,
        ...profile.supportingCapabilityIds,
      ];
      expect(new Set(allCapabilityIds).size).toBe(allCapabilityIds.length);
      for (const capabilityId of allCapabilityIds) {
        expect(ARTIFACT_CIVILIZATION_CAPABILITY_BY_ID[capabilityId]).toBeTruthy();
      }
    }
  });

  it('never lets Affinity aptitude substitute for an operational capability', () => {
    const affinityIdentity = deriveCivilizationAffinityIdentity({
      flare: lifecycle('t1r01', 4),
    });
    const unprepared = assessCivilizationPressureResponse(
      'transformation',
      [],
      affinityIdentity,
    );
    expect(unprepared.aptitudeScore).toBe(2);
    expect(unprepared.capabilityCoverage).toBe('none');
    expect(unprepared.netExecutionFit).toBeLessThan(unprepared.aptitudeScore);

    const prepared = assessCivilizationPressureResponse(
      'transformation',
      ['artifact:controlled_energy'],
      affinityIdentity,
    );
    expect(prepared.capabilityCoverage).toBe('strong');
    expect(prepared.activePrimaryCapabilityIds).toEqual(['artifact:controlled_energy']);
  });

  it('makes pressure coverage, aptitude, and risk available to authored trajectories', () => {
    const civilization = createInitialCivilizationState();
    civilization.artifacts.t1s01 = lifecycle('t1s01', 2);
    civilization.artifacts.t1p04 = lifecycle('t1p04', 2);
    civilization.affinityIdentity = deriveCivilizationAffinityIdentity(civilization.artifacts);
    const result = resolveCivilizationEvent({
      eventId: 'event:pressure-gate',
      source: { sourceType: 'scenario', sourceId: 'containment-test' },
      form: 'automatic',
      timing: 'trigger_window',
      pressureTags: ['proliferation'],
      snapshot: buildCivilizationResolutionSnapshot(civilization),
      trajectories: [{
        id: 'contain',
        label: 'Contain the spread',
        requirements: [
          { type: 'pressure_capability_coverage', pressureTag: 'proliferation', minimum: 'strong' },
          { type: 'minimum_pressure_aptitude', pressureTag: 'proliferation', score: 1 },
          { type: 'maximum_pressure_risk', pressureTag: 'proliferation', score: 2 },
        ],
        uncertainty: null,
        successConsequences: [],
        failureConsequences: [],
      }],
    });
    expect(result.status).toBe('resolved');
    expect(result.pressureResponses).toEqual([
      expect.objectContaining({
        pressureTag: 'proliferation',
        capabilityCoverage: 'strong',
      }),
    ]);
    expect(assessCivilizationPressureResponses(
      ['proliferation', 'proliferation'],
      buildCivilizationResolutionSnapshot(civilization).activeCapabilityIds,
      civilization.affinityIdentity,
    )).toHaveLength(1);
  });
});

describe('Civilization Affinity identity', () => {
  it('recognizes every canonical dyad deterministically', () => {
    for (const definition of CIVILIZATION_DYAD_DEFINITIONS) {
      const [first, second] = definition.affinities;
      const identity = deriveCivilizationAffinityIdentity({
        first: lifecycle(ARTIFACT_BY_AFFINITY[first], 2),
        second: lifecycle(ARTIFACT_BY_AFFINITY[second], 2),
      });
      expect(identity.form).toBe('dyad');
      expect(identity.dominantDyad).toBe(definition.id);
      expect(identity.dominantAffinity).toBeNull();
    }
  });

  it('derives a third-Affinity modifier without creating a named triad', () => {
    const identity = deriveCivilizationAffinityIdentity({
      flare: lifecycle('t1r01', 4),
      continuum: lifecycle('t1s01', 3),
      verdance: lifecycle('t1e01', 2),
    });
    expect(identity.form).toBe('dyad');
    expect(identity.dominantAffinity).toBe('flare');
    expect(identity.dominantDyad).toBe('flux');
    expect(identity.thirdAffinity).toBe('verdance');
  });

  it('preserves a genuinely plural profile instead of forcing a tie-break', () => {
    const identity = deriveCivilizationAffinityIdentity({
      flare: lifecycle('t1r01', 2),
      continuum: lifecycle('t1s01', 2),
      verdance: lifecycle('t1e01', 2),
    });
    expect(identity.form).toBe('plural');
    expect(identity.dominantAffinity).toBeNull();
    expect(identity.dominantDyad).toBeNull();
  });

  it('keeps historical identity stable while removing damaged capability from operation', () => {
    const operational = deriveCivilizationAffinityIdentity({
      flare: lifecycle('t1r01', 3, 'operational'),
    });
    const damaged = deriveCivilizationAffinityIdentity({
      flare: lifecycle('t1r01', 3, 'damaged'),
    });
    expect(damaged.historicalCounts).toEqual(operational.historicalCounts);
    expect(operational.operationalCounts.flare).toBe(1);
    expect(damaged.operationalCounts.flare).toBe(0);
  });

  it('ignores unknown and non-Artifact keys rather than treating Singularity as identity', () => {
    const identity = deriveCivilizationAffinityIdentity({
      singularity: lifecycle('singularity', 20),
    });
    expect(identity.form).toBe('unformed');
    expect(identity.historicalCounts).toEqual({
      flare: 0,
      radiance: 0,
      verdance: 0,
      continuum: 0,
      abyss: 0,
    });
  });
});

describe('Civilization scale, worlds, Conditions, and Stability', () => {
  const calibration: CivilizationStabilityCalibration = {
    id: 'test-calibration',
    baseline: 100,
    minimum: 0,
    maximum: 100,
    stableMinimum: 70,
    strainedMinimum: 40,
    unstableMinimum: 20,
  };

  it('starts with one Stable homeworld and separate scale concepts', () => {
    const state = createInitialCivilizationState();
    expect(Object.keys(state.worlds)).toEqual(['world:home']);
    expect(state.worlds[state.homeworldId].role).toBe('homeworld');
    expect(state.stability.band).toBe('stable');
    expect(state.stability.score).toBe(CIVILIZATION_STABILITY_CALIBRATION_V1.baseline);
    expect(state.stability.calibrationId).toBe(CIVILIZATION_STABILITY_CALIBRATION_V1.id);
    expect(state.scale.historicalMaturity).toBe('planetary');
    expect(state.scale.currentReach).toBe('planetary');
    expect(state.scale.literalKardashevType).toBe(0);
  });

  it('never regresses historical Maturity while current Reach may fracture', () => {
    const initial = createInitialCivilizationState();
    const evidence = {
      sourceType: 'blueprint' as const,
      sourceId: 'bp_test',
      turnCount: 4,
      historyEvidence: 'recorded' as const,
    };
    const galactic = advanceCivilizationMaturity(initial.scale, 'galactic', evidence);
    const nonRegressed = advanceCivilizationMaturity(galactic, 'stellar', evidence);
    const fractured = setCivilizationOperationalReach(
      nonRegressed,
      'planetary',
      'fractured',
      evidence,
    );
    expect(nonRegressed.historicalMaturity).toBe('galactic');
    expect(fractured.historicalMaturity).toBe('galactic');
    expect(fractured.currentReach).toBe('planetary');
    expect(fractured.currentReachCondition).toBe('fractured');
    const reconciled = reconcileCivilizationDerivedState({
      ...initial,
      scale: fractured,
    }, [], 5);
    expect(reconciled.scale.currentReach).toBe('planetary');
    expect(reconciled.scale.currentReachCondition).toBe('fractured');
  });

  it('adds local state without creating a per-world economy', () => {
    let state = createInitialCivilizationState();
    state = upsertCivilizationWorld(state, {
      id: 'world:outpost',
      role: 'settled_world',
      name: 'Outer Relay',
      state: 'active',
      establishedTurnCount: 5,
      stateChangedTurnCount: 5,
      conditionIds: [],
      historyEvidence: 'recorded',
    });
    state = upsertCivilizationEntity(state, {
      id: 'network:relay',
      kind: 'network',
      state: 'operational',
      worldId: 'world:outpost',
      sourceId: 'chronicle_test',
      establishedTurnCount: 5,
      stateChangedTurnCount: 5,
      conditionIds: [],
      historyEvidence: 'recorded',
    });
    state = applyCivilizationCondition(state, {
      id: 'condition:relay-isolated',
      type: 'isolated',
      coreType: 'isolated',
      target: { kind: 'network', id: 'network:relay' },
      source: { sourceType: 'scenario', sourceId: 'storm' },
      appliedTurnCount: 6,
      resolvedTurnCount: null,
      historyEvidence: 'recorded',
    });
    expect(state.entities['network:relay'].conditionIds).toEqual(['condition:relay-isolated']);
    state = resolveCivilizationCondition(state, 'condition:relay-isolated', 8);
    expect(state.entities['network:relay'].conditionIds).toEqual([]);
    expect(state.conditions['condition:relay-isolated'].resolvedTurnCount).toBe(8);
    expect(state.worlds['world:outpost']).not.toHaveProperty('production');
  });

  it('recalculates globally and recovers only when the underlying cause resolves', () => {
    const initial = createInitialCivilizationState().stability;
    const pressure = {
      id: 'pressure:storm',
      direction: 'pressure' as const,
      magnitude: 50,
      label: 'Relay isolation',
      source: { sourceType: 'scenario' as const, sourceId: 'storm' },
      target: { kind: 'network' as const, id: 'network:relay' },
      appliedTurnCount: 6,
      resolvedTurnCount: null,
      historyEvidence: 'recorded' as const,
    };
    const support = {
      id: 'support:archive',
      direction: 'support' as const,
      magnitude: 10,
      label: 'Distributed continuity archive',
      source: { sourceType: 'artifact' as const, sourceId: 't1s01' },
      target: null,
      appliedTurnCount: 3,
      resolvedTurnCount: null,
      historyEvidence: 'recorded' as const,
    };
    let stability = addCivilizationStabilityContributor(initial, pressure);
    stability = addCivilizationStabilityContributor(stability, support);
    stability = recalculateCivilizationStability(stability, calibration, 6);
    expect(stability.score).toBe(60);
    expect(stability.band).toBe('strained');

    stability = resolveCivilizationStabilityCause(
      stability,
      { sourceType: 'scenario', sourceId: 'storm' },
      8,
      calibration,
    );
    expect(stability.score).toBe(100);
    expect(stability.band).toBe('stable');
    expect(stability.contributors.find((entry) => entry.id === 'pressure:storm')?.resolvedTurnCount).toBe(8);
  });

  it('round-trips the expanded state through legacy normalization', () => {
    const game = initializeGame(
      [{ id: 'p1', name: 'Architect One' }, { id: 'p2', name: 'Architect Two' }],
      2,
    );
    let civilization = game.players[0].civilization;
    civilization = upsertCivilizationEntity(civilization, {
      id: 'project:test',
      kind: 'project',
      state: 'operational',
      worldId: civilization.homeworldId,
      sourceId: 'bp_test',
      establishedTurnCount: 2,
      stateChangedTurnCount: 2,
      conditionIds: [],
      historyEvidence: 'recorded',
    });
    game.players[0].civilization = civilization;

    const restored = normalizeState(JSON.parse(JSON.stringify(game)));
    expect(restored.players[0].civilization.entities['project:test']).toMatchObject({
      kind: 'project',
      state: 'operational',
      sourceId: 'bp_test',
    });
    expect(restored.players[0].civilization.worlds[restored.players[0].civilization.homeworldId].role)
      .toBe('homeworld');
  });
});

describe('calibrated structural Stability', () => {
  it('keeps archival neutral and translates Damage and Annihilation into proportionate pressure', () => {
    const state = createInitialCivilizationState();
    state.artifacts.t1r01 = lifecycle('t1r01', 1, 'damaged');
    state.artifacts.t1s01 = lifecycle('t1s01', 1, 'archived');
    state.artifacts.t1e01 = lifecycle('t1e01', 1, 'annihilated');
    const reconciled = reconcileCivilizationDerivedState(state, [], 7);

    expect(deriveCivilizationStructuralStabilityContributors(reconciled))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'structural:artifact:t1r01:damaged', magnitude: 5 }),
        expect.objectContaining({ id: 'structural:artifact:t1e01:annihilated', magnitude: 8 }),
      ]));
    expect(reconciled.stability.contributors.some((entry) => entry.id.includes('t1s01')))
      .toBe(false);
    expect(reconciled.stability.score).toBe(67);
    expect(reconciled.stability.band).toBe('strained');

    reconciled.artifacts.t1r01 = lifecycle('t1r01', 1, 'operational');
    const recovered = reconcileCivilizationDerivedState(reconciled, [], 8);
    expect(recovered.stability.score).toBe(72);
    expect(recovered.stability.band).toBe('stable');
  });

  it('treats homeworld loss as Crisis vulnerability without declaring defeat', () => {
    const state = createInitialCivilizationState();
    state.worlds[state.homeworldId] = {
      ...state.worlds[state.homeworldId],
      state: 'annihilated',
      stateChangedTurnCount: 9,
    };
    const reconciled = reconcileCivilizationDerivedState(state, [], 9);
    expect(reconciled.stability.score).toBe(15);
    expect(reconciled.stability.band).toBe('crisis');
    expect(reconciled).not.toHaveProperty('defeated');
  });
});

describe('derived Civilization Maturity and operational Reach', () => {
  const stellarFoundationIds = [
    't1s02',
    't1s04',
    't1r01',
    't1p04',
    't1e01',
    't1o01',
  ] as const;

  it('does not promote a civilization from one high-tier Artifact or depiction scale', () => {
    const state = createInitialCivilizationState();
    state.artifacts.t3r01 = lifecycle('t3r01', 1);
    const assessment = assessCivilizationMaturity(state);
    expect(assessment.candidateMaturity).toBe('planetary');
    expect(assessment.artifactImplementationCount).toBe(1);
    expect(assessment.policyId).toBe(CIVILIZATION_MATURITY_POLICY_ID);
  });

  it('recognizes a breadth-based interstellar foundation without requiring a Blueprint', () => {
    const state = createInitialCivilizationState();
    for (const artifactId of stellarFoundationIds) {
      state.artifacts[artifactId] = lifecycle(artifactId, 1);
    }
    const assessment = assessCivilizationMaturity(state);
    expect(assessment.interstellarCapabilityTriad).toBe(true);
    expect(assessment.capabilityDomains.length).toBeGreaterThanOrEqual(3);
    expect(assessment.candidateMaturity).toBe('stellar');
  });

  it('requires broad capability plus distributed stellar evidence for Galactic Maturity', () => {
    const state = createInitialCivilizationState();
    for (const artifact of ARTIFACT_CATALOG.filter((entry) => entry.tier === 1)) {
      state.artifacts[artifact.id] = lifecycle(artifact.id, 1);
    }
    const devices = [
      {
        blueprintId: 'bp_antimatter_detonator',
        ownerPlayerId: 'p1',
        slotIndex: 0,
        state: 'armed',
        presentationVariant: 'armored',
      },
      {
        blueprintId: 'bp_ascension_registry',
        ownerPlayerId: 'p1',
        slotIndex: 1,
        state: 'ready',
        presentationVariant: 'armored',
      },
    ] as const;
    const assessment = assessCivilizationMaturity(state, devices);
    expect(assessment.stellarProjectCount).toBe(2);
    expect(assessment.stellarFoundationSignalCount).toBeGreaterThanOrEqual(2);
    expect(assessment.candidateMaturity).toBe('galactic');
  });

  it('never regresses historical Maturity while operational Reach can fracture', () => {
    const state = createInitialCivilizationState();
    for (const artifact of ARTIFACT_CATALOG.filter((entry) => entry.tier === 1)) {
      state.artifacts[artifact.id] = lifecycle(artifact.id, 1, 'annihilated');
    }
    const devices = [
      {
        blueprintId: 'bp_antimatter_detonator',
        ownerPlayerId: 'p1',
        slotIndex: 0,
        state: 'spent',
        presentationVariant: 'armored',
      },
      {
        blueprintId: 'bp_ascension_registry',
        ownerPlayerId: 'p1',
        slotIndex: 1,
        state: 'spent',
        presentationVariant: 'armored',
      },
    ] as const;
    const reconciled = reconcileCivilizationDerivedState(state, devices, 20);
    expect(reconciled.scale.historicalMaturity).toBe('galactic');
    expect(reconciled.scale.currentReach).toBe('planetary');
    expect(reconciled.scale.currentReachCondition).toBe('fractured');
    expect(reconciled.scale.literalKardashevType).toBe(0);
    expect(reconciled.scale.historicalMaturityEvidence.at(-1)?.turnCount).toBe(20);
  });
});

describe('contextual Civilization resolution', () => {
  function snapshot(capabilities: CivilizationCapabilityId[] = []) {
    return buildCivilizationResolutionSnapshot(createInitialCivilizationState(), capabilities);
  }

  it('resolves deterministic automatic consequences without manufacturing a choice', () => {
    const result = resolveCivilizationEvent({
      eventId: 'event:auto',
      source: { sourceType: 'scenario', sourceId: 'solar-storm' },
      form: 'automatic',
      timing: 'trigger_window',
      pressureTags: ['exposure'],
      snapshot: snapshot(['artifact:field_containment']),
      trajectories: [{
        id: 'contain',
        label: 'Close the containment field',
        requirements: [{ type: 'capability_active', capabilityId: 'artifact:field_containment' }],
        uncertainty: null,
        successConsequences: [{ type: 'record_history', key: 'storm', value: 'contained' }],
        failureConsequences: [],
      }],
    });
    expect(result.status).toBe('resolved');
    expect(result.outcome).toBe('success');
    expect(result.explanation).toContain('Preparation determines the result; no random roll is used.');
  });

  it('waits for an explicit contextual choice inside the trigger window', () => {
    const result = resolveCivilizationEvent({
      eventId: 'event:choice',
      source: { sourceType: 'chronicle', sourceId: 'archive-schism' },
      form: 'contextual',
      timing: 'trigger_window',
      pressureTags: ['coordination'],
      snapshot: snapshot(),
      trajectories: [
        {
          id: 'federate',
          label: 'Federate the archives',
          requirements: [],
          uncertainty: null,
          successConsequences: [],
          failureConsequences: [],
        },
        {
          id: 'isolate',
          label: 'Preserve local custody',
          requirements: [],
          uncertainty: null,
          successConsequences: [],
          failureConsequences: [],
        },
      ],
    });
    expect(result.status).toBe('awaiting_choice');
    expect(result.evaluations.filter((entry) => entry.available)).toHaveLength(2);
  });

  it('changes available trajectories from operational capability rather than card tier', () => {
    const baseRequest = {
      eventId: 'event:modified',
      source: { sourceType: 'scenario' as const, sourceId: 'signal-loss' },
      form: 'state_modified' as const,
      timing: 'trigger_window' as const,
      pressureTags: ['isolation'] as const,
      trajectories: [{
        id: 'restore',
        label: 'Restore the distributed archive',
        requirements: [{ type: 'capability_active' as const, capabilityId: 'artifact:distributed_recovery' as const }],
        uncertainty: null,
        successConsequences: [],
        failureConsequences: [],
      }],
      selectedTrajectoryId: 'restore',
    };
    expect(resolveCivilizationEvent({ ...baseRequest, snapshot: snapshot() }).status)
      .toBe('no_available_trajectory');
    expect(resolveCivilizationEvent({
      ...baseRequest,
      snapshot: snapshot(['artifact:distributed_recovery']),
    }).status).toBe('resolved');
  });

  it('uses probability only when authored and exposes every applied modifier', () => {
    const result = resolveCivilizationEvent({
      eventId: 'event:uncertain',
      source: { sourceType: 'scenario', sourceId: 'unknown-signal' },
      form: 'automatic',
      timing: 'trigger_window',
      pressureTags: ['exposure'],
      snapshot: snapshot(['artifact:deep_sensor']),
      trajectories: [{
        id: 'observe',
        label: 'Observe without opening passage',
        requirements: [],
        uncertainty: {
          baseSuccessChance: 0.4,
          modifiers: [{
            id: 'sensor',
            delta: 0.25,
            label: 'Deep sensor coverage',
            requirements: [{ type: 'capability_active', capabilityId: 'artifact:deep_sensor' }],
          }],
        },
        successConsequences: [],
        failureConsequences: [],
      }],
    });
    expect(result.status).toBe('awaiting_uncertainty');
    expect(result.evaluations[0].successChance).toBeCloseTo(0.65);
    expect(result.evaluations[0].uncertaintyModifiers).toEqual([{
      id: 'sensor',
      delta: 0.25,
      label: 'Deep sensor coverage',
      applied: true,
    }]);
  });

  it('applies typed consequences while retaining inspectable history', () => {
    const initial = createInitialCivilizationState();
    const applied = applyCivilizationConsequences(initial, [
      {
        type: 'apply_condition',
        condition: {
          id: 'condition:home-disrupted',
          type: 'disrupted',
          coreType: 'disrupted',
          target: { kind: 'world', id: initial.homeworldId },
          source: { sourceType: 'scenario', sourceId: 'storm' },
          appliedTurnCount: 3,
          resolvedTurnCount: null,
          historyEvidence: 'recorded',
        },
      },
      { type: 'record_history', key: 'storm', value: 'homeworld disrupted' },
    ]);
    expect(applied.state.conditions['condition:home-disrupted'].resolvedTurnCount).toBeNull();
    expect(applied.state.worlds[initial.homeworldId].conditionIds)
      .toContain('condition:home-disrupted');
    expect(applied.history).toEqual({ storm: 'homeworld disrupted' });
  });

  it('persists a deduplicated authored event after applying its consequences', () => {
    const initial = createInitialCivilizationState();
    const resolution = resolveCivilizationEvent({
      eventId: 'event:ledger',
      source: { sourceType: 'scenario', sourceId: 'signal-loss' },
      form: 'automatic',
      timing: 'trigger_window',
      pressureTags: ['isolation'],
      snapshot: buildCivilizationResolutionSnapshot(initial),
      trajectories: [{
        id: 'endure',
        label: 'Endure the signal loss',
        requirements: [],
        uncertainty: null,
        successConsequences: [{ type: 'record_history', key: 'signal', value: 'endured' }],
        failureConsequences: [],
      }],
    });
    const first = applyCivilizationResolution(initial, resolution, 4, 'Signal loss endured');
    const repeated = applyCivilizationResolution(first.state, resolution, 4, 'Signal loss endured');
    expect(repeated.state.events).toHaveLength(1);
    expect(repeated.state.events[0]).toMatchObject({
      eventId: 'event:ledger',
      turnCount: 4,
      selectedTrajectoryId: 'endure',
      pressureTags: ['isolation'],
      summary: 'Signal loss endured',
      history: { signal: 'endured' },
    });
  });

  it('authors Blueprint events through the shared resolver without adding a second choice', () => {
    const result = resolveBlueprintCivilizationEventPolicy({
      eventId: 'event:foundry',
      civilization: createInitialCivilizationState(),
      blueprintId: 'bp_mantle_to_orbit_foundry',
      kind: 'foundry_sustainable',
      turnCount: 6,
      summary: 'Foundry completed a sustainable fabrication',
      historyValue: 't2r01',
    });
    expect(result.resolution).toMatchObject({
      status: 'resolved',
      form: 'contextual',
      selectedTrajectoryId: 'bp_mantle_to_orbit_foundry:foundry_sustainable',
    });
    expect(result.civilization.events.at(-1)?.summary)
      .toBe('Foundry completed a sustainable fabrication');
  });
});
