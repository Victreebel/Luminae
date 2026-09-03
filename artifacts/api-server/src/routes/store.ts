import { Router, type IRouter, type Response } from "express";
import { and, eq, gte, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@workspace/db";
import { BLUEPRINT_CLEARANCE_REQUIRED_WINS } from "@workspace/game-types";
import {
  accountBlueprintClearanceTable,
  accountCosmeticLoadoutItemsTable,
  accountEngagementTable,
  accountEntitlementsTable,
} from "@workspace/db";
import { accountAuth } from "../lib/accountAuth";
import {
  BLACK_MARKET_DECRYPTION_KEY_ITEM_ID,
  getStoreItem,
  getVisibleStoreItems,
  isBlackMarketDecryptionKey,
  isBlueprintPresentationItem,
} from "../lib/storeCatalog";
import { getDailyStarlightReward, isTestCheckoutEnabled } from "../lib/storeRules";
import {
  equippedItemsByKind,
  getEquippedCosmeticItems,
  getOwnedCosmeticItemIds,
} from "../lib/accountCosmetics";
import { ensureAccountProgressBackfilled } from "../lib/accountProgress";
import type { Request } from "express";

const router: IRouter = Router();

const PurchaseBody = z.object({
  itemId: z.string().min(1).max(96),
}).strict();

const EquipBody = z.object({
  slot: z.enum(["card_back", "civilization_ambience", "blueprint_presentation"]),
  scopeKey: z.string().min(1).max(96).default("global"),
  itemId: z.string().min(1).max(96).nullable(),
}).strict();

const TEST_CHECKOUT_ENABLED = isTestCheckoutEnabled(process.env.NODE_ENV);

class InsufficientStarlightError extends Error {}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

async function getOrCreateEngagement(accountId: string) {
  const [existing] = await db
    .select()
    .from(accountEngagementTable)
    .where(eq(accountEngagementTable.accountId, accountId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(accountEngagementTable)
    .values({ accountId })
    .onConflictDoNothing({ target: accountEngagementTable.accountId })
    .returning();

  if (created) return created;

  const [concurrent] = await db
    .select()
    .from(accountEngagementTable)
    .where(eq(accountEngagementTable.accountId, accountId))
    .limit(1);

  return concurrent;
}

async function hasBlueprintClearance(accountId: string): Promise<boolean> {
  await ensureAccountProgressBackfilled(accountId);
  const [clearance] = await db
    .select({ status: accountBlueprintClearanceTable.status })
    .from(accountBlueprintClearanceTable)
    .where(eq(accountBlueprintClearanceTable.accountId, accountId))
    .limit(1);
  return clearance?.status === "cleared";
}

async function readBlueprintClearance(accountId: string) {
  await ensureAccountProgressBackfilled(accountId);
  const [clearance] = await db
    .select()
    .from(accountBlueprintClearanceTable)
    .where(eq(accountBlueprintClearanceTable.accountId, accountId))
    .limit(1);
  return clearance;
}

function canAcquireDecryptionKey(
  clearance: Awaited<ReturnType<typeof readBlueprintClearance>>,
): boolean {
  return clearance?.status === "classified" &&
    clearance.qualifyingWins < BLUEPRINT_CLEARANCE_REQUIRED_WINS &&
    clearance.decryptionKeyBypassActiveAt == null;
}

async function rejectUnavailableDecryptionKey(
  accountId: string,
  item: ReturnType<typeof getStoreItem>,
  res: Response,
): Promise<boolean> {
  if (!item || !isBlackMarketDecryptionKey(item)) return false;
  if (canAcquireDecryptionKey(await readBlueprintClearance(accountId))) return false;
  res.status(409).json({ error: "The Vault does not currently accept another decryption key" });
  return true;
}

async function rejectClassifiedBlueprintCosmetic(
  accountId: string,
  item: ReturnType<typeof getStoreItem>,
  res: Response,
): Promise<boolean> {
  if (!item || !isBlueprintPresentationItem(item)) return false;
  if (await hasBlueprintClearance(accountId)) return false;
  res.status(404).json({ error: "Store item not found" });
  return true;
}

router.get("/store", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;
  const [allOwnedItemIds, engagement, clearance] = await Promise.all([
    getOwnedCosmeticItemIds(account.id),
    getOrCreateEngagement(account.id),
    readBlueprintClearance(account.id),
  ]);
  const blueprintsRevealed = clearance?.status === "cleared";
  const items = getVisibleStoreItems(blueprintsRevealed).filter(
    (item) => item.id !== BLACK_MARKET_DECRYPTION_KEY_ITEM_ID || canAcquireDecryptionKey(clearance),
  );
  const visibleItemIds = new Set(items.map((item) => item.id));
  const ownedItemIds = allOwnedItemIds.filter((itemId) => visibleItemIds.has(itemId));
  const equippedItems = (await getEquippedCosmeticItems(account.id, allOwnedItemIds))
    .filter((item) => visibleItemIds.has(item.itemId));
  const equippedItemIds = equippedItemsByKind(equippedItems);

  res.json({
    items,
    ownedItemIds,
    equippedItemIds,
    equippedItems,
    testCheckoutEnabled: TEST_CHECKOUT_ENABLED,
    engagement: {
      cosmeticBalance: engagement.cosmeticBalance,
      dailyClaimStreak: engagement.dailyClaimStreak,
      lastDailyClaimDate: engagement.lastDailyClaimDate,
      canClaimDaily: engagement.lastDailyClaimDate !== todayKey(),
      currencyName: "Lume",
    },
  });
});

router.post("/store/purchases/test", accountAuth, async (req: Request, res): Promise<void> => {
  if (!TEST_CHECKOUT_ENABLED) {
    res.status(404).json({ error: "Test checkout is not available" });
    return;
  }

  const parsed = PurchaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid purchase request" });
    return;
  }

  const account = req.account!;
  const item = getStoreItem(parsed.data.itemId);
  if (!item) {
    res.status(404).json({ error: "Store item not found" });
    return;
  }
  if (await rejectClassifiedBlueprintCosmetic(account.id, item, res)) return;
  if (await rejectUnavailableDecryptionKey(account.id, item, res)) return;
  if (item.included) {
    res.json({ ok: true, itemId: item.id, alreadyOwned: true, receiptId: "included" });
    return;
  }

  const [existing] = await db
    .select()
    .from(accountEntitlementsTable)
    .where(
      and(
        eq(accountEntitlementsTable.accountId, account.id),
        eq(accountEntitlementsTable.itemId, item.id),
      ),
    )
    .limit(1);

  if (existing?.revokedAt === null) {
    res.json({ ok: true, itemId: item.id, alreadyOwned: true, receiptId: existing.receiptId });
    return;
  }

  if (existing) {
    const [restored] = await db
      .update(accountEntitlementsTable)
      .set({ revokedAt: null })
      .where(eq(accountEntitlementsTable.id, existing.id))
      .returning();

    res.status(201).json({ ok: true, itemId: item.id, alreadyOwned: false, receiptId: restored.receiptId });
    return;
  }

  const receiptId = `test_${account.id}_${item.id}_${randomUUID()}`;
  const [entitlement] = await db
    .insert(accountEntitlementsTable)
    .values({
      accountId: account.id,
      itemId: item.id,
      source: "test_purchase",
      receiptId,
      metadata: {
        catalogVersion: 1,
        nonGameplay: item.kind !== "consumable",
      },
    })
    .onConflictDoNothing({
      target: [accountEntitlementsTable.accountId, accountEntitlementsTable.itemId],
    })
    .returning();

  if (!entitlement) {
    const [concurrent] = await db
      .select()
      .from(accountEntitlementsTable)
      .where(
        and(
          eq(accountEntitlementsTable.accountId, account.id),
          eq(accountEntitlementsTable.itemId, item.id),
        ),
      )
      .limit(1);

    res.json({ ok: true, itemId: item.id, alreadyOwned: true, receiptId: concurrent.receiptId });
    return;
  }

  res.status(201).json({ ok: true, itemId: item.id, alreadyOwned: false, receiptId: entitlement.receiptId });
});

router.post("/store/unlocks/starlight", accountAuth, async (req: Request, res): Promise<void> => {
  const parsed = PurchaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid unlock request" });
    return;
  }

  const account = req.account!;
  const item = getStoreItem(parsed.data.itemId);
  if (!item) {
    res.status(404).json({ error: "Store item not found" });
    return;
  }
  if (await rejectClassifiedBlueprintCosmetic(account.id, item, res)) return;
  if (await rejectUnavailableDecryptionKey(account.id, item, res)) return;
  const starlightPrice = item.starlightPrice;
  if (starlightPrice === null) {
    res.status(400).json({ error: "This item cannot be acquired with Lume" });
    return;
  }

  await getOrCreateEngagement(account.id);

  try {
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(accountEntitlementsTable)
        .where(
          and(
            eq(accountEntitlementsTable.accountId, account.id),
            eq(accountEntitlementsTable.itemId, item.id),
          ),
        )
        .limit(1);

      if (existing?.revokedAt === null) {
        const [engagement] = await tx
          .select()
          .from(accountEngagementTable)
          .where(eq(accountEngagementTable.accountId, account.id))
          .limit(1);
        return {
          alreadyOwned: true,
          receiptId: existing.receiptId,
          cosmeticBalance: engagement.cosmeticBalance,
        };
      }

      const receiptId = `starlight_${account.id}_${item.id}_${randomUUID()}`;
      let entitlement;

      if (existing) {
        const [restored] = await tx
          .update(accountEntitlementsTable)
          .set({
            source: "starlight_purchase",
            receiptId,
            grantedAt: new Date(),
            revokedAt: null,
            metadata: { catalogVersion: 1, nonGameplay: item.kind !== "consumable", starlightPrice },
          })
          .where(
            and(
              eq(accountEntitlementsTable.id, existing.id),
              isNotNull(accountEntitlementsTable.revokedAt),
            ),
          )
          .returning();
        entitlement = restored;
      } else {
        const [created] = await tx
          .insert(accountEntitlementsTable)
          .values({
            accountId: account.id,
            itemId: item.id,
            source: "starlight_purchase",
            receiptId,
            metadata: { catalogVersion: 1, nonGameplay: item.kind !== "consumable", starlightPrice },
          })
          .onConflictDoNothing({
            target: [accountEntitlementsTable.accountId, accountEntitlementsTable.itemId],
          })
          .returning();
        entitlement = created;
      }

      if (!entitlement) {
        const [concurrent] = await tx
          .select()
          .from(accountEntitlementsTable)
          .where(
            and(
              eq(accountEntitlementsTable.accountId, account.id),
              eq(accountEntitlementsTable.itemId, item.id),
            ),
          )
          .limit(1);
        const [engagement] = await tx
          .select()
          .from(accountEngagementTable)
          .where(eq(accountEngagementTable.accountId, account.id))
          .limit(1);
        return {
          alreadyOwned: true,
          receiptId: concurrent.receiptId,
          cosmeticBalance: engagement.cosmeticBalance,
        };
      }

      const [charged] = await tx
        .update(accountEngagementTable)
        .set({
          cosmeticBalance: sql`${accountEngagementTable.cosmeticBalance} - ${starlightPrice}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(accountEngagementTable.accountId, account.id),
            gte(accountEngagementTable.cosmeticBalance, starlightPrice),
          ),
        )
        .returning();

      if (!charged) throw new InsufficientStarlightError();

      return {
        alreadyOwned: false,
        receiptId: entitlement.receiptId,
        cosmeticBalance: charged.cosmeticBalance,
      };
    });

    res.status(result.alreadyOwned ? 200 : 201).json({
      ok: true,
      itemId: item.id,
      ...result,
    });
  } catch (error) {
    if (error instanceof InsufficientStarlightError) {
      res.status(409).json({ error: "Not enough Lume" });
      return;
    }
    throw error;
  }
});

async function equipCosmetic(req: Request, res: Response): Promise<void> {
  const parsed = EquipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid cosmetic loadout request" });
    return;
  }

  const account = req.account!;
  const { slot, scopeKey, itemId } = parsed.data;

  if (slot === "blueprint_presentation" && !(await hasBlueprintClearance(account.id))) {
    res.status(404).json({ error: "Cosmetic loadout slot not found" });
    return;
  }

  if (itemId) {
    const item = getStoreItem(itemId);
    if (!item) {
      res.status(404).json({ error: "Store item not found" });
      return;
    }
    if (item.kind !== slot) {
      res.status(400).json({ error: "That cosmetic does not fit this loadout slot" });
      return;
    }
    if (item.scopeKey !== scopeKey) {
      res.status(400).json({ error: "That cosmetic does not fit this Blueprint or global slot" });
      return;
    }

    const ownedItemIds = await getOwnedCosmeticItemIds(account.id);
    if (!ownedItemIds.includes(itemId)) {
      res.status(403).json({ error: "Own this cosmetic before equipping it" });
      return;
    }
  }

  if (itemId === null) {
    await db
      .delete(accountCosmeticLoadoutItemsTable)
      .where(
        and(
          eq(accountCosmeticLoadoutItemsTable.accountId, account.id),
          eq(accountCosmeticLoadoutItemsTable.slot, slot),
          eq(accountCosmeticLoadoutItemsTable.scopeKey, scopeKey),
        ),
      );
  } else {
    await db
      .insert(accountCosmeticLoadoutItemsTable)
      .values({ accountId: account.id, slot, scopeKey, itemId })
      .onConflictDoUpdate({
        target: [
          accountCosmeticLoadoutItemsTable.accountId,
          accountCosmeticLoadoutItemsTable.slot,
          accountCosmeticLoadoutItemsTable.scopeKey,
        ],
        set: { itemId, updatedAt: new Date() },
      });
  }
  const equippedItems = await getEquippedCosmeticItems(account.id);

  res.json({
    ok: true,
    equippedItemIds: equippedItemsByKind(equippedItems),
    equippedItems,
  });
}

router.post("/store/equip", accountAuth, equipCosmetic);
router.put("/cosmetics/loadout", accountAuth, equipCosmetic);

router.post("/store/engagement/daily-claim", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;
  const engagement = await getOrCreateEngagement(account.id);
  const today = todayKey();

  if (engagement.lastDailyClaimDate === today) {
    res.json({
      ok: true,
      alreadyClaimed: true,
      rewardAmount: 0,
      cosmeticBalance: engagement.cosmeticBalance,
      dailyClaimStreak: engagement.dailyClaimStreak,
      lastDailyClaimDate: engagement.lastDailyClaimDate,
    });
    return;
  }

  const nextStreak = engagement.lastDailyClaimDate === yesterdayKey()
    ? engagement.dailyClaimStreak + 1
    : 1;
  const rewardAmount = getDailyStarlightReward(nextStreak);
  const [updated] = await db
    .update(accountEngagementTable)
    .set({
      cosmeticBalance: sql`${accountEngagementTable.cosmeticBalance} + ${rewardAmount}`,
      dailyClaimStreak: nextStreak,
      lastDailyClaimDate: today,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(accountEngagementTable.accountId, account.id),
        or(
          isNull(accountEngagementTable.lastDailyClaimDate),
          ne(accountEngagementTable.lastDailyClaimDate, today),
        ),
      ),
    )
    .returning();

  if (!updated) {
    const current = await getOrCreateEngagement(account.id);
    res.json({
      ok: true,
      alreadyClaimed: true,
      rewardAmount: 0,
      cosmeticBalance: current.cosmeticBalance,
      dailyClaimStreak: current.dailyClaimStreak,
      lastDailyClaimDate: current.lastDailyClaimDate,
    });
    return;
  }

  res.json({
    ok: true,
    alreadyClaimed: false,
    rewardAmount,
    cosmeticBalance: updated.cosmeticBalance,
    dailyClaimStreak: updated.dailyClaimStreak,
    lastDailyClaimDate: updated.lastDailyClaimDate,
  });
});

export default router;
