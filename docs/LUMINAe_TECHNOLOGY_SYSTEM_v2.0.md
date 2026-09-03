# LUMINAe Technology System v2.0

## Status

**Canonical technology doctrine.** This document supersedes
`LUMINAe_TECHNOLOGY_SYSTEM_v1.0.md` and any older note that treats a Tier III
Artifact as a finished megastructure. Historical documents remain in the
repository for design provenance.

The authoritative runtime registry is `@workspace/game-types`. Artifact IDs,
costs, bonus Affinities, Eminence, and career counts are preserved.

## Core Distinction

```text
Artifact = openly mastered capability, represented by one operational implementation
Blueprint = owner-private synthesis knowledge
Manifested Project = the public result of completing a Blueprint
```

An Artifact proves that a civilization can perform a bounded technological
operation. If the implementation is lost, its current bonuses are lost; the
Archive still records that the capability was discovered.

A Blueprint is not a fourth Artifact tier. It is a secret plan that makes an
exact set of forged Artifacts operate together. Its completion creates a public
Manifested Project with a form and scale:

- Forms: Device, Infrastructure, Network, Institution, or Organism.
- Scales: Planetary, Stellar, Galactic, or Transcendent.

Physical size alone never determines category. A compact stellar Device may be
a Blueprint, while a large but bounded stellar instrument may be a Tier II
Artifact. The test is whether the card represents a mastered capability or the
exceptional synthesis of several capabilities.

## Vocabulary

- Use **Tier** only for Artifacts.
- Use **Type** only for Kardashev advancement.
- Printed Affinity cost states which disciplines are required to implement a
  technology.
- Bonus Affinity states which discipline that implementation adds to the
  civilization.
- Artifacts have only cost, bonus Affinity, Eminence, and Blueprint eligibility
  as gameplay-facing properties. Lore relationships do not add prerequisites.

## Artifact Tiers

### Tier I: Planetary Foundations

Bounded capabilities that make reliable planetary industry and orbital work
possible: power components, materials, sensors, protocols, organisms,
fabrication tools, and civic instruments.

### Tier II: Stellar Systems

Capabilities requiring interplanetary logistics, stellar energy, durable
multi-world coordination, or system-scale observation. They remain bounded
systems or operational implementations rather than completed megastructures.

### Tier III: Galactic Keystones

Capabilities whose creation, validation, or maintenance requires active work
across multiple star systems. A Tier III Artifact is still an inspectable
keystone, not the galactic Project it may later enable.

| ID | Canonical name | Practical capability | Mysterious implication | Primary Project | Secondary Project |
|---|---|---|---|---|---|
| `t3r01` | Relicfire Interpreter | Translates alien ignition systems into safe startup sequences. | One extinct lineage asks whether the star consents. | Ignition Reliquary | Relic Forge Commons |
| `t3r02` | Terminal-System Reclaimer | Recovers useful matter and energy from dead systems without spreading their failure. | Some recovered elements have no known origin. | Extinction Furnace | Interstellar Necrobiome |
| `t3r03` | Chronoflare Phase Regulator | Synchronizes relativistic stellar events without forcing one universal clock. | Its final phase arrives before calibration. | Chronoflare Array | Chronology Accord |
| `t3r04` | Plural Habitat Forge Heart | Fabricates habitat cores compatible with unrelated forms of life. | One chamber prepares for an absent species. | Star-River Crucible | Stellar Overgrowth |
| `t3s01` | Voidline Route Solver | Computes traversable paths through regions where ordinary navigation fails. | It returns routes from places never surveyed. | Wormgate Spine | Dark-Sector Aperture |
| `t3s02` | Divergence Reconciler | Reconciles incompatible civic records without erasing their differences. | It preserves a decision nobody remembers making. | Recursive Commonwealth | Causality Audit Court |
| `t3s03` | Extinction Signal Decoder | Recovers meaning from signals made by vanished civilizations. | A few decoded messages receive new replies. | Extinction Archive | Interstellar Necrobiome |
| `t3s04` | Relativistic Chronology Governor | Lets distant systems share an ordered history across unequal clocks. | Several valid dates insist they came first. | Chronology Accord | Causality Audit Court |
| `t3e01` | Xenobiome Route Graft | Carries living material safely between incompatible ecologies. | Some grafts grow toward worlds not on any chart. | Worldroot Lattice | Biosphere Concordance |
| `t3e02` | Stellar Habitat Genome | Encodes habitats that adapt to different stars without becoming identical. | A dormant genome names a star not yet born. | Stellar Overgrowth | Star-River Crucible |
| `t3e03` | Extinction Immunome | Teaches living systems to survive failure patterns recovered from dead worlds. | It remembers an extinction that has not happened. | Interstellar Necrobiome | Cryptobiotic Constellation |
| `t3e04` | Biosphere Translation Membrane | Exchanges matter between alien ecologies without allowing either to consume the other. | Contact changes a third ecology no sensor can find. | Biosphere Concordance | Galactic Concordance |
| `t3o01` | Refuge Dormancy Kernel | Preserves a complete refuge biosphere through geological catastrophe. | Its waking signal comes from outside the map. | Cryptobiotic Constellation | Worldroot Lattice |
| `t3o02` | Collapse Forecast Engine | Predicts cascading physical, ecological, and civic failure. | Its safest branch contains no observers. | Collapse Mandala | Causality Audit Court |
| `t3o03` | Quiet-Signal Symbiont | Carries authenticated communication without revealing the sender's location. | Some replies originate inside the organism. | Ordered Silence | Cryptobiotic Constellation |
| `t3o04` | Null-Baseline Interferometer | Distinguishes true absence from insufficient observation. | Occasionally the absence observes back. | Dark-Sector Aperture | Collapse Mandala |
| `t3p01` | Plurality Accord Verifier | Tests whether unlike minds have given authentic consent. | One channel answers before it is queried. | Galactic Concordance | Biosphere Concordance |
| `t3p02` | Relic Provenance Standard | Verifies the material and procedural history of civilization-changing fabrication. | Every complete chain contains the same blank step. | Relic Forge Commons | Star-River Crucible |
| `t3p03` | Federated Logic Substrate | Lets star-scale minds exchange proofs without merging identities. | A proof remembers a thinker who never joined. | Matrioshka Chorus | Stellar Overgrowth |
| `t3p04` | Species-Rights Witness | Records identity and harm in forms unrelated species can verify. | A sealed channel records an unlocatable witness. | Witness Constellation | Galactic Concordance |

