import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  testPurchase: vi.fn(),
  unlockWithLume: vi.fn(),
  equipCosmetic: vi.fn(),
  claimDailyReward: vi.fn(),
  refreshStore: vi.fn(),
  toast: vi.fn(),
  playArrivalCutscene: vi.fn(),
  stopArrivalCutscene: vi.fn(),
  setMuted: vi.fn(),
}));

vi.mock("@/lib/audio", () => ({
  gameAudio: {
    isMuted: () => false,
    playArrivalCutscene: storeMocks.playArrivalCutscene,
    stopArrivalCutscene: storeMocks.stopArrivalCutscene,
    setMuted: storeMocks.setMuted,
  },
}));

vi.mock("@/contexts/CosmeticsContext", () => ({
  useCosmetics: () => ({
    store: {
      items: [
        {
          id: "cosmetic.cardBack.test",
          name: "Mantle-to-Orbit Foundry Card Back",
          kind: "card_back",
          scopeKey: "global",
          rarity: "rare",
          visibility: "player_only",
          priceLabel: "Test Purchase",
          lumePrice: 40,
          shortDescription: "A forged-gold deck skin.",
          description: "Changes Archive card backs on your screen only.",
          previewClass: "store-preview--astral-foundry",
          previewKind: "card_back",
        },
        {
          id: "cosmetic.ambience.test",
          name: "Void Radiance Observatory",
          kind: "civilization_ambience",
          scopeKey: "global",
          rarity: "mythic",
          visibility: "player_only",
          priceLabel: "Test Purchase",
          lumePrice: null,
          shortDescription: "A premium civilization backdrop.",
          description: "Adds ambience on your screen only.",
          previewClass: "store-preview--void-radiance",
          previewKind: "civilization_ambience",
        },
        {
          id: "cosmetic.luminaryArrivalSound.firstResonance.v1",
          name: "First Resonance",
          kind: "luminary_arrival_sound",
          scopeKey: "global",
          rarity: "mythic",
          visibility: "all_participants",
          priceLabel: "80 Lume",
          lumePrice: 80,
          shortDescription: "The original celestial score for Luminary arrivals.",
          description: "Every participant hears it when you summon a Luminary.",
          previewClass: "store-preview--first-resonance",
          previewKind: "luminary_arrival_sound",
        },
        {
          id: "consumable.vault.blackMarketDecryptionKey.v1",
          name: "Black Market Decryption Key",
          kind: "consumable",
          scopeKey: "blueprint_vault",
          rarity: "mythic",
          visibility: "player_only",
          priceLabel: "Test Purchase",
          lumePrice: 100,
          shortDescription: "A single-use Vault bypass.",
          description: "Consumed on use; leaving or losing restores the five-win requirement.",
          previewClass: "store-preview--black-market-key",
          previewKind: "consumable",
        },
      ],
      ownedItemIds: [],
      equippedItems: [],
      testCheckoutEnabled: true,
      engagement: {
        lumeBalance: 100,
        lifetimeEarnedLume: 0,
        lifetimePurchasedLume: 0,
        lifetimeGrantedLume: 100,
        lifetimeSpentLume: 0,
        lifetimeRefundedLume: 0,
        dailyClaimStreak: 0,
        lastDailyClaimDate: null,
        canClaimDaily: false,
        currencyName: "Lume",
      },
    },
    isLoading: false,
    loadError: false,
    ...storeMocks,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: storeMocks.toast }),
}));

import { StoreTab } from "@/pages/dashboard";

describe("Store purchase confirmation", () => {
  beforeEach(() => {
    storeMocks.testPurchase.mockReset().mockResolvedValue({
      ok: true,
      itemId: "cosmetic.ambience.test",
      alreadyOwned: false,
      receiptId: "receipt_checkout",
    });
    storeMocks.unlockWithLume.mockReset().mockResolvedValue({
      ok: true,
      itemId: "cosmetic.cardBack.test",
      alreadyOwned: false,
      receiptId: "receipt_lume",
      lumeBalance: 60,
    });
    storeMocks.playArrivalCutscene.mockReset();
    storeMocks.stopArrivalCutscene.mockReset();
    storeMocks.setMuted.mockReset();
  });

  afterEach(cleanup);

  it("does not spend Lume until the player confirms", async () => {
    render(<StoreTab />);

    fireEvent.click(screen.getByRole("button", { name: "Unlock · 40 Lume" }));

    expect(storeMocks.unlockWithLume).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Confirm purchase");
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Balance after purchase");
    expect(screen.getByRole("alertdialog")).toHaveTextContent("60 Lume");

    fireEvent.click(screen.getByRole("button", { name: "Confirm unlock" }));
    await waitFor(() => {
      expect(storeMocks.unlockWithLume).toHaveBeenCalledWith("cosmetic.cardBack.test");
    });
  });

  it("previews First Resonance with the equipped public arrival cue", () => {
    render(<StoreTab />);

    const play = screen.getByRole("button", { name: "Play First Resonance preview" });
    fireEvent.click(play);

    expect(storeMocks.stopArrivalCutscene).toHaveBeenCalledTimes(1);
    expect(storeMocks.playArrivalCutscene).toHaveBeenCalledWith("radiant", "first_resonance");
    fireEvent.click(screen.getByRole("button", { name: "Stop First Resonance preview" }));
    expect(storeMocks.stopArrivalCutscene).toHaveBeenCalledTimes(2);
  });

  it("does not start checkout until the player confirms", async () => {
    render(<StoreTab />);

    const checkoutButtons = screen.getAllByRole("button", { name: "Test Purchase" });
    fireEvent.click(checkoutButtons[1]);

    expect(storeMocks.testPurchase).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent("No real payment will be charged");

    fireEvent.click(screen.getByRole("button", { name: "Confirm purchase" }));
    await waitFor(() => {
      expect(storeMocks.testPurchase).toHaveBeenCalledWith("cosmetic.ambience.test");
    });
  });

  it("discloses single-use behavior before acquiring the decryption key", async () => {
    render(<StoreTab />);

    fireEvent.click(screen.getByRole("button", { name: "Acquire · 100 Lume" }));

    const confirmation = screen.getByRole("alertdialog");
    expect(confirmation).toHaveTextContent("Single-use account item");
    expect(confirmation).toHaveTextContent("not refunded after a non-victory exit");

    fireEvent.click(screen.getByRole("button", { name: "Confirm purchase" }));
    await waitFor(() => {
      expect(storeMocks.unlockWithLume).toHaveBeenCalledWith(
        "consumable.vault.blackMarketDecryptionKey.v1",
      );
    });
  });
});
