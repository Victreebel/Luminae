# LUMINAe All-Tier Artifact Audit v1.0

Implemented 2026-09-28 following the request to audit and replace weak concepts across all three tiers. This record supersedes the earlier Tier III roster review wherever their identities, functions, or tier rationale conflict.

## Result

All 90 Artifacts were individually reviewed: 33 retained, 30 clarified, and 27 replaced in function. A replacement changes the actual technology, not merely its adjective or setting. IDs, tiers, printed costs, bonuses, Eminence, and the four shipped Blueprint recipes are unchanged.

| Tier | Retain | Clarify | Replace | Total |
|---|---:|---:|---:|---:|
| I — Planetary | 32 | 8 | 0 | 40 |
| II — Stellar | 1 | 10 | 19 | 30 |
| III — Galactic | 0 | 12 | 8 | 20 |

## Thresholds

- **Tier 1:** Complete useful planetary foundations, including local tools and planetary orbital infrastructure. No stellar control or unbounded power is implied.
- **Tier 2:** Working technology that materially depends on stellar conditions, interplanetary dynamics, or coordinated multiworld service within one star system.
- **Tier 3:** A substantial regional galactic achievement with a specified result that independent stellar copies cannot provide: coupled regional operation, complementary resources or evidence, or survival beyond correlated stellar loss.

A larger photograph, a famous megastructure name, or copying a stellar installation across many stars does not earn Galactic. The test is what the achievement loses when confined to one star system. Planetary tools need not control an entire planet; they provide complete foundational capabilities inside that setting. Tier measures operational scope, not automatic Kardashev advancement or the camera scale of a depicted component.

Light-speed delays, physical transport, energy supply, waste heat, local autonomy, and unequal clocks still apply. These replacements introduce no bulk portals, free energy, retrocausality, or instantaneous galactic control. A Forge action compresses development and deployment history.

Blueprints remain specialized, owner-private synthesis knowledge. A Manifested Project provides a distinct result with indispensable component contributions; it is not a fourth Artifact tier. Obsolete speculative Project leads that merely duplicate the revised Artifacts have been removed. The four implemented recipes remain fixed.

## Shared authority and Event behavior

`lib/game-types/src/artifact-canon.ts` now owns all 90 names, practical functions, mysteries, forms, and art briefs. API lore, tutorial Artifact fixtures, fallback names, Civilization preview data, Blueprint component inspectors, and the card browser read that authority. Concealed Blueprint associations remain in the API server only, outside the shared client canon. `artifact-tier-audit.ts` records each decision and the counterfactual below. The card browser's developer details expose it as **Why this tier**.

Event facts v4 quote each Artifact's current functional sentence. Mysteries never secretly grant powers. Four capability assignments change: Orbital Transfer Loom gains predictive modeling, Solar Immune Canopy gains hazard containment, Spiral-Arm Shepherd gains transit/navigation in place of conversion, and Starborne Succession gains ecological adaptation in place of conversion. The vocabulary remains bounded to 32 capabilities. Regional stellar steering adds Spiral-Arm Shepherd to the explicit distributed-synchronization dependency set: 11 members and 79 reviewed exclusions. The seven signal-response candidates are unchanged. Existing save-state identities and frozen Event plans retain their meanings.

Four lineage labels follow the replacement function: Orbital Transfer Loom becomes transit; Heliosphere Discriminator becomes boundary science; Stellar Signal Quarantine becomes containment; Eclipse Radiator Web becomes concealment. Extinction Archive drops an unrelated fuel-grid predecessor. Dark-Sector Aperture uses the Tidal Shear Observatory rather than a habitat chain. All development edges still advance one tier and remain compatible with printed costs. These edges are credible routes, not new gameplay prerequisites.

## Artwork

Two mismatched Tier I illustrations, twenty Tier II illustrations, and two incompatible Tier III illustrations are replaced, alongside seven Civilization sprite sheets covering 38 Artifacts. The remaining Tier III artwork already depicts the relevant operational machinery. Retained closeups can show a meaningful component of larger technology; they do not set its reach.

