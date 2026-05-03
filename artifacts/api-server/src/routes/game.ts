import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, roomsTable, playersTable, gameStatesTable } from "@workspace/db";
import { SubmitActionBody } from "@workspace/api-zod";
import {
  applyAction,
  formatGameState,
  type GameStateData,
  type ActionPayload,
  type CrystalColor,
} from "../lib/gameEngine";
import { broadcastToRoom, getConnectedPlayerIds } from "../lib/websocket";

const router: IRouter = Router();

// GET /api/rooms/:roomId/state
router.get("/rooms/:roomId/state", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;
  const { sessionToken } = req.query as { sessionToken?: string };

  if (!sessionToken) {
    res.status(400).json({ error: "sessionToken required" });
    return;
  }

  // Verify membership
  const [player] = await db
    .select()
    .from(playersTable)
    .where(
      and(
        eq(playersTable.sessionToken, sessionToken),
        eq(playersTable.roomId, rawId),
      ),
    )
    .limit(1);

  if (!player) {
    res.status(403).json({ error: "Not a member of this room" });
    return;
  }

  const [room] = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.id, rawId))
    .limit(1);

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  if (room.status === "lobby") {
    // Return lobby state — not a full game state yet
    const players = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.roomId, rawId))
      .orderBy(playersTable.orderIndex);

    res.json({
      roomId: rawId,
      status: "lobby",
      currentPlayerIndex: 0,
      roundNumber: 0,
      crystalBank: { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0 },
      marketTier1: [],
      marketTier2: [],
      marketTier3: [],
      deckCounts: { tier1: 0, tier2: 0, tier3: 0 },
      luminaries: [],
      players: players.map((p) => ({
        playerId: p.id,
        playerName: p.name,
        crystals: { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0 },
        bonuses: { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0 },
        prestige: 0,
        reservedCards: [],
        purchasedCardIds: [],
        isConnected: p.isConnected,
      })),
      winnerId: null,
      lastAction: null,
      version: 0,
    });
    return;
  }

  const [gs] = await db
    .select()
    .from(gameStatesTable)
    .where(eq(gameStatesTable.roomId, rawId))
    .limit(1);

  if (!gs) {
    res.status(404).json({ error: "Game state not found" });
    return;
  }

  const connectedIds = getConnectedPlayerIds(rawId);
  const formatted = formatGameState(
    rawId,
    room.status,
    gs.state as unknown as GameStateData,
    connectedIds,
  );

  res.json(formatted);
});

// POST /api/rooms/:roomId/actions
router.post("/rooms/:roomId/actions", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;

  const parsed = SubmitActionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sessionToken, ...actionData } = parsed.data;

  // Verify membership
  const [player] = await db
    .select()
    .from(playersTable)
    .where(
      and(
        eq(playersTable.sessionToken, sessionToken),
        eq(playersTable.roomId, rawId),
      ),
    )
    .limit(1);

  if (!player) {
    res.status(403).json({ error: "Not a member of this room" });
    return;
  }

  const [room] = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.id, rawId))
    .limit(1);

  if (!room || room.status !== "playing") {
    res.status(400).json({ error: "Game not in progress" });
    return;
  }

  const [gs] = await db
    .select()
    .from(gameStatesTable)
    .where(eq(gameStatesTable.roomId, rawId))
    .limit(1);

  if (!gs) {
    res.status(404).json({ error: "Game state not found" });
    return;
  }

  const stateData = gs.state as unknown as GameStateData;

  // Build action payload
  const action: ActionPayload = {
    type: actionData.type as ActionPayload["type"],
    cardId: actionData.cardId ?? undefined,
    tier: actionData.tier as 1 | 2 | 3 | undefined,
    crystal: actionData.crystal as CrystalColor | undefined,
    crystals: actionData.crystals as Partial<Record<string, number>> | undefined,
  };

  const result = applyAction(stateData, player.id, action);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  // If game is finished, update room status
  if (stateData.phase === "finished") {
    await db
      .update(roomsTable)
      .set({ status: "finished", updatedAt: new Date() })
      .where(eq(roomsTable.id, rawId));
  }

  // Save updated state
  await db
    .update(gameStatesTable)
    .set({
      state: stateData as unknown as Record<string, unknown>,
      version: stateData.version,
      updatedAt: new Date(),
    })
    .where(eq(gameStatesTable.roomId, rawId));

  const connectedIds = getConnectedPlayerIds(rawId);
  const formatted = formatGameState(rawId, room.status, stateData, connectedIds);

  // Broadcast to all players
  broadcastToRoom(rawId, { type: "state_update", state: formatted });

  res.json(formatted);
});

export default router;
