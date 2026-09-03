import { createHash, createSign } from "node:crypto";
import { z } from "zod";
import type { NativeStoreProvider } from "@workspace/game-types";

const FETCH_TIMEOUT_MS = 10_000;
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_PUBLISHER_URL = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const SAMSUNG_RECEIPT_URL = "https://iap.samsungapps.com/iap/v6/receipt";
const SAMSUNG_DEVELOPER_URL = "https://devapi.samsungapps.com/iap/v6";

export type VerifiedPurchaseState = "purchased" | "pending" | "cancelled";

export interface VerifiedNativePurchase {
  provider: NativeStoreProvider;
  state: VerifiedPurchaseState;
  productId: string;
  purchaseToken: string;
  orderId: string | null;
  obfuscatedAccountId: string | null;
  alreadySettled: boolean;
  testPurchase: boolean;
  rawStatus: string;
}

export interface NativePurchaseProof {
  provider: NativeStoreProvider;
  packageName: string;
  productId: string;
  purchaseToken: string;
}

export interface NativePurchaseVerifier {
  verify(proof: NativePurchaseProof): Promise<VerifiedNativePurchase>;
  settle(purchase: VerifiedNativePurchase, packageName: string): Promise<void>;
}

const GoogleServiceAccount = z.object({
  client_email: z.string().email(),
  private_key: z.string().min(1),
  token_uri: z.string().url().optional(),
});

const GoogleProductPurchaseV2 = z.object({
  productLineItem: z.array(z.object({
    productId: z.string(),
    productOfferDetails: z.object({
      consumptionState: z.string().optional(),
    }).optional(),
  })).min(1),
  purchaseStateContext: z.object({ purchaseState: z.string() }),
  testPurchaseContext: z.object({ fopType: z.string().optional() }).optional(),
  orderId: z.string().optional(),
  obfuscatedExternalAccountId: z.string().optional(),
  acknowledgementState: z.string().optional(),
});

const SamsungReceipt = z.object({
  status: z.string(),
  itemId: z.string().optional(),
  orderId: z.string().optional(),
  packageName: z.string().optional(),
  mode: z.string().optional(),
  consumeYN: z.string().optional(),
  obfuscatedAccountId: z.string().optional(),
  errorCode: z.number().optional(),
  errorMessage: z.string().optional(),
});

let googleAccessToken: { value: string; expiresAt: number } | null = null;

function encodeBase64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Native store request failed (${response.status})`);
  }
  return body;
}

async function getGoogleAccessToken(): Promise<string> {
  if (googleAccessToken && googleAccessToken.expiresAt > Date.now() + 60_000) {
    return googleAccessToken.value;
  }
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Google Play verification is not configured");
  const credentials = GoogleServiceAccount.parse(JSON.parse(raw));
  const now = Math.floor(Date.now() / 1000);
  const assertionHeader = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const assertionBody = encodeBase64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: GOOGLE_SCOPE,
    aud: credentials.token_uri ?? GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${assertionHeader}.${assertionBody}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${encodeBase64Url(signer.sign(credentials.private_key))}`;
  const token = z.object({ access_token: z.string(), expires_in: z.number().optional() }).parse(
    await fetchJson(credentials.token_uri ?? GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    }),
  );
  googleAccessToken = {
    value: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
  };
  return googleAccessToken.value;
}

function googleState(raw: string): VerifiedPurchaseState {
  if (raw === "PURCHASED") return "purchased";
  if (raw === "PENDING") return "pending";
  return "cancelled";
}