- Card originals and exact generation prompts: `artifacts/luminae/src/assets/cards/tier-audit-v4/generation-manifest.json`.
- Production card WebP files: `artifacts/luminae/src/assets/cards/runtime/tier-audit-v4/` (384 × 549).
- Civilization atlas originals and exact prompts: `artifacts/luminae/src/assets/civilization/manifestations/artifacts/authored/tier-audit-v4-generation-manifest.json`.
- New atlas imports use version 4; earlier source images remain available for provenance.

## Individual decisions

Each row records the working result, the disposition, and the test that earns its designation. The shared audit registry also preserves each former name and functional sentence.

### Tier 1 — Planetary

| ID / Current identity | Decision | Working function | Why it earns this tier |
|---|---|---|---|
| `t1r01` **Ignition Kernel** | Retain | A caged spark that lights furnaces and cities but refuses to spread. | Its complete ignition service works within a planetary industrial installation. |
| `t1r02` **Ashroot Bloom** | Retain | Pale shoots rise from soil too burned for life. | A planetary biosphere supplies the full recovery environment. |
| `t1r03` **Chrono-Ember Core** | Retain | It remembers when a fire must return, not how it burned. | One furnace can use the entire scheduling capability. |
| `t1r04` **Causal Spark Coil** | Retain | Before it fires, the coil tests what the spark will cause. | One planetary plant contains the trigger and its immediate consequences. |
| `t1r05` **Voidflare Cask** | Retain | A sealed burst of light kept for the moment every other flame fails. | One settlement can contain, store, and use the reserve. |
| `t1r06` **Photosynthetic Wick** | Retain | This living wick stores sunlight and releases it as gentle heat. | A local organism performs the complete conversion. |
| `t1r07` **Entropy Pyre Baffle** | Retain | It channels dangerous waste heat into useful work. | One industrial thermal circuit can supply the complete operation. |
| `t1r08` **Oathfire Igniter** | Retain | The igniter opens only before witnesses, turning flame into a public promise. | One civic community can supply the witnesses and record. |
| `t1s01` **Echo Splinter** | Retain | A crystal splinter that hears a structure fail moments before it breaks. | A single structure can exhibit the failure signs; no future information is required. |
| `t1s02` **Mantlelift Driver Coil** | Retain | This timed coil hurls sealed cargo from deep underground into orbit. | Its endpoint is planetary orbit, not another planet or star. |
| `t1s03` **Null-Loop Anchor** | Retain | It stops machines trapped in endless repetition. | One machine can exhibit and terminate the entire failure. |
| `t1s04` **Time-Crystal Scaffold** | Clarify | A calibrated crystal frame synchronizes machines across a planetary installation, accounting for signal travel time. | Planetary machines share a calibrated timing reference with propagation delays; no interstellar clock authority is granted. |
| `t1s05` **Silent Recursion Rule** | Clarify | A sealed protocol checks and repairs a machine's calculations without broadcasting its intermediate state. | One processor can validate and repair a calculation without broadcasting its intermediate state. |
| `t1s06` **Living Chronicle** | Retain | This living record grows new pages as its people change. | One planetary society supplies the whole record-keeping problem. |
| `t1s07` **String-Scar Loom** | Clarify | The loom encodes precise building instructions in controlled defects along engineered material threads. | A laboratory loom and engineered threads provide the full operation, without exotic spacetime strings. |
| `t1s08` **Root Memory Valve** | Retain | A valve releases ancestral memories in survivable doses. | A local archive can meter every release. |
| `t1e01` **Replication Spore** | Retain | A spore bred to repair damaged land without taking it over. | A bounded damaged landscape supplies its complete task. |
| `t1e02` **Voidroot Tap** | Retain | This root draws food from places light cannot reach. | Dark planetary reservoirs provide the whole resource environment. |
| `t1e03` **Char Tendril** | Retain | A black tendril searches burned ground for surviving life. | The search and recovery can finish within one burned ecosystem. |
| `t1e04` **Climate Seed Die** | Retain | The die prints the first organisms needed to heal a damaged climate. | One world's climate provides the entire intended target. |
| `t1e05` **Facetcell Shard** | Retain | Living crystal cells change their purpose as light passes through them. | A local cell assembly performs the computation. |
| `t1e06` **Decay Lattice** | Retain | The lattice decides how quickly dead matter becomes food again. | One settlement or biome can close the recycling cycle. |
| `t1e07` **Lichen Vein** | Retain | Engineered lichen grows through stone and closes its cracks. | One damaged building can exercise the entire capability. |
| `t1e08` **Necrobloom Bed** | Retain | Dead soil enters the bed; pale life emerges. | One dead-soil bed contains the full restoration process. |
| `t1o01` **Entropy Veil** | Retain | The veil hides the heat of failing machines until repairs arrive. | One machine and its local heat storage suffice; heat is not erased. |
| `t1o02` **Horizon Lantern** | Retain | It glows beside boundaries that should not be crossed. | It warns at an inspected boundary without opening or controlling it. |
| `t1o03` **Ashen Hollow** | Retain | It preserves the empty shape left by something destroyed. | One object's surviving imprint supplies the complete evidence. |
| `t1o04` **Undergrowth Silencer** | Retain | Living fibers smother sound and signals above hidden settlements. | One hidden settlement can use the whole function. |
| `t1o05` **Blackglass Forge Die** | Retain | A blackglass mold that shapes metal perfectly in airless space. | A planetary orbital forge can use the complete mold. |
| `t1o06` **Decay Network** | Retain | This buried web feeds decay back to whatever still lives. | Connected planetary organisms close the entire material cycle. |
| `t1o07` **Absence Shard** | Clarify | The shard maps hidden voids inside engineered materials against a calibrated negative-space reference. | Reference material measures internal voids in engineered solids; it neither creates nor supports spacetime gaps. |
| `t1o08` **Temporal Erasure Seal** | Clarify | The seal restricts access to a dangerous hour's records while preserving the original evidence. | Only access to a local historical record changes; the event and its consequences remain intact. |
| `t1p01` **Correction Seed** | Retain | Planted inside a damaged system, it guides the whole toward repair. | One damaged biological or civic system can complete the recovery. |
| `t1p02` **Still-Point Shard** | Clarify | The shard uses feedback to hold an instrument stable against vibration and drift relative to its mount. | Feedback stabilizes one instrument relative to its mount, not the world or universe. |
| `t1p03` **Prismatic Hollow** | Clarify | The prism checks incoming signals against trusted reference patterns, separating verifiable measurements from persuasive interference. | Known reference signals can be checked locally; intentions and universal truth cannot. |
| `t1p04` **Magnetic Bottle** | Retain | Magnetic fields hold star-hot plasma without walls. | Star-hot plasma is a temperature, not control of an entire star. |
| `t1p05` **Recursive Lens** | Retain | Before examining the world, this lens examines its own bias. | One observation system can audit its own bias. |
| `t1p06` **Living Lattice Node** | Retain | A living junction that lets buildings coordinate their own repair. | The complete repair coordination fits inside a city. |
| `t1p07` **Void Prism** | Clarify | The prism resolves faint radiation and field changes at the boundary of a shielded vacuum chamber. | A sensor resolves faint radiation at a shielded chamber boundary; it opens no passage. |
| `t1p08` **Petrified Bloom** | Retain | A stone flower proving that life once survived here. | One fossil specimen supplies the complete reference function. |

