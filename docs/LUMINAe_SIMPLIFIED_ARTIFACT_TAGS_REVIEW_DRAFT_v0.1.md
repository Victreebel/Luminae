# LUMINAe Simplified Artifact Tags — Review Draft v0.1

Date: 2026-09-28

Status: **Public Function (Capability) classification adopted; mechanical migration remains a proposal.** The owner has chosen broad function tags on individual Artifacts, with tier as a targeting filter, and requested those tags in every Artifact info panel. The eight definitions and 90 assignments below now supply the shared public catalog. The Event rewrites and Maturity changes remain proposed balance changes; they have not been activated.

Implementation update (2026-09-28): `lib/game-types/src/artifact-functions.ts` defines the shared eight-tag catalog and explicit one-or-two-tag assignments for all 90 Artifacts. `ArtifactFunctionTags` displays those tags without a lore-network request in the game/card browser, Account Archive, tutorial action sheet, Blueprint component dossier, Civilization dossier, and both Civilization developer inspectors. Unknown and concealed IDs expose no tags. Existing narrow capabilities and dependencies remain inspectable under **Current rule details**, because Event, Maturity, pressure, and Chronicle mechanics still use those rules. This is public classification and info-panel adoption, not a completed rules migration.

## Decision in one page

Use one public vocabulary of eight functions. Give every Artifact one or two function tags beneath its lore. Its tier continues to state technological reach. Artwork and Civilization scenes communicate physical embodiment; scene changes create no new targets or bonuses.

Events state the complete targeting and response rule using these tags, tier, and ordinary public state. Remove the separate dependency vocabulary and the primary/supporting response matrix from the simplified rules profile. Do not keep the 32 old capabilities secretly deciding the same new rules.

Keep the current Artifact identities, lore, artwork, printed costs, Affinity bonuses, Eminence, and exact Blueprint recipes. This draft does not alter approved tutorial, Chronicle, Vault, Lumii, or player dialogue. Existing matches and historical receipts retain their original rules profile.

## Eight function tags

| Tag | Public meaning | Assignment boundary |
|---|---|---|
| Energy | Produces, stores, converts, or delivers energy, or manages waste heat. | Handling light or heat incidentally is insufficient. |
| Materials | Extracts, reclaims, engineers, or fabricates useful matter. | A metal or crystal body alone is insufficient. |
| Mobility | Transports cargo, populations, or habitats, or establishes their routes. | Messages alone are not transport. |
| Ecology | Sustains, restores, adapts, or manages living systems and habitats. | Being made from living material alone is insufficient. |
| Information | Observes, computes, interprets, verifies, preserves, or reconstructs knowledge. | Using a computer incidentally is insufficient. |
| Coordination | Organizes timing, shared work, services, resource agreements, or institutions. | Local control of a single machine alone is insufficient. |
| Protection | Stabilizes, contains hazards, isolates failures, or restores safe operation. | Detecting a hazard without acting on it is Information. |
| Security | Conceals signatures or protects access, custody, and authenticated exchange. | Protection addresses failure and hazards; Security addresses exposure, access, and trust. |

Both tags count equally; there is no primary/secondary mechanical weighting. A second tag needs a distinct supported function. Material composition, Affinity color, artwork scale, and mystery language do not supply tags. Neither Protection nor Security grants passive immunity: an Event must explicitly reference it.

## Shared Event rules in the proposed profile

- A qualifying Artifact is Forged and operational unless an Event explicitly names another zone or condition. Encrypted Artifacts do not supply public function responses.
- A tag match is presence-based. Owning several qualifying Artifacts does not multiply a reward unless the Event explicitly says so.
- “Newest” means most recently Forged among the eligible candidates. Already damaged Artifacts are not selected again by operational-only damage effects. With no candidate, nothing is damaged.
- An Event's tier governs its deck and presentation, not an implicit restriction on which Artifact tiers it affects. Any target-tier restriction must be printed.
- Damage retains Affinity bonuses, suspends operational responses and contribution to new Blueprints and Legacy qualification, and uses the existing repair queue. It does not dismantle a completed Project.
- Existing hand limits, Well limits, seating order, marked-Forge exclusions, and deterministic tie rules remain explicit where applicable.
- Tags describe broad functions. An Event represents disruption to the district or equivalent service; it does not claim every technology in a category has the same physical mechanism.

