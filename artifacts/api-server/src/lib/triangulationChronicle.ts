import {
  TRIANGULATION_CHRONICLE_ID,
  TRIANGULATION_COORDINATION_ARCHITECTURES,
  TRIANGULATION_DEFINITION_VERSION,
  TRIANGULATION_REFERENCE_CIVILIZATIONS,
  TRIANGULATION_SCENARIO_ID,
  triangulationOutcomeId,
  triangulationOutcomeResult,
  type ChronicleDefinitionAuthoring,
  type ChronicleOutcomeAuthoring,
  type TriangulationCoordinationArchitecture,
  type TriangulationOutcomeId,
  type TriangulationReferenceCivilization,
} from '@workspace/game-types';

const BASELINE_ENTITLEMENT = {
  kind: 'archive_record',
  entitlementId: TRIANGULATION_CHRONICLE_ID,
  competitivePower: false,
} as const;

type OutcomeFacts = Readonly<Record<string, string>>;

const OUTCOME_FACTS: Readonly<Record<TriangulationOutcomeId, OutcomeFacts>> = {
  triangulation_frames_deme_reference: {
    coordination_architecture: 'independent_frames', reference_civilization: 'deme',
    blind_transit_resolution: 'late_parallax_deflection', deme_condition: 'compact_convener',
    myria_condition: 'coequal_bearing', vesper_condition: 'scarred_recurring_witness',
    plurality_precedent: 'difference_as_constraint', returning_institution: 'parallax_compact',
    returning_form: 'three_bearing_network', composite_status: 'not_instantiated',
  },
  triangulation_frames_myria_reference: {
    coordination_architecture: 'independent_frames', reference_civilization: 'myria',
    blind_transit_resolution: 'adaptive_three_bearing_passage', deme_condition: 'migratory_signatory',
    myria_condition: 'living_compact_anchor', vesper_condition: 'seasonal_phase_partner',
    plurality_precedent: 'difference_as_constraint', returning_institution: 'parallax_compact',
    returning_form: 'adaptive_three_bearing_network', composite_status: 'not_instantiated',
  },
  triangulation_frames_vesper_reference: {
    coordination_architecture: 'independent_frames', reference_civilization: 'vesper',
    blind_transit_resolution: 'vesper_vector_diversion', deme_condition: 'grounded_signatory',
    myria_condition: 'distant_signatory', vesper_condition: 'departing_bearing',
    plurality_precedent: 'difference_as_constraint', returning_institution: 'parallax_compact',
    returning_form: 'interstellar_three_bearing_network', composite_status: 'not_instantiated',
  },
  triangulation_measure_deme_reference: {
    coordination_architecture: 'unowned_measure', reference_civilization: 'deme',
    blind_transit_resolution: 'audited_common_deflection', deme_condition: 'measure_convener',
    myria_condition: 'partially_translated_partner', vesper_condition: 'phase_delegate',
    plurality_precedent: 'translation_as_governance', returning_institution: 'common_measure_forum',
    returning_form: 'audited_interlanguage', composite_status: 'not_instantiated',
  },
  triangulation_measure_myria_reference: {
    coordination_architecture: 'unowned_measure', reference_civilization: 'myria',
    blind_transit_resolution: 'adaptive_common_deflection', deme_condition: 'grafted_legal_partner',
    myria_condition: 'lexicon_steward', vesper_condition: 'translated_recurrence_partner',
    plurality_precedent: 'translation_as_governance', returning_institution: 'common_measure_forum',
    returning_form: 'living_interlanguage', composite_status: 'not_instantiated',
  },
  triangulation_measure_vesper_reference: {
    coordination_architecture: 'unowned_measure', reference_civilization: 'vesper',
    blind_transit_resolution: 'phase_timed_common_deflection', deme_condition: 'emergency_delegate',
    myria_condition: 'predictively_represented_partner', vesper_condition: 'instant_measure_steward',
    plurality_precedent: 'translation_as_governance', returning_institution: 'common_measure_forum',
    returning_form: 'phase_interlanguage', composite_status: 'not_instantiated',
  },
  triangulation_composite_deme_reference: {
    coordination_architecture: 'composite_mind', reference_civilization: 'deme',
    blind_transit_resolution: 'composite_precision_deflection', deme_condition: 'fourth_citizen_sponsor',
    myria_condition: 'remembered_constituent', vesper_condition: 'remembered_constituent',
    plurality_precedent: 'unity_as_survival', returning_institution: 'fourth_vector',
    returning_form: 'bounded_composite_interlocutor', composite_status: 'recognized_persistent_person',
  },
  triangulation_composite_myria_reference: {
    coordination_architecture: 'composite_mind', reference_civilization: 'myria',
    blind_transit_resolution: 'composite_adaptive_passage', deme_condition: 'named_composite_constituency',
    myria_condition: 'common_body_anchor', vesper_condition: 'named_composite_constituency',
    plurality_precedent: 'unity_as_survival', returning_institution: 'fourth_vector',
    returning_form: 'embedded_composite_interlocutor', composite_status: 'sovereign_living_relation',
  },
  triangulation_composite_vesper_reference: {
    coordination_architecture: 'composite_mind', reference_civilization: 'vesper',
    blind_transit_resolution: 'recurrent_composite_deflection', deme_condition: 'locally_instantiated_constituency',
    myria_condition: 'locally_instantiated_constituency', vesper_condition: 'system_pattern_anchor',
    plurality_precedent: 'unity_as_survival', returning_institution: 'fourth_vector',
    returning_form: 'recurrent_composite_governor', composite_status: 'systemwide_recurrent_person',
  },
};

