import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  updateSet,
  update,
  finalizeAccountProgressForRoom,
  finalizeClearanceWithdrawal,
  recordGameResult,
} = vi.hoisted(() => {
  const updateWhere = vi.fn(async () => undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  return {
    updateSet,
    update: vi.fn(() => ({ set: updateSet })),
    finalizeAccountProgressForRoom: vi.fn(),
    finalizeClearanceWithdrawal: vi.fn(),
    recordGameResult: vi.fn(),
  };
});

vi.mock("drizzle-orm", () => ({ eq: vi.fn(() => true) }));
vi.mock("@workspace/db", () => ({
  db: { update },
  roomsTable: { id: "room-id" },
}));
vi.mock("./accountProgress", () => ({
  finalizeAccountProgressForRoom,
  finalizeClearanceWithdrawal,
}));
vi.mock("./rematchManager", () => ({ recordGameResult }));

import {
  clearBalanceLabRoom,
  createBalanceLabMemoryRoom,
  getBalanceLabMemoryRoom,
} from "./balanceLabRooms";
import { completeFinishedGame } from "./finishedGame";
import type { GameStateData } from "./gameEngine";

describe("finished balance laboratory games", () => {
  let roomId: string | null = null;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    if (roomId) clearBalanceLabRoom(roomId);
    roomId = null;
    process.env.NODE_ENV = originalNodeEnv;
    vi.clearAllMocks();
  });

  it("finishes entirely in memory without touching room, account, or rematch persistence", async () => {
    const created = createBalanceLabMemoryRoom({
      hostName: "Balance Architect",
      maxPlayers: 2,
      victoryRequirement: 20,
      cinematicMode: "standard",
      avatarId: null,
      candidateId: "focus",
    });
    roomId = created.room.id;
    const state = {
      phase: "finished",
      finishReason: "win",
      startedAt: 1,
      players: [],
      winnerId: null,
    } as unknown as GameStateData;

    await completeFinishedGame(created.room.id, state);

    expect(getBalanceLabMemoryRoom(created.room.id)?.status).toBe("finished");
    expect(update).not.toHaveBeenCalled();
    expect(updateSet).not.toHaveBeenCalled();
    expect(finalizeClearanceWithdrawal).not.toHaveBeenCalled();
    expect(finalizeAccountProgressForRoom).not.toHaveBeenCalled();
    expect(recordGameResult).not.toHaveBeenCalled();
  });
});