## Event-by-Event proposal

The current source has **10 definitions**, not 10 Events in the regular pool: seven regular Events, one historical Event excluded from regular play, and two unpublished pilots. Earlier conversational examples described implemented mechanics without making those availability limits clear. This draft distinguishes them.

Keep the seven regular effects for the first comparison. Rewrite the three capability-dependent definitions for a controlled simplified-rules preview. A later release can deliberately select a new shared pool; this document does not enable the pilots automatically.

### Affinity Bloom — Tier 1

Current availability: Regular pool.

Current rule: Each player gains 1 of their least-held standard Affinities available in the Well, up to the 10-Affinity limit. Ties follow Well order.

**Proposal:** Retain this rule for the initial comparison. It already uses public state or tier and needs no fine-grained capability or dependency lookup.

### Orbital Drift — Tier 1

Current availability: Regular pool.

Current rule: The leftmost unmarked Planetary Artifact returns to the bottom of its Archive. Reveal its replacement in the Forge.

**Proposal:** Retain this rule for the initial comparison. It already uses public state or tier and needs no fine-grained capability or dependency lookup.

### Stellar Containment Cascade — Tier 2

Current availability: Historical general_v1 pool; excluded from current regular pool.

Current rule: Each civilization answers Disruption with its operational technologies.

**Proposed preview rule:** Each player with an operational Protection Artifact is unaffected. Each other player damages their newest operational Artifact. If none qualifies, nothing is damaged.

**Change:** Replaces primary/supporting/none coverage and homeworld disruption with a binary printed check and the established Artifact repair loop. This changes both eligibility and consequence; it is a prototype, not a balance-equivalent translation. Keep it outside the regular pool until damage frequency and Protection availability are tested.

### Affinity Inversion — Tier 2

Current availability: Regular pool.

Current rule: Each player holding 3 or more of one standard Affinity returns 2 of their most-held Affinity to the Well. Other players gain 1 of their least-held available standard Affinities, up to the hand limit. Ties follow Well order.

**Proposal:** Retain this rule for the initial comparison. It already uses public state or tier and needs no fine-grained capability or dependency lookup.

### Entropy Storm — Tier 3

Current availability: Regular pool.

Current rule: Each player returns up to 3 of their most-held standard Affinity to the Well and their oldest ordinary Encrypted Artifact to the bottom of its Archive. Foundry storage is unaffected. Ties follow Well order.

**Proposal:** Retain this rule for the initial comparison. It already uses public state or tier and needs no fine-grained capability or dependency lookup.

### System Shock — Tier 2

Current availability: Regular pool.

Current rule: Damage each player's most recently Forged operational Artifact. Damaged Artifacts keep their Affinity bonuses but cannot contribute to new Blueprints or Legacy Victory until repaired.

**Proposal:** Retain this rule for the initial comparison. It already uses public state or tier and needs no fine-grained capability or dependency lookup.

### Cosmic Reflux — Tier 3

Current availability: Regular pool.

Current rule: Return the oldest Burned Artifact of each tier from the Burn Pile to its Forge, replacing its leftmost unmarked Artifact if needed. Each player gains 1 Singularity from the Well, up to the hand limit.

**Proposal:** Retain this rule for the initial comparison. It already uses public state or tier and needs no fine-grained capability or dependency lookup.

### Fracture Wave — Tier 3

Current availability: Regular pool.

