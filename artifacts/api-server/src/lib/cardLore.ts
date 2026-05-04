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
  t1r05: { name: "Cinderscale", flavor: "Shed by a serpent that swims through magma." },
  t1r06: { name: "Hearthstone Sliver", flavor: "A fragment of the world's first fireplace." },
  t1r07: { name: "Smoldering Eye", flavor: "Watches without blinking; blinks without warning." },
  t1r08: { name: "Ignition Glyph", flavor: "One touch and the sky remembers it was once a furnace." },

  // ── Tier 1 ─ Sapphire (abyssal / tide) ───────────────────────────────────
  t1s01: { name: "Tideglass Vial", flavor: "Carries a single wave from a forgotten sea." },
  t1s02: { name: "Abyss Mote", flavor: "A drop of pressure from the deepest dark." },
  t1s03: { name: "Frostpetal", flavor: "Bloomed in the shadow of a dying moon." },
  t1s04: { name: "Riverbone Charm", flavor: "Hummed by every stream it has ever crossed." },
  t1s05: { name: "Saltmere Shard", flavor: "Crystallised grief from an ocean that loved too deeply." },
  t1s06: { name: "Coldlight Sliver", flavor: "Bends starlight the wrong way on purpose." },
  t1s07: { name: "Undertow Bead", flavor: "Pulls at the wrist of anyone who holds it." },
  t1s08: { name: "Glacial Cipher", flavor: "Encodes a whole winter in three syllables." },

  // ── Tier 1 ─ Emerald (verdance / life) ───────────────────────────────────
  t1e01: { name: "Verdant Sprout", flavor: "Roots sink through reality looking for soil." },
  t1e02: { name: "Lichen Sigil", flavor: "Slow-growing prophecy in green script." },
  t1e03: { name: "Mossheart Pebble", flavor: "Beats once per century, always at dawn." },
  t1e04: { name: "Pollen Drift", flavor: "Carries promises between unmet gardens." },
  t1e05: { name: "Fernwhisper Shard", flavor: "Repeats the last thing a fern ever said." },
  t1e06: { name: "Seedglass Tear", flavor: "Inside: an entire meadow, patiently waiting." },
  t1e07: { name: "Bark Rune", flavor: "Carved by a tree that grew faster than thought." },
  t1e08: { name: "Thornbound Gem", flavor: "Peace preserved by something that hurts to hold." },

  // ── Tier 1 ─ Onyx (singularity / shadow) ─────────────────────────────────
  t1o01: { name: "Eclipse Husk", flavor: "All that remained when the sun forgot itself." },
  t1o02: { name: "Nullthread", flavor: "Stitched into the seam between two nights." },
  t1o03: { name: "Shadowleaf", flavor: "Its veins map roads that do not exist." },
  t1o04: { name: "Voidpearl", flavor: "A bead that drinks the light around it." },
  t1o05: { name: "Absence Chip", flavor: "Named for the hole it left behind when found." },
  t1o06: { name: "Silhouette Stone", flavor: "Perfectly shaped like nothing at all." },
  t1o07: { name: "Umbral Fleck", flavor: "A piece of shadow that refused to move on." },
  t1o08: { name: "Hollow Prism", flavor: "Splits light into colours nobody asked for." },

  // ── Tier 1 ─ Pearl (celestial / aurora) ──────────────────────────────────
  t1p01: { name: "Auroral Mote", flavor: "Cut from a curtain of polar sky." },
  t1p02: { name: "Lumen Veil", flavor: "Folded twice; opens onto morning." },
  t1p03: { name: "Skyglass Tear", flavor: "Wept by a constellation seeking ground." },
  t1p04: { name: "Halo Petal", flavor: "Falls from the rim of unseen suns." },
  t1p05: { name: "Zenith Sliver", flavor: "Broken off from the highest point in the sky." },
  t1p06: { name: "Moonfilm Bead", flavor: "A single frame from a lunar dream." },
  t1p07: { name: "Starwhisper Chip", flavor: "Murmurs coordinates only the dead can follow." },
  t1p08: { name: "Celestial Burr", flavor: "Clings to anyone walking toward something bright." },

  // ── Tier 2 ─ Ruby ────────────────────────────────────────────────────────
  t2r01: { name: "Crucible of Embers", flavor: "Smelts longing into purpose." },
  t2r02: { name: "Solar Reliquary", flavor: "Holds the warmth of a vanished noon." },
  t2r03: { name: "Pyrelord's Sigil", flavor: "Brands the sky with a single command." },
  t2r04: { name: "Ashforged Pendant", flavor: "Wore the explosion that made it." },
  t2r05: { name: "Solarcrown Fragment", flavor: "A piece of a crown too bright to finish." },
  t2r06: { name: "Pyregate Key", flavor: "Unlocks a door that only exists at noon." },

  // ── Tier 2 ─ Sapphire ────────────────────────────────────────────────────
  t2s01: { name: "Tidekeeper's Lantern", flavor: "Its flame is the colour of drowned bells." },
  t2s02: { name: "Abyssal Compass", flavor: "Its needle points to whatever you have lost." },
  t2s03: { name: "Glacier Mantle", flavor: "Cold enough to silence a memory." },
  t2s04: { name: "Hadal Sceptre", flavor: "Rulership over pressures nothing survives." },
  t2s05: { name: "Stormvault Seal", flavor: "Holds a thousand years of weather inside." },
  t2s06: { name: "Pelagic Mirror", flavor: "Reflects only what is below you." },

  // ── Tier 2 ─ Emerald ─────────────────────────────────────────────────────
  t2e01: { name: "Bloomwarden's Crook", flavor: "Wakes orchards out of season." },
  t2e02: { name: "Verdant Crucible", flavor: "Distills new species, one breath at a time." },
  t2e03: { name: "Mosslord's Sigil", flavor: "A pact written in slow, patient green." },
  t2e04: { name: "Rootwarden's Eye", flavor: "Sees every seedling that will ever sprout." },
  t2e05: { name: "Canopy Diadem", flavor: "Worn by the eldest tree in every forest." },
  t2e06: { name: "Sporebound Compass", flavor: "Always points toward the nearest thing growing." },

  // ── Tier 2 ─ Onyx ────────────────────────────────────────────────────────
  t2o01: { name: "Eclipsewright's Forge", flavor: "Hammers shadows into useful shapes." },
  t2o02: { name: "Singular Lens", flavor: "Focuses absence to a perfect point." },
  t2o03: { name: "Hollow Diadem", flavor: "Wear it and the room forgets its corners." },
  t2o04: { name: "Nightweave Crucible", flavor: "Fires at temperatures cold enough to burn." },
  t2o05: { name: "Penumbral Reliquary", flavor: "Stores what the light left behind." },
  t2o06: { name: "Voidwright's Seal", flavor: "Marks a promise that cannot be unsaid." },

  // ── Tier 2 ─ Pearl ───────────────────────────────────────────────────────
  t2p01: { name: "Skyweaver's Loom", flavor: "Threads of dawn pulled taut across the dark." },
  t2p02: { name: "Aurora Reliquary", flavor: "A jar of the color between two stars." },
  t2p03: { name: "Lumen Crucible", flavor: "Distills morning into a single drop." },
  t2p04: { name: "Zodiacal Compass", flavor: "Navigates by signs that shift each century." },
  t2p05: { name: "Solstice Lantern", flavor: "Burns longest on the shortest night." },
  t2p06: { name: "Meridian Sceptre", flavor: "Command ends where the horizon begins." },
};

