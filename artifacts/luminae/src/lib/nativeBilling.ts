import type {
  LumePackDefinition,
  LumePackId,
  NativeLumePackOffer,
  NativeStoreProvider,
} from "@workspace/game-types";

interface NativeBillingPurchase {
  productId: string;
  purchaseToken: string;
}

interface NativeBillingBridge {
  getProvider(): Promise<{ provider: NativeStoreProvider }>;
  getProducts(input: { productIds: string[] }): Promise<{
    products: Array<{
      productId: string;
      localizedPrice: string;
      currencyCode?: string;
    }>;
  }>;
  purchase(input: {
    productId: string;
    obfuscatedAccountId: string;
  }): Promise<NativeBillingPurchase>;
  restorePurchases(): Promise<{ purchases: NativeBillingPurchase[] }>;
}

declare global {
  interface Window {
    LuminaeBilling?: NativeBillingBridge;
    Capacitor?: { Plugins?: { LuminaeBilling?: NativeBillingBridge } };
  }
}

function bridge(): NativeBillingBridge | null {
  return window.Capacitor?.Plugins?.LuminaeBilling ?? window.LuminaeBilling ?? null;
}

async function obfuscateAccountId(accountId: string): Promise<string> {
  const bytes = new TextEncoder().encode(`luminae-store:${accountId}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hasNativeBilling(): boolean {
  return bridge() !== null;
}

export async function loadNativeLumeOffers(
  definitions: readonly LumePackDefinition[],
): Promise<{ provider: NativeStoreProvider; offers: NativeLumePackOffer[] }> {
  const native = bridge();
  if (!native) return { provider: "google_play", offers: [] };
  const { provider } = await native.getProvider();
  const productIds = definitions.map((definition) => definition.productIds[provider]);
  const { products } = await native.getProducts({ productIds });
  const byId = new Map(products.map((product) => [product.productId, product]));
  return {
    provider,
    offers: definitions.flatMap((definition) => {
      const productId = definition.productIds[provider];
      const product = byId.get(productId);
      return product ? [{
        packId: definition.id,
        productId,
        lumeAmount: definition.lumeAmount,
        localizedPrice: product.localizedPrice,
        currencyCode: product.currencyCode,
      }] : [];
    }),
  };
}

export async function purchaseNativeLumePack(input: {
  accountId: string;
  offer: NativeLumePackOffer;
}): Promise<NativeBillingPurchase & { packId: LumePackId; provider: NativeStoreProvider }> {
  const native = bridge();
  if (!native) throw new Error("Native billing is not available on this device");
  const { provider } = await native.getProvider();
  const purchase = await native.purchase({
    productId: input.offer.productId,
    obfuscatedAccountId: await obfuscateAccountId(input.accountId),
  });
  if (purchase.productId !== input.offer.productId) {
    throw new Error("The storefront returned a different product");
  }
  return { ...purchase, packId: input.offer.packId, provider };
}

export async function restoreNativeLumePurchases(
  definitions: readonly LumePackDefinition[],
): Promise<Array<NativeBillingPurchase & { packId: LumePackId; provider: NativeStoreProvider }>> {
  const native = bridge();
  if (!native) return [];
  const [{ provider }, { purchases }] = await Promise.all([
    native.getProvider(),
    native.restorePurchases(),
  ]);
  const packByProduct = new Map(
    definitions.map((definition) => [definition.productIds[provider], definition.id] as const),
  );
  return purchases.flatMap((purchase) => {
    const packId = packByProduct.get(purchase.productId);
    return packId ? [{ ...purchase, packId, provider }] : [];
  });
}
