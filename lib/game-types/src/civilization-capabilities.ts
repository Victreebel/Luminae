import type { ArtifactId } from './artifacts';

/**
 * Governing Artifact ontology for Civilization rules.
 *
 * The catalytic proposal is not adopted as a replacement rules model. Its
 * useful observation, that local embodiments differ, is already represented
 * by the distinction between a translated capability class and one current
 * operational implementation.
 */
export const ARTIFACT_CIVILIZATION_ONTOLOGY = {
  id: 'translated-capability-operational-implementation-v1',
  artifactMeaning: 'translated_capability_class',
  forgeMeaning: 'accelerated_first_operational_mastery',
  implementationMeaning: 'local_operational_realization',
  lineageMeaning: 'credible_developmental_route_not_standard_prerequisite',
  damageMeaning: 'temporary_implementation_disablement',
  annihilationMeaning: 'permanent_implementation_loss_with_discovery_preserved',
  catalyticReplacementStatus: 'not_adopted',
} as const;

export const ARTIFACT_CIVILIZATION_CAPABILITY_DEFINITIONS = [
  {
    id: 'artifact:controlled_energy',
    label: 'Controlled energy',
    description: 'Initiate, govern, or release energetic processes within known limits.',
  },
  {
    id: 'artifact:energy_conversion',
    label: 'Energy conversion',
    description: 'Convert biological, radiant, thermal, or other energy into usable work.',
  },
  {
    id: 'artifact:thermal_management',
    label: 'Thermal management',
    description: 'Route, contain, conceal, or reuse dangerous heat and entropy flows.',
  },
  {
    id: 'artifact:resource_extraction',
    label: 'Resource extraction',
    description: 'Recover usable matter or nutrients from difficult physical environments.',
  },
  {
    id: 'artifact:resource_reclamation',
    label: 'Resource reclamation',
    description: 'Return waste, decay products, or failed-system matter to useful service.',
  },
  {
    id: 'artifact:material_engineering',
    label: 'Material engineering',
    description: 'Create or characterize materials with unusual structural properties.',
  },
  {
    id: 'artifact:precision_fabrication',
    label: 'Precision fabrication',
    description: 'Produce reliable components or structures under demanding conditions.',
  },
  {
    id: 'artifact:transit_navigation',
    label: 'Transit and navigation',
    description: 'Move matter safely or derive routes across difficult distances or boundaries.',
  },
  {
    id: 'artifact:system_stabilization',
    label: 'System stabilization',
    description: 'Hold a physical, informational, or civic system near a safe operating state.',
  },
  {
    id: 'artifact:hazard_containment',
    label: 'Hazard containment',
    description: 'Bound dangerous matter, energy, information, or environmental processes.',
  },
  {
    id: 'artifact:failure_isolation',
    label: 'Failure isolation',
    description: 'Prevent one failure from cascading into adjacent systems or populations.',
  },
  {
    id: 'artifact:ecological_adaptation',
    label: 'Ecological adaptation',
    description: 'Help living systems remain viable under unfamiliar or changing conditions.',
  },
  {
    id: 'artifact:ecological_recovery',
    label: 'Ecological recovery',
    description: 'Repair damaged ecologies, living infrastructure, or biological interfaces.',
  },
  {
    id: 'artifact:ecological_propagation',
    label: 'Ecological propagation',
    description: 'Replicate or establish bounded living systems in viable environments.',
  },
  {
    id: 'artifact:ecological_shutdown',
    label: 'Ecological shutdown',
    description: 'Place living systems into controlled dormancy, decomposition, or cessation.',
  },
  {
    id: 'artifact:habitat_engineering',
    label: 'Habitat engineering',
    description: 'Construct or encode environments that sustain sapient or ecological life.',
  },
  {
    id: 'artifact:cross_ecology_mediation',
    label: 'Cross-ecology mediation',
    description: 'Enable exchange between incompatible living systems without assimilation.',
  },
  {
    id: 'artifact:hazard_detection',
    label: 'Hazard detection',
    description: 'Detect dangerous changes early enough for a response to remain possible.',
  },
  {
    id: 'artifact:boundary_observation',
    label: 'Boundary observation',
    description: 'Observe physical or categorical boundaries ordinary instruments cannot resolve.',
  },
  {
    id: 'artifact:predictive_modeling',
    label: 'Predictive modeling',
    description: 'Model consequential future states while preserving uncertainty and auditability.',
  },
  {
    id: 'artifact:memory_preservation',
    label: 'Memory preservation',
    description: 'Keep identity, history, or environmental records intact across disruption.',
  },
  {
    id: 'artifact:information_recovery',
    label: 'Information recovery',
    description: 'Recover useful meaning from damaged, vanished, or incomplete records.',
  },
  {
    id: 'artifact:signal_interpretation',
    label: 'Signal interpretation',
    description: 'Separate, translate, or classify signals without collapsing meaningful difference.',
  },
  {
    id: 'artifact:evidence_verification',
    label: 'Evidence verification',
    description: 'Produce or test evidence that independent parties can inspect and authenticate.',
  },
  {
    id: 'artifact:temporal_coordination',
    label: 'Temporal coordination',
    description: 'Coordinate action or records across long, unequal, or relativistic timescales.',
  },
  {
    id: 'artifact:distributed_coordination',
    label: 'Distributed coordination',
    description: 'Coordinate resources, computation, or institutions across separated nodes.',
  },
  {
    id: 'artifact:secure_communication',
    label: 'Secure communication',
    description: 'Exchange authenticated signals while protecting participants or channels.',
  },
  {
    id: 'artifact:concealment',
    label: 'Concealment',
    description: 'Suppress a detectable signature without erasing the underlying system or record.',
  },
  {
    id: 'artifact:controlled_shutdown',
    label: 'Controlled shutdown',
    description: 'Terminate a dangerous automated or informational process without uncontrolled spread.',
  },
  {
    id: 'artifact:plural_governance',
    label: 'Plural governance',
    description: 'Coordinate binding decisions while preserving the agency of unlike participants.',
  },
  {
    id: 'artifact:resilient_computation',
    label: 'Resilient computation',
    description: 'Maintain correct computation across noise, distance, failure, or incompatible substrates.',
  },
  {
    id: 'artifact:record_governance',
    label: 'Record governance',
    description: 'Control custody, disclosure, reconciliation, or rights within consequential records.',
  },
] as const;

