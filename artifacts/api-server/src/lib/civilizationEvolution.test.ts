import { describe, expect, it, vi } from 'vitest';
import {
  ARTIFACT_CATALOG,
  ARTIFACT_MANIFESTATION_PROFILE_BY_ID,
  CIVILIZATION_ENVIRONMENT_VARIANTS,
  CIVILIZATION_MANIFESTATION_SOCKET_RESERVE_RATIO,
  createCivilizationEnvironmentSet,
  createInitialCivilizationState,
  deriveCivilizationAffinityIdentity,
  deriveCivilizationLegacyArtifactEligibility,
  evolveCivilizationAffinityIdentity,
  getCivilizationLegacyProgress,
  getCivilizationManifestationSocketCapacities,
  reconcileCivilizationDerivedState,
  type CivilizationArtifactLifecycleState,
  type CivilizationState,
} from '@workspace/game-types';
import { getReplayBoardSnapshot, initializeGame, normalizeState } from './gameEngine.js';

function implementation(
  artifactId: string,
  masteryCount: number,
  firstMasteredTurnCount: number,
): CivilizationArtifactLifecycleState {
  return {
    artifactId,
    firstMasteredTurnCount,
    masteryCount,
    implementationState: 'operational',
    implementationStateChangedTurnCount: firstMasteredTurnCount,
    implementationChangeSource: null,
    historyEvidence: 'recorded',
  };
}

function canonicalChrysalisFoundation(): CivilizationState {
  let state = createInitialCivilizationState();
  for (const [artifactId, turnCount] of [
    ['t1r01', 1],
    ['t1r07', 2],
    ['t1o05', 3],
  ] as const) {
    state.artifacts[artifactId] = implementation(artifactId, 1, turnCount);
    state = reconcileCivilizationDerivedState(state, [], turnCount);
  }
  return reconcileCivilizationDerivedState(
    state,
    [],
    3,
    {},
    { commitPresentation: true },
  );
}

function addMastery(
  state: CivilizationState,
  artifactId: string,
  turnCount: number,
): CivilizationState {
  const prior = state.artifacts[artifactId];
  state.artifacts[artifactId] = implementation(
    artifactId,
    (prior?.masteryCount ?? 0) + 1,
    prior?.firstMasteredTurnCount ?? turnCount,
  );
  return reconcileCivilizationDerivedState(state, [], turnCount);
}

function legacyReadyCivilization(): CivilizationState {
  let state = createInitialCivilizationState();
  for (const artifact of ARTIFACT_CATALOG.filter((entry) => entry.tier === 1)) {
    state.artifacts[artifact.id] = implementation(artifact.id, 1, 1);
  }
  for (const [slotIndex, blueprintId] of [
    'bp_antimatter_detonator', 'bp_ascension_registry',
  ].entries()) {
    const projectId = `project:${slotIndex}:${blueprintId}`;
    state.projects[projectId] = {
      projectId,
      blueprintId: blueprintId as 'bp_antimatter_detonator' | 'bp_ascension_registry',
      slotIndex,
      status: 'manifested',
      matchedComponentIds: [],
      deviceState: slotIndex === 0 ? 'armed' : 'ready',
      presentationVariant: 'armored',
      manifestedTurnCount: 10,
      stateChangedTurnCount: 10,
      historyEvidence: 'recorded',
    };
  }
  state = reconcileCivilizationDerivedState(state, [], 11);
  state.identityScales.galaxy = {
    ...state.identityScales.galaxy,
    status: 'forming',
    candidateDyad: 'vortex',
    committedDyad: null,
    evidence: [
      { artifactId: 't1r01', affinity: 'flare' },
      { artifactId: 't1p01', affinity: 'radiance' },
    ].map((entry, index) => ({
      ...entry,
      affinity: entry.affinity as 'flare' | 'radiance',
      evidenceId: `galaxy:${entry.artifactId}`,
      masteryOrdinal: 1,
      routedTurnCount: 10 + index,
      historyEvidence: 'recorded',
    })),
  };
  state.events = [{
    eventId: 'legacy:defining-trial',
    source: { sourceType: 'scenario', sourceId: 'legacy-trial' },
    turnCount: 11,
    form: 'automatic',
    pressureTags: ['disruption'],
    selectedTrajectoryId: 'endure',
    outcome: 'success',
    summary: 'Endured a defining trial.',
    history: {},
    outcomeSignals: [],
    adversity: null,
    historyEvidence: 'recorded',
  }];
  return state;
}

