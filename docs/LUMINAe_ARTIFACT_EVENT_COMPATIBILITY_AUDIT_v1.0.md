# LUMINAe Artifact Event Compatibility Audit v1.0

Date: 2026-09-27; semantic review updated 2026-09-28. Status: implemented mechanical classification review.

Scope update: this document preserves the v2 review as history. The subsequent [all-tier audit](LUMINAe_ALL_TIER_ARTIFACT_AUDIT_v1.0.md) supersedes conflicting functions and classifications across all 90 Artifacts. Current Event facts v4 use shared canonical functions, with 11 synchronization memberships and seven signal-interpretation responders.

All 90 Artifact records were reviewed against their effective practical function
and existing capability assignments. This adds explicit Event facts and public
mechanical explanations; it does not rewrite approved Artifact prose, add canon,
change printed bonuses or recipes, or recertify every historical lore document.
The [semantic consistency pass](LUMINAe_EVENT_SEMANTIC_CONSISTENCY_REVIEW_v1.0.md)
corrects eight capability assignments and one dependency while preserving the
one/two-capability limit. Their use remains
bounded by the Artifact's practical domain: a prediction is not prevention,
verification is not universal truth, and one kind of signal interpretation is
not universal decoding.

At the time of this v2 review, the runtime source was
[`artifact-event-facts.ts`](../lib/game-types/src/artifact-event-facts.ts), version
`artifact-event-facts-v2`. Memberships are explicit authored constants, never
keyword inference. Each row also freezes the reviewed capability list so tests
require renewed review if a future assignment changes.

## Sources and boundaries

- [Capability doctrine](LUMINAe_CIVILIZATION_ARTIFACT_CAPABILITIES_v1.0.md): qualitative,
  operational response hooks, bounded practical meaning, one/two capabilities.
- [Lore Bible](LUMINAe_LORE_BIBLE_v1.0.md): translated capability classes and varied
  local embodiments; discovery survives implementation damage; no backward information.
- [Authorship contract](LUMINAe_DIALOGUE_AUTHORSHIP_CONTRACT_v1.0.md): approved copy
  remains unchanged. Mechanical explanations here are not new narrative dialogue.
- [Earlier Event audit](LUMINAe_LORE_TARGETED_EVENTS_AUDIT_v1.0.md): capability,
  exposure, lifecycle, and mystery are different concepts.
- Tier I/II: effective `CARD_LORE` practical role and functional flavor sentence in
  [cardLore.ts](../artifacts/api-server/src/lib/cardLore.ts). The older utility-first
  table explains their provenance; current deployed wording is retained exactly.
- Tier III: current bounded-keystone `TIER_THREE_ARTIFACT_CANON` practical sentence
  in [technology.ts](../lib/game-types/src/technology.ts), which overrides historical
  megastructure literals in `cardLore.ts`. Displaced names/art are not evidence.

No reviewed fact is derived from Affinity, names, visual form, lineage, a future
Blueprint, a mystery sentence, or account/story progress. Physical appearances do
not create vulnerabilities. Facts describe a function an expressly authored Event
can interrupt; they are not generic fragility or unconditional susceptibility.
Operational state and Event-specific protection are resolved separately.

## Closed dependency fact

`dependency:distributed_synchronization` means coordinating separated active nodes
through shared timing, aligned control, or distributed correction state. It does
not demand one universal clock. Five memberships are justified: Time-Crystal
Scaffold, Living Lattice Node, Heliostat Filament, Error-Correcting Core,
and Chronoflare Phase Regulator. The other 85
are explicit reviewed exclusions, not missing metadata or presumed immunity.

A material-routing network, message relay, shared archive, social agreement,
proof exchange, or a named distributed observatory alone does not establish this
dependency. In particular, `distributed_coordination` capability is neither
necessary nor sufficient for this fact. A capability is what a technology enables;
a dependency is the narrower relationship a particular phenomenon can interrupt.

**Synchronization Shear premise:** interruption of these relationships can
plausibly suspend the selected implementation's coordination function. Its exact
bounded damage, selection order, and recovery are Event rules, not properties of
this catalog. The Error-Correcting Core's own `resilient_computation` provides a
credible self-response; this does not grant every technology in its civilization
immunity. A disconnected camera-scale illustration does not create a second target.

