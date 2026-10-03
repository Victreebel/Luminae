import type { ArtifactId } from './artifacts';
import type { ArtifactCivilizationCapabilityId } from './civilization-capabilities';
import { ARTIFACT_CANON } from './artifact-canon';

/** Reviewed mechanical facts, not inferred lore keywords or new Artifact powers. */
export const ARTIFACT_EVENT_FACTS_RULES_VERSION = 'artifact-event-facts-v5' as const;

export const ARTIFACT_EVENT_FACT_DEFINITIONS = [
  {
    id: 'dependency:distributed_synchronization',
    kind: 'dependency',
    label: 'Distributed synchronization',
    description: 'Coordinates separated active nodes through shared timing, aligned control, or distributed correction state. An Event that disrupts those relationships can interrupt this function; communication, archives, and agreements alone do not qualify.',
  },
] as const;

export type ArtifactEventFactId = (typeof ARTIFACT_EVENT_FACT_DEFINITIONS)[number]['id'];
export type ArtifactEventFactDefinition = (typeof ARTIFACT_EVENT_FACT_DEFINITIONS)[number];

export const ARTIFACT_EVENT_FACT_BY_ID = Object.fromEntries(
  ARTIFACT_EVENT_FACT_DEFINITIONS.map((definition) => [definition.id, definition]),
) as Readonly<Record<ArtifactEventFactId, ArtifactEventFactDefinition>>;

export interface ArtifactEventFactReview {
  /** False is an authored, reviewed exclusion; missing review is never immunity. */
  readonly matches: boolean;
  readonly reason: string;
}

export interface ArtifactEventFacts {
  readonly practicalCapability: string;
  readonly source: {
    readonly path: string;
    readonly key: string;
    readonly field: 'blueprintRole' | 'practicalCapability';
    readonly evidenceField: 'flavor' | 'practicalCapability' | 'functionalText';
  };
  /** Existing canonical functional sentence; mystery text is not targeting evidence. */
  readonly evidence: string;
  readonly reviewedCapabilityIds: readonly ArtifactCivilizationCapabilityId[];
  readonly capabilityReview: {
    readonly status: 'reviewed';
    readonly reason: string;
  };
  readonly factReviews: Readonly<Record<ArtifactEventFactId, ArtifactEventFactReview>>;
}

function reviewedArtifact(
  id: ArtifactId,
  practicalCapability: string,
  evidence: string,
  reviewedCapabilityIds: readonly ArtifactCivilizationCapabilityId[],
  capabilityReason: string,
  synchronizationMatches: boolean,
  synchronizationReason: string,
): ArtifactEventFacts {
  return {
    practicalCapability,
    source: { path: 'lib/game-types/src/artifact-canon.ts', key: `ARTIFACT_CANON.${id}`, field: 'practicalCapability', evidenceField: 'functionalText' },
    evidence,
    reviewedCapabilityIds,
    capabilityReview: { status: 'reviewed', reason: capabilityReason },
    factReviews: {
      'dependency:distributed_synchronization': {
        matches: synchronizationMatches,
        reason: synchronizationReason,
      },
    },
  };
}

/**
 * Complete v5 scope review, including the planetary expansion. Existing
 * memberships and exclusions are unchanged; new reviews remain explicit.
 * Functional evidence comes from the same canonical authority as public lore.
 * The builder packages reviewed facts; it never classifies mystery or artwork.
 * Live eligibility still requires an operational implementation.
 */
