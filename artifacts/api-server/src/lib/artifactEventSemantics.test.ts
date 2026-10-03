import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_DEFINITION_BY_ID,
  advanceCivilizationMaturity,
  assessCivilizationMaturity,
  buildCivilizationResolutionSnapshot,
  createInitialCivilizationState,
  reconcileCivilizationDerivedState,
  resolveCivilizationEvent,
  type CivilizationPressureTag,
  type CivilizationState,
} from '@workspace/game-types';
import {
  applyAction,
  configureRecurrenceScenario,
  configureTraceScenario,
  initializeGame,
  normalizeState,
} from './gameEngine.js';

function civilizationWith(...artifactIds: string[]): CivilizationState {
  const state = createInitialCivilizationState();
  for (const artifactId of artifactIds) {
    state.artifacts[artifactId] = {
      artifactId,
      firstMasteredTurnCount: 1,
      masteryCount: 1,
      implementationState: 'operational',
      implementationStateChangedTurnCount: 1,
      implementationChangeSource: null,
      historyEvidence: 'recorded',
    };
  }
  return state;
}

function resolveStrongResponse(state: CivilizationState, pressureTag: CivilizationPressureTag) {
  return resolveCivilizationEvent({
    eventId: 'semantic-review:response',
    source: { sourceType: 'scenario', sourceId: 'semantic-review' },
    form: 'automatic',
    timing: 'trigger_window',
    pressureTags: [pressureTag],
    snapshot: buildCivilizationResolutionSnapshot(state),
    trajectories: [{
      id: 'respond',
      label: 'Respond',
      requirements: [{ type: 'pressure_capability_coverage', pressureTag, minimum: 'strong' }],
      uncertainty: null,
      successConsequences: [],
      failureConsequences: [],
    }],
  });
}