## Signal Clarity response review

The opportunity is reduced interference while each technology operates in its
own domain. It is not a universal alien-message challenge or an unlock of new
knowledge. All nine reviewed signal-interpretation assignments fit that premise:

| ID | Artifact | Bounded opportunity |
| --- | --- | --- |
| t1p03 | Prismatic Hollow | Clearer separation of honest signals from persuasive noise. |
| t1p05 | Recursive Lens | Clearer evidence for auditing the observation's own bias. |
| t1p07 | Void Prism | Clearer observation of its hidden void states. |
| t2s06 | Convergence Lens | Clearer distinctions where unlike things are forced together. |
| t2e04 | Mycelial Relay Spindle | Clearer translation among its biological and machine participants. |
| t2p02 | Null-Convergence Prism | Clearer detection of collapsed meanings. |
| t3r01 | Relicfire Interpreter | Clearer interpretation of alien ignition instructions. |
| t3s03 | Extinction Signal Decoder | Clearer recovery of meaning in extinct-civilization signals. |
| t3o04 | Null-Baseline Interferometer | Clearer separation of true absence from insufficient observation. |

The proposed reward remains capped per player regardless of how many responders
exist. These sources do not establish a general ability to decode any signal or
protect a neighboring technology from Synchronization Shear.

## Complete catalog review

The function column quotes existing practical text unchanged. The capability
rationale records why existing assignments remain credible within that function;
it is not additional prose canon. Every final column is an explicit inclusion or
exclusion for the single dependency above. IDs link to their effective source.

