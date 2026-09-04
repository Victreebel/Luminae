import { describe, expect, it } from 'vitest';
import {
  TRACE_OUTCOME_IDS,
  traceOutcomeId,
  validateChronicleDefinitionAuthoring,
} from '@workspace/game-types';
import {
  applyAction,
  configureTraceScenario,
  initializeGame,
  normalizeState,
  type GameStateData,
} from './gameEngine.js';
import { TRACE_CHRONICLE_DEFINITION } from './traceChronicle.js';

function makeTrace(runKind: 'primary' | 'rehearsal' = 'primary'): GameStateData {
  const state = normalizeState(initializeGame([
    { id: 'architect', name: 'Architect' },
    { id: 'keelborn', name: 'Keelborn Convoy' },
  ], 2));
  state.activeLuminaries = [];
  state.currentPlayerIndex = 0;
  configureTraceScenario(state, 'architect', 'keelborn', runKind);
  return state;
}

function openGuidance(state: GameStateData): void {
  const trace = state.traceScenario!;
  trace.architectCoreActionCount = trace.guidanceDueAfterCoreActions - 1;
  for (const affinity of ['flare', 'continuum', 'verdance', 'abyss', 'radiance'] as const) {
    state.affinityWell[affinity] = 20;
  }
  const result = applyAction(state, 'architect', {
    type: 'harness_three_affinities',
    affinities: { flare: 1 },
  });
  expect(result).toEqual({ success: true });
  expect(trace.phase).toBe('awaiting_guidance');
}

function emptyForgeAndArchives(state: GameStateData): void {
  state.forgeTier1 = [];
  state.forgeTier2 = [];
  state.forgeTier3 = [];
  state.deckTier1 = [];
  state.deckTier2 = [];
  state.deckTier3 = [];
}

describe('The Trace authoring registry', () => {
  it('contains all six valid outcomes with equal non-power baseline entitlement', () => {
    expect(validateChronicleDefinitionAuthoring(TRACE_CHRONICLE_DEFINITION)).toEqual([]);
    expect(TRACE_CHRONICLE_DEFINITION.outcomes.map((outcome) => outcome.outcomeId).sort())
      .toEqual([...TRACE_OUTCOME_IDS].sort());

    const entitlements = TRACE_CHRONICLE_DEFINITION.outcomes.map((outcome) => outcome.baselineEntitlements);
    expect(new Set(entitlements.map((entry) => JSON.stringify(entry))).size).toBe(1);
    expect(entitlements[0]).toEqual([{
      kind: 'archive_record',
      entitlementId: 'chronicle_trace',
      competitivePower: false,
    }]);
  });

  it('maps every posture and result deterministically', () => {
    expect(traceOutcomeId('expose_all_routes', 'victory')).toBe('trace_exposed_victory');
    expect(traceOutcomeId('expose_all_routes', 'defeat')).toBe('trace_exposed_defeat');
    expect(traceOutcomeId('withhold_alternatives', 'victory')).toBe('trace_withheld_victory');
    expect(traceOutcomeId('withhold_alternatives', 'defeat')).toBe('trace_withheld_defeat');
    expect(traceOutcomeId('force_helm_lock', 'victory')).toBe('trace_forced_victory');
    expect(traceOutcomeId('force_helm_lock', 'defeat')).toBe('trace_forced_defeat');
  });
});

describe('The Trace game engine', () => {
  it('applies the authored participants, opening Forge, and run identity', () => {
    const state = makeTrace('rehearsal');
    expect(state.players[0]?.civName).toBe('Cantons of Vey');
    expect(state.players[1]?.civName).toBe('Keelborn Convoy');
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.traceScenario).toMatchObject({
      runKind: 'rehearsal',
      architectCoreActionCount: 0,
      guidanceDueAfterCoreActions: 5,
      preparednessObjectiveMet: false,
    });
    expect(state.forgeTier1.slice(0, 3)).toEqual(['t1p03', 't1s04', 't1s06']);
  });

  it('opens guidance after exactly the fifth Architect core action and blocks other actions', () => {
    const state = makeTrace();
    openGuidance(state);

    expect(state.traceScenario?.architectCoreActionCount).toBe(5);
    expect(state.pendingTurnTransition).not.toBeNull();
    expect(applyAction(state, 'architect', { type: 'pass' })).toEqual({
      success: false,
      error: 'Resolve the Crownfall guidance window before acting',
    });
  });

  it('accepts only the Architect, records one posture, and treats an identical retry as idempotent', () => {
    const state = makeTrace();
    openGuidance(state);

    expect(applyAction(state, 'keelborn', {
      type: 'resolve_chronicle_choice',
      traceGuidanceMethod: 'expose_all_routes',
    })).toEqual({ success: false, error: 'Only the Architect may guide Crownfall' });

    expect(applyAction(state, 'architect', {
      type: 'resolve_chronicle_choice',
      traceGuidanceMethod: 'expose_all_routes',
    })).toEqual({ success: true });
    const version = state.version;
    expect(state.traceScenario?.guidanceMethod).toBe('expose_all_routes');
    expect(state.currentPlayerIndex).toBe(1);

    expect(applyAction(state, 'architect', {
      type: 'resolve_chronicle_choice',
      traceGuidanceMethod: 'expose_all_routes',
    })).toEqual({ success: true });
    expect(state.version).toBe(version);
    expect(applyAction(state, 'architect', {
      type: 'resolve_chronicle_choice',
      traceGuidanceMethod: 'force_helm_lock',
    })).toEqual({ success: false, error: 'Crownfall guidance has already been recorded' });
  });

  it('recognizes a canonical preparedness capability only after the qualifying Forge', () => {
    const state = makeTrace();
    const architect = state.players[0]!;
    architect.affinities.flare = 4;
    architect.affinities.verdance = 4;
    architect.affinities.abyss = 4;
    const result = applyAction(state, 'architect', { type: 'forge_artifact', cardId: 't1p03' });
    expect(result.success).toBe(true);
    expect(state.traceScenario).toMatchObject({
      preparednessObjectiveMet: true,
      preparednessArtifactId: 't1p03',
    });
  });

  it.each([
    ['expose_all_routes', 'victory', 'trace_exposed_victory'],
    ['withhold_alternatives', 'victory', 'trace_withheld_victory'],
    ['force_helm_lock', 'defeat', 'trace_forced_defeat'],
  ] as const)('closes %s + %s as %s', (method, result, outcomeId) => {
    const state = makeTrace();
    openGuidance(state);
    expect(applyAction(state, 'architect', {
      type: 'resolve_chronicle_choice',
      traceGuidanceMethod: method,
    }).success).toBe(true);

    state.players[0]!.eminence = result === 'victory' ? 14 : 2;
    state.players[1]!.eminence = result === 'victory' ? 2 : 14;
    emptyForgeAndArchives(state);
    expect(applyAction(state, 'keelborn', { type: 'pass' }).success).toBe(true);
    expect(state.phase).toBe('finished');
    expect(state.traceScenario).toMatchObject({ phase: 'finished', outcomeId });
  });

  it('normalizes reconnect state without losing the recorded posture or rehearsal identity', () => {
    const state = makeTrace('rehearsal');
    state.traceScenario!.phase = 'guidance_resolved';
    state.traceScenario!.guidanceMethod = 'withhold_alternatives';
    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(restored.traceScenario).toMatchObject({
      runKind: 'rehearsal',
      phase: 'guidance_resolved',
      guidanceMethod: 'withhold_alternatives',
    });
  });
});