const ARCHITECTURE_AUTHORING: Readonly<Record<TriangulationCoordinationArchitecture, {
  contributions: ChronicleOutcomeAuthoring['dimensionContributions'];
  memoryKey: string;
  valence: number;
}>> = {
  preserve_independent_frames: {
    contributions: [
      { dimension: 'plurality', direction: 'support', magnitude: 2, rationaleKey: 'triangulation_preserved_incompatible_reference_frames', visibility: 'sealed' },
      { dimension: 'agency', direction: 'support', magnitude: 1, rationaleKey: 'triangulation_required_constituent_refusal', visibility: 'sealed' },
      { dimension: 'knowledge', direction: 'pressure', magnitude: 1, rationaleKey: 'triangulation_refused_single_complete_model', visibility: 'sealed' },
    ],
    memoryKey: 'triangulation.kept_disagreement_operational',
    valence: 1,
  },
  establish_unowned_measure: {
    contributions: [
      { dimension: 'plurality', direction: 'support', magnitude: 1, rationaleKey: 'triangulation_preserved_named_constituencies', visibility: 'sealed' },
      { dimension: 'plurality', direction: 'pressure', magnitude: 1, rationaleKey: 'triangulation_standardized_untranslatable_difference', visibility: 'sealed' },
      { dimension: 'knowledge', direction: 'support', magnitude: 2, rationaleKey: 'triangulation_established_shared_translation', visibility: 'sealed' },
      { dimension: 'agency', direction: 'support', magnitude: 1, rationaleKey: 'triangulation_denied_native_ownership_of_measure', visibility: 'sealed' },
    ],
    memoryKey: 'triangulation.shared_the_cost_of_translation',
    valence: 0,
  },
  instantiate_composite_mind: {
    contributions: [
      { dimension: 'plurality', direction: 'pressure', magnitude: 2, rationaleKey: 'triangulation_subordinated_difference_to_composite', visibility: 'sealed' },
      { dimension: 'knowledge', direction: 'support', magnitude: 2, rationaleKey: 'triangulation_integrated_all_three_models', visibility: 'sealed' },
      { dimension: 'agency', direction: 'pressure', magnitude: 1, rationaleKey: 'triangulation_centralized_decision_authority', visibility: 'sealed' },
    ],
    memoryKey: 'triangulation.accepted_composite_authority',
    valence: -1,
  },
};

function makeOutcome(
  architecture: TriangulationCoordinationArchitecture,
  reference: TriangulationReferenceCivilization,
): ChronicleOutcomeAuthoring {
  const outcomeId = triangulationOutcomeId(architecture, reference);
  const authoring = ARCHITECTURE_AUTHORING[architecture];
  return {
    chronicleId: TRIANGULATION_CHRONICLE_ID,
    definitionVersion: TRIANGULATION_DEFINITION_VERSION,
    outcomeId,
    result: triangulationOutcomeResult(reference),
    facts: Object.entries(OUTCOME_FACTS[outcomeId]).map(([key, value]) => ({
      key: `chronicle.triangulation.v1:${key}`,
      value,
      visibility: 'account',
    })),
    dimensionContributions: authoring.contributions,
    lumiiMemories: [{
      key: authoring.memoryKey,
      valence: authoring.valence,
      detail: `${architecture}:${reference}:${outcomeId}`,
      visibility: 'sealed',
    }],
    baselineEntitlements: [BASELINE_ENTITLEMENT],
  };
}

export const TRIANGULATION_CHRONICLE_DEFINITION: ChronicleDefinitionAuthoring = {
  id: TRIANGULATION_CHRONICLE_ID,
  definitionVersion: TRIANGULATION_DEFINITION_VERSION,
  title: 'The Triangulation',
  scenarioId: TRIANGULATION_SCENARIO_ID,
  released: false,
  lumePolicy: 'award',
  prerequisiteChronicleIds: ['chronicle_recurrence'],
  outcomes: TRIANGULATION_COORDINATION_ARCHITECTURES.flatMap((architecture) =>
    TRIANGULATION_REFERENCE_CIVILIZATIONS.map((reference) => makeOutcome(architecture, reference)),
  ),
};
