import { describe, expect, it } from "vitest";
import { CARD_LORE } from "../../../../api-server/src/lib/cardLore";
import { CARD_NAME_FALLBACK } from "../cardNameFallback";
import { TUTORIAL_CARDS } from "../tutorialCards";

describe("CARD_NAME_FALLBACK", () => {
  it("matches every name in the authoritative server lore catalog", () => {
    const serverNames = Object.fromEntries(
      Object.entries(CARD_LORE).map(([id, lore]) => [id, lore.name]),
    );

    expect(CARD_NAME_FALLBACK).toEqual(serverNames);
  });

  it("preserves the complete 40 / 30 / 20 Artifact tier structure", () => {
    const ids = Object.keys(CARD_LORE);

    expect(ids).toHaveLength(90);
    expect(ids.filter((id) => id.startsWith("t1"))).toHaveLength(40);
    expect(ids.filter((id) => id.startsWith("t2"))).toHaveLength(30);
    expect(ids.filter((id) => id.startsWith("t3"))).toHaveLength(20);
  });

  it("keeps every Tier III Artifact at galactic scale", () => {
    const tierThreeLore = Object.entries(CARD_LORE)
      .filter(([id]) => id.startsWith("t3"))
      .map(([, lore]) => lore);

    expect(tierThreeLore).toHaveLength(20);
    expect(tierThreeLore.every((lore) => lore.engineeringScale === "Galactic"))
      .toBe(true);
  });

  it("keeps player-facing Artifact lore concise", () => {
    const outliers = Object.entries(CARD_LORE).flatMap(([id, lore]) => {
      const wordCount = lore.flavor.trim().split(/\s+/).length;
      const sentenceCount = lore.flavor.match(/[.!?](?=\s|$)/g)?.length ?? 0;

      return wordCount > 30 || sentenceCount > 2
        ? [{ id, wordCount, sentenceCount }]
        : [];
    });

    expect(outliers).toEqual([]);
  });

  it("keeps tutorial card lore aligned with the canonical catalog", () => {
    for (const [id, card] of Object.entries(TUTORIAL_CARDS)) {
      expect(card.name).toBe(CARD_LORE[id]?.name);
      expect(card.flavor).toBe(CARD_LORE[id]?.flavor);
    }
  });
});
