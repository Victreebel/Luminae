# LUMINAe Technology System v2.0

## Status

**Canonical technology doctrine; Artifact–Blueprint distinction revised
2026-09-28.** This document supersedes `LUMINAe_TECHNOLOGY_SYSTEM_v1.0.md`.
The former restriction of Tier III to small keystones is superseded: a complete
galactic work can be an Artifact. Historical documents remain for provenance.

The [all-tier audit](LUMINAe_ALL_TIER_ARTIFACT_AUDIT_v1.0.md) is the current 90-card decision and implementation record. Earlier Tier III records preserve provenance. Shared canon owns current identities, functions, and Event metadata; future Project examples remain design concepts rather than new game rules.

The authoritative runtime registry is `@workspace/game-types`. Artifact IDs,
costs, bonus Affinities, Eminence, and career counts are preserved.

Authority order is: Lore Bible for ontology, this document for Artifact
semantics, Blueprint First Pool v2 for exact Project rules, mapping and
Civilization guides for implementation explanation, and Unified Reference as a
synchronized compilation.

## Core Distinction

```text
Artifact = openly mastered capability, represented by one operational implementation
Blueprint = owner-private synthesis knowledge
Manifested Project = the public result of completing a Blueprint
```

An Artifact proves that a civilization can perform a defined technological
operation. Bounded function does not mean a small object or an unfinished
component: a working transit network, living stellar habitat system, or
federation of star-scale computers can be a complete Artifact achievement.
If the implementation is lost, its current bonuses are lost; the
Archive still records that the capability was discovered.

A Blueprint is not a fourth Artifact tier. It is a secret plan that makes an
exact set of forged Artifacts operate together. Its completion creates a public
Manifested Project with a form and scale:

- Forms: Device, Infrastructure, Network, Institution, or Organism.
- Scales: Planetary, Stellar, Galactic, or Transcendent.

Tier describes the operational reach of mastered technology. A Blueprint
describes specialized synthesis knowledge that makes an exact set of mastered
capabilities perform a distinct operation together. A Manifested Project is
the working result, at any supported scale. Neither impressive size nor having
technological antecedents is sufficient to make something a Blueprint.

A Project recipe must explain the indispensable causal contribution of each
required Artifact and the new operation their particular synthesis enables.
Complete works contribute their services, outputs, infrastructure, or expertise;
they need not fit on a workbench or be physically consumed. Exact recipe and
lifecycle behavior remain governed by Blueprint First Pool v2.

Review every proposed Artifact and Project against three questions:

1. What useful capability is already operational when this Artifact is Forged?
2. Why does that capability deserve its planetary, stellar, or galactic Tier?
3. What distinct operation does the Blueprint enable, and why is each ingredient
   indispensable to that particular synthesis?

## Affinity Commitment And Artifact Signatures

Affinity is finite Domain addressability, not consumable fuel. Harnessing
stabilizes uncommitted possibilities; the interface permits a civilization to
hold ten at once. Forging commits the paid possibilities to centuries of
accelerated research, construction, coordination, and adoption. Once the
implementation sustains itself, every Affinity actually paid, including a
Singularity substitution, returns to its matching Well channel. The Artifact's
permanent bonus represents the expertise, infrastructure, and institutions
left behind.

Every Artifact class has one universally recognizable **Artifact signature**
and potentially many local embodiments. First operational mastery produces
Domain-local **signature interference**, delaying accelerated mastery of that
same class elsewhere for centuries or beyond the observed epoch. Interference
does not affect related technologies, `Built On` lineages, or ordinary
independent discovery. A Forge refill reveals the next reachable possibility;
it does not assign ownership of an idea.

Use `commit`, `master`, and `implement` for Artifacts. Reserve `manifest` for a
Blueprint becoming a public Project. Do not use `wake` for signature
interference in player-facing copy.

## Canonical Artifact Lifecycle

| Lifecycle | Technology state |
|---|---|
| **Forge** | Operational mastery and signature interference. |
| **Encrypt** | Uncommitted pathway isolated for an Architect; no mastery signature. |
| **Burn** | Unmastered pathway collapsed for the epoch; recurrence may restore it. |
| **Assimilate** | Final Hunger converts the pathway into Affinity without a normal implementation. |
| **Damage** | Operation suspended; mastery and interference persist. |
| **Annihilate** | Implementation or near-complete pathway destroyed; discovery survives and the class remains unavailable this epoch. |
| **Foundry seal** | Mastery archived, operational bonus removed, active interference unwound, and pathway retained in Cipher storage for re-Forge. |

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

The [all-tier audit](LUMINAe_ALL_TIER_ARTIFACT_AUDIT_v1.0.md) is the current 90-card decision record.

### Tier I: Planetary Foundations

Complete useful planetary foundations, including local tools and planetary orbital infrastructure. No stellar control or unbounded power is implied.

### Tier II: Stellar Systems

Working technology that materially depends on stellar conditions, interplanetary dynamics, or coordinated multiworld service within one star system.

### Tier III: Galactic Achievements

A substantial regional galactic achievement with a specified result that independent stellar copies cannot provide: coupled regional operation, complementary resources or evidence, or survival beyond correlated stellar loss.

Galactic requires a regional result that isolated stellar copies cannot supply. Merely deploying the same machine at many stars is insufficient. It need not occupy every star or use instantaneous central control. Travel time, energy accounting, local autonomy, and unequal clocks remain real. Forging compresses the history of development and deployment.

### Current Runtime Roster — Galactic Achievements

