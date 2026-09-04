# LUMINAe Civilization Artifact Capabilities v1.0

## Status

Adopted Civilization semantic doctrine and shared implementation reference.

This document resolves the Artifact-ontology and capability-tag decisions that
were deferred by the Civilization implementation audit. It does not change
Artifact costs, bonuses, tiers, Eminence, Forge rules, or Blueprint recipes.

The compile-time source of truth is:

```text
lib/game-types/src/civilization-capabilities.ts
```

## Authority

This decision reconciles:

1. `LUMINAe_LORE_BIBLE_v1.0.md`
2. `LUMINAe_CIVILIZATION_SYSTEM_GUIDE_v1.0.md`
3. `LUMINAe_TECHNOLOGY_SYSTEM_v2.0.md`
4. `LUMINAe_TECHNOLOGY_LINEAGE_MATRIX_v2.0.md`
5. the 90-card shared mechanical registry
6. the canonical Tier III bounded-keystone registry

Where old Tier III megastructure art or names disagree with Technology v2, the
Technology v2 bounded keystone is authoritative.

## Ontology Decision

The governing model is:

```text
Artifact:
A translated capability class openly mastered by a civilization.

Forge:
Architect-assisted acceleration to first operational mastery during the
observed epoch.

Implementation:
One local, embodiment-specific operational realization of that capability.

Damage:
Temporary disablement of the implementation.

Annihilation:
Permanent loss of the implementation, with discovery and recorded mastery
preserved.
```

Technology v2 remains authoritative. The proposed catalytic model is not
adopted as a replacement because treating every Artifact primarily as a
catalyst would weaken the established distinction between bounded capability,
secret Blueprint knowledge, and public Manifested Project.

The proposal's useful insight is retained: the card identifies a translated
capability class, while its art and in-match implementation show only one local
embodiment. Different civilizations may realize the same capability in
radically different forms.

## Capability-Tag Role

Capability tags answer one question:

> What qualitative response can this civilization attempt while this Artifact
> implementation is operational?

They are:

- shared event-resolution hooks;
- qualitative rather than numerical;
- derived from canonical practical capability, not artwork scale;
- active only while an implementation is operational;
- limited to one or two per Artifact;
- reusable across tiers, Affinities, and lineages.

They are not:

- extra printed Artifact powers;
- automatic bonuses or Stability points;
- prerequisites for ordinary Forge actions;
- substitutes for Blueprint recipes;
- a hidden technology tree;
- moral classifications;
- evidence of Civilization Maturity by themselves;
- inferred from held Affinities, Singularity, Artifact tier, or depiction scale.

The practical-capability sentence remains the precise fiction. A tag groups
different technologies only where they provide a genuinely comparable response
affordance.

## Bounded Vocabulary

