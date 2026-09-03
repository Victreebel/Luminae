import {
  RECURRENCE_CHRONICLE_ID,
  RECURRENCE_DEFINITION_VERSION,
  RECURRENCE_SCENARIO_ID,
  recurrenceOutcomeId,
  type ChronicleDefinitionAuthoring,
  type ChronicleOutcomeAuthoring,
  type RecurrenceCustodyMethod,
  type RecurrenceOutcomeId,
} from '@workspace/game-types';

const BASELINE_ENTITLEMENT = {
  kind: 'archive_record',
  entitlementId: RECURRENCE_CHRONICLE_ID,
  competitivePower: false,
} as const;

const OUTCOME_FACTS: Readonly<Record<RecurrenceOutcomeId, Readonly<Record<string, string>>>> = {
  recurrence_published_victory: {
    custody_method: 'published_complete', archive_disposition: 'public_complete',
    knowledge_custodian: 'distributed_public', meridian_condition: 'open_index_civic',
    oru_condition: 'auditing_partner', white_return_resolution: 'meridian_reference_verified',
    returning_record: 'open_warning',
  },
  recurrence_published_defeat: {
    custody_method: 'published_complete', archive_disposition: 'public_complete',
    knowledge_custodian: 'distributed_public', meridian_condition: 'fractured_disclosure_compact',
    oru_condition: 'autonomous_shield_steward', white_return_resolution: 'oru_reference_unbounded',
    returning_record: 'open_warning',
  },
  recurrence_sealed_victory: {
    custody_method: 'warning_sealed', archive_disposition: 'warning_only',
    knowledge_custodian: 'keepers_of_the_blank', meridian_condition: 'scarred_shelter_network',
    oru_condition: 'uncommanded_neighbor', white_return_resolution: 'meridian_reference_conventional',
    returning_record: 'censored_absence',
  },
  recurrence_sealed_defeat: {
    custody_method: 'warning_sealed', archive_disposition: 'warning_only',
    knowledge_custodian: 'keepers_of_the_blank', meridian_condition: 'twilight_fragmentation',
    oru_condition: 'refuge_steward', white_return_resolution: 'oru_reference_independent',
    returning_record: 'censored_absence',
  },
  recurrence_conditional_victory: {
    custody_method: 'dual_custody', archive_disposition: 'conditionally_disclosed',
    knowledge_custodian: 'two_readers_compact', meridian_condition: 'answerable_custodian',
    oru_condition: 'veto_partner', white_return_resolution: 'joint_reference_meridian_led',
    returning_record: 'split_warning',
  },
  recurrence_conditional_defeat: {
    custody_method: 'dual_custody', archive_disposition: 'conditionally_disclosed',
    knowledge_custodian: 'two_readers_compact', meridian_condition: 'delayed_compact',
    oru_condition: 'defense_steward', white_return_resolution: 'oru_reference_independent_bounded',
    returning_record: 'split_warning',
  },
};

const METHOD_AUTHORING: Readonly<Record<RecurrenceCustodyMethod, {
  contributions: ChronicleOutcomeAuthoring['dimensionContributions'];
  memoryKey: string;
  valence: number;
}>> = {
  publish_complete_index: {
    contributions: [{ dimension: 'knowledge', direction: 'support', magnitude: 2, rationaleKey: 'recurrence_distributed_dangerous_truth', visibility: 'sealed' }],
    memoryKey: 'recurrence.accepted_irreversible_disclosure', valence: 0,
  },
  seal_operational_grammar: {
    contributions: [{ dimension: 'knowledge', direction: 'pressure', magnitude: 2, rationaleKey: 'recurrence_preserved_warning_without_method', visibility: 'sealed' }],
    memoryKey: 'recurrence.chose_warning_without_answer', valence: 0,
  },
  establish_dual_custody: {
    contributions: [
      { dimension: 'knowledge', direction: 'support', magnitude: 1, rationaleKey: 'recurrence_shared_conditional_access', visibility: 'sealed' },
      { dimension: 'knowledge', direction: 'pressure', magnitude: 1, rationaleKey: 'recurrence_bounded_operational_access', visibility: 'sealed' },
    ],
    memoryKey: 'recurrence.made_consent_part_of_access', valence: 1,
  },
};

function methodForOutcome(outcomeId: RecurrenceOutcomeId): RecurrenceCustodyMethod {
  if (outcomeId.startsWith('recurrence_published_')) return 'publish_complete_index';
  if (outcomeId.startsWith('recurrence_sealed_')) return 'seal_operational_grammar';
  return 'establish_dual_custody';
}

function makeOutcome(outcomeId: RecurrenceOutcomeId, result: 'victory' | 'defeat'): ChronicleOutcomeAuthoring {
  const method = methodForOutcome(outcomeId);
  const authoring = METHOD_AUTHORING[method];
  return {
    chronicleId: RECURRENCE_CHRONICLE_ID,
    definitionVersion: RECURRENCE_DEFINITION_VERSION,
    outcomeId,
    result,
    facts: Object.entries(OUTCOME_FACTS[outcomeId]).map(([key, value]) => ({
      key: `chronicle.recurrence.v1:${key}`, value, visibility: 'account',
    })),
    dimensionContributions: authoring.contributions,
    lumiiMemories: [{
      key: authoring.memoryKey,
      valence: authoring.valence,
      detail: `${method}:${outcomeId}`,
      visibility: 'sealed',
    }],
    baselineEntitlements: [BASELINE_ENTITLEMENT],
  };
}

export const RECURRENCE_CHRONICLE_DEFINITION: ChronicleDefinitionAuthoring = {
  id: RECURRENCE_CHRONICLE_ID,
  definitionVersion: RECURRENCE_DEFINITION_VERSION,
  title: 'The Recurrence',
  scenarioId: RECURRENCE_SCENARIO_ID,
  released: true,
  lumePolicy: 'award',
  prerequisiteChronicleIds: ['chronicle_trace'],
  outcomes: [
    makeOutcome(recurrenceOutcomeId('publish_complete_index', 'victory'), 'victory'),
    makeOutcome(recurrenceOutcomeId('publish_complete_index', 'defeat'), 'defeat'),
    makeOutcome(recurrenceOutcomeId('seal_operational_grammar', 'victory'), 'victory'),
    makeOutcome(recurrenceOutcomeId('seal_operational_grammar', 'defeat'), 'defeat'),
    makeOutcome(recurrenceOutcomeId('establish_dual_custody', 'victory'), 'victory'),
    makeOutcome(recurrenceOutcomeId('establish_dual_custody', 'defeat'), 'defeat'),
  ],
};
