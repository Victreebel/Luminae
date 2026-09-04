import type { ArtifactCivilizationCapabilityId } from './civilization-capabilities';
import type { ChronicleRunKind } from './chronicles';

export const RECURRENCE_CHRONICLE_ID = 'chronicle_recurrence' as const;
export const RECURRENCE_SCENARIO_ID = 'chronicle_recurrence_v1' as const;
export const RECURRENCE_DEFINITION_VERSION = 1 as const;

export const RECURRENCE_CUSTODY_METHODS = [
  'publish_complete_index',
  'seal_operational_grammar',
  'establish_dual_custody',
] as const;
export type RecurrenceCustodyMethod = (typeof RECURRENCE_CUSTODY_METHODS)[number];

export const RECURRENCE_SCENARIO_PHASES = [
  'setup',
  'playing',
  'awaiting_custody',
  'custody_resolved',
  'finished',
] as const;
export type RecurrenceScenarioPhase = (typeof RECURRENCE_SCENARIO_PHASES)[number];

export const RECURRENCE_OUTCOME_IDS = [
  'recurrence_published_victory',
  'recurrence_published_defeat',
  'recurrence_sealed_victory',
  'recurrence_sealed_defeat',
  'recurrence_conditional_victory',
  'recurrence_conditional_defeat',
] as const;
export type RecurrenceOutcomeId = (typeof RECURRENCE_OUTCOME_IDS)[number];

export const RECURRENCE_PREPAREDNESS_CAPABILITY_IDS = [
  'artifact:evidence_verification',
  'artifact:signal_interpretation',
  'artifact:information_recovery',
  'artifact:record_governance',
  'artifact:predictive_modeling',
  'artifact:memory_preservation',
] as const satisfies readonly ArtifactCivilizationCapabilityId[];

export const RECURRENCE_CUSTODY_DUE_AFTER_CORE_ACTIONS = 5 as const;

export interface RecurrenceScenarioState {
  chronicleId: typeof RECURRENCE_CHRONICLE_ID;
  scenarioId: typeof RECURRENCE_SCENARIO_ID;
  definitionVersion: typeof RECURRENCE_DEFINITION_VERSION;
  runKind: ChronicleRunKind;
  architectPlayerId: string;
  autonomousPlayerId: string;
  phase: RecurrenceScenarioPhase;
  architectCoreActionCount: number;
  custodyDueAfterCoreActions: number;
  custodyMethod: RecurrenceCustodyMethod | null;
  custodyResolvedAtTurnCount: number | null;
  preparednessObjectiveMet: boolean;
  preparednessArtifactId: string | null;
  outcomeId: RecurrenceOutcomeId | null;
}

export interface RecurrenceChronicleSession {
  roomId: string;
  inviteCode: string;
  playerId: string;
  sessionToken: string;
  resumed: boolean;
  scenarioId: typeof RECURRENCE_SCENARIO_ID;
  runKind: ChronicleRunKind;
}

export function isRecurrenceCustodyMethod(value: unknown): value is RecurrenceCustodyMethod {
  return typeof value === 'string' &&
    (RECURRENCE_CUSTODY_METHODS as readonly string[]).includes(value);
}

export function recurrenceOutcomeId(
  method: RecurrenceCustodyMethod,
  result: 'victory' | 'defeat',
): RecurrenceOutcomeId {
  if (method === 'publish_complete_index') {
    return result === 'victory' ? 'recurrence_published_victory' : 'recurrence_published_defeat';
  }
  if (method === 'seal_operational_grammar') {
    return result === 'victory' ? 'recurrence_sealed_victory' : 'recurrence_sealed_defeat';
  }
  return result === 'victory' ? 'recurrence_conditional_victory' : 'recurrence_conditional_defeat';
}