| Capability | Qualitative affordance |
| --- | --- |
| Controlled energy | Initiate, govern, or release energetic processes within known limits. |
| Energy conversion | Convert biological, radiant, thermal, or other energy into usable work. |
| Thermal management | Route, contain, conceal, or reuse dangerous heat and entropy flows. |
| Resource extraction | Recover usable matter or nutrients from difficult physical environments. |
| Resource reclamation | Return waste, decay products, or failed-system matter to useful service. |
| Material engineering | Create or characterize materials with unusual structural properties. |
| Precision fabrication | Produce reliable components or structures under demanding conditions. |
| Transit and navigation | Move matter safely or derive routes across difficult distances or boundaries. |
| System stabilization | Hold a physical, informational, or civic system near a safe operating state. |
| Hazard containment | Bound dangerous matter, energy, information, or environmental processes. |
| Failure isolation | Prevent one failure from cascading into adjacent systems or populations. |
| Ecological adaptation | Help living systems remain viable under unfamiliar or changing conditions. |
| Ecological recovery | Repair damaged ecologies, living infrastructure, or biological interfaces. |
| Ecological propagation | Replicate or establish bounded living systems in viable environments. |
| Ecological shutdown | Place living systems into controlled dormancy, decomposition, or cessation. |
| Habitat engineering | Construct or encode environments that sustain sapient or ecological life. |
| Cross-ecology mediation | Enable exchange between incompatible living systems without assimilation. |
| Hazard detection | Detect dangerous changes early enough for a response to remain possible. |
| Boundary observation | Observe physical or categorical boundaries ordinary instruments cannot resolve. |
| Predictive modeling | Model consequential future states while preserving uncertainty and auditability. |
| Memory preservation | Keep identity, history, or environmental records intact across disruption. |
| Information recovery | Recover useful meaning from damaged, vanished, or incomplete records. |
| Signal interpretation | Separate, translate, or classify signals without collapsing meaningful difference. |
| Evidence verification | Produce or test evidence independent parties can inspect and authenticate. |
| Temporal coordination | Coordinate action or records across long, unequal, or relativistic timescales. |
| Distributed coordination | Coordinate resources, computation, or institutions across separated nodes. |
| Secure communication | Exchange authenticated signals while protecting participants or channels. |
| Concealment | Suppress a detectable signature without erasing the underlying system or record. |
| Controlled shutdown | Terminate a dangerous automated or informational process without uncontrolled spread. |
| Plural governance | Coordinate binding decisions while preserving the agency of unlike participants. |
| Resilient computation | Maintain correct computation across noise, distance, failure, or incompatible substrates. |
| Record governance | Control custody, disclosure, reconciliation, or rights within consequential records. |

The vocabulary is closed for v1. New tags require a canon review showing that
no existing tag can express the response affordance without becoming
misleading.

## Assignment Rules

Each of the 90 Artifact IDs has one or two explicit tags in the shared catalog.
Assignments follow these rules:

1. Start from the canonical practical-capability sentence.
2. Use form and lineage as supporting evidence, never as an automatic mapping.
3. Prefer the minimum tag set that preserves the Artifact's useful response.
4. Do not add a tag merely because a lower-tier antecedent has it.
5. Do not add a tag merely because a future Project uses the Artifact.
6. For Tier III, tag the bounded keystone, not the displaced Project artwork.
7. Preserve cross-Affinity equivalence where different disciplines can supply
   the same response.

## First-Pool Blueprint Coherence

The first-pool component sets validate the vocabulary without turning tags into
recipes:

| Project | Component capability pattern |
| --- | --- |
| Antimatter Detonator | Controlled energy, failure isolation, hazard containment, and boundary observation. |
| Mantle-to-Orbit Foundry | Thermal management, reclamation, transit, and precision fabrication. |
| Ascension Registry | Evidence verification, signal interpretation, controlled shutdown, and governed ignition records. |
| Worldshield Covenant | Hazard detection, concealment, system stabilization, and distributed coordination. |

Blueprint manifestation still depends only on exact component IDs. Capability
tags explain why the synthesis is credible; they do not create alternative
recipes.

## Lifecycle Semantics

Operational capability derivation follows implementation state:

| Implementation state | Capability active? | Historical mastery preserved? |
| --- | --- | --- |
| Operational | Yes | Yes |
| Damaged | No | Yes |
| Archived | No | Yes |
| Annihilated | No | Yes |
| Unknown legacy state | No | Yes when recorded or truthfully inferred |

Manifested Projects contribute their separately authored Project capabilities
only while their public device state is operational. A recovering Foundry and a
Spent Project do not contribute an active Project capability.

## Deliberately Unresolved Here

This doctrine does not select:

- which capabilities answer each pressure tag;
- Affinity or dyad pressure matrices;
- Stability weights or thresholds;
- Maturity evidence requirements;
- probability modifiers;
- Chronicle-specific trajectories;
- final Civilization Record or Lume formulas.

Those systems may consume this catalog, but must not silently reinterpret it.

## Validation Contract

Automated checks must enforce:

- exactly 90 Artifact assignments;
- every Artifact has one or two tags;
- every tag belongs to the closed vocabulary;
- every vocabulary entry is used;
- no Artifact repeats a tag;
- only operational implementations contribute active capabilities;
- visual selectors consume the shared metadata rather than deriving capability
  from card art, trait, tier, or Affinity.