Current rule: Damage up to 2 of each player's highest-tier operational Artifacts, choosing the most recently Forged first within a tier. Damaged Artifacts keep their Affinity bonuses but cannot contribute to new Blueprints or Legacy Victory until repaired.

**Proposal:** Retain this rule for the initial comparison. It already uses public state or tier and needs no fine-grained capability or dependency lookup.

### Signal Clarity — Tier 1

Current availability: Unpublished lore pilot.

Current rule: Interference subsides. Each player with an operational signal-interpreting Artifact gains 1 of their least-held standard Affinities available in the Well, up to the hand limit. Each Artifact reads only its established domain. Resolve players in seating order; Affinity ties follow Well order.

**Proposed preview rule:** Each player with an operational Information Artifact gains 1 of their least-held standard Affinities available in the Well, up to the 10-Affinity limit. Resolve players in seating order; ties follow Well order.

**Change:** Broadens eligibility from signal interpretation to Information. The fictional benefit is clearer evidence reaching an information service, not universal signal-decoding powers. Multiple Information Artifacts still grant at most one Affinity per player.

### Synchronization Shear — Tier 2

Current availability: Unpublished lore pilot.

Current rule: Damage each player's most recently Forged unprotected operational Artifact that depends on coordination between separated active systems. An Artifact with its own resilient computation protects only itself and is skipped when selecting a target. If none qualifies, nothing is damaged. Damaged Artifacts retain Affinity bonuses but cannot contribute to new Blueprints or Legacy Victory until repaired.

**Proposed preview title:** Coordination Breakdown.

**Proposed preview rule:** Damage each player’s newest operational Coordination Artifact without a Protection tag. If none qualifies, nothing is damaged.

**Change:** Replaces the hidden synchronization dependency with the visible Coordination tag. Protection applies only to the candidate carrying that tag; a separate Protection Artifact does not shield it. The broader name accommodates interrupted schedules, services, and institutions without claiming that all require a common live clock. Both target membership and self-protection membership change and require playtesting.

## Civilization Maturity proposal

Use the same displayed function tags as the breadth measure; remove the separate capability-versus-domain vocabulary.

| Criterion | Current | Proposed |
|---|---|---|
| Stellar Artifact breadth | 6 distinct mastered implementations | 6 distinct mastered implementations |
| Stellar function breadth | 6 fine capabilities across 3 domains | 3 distinct function tags |
| Stellar foundation | At least one independent foundation signal | Retain the foundation rule, with the tag-based triad below |
| Galactic Artifact breadth | 12 distinct mastered implementations | 12 distinct mastered implementations |
| Galactic function breadth | 12 fine capabilities across 6 domains | 6 distinct function tags |
| Galactic foundations | At least two independent foundation signals | Retain |
| Galactic anchor | Galactic Project or qualifying distributed interstellar development | Retain, using the tag-based triad below |

The proposed interstellar preparation triad is **Mobility + Coordination + at least one of Energy, Ecology, or Materials**. These may be supplied by different Artifacts. This replaces narrow transit, timing/communication, and sustainment capability lookups. It broadens qualifying preparation, particularly for fabrication-based Materials: validate the pacing change rather than treating it as an exact substitution.

The foundation signals remain a qualifying manifested Project, a settled world, a network, or the preparation triad. The galactic anchor remains a Galactic Project, or the triad together with at least two qualifying Stellar Projects, at least two settled worlds, or one of each. Galactic qualification also requires the Stellar criteria. No extra fine-capability threshold remains behind the visible tags.

Historical mastery and current operation remain different assessments. Damage does not erase history, but damaged Artifacts do not contribute to Legacy eligibility. These lifecycle distinctions are not new player tag categories.

These are prototype thresholds. Removing the 6/12 fine-capability counts can accelerate progression even when 3/6 breadth thresholds are retained; compare progression timing before adopting them.

## Proposed catalog mapping

The following assignments use the current named Artifact and its existing functional lore. They are an explicit proposal, not an automatic rename of all old capabilities. The evidence column quotes existing functional text without changing it.

