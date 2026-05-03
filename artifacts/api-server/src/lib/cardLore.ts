// ─── Luminae Card Lore ──────────────────────────────────────────────────────
// Original names + flavor text for every artifact card.

export interface CardLore {
  name: string;
  flavor: string;
}

export const CARD_LORE: Record<string, CardLore> = {
  // ── Tier 1 ─ Ruby (solar / forge) ────────────────────────────────────────
  t1r01: { name: "Forge Spark", flavor: "The first cinder of a star not yet born." },
  t1r02: { name: "Ember Coil", flavor: "Heat woven into a bracelet of living wire." },
  t1r03: { name: "Sunshard Lens", flavor: "Captures dawnlight, releases it on command." },
  t1r04: { name: "Pyre Glyph", flavor: "Etched on stone that never cools." },

  // ── Tier 1 ─ Sapphire (abyssal / tide) ───────────────────────────────────
  t1s01: { name: "Tideglass Vial", flavor: "Carries a single wave from a forgotten sea." },
  t1s02: { name: "Abyss Mote", flavor: "A drop of pressure from the deepest dark." },
  t1s03: { name: "Frostpetal", flavor: "Bloomed in the shadow of a dying moon." },
  t1s04: { name: "Riverbone Charm", flavor: "Hummed by every stream it has ever crossed." },

  // ── Tier 1 ─ Emerald (verdance / life) ───────────────────────────────────
  t1e01: { name: "Verdant Sprout", flavor: "Roots sink through reality looking for soil." },
  t1e02: { name: "Lichen Sigil", flavor: "Slow-growing prophecy in green script." },
  t1e03: { name: "Mossheart Pebble", flavor: "Beats once per century, always at dawn." },
  t1e04: { name: "Pollen Drift", flavor: "Carries promises between unmet gardens." },

  // ── Tier 1 ─ Onyx (singularity / shadow) ─────────────────────────────────
  t1o01: { name: "Eclipse Husk", flavor: "All that remained when the sun forgot itself." },
  t1o02: { name: "Nullthread", flavor: "Stitched into the seam between two nights." },
  t1o03: { name: "Shadowleaf", flavor: "Its veins map roads that do not exist." },
  t1o04: { name: "Voidpearl", flavor: "A bead that drinks the light around it." },

  // ── Tier 1 ─ Pearl (celestial / aurora) ──────────────────────────────────
  t1p01: { name: "Auroral Mote", flavor: "Cut from a curtain of polar sky." },
  t1p02: { name: "Lumen Veil", flavor: "Folded twice; opens onto morning." },
  t1p03: { name: "Skyglass Tear", flavor: "Wept by a constellation seeking ground." },
  t1p04: { name: "Halo Petal", flavor: "Falls from the rim of unseen suns." },

  // ── Tier 2 ─ Ruby ────────────────────────────────────────────────────────
  t2r01: { name: "Crucible of Embers", flavor: "Smelts longing into purpose." },
  t2r02: { name: "Solar Reliquary", flavor: "Holds the warmth of a vanished noon." },
  t2r03: { name: "Pyrelord's Sigil", flavor: "Brands the sky with a single command." },

  // ── Tier 2 ─ Sapphire ────────────────────────────────────────────────────
  t2s01: { name: "Tidekeeper's Lantern", flavor: "Its flame is the colour of drowned bells." },
  t2s02: { name: "Abyssal Compass", flavor: "Its needle points to whatever you have lost." },
  t2s03: { name: "Glacier Mantle", flavor: "Cold enough to silence a memory." },

  // ── Tier 2 ─ Emerald ─────────────────────────────────────────────────────
  t2e01: { name: "Bloomwarden's Crook", flavor: "Wakes orchards out of season." },
  t2e02: { name: "Verdant Crucible", flavor: "Distills new species, one breath at a time." },
  t2e03: { name: "Mosslord's Sigil", flavor: "A pact written in slow, patient green." },

  // ── Tier 2 ─ Onyx ────────────────────────────────────────────────────────
  t2o01: { name: "Eclipsewright's Forge", flavor: "Hammers shadows into useful shapes." },
  t2o02: { name: "Singular Lens", flavor: "Focuses absence to a perfect point." },
  t2o03: { name: "Hollow Diadem", flavor: "Wear it and the room forgets its corners." },

  // ── Tier 2 ─ Pearl ───────────────────────────────────────────────────────
  t2p01: { name: "Skyweaver's Loom", flavor: "Threads of dawn pulled taut across the dark." },
  t2p02: { name: "Aurora Reliquary", flavor: "A jar of the color between two stars." },
  t2p03: { name: "Lumen Crucible", flavor: "Distills morning into a single drop." },
};

// Tier 3 ── added separately so the file stays scannable
Object.assign(CARD_LORE, {
  t3r01: { name: "Heart of the Furnace", flavor: "The anvil on which the first sun was struck." } as CardLore,
  t3r02: { name: "Crown of Solar Tides", flavor: "Every dawn pays it a single ray of tribute." } as CardLore,
  t3s01: { name: "Throne of the Drowned Star", flavor: "Submerged for an age; still warm to the touch." } as CardLore,
  t3s02: { name: "Mantle of the Endless Tide", flavor: "Folds an ocean into a single cold seam." } as CardLore,
  t3e01: { name: "Heart of the Worldgarden", flavor: "Its slow pulse turns winter into green." } as CardLore,
  t3e02: { name: "Crown of the Verdant Wake", flavor: "Wakes forests that have not yet been planted." } as CardLore,
  t3o01: { name: "Throne of the Hollow Dawn", flavor: "Where light goes when nobody is watching." } as CardLore,
  t3o02: { name: "Mantle of the Singular Night", flavor: "Hides one truth so completely that even you forget it." } as CardLore,
  t3p01: { name: "Heart of the Aurora", flavor: "Beats in colors we have no names for yet." } as CardLore,
  t3p02: { name: "Crown of the First Light", flavor: "The original morning, waiting to be worn." } as CardLore,
});

export function getCardLore(id: string): CardLore {
  return CARD_LORE[id] ?? { name: "Unnamed Artifact", flavor: "" };
}
