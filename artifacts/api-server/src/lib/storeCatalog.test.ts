import { describe, expect, it } from "vitest";
import {
  BLACK_MARKET_DECRYPTION_KEY_ITEM_ID,
  STORE_ITEMS,
  getStoreItem,
  getVisibleStoreItems,
} from "./storeCatalog.js";

describe("store catalog", () => {
  it("ships the approved cosmetics and one disclosed consumable", () => {
    expect(STORE_ITEMS).toHaveLength(8);
    expect(STORE_ITEMS.filter((item) => item.kind === "blueprint_presentation")).toHaveLength(4);
    expect(STORE_ITEMS.filter((item) => item.kind !== "consumable").every(
      (item) => /only|identical|unchanged|no gameplay/i.test(item.description),
    )).toBe(true);
    expect(getStoreItem(BLACK_MARKET_DECRYPTION_KEY_ITEM_ID)).toMatchObject({
      kind: "consumable",
      lumePrice: 100,
    });
    expect(STORE_ITEMS.filter((item) => item.visibility === "all_participants").every(
      (item) => item.kind === "blueprint_presentation" || item.kind === "luminary_arrival_sound",
    )).toBe(true);
  });

  it("uses stable, versioned entitlement identifiers", () => {
    const ids = STORE_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^(?:cosmetic|consumable)(?:\.[a-zA-Z]+){2,3}\.v\d+$/.test(id))).toBe(true);
  });

  it("declares a reusable preview asset descriptor for every catalog entry", () => {
    expect(STORE_ITEMS.every((item) => item.assetKey.length > 0)).toBe(true);
    expect(STORE_ITEMS.every((item) => item.previewKind.length > 0)).toBe(true);
    expect(STORE_ITEMS.every((item) => item.previewClass.length > 0)).toBe(true);
    expect(STORE_ITEMS.every((item) => item.contentTags.length > 0)).toBe(true);
  });

  it("resolves entitlements by exact catalog id", () => {
    const item = STORE_ITEMS[0];
    expect(getStoreItem(item.id)).toBe(item);
    expect(getStoreItem("cosmetic.unknown.v1")).toBeUndefined();
  });

  it("keeps Lume prices explicit", () => {
    const earnable = STORE_ITEMS.filter((item) => item.lumePrice !== null);
    expect(earnable).toHaveLength(6);
    expect(earnable.map((item) => item.lumePrice).sort((left, right) => left! - right!)).toEqual([40, 40, 80, 80, 80, 100]);
    expect(STORE_ITEMS.find((item) => item.presentationVariant === "armored")?.included).toBe(true);
    expect(STORE_ITEMS.find((item) => item.presentationVariant === "original")?.lumePrice).toBeNull();
  });

  it("reveals no Blueprint presentation identity before clearance", () => {
    const classifiedCatalog = getVisibleStoreItems(false);
    expect(classifiedCatalog).toHaveLength(4);
    expect(classifiedCatalog.every((item) => item.kind !== "blueprint_presentation")).toBe(true);
    expect(classifiedCatalog.some((item) => item.id === BLACK_MARKET_DECRYPTION_KEY_ITEM_ID)).toBe(true);
    expect(getVisibleStoreItems(true)).toEqual(
      STORE_ITEMS.filter((item) => item.id !== BLACK_MARKET_DECRYPTION_KEY_ITEM_ID),
    );
  });
});
