import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, roomsTable, playersTable, gameStatesTable } from "@workspace/db";
import { SubmitActionBody } from "@workspace/api-zod";
import { CARD_LORE } from "../lib/cardLore";
import {
  applyAction,
  formatGameState,
  normalizeState,
  parseAiDifficulty,
  runDevLuminarySequence,
  type ActionPayload,
  type NaturalAffinityKey,
  type AffinityCounts,
} from "../lib/gameEngine";
import {
  applyBalanceLabRoomRuleset,
  BalanceLabConfigurationUnavailableError,
  getBalanceLabMemoryPlayerBySession,
  getBalanceLabMemoryRoom,
  getBalanceLabMemoryStateSnapshot,
  saveBalanceLabMemoryState,
  type BalanceLabMemoryRoom,
} from "../lib/balanceLabRooms";
import { getConnectedPlayerIds, sendToPlayer, filterStateForPlayer } from "../lib/websocket";
import { runAiTurnsIfNeeded } from "../lib/aiTurnRunner";
import { withRoomLock } from "../lib/roomLock";
import { armTurnTimer, updateTurnDeadline } from "../lib/turnTimer";
import { completeFinishedGame } from "../lib/finishedGame";
import {
  captureDevSnapshot,
  getDevSnapshot,
  prepareDevSequenceState,
} from "../lib/devRewind";
import { requireUuidParam } from "../lib/routeParams";

const router: IRouter = Router();
router.param("roomId", requireUuidParam);
const GameSessionToken = z.string().regex(/^[a-f0-9]{64}$/);
const AffinityCountBody = z.object({
  flare: z.number().int().min(0).max(10),
  continuum: z.number().int().min(0).max(10),
  verdance: z.number().int().min(0).max(10),
  abyss: z.number().int().min(0).max(10),
  radiance: z.number().int().min(0).max(10),
  singularity: z.number().int().min(0).max(10),
}).strict();
const SubmitActionRequestBody = SubmitActionBody.extend({
  sessionToken: GameSessionToken,
  affinities: AffinityCountBody.optional(),
  returnAffinities: AffinityCountBody.partial().optional(),
  cardId: z.string().min(1).max(64).optional(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  luminaryId: z.string().min(1).max(64).optional(),
  eventId: z.string().min(1).max(128).optional(),
  civName: z.string().trim().min(1).max(50).optional(),
  orderedIds: z.array(z.string().min(1).max(64)).max(17).optional(),
}).strict();
const GameStateQuery = z.object({ sessionToken: GameSessionToken }).strict();
const DevLuminarySequenceBody = z.object({
  sessionToken: GameSessionToken,
  luminaryIds: z.array(z.string().min(1).max(64)).min(1).max(17),
  includeNextTurnEffects: z.boolean().optional(),
  // Accepted temporarily so a stale development client can still run the Lab.
  includeEndOfTurnEffects: z.boolean().optional(),
  includeStartOfTurnEffects: z.boolean().optional(),
  repeatFromBaseline: z.boolean().optional().default(true),
}).strict();

function formatBalanceLabState(room: BalanceLabMemoryRoom, stateData: ReturnType<typeof normalizeState>) {
  const connectedIds = getConnectedPlayerIds(room.id);
  for (const player of room.players) {
    if (player.isAi) connectedIds.add(player.id);
  }
  const avatarMap = new Map<string, string | null>(
    room.players.map((player) => [player.id, player.avatarId]),
  );
  const aiMap = new Map(
    room.players.map((player) => [player.id, {
      isAi: player.isAi,
      aiDifficulty: player.aiDifficulty,
    }]),
  );
  return formatGameState(
    room.id,
    room.status,
    stateData,
    connectedIds,
    avatarMap,
    aiMap,
    null,
  );
}

// GET /api/rooms/:roomId/state
router.get("/rooms/:roomId/state", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;
  const query = GameStateQuery.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "A valid sessionToken is required" });
    return;
  }
  const { sessionToken } = query.data;

  const memoryRoom = getBalanceLabMemoryRoom(rawId);
  if (memoryRoom) {
    const player = getBalanceLabMemoryPlayerBySession(rawId, sessionToken);
    if (!player) {
      res.status(403).json({ error: "Not a member of this room" });
      return;
    }
    const snapshot = getBalanceLabMemoryStateSnapshot(rawId);
    if (!snapshot) {
      res.status(memoryRoom.status === "lobby" ? 409 : 404).json({
        error: memoryRoom.status === "lobby" ? "Game has not started" : "Game state not found",
      });
      return;
    }
    const normalized = normalizeState(snapshot);
    applyBalanceLabRoomRuleset(rawId, normalized);
    res.json(filterStateForPlayer(formatBalanceLabState(memoryRoom, normalized), player.id));
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
      scenarioId: room.scenarioId,
      finishReason: null,
      currentPlayerIndex: 0,
      roundNumber: 0,
      turnCount: 0,
      affinityWell: { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0 },
      forgeTier1: [],
      forgeTier2: [],
      forgeTier3: [],
      deckCounts: { tier1: 0, tier2: 0, tier3: 0 },
      luminaries: [],
      luminaryAffinities: [],
      players: players.map((p) => ({
        playerId: p.id,
        playerName: p.name,
        avatarId: p.avatarId ?? null,
        isAi: p.isAi,
        aiDifficulty: p.aiDifficulty != null ? parseAiDifficulty(p.aiDifficulty) : null,
        affinities: { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0 },
        bonuses: { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0 },
        eminence: 0,
        reservedArtifacts: [],
        forgedArtifactIds: [],
        forgedArtifacts: [],
        isConnected: p.isAi ? true : p.isConnected,
        claimedLuminaryIds: [],
      })),
      winnerId: null,
      lastAction: null,
      actionLog: [],
      turnTimerSeconds: room.turnTimerSeconds ?? null,
      turnDeadline: null,
      version: 0,
      pendingSummonEvents: [],
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
  const aiMap = new Map(
    allPlayers.map((p) => [p.id, { isAi: p.isAi, aiDifficulty: p.aiDifficulty != null ? parseAiDifficulty(p.aiDifficulty) : null }]),
  );
  // Snapshot stored value BEFORE normalizeState (it mutates in place).
  const storedLuminaries = JSON.stringify(
    (gs.state as { activeLuminaries?: unknown }).activeLuminaries ?? [],
  );
  const storedBrokenCovenant = (gs.state as { brokenCovenantDeclared?: unknown }).brokenCovenantDeclared === true;
  const storedThresholdApproach = (gs.state as { lumiiThresholdApproach?: unknown }).lumiiThresholdApproach;
  const normalized = normalizeState(gs.state);
  if (room.scenarioId === "blueprint_clearance_lumii") {
    normalized.brokenCovenantDeclared = true;
    normalized.lumiiThresholdApproach ??= "inquiry";
  }

  // Persist normalized state if it diverged from what's stored. This bakes
  // in any backward-compat migrations (e.g. re-rolled Luminaries from the
  // pre-redesign pantheon) so subsequent reads are deterministic.
  const normalizedLuminaries = JSON.stringify(normalized.activeLuminaries);
  if (
    storedLuminaries !== normalizedLuminaries ||
    storedBrokenCovenant !== normalized.brokenCovenantDeclared ||
    storedThresholdApproach !== normalized.lumiiThresholdApproach
  ) {
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
    aiMap,
    room.scenarioId,
  );

  // Return only this player's own plannedAction; strip others' for privacy.
  res.json(filterStateForPlayer(formatted, player.id));
});

