import { describe, expect, it } from "vitest";
import {
  ARTIFACT_DEPICTION_SCALE_BY_ID,
  TIER_THREE_ARTIFACT_CANON,
} from "@workspace/game-types";
import { CARD_LORE, getArtifactDepictionScale } from "../../../../api-server/src/lib/cardLore";
import { CARD_NAME_FALLBACK } from "../cardNameFallback";
import { TUTORIAL_CARDS } from "../tutorialData";

describe("CARD_NAME_FALLBACK", () => {
  it("matches every name in the authoritative server lore catalog", () => {
    const serverNames = Object.fromEntries(
      Object.entries(CARD_LORE).map(([id, lore]) => [id, lore.name]),
    );

    expect(CARD_NAME_FALLBACK).toEqual(serverNames);
  });

  it("preserves the complete 45 / 30 / 20 Artifact tier structure", () => {
    const ids = Object.keys(CARD_LORE);

    expect(ids).toHaveLength(95);
    expect(ids.filter((id) => id.startsWith("t1"))).toHaveLength(45);
    expect(ids.filter((id) => id.startsWith("t2"))).toHaveLength(30);
    expect(ids.filter((id) => id.startsWith("t3"))).toHaveLength(20);
  });

  it("keeps Tier III engineering reach distinct from its operational artwork viewpoint", () => {
    const tierThreeLore = Object.entries(CARD_LORE)
      .filter(([id]) => id.startsWith("t3"))
      .map(([, lore]) => lore);

    expect(tierThreeLore).toHaveLength(20);
    expect(tierThreeLore.every((lore) => lore.engineeringScale === "Galactic"))
      .toBe(true);
    expect(tierThreeLore.every((lore) => (
      getArtifactDepictionScale(lore) === "installation" ||
      getArtifactDepictionScale(lore) === "planetary" ||
      getArtifactDepictionScale(lore) === "stellar" ||
      getArtifactDepictionScale(lore) === "galactic"
    )))
      .toBe(true);
    expect(Object.keys(TIER_THREE_ARTIFACT_CANON)).toHaveLength(20);
  });

  it("keeps every Artifact ready for Civilization scene deployment metadata", () => {
    const missing = Object.entries(CARD_LORE).flatMap(([id, lore]) => {
      const missingFields = [
        ["artifactForm", lore.artifactForm],
        ["blueprintRole", lore.blueprintRole],
        ["civLane", lore.civLane],
        ["engineeringScale", lore.engineeringScale],
        ["depictionScale", getArtifactDepictionScale(lore)],
      ]
        .filter(([, value]) => typeof value !== "string" || value.trim().length === 0)
        .map(([field]) => field);

      return missingFields.length > 0 ? [{ id, missingFields }] : [];
    });

    expect(missing).toEqual([]);
  });

  it("uses explicit Artifact depiction scale independent of tier", () => {
    expect(Object.keys(ARTIFACT_DEPICTION_SCALE_BY_ID)).toHaveLength(95);
    expect(getArtifactDepictionScale(CARD_LORE.t1r02!)).toBe("macro");
    expect(getArtifactDepictionScale(CARD_LORE.t1s02!)).toBe("room");
    expect(getArtifactDepictionScale(CARD_LORE.t2p06!)).toBe("tabletop");
    expect(getArtifactDepictionScale(CARD_LORE.t3s01!)).toBe("stellar");
  });

  it("keeps Artifact engineering scale aligned to tier", () => {
    const misaligned = Object.entries(CARD_LORE).flatMap(([id, lore]) => {
      const expected = id.startsWith("t3")
        ? "Galactic"
        : id.startsWith("t2")
          ? "Star-system"
          : "Planetary";
      return lore.engineeringScale === expected
        ? []
        : [{ id, expected, actual: lore.engineeringScale }];
    });

    expect(misaligned).toEqual([]);
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