### Tier 1

| ID | Artifact | Proposed tags | Existing functional evidence |
|---|---|---|---|
| t1r01 | Ignition Kernel | Energy | A caged spark that lights furnaces and cities but refuses to spread. |
| t1r02 | Ashroot Bloom | Ecology | Pale shoots rise from soil too burned for life. |
| t1r03 | Chrono-Ember Core | Energy | It remembers when a fire must return, not how it burned. |
| t1r04 | Causal Spark Coil | Energy, Protection | Before it fires, the coil tests what the spark will cause. |
| t1r05 | Voidflare Cask | Energy, Protection | A sealed burst of light kept for the moment every other flame fails. |
| t1r06 | Photosynthetic Wick | Energy | This living wick stores sunlight and releases it as gentle heat. |
| t1r07 | Entropy Pyre Baffle | Energy | It channels dangerous waste heat into useful work. |
| t1r08 | Oathfire Igniter | Energy, Information | The igniter opens only before witnesses, turning flame into a public promise. |
| t1s01 | Echo Splinter | Information | A crystal splinter that hears a structure fail moments before it breaks. |
| t1s02 | Mantlelift Driver Coil | Mobility | This timed coil hurls sealed cargo from deep underground into orbit. |
| t1s03 | Null-Loop Anchor | Protection | It stops machines trapped in endless repetition. |
| t1s04 | Time-Crystal Scaffold | Materials, Coordination | A calibrated crystal frame synchronizes machines across a planetary installation, accounting for signal travel time. |
| t1s05 | Silent Recursion Rule | Information, Protection | A sealed protocol checks and repairs a machine's calculations without broadcasting its intermediate state. |
| t1s06 | Living Chronicle | Information | This living record grows new pages as its people change. |
| t1s07 | String-Scar Loom | Materials | The loom encodes precise building instructions in controlled defects along engineered material threads. |
| t1s08 | Root Memory Valve | Information, Security | A valve releases ancestral memories in survivable doses. |
| t1e01 | Replication Spore | Ecology | A spore bred to repair damaged land without taking it over. |
| t1e02 | Voidroot Tap | Materials | This root draws food from places light cannot reach. |
| t1e03 | Char Tendril | Ecology, Information | A black tendril searches burned ground for surviving life. |
| t1e04 | Climate Seed Die | Ecology | The die prints the first organisms needed to heal a damaged climate. |
| t1e05 | Facetcell Shard | Materials | Living crystal cells change their purpose as light passes through them. |
| t1e06 | Decay Lattice | Materials, Ecology | The lattice decides how quickly dead matter becomes food again. |
| t1e07 | Lichen Vein | Materials, Ecology | Engineered lichen grows through stone and closes its cracks. |
| t1e08 | Necrobloom Bed | Ecology | Dead soil enters the bed; pale life emerges. |
| t1o01 | Entropy Veil | Security | The veil hides the heat of failing machines until repairs arrive. |
| t1o02 | Horizon Lantern | Information | It glows beside boundaries that should not be crossed. |
| t1o03 | Ashen Hollow | Information | It preserves the empty shape left by something destroyed. |
| t1o04 | Undergrowth Silencer | Security | Living fibers smother sound and signals above hidden settlements. |
| t1o05 | Blackglass Forge Die | Materials | A blackglass mold that shapes metal perfectly in airless space. |
| t1o06 | Decay Network | Materials, Ecology | This buried web feeds decay back to whatever still lives. |
| t1o07 | Absence Shard | Materials, Information | The shard maps hidden voids inside engineered materials against a calibrated negative-space reference. |
| t1o08 | Temporal Erasure Seal | Information, Security | The seal restricts access to a dangerous hour's records while preserving the original evidence. |
| t1p01 | Correction Seed | Protection | Planted inside a damaged system, it guides the whole toward repair. |
| t1p02 | Still-Point Shard | Protection | The shard uses feedback to hold an instrument stable against vibration and drift relative to its mount. |
| t1p03 | Prismatic Hollow | Information | The prism checks incoming signals against trusted reference patterns, separating verifiable measurements from persuasive interference. |
| t1p04 | Magnetic Bottle | Protection | Magnetic fields hold star-hot plasma without walls. |
| t1p05 | Recursive Lens | Information | Before examining the world, this lens examines its own bias. |
| t1p06 | Living Lattice Node | Protection, Coordination | A living junction that lets buildings coordinate their own repair. |
| t1p07 | Void Prism | Information | The prism resolves faint radiation and field changes at the boundary of a shielded vacuum chamber. |
| t1p08 | Petrified Bloom | Information | A stone flower proving that life once survived here. |

