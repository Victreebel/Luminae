// ─── Luminae Card Lore ──────────────────────────────────────────────────────
// Names + flavor text sourced from LUMINAe_ARTIFACT_REPLACEMENT_TABLE_v0.2_SCALE_ENFORCED.md
// Do NOT edit names or flavor here manually — update via the replacement table.

interface CardLore {
  name: string;
  flavor: string;
}

const CARD_LORE: Record<string, CardLore> = {
  // ── Tier 1 ─ Flare ───────────────────────────────────────────────────────
  t1r01: { name: "Ignition Kernel",            flavor: "A planetary-scale planetary ignition / orbital forge component used by a predatory mutation ecology: hidden life erupts and consumes to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1r02: { name: "Ashroot Bloom",              flavor: "A planetary-scale planetary ignition / orbital forge component used by a predatory mutation ecology: hidden life erupts and consumes to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1r03: { name: "Chrono-Ember Core",          flavor: "A planetary-scale planetary ignition / orbital forge component used by a phoenix biosphere: life burns, remembers, and regrows to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1r04: { name: "Causal Spark Coil",          flavor: "A planetary-scale planetary ignition / orbital forge component used by a phoenix industry / recurring ignition culture to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1r05: { name: "Voidflare Containment Cell", flavor: "A planetary-scale volatile-energy containment component used by an eclipse host civilization: concealed force revealed as weapon to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1r06: { name: "Photosynthetic Wick",        flavor: "A planetary-scale worldforming / living infrastructure used by a phoenix biosphere: life burns, remembers, and regrows to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1r07: { name: "Entropy Pyre Matrix",        flavor: "A planetary-scale planetary ignition / orbital forge component used by a predatory mutation ecology: hidden life erupts and consumes to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1r08: { name: "Radiant Ignition Core",      flavor: "A planetary-scale planetary ignition / orbital forge component used by a solar forge / visible expansion culture to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },

  // ── Tier 1 ─ Continuum ───────────────────────────────────────────────────
  t1s01: { name: "Echo Splinter",              flavor: "A planetary-scale memory, identity, or deep-time archive used by a phoenix biosphere: life burns, remembers, and regrows to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1s02: { name: "Causal Ember Relay",         flavor: "A planetary-scale prediction / causal-computation instrument used by a phoenix biosphere: life burns, remembers, and regrows to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1s03: { name: "Null-Loop Anchor",           flavor: "A planetary-scale prediction / causal-computation instrument used by a black furnace civilization: catastrophe engines hidden across time to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1s04: { name: "Time-Crystal Scaffold",      flavor: "A planetary-scale memory, identity, or deep-time archive used by an eternal standard civilization: energy, law, and memory across eras to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1s05: { name: "Silent Recursion Engine",    flavor: "A planetary-scale memory, identity, or deep-time archive used by a hidden sun civilization: forbidden truth preserved until the age can bear it to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1s06: { name: "Living Chronicle",           flavor: "A planetary-scale worldforming / living infrastructure used by a phoenix biosphere: life burns, remembers, and regrows to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1s07: { name: "String-Scar Loom",           flavor: "A planetary-scale dimensional pressure / collapse component used by a black furnace civilization: catastrophe engines hidden across time to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1s08: { name: "Root Memory Vault",          flavor: "A planetary-scale worldforming / living infrastructure used by an ancestral ecology / living archive culture to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },

  // ── Tier 1 ─ Verdance ────────────────────────────────────────────────────
  t1e01: { name: "Replication Spore",          flavor: "A planetary-scale generative ecology / biosphere catalyst used by a phoenix biosphere: life burns, remembers, and regrows to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1e02: { name: "Voidroot Tap",               flavor: "A planetary-scale generative ecology / biosphere catalyst used by a buried ancestral biosphere: hidden life preserves deep memory to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1e03: { name: "Char Tendril",               flavor: "A planetary-scale generative ecology / biosphere catalyst used by a phoenix biosphere: life burns, remembers, and regrows to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1e04: { name: "Worldforming Seed",          flavor: "A planetary-scale generative ecology / biosphere catalyst used by an ancestral ecology / living archive culture to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1e05: { name: "Facetcell Shard",            flavor: "A planetary-scale planetary solar-harvesting / orbital photosynthetic infrastructure used by a solar bloom civilization: living expansion through radiant signal to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1e06: { name: "Decay Lattice",              flavor: "A planetary-scale generative ecology / biosphere catalyst used by a golden canopy civilization: living memory organized into shelter/order to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1e07: { name: "Lichen Vein",                flavor: "A planetary-scale worldforming / living infrastructure used by a veiled garden civilization: hidden life using beauty, healing, and selective revelation to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1e08: { name: "Necrobloom Bed",             flavor: "A planetary-scale generative ecology / biosphere catalyst used by a hidden biosphere / cryptobiotic ecology to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },

  // ── Tier 1 ─ Abyss ───────────────────────────────────────────────────────
  t1o01: { name: "Entropy Veil",               flavor: "A planetary-scale erasure, entropy, or concealment system used by a buried ancestral biosphere: hidden life preserves deep memory to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1o02: { name: "Hawking Lantern",            flavor: "A planetary-scale horizon engineering / black-hole interface used by a hidden sun civilization: forbidden truth preserved until the age can bear it to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1o03: { name: "Ashen Hollow",               flavor: "A planetary-scale erasure, entropy, or concealment system used by a predatory mutation ecology: hidden life erupts and consumes to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1o04: { name: "Undergrowth Silencer",       flavor: "A planetary-scale generative ecology / biosphere catalyst used by a hidden biosphere / cryptobiotic ecology to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1o05: { name: "Scorch-Erasure Seal",        flavor: "A planetary-scale dimensional pressure / collapse component used by a black furnace civilization: catastrophe engines hidden across time to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1o06: { name: "Decay Network",              flavor: "A planetary-scale worldforming / living infrastructure used by a buried ancestral biosphere: hidden life preserves deep memory to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1o07: { name: "Absence Shard",              flavor: "A planetary-scale dimensional pressure / collapse component used by an eclipse host civilization: concealed force revealed as weapon to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1o08: { name: "Temporal Erasure Seal",      flavor: "A planetary-scale prediction / causal-computation instrument used by a black archive / sleeper civilization to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },

  // ── Tier 1 ─ Radiance ────────────────────────────────────────────────────
  t1p01: { name: "Correction Seed",            flavor: "A planetary-scale coherent computation / ascension substrate used by an eternal standard civilization: energy, law, and memory across eras to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1p02: { name: "Still-Point Shard",          flavor: "A planetary-scale erasure, entropy, or concealment system used by a hidden sun civilization: forbidden truth preserved until the age can bear it to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1p03: { name: "Prismatic Hollow",           flavor: "A planetary-scale dimensional pressure / collapse component used by a solar bloom civilization: living expansion through radiant signal to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1p04: { name: "Magnetic Bottle",            flavor: "A planetary-scale planetary ignition / orbital forge component used by a solar forge / visible expansion culture to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1p05: { name: "Recursive Lens",             flavor: "A planetary-scale prediction / causal-computation instrument used by a civic archive / lawful continuity culture to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1p06: { name: "Living Lattice Node",        flavor: "A planetary-scale worldforming / living infrastructure used by a solar bloom civilization: living expansion through radiant signal to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1p07: { name: "Void Prism",                 flavor: "A planetary-scale erasure, entropy, or concealment system used by a veiled garden civilization: hidden life using beauty, healing, and selective revelation to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  t1p08: { name: "Petrified Bloom",            flavor: "A planetary-scale worldforming / living infrastructure used by a sacred garden / civic ecology to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },

  // ── Tier 2 ─ Flare ───────────────────────────────────────────────────────
  t2r01: { name: "Stellar Crucible",           flavor: "A stellar-scale stellar ignition / starforge component used by a black furnace civilization: catastrophe engines hidden across time to coordinate a star, heliosphere, or inhabited system." },
  t2r02: { name: "Biomass Ignition Array",     flavor: "A stellar-scale stellar ignition / starforge component used by a predatory mutation ecology: hidden life erupts and consumes to coordinate a star, heliosphere, or inhabited system." },
  t2r03: { name: "Starlift Array",             flavor: "A stellar-scale stellar harvesting / living solar infrastructure used by a solar forge / visible expansion culture to coordinate a star, heliosphere, or inhabited system." },
  t2r04: { name: "Photosynthetic Furnace",     flavor: "A stellar-scale star-system ecology / interplanetary living infrastructure used by a solar bloom civilization: living expansion through radiant signal to coordinate a star, heliosphere, or inhabited system." },
  t2r05: { name: "Causality Furnace",          flavor: "A stellar-scale stellar ignition / starforge component used by a black furnace civilization: catastrophe engines hidden across time to coordinate a star, heliosphere, or inhabited system." },
  t2r06: { name: "Entropic Star Core",         flavor: "A stellar-scale stellar ignition / starforge component used by a black furnace / hidden eruption culture to coordinate a star, heliosphere, or inhabited system." },

  // ── Tier 2 ─ Continuum ───────────────────────────────────────────────────
  t2s01: { name: "Interstice Gate",            flavor: "A stellar-scale transit / signal relay infrastructure used by a phoenix biosphere: life burns, remembers, and regrows to coordinate a star, heliosphere, or inhabited system." },
  t2s02: { name: "Stellar Archive",            flavor: "A stellar-scale stellar archive / system-scale memory infrastructure used by a black furnace civilization: catastrophe engines hidden across time to coordinate a star, heliosphere, or inhabited system." },
  t2s03: { name: "Simulation Loom",            flavor: "A stellar-scale stellar prediction / heliospheric causal-computation instrument used by a civic archive / lawful continuity culture to coordinate a star, heliosphere, or inhabited system." },
  t2s04: { name: "Continuity Vessel",          flavor: "A stellar-scale stellar archive / system-scale memory infrastructure used by a golden canopy civilization: living memory organized into shelter/order to coordinate a star, heliosphere, or inhabited system." },
  t2s05: { name: "Mnemosyne Star-Index",       flavor: "A stellar-scale stellar archive / system-scale memory infrastructure used by a phoenix industry / recurring ignition culture to coordinate a star, heliosphere, or inhabited system." },
  t2s06: { name: "Singularity Lens",           flavor: "A stellar-scale volatile-energy containment component used by a black furnace civilization: catastrophe engines hidden across time to coordinate a star, heliosphere, or inhabited system." },

  // ── Tier 2 ─ Verdance ────────────────────────────────────────────────────
  t2e01: { name: "Starlift Worldroot",              flavor: "A stellar-scale stellar ecology / system biosphere catalyst used by a phoenix biosphere: life burns, remembers, and regrows to coordinate a star, heliosphere, or inhabited system." },
  t2e02: { name: "Circumstellar Temporal Grove",    flavor: "A stellar-scale star-system ecology / interplanetary living infrastructure used by a phoenix biosphere: life burns, remembers, and regrows to coordinate a star, heliosphere, or inhabited system." },
  t2e03: { name: "Abyssal Star-Garden",             flavor: "A stellar-scale stellar ecology / system biosphere catalyst used by a hidden biosphere / cryptobiotic ecology to coordinate a star, heliosphere, or inhabited system." },
  t2e04: { name: "Interplanetary Mycelial Relay",   flavor: "A stellar-scale star-system ecology / interplanetary living infrastructure used by a buried ancestral biosphere: hidden life preserves deep memory to coordinate a star, heliosphere, or inhabited system." },
  t2e05: { name: "Living Epoch Engine",             flavor: "A stellar-scale star-system ecology / interplanetary living infrastructure used by an ancestral ecology / living archive culture to coordinate a star, heliosphere, or inhabited system." },
  t2e06: { name: "Crystal Biome",                   flavor: "A stellar-scale star-system ecology / interplanetary living infrastructure used by a solar bloom civilization: living expansion through radiant signal to coordinate a star, heliosphere, or inhabited system." },

  // ── Tier 2 ─ Abyss ───────────────────────────────────────────────────────
  t2o01: { name: "Horizon Extractor",          flavor: "A stellar-scale horizon engineering / black-hole interface used by a veiled garden civilization: hidden life using beauty, healing, and selective revelation to coordinate a star, heliosphere, or inhabited system." },
  t2o02: { name: "Radiant Erasure Vault",      flavor: "A stellar-scale stellar concealment / system entropy-control infrastructure used by a veiled garden civilization: hidden life using beauty, healing, and selective revelation to coordinate a star, heliosphere, or inhabited system." },
  t2o03: { name: "Entropic Furnace",           flavor: "A stellar-scale stellar concealment / system entropy-control infrastructure used by a black furnace / hidden eruption culture to coordinate a star, heliosphere, or inhabited system." },
  t2o04: { name: "Extinction Forge",           flavor: "A stellar-scale stellar dimensional-pressure / collapse component used by a predatory mutation ecology: hidden life erupts and consumes to coordinate a star, heliosphere, or inhabited system." },
  t2o05: { name: "Eventide Ecology Engine",    flavor: "A stellar-scale stellar ecology / system biosphere catalyst used by a hidden biosphere / cryptobiotic ecology to coordinate a star, heliosphere, or inhabited system." },
  t2o06: { name: "Dimensional Shear",          flavor: "A stellar-scale stellar dimensional-pressure / collapse component used by a black furnace civilization: catastrophe engines hidden across time to coordinate a star, heliosphere, or inhabited system." },

  // ── Tier 2 ─ Radiance ────────────────────────────────────────────────────
  t2p01: { name: "Containment Lattice",        flavor: "A stellar-scale stellar ignition / starforge component used by an eternal standard civilization: energy, law, and memory across eras to coordinate a star, heliosphere, or inhabited system." },
  t2p02: { name: "Null-Convergence Prism",     flavor: "A stellar-scale stellar dimensional-pressure / collapse component used by a hidden sun civilization: forbidden truth preserved until the age can bear it to coordinate a star, heliosphere, or inhabited system." },
  t2p03: { name: "Heliospheric Living Lattice", flavor: "A stellar-scale star-system ecology / interplanetary living infrastructure used by a sacred garden / civic ecology to coordinate a star, heliosphere, or inhabited system." },
  t2p04: { name: "Heliostat Lattice",          flavor: "A stellar-scale stellar harvesting / living solar infrastructure used by an eternal standard civilization: energy, law, and memory across eras to coordinate a star, heliosphere, or inhabited system." },
  t2p05: { name: "Error-Correcting Core",      flavor: "A stellar-scale nested computation / stellar shell component used by a civic / coherence society; survives by revelation, order, and shared signal to coordinate a star, heliosphere, or inhabited system." },
  t2p06: { name: "Orbital Biosphere Prism",    flavor: "A stellar-scale star-system ecology / interplanetary living infrastructure used by a golden canopy civilization: living memory organized into shelter/order to coordinate a star, heliosphere, or inhabited system." },
};

// Tier 3 ── added separately so the file stays scannable
Object.assign(CARD_LORE, {
  // ── Tier 3 ─ Flare ─────────────────────────────────────────────────────
  t3r01: { name: "Galactic Ignition Reliquary",            flavor: "A galactic-scale stellar ignition / starforge component used by an eclipse host civilization: concealed force revealed as weapon to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3r02: { name: "Spiral-Arm Extinction Furnace",          flavor: "A galactic-scale stellar ignition / starforge component used by a predatory mutation ecology: hidden life erupts and consumes to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3r03: { name: "Galactic Temporal Conflagration Engine", flavor: "A galactic-scale stellar ignition / starforge component used by a black furnace civilization: catastrophe engines hidden across time to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3r04: { name: "Seed-Galaxy Biosphere Crucible",         flavor: "A galactic-scale stellar ignition / starforge component used by a predatory mutation ecology: hidden life erupts and consumes to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  // ── Tier 3 ─ Continuum ─────────────────────────────────────────────────
  t3s01: { name: "Galactic Wormgate Spine",                flavor: "A galactic-scale transit / signal relay infrastructure used by an eternal standard civilization: energy, law, and memory across eras to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3s02: { name: "Spiral Recursion Engine",                flavor: "A galactic-scale stellar ignition / starforge component used by a black furnace civilization: catastrophe engines hidden across time to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3s03: { name: "Galactic Extinction Archive",            flavor: "A galactic-scale galactic archive / civilization memory substrate used by a phoenix biosphere: life burns, remembers, and regrows to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3s04: { name: "Galactic Temporal Crownwork",            flavor: "A galactic-scale galactic archive / civilization memory substrate used by an eternal standard civilization: energy, law, and memory across eras to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  // ── Tier 3 ─ Verdance ──────────────────────────────────────────────────
  t3e01: { name: "Worldroot Starweb",                      flavor: "A galactic-scale galactic ecology / distributed living infrastructure used by a golden canopy civilization: living memory organized into shelter/order to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3e02: { name: "Galactic Overgrowth",                    flavor: "A galactic-scale galactic biosphere-seeding catalyst used by a phoenix biosphere: life burns, remembers, and regrows to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3e03: { name: "Galactic Necrobiome",                    flavor: "A galactic-scale galactic biosphere-seeding catalyst used by a buried ancestral biosphere: hidden life preserves deep memory to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3e04: { name: "Biosphere Crownwork Network",            flavor: "A galactic-scale galactic biosphere-seeding catalyst used by a phoenix biosphere: life burns, remembers, and regrows to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  // ── Tier 3 ─ Abyss ─────────────────────────────────────────────────────
  t3o01: { name: "Worldroot Entropy Web",                  flavor: "A galactic-scale galactic concealment / entropy-governance system used by a buried ancestral biosphere: hidden life preserves deep memory to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3o02: { name: "Biosphere Collapse Network",             flavor: "A galactic-scale galactic biosphere-seeding catalyst used by a buried ancestral biosphere: hidden life preserves deep memory to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3o03: { name: "Ordered Silence Network",                flavor: "A galactic-scale galactic concealment / entropy-governance system used by an eclipse host civilization: concealed force revealed as weapon to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3o04: { name: "Galactic Void Crownwork",                flavor: "A galactic-scale galactic concealment / entropy-governance system used by a buried ancestral biosphere: hidden life preserves deep memory to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  // ── Tier 3 ─ Radiance ──────────────────────────────────────────────────
  t3p01: { name: "Galactic Void Lattice",                  flavor: "A galactic-scale galactic void-lane / dimensional-pressure infrastructure used by an eclipse host civilization: concealed force revealed as weapon to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3p02: { name: "Computronium Star-Cloud",                flavor: "A galactic-scale distributed star-shell computation network used by a solar bloom civilization: living expansion through radiant signal to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3p03: { name: "Matrioshka Swarm-Crown",                 flavor: "A galactic-scale distributed stellar-harvesting network used by a solar bloom civilization: living expansion through radiant signal to bind many star systems into one civilization-scale infrastructure." } as CardLore,
  t3p04: { name: "Galactic Coherence Crownwork",           flavor: "A galactic-scale galactic computation / ascension substrate used by a hidden sun civilization: forbidden truth preserved until the age can bear it to bind many star systems into one civilization-scale infrastructure." } as CardLore,
});

export function getCardLore(id: string): CardLore {
  return CARD_LORE[id] ?? { name: "Unnamed Artifact", flavor: "" };
}
