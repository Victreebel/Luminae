import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { chooseAiAction, dbSelect, dbUpdate } = vi.hoisted(() => ({
  chooseAiAction: vi.fn((
    _state: unknown,
    _playerId: string,
    _difficulty: string,
    _policy?: { allowEncryption?: boolean; strategy?: string },
  ) => ({ type: "pass" as const })),
  dbSelect: vi.fn(() => {
    throw new Error("balance-lab AI attempted a database read");
  }),
  dbUpdate: vi.fn(() => {
    throw new Error("balance-lab AI attempted a database write");
  }),
}));

vi.mock("@workspace/db", () => ({
  db: { select: dbSelect, update: dbUpdate },
  roomsTable: { id: "rooms.id", status: "rooms.status" },
  playersTable: { id: "players.id", roomId: "players.roomId" },
  gameStatesTable: { roomId: "game_states.roomId" },
}));
vi.mock("./aiPlayer", () => ({ chooseAiAction }));
vi.mock("./websocket", () => ({
  getConnectedPlayerIds: vi.fn(() => new Set<string>()),
  sendToPlayer: vi.fn(),
  filterStateForPlayer: vi.fn((state: unknown) => state),
}));
vi.mock("./turnTimer", () => ({
  armTurnTimer: vi.fn(),
  updateTurnDeadline: vi.fn(),
}));
vi.mock("./finishedGame", () => ({ completeFinishedGame: vi.fn() }));

import {
  applyAction,
  getBalanceRulesetCandidate,
  initializeGame,
} from "./gameEngine";
import {
  addBalanceLabMemoryAiPlayer,
  applyBalanceLabRoomRuleset,
  clearBalanceLabRoom,
  createBalanceLabMemoryRoom,
  getBalanceLabMemoryStateSnapshot,
  saveBalanceLabMemoryState,
  startBalanceLabMemoryRoom,
} from "./balanceLabRooms";
import { runAiTurnsIfNeeded } from "./aiTurnRunner";

describe("in-memory balance-lab AI lifecycle", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let roomId: string | null = null;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
    chooseAiAction.mockClear();
    dbSelect.mockClear();
    dbUpdate.mockClear();
  });

  afterEach(() => {
    if (roomId) clearBalanceLabRoom(roomId);
    roomId = null;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("advances every rival turn in memory and returns control to the creator", async () => {
    const created = createBalanceLabMemoryRoom({
      hostName: "Balance Architect",
      maxPlayers: 4,
      victoryRequirement: 20,
      cinematicMode: "standard",
      avatarId: "stargazer",
      candidateId: "control",
    });
    roomId = created.room.id;
    for (let seat = 1; seat < 4; seat += 1) {
      addBalanceLabMemoryAiPlayer(created.room.id, {
        name: `Rival ${seat}`,
        avatarId: `rival-${seat}`,
        difficulty: "hard",
      });
    }

    const ruleset = getBalanceRulesetCandidate("control")!;
    const state = initializeGame(
      created.room.players.map((player) => ({ id: player.id, name: player.name })),
      4,
      20,
      "standard",
      { balanceRuleset: ruleset },
    );
    state.activeLuminaries = [];
    state.luminaryAffinities = [];
    state.currentPlayerIndex = 0;
    const startedAt = state.startedAt ?? Date.now();
    state.openingTurnOrder = {
      id: `${startedAt}:${created.player.id}`,
      startedAt,
      firstPlayerId: created.player.id,
      playerIds: state.players.map((player) => player.playerId),
    };
    if (state.initialBoard) state.initialBoard.firstPlayerId = created.player.id;
    expect(startBalanceLabMemoryRoom(created.room.id, state)).toBe(true);

    const afterCreate = getBalanceLabMemoryStateSnapshot(created.room.id)!;
    applyBalanceLabRoomRuleset(created.room.id, afterCreate);
    const humanExpectedVersion = afterCreate.version;
    expect(applyAction(afterCreate, created.player.id, { type: "pass" }).success).toBe(true);
    expect(afterCreate.players[afterCreate.currentPlayerIndex]?.playerId).toBe(
      created.room.players[1]?.id,
    );
    expect(saveBalanceLabMemoryState(
      created.room.id,
      afterCreate,
      humanExpectedVersion,
    )).toBe(true);

    await runAiTurnsIfNeeded(created.room.id, { skipDelays: true });

    const afterRivals = getBalanceLabMemoryStateSnapshot(created.room.id)!;
    expect(afterRivals.players[afterRivals.currentPlayerIndex]?.playerId).toBe(
      created.player.id,
    );
    expect(afterRivals.turnCount).toBe(state.turnCount + 4);
    expect(chooseAiAction).toHaveBeenCalledTimes(3);
    for (const call of chooseAiAction.mock.calls) {
      expect(call[3]).toEqual({ allowEncryption: true, strategy: "adaptive" });
    }
    expect(dbSelect).not.toHaveBeenCalled();
    expect(dbUpdate).not.toHaveBeenCalled();
  });
});
