import { describe, expect, it } from 'vitest';
import {
  RECURRENCE_OUTCOME_IDS,
  recurrenceOutcomeId,
  validateChronicleDefinitionAuthoring,
} from '@workspace/game-types';
import {
  applyAction,
  configureRecurrenceScenario,
  initializeGame,
  normalizeState,
  type GameStateData,
} from './gameEngine.js';
import { RECURRENCE_CHRONICLE_DEFINITION } from './recurrenceChronicle.js';

function makeRecurrence(runKind: 'primary' | 'rehearsal' = 'primary'): GameStateData {
  const state = normalizeState(initializeGame([
    { id: 'architect', name: 'Architect' },
    { id: 'oru', name: 'Oru Current' },
  ], 2));
  state.activeLuminaries = [];
  state.currentPlayerIndex = 0;
  configureRecurrenceScenario(state, 'architect', 'oru', runKind);
  return state;
}

function openCustody(state: GameStateData): void {
  const recurrence = state.recurrenceScenario!;
  recurrence.architectCoreActionCount = recurrence.custodyDueAfterCoreActions - 1;
  for (const affinity of ['flare', 'continuum', 'verdance', 'abyss', 'radiance'] as const) {
    state.affinityWell[affinity] = 20;
  }
  expect(applyAction(state, 'architect', {
    type: 'harness_three_affinities', affinities: { flare: 1 },
  })).toEqual({ success: true });
  expect(recurrence.phase).toBe('awaiting_custody');
}

function emptyForgeAndArchives(state: GameStateData): void {
  state.forgeTier1 = []; state.forgeTier2 = []; state.forgeTier3 = [];
  state.deckTier1 = []; state.deckTier2 = []; state.deckTier3 = [];
}

describe('The Recurrence authoring registry', () => {
  it('authors six valid outcome-invariant closures and mixed dual-custody evidence', () => {
    expect(validateChronicleDefinitionAuthoring(RECURRENCE_CHRONICLE_DEFINITION)).toEqual([]);
    expect(RECURRENCE_CHRONICLE_DEFINITION.outcomes.map(outcome => outcome.outcomeId).sort())
      .toEqual([...RECURRENCE_OUTCOME_IDS].sort());
    expect(new Set(RECURRENCE_CHRONICLE_DEFINITION.outcomes.map(outcome => JSON.stringify(outcome.baselineEntitlements))).size).toBe(1);
    const dual = RECURRENCE_CHRONICLE_DEFINITION.outcomes.find(outcome => outcome.outcomeId === 'recurrence_conditional_victory')!;
    expect(dual.dimensionContributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ dimension: 'knowledge', direction: 'support', magnitude: 1 }),
      expect.objectContaining({ dimension: 'knowledge', direction: 'pressure', magnitude: 1 }),
    ]));
    expect(dual.lumiiMemories).toHaveLength(1);
    expect(RECURRENCE_CHRONICLE_DEFINITION.outcomes.flatMap(outcome => outcome.dimensionContributions)
      .every(contribution => contribution.dimension === 'knowledge')).toBe(true);
  });

  it('maps every custody method and result deterministically', () => {
    expect(recurrenceOutcomeId('publish_complete_index', 'victory')).toBe('recurrence_published_victory');
    expect(recurrenceOutcomeId('publish_complete_index', 'defeat')).toBe('recurrence_published_defeat');
    expect(recurrenceOutcomeId('seal_operational_grammar', 'victory')).toBe('recurrence_sealed_victory');
    expect(recurrenceOutcomeId('seal_operational_grammar', 'defeat')).toBe('recurrence_sealed_defeat');
    expect(recurrenceOutcomeId('establish_dual_custody', 'victory')).toBe('recurrence_conditional_victory');
    expect(recurrenceOutcomeId('establish_dual_custody', 'defeat')).toBe('recurrence_conditional_defeat');
  });
});