const googlePlayVerifier: NativePurchaseVerifier = {
  async verify(proof) {
    const token = await getGoogleAccessToken();
    const url = `${GOOGLE_PUBLISHER_URL}/applications/${encodeURIComponent(proof.packageName)}` +
      `/purchases/productsv2/tokens/${encodeURIComponent(proof.purchaseToken)}`;
    const receipt = GoogleProductPurchaseV2.parse(await fetchJson(url, {
      headers: { Authorization: `Bearer ${token}` },
    }));
    const lineItem = receipt.productLineItem.find((item) => item.productId === proof.productId);
    if (!lineItem) throw new Error("Google Play receipt does not match the requested product");
    return {
      provider: "google_play",
      state: googleState(receipt.purchaseStateContext.purchaseState),
      productId: lineItem.productId,
      purchaseToken: proof.purchaseToken,
      orderId: receipt.orderId ?? null,
      obfuscatedAccountId: receipt.obfuscatedExternalAccountId ?? null,
      alreadySettled: lineItem.productOfferDetails?.consumptionState === "CONSUMPTION_STATE_CONSUMED",
      testPurchase: receipt.testPurchaseContext?.fopType === "TEST",
      rawStatus: receipt.purchaseStateContext.purchaseState,
    };
  },
  async settle(purchase, packageName) {
    if (purchase.alreadySettled) return;
    const token = await getGoogleAccessToken();
    const url = `${GOOGLE_PUBLISHER_URL}/applications/${encodeURIComponent(packageName)}` +
      `/purchases/products/${encodeURIComponent(purchase.productId)}` +
      `/tokens/${encodeURIComponent(purchase.purchaseToken)}:consume`;
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok && response.status !== 409) {
      throw new Error(`Google Play settlement failed (${response.status})`);
    }
  },
};

const samsungVerifier: NativePurchaseVerifier = {
  async verify(proof) {
    const receipt = SamsungReceipt.parse(await fetchJson(
      `${SAMSUNG_RECEIPT_URL}?purchaseID=${encodeURIComponent(proof.purchaseToken)}`,
    ));
    if (receipt.itemId && receipt.itemId !== proof.productId) {
      throw new Error("Samsung receipt does not match the requested product");
    }
    if (receipt.packageName && receipt.packageName !== proof.packageName) {
      throw new Error("Samsung receipt does not match the application package");
    }
    return {
      provider: "samsung_iap",
      state: receipt.status === "success" ? "purchased" : "cancelled",
      productId: receipt.itemId ?? proof.productId,
      purchaseToken: proof.purchaseToken,
      orderId: receipt.orderId ?? null,
      obfuscatedAccountId: receipt.obfuscatedAccountId ?? null,
      alreadySettled: receipt.consumeYN === "Y",
      testPurchase: receipt.mode === "TEST",
      rawStatus: receipt.status,
    };
  },
  async settle(purchase, packageName) {
    if (purchase.alreadySettled) return;
    const accessToken = process.env.SAMSUNG_IAP_ACCESS_TOKEN;
    const serviceAccountId = process.env.SAMSUNG_IAP_SERVICE_ACCOUNT_ID;
    if (!accessToken || !serviceAccountId) {
      throw new Error("Samsung IAP settlement is not configured");
    }
    const response = await fetch(
      `${SAMSUNG_DEVELOPER_URL}/applications/${encodeURIComponent(packageName)}` +
        `/purchases/${encodeURIComponent(purchase.purchaseToken)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "service-account-id": serviceAccountId,
        },
        body: JSON.stringify({ action: "consume" }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!response.ok) throw new Error(`Samsung IAP settlement failed (${response.status})`);
    const body = z.object({
      purchaseItemList: z.array(z.object({ statusCode: z.string() })),
    }).parse(await response.json());
    const status = body.purchaseItemList[0]?.statusCode;
    if (status !== "0" && status !== "4") {
      throw new Error(`Samsung IAP settlement was rejected (${status ?? "unknown"})`);
    }
  },
};

export function getNativePurchaseVerifier(provider: NativeStoreProvider): NativePurchaseVerifier {
  return provider === "google_play" ? googlePlayVerifier : samsungVerifier;
}

export function obfuscateStoreAccountId(accountId: string): string {
  return createHash("sha256").update(`luminae-store:${accountId}`).digest("hex");
}

export function accountProofMatches(receiptValue: string | null, accountId: string): boolean {
  if (!receiptValue) return false;
  const expected = obfuscateStoreAccountId(accountId);
  return receiptValue === expected || receiptValue === Buffer.from(expected).toString("base64");
}
