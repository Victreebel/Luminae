import { and, eq, inArray } from "drizzle-orm";
import {
  accountBlueprintClearanceTable,
  accountBlueprintLoadoutsTable,
  accountBlueprintUnlocksTable,
  db,
  type Player,
  type Room,
} from "@workspace/db";
import {
  BLUEPRINT_DEFINITIONS,
  BLUEPRINT_IDS,
  type BlueprintId,
  type BlueprintPresentationVariant,
  type GameMode,
} from "@workspace/game-types";
import { getEquippedCosmeticItems } from "./accountCosmetics";
import { getStoreItem } from "./storeCatalog";

const NORMAL_BLUEPRINT_SLOT_COUNT = 2;

export class BlueprintRoomAccessError extends Error {}

function isBlueprintId(value: string): value is BlueprintId {
  return (BLUEPRINT_IDS as readonly string[]).includes(value);
}

function loadoutModeForRoom(room: Room): Exclude<GameMode, "standard"> | null {
  if (room.gameMode === "campaign") return "campaign";
  if (room.gameMode === "custom") return "custom";
  if (room.gameMode === "competitive") return "competitive";
  return null;
}

export async function accountHasBlueprintClearance(accountId: string): Promise<boolean> {
  const [row] = await db
    .select({ status: accountBlueprintClearanceTable.status })
    .from(accountBlueprintClearanceTable)
    .where(eq(accountBlueprintClearanceTable.accountId, accountId))
    .limit(1);
  return row?.status === "cleared";
}

export async function resolveBlueprintSetupsForMatch(
  room: Room,
  players: readonly Player[],
): Promise<Record<string, {
  blueprintIds: BlueprintId[];
  presentationVariants: Partial<Record<BlueprintId, BlueprintPresentationVariant>>;
}>> {
  if (room.blueprintPolicy === "none") return {};
  if (room.blueprintPolicy === "scenario") {
    throw new BlueprintRoomAccessError("Campaign scenario loadouts are server-authored");
  }
  if (
    room.gameMode === "competitive" &&
    process.env.BLUEPRINT_COMPETITIVE_ENABLED !== "true"
  ) {
    throw new BlueprintRoomAccessError(
      "Competitive Blueprints remain behind the balance gate",
    );
  }

  const mode = loadoutModeForRoom(room);
  if (!mode) {
    throw new BlueprintRoomAccessError("Blueprints are not enabled in standard play");
  }

  const humans = players.filter((player) => !player.isAi);
  if (humans.some((player) => !player.accountId)) {
    throw new BlueprintRoomAccessError(
      "Blueprint-enabled rooms require a cleared account",
    );
  }
  const accountIds = humans.map((player) => player.accountId!);
  if (accountIds.length === 0) return {};

  const [clearances, loadoutRows, unlockRows, equippedByAccount] = await Promise.all([
    db
      .select()
      .from(accountBlueprintClearanceTable)
      .where(inArray(accountBlueprintClearanceTable.accountId, accountIds)),
    db
      .select()
      .from(accountBlueprintLoadoutsTable)
      .where(
        and(
          inArray(accountBlueprintLoadoutsTable.accountId, accountIds),
          eq(accountBlueprintLoadoutsTable.mode, mode),
        ),
      ),
    db
      .select()
      .from(accountBlueprintUnlocksTable)
      .where(inArray(accountBlueprintUnlocksTable.accountId, accountIds)),
    Promise.all(
      accountIds.map(async (accountId) => [
        accountId,
        await getEquippedCosmeticItems(accountId),
      ] as const),
    ),
  ]);

  const clearedAccountIds = new Set(
    clearances
      .filter((clearance) => clearance.status === "cleared")
      .map((clearance) => clearance.accountId),
  );
  if (accountIds.some((accountId) => !clearedAccountIds.has(accountId))) {
    throw new BlueprintRoomAccessError(
      "Every participant must clear the Blueprint Vault first",
    );
  }

  const ownedByAccount = new Map<string, Set<string>>();
  for (const unlock of unlockRows) {
    const owned = ownedByAccount.get(unlock.accountId) ?? new Set<string>();
    owned.add(unlock.blueprintId);
    ownedByAccount.set(unlock.accountId, owned);
  }
  const cosmeticsByAccount = new Map(equippedByAccount);
  const setups: Record<string, {
    blueprintIds: BlueprintId[];
    presentationVariants: Partial<Record<BlueprintId, BlueprintPresentationVariant>>;
  }> = {};

  for (const player of humans) {
    const accountId = player.accountId!;
    const selected = loadoutRows
      .filter((row) => row.accountId === accountId)
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .slice(0, NORMAL_BLUEPRINT_SLOT_COUNT)
      .map((row) => row.blueprintId)
      .filter(isBlueprintId);
    const blueprintIds = [...new Set(selected)];

    if (room.blueprintPolicy === "owned") {
      const owned = ownedByAccount.get(accountId) ?? new Set<string>();
      if (blueprintIds.some((blueprintId) => !owned.has(blueprintId))) {
        throw new BlueprintRoomAccessError("A selected Blueprint is not owned");
      }
    }
    if (room.blueprintPolicy === "seasonal") {
      if (blueprintIds.some((blueprintId) => !BLUEPRINT_DEFINITIONS[blueprintId].competitiveApproved)) {
        throw new BlueprintRoomAccessError(
          "A selected Blueprint is outside the approved seasonal pool",
        );
      }
    }

    const presentationVariants: Partial<
      Record<BlueprintId, BlueprintPresentationVariant>
    > = {};
    const equipped = cosmeticsByAccount.get(accountId) ?? [];
    for (const blueprintId of blueprintIds) {
      const itemId = equipped.find(
        (item) =>
          item.slot === "blueprint_presentation" &&
          item.scopeKey === blueprintId,
      )?.itemId;
      const variant = itemId ? getStoreItem(itemId)?.presentationVariant : undefined;
      presentationVariants[blueprintId] = variant ?? "armored";
    }

    setups[player.id] = { blueprintIds, presentationVariants };
  }

  return setups;
}
