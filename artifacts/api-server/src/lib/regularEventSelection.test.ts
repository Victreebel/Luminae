import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CIVILIZATION_EVENT_CARD_DEFINITIONS,
  GENERAL_CIVILIZATION_EVENT_CARD_IDS,
  REGULAR_CIVILIZATION_EVENT_CARD_IDS,
  isCivilizationEventCardId,
  type EventFrequency,
} from "@workspace/game-types";
import {
  applyAction,
  configureRecurrenceScenario,
  configureTraceScenario,
  configureTriangulationScenario,
  formatGameState,
  getReplayBoardSnapshot,
  initializeGame,
  normalizeState,
  type GameStateData,
} from "./gameEngine.js";

const players = [{ id: "p1", name: "One" }, { id: "p2", name: "Two" }];
const boardRows = (state: GameStateData) => [state.forgeTier1, state.forgeTier2, state.forgeTier3,
  state.deckTier1, state.deckTier2, state.deckTier3];
const deckEvents = (state: GameStateData) => boardRows(state).flat().filter(isCivilizationEventCardId);
const makeGame = (eventFrequency: EventFrequency = "standard") => initializeGame(players,
  2, 20, "standard", { eventFrequency });

afterEach(() => vi.restoreAllMocks());

describe("regular match Event selection", () => {
  it.each([["off", 0], ["standard", 1], ["frequent", 2]] as const)(
    "%s selects %i unique Event(s) in each tier and keeps every opening mold an Artifact",
    (frequency, perTier) => {
      const state = makeGame(frequency);
      expect(state.civilizationEventDeck.contentProfile).toBe("general_v2");
      expect(state.civilizationEventDeck.eventFrequency).toBe(frequency);
      expect(state.civilizationEventDeck.rulesVersion).toBe("scheduled-events-v1");
      expect(state.civilizationEventDeck.delivery).toBe("scheduled_forge_v1");
      const events = state.civilizationEventDeck.scheduled?.queue ?? [];
      expect(deckEvents(state)).toEqual([]);
      expect(events).toHaveLength(perTier * 3);
      expect(new Set(events).size).toBe(events.length);
      expect(events.every((id) => (REGULAR_CIVILIZATION_EVENT_CARD_IDS as readonly string[]).includes(id))).toBe(true);
      expect(events).not.toContain("event_stellar_containment_cascade");
      expect(boardRows(state).flat().filter((id) => !isCivilizationEventCardId(id))).toHaveLength(95);
      for (const [index, deck] of [state.deckTier1, state.deckTier2, state.deckTier3].entries()) {
        const selected = events.filter((id) => CIVILIZATION_EVENT_CARD_DEFINITIONS[id].tier === index + 1);
        expect(deck.some(isCivilizationEventCardId)).toBe(false);
        expect(selected).toHaveLength(perTier);
        expect(selected.every((id) => CIVILIZATION_EVENT_CARD_DEFINITIONS[id].tier === index + 1)).toBe(true);
      }
      for (const forge of [state.forgeTier1, state.forgeTier2, state.forgeTier3]) {
        expect(forge).toHaveLength(4);
        expect(forge.some(isCivilizationEventCardId)).toBe(false);
      }
      const publicState = formatGameState("room", "playing", state, new Set());
      expect(publicState.eventFrequency).toBe(frequency);
      expect(publicState.eventCardPool).toEqual(
        frequency === "off" ? [] : REGULAR_CIVILIZATION_EVENT_CARD_IDS,
      );
      expect(publicState.civilizationEventDeck.definitionIds).toEqual([]);
    },
  );

  it("chooses a variable subset before play instead of always including every eligible Event", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const first = makeGame();
    vi.mocked(Math.random).mockReturnValue(0.999);
    const second = makeGame();
    expect(first.civilizationEventDeck.definitionIds).not.toEqual(second.civilizationEventDeck.definitionIds);
    expect(first.civilizationEventDeck.definitionIds).toHaveLength(3);
    expect(second.civilizationEventDeck.definitionIds).toHaveLength(3);
  });

  it.each(["off", "standard", "frequent"] as const)(
    "persists %s selection and exact shuffled board through reconnect and replay despite new options",
    (frequency) => {
      const state = makeGame(frequency);
      const restored = normalizeState(JSON.parse(JSON.stringify(state)));
      expect(restored.civilizationEventDeck).toEqual(state.civilizationEventDeck);
      expect(boardRows(restored)).toEqual(boardRows(state));
      const replay = initializeGame(players, 2, 20, "standard", {
        replayBoard: getReplayBoardSnapshot(restored), eventFrequency: "frequent",
        eventContentProfile: "lore_pilot_v1",
      });
      expect(boardRows(replay)).toEqual(boardRows(state));
      expect(replay.civilizationEventDeck.definitionIds).toEqual(state.civilizationEventDeck.definitionIds);
      expect(replay.civilizationEventDeck.eventFrequency).toBe(frequency);
      expect(replay.civilizationEventDeck.contentProfile).toBe("general_v2");
      expect(replay.currentPlayerIndex).toBe(state.currentPlayerIndex);
      expect(replay.initialBoard).toEqual(state.initialBoard);
    },
  );

  it("does not repopulate an explicitly empty selection on reconnect", () => {
    const state = makeGame();
    state.civilizationEventDeck.definitionIds = [];
    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(restored.civilizationEventDeck.definitionIds).toEqual([]);
    expect(restored.civilizationEventDeck.scheduled).toBeUndefined();
    expect(formatGameState("room", "playing", restored, new Set()).eventForecast?.status).toBe("complete");
  });

  it("restores disabled settings from the initial board when the Event deck metadata is absent", () => {
    const raw = JSON.parse(JSON.stringify(makeGame("off")));
    delete raw.civilizationEventDeck;
    const restored = normalizeState(raw);
    expect(restored.civilizationEventDeck.eventFrequency).toBe("off");
    expect(restored.civilizationEventDeck.definitionIds).toEqual([]);
    expect(deckEvents(restored)).toEqual([]);
  });

  it("retains old full-pool replays, including Containment Cascade, without requiring new metadata", () => {
    const legacy = initializeGame(players, 2, 20, "standard", { eventContentProfile: "general_v1" });
    const replayBoard = getReplayBoardSnapshot(legacy);
    delete replayBoard.eventContentProfile;
    delete replayBoard.eventFrequency;
    delete replayBoard.selectedEventDefinitionIds;
    const replay = initializeGame(players, 2, 20, "standard", { replayBoard, eventFrequency: "off" });
    expect(boardRows(replay)).toEqual(boardRows(legacy));
    expect(replay.civilizationEventDeck.contentProfile).toBe("general_v1");
    expect(replay.civilizationEventDeck.definitionIds).toEqual(GENERAL_CIVILIZATION_EVENT_CARD_IDS);
    expect(deckEvents(replay)).toContain("event_stellar_containment_cascade");
  });

  it("does not activate a valid but unselected Event inserted into a regular match", () => {
    const state = makeGame();
    state.currentPlayerIndex = 0;
    state.openingTurnOrder = null;
    state.activeLuminaries = [];
    for (const deck of [state.deckTier1, state.deckTier2, state.deckTier3]) {
      deck.splice(0, deck.length, ...deck.filter((id) => !isCivilizationEventCardId(id)));
    }
    const unselected = REGULAR_CIVILIZATION_EVENT_CARD_IDS.find((id) =>
      !state.civilizationEventDeck.definitionIds.includes(id))!;
    const tier = CIVILIZATION_EVENT_CARD_DEFINITIONS[unselected].tier;
    const forge = [state.forgeTier1, state.forgeTier2, state.forgeTier3][tier - 1];
    forge[0] = unselected;
    expect(applyAction(state, "p1", { type: "pass" })).toEqual({ success: true });
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect(state.civilizationEventDeck.completedEventIds).toEqual([]);
    expect(state.currentPlayerIndex).toBe(1);
  });

  it("honors an already queued legacy receipt even if future Event selection is disabled", () => {
    const state = initializeGame(players, 2, 20, "standard", { eventContentProfile: "general_v1" });
    state.currentPlayerIndex = 0;
    state.openingTurnOrder = null;
    state.activeLuminaries = [];
    for (const deck of [state.deckTier1, state.deckTier2, state.deckTier3]) {
      deck.splice(0, deck.length, ...deck.filter((id) => !isCivilizationEventCardId(id)));
    }
    state.forgeTier2[0] = "event_stellar_containment_cascade";
    expect(applyAction(state, "p1", { type: "pass" })).toEqual({ success: true });
    const eventId = state.pendingCivilizationEventCards[0].eventId;
    state.civilizationEventDeck.eventFrequency = "off";
    state.civilizationEventDeck.definitionIds = [];
    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(restored.pendingCivilizationEventCards[0].eventId).toBe(eventId);
    expect(applyAction(restored, "p1", { type: "resolve_civilization_event", eventId })).toEqual({ success: true });
    expect(restored.pendingCivilizationEventCards).toEqual([]);
    expect(restored.civilizationEventDeck.completedEventIds).toContain(eventId);
    expect(restored.civilizationEventDeck.eventFrequency).toBe("off");
    expect(restored.players[0].civilization.conditions).not.toEqual({});
  });
});

