# LUMINAe Technology System v1.0

> **Superseded historical design.** Technology System v2.0 is authoritative.
> Retain this file for provenance only; do not use its Tier III or Artifact
> ontology to author runtime, tutorial, or Civilization behavior.

## Status

**Canonical technology hierarchy and Artifact/Blueprint design rules.**

This document supersedes the hierarchy in:

- `LUMINAe_BLUEPRINT_TO_ARTIFACT_DEPENDENCY_MAP_v0.2.md`
- `LUMINAe_ARTIFACT_REPLACEMENT_TABLE_v0.4_UTILITY_FIRST_LORE.md`

Those documents remain useful historical references, but their rule that every
Artifact is a component-sized object no longer applies to Tier III.

This pass intentionally preserves Artifact IDs, costs, Affinity bonuses,
Eminence values, Forge rules, and the stable core game. It optimizes what the
technologies mean and how they combine.

## Canonical Hierarchy

```text
Affinity = the civilization's technological philosophy
Tier = the civilizational reach of the achievement
Artifact = a public, Forgeable technological achievement
Blueprint = secret knowledge for synthesizing specific Artifacts into a device or project
Luminary = the mythic destiny attracted by the civilization that emerges
```

Physical size alone does not determine any category.

- A Blueprint can be a compact device, such as the Antimatter Detonator.
- A Tier III Artifact can be a galaxy-spanning public work, such as the Wormgate Spine.
- A small object can still be Tier II if only a star-system civilization can manufacture it.
- A large Tier I installation is acceptable when it is a bounded tool or subsystem, not a completed planetary megastructure.

The defining distinction is **public achievement versus secret synthesis**.
Artifacts are technologies civilizations can openly Forge. Blueprints are
dangerous or lost plans that make a particular combination of those
technologies do something exceptional.

## Tier Ladder

### Tier I: Planetary Enabling Technologies

Tier I Artifacts solve the bottlenecks that let a civilization master its
planet and operate reliably in orbit.

Expected forms:

- power cores and regulators
- materials and fabrication dies
- sensors and control instruments
- biological grafts and engineered organisms
- archives and executable protocols
- bounded industrial installations
- civic instruments backed by planetary institutions

They may require planetary industry, but they are not complete world-spanning
systems. Their card art should make the Artifact itself inspectable.

### Tier II: Stellar Subsystems and Institutions

Tier II Artifacts require star-system energy, interplanetary logistics,
heliosphere knowledge, or durable coordination among several worlds.

Expected forms:

- stellar-material processing chambers
- major propulsion, transit, and containment modules
- interplanetary biological organs and archives
- system-wide governance instruments
- stellar computation substrates
- observatory and environmental-control subsystems

They may be physically immense. A starlift nozzle can be large enough to walk
through. It is still a subsystem, not the complete starlifting industry. Tier
II card art may show stellar context, but should not depict the completed
Dyson swarm, Matrioshka Mind, migration fleet, or equivalent final project.

### Tier III: Galactic Achievements

Tier III Artifacts are the public works, networks, institutions, and
megastructures by which a Type III civilization becomes legible.

Expected forms:

- galactic transit backbones
- distributed stellar-industry networks
- civilization-scale archives and chronology systems
- multi-species legal institutions with physical enforcement infrastructure
- galactic ecological and concealment networks
- coordinated constellations of star-scale computation

Tier III must feel larger in consequence than Tier II. It should not be
systematically reduced to handheld keys, seals, lenses, or wafers. A local
terminal may appear in supporting lore, but the card represents the complete
achievement.

## Affinity Technology Identities

| Affinity | Central question | Characteristic technologies |
|---|---|---|
| Flare | What can be transformed, powered, or begun? | ignition, energy, industry, transmutation, decisive action |
| Continuum | What can persist, connect, or remain ordered through change? | timekeeping, memory, transit, causality, continuity |
| Verdance | What can live, adapt, recover, or coexist? | ecology, biotechnology, repair, propagation, symbiosis |
| Abyss | What must be hidden, bounded, relinquished, or survived? | entropy, concealment, dangerous boundaries, shutdown, absence |
| Radiance | What can be known, coordinated, verified, or made legitimate? | observation, containment, computation, law, public witness |

An Artifact may combine several disciplines, but its bonus Affinity should
describe its primary civilizational answer.