| ID / Artifact | Existing practical capability | Capability review | Synchronization dependency review |
| --- | --- | --- | --- |
| [t1r01](../artifacts/api-server/src/lib/cardLore.ts) — Ignition Kernel | controlled ignition and thermal regulation | Restrained ignition provides controlled energy; it does not establish universal containment. | Excluded: The local ignition function does not require agreement among separated active nodes. |
| [t1r02](../artifacts/api-server/src/lib/cardLore.ts) — Ashroot Bloom | post-burn ecological recovery | Post-burn regrowth supports ecological recovery even though its Affinity is Flare. | Excluded: Recovery of burned ground does not establish distributed timing or control. |
| [t1r03](../artifacts/api-server/src/lib/cardLore.ts) — Chrono-Ember Core | energy-memory synchronization | Returning fire at a remembered time combines controlled energy with temporal coordination. | Excluded: A remembered local ignition time does not establish coordination among separated nodes. |
| [t1r04](../artifacts/api-server/src/lib/cardLore.ts) — Causal Spark Coil | safe trigger sequencing | Testing consequences before a trigger combines controlled energy with failure isolation. | Excluded: Sequencing one trigger does not establish distributed coordination. |
| [t1r05](../artifacts/api-server/src/lib/cardLore.ts) — Voidflare Cask | volatile void-pressure ignition | Sealed volatile ignition combines controlled energy with hazard containment. | Excluded: Containing one reserve of energy does not establish distributed coordination. |
| [t1r06](../artifacts/api-server/src/lib/cardLore.ts) — Photosynthetic Wick | biological energy conversion | Storing sunlight and releasing heat supports energy conversion. | Excluded: Light-to-heat conversion does not require agreement among separated active nodes. |
| [t1r07](../artifacts/api-server/src/lib/cardLore.ts) — Entropy Pyre Baffle | waste heat and decay routing | Routing waste heat into useful work supports thermal management and energy conversion; this function does not establish material recycling. | Excluded: Heat routing alone does not establish synchronization among separated active nodes. |
| [t1r08](../artifacts/api-server/src/lib/cardLore.ts) — Oathfire Igniter | public sanctioned ignition | Witnessed, recorded ignition supports controlled energy and evidence verification. | Excluded: Public witnessing is not a distributed timing or control dependency. |
| [t1s01](../artifacts/api-server/src/lib/cardLore.ts) — Echo Splinter | event echo capture | Detecting imminent structural failure supports hazard detection without literal future information. | Excluded: A warning sensor does not establish shared control among separated active nodes. |
| [t1s02](../artifacts/api-server/src/lib/cardLore.ts) — Mantlelift Driver Coil | planetary-to-orbit mass acceleration | Timed acceleration of sealed cargo supports transit and navigation. | Excluded: Timing one launch does not establish synchronization among separated active nodes. |
| [t1s03](../artifacts/api-server/src/lib/cardLore.ts) — Null-Loop Anchor | recursion boundary control | Stopping unbounded machine repetition supports controlled shutdown. | Excluded: Stopping local recursion does not establish a distributed dependency. |
| [t1s04](../artifacts/api-server/src/lib/cardLore.ts) — Time-Crystal Scaffold | precision timing substrate | A specialized timing material makes distant machines agree on time, supporting material engineering and temporal coordination. | **Included**: Distant machines rely on this substrate to maintain shared timing. |
| [t1s05](../artifacts/api-server/src/lib/cardLore.ts) — Silent Recursion Rule | quiet error correction | Quiet error correction supports resilient computation; its unexplained spoken behavior is not an exposure. | Excluded: Error correction alone does not establish separated active nodes. |
| [t1s06](../artifacts/api-server/src/lib/cardLore.ts) — Living Chronicle | adaptive civic memory | Adaptive civic records support memory preservation and record governance. | Excluded: An evolving civic archive does not require separated nodes to maintain shared timing or control. |
| [t1s07](../artifacts/api-server/src/lib/cardLore.ts) — String-Scar Loom | defect-pattern weaving | Encoding exact manufacture through thread defects supports material engineering and precision fabrication. | Excluded: A manufacturing pattern does not establish distributed synchronization. |
| [t1s08](../artifacts/api-server/src/lib/cardLore.ts) — Root Memory Valve | selective memory release | Keeping and selectively releasing ancestral memories supports memory preservation and record governance. | Excluded: Selective memory release does not establish shared control across separated active nodes. |
| [t1e01](../artifacts/api-server/src/lib/cardLore.ts) — Replication Spore | controlled replication | Bounded replication repairs damaged land, supporting both ecological propagation and ecological recovery; its unexplained border behavior does not grant general immunity. | Excluded: Controlled replication does not establish live synchronization between replicas. |
| [t1e02](../artifacts/api-server/src/lib/cardLore.ts) — Voidroot Tap | nutrient extraction from hidden reservoirs | Recovering nutrients from inaccessible reservoirs supports resource extraction. | Excluded: Accessing hidden nutrients does not establish distributed coordination. |
| [t1e03](../artifacts/api-server/src/lib/cardLore.ts) — Char Tendril | post-fire ecological probing | Probing damaged ground identifies ecological conditions for recovery, supporting ecological hazard assessment and recovery. | Excluded: Ecological probing does not establish shared timing or control among separated active nodes. |
| [t1e04](../artifacts/api-server/src/lib/cardLore.ts) — Climate Seed Die | climate repair patterning | Producing organisms to repair climate supports ecological recovery. | Excluded: Climate repair patterns do not establish a distributed timing dependency. |
| [t1e05](../artifacts/api-server/src/lib/cardLore.ts) — Facetcell Shard | cellular optical computation | Reconfigurable cellular optical computation supports material engineering and resilient computation within that substrate. | Excluded: Optical computation does not establish physically separated coordinated nodes. |
| [t1e06](../artifacts/api-server/src/lib/cardLore.ts) — Decay Lattice | managed decomposition | Controlling decomposition and returning dead matter to food supports ecological shutdown and reclamation. | Excluded: Controlling decomposition rates does not establish shared timing across separated active nodes. |
| [t1e07](../artifacts/api-server/src/lib/cardLore.ts) — Lichen Vein | stone-life integration | Living integration with cracked stone supports material engineering and ecological recovery. | Excluded: Repairing stone through living growth does not establish distributed synchronization. |
| [t1e08](../artifacts/api-server/src/lib/cardLore.ts) — Necrobloom Bed | dead-biome reactivation | Reactivating dead soil supports ecological recovery and propagation; occasional memories are not an archive capability. | Excluded: Reactivating a biome does not establish coordinated timing among separated nodes. |
| [t1o01](../artifacts/api-server/src/lib/cardLore.ts) — Entropy Veil | decay masking | Masking heat signatures supports concealment; masking failure is not a source of repair. | Excluded: Concealing heat does not establish shared control across separated active nodes. |
| [t1o02](../artifacts/api-server/src/lib/cardLore.ts) — Horizon Lantern | dangerous boundary detection | Detecting unsafe boundaries supports hazard detection and boundary observation. | Excluded: Observing boundaries does not establish distributed synchronization. |
| [t1o03](../artifacts/api-server/src/lib/cardLore.ts) — Ashen Hollow | absence preserving imprint | Preserving a destroyed object's imprint supports memory preservation and information recovery. | Excluded: An imprint can be observed without synchronizing separated active nodes. |
| [t1o04](../artifacts/api-server/src/lib/cardLore.ts) — Undergrowth Silencer | biological noise suppression | Suppressing sound and signals supports concealment; living material does not imply ecological recovery. | Excluded: Suppressing signals is not evidence of maintaining shared timing or control. |
| [t1o05](../artifacts/api-server/src/lib/cardLore.ts) — Blackglass Forge Die | vacuum-stable precision forming | Reliable forming in vacuum supports precision fabrication. | Excluded: Precision forming does not establish a distributed coordination dependency. |
| [t1o06](../artifacts/api-server/src/lib/cardLore.ts) — Decay Network | distributed decomposition routing | Routing decomposition through a network supports reclamation and distributed coordination. | Excluded: A distributed material-routing web does not establish synchronized timing, alignment, or correction state. |
| [t1o07](../artifacts/api-server/src/lib/cardLore.ts) — Absence Shard | negative-space reference material | A reference for structural gaps supports material engineering and boundary observation. | Excluded: A reference material does not establish shared control across separated active nodes. |
| [t1o08](../artifacts/api-server/src/lib/cardLore.ts) — Temporal Erasure Seal | limited record redaction | Concealing, rather than destroying, a record supports concealment and record governance; its dates do not establish time travel. | Excluded: Record redaction does not establish a distributed synchronization dependency. |
| [t1p01](../artifacts/api-server/src/lib/cardLore.ts) — Correction Seed | error correction in growth or law | Guiding a damaged system toward repair supports system stabilization. | Excluded: System repair does not itself establish separated nodes sharing timing or control. |
| [t1p02](../artifacts/api-server/src/lib/cardLore.ts) — Still-Point Shard | local equilibrium anchor | Maintaining local equilibrium supports system stabilization. | Excluded: Its explicitly local equilibrium function does not establish distributed synchronization. |
| [t1p03](../artifacts/api-server/src/lib/cardLore.ts) — Prismatic Hollow | truth-sorting aperture | Separating meaningful signals from deceptive noise supports signal interpretation and evidence verification within the inspected signal. | Excluded: Sorting signals does not require separated nodes to maintain shared timing or control. |
| [t1p04](../artifacts/api-server/src/lib/cardLore.ts) — Magnetic Bottle | plasma or field containment | Magnetic confinement of plasma supports hazard containment; it does not imply a leak. | Excluded: Field containment does not establish distributed synchronization. |
| [t1p05](../artifacts/api-server/src/lib/cardLore.ts) — Recursive Lens | self-auditing perception | Auditing observational bias supports signal interpretation and evidence verification within the observation. | Excluded: Self-auditing observation does not establish separated active nodes sharing control. |
| [t1p06](../artifacts/api-server/src/lib/cardLore.ts) — Living Lattice Node | living civic coordination node | A junction coordinating buildings' repair supports system stabilization and distributed coordination. | **Included**: Buildings depend on this junction to coordinate their active repair state. |
| [t1p07](../artifacts/api-server/src/lib/cardLore.ts) — Void Prism | illumination of hidden void states | Making hidden void states observable supports boundary observation and signal interpretation, not universal message decoding. | Excluded: Observing hidden void states does not establish a distributed synchronization dependency. |
| [t1p08](../artifacts/api-server/src/lib/cardLore.ts) — Petrified Bloom | preserved life-pattern reference | A preserved life-pattern reference supports memory preservation without establishing living tissue. | Excluded: A preserved reference does not coordinate separated active nodes. |
| [t2r01](../artifacts/api-server/src/lib/cardLore.ts) — Stellar Crucible | star-powered materials processing | Processing stellar matter into specialized materials supports material engineering and precision fabrication. | Excluded: Stellar materials processing does not establish shared timing across separated active nodes. |
| [t2r02](../artifacts/api-server/src/lib/cardLore.ts) — Biomass Ignition Index | controlled bioenergy sequencing | Sequencing bioenergy use while preserving future supply supports energy conversion and failure isolation. | Excluded: A fuel-use sequence does not establish separated active nodes sharing control. |
| [t2r03](../artifacts/api-server/src/lib/cardLore.ts) — Starlift Nozzle | stellar matter extraction | Controlling an extracted stream of stellar matter supports resource extraction and hazard containment. | Excluded: Controlling one extraction stream does not establish distributed synchronization. |
| [t2r04](../artifacts/api-server/src/lib/cardLore.ts) — Photosynthetic Furnace Wick | habitat-scale light-to-heat conversion | Stored light sustaining a habitat supports energy conversion and habitat engineering. | Excluded: A habitat's heat supply does not establish shared timing or control across separated nodes. |
| [t2r05](../artifacts/api-server/src/lib/cardLore.ts) — Causality Furnace Valve | controlled consequence release | Evaluating harm before energy release supports controlled energy and failure isolation. | Excluded: Gating one release does not establish shared timing across separated active nodes. |
| [t2r06](../artifacts/api-server/src/lib/cardLore.ts) — Entropy Sink Crucible | waste heat capture | Turning stellar waste heat into useful energy supports thermal management and energy conversion; this function does not establish material recycling. | Excluded: Waste-heat capture does not establish a distributed synchronization dependency. |
| [t2s01](../artifacts/api-server/src/lib/cardLore.ts) — Interstice Gate Seed | gate-site initialization | Initializing a viable gate site supports transit and stabilization of that site, not an already complete interstellar network. | Excluded: Preparing one gate site does not establish synchronization between operational gates. |
| [t2s02](../artifacts/api-server/src/lib/cardLore.ts) — Storm-Memory Filament | stellar weather memory | Retaining solar-storm experience and warning others supports memory preservation and hazard detection. | Excluded: Preserving and forwarding a warning does not establish shared timing or control. |
| [t2s03](../artifacts/api-server/src/lib/cardLore.ts) — Simulation Loom | predictive model weaving | Inspecting possible futures and rejecting dangerous branches supports predictive modeling and verification of model evidence, not prophecy. | Excluded: Predictive model inspection does not establish synchronization of separated active nodes. |
| [t2s04](../artifacts/api-server/src/lib/cardLore.ts) — Continuity Vessel | identity continuity preservation | Preserving a people's identity through separation supports memory preservation and plural continuity governance. | Excluded: Preserving identity across separation does not require live synchronization among the separated groups. |
| [t2s05](../artifacts/api-server/src/lib/cardLore.ts) — Mnemosyne Star-Index | multi-world memory indexing | Indexing differing worlds' accounts supports memory preservation and distributed coordination without declaring one account uniquely true. | Excluded: Indexing accounts from many worlds does not require their clocks or live control state to agree. |
| [t2s06](../artifacts/api-server/src/lib/cardLore.ts) — Convergence Lens | wildcard pressure inspection | Detecting forced convergence supports signal interpretation and hazard detection; inspection alone does not prevent a failure from spreading. | Excluded: Inspecting differences does not establish separated active nodes sharing timing or control. |
| [t2e01](../artifacts/api-server/src/lib/cardLore.ts) — Solar Immune Organ | radiation adaptation | Teaching habitat life to tolerate selected radiation supports ecological adaptation; it is not a generic radiation vulnerability. | Excluded: Radiation adaptation does not establish a distributed synchronization dependency. |
| [t2e02](../artifacts/api-server/src/lib/cardLore.ts) — Dormancy Clock Graft | long-cycle dormancy timing | Scheduling habitat dormancy and waking supports ecological shutdown and temporal coordination. | Excluded: A long dormancy schedule does not establish shared timing among separated active nodes. |
| [t2e03](../artifacts/api-server/src/lib/cardLore.ts) — Abyssal Culture Flask | dark-adapted culture growth | Growing dark-adapted life within a sealed culture supports ecological adaptation and containment of that culture. | Excluded: A contained culture does not establish a distributed synchronization dependency. |
| [t2e04](../artifacts/api-server/src/lib/cardLore.ts) — Mycelial Relay Spindle | interplanetary biological signaling | Translating signals among biological and machine participants supports cross-ecology mediation and signal interpretation within those participants' established domains. | Excluded: Relaying translated messages does not establish synchronized timing, alignment, or correction state. |
| [t2e05](../artifacts/api-server/src/lib/cardLore.ts) — Epoch Graft Ledger | biological era-tracking | Recording biological eras supports memory preservation and inspectable chronological evidence. | Excluded: Recording era boundaries does not establish shared timing across separated active nodes. |
| [t2e06](../artifacts/api-server/src/lib/cardLore.ts) — Crystal Biome Seedplate | crystal-organic habitat seeding | Seeding crystal-organic habitats supports ecological propagation and habitat engineering. | Excluded: Habitat seeding does not establish live synchronization among the resulting habitats. |
| [t2o01](../artifacts/api-server/src/lib/cardLore.ts) — Horizon Extractor | boundary-energy sampling | Sampling a dangerous physical boundary without crossing it supports boundary observation and bounded containment. | Excluded: A boundary sampler does not establish a distributed synchronization dependency. |
| [t2o02](../artifacts/api-server/src/lib/cardLore.ts) — Radiant Erasure Casket | authorized signal deletion | Sealing dangerous knowledge under controlled release supports hazard containment and record governance. | Excluded: Custody of dangerous records does not establish shared control among separated active nodes. |
| [t2o03](../artifacts/api-server/src/lib/cardLore.ts) — Entropic Furnace Baffle | entropy redirection | Hiding and reusing waste heat supports concealment and thermal management. | Excluded: Heat redirection does not establish synchronization among separated active nodes. |
| [t2o04](../artifacts/api-server/src/lib/cardLore.ts) — Extinction Forge Die | post-collapse reconstruction tooling | Turning collapse remains into reconstruction tooling supports reclamation and precision fabrication. | Excluded: Reconstruction tooling does not establish distributed synchronization. |
| [t2o05](../artifacts/api-server/src/lib/cardLore.ts) — Eventide Ecology Seal | managed ecological shutdown | Controlled dormancy avoids ecological starvation, supporting ecological shutdown and failure isolation. | Excluded: Dormancy management does not establish synchronized control among separated active nodes. |
| [t2o06](../artifacts/api-server/src/lib/cardLore.ts) — Dimensional Shear Gauge | boundary stress measurement | Measuring imminent boundary rupture supports hazard detection and boundary observation. | Excluded: A stress measurement does not establish shared timing or control among separated active nodes. |
| [t2p01](../artifacts/api-server/src/lib/cardLore.ts) — Containment Lattice | public-safe hazardous containment | Externally inspectable hazardous containment supports hazard containment and evidence verification. | Excluded: Inspectable containment does not establish distributed synchronization. |
| [t2p02](../artifacts/api-server/src/lib/cardLore.ts) — Null-Convergence Prism | category collapse warning | Detecting collapsed meanings supports hazard detection and signal interpretation within the inspected distinctions. | Excluded: A category-collapse warning does not establish separated active nodes sharing control. |
| [t2p03](../artifacts/api-server/src/lib/cardLore.ts) — Living Treaty Organ | multi-world biological governance | Maintaining an embodied agreement between unlike worlds supports cross-ecology mediation and plural governance. | Excluded: A social agreement does not establish shared operational timing, alignment, or correction state. |
| [t2p04](../artifacts/api-server/src/lib/cardLore.ts) — Heliostat Filament | stellar light alignment | Coordinating mirrors that steer stellar light supports controlled energy and distributed coordination. | **Included**: Separated mirrors depend on this filament to maintain their coordinated light-steering alignment. |
| [t2p05](../artifacts/api-server/src/lib/cardLore.ts) — Error-Correcting Core | high-energy error correction | Finding and correcting errors over vast distances supports resilient computation and distributed coordination. | **Included**: Correction across vast distances maintains coordinated correction state among separated active nodes. |
| [t2p06](../artifacts/api-server/src/lib/cardLore.ts) — Radiation Treaty Prism | shared radiation governance | Allocating radiation among habitats supports distributed coordination and plural governance. | Excluded: Allocating shared radiation does not establish a synchronized control loop; a governance rule is not a timing dependency. |
| [t3r01](../lib/game-types/src/technology.ts) — Relicfire Interpreter | Translates alien ignition systems into safe startup sequences. | Safe translation of alien ignition instructions supports controlled energy and signal interpretation within ignition systems. | Excluded: Interpreting a startup sequence does not establish ongoing coordination of separated active nodes. |
| [t3r02](../lib/game-types/src/technology.ts) — Terminal-System Reclaimer | Recovers useful matter and energy from dead systems without spreading their failure. | Recovering matter and energy without spreading collapse supports reclamation and failure isolation. | Excluded: Safe recovery from dead systems does not establish live synchronization among those systems. |
| [t3r03](../lib/game-types/src/technology.ts) — Chronoflare Phase Regulator | Synchronizes relativistic stellar events without forcing one universal clock. | Synchronizing relativistic stellar events supports temporal and distributed coordination without a universal clock. | **Included**: Relativistic stellar events depend on this regulator to maintain their coordinated phase relationships. |
| [t3r04](../lib/game-types/src/technology.ts) — Plural Habitat Forge Heart | Fabricates habitat cores compatible with unrelated forms of life. | Fabricating habitats for unrelated life supports habitat engineering and cross-ecology mediation. | Excluded: Compatibility of habitat cores does not establish synchronized control among habitats. |
| [t3s01](../lib/game-types/src/technology.ts) — Voidline Route Solver | Computes traversable paths through regions where ordinary navigation fails. | Computing viable routes through otherwise unnavigable regions supports transit and boundary observation. | Excluded: Computing a route does not establish a shared timing or control dependency among active destinations. |
| [t3s02](../lib/game-types/src/technology.ts) — Divergence Reconciler | Reconciles incompatible civic records without erasing their differences. | Reconciling incompatible civic records without erasure supports record governance and plural governance. | Excluded: Reconciliation can preserve different accounts without synchronizing live nodes. |
| [t3s03](../lib/game-types/src/technology.ts) — Extinction Signal Decoder | Recovers meaning from signals made by vanished civilizations. | Recovering meaning from extinct civilizations' signals supports information recovery and signal interpretation within those records. | Excluded: Decoding historical signals does not require live synchronization with their vanished senders. |
| [t3s04](../lib/game-types/src/technology.ts) — Relativistic Chronology Governor | Lets distant systems share an ordered history across unequal clocks. | Ordering a shared history across unequal clocks supports temporal coordination and record governance. | Excluded: Ordering historical records across unequal clocks does not require the systems to share live timing, aligned control, or distributed correction state. |
| [t3e01](../lib/game-types/src/technology.ts) — Xenobiome Route Graft | Carries living material safely between incompatible ecologies. | Safe transport between incompatible ecologies supports transit and cross-ecology mediation. | Excluded: Transport between ecologies does not establish synchronized timing or control among them. |
| [t3e02](../lib/game-types/src/technology.ts) — Stellar Habitat Genome | Encodes habitats that adapt to different stars without becoming identical. | Encoding differing star-adapted habitats supports ecological adaptation and habitat engineering. | Excluded: Adaptation to different stars does not establish shared operational timing among habitats. |
| [t3e03](../lib/game-types/src/technology.ts) — Extinction Immunome | Teaches living systems to survive failure patterns recovered from dead worlds. | Teaching living systems to survive known failure patterns supports ecological adaptation; it does not establish prevention of failure spreading or literal future knowledge. | Excluded: Learning survival patterns does not establish distributed synchronization. |
| [t3e04](../lib/game-types/src/technology.ts) — Biosphere Translation Membrane | Exchanges matter between alien ecologies without allowing either to consume the other. | Controlled exchange without ecological consumption supports cross-ecology mediation and failure isolation. | Excluded: Controlled exchange between ecologies does not establish synchronized timing or distributed correction state. |
| [t3o01](../lib/game-types/src/technology.ts) — Refuge Dormancy Kernel | Preserves a complete refuge biosphere through geological catastrophe. | Preserving a refuge through catastrophe supports ecological shutdown and hazard containment; it is a bounded kernel, not an entire completed Project. | Excluded: A refuge's dormancy does not establish shared timing among separated active nodes. |
| [t3o02](../lib/game-types/src/technology.ts) — Collapse Forecast Engine | Predicts cascading physical, ecological, and civic failure. | Forecasting cascading failure supports predictive modeling; predicting a cascade does not itself stop its propagation. | Excluded: Forecasting cascades does not establish synchronized control across the observed systems. |
| [t3o03](../lib/game-types/src/technology.ts) — Quiet-Signal Symbiont | Carries authenticated communication without revealing the sender's location. | Authenticating communication while concealing its origin supports secure communication and concealment. | Excluded: Authenticated communication need not synchronize the participating nodes' timing or control state. |
| [t3o04](../lib/game-types/src/technology.ts) — Null-Baseline Interferometer | Distinguishes true absence from insufficient observation. | Separating true absence from inadequate observation supports boundary observation and signal interpretation within observed evidence. | Excluded: Its bounded capability distinguishes observations; a distributed depiction or name does not establish a shared-control dependency. |
| [t3p01](../lib/game-types/src/technology.ts) — Plurality Accord Verifier | Tests whether unlike minds have given authentic consent. | Testing authentic consent across unlike minds supports evidence verification and plural governance. | Excluded: Consent verification does not establish synchronized timing or control among those minds. |
| [t3p02](../lib/game-types/src/technology.ts) — Relic Provenance Standard | Verifies the material and procedural history of civilization-changing fabrication. | Verifying manufacturing history supports evidence verification; authenticating materials and procedures does not itself fabricate components. | Excluded: Manufacturing provenance does not establish ongoing synchronization among fabrication sites. |
| [t3p03](../lib/game-types/src/technology.ts) — Federated Logic Substrate | Lets star-scale minds exchange proofs without merging identities. | Exchanging proofs while retaining independent minds supports resilient computation and plural governance. | Excluded: Proof exchange can preserve independent minds without shared timing, aligned control, or distributed correction state. |
| [t3p04](../lib/game-types/src/technology.ts) — Species-Rights Witness | Records identity and harm in forms unrelated species can verify. | Verifiable cross-species records of identity and harm support evidence verification and record governance. | Excluded: A shared evidence format does not establish synchronization among active witnesses. |