// POST /api/rooms/:roomId/actions
router.post("/rooms/:roomId/actions", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;

  const parsed = SubmitActionRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sessionToken, ...actionData } = parsed.data;
  const action: ActionPayload = {
    type: actionData.type as ActionPayload["type"],
    cardId: actionData.cardId ?? undefined,
    tier: actionData.tier as 1 | 2 | 3 | undefined,
    affinity: actionData.affinity as NaturalAffinityKey | undefined,
    affinities: actionData.affinities as Partial<Record<string, number>> | undefined,
    returnAffinities: actionData.returnAffinities as Partial<AffinityCounts> | undefined,
    luminaryId: actionData.luminaryId ?? undefined,
    eventId: actionData.eventId ?? undefined,
    plannedActionData: actionData.plannedActionData as ActionPayload | undefined,
    orderedIds: Array.isArray(actionData.orderedIds) ? actionData.orderedIds : undefined,
    confirmOverdrive: actionData.confirmOverdrive ?? undefined,
    voidSealAffinity: actionData.voidSealAffinity as NaturalAffinityKey | undefined,
  };
  const isHousekeepingAction =
    actionData.type === "resolve_summon" ||
    actionData.type === "resolve_luminary_activation";

  const memoryRoom = getBalanceLabMemoryRoom(rawId);
  if (memoryRoom) {
    const player = getBalanceLabMemoryPlayerBySession(rawId, sessionToken);
    if (!player) {
      res.status(403).json({ error: "Not a member of this room" });
      return;
    }
    if (memoryRoom.status !== "playing" && !isHousekeepingAction) {
      res.status(400).json({ error: "Game not in progress" });
      return;
    }

    const outcome = await withRoomLock(rawId, async () => {
      const latestRoom = getBalanceLabMemoryRoom(rawId);
      const snapshot = getBalanceLabMemoryStateSnapshot(rawId);
      if (!latestRoom || !snapshot) {
        return { ok: false as const, status: 404, error: "Game state not found" };
      }
      const stateData = normalizeState(snapshot);
      applyBalanceLabRoomRuleset(rawId, stateData);
      const expectedVersion = stateData.version;
      const isPreFirstLuminary =
        stateData.pendingSummonEvents.length === 0 &&
        stateData.players.every((candidate) => (candidate.luminaries ?? []).length === 0);
      const preActionSnapshot = isPreFirstLuminary
        ? structuredClone(stateData)
        : null;

      const result = applyAction(stateData, player.id, action);
      if (!result.success) {
        return { ok: false as const, status: 400, error: result.error };
      }
      if (preActionSnapshot && stateData.pendingSummonEvents.length > 0) {
        captureDevSnapshot(rawId, preActionSnapshot);
      }
      if (
        action.type !== "plan_action" &&
        action.type !== "cancel_plan" &&
        action.type !== "set_civ_name"
      ) {
        updateTurnDeadline(stateData);
      }
      if (!saveBalanceLabMemoryState(rawId, stateData, expectedVersion)) {
        return {
          ok: false as const,
          status: 409,
          error: "Game state changed concurrently, please retry",
        };
      }
      if (stateData.phase === "finished") {
        await completeFinishedGame(rawId, stateData);
      }

      const formatted = formatBalanceLabState(latestRoom, stateData);
      if (stateData.version > expectedVersion) {
        for (const candidate of latestRoom.players) {
          if (candidate.isAi) continue;
          sendToPlayer(rawId, candidate.id, {
            type: "state_update",
            state: filterStateForPlayer(formatted, candidate.id),
          });
        }
      }
      return { ok: true as const, formatted };
    });

    if (!outcome.ok) {
      res.status(outcome.status).json({ error: outcome.error });
      return;
    }
    res.json(filterStateForPlayer(outcome.formatted, player.id));
    void runAiTurnsIfNeeded(rawId);
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

  if (!room || (room.status !== "playing" && !isHousekeepingAction)) {
    res.status(400).json({ error: "Game not in progress" });
    return;
  }

  // Serialize all read-modify-write on this room's state behind a per-room
  // mutex so we can't race with the AI turn runner.
  const outcome = await withRoomLock(rawId, async () => {
    const [[gs], [room]] = await Promise.all([
      db.select().from(gameStatesTable).where(eq(gameStatesTable.roomId, rawId)).limit(1),
      db.select().from(roomsTable).where(eq(roomsTable.id, rawId)).limit(1),
    ]);

    if (!gs || !room) {
      return { ok: false as const, status: 404, error: "Game state not found" };
    }

    const stateData = normalizeState(gs.state);
    try {
      applyBalanceLabRoomRuleset(rawId, stateData);
    } catch (error) {
      if (error instanceof BalanceLabConfigurationUnavailableError) {
        return { ok: false as const, status: 409, error: error.message };
      }
      throw error;
    }
    const expectedVersion = stateData.version;

    // DEV: capture a snapshot just before the first Luminary is claimed so
    // the rewind endpoint can restore it for animation testing.
    const isPreFirstLuminary =
      process.env.NODE_ENV !== "production" &&
      stateData.pendingSummonEvents.length === 0 &&
      stateData.players.every((p) => (p.luminaries ?? []).length === 0);
    const preActionSnapshot = isPreFirstLuminary
      ? (JSON.parse(JSON.stringify(stateData)) as typeof stateData)
      : null;

    const result = applyAction(stateData, player.id, action);
    if (!result.success) {
      req.log.warn({ actionType: action.type, error: result.error }, "Action failed");
      return { ok: false as const, status: 400, error: result.error };
    }

    // DEV: if the action just triggered the first Luminary claim, commit snapshot.
    if (preActionSnapshot && stateData.pendingSummonEvents.length > 0) {
      captureDevSnapshot(rawId, preActionSnapshot);
    }

    // Refresh the deadline for every resolution acknowledgement. Intermediate
    // stages keep it paused; the final acknowledgement starts the incoming
    // player's full timer. Provisional planning and metadata edits do not.
    if (
      action.type !== "plan_action" &&
      action.type !== "cancel_plan" &&
      action.type !== "set_civ_name"
    ) {
      updateTurnDeadline(stateData);
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

    if (stateData.phase === "finished") {
      await completeFinishedGame(rawId, stateData);
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
    const aiMap = new Map(
      allPlayers.map((p) => [p.id, { isAi: p.isAi, aiDifficulty: p.aiDifficulty != null ? parseAiDifficulty(p.aiDifficulty) : null }]),
    );
    const formatted = formatGameState(rawId, room.status, stateData, connectedIds, avatarMap, aiMap, room.scenarioId);

    // Send each human player a view of the state with other players' planned
    // actions stripped out.  AI players don't hold WebSocket connections.
    // Skip the broadcast when the action was a no-op (idempotent actions such
    // as set_civ_name with an unchanged name leave state.version untouched).
    // Broadcasting an unchanged state triggers onStateUpdate on all clients,
    // which invalidates TanStack Query cache and causes visible re-renders.
    if (stateData.version > expectedVersion) {
      for (const p of allPlayers) {
        if (p.isAi) continue;
        sendToPlayer(rawId, p.id, {
          type: "state_update",
          state: filterStateForPlayer(formatted, p.id),
        });
      }
    }
    if (
      action.type !== "plan_action" &&
      action.type !== "cancel_plan" &&
      action.type !== "set_civ_name"
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

// POST /api/dev/rooms/:roomId/luminary-sequence
// DEV-ONLY: claim an ordered set of Luminaries for the requesting player and
// queue their normal arrival/effect events in the live game state.
router.post("/dev/rooms/:roomId/luminary-sequence", async (req, res): Promise<void> => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Not available in production" });
    return;
  }

  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;
  const parsed = DevLuminarySequenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [player] = await db
    .select()
    .from(playersTable)
    .where(
      and(
        eq(playersTable.sessionToken, parsed.data.sessionToken),
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

  const outcome = await withRoomLock(rawId, async () => {
    const [gs] = await db
      .select()
      .from(gameStatesTable)
      .where(eq(gameStatesTable.roomId, rawId))
      .limit(1);
    if (!gs) {
      return { ok: false as const, status: 404, error: "Game state not found" };
    }

    const currentState = normalizeState(gs.state);
    try {
      applyBalanceLabRoomRuleset(rawId, currentState);
    } catch (error) {
      if (error instanceof BalanceLabConfigurationUnavailableError) {
        return { ok: false as const, status: 409, error: error.message };
      }
      throw error;
    }
    const expectedVersion = currentState.version;
    const stateData = prepareDevSequenceState(
      rawId,
      currentState,
      parsed.data.repeatFromBaseline,
    );
    // prepareDevSequenceState JSON-clones (or rewinds) the state, so its
    // nonserialized experimental ruleset attachment must be restored before
    // the dev sequence mutates any Luminary relationships or effects.
    applyBalanceLabRoomRuleset(rawId, stateData);
    const legacyDeferredSelection =
      parsed.data.includeEndOfTurnEffects !== undefined ||
      parsed.data.includeStartOfTurnEffects !== undefined
        ? !!(parsed.data.includeEndOfTurnEffects || parsed.data.includeStartOfTurnEffects)
        : undefined;
    const result = runDevLuminarySequence(stateData, player.id, {
      ...parsed.data,
      includeNextTurnEffects:
        parsed.data.includeNextTurnEffects ?? legacyDeferredSelection ?? true,
    });
    if (!result.success) {
      return { ok: false as const, status: 400, error: result.error ?? "Sequence failed" };
    }

    updateTurnDeadline(stateData);
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

    const allPlayers = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.roomId, rawId));
    const connectedIds = getConnectedPlayerIds(rawId);
    for (const candidate of allPlayers) {
      if (candidate.isAi) connectedIds.add(candidate.id);
    }
    const avatarMap = new Map<string, string | null>(
      allPlayers.map((candidate) => [candidate.id, candidate.avatarId ?? null]),
    );
    const aiMap = new Map(
      allPlayers.map((candidate) => [
        candidate.id,
        {
          isAi: candidate.isAi,
          aiDifficulty: candidate.aiDifficulty != null
            ? parseAiDifficulty(candidate.aiDifficulty)
            : null,
        },
      ]),
    );
    const formatted = formatGameState(
      rawId,
      room.status,
      stateData,
      connectedIds,
      avatarMap,
      aiMap,
      room.scenarioId,
    );
    for (const candidate of allPlayers) {
      if (candidate.isAi) continue;
      sendToPlayer(rawId, candidate.id, {
        type: "state_update",
        state: filterStateForPlayer(formatted, candidate.id),
      });
    }
    armTurnTimer(rawId, stateData);

    return {
      ok: true as const,
      summonEventIds: result.summonEventIds ?? [],
      activationEventIds: result.activationEventIds ?? [],
    };
  });

  if (!outcome.ok) {
    res.status(outcome.status).json({ error: outcome.error });
    return;
  }

  req.log.info(
    {
      roomId: rawId,
      playerId: player.id,
      luminaryIds: parsed.data.luminaryIds,
      summonEvents: outcome.summonEventIds.length,
      activationEvents: outcome.activationEventIds.length,
    },
    "Dev Luminary sequence queued",
  );
  res.json({
    ok: true,
    summonEventIds: outcome.summonEventIds,
    activationEventIds: outcome.activationEventIds,
  });
});

// POST /api/dev/rooms/:roomId/rewind
// DEV-ONLY: restore the game state to the snapshot captured just before the
// first Luminary was claimed.  Returns 403 in production.
router.post("/dev/rooms/:roomId/rewind", async (req, res): Promise<void> => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Not available in production" });
    return;
  }

  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;

  const parsed = z.object({ sessionToken: GameSessionToken }).strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid sessionToken is required" });
    return;
  }
  const { sessionToken } = parsed.data;

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

  const snapshot = getDevSnapshot(rawId);
  if (!snapshot) {
    res.status(404).json({ error: "No pre-luminary snapshot for this room. Play a game until a Luminary is claimed first." });
    return;
  }

  const outcome = await withRoomLock(rawId, async () => {
    const [[gs], [room]] = await Promise.all([
      db.select().from(gameStatesTable).where(eq(gameStatesTable.roomId, rawId)).limit(1),
      db.select().from(roomsTable).where(eq(roomsTable.id, rawId)).limit(1),
    ]);

    if (!gs || !room) {
      return { ok: false as const, status: 404, error: "Game state not found" };
    }

    // Restore snapshot with a fresh incremented version to avoid conflicts.
    const restored = { ...snapshot, version: gs.version + 1 };

    await db
      .update(gameStatesTable)
      .set({
        state: restored as unknown as Record<string, unknown>,
        version: restored.version,
        updatedAt: new Date(),
      })
      .where(eq(gameStatesTable.roomId, rawId));

    await db
      .update(roomsTable)
      .set({ status: "playing", updatedAt: new Date() })
      .where(eq(roomsTable.id, rawId));

    const allPlayers = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.roomId, rawId));

    const avatarMap = new Map<string, string | null>(
      allPlayers.map((p) => [p.id, p.avatarId ?? null]),
    );
    const aiMap = new Map(
      allPlayers.map((p) => [p.id, { isAi: p.isAi, aiDifficulty: p.aiDifficulty != null ? parseAiDifficulty(p.aiDifficulty) : null }]),
    );

    const connectedIds = getConnectedPlayerIds(rawId);
    for (const p of allPlayers) {
      if (p.isAi) connectedIds.add(p.id);
    }

    const formatted = formatGameState(rawId, "playing", restored, connectedIds, avatarMap, aiMap, room.scenarioId);
    for (const p of allPlayers) {
      if (p.isAi) continue;
      sendToPlayer(rawId, p.id, {
        type: "state_update",
        state: filterStateForPlayer(formatted, p.id),
      });
    }

    return { ok: true as const, turnCount: restored.turnCount };
  });

  if (!outcome.ok) {
    res.status(outcome.status).json({ error: outcome.error });
    return;
  }

  req.log.info({ roomId: rawId }, "Dev rewind: restored pre-luminary snapshot");
  res.json({ ok: true, rewindToTurnCount: outcome.turnCount });
});

// GET /api/cards/lore
router.get("/cards/lore", (_req, res) => {
  const out: Record<string, {
    name: string;
    flavor: string;
    artifactForm?: string;
    blueprintRole?: string;
    blueprintFamilies?: string;
    civLane?: string;
    engineeringScale?: string;
    artPrompt?: string;
  }> = {};
  for (const [id, lore] of Object.entries(CARD_LORE)) {
    out[id] = {
      name: lore.name,
      flavor: lore.flavor,
      ...(lore.artifactForm !== undefined && { artifactForm: lore.artifactForm }),
      ...(lore.blueprintRole !== undefined && { blueprintRole: lore.blueprintRole }),
      ...(lore.blueprintFamilies !== undefined && { blueprintFamilies: lore.blueprintFamilies }),
      ...(lore.civLane !== undefined && { civLane: lore.civLane }),
      ...(lore.engineeringScale !== undefined && { engineeringScale: lore.engineeringScale }),
      ...(lore.artPrompt !== undefined && { artPrompt: lore.artPrompt }),
    };
  }
  res.json(out);
});

export default router;