describe("authored Chronicle Event isolation", () => {
  it.each(["off", "standard", "frequent"] as const)("suppresses %s randomness and replay metadata", (frequency) => {
    for (const configure of [configureTraceScenario, configureRecurrenceScenario]) {
      const state = makeGame(frequency);
      configure(state, "p1", "p2", "primary");
      const restored = normalizeState(JSON.parse(JSON.stringify(state)));
      expect(deckEvents(restored)).toEqual([]);
      expect(restored.civilizationEventDeck.eventFrequency).toBe("off");
      expect(restored.civilizationEventDeck.definitionIds).toEqual([]);
      const replay = initializeGame(players, 2, 20, "standard", {
        replayBoard: getReplayBoardSnapshot(restored), eventFrequency: "frequent",
      });
      expect(deckEvents(replay)).toEqual([]);
      expect(formatGameState("room", "playing", restored, new Set()).eventCardPool).toEqual([]);
    }
    const state = initializeGame([...players, { id: "p3", name: "Three" }], 3, 20,
      "standard", { eventFrequency: frequency });
    configureTriangulationScenario(state, "p1", "p2", "p3", "primary");
    expect(deckEvents(state)).toEqual([]);
    expect(state.civilizationEventDeck.definitionIds).toEqual([]);
    expect(state.initialBoard?.eventFrequency).toBe("off");
    expect(state.initialBoard?.selectedEventDefinitionIds).toEqual([]);
  });
});