## Review conclusions and release boundary

The review finds no need to turn the Artifact catalog into vulnerability prose or
rewrite approved lore. The narrow functional fact is enough for a predictable
recoverable threat; the existing response vocabulary is enough for a bounded
opportunity. Examples that must remain distinct:

- Ashroot Bloom can recover ecology despite being Flare.
- Petrified Bloom preserves a reference; ecological lineage does not make it living tissue.
- Solar Immune Organ adapts to radiation; biological depiction does not make it a generic radiation victim.
- Chrono-Ember Core schedules energy locally; a temporal capability does not prove a distributed dependency.
- Mnemosyne Star-Index stores different accounts without synchronizing their clocks.
- Relicfire Interpreter and Extinction Signal Decoder interpret different domains.
- Null-Baseline Interferometer's old distributed role wording does not prove that its bounded observational capability always requires shared control.

Coverage, source-text drift, capability-review drift, exact memberships/exclusions,
and the eight bounded responders are regression checked in
[`artifactEventFacts.test.ts`](../artifacts/api-server/src/lib/artifactEventFacts.test.ts).
A new fact must supply a reviewed decision for every Artifact; there is no unknown
classification that quietly becomes immunity. New or altered approved prose needs
its own author authorization, separate from this mechanical review.

This review supports an explicit experimental content profile. A substantial
random lore-targeted collection and post-Vault teaching remain later authored work;
current Chronicle sequences must not gain random Events merely because the data
exists. The historical audit's lifecycle concern is superseded by current damage
and repair integration: damage retains Affinity bonuses and historical mastery,
while disabling operational responses and new Blueprint/Legacy contributions.
The future duration-based Legacy penalty remains undesigned.