export type ArtifactCivilizationCapabilityId =
  (typeof ARTIFACT_CIVILIZATION_CAPABILITY_DEFINITIONS)[number]['id'];

/**
 * Broad capability families used to measure technological breadth. These are
 * not a second technology tree and do not create prerequisites; they prevent
 * Civilization Maturity from collapsing into card tier or raw card count.
 */
export const CIVILIZATION_CAPABILITY_DOMAINS = [
  'energy',
  'material',
  'mobility',
  'resilience',
  'ecology',
  'information',
  'coordination',
  'security',
] as const;

export type CivilizationCapabilityDomain =
  (typeof CIVILIZATION_CAPABILITY_DOMAINS)[number];

export const ARTIFACT_CIVILIZATION_CAPABILITY_DOMAIN_BY_ID = {
  'artifact:controlled_energy': 'energy',
  'artifact:energy_conversion': 'energy',
  'artifact:thermal_management': 'energy',
  'artifact:resource_extraction': 'material',
  'artifact:resource_reclamation': 'material',
  'artifact:material_engineering': 'material',
  'artifact:precision_fabrication': 'material',
  'artifact:transit_navigation': 'mobility',
  'artifact:system_stabilization': 'resilience',
  'artifact:hazard_containment': 'resilience',
  'artifact:failure_isolation': 'resilience',
  'artifact:ecological_adaptation': 'ecology',
  'artifact:ecological_recovery': 'ecology',
  'artifact:ecological_propagation': 'ecology',
  'artifact:ecological_shutdown': 'ecology',
  'artifact:habitat_engineering': 'ecology',
  'artifact:cross_ecology_mediation': 'ecology',
  'artifact:hazard_detection': 'information',
  'artifact:boundary_observation': 'information',
  'artifact:predictive_modeling': 'information',
  'artifact:memory_preservation': 'information',
  'artifact:information_recovery': 'information',
  'artifact:signal_interpretation': 'information',
  'artifact:evidence_verification': 'coordination',
  'artifact:temporal_coordination': 'coordination',
  'artifact:distributed_coordination': 'coordination',
  'artifact:secure_communication': 'coordination',
  'artifact:concealment': 'security',
  'artifact:controlled_shutdown': 'resilience',
  'artifact:plural_governance': 'coordination',
  'artifact:resilient_computation': 'resilience',
  'artifact:record_governance': 'coordination',
} as const satisfies Record<
  ArtifactCivilizationCapabilityId,
  CivilizationCapabilityDomain
