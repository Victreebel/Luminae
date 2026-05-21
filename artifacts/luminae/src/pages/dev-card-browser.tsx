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
  lore: string;
}

function c(ruby: number, sapphire: number, emerald: number, onyx: number, pearl: number): Record<GemKey, number> {
  return { ruby, sapphire, emerald, onyx, pearl, flux: 0 };
}

const CATALOG: CardEntry[] = [
  // ── Tier 1 · Flare ──────────────────────────────────────────────────────────
  { id: "t1r01", tier: 1, bonusColor: "ruby", lumens: 0, cost: c(0,0,1,1,1), name: "Ignition Kernel",            lore: "A planetary-scale planetary ignition / orbital forge component used by a predatory mutation ecology: hidden life erupts and consumes to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1r02", tier: 1, bonusColor: "ruby", lumens: 0, cost: c(0,0,1,2,0), name: "Ashroot Bloom",              lore: "A planetary-scale planetary ignition / orbital forge component used by a predatory mutation ecology: hidden life erupts and consumes to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1r03", tier: 1, bonusColor: "ruby", lumens: 0, cost: c(0,1,1,0,1), name: "Chrono-Ember Core",          lore: "A planetary-scale planetary ignition / orbital forge component used by a phoenix biosphere: life burns, remembers, and regrows to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1r04", tier: 1, bonusColor: "ruby", lumens: 0, cost: c(0,2,0,0,0), name: "Causal Spark Coil",          lore: "A planetary-scale planetary ignition / orbital forge component used by a phoenix industry / recurring ignition culture to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1r05", tier: 1, bonusColor: "ruby", lumens: 0, cost: c(0,0,0,2,2), name: "Voidflare Containment Cell", lore: "A planetary-scale volatile-energy containment component used by an eclipse host civilization: concealed force revealed as weapon to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1r06", tier: 1, bonusColor: "ruby", lumens: 0, cost: c(0,2,1,0,0), name: "Photosynthetic Wick",        lore: "A planetary-scale worldforming / living infrastructure used by a phoenix biosphere: life burns, remembers, and regrows to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1r07", tier: 1, bonusColor: "ruby", lumens: 0, cost: c(0,0,2,2,0), name: "Entropy Pyre Matrix",        lore: "A planetary-scale planetary ignition / orbital forge component used by a predatory mutation ecology: hidden life erupts and consumes to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1r08", tier: 1, bonusColor: "ruby", lumens: 1, cost: c(0,0,0,0,4), name: "Radiant Ignition Core",      lore: "A planetary-scale planetary ignition / orbital forge component used by a solar forge / visible expansion culture to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  // ── Tier 1 · Continuum ──────────────────────────────────────────────────────
  { id: "t1s01", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(1,0,1,0,1), name: "Echo Splinter",              lore: "A planetary-scale memory, identity, or deep-time archive used by a phoenix biosphere: life burns, remembers, and regrows to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1s02", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(2,0,1,0,0), name: "Causal Ember Relay",         lore: "A planetary-scale prediction / causal-computation instrument used by a phoenix biosphere: life burns, remembers, and regrows to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1s03", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(1,0,0,1,1), name: "Null-Loop Anchor",           lore: "A planetary-scale prediction / causal-computation instrument used by a black furnace civilization: catastrophe engines hidden across time to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1s04", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(1,0,0,0,2), name: "Time-Crystal Scaffold",      lore: "A planetary-scale memory, identity, or deep-time archive used by an eternal standard civilization: energy, law, and memory across eras to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1s05", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(0,0,0,2,2), name: "Silent Recursion Engine",    lore: "A planetary-scale memory, identity, or deep-time archive used by a hidden sun civilization: forbidden truth preserved until the age can bear it to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1s06", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(1,0,2,0,0), name: "Living Chronicle",           lore: "A planetary-scale worldforming / living infrastructure used by a phoenix biosphere: life burns, remembers, and regrows to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1s07", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(2,0,0,2,0), name: "String-Scar Loom",           lore: "A planetary-scale dimensional pressure / collapse component used by a black furnace civilization: catastrophe engines hidden across time to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1s08", tier: 1, bonusColor: "sapphire", lumens: 1, cost: c(0,0,4,0,0), name: "Root Memory Vault",          lore: "A planetary-scale worldforming / living infrastructure used by an ancestral ecology / living archive culture to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  // ── Tier 1 · Verdance ───────────────────────────────────────────────────────
  { id: "t1e01", tier: 1, bonusColor: "emerald", lumens: 0, cost: c(1,1,0,0,1), name: "Replication Spore",          lore: "A planetary-scale generative ecology / biosphere catalyst used by a phoenix biosphere: life burns, remembers, and regrows to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1e02", tier: 1, bonusColor: "emerald", lumens: 0, cost: c(0,2,0,1,0), name: "Voidroot Tap",               lore: "A planetary-scale generative ecology / biosphere catalyst used by a buried ancestral biosphere: hidden life preserves deep memory to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1e03", tier: 1, bonusColor: "emerald", lumens: 0, cost: c(1,1,0,1,0), name: "Char Tendril",               lore: "A planetary-scale generative ecology / biosphere catalyst used by a phoenix biosphere: life burns, remembers, and regrows to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1e04", tier: 1, bonusColor: "emerald", lumens: 0, cost: c(0,3,0,0,0), name: "Worldforming Seed",          lore: "A planetary-scale generative ecology / biosphere catalyst used by an ancestral ecology / living archive culture to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1e05", tier: 1, bonusColor: "emerald", lumens: 0, cost: c(2,0,0,0,2), name: "Facetcell Shard",            lore: "A planetary-scale planetary solar-harvesting / orbital photosynthetic infrastructure used by a solar bloom civilization: living expansion through radiant signal to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1e06", tier: 1, bonusColor: "emerald", lumens: 0, cost: c(0,1,0,1,2), name: "Decay Lattice",              lore: "A planetary-scale generative ecology / biosphere catalyst used by a golden canopy civilization: living memory organized into shelter/order to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1e07", tier: 1, bonusColor: "emerald", lumens: 0, cost: c(0,0,0,2,1), name: "Lichen Vein",                lore: "A planetary-scale worldforming / living infrastructure used by a veiled garden civilization: hidden life using beauty, healing, and selective revelation to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1e08", tier: 1, bonusColor: "emerald", lumens: 1, cost: c(0,0,0,4,0), name: "Necrobloom Bed",             lore: "A planetary-scale generative ecology / biosphere catalyst used by a hidden biosphere / cryptobiotic ecology to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  // ── Tier 1 · Abyss ──────────────────────────────────────────────────────────
  { id: "t1o01", tier: 1, bonusColor: "onyx", lumens: 0, cost: c(0,1,1,0,1), name: "Entropy Veil",               lore: "A planetary-scale erasure, entropy, or concealment system used by a buried ancestral biosphere: hidden life preserves deep memory to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1o02", tier: 1, bonusColor: "onyx", lumens: 0, cost: c(0,1,0,0,2), name: "Hawking Lantern",            lore: "A planetary-scale horizon engineering / black-hole interface used by a hidden sun civilization: forbidden truth preserved until the age can bear it to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1o03", tier: 1, bonusColor: "onyx", lumens: 0, cost: c(1,0,1,0,1), name: "Ashen Hollow",               lore: "A planetary-scale erasure, entropy, or concealment system used by a predatory mutation ecology: hidden life erupts and consumes to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1o04", tier: 1, bonusColor: "onyx", lumens: 0, cost: c(0,0,2,1,0), name: "Undergrowth Silencer",       lore: "A planetary-scale generative ecology / biosphere catalyst used by a hidden biosphere / cryptobiotic ecology to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1o05", tier: 1, bonusColor: "onyx", lumens: 0, cost: c(2,1,0,0,0), name: "Scorch-Erasure Seal",        lore: "A planetary-scale dimensional pressure / collapse component used by a black furnace civilization: catastrophe engines hidden across time to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1o06", tier: 1, bonusColor: "onyx", lumens: 0, cost: c(0,2,2,0,0), name: "Decay Network",              lore: "A planetary-scale worldforming / living infrastructure used by a buried ancestral biosphere: hidden life preserves deep memory to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1o07", tier: 1, bonusColor: "onyx", lumens: 0, cost: c(1,0,0,1,2), name: "Absence Shard",              lore: "A planetary-scale dimensional pressure / collapse component used by an eclipse host civilization: concealed force revealed as weapon to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1o08", tier: 1, bonusColor: "onyx", lumens: 1, cost: c(0,4,0,0,0), name: "Temporal Erasure Seal",      lore: "A planetary-scale prediction / causal-computation instrument used by a black archive / sleeper civilization to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  // ── Tier 1 · Radiance ───────────────────────────────────────────────────────
  { id: "t1p01", tier: 1, bonusColor: "pearl", lumens: 0, cost: c(1,1,0,1,0), name: "Correction Seed",            lore: "A planetary-scale coherent computation / ascension substrate used by an eternal standard civilization: energy, law, and memory across eras to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1p02", tier: 1, bonusColor: "pearl", lumens: 0, cost: c(0,1,0,2,0), name: "Still-Point Shard",          lore: "A planetary-scale erasure, entropy, or concealment system used by a hidden sun civilization: forbidden truth preserved until the age can bear it to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1p03", tier: 1, bonusColor: "pearl", lumens: 0, cost: c(1,0,1,1,0), name: "Prismatic Hollow",           lore: "A planetary-scale dimensional pressure / collapse component used by a solar bloom civilization: living expansion through radiant signal to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1p04", tier: 1, bonusColor: "pearl", lumens: 0, cost: c(2,0,0,0,1), name: "Magnetic Bottle",            lore: "A planetary-scale planetary ignition / orbital forge component used by a solar forge / visible expansion culture to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1p05", tier: 1, bonusColor: "pearl", lumens: 0, cost: c(0,2,0,0,2), name: "Recursive Lens",             lore: "A planetary-scale prediction / causal-computation instrument used by a civic archive / lawful continuity culture to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1p06", tier: 1, bonusColor: "pearl", lumens: 0, cost: c(1,0,1,0,2), name: "Living Lattice Node",        lore: "A planetary-scale worldforming / living infrastructure used by a solar bloom civilization: living expansion through radiant signal to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1p07", tier: 1, bonusColor: "pearl", lumens: 0, cost: c(0,0,1,2,1), name: "Void Prism",                 lore: "A planetary-scale erasure, entropy, or concealment system used by a veiled garden civilization: hidden life using beauty, healing, and selective revelation to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },
  { id: "t1p08", tier: 1, bonusColor: "pearl", lumens: 1, cost: c(0,0,4,0,0), name: "Petrified Bloom",            lore: "A planetary-scale worldforming / living infrastructure used by a sacred garden / civic ecology to alter a world, moon, orbit, biosphere, or crust without yet commanding a star." },

  // ── Tier 2 · Flare ──────────────────────────────────────────────────────────
  { id: "t2r01", tier: 2, bonusColor: "ruby", lumens: 1, cost: c(0,2,0,3,2), name: "Stellar Crucible",           lore: "A stellar-scale stellar ignition / starforge component used by a black furnace civilization: catastrophe engines hidden across time to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2r02", tier: 2, bonusColor: "ruby", lumens: 2, cost: c(0,1,4,2,0), name: "Biomass Ignition Array",     lore: "A stellar-scale stellar ignition / starforge component used by a predatory mutation ecology: hidden life erupts and consumes to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2r03", tier: 2, bonusColor: "ruby", lumens: 2, cost: c(3,0,0,0,3), name: "Starlift Array",             lore: "A stellar-scale stellar harvesting / living solar infrastructure used by a solar forge / visible expansion culture to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2r04", tier: 2, bonusColor: "ruby", lumens: 1, cost: c(2,0,2,0,2), name: "Photosynthetic Furnace",     lore: "A stellar-scale star-system ecology / interplanetary living infrastructure used by a solar bloom civilization: living expansion through radiant signal to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2r05", tier: 2, bonusColor: "ruby", lumens: 2, cost: c(0,3,0,2,2), name: "Causality Furnace",          lore: "A stellar-scale stellar ignition / starforge component used by a black furnace civilization: catastrophe engines hidden across time to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2r06", tier: 2, bonusColor: "ruby", lumens: 2, cost: c(0,0,0,5,0), name: "Entropic Star Core",         lore: "A stellar-scale stellar ignition / starforge component used by a black furnace / hidden eruption culture to coordinate a star, heliosphere, or inhabited system." },
  // ── Tier 2 · Continuum ──────────────────────────────────────────────────────
  { id: "t2s01", tier: 2, bonusColor: "sapphire", lumens: 1, cost: c(2,0,3,0,2), name: "Interstice Gate",            lore: "A stellar-scale transit / signal relay infrastructure used by a phoenix biosphere: life burns, remembers, and regrows to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2s02", tier: 2, bonusColor: "sapphire", lumens: 2, cost: c(4,0,0,2,1), name: "Stellar Archive",            lore: "A stellar-scale stellar archive / system-scale memory infrastructure used by a black furnace civilization: catastrophe engines hidden across time to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2s03", tier: 2, bonusColor: "sapphire", lumens: 2, cost: c(0,3,0,0,3), name: "Simulation Loom",            lore: "A stellar-scale stellar prediction / heliospheric causal-computation instrument used by a civic archive / lawful continuity culture to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2s04", tier: 2, bonusColor: "sapphire", lumens: 1, cost: c(0,0,2,0,3), name: "Continuity Vessel",          lore: "A stellar-scale stellar archive / system-scale memory infrastructure used by a golden canopy civilization: living memory organized into shelter/order to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2s05", tier: 2, bonusColor: "sapphire", lumens: 2, cost: c(5,0,0,0,0), name: "Mnemosyne Star-Index",       lore: "A stellar-scale stellar archive / system-scale memory infrastructure used by a phoenix industry / recurring ignition culture to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2s06", tier: 2, bonusColor: "sapphire", lumens: 2, cost: c(2,0,0,3,2), name: "Singularity Lens",           lore: "A stellar-scale volatile-energy containment component used by a black furnace civilization: catastrophe engines hidden across time to coordinate a star, heliosphere, or inhabited system." },
  // ── Tier 2 · Verdance ───────────────────────────────────────────────────────
  { id: "t2e01", tier: 2, bonusColor: "emerald", lumens: 1, cost: c(3,2,0,0,2), name: "Starlift Worldroot",              lore: "A stellar-scale stellar ecology / system biosphere catalyst used by a phoenix biosphere: life burns, remembers, and regrows to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2e02", tier: 2, bonusColor: "emerald", lumens: 2, cost: c(2,4,0,1,0), name: "Circumstellar Temporal Grove",    lore: "A stellar-scale star-system ecology / interplanetary living infrastructure used by a phoenix biosphere: life burns, remembers, and regrows to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2e03", tier: 2, bonusColor: "emerald", lumens: 2, cost: c(0,0,3,3,0), name: "Abyssal Star-Garden",             lore: "A stellar-scale stellar ecology / system biosphere catalyst used by a hidden biosphere / cryptobiotic ecology to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2e04", tier: 2, bonusColor: "emerald", lumens: 1, cost: c(0,2,0,2,2), name: "Interplanetary Mycelial Relay",   lore: "A stellar-scale star-system ecology / interplanetary living infrastructure used by a buried ancestral biosphere: hidden life preserves deep memory to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2e05", tier: 2, bonusColor: "emerald", lumens: 2, cost: c(0,5,0,0,0), name: "Living Epoch Engine",             lore: "A stellar-scale star-system ecology / interplanetary living infrastructure used by an ancestral ecology / living archive culture to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2e06", tier: 2, bonusColor: "emerald", lumens: 2, cost: c(2,0,0,2,3), name: "Crystal Biome",                   lore: "A stellar-scale star-system ecology / interplanetary living infrastructure used by a solar bloom civilization: living expansion through radiant signal to coordinate a star, heliosphere, or inhabited system." },
  // ── Tier 2 · Abyss ──────────────────────────────────────────────────────────
  { id: "t2o01", tier: 2, bonusColor: "onyx", lumens: 1, cost: c(0,2,2,0,3), name: "Horizon Extractor",          lore: "A stellar-scale horizon engineering / black-hole interface used by a veiled garden civilization: hidden life using beauty, healing, and selective revelation to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2o02", tier: 2, bonusColor: "onyx", lumens: 2, cost: c(1,0,2,0,4), name: "Radiant Erasure Vault",      lore: "A stellar-scale stellar concealment / system entropy-control infrastructure used by a veiled garden civilization: hidden life using beauty, healing, and selective revelation to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2o03", tier: 2, bonusColor: "onyx", lumens: 2, cost: c(3,0,0,3,0), name: "Entropic Furnace",           lore: "A stellar-scale stellar concealment / system entropy-control infrastructure used by a black furnace / hidden eruption culture to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2o04", tier: 2, bonusColor: "onyx", lumens: 1, cost: c(2,0,3,0,2), name: "Extinction Forge",           lore: "A stellar-scale stellar dimensional-pressure / collapse component used by a predatory mutation ecology: hidden life erupts and consumes to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2o05", tier: 2, bonusColor: "onyx", lumens: 2, cost: c(0,0,5,0,0), name: "Eventide Ecology Engine",    lore: "A stellar-scale stellar ecology / system biosphere catalyst used by a hidden biosphere / cryptobiotic ecology to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2o06", tier: 2, bonusColor: "onyx", lumens: 2, cost: c(2,3,0,0,2), name: "Dimensional Shear",          lore: "A stellar-scale stellar dimensional-pressure / collapse component used by a black furnace civilization: catastrophe engines hidden across time to coordinate a star, heliosphere, or inhabited system." },
  // ── Tier 2 · Radiance ───────────────────────────────────────────────────────
  { id: "t2p01", tier: 2, bonusColor: "pearl", lumens: 1, cost: c(2,3,0,2,0), name: "Containment Lattice",        lore: "A stellar-scale stellar ignition / starforge component used by an eternal standard civilization: energy, law, and memory across eras to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2p02", tier: 2, bonusColor: "pearl", lumens: 2, cost: c(0,2,1,4,0), name: "Null-Convergence Prism",     lore: "A stellar-scale stellar dimensional-pressure / collapse component used by a hidden sun civilization: forbidden truth preserved until the age can bear it to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2p03", tier: 2, bonusColor: "pearl", lumens: 2, cost: c(0,0,4,0,3), name: "Heliospheric Living Lattice", lore: "A stellar-scale star-system ecology / interplanetary living infrastructure used by a sacred garden / civic ecology to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2p04", tier: 2, bonusColor: "pearl", lumens: 2, cost: c(0,0,0,3,4), name: "Heliostat Lattice",          lore: "A stellar-scale stellar harvesting / living solar infrastructure used by an eternal standard civilization: energy, law, and memory across eras to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2p05", tier: 2, bonusColor: "pearl", lumens: 2, cost: c(3,1,3,0,0), name: "Error-Correcting Core",      lore: "A stellar-scale nested computation / stellar shell component used by a civic / coherence society; survives by revelation, order, and shared signal to coordinate a star, heliosphere, or inhabited system." },
  { id: "t2p06", tier: 2, bonusColor: "pearl", lumens: 2, cost: c(0,3,0,0,5), name: "Orbital Biosphere Prism",    lore: "A stellar-scale star-system ecology / interplanetary living infrastructure used by a golden canopy civilization: living memory organized into shelter/order to coordinate a star, heliosphere, or inhabited system." },

  // ── Tier 3 · Flare ──────────────────────────────────────────────────────────
  { id: "t3r01", tier: 3, bonusColor: "ruby", lumens: 3, cost: c(3,3,5,3,0), name: "Galactic Ignition Reliquary",            lore: "A galactic-scale stellar ignition / starforge component used by an eclipse host civilization: concealed force revealed as weapon to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3r02", tier: 3, bonusColor: "ruby", lumens: 4, cost: c(0,0,7,3,3), name: "Spiral-Arm Extinction Furnace",          lore: "A galactic-scale stellar ignition / starforge component used by a predatory mutation ecology: hidden life erupts and consumes to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3r03", tier: 3, bonusColor: "ruby", lumens: 4, cost: c(6,0,0,0,6), name: "Galactic Temporal Conflagration Engine", lore: "A galactic-scale stellar ignition / starforge component used by a black furnace civilization: catastrophe engines hidden across time to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3r04", tier: 3, bonusColor: "ruby", lumens: 5, cost: c(0,0,0,0,7), name: "Seed-Galaxy Biosphere Crucible",         lore: "A galactic-scale stellar ignition / starforge component used by a predatory mutation ecology: hidden life erupts and consumes to bind many star systems into one civilization-scale infrastructure." },
  // ── Tier 3 · Continuum ──────────────────────────────────────────────────────
  { id: "t3s01", tier: 3, bonusColor: "sapphire", lumens: 3, cost: c(3,0,3,3,3), name: "Galactic Wormgate Spine",                lore: "A galactic-scale transit / signal relay infrastructure used by an eternal standard civilization: energy, law, and memory across eras to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3s02", tier: 3, bonusColor: "sapphire", lumens: 4, cost: c(0,0,5,0,7), name: "Spiral Recursion Engine",                lore: "A galactic-scale stellar ignition / starforge component used by a black furnace civilization: catastrophe engines hidden across time to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3s03", tier: 3, bonusColor: "sapphire", lumens: 4, cost: c(5,3,0,3,0), name: "Galactic Extinction Archive",            lore: "A galactic-scale galactic archive / civilization memory substrate used by a phoenix biosphere: life burns, remembers, and regrows to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3s04", tier: 3, bonusColor: "sapphire", lumens: 5, cost: c(0,0,0,7,0), name: "Galactic Temporal Crownwork",            lore: "A galactic-scale galactic archive / civilization memory substrate used by an eternal standard civilization: energy, law, and memory across eras to bind many star systems into one civilization-scale infrastructure." },
  // ── Tier 3 · Verdance ───────────────────────────────────────────────────────
  { id: "t3e01", tier: 3, bonusColor: "emerald", lumens: 3, cost: c(0,3,3,0,5), name: "Worldroot Starweb",                      lore: "A galactic-scale galactic ecology / distributed living infrastructure used by a golden canopy civilization: living memory organized into shelter/order to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3e02", tier: 3, bonusColor: "emerald", lumens: 4, cost: c(0,7,0,3,0), name: "Galactic Overgrowth",                    lore: "A galactic-scale galactic biosphere-seeding catalyst used by a phoenix biosphere: life burns, remembers, and regrows to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3e03", tier: 3, bonusColor: "emerald", lumens: 4, cost: c(3,0,5,0,3), name: "Galactic Necrobiome",                    lore: "A galactic-scale galactic biosphere-seeding catalyst used by a buried ancestral biosphere: hidden life preserves deep memory to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3e04", tier: 3, bonusColor: "emerald", lumens: 5, cost: c(0,0,7,0,0), name: "Biosphere Crownwork Network",            lore: "A galactic-scale galactic biosphere-seeding catalyst used by a phoenix biosphere: life burns, remembers, and regrows to bind many star systems into one civilization-scale infrastructure." },
  // ── Tier 3 · Abyss ──────────────────────────────────────────────────────────
  { id: "t3o01", tier: 3, bonusColor: "onyx", lumens: 3, cost: c(3,3,0,3,3), name: "Worldroot Entropy Web",                  lore: "A galactic-scale galactic concealment / entropy-governance system used by a buried ancestral biosphere: hidden life preserves deep memory to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3o02", tier: 3, bonusColor: "onyx", lumens: 4, cost: c(3,0,3,0,5), name: "Biosphere Collapse Network",             lore: "A galactic-scale galactic biosphere-seeding catalyst used by a buried ancestral biosphere: hidden life preserves deep memory to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3o03", tier: 3, bonusColor: "onyx", lumens: 4, cost: c(5,3,0,0,3), name: "Ordered Silence Network",                lore: "A galactic-scale galactic concealment / entropy-governance system used by an eclipse host civilization: concealed force revealed as weapon to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3o04", tier: 3, bonusColor: "onyx", lumens: 5, cost: c(0,7,0,0,0), name: "Galactic Void Crownwork",                lore: "A galactic-scale galactic concealment / entropy-governance system used by a buried ancestral biosphere: hidden life preserves deep memory to bind many star systems into one civilization-scale infrastructure." },
  // ── Tier 3 · Radiance ───────────────────────────────────────────────────────
  { id: "t3p01", tier: 3, bonusColor: "pearl", lumens: 3, cost: c(0,3,3,3,3), name: "Galactic Void Lattice",                  lore: "A galactic-scale galactic void-lane / dimensional-pressure infrastructure used by an eclipse host civilization: concealed force revealed as weapon to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3p02", tier: 3, bonusColor: "pearl", lumens: 4, cost: c(0,0,3,7,0), name: "Computronium Star-Cloud",                lore: "A galactic-scale distributed star-shell computation network used by a solar bloom civilization: living expansion through radiant signal to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3p03", tier: 3, bonusColor: "pearl", lumens: 4, cost: c(3,3,0,3,3), name: "Matrioshka Swarm-Crown",                 lore: "A galactic-scale distributed stellar-harvesting network used by a solar bloom civilization: living expansion through radiant signal to bind many star systems into one civilization-scale infrastructure." },
  { id: "t3p04", tier: 3, bonusColor: "pearl", lumens: 5, cost: c(0,0,0,0,9), name: "Galactic Coherence Crownwork",           lore: "A galactic-scale galactic computation / ascension substrate used by a hidden sun civilization: forbidden truth preserved until the age can bear it to bind many star systems into one civilization-scale infrastructure." },
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

  const clamp = (i: number) => Math.max(0, Math.min(filtered.length - 1, i));

  const go = useCallback((delta: number) => {
    setIdx(prev => clamp(prev + delta));
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
          {/* Top row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 26, fontFamily: 'Georgia, serif', fontWeight: 700, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,1)' }}>
              {card.lumens > 0 ? card.lumens : ''}
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 0 2px rgba(0,0,0,0.6)', background: '#000' }}>
              <img src={bonusMeta.image} alt={bonusMeta.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
          {/* Bottom block */}
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
        {/* ID + tier + affinity */}
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

        {/* Name */}
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: '#d0d8f0', fontWeight: 600 }}>
          {card.name}
        </div>

        {/* Lore */}
        <div style={{ fontFamily: 'system-ui', fontSize: 12, color: '#7080a0', lineHeight: 1.6, fontStyle: 'italic' }}>
          {card.lore}
        </div>

        {/* Cost breakdown */}
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