Each card presents one plain practical sentence followed by one mysterious
sentence, with a combined target of roughly 30 words.

## Discoverable Progression

Technology relationships are Archive lore, not mechanical prerequisites:

- `Built On` lists two or three immediate lower-Tier capabilities whose bonus
  Affinities appear in the target's printed cost.
- `Leads Toward` is the reverse relationship.
- Future Project leads stay classified until the corresponding campaign lead is
  discovered.

The exact graph is published in
`LUMINAe_TECHNOLOGY_LINEAGE_MATRIX_v2.0.md`.

## Kardashev Advancement

Kardashev Type describes civilizational reach and remains separate from Artifact
Tier.

- Type I: Forge the first Tier II, or Forge a Tier I using bonus Affinity.
- Type II: Forge the first Tier III, or Forge a Tier II using bonus Affinity.
- Type III: Forge a Tier III using bonus Affinity.

## Resolution Doctrine

The shared timing ladder is authoritative:

1. Validate the claim.
2. Consume the action.
3. Resolve Project interception.
4. Resolve payment and claim.
5. Resolve Project consequences.
6. Queue new manifestations in slot order.
7. Check victory.

`Forge`, `Encrypt`, `Claim`, `Burn`, `Annihilate`, `Nullify`, `Active`,
`Vigilant`, `Spent`, `Intact Covenant`, and `Broken Covenant` are defined in
the shared `TECHNOLOGY_RULE_TERMS` registry. UI rules text must derive from
that registry rather than inventing local meanings.

## Archive And Civilization Identity

The Archive records discovery, practical capability, concise lore, lineage,
Forge count, `Built On`, `Leads Toward`, Project leads, and complete rules.
Unknown names and art remain inaccessible classified redactions.

Technology identity uses twelve normalized lineages: Energy, Ecology,
Causality, Transit, Memory, Infrastructure, Concealment, Containment,
Fabrication, Accord, Reclamation, and Boundary Science.

Public civilization identity has the form `The [Affinity adjective] [Lineage
noun]`. Kardashev Type appears on its own line. A manifested Project may add an
optional epithet. Earned options unlock from lifetime mapped Forges and first
signature events; suggestions are not saved until confirmed.

The selected identity is snapshotted at Type advancement or Project
manifestation and preserved in Match Record.

## Presentation And Packaging

Tier III artwork depicts the bounded Artifact itself. The displaced v1 Project
art is preserved in the future Project concept vault and excluded from runtime
imports. Production uses compact WebPs; source PNGs, concept-vault art,
Blueprint 3D models, and cinematic audio are loaded only where required.

