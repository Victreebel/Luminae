import type {
  LumePackDefinition,
  LumePackId,
  NativeStoreProvider,
} from "@workspace/game-types";

export const LUME_PACKS: readonly LumePackDefinition[] = [
  {
    id: "lume_100",
    lumeAmount: 100,
    productIds: {
      google_play: "luminae_lume_100",
      samsung_iap: "luminae_lume_100",
    },
  },
  {
    id: "lume_300",
    lumeAmount: 300,
    productIds: {
      google_play: "luminae_lume_300",
      samsung_iap: "luminae_lume_300",
    },
  },
  {
    id: "lume_700",
    lumeAmount: 700,
    productIds: {
      google_play: "luminae_lume_700",
      samsung_iap: "luminae_lume_700",
    },
  },
] as const;

export function getLumePack(packId: LumePackId): LumePackDefinition {
  const pack = LUME_PACKS.find((candidate) => candidate.id === packId);
  if (!pack) throw new Error(`Unknown Lume pack: ${packId}`);
  return pack;
}

export function matchesProviderProduct(
  provider: NativeStoreProvider,
  packId: LumePackId,
  productId: string,
): boolean {
  return getLumePack(packId).productIds[provider] === productId;
}