describe('damaged Artifact Legacy contributions', () => {
  it('suspends damaged Galaxy evidence until repair without erasing identity or Project credit', () => {
    const state = legacyReadyCivilization();
    const before = structuredClone(state);
    expect(deriveCivilizationLegacyArtifactEligibility(state).galacticIdentityReady).toBe(true);

    state.artifacts.t1p01.implementationState = 'damaged';
    const damagedEligibility = deriveCivilizationLegacyArtifactEligibility(state);
    const damagedProgress = getCivilizationLegacyProgress(state, 2, damagedEligibility);
    expect(damagedEligibility).toEqual({
      qualifyingMaturity: 'galactic',
      galacticIdentityReady: false,
      excludedDamagedArtifactIds: ['t1p01'],
    });
    expect(damagedProgress.achieved).toBe(false);
    expect(damagedProgress.completedProjectCount).toBe(2);
    expect(state.identityScales).toEqual(before.identityScales);
    expect(state.scale).toEqual(before.scale);
    expect(state.projects).toEqual(before.projects);

    state.artifacts.t1p01.implementationState = 'operational';
    expect(getCivilizationLegacyProgress(state, 2, deriveCivilizationLegacyArtifactEligibility(state)).achieved)
      .toBe(true);
    expect(state).toEqual(before);
  });

  it('allows remaining evidence to qualify despite unrelated or replaceable damage', () => {
    const state = legacyReadyCivilization();
    state.artifacts.t1e01.implementationState = 'damaged';
    expect(deriveCivilizationLegacyArtifactEligibility(state).galacticIdentityReady).toBe(true);

    state.identityScales.galaxy.evidence.push({
      ...state.identityScales.galaxy.evidence[1]!,
      evidenceId: 'galaxy:t1p02',
      artifactId: 't1p02',
    });
    state.artifacts.t1p01.implementationState = 'damaged';
    const eligibility = deriveCivilizationLegacyArtifactEligibility(state);
    expect(eligibility.excludedDamagedArtifactIds).toEqual(['t1e01', 't1p01']);
    expect(getCivilizationLegacyProgress(state, 2, eligibility).achieved).toBe(true);
  });

  it('excludes damaged breadth from Legacy maturity even when historical Maturity stays Galactic', () => {
    const state = legacyReadyCivilization();
    const retained = new Set([
      't1r01', 't1p01',
      ...Object.keys(state.artifacts).filter((id) => id !== 't1r01' && id !== 't1p01').slice(0, 9),
    ]);
    for (const artifact of Object.values(state.artifacts)) {
      if (!retained.has(artifact.artifactId)) artifact.implementationState = 'damaged';
    }
    const eligibility = deriveCivilizationLegacyArtifactEligibility(state);
    expect(eligibility.qualifyingMaturity).not.toBe('galactic');
    expect(eligibility.galacticIdentityReady).toBe(false);
    expect(state.scale.historicalMaturity).toBe('galactic');
    expect(getCivilizationLegacyProgress(state, 2, eligibility).completedProjectCount).toBe(2);
  });

  it('preserves the existing historical qualification when there is no damaged Artifact', () => {
    const state = legacyReadyCivilization();
    for (const artifact of Object.values(state.artifacts)) artifact.implementationState = 'annihilated';
    const existing = getCivilizationLegacyProgress(state);
    expect(existing.achieved).toBe(true);
    expect(getCivilizationLegacyProgress(state, 2, deriveCivilizationLegacyArtifactEligibility(state)))
      .toEqual(existing);
  });
});