describe('Artifact functions determine Event and Chronicle responses', () => {
  it('lets an operational galactic firebreak isolate proliferation while an archive cannot', () => {
    expect(resolveStrongResponse(civilizationWith('t3o02'), 'proliferation').status)
      .toBe('resolved');
    expect(resolveStrongResponse(civilizationWith('t3s03'), 'proliferation').status)
      .toBe('no_available_trajectory');

    const damaged = civilizationWith('t3o02');
    damaged.artifacts.t3o02.implementationState = 'damaged';
    expect(resolveStrongResponse(damaged, 'proliferation').status)
      .toBe('no_available_trajectory');
  });

  it('preserves the distinct recovery and habitat responses to attrition', () => {
    const recovery = resolveStrongResponse(civilizationWith('t3e03'), 'attrition');
    const refuge = resolveStrongResponse(civilizationWith('t3o01'), 'attrition');
    expect(recovery.status).toBe('resolved');
    expect(refuge.status).toBe('resolved');
    expect(recovery.pressureResponses[0]?.activePrimaryCapabilityIds)
      .toContain('artifact:ecological_recovery');
    expect(refuge.pressureResponses[0]?.activePrimaryCapabilityIds)
      .toEqual(['artifact:habitat_engineering']);
  });

  it.each([
    ['trace', false],
    ['recurrence', true],
  ] as const)('treats a forged signal translator as %s preparedness: %s', (chronicle, qualifies) => {
    const state = normalizeState(initializeGame([
      { id: 'architect', name: 'Architect' },
      { id: 'rival', name: 'Rival' },
    ], 2));
    state.activeLuminaries = [];
    state.currentPlayerIndex = 0;
    if (chronicle === 'trace') configureTraceScenario(state, 'architect', 'rival', 'rehearsal');
    else configureRecurrenceScenario(state, 'architect', 'rival', 'rehearsal');

    state.deckTier2 = state.deckTier2.filter((id) => id !== 't2e04');
    state.forgeTier2 = ['t2e04'];
    Object.assign(state.players[0]!.affinities, ARTIFACT_DEFINITION_BY_ID.t2e04.cost);
    expect(applyAction(state, 'architect', { type: 'forge_artifact', cardId: 't2e04' }))
      .toEqual({ success: true });
    expect(state.players[0]!.forgedArtifactIds).toContain('t2e04');

    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    const scenario = chronicle === 'trace' ? restored.traceScenario : restored.recurrenceScenario;
    expect(scenario).toMatchObject({
      architectCoreActionCount: 1,
      preparednessObjectiveMet: qualifies,
      preparednessArtifactId: qualifies ? 't2e04' : null,
    });
  });

  it('lets the Heliosphere Discriminator detect a threat without granting a containment response', () => {
    const lens = civilizationWith('t2s06');
    const warning = resolveStrongResponse(lens, 'exposure');
    const containment = resolveStrongResponse(lens, 'proliferation');
    expect(warning.status).toBe('resolved');
    expect(containment.status).toBe('no_available_trajectory');
    expect(containment.pressureResponses[0]?.capabilityCoverage).toBe('partial');

    const boundedThreat = civilizationWith('t2s06', 't1p04');
    expect(resolveStrongResponse(boundedThreat, 'proliferation').status).toBe('resolved');
  });

  it('uses the Solar Immune Canopy as a working hazard barrier, with no response after damage', () => {
    const canopy = civilizationWith('t2e01');
    expect(resolveStrongResponse(canopy, 'proliferation').status).toBe('resolved');
    canopy.artifacts.t2e01.implementationState = 'damaged';
    expect(resolveStrongResponse(canopy, 'proliferation').status).toBe('no_available_trajectory');
  });

  it('treats Starborne Succession as ecological continuity rather than an energy converter', () => {
    const succession = civilizationWith('t3e02');
    const recovery = resolveStrongResponse(succession, 'attrition');
    expect(recovery.status).toBe('resolved');
    expect(recovery.pressureResponses[0]?.activePrimaryCapabilityIds).toContain('artifact:habitat_engineering');
    const conversion = resolveStrongResponse(succession, 'transformation');
    expect(conversion.pressureResponses[0]?.activePrimaryCapabilityIds).not.toContain('artifact:energy_conversion');
  });

  it.each(['t1r07', 't2r06'])('%s converts waste heat without supplying material reclamation', (artifactId) => {
    const state = civilizationWith(artifactId);
    expect(resolveStrongResponse(state, 'transformation').status).toBe('resolved');
    const attrition = resolveStrongResponse(state, 'attrition');
    expect(attrition.status).toBe('no_available_trajectory');
    expect(attrition.pressureResponses[0]?.capabilityCoverage).toBe('partial');
  });

  it('reassesses operational coordination without erasing already recorded historical Maturity', () => {
    // This broad tableau has transit and sustainment, but translation is not
    // the coordination foundation needed for interstellar operation.
    const state = civilizationWith('t1s02', 't1r01', 't2e04', 't1o01', 't2s06', 't1r07');
    const assessment = assessCivilizationMaturity(state, [], 'operational');
    expect(assessment.stellarCriteria.filter((criterion) => criterion.id !== 'stellar-scale-signal')
      .every((criterion) => criterion.satisfied)).toBe(true);
    expect(assessment.interstellarCapabilityTriad).toBe(false);
    expect(assessment.candidateMaturity).toBe('planetary');

    const recordedEvidence = {
      sourceType: 'system' as const,
      sourceId: 'prior-maturity-assessment',
      turnCount: 4,
      historyEvidence: 'recorded' as const,
    };
    state.scale = advanceCivilizationMaturity(state.scale, 'stellar', recordedEvidence);
    const reconciled = reconcileCivilizationDerivedState(state, [], 5);
    expect(reconciled.scale).toMatchObject({
      historicalMaturity: 'stellar',
      historicalMaturityEvidence: [recordedEvidence],
      currentReach: 'planetary',
      currentReachCondition: 'degraded',
    });

    reconciled.artifacts.t1s04 = civilizationWith('t1s04').artifacts.t1s04;
    const coordinated = reconcileCivilizationDerivedState(reconciled, [], 6);
    expect(coordinated.scale.currentReach).toBe('stellar');
    expect(coordinated.scale.currentReachCondition).toBe('intact');
    expect(coordinated.scale.historicalMaturityEvidence).toEqual([recordedEvidence]);
  });
});
