// ─── Luminae Card Lore ──────────────────────────────────────────────────────
// Names + flavor text sourced from LUMINAe_ARTIFACT_REPLACEMENT_TABLE_v0.3_SCALE_AS_CAPABILITY.md
// Do NOT edit names or flavor here manually — update via the replacement table.

interface CardLore {
  name: string;
  flavor: string;
}

const CARD_LORE: Record<string, CardLore> = {
  // ── Tier 1 ─ Flare ───────────────────────────────────────────────────────
  t1r01: { name: "Ignition Kernel",        flavor: "A dense ignition core that can start a city, a shipyard, or a rescue furnace without becoming a weapon first." },
  t1r02: { name: "Ashroot Bloom",          flavor: "A fire-adapted root organ that turns disaster ash into the first useful tissue of recovery." },
  t1r03: { name: "Chrono-Ember Core",      flavor: "A warm memory-core that records when a fire should return, not merely how hot it burned." },
  t1r04: { name: "Causal Spark Coil",      flavor: "A trigger coil that refuses to fire unless the next three consequences remain survivable." },
  t1r05: { name: "Voidflare Cask",         flavor: "A sealed cask that converts hidden pressure into one brief flare a city can survive." },
  t1r06: { name: "Photosynthetic Wick",    flavor: "A living wick that feeds on sunlight and releases heat slowly enough for a cold settlement to endure." },
  t1r07: { name: "Entropy Pyre Baffle",    flavor: "A heat baffle that teaches waste where to go before it teaches the city how to die." },
  t1r08: { name: "Oathfire Igniter",       flavor: "An igniter that only opens in the presence of witnesses, making fire a civic act instead of a private threat." },

  // ── Tier 1 ─ Continuum ───────────────────────────────────────────────────
  t1s01: { name: "Echo Splinter",          flavor: "A broken sliver of recorded cause, useful because it remembers the sound before the disaster." },
  t1s02: { name: "Causal Ember Relay",     flavor: "A relay that passes heat, signal, and consequence in the same controlled pulse." },
  t1s03: { name: "Null-Loop Anchor",       flavor: "An anchor that ends a loop before a city mistakes repetition for immortality." },
  t1s04: { name: "Time-Crystal Scaffold",  flavor: "A scaffold grown from timing crystals, used wherever machines must agree on the same second." },
  t1s05: { name: "Silent Recursion Rule",  flavor: "A recursion rule copied in silence because speaking it aloud changes the system it protects." },
  t1s06: { name: "Living Chronicle",       flavor: "A chronicle that grows new margins when the people it records learn to become someone else." },
  t1s07: { name: "String-Scar Loom",       flavor: "A loom that turns flaws in exotic threads into repeatable manufacturing instructions." },
  t1s08: { name: "Root Memory Valve",      flavor: "A valve grown into old roots, opening only enough ancestral memory for the present to survive." },

  // ── Tier 1 ─ Verdance ────────────────────────────────────────────────────
  t1e01: { name: "Replication Spore",      flavor: "A spore licensed for repair, not conquest; it copies only what the ecology can afford." },
  t1e02: { name: "Voidroot Tap",           flavor: "A root-tap that drinks from darkness without teaching the dark how to climb back up." },
  t1e03: { name: "Char Tendril",           flavor: "A blackened tendril that finds viable soil where ordinary roots only find a grave." },
  t1e04: { name: "Climate Seed Die",       flavor: "A seed-die that prints the first organisms of a climate repair sequence, not the whole world." },
  t1e05: { name: "Facetcell Shard",        flavor: "A shard of living crystal whose cells decide what to become by how light breaks through them." },
  t1e06: { name: "Decay Lattice",          flavor: "A living rule for decay, ensuring nothing dead becomes useless and nothing useful dies too soon." },
  t1e07: { name: "Lichen Vein",            flavor: "A vein of engineered lichen that teaches stone infrastructure how to heal at the edges." },
  t1e08: { name: "Necrobloom Bed",         flavor: "A cultivation bed where the dead are not raised, but recruited into the next repair cycle." },

  // ── Tier 1 ─ Abyss ───────────────────────────────────────────────────────
  t1o01: { name: "Entropy Veil",           flavor: "A veil that hides the heat and wear of a failing shelter long enough for repair crews to arrive." },
  t1o02: { name: "Horizon Lantern",        flavor: "A lantern tuned to edges, brightening near boundaries that should not yet be crossed." },
  t1o03: { name: "Ashen Hollow",           flavor: "A hollow vessel that preserves what the fire removed by remembering the shape of absence." },
  t1o04: { name: "Undergrowth Silencer",   flavor: "A living silencer that lets buried networks communicate beneath the notice of predators." },
  t1o05: { name: "Scorch-Erasure Seal",    flavor: "A seal applied after sanctioned fire, removing only traces that would endanger the innocent." },
  t1o06: { name: "Decay Network",          flavor: "A hidden network that routes decay toward need, not merely downward into rot." },
  t1o07: { name: "Absence Shard",          flavor: "A shard measured by what it refuses to reflect; surveyors use it to map invisible load-bearing voids." },
  t1o08: { name: "Temporal Erasure Seal",  flavor: "A redaction seal that hides a dangerous hour without deleting the lesson it should have taught." },

  // ── Tier 1 ─ Radiance ────────────────────────────────────────────────────
  t1p01: { name: "Correction Seed",        flavor: "A seed that corrects the pattern before repair becomes mutation and law becomes punishment." },
  t1p02: { name: "Still-Point Shard",      flavor: "A shard used to hold one room, one reactor, or one treaty still while the world argues around it." },
  t1p03: { name: "Prismatic Hollow",       flavor: "A hollow prism that separates signal from glamour before either can become policy." },
  t1p04: { name: "Magnetic Bottle",        flavor: "A bottle made of discipline more than matter; it holds fire by persuading every field to agree." },
  t1p05: { name: "Recursive Lens",         flavor: "A lens that examines its own assumptions before it is trusted to examine the world." },
  t1p06: { name: "Living Lattice Node",    flavor: "A node that lets a living city coordinate repair without turning its citizens into machinery." },
  t1p07: { name: "Void Prism",             flavor: "A prism that makes darkness legible without pretending darkness has become safe." },
  t1p08: { name: "Petrified Bloom",        flavor: "A stone flower used as proof that a living pattern can survive long after its garden cannot." },

  // ── Tier 2 ─ Flare ───────────────────────────────────────────────────────
  t2r01: { name: "Stellar Crucible",             flavor: "A crucible small enough to stand beside, fed by equations only a star-system economy can afford." },
  t2r02: { name: "Biomass Ignition Index",       flavor: "An index of ignition thresholds that lets habitats burn surplus biomass without burning their future." },
  t2r03: { name: "Starlift Nozzle",              flavor: "A precision throat that turns star-plasma from apocalypse into supply chain." },
  t2r04: { name: "Photosynthetic Furnace Wick",  flavor: "A living furnace wick that lets cold ark-habitats carry a remembered sun between worlds." },
  t2r05: { name: "Causality Furnace Valve",      flavor: "A furnace valve that opens only when the cost of power has been named in advance." },
  t2r06: { name: "Entropy Sink Crucible",        flavor: "A sink-crucible that turns the insult of waste heat into one more useful argument for survival." },

  // ── Tier 2 ─ Continuum ───────────────────────────────────────────────────
  t2s01: { name: "Interstice Gate Seed",         flavor: "A gate seed no larger than a hand, planted where routes may someday learn to open." },
  t2s02: { name: "Storm-Memory Filament",        flavor: "This thread remembers every solar storm it has survived, then warns the worlds before the next one learns their names." },
  t2s03: { name: "Simulation Loom",              flavor: "A loom that weaves possible years, then cuts the strands that demand too many graves." },
  t2s04: { name: "Continuity Vessel",            flavor: "A vessel that keeps a people continuous when distance tries to make them merely related." },
  t2s05: { name: "Mnemosyne Star-Index",         flavor: "An index that lets every world remember the same disaster without agreeing on the same myth." },
  t2s06: { name: "Convergence Lens",             flavor: "A lens that shows when different categories are being forced to pretend they were always one." },

  // ── Tier 2 ─ Verdance ────────────────────────────────────────────────────
  t2e01: { name: "Solar Immune Organ",      flavor: "Grown inside orbital habitats, it teaches living tissue which starlight to welcome and which to refuse." },
  t2e02: { name: "Dormancy Clock Graft",    flavor: "A graft that lets a habitat sleep for centuries without forgetting when to wake hungry." },
  t2e03: { name: "Abyssal Culture Flask",   flavor: "A sealed flask of life trained to grow where sunlight is a rumor and pressure is weather." },
  t2e04: { name: "Mycelial Relay Spindle",  flavor: "A spindle of engineered mycelium that translates between habitat, ship, soil, and silence." },
  t2e05: { name: "Epoch Graft Ledger",      flavor: "A living ledger that changes tissue when an age ends, so the body learns history before the mind does." },
  t2e06: { name: "Crystal Biome Seedplate", flavor: "A seedplate that grows transparent habitats where crystal structure and living metabolism negotiate." },

  // ── Tier 2 ─ Abyss ───────────────────────────────────────────────────────
  t2o01: { name: "Horizon Extractor",         flavor: "An extractor that samples the edge of forbidden physics without inviting the edge inside." },
  t2o02: { name: "Radiant Erasure Casket",    flavor: "A casket for dangerous light, sealing revelations until public knowledge can survive them." },
  t2o03: { name: "Entropic Furnace Baffle",   flavor: "A baffle that routes stellar waste into shadowed work instead of letting heat become confession." },
  t2o04: { name: "Extinction Forge Die",      flavor: "A die cast from failed worlds, used to make replacement parts for futures that nearly ended." },
  t2o05: { name: "Eventide Ecology Seal",     flavor: "A seal that lets an ecosystem go dark gracefully instead of collapsing into hunger." },
  t2o06: { name: "Dimensional Shear Gauge",   flavor: "A gauge that measures when space is about to stop being infrastructure and start being injury." },

  // ── Tier 2 ─ Radiance ────────────────────────────────────────────────────
  t2p01: { name: "Containment Lattice",       flavor: "A containment lattice built to be inspected by citizens, not merely trusted by engineers." },
  t2p02: { name: "Null-Convergence Prism",    flavor: "A prism that brightens when too many meanings are being crushed into one convenient answer." },
  t2p03: { name: "Living Treaty Organ",       flavor: "An organ grown to hold agreements between worlds whose bodies disagree about what comfort means." },
  t2p04: { name: "Heliostat Filament",        flavor: "A single filament from a light-steering civilization; in the right orbit, it can teach mirrors to cooperate." },
  t2p05: { name: "Error-Correcting Core",     flavor: "A core that spends more energy admitting mistakes than lesser machines spend pretending not to make them." },
  t2p06: { name: "Radiation Treaty Prism",    flavor: "A prism used to negotiate how much stellar danger each habitat agrees to bear for the others." },
};