### Tier 2

| ID | Artifact | Proposed tags | Existing functional evidence |
|---|---|---|---|
| t2r01 | Stellar Crucible | Materials | Refines matter lifted from the local star in shielded orbital furnaces, supplying the system's industries with continuously replenished alloys. |
| t2r02 | Eclipse Reserve Grid | Energy, Protection | Stores surplus solar energy as transportable fuel and maintains isolated reserves for shadowed habitats, preventing eclipse shortages from cascading between inhabited orbits. |
| t2r03 | Starlift Nozzle | Materials, Protection | This immense nozzle turns stellar fire into a controlled stream of raw material. |
| t2r04 | Living Dyson Orchard | Energy, Ecology | Grows inhabited photosynthetic collector swarms around one star, converting harvested light into heat and chemical reserves for the system's habitats. |
| t2r05 | Coronal Safety Governor | Energy, Protection | Governs stellar extraction and power-beam shutdowns using predicted exposure at inhabited orbits, preventing a safe local release from striking another world. |
| t2r06 | Heliosphere Heat Cascade | Energy | Routes industrial waste heat through successively colder orbital stages, extracting useful work before outer-system radiators emit the remainder to space. |
| t2s01 | Orbital Transfer Loom | Mobility, Information | Maintains corrected gravity-assist routes between moving planets, catching transfer windows and rerouting convoys when orbital resonances drift. |
| t2s02 | Storm-Memory Filament | Information | Combines archived solar storms with probes distributed around one star to warn inhabited orbits before charged-particle fronts arrive. |
| t2s03 | Orbital Causality Loom | Information | Tests competing models of planetary resonances and industrial mass transfers, exposing which proposed migrations would destabilize inhabited orbits within one star system. |
| t2s04 | Continuity Fleet | Mobility, Coordination | Carries whole societies between planets on slow migrations, maintaining distinct civic records and living institutions through generations in transit. |
| t2s05 | Mnemosyne Star-Index | Information, Coordination | Indexes independently dated records from planets and habitats around one star, keeping different observations comparable without imposing a single authoritative account. |
| t2s06 | Heliosphere Discriminator | Information | Separates overlapping stellar-plasma, industrial-beam, and magnetospheric signals, warning when their interference makes navigation across the star system unreliable. |
| t2e01 | Solar Immune Canopy | Ecology, Protection | Maintains living shields and repair ecologies through stellar particle storms, preserving inhabited orbital belts beyond planetary magnetic protection. |
| t2e02 | Dormancy Clock Graft | Ecology, Coordination | Keeps interplanetary sleeper fleets alive through decades without resupply, timing ecological shutdown and revival against each destination world's orbital arrival window. |
| t2e03 | Sunless Habitat Chain | Ecology, Protection | Sustains quarantined settlements on sunless outer-system bodies by exchanging complementary chemical feedstocks among moons, comets, and sealed habitat ecologies. |
| t2e04 | Mycelial Relay Spindle | Ecology, Coordination | Translates biological and machine messages between the inhabited worlds of one star system, preserving ecological meaning across radio delays and incompatible hosts. |
| t2e05 | Biosphere Provenance Array | Information | Reconstructs interplanetary biological exchanges by cross-dating living archives, impact deposits, and transported specimens against distinct orbital histories. |
| t2e06 | Crystal Habitat Reef | Ecology, Materials | Grows self-repairing crystal-organic settlements from asteroid feedstock, maintaining sealed ecosystems along inhabited belts without importing planetary soil. |
| t2o01 | Horizon Extractor | Materials, Protection | Samples and diverts charged matter from a compact star's accretion flow through shielded stand-off collectors, containing unstable releases outside inhabited orbits. |
| t2o02 | Stellar Signal Quarantine | Protection, Security | Quarantines compromised instructions at interplanetary relay junctions, preserving inspectable records while preventing light-delay-separated worlds from repeating a dangerous command. |
| t2o03 | Eclipse Radiator Web | Energy, Security | Routes a star system's industrial waste heat into directional radiator corridors, reducing detection along selected approaches while still emitting the heat. |
| t2o04 | Worldfall Reconstruction Yard | Materials | Rebuilds a lost planet's essential industries in dispersed orbital yards using salvaged matter, surviving machine records, and feedstock from the system's other worlds. |
| t2o05 | Aphelion Reserve | Ecology, Protection | Cycles outer-system biospheres between growth and dormancy over extreme cometary orbits, preventing long dark seasons from exhausting stored nutrients. |
| t2o06 | Tidal Shear Observatory | Information | Maps changing tidal forces around a compact stellar companion, warning habitats and transfer fleets before their routes enter destructive gravity gradients. |
| t2p01 | Containment Lattice | Protection | Partitions stellar extraction and processing orbits into independently inspectable containment cells, preventing a failed plasma installation from spilling into neighboring inhabited routes. |
| t2p02 | Parallax Arbitration Array | Information, Coordination | Detects contradictions between planetary reference frames before navigation systems merge them, preventing a locally valid route from becoming a collision elsewhere. |
| t2p03 | Living Treaty Organ | Ecology, Coordination | Maintains resource agreements between the biospheres of one inhabited star system, translating local ecological needs into obligations each world can verify. |
| t2p04 | Heliostat Filament | Energy, Coordination | Coordinates mirror swarms around one star so changing beam paths illuminate working habitats without scorching intervening orbits. |
| t2p05 | Error-Correcting Core | Protection, Coordination | Maintains shared correction state across radiation-exposed stellar computers, reconciling delayed results while isolating damaged nodes. |
| t2p06 | Radiation Treaty Prism | Energy, Coordination | Allocates access to one star's light among inhabited orbits, reconciling competing illumination and radiation-shielding needs through agreements each habitat can inspect. |

