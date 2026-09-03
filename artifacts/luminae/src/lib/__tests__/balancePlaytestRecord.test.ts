import { describe, expect, it } from 'vitest';
import type { GameState } from '@workspace/api-client-react';
import {
  buildCreatorPairDecisionRecord,
  buildCreatorPlaytestRecord,
  CREATOR_PAIR_DECISION_SCHEMA,
  CREATOR_PLAYTEST_RECORD_VERSION,
  CREATOR_PLAYTEST_SCHEMA,
  isCreatorPlaytestPairSession,
} from '../balancePlaytestRecord';

function finishedState(): GameState {
  return {
    roomId: 'room-balance-1',
    status: 'finished',
    scenarioId: null,
    finishReason: 'frontier_exhaustion',
    startedAt: 1_000,
    openingTurnOrder: {
      id: 'board-epoch-42',
      startedAt: 1_000,
      firstPlayerId: 'p2',
      playerIds: ['p1', 'p2', 'p3'],
    },
    turnCount: 27,
    roundNumber: 9,
    victoryRequirement: 20,
    players: [
      { playerId: 'p1', playerName: 'Creator', isAi: false, eminence: 18 },
      { playerId: 'p2', playerName: 'Rival A', isAi: true, eminence: 20 },
      { playerId: 'p3', playerName: 'Rival B', isAi: true, eminence: 17 },
    ],
    winnerId: 'p2',
  } as GameState;
}

const ratings = {
  clarity: 4,
  interaction: 5,
  lateGameTension: 4,
  opponentAgency: 4,
  repetitiveTurns: 2,
  reversals: 5,
  endingSatisfaction: 4,
  replay: 5,
} as const;

const notes = {
  repetitiveTurns: 'One repeated reserve cycle.',
  friction: 'Focus choice needed a second read.',
  decisiveMoment: 'A denial Forge reversed the lead.',
  endingEarned: 'yes',
  rulesChangedDecision: 'yes',
  rulesChangedDecisionNotes: 'Held a predecessor for lineage.',
  preferredVersion: 'Candidate made the final round clearer.',
  general: 'Strong finish.',
} as const;

