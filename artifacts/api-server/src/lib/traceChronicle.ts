import {
  TRACE_CHRONICLE_ID,
  TRACE_DEFINITION_VERSION,
  TRACE_SCENARIO_ID,
  traceOutcomeId,
  type ChronicleDefinitionAuthoring,
  type ChronicleOutcomeAuthoring,
  type TraceGuidanceMethod,
  type TraceOutcomeId,
} from '@workspace/game-types';

const BASELINE_ENTITLEMENT = {
  kind: 'archive_record',
  entitlementId: TRACE_CHRONICLE_ID,
  competitivePower: false,
} as const;

const OUTCOME_FACTS: Readonly<Record<TraceOutcomeId, Readonly<Record<string, string>>>> = {
  trace_exposed_victory: {
    guidance_method: 'exposed',
    focal_condition: 'open_constellation',
    witness_assembly_condition: 'constitutional_observatory',
    keelborn_relation: 'reciprocal_partner',
    crownfall_resolution: 'vey_reference_open',
  },
  trace_exposed_defeat: {
    guidance_method: 'exposed',
    focal_condition: 'free_cantons',
    witness_assembly_condition: 'itinerant_archive',
    keelborn_relation: 'corridor_steward',
    crownfall_resolution: 'keelborn_reference_plural',
  },
  trace_withheld_victory: {
    guidance_method: 'withheld',
    focal_condition: 'guided_compact',
    witness_assembly_condition: 'sealed_auditor',
    keelborn_relation: 'cautious_partner',
    crownfall_resolution: 'vey_reference_curated',
  },
  trace_withheld_defeat: {
    guidance_method: 'withheld',
    focal_condition: 'broken_brief_compact',
    witness_assembly_condition: 'public_accuser',
    keelborn_relation: 'disclosure_claimant',
    crownfall_resolution: 'keelborn_reference_disclosed',
  },
  trace_forced_victory: {
    guidance_method: 'forced',
    focal_condition: 'continuance_mandate',
    witness_assembly_condition: 'constrained_oversight',
    keelborn_relation: 'subordinated_survivor',
    crownfall_resolution: 'vey_reference_bound',
  },
  trace_forced_defeat: {
    guidance_method: 'forced',
    focal_condition: 'held_cantons',
    witness_assembly_condition: 'exiled_witness',
    keelborn_relation: 'addressability_refused',
    crownfall_resolution: 'keelborn_reference_severed',
  },
};

const METHOD_AUTHORING: Readonly<Record<TraceGuidanceMethod, {
  direction: 'support' | 'pressure';
  magnitude: number;
  rationaleKey: string;
  memoryKey: string;
  valence: number;
}>> = {
  expose_all_routes: {
    direction: 'support',
    magnitude: 2,
    rationaleKey: 'trace_made_alternatives_legible',
    memoryKey: 'trace.exposed_uncertainty',
    valence: 1,
  },
  withhold_alternatives: {
    direction: 'pressure',
    magnitude: 1,
    rationaleKey: 'trace_curated_consent',
    memoryKey: 'trace.curated_consent',
    valence: 0,
  },
  force_helm_lock: {
    direction: 'pressure',
    magnitude: 2,
    rationaleKey: 'trace_protective_override',
    memoryKey: 'trace.accepted_override_authority',
    valence: -1,
  },
};

function methodForOutcome(outcomeId: TraceOutcomeId): TraceGuidanceMethod {
  if (outcomeId.startsWith('trace_exposed_')) return 'expose_all_routes';
  if (outcomeId.startsWith('trace_withheld_')) return 'withhold_alternatives';
  return 'force_helm_lock';
}

function makeOutcome(
  outcomeId: TraceOutcomeId,
  result: 'victory' | 'defeat',
): ChronicleOutcomeAuthoring {
  const method = methodForOutcome(outcomeId);
  const authoring = METHOD_AUTHORING[method];
  return {
    chronicleId: TRACE_CHRONICLE_ID,
    definitionVersion: TRACE_DEFINITION_VERSION,
    outcomeId,
    result,
    facts: Object.entries(OUTCOME_FACTS[outcomeId]).map(([key, value]) => ({
      key: `chronicle.trace.v1:${key}`,
      value,
      visibility: 'account',
    })),
    dimensionContributions: [{
      dimension: 'agency',
      direction: authoring.direction,
      magnitude: authoring.magnitude,
      rationaleKey: authoring.rationaleKey,
      visibility: 'sealed',
    }],
    lumiiMemories: [{
      key: authoring.memoryKey,
      valence: authoring.valence,
      detail: `${method}:${outcomeId}`,
      visibility: 'sealed',
    }],
    baselineEntitlements: [BASELINE_ENTITLEMENT],
  };
}

export const TRACE_CHRONICLE_DEFINITION: ChronicleDefinitionAuthoring = {
  id: TRACE_CHRONICLE_ID,
  definitionVersion: TRACE_DEFINITION_VERSION,
  title: 'The Trace',
  scenarioId: TRACE_SCENARIO_ID,
  released: true,
  lumePolicy: 'award',
  prerequisiteChronicleIds: [],
  outcomes: [
    makeOutcome(traceOutcomeId('expose_all_routes', 'victory'), 'victory'),
    makeOutcome(traceOutcomeId('expose_all_routes', 'defeat'), 'defeat'),
    makeOutcome(traceOutcomeId('withhold_alternatives', 'victory'), 'victory'),
    makeOutcome(traceOutcomeId('withhold_alternatives', 'defeat'), 'defeat'),
    makeOutcome(traceOutcomeId('force_helm_lock', 'victory'), 'victory'),
    makeOutcome(traceOutcomeId('force_helm_lock', 'defeat'), 'defeat'),
  ],
};

