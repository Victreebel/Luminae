import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAccount } from "@/contexts/AccountContext";
import {
  apiClaimDailyReward,
  apiEquipCosmetic,
  apiGetStore,
  apiTestPurchase,
  apiUnlockWithLume,
  apiVerifyNativeLumePurchase,
  type DailyClaimResult,
  type EquipCosmeticResult,
  type LumeUnlockResult,
  type EquippableStoreItemKind,
  type StoreState,
  type TestPurchaseResult,
} from "@/lib/accountSession";
import { purchaseNativeLumePack, restoreNativeLumePurchases } from "@/lib/nativeBilling";
import type {
  CosmeticLoadoutItem,
  NativeLumePackOffer,
  NativeLumePurchaseResult,
} from "@workspace/game-types";
import { recordTelemetry } from "@/lib/telemetry";

const EMPTY_LOADOUT: Record<EquippableStoreItemKind, string | null> = {
  card_back: null,
  civilization_ambience: null,
  luminary_arrival_sound: null,
  blueprint_presentation: null,
  vault_seal: null,
};

function loadoutByKind(items: readonly CosmeticLoadoutItem[]): Record<EquippableStoreItemKind, string | null> {
  return {
    card_back: items.find((item) => item.slot === "card_back" && item.scopeKey === "global")?.itemId ?? null,
    civilization_ambience:
      items.find((item) => item.slot === "civilization_ambience" && item.scopeKey === "global")?.itemId ?? null,
    luminary_arrival_sound:
      items.find((item) => item.slot === "luminary_arrival_sound" && item.scopeKey === "global")?.itemId ?? null,
    blueprint_presentation:
      items.find((item) => item.slot === "blueprint_presentation")?.itemId ?? null,
    vault_seal: items.find((item) => item.slot === "vault_seal" && item.scopeKey === "global")?.itemId ?? null,
  };
}

interface CosmeticsContextValue {
  store: StoreState | null;
  equippedItemIds: Record<EquippableStoreItemKind, string | null>;
  equippedItems: CosmeticLoadoutItem[];
  isLoading: boolean;
  loadError: boolean;
  refreshStore: () => Promise<void>;
  testPurchase: (itemId: string) => Promise<TestPurchaseResult>;
  unlockWithLume: (itemId: string) => Promise<LumeUnlockResult>;
  equipCosmetic: (
    slot: EquippableStoreItemKind,
    itemId: string | null,
    scopeKey?: string,
  ) => Promise<EquipCosmeticResult>;
  claimDailyReward: () => Promise<DailyClaimResult>;
  buyNativeLume: (offer: NativeLumePackOffer) => Promise<NativeLumePurchaseResult>;
  restoreNativeLume: () => Promise<NativeLumePurchaseResult[]>;
}

const unavailable = async (): Promise<never> => {
  throw new Error("Sign in to manage cosmetics");
};

const CosmeticsContext = createContext<CosmeticsContextValue>({
  store: null,
  equippedItemIds: EMPTY_LOADOUT,
  equippedItems: [],
  isLoading: false,
  loadError: false,
  refreshStore: async () => {},
  testPurchase: unavailable,
  unlockWithLume: unavailable,
  equipCosmetic: unavailable,
  claimDailyReward: unavailable,
  buyNativeLume: unavailable,
  restoreNativeLume: unavailable,
});