## Artifact Acceptance Test

Every Artifact must answer all five questions without relying on its Blueprint:

1. **What is it?** A concrete device, material, organism, protocol,
   institution, network, or public work.
2. **What bottleneck does it solve?** The failure that made the technology
   necessary.
3. **What becomes possible afterward?** A new civilizational capability.
4. **Why is it this Tier?** The infrastructure and reach required to create or
   operate it.
5. **How is it distinct?** Its primary function cannot duplicate a neighboring
   Artifact in the same Tier and Affinity.

Additional rules:

- A protocol must name what executes or enforces it.
- A sensor must name what hidden state it detects and what decision follows.
- A material must name the property that ordinary matter lacks.
- A civic technology must have infrastructure, verification, or enforcement;
  it cannot be a ceremonial claim alone.
- Names should not use mystery as a substitute for function.
- Repeated suffixes such as `Shard`, `Seal`, `Lens`, `Key`, and `Lattice`
  should be used only when they describe genuinely different forms.

## Card Lore Voice

Artifact flavor text follows a two-beat rule:

1. State what the Artifact does in language a new player can understand.
2. End with one image, consequence, or unanswered detail that restores mystery.

Card lore should usually be 15-25 words and never exceed 30 without a specific
reason. It should not repeat the Artifact's full technical role, explain the
entire civilization that built it, or use scientific terminology where an
ordinary physical description is clearer. Mystery comes from what remains
unexplained after comprehension, not from making the first sentence obscure.

## Blueprint Composition Rules

Blueprints are defined by **secret synthesis**, not by being the largest object
in the setting.

Every Blueprint recipe must form a readable causal chain:

```text
source or feedstock -> control or containment -> transformation -> output or consequence
```

Each required Artifact must supply one indispensable step. Removing any one
ingredient should make it immediately understandable why the project fails.

### Recipe Size

| Blueprint class | Typical recipe |
|---|---|
| Foundation infrastructure | 3 Tier I Artifacts |
| Dangerous or high-impact device | 3 Tier I + 1 Tier II Artifact |
| Stellar secret project | 4 Artifacts, usually including Tier II |
| Boss or transcendent project | 4-5 Artifacts, potentially including Tier III |

Recipe size follows conceptual and balance needs; four is not a universal rule.

### Recipe Distribution

- Opening-pool recipes are disjoint so one intercepted Artifact does not block
  every Lumii strategy.
- Outside the opening pool, one Artifact may appear in at most two canonical
  recipes unless a campaign explicitly makes it a contested keystone.
- Recipes should not cluster all component bonus Affinities without a strong
  thematic reason.
- Ingredient purchase costs should be simulation-tested as a group. Affinity
  affordability matters more than artificial identity overlap.
- Exact required Artifacts are owner-visible. The completed device and its
  public rule become visible on manifestation.
- Components remain normal forged Artifacts unless an individual Blueprint
  explicitly consumes or Annihilates them.

## Optimized Tier III Roster

The twenty Tier III slots now represent complete Type III achievements.

