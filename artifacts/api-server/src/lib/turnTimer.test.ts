import { describe, expect, it, vi } from "vitest";
import { initializeGame } from "./gameEngine";
import { updateTurnDeadline } from "./turnDeadline";

function timedState() {
  const state = initializeGame(
    [
      { id: "player-one", name: "One" },
      { id: "player-two", name: "Two" },
    ],
    2,
  );
  state.openingTurnOrder = null;
  state.turnTimerSeconds = 30;
  return state;
}

describe("Blueprint presentation timer gating", () => {
  it("keeps the full turn clock paused through a reconnect-safe Event receipt", () => {
    const state = timedState();
    state.pendingCivilizationEventCards = [{
      eventId: "cosmic-1",
      definitionId: "event_stellar_containment_cascade",
      triggerWindow: "authored",
      triggerTurnCount: 3,
      phase: "receipt",
      affectedPlayerIds: state.players.map((player) => player.playerId),
      outcomesByPlayerId: {},
      createdAt: 100,
    }];
    updateTurnDeadline(state);
    expect(state.turnDeadline).toBeNull();
    state.pendingCivilizationEventCards = [];
    updateTurnDeadline(state);
    expect(state.turnDeadline).not.toBeNull();
  });

  it("pauses the turn clock while a manifestation survives reconnect", () => {
    const state = timedState();
    state.pendingBlueprintManifestationEvents = [
      {
        eventId: "manifest-1",
        blueprintId: "bp_antimatter_detonator",
        ownerPlayerId: "player-one",
        slotIndex: 0,
        presentationVariant: "armored",
        createdAt: 100,
      },
    ];

    updateTurnDeadline(state);
    expect(state.turnDeadline).toBeNull();
  });

  it("pauses for detonation and resumes only after the durable queue is empty", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const state = timedState();
    state.pendingBlueprintDetonationEvents = [
      {
        eventId: "detonation-1",
        blueprintId: "bp_antimatter_detonator",
        ownerPlayerId: "player-one",
        triggeringPlayerId: "player-two",
        targetCardId: "t2r01",
        presentationVariant: "asymmetric",
        createdAt: 100,
      },
    ];

    updateTurnDeadline(state);
    expect(state.turnDeadline).toBeNull();

    state.pendingBlueprintDetonationEvents = [];
    updateTurnDeadline(state);
    expect(state.turnDeadline).toBe(31_000);
    vi.restoreAllMocks();
  });
});
