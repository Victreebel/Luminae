import { randomBytes } from "node:crypto";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import {
  db,
  firstPartyEventsTable,
  gameStatesTable,
  playersTable,
  roomsTable,
} from "@workspace/db";
import { accountAuth, optionalAccountAuth } from "../lib/accountAuth";
import {
  acknowledgeArchitectRecordPresentation,
  claimArchitectRecordOnboarding,
  readArchitectRecord,
} from "../lib/architectRecord";
import { pickUniqueAvatar } from "../lib/avatarAssignment";
import { initializeGame } from "../lib/gameEngine";
import { updateTurnDeadline } from "../lib/turnTimer";
import { readAccountCivilizationIdentity } from "../lib/accountIdentity";

const router: IRouter = Router();

const OnboardingClaimBody = z.object({
  claimId: z.string().uuid(),
  stance: z.enum(["curious", "guarded", "resolute"]).nullable(),
}).strict();

const PresentationParams = z.object({
  presentationId: z.string().regex(/^(clearance_signal|clearance_recap)_[1-5]$/),
});

const EVENT_NAMES = [
  "tutorial_started",
  "tutorial_resumed",
  "tutorial_restarted",
  "tutorial_left",
  "tutorial_chapter_started",
  "tutorial_chapter_completed",
  "tutorial_invalid_action",
  "tutorial_completed",
  "account_prompt_outcome",
  "guided_practice_started",
  "qualification_milestone",
  "interlude_acknowledged",
  "vault_completed",
  "turn_order_balance_viewed",
  "match_balance_result",
] as const;

const FirstPartyEventBody = z.object({
  id: z.string().uuid(),
  anonymousSessionId: z.string().uuid().nullable().optional(),
  eventName: z.enum(EVENT_NAMES),
  chapterId: z.enum(["arrival", "board", "actions", "ascension"]).nullable().optional(),
  beatId: z.string().regex(/^b[0-9]+[a-z]?_[a-z0-9_]+$/).max(64).nullable().optional(),
  actionId: z.enum([
    "harness",
    "forge",
    "encrypt",
    "forge_reserved",
    "forge_final",
    "help",
    "register",
    "sign_in",
    "dismiss",
    "match_2p_v15",
    "match_2p_v20",
    "match_2p_v25",
    "match_3p_v15",
    "match_3p_v20",
    "match_3p_v25",
    "match_4p_v15",
    "match_4p_v20",
    "match_4p_v25",
  ]).nullable().optional(),
  outcome: z.enum([
    "allowed",
    "blocked",
    "success",
    "failure",
    "accepted",
    "dismissed",
    "resume",
    "start_over",
  ]).nullable().optional(),
  ordinal: z.number().int().min(0).max(100).nullable().optional(),
  durationMs: z.number().int().min(0).max(86_400_000).nullable().optional(),
  occurredAt: z.string().datetime().optional(),
}).strict();

function inviteCode(): string {
  return randomBytes(5).toString("hex").toUpperCase();
}

function sessionToken(): string {
  return randomBytes(32).toString("hex");
}

async function findResumableQualifyingMatch(accountId: string) {
  const rows = await db
    .select({ room: roomsTable, player: playersTable })
    .from(playersTable)
    .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
    .where(and(
      eq(playersTable.accountId, accountId),
      eq(playersTable.isAi, false),
      isNull(playersTable.quitAt),
      inArray(roomsTable.status, ["lobby", "playing"]),
      eq(roomsTable.gameMode, "standard"),
      eq(roomsTable.blueprintPolicy, "none"),
      eq(roomsTable.maxPlayers, 4),
      eq(roomsTable.victoryRequirement, 15),
      isNull(roomsTable.turnTimerSeconds),
    ))
    .limit(10);

  for (const row of rows) {
    const roster = await db
      .select()
      .from(playersTable)
      .where(and(eq(playersTable.roomId, row.room.id), isNull(playersTable.quitAt)));
    const humanPlayers = roster.filter((player) => !player.isAi);
    const aiPlayers = roster.filter((player) => player.isAi);
    if (
      humanPlayers.length === 1
      && humanPlayers[0]?.accountId === accountId
      && aiPlayers.length === 3
      && aiPlayers.every((player) => player.aiDifficulty === "hard")
    ) {
      return row;
    }
  }

  return null;
}

router.get("/campaigns/architect-record", accountAuth, async (req: Request, res): Promise<void> => {
  res.json(await readArchitectRecord(req.account!.id));
});

router.post("/campaigns/architect-record/onboarding-claim", accountAuth, async (req: Request, res): Promise<void> => {
  const parsed = OnboardingClaimBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await claimArchitectRecordOnboarding({
    accountId: req.account!.id,
    claimId: parsed.data.claimId,
    stance: parsed.data.stance,
  });
  res.json(await readArchitectRecord(req.account!.id));
});

