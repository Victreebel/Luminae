import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyAction,
  initializeGame,
  getBalanceRuleset,
  getBalanceRulesetCandidate,
} from "./gameEngine";
import {
  addBalanceLabMemoryAiPlayer,
  applyBalanceLabRoomRuleset,
  BalanceLabConfigurationUnavailableError,
  clearBalanceLabRoom,
  configureBalanceLabRoom,
  createBalanceLabMemoryRoom,
  finishBalanceLabMemoryRoom,
  getBalanceLabMemoryRoom,
  getBalanceLabMemoryStateSnapshot,
  getBalanceLabRoomCandidate,
  isBalanceLabRoom,
  saveBalanceLabMemoryState,
  startBalanceLabMemoryRoom,
} from "./balanceLabRooms";

describe("balance laboratory room isolation", () => {
  const roomId = "dev-balance-room";
  const createdRoomIds: string[] = [];
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    clearBalanceLabRoom(roomId);
    for (const id of createdRoomIds.splice(0)) clearBalanceLabRoom(id);
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("keeps a candidate in process memory and reattaches it to a loaded state", () => {
    configureBalanceLabRoom(roomId, "focus");
    const state = initializeGame([
      { id: "p1", name: "One" },
      { id: "p2", name: "Two" },
    ], 2);

    expect(getBalanceLabRoomCandidate(roomId)).toBe("focus");
    expect(isBalanceLabRoom(roomId)).toBe(true);
    expect(applyBalanceLabRoomRuleset(roomId, state)?.encryptReward).toBe("artifact_bound_focus");
    expect(getBalanceRuleset(state).id).toBe("focus");
  });

  it("does not attach anything to an ordinary room", () => {
    const state = initializeGame([
      { id: "p1", name: "One" },
      { id: "p2", name: "Two" },
    ], 2);
    expect(applyBalanceLabRoomRuleset("ordinary-room", state)).toBeNull();
    expect(isBalanceLabRoom("ordinary-room")).toBe(false);
    expect(getBalanceRuleset(state).id).toBe("control");
  });

  it("refuses to continue a persisted experiment after its process-local mapping is lost", () => {
    configureBalanceLabRoom(roomId, "focus");
    const state = initializeGame([
      { id: "p1", name: "One" },
      { id: "p2", name: "Two" },
    ], 2, 15, "standard", {
      balanceRuleset: getBalanceRulesetCandidate("focus")!,
    });
    clearBalanceLabRoom(roomId);

    expect(() => applyBalanceLabRoomRuleset(roomId, state)).toThrow(
      BalanceLabConfigurationUnavailableError,
    );
  });

  it("keeps the complete room, players, and versioned game state in process memory", () => {
    const created = createBalanceLabMemoryRoom({
      hostName: "Balance Architect",
      maxPlayers: 2,
      victoryRequirement: 20,
      cinematicMode: "standard",
      avatarId: "stargazer",
      candidateId: "focus",
    });
    createdRoomIds.push(created.room.id);
    const rival = addBalanceLabMemoryAiPlayer(created.room.id, {
      name: "Rival",
      avatarId: "oracle",
      difficulty: "hard",
    });
    const ruleset = getBalanceRulesetCandidate("focus")!;
    const state = initializeGame(
      created.room.players.map((player) => ({ id: player.id, name: player.name })),
      2,
      20,
      "standard",
      { balanceRuleset: ruleset },
    );
    state.activeLuminaries = [];

    expect(startBalanceLabMemoryRoom(created.room.id, state)).toBe(true);
    expect(getBalanceLabMemoryRoom(created.room.id)?.status).toBe("playing");
    const loaded = getBalanceLabMemoryStateSnapshot(created.room.id)!;
    expect(loaded).not.toBe(state);
    expect(loaded.players.map((player) => player.playerId)).toEqual([
      created.player.id,
      rival.id,
    ]);
    expect(getBalanceRuleset(loaded).id).toBe("control");
    expect(applyBalanceLabRoomRuleset(created.room.id, loaded)?.id).toBe("focus");

    const expectedVersion = loaded.version;
    loaded.currentPlayerIndex = loaded.players.findIndex(
      (player) => player.playerId === created.player.id,
    );
    expect(applyAction(loaded, created.player.id, { type: "pass" }).success).toBe(true);
    expect(saveBalanceLabMemoryState(created.room.id, loaded, expectedVersion)).toBe(true);
    expect(saveBalanceLabMemoryState(created.room.id, state, expectedVersion)).toBe(false);

    const finished = getBalanceLabMemoryStateSnapshot(created.room.id)!;
    finished.phase = "finished";
    finished.finishReason = "win";
    expect(finishBalanceLabMemoryRoom(created.room.id, finished)).toBe(true);
    expect(getBalanceLabMemoryRoom(created.room.id)?.status).toBe("finished");
    expect(getBalanceLabMemoryStateSnapshot(created.room.id)?.phase).toBe("finished");
  });

  it("fails closed unless the API process is explicitly in development", () => {
    process.env.NODE_ENV = "test";
    expect(() => createBalanceLabMemoryRoom({
      hostName: "Should Not Exist",
      maxPlayers: 2,
      victoryRequirement: 15,
      cinematicMode: "standard",
      avatarId: null,
      candidateId: "control",
    })).toThrow("only in development");
    expect(() => configureBalanceLabRoom("ordinary-room", "control")).toThrow(
      "only in development",
    );
    expect(isBalanceLabRoom("ordinary-room")).toBe(false);
  });
});