### Tier 2 — Stellar

| ID / Current identity | Decision | Working function | Why it earns this tier |
|---|---|---|---|
| `t2r01` **Stellar Crucible** | Clarify | Refines matter lifted from the local star in shielded orbital furnaces, supplying the system's industries with continuously replenished alloys. | A planetary furnace alone lacks the continuing star-lift feed and orbital industrial chain. |
| `t2r02` **Eclipse Reserve Grid** (formerly Biomass Ignition Index) | Replace | Stores surplus solar energy as transportable fuel and maintains isolated reserves for shadowed habitats, preventing eclipse shortages from cascading between inhabited orbits. | The replacement balances moving illuminated and shadowed orbital populations; a local fuel ledger does not deliver this service. |
| `t2r03` **Starlift Nozzle** | Retain | This immense nozzle turns stellar fire into a controlled stream of raw material. | A planetary mine cannot extract and contain a continuous stream of stellar plasma. |
| `t2r04` **Living Dyson Orchard** (formerly Photosynthetic Furnace Wick) | Replace | Grows inhabited photosynthetic collector swarms around one star, converting harvested light into heat and chemical reserves for the system's habitats. | The replacement harvests one star through an inhabited collector swarm; one lamp or planetary greenhouse cannot supply the network. |
| `t2r05` **Coronal Safety Governor** (formerly Causality Furnace Valve) | Replace | Governs stellar extraction and power-beam shutdowns using predicted exposure at inhabited orbits, preventing a safe local release from striking another world. | The replacement must forecast exposure at other moving inhabited orbits before a stellar power release. |
| `t2r06` **Heliosphere Heat Cascade** (formerly Entropy Sink Crucible) | Replace | Routes industrial waste heat through successively colder orbital stages, extracting useful work before outer-system radiators emit the remainder to space. | The replacement uses industrial stages in different orbital thermal environments and outer-system radiators. |
| `t2s01` **Orbital Transfer Loom** (formerly Interstice Gate Seed) | Replace | Maintains corrected gravity-assist routes between moving planets, catching transfer windows and rerouting convoys when orbital resonances drift. | Changing planetary gravity assists and transfer windows cease to be this network if confined to one world. |
| `t2s02` **Storm-Memory Filament** | Clarify | Combines archived solar storms with probes distributed around one star to warn inhabited orbits before charged-particle fronts arrive. | Probes around the star provide upstream warnings that a local planetary sensor cannot supply. |
| `t2s03` **Orbital Causality Loom** (formerly Simulation Loom) | Replace | Tests competing models of planetary resonances and industrial mass transfers, exposing which proposed migrations would destabilize inhabited orbits within one star system. | Planetary resonances and exchanged industrial mass create a coupled stellar-dynamics problem. |
| `t2s04` **Continuity Fleet** (formerly Continuity Vessel) | Replace | Carries whole societies between planets on slow migrations, maintaining distinct civic records and living institutions through generations in transit. | Whole societies must remain institutionally distinct while physically migrating between planets. |
| `t2s05` **Mnemosyne Star-Index** | Clarify | Indexes independently dated records from planets and habitats around one star, keeping different observations comparable without imposing a single authoritative account. | No single planetary record contains the different witnesses needed for the comparison. |
| `t2s06` **Heliosphere Discriminator** (formerly Convergence Lens) | Replace | Separates overlapping stellar-plasma, industrial-beam, and magnetospheric signals, warning when their interference makes navigation across the star system unreliable. | The replacement separates the star, planetary magnetospheres, and industrial transmitters as a coupled signal environment. |
| `t2e01` **Solar Immune Canopy** (formerly Solar Immune Organ) | Replace | Maintains living shields and repair ecologies through stellar particle storms, preserving inhabited orbital belts beyond planetary magnetic protection. | The replacement sustains orbital biospheres through stellar particle storms without planetary magnetic shelter. |
| `t2e02` **Dormancy Clock Graft** | Clarify | Keeps interplanetary sleeper fleets alive through decades without resupply, timing ecological shutdown and revival against each destination world's orbital arrival window. | Revival must meet a moving destination after interplanetary travel without resupply. |
| `t2e03` **Sunless Habitat Chain** (formerly Abyssal Culture Flask) | Replace | Sustains quarantined settlements on sunless outer-system bodies by exchanging complementary chemical feedstocks among moons, comets, and sealed habitat ecologies. | The replacement depends on complementary chemical reservoirs on separate outer-system bodies, not one closed culture vessel. |
| `t2e04` **Mycelial Relay Spindle** | Clarify | Translates biological and machine messages between the inhabited worlds of one star system, preserving ecological meaning across radio delays and incompatible hosts. | Different planetary hosts and radio delays constrain a working biological communication service. |
| `t2e05` **Biosphere Provenance Array** (formerly Epoch Graft Ledger) | Replace | Reconstructs interplanetary biological exchanges by cross-dating living archives, impact deposits, and transported specimens against distinct orbital histories. | The replacement reconstructs exchanges between planets from independent biological and orbital histories. |
| `t2e06` **Crystal Habitat Reef** (formerly Crystal Biome Seedplate) | Replace | Grows self-repairing crystal-organic settlements from asteroid feedstock, maintaining sealed ecosystems along inhabited belts without importing planetary soil. | The replacement turns asteroid resources into sealed inhabited belts without a planetary soil supply. |
| `t2o01` **Horizon Extractor** | Clarify | Samples and diverts charged matter from a compact star's accretion flow through shielded stand-off collectors, containing unstable releases outside inhabited orbits. | Stand-off collection near a compact star's accretion flow requires a stellar high-energy environment. The existing Blueprint sink role remains supported. |
| `t2o02` **Stellar Signal Quarantine** (formerly Radiant Erasure Casket) | Replace | Quarantines compromised instructions at interplanetary relay junctions, preserving inspectable records while preventing light-delay-separated worlds from repeating a dangerous command. | The replacement contains a command cascade among worlds that cannot exchange instantaneous revocations. |
| `t2o03` **Eclipse Radiator Web** (formerly Entropic Furnace Baffle) | Replace | Routes a star system's industrial waste heat into directional radiator corridors, reducing detection along selected approaches while still emitting the heat. | Multiple orbital heat sources and approach directions determine the system's observable signature. Heat remains emitted. |
| `t2o04` **Worldfall Reconstruction Yard** (formerly Extinction Forge Die) | Replace | Rebuilds a lost planet's essential industries in dispersed orbital yards using salvaged matter, surviving machine records, and feedstock from the system's other worlds. | The replacement rebuilds a destroyed world's industry using surviving worlds and dispersed orbital yards. |
| `t2o05` **Aphelion Reserve** (formerly Eventide Ecology Seal) | Replace | Cycles outer-system biospheres between growth and dormancy over extreme cometary orbits, preventing long dark seasons from exhausting stored nutrients. | The replacement follows extreme cometary orbits and their long, unequal stellar seasons. |
| `t2o06` **Tidal Shear Observatory** (formerly Dimensional Shear Gauge) | Replace | Maps changing tidal forces around a compact stellar companion, warning habitats and transfer fleets before their routes enter destructive gravity gradients. | The replacement maps a compact companion's changing gravity gradients for occupied orbits and transfers. |
| `t2p01` **Containment Lattice** | Replace | Partitions stellar extraction and processing orbits into independently inspectable containment cells, preventing a failed plasma installation from spilling into neighboring inhabited routes. | The replacement partitions high-energy stellar extraction orbits and protects neighboring inhabited routes. |
| `t2p02` **Parallax Arbitration Array** (formerly Null-Convergence Prism) | Replace | Detects contradictions between planetary reference frames before navigation systems merge them, preventing a locally valid route from becoming a collision elsewhere. | The replacement arbitrates incompatible planetary reference frames before interplanetary navigation merges them. |
| `t2p03` **Living Treaty Organ** | Clarify | Maintains resource agreements between the biospheres of one inhabited star system, translating local ecological needs into obligations each world can verify. | A single planetary institution cannot supply the separate biospheres and independently verifiable obligations. |
| `t2p04` **Heliostat Filament** | Clarify | Coordinates mirror swarms around one star so changing beam paths illuminate working habitats without scorching intervening orbits. | The coordinated beam paths must account for moving habitats and intervening orbits. |
| `t2p05` **Error-Correcting Core** | Clarify | Maintains shared correction state across radiation-exposed stellar computers, reconciling delayed results while isolating damaged nodes. | Radiation-damaged nodes and light-delay-separated orbital stations must maintain a shared correction state. |
| `t2p06` **Radiation Treaty Prism** | Clarify | Allocates access to one star's light among inhabited orbits, reconciling competing illumination and radiation-shielding needs through agreements each habitat can inspect. | Multiple habitats share exposure and shielding obligations around the same star. |

