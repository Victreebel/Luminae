import { and, eq } from "drizzle-orm";
import { db, accountEngagementTable, accountNativePurchasesTable } from "@workspace/db";
import type {
  LumePackId,
  NativeLumePurchaseResult,
  NativeStoreProvider,
} from "@workspace/game-types";
import { applyLumeTransaction } from "./lumeLedger";
import { getLumePack, matchesProviderProduct } from "./lumePackCatalog";
import {
  accountProofMatches,
  getNativePurchaseVerifier,
  type VerifiedNativePurchase,
} from "./nativePurchaseVerification";

export class NativePurchaseError extends Error {
  constructor(message: string, readonly statusCode = 409) {
    super(message);
  }
}

export interface SubmitNativePurchaseInput {
  accountId: string;
  provider: NativeStoreProvider;
  packId: LumePackId;
  productId: string;
  purchaseToken: string;
}

export function getNativePackageName(provider: NativeStoreProvider): string {
  if (provider === "google_play") {
    return process.env.GOOGLE_PLAY_PACKAGE_NAME ?? "com.luminae.game";
  }
  return process.env.SAMSUNG_IAP_PACKAGE_NAME ?? "com.luminae.game";
}

async function readBalance(accountId: string): Promise<number> {
  const [engagement] = await db.select({ balance: accountEngagementTable.lumeBalance })
    .from(accountEngagementTable)
    .where(eq(accountEngagementTable.accountId, accountId))
    .limit(1);
  return engagement?.balance ?? 0;
}

async function recordPendingOrCancelled(
  input: SubmitNativePurchaseInput,
  verified: VerifiedNativePurchase,
): Promise<void> {
  const status = verified.state === "pending" ? "pending" : "cancelled";
  await db.insert(accountNativePurchasesTable).values({
    accountId: input.accountId,
    provider: input.provider,
    packId: input.packId,
    productId: input.productId,
    purchaseToken: input.purchaseToken,
    providerOrderId: verified.orderId,
    lumeAmount: getLumePack(input.packId).lumeAmount,
    status,
    verifiedAt: new Date(),
    metadata: { testPurchase: verified.testPurchase, rawStatus: verified.rawStatus },
  }).onConflictDoUpdate({
    target: [accountNativePurchasesTable.provider, accountNativePurchasesTable.purchaseToken],
    set: {
      providerOrderId: verified.orderId,
      status,
      verifiedAt: new Date(),
      updatedAt: new Date(),
      metadata: { testPurchase: verified.testPurchase, rawStatus: verified.rawStatus },
    },
  });
}

