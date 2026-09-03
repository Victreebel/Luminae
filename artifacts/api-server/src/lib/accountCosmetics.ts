import { and, eq, isNull } from "drizzle-orm";
import {
  accountCosmeticLoadoutItemsTable,
  accountEntitlementsTable,
  db,
} from "@workspace/db";
import type { CosmeticLoadoutItem } from "@workspace/game-types";
import {
  INCLUDED_STORE_ITEM_IDS,
  getStoreItem,
  type EquippableStoreItemKind,
} from "./storeCatalog";

export async function getOwnedCosmeticItemIds(accountId: string): Promise<string[]> {
  const rows = await db
    .select({ itemId: accountEntitlementsTable.itemId })
    .from(accountEntitlementsTable)
    .where(
      and(
        eq(accountEntitlementsTable.accountId, accountId),
        isNull(accountEntitlementsTable.revokedAt),
      ),
    );
  return [...new Set([...INCLUDED_STORE_ITEM_IDS, ...rows.map((row) => row.itemId)])];
}

export async function getEquippedCosmeticItems(
  accountId: string,
  ownedItemIds?: readonly string[],
): Promise<CosmeticLoadoutItem[]> {
  const [rows, owned] = await Promise.all([
    db
      .select()
      .from(accountCosmeticLoadoutItemsTable)
      .where(eq(accountCosmeticLoadoutItemsTable.accountId, accountId)),
    ownedItemIds ? Promise.resolve(ownedItemIds) : getOwnedCosmeticItemIds(accountId),
  ]);
  const ownedSet = new Set(owned);

  return rows.flatMap((row): CosmeticLoadoutItem[] => {
    const item = getStoreItem(row.itemId);
    if (!item || !ownedSet.has(item.id)) return [];
    if (item.kind === "consumable") return [];
    if (item.kind !== row.slot || item.scopeKey !== row.scopeKey) return [];
    return [{ slot: item.kind, scopeKey: item.scopeKey, itemId: item.id }];
  });
}

export function equippedItemsByKind(
  items: readonly CosmeticLoadoutItem[],
): Record<EquippableStoreItemKind, string | null> {
  return {
    card_back: items.find((item) => item.slot === "card_back" && item.scopeKey === "global")?.itemId ?? null,
    civilization_ambience:
      items.find((item) => item.slot === "civilization_ambience" && item.scopeKey === "global")?.itemId ?? null,
    blueprint_presentation:
      items.find((item) => item.slot === "blueprint_presentation")?.itemId ?? null,
  };
}
