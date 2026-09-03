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
  apiUnlockWithStarlight,
  type DailyClaimResult,
  type EquipCosmeticResult,
  type StarlightUnlockResult,
  type EquippableStoreItemKind,
  type StoreState,
  type TestPurchaseResult,
} from "@/lib/accountSession";
import type { CosmeticLoadoutItem } from "@workspace/game-types";

const EMPTY_LOADOUT: Record<EquippableStoreItemKind, string | null> = {
  card_back: null,
  civilization_ambience: null,
  blueprint_presentation: null,
};

function loadoutByKind(items: readonly CosmeticLoadoutItem[]): Record<EquippableStoreItemKind, string | null> {
  return {
    card_back: items.find((item) => item.slot === "card_back" && item.scopeKey === "global")?.itemId ?? null,
    civilization_ambience:
      items.find((item) => item.slot === "civilization_ambience" && item.scopeKey === "global")?.itemId ?? null,
    blueprint_presentation:
      items.find((item) => item.slot === "blueprint_presentation")?.itemId ?? null,
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
  unlockWithStarlight: (itemId: string) => Promise<StarlightUnlockResult>;
  equipCosmetic: (
    slot: EquippableStoreItemKind,
    itemId: string | null,
    scopeKey?: string,
  ) => Promise<EquipCosmeticResult>;
  claimDailyReward: () => Promise<DailyClaimResult>;
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
  unlockWithStarlight: unavailable,
  equipCosmetic: unavailable,
  claimDailyReward: unavailable,
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

  const unlockWithStarlight = useCallback(async (itemId: string) => {
    if (!token) return unavailable();
    const result = await apiUnlockWithStarlight(token, itemId);
    setStore((current) => current ? {
      ...current,
      ownedItemIds: Array.from(new Set([...current.ownedItemIds, itemId])),
      engagement: {
        ...current.engagement,
        cosmeticBalance: result.cosmeticBalance,
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
        cosmeticBalance: result.cosmeticBalance,
        dailyClaimStreak: result.dailyClaimStreak,
        lastDailyClaimDate: result.lastDailyClaimDate,
        canClaimDaily: false,
      },
    } : current);
    return result;
  }, [token]);

  const value = useMemo<CosmeticsContextValue>(() => {
    const equippedItems = store?.equippedItems ?? account?.cosmeticLoadout ?? [];
    return {
      store,
      equippedItemIds: store?.equippedItemIds ?? loadoutByKind(equippedItems),
      equippedItems,
      isLoading,
      loadError,
      refreshStore,
      testPurchase,
      unlockWithStarlight,
      equipCosmetic,
      claimDailyReward,
    };
  }, [
    store,
    account?.cosmeticLoadout,
    isLoading,
    loadError,
    refreshStore,
    testPurchase,
    unlockWithStarlight,
    equipCosmetic,
    claimDailyReward,
  ]);

  return <CosmeticsContext.Provider value={value}>{children}</CosmeticsContext.Provider>;
}

export function useCosmetics(): CosmeticsContextValue {
  return useContext(CosmeticsContext);
}
