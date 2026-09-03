import { getTurnOrderEminenceCompensation } from '@workspace/game-types';

export type OpeningTurnOrderPlayer = {
  playerId: string;
  playerName: string;
  avatarId: string | null;
  isFirst: boolean;
  openingPosition: number;
  eminenceBonus: number;
};

type OpeningTurnOrderPlayerSource = {
  playerId: string;
  playerName: string;
  avatarId?: string | null;
  eminence: number;
};

/**
 * Orders players exactly as they will act and exposes only compensation that
 * is already present in the authoritative opening state.
 */
export function buildOpeningTurnOrderPlayers(
  players: OpeningTurnOrderPlayerSource[],
  firstPlayerId: string,
  victoryRequirement: number,
): OpeningTurnOrderPlayer[] {
  if (players.length === 0) return [];

  const firstSeat = Math.max(0, players.findIndex((player) => player.playerId === firstPlayerId));
  const orderedPlayers = Array.from(
    { length: players.length },
    (_, openingPosition) => players[(firstSeat + openingPosition) % players.length]!,
  );
  const expectedBonuses = orderedPlayers.map((_, openingPosition) =>
    getTurnOrderEminenceCompensation(
      openingPosition,
      orderedPlayers.length,
      victoryRequirement,
    ),
  );
  const compensationIsPresent = expectedBonuses.every(
    (bonus, index) => orderedPlayers[index]!.eminence >= bonus,
  );

  return orderedPlayers.map((player, openingPosition) => ({
    playerId: player.playerId,
    playerName: player.playerName,
    avatarId: player.avatarId ?? null,
    isFirst: openingPosition === 0,
    openingPosition,
    eminenceBonus: compensationIsPresent ? expectedBonuses[openingPosition]! : 0,
  }));
}

export function getBalanceTelemetryActionId(
  playerCount: number,
  victoryRequirement: number,
):
  | 'match_2p_v15'
  | 'match_2p_v20'
  | 'match_2p_v25'
  | 'match_3p_v15'
  | 'match_3p_v20'
  | 'match_3p_v25'
  | 'match_4p_v15'
  | 'match_4p_v20'
  | 'match_4p_v25' {
  const normalizedPlayerCount = Math.max(2, Math.min(4, Math.floor(playerCount)));
  const normalizedTarget = victoryRequirement >= 25 ? 25 : victoryRequirement >= 20 ? 20 : 15;
  return `match_${normalizedPlayerCount}p_v${normalizedTarget}` as
    | 'match_2p_v15'
    | 'match_2p_v20'
    | 'match_2p_v25'
    | 'match_3p_v15'
    | 'match_3p_v20'
    | 'match_3p_v25'
    | 'match_4p_v15'
    | 'match_4p_v20'
    | 'match_4p_v25';
}
