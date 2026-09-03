import { Router, type IRouter, type Response } from "express";
import { z } from "zod";
import {
  createBalanceLabMemoryRoom,
  configureBalanceLabRoom,
  getBalanceLabRoomCandidate,
  getBalanceLabMemoryPlayerBySession,
  getBalanceLabMemoryRoom,
} from "../lib/balanceLabRooms";
import { requireUuidParam } from "../lib/routeParams";

const router: IRouter = Router();
router.param("roomId", requireUuidParam);

const ConfigureBalanceRoomBody = z.object({
  sessionToken: z.string().regex(/^[a-f0-9]{64}$/),
  candidateId: z.string().min(1).max(64),
}).strict();

const CreateBalanceRoomBody = z.object({
  hostName: z.string().trim().min(1).max(50),
  maxPlayers: z.number().int().min(2).max(4),
  victoryRequirement: z.union([z.literal(15), z.literal(20), z.literal(25)]),
  cinematicMode: z.union([z.literal("standard"), z.literal("epic")]).default("standard"),
  avatarId: z.string().min(1).max(64).nullable().optional(),
  candidateId: z.string().min(1).max(64),
}).strict();

function developmentOnly(res: Response): boolean {
  if (process.env.NODE_ENV === "development") return true;
  res.status(404).json({ error: "Not found" });
  return false;
}

function serializeMemoryPlayer(player: NonNullable<ReturnType<typeof getBalanceLabMemoryPlayerBySession>>) {
  return {
    id: player.id,
    name: player.name,
    isHost: player.isHost,
    isConnected: player.isAi ? true : player.isConnected,
    orderIndex: player.orderIndex,
    isAi: player.isAi,
    aiDifficulty: player.aiDifficulty,
    avatarId: player.avatarId,
  };
}

router.post("/dev/balance/rooms", async (req, res): Promise<void> => {
  if (!developmentOnly(res)) return;
  const parsed = CreateBalanceRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const created = createBalanceLabMemoryRoom({
      ...parsed.data,
      avatarId: parsed.data.avatarId ?? null,
    });
    const player = serializeMemoryPlayer(created.player);
    res.status(201).json({
      room: {
        id: created.room.id,
        inviteCode: created.room.inviteCode,
        status: created.room.status,
        maxPlayers: created.room.maxPlayers,
        victoryRequirement: created.room.victoryRequirement,
        cinematicMode: created.room.cinematicMode,
        turnTimerSeconds: created.room.turnTimerSeconds,
        gameMode: created.room.gameMode,
        scenarioId: created.room.scenarioId,
        blueprintPolicy: created.room.blueprintPolicy,
        players: [player],
      },
      player,
      sessionToken: created.sessionToken,
      candidateId: created.room.candidateId,
      persistent: false,
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not create balance room" });
  }
});

router.post("/dev/balance/rooms/:roomId", async (req, res): Promise<void> => {
  if (!developmentOnly(res)) return;
  const parsed = ConfigureBalanceRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const roomId = String(req.params.roomId);
  const memoryRoom = getBalanceLabMemoryRoom(roomId);
  if (memoryRoom) {
    const membership = getBalanceLabMemoryPlayerBySession(
      roomId,
      parsed.data.sessionToken,
    );
    if (!membership?.isHost) {
      res.status(403).json({ error: "Only the host may configure a balance room" });
      return;
    }
    if (memoryRoom.status !== "lobby") {
      res.status(409).json({ error: "Balance rules must be selected before the room starts" });
      return;
    }
    try {
      const ruleset = configureBalanceLabRoom(roomId, parsed.data.candidateId);
      res.json({ roomId, candidateId: ruleset.id, persistent: false });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown candidate" });
    }
    return;
  }
  res.status(404).json({
    error: "Balance rooms must be created through the in-memory laboratory endpoint",
  });
});

router.get("/dev/balance/rooms/:roomId", async (req, res): Promise<void> => {
  if (!developmentOnly(res)) return;
  const roomId = String(req.params.roomId);
  const candidateId = getBalanceLabRoomCandidate(roomId);
  if (!candidateId) {
    res.status(404).json({ error: "Balance room is not configured in this server process" });
    return;
  }
  res.json({ roomId, candidateId, persistent: false });
});

export default router;