// Tier 3 ── added separately so the file stays scannable
Object.assign(CARD_LORE, {
  // Ruby
  t3r01: { name: "Heart of the Furnace", flavor: "The anvil on which the first sun was struck." } as CardLore,
  t3r02: { name: "Crown of Solar Tides", flavor: "Every dawn pays it a single ray of tribute." } as CardLore,
  t3r03: { name: "Pyre Ascendant", flavor: "Rose from its own cooling embers, furious and renewed." } as CardLore,
  t3r04: { name: "Solarch's Mandate", flavor: "Five words; the sky obeyed all of them." } as CardLore,
  // Sapphire
  t3s01: { name: "Throne of the Drowned Star", flavor: "Submerged for an age; still warm to the touch." } as CardLore,
  t3s02: { name: "Mantle of the Endless Tide", flavor: "Folds an ocean into a single cold seam." } as CardLore,
  t3s03: { name: "Abyss Sovereign", flavor: "Commands the silence between two ocean floors." } as CardLore,
  t3s04: { name: "Glacial Imperium", flavor: "Its decree froze a continent's worth of memory." } as CardLore,
  // Emerald
  t3e01: { name: "Heart of the Worldgarden", flavor: "Its slow pulse turns winter into green." } as CardLore,
  t3e02: { name: "Crown of the Verdant Wake", flavor: "Wakes forests that have not yet been planted." } as CardLore,
  t3e03: { name: "Root Eternal", flavor: "Older than the soil. Waiting to be remembered." } as CardLore,
  t3e04: { name: "Canopy Absolute", flavor: "Its shade covers land that doesn't exist yet." } as CardLore,
  // Onyx
  t3o01: { name: "Throne of the Hollow Dawn", flavor: "Where light goes when nobody is watching." } as CardLore,
  t3o02: { name: "Mantle of the Singular Night", flavor: "Hides one truth so completely that even you forget it." } as CardLore,
  t3o03: { name: "Void Paramount", flavor: "The last thing left after everything else admits defeat." } as CardLore,
  t3o04: { name: "Eclipse Absolute", flavor: "Not darkness — the concept that makes darkness feel inadequate." } as CardLore,
  // Pearl
  t3p01: { name: "Heart of the Aurora", flavor: "Beats in colors we have no names for yet." } as CardLore,
  t3p02: { name: "Crown of the First Light", flavor: "The original morning, waiting to be worn." } as CardLore,
  t3p03: { name: "Zenith Eternal", flavor: "The sky's highest thought, crystallised and kept." } as CardLore,
  t3p04: { name: "Celestial Absolute", flavor: "All constellations answer to it. All of them always have." } as CardLore,
});

export function getCardLore(id: string): CardLore {
  return CARD_LORE[id] ?? { name: "Unnamed Artifact", flavor: "" };
}
