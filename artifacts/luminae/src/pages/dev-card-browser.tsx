import { useEffect, useState, useCallback } from 'react';
import { GEM_META, GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import cardTier1Bg from '@assets/generated_images/card_tier1.png';
import cardTier3Bg from '@assets/generated_images/card_tier3.png';

const CARD_ART_MODULES = import.meta.glob(
  '../assets/cards/*.png',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;
const CARD_ART: Record<string, string> = {};
for (const [path, url] of Object.entries(CARD_ART_MODULES)) {
  const id = path.split('/').pop()!.replace('.png', '');
  CARD_ART[id] = url;
}

const TIER_BACKDROPS: Record<number, string> = { 1: cardTier1Bg, 3: cardTier3Bg };
const GEM_CARD_GRADIENTS: Record<string, string> = {
  ruby:     'linear-gradient(175deg, #1a0404 0%, #3d0808 35%, #220505 70%, #100202 100%)',
  sapphire: 'linear-gradient(175deg, #020510 0%, #071840 35%, #040a28 70%, #020510 100%)',
  emerald:  'linear-gradient(175deg, #021005 0%, #063020 35%, #041a10 70%, #020c04 100%)',
  onyx:     'linear-gradient(175deg, #060606 0%, #181818 35%, #0e0e0e 70%, #050505 100%)',
  pearl:    'linear-gradient(175deg, #100c02 0%, #2a2008 35%, #1c1606 70%, #0c0a02 100%)',
  flux:     'linear-gradient(175deg, #08080f 0%, #141428 35%, #0e0e1e 70%, #08080f 100%)',
};

const TIER_LABELS: Record<number, string> = {
  1: 'Tier I — Planetary',
  2: 'Tier II — Stellar',
  3: 'Tier III — Galactic',
};

interface CardEntry {
  id: string;
  tier: 1 | 2 | 3;
  bonusColor: GemKey;
  lumens: number;
  cost: Record<GemKey, number>;
  name: string;
  practicalUse: string;
  lore: string;
}

function c(ruby: number, sapphire: number, emerald: number, onyx: number, pearl: number): Record<GemKey, number> {
  return { ruby, sapphire, emerald, onyx, pearl, flux: 0 };
}

const CATALOG: CardEntry[] = [
  // ── Tier 1 · Flare ──────────────────────────────────────────────────────────
  { id: "t1r01", tier: 1, bonusColor: "ruby", lumens: 0, cost: c(0,0,1,1,1), name: "Ignition Kernel",
    practicalUse: "Provides controlled energy, heat, or ignition support for Mantle-to-Orbit Foundry systems.",
    lore: "A dense ignition core that can start a city, a shipyard, or a rescue furnace without becoming a weapon first." },
  { id: "t1r02", tier: 1, bonusColor: "ruby", lumens: 0, cost: c(0,0,1,2,0), name: "Ashroot Bloom",
    practicalUse: "Enables damaged habitats or biospheres to recover in support of Planetary Cradle Engine projects.",
    lore: "A fire-adapted root organ that turns disaster ash into the first useful tissue of recovery." },
  { id: "t1r03", tier: 1, bonusColor: "ruby", lumens: 0, cost: c(0,1,1,0,1), name: "Chrono-Ember Core",
    practicalUse: "Provides controlled energy, heat, or ignition support for Mantle-to-Orbit Foundry systems.",
    lore: "A warm memory-core that records when a fire should return, not merely how hot it burned." },
  { id: "t1r04", tier: 1, bonusColor: "ruby", lumens: 0, cost: c(0,2,0,0,0), name: "Causal Spark Coil",
    practicalUse: "Governs dangerous decisions or sequences so Mantle-to-Orbit Foundry systems can operate safely.",
    lore: "A trigger coil that refuses to fire unless the next three consequences remain survivable." },
  { id: "t1r05", tier: 1, bonusColor: "ruby", lumens: 0, cost: c(0,0,0,2,2), name: "Voidflare Cask",
    practicalUse: "Provides controlled energy, heat, or ignition support for Worldshield Covenant systems.",
    lore: "A sealed cask that converts hidden pressure into one brief flare a city can survive." },
  { id: "t1r06", tier: 1, bonusColor: "ruby", lumens: 0, cost: c(0,2,1,0,0), name: "Photosynthetic Wick",
    practicalUse: "Provides controlled energy, heat, or ignition support for Planetary Cradle Engine systems.",
    lore: "A living wick that feeds on sunlight and releases heat slowly enough for a cold settlement to endure." },
  { id: "t1r07", tier: 1, bonusColor: "ruby", lumens: 0, cost: c(0,0,2,2,0), name: "Entropy Pyre Baffle",
    practicalUse: "Holds hazardous forces in usable form for Mantle-to-Orbit Foundry systems.",
    lore: "A heat baffle that teaches waste where to go before it teaches the city how to die." },
  { id: "t1r08", tier: 1, bonusColor: "ruby", lumens: 1, cost: c(0,0,0,0,4), name: "Oathfire Igniter",
    practicalUse: "Provides controlled energy, heat, or ignition support for Worldshield Covenant systems.",
    lore: "An igniter that only opens in the presence of witnesses, making fire a civic act instead of a private threat." },
  // ── Tier 1 · Continuum ──────────────────────────────────────────────────────
  { id: "t1s01", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(1,0,1,0,1), name: "Echo Splinter",
    practicalUse: "Reveals dangerous states early so Spiral-Arm Archive precursor systems can be corrected before failure.",
    lore: "A broken sliver of recorded cause, useful because it remembers the sound before the disaster." },
  { id: "t1s02", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(2,0,1,0,0), name: "Causal Ember Relay",
    practicalUse: "Functions as a specialized interface / protocol for Mantle-to-Orbit Foundry projects.",
    lore: "A relay that passes heat, signal, and consequence in the same controlled pulse." },
  { id: "t1s03", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(1,0,0,1,1), name: "Null-Loop Anchor",
    practicalUse: "Detects, hides, or stabilizes hazardous hidden conditions for Worldshield Covenant operations.",
    lore: "An anchor that ends a loop before a city mistakes repetition for immortality." },
  { id: "t1s04", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(1,0,0,0,2), name: "Time-Crystal Scaffold",
    practicalUse: "Manufactures or patterns specialized components needed by Ecumenopolis Lattice projects.",
    lore: "A scaffold grown from timing crystals, used wherever machines must agree on the same second." },
  { id: "t1s05", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(0,0,0,2,2), name: "Silent Recursion Rule",
    practicalUse: "Functions as a specialized protocol / archive for Matrioshka Mind precursor projects.",
    lore: "A recursion rule copied in silence because speaking it aloud changes the system it protects." },
  { id: "t1s06", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(1,0,2,0,0), name: "Living Chronicle",
    practicalUse: "Stores, indexes, or releases critical memory for Planetary Cradle Engine infrastructure.",
    lore: "A chronicle that grows new margins when the people it records learn to become someone else." },
  { id: "t1s07", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(2,0,0,2,0), name: "String-Scar Loom",
    practicalUse: "Manufactures or patterns specialized components needed by Mantle-to-Orbit Foundry projects.",
    lore: "A loom that turns flaws in exotic threads into repeatable manufacturing instructions." },
  { id: "t1s08", tier: 1, bonusColor: "sapphire", lumens: 1, cost: c(0,0,4,0,0), name: "Root Memory Valve",
    practicalUse: "Stores, indexes, or releases critical memory for Planetary Cradle Engine infrastructure.",
    lore: "A valve grown into old roots, opening only enough ancestral memory for the present to survive." },
  // ── Tier 1 · Verdance ───────────────────────────────────────────────────────
  { id: "t1e01", tier: 1, bonusColor: "emerald", lumens: 0, cost: c(1,1,0,0,1), name: "Replication Spore",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Planetary Cradle Engine projects.",
    lore: "A spore licensed for repair, not conquest; it copies only what the ecology can afford." },
  { id: "t1e02", tier: 1, bonusColor: "emerald", lumens: 0, cost: c(0,2,0,1,0), name: "Voidroot Tap",
    practicalUse: "Detects, hides, or stabilizes hazardous hidden conditions for Planetary Cradle Engine operations.",
    lore: "A root-tap that drinks from darkness without teaching the dark how to climb back up." },
  { id: "t1e03", tier: 1, bonusColor: "emerald", lumens: 0, cost: c(1,1,0,1,0), name: "Char Tendril",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Planetary Cradle Engine projects.",
    lore: "A blackened tendril that finds viable soil where ordinary roots only find a grave." },
  { id: "t1e04", tier: 1, bonusColor: "emerald", lumens: 0, cost: c(0,3,0,0,0), name: "Climate Seed Die",
    practicalUse: "Enables damaged habitats or biospheres to recover in support of Planetary Cradle Engine projects.",
    lore: "A seed-die that prints the first organisms of a climate repair sequence, not the whole world." },
  { id: "t1e05", tier: 1, bonusColor: "emerald", lumens: 0, cost: c(2,0,0,0,2), name: "Facetcell Shard",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Planetary Cradle Engine projects.",
    lore: "A shard of living crystal whose cells decide what to become by how light breaks through them." },
  { id: "t1e06", tier: 1, bonusColor: "emerald", lumens: 0, cost: c(0,1,0,1,2), name: "Decay Lattice",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Planetary Cradle Engine projects.",
    lore: "A living rule for decay, ensuring nothing dead becomes useless and nothing useful dies too soon." },
  { id: "t1e07", tier: 1, bonusColor: "emerald", lumens: 0, cost: c(0,0,0,2,1), name: "Lichen Vein",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Ecumenopolis Lattice projects.",
    lore: "A vein of engineered lichen that teaches stone infrastructure how to heal at the edges." },
  { id: "t1e08", tier: 1, bonusColor: "emerald", lumens: 1, cost: c(0,0,0,4,0), name: "Necrobloom Bed",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Planetary Cradle Engine projects.",
    lore: "A cultivation bed where the dead are not raised, but recruited into the next repair cycle." },
  // ── Tier 1 · Abyss ──────────────────────────────────────────────────────────
  { id: "t1o01", tier: 1, bonusColor: "onyx", lumens: 0, cost: c(0,1,1,0,1), name: "Entropy Veil",
    practicalUse: "Functions as a specialized defense / shielding for Worldshield Covenant projects.",
    lore: "A veil that hides the heat and wear of a failing shelter long enough for repair crews to arrive." },
  { id: "t1o02", tier: 1, bonusColor: "onyx", lumens: 0, cost: c(0,1,0,0,2), name: "Horizon Lantern",
    practicalUse: "Detects, hides, or stabilizes hazardous hidden conditions for Dark-Sector Observatory precursor operations.",
    lore: "A lantern tuned to edges, brightening near boundaries that should not yet be crossed." },
  { id: "t1o03", tier: 1, bonusColor: "onyx", lumens: 0, cost: c(1,0,1,0,1), name: "Ashen Hollow",
    practicalUse: "Holds hazardous forces in usable form for Worldshield Covenant systems.",
    lore: "A hollow vessel that preserves what the fire removed by remembering the shape of absence." },
  { id: "t1o04", tier: 1, bonusColor: "onyx", lumens: 0, cost: c(0,0,2,1,0), name: "Undergrowth Silencer",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Worldshield Covenant projects.",
    lore: "A living silencer that lets buried networks communicate beneath the notice of predators." },
  { id: "t1o05", tier: 1, bonusColor: "onyx", lumens: 0, cost: c(2,1,0,0,0), name: "Scorch-Erasure Seal",
    practicalUse: "Provides controlled energy, heat, or ignition support for Worldshield Covenant systems.",
    lore: "A seal applied after sanctioned fire, removing only traces that would endanger the innocent." },
  { id: "t1o06", tier: 1, bonusColor: "onyx", lumens: 0, cost: c(0,2,2,0,0), name: "Decay Network",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Planetary Cradle Engine projects.",
    lore: "A hidden network that routes decay toward need, not merely downward into rot." },
  { id: "t1o07", tier: 1, bonusColor: "onyx", lumens: 0, cost: c(1,0,0,1,2), name: "Absence Shard",
    practicalUse: "Reveals dangerous states early so Dark-Sector Observatory precursor systems can be corrected before failure.",
    lore: "A shard measured by what it refuses to reflect; surveyors use it to map invisible load-bearing voids." },
  { id: "t1o08", tier: 1, bonusColor: "onyx", lumens: 1, cost: c(0,4,0,0,0), name: "Temporal Erasure Seal",
    practicalUse: "Functions as a specialized protocol / archive for Causality Audit Court precursor projects.",
    lore: "A redaction seal that hides a dangerous hour without deleting the lesson it should have taught." },
  // ── Tier 1 · Radiance ───────────────────────────────────────────────────────
  { id: "t1p01", tier: 1, bonusColor: "pearl", lumens: 0, cost: c(1,1,0,1,0), name: "Correction Seed",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Planetary Cradle Engine projects.",
    lore: "A seed that corrects the pattern before repair becomes mutation and law becomes punishment." },
  { id: "t1p02", tier: 1, bonusColor: "pearl", lumens: 0, cost: c(0,1,0,2,0), name: "Still-Point Shard",
    practicalUse: "Functions as a specialized control instrument / stabilization for Worldshield Covenant projects.",
    lore: "A shard used to hold one room, one reactor, or one treaty still while the world argues around it." },
  { id: "t1p03", tier: 1, bonusColor: "pearl", lumens: 0, cost: c(1,0,1,1,0), name: "Prismatic Hollow",
    practicalUse: "Reveals dangerous states early so Worldshield Covenant systems can be corrected before failure.",
    lore: "A hollow prism that separates signal from glamour before either can become policy." },
  { id: "t1p04", tier: 1, bonusColor: "pearl", lumens: 0, cost: c(2,0,0,0,1), name: "Magnetic Bottle",
    practicalUse: "Holds hazardous forces in usable form for Starlift Foundry precursor systems.",
    lore: "A bottle made of discipline more than matter; it holds fire by persuading every field to agree." },
  { id: "t1p05", tier: 1, bonusColor: "pearl", lumens: 0, cost: c(0,2,0,0,2), name: "Recursive Lens",
    practicalUse: "Reveals dangerous states early so Causality Audit Court precursor systems can be corrected before failure.",
    lore: "A lens that examines its own assumptions before it is trusted to examine the world." },
  { id: "t1p06", tier: 1, bonusColor: "pearl", lumens: 0, cost: c(1,0,1,0,2), name: "Living Lattice Node",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Ecumenopolis Lattice projects.",
    lore: "A node that lets a living city coordinate repair without turning its citizens into machinery." },
  { id: "t1p07", tier: 1, bonusColor: "pearl", lumens: 0, cost: c(0,0,1,2,1), name: "Void Prism",
    practicalUse: "Detects, hides, or stabilizes hazardous hidden conditions for Dark-Sector Observatory precursor operations.",
    lore: "A prism that makes darkness legible without pretending darkness has become safe." },
  { id: "t1p08", tier: 1, bonusColor: "pearl", lumens: 1, cost: c(0,0,4,0,0), name: "Petrified Bloom",
    practicalUse: "Functions as a specialized archive / material for Planetary Cradle Engine projects.",
    lore: "A stone flower used as proof that a living pattern can survive long after its garden cannot." },

  // ── Tier 2 · Flare ──────────────────────────────────────────────────────────
  { id: "t2r01", tier: 2, bonusColor: "ruby", lumens: 1, cost: c(0,2,0,3,2), name: "Stellar Crucible",
    practicalUse: "Provides controlled energy, heat, or ignition support for Starlift Foundry systems.",
    lore: "A crucible small enough to stand beside, fed by equations only a star-system economy can afford." },
  { id: "t2r02", tier: 2, bonusColor: "ruby", lumens: 2, cost: c(0,1,4,2,0), name: "Biomass Ignition Index",
    practicalUse: "Provides controlled energy, heat, or ignition support for Heliosphere Weather Loom systems.",
    lore: "An index of ignition thresholds that lets habitats burn surplus biomass without burning their future." },
  { id: "t2r03", tier: 2, bonusColor: "ruby", lumens: 2, cost: c(3,0,0,0,3), name: "Starlift Nozzle",
    practicalUse: "Holds hazardous forces in usable form for Starlift Foundry systems.",
    lore: "A precision throat that turns star-plasma from apocalypse into supply chain." },
  { id: "t2r04", tier: 2, bonusColor: "ruby", lumens: 1, cost: c(2,0,2,0,2), name: "Photosynthetic Furnace Wick",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Heliosphere Weather Loom projects.",
    lore: "A living furnace wick that lets cold ark-habitats carry a remembered sun between worlds." },
  { id: "t2r05", tier: 2, bonusColor: "ruby", lumens: 2, cost: c(0,3,0,2,2), name: "Causality Furnace Valve",
    practicalUse: "Functions as a specialized control instrument / protocol for Causality Audit Court precursor projects.",
    lore: "A furnace valve that opens only when the cost of power has been named in advance." },
  { id: "t2r06", tier: 2, bonusColor: "ruby", lumens: 2, cost: c(0,0,0,5,0), name: "Entropy Sink Crucible",
    practicalUse: "Functions as a specialized power component / thermal control for Dyson Swarm projects.",
    lore: "A sink-crucible that turns the insult of waste heat into one more useful argument for survival." },
  // ── Tier 2 · Continuum ──────────────────────────────────────────────────────
  { id: "t2s01", tier: 2, bonusColor: "sapphire", lumens: 1, cost: c(2,0,3,0,2), name: "Interstice Gate Seed",
    practicalUse: "Supports safe movement, routing, or migration within Wormgate Spine precursor infrastructure.",
    lore: "A gate seed no larger than a hand, planted where routes may someday learn to open." },
  { id: "t2s02", tier: 2, bonusColor: "sapphire", lumens: 2, cost: c(4,0,0,2,1), name: "Storm-Memory Filament",
    practicalUse: "Stores, indexes, or releases critical memory for Heliosphere Weather Loom infrastructure.",
    lore: "This thread remembers every solar storm it has survived, then warns the worlds before the next one learns their names." },
  { id: "t2s03", tier: 2, bonusColor: "sapphire", lumens: 2, cost: c(0,3,0,0,3), name: "Simulation Loom",
    practicalUse: "Manufactures or patterns specialized components needed by Matrioshka Mind projects.",
    lore: "A loom that weaves possible years, then cuts the strands that demand too many graves." },
  { id: "t2s04", tier: 2, bonusColor: "sapphire", lumens: 1, cost: c(0,0,2,0,3), name: "Continuity Vessel",
    practicalUse: "Holds hazardous forces in usable form for Arkseed Migration Fleet systems.",
    lore: "A vessel that keeps a people continuous when distance tries to make them merely related." },
  { id: "t2s05", tier: 2, bonusColor: "sapphire", lumens: 2, cost: c(5,0,0,0,0), name: "Mnemosyne Star-Index",
    practicalUse: "Stores, indexes, or releases critical memory for Matrioshka Mind infrastructure.",
    lore: "An index that lets every world remember the same disaster without agreeing on the same myth." },
  { id: "t2s06", tier: 2, bonusColor: "sapphire", lumens: 2, cost: c(2,0,0,3,2), name: "Convergence Lens",
    practicalUse: "Reveals dangerous states early so Singularity Containment Mandala precursor systems can be corrected before failure.",
    lore: "A lens that shows when different categories are being forced to pretend they were always one." },
  // ── Tier 2 · Verdance ───────────────────────────────────────────────────────
  { id: "t2e01", tier: 2, bonusColor: "emerald", lumens: 1, cost: c(3,2,0,0,2), name: "Solar Immune Organ",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Heliosphere Weather Loom projects.",
    lore: "Grown inside orbital habitats, it teaches living tissue which starlight to welcome and which to refuse." },
  { id: "t2e02", tier: 2, bonusColor: "emerald", lumens: 2, cost: c(2,4,0,1,0), name: "Dormancy Clock Graft",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Arkseed Migration Fleet projects.",
    lore: "A graft that lets a habitat sleep for centuries without forgetting when to wake hungry." },
  { id: "t2e03", tier: 2, bonusColor: "emerald", lumens: 2, cost: c(0,0,3,3,0), name: "Abyssal Culture Flask",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Heliopause Bastion projects.",
    lore: "A sealed flask of life trained to grow where sunlight is a rumor and pressure is weather." },
  { id: "t2e04", tier: 2, bonusColor: "emerald", lumens: 1, cost: c(0,2,0,2,2), name: "Mycelial Relay Spindle",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Arkseed Migration Fleet projects.",
    lore: "A spindle of engineered mycelium that translates between habitat, ship, soil, and silence." },
  { id: "t2e05", tier: 2, bonusColor: "emerald", lumens: 2, cost: c(0,5,0,0,0), name: "Epoch Graft Ledger",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Arkseed Migration Fleet projects.",
    lore: "A living ledger that changes tissue when an age ends, so the body learns history before the mind does." },
  { id: "t2e06", tier: 2, bonusColor: "emerald", lumens: 2, cost: c(2,0,0,2,3), name: "Crystal Biome Seedplate",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Heliosphere Weather Loom projects.",
    lore: "A seedplate that grows transparent habitats where crystal structure and living metabolism negotiate." },
  // ── Tier 2 · Abyss ──────────────────────────────────────────────────────────
  { id: "t2o01", tier: 2, bonusColor: "onyx", lumens: 1, cost: c(0,2,2,0,3), name: "Horizon Extractor",
    practicalUse: "Provides controlled energy, heat, or ignition support for Dark-Sector Observatory systems.",
    lore: "An extractor that samples the edge of forbidden physics without inviting the edge inside." },
  { id: "t2o02", tier: 2, bonusColor: "onyx", lumens: 2, cost: c(1,0,2,0,4), name: "Radiant Erasure Casket",
    practicalUse: "Coordinates public trust, law, or multi-party agreement for Heliopause Bastion systems.",
    lore: "A casket for dangerous light, sealing revelations until public knowledge can survive them." },
  { id: "t2o03", tier: 2, bonusColor: "onyx", lumens: 2, cost: c(3,0,0,3,0), name: "Entropic Furnace Baffle",
    practicalUse: "Functions as a specialized thermal control / defense for Starlift Foundry projects.",
    lore: "A baffle that routes stellar waste into shadowed work instead of letting heat become confession." },
  { id: "t2o04", tier: 2, bonusColor: "onyx", lumens: 1, cost: c(2,0,3,0,2), name: "Extinction Forge Die",
    practicalUse: "Manufactures or patterns specialized components needed by Galactic Relic Forge precursor projects.",
    lore: "A die cast from failed worlds, used to make replacement parts for futures that nearly ended." },
  { id: "t2o05", tier: 2, bonusColor: "onyx", lumens: 2, cost: c(0,0,5,0,0), name: "Eventide Ecology Seal",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Heliosphere Weather Loom projects.",
    lore: "A seal that lets an ecosystem go dark gracefully instead of collapsing into hunger." },
  { id: "t2o06", tier: 2, bonusColor: "onyx", lumens: 2, cost: c(2,3,0,0,2), name: "Dimensional Shear Gauge",
    practicalUse: "Detects, hides, or stabilizes hazardous hidden conditions for Heliopause Bastion operations.",
    lore: "A gauge that measures when space is about to stop being infrastructure and start being injury." },
  // ── Tier 2 · Radiance ───────────────────────────────────────────────────────
  { id: "t2p01", tier: 2, bonusColor: "pearl", lumens: 1, cost: c(2,3,0,2,0), name: "Containment Lattice",
    practicalUse: "Holds hazardous forces in usable form for Starlift Foundry systems.",
    lore: "A containment lattice built to be inspected by citizens, not merely trusted by engineers." },
  { id: "t2p02", tier: 2, bonusColor: "pearl", lumens: 2, cost: c(0,2,1,4,0), name: "Null-Convergence Prism",
    practicalUse: "Reveals dangerous states early so Singularity Containment Mandala precursor systems can be corrected before failure.",
    lore: "A prism that brightens when too many meanings are being crushed into one convenient answer." },
  { id: "t2p03", tier: 2, bonusColor: "pearl", lumens: 2, cost: c(0,0,4,0,3), name: "Living Treaty Organ",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Heliosphere Weather Loom projects.",
    lore: "An organ grown to hold agreements between worlds whose bodies disagree about what comfort means." },
  { id: "t2p04", tier: 2, bonusColor: "pearl", lumens: 2, cost: c(0,0,0,3,4), name: "Heliostat Filament",
    practicalUse: "Functions as a specialized power component / signal object for Dyson Swarm projects.",
    lore: "A single filament from a light-steering civilization; in the right orbit, it can teach mirrors to cooperate." },
  { id: "t2p05", tier: 2, bonusColor: "pearl", lumens: 2, cost: c(3,1,3,0,0), name: "Error-Correcting Core",
    practicalUse: "Provides controlled energy, heat, or ignition support for Matrioshka Mind systems.",
    lore: "A core that spends more energy admitting mistakes than lesser machines spend pretending not to make them." },
  { id: "t2p06", tier: 2, bonusColor: "pearl", lumens: 2, cost: c(0,3,0,0,5), name: "Radiation Treaty Prism",
    practicalUse: "Reveals dangerous states early so Heliosphere Weather Loom systems can be corrected before failure.",
    lore: "A prism used to negotiate how much stellar danger each habitat agrees to bear for the others." },

  // ── Tier 3 · Flare ──────────────────────────────────────────────────────────
  { id: "t3r01", tier: 3, bonusColor: "ruby", lumens: 3, cost: c(3,3,5,3,0), name: "Relic Ignition Key",
    practicalUse: "Functions as a specialized power component / interface for Galactic Relic Forge projects.",
    lore: "A key that starts machines no single star system could afford to misunderstand." },
  { id: "t3r02", tier: 3, bonusColor: "ruby", lumens: 4, cost: c(0,0,7,3,3), name: "Extinction Furnace Veto",
    practicalUse: "Provides controlled energy, heat, or ignition support for Causality Audit Court systems.",
    lore: "A veto token used when a civilization proves it can build an extinction furnace and chooses not to open it." },
  { id: "t3r03", tier: 3, bonusColor: "ruby", lumens: 4, cost: c(6,0,0,0,6), name: "Temporal Burn Audit Lens",
    practicalUse: "Provides controlled energy, heat, or ignition support for Causality Audit Court systems.",
    lore: "A lens that traces which histories were burned as fuel before the winning timeline called itself natural." },
  { id: "t3r04", tier: 3, bonusColor: "ruby", lumens: 5, cost: c(0,0,0,0,7), name: "Star-River Propulsion Core",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Star-River Migration Lattice projects.",
    lore: "A propulsion core calibrated for living habitats, powerful enough to move homes without turning them into cargo." },
  // ── Tier 3 · Continuum ──────────────────────────────────────────────────────
  { id: "t3s01", tier: 3, bonusColor: "sapphire", lumens: 3, cost: c(3,0,3,3,3), name: "Voidline Compass",
    practicalUse: "Detects, hides, or stabilizes hazardous hidden conditions for Wormgate Spine operations.",
    lore: "It fits in one hand, but only a civilization with a galaxy of mistakes can read where it points." },
  { id: "t3s02", tier: 3, bonusColor: "sapphire", lumens: 4, cost: c(0,0,5,0,7), name: "Recursion Witness Key",
    practicalUse: "Governs dangerous decisions or sequences so Causality Audit Court systems can operate safely.",
    lore: "A key held by the witness, not the engineer, because recursion without testimony becomes tyranny." },
  { id: "t3s03", tier: 3, bonusColor: "sapphire", lumens: 4, cost: c(5,3,0,3,0), name: "Ancestor Signal Key",
    practicalUse: "Functions as a specialized archive / civic signal for Spiral-Arm Archive projects.",
    lore: "It unlocks messages sent by species that died before your star was named." },
  { id: "t3s04", tier: 3, bonusColor: "sapphire", lumens: 5, cost: c(0,0,0,7,0), name: "Chronology Governor",
    practicalUse: "Functions as a specialized control instrument / protocol for Causality Audit Court projects.",
    lore: "A governor for calendars that span species, relativistic routes, and wars over who gets to define before." },
  // ── Tier 3 · Verdance ───────────────────────────────────────────────────────
  { id: "t3e01", tier: 3, bonusColor: "emerald", lumens: 3, cost: c(0,3,3,0,5), name: "Cryptobiotic Root Key",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Spiral Ecology Mesh projects.",
    lore: "A root key that wakes only on worlds where the old biosphere left permission buried in the soil." },
  { id: "t3e02", tier: 3, bonusColor: "emerald", lumens: 4, cost: c(0,7,0,3,0), name: "Ecology Substrate Code",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Spiral Ecology Mesh projects.",
    lore: "A substrate code that lets unrelated biospheres share corridors without becoming one invasive species." },
  { id: "t3e03", tier: 3, bonusColor: "emerald", lumens: 4, cost: c(3,0,5,0,3), name: "Ancestral Immune Code",
    practicalUse: "Stores, indexes, or releases critical memory for Spiral Ecology Mesh infrastructure.",
    lore: "An immune code written by extinct ecologies to protect living worlds from repeating their last appetite." },
  { id: "t3e04", tier: 3, bonusColor: "emerald", lumens: 5, cost: c(0,0,7,0,0), name: "Plurality Charter Seed",
    practicalUse: "Provides engineered biological adaptation, repair, or growth for Galactic Concordance Engine projects.",
    lore: "A charter seed that grows different laws for different bodies without letting one species become the soil." },
  // ── Tier 3 · Abyss ──────────────────────────────────────────────────────────
  { id: "t3o01", tier: 3, bonusColor: "onyx", lumens: 3, cost: c(3,3,0,3,3), name: "Buried Biosphere Seal",
    practicalUse: "Detects, hides, or stabilizes hazardous hidden conditions for Spiral Ecology Mesh operations.",
    lore: "A seal that keeps a biosphere dormant through centuries of discovery by civilizations too loud to trust." },
  { id: "t3o02", tier: 3, bonusColor: "onyx", lumens: 4, cost: c(3,0,3,0,5), name: "Collapse Audit Mirror",
    practicalUse: "Reveals dangerous states early so Causality Audit Court systems can be corrected before failure.",
    lore: "A mirror that does not show ruin; it shows which safeguards were missing before anyone called ruin inevitable." },
  { id: "t3o03", tier: 3, bonusColor: "onyx", lumens: 4, cost: c(5,3,0,0,3), name: "Silence Archive Shard",
    practicalUse: "Detects, hides, or stabilizes hazardous hidden conditions for Dark-Sector Observatory operations.",
    lore: "A shard that stores signals by hiding them so well that only the intended future can find them." },
  { id: "t3o04", tier: 3, bonusColor: "onyx", lumens: 5, cost: c(0,7,0,0,0), name: "Dark-Sector Aperture",
    practicalUse: "Reveals dangerous states early so Dark-Sector Observatory systems can be corrected before failure.",
    lore: "An aperture into regions that maps cannot admit exist until a civilization is ready to be watched back." },
  // ── Tier 3 · Radiance ───────────────────────────────────────────────────────
  { id: "t3p01", tier: 3, bonusColor: "pearl", lumens: 3, cost: c(0,3,3,3,3), name: "Concordance Seal",
    practicalUse: "Coordinates public trust, law, or multi-party agreement for Galactic Concordance Engine systems.",
    lore: "No empire can counterfeit it; the seal only opens when rival species agree on what must not be owned." },
  { id: "t3p02", tier: 3, bonusColor: "pearl", lumens: 4, cost: c(0,0,3,7,0), name: "Public Maker-Seal",
    practicalUse: "Manufactures or patterns specialized components needed by Galactic Relic Forge projects.",
    lore: "A maker-seal proving that an impossible artifact was built under law, not merely under power." },
  { id: "t3p03", tier: 3, bonusColor: "pearl", lumens: 4, cost: c(3,3,0,3,3), name: "Thermal Logic Wafer",
    practicalUse: "Provides controlled energy, heat, or ignition support for Matrioshka Mind systems.",
    lore: "A wafer of logic designed around waste heat, because even thought must answer for what it burns." },
  { id: "t3p04", tier: 3, bonusColor: "pearl", lumens: 5, cost: c(0,0,0,0,9), name: "Species-Rights Witness Prism",
    practicalUse: "Reveals dangerous states early so Galactic Concordance Engine systems can be corrected before failure.",
    lore: "A witness prism that records not who rules, but which kinds of beings were allowed to remain themselves." },
];

const ALL_TIERS = [1, 2, 3] as const;
const ALL_AFFINITIES: GemKey[] = ['ruby', 'sapphire', 'emerald', 'onyx', 'pearl'];

function CostPip({ gemKey, count }: { gemKey: GemKey; count: number }) {
  const meta = GEM_META[gemKey];
  return (
    <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded px-1.5 py-0.5">
      <span className="text-xs font-bold text-white">{count}</span>
      <img src={meta.image} alt={meta.name} className="w-3.5 h-3.5 object-contain" />
    </div>
  );
}

export default function DevCardBrowser() {
  const [filterTier, setFilterTier] = useState<1 | 2 | 3 | null>(null);
  const [filterAffinity, setFilterAffinity] = useState<GemKey | null>(null);
  const [idx, setIdx] = useState(0);

  const filtered = CATALOG.filter(card => {
    if (filterTier !== null && card.tier !== filterTier) return false;
    if (filterAffinity !== null && card.bonusColor !== filterAffinity) return false;
    return true;
  });

  const clamp = useCallback((i: number) => Math.max(0, Math.min(filtered.length - 1, i)), [filtered.length]);

  const go = useCallback((delta: number) => {
    setIdx(prev => Math.max(0, Math.min(filtered.length - 1, prev + delta)));
  }, [filtered.length]);

  useEffect(() => { setIdx(0); }, [filterTier, filterAffinity]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   go(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [go]);

  const card = filtered[clamp(idx)];

  if (!card) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#060810' }}>
        <p style={{ color: '#6070a0', fontFamily: 'system-ui' }}>No cards match the current filter.</p>
      </div>
    );
  }

  const bonusMeta = GEM_META[card.bonusColor];
  const specificArt = CARD_ART[card.id];
  const artLayerStyle: React.CSSProperties = {
    backgroundImage: specificArt
      ? `url(${specificArt})`
      : card.tier === 2
        ? (GEM_CARD_GRADIENTS[card.bonusColor] ?? GEM_CARD_GRADIENTS.pearl)
        : `url(${TIER_BACKDROPS[card.tier] ?? cardTier1Bg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center"
      style={{ background: 'linear-gradient(135deg, #060810 0%, #0a0c1e 60%, #040608 100%)', padding: '24px 16px 40px' }}
    >
      {/* Dev badge */}
      <div className="w-full max-w-lg flex items-center justify-between mb-5">
        <span style={{ color: '#6070a0', fontSize: 11, letterSpacing: '0.1em', fontFamily: 'system-ui', textTransform: 'uppercase' }}>
          /dev/card-browser
        </span>
        <span style={{ background: '#1a0a30', color: '#a070f0', fontSize: 10, fontFamily: 'system-ui', letterSpacing: '0.12em', padding: '2px 8px', borderRadius: 4, border: '1px solid #4020a0' }}>
          DEV ONLY
        </span>
      </div>

      {/* Tier filter */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setFilterTier(null)}
          style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'system-ui',
            letterSpacing: '0.07em', cursor: 'pointer', border: 'none',
            background: filterTier === null ? '#3040a0' : '#10142a',
            color: filterTier === null ? '#ffffff' : '#6070a0',
          }}
        >All Tiers</button>
        {ALL_TIERS.map(t => (
          <button
            key={t}
            onClick={() => setFilterTier(filterTier === t ? null : t)}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'system-ui',
              letterSpacing: '0.07em', cursor: 'pointer', border: 'none',
              background: filterTier === t ? '#3040a0' : '#10142a',
              color: filterTier === t ? '#ffffff' : '#6070a0',
            }}
          >T{t}</button>
        ))}
      </div>

      {/* Affinity filter */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilterAffinity(null)}
          style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'system-ui',
            letterSpacing: '0.07em', cursor: 'pointer', border: 'none',
            background: filterAffinity === null ? '#2a2a40' : '#10142a',
            color: filterAffinity === null ? '#c0c0d0' : '#6070a0',
          }}
        >All</button>
        {ALL_AFFINITIES.map(key => {
          const m = GEM_META[key];
          const active = filterAffinity === key;
          return (
            <button
              key={key}
              onClick={() => setFilterAffinity(active ? null : key)}
              title={m.name}
              style={{
                width: 28, height: 28, borderRadius: '50%', padding: 3, cursor: 'pointer',
                border: active ? `2px solid ${m.hex}` : '2px solid transparent',
                background: active ? `${m.hex}22` : '#10142a',
              }}
            >
              <img src={m.image} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </button>
          );
        })}
      </div>

      {/* Card face — large review size */}
      <div style={{ position: 'relative', width: 224, height: 320, borderRadius: 16, overflow: 'hidden', boxShadow: `0 0 40px ${bonusMeta.glowHex}44, 0 8px 32px rgba(0,0,0,0.8)` }}>
        <div style={{ position: 'absolute', inset: 0, ...artLayerStyle }} />
        {!specificArt && (
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 40%, ${bonusMeta.glowHex}22 0%, transparent 70%)` }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.92) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 26, fontFamily: 'Georgia, serif', fontWeight: 700, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,1)' }}>
              {card.lumens > 0 ? card.lumens : ''}
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 0 2px rgba(0,0,0,0.6)', background: '#000' }}>
              <img src={bonusMeta.image} alt={bonusMeta.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,1)', lineHeight: 1.3 }}>
              {card.name}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {GEM_KEYS.map(k => {
                const n = card.cost[k];
                if (!n) return null;
                return <CostPip key={k} gemKey={k} count={n} />;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 24 }}>
        <button
          onClick={() => go(-1)}
          disabled={clamp(idx) === 0}
          style={{
            width: 40, height: 40, borderRadius: 8, border: 'none', cursor: clamp(idx) === 0 ? 'default' : 'pointer',
            background: clamp(idx) === 0 ? '#10142a' : '#1e2450',
            color: clamp(idx) === 0 ? '#303050' : '#a0b0ff', fontSize: 18,
          }}
        >‹</button>
        <span style={{ color: '#6070a0', fontFamily: 'system-ui', fontSize: 12, minWidth: 60, textAlign: 'center' }}>
          {clamp(idx) + 1} / {filtered.length}
        </span>
        <button
          onClick={() => go(1)}
          disabled={clamp(idx) >= filtered.length - 1}
          style={{
            width: 40, height: 40, borderRadius: 8, border: 'none', cursor: clamp(idx) >= filtered.length - 1 ? 'default' : 'pointer',
            background: clamp(idx) >= filtered.length - 1 ? '#10142a' : '#1e2450',
            color: clamp(idx) >= filtered.length - 1 ? '#303050' : '#a0b0ff', fontSize: 18,
          }}
        >›</button>
      </div>

      <p style={{ color: '#303858', fontFamily: 'system-ui', fontSize: 10, marginTop: 8, letterSpacing: '0.05em' }}>
        ← → arrow keys also navigate
      </p>

      {/* Card detail panel */}
      <div style={{
        marginTop: 24, width: '100%', maxWidth: 480,
        background: '#0c1020', borderRadius: 12, border: '1px solid #1e2440',
        padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4060c0', background: '#0a1030', padding: '2px 8px', borderRadius: 4 }}>
            {card.id}.png
          </span>
          <span style={{ fontFamily: 'system-ui', fontSize: 11, color: '#8090b0', background: '#10142a', padding: '2px 8px', borderRadius: 4 }}>
            {TIER_LABELS[card.tier]}
          </span>
          <span style={{ fontFamily: 'system-ui', fontSize: 11, color: bonusMeta.hex, background: '#10142a', padding: '2px 8px', borderRadius: 4 }}>
            {bonusMeta.name}
          </span>
          {card.lumens > 0 && (
            <span style={{ fontFamily: 'system-ui', fontSize: 11, color: '#ffd700', background: '#10142a', padding: '2px 8px', borderRadius: 4 }}>
              {card.lumens} Eminence
            </span>
          )}
        </div>

        <div style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: '#d0d8f0', fontWeight: 600 }}>
          {card.name}
        </div>

        <div style={{ fontFamily: 'system-ui', fontSize: 12, color: '#9090b0', lineHeight: 1.6 }}>
          {card.practicalUse}
        </div>

        <div style={{ fontFamily: 'system-ui', fontSize: 12, color: '#7080a0', lineHeight: 1.6, fontStyle: 'italic' }}>
          {card.lore}
        </div>

        <div style={{ borderTop: '1px solid #1a2040', paddingTop: 10 }}>
          <div style={{ fontFamily: 'system-ui', fontSize: 10, color: '#404870', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Cost
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GEM_KEYS.map(k => {
              const n = card.cost[k];
              if (!n) return null;
              const m = GEM_META[k];
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#10142a', borderRadius: 6, padding: '4px 8px' }}>
                  <img src={m.image} alt={m.name} style={{ width: 14, height: 14, objectFit: 'contain' }} />
                  <span style={{ color: m.hex, fontFamily: 'system-ui', fontSize: 12, fontWeight: 600 }}>{n}</span>
                  <span style={{ color: '#505878', fontFamily: 'system-ui', fontSize: 11 }}>{m.name}</span>
                </div>
              );
            })}
            {GEM_KEYS.every(k => !card.cost[k]) && (
              <span style={{ color: '#404870', fontFamily: 'system-ui', fontSize: 12 }}>Free</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