### Tier 3 — Galactic

| ID / Current identity | Decision | Working function | Why it earns this tier |
|---|---|---|---|
| t3r01` **Spiral-Arm Shepherd** (formerly Ignition Reliquary) | Replace | Steers inhabited stars into safe migration corridors through a crowded galactic arm, using coordinated stellar thrust and long-horizon encounter forecasts. | The replacement changes relative stellar trajectories to preserve a regional migration corridor; one stationary star engine cannot establish that corridor. |
| `t3r02` **Stargrave Exchange** (formerly Extinction Furnace) | Replace | Restores depleted galactic regions by exchanging complementary feedstocks from unlike stellar remnants, containing hazardous residues throughout the supply chain. | Complementary remnants and depleted receiving systems together close a regional material-supply cycle. |
| `t3r03` **Chronoflare Array** | Clarify | Schedules energy deliveries among a galactic arm's unequal stars, routing supply around exhausted systems through continually corrected emission and reception schedules. | A single stellar collector cannot balance supply around exhausted stellar nodes across an arm. |
| `t3r04` **Star-River Crucible** | Replace | Builds inhabited staging fleets across an interarm void through mobile foundries sharing production state and recycling carried feedstock. | A moving chain bridges an interarm supply gap by constructing successive inhabited staging fleets. |
| `t3s01` **Starway Spine** | Clarify | Coordinates galactic-arm transport through launch, navigation, braking, and alternate routes that preserve travel after entire stellar junctions fail. | Alternative paths preserve journeys when entire stellar junctions disappear; one system cannot provide that network. |
| `t3s02` **Recursive Commonwealth** | Clarify | Keeps public services interoperable across a galactic arm as stellar societies diverge, reconciling centuries-delayed civic records while preserving local decisions. | One system cannot supply the long-isolated descendants whose public services must remain interoperable without one live government. |
| `t3s03` **Extinction Archive** | Replace | Reconstructs extinct galactic civilizations by cross-matching fragments scattered across thousands of systems, preserving the recovered histories in independent repositories. | Lost histories are reconstructed from complementary fragments dispersed beyond any surviving stellar archive. |
| `t3s04` **Chronology Accord** | Clarify | Reconstructs galactic-arm causal histories from unequal stellar clocks, travel records, and delayed testimony, preserving genuinely unordered events. | Independent clocks, travel paths, and delayed testimony across the arm are essential evidence, not copies of one clock. |
| `t3e01` **Worldroot Lattice** | Clarify | Establishes a self-sustaining biosphere migration front across a galactic arm through successive seed convoys and acclimation stations beyond the founding worlds' support. | A local nursery cannot maintain successive settlement generations across an arm without the convoy and acclimation chain. |
| `t3e02` **Starborne Succession** (formerly Stellar Overgrowth) | Replace | Transfers inhabited collector ecologies between aging and younger stellar populations across galactic regions, preserving lineages after host-star loss. | The replacement preserves a continuous inhabited ecology by transferring it between differently aged stellar populations. |
| `t3e03` **Interstellar Necrobiome** | Replace | Reclaims biospheres after regional extinction using complementary decomposers, nutrient-cycle organisms, and seed stocks preserved across a galactic arm. | Surviving systems supply complementary ecological stocks after entire stellar biospheres have been lost. |
| `t3e04` **Biosphere Concordance** | Replace | Closes galactic-arm nutrient cycles through quarantined exchanges among independently evolved biospheres; no single biosphere can complete the cycle. | The replacement closes a nutrient cycle whose different converter ecologies and independently evolved biospheres span the regional network. |
| `t3o01` **Cryptobiotic Constellation** | Clarify | Preserves dormant civilizations beyond shared stellar hazards across galactic regions, maintaining independent revival paths after entire clusters perish. | Independent refuges outside shared stellar hazard zones can resettle destroyed clusters; one system cannot survive its own complete loss. |
| `t3o02` **Collapse Mandala** | Clarify | Cuts infected transport and automation routes between stellar clusters across a galactic arm, containing regional cascades while isolated junctions preserve safe local service. | Cutting paths between clusters contains a regional cascade while preserving disconnected local service. |
| `t3o03` **Ordered Silence** | Clarify | Conceals authenticated messages through timed galactic-arm relays and decoys, defeating observers who combine evidence gathered at many stars. | Separated relay timings and decoy paths detach origins from destinations against multi-star observation. |
| `t3o04` **Dark-Sector Aperture** | Clarify | Combines time-calibrated observations across a galactic arm into a three-dimensional dark-matter map, separating local disturbances from the galaxy's shared gravitational structure. | Observations across an arm separate local perturbations from regional dark-matter structure. |
| `t3p01` **Galactic Concordance** | Clarify | Operates galactic-arm treaty ports through verifiable consent and delayed arbitration, sustaining shared services beyond any common live government. | One stellar polity cannot supply the separately sovereign, causally delayed parties whose shared ports remain usable. |
| `t3p02` **Relic Reconstruction Commons** (formerly Relic Forge Commons) | Replace | Reconstructs lost galactic technologies whose surviving fabrication steps are scattered among stellar cultures, joining independently verified processes into complete working machines. | Different stellar cultures retain indispensable fabrication steps; their verified combination recovers a complete lost galactic technology. |
| `t3p03` **Matrioshka Chorus** | Clarify | Combines conscious stellar swarms through shared correction state for galactic computations whose working data exceed one star's computing resources. | Independent stellar swarms must maintain shared correction state while their distinct minds perform one delay-tolerant calculation. |
| `t3p04` **Witness Constellation** | Clarify | Preserves authenticated testimony throughout a galactic arm, keeping destroyed or captured civilizations represented by evidence beyond their attackers' local reach. | A witness held only in the originating system cannot outlast an attacker's complete local control. |

## Verification

- **100 backend tests passed** across six suites: complete canon/tier coverage, explicit Event facts, real Event eligibility and synchronization targeting, frozen plans, Blueprint behavior, and public/private lore separation.
- **261 frontend tests passed** across eleven suites: canonical names and 30-word lore limits, protected tutorial dialogue and reducer behavior, shared artwork imports, Artifact/Event inspection, Civilization deployment and manifestations, profile data, and both Blueprint component inspectors.
- **96 browser checks passed:** every Artifact at 390 px width with current lore, loaded artwork, Event properties, and its individual tier rationale; all three tiers in both full and compact mobile Forge views.
- **18 follow-up browser checks passed** after final prose tightening and the two Tier I art corrections. No horizontal overflow or JavaScript errors in the reviewed card/Forge views.
- **One three-scene browser check passed:** all seven replacement atlas files loaded and all 38 corresponding Artifact IDs rendered across orbit, stellar, and galaxy views, with no JavaScript errors. Generated atlases retain alpha transparency.
- Shared library, frontend, and API TypeScript checks passed. API build and Vite production compilation passed.
- Mechanical catalog and protected tutorial governance file are byte-for-byte unchanged against the starting workspace snapshot. All tutorial dialogue and flow after the Artifact fixture table are unchanged. The four Blueprint recipes and numerical card balance remain fixed.
- Lore Bible, Technology System, and Concordance source sections match their compiled Unified Reference sections.

Browser evidence is saved under `scripts/test-results/`, `scripts/test-results-tier-audit-final/`, and `scripts/test-results-tier-audit-scenes/`. Exact illustration prompts and workspace asset paths are in the two generation manifests above.

### Existing release gates still failing

The production build compiles but its budget gate remains red. Existing limits were not raised:

| Check | Current | Limit |
|---|---:|---:|
| Total built assets | 59,271.4 KiB | 49,152 KiB |
| Core assets | 36,275.9 KiB | 35,840 KiB |
| Global CSS, gzip | 111.9 KiB | 110 KiB |
| Artifact manifestation library | 5,019.7 KiB | 5,632 KiB — passes |
| Entry JavaScript, gzip | 161.3 KiB | 200 KiB — passes |

The Blueprint bundle-secrecy verifier also flags existing shared Blueprint definitions, reveal-component strings, and emitted Blueprint asset filenames outside sealed chunks. Public card lore and the new shared Artifact canon pass dedicated no-identity-leak checks; Blueprint family associations are server-only. The broader Blueprint packaging policy needs a separate repair before claiming the release gate passes.

Earlier transient Civilization socket type/test failures in concurrently changed files were resolved in the workspace before the final verification; they are not outstanding audit failures.