export const ARTIFACT_EVENT_FACTS_BY_ID: Readonly<Record<ArtifactId, ArtifactEventFacts>> = {
  t1r01: reviewedArtifact(
    "t1r01", ARTIFACT_CANON.t1r01.practicalCapability, ARTIFACT_CANON.t1r01.functionalText,
    ["artifact:controlled_energy"],
    "Restrained ignition provides controlled energy; it does not establish universal containment.",
    false, "The local ignition function does not require agreement among separated active nodes.",
  ),
  t1r02: reviewedArtifact(
    "t1r02", ARTIFACT_CANON.t1r02.practicalCapability, ARTIFACT_CANON.t1r02.functionalText,
    ["artifact:ecological_recovery"],
    "Post-burn regrowth supports ecological recovery even though its Affinity is Flare.",
    false, "Recovery of burned ground does not establish distributed timing or control.",
  ),
  t1r03: reviewedArtifact(
    "t1r03", ARTIFACT_CANON.t1r03.practicalCapability, ARTIFACT_CANON.t1r03.functionalText,
    ["artifact:controlled_energy", "artifact:temporal_coordination"],
    "Returning fire at a remembered time combines controlled energy with temporal coordination.",
    false, "A remembered local ignition time does not establish coordination among separated nodes.",
  ),
  t1r04: reviewedArtifact(
    "t1r04", ARTIFACT_CANON.t1r04.practicalCapability, ARTIFACT_CANON.t1r04.functionalText,
    ["artifact:controlled_energy", "artifact:failure_isolation"],
    "Testing consequences before a trigger combines controlled energy with failure isolation.",
    false, "Sequencing one trigger does not establish distributed coordination.",
  ),
  t1r05: reviewedArtifact(
    "t1r05", ARTIFACT_CANON.t1r05.practicalCapability, ARTIFACT_CANON.t1r05.functionalText,
    ["artifact:controlled_energy", "artifact:hazard_containment"],
    "Sealed volatile ignition combines controlled energy with hazard containment.",
    false, "Containing one reserve of energy does not establish distributed coordination.",
  ),
  t1r06: reviewedArtifact(
    "t1r06", ARTIFACT_CANON.t1r06.practicalCapability, ARTIFACT_CANON.t1r06.functionalText,
    ["artifact:energy_conversion"],
    "Storing sunlight and releasing heat supports energy conversion.",
    false, "Light-to-heat conversion does not require agreement among separated active nodes.",
  ),
  t1r07: reviewedArtifact(
    "t1r07", ARTIFACT_CANON.t1r07.practicalCapability, ARTIFACT_CANON.t1r07.functionalText,
    ["artifact:thermal_management", "artifact:energy_conversion"],
    "Routing waste heat into useful work supports thermal management and energy conversion; this function does not establish material recycling.",
    false, "Heat routing alone does not establish synchronization among separated active nodes.",
  ),
  t1r08: reviewedArtifact(
    "t1r08", ARTIFACT_CANON.t1r08.practicalCapability, ARTIFACT_CANON.t1r08.functionalText,
    ["artifact:controlled_energy", "artifact:evidence_verification"],
    "Witnessed, recorded ignition supports controlled energy and evidence verification.",
    false, "Public witnessing is not a distributed timing or control dependency.",
  ),
  t1r09: reviewedArtifact(
    "t1r09", ARTIFACT_CANON.t1r09.practicalCapability, ARTIFACT_CANON.t1r09.functionalText,
    ["artifact:transit_navigation", "artifact:distributed_coordination"],
    "Coordinated weather-adaptive route signals guide freight through planetary terrain and coastal approaches; this is navigation and distributed coordination, not energy production.",
    true, "Separated active beacons must align their route signals as passable corridors change; conflicting signals interrupt the stated freight-routing service.",
  ),
  t1s01: reviewedArtifact(
    "t1s01", ARTIFACT_CANON.t1s01.practicalCapability, ARTIFACT_CANON.t1s01.functionalText,
    ["artifact:hazard_detection"],
    "Detecting imminent structural failure supports hazard detection without literal future information.",
    false, "A warning sensor does not establish shared control among separated active nodes.",
  ),
  t1s02: reviewedArtifact(
    "t1s02", ARTIFACT_CANON.t1s02.practicalCapability, ARTIFACT_CANON.t1s02.functionalText,
    ["artifact:transit_navigation"],
    "Timed acceleration of sealed cargo supports transit and navigation.",
    false, "Timing one launch does not establish synchronization among separated active nodes.",
  ),
  t1s03: reviewedArtifact(
    "t1s03", ARTIFACT_CANON.t1s03.practicalCapability, ARTIFACT_CANON.t1s03.functionalText,
    ["artifact:controlled_shutdown"],
    "Stopping unbounded machine repetition supports controlled shutdown.",
    false, "Stopping local recursion does not establish a distributed dependency.",
  ),
  t1s04: reviewedArtifact(
    "t1s04", ARTIFACT_CANON.t1s04.practicalCapability, ARTIFACT_CANON.t1s04.functionalText,
    ["artifact:material_engineering", "artifact:temporal_coordination"],
    "A calibrated crystal frame synchronizes machines across a planetary installation, accounting for signal travel time. This supports material engineering, temporal coordination within that stated function; the mystery adds no targeting facts.",
    true, "Separated planetary machines explicitly share a calibrated timing reference; signal travel time is accounted for, not abolished.",
  ),
  t1s05: reviewedArtifact(
    "t1s05", ARTIFACT_CANON.t1s05.practicalCapability, ARTIFACT_CANON.t1s05.functionalText,
    ["artifact:resilient_computation"],
    "A sealed protocol checks and repairs a machine's calculations without broadcasting its intermediate state. This supports resilient computation within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. One processor can validate and repair a calculation without broadcasting its intermediate state.",
  ),
  t1s06: reviewedArtifact(
    "t1s06", ARTIFACT_CANON.t1s06.practicalCapability, ARTIFACT_CANON.t1s06.functionalText,
    ["artifact:memory_preservation", "artifact:record_governance"],
    "Adaptive civic records support memory preservation and record governance.",
    false, "An evolving civic archive does not require separated nodes to maintain shared timing or control.",
  ),
  t1s07: reviewedArtifact(
    "t1s07", ARTIFACT_CANON.t1s07.practicalCapability, ARTIFACT_CANON.t1s07.functionalText,
    ["artifact:material_engineering", "artifact:precision_fabrication"],
    "The loom encodes precise building instructions in controlled defects along engineered material threads. This supports material engineering, precision fabrication within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. A laboratory loom and engineered threads provide the full operation, without exotic spacetime strings.",
  ),
  t1s08: reviewedArtifact(
    "t1s08", ARTIFACT_CANON.t1s08.practicalCapability, ARTIFACT_CANON.t1s08.functionalText,
    ["artifact:memory_preservation", "artifact:record_governance"],
    "Keeping and selectively releasing ancestral memories supports memory preservation and record governance.",
    false, "Selective memory release does not establish shared control across separated active nodes.",
  ),
  t1s09: reviewedArtifact(
    "t1s09", ARTIFACT_CANON.t1s09.practicalCapability, ARTIFACT_CANON.t1s09.functionalText,
    ["artifact:transit_navigation", "artifact:distributed_coordination"],
    "Scheduling returning vehicles with prepared landing sites provides navigation and coordination inside one planet's orbital logistics; it does not create interplanetary routes.",
    true, "Returning vehicles and separated landing sites must share a corrected approach schedule as rotation and weather change.",
  ),
  t1e01: reviewedArtifact(
    "t1e01", ARTIFACT_CANON.t1e01.practicalCapability, ARTIFACT_CANON.t1e01.functionalText,
    ["artifact:ecological_propagation", "artifact:ecological_recovery"],
    "Bounded replication repairs damaged land, supporting both ecological propagation and ecological recovery; its unexplained border behavior does not grant general immunity.",
    false, "Controlled replication does not establish live synchronization between replicas.",
  ),
  t1e02: reviewedArtifact(
    "t1e02", ARTIFACT_CANON.t1e02.practicalCapability, ARTIFACT_CANON.t1e02.functionalText,
    ["artifact:resource_extraction"],
    "Recovering nutrients from inaccessible reservoirs supports resource extraction.",
    false, "Accessing hidden nutrients does not establish distributed coordination.",
  ),
  t1e03: reviewedArtifact(
    "t1e03", ARTIFACT_CANON.t1e03.practicalCapability, ARTIFACT_CANON.t1e03.functionalText,
    ["artifact:hazard_detection", "artifact:ecological_recovery"],
    "Probing damaged ground identifies ecological conditions for recovery, supporting ecological hazard assessment and recovery.",
    false, "Ecological probing does not establish shared timing or control among separated active nodes.",
  ),
  t1e04: reviewedArtifact(
    "t1e04", ARTIFACT_CANON.t1e04.practicalCapability, ARTIFACT_CANON.t1e04.functionalText,
    ["artifact:ecological_recovery"],
    "Producing organisms to repair climate supports ecological recovery.",
    false, "Climate repair patterns do not establish a distributed timing dependency.",
  ),
  t1e05: reviewedArtifact(
    "t1e05", ARTIFACT_CANON.t1e05.practicalCapability, ARTIFACT_CANON.t1e05.functionalText,
    ["artifact:material_engineering", "artifact:resilient_computation"],
    "Reconfigurable cellular optical computation supports material engineering and resilient computation within that substrate.",
    false, "Optical computation does not establish physically separated coordinated nodes.",
  ),
  t1e06: reviewedArtifact(
    "t1e06", ARTIFACT_CANON.t1e06.practicalCapability, ARTIFACT_CANON.t1e06.functionalText,
    ["artifact:resource_reclamation", "artifact:ecological_shutdown"],
    "Controlling decomposition and returning dead matter to food supports ecological shutdown and reclamation.",
    false, "Controlling decomposition rates does not establish shared timing across separated active nodes.",
  ),
  t1e07: reviewedArtifact(
    "t1e07", ARTIFACT_CANON.t1e07.practicalCapability, ARTIFACT_CANON.t1e07.functionalText,
    ["artifact:material_engineering", "artifact:ecological_recovery"],
    "Living integration with cracked stone supports material engineering and ecological recovery.",
    false, "Repairing stone through living growth does not establish distributed synchronization.",
  ),
  t1e08: reviewedArtifact(
    "t1e08", ARTIFACT_CANON.t1e08.practicalCapability, ARTIFACT_CANON.t1e08.functionalText,
    ["artifact:ecological_recovery", "artifact:ecological_propagation"],
    "Reactivating dead soil supports ecological recovery and propagation; occasional memories are not an archive capability.",
    false, "Reactivating a biome does not establish coordinated timing among separated nodes.",
  ),
  t1e09: reviewedArtifact(
    "t1e09", ARTIFACT_CANON.t1e09.practicalCapability, ARTIFACT_CANON.t1e09.functionalText,
    ["artifact:habitat_engineering", "artifact:resource_reclamation"],
    "Powered membrane waterworks sustain settlement habitats with freshwater and reclaim useful salts; living material alone does not grant propagation or autonomous repair.",
    false, "Each membrane plant can complete filtration and salt recovery locally without shared timing or correction state among separated active plants.",
  ),
  t1o01: reviewedArtifact(
    "t1o01", ARTIFACT_CANON.t1o01.practicalCapability, ARTIFACT_CANON.t1o01.functionalText,
    ["artifact:concealment"],
    "Masking heat signatures supports concealment; masking failure is not a source of repair.",
    false, "Concealing heat does not establish shared control across separated active nodes.",
  ),
  t1o02: reviewedArtifact(
    "t1o02", ARTIFACT_CANON.t1o02.practicalCapability, ARTIFACT_CANON.t1o02.functionalText,
    ["artifact:hazard_detection", "artifact:boundary_observation"],
    "Detecting unsafe boundaries supports hazard detection and boundary observation.",
    false, "Observing boundaries does not establish distributed synchronization.",
  ),
  t1o03: reviewedArtifact(
    "t1o03", ARTIFACT_CANON.t1o03.practicalCapability, ARTIFACT_CANON.t1o03.functionalText,
    ["artifact:memory_preservation", "artifact:information_recovery"],
    "Preserving a destroyed object's imprint supports memory preservation and information recovery.",
    false, "An imprint can be observed without synchronizing separated active nodes.",
  ),
  t1o04: reviewedArtifact(
    "t1o04", ARTIFACT_CANON.t1o04.practicalCapability, ARTIFACT_CANON.t1o04.functionalText,
    ["artifact:concealment"],
    "Suppressing sound and signals supports concealment; living material does not imply ecological recovery.",
    false, "Suppressing signals is not evidence of maintaining shared timing or control.",
  ),
  t1o05: reviewedArtifact(
    "t1o05", ARTIFACT_CANON.t1o05.practicalCapability, ARTIFACT_CANON.t1o05.functionalText,
    ["artifact:precision_fabrication"],
    "Reliable forming in vacuum supports precision fabrication.",
    false, "Precision forming does not establish a distributed coordination dependency.",
  ),
  t1o06: reviewedArtifact(
    "t1o06", ARTIFACT_CANON.t1o06.practicalCapability, ARTIFACT_CANON.t1o06.functionalText,
    ["artifact:resource_reclamation", "artifact:distributed_coordination"],
    "Routing decomposition through a network supports reclamation and distributed coordination.",
    false, "A distributed material-routing web does not establish synchronized timing, alignment, or correction state.",
  ),
  t1o07: reviewedArtifact(
    "t1o07", ARTIFACT_CANON.t1o07.practicalCapability, ARTIFACT_CANON.t1o07.functionalText,
    ["artifact:material_engineering", "artifact:boundary_observation"],
    "The shard maps hidden voids inside engineered materials against a calibrated negative-space reference. This supports material engineering, boundary observation within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Reference material measures internal voids in engineered solids; it neither creates nor supports spacetime gaps.",
  ),
  t1o08: reviewedArtifact(
    "t1o08", ARTIFACT_CANON.t1o08.practicalCapability, ARTIFACT_CANON.t1o08.functionalText,
    ["artifact:concealment", "artifact:record_governance"],
    "The seal restricts access to a dangerous hour's records while preserving the original evidence. This supports concealment, record governance within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Only access to a local historical record changes; the event and its consequences remain intact.",
  ),
  t1o09: reviewedArtifact(
    "t1o09", ARTIFACT_CANON.t1o09.practicalCapability, ARTIFACT_CANON.t1o09.functionalText,
    ["artifact:secure_communication", "artifact:distributed_coordination"],
    "Authenticated, compartmentalized dispatches protect logistics communication while assigning work across settlements and ports; they do not erase traffic or grant universal secrecy.",
    false, "Relays can deliver independently authenticated dispatches without a common live clock or aligned control state; communication alone is not distributed synchronization.",
  ),
  t1p01: reviewedArtifact(
    "t1p01", ARTIFACT_CANON.t1p01.practicalCapability, ARTIFACT_CANON.t1p01.functionalText,
    ["artifact:system_stabilization"],
    "Guiding a damaged system toward repair supports system stabilization.",
    false, "System repair does not itself establish separated nodes sharing timing or control.",
  ),
  t1p02: reviewedArtifact(
    "t1p02", ARTIFACT_CANON.t1p02.practicalCapability, ARTIFACT_CANON.t1p02.functionalText,
    ["artifact:system_stabilization"],
    "The shard uses feedback to hold an instrument stable against vibration and drift relative to its mount. This supports system stabilization within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Feedback stabilizes one instrument relative to its mount, not the world or universe.",
  ),
  t1p03: reviewedArtifact(
    "t1p03", ARTIFACT_CANON.t1p03.practicalCapability, ARTIFACT_CANON.t1p03.functionalText,
    ["artifact:signal_interpretation", "artifact:evidence_verification"],
    "The prism checks incoming signals against trusted reference patterns, separating verifiable measurements from persuasive interference. This supports signal interpretation, evidence verification within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Known reference signals can be checked locally; intentions and universal truth cannot.",
  ),
  t1p04: reviewedArtifact(
    "t1p04", ARTIFACT_CANON.t1p04.practicalCapability, ARTIFACT_CANON.t1p04.functionalText,
    ["artifact:hazard_containment"],
    "Magnetic confinement of plasma supports hazard containment; it does not imply a leak.",
    false, "Field containment does not establish distributed synchronization.",
  ),
  t1p05: reviewedArtifact(
    "t1p05", ARTIFACT_CANON.t1p05.practicalCapability, ARTIFACT_CANON.t1p05.functionalText,
    ["artifact:signal_interpretation", "artifact:evidence_verification"],
    "Auditing observational bias supports signal interpretation and evidence verification within the observation.",
    false, "Self-auditing observation does not establish separated active nodes sharing control.",
  ),
  t1p06: reviewedArtifact(
    "t1p06", ARTIFACT_CANON.t1p06.practicalCapability, ARTIFACT_CANON.t1p06.functionalText,
    ["artifact:system_stabilization", "artifact:distributed_coordination"],
    "A junction coordinating buildings' repair supports system stabilization and distributed coordination.",
    true, "Buildings depend on this junction to coordinate their active repair state.",
  ),
  t1p07: reviewedArtifact(
    "t1p07", ARTIFACT_CANON.t1p07.practicalCapability, ARTIFACT_CANON.t1p07.functionalText,
    ["artifact:boundary_observation", "artifact:signal_interpretation"],
    "The prism resolves faint radiation and field changes at the boundary of a shielded vacuum chamber. This supports boundary observation, signal interpretation within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. A sensor resolves faint radiation at a shielded chamber boundary; it opens no passage.",
  ),
  t1p08: reviewedArtifact(
    "t1p08", ARTIFACT_CANON.t1p08.practicalCapability, ARTIFACT_CANON.t1p08.functionalText,
    ["artifact:memory_preservation"],
    "A preserved life-pattern reference supports memory preservation without establishing living tissue.",
    false, "A preserved reference does not coordinate separated active nodes.",
  ),
  t1p09: reviewedArtifact(
    "t1p09", ARTIFACT_CANON.t1p09.practicalCapability, ARTIFACT_CANON.t1p09.functionalText,
    ["artifact:plural_governance", "artifact:habitat_engineering"],
    "Auditable release agreements govern competing settlement needs while sustaining freshwater habitats and ecological flows; allocation is not a claim to create water.",
    false, "Each waterworks can apply its agreed allocation locally; inspectable agreements do not require separated gates to maintain common live timing or control.",
  ),
  t2r01: reviewedArtifact(
    "t2r01", ARTIFACT_CANON.t2r01.practicalCapability, ARTIFACT_CANON.t2r01.functionalText,
    ["artifact:material_engineering", "artifact:precision_fabrication"],
    "Refines matter lifted from the local star in shielded orbital furnaces, supplying the system's industries with continuously replenished alloys. This supports material engineering, precision fabrication within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. A planetary furnace alone lacks the continuing star-lift feed and orbital industrial chain.",
  ),
  t2r02: reviewedArtifact(
    "t2r02", ARTIFACT_CANON.t2r02.practicalCapability, ARTIFACT_CANON.t2r02.functionalText,
    ["artifact:energy_conversion", "artifact:failure_isolation"],
    "Stores surplus solar energy as transportable fuel and maintains isolated reserves for shadowed habitats, preventing eclipse shortages from cascading between inhabited orbits. This supports energy conversion, failure isolation within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. The replacement balances moving illuminated and shadowed orbital populations; a local fuel ledger does not deliver this service.",
  ),
  t2r03: reviewedArtifact(
    "t2r03", ARTIFACT_CANON.t2r03.practicalCapability, ARTIFACT_CANON.t2r03.functionalText,
    ["artifact:resource_extraction", "artifact:hazard_containment"],
    "Controlling an extracted stream of stellar matter supports resource extraction and hazard containment.",
    false, "Controlling one extraction stream does not establish distributed synchronization.",
  ),
  t2r04: reviewedArtifact(
    "t2r04", ARTIFACT_CANON.t2r04.practicalCapability, ARTIFACT_CANON.t2r04.functionalText,
    ["artifact:energy_conversion", "artifact:habitat_engineering"],
    "Grows inhabited photosynthetic collector swarms around one star, converting harvested light into heat and chemical reserves for the system's habitats. This supports energy conversion, habitat engineering within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. The replacement harvests one star through an inhabited collector swarm; one lamp or planetary greenhouse cannot supply the network.",
  ),
  t2r05: reviewedArtifact(
    "t2r05", ARTIFACT_CANON.t2r05.practicalCapability, ARTIFACT_CANON.t2r05.functionalText,
    ["artifact:controlled_energy", "artifact:failure_isolation"],
    "Governs stellar extraction and power-beam shutdowns using predicted exposure at inhabited orbits, preventing a safe local release from striking another world. This supports controlled energy, failure isolation within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. The replacement must forecast exposure at other moving inhabited orbits before a stellar power release.",
  ),
  t2r06: reviewedArtifact(
    "t2r06", ARTIFACT_CANON.t2r06.practicalCapability, ARTIFACT_CANON.t2r06.functionalText,
    ["artifact:thermal_management", "artifact:energy_conversion"],
    "Routes industrial waste heat through successively colder orbital stages, extracting useful work before outer-system radiators emit the remainder to space. This supports thermal management, energy conversion within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. The replacement uses industrial stages in different orbital thermal environments and outer-system radiators.",
  ),
  t2s01: reviewedArtifact(
    "t2s01", ARTIFACT_CANON.t2s01.practicalCapability, ARTIFACT_CANON.t2s01.functionalText,
    ["artifact:transit_navigation", "artifact:predictive_modeling"],
    "Maintains corrected gravity-assist routes between moving planets, catching transfer windows and rerouting convoys when orbital resonances drift. This supports transit navigation, predictive modeling within that stated function; the mystery adds no targeting facts.",
    false, "This operation computes routes from observed planetary motion; corrected ephemerides alone do not establish aligned control of separated active machines.",
  ),
  t2s02: reviewedArtifact(
    "t2s02", ARTIFACT_CANON.t2s02.practicalCapability, ARTIFACT_CANON.t2s02.functionalText,
    ["artifact:hazard_detection", "artifact:memory_preservation"],
    "Combines archived solar storms with probes distributed around one star to warn inhabited orbits before charged-particle fronts arrive. This supports hazard detection, memory preservation within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Probes around the star provide upstream warnings that a local planetary sensor cannot supply.",
  ),
  t2s03: reviewedArtifact(
    "t2s03", ARTIFACT_CANON.t2s03.practicalCapability, ARTIFACT_CANON.t2s03.functionalText,
    ["artifact:predictive_modeling", "artifact:evidence_verification"],
    "Tests competing models of planetary resonances and industrial mass transfers, exposing which proposed migrations would destabilize inhabited orbits within one star system. This supports predictive modeling, evidence verification within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Planetary resonances and exchanged industrial mass create a coupled stellar-dynamics problem.",
  ),
  t2s04: reviewedArtifact(
    "t2s04", ARTIFACT_CANON.t2s04.practicalCapability, ARTIFACT_CANON.t2s04.functionalText,
    ["artifact:memory_preservation", "artifact:plural_governance"],
    "Carries whole societies between planets on slow migrations, maintaining distinct civic records and living institutions through generations in transit. This supports memory preservation, plural governance within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Whole societies must remain institutionally distinct while physically migrating between planets.",
  ),
  t2s05: reviewedArtifact(
    "t2s05", ARTIFACT_CANON.t2s05.practicalCapability, ARTIFACT_CANON.t2s05.functionalText,
    ["artifact:memory_preservation", "artifact:distributed_coordination"],
    "Indexes independently dated records from planets and habitats around one star, keeping different observations comparable without imposing a single authoritative account. This supports memory preservation, distributed coordination within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. No single planetary record contains the different witnesses needed for the comparison.",
  ),
  t2s06: reviewedArtifact(
    "t2s06", ARTIFACT_CANON.t2s06.practicalCapability, ARTIFACT_CANON.t2s06.functionalText,
    ["artifact:signal_interpretation", "artifact:hazard_detection"],
    "Separates overlapping stellar-plasma, industrial-beam, and magnetospheric signals, warning when their interference makes navigation across the star system unreliable. This supports signal interpretation, hazard detection within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. The replacement separates the star, planetary magnetospheres, and industrial transmitters as a coupled signal environment.",
  ),
  t2e01: reviewedArtifact(
    "t2e01", ARTIFACT_CANON.t2e01.practicalCapability, ARTIFACT_CANON.t2e01.functionalText,
    ["artifact:ecological_adaptation", "artifact:hazard_containment"],
    "Maintains living shields and repair ecologies through stellar particle storms, preserving inhabited orbital belts beyond planetary magnetic protection. This supports ecological adaptation, hazard containment within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. The replacement sustains orbital biospheres through stellar particle storms without planetary magnetic shelter.",
  ),
  t2e02: reviewedArtifact(
    "t2e02", ARTIFACT_CANON.t2e02.practicalCapability, ARTIFACT_CANON.t2e02.functionalText,
    ["artifact:ecological_shutdown", "artifact:temporal_coordination"],
    "Keeps interplanetary sleeper fleets alive through decades without resupply, timing ecological shutdown and revival against each destination world's orbital arrival window. This supports ecological shutdown, temporal coordination within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Revival must meet a moving destination after interplanetary travel without resupply.",
  ),
  t2e03: reviewedArtifact(
    "t2e03", ARTIFACT_CANON.t2e03.practicalCapability, ARTIFACT_CANON.t2e03.functionalText,
    ["artifact:ecological_adaptation", "artifact:hazard_containment"],
    "Sustains quarantined settlements on sunless outer-system bodies by exchanging complementary chemical feedstocks among moons, comets, and sealed habitat ecologies. This supports ecological adaptation, hazard containment within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. The replacement depends on complementary chemical reservoirs on separate outer-system bodies, not one closed culture vessel.",
  ),
  t2e04: reviewedArtifact(
    "t2e04", ARTIFACT_CANON.t2e04.practicalCapability, ARTIFACT_CANON.t2e04.functionalText,
    ["artifact:cross_ecology_mediation", "artifact:signal_interpretation"],
    "Translates biological and machine messages between the inhabited worlds of one star system, preserving ecological meaning across radio delays and incompatible hosts. This supports cross ecology mediation, signal interpretation within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Different planetary hosts and radio delays constrain a working biological communication service.",
  ),
  t2e05: reviewedArtifact(
    "t2e05", ARTIFACT_CANON.t2e05.practicalCapability, ARTIFACT_CANON.t2e05.functionalText,
    ["artifact:memory_preservation", "artifact:evidence_verification"],
    "Reconstructs interplanetary biological exchanges by cross-dating living archives, impact deposits, and transported specimens against distinct orbital histories. This supports memory preservation, evidence verification within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. The replacement reconstructs exchanges between planets from independent biological and orbital histories.",
  ),
  t2e06: reviewedArtifact(
    "t2e06", ARTIFACT_CANON.t2e06.practicalCapability, ARTIFACT_CANON.t2e06.functionalText,
    ["artifact:ecological_propagation", "artifact:habitat_engineering"],
    "Grows self-repairing crystal-organic settlements from asteroid feedstock, maintaining sealed ecosystems along inhabited belts without importing planetary soil. This supports ecological propagation, habitat engineering within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. The replacement turns asteroid resources into sealed inhabited belts without a planetary soil supply.",
  ),
  t2o01: reviewedArtifact(
    "t2o01", ARTIFACT_CANON.t2o01.practicalCapability, ARTIFACT_CANON.t2o01.functionalText,
    ["artifact:boundary_observation", "artifact:hazard_containment"],
    "Samples and diverts charged matter from a compact star's accretion flow through shielded stand-off collectors, containing unstable releases outside inhabited orbits. This supports boundary observation, hazard containment within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Stand-off collection near a compact star's accretion flow requires a stellar high-energy environment. The existing Blueprint sink role remains supported.",
  ),
  t2o02: reviewedArtifact(
    "t2o02", ARTIFACT_CANON.t2o02.practicalCapability, ARTIFACT_CANON.t2o02.functionalText,
    ["artifact:hazard_containment", "artifact:record_governance"],
    "Quarantines compromised instructions at interplanetary relay junctions, preserving inspectable records while preventing light-delay-separated worlds from repeating a dangerous command. This supports hazard containment, record governance within that stated function; the mystery adds no targeting facts.",
    false, "This operation filters commands at autonomous relay barriers; delayed record exchange is not shared timing.",
  ),
  t2o03: reviewedArtifact(
    "t2o03", ARTIFACT_CANON.t2o03.practicalCapability, ARTIFACT_CANON.t2o03.functionalText,
    ["artifact:thermal_management", "artifact:concealment"],
    "Routes a star system's industrial waste heat into directional radiator corridors, reducing detection along selected approaches while still emitting the heat. This supports thermal management, concealment within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Multiple orbital heat sources and approach directions determine the system's observable signature. Heat remains emitted.",
  ),
  t2o04: reviewedArtifact(
    "t2o04", ARTIFACT_CANON.t2o04.practicalCapability, ARTIFACT_CANON.t2o04.functionalText,
    ["artifact:precision_fabrication", "artifact:resource_reclamation"],
    "Rebuilds a lost planet's essential industries in dispersed orbital yards using salvaged matter, surviving machine records, and feedstock from the system's other worlds. This supports precision fabrication, resource reclamation within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. The replacement rebuilds a destroyed world's industry using surviving worlds and dispersed orbital yards.",
  ),
  t2o05: reviewedArtifact(
    "t2o05", ARTIFACT_CANON.t2o05.practicalCapability, ARTIFACT_CANON.t2o05.functionalText,
    ["artifact:ecological_shutdown", "artifact:failure_isolation"],
    "Cycles outer-system biospheres between growth and dormancy over extreme cometary orbits, preventing long dark seasons from exhausting stored nutrients. This supports ecological shutdown, failure isolation within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. The replacement follows extreme cometary orbits and their long, unequal stellar seasons.",
  ),
  t2o06: reviewedArtifact(
    "t2o06", ARTIFACT_CANON.t2o06.practicalCapability, ARTIFACT_CANON.t2o06.functionalText,
    ["artifact:hazard_detection", "artifact:boundary_observation"],
    "Maps changing tidal forces around a compact stellar companion, warning habitats and transfer fleets before their routes enter destructive gravity gradients. This supports hazard detection, boundary observation within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. The replacement maps a compact companion's changing gravity gradients for occupied orbits and transfers.",
  ),
  t2p01: reviewedArtifact(
    "t2p01", ARTIFACT_CANON.t2p01.practicalCapability, ARTIFACT_CANON.t2p01.functionalText,
    ["artifact:hazard_containment", "artifact:evidence_verification"],
    "Partitions stellar extraction and processing orbits into independently inspectable containment cells, preventing a failed plasma installation from spilling into neighboring inhabited routes. This supports hazard containment, evidence verification within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. The replacement partitions high-energy stellar extraction orbits and protects neighboring inhabited routes.",
  ),
  t2p02: reviewedArtifact(
    "t2p02", ARTIFACT_CANON.t2p02.practicalCapability, ARTIFACT_CANON.t2p02.functionalText,
    ["artifact:hazard_detection", "artifact:signal_interpretation"],
    "Detects contradictions between planetary reference frames before navigation systems merge them, preventing a locally valid route from becoming a collision elsewhere. This supports hazard detection, signal interpretation within that stated function; the mystery adds no targeting facts.",
    false, "This operation compares reference frames; detecting conflicting models does not require synchronized live control.",
  ),
  t2p03: reviewedArtifact(
    "t2p03", ARTIFACT_CANON.t2p03.practicalCapability, ARTIFACT_CANON.t2p03.functionalText,
    ["artifact:cross_ecology_mediation", "artifact:plural_governance"],
    "Maintains resource agreements between the biospheres of one inhabited star system, translating local ecological needs into obligations each world can verify. This supports cross ecology mediation, plural governance within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. A single planetary institution cannot supply the separate biospheres and independently verifiable obligations.",
  ),
  t2p04: reviewedArtifact(
    "t2p04", ARTIFACT_CANON.t2p04.practicalCapability, ARTIFACT_CANON.t2p04.functionalText,
    ["artifact:controlled_energy", "artifact:distributed_coordination"],
    "Coordinates mirror swarms around one star so changing beam paths illuminate working habitats without scorching intervening orbits. This supports controlled energy, distributed coordination within that stated function; the mystery adds no targeting facts.",
    true, "Beam steering across moving mirrors and inhabited orbits requires aligned active control.",
  ),
  t2p05: reviewedArtifact(
    "t2p05", ARTIFACT_CANON.t2p05.practicalCapability, ARTIFACT_CANON.t2p05.functionalText,
    ["artifact:resilient_computation", "artifact:distributed_coordination"],
    "Maintains shared correction state across radiation-exposed stellar computers, reconciling delayed results while isolating damaged nodes. This supports resilient computation, distributed coordination within that stated function; the mystery adds no targeting facts.",
    true, "Separated computing stations explicitly maintain shared error-correction state despite delay and radiation damage.",
  ),
  t2p06: reviewedArtifact(
    "t2p06", ARTIFACT_CANON.t2p06.practicalCapability, ARTIFACT_CANON.t2p06.functionalText,
    ["artifact:distributed_coordination", "artifact:plural_governance"],
    "Allocates access to one star's light among inhabited orbits, reconciling competing illumination and radiation-shielding needs through agreements each habitat can inspect. This supports distributed coordination, plural governance within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Multiple habitats share exposure and shielding obligations around the same star.",
  ),
  t3r01: reviewedArtifact(
    "t3r01", ARTIFACT_CANON.t3r01.practicalCapability, ARTIFACT_CANON.t3r01.functionalText,
    ["artifact:controlled_energy", "artifact:transit_navigation"],
    "Steers inhabited stars into safe migration corridors through a crowded galactic arm, using coordinated stellar thrust and long-horizon encounter forecasts. This supports controlled energy, transit navigation within that stated function; the mystery adds no targeting facts.",
    true, "Coordinated thrust must preserve relative stellar trajectories against a shared, repeatedly corrected regional encounter model.",
  ),
  t3r02: reviewedArtifact(
    "t3r02", ARTIFACT_CANON.t3r02.practicalCapability, ARTIFACT_CANON.t3r02.functionalText,
    ["artifact:resource_reclamation", "artifact:hazard_containment"],
    "Restores depleted galactic regions by exchanging complementary feedstocks from unlike stellar remnants, containing hazardous residues throughout the supply chain. This supports resource reclamation, hazard containment within that stated function; the mystery adds no targeting facts.",
    false, "This operation exchanges material between locally managed yards; delayed consignments do not require an aligned active control state.",
  ),
  t3r03: reviewedArtifact(
    "t3r03", ARTIFACT_CANON.t3r03.practicalCapability, ARTIFACT_CANON.t3r03.functionalText,
    ["artifact:controlled_energy", "artifact:temporal_coordination"],
    "Schedules energy deliveries among a galactic arm's unequal stars, routing supply around exhausted systems through continually corrected emission and reception schedules. This supports controlled energy, temporal coordination within that stated function; the mystery adds no targeting facts.",
    true, "Corrected emission and reception schedules explicitly align separated stellar energy deliveries.",
  ),
  t3r04: reviewedArtifact(
    "t3r04", ARTIFACT_CANON.t3r04.practicalCapability, ARTIFACT_CANON.t3r04.functionalText,
    ["artifact:precision_fabrication", "artifact:habitat_engineering"],
    "Builds inhabited staging fleets across an interarm void through mobile foundries sharing production state and recycling carried feedstock. This supports precision fabrication, habitat engineering within that stated function; the mystery adds no targeting facts.",
    true, "Successive staging fleets depend on the foundry chain's shared production and delivery state.",
  ),
  t3s01: reviewedArtifact(
    "t3s01", ARTIFACT_CANON.t3s01.practicalCapability, ARTIFACT_CANON.t3s01.functionalText,
    ["artifact:transit_navigation", "artifact:distributed_coordination"],
    "Coordinates galactic-arm transport through launch, navigation, braking, and alternate routes that preserve travel after entire stellar junctions fail. This supports transit navigation, distributed coordination within that stated function; the mystery adds no targeting facts.",
    true, "Launch, relay, and braking schedules align separated active junctions even though messages and vessels take time to travel.",
  ),
  t3s02: reviewedArtifact(
    "t3s02", ARTIFACT_CANON.t3s02.practicalCapability, ARTIFACT_CANON.t3s02.functionalText,
    ["artifact:record_governance", "artifact:plural_governance"],
    "Keeps public services interoperable across a galactic arm as stellar societies diverge, reconciling centuries-delayed civic records while preserving local decisions. This supports record governance, plural governance within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. One system cannot supply the long-isolated descendants whose public services must remain interoperable without one live government.",
  ),
  t3s03: reviewedArtifact(
    "t3s03", ARTIFACT_CANON.t3s03.practicalCapability, ARTIFACT_CANON.t3s03.functionalText,
    ["artifact:information_recovery", "artifact:memory_preservation"],
    "Reconstructs extinct galactic civilizations by cross-matching fragments scattered across thousands of systems, preserving the recovered histories in independent repositories. This supports information recovery, memory preservation within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Lost histories are reconstructed from complementary fragments dispersed beyond any surviving stellar archive.",
  ),
  t3s04: reviewedArtifact(
    "t3s04", ARTIFACT_CANON.t3s04.practicalCapability, ARTIFACT_CANON.t3s04.functionalText,
    ["artifact:temporal_coordination", "artifact:evidence_verification"],
    "Reconstructs galactic-arm causal histories from unequal stellar clocks, travel records, and delayed testimony, preserving genuinely unordered events. This supports temporal coordination, evidence verification within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Independent clocks, travel paths, and delayed testimony across the arm are essential evidence, not copies of one clock.",
  ),
  t3e01: reviewedArtifact(
    "t3e01", ARTIFACT_CANON.t3e01.practicalCapability, ARTIFACT_CANON.t3e01.functionalText,
    ["artifact:ecological_propagation", "artifact:transit_navigation"],
    "Establishes a self-sustaining biosphere migration front across a galactic arm through successive seed convoys and acclimation stations beyond the founding worlds' support. This supports ecological propagation, transit navigation within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. A local nursery cannot maintain successive settlement generations across an arm without the convoy and acclimation chain.",
  ),
  t3e02: reviewedArtifact(
    "t3e02", ARTIFACT_CANON.t3e02.practicalCapability, ARTIFACT_CANON.t3e02.functionalText,
    ["artifact:ecological_adaptation", "artifact:habitat_engineering"],
    "Transfers inhabited collector ecologies between aging and younger stellar populations across galactic regions, preserving lineages after host-star loss. This supports ecological adaptation, habitat engineering within that stated function; the mystery adds no targeting facts.",
    false, "This operation transfers ecologies through successive locally controlled habitats; a regional migration lineage is not shared live timing.",
  ),
  t3e03: reviewedArtifact(
    "t3e03", ARTIFACT_CANON.t3e03.practicalCapability, ARTIFACT_CANON.t3e03.functionalText,
    ["artifact:resource_reclamation", "artifact:ecological_recovery"],
    "Reclaims biospheres after regional extinction using complementary decomposers, nutrient-cycle organisms, and seed stocks preserved across a galactic arm. This supports resource reclamation, ecological recovery within that stated function; the mystery adds no targeting facts.",
    false, "This operation reconstructs ecologies from independently maintained stocks; complementary source material is not shared active control.",
  ),
  t3e04: reviewedArtifact(
    "t3e04", ARTIFACT_CANON.t3e04.practicalCapability, ARTIFACT_CANON.t3e04.functionalText,
    ["artifact:cross_ecology_mediation", "artifact:hazard_containment"],
    "Closes galactic-arm nutrient cycles through quarantined exchanges among independently evolved biospheres; no single biosphere can complete the cycle. This supports cross ecology mediation, hazard containment within that stated function; the mystery adds no targeting facts.",
    false, "This operation uses locally quarantined conversion stages; closing a regional nutrient cycle does not require synchronized stages.",
  ),
  t3o01: reviewedArtifact(
    "t3o01", ARTIFACT_CANON.t3o01.practicalCapability, ARTIFACT_CANON.t3o01.functionalText,
    ["artifact:ecological_shutdown", "artifact:habitat_engineering"],
    "Preserves dormant civilizations beyond shared stellar hazards across galactic regions, maintaining independent revival paths after entire clusters perish. This supports ecological shutdown, habitat engineering within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Independent refuges outside shared stellar hazard zones can resettle destroyed clusters; one system cannot survive its own complete loss.",
  ),
  t3o02: reviewedArtifact(
    "t3o02", ARTIFACT_CANON.t3o02.practicalCapability, ARTIFACT_CANON.t3o02.functionalText,
    ["artifact:hazard_containment", "artifact:failure_isolation"],
    "Cuts infected transport and automation routes between stellar clusters across a galactic arm, containing regional cascades while isolated junctions preserve safe local service. This supports hazard containment, failure isolation within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. Cutting paths between clusters contains a regional cascade while preserving disconnected local service.",
  ),
  t3o03: reviewedArtifact(
    "t3o03", ARTIFACT_CANON.t3o03.practicalCapability, ARTIFACT_CANON.t3o03.functionalText,
    ["artifact:concealment", "artifact:secure_communication"],
    "Conceals authenticated messages through timed galactic-arm relays and decoys, defeating observers who combine evidence gathered at many stars. This supports concealment, secure communication within that stated function; the mystery adds no targeting facts.",
    true, "Timed relays and coordinated decoys depend on shared emission relationships, not merely stored messages.",
  ),
  t3o04: reviewedArtifact(
    "t3o04", ARTIFACT_CANON.t3o04.practicalCapability, ARTIFACT_CANON.t3o04.functionalText,
    ["artifact:boundary_observation", "artifact:signal_interpretation"],
    "Combines time-calibrated observations across a galactic arm into a three-dimensional dark-matter map, separating local disturbances from the galaxy's shared gravitational structure. This supports boundary observation, signal interpretation within that stated function; the mystery adds no targeting facts.",
    true, "Combining the stellar baseline requires time-calibrated observations from separated active detectors.",
  ),
  t3p01: reviewedArtifact(
    "t3p01", ARTIFACT_CANON.t3p01.practicalCapability, ARTIFACT_CANON.t3p01.functionalText,
    ["artifact:plural_governance", "artifact:evidence_verification"],
    "Operates galactic-arm treaty ports through verifiable consent and delayed arbitration, sustaining shared services beyond any common live government. This supports plural governance, evidence verification within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. One stellar polity cannot supply the separately sovereign, causally delayed parties whose shared ports remain usable.",
  ),
  t3p02: reviewedArtifact(
    "t3p02", ARTIFACT_CANON.t3p02.practicalCapability, ARTIFACT_CANON.t3p02.functionalText,
    ["artifact:precision_fabrication", "artifact:evidence_verification"],
    "Reconstructs lost galactic technologies whose surviving fabrication steps are scattered among stellar cultures, joining independently verified processes into complete working machines. This supports precision fabrication, evidence verification within that stated function; the mystery adds no targeting facts.",
    false, "This operation combines independently verified fabrication outputs; process provenance is not shared live correction state.",
  ),
  t3p03: reviewedArtifact(
    "t3p03", ARTIFACT_CANON.t3p03.practicalCapability, ARTIFACT_CANON.t3p03.functionalText,
    ["artifact:resilient_computation", "artifact:distributed_coordination"],
    "Combines conscious stellar swarms through shared correction state for galactic computations whose working data exceed one star's computing resources. This supports resilient computation, distributed coordination within that stated function; the mystery adds no targeting facts.",
    true, "The joint calculation explicitly requires shared correction state among independently conscious stellar swarms.",
  ),
  t3p04: reviewedArtifact(
    "t3p04", ARTIFACT_CANON.t3p04.practicalCapability, ARTIFACT_CANON.t3p04.functionalText,
    ["artifact:evidence_verification", "artifact:memory_preservation"],
    "Preserves authenticated testimony throughout a galactic arm, keeping destroyed or captured civilizations represented by evidence beyond their attackers' local reach. This supports evidence verification, memory preservation within that stated function; the mystery adds no targeting facts.",
    false, "This operation can retain its stated local stages or independently recorded evidence without a common live timing or correction state. A witness held only in the originating system cannot outlast an attacker's complete local control.",
  ),

};

export function getArtifactEventFacts(artifactId: string): ArtifactEventFacts | undefined {
  return Object.hasOwn(ARTIFACT_EVENT_FACTS_BY_ID, artifactId)
    ? ARTIFACT_EVENT_FACTS_BY_ID[artifactId as ArtifactId]
    : undefined;
}

export function getArtifactEventFactEvidence(
  artifactId: string,
  factId: ArtifactEventFactId,
): ArtifactEventFactReview | undefined {
  return getArtifactEventFacts(artifactId)?.factReviews[factId];
}

export function artifactHasEventFact(artifactId: string, factId: ArtifactEventFactId): boolean {
  return getArtifactEventFactEvidence(artifactId, factId)?.matches === true;
}
