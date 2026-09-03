// ─── Luminae Card Lore ──────────────────────────────────────────────────────
// Tier I/II canon originates in LUMINAe_ARTIFACT_REPLACEMENT_TABLE_v0.4_UTILITY_FIRST_LORE.md.
// The hierarchy and Tier III canon are defined in LUMINAe_TECHNOLOGY_SYSTEM_v2.0.md.
// Keep source and design canon synchronized.
//
// artPrompt variety slots: see docs/card_art_variety_matrix.md
// Format: [Scale/Shot] — [Background] — [Subject] — [Palette] — [Exclusions]

import { ARTIFACT_CATALOG, ARTIFACT_DEFINITIONS, type ArtifactId } from "@workspace/game-types";

export interface CardLore {
  name: string;
  flavor: string;
  artifactForm?: string;
  blueprintRole?: string;
  blueprintFamilies?: string;
  civLane?: string;
  engineeringScale?: "Planetary" | "Star-system" | "Galactic";
  artPrompt?: string;
}

export const CARD_LORE: Record<string, CardLore> = {
  // ── Tier 1 ─ Flare ───────────────────────────────────────────────────────
  t1r01: { name: "Ignition Kernel",
    flavor: "A caged spark that lights furnaces and cities but refuses to spread. No one knows who first taught fire restraint.",
    artifactForm: "Power Component / Control Instrument", blueprintRole: "controlled ignition and thermal regulation",
    blueprintFamilies: "Mantle-to-Orbit Foundry; Planetary Cradle Engine", civLane: "planetary forge culture",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro cross-section view, abstract energy field background. Interior of a dense ignition core sliced open: layered rings of compressed red-orange plasma held in dark metal channels, glowing seams at the containment boundaries. Subject fills the frame — no exterior housing visible. Palette: deep red, molten orange, near-black metal. No planets, no text, no exterior structure." },

  t1r02: { name: "Ashroot Bloom",
    flavor: "Pale shoots rise from soil too burned for life. They always bend toward something still moving beneath the ash.",
    artifactForm: "Biotech Module / Catalyst", blueprintRole: "post-burn ecological recovery",
    blueprintFamilies: "Planetary Cradle Engine; Stellar Nursery Rite precursor", civLane: "phoenix biosphere",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro close-up, dark studio void background. A compact charred root organ — blackened surface with cracks revealing living ember veins beneath; two or three new pale-green shoots emerging from the ash-dusted base. Handheld scale, fills the frame. Palette: charcoal black, deep orange ember glow, pale green new growth. No planets, no text." },

  t1r03: { name: "Chrono-Ember Core",
    flavor: "It remembers when a fire must return, not how it burned. Some cores wake long after their makers are gone.",
    artifactForm: "Archive / Power Component", blueprintRole: "energy-memory synchronization",
    blueprintFamilies: "Mantle-to-Orbit Foundry; Spiral-Arm Archive precursor", civLane: "deep-time ignition culture",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop product-shot, 3/4 overhead angle, soft atmospheric warm glow background. A palm-sized cylindrical memory-core with concentric time-ring etchings on its surface; amber ember light glows from the core's center, casting faint ring shadows. No giant clock, no star, no planet. Palette: warm amber, burnt orange, aged bronze metal. No baked-in text, labels, or title anywhere on the image." },

  t1r04: { name: "Causal Spark Coil",
    flavor: "Before it fires, the coil tests what the spark will cause. Sometimes it refuses without explaining why.",
    artifactForm: "Control Instrument / Protocol Object", blueprintRole: "safe trigger sequencing",
    blueprintFamilies: "Mantle-to-Orbit Foundry; Causality Audit Court precursor", civLane: "experimental causal engineer civilization",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop product-shot, 3/4 overhead angle, dark studio void background. A compact precision coil — tight wound copper-dark metal loops, three red-orange spark arcs suspended mid-air between the coil terminals, held in a precision housing with micro-engraved trigger markings. Handheld scale. Palette: deep red spark, dark metal, faint amber. No planets, no text." },

  t1r05: { name: "Voidflare Cask",
    flavor: "A sealed burst of light kept for the moment every other flame fails. The cask grows warmer during eclipses.",
    artifactForm: "Containment / Power Component", blueprintRole: "volatile void-pressure ignition",
    blueprintFamilies: "Worldshield Covenant; Mantle-to-Orbit Foundry", civLane: "eclipse host civilization",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop eye-level view, dark studio void background. A sealed cylindrical cask — matte dark metal with a faint red-violet pressure glow seeping through stress fractures along the seam line; a small release valve on top is closed. Handheld scale, sitting on implied dark surface. Palette: near-black metal, red-violet pressure glow, subtle purple. No planets, no text." },

  t1r06: { name: "Photosynthetic Wick",
    flavor: "This living wick stores sunlight and releases it as gentle heat. Far from any star, it still leans toward dawn.",
    artifactForm: "Biotech Module / Power Component", blueprintRole: "biological energy conversion",
    blueprintFamilies: "Planetary Cradle Engine; Ecumenopolis Lattice", civLane: "solar-adapted biosphere civilization",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro close-up, soft atmospheric warm glow background. A single living wick — a slender organic stalk, surface covered in fine amber-gold capillary channels that carry stored solar heat from tip to base; the tip glows softly with golden light. Fills the frame, handheld scale. Palette: warm amber, pale green cellular tissue, soft gold glow. No giant sun array, no planets, no text." },

  t1r07: {
    name: "Entropy Pyre Baffle",
    flavor:
      "It channels dangerous waste heat into useful work. The soot patterns sometimes resemble maps of places that have not burned yet.",
    artifactForm: "Containment / Thermal Control",
    blueprintRole: "waste heat and decay routing",
    blueprintFamilies: "Mantle-to-Orbit Foundry; Worldshield Covenant",
    civLane: "entropy-tolerant industrial culture",
    engineeringScale: "Planetary",
    artPrompt:
      "Tabletop product-shot, 3/4 overhead angle, abstract energy distortion background — industrial heat shimmer. A modular heat-routing baffle in dark refractory metal: dense containment fins surround branching channels blackened with soot, with deep orange-red waste heat visible inside the channel voids. The inspectable module fills the frame. Palette: dark steel, soot grey, deep orange heat glow. No building facade, no planets, no text.",
  },

  t1r08: { name: "Oathfire Igniter",
    flavor: "The igniter opens only before witnesses, turning flame into a public promise. Unrecorded fires will not answer it.",
    artifactForm: "Civic Signal Object / Power Component", blueprintRole: "public sanctioned ignition",
    blueprintFamilies: "Worldshield Covenant; Ecumenopolis Lattice", civLane: "solar civic forge culture",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop worm's-eye view (looking slightly upward), soft atmospheric warm glow background. A ceremonial ignition tool held upright — ornate gold-and-dark-metal body with a witness-lock mechanism visible on the grip; a restrained red-gold flame emerges from the tip. Viewed from slightly below, giving the tool civic authority. Palette: gold, deep red flame, dark forged metal. No text, no giant structure." },

  // ── Tier 1 ─ Continuum ───────────────────────────────────────────────────
  t1s01: { name: "Echo Splinter",
    flavor: "A crystal splinter that hears a structure fail moments before it breaks. Each warning sounds faintly like a voice.",
    artifactForm: "Archive / Sensor", blueprintRole: "event echo capture",
    blueprintFamilies: "Spiral-Arm Archive precursor; Worldshield Covenant", civLane: "planetary memory culture",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro close-up, dark studio void background. A slim sapphire-blue crystal splinter — fractured end shows a layered internal structure; faint concentric echo rings radiate outward from the break point, visible as subtle refractive bands within the crystal. Fills the frame, finger-length scale. Palette: sapphire blue, pale ice refraction, near-black void. No planets, no text." },

  t1s02: {
    name: "Mantlelift Driver Coil",
    flavor:
      "This timed coil hurls sealed cargo from deep underground into orbit. A capsule that misses the rhythm is never found.",
    artifactForm: "Transit Component / Power Component",
    blueprintRole: "planetary-to-orbit mass acceleration",
    blueprintFamilies:
      "Mantle-to-Orbit Foundry; Arkseed Migration Fleet precursor",
    civLane: "orbital logistics civilization",
    engineeringScale: "Planetary",
    artPrompt:
      "Room-scale cross-section view, abstract acceleration-field background. One inspectable induction coil segment from a planetary mass-driver line: a thick sapphire-dark superconducting ring in a reinforced housing, with a sealed ore capsule centered in its open bore and blue-white timing fields stepping forward through the channel. Palette: deep sapphire, dark structural metal, controlled blue-white field light. No complete launch tower, no planet-wide rail, no text.",
  },

  t1s03: { name: "Null-Loop Anchor",
    flavor: "It stops machines trapped in endless repetition. Afterward, the anchor keeps counting cycles that never happened.",
    artifactForm: "Control Instrument / Stabilization", blueprintRole: "recursion boundary control",
    blueprintFamilies: "Worldshield Covenant; Causality Audit Court precursor", civLane: "recursion-safety civilization",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop eye-level view, abstract energy field background with faint recursive interference pattern. A compact anchor ring — dark blue-black metal forged in a closed ring; the inner surface is etched with recursive boundary markings that glow faintly blue where the loop-end sequence is engaged. Handheld scale. Palette: deep blue, near-black metal, faint recursion-glow lines. No planets, no readable text on the anchor." },

  t1s04: {
    name: "Time-Crystal Scaffold",
    flavor:
      "A crystal frame that makes distant machines share the same second. Watches placed near it begin agreeing too well.",
    artifactForm: "Material / Fabrication Tool",
    blueprintRole: "precision timing substrate",
    blueprintFamilies: "Ecumenopolis Lattice; Matrioshka Mind precursor",
    civLane: "timekeeping material culture",
    engineeringScale: "Planetary",
    artPrompt:
      "Tabletop product-shot, 3/4 overhead angle, soft atmospheric cool glow background. A forearm-sized branching scaffold grown from blue-white timing crystal, held in a dark precision frame; fine synchronization pulses move between its crystal nodes. The complete inspectable substrate fills the frame. Palette: ice blue, pale crystal white, dark frame, cool atmospheric glow. No warehouse, no building, no planets, no text.",
  },

  t1s05: { name: "Silent Recursion Rule",
    flavor: "A safety rule designed to work only while unspoken. Reading it aloud changes the final line.",
    artifactForm: "Protocol / Archive", blueprintRole: "quiet error correction",
    blueprintFamilies: "Matrioshka Mind precursor; Worldshield Covenant", civLane: "quiet planner civilization",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro close-up, mineral/rock surface background — dark polished stone. A small etched protocol token or wafer — deep blue-black material with concentric recursion geometry incised on its face; the etchings glow faintly blue, catching light at their edges. Coin-sized scale. Palette: deep blue, near-black, faint cool recursion glow. No readable text, no letters or numerals anywhere on the token surface." },

  t1s06: { name: "Living Chronicle",
    flavor: "This living record grows new pages as its people change. The oldest margins contain handwriting no one remembers adding.",
    artifactForm: "Archive / Biotech Module", blueprintRole: "adaptive civic memory",
    blueprintFamilies: "Planetary Cradle Engine; Ecumenopolis Lattice", civLane: "biological archive civilization",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop eye-level view, dark studio void background. A compact organic memory organ — resembles a thick living book whose cover is grown tissue rather than leather; blue-green veins run through the surface, pulsing faintly with stored memory light; new pale margin-tissue is budding at the edges. Handheld scale. Palette: blue-green veins, pale organic tissue, warm glow interior. No letters, no text on the surface." },

  t1s07: { name: "String-Scar Loom",
    flavor: "The loom turns flaws in impossible threads into exact building instructions. Its finest pattern came from a thread that broke itself.",
    artifactForm: "Fabrication Tool / Material", blueprintRole: "defect-pattern weaving",
    blueprintFamilies: "Mantle-to-Orbit Foundry; Galactic Relic Forge precursor", civLane: "defect-engineer culture",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop product-shot, 3/4 overhead angle, dark studio void background. A small precision loom — dark metal frame with luminous sapphire-blue tension threads strung across it; the threads glow where deliberate defect-nodes are locked in place as encoded manufacturing instructions. Handheld scale, sits on a dark surface. Palette: deep blue luminous threads, dark metal frame, cool sapphire light. No planets, no text." },

  t1s08: { name: "Root Memory Valve",
    flavor: "A valve releases ancestral memories in survivable doses. What it keeps buried presses back against the roots.",
    artifactForm: "Archive / Biotech Module / Control Instrument", blueprintRole: "selective memory release",
    blueprintFamilies: "Planetary Cradle Engine; Spiral Ecology Mesh precursor", civLane: "ancestral biosphere civilization",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro cross-section view, mineral/rock surface background — dark ancient wood-grain soil. Interior of a root-valve sliced open: the valve mechanism is grown into the root tissue, blue-green memory glow visible in the chambers that control what ancestral signals are released. Fills the frame. Palette: dark root tissue, blue-green memory light, soil texture. No giant forest, no planets, no text." },

  // ── Tier 1 ─ Verdance ────────────────────────────────────────────────────
  t1e01: { name: "Replication Spore",
    flavor: "A spore bred to repair damaged land without taking it over. It stops growing at borders no instrument can detect.",
    artifactForm: "Biotech Module / Fabrication Tool", blueprintRole: "controlled replication",
    blueprintFamilies: "Planetary Cradle Engine; Spiral Ecology Mesh precursor", civLane: "adaptive biosphere civilization",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro close-up, mineral/rock surface background — mossy dark stone. A single engineered spore pod resting on the stone — ovoid, translucent green-white casing with detailed cellular structure visible inside; hairlike anchor filaments extend from the base. Grain-of-rice scale. Palette: pale green, translucent cellular white, dark stone surface. No planets, no cosmic scene, no text." },

  t1e02: { name: "Voidroot Tap",
    flavor: "This root draws food from places light cannot reach. Nothing planted above it casts quite the right shadow.",
    artifactForm: "Biotech Module / Interface", blueprintRole: "nutrient extraction from hidden reservoirs",
    blueprintFamilies: "Planetary Cradle Engine; Dark-Sector Observatory precursor", civLane: "subterranean adaptive life",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop eye-level view, mineral/rock surface background — black soil and void-seam crack. A root-tap artifact pressing into the seam: the upper portion is a dark engineered fitting; below it, biological root-material descends into the void-black crack, dark green with bioluminescent veins. Handheld device scale. Palette: dark green, near-black void, faint bioluminescent blue-green. No planets, no text." },

  t1e03: { name: "Char Tendril",
    flavor: "A black tendril searches burned ground for surviving life. It sometimes returns carrying seeds no one planted.",
    artifactForm: "Biotech Module / Sensor", blueprintRole: "post-fire ecological probing",
    blueprintFamilies: "Planetary Cradle Engine; Stellar Nursery Rite precursor", civLane: "fire-adapted ecology",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro worm's-eye view (looking up along the tendril), soft atmospheric warm-green glow background. A charred tendril arching upward — blackened and cracked surface, two small ember-tipped probe nodes at the top glowing green-amber, testing the air above ash. Fills the frame from base to tip. Palette: charcoal black, green ember tips, warm ash-glow. No planets, no giant organic structure, no text." },

  t1e04: { name: "Climate Seed Die",
    flavor: "The die prints the first organisms needed to heal a damaged climate. One face has never been used.",
    artifactForm: "Fabrication Tool / Biotech Module", blueprintRole: "climate repair patterning",
    blueprintFamilies: "Planetary Cradle Engine; Ecumenopolis Lattice", civLane: "restorative biosphere civilization",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop product-shot, 3/4 overhead angle, dark studio void background. A small fabrication die — cube-shaped, dark metal, each face bearing a different micro-ecology pattern in fine relief; tiny root and cell motifs etched across the surfaces catch cool green light. Fingertip-sized. Palette: dark metal, cool green, pale cellular detail. No full planet, no space, no text." },

  t1e05: { name: "Facetcell Shard",
    flavor: "Living crystal cells change their purpose as light passes through them. Under moonlight, they arrange themselves into unfamiliar machines.",
    artifactForm: "Material / Biotech Module", blueprintRole: "cellular optical computation",
    blueprintFamilies: "Planetary Cradle Engine; Matrioshka Mind precursor", civLane: "crystalline cell ecology",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro close-up, dark studio void background. A faceted organic crystal shard — translucent green-white, with clearly visible cellular inclusions visible through the facet planes; prismatic light breaks across the faces in pale green and teal. Fills the frame. Palette: living green, translucent crystal, pale cellular inclusions, cool teal refraction. No planets, no text." },

  t1e06: { name: "Decay Lattice",
    flavor: "The lattice decides how quickly dead matter becomes food again. Certain bones take much longer than they should.",
    artifactForm: "Biotech Module / Protocol", blueprintRole: "managed decomposition",
    blueprintFamilies: "Planetary Cradle Engine; Spiral Ecology Mesh precursor", civLane: "recycler biosphere civilization",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro cross-section view, mineral/rock surface background — dark loam and decomposing matter. A small biological lattice sliced open: a grid of living filaments in an ordered decomposition matrix, dark green with pale nutrient channels visible at the junctions. Thumbnail-sized scale, fills the frame. Palette: dark green, pale nutrient-channel light, rich dark loam. No planets, no giant organism, no text." },

  t1e07: {
    name: "Lichen Vein",
    flavor:
      "Engineered lichen grows through stone and closes its cracks. Old walls repaired this way sometimes develop new doorways.",
    artifactForm: "Biotech Module / Interface",
    blueprintRole: "stone-life integration",
    blueprintFamilies: "Ecumenopolis Lattice; Mantle-to-Orbit Foundry",
    civLane: "urban symbiosis civilization",
    engineeringScale: "Planetary",
    artPrompt:
      "Extreme macro close-up, mineral/rock surface background — a joined stone-and-metal test coupon. A hand-sized engineered lichen vein bridges a fracture between the two materials; vivid green tissue branches through the crack while its advancing repair edge glows faint bioluminescent green. Palette: deep green lichen, grey stone, dark metal, faint healing-edge glow. No building facade, no planets, no text.",
  },

  t1e08: { name: "Necrobloom Bed",
    flavor: "Dead soil enters the bed; pale life emerges. The blooms occasionally carry memories of the vanished ecosystem.",
    artifactForm: "Biotech Module / Archive", blueprintRole: "dead-biome reactivation",
    blueprintFamilies: "Planetary Cradle Engine; Spiral Ecology Mesh precursor", civLane: "thanatological ecology",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop eye-level view, dark studio void background. A shallow cultivation tray sitting on a dark surface — holds a bed of grey fossil matter and pale soil; three small pale blooms with faintly luminous petals emerge from the bed, their roots visibly threading through fossilized material. Tray is roughly hand-sized. Palette: pale bloom white, grey fossil, dark soil, faint green-white bioluminescence. No planets, no giant scene, no text." },

  // ── Tier 1 ─ Abyss ───────────────────────────────────────────────────────
  t1o01: { name: "Entropy Veil",
    flavor: "The veil hides the heat of failing machines until repairs arrive. Used too long, it also hides the failure from its owners.",
    artifactForm: "Defense / Shielding", blueprintRole: "decay masking",
    blueprintFamilies: "Worldshield Covenant; Heliopause Bastion precursor", civLane: "hidden-survival civilization",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop eye-level view, soft atmospheric cool glow background — faint purple ambient light. A translucent dark veil draped over a small machine component; the veil is near-invisible but causes the machine beneath it to appear slightly out-of-focus, entropy particles drifting near its edges like slow motes. Handheld scale. Palette: dark translucent purple-black, faint particle motes, dim purple ambient. No planets, no full black hole, no text." },

  t1o02: { name: "Horizon Lantern",
    flavor: "It glows beside boundaries that should not be crossed. The lantern never shows what waits beyond them.",
    artifactForm: "Sensor / Observatory", blueprintRole: "dangerous boundary detection",
    blueprintFamilies: "Dark-Sector Observatory precursor; Worldshield Covenant", civLane: "horizon observer culture",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop eye-level view, dark studio void background. A compact black-metal lantern with a sealed housing; along every edge and seam of the lantern's body a thin blue-white glow indicates proximity to a dangerous boundary. The lens is dark at rest. Handheld scale, sits upright. Palette: matte black metal, thin blue-white edge glow at seams, near-void background. No planets, no black hole vista, no text." },

  t1o03: { name: "Ashen Hollow",
    flavor: "It preserves the empty shape left by something destroyed. Careful observers can sometimes see the missing object move.",
    artifactForm: "Containment / Archive", blueprintRole: "absence preserving imprint",
    blueprintFamilies: "Worldshield Covenant; Spiral-Arm Archive precursor", civLane: "ash-memory civilization",
    engineeringScale: "Planetary",
    artPrompt: "Room-scale cross-section view, dark studio void background. Interior of a hollow archive vessel shown in cutaway — the inner walls carry precise ash-contour relief maps of objects that were destroyed; a faint negative-space glow traces the absent forms. The vessel's interior fills the frame. Palette: ash grey, deep black walls, faint pale contour glow. No planets, no crater imagery, no text." },

  t1o04: { name: "Undergrowth Silencer",
    flavor: "Living fibers smother sound and signals above hidden settlements. Beneath them, whispers travel farther than radio.",
    artifactForm: "Defense / Concealment", blueprintRole: "biological noise suppression",
    blueprintFamilies: "Worldshield Covenant; Spiral Ecology Mesh precursor", civLane: "hidden root civilization",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop macro close-up, mineral/rock surface background — dark loam and root debris. A compact rootlike muffler artifact — dense organic material wound around a dark core; the surface absorbs light, giving it a near-matte appearance; thin root filaments extend outward to anchor it in soil. Walnut-sized. Palette: near-black root mass, dark earth tones, faint dark-green filaments. No full forest, no planets, no text." },

  t1o05: {
    name: "Blackglass Forge Die",
    flavor:
      "A blackglass mold that shapes metal perfectly in airless space. Finished parts emerge cold, even while the forge is burning.",
    artifactForm: "Fabrication Tool / Material",
    blueprintRole: "vacuum-stable precision forming",
    blueprintFamilies:
      "Mantle-to-Orbit Foundry; Galactic Relic Forge precursor",
    civLane: "vacuum manufacturing civilization",
    engineeringScale: "Planetary",
    artPrompt:
      "Tabletop product-shot, 3/4 overhead angle, dark vacuum-chamber background. A palm-sized precision forge die made from glossy near-black glass-ceramic, its forming cavity cut into clean orbital truss geometry; faint violet edge light is absorbed rather than reflected across most of its surface. Palette: blackglass, restrained violet edge light, dark metal chamber. No full foundry, no planets, no text.",
  },

  t1o06: { name: "Decay Network",
    flavor: "This buried web feeds decay back to whatever still lives. Nothing connected to it is ever entirely discarded.",
    artifactForm: "Protocol / Biotech Module", blueprintRole: "distributed decomposition routing",
    blueprintFamilies: "Planetary Cradle Engine; Spiral Ecology Mesh precursor", civLane: "subsurface recycler civilization",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro cross-section view, mineral/rock surface background — dark soil and substrate. A single dark bio-network node sliced open: inside, branching routing channels direct decay matter toward collecting chambers; the junction glows faint green-purple where active decomposition routing is occurring. Marble-sized scale, fills the frame. Palette: near-black node body, dark soil, faint green-purple junction glow. No full network visible, no planets, no text." },

  t1o07: { name: "Absence Shard",
    flavor: "The shard maps invisible gaps that support impossible structures. It casts no shadow of its own.",
    artifactForm: "Material / Sensor", blueprintRole: "negative-space reference material",
    blueprintFamilies: "Dark-Sector Observatory precursor; Worldshield Covenant", civLane: "absence mathematician culture",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro close-up, dark studio void background. A dark shard — deep black-grey material with a polished face that shows an anomalous negative-space reflection: where other objects would reflect, the shard reflects only its own absence. One edge catches faint pale light while the rest absorbs completely. Finger-length scale, fills the frame. Palette: near-black, charcoal grey facets, pale edge light. No planets, no text." },

  t1o08: { name: "Temporal Erasure Seal",
    flavor: "The seal hides a dangerous hour without erasing it. Every copy bears a date that has not arrived.",
    artifactForm: "Protocol / Archive", blueprintRole: "limited record redaction",
    blueprintFamilies: "Causality Audit Court precursor; Worldshield Covenant", civLane: "protective secrecy civilization",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop product-shot, 3/4 overhead angle, dark studio void background. A flat dark disc seal placed over a clocklike shadow — beneath the seal, the impression of a clock or temporal record is just visible as a ghost image in the surface; the seal itself is smooth, authoritative, without writing. Palm-sized scale. Palette: near-black seal, dark shadow clock beneath, deep grey. No text, no numbers visible anywhere." },

  // ── Tier 1 ─ Radiance ────────────────────────────────────────────────────
  t1p01: { name: "Correction Seed",
    flavor: "Planted inside a damaged system, it guides the whole toward repair. What returns is healthier, but never quite the same.",
    artifactForm: "Protocol / Biotech Module", blueprintRole: "error correction in growth or law",
    blueprintFamilies: "Planetary Cradle Engine; Ecumenopolis Lattice", civLane: "restorative civic biology",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro close-up, dark studio void background. A single white-gold seed with precise geometric correction facets on its casing — not organic, but architecturally exact; each facet plane catches warm gold light differently, giving the seed a jewel-like precision. Grain-of-wheat scale, fills the frame. Palette: white-gold, warm gold facet light, pure black void. No planets, no text." },

  t1p02: { name: "Still-Point Shard",
    flavor: "The shard holds one place perfectly still while everything around it changes. Dust crossing its edge falls in straight lines.",
    artifactForm: "Control Instrument / Stabilization", blueprintRole: "local equilibrium anchor",
    blueprintFamilies: "Worldshield Covenant; Causality Audit Court precursor", civLane: "equilibrium civic culture",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro close-up, abstract energy field background — faint white distortion waves suspended motionless. A white-gold crystal shard that appears to be suspending local motion: the energy field around it is frozen in place, forming a small zone of perfect stillness around the shard's surface. Finger-length scale, fills the frame. Palette: white-gold crystal, pale distortion freeze, luminous white field. No planets, no baked-in text or labels anywhere in the image." },

  t1p03: { name: "Prismatic Hollow",
    flavor: "A hollow prism that separates honest signals from persuasive noise. Lies leave through a face that appears solid.",
    artifactForm: "Interface / Sensor", blueprintRole: "truth-sorting aperture",
    blueprintFamilies: "Worldshield Covenant; Dark-Sector Observatory precursor", civLane: "revelatory optics civilization",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop eye-level view, soft atmospheric warm-gold glow background. A hollow prism — white-gold glass, visible cavity at its center; light entering one face is refracted and split, with pure signal-wavelengths emerging from one face and glamour-wavelengths blocked. Solar white-gold refraction fills the glass body. Handheld scale. Palette: white-gold, warm solar refraction, soft atmospheric glow. No planets, no giant megastructure, no text." },

  t1p04: { name: "Magnetic Bottle",
    flavor: "Magnetic fields hold star-hot plasma without walls. The bottle hums louder when its contents notice the opening.",
    artifactForm: "Containment / Power Component", blueprintRole: "plasma or field containment",
    blueprintFamilies: "Starlift Foundry precursor; Mantle-to-Orbit Foundry", civLane: "field-containment culture",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop product-shot, 3/4 overhead angle, dark studio void background. A compact magnetic containment bottle — spherical-ovoid form in white-gold metal; visible gold magnetic field lines curve around the exterior like latitude lines, converging at the poles; a faint warm plasma glow is just visible through the translucent equatorial band. Handheld scale. Palette: white-gold metal, luminous gold field lines, warm plasma interior glow. No planets, no text." },

  t1p05: { name: "Recursive Lens",
    flavor: "Before examining the world, this lens examines its own bias. Occasionally it refuses to show the observer.",
    artifactForm: "Sensor / Protocol", blueprintRole: "self-auditing perception",
    blueprintFamilies: "Causality Audit Court precursor; Matrioshka Mind precursor", civLane: "self-correcting optics culture",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop eye-level view, dark studio void background. A circular white-gold lens in a precision housing; the lens surface shows recursive reflections of itself — smaller and smaller versions of the same lens visible in its center, catching the same white-gold light. Handheld scale, sits upright. Palette: white-gold, luminous recursive reflection geometry, dark void. No text, no labels." },

  t1p06: { name: "Living Lattice Node",
    flavor: "A living junction that lets buildings coordinate their own repair. Unused nodes sometimes begin healing nearby ruins.",
    artifactForm: "Biotech Module / Civic Signal", blueprintRole: "living civic coordination node",
    blueprintFamilies: "Ecumenopolis Lattice; Galactic Concordance Engine precursor", civLane: "dense civic ecology",
    engineeringScale: "Planetary",
    artPrompt: "Extreme macro close-up, soft atmospheric warm-gold glow background. A small bio-civic coordination node — organic material at its core with geometric gold lattice extensions radiating outward like a living circuit; the lattice glows warm white-gold at each junction point. Fills the frame, marble-sized scale. Palette: warm white-gold lattice, living cream-tissue core, soft gold atmospheric glow. No planets, no text." },

  t1p07: { name: "Void Prism",
    flavor: "The prism makes forbidden darkness visible, not safe. Something on the other side appears to be looking back.",
    artifactForm: "Sensor / Interface", blueprintRole: "illumination of hidden void states",
    blueprintFamilies: "Dark-Sector Observatory precursor; Worldshield Covenant", civLane: "hidden sun civilization",
    engineeringScale: "Planetary",
    artPrompt: "Tabletop product-shot, 3/4 overhead angle, abstract energy field background — dark with white-gold energy distortion. A prism with a black-violet interior: light entering from one face is converted to a readable void-state spectrum exiting from another; white-gold edge lines define the prism geometry against the dark interior. Handheld scale. Palette: black-violet interior, white-gold edges, dark energy field. No planets, no text." },

  t1p08: {
    name: "Petrified Bloom",
    flavor:
      "A stone flower proving that life once survived here. Its petals open slightly whenever rain approaches.",
    artifactForm: "Archive / Material",
    blueprintRole: "preserved life-pattern reference",
    blueprintFamilies: "Planetary Cradle Engine; Spiral-Arm Archive precursor",
    civLane: "fossil civic ecology",
    engineeringScale: "Planetary",
    artPrompt:
      "Tabletop product-shot, 3/4 overhead angle, mineral/rock surface background — warm pale stone. A hand-sized fossil bloom carefully cut from its matrix: white-gold mineral petals preserve the complete flower pattern while faint bioluminescent veins remain active in the surrounding stone sample. Palette: white-gold fossil bloom, warm pale stone, faint living-vein glow. No cliff, no building-scale flower, no text, no labels.",
  },

  // ── Tier 2 ─ Flare ───────────────────────────────────────────────────────
  t2r01: { name: "Stellar Crucible",
    flavor: "This chamber turns matter drawn from a star into materials no planet can make. Its walls remember every sun they have touched.",
    artifactForm: "Fabrication Tool / Containment", blueprintRole: "star-powered materials processing",
    blueprintFamilies: "Starlift Foundry; Galactic Relic Forge precursor", civLane: "stellar industrial civilization",
    engineeringScale: "Star-system",
    artPrompt: "Room-scale eye-level view, abstract energy distortion background — rippling red-gold plasma interference. A stellar crucible standing at human height — squat cylindrical refractory vessel with star-material flow entering through an upper port: a contained stream of compressed solar plasma flows down into the melt chamber, visible through a reinforced observation slit. Palette: deep red, molten gold, dark refractory metal. No full star, no planets, no text." },

  t2r02: { name: "Biomass Ignition Index",
    flavor: "The index says how much living fuel can be burned without starving the future. Several pages remain permanently sealed.",
    artifactForm: "Protocol / Biotech Module", blueprintRole: "controlled bioenergy sequencing",
    blueprintFamilies: "Heliosphere Weather Loom; Arkseed Migration Fleet", civLane: "star-fed biosphere culture",
    engineeringScale: "Star-system",
    artPrompt: "Tabletop product-shot, 3/4 overhead angle, dark studio void background. A protocol index object — a compact layered disc or tablet of biopolymer and dark metal, its surface bearing a radial arrangement of ignition-threshold markings etched in relief (geometric, not text). Biomass sample chambers are visible as small sealed cells around the perimeter. Handheld scale. Palette: warm red-orange accents, dark biopolymer, deep green biomass cells. No text or labels." },

  t2r03: { name: "Starlift Nozzle",
    flavor: "This immense nozzle turns stellar fire into a controlled stream of raw material. Its narrowest point is colder than space.",
    artifactForm: "Control Instrument / Containment", blueprintRole: "stellar matter extraction",
    blueprintFamilies: "Starlift Foundry", civLane: "pressure-harvesting industrial civilization",
    engineeringScale: "Star-system",
    artPrompt: "Installation-scale cross-section view, abstract energy field background — red-orange plasma shimmer. A massive starlift nozzle throat in cross-section: the convergent-divergent channel geometry spans a space large enough to walk through; inner walls are dark refractory alloy with cooling fins, compressed star-plasma flowing through the throat as a bright controlled stream filling the center. The cross-section fills the frame. Palette: dark alloy walls, contained red-gold plasma stream, heat-glow orange. No text." },

  t2r04: { name: "Photosynthetic Furnace Wick",
    flavor: "A living wick carries stored sunlight through the dark between worlds. It continues glowing after the host habitat dies.",
    artifactForm: "Biotech Module / Power Component", blueprintRole: "habitat-scale light-to-heat conversion",
    blueprintFamilies: "Heliosphere Weather Loom; Arkseed Migration Fleet", civLane: "stellar greenhouse civilization",
    engineeringScale: "Star-system",
    artPrompt: "Tabletop eye-level view, soft atmospheric warm glow background. A living furnace wick fitted into habitat machinery: an organic stalk held in a dark metal mount, its tissue dense with amber-gold photosynthetic capillaries; the wick glows with stored solar heat, warming the metal bracket that holds it inside a habitat wall cavity. Handheld component scale. Palette: warm amber, living green-gold capillaries, dark metal mount. No solar farm, no planets, no text." },

  t2r05: { name: "Causality Furnace Valve",
    flavor: "The valve opens only after calculating the harm its power may cause. It has refused orders from every known government.",
    artifactForm: "Control Instrument / Protocol", blueprintRole: "controlled consequence release",
    blueprintFamilies: "Causality Audit Court precursor; Starlift Foundry", civLane: "causal-risk engineer civilization",
    engineeringScale: "Star-system",
    artPrompt: "Extreme macro close-up, abstract energy field background — red and blue causal interference ripple. A compact furnace valve with a split-flow design: one side channels red heat flow, the other channels blue causal-lock signal; the valve seat is visible at center, closed until both flows agree. Coin-sized mechanism scale, fills the frame. Palette: deep red heat channel, sapphire blue causal lock, dark metal body. No full furnace, no planets, no text." },

  t2r06: {
    name: "Entropy Sink Crucible",
    flavor:
      "This crucible turns stellar waste heat into more useful energy. Its final outlet has no recorded destination.",
    artifactForm: "Power Component / Thermal Control",
    blueprintRole: "waste heat capture",
    blueprintFamilies: "Dyson Swarm; Matrioshka Mind",
    civLane: "thermal accountant civilization",
    engineeringScale: "Star-system",
    artPrompt:
      "Room-scale cross-section view, dark thermal laboratory background. A bounded entropy-sink crucible module in dark thermal ceramic: nested collection manifolds feed orange-red waste heat into a compact secondary-output chamber, with cooling geometry visible around the vessel. Palette: dark thermal ceramic, deep orange heat glow, near-black laboratory. No tower complex, no planet, no text.",
  },

  // ── Tier 2 ─ Continuum ───────────────────────────────────────────────────
  t2s01: { name: "Interstice Gate Seed",
    flavor: "A small seed placed where a gateway might one day open. Some begin growing before any route is planned.",
    artifactForm: "Interface / Transit Component", blueprintRole: "gate-site initialization",
    blueprintFamilies: "Wormgate Spine precursor; Arkseed Migration Fleet", civLane: "route-planner civilization",
    engineeringScale: "Star-system",
    artPrompt: "Extreme macro close-up, dark studio void background. A small aperture seed — ovoid, translucent blue-sapphire casing with a spatial seam visible as a thin luminous line running along its equator; the seam glows blue where the gate potential is stored. Handheld scale, fills the frame. Palette: deep sapphire blue, luminous spatial seam, near-black void. No planets, no full gate structure, no text." },

  t2s02: { name: "Storm-Memory Filament",
    flavor: "This filament remembers every solar storm it survives and warns the next world. Its oldest memory predates the star.",
    artifactForm: "Archive / Sensor", blueprintRole: "stellar weather memory",
    blueprintFamilies: "Heliosphere Weather Loom; Matrioshka Mind", civLane: "heliosphere archivist culture",
    engineeringScale: "Star-system",
    artPrompt: "Extreme macro close-up, soft atmospheric cool glow background — faint blue storm-light. A fine memory filament coiled loosely: the thread is deep sapphire with storm-pattern data encoded as subtle periodic color variations along its length, each band a stored storm event; the filament glows faintly blue. Fills the frame. Palette: deep sapphire blue, cool storm-light variations, blue atmospheric glow. No full solar array, no planets, no text." },

  t2s03: {
    name: "Simulation Loom",
    flavor:
      "The loom weaves possible futures, then cuts away the deadliest. A few severed threads keep moving.",
    artifactForm: "Fabrication Tool / Computation Substrate",
    blueprintRole: "predictive model weaving",
    blueprintFamilies: "Matrioshka Mind; Causality Audit Court precursor",
    civLane: "simulation guild civilization",
    engineeringScale: "Star-system",
    artPrompt:
      "Tabletop product-shot, 3/4 overhead angle, dark studio void background. A console-sized simulation loom in a dark precision frame, with luminous sapphire-blue computation threads stretched through branching gates; a few cut threads mark rejected futures while intact paths glow steadily. Palette: deep blue simulation threads, dark metal frame, near-black void. No warehouse, no building, no text.",
  },

  t2s04: { name: "Continuity Vessel",
    flavor: "The vessel preserves a people's shared identity across centuries of separation. On reunion, it sometimes remembers an extra branch.",
    artifactForm: "Archive / Containment", blueprintRole: "identity continuity preservation",
    blueprintFamilies: "Arkseed Migration Fleet; Spiral-Arm Archive precursor", civLane: "migration memory civilization",
    engineeringScale: "Star-system",
    artPrompt: "Tabletop eye-level view, dark studio void background. A sealed cylindrical archive vessel in dark blue-grey metal; a band of memory light glows along the mid-section, pale sapphire-white, indicating active identity continuity storage. No portraits, no people visible. Handheld scale, sits upright. Palette: dark blue-grey metal, pale sapphire memory band, near-black void. No people, no solar system imagery, no text." },

  t2s05: { name: "Mnemosyne Star-Index",
    flavor: "It stores many worlds' memories of the same event without choosing one as truth. Contradictions gather near its center.",
    artifactForm: "Archive / Civic Signal Object", blueprintRole: "multi-world memory indexing",
    blueprintFamilies: "Matrioshka Mind; Spiral-Arm Archive precursor", civLane: "distributed archive civilization",
    engineeringScale: "Star-system",
    artPrompt: "Tabletop product-shot, 3/4 overhead angle, soft atmospheric cool glow background. An index shard or prism — faceted deep blue, with faint star-map geometry hints visible as internal refraction patterns inside the crystal; the facets catch sapphire and pale gold light. Handheld scale, sits on a dark surface. Palette: deep sapphire blue, pale gold refraction hints, cool atmospheric glow. No words, no text anywhere in the image." },

  t2s06: {
    name: "Convergence Lens",
    flavor:
      "The lens reveals when different things are being forced into one answer. It cracks under perfect agreement.",
    artifactForm: "Sensor / Interface",
    blueprintRole: "wildcard pressure inspection",
    blueprintFamilies:
      "Singularity Containment Mandala precursor; Causality Audit Court precursor",
    civLane: "convergence-risk civilization",
    engineeringScale: "Star-system",
    artPrompt:
      "Room-scale eye-level view, abstract convergence-field background. A large but bounded white-gold inspection lens in a precision gimbal, its face catching several wavelengths of convergence pressure simultaneously; separated chromatic boundaries bloom where incompatible categories are being forced together. Palette: white-gold lens, chromatic boundary light, dark instrument frame. No planet-spanning array, no horizon, no text.",
  },

  // ── Tier 2 ─ Verdance ────────────────────────────────────────────────────
  t2e01: { name: "Solar Immune Organ",
    flavor: "Grafted into a habitat, this organ teaches life which starlight to accept. It sometimes rejects the home star.",
    artifactForm: "Biotech Module / Defense", blueprintRole: "radiation adaptation",
    blueprintFamilies: "Heliosphere Weather Loom; Arkseed Migration Fleet", civLane: "multi-world biosphere civilization",
    engineeringScale: "Star-system",
    artPrompt: "Extreme macro close-up, dark studio void background. A compact solar immune organ — a dense organic graft, deep green with internal immune-pattern architecture visible through its semi-translucent surface; radiation-filter layers are stacked inside like interference gratings. Fills the frame, palm-sized. Palette: deep green, semi-translucent immune layers, warm solar-edge glow at the surface. No whole worldroot, no planets, no text." },

  t2e02: { name: "Dormancy Clock Graft",
    flavor: "The graft lets whole habitats sleep for centuries and wake on time. Some awaken with one season missing.",
    artifactForm: "Biotech Module / Archive", blueprintRole: "long-cycle dormancy timing",
    blueprintFamilies: "Arkseed Migration Fleet; Stellar Nursery Rite", civLane: "deep-time biological culture",
    engineeringScale: "Star-system",
    artPrompt: "Extreme macro close-up, mineral/rock surface background — dark aged bark or hull material. A biological clock-graft adhering to an organic surface: ring-pattern growth cycles are visible on the graft's upper surface like tree rings; the dormancy mechanism is a sealed bud at center, dark and compressed. Fills the frame, palm-sized. Palette: dark green-brown graft, ring pattern growth bands, dark bark substrate. No planets, no cosmic scene, no text." },

  t2e03: { name: "Abyssal Culture Flask",
    flavor: "A sealed flask where life learns to thrive without light. Shapes gather against the glass when no one is watching.",
    artifactForm: "Biotech Module / Containment", blueprintRole: "dark-adapted culture growth",
    blueprintFamilies: "Heliopause Bastion; Spiral Ecology Mesh precursor", civLane: "dark-adapted biosphere culture",
    engineeringScale: "Star-system",
    artPrompt: "Tabletop eye-level view, dark studio void background. A sealed dark culture flask — pressure-rated, dark metal and tinted glass casing; inside, bioluminescent dark-adapted organisms glow faint blue-green in their growth medium; the flask is compact, pressure-sealed for deep dark environments. Handheld scale. Palette: near-black flask body, faint blue-green bioluminescence inside, dark void. No full garden, no planets, no text." },

  t2e04: { name: "Mycelial Relay Spindle",
    flavor: "This living spindle translates signals among ships, soil, machines, and flesh. Recently, it began answering messages no one sent.",
    artifactForm: "Interface / Biotech Module", blueprintRole: "interplanetary biological signaling",
    blueprintFamilies: "Arkseed Migration Fleet; Heliosphere Weather Loom", civLane: "symbiotic signal civilization",
    engineeringScale: "Star-system",
    artPrompt: "Tabletop product-shot, 3/4 overhead angle, dark studio void background. A mycelial relay spindle — a finger-length biological spool with engineered mycelium threads wound around it; the threads are deep green with bioluminescent signal nodes at regular intervals along their length. The spindle sits upright on a dark surface. Palette: deep green mycelium, pale bioluminescent nodes, dark void. No huge network, no planets, no text." },

  t2e05: {
    name: "Epoch Graft Ledger",
    flavor:
      "A living ledger grows a new band whenever an age ends. One ring records an era absent from every history.",
    artifactForm: "Archive / Biotech Module",
    blueprintRole: "biological era-tracking",
    blueprintFamilies: "Arkseed Migration Fleet; Spiral-Arm Archive precursor",
    civLane: "living chronology civilization",
    engineeringScale: "Star-system",
    artPrompt:
      "Tabletop eye-level view, soft atmospheric green glow background. A rolled living epoch-ledger grown as a forearm-sized strip of tissue; layered growth-ring strata record distinct biological eras, and the newest band glows faint green along one edge. Palette: deep green strata, pale living surface, atmospheric green light. No civic wall, no readable text, no planets.",
  },

  t2e06: {
    name: "Crystal Biome Seedplate",
    flavor:
      "The seedplate grows habitats that are both crystal and alive. Their first rooms always face the same unknown star.",
    artifactForm: "Material / Biotech Module",
    blueprintRole: "crystal-organic habitat seeding",
    blueprintFamilies: "Heliosphere Weather Loom; Stellar Nursery Rite",
    civLane: "crystalline ecology civilization",
    engineeringScale: "Star-system",
    artPrompt:
      "Extreme macro cross-section view, mineral/rock surface background. A hand-sized seedplate cutaway reveals alternating translucent crystal planes and metabolically active living-cell layers, with germination channels radiating from its center. Palette: translucent green-white crystal, pale organic cells, mineral substrate. No architectural slab, no full biome, no text.",
  },

  // ── Tier 2 ─ Abyss ───────────────────────────────────────────────────────
  t2o01: { name: "Horizon Extractor",
    flavor: "The extractor samples the edge of dangerous physics without crossing it. Something at the boundary occasionally samples back.",
    artifactForm: "Sensor / Containment", blueprintRole: "boundary-energy sampling",
    blueprintFamilies: "Dark-Sector Observatory; Starlift Foundry", civLane: "horizon engineer civilization",
    engineeringScale: "Star-system",
    artPrompt: "Tabletop eye-level view, abstract energy field background — dark with a sharp boundary edge where physics changes. A compact extractor tool positioned at an abstract horizon boundary — dark metal housing with a sample probe extended toward the edge; the probe tip glows pale blue-white where it touches forbidden-physics space. Handheld device scale. Palette: dark metal, pale blue-white probe tip, dark energy boundary. No full black hole scene, no planets, no text." },

  t2o02: { name: "Radiant Erasure Casket",
    flavor: "The casket seals knowledge too dangerous to release. Light still escapes around the lid, spelling no known language.",
    artifactForm: "Containment / Protocol", blueprintRole: "authorized signal deletion",
    blueprintFamilies: "Heliopause Bastion; Worldshield Covenant", civLane: "lawful redaction civilization",
    engineeringScale: "Star-system",
    artPrompt: "Extreme macro close-up, dark studio void background. A small dark casket — near-black metal with a sealed lid; white-gold light bleeds from the seam around the lid, the contained revelation pressing against its bounds but unable to escape. Matchbox-sized scale, fills the frame. Palette: near-black casket, white-gold light seam, deep void. No text, no labels." },

  t2o03: { name: "Entropic Furnace Baffle",
    flavor: "This baffle hides and reuses the heat that would reveal a starbound people. Even nearby suns seem dimmer around it.",
    artifactForm: "Thermal Control / Defense", blueprintRole: "entropy redirection",
    blueprintFamilies: "Starlift Foundry; Matrioshka Mind", civLane: "waste-heat shadow culture",
    engineeringScale: "Star-system",
    artPrompt: "Room-scale eye-level view, soft atmospheric dark glow background — deep shadow environment. A large dark thermal baffle — wall-mounted, dark absorptive panels with recessed routing channels that direct waste heat into hidden work chambers; faint deep-orange glow visible in the channel voids. The baffle fills the frame. Palette: near-black absorptive panels, deep orange heat in channels, dark shadow atmosphere. No giant furnace, no planets, no text." },

  t2o04: { name: "Extinction Forge Die",
    flavor: "Forged from the ruins of failed worlds, this die makes parts for whatever comes next. Every copy bears the same fracture.",
    artifactForm: "Fabrication Tool / Archive", blueprintRole: "post-collapse reconstruction tooling",
    blueprintFamilies: "Galactic Relic Forge precursor; Spiral-Arm Archive precursor", civLane: "extinction-survivor culture",
    engineeringScale: "Star-system",
    artPrompt: "Tabletop product-shot, 3/4 overhead angle, mineral/rock surface background — dark ash and fossilized debris. A small forge die — cube-shaped, cast from dark composite material containing visible fossil and ash inclusions from failed worlds; the die faces bear geometric replacement-part cavity profiles. Fingertip-sized. Palette: dark composite with ash-grey and fossil inclusions, near-black surfaces. No text, no labels on the die faces." },

  t2o05: { name: "Eventide Ecology Seal",
    flavor: "The seal lets an ecosystem sleep instead of starving as its light fades. Dormant roots continue counting the years.",
    artifactForm: "Protocol / Biotech Module", blueprintRole: "managed ecological shutdown",
    blueprintFamilies: "Heliosphere Weather Loom; Spiral Ecology Mesh precursor", civLane: "twilight ecology civilization",
    engineeringScale: "Star-system",
    artPrompt: "Extreme macro close-up, soft atmospheric twilight glow background — dim green fading to dark. A dim ecology seal token — organic material, deep green on its outer rim grading to near-black at center; a living ecological pattern is visible as a faint relief on its surface, in the process of gracefully dimming. Coin-sized scale. Palette: deep green outer rim, twilight fade to near-black center, dim atmospheric glow. No text on token surface." },

  t2o06: {
    name: "Dimensional Shear Gauge",
    flavor:
      "The gauge warns when stressed space is about to tear. Its needle trembles near certain people.",
    artifactForm: "Sensor / Interface",
    blueprintRole: "boundary stress measurement",
    blueprintFamilies: "Heliopause Bastion; Wormgate Spine precursor",
    civLane: "spatial stress engineer civilization",
    engineeringScale: "Star-system",
    artPrompt:
      "Room-scale cross-section view, abstract spatial-stress background. A bounded dimensional shear gauge in dark metal: several transparent measurement chambers surround a narrow test aperture, and fine indicator filaments bend visibly as pale shear-distortion lines cross the opening. Palette: dark metal, pale spatial-distortion lines, cool instrument light. No hemisphere-wide array, no planet, no text.",
  },

  // ── Tier 2 ─ Radiance ────────────────────────────────────────────────────
  t2p01: {
    name: "Containment Lattice",
    flavor:
      "Every dangerous chamber in this lattice can be inspected from outside. One sealed cell appears empty from every angle.",
    artifactForm: "Containment / Civic Signal",
    blueprintRole: "public-safe hazardous containment",
    blueprintFamilies:
      "Starlift Foundry; Singularity Containment Mandala precursor",
    civLane: "transparent containment civilization",
    engineeringScale: "Star-system",
    artPrompt:
      "Tabletop product-shot, 3/4 overhead angle, dark studio void background. A modular white-gold containment lattice with a small grid of transparent hazard cells, each chamber fully visible and softly lit so its state can be inspected without instruments. Palette: white-gold frame, transparent luminous cells, near-black void. No building facade, no hidden chambers, no text.",
  },

  t2p02: { name: "Null-Convergence Prism",
    flavor: "The prism glows when many meanings are crushed into one convenient answer. Its brightest flare has never been explained.",
    artifactForm: "Sensor / Interface", blueprintRole: "category collapse warning",
    blueprintFamilies: "Singularity Containment Mandala precursor; Matrioshka Mind", civLane: "convergence-auditing civilization",
    engineeringScale: "Star-system",
    artPrompt: "Tabletop eye-level view, abstract energy field background — white convergence pressure waves. A prism with chromatic warning edges: normally neutral, when category convergence is detected the prism face blazes with separated white chromatic boundaries; the edges catch light sharply as distinct spectra. Handheld scale. Palette: white chromatic edges, pale lens body, abstract energy field. No planets, no text." },

  t2p03: { name: "Living Treaty Organ",
    flavor: "This living organ holds an agreement between worlds as flesh, not paper. Breaking the treaty makes it bleed.",
    artifactForm: "Biotech Module / Civic Protocol", blueprintRole: "multi-world biological governance",
    blueprintFamilies: "Heliosphere Weather Loom; Galactic Concordance Engine precursor", civLane: "plural civic ecology",
    engineeringScale: "Star-system",
    artPrompt: "Extreme macro close-up, dark studio void background. A living treaty organ — an organic structure with geometric gold signal lines running through its tissue in a regular treaty-geometry pattern; the gold lines glow where inter-world agreements are actively maintained. Palm-sized, fills the frame. Palette: living cream-green tissue, geometric gold signal lines, dark void. No text, no portraits." },

  t2p04: { name: "Heliostat Filament",
    flavor: "A single filament teaches vast mirrors how to steer a star's light. At night, it points beyond the system.",
    artifactForm: "Power Component / Signal Object", blueprintRole: "stellar light alignment",
    blueprintFamilies: "Dyson Swarm; Heliosphere Weather Loom", civLane: "solar coordination civilization",
    engineeringScale: "Star-system",
    artPrompt: "Extreme macro close-up, soft atmospheric gold glow background. A single fine gold-white heliostat filament — an almost impossibly thin thread that catches and refracts light along its entire length; micro-etched orbital guidance marks are visible as subtle texture. Fills the frame. Palette: warm gold-white filament, luminous gold atmospheric glow. No full solar array, no planets, no text." },

  t2p05: {
    name: "Error-Correcting Core",
    flavor:
      "The core finds and repairs mistakes across vast distances. It keeps a private record of errors that should have been impossible.",
    artifactForm: "Computation Substrate / Protocol",
    blueprintRole: "high-energy error correction",
    blueprintFamilies: "Matrioshka Mind; Causality Audit Court precursor",
    civLane: "precision computation civilization",
    engineeringScale: "Star-system",
    artPrompt:
      "Tabletop product-shot, 3/4 overhead angle, dark studio void background. A console-sized cylindrical error-correcting core in white-gold housing, with ordered correction-geometry panels glowing warm white and concentric field bands visible around its circumference. Palette: white-gold housing, ordered geometric glow, dark void. No computation facility, no building, no text, no labels.",
  },

  t2p06: { name: "Radiation Treaty Prism",
    flavor: "The prism divides stellar radiation fairly among many habitats. One face accepts a burden assigned to no world.",
    artifactForm: "Civic Signal / Sensor", blueprintRole: "shared radiation governance",
    blueprintFamilies: "Heliosphere Weather Loom; Arkseed Migration Fleet", civLane: "multi-world biosphere treaty culture",
    engineeringScale: "Star-system",
    artPrompt: "Tabletop eye-level view, nebula field background — distant stellar cloud, no planets or moons. A radiation treaty prism in white-gold housing: its faces are tuned to specific habitat-tolerance wavelengths, each face catching a different treaty-band of stellar light. The nebula behind provides soft stellar context without dominating. Handheld scale. Palette: white-gold prism, multi-band stellar light refraction, soft nebula field. No text, no labels." },
};

// Tier III artwork depicts bounded galactic-keystone instruments. Their eventual
// Manifested Projects remain campaign-gated and live outside the production catalog.
const TIER_THREE_V2_ART_PROMPTS: Partial<Record<ArtifactId, string>> = {
  t3r01: "A bounded dark-metal interpreter frames alien stellar ignition signals beside one star; red-gold translation arcs, one inspectable operational instrument, no network or text.",
  t3r02: "A compact refractory recovery machine safely separates useful elements from dead-system debris; dark metal, restrained red heat, visible sealed output canisters, no megastructure or text.",
  t3r03: "Nested red phase rings and a sapphire timing core regulate one relativistic stellar event; precise bounded hardware near a star, no galactic array or text.",
  t3r04: "A compact black-and-gold forge heart turns stellar feedstock into several distinct habitat-compatible test forms; bounded machinery, no production network or text.",
  t3s01: "A compact sapphire route-solving instrument models one safe path through a dark void inside transparent containment; dishes and calibration arms, no gate network or text.",
  t3s02: "Two divergent civic records enter a bounded reconciliation machine and emerge as one auditable result without erasing either source; sapphire and gold, no institution or text.",
  t3s03: "A black-and-gold antenna instrument decodes one faint signal from a ruined world into a central crystal archive; bounded hardware, no archive network or text.",
  t3s04: "Unequal sapphire chronology rings align around one white ordering axis inside a compact governor; inspectable relativistic timing hardware, no accord network or text.",
  t3e01: "Two incompatible living samples are joined by a contained graft on a compact transit spine; green biological glass, precise clamps, no world-spanning roots or text.",
  t3e02: "A black-and-green genome engine tests one small stellar habitat bud beside a star; bounded biological machinery, no stellar overgrowth or text.",
  t3e03: "A compact containment instrument compares a fossil sample against layered living defenses and a healthy culture; green-black hardware, no interstellar biome or text.",
  t3e04: "Two incompatible biochemistries meet across one gold living translation membrane in a sealed instrument; teal and violet samples, no galactic network or text.",
  t3o01: "A compact refuge biosphere sleeps inside concentric abyssal insulation embedded in cold planetary rock; matte-black pressure shell, restrained green life, no constellation or text.",
  t3o02: "Physical, ecological, and civic sensor streams converge into a compact near-black prediction core showing one branching collapse model; no containment network or text.",
  t3o03: "A pale living symbiont routes one authenticated signal through a matte-black relay without outward emission; compact covert hardware, no signal network or text.",
  t3o04: "Four compact interferometer arms measure a central near-black null sample with reciprocal pale-cyan light; bounded observatory instrument, no aperture or text.",
  t3p01: "Distinct non-humanoid signal vessels feed a compact white-gold consent verifier while every input remains separate; bounded instrument, no civic network or text.",
  t3p02: "A complex relic component sits in a compact provenance machine encircled by transparent witness nodes and one unexplained gap; no public foundry or text.",
  t3p03: "Several independent logic cores of unlike geometry exchange proofs through a compact white-gold substrate without merging; no stellar computation network or text.",
  t3p04: "Optical, chemical, vibration, magnetic, and living sensors seal testimony about one damaged habitat fragment into a white-gold evidence crystal; no constellation or text.",
};

for (const artifact of ARTIFACT_CATALOG) {
  const existing = CARD_LORE[artifact.id] ?? {
    name: artifact.name,
    flavor: artifact.flavor,
  };
  CARD_LORE[artifact.id] = {
    ...existing,
    name: artifact.name,
    flavor: artifact.flavor,
    artifactForm: artifact.forms.join(" / "),
    blueprintRole: artifact.blueprintRole,
    blueprintFamilies: artifact.blueprintFamilies,
    engineeringScale: artifact.engineeringScale,
    artPrompt: TIER_THREE_V2_ART_PROMPTS[artifact.id] ?? existing.artPrompt,
  };
}

export function getCardLore(id: string): CardLore {
  const artifact = ARTIFACT_DEFINITIONS[id as ArtifactId];
  if (!artifact) return { name: "Unnamed Artifact", flavor: "" };
  return CARD_LORE[id] ?? { name: artifact.name, flavor: artifact.flavor };
}
