import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_CATALOG,
  ARTIFACT_MANIFESTATION_PROFILE_BY_ID,
  CIVILIZATION_DISTRICT_HARD_CAPACITY,
  CIVILIZATION_DYAD_DEFINITIONS,
  CIVILIZATION_SURFACE_DISTRICT_FAMILIES,
  STANDARD_AFFINITY_KEYS,
  createInitialCivilizationState,
  getCivilizationDyad,
  reconcileCivilizationDerivedState,
  resolveCivilizationDistrictPresentationDyad,
  type CivilizationArtifactLifecycleState,
  type CivilizationDyadId,
  type CivilizationState,
  type CivilizationSurfaceDistrictFamily,
} from '@workspace/game-types';

function lifecycle(
  artifactId: string,
  turnCount: number | null,
  implementationState: CivilizationArtifactLifecycleState['implementationState'] = 'operational',
): CivilizationArtifactLifecycleState {
  return {
    artifactId,
    firstMasteredTurnCount: turnCount,
    masteryCount: 1,
    implementationState,
    implementationStateChangedTurnCount: turnCount,
    implementationChangeSource: null,
    historyEvidence: 'recorded',
  };
}

function forge(
  state: CivilizationState,
  artifactId: string,
  turnCount: number,
  commitPresentation = false,
): CivilizationState {
  state.artifacts[artifactId] = lifecycle(artifactId, turnCount);
  return reconcileCivilizationDerivedState(
    state,
    [],
    turnCount,
    {},
    { commitPresentation },
  );
}

function commitTurn(state: CivilizationState, turnCount: number): CivilizationState {
  return reconcileCivilizationDerivedState(
    state,
    [],
    turnCount,
    {},
    { commitPresentation: true },
  );
}

function influence(
  values: Partial<Record<CivilizationDyadId, number>>,
): Record<CivilizationDyadId, number> {
  return Object.fromEntries(CIVILIZATION_DYAD_DEFINITIONS.map((definition) => [
    definition.id,
    values[definition.id] ?? 0,
  ])) as Record<CivilizationDyadId, number>;
}

const DISTRICT_DYAD_REACHABILITY_WITNESS_RUNS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 18, 19, 20, 21, 22,
  28, 30, 32, 33, 37, 40, 41, 42, 44, 48, 50, 51, 53, 60, 67, 69, 77, 80, 83, 243, 245,
  293, 328, 356, 567,
] as const;

function deterministicForgeOrder(ids: readonly string[], run: number): string[] {
  const order = [...ids];
  let seed = (0x9e3779b9 ^ run) >>> 0;
  for (let index = order.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swapIndex = Math.floor((seed / 4294967296) * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex]!, order[index]!];
  }
  return order;
}

/** Seed saved, compatible placements independently of the allocator under test. */
function savedDistrict(
  state: CivilizationState,
  family: CivilizationSurfaceDistrictFamily,
  residents: readonly (readonly [string, number | null])[],
  establishedTurnCount: number | null,
  instance = 0,
) {
  const districtId = `district:${family}:${instance}`;
  const affinities = [...new Set(residents.map(([id, turn]) => {
    const card = ARTIFACT_CATALOG.find((card) => card.id === id)!;
    expect(ARTIFACT_MANIFESTATION_PROFILE_BY_ID[card.id].compatiblePlacementFamilies).toContain(family);
    state.artifacts[id] = lifecycle(id, turn);
    state.districtIdentity.artifactAssignments[id] = districtId;
    return card.bonusAffinity;
  }))];
  const pair = affinities.length >= 2 ? getCivilizationDyad(affinities[0]!, affinities[1]!) : null;
  state.districtIdentity.districts[districtId] = {
    districtId, family, instance,
    residentArtifactIds: residents.map(([id]) => id),
    residentAffinities: affinities,
    foundingAffinities: pair ? [affinities[0]!, affinities[1]!] : affinities[0] ? [affinities[0]] : [],
    permanentDyad: pair?.id ?? null,
    softCapacity: 2, hardCapacity: 3,
    influence: pair ? residents.length : 0,
    establishedTurnCount,
    committedTurnCount: pair ? establishedTurnCount : null,
    historyEvidence: 'recorded',
  };
  return districtId;
}