| ID | Canonical name | Public achievement | Primary function |
|---|---|---|---|
| t3r01 | Ignition Reliquary | A galactic network preserving and restarting stellar ignition lineages | stellar ignition continuity |
| t3r02 | Extinction Furnace | A governed system for dismantling terminal stars and failed megastructures | terminal-system disassembly |
| t3r03 | Chronoflare Array | A relativistically synchronized network for releasing stellar energy across galactic distances | synchronized galactic power |
| t3r04 | Star-River Crucible | An interstellar industrial river that turns stellar feedstock into habitats and world-scale works | living megastructure fabrication |
| t3s01 | Wormgate Spine | The stable transit backbone joining inhabited regions of the galaxy | galactic transit |
| t3s02 | Recursive Commonwealth | A self-auditing continuity mesh that lets separated civilizations diverge and reconcile without civil war | distributed civic continuity |
| t3s03 | Extinction Archive | A living galactic record of civilizations, languages, failures, and unfinished warnings | extinct-civilization memory |
| t3s04 | Chronology Accord | The infrastructure and law that maintain a shared history across relativistic civilizations | galactic chronology |
| t3e01 | Worldroot Lattice | A routed network of compatible biospheres spanning inhabited worlds | biosphere propagation |
| t3e02 | Stellar Overgrowth | Living stellar infrastructure that turns light, radiation, and orbital matter into habitat | star-integrated ecology |
| t3e03 | Interstellar Necrobiome | A distributed ecology that converts dead systems into safe feedstock for new life | galactic ecological recovery |
| t3e04 | Biosphere Concordance | A biological compatibility network that lets alien ecologies exchange resources without homogenization | ecological coexistence |
| t3o01 | Cryptobiotic Constellation | A concealed network of dormant refuge worlds and recoverable biospheres | hidden biosphere preservation |
| t3o02 | Collapse Mandala | A distributed containment work that arrests and studies gravitational and civilizational collapse | collapse containment |
| t3o03 | Ordered Silence | A galaxy-scale discipline of signal suppression, decoys, and protected quiet corridors | galactic concealment |
| t3o04 | Dark-Sector Aperture | A vast observatory boundary through which dark sectors can be studied without opening unrestricted passage | forbidden-sector observation |
| t3p01 | Galactic Concordance | A multi-species institution whose law is verified and enforced across inhabited systems | plural legitimacy |
| t3p02 | Relic Forge Commons | A transparent galactic manufacturing network for civilization-altering works | accountable relic manufacture |
| t3p03 | Matrioshka Chorus | A federation of star-scale minds that compute together without collapsing into one authority | galactic computation |
| t3p04 | Witness Constellation | Independent stations that preserve evidence, identity, and rights across species and regimes | public verification |

This roster intentionally avoids ruler-language such as `Sovereign`, `Crown`,
and `Absolute`. Luminaries own personified destiny. Tier III Artifacts own the
works civilizations leave behind.

## Tier I and II Audit Corrections

Most of the utility-first roster passes the acceptance test. The following
changes repair actual gaps or scale violations without churning strong cards.

### Conceptual replacements

| ID | Previous name | Canonical name | Reason |
|---|---|---|---|
| t1s02 | Causal Ember Relay | Mantlelift Driver Coil | Replaces a redundant causal relay with the missing planetary-to-orbit lift technology |
| t1o05 | Scorch-Erasure Seal | Blackglass Forge Die | Replaces a second trace-erasure protocol with a necessary vacuum-fabrication tool |

### Presentation corrections

These remain the same technologies, but their card art must depict an Artifact
or subsystem rather than a completed facility:

- t1r07 Entropy Pyre Baffle
- t1s04 Time-Crystal Scaffold
- t1e07 Lichen Vein
- t1p08 Petrified Bloom
- t2r06 Entropy Sink Crucible
- t2s03 Simulation Loom
- t2s06 Convergence Lens
- t2e05 Epoch Graft Ledger
- t2e06 Crystal Biome Seedplate
- t2o06 Dimensional Shear Gauge
- t2p01 Containment Lattice
- t2p05 Error-Correcting Core

The large Starlift Nozzle at t2r03 remains valid because the image represents
one bounded nozzle subsystem rather than the completed starlifting industry.

## Opening Blueprint Pool

The opening Lumii encounter uses three disjoint recipes.

### Antimatter Detonator

```text
Ignition Kernel -> Magnetic Bottle -> Causal Spark Coil -> Horizon Extractor
reaction          containment       governed trigger     annihilation boundary
```

This existing four-component recipe remains canonical.

### Mantle-to-Orbit Foundry

```text
Entropy Pyre Baffle -> Mantlelift Driver Coil -> Blackglass Forge Die
heat routing           orbital material lift      vacuum manufacture
```

All three are Tier I. The Blueprint supplies the mine, launch architecture,
orbital yards, and integration knowledge; the Artifacts supply the three
technologies without which that chain cannot function.

### Worldshield Covenant

The Worldshield recipe remains pending its dedicated effect and card pass. It
must use no Artifact from the two recipes above. Its required causal chain is:

```text
early warning -> concealed defense -> public verification or binding law
```

## Implementation Boundaries

This pass changes technology canon and presentation metadata. It does not:

- rebalance Artifact costs or Eminence
- add individual Artifact effects
- consume Blueprint components by default
- alter Blueprint visibility or manifestation timing
- regenerate card artwork automatically

Artwork that no longer matches the canonical scale enters a deliberate
regeneration queue. Runtime names and lore may advance before those assets, but
the dev card browser should treat mismatched art as provisional.