describe('evolving Civilization portraits', () => {
  it('requires a consequential trial distinct from Blueprint manifestation history', () => {
    const civilization = {
      projects: [
        { blueprintId: 'bp_antimatter_detonator', status: 'manifested' },
        { blueprintId: 'bp_worldshield_covenant', status: 'manifested' },
      ],
      scale: { historicalMaturity: 'galactic' },
      stability: { band: 'stable' },
      identityScales: {
        galaxy: {
          status: 'forming',
          candidateDyad: 'vortex',
          committedDyad: null,
        },
      },
      events: [{
        eventId: 'blueprint:manifestation',
        outcome: 'success',
        pressureTags: ['disruption'],
        source: { sourceType: 'blueprint' },
      }],
    } as const;

    const blueprintOnly = getCivilizationLegacyProgress(civilization);
    expect(blueprintOnly.completedCriterionCount).toBe(3);
    expect(blueprintOnly.achieved).toBe(false);

    const afterTrial = getCivilizationLegacyProgress({
      ...civilization,
      events: [
        ...civilization.events,
        {
          eventId: 'event:containment-cascade',
          outcome: 'success',
          pressureTags: ['disruption'],
          source: { sourceType: 'scenario' },
        },
      ],
    });
    expect(afterTrial.completedCriterionCount).toBe(4);
    expect(afterTrial.achieved).toBe(true);
  });

  it('assigns four player seats visibly unique environments without replacement', () => {
    const playerIds = ['p1', 'p2', 'p3', 'p4'];
    const environments = createCivilizationEnvironmentSet('match-a', playerIds);

    expect(new Set(Object.values(environments).map((entry) => entry.variantId)).size).toBe(4);
    expect(Object.values(environments).every((entry) => entry.historyEvidence === 'recorded')).toBe(true);
    expect(createCivilizationEnvironmentSet('match-a', playerIds)).toEqual(environments);
  });

  it('preserves a world on normalization and gives a rematch seed a fresh set', () => {
    const players = CIVILIZATION_ENVIRONMENT_VARIANTS.map((_, index) => ({
      id: `p${index + 1}`,
      name: `Player ${index + 1}`,
    }));
    const first = normalizeState(initializeGame(
      players,
      4,
      undefined,
      'standard',
      { civilizationEnvironmentSeed: 'first-match' },
    ));
    const rejoined = normalizeState(structuredClone(first));
    const rematch = normalizeState(initializeGame(
      players,
      4,
      undefined,
      'standard',
      { civilizationEnvironmentSeed: 'rematch' },
    ));

    expect(rejoined.players.map((player) => player.civilization.environmentIdentity))
      .toEqual(first.players.map((player) => player.civilization.environmentIdentity));
    expect(rematch.players.map((player) => player.civilization.environmentIdentity.matchScopedSeed))
      .not.toEqual(first.players.map((player) => player.civilization.environmentIdentity.matchScopedSeed));
  });

  it('gives a production same-board rematch fresh worlds without changing its board', () => {
    const players = CIVILIZATION_ENVIRONMENT_VARIANTS.map((_, index) => ({
      id: `p${index + 1}`,
      name: `Player ${index + 1}`,
    }));
    const now = vi.spyOn(Date, 'now');
    const random = vi.spyOn(Math, 'random');
    now.mockReturnValueOnce(1_000).mockReturnValueOnce(2_000);
    random.mockReturnValueOnce(0.125).mockReturnValueOnce(0.875);

    try {
      const first = initializeGame(players, 4);
      const replayBoard = getReplayBoardSnapshot(first);
      const rematch = initializeGame(players, 4, undefined, 'standard', { replayBoard });

      expect(getReplayBoardSnapshot(rematch)).toEqual(replayBoard);
      expect(rematch.players.map((player) => player.civilization.environmentIdentity.matchScopedSeed))
        .not.toEqual(first.players.map((player) => player.civilization.environmentIdentity.matchScopedSeed));
      expect(new Set(rematch.players.map(
        (player) => player.civilization.environmentIdentity.variantId,
      )).size).toBe(4);
    } finally {
      now.mockRestore();
      random.mockRestore();
    }
  });

  it('migrates an old match deterministically by seat and marks reconstruction inferred', () => {
    const raw = initializeGame([
      { id: 'p1', name: 'One' },
      { id: 'p2', name: 'Two' },
    ], 2, undefined, 'standard', { civilizationEnvironmentSeed: 'legacy-source' });
    raw.startedAt = 4242;
    for (const player of raw.players) {
      player.forgedArtifactIds = ['t1r01', 't1e01'];
      player.artifactForgeCounts = { t1r01: 1, t1e01: 1 };
      delete (player as { civilization?: typeof player.civilization }).civilization;
    }

    const firstPass = normalizeState(structuredClone(raw));
    const secondPass = normalizeState(structuredClone(raw));

    expect(firstPass.players.map((player) => player.civilization.environmentIdentity))
      .toEqual(secondPass.players.map((player) => player.civilization.environmentIdentity));
    expect(firstPass.players.map((player) => player.civilization.districtIdentity))
      .toEqual(secondPass.players.map((player) => player.civilization.districtIdentity));
    expect(new Set(firstPass.players.map(
      (player) => player.civilization.environmentIdentity.variantId,
    )).size).toBe(2);
    expect(firstPass.players.every((player) => (
      player.civilization.environmentIdentity.historyEvidence === 'legacy_inferred' &&
      player.civilization.districtIdentity.historyEvidence === 'legacy_inferred' &&
      Object.values(player.civilization.districtIdentity.districts).every(
        (district) => district.historyEvidence === 'legacy_inferred',
      ) &&
      player.civilization.affinityIdentity.identityEpochs.every(
        (epoch) => epoch.historyEvidence === 'legacy_inferred',
      ) &&
      Object.values(player.civilization.identityScales).every(
        (identity) => identity.historyEvidence === 'legacy_inferred',
      )
    ))).toBe(true);
  });

  it('commits independent City, Planet, and System identities without rerouting evidence', () => {
    let state = createInitialCivilizationState();
    state = addMastery(state, 't1r01', 1);
    state = addMastery(state, 't1r01', 2);
    state = addMastery(state, 't1e01', 3);
    state = addMastery(state, 't1e01', 4);
    expect(state.identityScales.city).toMatchObject({
      status: 'committed',
      committedDyad: 'bloom',
      committedTurnCount: 4,
    });

    state = addMastery(state, 't1s01', 5);
    state = addMastery(state, 't1s01', 6);
    state = addMastery(state, 't1o01', 7);
    state = addMastery(state, 't1o01', 8);
    expect(state.identityScales.planet).toMatchObject({
      status: 'committed',
      committedDyad: 'echo',
      committedTurnCount: 8,
    });

    state = addMastery(state, 't1r01', 9);
    state = addMastery(state, 't1r01', 10);
    state = addMastery(state, 't1p01', 11);
    state = addMastery(state, 't1p01', 12);
    expect(state.identityScales.system).toMatchObject({
      status: 'committed',
      committedDyad: 'vortex',
      committedTurnCount: 12,
    });
    expect(state.identityScales.galaxy.status).toBe('plain');

    const routedBeforeReconnect = structuredClone(state.identityScales);
    const reconnected = reconcileCivilizationDerivedState(state, [], 13);
    expect(reconnected.identityScales).toEqual(routedBeforeReconnect);
    expect(Object.values(reconnected.identityScales).flatMap((identity) => identity.evidence)).toHaveLength(12);
  });

  it('lets Galaxy form during play but commits it only at Legacy completion', () => {
    let state = createInitialCivilizationState();
    for (const [artifactId, turnCount] of [
      ['t1r01', 1], ['t1r01', 2], ['t1e01', 3], ['t1e01', 4],
      ['t1s01', 5], ['t1s01', 6], ['t1o01', 7], ['t1o01', 8],
      ['t1r01', 9], ['t1r01', 10], ['t1p01', 11], ['t1p01', 12],
      ['t1s01', 13], ['t1s01', 14], ['t1e01', 15], ['t1e01', 16],
    ] as const) {
      state = addMastery(state, artifactId, turnCount);
    }

    expect(state.identityScales.galaxy).toMatchObject({
      status: 'forming',
      candidateDyad: 'lineage',
      committedDyad: null,
    });
    state.legacy = { completedTurnCount: 17, historyEvidence: 'recorded' };
    state = reconcileCivilizationDerivedState(state, [], 17);
    expect(state.identityScales.galaxy).toMatchObject({
      status: 'committed',
      committedDyad: 'lineage',
      committedTurnCount: 17,
    });
  });

  it('keeps Chrysalis district foundations when later Echo districts decisively dominate', () => {
    let state = canonicalChrysalisFoundation();
    expect(state.affinityIdentity.foundingDyad).toBe('chrysalis');
    expect(state.affinityIdentity.presentationDyad).toBe('chrysalis');

    for (const [artifactId, turnCount] of [
      ['t1s04', 4],
      ['t1s01', 5],
      ['t1o07', 6],
      ['t1s03', 7],
      ['t1s05', 8],
      ['t1o08', 9],
      ['t1e02', 10],
      ['t1o03', 11],
      ['t1s08', 12],
      ['t1o06', 13],
      ['t1o01', 14],
    ] as const) {
      state.artifacts[artifactId] = implementation(artifactId, 1, turnCount);
      state = reconcileCivilizationDerivedState(state, [], turnCount);
    }
    const echo = reconcileCivilizationDerivedState(
      state,
      [],
      14,
      {},
      { commitPresentation: true },
    );

    expect(echo.districtIdentity.influenceByDyad).toMatchObject({
      chrysalis: 3,
      echo: 7,
    });
    expect(echo.districtIdentity.districts['district:industrial_district:0']?.permanentDyad)
      .toBe('chrysalis');
    expect(echo.affinityIdentity.foundingDyad).toBe('chrysalis');
    expect(echo.affinityIdentity.presentationDyad).toBe('echo');
    expect(echo.affinityIdentity.identityEpochs.map((epoch) => epoch.dyad))
      .toEqual(['chrysalis', 'echo']);
    expect(echo.affinityIdentity.identityEpochs[0]?.endedTurnCount).toBe(14);
  });

  it('requires the challenger to exceed, not merely meet, the 15-point identity margin', () => {
    const founding = evolveCivilizationAffinityIdentity(
      deriveCivilizationAffinityIdentity({
        t1r01: implementation('t1r01', 5, 1),
        t1e01: implementation('t1e01', 5, 2),
      }),
      null,
      1,
    );
    const exactBoundary = evolveCivilizationAffinityIdentity(
      deriveCivilizationAffinityIdentity({
        t1r01: implementation('t1r01', 17, 1),
        t1e01: implementation('t1e01', 17, 2),
        t1s01: implementation('t1s01', 23, 3),
        t1o01: implementation('t1o01', 23, 4),
      }),
      founding,
      20,
    );
    const decisiveChallenge = evolveCivilizationAffinityIdentity(
      deriveCivilizationAffinityIdentity({
        t1r01: implementation('t1r01', 16, 1),
        t1e01: implementation('t1e01', 17, 2),
        t1s01: implementation('t1s01', 23, 3),
        t1o01: implementation('t1o01', 24, 4),
      }),
      exactBoundary,
      21,
    );

    expect(exactBoundary.presentationDyad).toBe('bloom');
    expect(exactBoundary.identityEpochs).toHaveLength(1);
    expect(decisiveChallenge.presentationDyad).toBe('echo');
    expect(decisiveChallenge.identityEpochs.map((epoch) => epoch.dyad)).toEqual(['bloom', 'echo']);
  });

  it('does not move an existing manifestation when later works are added', () => {
    const first = canonicalChrysalisFoundation();
    const initialAssignment = first.manifestationAssignments['artifact:t1r01'];
    expect(initialAssignment).toBeTruthy();

    first.artifacts.t2r01 = implementation('t2r01', 1, 12);
    first.artifacts.t3r01 = implementation('t3r01', 1, 13);
    const expanded = reconcileCivilizationDerivedState(first, [], 13);

    expect(expanded.manifestationAssignments['artifact:t1r01']).toEqual(initialAssignment);
    expect(new Set(Object.values(expanded.manifestationAssignments).map((entry) => entry.socketId)).size)
      .toBe(Object.keys(expanded.manifestationAssignments).length);
  });

  it('allocates one manifestation per unique Artifact regardless of mastery count', () => {
    const state = createInitialCivilizationState();
    state.artifacts.t1r01 = implementation('t1r01', 9, 1);
    const reconciled = reconcileCivilizationDerivedState(state, [], 9);

    expect(Object.keys(reconciled.manifestationAssignments)).toEqual(['artifact:t1r01']);
  });

  it('keeps complete profiles and at least 25% authored socket reserve', () => {
    expect(Object.values(ARTIFACT_MANIFESTATION_PROFILE_BY_ID).every((profile) => (
      profile.physicalFootprint.length > 0 &&
      profile.environmentalConstraints.length > 0 &&
      profile.motionBehavior.length > 0 &&
      Object.keys(profile.nonNativeRepresentationPolicy).length === 4
    ))).toBe(true);

    for (const capacity of getCivilizationManifestationSocketCapacities()) {
      expect(capacity.authoredCapacity).toBeGreaterThanOrEqual(
        Math.ceil(capacity.currentCompatibleSourceCount * CIVILIZATION_MANIFESTATION_SOCKET_RESERVE_RATIO),
      );
    }
  });
});