export function CosmeticsProvider({ children }: { children: ReactNode }) {
  const { account, token, refreshAccount } = useAccount();
  const [store, setStore] = useState<StoreState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const refreshStore = useCallback(async () => {
    if (!token) {
      setStore(null);
      setLoadError(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(false);
    try {
      setStore(await apiGetStore(token));
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setStore(null);
    setLoadError(false);
    setIsLoading(false);
  }, [token]);

  const testPurchase = useCallback(async (itemId: string) => {
    if (!token) return unavailable();
    const result = await apiTestPurchase(token, itemId);
    setStore((current) => current ? {
      ...current,
      ownedItemIds: Array.from(new Set([...current.ownedItemIds, itemId])),
    } : current);
    return result;
  }, [token]);

  const unlockWithLume = useCallback(async (itemId: string) => {
    if (!token) return unavailable();
    const result = await apiUnlockWithLume(token, itemId);
    setStore((current) => current ? {
      ...current,
      ownedItemIds: Array.from(new Set([...current.ownedItemIds, itemId])),
      engagement: {
        ...current.engagement,
        lumeBalance: result.lumeBalance,
      },
    } : current);
    return result;
  }, [token]);

  const equipCosmetic = useCallback(async (
    slot: EquippableStoreItemKind,
    itemId: string | null,
    scopeKey = "global",
  ) => {
    if (!token) return unavailable();
    const result = await apiEquipCosmetic(token, slot, itemId, scopeKey);
    setStore((current) => current ? {
      ...current,
      equippedItemIds: result.equippedItemIds,
      equippedItems: result.equippedItems,
    } : current);
    await refreshAccount().catch(() => undefined);
    return result;
  }, [refreshAccount, token]);

  const claimDailyReward = useCallback(async () => {
    if (!token) return unavailable();
    const result = await apiClaimDailyReward(token);
    setStore((current) => current ? {
      ...current,
      engagement: {
        ...current.engagement,
        lumeBalance: result.lumeBalance,
        dailyClaimStreak: result.dailyClaimStreak,
        lastDailyClaimDate: result.lastDailyClaimDate,
        canClaimDaily: false,
      },
    } : current);
    return result;
  }, [token]);

  const buyNativeLume = useCallback(async (offer: NativeLumePackOffer) => {
    if (!token || !account) return unavailable();
    recordTelemetry("purchase_started", { packId: offer.packId });
    try {
      const proof = await purchaseNativeLumePack({ accountId: account.id, offer });
      const result = await apiVerifyNativeLumePurchase(token, proof);
      recordTelemetry(result.status === "pending" ? "purchase_pending" : "purchase_completed", {
        packId: offer.packId,
      });
      setStore((current) => current ? {
        ...current,
        engagement: {
          ...current.engagement,
          lumeBalance: result.lumeBalance,
        },
      } : current);
      return result;
    } catch (error) {
      recordTelemetry("purchase_failed", {
        packId: offer.packId,
        reason: error instanceof Error ? error.message : "unknown",
      });
      throw error;
    }
  }, [account, token]);

  const restoreNativeLume = useCallback(async () => {
    if (!token || !store) return [];
    const proofs = await restoreNativeLumePurchases(store.lumePacks);
    const results: NativeLumePurchaseResult[] = [];
    for (const proof of proofs) {
      results.push(await apiVerifyNativeLumePurchase(token, proof));
    }
    const finalBalance = results.at(-1)?.lumeBalance;
    if (finalBalance !== undefined) {
      setStore((current) => current ? {
        ...current,
        engagement: { ...current.engagement, lumeBalance: finalBalance },
      } : current);
    }
    return results;
  }, [store, token]);

  const equippedItems = store?.equippedItems ?? account?.cosmeticLoadout ?? [];
  const value = useMemo<CosmeticsContextValue>(() => ({
    store,
    equippedItemIds: store?.equippedItemIds ?? loadoutByKind(equippedItems),
    equippedItems,
    isLoading,
    loadError,
    refreshStore,
    testPurchase,
    unlockWithLume,
    equipCosmetic,
    claimDailyReward,
    buyNativeLume,
    restoreNativeLume,
  }), [
    store,
    equippedItems,
    isLoading,
    loadError,
    refreshStore,
    testPurchase,
    unlockWithLume,
    equipCosmetic,
    claimDailyReward,
    buyNativeLume,
    restoreNativeLume,
  ]);

  return <CosmeticsContext.Provider value={value}>{children}</CosmeticsContext.Provider>;
}

export function useCosmetics(): CosmeticsContextValue {
  return useContext(CosmeticsContext);
}
