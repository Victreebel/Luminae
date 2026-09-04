import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cosmeticState = vi.hoisted(() => ({
  cardBack: null as string | null,
  ambience: null as string | null,
}));

vi.mock("@/contexts/CosmeticsContext", () => ({
  useCosmetics: () => ({
    equippedItemIds: {
      card_back: cosmeticState.cardBack,
      civilization_ambience: cosmeticState.ambience,
      luminary_arrival_sound: null,
      blueprint_presentation: null,
      vault_seal: null,
    },
  }),
}));

import { CardBackTier1 } from "@/components/ArtifactCardBack";
import { KardashevScene } from "@/components/KardashevScene";

describe("account cosmetics", () => {
  beforeEach(() => {
    cosmeticState.cardBack = null;
    cosmeticState.ambience = null;
  });

  it("adds the Mantle-to-Orbit Foundry treatment only while that card back is equipped", () => {
    expect(renderToStaticMarkup(<CardBackTier1 />)).not.toContain("data-cosmetic-card-back");

    cosmeticState.cardBack = "cosmetic.cardBack.astralFoundry.v1";
    expect(renderToStaticMarkup(<CardBackTier1 />)).toContain(
      'data-cosmetic-card-back="astral-foundry"',
    );
  });

  it("adds the Void Radiance layer without replacing the civilization scene", () => {
    cosmeticState.ambience = "cosmetic.civilizationAmbience.voidRadianceObservatory.v1";
    const markup = renderToStaticMarkup(
      <KardashevScene
        tier={1}
        palette={{ primary: "#4ade80", secondary: "#0f5a28", accent: "#a7f3c0" }}
        paused
      />,
    );

    expect(markup).toContain('data-cosmetic-ambience="void-radiance-observatory"');
    expect(markup).toContain("civ-ambience-observatory");
    expect(markup).toContain("<canvas");
  });
});
