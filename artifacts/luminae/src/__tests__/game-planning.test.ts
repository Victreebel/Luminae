import { describe, expect, it } from 'vitest';
import {
  canCommitPlannedAction,
  canUsePlanningEngine,
  getPlannedActionInfo,
  getTurnPresentationKey,
  type PlannedActionCommitContext,
} from '../pages/game-planning';

const readyContext = (): PlannedActionCommitContext => ({
  currentPlayerId: 'p2',
  sessionPlayerId: 'p2',
  turnCount: 4,
  plannedAction: { type: 'forge_artifact', cardId: 'artifact-1' },
  completedTurnPresentationKey: getTurnPresentationKey('p2', 4),
  turnPresentationPending: false,
  turnAnnouncementActive: false,
  turnOrderIntroActive: false,
  activationGateActive: false,
  activationQueueLength: 0,
  pendingSummonCount: 0,
});

describe('planned action presentation boundary', () => {
  it('commits only after the owning player turn has finished presenting', () => {
    expect(canCommitPlannedAction(readyContext())).toBe(true);
    expect(canCommitPlannedAction({
      ...readyContext(),
      completedTurnPresentationKey: null,
    })).toBe(false);
    expect(canCommitPlannedAction({
      ...readyContext(),
      completedTurnPresentationKey: getTurnPresentationKey('p2', 3),
    })).toBe(false);
  });

  it('keeps the plan provisional while any presentation gate is active', () => {
    expect(canCommitPlannedAction({ ...readyContext(), turnPresentationPending: true })).toBe(false);
    expect(canCommitPlannedAction({ ...readyContext(), turnAnnouncementActive: true })).toBe(false);
    expect(canCommitPlannedAction({ ...readyContext(), turnOrderIntroActive: true })).toBe(false);
    expect(canCommitPlannedAction({ ...readyContext(), activationGateActive: true })).toBe(false);
    expect(canCommitPlannedAction({ ...readyContext(), activationQueueLength: 1 })).toBe(false);
    expect(canCommitPlannedAction({ ...readyContext(), pendingSummonCount: 1 })).toBe(false);
  });

  it('never commits another player plan', () => {
    expect(canCommitPlannedAction({
      ...readyContext(),
      sessionPlayerId: 'p1',
    })).toBe(false);
  });
});

describe('planning engine availability', () => {
  const availableContext = {
    gameStatus: 'playing',
    hasLocalPlayer: true,
    exclusivePresentationActive: false,
    arrivalGateActive: false,
    localArrivalSkipped: false,
  };

  it('remains available outside the local player turn and presentation timeline', () => {
    expect(canUsePlanningEngine(availableContext)).toBe(true);
  });

  it('yields only to an exclusive presentation or an unskipped arrival gate', () => {
    expect(canUsePlanningEngine({
      ...availableContext,
      exclusivePresentationActive: true,
    })).toBe(false);
    expect(canUsePlanningEngine({
      ...availableContext,
      arrivalGateActive: true,
    })).toBe(false);
    expect(canUsePlanningEngine({
      ...availableContext,
      arrivalGateActive: true,
      localArrivalSkipped: true,
    })).toBe(true);
  });

  it('requires an active game and local player', () => {
    expect(canUsePlanningEngine({
      ...availableContext,
      gameStatus: 'finished',
    })).toBe(false);
    expect(canUsePlanningEngine({
      ...availableContext,
      hasLocalPlayer: false,
    })).toBe(false);
  });
});

describe('Tide Architect Archive Forge planning', () => {
  it('anchors the pending Forge to its Archive tier', () => {
    expect(getPlannedActionInfo({
      type: 'forge_artifact',
      cardId: 'artifact-top',
      luminaryId: 'lum_tide',
      tier: 2,
    })).toEqual({
      actionType: 'forge_artifact',
      cardId: 'artifact-top',
      deckTier: 2,
      label: 'Archive Forge pending',
    });
  });
});
