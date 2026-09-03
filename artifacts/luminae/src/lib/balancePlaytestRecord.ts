import type { GameState } from '@workspace/api-client-react';

export const CREATOR_PLAYTEST_SCHEMA = 'luminae-creator-playtest/v1' as const;
export const CREATOR_PLAYTEST_RECORD_VERSION = 2 as const;
export const CREATOR_PAIR_DECISION_SCHEMA = 'luminae-creator-playtest-pair-decision/v1' as const;

export type CreatorPairOrder = 'unpaired' | 'control_first' | 'candidate_first';
export type CreatorPairedPreference =
  | 'corrected_control'
  | 'candidate'
  | 'no_preference';
export type CreatorAssessment = 'yes' | 'no' | 'unclear';

export interface CreatorPlaytestRatings {
  clarity: number;
  interaction: number;
  lateGameTension: number;
  opponentAgency: number;
  repetitiveTurns: number;
  reversals: number;
  endingSatisfaction: number;
  replay: number;
}

export interface CreatorPlaytestNotes {
  repetitiveTurns: string;
  friction: string;
  decisiveMoment: string;
  endingEarned: CreatorAssessment;
  rulesChangedDecision: CreatorAssessment;
  rulesChangedDecisionNotes: string;
  preferredVersion: string;
  general: string;
}

export interface BuildCreatorPlaytestRecordInput {
  state: GameState;
  localPlayerId: string;
  requestedCandidateId: string;
  configuredCandidateId: string;
  format: string;
  configuredPlayerCount: number | null;
  sessionId: string;
  recordedAt: number;
  apiBuildLabel: string;
  apiBuildStartedAt: string;
  webBuildLabel: string;
  webBuildStamp: string;
  pairId: string | null;
  pairOrder: CreatorPairOrder;
  pairedPreference: CreatorPairedPreference | null;
  interrupted: boolean;
  interruptionNotes: string;
  valid: boolean;
  invalidReason: string;
  ratings: CreatorPlaytestRatings;
  notes: CreatorPlaytestNotes;
}

function orderedPlayerIds(state: GameState): string[] {
  const seatIds = state.openingTurnOrder?.playerIds ?? state.players.map((player) => player.playerId);
  const firstPlayerId = state.openingTurnOrder?.firstPlayerId ?? seatIds[0] ?? null;
  const firstIndex = firstPlayerId ? seatIds.indexOf(firstPlayerId) : -1;
  if (firstIndex <= 0) return [...seatIds];
  return [...seatIds.slice(firstIndex), ...seatIds.slice(0, firstIndex)];
}

function trimOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatForTarget(target: number, fallback: string): string {
  if (target === 15) return 'quick';
  if (target === 20) return 'standard';
  if (target === 25) return 'epic';
  return fallback;
}

