import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  accountArchiveArtifactStatsTable,
  accountArchiveLuminaryStatsTable,
  accountArchiveSummaryTable,
  accountBlueprintClearanceTable,
  accountBlueprintLoadoutsTable,
  accountBlueprintStatsTable,
  accountBlueprintUnlocksTable,
  accountChronicleUnlocksTable,
  accountEntitlementsTable,
  accountMatchRollupsTable,
  db,
  gameStatesTable,
  playersTable,
  roomsTable,
} from "@workspace/db";
import {
  BLUEPRINT_CLEARANCE_REQUIRED_WINS,
  type BlueprintId,
  type GameMode,
} from "@workspace/game-types";
import type { GameStateData, PlayerGameState } from "./gameEngine";
import { freshLumiiEncounterMemory, isQualifyingBlueprintVictory } from "./blueprintClearance";
import { buildCivilizationRecord } from "./civilizationRecords";
import { getCivilizationScenarioPolicy } from "./civilizationScenarioPolicies";
import { applyLumeTransaction } from "./lumeLedger";

const ARCHIVE_BACKFILL_VERSION = 1;
const CLEARANCE_SCENARIO_ID = "blueprint_clearance_lumii";
const ANTIMATTER_BLUEPRINT_ID: BlueprintId = "bp_antimatter_detonator";
const OUTER_VAULT_CHRONICLE_ID = "chronicle_outer_vault_access";
const ORIGINAL_PRESENTATION_ITEM_ID = "cosmetic.blueprint.antimatter.original.v1";

type AccountPlayerRow = typeof playersTable.$inferSelect;