router.post("/campaigns/architect-record/presentations/:presentationId/acknowledge", accountAuth, async (req: Request, res): Promise<void> => {
  const parsed = PresentationParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid presentation" });
    return;
  }
  const acknowledged = await acknowledgeArchitectRecordPresentation(
    req.account!.id,
    parsed.data.presentationId,
  );
  if (!acknowledged) {
    res.status(404).json({ error: "Presentation not found" });
    return;
  }
  res.json({ ok: true });
});

router.post("/campaigns/architect-record/qualifying-match", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;
  const resumable = await findResumableQualifyingMatch(account.id);
  if (resumable) {
    res.json({
      roomId: resumable.room.id,
      inviteCode: resumable.room.inviteCode,
      playerId: resumable.player.id,
      sessionToken: resumable.player.sessionToken,
      playerName: resumable.player.name,
      resumed: true,
    });
    return;
  }

  const activeRows = await db
    .select({ roomId: playersTable.roomId })
    .from(playersTable)
    .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
    .where(and(
      eq(playersTable.accountId, account.id),
      eq(playersTable.isAi, false),
      isNull(playersTable.quitAt),
      ne(roomsTable.status, "finished"),
    ));
  if (activeRows.length >= 5) {
    res.status(409).json({ error: "Finish or leave an active match before starting this one." });
    return;
  }

  const playerIdentity = await readAccountCivilizationIdentity(account.id);
  const result = await db.transaction(async (tx) => {
    const [room] = await tx.insert(roomsTable).values({
      inviteCode: inviteCode(),
      maxPlayers: 4,
      victoryRequirement: 15,
      cinematicMode: "standard",
      status: "lobby",
      turnTimerSeconds: null,
      gameMode: "standard",
      scenarioId: null,
      blueprintPolicy: "none",
    }).returning();

    const usedAvatars: string[] = [];
    const hostAvatar = pickUniqueAvatar(null, usedAvatars);
    usedAvatars.push(hostAvatar);
    const [host] = await tx.insert(playersTable).values({
      roomId: room.id,
      accountId: account.id,
      name: account.username,
      sessionToken: sessionToken(),
      isHost: true,
      orderIndex: 0,
      isConnected: false,
      isAi: false,
      avatarId: hostAvatar,
    }).returning();

    const aiNames = ["Lyra", "Orion", "Vesper"];
    const aiPlayers = [];
    for (let index = 0; index < aiNames.length; index += 1) {
      const avatarId = pickUniqueAvatar(null, usedAvatars);
      usedAvatars.push(avatarId);
      const [ai] = await tx.insert(playersTable).values({
        roomId: room.id,
        name: aiNames[index],
        sessionToken: `ai-${randomBytes(16).toString("hex")}`,
        isHost: false,
        orderIndex: index + 1,
        isConnected: true,
        isAi: true,
        aiDifficulty: "hard",
        avatarId,
      }).returning();
      aiPlayers.push(ai);
    }

    const allPlayers = [host, ...aiPlayers];
    const gameData = initializeGame(
      allPlayers.map((player) => ({ id: player.id, name: player.name })),
      4,
      15,
      "standard",
      {
        blueprintSetups: {},
        civilizationIdentities: { [host.id]: playerIdentity },
        applyTurnOrderCompensation: true,
      },
    );
    gameData.turnTimerSeconds = null;
    updateTurnDeadline(gameData);
    await tx.update(roomsTable).set({
      hostPlayerId: host.id,
      status: "playing",
      updatedAt: new Date(),
    }).where(eq(roomsTable.id, room.id));
    await tx.insert(gameStatesTable).values({
      roomId: room.id,
      state: gameData as unknown as Record<string, unknown>,
      version: gameData.version,
    });
    return { room, host };
  });

  res.status(201).json({
    roomId: result.room.id,
    inviteCode: result.room.inviteCode,
    playerId: result.host.id,
    sessionToken: result.host.sessionToken,
    playerName: result.host.name,
    resumed: false,
  });
});

router.post("/events/first-party", optionalAccountAuth, async (req: Request, res): Promise<void> => {
  const parsed = FirstPartyEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid event" });
    return;
  }
  const event = parsed.data;
  await db.insert(firstPartyEventsTable).values({
    id: event.id,
    accountId: req.account?.id ?? null,
    anonymousSessionId: req.account ? null : event.anonymousSessionId ?? null,
    eventName: event.eventName,
    chapterId: event.chapterId ?? null,
    beatId: event.beatId ?? null,
    actionId: event.actionId ?? null,
    outcome: event.outcome ?? null,
    ordinal: event.ordinal ?? null,
    durationMs: event.durationMs ?? null,
    // Retention is based on server receipt time so clients cannot create
    // immortal records by submitting timestamps in the future.
    occurredAt: new Date(),
  }).onConflictDoNothing({ target: firstPartyEventsTable.id });
  res.status(202).json({ accepted: true });
});

export default router;
