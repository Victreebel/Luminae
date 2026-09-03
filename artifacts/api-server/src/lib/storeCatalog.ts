import type { StoreItem } from "@workspace/game-types";

export type {
  EquippableStoreItemKind,
  StoreItem,
  StoreItemKind,
  StoreItemRarity,
  StoreItemVisibility,
} from "@workspace/game-types";

export const BLACK_MARKET_DECRYPTION_KEY_ITEM_ID =
  "consumable.vault.blackMarketDecryptionKey.v1";

export const STORE_ITEMS: StoreItem[] = [
  {
    id: "cosmetic.cardBack.astralFoundry.v1",
    name: "Mantle-to-Orbit Foundry Card Back",
    kind: "card_back",
    rarity: "rare",
    visibility: "player_only",
    scopeKey: "global",
    priceLabel: "40 Lume",
    starlightPrice: 40,
    shortDescription: "A forged-gold deck skin with a cold stellar core.",
    description:
      "Changes Archive card backs on your screen only. Other participants keep their own presentation, and no gameplay advantages are included.",
    previewClass: "store-preview--astral-foundry",
  },
  {
    id: "cosmetic.civilizationAmbience.voidRadianceObservatory.v1",
    name: "Void Radiance Observatory",
    kind: "civilization_ambience",
    rarity: "mythic",
    visibility: "player_only",
    scopeKey: "global",
    priceLabel: "80 Lume",
    starlightPrice: 80,
    shortDescription: "A premium civilization backdrop framed by violet auroras.",
    description:
      "Adds a premium civilization ambience on your screen only. Other participants keep their own presentation, and match outcomes are unchanged.",
    previewClass: "store-preview--void-radiance",
  },
  {
    id: "cosmetic.blueprint.antimatter.armored.v1",
    name: "Armored Detonator",
    kind: "blueprint_presentation",
    rarity: "foundational",
    visibility: "all_participants",
    scopeKey: "bp_antimatter_detonator",
    included: true,
    blueprintId: "bp_antimatter_detonator",
    presentationVariant: "armored",
    priceLabel: "Included",
    starlightPrice: null,
    shortDescription: "The canonical containment architecture.",
    description:
      "The included Antimatter Detonator form. Its timing, information, and gameplay are identical to every presentation variant.",
    previewClass: "store-preview--antimatter-armored",
  },
  {
    id: "cosmetic.blueprint.antimatter.original.v1",
    name: "Original Detonator",
    kind: "blueprint_presentation",
    rarity: "foundational",
    visibility: "all_participants",
    scopeKey: "bp_antimatter_detonator",
    blueprintId: "bp_antimatter_detonator",
    presentationVariant: "original",
    priceLabel: "Mastery Reward",
    starlightPrice: null,
    shortDescription: "The earliest recovered manifestation.",
    description:
      "Earned after manifesting the Antimatter Detonator for the first time. Presentation only; timing, information, and gameplay remain identical for every participant.",
    previewClass: "store-preview--antimatter-original",
  },
  {
    id: "cosmetic.blueprint.antimatter.asymmetric.v1",
    name: "Asymmetric Detonator",
    kind: "blueprint_presentation",
    rarity: "rare",
    visibility: "all_participants",
    scopeKey: "bp_antimatter_detonator",
    blueprintId: "bp_antimatter_detonator",
    presentationVariant: "asymmetric",
    priceLabel: "40 Lume",
    starlightPrice: 40,
    shortDescription: "An offset field architecture with exposed machinery.",
    description:
      "A presentation-only Antimatter Detonator form synchronized to every participant after manifestation.",
    previewClass: "store-preview--antimatter-asymmetric",
  },
  {
    id: "cosmetic.blueprint.antimatter.lattice.v1",
    name: "Lattice Detonator",
    kind: "blueprint_presentation",
    rarity: "mythic",
    visibility: "all_participants",
    scopeKey: "bp_antimatter_detonator",
    blueprintId: "bp_antimatter_detonator",
    presentationVariant: "lattice",
    priceLabel: "80 Lume",
    starlightPrice: 80,
    shortDescription: "A rare open-lattice containment geometry.",
    description:
      "A presentation-only Antimatter Detonator form synchronized to every participant after manifestation.",
    previewClass: "store-preview--antimatter-lattice",
  },
];

export function getStoreItem(itemId: string): StoreItem | undefined {
  return STORE_ITEMS.find((item) => item.id === itemId);
}

export function isBlueprintPresentationItem(item: StoreItem): boolean {
  return item.kind === "blueprint_presentation";
}

export function isBlackMarketDecryptionKey(item: StoreItem): boolean {
  return item.id === BLACK_MARKET_DECRYPTION_KEY_ITEM_ID;
}

export function getVisibleStoreItems(blueprintsRevealed: boolean): StoreItem[] {
  if (blueprintsRevealed) {
    return STORE_ITEMS.filter((item) => !isBlackMarketDecryptionKey(item));
  }
  return STORE_ITEMS.filter((item) => !isBlueprintPresentationItem(item));
}

export const INCLUDED_STORE_ITEM_IDS = STORE_ITEMS
  .filter((item) => item.included)
  .map((item) => item.id);
