/** Read-only, seeded engine audit. No database, live match, or runtime rules are changed. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import {
  ARTIFACT_CATALOG, ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID,
  ARTIFACT_FUNCTIONS_BY_ID, ARTIFACT_FUNCTION_DEFINITIONS,
  ARTIFACT_MANIFESTATION_PROFILE_BY_ID, CIVILIZATION_PRESSURE_RESPONSE_PROFILES,
  TRACE_PREPAREDNESS_CAPABILITY_IDS, RECURRENCE_PREPAREDNESS_CAPABILITY_IDS,
  TRIANGULATION_PREPAREDNESS_CAPABILITY_IDS, artifactHasEventFact,
  assessCivilizationMaturity,
  type ArtifactId, type ArtifactFunctionId,
} from '@workspace/game-types';
import { initializeGame, applyAction, normalizeState, type GameStateData } from '../lib/gameEngine.js';
import { chooseAiAction } from '../lib/aiPlayer.js';
import { drainSimulationPresentationEvents } from './simulationPresentation.js';

const cards = ARTIFACT_CATALOG;
const caps = (id: ArtifactId): readonly string[] => ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID[id];
const functions = (id: ArtifactId): readonly ArtifactFunctionId[] => ARTIFACT_FUNCTIONS_BY_ID[id];
const idsWithCaps = (ids: readonly string[]) => cards.filter(c => caps(c.id).some(id => ids.includes(id))).map(c => c.id);
const idsWithFunctions = (ids: readonly ArtifactFunctionId[]) => cards.filter(c => functions(c.id).some(id => ids.includes(id))).map(c => c.id);
function comparison(oldIds: readonly ArtifactId[], newIds: readonly ArtifactId[]) {
  return {
    oldCount: oldIds.length, proposedCount: newIds.length,
    added: newIds.filter(id => !oldIds.includes(id)), removed: oldIds.filter(id => !newIds.includes(id)),
    oldByTier: [1, 2, 3].map(tier => cards.filter(c => c.tier === tier && oldIds.includes(c.id)).length),
    proposedByTier: [1, 2, 3].map(tier => cards.filter(c => c.tier === tier && newIds.includes(c.id)).length),
  };
}
const cohorts = {
  signalClarity: comparison(idsWithCaps(['artifact:signal_interpretation']), idsWithFunctions(['function:information'])),
  synchronizationShear: comparison(cards.filter(c => artifactHasEventFact(c.id, 'dependency:distributed_synchronization')).map(c => c.id), idsWithFunctions(['function:coordination'])),
  shearSelfProtection: comparison(idsWithCaps(['artifact:resilient_computation']), idsWithFunctions(['function:protection'])),
  shearEffectiveTargets: comparison(
    cards.filter(c => artifactHasEventFact(c.id, 'dependency:distributed_synchronization') && !caps(c.id).includes('artifact:resilient_computation')).map(c => c.id),
    cards.filter(c => functions(c.id).includes('function:coordination') && !functions(c.id).includes('function:protection')).map(c => c.id),
  ),
  trace: comparison(idsWithCaps(TRACE_PREPAREDNESS_CAPABILITY_IDS), idsWithFunctions(['function:coordination', 'function:security'])),
  recurrence: comparison(idsWithCaps(RECURRENCE_PREPAREDNESS_CAPABILITY_IDS), idsWithFunctions(['function:information'])),
  triangulation: comparison(idsWithCaps(TRIANGULATION_PREPAREDNESS_CAPABILITY_IDS), idsWithFunctions(['function:information', 'function:coordination'])),
};
const proposedPressureFunctions: Record<string, { primary: ArtifactFunctionId[]; supporting: ArtifactFunctionId[] }> = {
  disruption: { primary: ['function:protection'], supporting: ['function:information', 'function:coordination'] },
  isolation: { primary: ['function:mobility', 'function:coordination'], supporting: ['function:ecology', 'function:security'] },
  proliferation: { primary: ['function:protection'], supporting: ['function:ecology', 'function:information'] },
  exposure: { primary: ['function:security'], supporting: ['function:information', 'function:protection'] },
  attrition: { primary: ['function:materials', 'function:ecology'], supporting: ['function:energy', 'function:protection'] },
  coordination: { primary: ['function:coordination'], supporting: ['function:information', 'function:security'] },
  transformation: { primary: ['function:materials', 'function:ecology'], supporting: ['function:energy', 'function:protection'] },
};

function random(seed: number) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let x = Math.imul(seed ^ seed >>> 15, 1 | seed);
    x ^= x + Math.imul(x ^ x >>> 7, 61 | x);
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
}
function placementSnapshot(state: GameStateData) {
  return state.players.map(p => ({
    assignments: p.civilization.districtIdentity.artifactAssignments,
    pairs: Object.values(p.civilization.districtIdentity.districts).map(d => [d.districtId, d.permanentDyad, d.foundingAffinities]),
    manifestations: p.civilization.manifestationAssignments,
  }));
}
let inspectedSurfaceResidents = 0;
let secondaryFamilySelections = 0;
const observedArtifacts = new Set<string>();
const maturitySamples: Record<string, number> = {};
function inspect(state: GameStateData) {
  for (const player of state.players) {
    const civ = player.civilization;
    for (const district of Object.values(civ.districtIdentity.districts)) {
      assert(district.residentArtifactIds.length <= 3, 'District over capacity');
      if (district.residentArtifactIds.length === 3) {
        assert(district.permanentDyad, 'Third resident without a pair');
        assert(district.residentAffinities.every(a => (district.foundingAffinities as readonly string[]).includes(a)), 'Third Affinity escaped founding pair');
      }
      for (const id of district.residentArtifactIds) {
        const profile = ARTIFACT_MANIFESTATION_PROFILE_BY_ID[id as ArtifactId];
        assert((profile.compatiblePlacementFamilies as readonly string[]).includes(district.family), 'Incompatible family');
        assert.equal(civ.districtIdentity.artifactAssignments[id], district.districtId);
        assert.equal(civ.manifestationAssignments[`artifact:${id}`]?.placementFamily, district.family);
        inspectedSurfaceResidents++;
        observedArtifacts.add(id);
        if (district.family !== profile.compatiblePlacementFamilies[0]) secondaryFamilySelections++;
      }
    }
    for (const artifact of Object.values(civ.artifacts)) {
      const profile = ARTIFACT_MANIFESTATION_PROFILE_BY_ID[artifact.artifactId as ArtifactId];
      if (artifact.masteryCount > 0 && profile?.nativeCameraScale === 'surface') {
        assert(civ.districtIdentity.artifactAssignments[artifact.artifactId], 'Unplaced Surface Artifact');
      }
    }
    const mastered = Object.values(civ.artifacts).filter(a => a.masteryCount > 0);
    const breadth = new Set(mastered.flatMap(a => functions(a.artifactId as ArtifactId))).size;
    const old = assessCivilizationMaturity(civ);
    // Breadth-only shadow comparison: independent foundation/anchor requirements are unchanged.
    const stellarOld = old.stellarCriteria.filter(c => c.id.includes('breadth')).every(c => c.satisfied);
    const galacticOld = old.galacticCriteria.filter(c => c.id.includes('breadth')).every(c => c.satisfied);
    const key = `${mastered.length}:${breadth}:${Number(stellarOld)}:${Number(galacticOld)}`;
    maturitySamples[key] = (maturitySamples[key] ?? 0) + 1;
  }
}
const games = [];
const originalRandom = Math.random;
const originalNow = Date.now;
const auditEpoch = Date.UTC(2026, 8, 29);
let auditNow = auditEpoch;
try {
  // Environment generation and event receipts also depend on time. Pin all
  // external inputs so future old/new rule comparisons can replay this cohort.
  Date.now = () => auditNow;
  for (const playerCount of [2, 3, 4]) {
    for (const seed of [17, 39, 83, 121]) {
      Math.random = random(seed * 10 + playerCount);
      auditNow = auditEpoch + (seed * 10 + playerCount) * 1_000_000;
      const environmentSeed = `function-audit-v1:${seed}:${playerCount}`;
      const state = initializeGame(
        Array.from({ length: playerCount }, (_, i) => ({ id: `qa-${i}`, name: `QA ${i}` })),
        playerCount, undefined, undefined, { civilizationEnvironmentSeed: environmentSeed },
      );
      const actionCounts: Record<string, number> = {};
      let steps = 0;
      while (state.phase !== 'finished' && steps < 600) {
        auditNow += 1_000;
        drainSimulationPresentationEvents(state);
        if ((state.phase as string) === 'finished') break;
        const player = state.players[state.currentPlayerIndex];
        const action = chooseAiAction(state, player.playerId, 'hard');
        const before = structuredClone(placementSnapshot(state));
        const result = applyAction(state, player.playerId, action);
        assert(result.success, `Seed ${seed}/${playerCount}, ${action.type}: ${result.error}`);
        actionCounts[action.type] = (actionCounts[action.type] ?? 0) + 1;
        inspect(state);
        const after = placementSnapshot(state);
        before.forEach((saved, i) => {
          for (const [id, district] of Object.entries(saved.assignments)) assert.equal(after[i].assignments[id], district, 'Existing placement moved');
          for (const [id, pair, founding] of saved.pairs) {
            if (pair) assert.deepEqual(after[i].pairs.find(d => d[0] === id), [id, pair, founding], 'Founding pair changed');
          }
        });
        const restored = normalizeState(JSON.parse(JSON.stringify(state)));
        assert.deepEqual(placementSnapshot(restored), after, 'Reconnect changed placements or pairs');
        steps++;
      }
      assert.equal(state.phase, 'finished', `Seed ${seed}/${playerCount} did not finish`);
      games.push({ seed, playerCount, environmentSeed, startedAt: state.startedAt, turns: state.turnCount, actions: actionCounts, districts: state.players.map(p => Object.values(p.civilization.districtIdentity.districts)) });
    }
  }
} finally {
  Math.random = originalRandom;
  Date.now = originalNow;
}

const report = {
  auditVersion: 'function-audit-v1',
  runtimeVersion: process.version,
  scope: 'Seeded fresh in-memory matches using production engine and AI. Does not validate browser visuals, audio, or wall-clock animation performance.',
  functionDistribution: ARTIFACT_FUNCTION_DEFINITIONS.map(f => ({ id: f.id, byTier: [1, 2, 3].map(t => cards.filter(c => c.tier === t && functions(c.id).includes(f.id)).length) })),
  cohorts,
  pressureProfiles: Object.entries(CIVILIZATION_PRESSURE_RESPONSE_PROFILES).map(([id, p]) => ({
    id, proposal: proposedPressureFunctions[id],
    primary: comparison(idsWithCaps(p.primaryCapabilityIds), idsWithFunctions(proposedPressureFunctions[id].primary)),
    supporting: comparison(idsWithCaps(p.supportingCapabilityIds), idsWithFunctions(proposedPressureFunctions[id].supporting)),
  })),
  inspectedSurfaceResidents, secondaryFamilySelections, distinctSurfaceArtifactsObserved: observedArtifacts.size,
  breadthOnlyComparison: [[3, 5], [4, 6], [4, 7], [5, 7]].map(([stellar, galactic]) => {
    let samples = 0, stellarDifferences = 0, galacticDifferences = 0;
    for (const [key, observations] of Object.entries(maturitySamples)) {
      const [count, breadth, oldStellar, oldGalactic] = key.split(':').map(Number);
      samples += observations;
      if (Boolean(oldStellar) !== (count >= 6 && breadth >= stellar)) stellarDifferences += observations;
      if (Boolean(oldGalactic) !== (count >= 12 && breadth >= galactic)) galacticDifferences += observations;
    }
    return { stellarFunctionThreshold: stellar, galacticFunctionThreshold: galactic, samples, stellarDifferences, galacticDifferences };
  }),
  maturitySamples, games,
};
const destination = process.argv[2];
if (!destination) throw new Error('Pass an output JSON path');
writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ games: games.length, inspectedSurfaceResidents, secondaryFamilySelections, distinctSurfaceArtifactsObserved: observedArtifacts.size, cohorts }, null, 2));