// Tier 3 ── added separately so the file stays scannable
Object.assign(CARD_LORE, {
  // ── Tier 3 ─ Flare ─────────────────────────────────────────────────────
  t3r01: { name: "Relic Ignition Key",           flavor: "A key that starts machines no single star system could afford to misunderstand." } as CardLore,
  t3r02: { name: "Extinction Furnace Veto",      flavor: "A veto token used when a civilization proves it can build an extinction furnace and chooses not to open it." } as CardLore,
  t3r03: { name: "Temporal Burn Audit Lens",     flavor: "A lens that traces which histories were burned as fuel before the winning timeline called itself natural." } as CardLore,
  t3r04: { name: "Star-River Propulsion Core",   flavor: "A propulsion core calibrated for living habitats, powerful enough to move homes without turning them into cargo." } as CardLore,
  // ── Tier 3 ─ Continuum ─────────────────────────────────────────────────
  t3s01: { name: "Voidline Compass",             flavor: "It fits in one hand, but only a civilization with a galaxy of mistakes can read where it points." } as CardLore,
  t3s02: { name: "Recursion Witness Key",        flavor: "A key held by the witness, not the engineer, because recursion without testimony becomes tyranny." } as CardLore,
  t3s03: { name: "Ancestor Signal Key",          flavor: "It unlocks messages sent by species that died before your star was named." } as CardLore,
  t3s04: { name: "Chronology Governor",          flavor: "A governor for calendars that span species, relativistic routes, and wars over who gets to define before." } as CardLore,
  // ── Tier 3 ─ Verdance ──────────────────────────────────────────────────
  t3e01: { name: "Cryptobiotic Root Key",        flavor: "A root key that wakes only on worlds where the old biosphere left permission buried in the soil." } as CardLore,
  t3e02: { name: "Ecology Substrate Code",       flavor: "A substrate code that lets unrelated biospheres share corridors without becoming one invasive species." } as CardLore,
  t3e03: { name: "Ancestral Immune Code",        flavor: "An immune code written by extinct ecologies to protect living worlds from repeating their last appetite." } as CardLore,
  t3e04: { name: "Plurality Charter Seed",       flavor: "A charter seed that grows different laws for different bodies without letting one species become the soil." } as CardLore,
  // ── Tier 3 ─ Abyss ─────────────────────────────────────────────────────
  t3o01: { name: "Buried Biosphere Seal",        flavor: "A seal that keeps a biosphere dormant through centuries of discovery by civilizations too loud to trust." } as CardLore,
  t3o02: { name: "Collapse Audit Mirror",        flavor: "A mirror that does not show ruin; it shows which safeguards were missing before anyone called ruin inevitable." } as CardLore,
  t3o03: { name: "Silence Archive Shard",        flavor: "A shard that stores signals by hiding them so well that only the intended future can find them." } as CardLore,
  t3o04: { name: "Dark-Sector Aperture",         flavor: "An aperture into regions that maps cannot admit exist until a civilization is ready to be watched back." } as CardLore,
  // ── Tier 3 ─ Radiance ──────────────────────────────────────────────────
  t3p01: { name: "Concordance Seal",             flavor: "No empire can counterfeit it; the seal only opens when rival species agree on what must not be owned." } as CardLore,
  t3p02: { name: "Public Maker-Seal",            flavor: "A maker-seal proving that an impossible artifact was built under law, not merely under power." } as CardLore,
  t3p03: { name: "Thermal Logic Wafer",          flavor: "A wafer of logic designed around waste heat, because even thought must answer for what it burns." } as CardLore,
  t3p04: { name: "Species-Rights Witness Prism", flavor: "A witness prism that records not who rules, but which kinds of beings were allowed to remain themselves." } as CardLore,
});

export function getCardLore(id: string): CardLore {
  return CARD_LORE[id] ?? { name: "Unnamed Artifact", flavor: "" };
}