describe('surface district compatibility policy', () => {
  it('gives every district family access to all five Affinities', () => {
    for (const family of CIVILIZATION_SURFACE_DISTRICT_FAMILIES) {
      const compatibleAffinities = new Set(ARTIFACT_CATALOG.flatMap((artifact) => {
        const profile = ARTIFACT_MANIFESTATION_PROFILE_BY_ID[artifact.id];
        return profile.nativeCameraScale === 'surface' &&
          profile.compatiblePlacementFamilies.includes(family)
          ? [artifact.bonusAffinity]
          : [];
      }));
      expect(compatibleAffinities, family).toEqual(new Set(STANDARD_AFFINITY_KEYS));
    }
  });

  it('classifies every compatible family and keeps scarce-family anchors compatible', () => {
    for (const profile of Object.values(ARTIFACT_MANIFESTATION_PROFILE_BY_ID)) {
      expect(Object.keys(profile.districtPlacementStrengthByFamily).sort())
        .toEqual([...profile.compatiblePlacementFamilies].sort());
      if (profile.districtAnchorFamily) {
        expect(profile.compatiblePlacementFamilies).toContain(profile.districtAnchorFamily);
      }
    }
    expect(ARTIFACT_MANIFESTATION_PROFILE_BY_ID.t1s02.districtAnchorFamily)
      .toBe('transit_terminus');
    expect(ARTIFACT_MANIFESTATION_PROFILE_BY_ID.t1o02.districtAnchorFamily)
      .toBe('coastal_margin');
  });

  it('opens scarce anchored families before common families can absorb their Artifacts', () => {
    let state = createInitialCivilizationState();
    state = forge(state, 't1r01', 1);
    state = forge(state, 't1s02', 2);
    state = forge(state, 't1o02', 3);

    expect(state.districtIdentity.artifactAssignments).toMatchObject({
      t1r01: 'district:industrial_district:0',
      t1s02: 'district:transit_terminus:0',
      t1o02: 'district:coastal_margin:0',
    });
  });

  it('makes every district-family and dyad combination reachable through legal forge histories', () => {
    const surfaceIds = ARTIFACT_CATALOG.filter((artifact) => (
      ARTIFACT_MANIFESTATION_PROFILE_BY_ID[artifact.id].nativeCameraScale === 'surface'
    )).map((artifact) => artifact.id);
    const reached = new Set<string>();

    for (const run of DISTRICT_DYAD_REACHABILITY_WITNESS_RUNS) {
      const state = createInitialCivilizationState();
      deterministicForgeOrder(surfaceIds, run).forEach((artifactId, index) => {
        state.artifacts[artifactId] = lifecycle(artifactId, index + 1);
      });
      const reconciled = reconcileCivilizationDerivedState(state, [], surfaceIds.length);
      Object.values(reconciled.districtIdentity.districts).forEach((district) => {
        if (district.permanentDyad) reached.add(`${district.family}:${district.permanentDyad}`);
      });
    }

    const expected = new Set(CIVILIZATION_SURFACE_DISTRICT_FAMILIES.flatMap((family) => (
      CIVILIZATION_DYAD_DEFINITIONS.map(({ id }) => `${family}:${id}`)
    )));
    expect(reached).toEqual(expected);
  });
});