export function buildCreatorPlaytestRecord(input: BuildCreatorPlaytestRecordInput) {
  const { state } = input;
  const order = orderedPlayerIds(state);
  const playerById = new Map(state.players.map((player) => [player.playerId, player]));
  const players = order
    .map((playerId, index) => {
      const player = playerById.get(playerId);
      if (!player) return null;
      return {
        playerId: player.playerId,
        playerName: player.playerName,
        isAi: player.isAi,
        openingPosition: index + 1,
        eminence: player.eminence,
      };
    })
    .filter((player): player is NonNullable<typeof player> => player !== null);
  const localPlayer = state.players.find((player) => player.playerId === input.localPlayerId) ?? null;
  const openingPosition = order.indexOf(input.localPlayerId);
  const openerId = order[0] ?? null;
  const opener = openerId ? playerById.get(openerId) ?? null : null;
  const finished = state.status === 'finished';
  const result = !finished
    ? 'incomplete'
    : state.finishReason === 'withdrawal'
      ? 'withdrawal'
      : state.winnerId === input.localPlayerId
        ? 'win'
        : state.winnerId
          ? 'loss'
          : 'incomplete';
  const durationMilliseconds = Math.max(0, input.recordedAt - state.startedAt);
  const rulesetVersion = `${input.configuredCandidateId}@${input.apiBuildLabel}`;
  const targetFormat = formatForTarget(state.victoryRequirement, input.format);

  return {
    schema: CREATOR_PLAYTEST_SCHEMA,
    recordVersion: CREATOR_PLAYTEST_RECORD_VERSION,
    sessionId: input.sessionId,
    recordedAt: new Date(input.recordedAt).toISOString(),
    startedAt: new Date(state.startedAt).toISOString(),
    candidateId: input.configuredCandidateId,
    requestedCandidateId: input.requestedCandidateId,
    rulesetId: input.configuredCandidateId,
    rulesetVersion,
    rulesetVersionSource: 'configured_candidate_and_api_build',
    buildIdentity: {
      apiBuildLabel: input.apiBuildLabel,
      apiBuildStartedAt: input.apiBuildStartedAt,
      webBuildLabel: input.webBuildLabel,
      webBuildStamp: input.webBuildStamp,
    },
    roomId: state.roomId,
    gameInstanceId: state.openingTurnOrder?.id ?? null,
    boardId: state.openingTurnOrder?.id ?? state.roomId,
    boardIdSource: state.openingTurnOrder ? 'opening_turn_order_id' : 'room_id',
    seed: null,
    format: targetFormat,
    requestedFormat: input.format,
    target: {
      format: targetFormat,
      eminence: state.victoryRequirement,
    },
    targetEminence: state.victoryRequirement,
    configuredPlayerCount: input.configuredPlayerCount,
    playerCount: state.players.length,
    creatorPlayerId: input.localPlayerId,
    openerPlayerId: opener?.playerId ?? null,
    openerPlayerName: opener?.playerName ?? null,
    openingPosition: openingPosition >= 0 ? openingPosition + 1 : null,
    players,
    finalScores: players.map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      openingPosition: player.openingPosition,
      eminence: player.eminence,
    })),
    score: localPlayer?.eminence ?? null,
    winnerId: state.winnerId,
    result,
    finishReason: state.finishReason ?? 'not_finished',
    gameStatus: state.status,
    turnCount: state.turnCount,
    roundNumber: state.roundNumber,
    durationMilliseconds,
    durationMinutes: Number((durationMilliseconds / 60_000).toFixed(2)),
    durationSource: 'game_started_at_to_recorded_at',
    pairId: input.pairId,
    pairOrder: input.pairOrder,
    pairedPreference: input.pairId ? input.pairedPreference : null,
    preferredVersion: input.pairId ? input.pairedPreference : null,
    interruption: {
      occurred: input.interrupted,
      notes: trimOrNull(input.interruptionNotes),
    },
    validity: {
      valid: input.valid,
      reason: input.valid ? null : trimOrNull(input.invalidReason),
    },
    valid: input.valid,
    ratings: input.ratings,
    notes: {
      repetitiveTurns: trimOrNull(input.notes.repetitiveTurns),
      friction: trimOrNull(input.notes.friction),
      decisiveMoment: trimOrNull(input.notes.decisiveMoment),
      endingEarned: input.notes.endingEarned,
      rulesChangedDecision: input.notes.rulesChangedDecision,
      rulesChangedDecisionNotes: trimOrNull(input.notes.rulesChangedDecisionNotes),
      preferredVersion: trimOrNull(input.notes.preferredVersion),
      general: trimOrNull(input.notes.general),
    },
  };
}

export interface CreatorPlaytestPairSession {
  schema: typeof CREATOR_PLAYTEST_SCHEMA;
  recordVersion: number;
  sessionId: string;
  pairId: string | null;
  pairOrder: CreatorPairOrder;
  candidateId: string;
  valid: boolean;
}

export function isCreatorPlaytestPairSession(value: unknown): value is CreatorPlaytestPairSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CreatorPlaytestPairSession>;
  return candidate.schema === CREATOR_PLAYTEST_SCHEMA &&
    typeof candidate.recordVersion === 'number' &&
    typeof candidate.sessionId === 'string' &&
    (typeof candidate.pairId === 'string' || candidate.pairId === null) &&
    (candidate.pairOrder === 'unpaired' || candidate.pairOrder === 'control_first' || candidate.pairOrder === 'candidate_first') &&
    typeof candidate.candidateId === 'string' &&
    typeof candidate.valid === 'boolean';
}

export function buildCreatorPairDecisionRecord(input: {
  pairId: string;
  recordedAt: number;
  pairOrder: Exclude<CreatorPairOrder, 'unpaired'>;
  pairedPreference: CreatorPairedPreference;
  preferenceReason: string;
  sessions: readonly CreatorPlaytestPairSession[];
}) {
  const controlSession = input.sessions.find((session) => session.candidateId === 'control') ?? null;
  const candidateSession = input.sessions.find((session) => session.candidateId !== 'control') ?? null;
  const invalidSessionIds = input.sessions
    .filter((session) => !session.valid)
    .map((session) => session.sessionId);
  return {
    schema: CREATOR_PAIR_DECISION_SCHEMA,
    recordVersion: 1,
    pairId: input.pairId,
    recordedAt: new Date(input.recordedAt).toISOString(),
    pairOrder: input.pairOrder,
    pairedPreference: input.pairedPreference,
    preferredVersion: input.pairedPreference,
    preferenceReason: trimOrNull(input.preferenceReason),
    sessionIds: input.sessions.map((session) => session.sessionId),
    controlSessionId: controlSession?.sessionId ?? null,
    candidateSessionId: candidateSession?.sessionId ?? null,
    candidateId: candidateSession?.candidateId ?? null,
    valid: input.sessions.length === 2 && invalidSessionIds.length === 0,
    invalidSessionIds,
  };
}