export async function finalizeClearanceWithdrawal(roomId: string): Promise<void> {
  await db
    .update(accountBlueprintClearanceTable)
    .set({
      status: sql`CASE
        WHEN ${accountBlueprintClearanceTable.qualifyingWins} >= ${BLUEPRINT_CLEARANCE_REQUIRED_WINS}
          THEN 'challenge_ready'
        ELSE 'classified'
      END`,
      challengeRoomId: null,
      warningSeenAt: sql`CASE
        WHEN ${accountBlueprintClearanceTable.decryptionKeyBypassActiveAt} IS NOT NULL
          THEN NULL
        ELSE ${accountBlueprintClearanceTable.warningSeenAt}
      END`,
      cipherDeactivatedAt: sql`CASE
        WHEN ${accountBlueprintClearanceTable.decryptionKeyBypassActiveAt} IS NOT NULL
          THEN NULL
        ELSE ${accountBlueprintClearanceTable.cipherDeactivatedAt}
      END`,
      thresholdApproach: sql`CASE
        WHEN ${accountBlueprintClearanceTable.decryptionKeyBypassActiveAt} IS NOT NULL
          THEN NULL
        ELSE ${accountBlueprintClearanceTable.thresholdApproach}
      END`,
      thresholdDialoguePath: sql`CASE
        WHEN ${accountBlueprintClearanceTable.decryptionKeyBypassActiveAt} IS NOT NULL
          THEN ARRAY[]::text[]
        ELSE ${accountBlueprintClearanceTable.thresholdDialoguePath}
      END`,
      thresholdDialogueResolution: sql`CASE
        WHEN ${accountBlueprintClearanceTable.decryptionKeyBypassActiveAt} IS NOT NULL
          THEN NULL
        ELSE ${accountBlueprintClearanceTable.thresholdDialogueResolution}
      END`,
      thresholdRupturedAt: sql`CASE
        WHEN ${accountBlueprintClearanceTable.decryptionKeyBypassActiveAt} IS NOT NULL
          THEN NULL
        ELSE ${accountBlueprintClearanceTable.thresholdRupturedAt}
      END`,
      covenantBrokenAt: sql`CASE
        WHEN ${accountBlueprintClearanceTable.decryptionKeyBypassActiveAt} IS NOT NULL
          THEN NULL
        ELSE ${accountBlueprintClearanceTable.covenantBrokenAt}
      END`,
      decryptionKeyBypassActiveAt: null,
      updatedAt: new Date(),
    })
    .where(eq(accountBlueprintClearanceTable.challengeRoomId, roomId));
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

function usageCounts(
  value: Record<string, number> | undefined,
  fallbackIds: readonly string[] | undefined,
): Record<string, number> {
  if (value && Object.keys(value).length > 0) return value;
  const counts: Record<string, number> = {};
  for (const id of fallbackIds ?? []) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}

function encounteredArtifactIds(player: PlayerGameState): Set<string> {
  return new Set([
    ...(player.forgedArtifactIds ?? []),
    ...(player.reservedArtifactIds ?? []),
    ...(player.privateReservedArtifactIds ?? []),
    ...(player.assimilatedArtifactIds ?? []),
    ...Object.keys(player.artifactForgeCounts ?? {}),
    ...Object.keys(player.civilization?.artifacts ?? {}),
  ]);
}

function isQualifyingBlueprintWin(
  room: typeof roomsTable.$inferSelect,
  accountPlayer: AccountPlayerRow,
  allPlayers: AccountPlayerRow[],
  state: GameStateData,
): boolean {
  return isQualifyingBlueprintVictory({
    gameMode: room.gameMode as "standard" | "campaign" | "custom" | "competitive",
    blueprintPolicy: room.blueprintPolicy as "none" | "owned" | "all" | "seasonal" | "scenario",
    playerId: accountPlayer.id,
    winnerId: state.winnerId,
    participants: allPlayers.map((player) => ({
      id: player.id,
      isAi: player.isAi,
      aiDifficulty: player.aiDifficulty,
    })),
  });
}

async function applyClearanceVictory(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  accountId: string,
): Promise<void> {
  await tx
    .insert(accountBlueprintClearanceTable)
    .values({
      accountId,
      qualifyingWins: 1,
      status: BLUEPRINT_CLEARANCE_REQUIRED_WINS <= 1 ? "challenge_ready" : "classified",
    })
    .onConflictDoUpdate({
      target: accountBlueprintClearanceTable.accountId,
      set: {
        qualifyingWins: sql`LEAST(${BLUEPRINT_CLEARANCE_REQUIRED_WINS}, ${accountBlueprintClearanceTable.qualifyingWins} + 1)`,
        status: sql`CASE
          WHEN ${accountBlueprintClearanceTable.status} = 'cleared' THEN 'cleared'
          WHEN ${accountBlueprintClearanceTable.status} = 'challenge_active' THEN 'challenge_active'
          WHEN ${accountBlueprintClearanceTable.qualifyingWins} + 1 >= ${BLUEPRINT_CLEARANCE_REQUIRED_WINS} THEN 'challenge_ready'
          ELSE ${accountBlueprintClearanceTable.status}
        END`,
        updatedAt: new Date(),
      },
    });
}

async function applyClearanceChallengeResult(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  accountId: string,
  accountPlayer: AccountPlayerRow,
  state: GameStateData,
): Promise<void> {
  const won = state.winnerId === accountPlayer.id;
  if (!won) {
    const fresh = freshLumiiEncounterMemory();
    await tx
      .update(accountBlueprintClearanceTable)
      .set({
        status: sql`CASE
          WHEN ${accountBlueprintClearanceTable.qualifyingWins} >= ${BLUEPRINT_CLEARANCE_REQUIRED_WINS}
            THEN 'challenge_ready'
          ELSE 'classified'
        END`,
        challengeRoomId: null,
        warningSeenAt: sql`CASE
          WHEN ${accountBlueprintClearanceTable.decryptionKeyBypassActiveAt} IS NOT NULL
            THEN ${fresh.warningSeenAt}
          ELSE ${accountBlueprintClearanceTable.warningSeenAt}
        END`,
        cipherDeactivatedAt: sql`CASE
          WHEN ${accountBlueprintClearanceTable.decryptionKeyBypassActiveAt} IS NOT NULL
            THEN ${fresh.cipherDeactivatedAt}
          ELSE ${accountBlueprintClearanceTable.cipherDeactivatedAt}
        END`,
        thresholdApproach: sql`CASE
          WHEN ${accountBlueprintClearanceTable.decryptionKeyBypassActiveAt} IS NOT NULL
            THEN ${fresh.thresholdApproach}
          ELSE ${accountBlueprintClearanceTable.thresholdApproach}
        END`,
        thresholdDialoguePath: sql`CASE
          WHEN ${accountBlueprintClearanceTable.decryptionKeyBypassActiveAt} IS NOT NULL
            THEN ARRAY[]::text[]
          ELSE ${accountBlueprintClearanceTable.thresholdDialoguePath}
        END`,
        thresholdDialogueResolution: sql`CASE
          WHEN ${accountBlueprintClearanceTable.decryptionKeyBypassActiveAt} IS NOT NULL
            THEN ${fresh.thresholdDialogueResolution}
          ELSE ${accountBlueprintClearanceTable.thresholdDialogueResolution}
        END`,
        thresholdRupturedAt: sql`CASE
          WHEN ${accountBlueprintClearanceTable.decryptionKeyBypassActiveAt} IS NOT NULL
            THEN ${fresh.thresholdRupturedAt}
          ELSE ${accountBlueprintClearanceTable.thresholdRupturedAt}
        END`,
        covenantBrokenAt: sql`CASE
          WHEN ${accountBlueprintClearanceTable.decryptionKeyBypassActiveAt} IS NOT NULL
            THEN ${fresh.covenantBrokenAt}
          ELSE ${accountBlueprintClearanceTable.covenantBrokenAt}
        END`,
        decryptionKeyBypassActiveAt: null,
        updatedAt: new Date(),
      })
      .where(eq(accountBlueprintClearanceTable.accountId, accountId));
    return;
  }

  await tx
    .insert(accountBlueprintClearanceTable)
    .values({
      accountId,
      qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
      status: "cleared",
      completedAt: new Date(),
      vaultRevealSeenAt: null,
    })
    .onConflictDoUpdate({
      target: accountBlueprintClearanceTable.accountId,
      set: {
        qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
        status: "cleared",
        challengeRoomId: null,
        decryptionKeyBypassActiveAt: null,
        completedAt: new Date(),
        vaultRevealSeenAt: null,
        updatedAt: new Date(),
      },
    });

  await tx
    .insert(accountBlueprintUnlocksTable)
    .values({
      accountId,
      blueprintId: ANTIMATTER_BLUEPRINT_ID,
      source: "first_clearance",
    })
    .onConflictDoNothing({
      target: [
        accountBlueprintUnlocksTable.accountId,
        accountBlueprintUnlocksTable.blueprintId,
      ],
    });

  await tx
    .insert(accountChronicleUnlocksTable)
    .values({
      accountId,
      chronicleId: OUTER_VAULT_CHRONICLE_ID,
      source: "first_clearance",
      metadata: {
        blueprintId: ANTIMATTER_BLUEPRINT_ID,
        recordKind: "threshold_record",
        canonicalChronicle: false,
      },
    })
    .onConflictDoNothing({
      target: [
        accountChronicleUnlocksTable.accountId,
        accountChronicleUnlocksTable.chronicleId,
      ],
    });

  for (const mode of ["campaign", "custom"] as const) {
    await tx
      .insert(accountBlueprintLoadoutsTable)
      .values({ accountId, mode, slotIndex: 0, blueprintId: ANTIMATTER_BLUEPRINT_ID })
      .onConflictDoUpdate({
        target: [
          accountBlueprintLoadoutsTable.accountId,
          accountBlueprintLoadoutsTable.mode,
          accountBlueprintLoadoutsTable.slotIndex,
        ],
        set: { blueprintId: ANTIMATTER_BLUEPRINT_ID, updatedAt: new Date() },
      });
  }
}

async function applyBlueprintMastery(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  accountId: string,
  player: PlayerGameState,
): Promise<void> {
  const privateStates = player.blueprintPrivateStates ?? [];
  const publicDevices = player.manifestedBlueprintDevices ?? [];
  for (const privateState of privateStates) {
    const manifested = privateState.manifested ? 1 : 0;
    const publicDevice = publicDevices.find(
      (device) => device.blueprintId === privateState.blueprintId,
    );
    const triggered = publicDevice?.state === "spent" ? 1 : 0;
    const armedFinish = publicDevice?.state === "armed" ? 1 : 0;
    if (manifested + triggered + armedFinish === 0) continue;

    await tx
      .insert(accountBlueprintStatsTable)
      .values({
        accountId,
        blueprintId: privateState.blueprintId,
        manifestations: manifested,
        triggers: triggered,
        armedMatchFinishes: armedFinish,
      })
      .onConflictDoUpdate({
        target: [accountBlueprintStatsTable.accountId, accountBlueprintStatsTable.blueprintId],
        set: {
          manifestations: sql`${accountBlueprintStatsTable.manifestations} + ${manifested}`,
          triggers: sql`${accountBlueprintStatsTable.triggers} + ${triggered}`,
          armedMatchFinishes: sql`${accountBlueprintStatsTable.armedMatchFinishes} + ${armedFinish}`,
          updatedAt: new Date(),
        },
      });

    if (privateState.blueprintId === ANTIMATTER_BLUEPRINT_ID && manifested > 0) {
      await tx
        .insert(accountEntitlementsTable)
        .values({
          accountId,
          itemId: ORIGINAL_PRESENTATION_ITEM_ID,
          source: "blueprint_mastery",
          receiptId: `mastery:${accountId}:${ORIGINAL_PRESENTATION_ITEM_ID}`,
          metadata: { nonGameplay: true, milestone: "first_manifestation" },
        })
        .onConflictDoNothing({
          target: [accountEntitlementsTable.accountId, accountEntitlementsTable.itemId],
        });
    }
  }
}

/**
 * Materialize one finished room into durable account history. The match ledger
 * makes every caller safe to retry, including action, AI, timer, and backfill paths.
 */
export async function finalizeAccountProgressForRoom(
  roomId: string,
  state: GameStateData,
  finishedAt = new Date(),
  options: { liveClosure?: boolean; recordPolicy?: "normal" | "rehearsal" } = {},
): Promise<void> {
  const [room, allPlayers] = await Promise.all([
    db.select().from(roomsTable).where(eq(roomsTable.id, roomId)).limit(1).then((rows) => rows[0]),
    db.select().from(playersTable).where(eq(playersTable.roomId, roomId)),
  ]);
  if (!room) return;
  if (state.finishReason === "withdrawal") {
    await finalizeClearanceWithdrawal(roomId);
    return;
  }

  const accountPlayers = allPlayers.filter(
    (player): player is AccountPlayerRow & { accountId: string } =>
      !player.isAi && player.accountId !== null,
  );

  for (const accountPlayer of accountPlayers) {
    const playerState = state.players.find((player) => player.playerId === accountPlayer.id);
    if (!playerState) continue;
    const eminence = nonNegativeInteger(playerState.eminence);
    const forgeCounts = usageCounts(playerState.artifactForgeCounts, playerState.forgedArtifactIds);
    const allianceCounts = usageCounts(
      playerState.luminaryAllianceCounts,
      playerState.luminaries,
    );
    const totalForges = Object.values(forgeCounts).reduce((sum, count) => sum + count, 0);
    const totalAlliances = Object.values(allianceCounts).reduce((sum, count) => sum + count, 0);

    await db.transaction(async (tx) => {
      const rehearsal = options.recordPolicy === "rehearsal";
      const won = state.winnerId === accountPlayer.id;
      const result = state.winnerId === null ? "tie" : won ? "win" : "loss";
      const qualifyingBlueprintWin = isQualifyingBlueprintWin(
        room,
        accountPlayer,
        allPlayers,
        state,
      );
      const normalizedGameMode = room.gameMode as GameMode;
      const civilizationScenarioPolicy = getCivilizationScenarioPolicy(
        normalizedGameMode,
        room.scenarioId,
      );
      const civilizationRecord = rehearsal
        ? null
        : buildCivilizationRecord({
            roomId,
            accountId: accountPlayer.accountId,
            player: playerState,
            gameMode: room.gameMode,
            scenarioId: room.scenarioId,
            historicalContext: civilizationScenarioPolicy.historicalContext,
            startedAt: state.startedAt ?? null,
            finishedAt,
            finishReason: state.finishReason === "win" || state.finishReason === "surrender"
              ? state.finishReason
              : "unknown",
            result,
            totalPlayers: allPlayers.length,
            liveClosure: options.liveClosure ?? true,
            campaignLumePolicy: civilizationScenarioPolicy.campaignLumePolicy,
          });
      const lumeEarned = civilizationRecord?.lume.amount ?? 0;

      const [inserted] = await tx
        .insert(accountMatchRollupsTable)
        .values({
          accountId: accountPlayer.accountId,
          roomId,
          matchInstanceId: `${roomId}:${state.startedAt ?? "legacy"}`,
          playerId: accountPlayer.id,
          result,
          eminence,
          totalPlayers: allPlayers.length,
          qualifyingBlueprintWin,
          civilizationRecord: civilizationRecord as unknown as Record<string, unknown> | null,
          lumeEarned,
          finishedAt,
        })
        .onConflictDoNothing({
          target: [accountMatchRollupsTable.accountId, accountMatchRollupsTable.matchInstanceId],
        })
        .returning({ id: accountMatchRollupsTable.id });

      if (!inserted) return;
      if (rehearsal) return;

      await tx
        .insert(accountArchiveSummaryTable)
        .values({
          accountId: accountPlayer.accountId,
          gamesPlayed: 1,
          wins: won ? 1 : 0,
          losses: !won && state.winnerId !== null ? 1 : 0,
          ties: state.winnerId === null ? 1 : 0,
          totalEminence: eminence,
          totalLume: lumeEarned,
          totalForges,
          totalAlliances,
        })
        .onConflictDoUpdate({
          target: accountArchiveSummaryTable.accountId,
          set: {
            gamesPlayed: sql`${accountArchiveSummaryTable.gamesPlayed} + 1`,
            wins: sql`${accountArchiveSummaryTable.wins} + ${won ? 1 : 0}`,
            losses: sql`${accountArchiveSummaryTable.losses} + ${!won && state.winnerId !== null ? 1 : 0}`,
            ties: sql`${accountArchiveSummaryTable.ties} + ${state.winnerId === null ? 1 : 0}`,
            totalEminence: sql`${accountArchiveSummaryTable.totalEminence} + ${eminence}`,
            totalLume: sql`${accountArchiveSummaryTable.totalLume} + ${lumeEarned}`,
            totalForges: sql`${accountArchiveSummaryTable.totalForges} + ${totalForges}`,
            totalAlliances: sql`${accountArchiveSummaryTable.totalAlliances} + ${totalAlliances}`,
            updatedAt: new Date(),
          },
        });

      if (lumeEarned > 0) {
        await applyLumeTransaction(tx, {
          accountId: accountPlayer.accountId,
          amount: lumeEarned,
          source: room.scenarioId ? "chronicle_or_scenario_award" : "civilization_award",
          category: "earned",
          idempotencyKey: `civilization-award:${accountPlayer.accountId}:${roomId}:${state.startedAt ?? "legacy"}`,
          externalReference: inserted.id,
          metadata: {
            roomId,
            scenarioId: room.scenarioId ?? null,
            historicalQualityOnly: true,
          },
        });
      }

      for (const artifactId of encounteredArtifactIds(playerState)) {
        const forgeCount = forgeCounts[artifactId] ?? 0;
        await tx
          .insert(accountArchiveArtifactStatsTable)
          .values({
            accountId: accountPlayer.accountId,
            artifactId,
            encounterCount: 1,
            forgeCount,
          })
          .onConflictDoUpdate({
            target: [
              accountArchiveArtifactStatsTable.accountId,
              accountArchiveArtifactStatsTable.artifactId,
            ],
            set: {
              encounterCount: sql`${accountArchiveArtifactStatsTable.encounterCount} + 1`,
              forgeCount: sql`${accountArchiveArtifactStatsTable.forgeCount} + ${forgeCount}`,
              updatedAt: new Date(),
            },
          });
      }

      for (const [luminaryId, allianceCount] of Object.entries(allianceCounts)) {
        await tx
          .insert(accountArchiveLuminaryStatsTable)
          .values({ accountId: accountPlayer.accountId, luminaryId, allianceCount })
          .onConflictDoUpdate({
            target: [
              accountArchiveLuminaryStatsTable.accountId,
              accountArchiveLuminaryStatsTable.luminaryId,
            ],
            set: {
              allianceCount: sql`${accountArchiveLuminaryStatsTable.allianceCount} + ${allianceCount}`,
              updatedAt: new Date(),
            },
          });
      }

      if (qualifyingBlueprintWin) {
        await applyClearanceVictory(tx, accountPlayer.accountId);
      } else {
        await tx
          .insert(accountBlueprintClearanceTable)
          .values({ accountId: accountPlayer.accountId })
          .onConflictDoNothing({ target: accountBlueprintClearanceTable.accountId });
      }

      if (room.scenarioId === CLEARANCE_SCENARIO_ID) {
        await applyClearanceChallengeResult(tx, accountPlayer.accountId, accountPlayer, state);
      }
      await applyBlueprintMastery(tx, accountPlayer.accountId, playerState);
    });
  }
}

export async function ensureAccountProgressBackfilled(accountId: string): Promise<void> {
  const [summary] = await db
    .select({ backfillVersion: accountArchiveSummaryTable.backfillVersion })
    .from(accountArchiveSummaryTable)
    .where(eq(accountArchiveSummaryTable.accountId, accountId))
    .limit(1);
  if ((summary?.backfillVersion ?? 0) >= ARCHIVE_BACKFILL_VERSION) return;

  const participation = await db
    .select({ player: playersTable, room: roomsTable })
    .from(playersTable)
    .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
    .where(
      and(
        eq(playersTable.accountId, accountId),
        eq(playersTable.isAi, false),
        eq(roomsTable.status, "finished"),
      ),
    );
  const roomIds = [...new Set(participation.map((row) => row.room.id))];
  if (roomIds.length > 0) {
    const [existing, states] = await Promise.all([
      db
        .select({ roomId: accountMatchRollupsTable.roomId })
        .from(accountMatchRollupsTable)
        .where(eq(accountMatchRollupsTable.accountId, accountId)),
      db.select().from(gameStatesTable).where(inArray(gameStatesTable.roomId, roomIds)),
    ]);
    const existingRoomIds = new Set(existing.map((row) => row.roomId));
    for (const stateRow of states) {
      if (existingRoomIds.has(stateRow.roomId)) continue;
      const participationRow = participation.find((row) => row.room.id === stateRow.roomId);
      await finalizeAccountProgressForRoom(
        stateRow.roomId,
        stateRow.state as unknown as GameStateData,
        participationRow?.room.updatedAt ?? stateRow.updatedAt,
        { liveClosure: false },
      );
    }
  }

  await db
    .insert(accountArchiveSummaryTable)
    .values({ accountId, backfillVersion: ARCHIVE_BACKFILL_VERSION })
    .onConflictDoUpdate({
      target: accountArchiveSummaryTable.accountId,
      set: { backfillVersion: ARCHIVE_BACKFILL_VERSION, updatedAt: new Date() },
    });
  await db
    .insert(accountBlueprintClearanceTable)
    .values({ accountId })
    .onConflictDoNothing({ target: accountBlueprintClearanceTable.accountId });
}

export async function readAccountProgress(accountId: string) {
  await ensureAccountProgressBackfilled(accountId);
  const [summaryRows, matchHistory, artifactStats, luminaryStats, clearanceRows, chronicleUnlocks] = await Promise.all([
    db.select().from(accountArchiveSummaryTable).where(eq(accountArchiveSummaryTable.accountId, accountId)).limit(1),
    db.select().from(accountMatchRollupsTable).where(eq(accountMatchRollupsTable.accountId, accountId)).orderBy(desc(accountMatchRollupsTable.finishedAt)),
    db.select().from(accountArchiveArtifactStatsTable).where(eq(accountArchiveArtifactStatsTable.accountId, accountId)),
    db.select().from(accountArchiveLuminaryStatsTable).where(eq(accountArchiveLuminaryStatsTable.accountId, accountId)),
    db.select().from(accountBlueprintClearanceTable).where(eq(accountBlueprintClearanceTable.accountId, accountId)).limit(1),
    db.select().from(accountChronicleUnlocksTable).where(eq(accountChronicleUnlocksTable.accountId, accountId)),
  ]);

  return {
    summary: summaryRows[0] ?? null,
    matchHistory,
    artifactStats,
    luminaryStats,
    clearance: clearanceRows[0] ?? null,
    chronicleUnlocks,
  };
}
