import type { GameStateData } from "./gameEngine";

/** Pause the clock for durable presentation queues, then arm the next turn. */
export function updateTurnDeadline(state: GameStateData): void {
  if (state.phase === "finished") {
    state.turnDeadline = null;
    return;
  }
  if (
    !!state.pendingTurnTransition ||
    (state.pendingSummonEvents?.length ?? 0) > 0 ||
    (state.pendingLuminaryActivationEvents?.length ?? 0) > 0 ||
    (state.pendingBlueprintManifestationEvents?.length ?? 0) > 0 ||
    (state.pendingBlueprintDetonationEvents?.length ?? 0) > 0
  ) {
    state.turnDeadline = null;
    return;
  }
  state.turnDeadline = state.turnTimerSeconds && state.turnTimerSeconds > 0
    ? Date.now() + state.turnTimerSeconds * 1000
    : null;
}