| ID | Name | Practical capability | Mysterious implication |
|---|---|---|---|
| `t3r01` | Spiral-Arm Shepherd | Steers inhabited stars into safe migration corridors through a crowded galactic arm, using coordinated stellar thrust and long-horizon encounter forecasts. | One star refuses every safe trajectory. |
| `t3r02` | Stargrave Exchange | Restores depleted galactic regions by exchanging complementary feedstocks from unlike stellar remnants, containing hazardous residues throughout the supply chain. | One recovered alloy defeats every attempt to date it. |
| `t3r03` | Chronoflare Array | Schedules energy deliveries among a galactic arm's unequal stars, routing supply around exhausted systems through continually corrected emission and reception schedules. | The oldest receiver waits for a star now dark. |
| `t3r04` | Star-River Crucible | Builds inhabited staging fleets across an interarm void through mobile foundries sharing production state and recycling carried feedstock. | One assembly line still builds rooms for an absent species. |
| `t3s01` | Starway Spine | Coordinates galactic-arm transport through launch, navigation, braking, and alternate routes that preserve travel after entire stellar junctions fail. | The farthest beacon transmits an unfinished farewell. |
| `t3s02` | Recursive Commonwealth | Keeps public services interoperable across a galactic arm as stellar societies diverge, reconciling centuries-delayed civic records while preserving local decisions. | One founding vote survives in every language except its own. |
| `t3s03` | Extinction Archive | Reconstructs extinct galactic civilizations by cross-matching fragments scattered across thousands of systems, preserving the recovered histories in independent repositories. | Its newest translation ends with an unanswered question. |
| `t3s04` | Chronology Accord | Reconstructs galactic-arm causal histories from unequal stellar clocks, travel records, and delayed testimony, preserving genuinely unordered events. | Some witnesses lived the same century at different speeds. |
| `t3e01` | Worldroot Lattice | Establishes a self-sustaining biosphere migration front across a galactic arm through successive seed convoys and acclimation stations beyond the founding worlds' support. | The oldest convoy carries seeds nobody remembers collecting. |
| `t3e02` | Starborne Succession | Transfers inhabited collector ecologies between aging and younger stellar populations across galactic regions, preserving lineages after host-star loss. | Some carry dawns older than their present suns. |
| `t3e03` | Interstellar Necrobiome | Reclaims biospheres after regional extinction using complementary decomposers, nutrient-cycle organisms, and seed stocks preserved across a galactic arm. | Its flowers resemble letters from an extinct alphabet. |
| `t3e04` | Biosphere Concordance | Closes galactic-arm nutrient cycles through quarantined exchanges among independently evolved biospheres; no single biosphere can complete the cycle. | One exchange produces a scent neither species can name. |
| `t3o01` | Cryptobiotic Constellation | Preserves dormant civilizations beyond shared stellar hazards across galactic regions, maintaining independent revival paths after entire clusters perish. | Some sleepers have outlasted the names of their worlds. |
| `t3o02` | Collapse Mandala | Cuts infected transport and automation routes between stellar clusters across a galactic arm, containing regional cascades while isolated junctions preserve safe local service. | An abandoned junction still refuses every connection. |
| `t3o03` | Ordered Silence | Conceals authenticated messages through timed galactic-arm relays and decoys, defeating observers who combine evidence gathered at many stars. | One empty relay still authenticates a vanished city's call. |
| `t3o04` | Dark-Sector Aperture | Combines time-calibrated observations across a galactic arm into a three-dimensional dark-matter map, separating local disturbances from the galaxy's shared gravitational structure. | One shadow remains after every known source is removed. |
| `t3p01` | Galactic Concordance | Operates galactic-arm treaty ports through verifiable consent and delayed arbitration, sustaining shared services beyond any common live government. | One vacant berth still receives its share of sunlight. |
| `t3p02` | Relic Reconstruction Commons | Reconstructs lost galactic technologies whose surviving fabrication steps are scattered among stellar cultures, joining independently verified processes into complete working machines. | Every foundry preserves a step its makers cannot explain. |
| `t3p03` | Matrioshka Chorus | Combines conscious stellar swarms through shared correction state for galactic computations whose working data exceed one star's computing resources. | A silent member still appears in every roll call. |
| `t3p04` | Witness Constellation | Preserves authenticated testimony throughout a galactic arm, keeping destroyed or captured civilizations represented by evidence beyond their attackers' local reach. | One testimony names a witness no archive can locate. |

Card lore states one concrete practical function followed by one mysterious implication. Function must make Event capabilities and dependencies reasonably predictable. Mystery adds uncertainty without granting hidden powers, vulnerabilities, or retrocausality. Tutorial, Chronicle, Vault, Lumii, and player-response copy remain governed by the Dialogue Authorship Contract; card migration does not authorize dialogue edits.

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

Tier III artwork depicts the functioning galactic achievement through a legible
exemplary installation, its activity, and credible scale cues. Distributed works
may use perspective compression, but must retain physical hosts and cannot
become a solid object surrounding a galaxy. Keys, seals, wafers, or generic
glowing cores cannot substitute for the achievement itself.

Artifacts and Manifested Projects may both be visually spectacular. Project
artwork communicates the distinct result of its synthesis; greater size is
not its defining visual requirement. The twenty galactic card assets are generated and connected through the shared
runtime art manifest. Source images, prompts, and compact runtime WebPs are
retained together for reproducibility.

Production uses compact WebPs; source PNGs, verified concept assets, Blueprint
3D models, and cinematic audio are loaded only where required. Verify asset
availability before claiming that a historical image has been preserved.
