import {
  applyAction,
  type ActionPayload,
  type GameStateData,
} from "../lib/gameEngine.js";

function applyPresentationAction(
  state: GameStateData,
  playerId: string,
  action: ActionPayload,
): void {
  const result = applyAction(state, playerId, action);
  if (!result.success) {
    throw new Error(`Simulation could not resolve ${action.type}: ${result.error ?? "unknown error"}`);
  }
}

/** Resolve the authoritative presentation gates that must finish before another turn action. */
export function drainSimulationPresentationEvents(state: GameStateData, fallbackPlayerId?: string): void {
  const actorId = fallbackPlayerId ?? state.players[0]?.playerId;
  if (!actorId) return;
  // Acknowledging one queue can expose another; always inspect from the top.
  for (let safety = 0; safety < 200; safety++) {
    const choice = state.pendingLuminaryChoice;
    if (choice) {
      applyPresentationAction(state, choice.playerId, {
        type: "choose_luminary_order", orderedIds: choice.candidates,
      });
      continue;
    }
    const lanes = [
      ["resolve_summon", state.pendingSummonEvents],
      ["resolve_luminary_activation", state.pendingLuminaryActivationEvents],
      ["resolve_blueprint_manifestation", state.pendingBlueprintManifestationEvents],
      ["resolve_blueprint_detonation", state.pendingBlueprintDetonationEvents],
      ["resolve_civilization_event", state.pendingCivilizationEventCards],
    ] as const;
    const lane = lanes.find(([, events]) => (events?.length ?? 0) > 0);
    if (!lane) return;
    applyPresentationAction(state, actorId, { type: lane[0], eventId: lane[1][0].eventId });
  }
  throw new Error("Simulation presentation chain exceeded 200 steps");
}
