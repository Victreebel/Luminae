import { afterEach, describe, expect, it, vi } from "vitest";
import { loadNativeLumeOffers, purchaseNativeLumePack } from "../nativeBilling";
import type { LumePackDefinition } from "@workspace/game-types";

const definitions: LumePackDefinition[] = [{
  id: "lume_100",
  lumeAmount: 100,
  productIds: { google_play: "play_100", samsung_iap: "galaxy_100" },
}];

afterEach(() => {
  delete window.LuminaeBilling;
  delete window.Capacitor;
});

describe("native billing bridge", () => {
  it("uses native localized prices instead of hardcoded cash prices", async () => {
    window.LuminaeBilling = {
      getProvider: vi.fn().mockResolvedValue({ provider: "google_play" }),
      getProducts: vi.fn().mockResolvedValue({
        products: [{ productId: "play_100", localizedPrice: "$1.99", currencyCode: "USD" }],
      }),
      purchase: vi.fn(),
      restorePurchases: vi.fn(),
    };
    await expect(loadNativeLumeOffers(definitions)).resolves.toEqual({
      provider: "google_play",
      offers: [{
        packId: "lume_100",
        productId: "play_100",
        lumeAmount: 100,
        localizedPrice: "$1.99",
        currencyCode: "USD",
      }],
    });
  });

  it("binds a purchase to an obfuscated account proof", async () => {
    const purchase = vi.fn().mockResolvedValue({ productId: "galaxy_100", purchaseToken: "receipt-token" });
    window.LuminaeBilling = {
      getProvider: vi.fn().mockResolvedValue({ provider: "samsung_iap" }),
      getProducts: vi.fn(),
      purchase,
      restorePurchases: vi.fn(),
    };
    await expect(purchaseNativeLumePack({
      accountId: "account-a",
      offer: {
        packId: "lume_100",
        productId: "galaxy_100",
        lumeAmount: 100,
        localizedPrice: "$1.99",
      },
    })).resolves.toMatchObject({ provider: "samsung_iap", packId: "lume_100" });
    expect(purchase).toHaveBeenCalledWith({
      productId: "galaxy_100",
      obfuscatedAccountId: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });
});