describe('automatic district candidate ranking', () => {
  it('chooses Affinity fit in a later family over pairing in the first family', () => {
    let state = createInitialCivilizationState();
    savedDistrict(state, 'industrial_district', [['t1r01', 1]], 1);
    const expected = savedDistrict(state, 'civic_core', [['t1s07', 2]], 2);
    state = forge(state, 't1s04', 3);
    expect(state.districtIdentity.artifactAssignments.t1s04).toBe(expected);
    expect(state.manifestationAssignments['artifact:t1s04']?.placementFamily).toBe('civic_core');
  });

  it.each([
    { residents: [['t1r08', 1], ['t1r01', 2]], description: 'establishes' },
    { residents: [['t1r08', 1], ['t1s07', 2]], description: 'reinforces' },
  ] as const)('$description a pair in the third slot of a later-listed family', ({ residents }) => {
    let state = createInitialCivilizationState();
    const expected = savedDistrict(state, 'civic_core', residents, 1);
    state = forge(state, 't1s04', 3);
    expect(state.districtIdentity.artifactAssignments.t1s04).toBe(expected);
    expect(state.districtIdentity.districts[expected]).toMatchObject({
      permanentDyad: getCivilizationDyad('flare', 'continuum')!.id,
      residentArtifactIds: [...residents.map(([id]) => id), 't1s04'],
    });
  });

  it('balances family occupancy before establishment time when Affinity fit ties', () => {
    let state = createInitialCivilizationState();
    savedDistrict(state, 'civic_core', [['t1s07', 1]], 1);
    savedDistrict(state, 'civic_core', [['t1r08', 2]], 2, 1);
    const expected = savedDistrict(state, 'industrial_district', [['t1s02', 8]], 8);
    state = forge(state, 't1s04', 9);
    expect(state.districtIdentity.artifactAssignments.t1s04).toBe(expected);
  });

  it('fills the fuller eligible district within an equally occupied family', () => {
    let state = createInitialCivilizationState();
    savedDistrict(state, 'industrial_district', [['t1s02', 1]], 1);
    const expected = savedDistrict(state, 'industrial_district', [['t1r01', 2], ['t1s07', 3]], 2, 1);
    state = forge(state, 't1s04', 4);
    expect(state.districtIdentity.artifactAssignments.t1s04).toBe(expected);
  });

  it.each([8, null])('uses cross-family establishment time ahead of family preference (%s)', (later) => {
    let state = createInitialCivilizationState();
    savedDistrict(state, 'industrial_district', [['t1s02', later]], later);
    const expected = savedDistrict(state, 'civic_core', [['t1s07', 2]], 2);
    state = forge(state, 't1s04', 9);
    expect(state.districtIdentity.artifactAssignments.t1s04).toBe(expected);
  });

  it('uses authored family order and instance for exact ties, independent of object insertion order', () => {
    let state = createInitialCivilizationState();
    savedDistrict(state, 'civic_core', [['t1s07', 1]], 1);
    const expected = savedDistrict(state, 'industrial_district', [['t1s02', 1]], 1);
    const reversed = structuredClone(state);
    reversed.districtIdentity.districts = Object.fromEntries(Object.entries(reversed.districtIdentity.districts).reverse());
    expect(forge(reversed, 't1s04', 2).districtIdentity.artifactAssignments.t1s04).toBe(expected);
    expect(forge(state, 't1s04', 2).districtIdentity.artifactAssignments.t1s04).toBe(expected);

    state = createInitialCivilizationState();
    savedDistrict(state, 'industrial_district', [['t1s02', 1]], 1, 1);
    const olderInstance = savedDistrict(state, 'industrial_district', [['t1s07', 1]], 1, 0);
    expect(forge(state, 't1s04', 2).districtIdentity.artifactAssignments.t1s04).toBe(olderInstance);
  });

  it('reuses an empty saved district with unknown age instead of opening an equivalent new district', () => {
    const state = createInitialCivilizationState();
    const expected = savedDistrict(state, 'civic_core', [], null);
    expect(forge(state, 't1s04', 2).districtIdentity.artifactAssignments.t1s04).toBe(expected);
  });

  it.each([
    { residents: [['t1r01', 1], ['t1r07', 2]], incoming: 't1r03', description: 'same-Affinity third resident' },
    { residents: [['t1r01', 1], ['t1o05', 2]], incoming: 't1s04', description: 'non-founding third Affinity' },
    { residents: [['t1r01', 1], ['t1r07', 2], ['t1o05', 3]], incoming: 't1r08', description: 'fourth resident' },
  ] as const)('rejects a $description', ({ residents, incoming }) => {
    const state = createInitialCivilizationState();
    const full = savedDistrict(state, 'industrial_district', residents, 1);
    const next = forge(state, incoming, 4);
    expect(next.districtIdentity.artifactAssignments[incoming]).not.toBe(full);
    expect(next.districtIdentity.districts[full]?.residentArtifactIds).toEqual(residents.map(([id]) => id));
  });

  it('reserves saved capacity before a new dated Artifact can displace unknown-date residents', () => {
    let state = createInitialCivilizationState();
    const fixed = savedDistrict(state, 'industrial_district', [['t1r01', null], ['t1r07', null], ['t1o05', null]], null);
    const assignments = { ...state.districtIdentity.artifactAssignments };
    const district = structuredClone(state.districtIdentity.districts[fixed]);
    state = forge(state, 't1s04', 1);
    expect(state.districtIdentity.artifactAssignments).toMatchObject(assignments);
    expect(state.districtIdentity.artifactAssignments.t1s04).not.toBe(fixed);
    expect(state.districtIdentity.districts[fixed]?.permanentDyad).toBe(district?.permanentDyad);
    const reconnected = reconcileCivilizationDerivedState(structuredClone(state), [], 2);
    expect(reconnected.districtIdentity.artifactAssignments).toEqual(state.districtIdentity.artifactAssignments);
  });

  it('reconstructs missing district records in the existing physical placement family', () => {
    let state = createInitialCivilizationState();
    savedDistrict(state, 'industrial_district', [['t1s07', 1]], 1);
    state.artifacts.t1s04 = lifecycle('t1s04', null);
    const physical = {
      sourceId: 't1s04', sourceType: 'artifact' as const, nativeScene: 'surface' as const,
      placementFamily: 'civic_core' as const, socketId: 'surface:civic_core:0',
      assignmentTurnCount: null, historyEvidence: 'legacy_inferred' as const,
    };
    state.manifestationAssignments['artifact:t1s04'] = physical;
    state = reconcileCivilizationDerivedState(state, [], 2);
    const district = state.districtIdentity.districts[state.districtIdentity.artifactAssignments.t1s04!];
    expect(district?.family).toBe('civic_core');
    expect(district?.establishedTurnCount).toBeNull();
    expect(state.manifestationAssignments['artifact:t1s04']).toEqual(physical);
  });
});

