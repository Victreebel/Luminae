import { OPENING_TURN_ORDER_PRESENTATION_MS } from "@workspace/game-types";

// The client keeps input locked briefly after the selector closes so its
// initial board state can settle. AI state changes must respect that same
// boundary or they can arrive while the opening presentation is still live.
export const OPENING_TURN_ORDER_SETTLE_MS = 1_200;

type OpeningTurnPresentationState = {
  turnCount: number;
  openingTurnOrder?: {
    startedAt: number;
  } | null;
};

export function getOpeningTurnPresentationWaitMs(
  state: OpeningTurnPresentationState,
  now = Date.now(),
): number {
  if (state.turnCount !== 0 || !state.openingTurnOrder) return 0;

  const startedAt = Number(state.openingTurnOrder.startedAt);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return 0;

  return Math.max(
    0,
    startedAt + OPENING_TURN_ORDER_PRESENTATION_MS + OPENING_TURN_ORDER_SETTLE_MS - now,
  );
}