describe('The Recurrence game engine', () => {
  it('applies authored participants, opening Forge, and a separate Recurrence namespace', () => {
    const state = makeRecurrence('rehearsal');
    expect(state.players[0]?.civName).toBe('Meridian Houses of Eido');
    expect(state.players[1]?.civName).toBe('Oru Current');
    expect(state.recurrenceScenario).toMatchObject({ runKind: 'rehearsal', architectCoreActionCount: 0, custodyDueAfterCoreActions: 5 });
    expect(state.traceScenario).toBeUndefined();
    expect(state.forgeTier1.slice(0, 3)).toEqual(['t1p03', 't1o03', 't1s06']);
  });

  it('pauses the held turn transition after the fifth Architect action', () => {
    const state = makeRecurrence();
    openCustody(state);
    expect(state.pendingTurnTransition).not.toBeNull();
    expect(applyAction(state, 'architect', { type: 'pass' })).toEqual({
      success: false, error: 'Resolve custody of the Deep Index before acting',
    });
  });

  it('accepts only the Architect and makes same-method retries idempotent', () => {
    const state = makeRecurrence();
    openCustody(state);
    expect(applyAction(state, 'oru', { type: 'resolve_chronicle_choice', recurrenceCustodyMethod: 'publish_complete_index' }))
      .toEqual({ success: false, error: 'Only the Architect may decide custody of the Deep Index' });
    expect(applyAction(state, 'architect', { type: 'resolve_chronicle_choice', recurrenceCustodyMethod: 'establish_dual_custody' }))
      .toEqual({ success: true });
    const version = state.version;
    expect(state.currentPlayerIndex).toBe(1);
    expect(applyAction(state, 'architect', { type: 'resolve_chronicle_choice', recurrenceCustodyMethod: 'establish_dual_custody' }))
      .toEqual({ success: true });
    expect(state.version).toBe(version);
    expect(applyAction(state, 'architect', { type: 'resolve_chronicle_choice', recurrenceCustodyMethod: 'seal_operational_grammar' }))
      .toEqual({ success: false, error: 'Deep Index custody has already been recorded' });
  });

  it('locks the independent-reader objective after a qualifying Forge', () => {
    const state = makeRecurrence();
    const architect = state.players[0]!;
    architect.affinities.flare = 4; architect.affinities.verdance = 4; architect.affinities.abyss = 4;
    expect(applyAction(state, 'architect', { type: 'forge_artifact', cardId: 't1p03' }).success).toBe(true);
    expect(state.recurrenceScenario).toMatchObject({ preparednessObjectiveMet: true, preparednessArtifactId: 't1p03' });
  });

  it.each([
    ['publish_complete_index', 'victory', 'recurrence_published_victory'],
    ['seal_operational_grammar', 'victory', 'recurrence_sealed_victory'],
    ['establish_dual_custody', 'defeat', 'recurrence_conditional_defeat'],
  ] as const)('closes %s + %s as %s', (method, result, outcomeId) => {
    const state = makeRecurrence(); openCustody(state);
    expect(applyAction(state, 'architect', { type: 'resolve_chronicle_choice', recurrenceCustodyMethod: method }).success).toBe(true);
    state.players[0]!.eminence = result === 'victory' ? 14 : 2;
    state.players[1]!.eminence = result === 'victory' ? 2 : 14;
    emptyForgeAndArchives(state);
    expect(applyAction(state, 'oru', { type: 'pass' }).success).toBe(true);
    expect(state.recurrenceScenario).toMatchObject({ phase: 'finished', outcomeId });
  });

  it('normalizes reconnect state without losing custody or run identity', () => {
    const state = makeRecurrence('rehearsal');
    state.recurrenceScenario!.phase = 'custody_resolved';
    state.recurrenceScenario!.custodyMethod = 'seal_operational_grammar';
    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(restored.recurrenceScenario).toMatchObject({ runKind: 'rehearsal', phase: 'custody_resolved', custodyMethod: 'seal_operational_grammar' });
  });
});