### Tier 3

| ID | Artifact | Proposed tags | Existing functional evidence |
|---|---|---|---|
| t3r01 | Spiral-Arm Shepherd | Energy, Mobility | Steers inhabited stars into safe migration corridors through a crowded galactic arm, using coordinated stellar thrust and long-horizon encounter forecasts. |
| t3r02 | Stargrave Exchange | Materials, Protection | Restores depleted galactic regions by exchanging complementary feedstocks from unlike stellar remnants, containing hazardous residues throughout the supply chain. |
| t3r03 | Chronoflare Array | Energy, Coordination | Schedules energy deliveries among a galactic arm's unequal stars, routing supply around exhausted systems through continually corrected emission and reception schedules. |
| t3r04 | Star-River Crucible | Materials, Mobility | Builds inhabited staging fleets across an interarm void through mobile foundries sharing production state and recycling carried feedstock. |
| t3s01 | Starway Spine | Mobility, Coordination | Coordinates galactic-arm transport through launch, navigation, braking, and alternate routes that preserve travel after entire stellar junctions fail. |
| t3s02 | Recursive Commonwealth | Information, Coordination | Keeps public services interoperable across a galactic arm as stellar societies diverge, reconciling centuries-delayed civic records while preserving local decisions. |
| t3s03 | Extinction Archive | Information | Reconstructs extinct galactic civilizations by cross-matching fragments scattered across thousands of systems, preserving the recovered histories in independent repositories. |
| t3s04 | Chronology Accord | Information, Coordination | Reconstructs galactic-arm causal histories from unequal stellar clocks, travel records, and delayed testimony, preserving genuinely unordered events. |
| t3e01 | Worldroot Lattice | Ecology, Mobility | Establishes a self-sustaining biosphere migration front across a galactic arm through successive seed convoys and acclimation stations beyond the founding worlds' support. |
| t3e02 | Starborne Succession | Ecology, Mobility | Transfers inhabited collector ecologies between aging and younger stellar populations across galactic regions, preserving lineages after host-star loss. |
| t3e03 | Interstellar Necrobiome | Ecology, Materials | Reclaims biospheres after regional extinction using complementary decomposers, nutrient-cycle organisms, and seed stocks preserved across a galactic arm. |
| t3e04 | Biosphere Concordance | Ecology, Protection | Closes galactic-arm nutrient cycles through quarantined exchanges among independently evolved biospheres; no single biosphere can complete the cycle. |
| t3o01 | Cryptobiotic Constellation | Ecology, Protection | Preserves dormant civilizations beyond shared stellar hazards across galactic regions, maintaining independent revival paths after entire clusters perish. |
| t3o02 | Collapse Mandala | Protection | Cuts infected transport and automation routes between stellar clusters across a galactic arm, containing regional cascades while isolated junctions preserve safe local service. |
| t3o03 | Ordered Silence | Security, Coordination | Conceals authenticated messages through timed galactic-arm relays and decoys, defeating observers who combine evidence gathered at many stars. |
| t3o04 | Dark-Sector Aperture | Information | Combines time-calibrated observations across a galactic arm into a three-dimensional dark-matter map, separating local disturbances from the galaxy's shared gravitational structure. |
| t3p01 | Galactic Concordance | Coordination, Information | Operates galactic-arm treaty ports through verifiable consent and delayed arbitration, sustaining shared services beyond any common live government. |
| t3p02 | Relic Reconstruction Commons | Materials, Information | Reconstructs lost galactic technologies whose surviving fabrication steps are scattered among stellar cultures, joining independently verified processes into complete working machines. |
| t3p03 | Matrioshka Chorus | Information, Coordination | Combines conscious stellar swarms through shared correction state for galactic computations whose working data exceed one star's computing resources. |
| t3p04 | Witness Constellation | Information, Security | Preserves authenticated testimony throughout a galactic arm, keeping destroyed or captured civilizations represented by evidence beyond their attackers' local reach. |