export async function submitNativeLumePurchase(
  input: SubmitNativePurchaseInput,
): Promise<NativeLumePurchaseResult> {
  if (!matchesProviderProduct(input.provider, input.packId, input.productId)) {
    throw new NativePurchaseError("The native product does not match this Lume pack", 400);
  }
  const packageName = getNativePackageName(input.provider);
  const verifier = getNativePurchaseVerifier(input.provider);
  const verified = await verifier.verify({
    provider: input.provider,
    packageName,
    productId: input.productId,
    purchaseToken: input.purchaseToken,
  });
  if (!accountProofMatches(verified.obfuscatedAccountId, input.accountId)) {
    throw new NativePurchaseError("The purchase belongs to a different Luminae account", 403);
  }
  if (verified.state !== "purchased") {
    await recordPendingOrCancelled(input, verified);
    if (verified.state === "cancelled") {
      throw new NativePurchaseError("The native purchase was cancelled");
    }
    return {
      status: "pending",
      provider: input.provider,
      packId: input.packId,
      lumeAmount: getLumePack(input.packId).lumeAmount,
      lumeBalance: await readBalance(input.accountId),
    };
  }

  const now = new Date();
  const pack = getLumePack(input.packId);
  const grant = await db.transaction(async (tx) => {
    await tx.insert(accountNativePurchasesTable).values({
      accountId: input.accountId,
      provider: input.provider,
      packId: input.packId,
      productId: input.productId,
      purchaseToken: input.purchaseToken,
      providerOrderId: verified.orderId,
      lumeAmount: pack.lumeAmount,
      status: "verified",
      verifiedAt: now,
      metadata: { testPurchase: verified.testPurchase, rawStatus: verified.rawStatus },
    }).onConflictDoNothing({
      target: [accountNativePurchasesTable.provider, accountNativePurchasesTable.purchaseToken],
    });

    const [purchase] = await tx.select().from(accountNativePurchasesTable).where(and(
      eq(accountNativePurchasesTable.provider, input.provider),
      eq(accountNativePurchasesTable.purchaseToken, input.purchaseToken),
    )).limit(1);
    if (!purchase) throw new Error("Native purchase could not be claimed");
    if (purchase.accountId !== input.accountId) {
      throw new NativePurchaseError("This purchase was already claimed by another account", 403);
    }
    if (purchase.productId !== input.productId || purchase.lumeAmount !== pack.lumeAmount) {
      throw new NativePurchaseError("Stored purchase metadata does not match the receipt");
    }
    if (purchase.refundedAt) {
      throw new NativePurchaseError("This purchase has been refunded");
    }

    const credited = await applyLumeTransaction(tx, {
      accountId: input.accountId,
      amount: pack.lumeAmount,
      source: `native_purchase:${input.provider}`,
      category: "purchased",
      idempotencyKey: `native-purchase:${input.provider}:${input.purchaseToken}`,
      externalReference: purchase.id,
      metadata: { packId: input.packId, productId: input.productId },
    });
    await tx.update(accountNativePurchasesTable).set({
      providerOrderId: verified.orderId,
      status: verified.alreadySettled ? "settled" : "settlement_pending",
      grantTransactionId: credited.transactionId,
      verifiedAt: purchase.verifiedAt ?? now,
      grantedAt: purchase.grantedAt ?? now,
      settledAt: verified.alreadySettled ? (purchase.settledAt ?? now) : purchase.settledAt,
      lastError: null,
      updatedAt: now,
    }).where(eq(accountNativePurchasesTable.id, purchase.id));
    return { credited, alreadySettled: verified.alreadySettled, purchaseId: purchase.id };
  });

  if (!grant.alreadySettled) {
    try {
      await verifier.settle(verified, packageName);
      await db.update(accountNativePurchasesTable).set({
        status: "settled",
        settledAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      }).where(eq(accountNativePurchasesTable.id, grant.purchaseId));
    } catch (error) {
      await db.update(accountNativePurchasesTable).set({
        status: "settlement_pending",
        lastError: error instanceof Error ? error.message.slice(0, 500) : "Settlement failed",
        updatedAt: new Date(),
      }).where(eq(accountNativePurchasesTable.id, grant.purchaseId));
      return {
        status: "settlement_pending",
        provider: input.provider,
        packId: input.packId,
        lumeAmount: pack.lumeAmount,
        lumeBalance: grant.credited.balance,
      };
    }
  }

  return {
    status: grant.credited.applied ? "credited" : "already_credited",
    provider: input.provider,
    packId: input.packId,
    lumeAmount: pack.lumeAmount,
    lumeBalance: grant.credited.balance,
  };
}

export async function reconcileNativePurchase(
  provider: NativeStoreProvider,
  purchaseToken: string,
): Promise<{ status: string; lumeBalance: number }> {
  const [purchase] = await db.select().from(accountNativePurchasesTable).where(and(
    eq(accountNativePurchasesTable.provider, provider),
    eq(accountNativePurchasesTable.purchaseToken, purchaseToken),
  )).limit(1);
  if (!purchase) throw new NativePurchaseError("Purchase record not found", 404);
  const verifier = getNativePurchaseVerifier(provider);
  const packageName = getNativePackageName(provider);
  const verified = await verifier.verify({
    provider,
    packageName,
    productId: purchase.productId,
    purchaseToken,
  });

  if (verified.state === "purchased") {
    if (purchase.status !== "settled") {
      await verifier.settle(verified, packageName);
      await db.update(accountNativePurchasesTable).set({
        status: "settled",
        settledAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      }).where(eq(accountNativePurchasesTable.id, purchase.id));
    }
    return { status: "settled", lumeBalance: await readBalance(purchase.accountId) };
  }

  if (!purchase.grantedAt || purchase.refundedAt) {
    await db.update(accountNativePurchasesTable).set({
      status: verified.state,
      updatedAt: new Date(),
    }).where(eq(accountNativePurchasesTable.id, purchase.id));
    return { status: verified.state, lumeBalance: await readBalance(purchase.accountId) };
  }

  const refunded = await db.transaction(async (tx) => {
    const result = await applyLumeTransaction(tx, {
      accountId: purchase.accountId,
      amount: -purchase.lumeAmount,
      source: `native_refund:${provider}`,
      category: "refunded",
      idempotencyKey: `native-refund:${provider}:${purchaseToken}`,
      externalReference: purchase.id,
      metadata: { packId: purchase.packId, productId: purchase.productId },
    });
    await tx.update(accountNativePurchasesTable).set({
      status: "refunded",
      refundedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(accountNativePurchasesTable.id, purchase.id));
    return result;
  });
  return { status: "refunded", lumeBalance: refunded.balance };
}
