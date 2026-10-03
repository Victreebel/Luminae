/** Read-only visual-capacity audit. Never changes game rules or saved matches. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ARTIFACT_CATALOG,
  ARTIFACT_MANIFESTATION_PROFILE_BY_ID,
  CIVILIZATION_SURFACE_DISTRICT_FAMILIES,
  STANDARD_AFFINITY_KEYS,
  createInitialCivilizationState,
  reconcileCivilizationDerivedState,
  reconcileCivilizationDistrictIdentityState,
  type ArtifactId,
  type CivilizationDistrictInstance,
} from '@workspace/game-types';
import { CHRYSALIS_SURFACE_DISTRICT_PARCELS } from '../src/lib/civilizationSurfaceDistrictPlan.ts';

const outputPath = process.argv[2];
assert(outputPath, 'Provide an output JSON path');
const randomRuns = Number(process.argv[3] ?? 4096);
assert(Number.isInteger(randomRuns) && randomRuns >= 0 && randomRuns <= 100_000);
const surfaceCards = ARTIFACT_CATALOG.filter(({ id }) => ARTIFACT_MANIFESTATION_PROFILE_BY_ID[id].nativeCameraScale === 'surface');
const surfaceIds = surfaceCards.map(({ id }) => id);
const surfaceProfiles = new Map<string, (typeof ARTIFACT_MANIFESTATION_PROFILE_BY_ID)[ArtifactId]>(
  surfaceIds.map((id) => [id, ARTIFACT_MANIFESTATION_PROFILE_BY_ID[id]]),
);
const lifecycle = (artifactId: ArtifactId, turn: number) => ({
  artifactId, firstMasteredTurnCount: turn, masteryCount: 1,
  implementationState: 'operational' as const, implementationStateChangedTurnCount: turn,
  implementationChangeSource: null, historyEvidence: 'recorded' as const,
});
const parcelKey = (district: Pick<CivilizationDistrictInstance, 'family' | 'instance'>) => `${district.family}:${district.instance}`;
const physicalKeys = new Set(CHRYSALIS_SURFACE_DISTRICT_PARCELS.map(parcelKey));

function allocate(order: readonly ArtifactId[]) {
  const state = createInitialCivilizationState();
  order.forEach((id, index) => { state.artifacts[id] = lifecycle(id, index + 1); });
  return Object.values(reconcileCivilizationDistrictIdentityState(state, order.length).districts);
}

function assignmentSnapshot(districts: readonly CivilizationDistrictInstance[]) {
  return districts.map(({ districtId, family, instance, residentArtifactIds, permanentDyad }) => ({
    districtId, family, instance, residentArtifactIds, permanentDyad,
  })).sort((a, b) => a.districtId.localeCompare(b.districtId));
}

function replay(order: readonly ArtifactId[]) {
  let state = createInitialCivilizationState();
  let previousAssignments: Record<string, string> = {};
  const lockedDyads = new Map<string, CivilizationDistrictInstance['permanentDyad']>();
  for (const [index, id] of order.entries()) {
    state.artifacts[id] = lifecycle(id, index + 1);
    state = reconcileCivilizationDerivedState(state, [], index + 1, {}, { commitPresentation: true });
    for (const [resident, district] of Object.entries(previousAssignments)) {
      assert.equal(state.districtIdentity.artifactAssignments[resident], district, 'Existing resident moved');
    }
    previousAssignments = { ...state.districtIdentity.artifactAssignments };
    const seenResidents = new Set<string>();
    for (const district of Object.values(state.districtIdentity.districts)) {
      assert(district.residentArtifactIds.length <= district.hardCapacity, 'Overfull district');
      assert.equal(new Set(district.residentArtifactIds).size, district.residentArtifactIds.length);
      if (lockedDyads.has(district.districtId)) {
        assert.equal(district.permanentDyad, lockedDyads.get(district.districtId), 'Locked dyad changed');
      }
      if (district.permanentDyad) lockedDyads.set(district.districtId, district.permanentDyad);
      for (const resident of district.residentArtifactIds) {
        assert(!seenResidents.has(resident), 'Resident belongs to more than one district');
        seenResidents.add(resident);
        const profile = surfaceProfiles.get(resident);
        assert(profile, 'Unknown Surface resident');
        assert(profile.compatiblePlacementFamilies.includes(district.family), 'Incompatible family');
        assert.equal(state.districtIdentity.artifactAssignments[resident], district.districtId);
      }
    }
    assert.deepEqual([...seenResidents].sort(), order.slice(0, index + 1).sort(), 'Forged resident lost');
  }
  const districts = Object.values(state.districtIdentity.districts);
  assert.deepEqual(assignmentSnapshot(districts), assignmentSnapshot(allocate(order)), 'Batch allocation differs from chronological replay');
  return districts;
}

function shuffled(run: number): ArtifactId[] {
  const order = [...surfaceIds];
  let seed = (0x9e3779b9 ^ run) >>> 0;
  for (let index = order.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const other = Math.floor(seed / 4294967296 * (index + 1));
    [order[index], order[other]] = [order[other]!, order[index]!];
  }
  return order;
}

function permutations<T>(values: readonly T[]): T[][] {
  return values.length === 0 ? [[]] : values.flatMap((value, index) =>
    permutations(values.filter((_, candidate) => candidate !== index)).map((rest) => [value, ...rest]));
}

const cases: Array<{ label: string; order: ArtifactId[] }> = [
  { label: 'catalog', order: [...surfaceIds] }, { label: 'reverse', order: [...surfaceIds].reverse() },
];
for (const affinities of permutations(STANDARD_AFFINITY_KEYS)) {
  for (const reverse of [false, true]) {
    cases.push({ label: `affinity-blocks:${affinities.join('-')}:${reverse ? 'reverse' : 'catalog'}`, order: affinities.flatMap((affinity) => {
      const ids = surfaceCards.filter(({ bonusAffinity }) => bonusAffinity === affinity).map(({ id }) => id);
      return reverse ? ids.reverse() : ids;
    }) });
  }
}
for (let run = 0; run < randomRuns; run += 1) cases.push({ label: `seed:${run}`, order: shuffled(run) });

const stats = Object.fromEntries(CIVILIZATION_SURFACE_DISTRICT_FAMILIES.map((family) => [family, {
  family,
  authoredInstances: CHRYSALIS_SURFACE_DISTRICT_PARCELS.filter((parcel) => parcel.family === family).length,
  maximumObservedInstances: 0,
  casesWithMissingParcels: 0,
  maximumWitness: null as null | { label: string; order: ArtifactId[]; districts: CivilizationDistrictInstance[] },
}]));
const missing = new Map<string, { label: string; order: ArtifactId[]; district: CivilizationDistrictInstance }>();
const seen = new Set<string>();
let unsupportedCases = 0, maximumTotalDistricts = 0, replayedCases = 0;
for (const candidate of cases) {
  const key = candidate.order.join(',');
  if (seen.has(key)) continue;
  seen.add(key);
  const districts = allocate(candidate.order);
  maximumTotalDistricts = Math.max(maximumTotalDistricts, districts.length);
  if (seen.size <= 32) { replay(candidate.order); replayedCases += 1; }
  if (districts.some((district) => !physicalKeys.has(parcelKey(district)))) unsupportedCases += 1;
  for (const family of CIVILIZATION_SURFACE_DISTRICT_FAMILIES) {
    const group = districts.filter((district) => district.family === family);
    const record = stats[family]!;
    if (group.length > record.maximumObservedInstances) {
      record.maximumObservedInstances = group.length;
      record.maximumWitness = { ...candidate, districts: group };
    }
    if (group.some((district) => !physicalKeys.has(parcelKey(district)))) record.casesWithMissingParcels += 1;
    for (const district of group) {
      const districtKey = parcelKey(district);
      if (physicalKeys.has(districtKey) || missing.has(districtKey)) continue;
      missing.set(districtKey, { ...candidate, district });
    }
  }
}

const witnesses = [...missing.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, witness]) => {
  let order = [...witness.order];
  // Reduce a concrete witness without claiming a globally shortest history.
  for (let index = 0; index < order.length;) {
    const candidate = order.filter((_, candidateIndex) => candidateIndex !== index);
    if (allocate(candidate).some((district) => parcelKey(district) === key)) {
      order = candidate;
      index = 0;
    } else index += 1;
  }
  const districts = replay(order);
  const district = districts.find((entry) => parcelKey(entry) === key)!;
  assert(district, 'Minimized witness lost its target');
  return { key, discoveredIn: witness.label, order, district, districts, verifiedChronologically: true };
});
for (const record of Object.values(stats)) if (record.maximumWitness) replay(record.maximumWitness.order);

const sourcePaths = [
  'lib/game-types/src/index.ts', 'lib/game-types/src/artifact-manifestations.ts', 'lib/game-types/src/artifacts.ts',
  'artifacts/luminae/src/lib/civilizationSurfaceDistrictPlan.ts',
  'artifacts/luminae/scripts/audit-district-parcel-coverage.ts',
];
const sourceHashes = Object.fromEntries(sourcePaths.map((relative) => [relative,
  createHash('sha256').update(readFileSync(new URL(`../../../${relative}`, import.meta.url))).digest('hex'),
]));
const report = {
  audit: 'district-parcel-coverage-v1', runtime: process.version, sourceHashes,
  method: 'Surface-only dated forge orders; shared allocator; immutable existing assignments. Not a full match/action/economy simulation.',
  scope: 'Observed maxima are lower bounds on required coverage, not exhaustive reachability maxima. Samples are not gameplay probabilities.',
  surfaceArtifactCount: surfaceIds.length, authoredParcelCount: physicalKeys.size,
  requestedSeededOrders: randomRuns, uniqueOrders: seen.size, unsupportedCases, maximumTotalDistricts,
  replayedInitialCases: replayedCases, replayedFamilyMaxima: Object.keys(stats).length, replayedMissingWitnesses: witnesses.length,
  families: Object.values(stats), missingParcels: witnesses,
};
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: resolve(outputPath),
  uniqueOrders: seen.size, unsupportedCases, maximumTotalDistricts,
  families: report.families.map(({ maximumWitness: _witness, ...record }) => record),
  missingParcels: witnesses.map(({ key, order }) => ({ key, forgeCount: order.length, order })),
}, null, 2));
