export interface RematchFlowPlayer {
  id: string;
  isAi: boolean;
}

export interface RematchFlowState {
  joinedIds: ReadonlySet<string>;
  declinedIds: ReadonlySet<string>;
}

export interface RematchReadiness {
  active: boolean;
  allHumansResponded: boolean;
  confirmedCount: number;
  shouldStart: boolean;
}

export function getRematchReadiness(
  state: RematchFlowState,
  players: ReadonlyArray<RematchFlowPlayer>,
): RematchReadiness {
  const humanPlayers = players.filter((player) => !player.isAi);
  const active = humanPlayers.some((player) => state.joinedIds.has(player.id));
  const allHumansResponded =
    active &&
    humanPlayers.every(
      (player) =>
        state.joinedIds.has(player.id) || state.declinedIds.has(player.id),
    );
  const confirmedCount = players.filter(
    (player) => player.isAi || state.joinedIds.has(player.id),
  ).length;

  return {
    active,
    allHumansResponded,
    confirmedCount,
    shouldStart: allHumansResponded && confirmedCount >= 2,
  };
}
