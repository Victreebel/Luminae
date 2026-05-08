import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, roomsTable, playersTable, gameStatesTable } from "@workspace/db";
import { SubmitActionBody } from "@workspace/api-zod";
import {
  applyAction,
  formatGameState,
  normalizeState,
  type GameStateData,
  type ActionPayload,
  type CrystalColor,
} from "../lib/gameEngine";
import { broadcastToRoom, getConnectedPlayerIds, sendToPlayer, filterStateForPlayer } from "../lib/websocket";
import { runAiTurnsIfNeeded } from "../lib/aiTurnRunner";
import { withRoomLock } from "../lib/roomLock";
import { armTurnTimer, updateTurnDeadline } from "../lib/turnTimer";

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
      turnCount: 0,
      crystalBank: { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0 },
      marketTier1: [],
      marketTier2: [],
      marketTier3: [],
      deckCounts: { tier1: 0, tier2: 0, tier3: 0 },
      luminaries: [],
      luminaryAffinities: [],
      players: players.map((p) => ({
        playerId: p.id,
        playerName: p.name,
        avatarId: p.avatarId ?? null,
        crystals: { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0 },
        bonuses: { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0 },
        lumens: 0,
        reservedCards: [],
        purchasedCardIds: [],
        purchasedCards: [],
        isConnected: p.isAi ? true : p.isConnected,
        claimedLuminaryIds: [],
      })),
      winnerId: null,
      lastAction: null,
      actionLog: [],
      turnTimerSeconds: room.turnTimerSeconds ?? null,
      turnDeadline: null,
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
  const allPlayers = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.roomId, rawId));
  for (const p of allPlayers) {
    if (p.isAi) connectedIds.add(p.id);
  }
  const avatarMap = new Map<string, string | null>(
    allPlayers.map((p) => [p.id, p.avatarId ?? null]),
  );
  // Snapshot stored value BEFORE normalizeState (it mutates in place).
  const storedLuminaries = JSON.stringify(
    (gs.state as { activeLuminaries?: unknown }).activeLuminaries ?? [],
  );
  const normalized = normalizeState(gs.state);

  // Persist normalized state if it diverged from what's stored. This bakes
  // in any backward-compat migrations (e.g. re-rolled Luminaries from the
  // pre-redesign pantheon) so subsequent reads are deterministic.
  const normalizedLuminaries = JSON.stringify(normalized.activeLuminaries);
  if (storedLuminaries !== normalizedLuminaries) {
    await db
      .update(gameStatesTable)
      .set({
        state: normalized as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(gameStatesTable.roomId, rawId));
  }

  const formatted = formatGameState(
    rawId,
    room.status,
    normalized,
    connectedIds,
    avatarMap,
  );

  // Return only this player's own plannedAction; strip others' for privacy.
  res.json(filterStateForPlayer(formatted, player.id));
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

  // resolve_summon and toggle_luminary_affinity are non-turn-gated housekeeping
  // actions that must be accepted even when the game is finished (e.g. a
  // summon cutscene completes on the final turn). All other actions require the
  // room to be actively playing.
  const isHousekeepingAction =
    actionData.type === "resolve_summon" ||
    actionData.type === "toggle_luminary_affinity";

  if (!room || (room.status !== "playing" && !isHousekeepingAction)) {
    res.status(400).json({ error: "Game not in progress" });
    return;
  }

  // Build action payload
  const action: ActionPayload = {
    type: actionData.type as ActionPayload["type"],
    cardId: actionData.cardId ?? undefined,
    tier: actionData.tier as 1 | 2 | 3 | undefined,
    crystal: actionData.crystal as CrystalColor | undefined,
    crystals: actionData.crystals as Partial<Record<string, number>> | undefined,
    luminaryId: actionData.luminaryId ?? undefined,
    affinity: actionData.affinity as CrystalColor | undefined,
    eventId: actionData.eventId ?? undefined,
    plannedActionData: actionData.plannedActionData as ActionPayload | undefined,
  };

  // Serialize all read-modify-write on this room's state behind a per-room
  // mutex so we can't race with the AI turn runner.
  const outcome = await withRoomLock(rawId, async () => {
    const [gs] = await db
      .select()
      .from(gameStatesTable)
      .where(eq(gameStatesTable.roomId, rawId))
      .limit(1);

    if (!gs) {
      return { ok: false as const, status: 404, error: "Game state not found" };
    }

    const stateData = normalizeState(gs.state);
    const expectedVersion = stateData.version;

    const result = applyAction(stateData, player.id, action);
    if (!result.success) {
      req.log.warn({ actionType: action.type, error: result.error }, "Action failed");
      return { ok: false as const, status: 400, error: result.error };
    }

    // Refresh per-turn deadline based on configured timer.
    // Non-turn-gated actions that do not advance the turn must not reset it.
    // plan_action / cancel_plan don't advance the turn themselves (auto-execution
    // is internal to applyAction), so skip the deadline reset for them too.
    if (
      action.type !== "toggle_luminary_affinity" &&
      action.type !== "resolve_summon" &&
      action.type !== "plan_action" &&
      action.type !== "cancel_plan"
    ) {
      updateTurnDeadline(stateData);
    }

    if (stateData.phase === "finished") {
      await db
        .update(roomsTable)
        .set({ status: "finished", updatedAt: new Date() })
        .where(eq(roomsTable.id, rawId));
    }

    const updated = await db
      .update(gameStatesTable)
      .set({
        state: stateData as unknown as Record<string, unknown>,
        version: stateData.version,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(gameStatesTable.roomId, rawId),
          eq(gameStatesTable.version, expectedVersion),
        ),
      )
      .returning({ id: gameStatesTable.roomId });

    if (updated.length === 0) {
      return {
        ok: false as const,
        status: 409,
        error: "Game state changed concurrently, please retry",
      };
    }

    const connectedIds = getConnectedPlayerIds(rawId);
    const allPlayers = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.roomId, rawId));
    for (const p of allPlayers) {
      if (p.isAi) connectedIds.add(p.id);
    }
    const avatarMap = new Map<string, string | null>(
      allPlayers.map((p) => [p.id, p.avatarId ?? null]),
    );
    const formatted = formatGameState(rawId, room.status, stateData, connectedIds, avatarMap);

    // Send each human player a view of the state with other players' planned
    // actions stripped out.  AI players don't hold WebSocket connections.
    for (const p of allPlayers) {
      if (p.isAi) continue;
      sendToPlayer(rawId, p.id, {
        type: "state_update",
        state: filterStateForPlayer(formatted, p.id),
      });
    }
    if (
      action.type !== "toggle_luminary_affinity" &&
      action.type !== "plan_action" &&
      action.type !== "cancel_plan"
    ) {
      armTurnTimer(rawId, stateData);
    }
    return { ok: true as const, formatted };
  });

  if (!outcome.ok) {
    res.status(outcome.status).json({ error: outcome.error });
    return;
  }

  // REST response also strips other players' plans for the requesting player.
  res.json(filterStateForPlayer(outcome.formatted, player.id));

  // If next player is an AI, kick off AI turn loop in background
  void runAiTurnsIfNeeded(rawId);
});

export default router;