describe('creator balance playtest record', () => {
  it('maps authoritative match state and structured creator judgments into the protocol schema', () => {
    const record = buildCreatorPlaytestRecord({
      state: finishedState(),
      localPlayerId: 'p1',
      requestedCandidateId: 'lineage-floor',
      configuredCandidateId: 'lineage_floor',
      format: 'standard',
      configuredPlayerCount: 3,
      sessionId: 'session-1',
      recordedAt: 121_000,
      apiBuildLabel: 'api-build-17',
      apiBuildStartedAt: '2026-08-18T12:00:00.000Z',
      webBuildLabel: 'web-build-9',
      webBuildStamp: '2026-08-18T12:01:00.000Z',
      pairId: 'pair-a',
      pairOrder: 'candidate_first',
      pairedPreference: 'candidate',
      interrupted: true,
      interruptionNotes: 'WebSocket reconnected once.',
      valid: false,
      invalidReason: 'Connection obscured one rival turn.',
      ratings,
      notes,
    });

    expect(record.schema).toBe(CREATOR_PLAYTEST_SCHEMA);
    expect(record.recordVersion).toBe(CREATOR_PLAYTEST_RECORD_VERSION);
    expect(record.candidateId).toBe('lineage_floor');
    expect(record.rulesetVersion).toBe('lineage_floor@api-build-17');
    expect(record.target).toEqual({ format: 'standard', eminence: 20 });
    expect(record.playerCount).toBe(3);
    expect(record.openerPlayerId).toBe('p2');
    expect(record.openingPosition).toBe(3);
    expect(record.finalScores).toEqual([
      { playerId: 'p2', playerName: 'Rival A', openingPosition: 1, eminence: 20 },
      { playerId: 'p3', playerName: 'Rival B', openingPosition: 2, eminence: 17 },
      { playerId: 'p1', playerName: 'Creator', openingPosition: 3, eminence: 18 },
    ]);
    expect(record.score).toBe(18);
    expect(record.result).toBe('loss');
    expect(record.finishReason).toBe('frontier_exhaustion');
    expect(record.turnCount).toBe(27);
    expect(record.durationMinutes).toBe(2);
    expect(record.boardId).toBe('board-epoch-42');
    expect(record.seed).toBeNull();
    expect(record.pairOrder).toBe('candidate_first');
    expect(record.pairedPreference).toBe('candidate');
    expect(record.interruption).toEqual({ occurred: true, notes: 'WebSocket reconnected once.' });
    expect(record.validity).toEqual({ valid: false, reason: 'Connection obscured one rival turn.' });
    expect(record.ratings).toEqual(ratings);
    expect(record.notes).toEqual(notes);
  });

  it('keeps unpaired and unfinished records explicit without inventing outcomes', () => {
    const state = {
      ...finishedState(),
      status: 'playing',
      finishReason: null,
      winnerId: null,
      openingTurnOrder: null,
    } as GameState;
    const record = buildCreatorPlaytestRecord({
      state,
      localPlayerId: 'p1',
      requestedCandidateId: 'control',
      configuredCandidateId: 'control',
      format: 'quick',
      configuredPlayerCount: 3,
      sessionId: 'session-2',
      recordedAt: 61_000,
      apiBuildLabel: 'api-build-18',
      apiBuildStartedAt: '2026-08-18T12:02:00.000Z',
      webBuildLabel: 'web-build-10',
      webBuildStamp: '2026-08-18T12:03:00.000Z',
      pairId: null,
      pairOrder: 'unpaired',
      pairedPreference: 'no_preference',
      interrupted: false,
      interruptionNotes: '',
      valid: true,
      invalidReason: '',
      ratings,
      notes,
    });

    expect(record.result).toBe('incomplete');
    expect(record.finishReason).toBe('not_finished');
    expect(record.pairedPreference).toBeNull();
    expect(record.preferredVersion).toBeNull();
    expect(record.boardId).toBe('room-balance-1');
    expect(record.boardIdSource).toBe('room_id');
    expect(record.validity).toEqual({ valid: true, reason: null });
  });

  it('saves match one with a pending preference, then records one decision after both sessions', () => {
    const first = buildCreatorPlaytestRecord({
      state: finishedState(),
      localPlayerId: 'p1',
      requestedCandidateId: 'control',
      configuredCandidateId: 'control',
      format: 'standard',
      configuredPlayerCount: 3,
      sessionId: 'pair-session-control',
      recordedAt: 121_000,
      apiBuildLabel: 'api-build-17',
      apiBuildStartedAt: '2026-08-18T12:00:00.000Z',
      webBuildLabel: 'web-build-9',
      webBuildStamp: '2026-08-18T12:01:00.000Z',
      pairId: 'pair-pending',
      pairOrder: 'control_first',
      pairedPreference: null,
      interrupted: false,
      interruptionNotes: '',
      valid: true,
      invalidReason: '',
      ratings,
      notes,
    });
    const second = buildCreatorPlaytestRecord({
      state: finishedState(),
      localPlayerId: 'p1',
      requestedCandidateId: 'lineage-floor',
      configuredCandidateId: 'lineage_floor',
      format: 'standard',
      configuredPlayerCount: 3,
      sessionId: 'pair-session-candidate',
      recordedAt: 181_000,
      apiBuildLabel: 'api-build-17',
      apiBuildStartedAt: '2026-08-18T12:00:00.000Z',
      webBuildLabel: 'web-build-9',
      webBuildStamp: '2026-08-18T12:01:00.000Z',
      pairId: 'pair-pending',
      pairOrder: 'control_first',
      pairedPreference: null,
      interrupted: false,
      interruptionNotes: '',
      valid: true,
      invalidReason: '',
      ratings,
      notes,
    });

    expect(first.pairedPreference).toBeNull();
    expect(second.pairedPreference).toBeNull();
    expect(isCreatorPlaytestPairSession(first)).toBe(true);
    expect(isCreatorPlaytestPairSession(second)).toBe(true);
    const decision = buildCreatorPairDecisionRecord({
      pairId: 'pair-pending',
      recordedAt: 182_000,
      pairOrder: 'control_first',
      pairedPreference: 'candidate',
      preferenceReason: 'The candidate created clearer commitments.',
      sessions: [first, second],
    });

    expect(decision).toMatchObject({
      schema: CREATOR_PAIR_DECISION_SCHEMA,
      pairId: 'pair-pending',
      pairOrder: 'control_first',
      pairedPreference: 'candidate',
      controlSessionId: 'pair-session-control',
      candidateSessionId: 'pair-session-candidate',
      candidateId: 'lineage_floor',
      valid: true,
      invalidSessionIds: [],
    });
  });
});
