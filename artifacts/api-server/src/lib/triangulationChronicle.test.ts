import { describe, expect, it } from 'vitest';
import {
  TRIANGULATION_COORDINATION_ARCHITECTURES,
  TRIANGULATION_OUTCOME_IDS,
  TRIANGULATION_REFERENCE_CIVILIZATIONS,
  triangulationOutcomeId,
  triangulationOutcomeResult,
  validateChronicleDefinitionAuthoring,
} from '@workspace/game-types';
import {
  applyAction,
  configureTriangulationScenario,
  initializeGame,
  normalizeState,
  type GameStateData,
} from './gameEngine.js';
import { chooseAiAction } from './aiPlayer.js';
import { TRIANGULATION_CHRONICLE_DEFINITION } from './triangulationChronicle.js';
import { buildTriangulationHistoricalRecords } from './triangulationChronicleRecords.js';

function makeTriangulation(runKind: 'primary' | 'rehearsal' = 'primary'): GameStateData {
  const state = normalizeState(initializeGame([
    { id: 'architect', name: 'Architect' },
    { id: 'myria', name: 'Myriad Groves' },
    { id: 'vesper', name: 'Vesper Choir' },
  ], 3));
  state.activeLuminaries = [];
  configureTriangulationScenario(
    state,
    'architect',
    'myria',
    'vesper',
    runKind,
    ['At Vey, you made uncertainty public.'],
  );
  return state;
}

function openAlignment(state: GameStateData): void {
  const scenario = state.triangulationScenario!;
  scenario.architectCoreActions = scenario.alignmentDueAfterActions - 1;
  for (const affinity of ['flare', 'continuum', 'verdance', 'abyss', 'radiance'] as const) {
    state.affinityWell[affinity] = 20;
  }
  expect(applyAction(state, 'architect', {
    type: 'harness_three_affinities', affinities: { flare: 1 },
  })).toEqual({ success: true });
  expect(scenario.phase).toBe('awaiting_alignment');
}

function emptyForge(state: GameStateData): void {
  state.forgeTier1 = []; state.forgeTier2 = []; state.forgeTier3 = [];
  state.deckTier1 = []; state.deckTier2 = []; state.deckTier3 = [];
}

describe('The Triangulation authoring registry', () => {
  it('authors all nine outcomes with invariant non-power entitlement', () => {
    expect(validateChronicleDefinitionAuthoring(TRIANGULATION_CHRONICLE_DEFINITION)).toEqual([]);
    expect(TRIANGULATION_CHRONICLE_DEFINITION.released).toBe(false);
    expect(TRIANGULATION_CHRONICLE_DEFINITION.outcomes.map((outcome) => outcome.outcomeId).sort())
      .toEqual([...TRIANGULATION_OUTCOME_IDS].sort());
    expect(new Set(TRIANGULATION_CHRONICLE_DEFINITION.outcomes.map((outcome) =>
      JSON.stringify(outcome.baselineEntitlements),
    )).size).toBe(1);
    expect(TRIANGULATION_CHRONICLE_DEFINITION.outcomes.every((outcome) =>
      outcome.lumiiMemories.length === 1,
    )).toBe(true);
  });

  it('maps every architecture and reference deterministically, with only Deme as victory', () => {
    const mapped = TRIANGULATION_COORDINATION_ARCHITECTURES.flatMap((architecture) =>
      TRIANGULATION_REFERENCE_CIVILIZATIONS.map((reference) => ({
        id: triangulationOutcomeId(architecture, reference),
        result: triangulationOutcomeResult(reference),
        reference,
      })),
    );
    expect(mapped.map((entry) => entry.id).sort()).toEqual([...TRIANGULATION_OUTCOME_IDS].sort());
    expect(mapped.filter((entry) => entry.result === 'victory').every((entry) => entry.reference === 'deme')).toBe(true);
    expect(mapped.filter((entry) => entry.result === 'victory')).toHaveLength(3);
  });
});

