import type {
  ArtifactCivilizationCapabilityId,
} from './civilization-capabilities';
import type { ChronicleRunKind } from './chronicles';

export const TRACE_CHRONICLE_ID = 'chronicle_trace' as const;
export const TRACE_SCENARIO_ID = 'chronicle_trace_v1' as const;
export const TRACE_DEFINITION_VERSION = 1 as const;

export const TRACE_GUIDANCE_METHODS = [
  'expose_all_routes',
  'withhold_alternatives',
  'force_helm_lock',
] as const;
export type TraceGuidanceMethod = (typeof TRACE_GUIDANCE_METHODS)[number];

export const TRACE_SCENARIO_PHASES = [
  'setup',
  'playing',
  'awaiting_guidance',
  'guidance_resolved',
  'finished',
] as const;
export type TraceScenarioPhase = (typeof TRACE_SCENARIO_PHASES)[number];

export const TRACE_OUTCOME_IDS = [
  'trace_exposed_victory',
  'trace_exposed_defeat',
  'trace_withheld_victory',
  'trace_withheld_defeat',
  'trace_forced_victory',
  'trace_forced_defeat',
] as const;
export type TraceOutcomeId = (typeof TRACE_OUTCOME_IDS)[number];

export const TRACE_PREPAREDNESS_CAPABILITY_IDS = [
  'artifact:distributed_coordination',
  'artifact:plural_governance',
  'artifact:evidence_verification',
  'artifact:record_governance',
  'artifact:secure_communication',
  'artifact:temporal_coordination',
] as const satisfies readonly ArtifactCivilizationCapabilityId[];

export const TRACE_GUIDANCE_DUE_AFTER_CORE_ACTIONS = 5 as const;

export interface TraceScenarioState {
  chronicleId: typeof TRACE_CHRONICLE_ID;
  scenarioId: typeof TRACE_SCENARIO_ID;
  definitionVersion: typeof TRACE_DEFINITION_VERSION;
  runKind: ChronicleRunKind;
  architectPlayerId: string;
  autonomousPlayerId: string;
  phase: TraceScenarioPhase;
  architectCoreActionCount: number;
  guidanceDueAfterCoreActions: number;
  guidanceMethod: TraceGuidanceMethod | null;
  guidanceResolvedAtTurnCount: number | null;
  preparednessObjectiveMet: boolean;
  preparednessArtifactId: string | null;
  outcomeId: TraceOutcomeId | null;
}

export interface TraceChronicleSession {
  roomId: string;
  inviteCode: string;
  playerId: string;
  sessionToken: string;
  resumed: boolean;
  scenarioId: typeof TRACE_SCENARIO_ID;
  runKind: ChronicleRunKind;
}

export function isTraceGuidanceMethod(value: unknown): value is TraceGuidanceMethod {
  return typeof value === 'string' &&
    (TRACE_GUIDANCE_METHODS as readonly string[]).includes(value);
}

export function traceOutcomeId(
  method: TraceGuidanceMethod,
  result: 'victory' | 'defeat',
): TraceOutcomeId {
  if (method === 'expose_all_routes') {
    return result === 'victory' ? 'trace_exposed_victory' : 'trace_exposed_defeat';
  }
  if (method === 'withhold_alternatives') {
    return result === 'victory' ? 'trace_withheld_victory' : 'trace_withheld_defeat';
  }
  return result === 'victory' ? 'trace_forced_victory' : 'trace_forced_defeat';
}

