// ─── Luminae Card Lore ──────────────────────────────────────────────────────
// v0.3 — Names, flavor, and metadata updated per Artifact Content Patch Plan.
// Patch scope: names · flavor · metadata only. No cost / tier / mechanic changes.
//
// Metadata fields (optional — non-breaking addition):
//   artifactFamily      — the technology/civilization family this artifact belongs to
//   civilizationLane    — the species/survival-strategy lane that produced it
//   artPromptSeed       — brief visual seed for future clean artwork generation
//
// Art rule: all future card images must be clean artwork only — no baked-in
// title, border, frame, cost icons, labels, or UI chrome. The app template
// owns all that. See LUMINAe_CARD_ASSET_AND_TEMPLATE_RULES_v0.1 for full spec.

export interface CardLore {
  name: string;
  flavor: string;
  artifactFamily?: string;
  civilizationLane?: string;
  artPromptSeed?: string;
}

const CARD_LORE: Record<string, CardLore> = {

  // ── Tier I · Flare (ruby) ─────────────────────────────────────────────────

  t1r01: {
    name: "Ignition Kernel",
    flavor: "A dormant ignition core scavenged from a world that ate itself to burn hotter.",
    artifactFamily: "stellar ignition / volatile-energy containment",
    civilizationLane: "predatory mutation ecology — hidden life erupts and consumes",
    artPromptSeed: "small reactor kernel trailing plasma filaments, scorched alloy casing, red-orange ignition glow, dark void background",
  },
  t1r02: {
    name: "Ashen Bloom",
    flavor: "Where the predator dies, its spores seed the next fire.",
    artifactFamily: "stellar ignition / generative ecology catalyst",
    civilizationLane: "predatory mutation ecology — hidden life erupts and consumes",
    artPromptSeed: "organic bloom structure made of compacted ash and ember coils, emerald spores leaking from a burning core, red-orange flame light",
  },
  t1r03: {
    name: "Temporal Ember",
    flavor: "Its heat signature matches a star that died three epochs ago.",
    artifactFamily: "stellar ignition / memory archive / causal instrument",
    civilizationLane: "phoenix biosphere — life burns, remembers, and regrows",
    artPromptSeed: "glowing ember suspended in layered temporal rings, cyan archive light in background, warm red-orange core surrounded by cool blue temporal halos",
  },
  t1r04: {
    name: "Causal Spark",
    flavor: "Every ignition cycle begins with the same ember, correctly timed.",
    artifactFamily: "stellar ignition / volatile-energy containment",
    civilizationLane: "phoenix industry — recurring ignition culture",
    artPromptSeed: "precise spark mechanism with recursive timing rings, red-orange plasma center, deep blue chronometric framing, engineered ignition tool aesthetic",
  },
  t1r05: {
    name: "Void Flare",
    flavor: "Compressed behind an event horizon until the moment the host chose to emerge.",
    artifactFamily: "volatile-energy containment / dimensional pressure component",
    civilizationLane: "eclipse host civilization — concealed force revealed as weapon",
    artPromptSeed: "intense flare weapon emerging from a collapsed void aperture, black-violet containment ring cracking open, white-hot plasma erupting outward",
  },
  t1r06: {
    name: "Photosynthetic Wick",
    flavor: "It draws light from any source — including sources already extinct.",
    artifactFamily: "worldforming / stellar harvesting living solar infrastructure",
    civilizationLane: "phoenix biosphere — life burns, remembers, and regrows",
    artPromptSeed: "organic wick structure with living green vascular tubes feeding a flame, emerald bioluminescence meeting red-orange combustion at its tip",
  },
  t1r07: {
    name: "Entropy Pyre",
    flavor: "The ecology eats order. The pyre is what remains.",
    artifactFamily: "stellar ignition / generative ecology catalyst",
    civilizationLane: "predatory mutation ecology — hidden life erupts and consumes",
    artPromptSeed: "smoldering pyre built from decayed organic mass, ash and living ember, emerald decay glow at base meeting red-orange flame at top",
  },
  t1r08: {
    name: "Radiant Ignition",
    flavor: "The forge culture announced its presence with a pulse visible across the inner spiral.",
    artifactFamily: "stellar ignition / volatile-energy containment",
    civilizationLane: "solar forge — visible expansion culture",
    artPromptSeed: "solar ignition device with clean solar-gold beacon ring and white-hot ignition point, ordered radial light architecture, civic monument scale",
  },

  // ── Tier I · Continuum (sapphire) ─────────────────────────────────────────

  t1s01: {
    name: "Echo Splinter",
    flavor: "A preserved moment from a civilization that burned — still cycling.",
    artifactFamily: "memory / identity / deep-time archive",
    civilizationLane: "phoenix biosphere — life burns, remembers, and regrows",
    artPromptSeed: "crystalline splinter containing a frozen cyclic loop, cyan temporal light, faint red-orange ember glow trapped inside, layered rings of recurrence",
  },
  t1s02: {
    name: "Causal Ember",
    flavor: "The ember remembers every fire it was part of.",
    artifactFamily: "prediction / causal-computation instrument / paradox component",
    civilizationLane: "phoenix biosphere — life burns, remembers, and regrows",
    artPromptSeed: "glowing ember encased in layered causal rings, deep blue-cyan temporal structure around a warm red-orange core, recursion geometry",
  },
  t1s03: {
    name: "Null Loop",
    flavor: "Catastrophe, counted, timed, restarted. The loop has no exit.",
    artifactFamily: "prediction / causal-computation / dimensional pressure",
    civilizationLane: "black furnace civilization — catastrophe engines hidden across time",
    artPromptSeed: "sealed loop device with no visible entry or exit, black-violet and deep blue surfaces, faint plasma trapped inside, catastrophe timer aesthetic",
  },
  t1s04: {
    name: "Time-Crystal Scaffold",
    flavor: "Built to outlast the laws used to build it.",
    artifactFamily: "memory / deep-time archive / causal instrument",
    civilizationLane: "eternal standard civilization — energy, law, and memory across eras",
    artPromptSeed: "crystalline scaffold structure with temporal lattice joints, deep blue-cyan material with solar-gold law-inscription lines, ordered and enduring",
  },
  t1s05: {
    name: "Silent Recursion",
    flavor: "The archive that answers no queries — and still expands.",
    artifactFamily: "memory / identity archive / erasure-concealment system",
    civilizationLane: "hidden sun civilization — forbidden truth preserved until the age can bear it",
    artPromptSeed: "sealed recursive archive device, dark exterior with no visible interface, cyan light leaking from internal recursion loops, black-violet depth shadows",
  },
  t1s06: {
    name: "Living Chronicle",
    flavor: "A living record that rewrites itself each time the fire passes.",
    artifactFamily: "worldforming / living infrastructure / memory archive",
    civilizationLane: "phoenix biosphere — life burns, remembers, and regrows",
    artPromptSeed: "organic chronicle tablet with living green vascular text channels, cyan temporal glow underneath living root-inscriptions, phoenix ecology aesthetic",
  },
  t1s07: {
    name: "String Scar",
    flavor: "The seam left when catastrophe intersected sequence.",
    artifactFamily: "dimensional pressure component / paradox violation component",
    civilizationLane: "black furnace civilization — catastrophe engines hidden across time",
    artPromptSeed: "a visible scar or seam in space-time architecture, deep blue sequence lines interrupted by red-orange scorching, raw catastrophe intersection",
  },
  t1s08: {
    name: "Root Memory",
    flavor: "Four hundred generations encoded in a root system nobody mapped.",
    artifactFamily: "worldforming / living infrastructure / memory archive",
    civilizationLane: "ancestral ecology — living archive culture",
    artPromptSeed: "ancient root structure with deep blue memory-encoded vascular channels, emerald bioluminescent depth, vast underground archive implied",
  },

  // ── Tier I · Verdance (emerald) ───────────────────────────────────────────

  t1e01: {
    name: "Replication Spore",
    flavor: "The spore arrives before the fire does.",
    artifactFamily: "generative ecology catalyst / distributed seeding vessel",
    civilizationLane: "phoenix biosphere — life burns, remembers, and regrows",
    artPromptSeed: "bioluminescent spore capsule trailing emerald and red-orange light threads, replication structures visible inside translucent shell",
  },
  t1e02: {
    name: "Void Root",
    flavor: "It grows toward the dark on purpose.",
    artifactFamily: "generative ecology catalyst / worldforming living infrastructure",
    civilizationLane: "buried ancestral biosphere — hidden life preserves deep memory",
    artPromptSeed: "root system growing into absolute darkness, emerald bioluminescence fading into black-violet void, deep subterranean setting",
  },
  t1e03: {
    name: "Char Tendril",
    flavor: "Designed to thrive in the cooling phase after combustion.",
    artifactFamily: "generative ecology catalyst",
    civilizationLane: "phoenix biosphere — life burns, remembers, and regrows",
    artPromptSeed: "charred tendril system re-growing through burned terrain, emerald new growth emerging from scorched red-orange ash substrate",
  },
  t1e04: {
    name: "Worldforming Seed",
    flavor: "Planted once, for any world that comes after.",
    artifactFamily: "generative ecology catalyst / worldforming living infrastructure",
    civilizationLane: "ancestral ecology — living archive culture",
    artPromptSeed: "single immense seed pod containing a miniature biosphere within, emerald bioluminescence through translucent seed shell, deep blue temporal depth",
  },
  t1e05: {
    name: "Facetcell Shard",
    flavor: "Each facet converts a different wavelength. Nothing is wasted.",
    artifactFamily: "stellar harvesting / living solar infrastructure / coherent computation",
    civilizationLane: "solar bloom civilization — living expansion through radiant signal",
    artPromptSeed: "faceted biological crystal shard with living cells inside each facet, solar-gold and emerald light conversion across multiple facet planes",
  },
  t1e06: {
    name: "Decay Lattice",
    flavor: "Life preserves its architecture through controlled decomposition.",
    artifactFamily: "generative ecology catalyst / erasure-entropy system",
    civilizationLane: "golden canopy civilization — living memory organized into shelter/order",
    artPromptSeed: "elegant decay lattice structure, emerald living tissue interleaved with decomposing dark material, golden canopy light filtering through, controlled entropy aesthetic",
  },
  t1e07: {
    name: "Lichen Vein",
    flavor: "Grows so slowly that the hostile environment never notices.",
    artifactFamily: "worldforming living infrastructure",
    civilizationLane: "veiled garden civilization — hidden life using beauty, healing, and selective revelation",
    artPromptSeed: "lichen vein network slowly spreading across dark stone surface, emerald-and-violet bioluminescent growth, near-invisible against the dark background",
  },
  t1e08: {
    name: "Necrobloom",
    flavor: "Dormant at 99.9% of its life cycle — and catastrophic in the remainder.",
    artifactFamily: "generative ecology catalyst / erasure-entropy system",
    civilizationLane: "hidden biosphere — cryptobiotic ecology",
    artPromptSeed: "dormant bloom organism with sealed black-violet exterior shell, emerald growth erupting violently through cracks, cryptobiotic explosion aesthetic",
  },

  // ── Tier I · Abyss (onyx) ────────────────────────────────────────────────

  t1o01: {
    name: "Entropy Veil",
    flavor: "Ancient life does not flee its end. It teaches the end to wait.",
    artifactFamily: "erasure / entropy / concealment system",
    civilizationLane: "buried ancestral biosphere — hidden life preserves deep memory",
    artPromptSeed: "thin veil of dark translucent material with ancient organic patterns, black-violet depths, faint emerald traces of living history behind the veil",
  },
  t1o02: {
    name: "Hawking Lantern",
    flavor: "The forbidden observatory that broadcasts nothing outward, and receives everything.",
    artifactFamily: "horizon engineering / black-hole interface / entropy conversion",
    civilizationLane: "hidden sun civilization — forbidden truth preserved until the age can bear it",
    artPromptSeed: "dark lantern device with a sealed one-way aperture, gravitational lensing effect around the lens, black-violet shell with hidden radiance inside",
  },
  t1o03: {
    name: "Ashen Hollow",
    flavor: "The hollow left after a predator bloom consumes its host ecology.",
    artifactFamily: "erasure / entropy / concealment system",
    civilizationLane: "predatory mutation ecology — hidden life erupts and consumes",
    artPromptSeed: "hollow shell of an organism that consumed itself, ash-dark exterior, red-orange ember traces inside, void where ecology used to be",
  },
  t1o04: {
    name: "Undergrowth Silence",
    flavor: "The undergrowth stopped signaling. The undergrowth is still there.",
    artifactFamily: "generative ecology catalyst / erasure-entropy system",
    civilizationLane: "hidden biosphere — cryptobiotic ecology",
    artPromptSeed: "dense undergrowth with all bioluminescence extinguished, black-violet depth, only the faint structural outlines of still-living root systems visible",
  },
  t1o05: {
    name: "Scorch Erasure",
    flavor: "The furnace civilization erases its own evidence. On schedule.",
    artifactFamily: "dimensional pressure component / erasure-entropy system",
    civilizationLane: "black furnace civilization — catastrophe engines hidden across time",
    artPromptSeed: "scorch mark device that leaves perfect erasure behind it, red-orange combustion tool with black-violet void trailing from its wake, evidence-removal aesthetic",
  },
  t1o06: {
    name: "Decay Network",
    flavor: "The network survives by decomposing everything, including itself.",
    artifactFamily: "worldforming living infrastructure / erasure-entropy system",
    civilizationLane: "buried ancestral biosphere — hidden life preserves deep memory",
    artPromptSeed: "sprawling decay network with dark nodes connected by decomposing organic channels, emerald traces of preserved memory inside black-violet decay material",
  },
  t1o07: {
    name: "Absence Shard",
    flavor: "Cut from the concealed weapon the eclipse culture built around a dying star.",
    artifactFamily: "dimensional pressure component",
    civilizationLane: "eclipse host civilization — concealed force revealed as weapon",
    artPromptSeed: "sharp shard of compressed void material, black-violet with no light emission, shaped like a fragment of a stellar-scale weapon, absence is visible",
  },
  t1o08: {
    name: "Temporal Erasure",
    flavor: "The sleeper archive removes records from the future it chooses not to allow.",
    artifactFamily: "prediction / causal-computation instrument / erasure-entropy system",
    civilizationLane: "black archive — sleeper civilization",
    artPromptSeed: "archival device with a visible erasure mechanism, deep blue temporal record being consumed by black-violet void from one end, sealed chamber aesthetic",
  },

  // ── Tier I · Radiance (pearl) ─────────────────────────────────────────────

  t1p01: {
    name: "Correction Seed",
    flavor: "Seeded into every age to realign drift before it compounds.",
    artifactFamily: "coherent computation / ascension substrate / order-stabilization system",
    civilizationLane: "eternal standard civilization — energy, law, and memory across eras",
    artPromptSeed: "small solar-gold seed with law inscription geometry on its surface, clean radiant light emanating outward, correction mechanism implied in its structure",
  },
  t1p02: {
    name: "Still-Point Shard",
    flavor: "The shard that marks the moment before forbidden knowledge is spoken.",
    artifactFamily: "erasure-entropy system / coherent computation substrate",
    civilizationLane: "hidden sun civilization — forbidden truth preserved until the age can bear it",
    artPromptSeed: "perfectly still shard suspended in frozen moment, solar-gold surface with black-violet sealed interior, temporal stillness made material",
  },
  t1p03: {
    name: "Prismatic Hollow",
    flavor: "The bloom civilization builds its signal stations hollow — to catch more light.",
    artifactFamily: "dimensional pressure component / order-stabilization system",
    civilizationLane: "solar bloom civilization — living expansion through radiant signal",
    artPromptSeed: "hollow prismatic signal station, solar-gold frame with an empty interior that catches and distributes light in all directions, bloom civilization architecture",
  },
  t1p04: {
    name: "Magnetic Bottle",
    flavor: "Containment architecture for energies the forge culture harvests from its own sun.",
    artifactFamily: "stellar ignition component / volatile-energy containment",
    civilizationLane: "solar forge — visible expansion culture",
    artPromptSeed: "magnetic containment vessel with visible plasma field lines, solar-gold containment rings around a compressed red-orange energy core",
  },
  t1p05: {
    name: "Recursive Lens",
    flavor: "Each query teaches the lens. The lens has not been wrong in three hundred years.",
    artifactFamily: "prediction / causal-computation instrument / observation optics",
    civilizationLane: "civic archive — lawful continuity culture",
    artPromptSeed: "layered lens system with recursive reflection between surfaces, deep blue-cyan data flowing through solar-gold optic frames, civic precision instrument",
  },
  t1p06: {
    name: "Living Lattice Node",
    flavor: "The lattice grows; the node coordinates the direction of growth.",
    artifactFamily: "worldforming living infrastructure / coherent computation substrate",
    civilizationLane: "solar bloom civilization — living expansion through radiant signal",
    artPromptSeed: "living node where organic emerald growth meets solar-gold signal architecture, coordination hub for a larger bloom lattice network",
  },
  t1p07: {
    name: "Void Prism",
    flavor: "Selects which truths the garden reveals, and which it keeps for itself.",
    artifactFamily: "erasure-entropy system / order-stabilization system",
    civilizationLane: "veiled garden civilization — hidden life using beauty, healing, and selective revelation",
    artPromptSeed: "prism that splits light selectively — some wavelengths pass through as solar-gold, others are absorbed into black-violet void interior, revelation filter aesthetic",
  },
  t1p08: {
    name: "Petrified Bloom",
    flavor: "The bloom calcified into civic record. It still provides light.",
    artifactFamily: "worldforming living infrastructure / coherent computation substrate",
    civilizationLane: "sacred garden — civic ecology",
    artPromptSeed: "petrified flower structure emitting steady solar-gold light from calcified petals, civic monument aesthetic, organic form preserved in luminous stone",
  },

  // ── Tier II · Flare (ruby) ────────────────────────────────────────────────

  t2r01: {
    name: "Stellar Crucible",
    flavor: "The furnace civilization builds its stars in concealed orbit.",
    artifactFamily: "stellar ignition / volatile-energy containment",
    civilizationLane: "black furnace civilization — catastrophe engines hidden across time",
    artPromptSeed: "massive crucible containing a star in early formation, black-violet concealment shell, red-orange stellar plasma visible through cracks, hidden stellar forge",
  },
  t2r02: {
    name: "Biomass Ignition Array",
    flavor: "The mutation ecology discovered that enough biomass can simply ignite.",
    artifactFamily: "stellar ignition / worldforming living infrastructure",
    civilizationLane: "predatory mutation ecology — hidden life erupts and consumes",
    artPromptSeed: "array of ignition chambers fed by organic biomass conduits, emerald living fuel meeting red-orange combustion, predator ecology industrial aesthetic",
  },
  t2r03: {
    name: "Starlift Array",
    flavor: "The forge culture began lifting matter from its own star the day its population hit critical mass.",
    artifactFamily: "stellar harvesting / stellar matter-control / star-lifting component",
    civilizationLane: "solar forge — visible expansion culture",
    artPromptSeed: "orbital array of matter-lifting conduits drawing stellar material upward from a sun's surface, solar-gold architecture, visible expansion infrastructure",
  },
  t2r04: {
    name: "Photosynthetic Furnace",
    flavor: "Converts sunlight into expansion. The bloom civilization runs twenty-four cycles per rotation.",
    artifactFamily: "worldforming living infrastructure / stellar harvesting",
    civilizationLane: "solar bloom civilization — living expansion through radiant signal",
    artPromptSeed: "living furnace with emerald biophotovoltaic surfaces feeding red-orange combustion core, solar bloom civilization industrial plant, radiant and organic",
  },
  t2r05: {
    name: "Causality Furnace",
    flavor: "Fires at moments that have not happened yet. The fuel is the future event itself.",
    artifactFamily: "stellar ignition / memory archive",
    civilizationLane: "black furnace civilization — catastrophe engines hidden across time",
    artPromptSeed: "furnace with chronometric targeting system, deep blue causal calculation mechanism connected to a red-orange ignition chamber, future-firing weapon aesthetic",
  },
  t2r06: {
    name: "Entropic Star",
    flavor: "A stellar mass compressed until combustion becomes inevitable — then hidden until needed.",
    artifactFamily: "stellar ignition / entropy conversion",
    civilizationLane: "black furnace — hidden eruption culture",
    artPromptSeed: "compressed stellar body sealed inside a black-violet containment shell, red-orange plasma barely contained, entropy-driven ignition device, imminent eruption",
  },

  // ── Tier II · Continuum (sapphire) ───────────────────────────────────────

  t2s01: {
    name: "Interstice Gate",
    flavor: "Built between collapse events — the gate survives because it was placed where nothing happens.",
    artifactFamily: "transit / signal relay infrastructure",
    civilizationLane: "phoenix biosphere — life burns, remembers, and regrows",
    artPromptSeed: "gate structure positioned in a gap between two collapsed regions, deep blue-cyan stable field, surrounded by red-orange collapse debris that never touches it",
  },
  t2s02: {
    name: "Stellar Archive",
    flavor: "The furnace civilization stores stellar mass in archival form: cold, dense, recoverable.",
    artifactFamily: "memory / deep-time archive / nested computation",
    civilizationLane: "black furnace civilization — catastrophe engines hidden across time",
    artPromptSeed: "stellar-scale archive structure, deep blue-cyan surface with compressed stellar mass locked inside black-violet sealed chambers, cold dense archive aesthetic",
  },
  t2s03: {
    name: "Simulation Loom",
    flavor: "Runs every possible future simultaneously. Selects only the ones the law allows.",
    artifactFamily: "prediction / causal-computation instrument / observation optics",
    civilizationLane: "civic archive — lawful continuity culture",
    artPromptSeed: "vast loom weaving probability threads, deep blue-cyan simulation channels, solar-gold law filters selecting permitted futures, elegant civic computation",
  },
  t2s04: {
    name: "Continuity Vessel",
    flavor: "The canopy civilization does not survive by strength. It survives by maintaining the vessel.",
    artifactFamily: "memory / deep-time archive / coherent computation",
    civilizationLane: "golden canopy civilization — living memory organized into shelter/order",
    artPromptSeed: "living vessel with emerald organic hull and deep blue-cyan temporal record interior, continuity device aesthetic, canopy civilization engineering",
  },
  t2s05: {
    name: "Stellar Mnemosyne",
    flavor: "Remembers every star it has ever consumed.",
    artifactFamily: "memory / deep-time archive / nested computation",
    civilizationLane: "phoenix industry — recurring ignition culture",
    artPromptSeed: "archive device containing stellar memory records, red-orange ignition residue layered inside deep blue-cyan memory rings, stellar consumption history",
  },
  t2s06: {
    name: "Singularity Lens",
    flavor: "Focuses every catastrophe into a single point of temporal leverage.",
    artifactFamily: "volatile-energy containment / dimensional pressure / horizon engineering",
    civilizationLane: "black furnace civilization — catastrophe engines hidden across time",
    artPromptSeed: "gravitational lens focusing multiple catastrophe events into a single convergence point, deep blue-cyan optical structure, black-violet singularity at focus",
  },

  // ── Tier II · Verdance (emerald) ──────────────────────────────────────────

  t2e01: {
    name: "Worldforming Root",
    flavor: "After the fire, the root arrives first and begins the next world.",
    artifactFamily: "generative ecology catalyst / worldforming living infrastructure",
    civilizationLane: "phoenix biosphere — life burns, remembers, and regrows",
    artPromptSeed: "massive root structure emerging from burned terrain, emerald bioluminescent leading edge pushing into scorched earth, worldforming scale and purpose",
  },
  t2e02: {
    name: "Temporal Grove",
    flavor: "The grove holds the memory of every version of the forest that came before.",
    artifactFamily: "worldforming living infrastructure / memory archive",
    civilizationLane: "phoenix biosphere — life burns, remembers, and regrows",
    artPromptSeed: "grove of trees with deep blue-cyan temporal memory rings visible in their trunks, emerald living canopy above, layered history growing upward",
  },
  t2e03: {
    name: "Abyssal Garden",
    flavor: "Grows in zero light, in crushing depth, in conditions that shouldn't support growth at all.",
    artifactFamily: "generative ecology catalyst / erasure-entropy system",
    civilizationLane: "hidden biosphere — cryptobiotic ecology",
    artPromptSeed: "garden thriving in absolute darkness at crushing depth, emerald bioluminescence is the only light source, black-violet surrounding void, impossible growth",
  },
  t2e04: {
    name: "Mycelial Relay",
    flavor: "The relay network predates every civilization that has grown above it.",
    artifactFamily: "worldforming living infrastructure / transit signal relay",
    civilizationLane: "buried ancestral biosphere — hidden life preserves deep memory",
    artPromptSeed: "vast mycelial network relay node deep underground, emerald bioluminescent fungal channels routing information, ancient infrastructure below a civilization",
  },
  t2e05: {
    name: "Living Epoch",
    flavor: "A single organism spanning a geological era.",
    artifactFamily: "worldforming living infrastructure / memory archive",
    civilizationLane: "ancestral ecology — living archive culture",
    artPromptSeed: "continent-spanning organism seen from above, emerald living tissue covering geological formations, deep blue-cyan temporal depth implied in layered growth",
  },
  t2e06: {
    name: "Crystal Biome",
    flavor: "The bloom civilization learned to grow its biosphere in structured crystalline matrices for light efficiency.",
    artifactFamily: "worldforming living infrastructure / coherent computation substrate",
    civilizationLane: "solar bloom civilization — living expansion through radiant signal",
    artPromptSeed: "crystalline biome structures with living emerald tissue growing inside solar-gold crystal matrices, bloom civilization biotech architecture",
  },

  // ── Tier II · Abyss (onyx) ───────────────────────────────────────────────

  t2o01: {
    name: "Horizon Extractor",
    flavor: "The garden civilization extracts what it needs from the event horizon of its neighbor's sun.",
    artifactFamily: "horizon engineering / entropy conversion",
    civilizationLane: "veiled garden civilization — hidden life using beauty, healing, and selective revelation",
    artPromptSeed: "extraction conduit reaching toward a stellar event horizon, black-violet gravitational lensing around the conduit tip, veiled garden engineering aesthetic",
  },
  t2o02: {
    name: "Radiant Erasure",
    flavor: "Selective revelation: the garden shows the light it chooses, and erases the evidence of what it chose.",
    artifactFamily: "erasure-entropy system / order-stabilization",
    civilizationLane: "veiled garden civilization — hidden life using beauty, healing, and selective revelation",
    artPromptSeed: "device that emits radiant solar-gold light while absorbing all surrounding evidence into a black-violet interior void, selective revelation and erasure",
  },
  t2o03: {
    name: "Entropic Furnace",
    flavor: "Converts entropy itself into fuel. Gets more efficient as conditions degrade.",
    artifactFamily: "erasure-entropy system / entropy conversion",
    civilizationLane: "black furnace — hidden eruption culture",
    artPromptSeed: "furnace that burns brighter as surrounding order decays, black-violet entropy channeled into red-orange combustion, degrading environment feeds the device",
  },
  t2o04: {
    name: "Extinction Forge",
    flavor: "Uses extinction events as feedstock. The more that dies, the hotter it burns.",
    artifactFamily: "dimensional pressure component / erasure-entropy system",
    civilizationLane: "predatory mutation ecology — hidden life erupts and consumes",
    artPromptSeed: "forge fed by extinction event material, emerald dead biomass feeding a red-orange furnace through black-violet processing channels, predator ecology industry",
  },
  t2o05: {
    name: "Ecological Eventide",
    flavor: "The ecology's scheduled dusk — protective stasis that lasts until the pressure passes.",
    artifactFamily: "generative ecology catalyst / erasure-entropy system",
    civilizationLane: "hidden biosphere — cryptobiotic ecology",
    artPromptSeed: "ecosystem entering scheduled stasis, emerald bioluminescence dimming to near-black, protective void shell forming around sleeping organisms, dusk aesthetic",
  },
  t2o06: {
    name: "Dimensional Shear",
    flavor: "The furnace culture eventually learned to cut through the dimensional membrane and harvest what was behind it.",
    artifactFamily: "dimensional pressure component / dimensional weapon",
    civilizationLane: "black furnace civilization — catastrophe engines hidden across time",
    artPromptSeed: "cutting device slicing through a dimensional membrane, deep blue-cyan layer behind the cut, black-violet void and red-orange energy at the shear edge",
  },

  // ── Tier II · Radiance (pearl) ────────────────────────────────────────────

  t2p01: {
    name: "Containment Lattice",
    flavor: "Every dangerous energy source in the eternal standard culture lives inside a containment lattice first.",
    artifactFamily: "stellar ignition / volatile-energy containment / dimensional pressure",
    civilizationLane: "eternal standard civilization — energy, law, and memory across eras",
    artPromptSeed: "solar-gold containment lattice holding volatile plasma energy in ordered stasis, civic law architecture containing power, clean geometric containment",
  },
  t2p02: {
    name: "Null Convergence",
    flavor: "The hidden sun culture discovered that nothing converges faster than forbidden knowledge.",
    artifactFamily: "dimensional pressure component / order-stabilization system",
    civilizationLane: "hidden sun civilization — forbidden truth preserved until the age can bear it",
    artPromptSeed: "convergence point device where forbidden knowledge gathers, solar-gold revelation surface meeting black-violet null interior, forbidden and luminous simultaneously",
  },
  t2p03: {
    name: "Living Lattice",
    flavor: "The civic ecology maintains its laws in living form — a lattice that grows into every new settlement.",
    artifactFamily: "worldforming living infrastructure / coherent computation substrate",
    civilizationLane: "sacred garden — civic ecology",
    artPromptSeed: "living lattice structure where emerald organic growth follows solar-gold law geometry, civic ecology infrastructure, ordered and vital simultaneously",
  },
  t2p04: {
    name: "Heliostat Lattice",
    flavor: "Coordinates solar energy across a civilization that measures continuity in stellar lifetimes.",
    artifactFamily: "stellar harvesting / nested computation",
    civilizationLane: "eternal standard civilization — energy, law, and memory across eras",
    artPromptSeed: "vast heliostat array coordinating solar energy across multiple orbital distances, solar-gold tracking architecture, eternal standard civilization infrastructure",
  },
  t2p05: {
    name: "Error-Correcting Core",
    flavor: "The coherence society never loses because it notices every deviation before it propagates.",
    artifactFamily: "nested computation / coherent computation / order-stabilization",
    civilizationLane: "civic — coherence society; survives by revelation, order, and shared signal",
    artPromptSeed: "perfect spherical core with error-detection geometry on surface, solar-gold correction signals radiating outward, all deviations visible and resolved",
  },
  t2p06: {
    name: "Biosphere Prism",
    flavor: "The canopy civilization refracts its biosphere through a prism — different outputs for different needs.",
    artifactFamily: "worldforming living infrastructure / coherent computation substrate",
    civilizationLane: "golden canopy civilization — living memory organized into shelter/order",
    artPromptSeed: "prism device splitting an emerald living biosphere into specific solar-gold output wavelengths, golden canopy civilization resource management technology",
  },

  // ── Tier III · Flare (ruby) ───────────────────────────────────────────────

  t3r01: {
    name: "Ignition Reliquary",
    flavor: "Preserved inside a dead star — the eclipse host civilization's final weapon, intact and pressurized.",
    artifactFamily: "stellar ignition / volatile-energy containment",
    civilizationLane: "eclipse host civilization — concealed force revealed as weapon",
    artPromptSeed: "reliquary vessel preserved inside a stellar remnant, black-violet dead star casing, white-hot ignition weapon perfectly intact inside, eclipse host apex weapon",
  },
  t3r02: {
    name: "Extinction Furnace",
    flavor: "The mutation ecology built a furnace large enough to process an entire extinct biosphere.",
    artifactFamily: "stellar ignition / entropy conversion",
    civilizationLane: "predatory mutation ecology — hidden life erupts and consumes",
    artPromptSeed: "continent-scale furnace consuming extinct biosphere material, emerald dead ecology fed into red-orange combustion at civilization scale, predator apex industry",
  },
  t3r03: {
    name: "Temporal Conflagration",
    flavor: "The device that contains a conflagration spanning multiple causal frames.",
    artifactFamily: "stellar ignition / paradox causality violation",
    civilizationLane: "black furnace civilization — catastrophe engines hidden across time",
    artPromptSeed: "conflagration device visible in multiple temporal frames simultaneously, red-orange fire overlaid with deep blue-cyan temporal layer, causality-spanning combustion",
  },
  t3r04: {
    name: "Biosphere Crucible",
    flavor: "A living crucible that converts biosphere-scale mass into directed ignition energy.",
    artifactFamily: "stellar ignition / generative ecology catalyst",
    civilizationLane: "predatory mutation ecology — hidden life erupts and consumes",
    artPromptSeed: "biosphere-scale living crucible, emerald organic mass feeding a red-orange ignition core at civilization scale, predator ecology apex technology",
  },

  // ── Tier III · Continuum (sapphire) ──────────────────────────────────────

  t3s01: {
    name: "Wormgate Spine",
    flavor: "The eternal standard civilization's transit backbone — built to outlast every civilization that uses it.",
    artifactFamily: "transit / signal relay infrastructure",
    civilizationLane: "eternal standard civilization — energy, law, and memory across eras",
    artPromptSeed: "vast wormhole gate spine structure, deep blue-cyan temporal architecture spanning stellar distances, solar-gold law inscription joints, eternal transit infrastructure",
  },
  t3s02: {
    name: "Recursive Conflagration",
    flavor: "The furnace that uses its own output as fuel. It has been running for eleven epochs.",
    artifactFamily: "stellar ignition / causal-computation instrument",
    civilizationLane: "black furnace civilization — catastrophe engines hidden across time",
    artPromptSeed: "self-consuming furnace where output loops back as fuel, red-orange combustion feeding deep blue-cyan causal recursion which feeds more combustion, epoch-spanning device",
  },
  t3s03: {
    name: "Extinction Archive",
    flavor: "Every mass extinction encoded into memory — so the next bloom knows what killed the last one.",
    artifactFamily: "memory / deep-time archive / erasure-entropy system",
    civilizationLane: "phoenix biosphere — life burns, remembers, and regrows",
    artPromptSeed: "vast archive containing extinction event records, deep blue-cyan memory chambers holding red-orange extinction residue, phoenix civilization apex knowledge structure",
  },
  t3s04: {
    name: "Epoch Reliquary",
    flavor: "An archive monument encoding the laws, sequences, and memory of a civilization across stellar lifetimes.",
    artifactFamily: "memory / deep-time archive / causal-computation instrument",
    civilizationLane: "eternal standard civilization — energy, law, and memory across eras",
    artPromptSeed: "monumental reliquary architecture spanning an orbital station, deep blue-cyan temporal strata with solar-gold law-inscription layers, apex archive infrastructure",
  },

  // ── Tier III · Verdance (emerald) ─────────────────────────────────────────

  t3e01: {
    name: "Worldroot Lattice",
    flavor: "The root system that underlies the canopy civilization's entire organized structure.",
    artifactFamily: "worldforming living infrastructure / transit relay",
    civilizationLane: "golden canopy civilization — living memory organized into shelter/order",
    artPromptSeed: "planetary-scale root lattice visible from orbit, emerald bioluminescent structure organizing an entire world below a golden canopy civilization",
  },
  t3e02: {
    name: "Stellar Overgrowth",
    flavor: "Life that grows fast enough to envelope a stellar body before the next extinction arrives.",
    artifactFamily: "generative ecology catalyst / stellar harvesting",
    civilizationLane: "phoenix biosphere — life burns, remembers, and regrows",
    artPromptSeed: "emerald living organism enveloping a stellar body, red-orange star light barely visible through enclosing green growth, phoenix biosphere apex expansion",
  },
  t3e03: {
    name: "Interstellar Necrobiome",
    flavor: "The buried biosphere that crosses stellar distances without ever becoming visible.",
    artifactFamily: "generative ecology catalyst / erasure-entropy system",
    civilizationLane: "buried ancestral biosphere — hidden life preserves deep memory",
    artPromptSeed: "necrobiome spore network threading silently through interstellar void, emerald bioluminescent traces in absolute black vacuum, invisible at distance, devastating at arrival",
  },
  t3e04: {
    name: "Biosphere Engine",
    flavor: "A civilization-scale living engine that burns, remembers, and regrows across geological epochs.",
    artifactFamily: "generative ecology catalyst / worldforming living infrastructure",
    civilizationLane: "phoenix biosphere — life burns, remembers, and regrows",
    artPromptSeed: "continent-scale living engine, emerald growth cycling through red-orange combustion and deep blue-cyan memory in continuous regenerating loop, apex phoenix infrastructure",
  },

  // ── Tier III · Abyss (onyx) ──────────────────────────────────────────────

  t3o01: {
    name: "Worldroot Entropy",
    flavor: "The entropy that preserves by decomposing — the buried biosphere's oldest protection system.",
    artifactFamily: "erasure-entropy system / entropy conversion",
    civilizationLane: "buried ancestral biosphere — hidden life preserves deep memory",
    artPromptSeed: "planetary-scale entropy system managing decomposition of surface layers to preserve buried life below, black-violet decay working to protect emerald depth",
  },
  t3o02: {
    name: "Biosphere Collapse",
    flavor: "A controlled collapse device. The buried ancestral culture collapses the surface biosphere to feed what grows below.",
    artifactFamily: "generative ecology catalyst / erasure-entropy system",
    civilizationLane: "buried ancestral biosphere — hidden life preserves deep memory",
    artPromptSeed: "surface biosphere deliberately collapsing inward, emerald living material falling into black-violet underground preservation vault, controlled sacrifice of the surface",
  },
  t3o03: {
    name: "Ordered Silence",
    flavor: "The eclipse host civilization does not need to speak. Its silence is already organized.",
    artifactFamily: "erasure-entropy system / order-stabilization",
    civilizationLane: "eclipse host civilization — concealed force revealed as weapon",
    artPromptSeed: "organized absence device — structured void with precise geometry, black-violet silence made architectural, the eclipse host civilization's coordination through non-presence",
  },
  t3o04: {
    name: "Void Reliquary",
    flavor: "Deep preservation vault encoding the memory of every concealed civilization that came before.",
    artifactFamily: "erasure-entropy system / entropy conversion",
    civilizationLane: "buried ancestral biosphere — hidden life preserves deep memory",
    artPromptSeed: "ancient reliquary sealed in void material, black-violet exterior with deep emerald memory traces visible through fractures, apex preservation vault infrastructure",
  },

  // ── Tier III · Radiance (pearl) ───────────────────────────────────────────

  t3p01: {
    name: "Void Lattice",
    flavor: "The lattice structure that the eclipse host civilization uses to make its void weapon legible — to itself only.",
    artifactFamily: "dimensional pressure component / order-stabilization",
    civilizationLane: "eclipse host civilization — concealed force revealed as weapon",
    artPromptSeed: "solar-gold lattice structure organizing a void weapon's power into legible form, black-violet containment made readable only from inside, eclipse host apex technology",
  },
  t3p02: {
    name: "Computronium Shell",
    flavor: "The bloom civilization's apex: a stellar body converted to computation substrate.",
    artifactFamily: "nested computation / coherent computation substrate",
    civilizationLane: "solar bloom civilization — living expansion through radiant signal",
    artPromptSeed: "stellar body converted entirely to computation substrate, solar-gold computation geometry covering every surface, emerald data-biology interface, bloom civilization apex",
  },
  t3p03: {
    name: "Matrioshka Shell",
    flavor: "Layer within layer, each one capturing the energy the inner shell emits.",
    artifactFamily: "stellar harvesting / nested computation",
    civilizationLane: "solar bloom civilization — living expansion through radiant signal",
    artPromptSeed: "nested concentric stellar shells, each solar-gold layer harvesting energy from the one inside, bloom civilization megastructure, infinite nested scale",
  },
  t3p04: {
    name: "Ascendancy Engine",
    flavor: "The hidden sun civilization's final instrument — coherence made total, silence made law.",
    artifactFamily: "coherent computation substrate / order-stabilization",
    civilizationLane: "hidden sun civilization — forbidden truth preserved until the age can bear it",
    artPromptSeed: "apex engine where solar-gold coherence architecture meets black-violet sealed silence, hidden sun civilization's final form, law and void unified in one instrument",
  },
};

export function getCardLore(id: string): CardLore {
  return CARD_LORE[id] ?? { name: "Unnamed Artifact", flavor: "" };
}