describe('The Triangulation game engine', () => {
  it('configures three authored civilizations, distinct seats, and a reachable preparedness opening', () => {
    const state = makeTriangulation('rehearsal');
    expect(state.players.map((player) => player.civName)).toEqual([
      'Deme Assemblies', 'Myriad Groves', 'Vesper Choir',
    ]);
    expect(state.triangulationScenario).toMatchObject({
      runKind: 'rehearsal', architectCoreActions: 0, alignmentDueAfterActions: 5,
      priorMemoryLines: ['At Vey, you made uncertainty public.'],
    });
    expect(state.forgeTier1.slice(0, 3)).toEqual(['t1p03', 't1o06', 't1r08']);
  });

  it('holds the transition after the fifth Architect action and blocks all non-choice actions', () => {
    const state = makeTriangulation();
    openAlignment(state);
    expect(state.pendingTurnTransition).not.toBeNull();
    expect(applyAction(state, 'architect', { type: 'pass' })).toEqual({
      success: false, error: 'Resolve the Alignment before acting',
    });
  });

  it('accepts only the Architect and makes an identical choice retry idempotent', () => {
    const state = makeTriangulation();
    openAlignment(state);
    expect(applyAction(state, 'myria', {
      type: 'resolve_chronicle_choice',
      triangulationCoordinationArchitecture: 'preserve_independent_frames',
    })).toEqual({ success: false, error: 'Only the Architect may establish the Alignment' });
    expect(applyAction(state, 'architect', {
      type: 'resolve_chronicle_choice',
      triangulationCoordinationArchitecture: 'establish_unowned_measure',
    })).toEqual({ success: true });
    const version = state.version;
    expect(state.currentPlayerIndex).toBe(1);
    expect(applyAction(state, 'architect', {
      type: 'resolve_chronicle_choice',
      triangulationCoordinationArchitecture: 'establish_unowned_measure',
    })).toEqual({ success: true });
    expect(state.version).toBe(version);
    expect(applyAction(state, 'architect', {
      type: 'resolve_chronicle_choice',
      triangulationCoordinationArchitecture: 'instantiate_composite_mind',
    })).toEqual({ success: false, error: 'The Alignment architecture has already been recorded' });
  });

  it('locks preparedness from canonical capability metadata', () => {
    const state = makeTriangulation();
    const architect = state.players[0]!;
    architect.affinities.flare = 4;
    architect.affinities.verdance = 4;
    architect.affinities.abyss = 4;
    expect(applyAction(state, 'architect', { type: 'forge_artifact', cardId: 't1p03' }).success).toBe(true);
    expect(state.triangulationScenario).toMatchObject({
      preparednessMet: true,
      preparednessCapabilityId: 'artifact:signal_interpretation',
      preparednessArtifactId: 't1p03',
    });
  });

  it.each(TRIANGULATION_COORDINATION_ARCHITECTURES.flatMap((architecture) =>
    TRIANGULATION_REFERENCE_CIVILIZATIONS.map((reference) => [architecture, reference] as const),
  ))('closes %s with %s reference to the matching authored outcome', (architecture, reference) => {
    const state = makeTriangulation();
    openAlignment(state);
    expect(applyAction(state, 'architect', {
      type: 'resolve_chronicle_choice', triangulationCoordinationArchitecture: architecture,
    }).success).toBe(true);
    state.players.forEach((player) => { player.eminence = player.playerId === reference ||
      (reference === 'deme' && player.playerId === 'architect') ? 14 : 2; });
    emptyForge(state);
    expect(applyAction(state, 'myria', { type: 'pass' }).success).toBe(true);
    expect(state.triangulationScenario).toMatchObject({
      phase: 'finished', referenceCivilization: reference,
      outcomeId: triangulationOutcomeId(architecture, reference),
    });
  });

  it('normalizes reconnect state without inventing an outcome', () => {
    const state = makeTriangulation('rehearsal');
    state.triangulationScenario!.phase = 'alignment_resolved';
    state.triangulationScenario!.coordinationArchitecture = 'preserve_independent_frames';
    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(restored.triangulationScenario).toMatchObject({
      runKind: 'rehearsal', phase: 'alignment_resolved',
      coordinationArchitecture: 'preserve_independent_frames', outcomeId: null,
    });
  });

  it('never gives Myria or Vesper an Encrypt action', () => {
    const state = makeTriangulation();
    for (let index = 0; index < 80; index++) {
      expect(chooseAiAction(state, 'myria', 'hard').type).not.toBe('reserve_artifact');
      expect(chooseAiAction(state, 'vesper', 'hard').type).not.toBe('reserve_artifact');
    }
    for (const affinity of ['flare', 'continuum', 'verdance', 'abyss', 'radiance'] as const) {
      state.affinityWell[affinity] = 0;
    }
    expect(chooseAiAction(state, 'myria', 'hard').type).toBe('pass');
    expect(chooseAiAction(state, 'vesper', 'hard').type).toBe('pass');
  });

  it('keeps one Architect Harness window in the Well during autonomous turns', () => {
    const state = makeTriangulation();
    state.currentPlayerIndex = 1;
    for (const affinity of ['flare', 'continuum', 'verdance', 'abyss', 'radiance'] as const) {
      state.affinityWell[affinity] = affinity === 'flare' ? 4 : 0;
    }
    const action = chooseAiAction(state, 'myria', 'hard');
    expect(action).toMatchObject({
      type: 'harness_three_affinities',
      affinities: { flare: 1 },
    });
    expect(applyAction(state, 'myria', action)).toEqual({ success: true });
    expect(state.affinityWell.flare).toBe(3);
    expect(chooseAiAction(state, 'vesper', 'hard')).toEqual({ type: 'pass' });
  });

  it('builds one linked Domain record and three immutable civilization records for primary closure', () => {
    const state = makeTriangulation();
    state.phase = 'finished';
    state.finishReason = 'win';
    state.winnerId = 'architect';
    Object.assign(state.triangulationScenario!, {
      phase: 'finished',
      coordinationArchitecture: 'establish_unowned_measure',
      referenceCivilization: 'deme',
      outcomeId: 'triangulation_measure_deme_reference',
    });

    const rows = buildTriangulationHistoricalRecords(
      state,
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      new Date('2026-08-23T12:00:00.000Z'),
    );

    expect(rows.map((row) => row.recordKey)).toEqual([
      'domain:blind_transit',
      'civilization:deme',
      'civilization:myria',
      'civilization:vesper',
    ]);
    expect(rows[0]).toMatchObject({
      recordKind: 'domain',
      payload: {
        domainId: 'domain_blind_transit',
        sharedLatticeEntityId: 'ent_three_bearing_lattice',
        participantRecordKeys: ['civilization:deme', 'civilization:myria', 'civilization:vesper'],
      },
    });
    expect(rows.slice(1).map((row) => row.payload.controller)).toEqual([
      'architect', 'autonomous', 'autonomous',
    ]);
    expect(rows.slice(1).map((row) =>
      (row.payload.record as { lume: { status: string } }).lume.status,
    )).toEqual(['awarded', 'campaign_record_only', 'campaign_record_only']);
  });

  it('does not build durable history before primary closure', () => {
    const state = makeTriangulation('rehearsal');
    expect(buildTriangulationHistoricalRecords(
      state,
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      new Date('2026-08-23T12:00:00.000Z'),
    )).toEqual([]);
  });
});