>;

export interface ArtifactCivilizationCapabilityDefinition {
  id: ArtifactCivilizationCapabilityId;
  label: string;
  description: string;
}

export const ARTIFACT_CIVILIZATION_CAPABILITY_BY_ID = Object.fromEntries(
  ARTIFACT_CIVILIZATION_CAPABILITY_DEFINITIONS.map((definition) => [definition.id, definition]),
) as Record<ArtifactCivilizationCapabilityId, ArtifactCivilizationCapabilityDefinition>;

/**
 * Canonical qualitative capability assignments. These are event-resolution
 * hooks, not extra printed card powers. A card's practical capability remains
 * the precise fiction; these tags deliberately group equivalent response
 * affordances across different local embodiments.
 */
export const ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID = {
  t1r01: ["artifact:controlled_energy"],
  t1r02: ["artifact:ecological_recovery"],
  t1r03: ["artifact:controlled_energy", "artifact:temporal_coordination"],
  t1r04: ["artifact:controlled_energy", "artifact:failure_isolation"],
  t1r05: ["artifact:controlled_energy", "artifact:hazard_containment"],
  t1r06: ["artifact:energy_conversion"],
  t1r07: ["artifact:thermal_management", "artifact:energy_conversion"],
  t1r08: ["artifact:controlled_energy", "artifact:evidence_verification"],
  t1r09: ["artifact:transit_navigation", "artifact:distributed_coordination"],

  t1s01: ["artifact:hazard_detection"],
  t1s02: ["artifact:transit_navigation"],
  t1s03: ["artifact:controlled_shutdown"],
  t1s04: ["artifact:material_engineering", "artifact:temporal_coordination"],
  t1s05: ["artifact:resilient_computation"],
  t1s06: ["artifact:memory_preservation", "artifact:record_governance"],
  t1s07: ["artifact:material_engineering", "artifact:precision_fabrication"],
  t1s08: ["artifact:memory_preservation", "artifact:record_governance"],
  t1s09: ["artifact:transit_navigation", "artifact:distributed_coordination"],

  t1e01: ["artifact:ecological_propagation", "artifact:ecological_recovery"],
  t1e02: ["artifact:resource_extraction"],
  t1e03: ["artifact:hazard_detection", "artifact:ecological_recovery"],
  t1e04: ["artifact:ecological_recovery"],
  t1e05: ["artifact:material_engineering", "artifact:resilient_computation"],
  t1e06: ["artifact:resource_reclamation", "artifact:ecological_shutdown"],
  t1e07: ["artifact:material_engineering", "artifact:ecological_recovery"],
  t1e08: ["artifact:ecological_recovery", "artifact:ecological_propagation"],
  t1e09: ["artifact:habitat_engineering", "artifact:resource_reclamation"],

  t1o01: ["artifact:concealment"],
  t1o02: ["artifact:hazard_detection", "artifact:boundary_observation"],
  t1o03: ["artifact:memory_preservation", "artifact:information_recovery"],
  t1o04: ["artifact:concealment"],
  t1o05: ["artifact:precision_fabrication"],
  t1o06: ["artifact:resource_reclamation", "artifact:distributed_coordination"],
  t1o07: ["artifact:material_engineering", "artifact:boundary_observation"],
  t1o08: ["artifact:concealment", "artifact:record_governance"],
  t1o09: ["artifact:secure_communication", "artifact:distributed_coordination"],

  t1p01: ["artifact:system_stabilization"],
  t1p02: ["artifact:system_stabilization"],
  t1p03: ["artifact:signal_interpretation", "artifact:evidence_verification"],
  t1p04: ["artifact:hazard_containment"],
  t1p05: ["artifact:signal_interpretation", "artifact:evidence_verification"],
  t1p06: ["artifact:system_stabilization", "artifact:distributed_coordination"],
  t1p07: ["artifact:boundary_observation", "artifact:signal_interpretation"],
  t1p08: ["artifact:memory_preservation"],
  t1p09: ["artifact:plural_governance", "artifact:habitat_engineering"],

  t2r01: ["artifact:material_engineering", "artifact:precision_fabrication"],
  t2r02: ["artifact:energy_conversion", "artifact:failure_isolation"],
  t2r03: ["artifact:resource_extraction", "artifact:hazard_containment"],
  t2r04: ["artifact:energy_conversion", "artifact:habitat_engineering"],
  t2r05: ["artifact:controlled_energy", "artifact:failure_isolation"],
  t2r06: ["artifact:thermal_management", "artifact:energy_conversion"],

  t2s01: ["artifact:transit_navigation", "artifact:predictive_modeling"],
  t2s02: ["artifact:hazard_detection", "artifact:memory_preservation"],
  t2s03: ["artifact:predictive_modeling", "artifact:evidence_verification"],
  t2s04: ["artifact:memory_preservation", "artifact:plural_governance"],
  t2s05: ["artifact:memory_preservation", "artifact:distributed_coordination"],
  t2s06: ["artifact:signal_interpretation", "artifact:hazard_detection"],

  t2e01: ["artifact:ecological_adaptation", "artifact:hazard_containment"],
  t2e02: ["artifact:ecological_shutdown", "artifact:temporal_coordination"],
  t2e03: ["artifact:ecological_adaptation", "artifact:hazard_containment"],
  t2e04: ["artifact:cross_ecology_mediation", "artifact:signal_interpretation"],
  t2e05: ["artifact:memory_preservation", "artifact:evidence_verification"],
  t2e06: ["artifact:ecological_propagation", "artifact:habitat_engineering"],

  t2o01: ["artifact:boundary_observation", "artifact:hazard_containment"],
  t2o02: ["artifact:hazard_containment", "artifact:record_governance"],
  t2o03: ["artifact:thermal_management", "artifact:concealment"],
  t2o04: ["artifact:precision_fabrication", "artifact:resource_reclamation"],
  t2o05: ["artifact:ecological_shutdown", "artifact:failure_isolation"],
  t2o06: ["artifact:hazard_detection", "artifact:boundary_observation"],

  t2p01: ["artifact:hazard_containment", "artifact:evidence_verification"],
  t2p02: ["artifact:hazard_detection", "artifact:signal_interpretation"],
  t2p03: ["artifact:cross_ecology_mediation", "artifact:plural_governance"],
  t2p04: ["artifact:controlled_energy", "artifact:distributed_coordination"],
  t2p05: ["artifact:resilient_computation", "artifact:distributed_coordination"],
  t2p06: ["artifact:distributed_coordination", "artifact:plural_governance"],

  t3r01: ["artifact:controlled_energy", "artifact:transit_navigation"],
  t3r02: ["artifact:resource_reclamation", "artifact:hazard_containment"],
  t3r03: ["artifact:controlled_energy", "artifact:temporal_coordination"],
  t3r04: ["artifact:precision_fabrication", "artifact:habitat_engineering"],

  t3s01: ["artifact:transit_navigation", "artifact:distributed_coordination"],
  t3s02: ["artifact:record_governance", "artifact:plural_governance"],
  t3s03: ["artifact:information_recovery", "artifact:memory_preservation"],
  t3s04: ["artifact:temporal_coordination", "artifact:evidence_verification"],

  t3e01: ["artifact:ecological_propagation", "artifact:transit_navigation"],
  t3e02: ["artifact:ecological_adaptation", "artifact:habitat_engineering"],
  t3e03: ["artifact:resource_reclamation", "artifact:ecological_recovery"],
  t3e04: ["artifact:cross_ecology_mediation", "artifact:hazard_containment"],

  t3o01: ["artifact:ecological_shutdown", "artifact:habitat_engineering"],
  t3o02: ["artifact:hazard_containment", "artifact:failure_isolation"],
  t3o03: ["artifact:concealment", "artifact:secure_communication"],
  t3o04: ["artifact:boundary_observation", "artifact:signal_interpretation"],

  t3p01: ["artifact:plural_governance", "artifact:evidence_verification"],
  t3p02: ["artifact:precision_fabrication", "artifact:evidence_verification"],
  t3p03: ["artifact:resilient_computation", "artifact:distributed_coordination"],
  t3p04: ["artifact:evidence_verification", "artifact:memory_preservation"],
} as const satisfies Record<ArtifactId, readonly ArtifactCivilizationCapabilityId[]>;