describe('district-dyad civilization identity', () => {
  it('keeps one Affinity neutral, then permanently locks the first distinct pair', () => {
    let state = createInitialCivilizationState();
    state = forge(state, 't1r01', 1);
    const districtId = state.districtIdentity.artifactAssignments.t1r01;
    expect(districtId).toBe('district:industrial_district:0');
    expect(state.districtIdentity.districts[districtId!]).toMatchObject({
      residentArtifactIds: ['t1r01'],
      foundingAffinities: ['flare'],
      permanentDyad: null,
      influence: 0,
    });

    state = forge(state, 't1r07', 2);
    expect(state.districtIdentity.artifactAssignments.t1r07).toBe(districtId);
    expect(state.districtIdentity.districts[districtId!]).toMatchObject({
      residentArtifactIds: ['t1r01', 't1r07'],
      foundingAffinities: ['flare'],
      permanentDyad: null,
      influence: 0,
    });

    state = forge(state, 't1o05', 3);
    expect(state.districtIdentity.artifactAssignments.t1o05).toBe(districtId);
    expect(state.districtIdentity.districts[districtId!]).toMatchObject({
      foundingAffinities: ['flare', 'abyss'],
      permanentDyad: 'chrysalis',
      influence: 3,
      committedTurnCount: 3,
    });
    expect(state.districtIdentity.presentationDyad).toBeNull();

    state = commitTurn(state, 3);
    expect(state.districtIdentity.presentationDyad).toBe('chrysalis');
    expect(state.affinityIdentity.presentationDyad).toBe('chrysalis');
  });

  it('opens an underused compatible family without moving prior residents or rewriting a lock', () => {
    let state = createInitialCivilizationState();
    for (const [artifactId, turn] of [
      ['t1r01', 1],
      ['t1r07', 2],
      ['t1o05', 3],
      ['t1s04', 4],
    ] as const) {
      state = forge(state, artifactId, turn);
    }
    expect(state.districtIdentity.artifactAssignments).toMatchObject({
      t1r01: 'district:industrial_district:0',
      t1r07: 'district:industrial_district:0',
      t1o05: 'district:industrial_district:0',
      t1s04: 'district:civic_core:0',
    });
    expect(state.districtIdentity.districts['district:industrial_district:0']?.permanentDyad)
      .toBe('chrysalis');

    const reloaded = reconcileCivilizationDerivedState(
      structuredClone(state),
      [],
      5,
    );
    expect(reloaded.districtIdentity.artifactAssignments)
      .toEqual(state.districtIdentity.artifactAssignments);
    expect(reloaded.districtIdentity.districts['district:industrial_district:0']?.permanentDyad)
      .toBe('chrysalis');
  });

  it('keeps a two-Artifact lock through later Affinities, damage, and repair', () => {
    let state = createInitialCivilizationState();
    state = forge(state, 't1r01', 1);
    state = forge(state, 't1r04', 2);
    state = forge(state, 't1o05', 3);
    const lockedDistrictId = state.districtIdentity.artifactAssignments.t1r01!;
    expect(state.districtIdentity.districts[lockedDistrictId]).toMatchObject({
      residentArtifactIds: ['t1r01', 't1o05'],
      foundingAffinities: ['flare', 'abyss'],
      permanentDyad: 'chrysalis',
    });

    state = forge(state, 't1s04', 4);
    expect(state.districtIdentity.artifactAssignments.t1s04).not.toBe(lockedDistrictId);
    expect(state.districtIdentity.districts[lockedDistrictId]?.permanentDyad).toBe('chrysalis');

    state.artifacts.t1o05 = lifecycle('t1o05', 3, 'damaged');
    state = reconcileCivilizationDerivedState(state, [], 5);
    state.artifacts.t1o05 = lifecycle('t1o05', 3, 'operational');
    state = reconcileCivilizationDerivedState(state, [], 6);
    expect(state.districtIdentity.districts[lockedDistrictId]).toMatchObject({
      residentArtifactIds: ['t1r01', 't1o05'],
      foundingAffinities: ['flare', 'abyss'],
      permanentDyad: 'chrysalis',
    });
  });

  it('changes the surrounding civilization only at turn end while retaining older districts', () => {
    let state = createInitialCivilizationState();
    for (const [artifactId, turn] of [
      ['t1r01', 1],
      ['t1r07', 2],
      ['t1o05', 3],
    ] as const) {
      state = forge(state, artifactId, turn);
    }
    state = commitTurn(state, 3);
    expect(state.districtIdentity.presentationDyad).toBe('chrysalis');

    for (const [artifactId, turn] of [
      ['t1s04', 4],
      ['t1s01', 5],
      ['t1o07', 6],
      ['t1s03', 7],
      ['t1s05', 8],
      ['t1o08', 9],
    ] as const) {
      state = forge(state, artifactId, turn);
    }
    expect(state.districtIdentity.rawDominantDyad).toBe('echo');
    expect(state.districtIdentity.presentationDyad).toBe('chrysalis');
    expect(state.districtIdentity.districts['district:industrial_district:0']?.permanentDyad)
      .toBe('chrysalis');

    state = commitTurn(state, 9);
    expect(state.districtIdentity.presentationDyad).toBe('chrysalis');

    for (const [artifactId, turn] of [
      ['t1e02', 10],
      ['t1o03', 11],
      ['t1s08', 12],
      ['t1o06', 13],
      ['t1o01', 14],
    ] as const) {
      state = forge(state, artifactId, turn);
    }
    expect(state.districtIdentity.rawDominantDyad).toBe('echo');
    expect(state.districtIdentity.presentationDyad).toBe('chrysalis');

    state = commitTurn(state, 14);
    expect(state.districtIdentity.presentationDyad).toBe('echo');
    expect(state.affinityIdentity.presentationDyad).toBe('echo');
    expect(state.affinityIdentity.identityEpochs.map((epoch) => epoch.dyad))
      .toEqual(['chrysalis', 'echo']);
  });

  it('counts damaged residents exactly like operational residents', () => {
    let state = createInitialCivilizationState();
    for (const [artifactId, turn] of [
      ['t1r01', 1],
      ['t1r07', 2],
      ['t1o05', 3],
    ] as const) {
      state = forge(state, artifactId, turn);
    }
    const before = structuredClone(state.districtIdentity);
    state.artifacts.t1o05 = lifecycle('t1o05', 3, 'damaged');
    state = reconcileCivilizationDerivedState(state, [], 4);
    expect(state.districtIdentity.influenceByDyad).toEqual(before.influenceByDyad);
    expect(state.districtIdentity.totalInfluence).toBe(before.totalInfluence);
  });

  it('keeps manifested Blueprints outside district assignment and influence', () => {
    let state = createInitialCivilizationState();
    state.projects['project:0:bp_antimatter_detonator'] = {
      projectId: 'project:0:bp_antimatter_detonator',
      blueprintId: 'bp_antimatter_detonator',
      slotIndex: 0,
      status: 'manifested',
      matchedComponentIds: [],
      deviceState: 'armed',
      presentationVariant: 'armored',
      manifestedTurnCount: 3,
      stateChangedTurnCount: 3,
      historyEvidence: 'recorded',
    };
    state = reconcileCivilizationDerivedState(state, [], 3, {}, { commitPresentation: true });

    expect(state.districtIdentity.districts).toEqual({});
    expect(state.districtIdentity.artifactAssignments).toEqual({});
    expect(state.districtIdentity.totalInfluence).toBe(0);
    expect(state.districtIdentity.presentationDyad).toBeNull();
    expect(state.manifestationAssignments['blueprint:bp_antimatter_detonator']).toBeTruthy();
  });

  it('uses a strict 15-point presentation margin and preserves ties', () => {
    expect(resolveCivilizationDistrictPresentationDyad(
      influence({ chrysalis: 10, echo: 10 }),
      'chrysalis',
    )).toBe('chrysalis');
    expect(resolveCivilizationDistrictPresentationDyad(
      influence({ chrysalis: 8, echo: 11, bloom: 1 }),
      'chrysalis',
    )).toBe('chrysalis');
    expect(resolveCivilizationDistrictPresentationDyad(
      influence({ chrysalis: 7, echo: 11, bloom: 2 }),
      'chrysalis',
    )).toBe('echo');
  });

  it('fits every Surface Artifact within hard capacity and excludes higher scales', () => {
    let state = createInitialCivilizationState();
    ARTIFACT_CATALOG.forEach((artifact, index) => {
      state.artifacts[artifact.id] = lifecycle(artifact.id, index + 1);
    });
    state = reconcileCivilizationDerivedState(state, [], ARTIFACT_CATALOG.length);

    const surfaceIds = ARTIFACT_CATALOG.filter((artifact) => (
      ARTIFACT_MANIFESTATION_PROFILE_BY_ID[artifact.id].nativeCameraScale === 'surface'
    )).map((artifact) => artifact.id);
    const higherScaleIds = ARTIFACT_CATALOG.filter((artifact) => (
      ARTIFACT_MANIFESTATION_PROFILE_BY_ID[artifact.id].nativeCameraScale !== 'surface'
    )).map((artifact) => artifact.id);
    expect(surfaceIds).toHaveLength(45);
    expect(Object.keys(state.districtIdentity.artifactAssignments).sort()).toEqual(surfaceIds.sort());
    for (const artifactId of surfaceIds) {
      const district = state.districtIdentity.districts[state.districtIdentity.artifactAssignments[artifactId]!];
      const profile = ARTIFACT_MANIFESTATION_PROFILE_BY_ID[artifactId as keyof typeof ARTIFACT_MANIFESTATION_PROFILE_BY_ID];
      expect(profile.compatiblePlacementFamilies).toContain(district!.family);
      expect(state.manifestationAssignments[`artifact:${artifactId}`]?.placementFamily).toBe(district!.family);
    }
    expect(higherScaleIds.every(
      (artifactId) => state.districtIdentity.artifactAssignments[artifactId] === undefined,
    )).toBe(true);
    expect(Object.values(state.districtIdentity.districts).every(
      (district) => district.residentArtifactIds.length <= CIVILIZATION_DISTRICT_HARD_CAPACITY,
    )).toBe(true);
    expect(Object.keys(state.districtIdentity.districts).length).toBeLessThanOrEqual(18);
    expect(new Set(Object.values(state.districtIdentity.artifactAssignments)).size).toBeGreaterThan(10);
    expect(new Set(Object.values(state.districtIdentity.districts).map(({ family }) => family)))
      .toEqual(new Set(CIVILIZATION_SURFACE_DISTRICT_FAMILIES));
    // Scarce-family anchors guarantee Transit and Coastal appear in a saturated
    // city. The new landing scheduler reaches Coastal before Horizon Lantern.
    expect(state.districtIdentity.artifactAssignments.t1s02)
      .toBe('district:transit_terminus:0');
    expect(state.districtIdentity.artifactAssignments.t1s09)
      .toBe('district:coastal_margin:0');
  });
});