## Coverage and balance questions

Counts are numbers of Artifacts carrying a tag, not additive powers. Two-tag Artifacts appear in two columns.

| Tag | Tier I (40) | Tier II (30) | Tier III (20) | Total (90) |
|---|---:|---:|---:|---:|
| Energy | 7 | 7 | 2 | 16 |
| Materials | 9 | 5 | 4 | 18 |
| Mobility | 1 | 2 | 5 | 8 |
| Ecology | 8 | 8 | 5 | 21 |
| Information | 14 | 8 | 8 | 30 |
| Coordination | 2 | 9 | 7 | 18 |
| Protection | 8 | 10 | 4 | 22 |
| Security | 4 | 2 | 2 | 8 |

There are 39 one-tag and 51 two-tag Artifacts. Signal Clarity would have 30 eligible card identities. Coordination Breakdown would have 16 unprotected candidate identities and 2 self-protected identities. These counts are catalog coverage, not in-game probabilities or simulated balance results.

Specific review points:

1. **Mobility and Security are scarce.** Do not force those tags onto unsuitable lore to equalize counts. Check whether distribution creates interesting choices or makes Maturity depend too heavily on particular draws.
2. **Protection versus Security needs a legible boundary.** Containing a malfunction is Protection; restricting access or concealing evidence is Security. No universal shield is implied by either label.
3. **Two-tag cards can advance breadth faster.** Their printed prices remain unchanged in this proposal. Measure acquisition and milestone timing before considering price changes.
4. **Information is broad.** It covers observers, archives, and computation. Signal Clarity must be understood as a benefit to that service category, not a claim that every archive can interpret every signal.
5. **The existing Event lineup does not exercise all eight tags directly.** In this first draft Information, Coordination, and Protection have direct Event hooks; the other tags contribute to breadth. Design additional Events only after these first interactions are understandable and balanced.
6. **Facetcell Shard exposes an existing evidence gap.** Existing rules assign resilient computation, but the short functional sentence only says its living crystal cells change purpose with light. This draft therefore proposes Materials alone. Review the loss of its former protective response without silently strengthening the lore to retain it.
7. **Scope-sensitive assignments require explicit review.** Chrono-Ember Core proposes Energy alone because scheduling one ignition is not coordinating separated operations; Root Memory Valve proposes Security for controlled disclosure; Continuity Fleet proposes Mobility + Coordination for moving societies with institutions; Matrioshka Chorus proposes Information + Coordination instead of retaining an implied self-protection tag; Witness Constellation proposes Information + Security for testimony preserved beyond attackers' reach. These are deliberate proposed meanings, not balance-neutral migrations.

## Implementation sequence after design review

1. Review definitions, the 90 assignments, and the three rewritten Event examples together. Resolve the flagged evidence gap. Then freeze a versioned proposed catalog.
2. Implement a versioned simplified rules profile shared by client and server: assignments, eligibility, deterministic selection, public receipts, Maturity, AI evaluation, and relevant scenario checks. Preserve old match profiles and saved Event plans. Never change an in-progress match by silently reading a new global catalog.
3. Update card/Archive inspections to show the same one or two tags and a concise tier label. Remove dependency chips and coverage jargon in the simplified profile. Keep targeting explanations available from Event inspection. This is the intended visible change; no UI change has been made by this draft.
4. Translate mechanical Chronicle preparedness requirements individually to the new tags or explicit public scenario conditions. Approved dialogue remains untouched; flag any narrative/mechanical mismatch for review rather than hiding a legacy tag requirement.
5. Run focused resolver, migration, damage/repair, Blueprint eligibility, Legacy, Maturity, and public-projection checks. Verify a mobile card inspector and the Event explanation. Run controlled matches comparing regular-only and pilot-enabled simplified pools against the existing profile.
6. Inspect target frequency, no-target frequency, reward frequency, repair burden, and turns to Maturity/Legacy. Choose the released Event pool and thresholds from that evidence. Broader Event expansion is a subsequent content task.

## Sources and verification

- Current Artifact IDs and printed mechanics: `lib/game-types/src/artifacts.ts`.
- Current names and quoted functional evidence: `lib/game-types/src/artifact-canon.ts`.
- Existing fine capabilities: `lib/game-types/src/civilization-capabilities.ts`.
- Existing dependency classification: `lib/game-types/src/artifact-event-facts.ts`.
- Event definitions, pools, and Maturity: `lib/game-types/src/index.ts`.
- Current targeted pilot resolution: `artifacts/api-server/src/lib/loreEventPlan.ts`.
- Existing deployment principles: `docs/LUMINAe_ARTIFACT_DEPLOYMENT_AND_EVENT_UPDATE_PLAN_v1.0.md`.

Document generation checked exactly 90 distinct current Artifact IDs, the 40/30/20 tier distribution, one or two valid nonduplicate tags per Artifact, and all 10 existing Event definitions. Coverage counts were computed from this proposed mapping. No gameplay implementation, simulation, or balance validation was performed for this draft.
