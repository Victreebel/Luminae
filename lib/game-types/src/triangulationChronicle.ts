import type { ArtifactCivilizationCapabilityId } from './civilization-capabilities';
import type { ChronicleRunKind } from './chronicles';

export const TRIANGULATION_CHRONICLE_ID = 'chronicle_triangulation' as const;
export const TRIANGULATION_SCENARIO_ID = 'chronicle_triangulation_v1' as const;
export const TRIANGULATION_DEFINITION_VERSION = 1 as const;

export const TRIANGULATION_COORDINATION_ARCHITECTURES = [
  'preserve_independent_frames',
  'establish_unowned_measure',
  'instantiate_composite_mind',
] as const;
export type TriangulationCoordinationArchitecture =
  (typeof TRIANGULATION_COORDINATION_ARCHITECTURES)[number];

export const TRIANGULATION_REFERENCE_CIVILIZATIONS = ['deme', 'myria', 'vesper'] as const;
export type TriangulationReferenceCivilization =
  (typeof TRIANGULATION_REFERENCE_CIVILIZATIONS)[number];

export const TRIANGULATION_SCENARIO_PHASES = [
  'setup',
  'playing',
  'awaiting_alignment',
  'alignment_resolved',
  'finished',
] as const;
export type TriangulationScenarioPhase = (typeof TRIANGULATION_SCENARIO_PHASES)[number];

export const TRIANGULATION_OUTCOME_IDS = [
  'triangulation_frames_deme_reference',
  'triangulation_frames_myria_reference',
  'triangulation_frames_vesper_reference',
  'triangulation_measure_deme_reference',
  'triangulation_measure_myria_reference',
  'triangulation_measure_vesper_reference',
  'triangulation_composite_deme_reference',
  'triangulation_composite_myria_reference',
  'triangulation_composite_vesper_reference',
] as const;
export type TriangulationOutcomeId = (typeof TRIANGULATION_OUTCOME_IDS)[number];

export const TRIANGULATION_PREPAREDNESS_CAPABILITY_IDS = [
  'artifact:signal_interpretation',
  'artifact:evidence_verification',
  'artifact:predictive_modeling',
  'artifact:cross_ecology_mediation',
  'artifact:plural_governance',
  'artifact:distributed_coordination',
] as const satisfies readonly ArtifactCivilizationCapabilityId[];

export const TRIANGULATION_ALIGNMENT_DUE_AFTER_CORE_ACTIONS = 5 as const;

export interface TriangulationScenarioState {
  chronicleId: typeof TRIANGULATION_CHRONICLE_ID;
  scenarioId: typeof TRIANGULATION_SCENARIO_ID;
  definitionVersion: typeof TRIANGULATION_DEFINITION_VERSION;
  runKind: ChronicleRunKind;
  architectPlayerId: string;
  myriaPlayerId: string;
  vesperPlayerId: string;
  phase: TriangulationScenarioPhase;
  architectCoreActions: number;
  alignmentDueAfterActions: number;
  coordinationArchitecture: TriangulationCoordinationArchitecture | null;
  choiceResolvedAtTurn: number | null;
  preparednessMet: boolean;
  preparednessCapabilityId: ArtifactCivilizationCapabilityId | null;
  preparednessArtifactId: string | null;
  priorMemoryLines: string[];
  referenceCivilization: TriangulationReferenceCivilization | null;
  outcomeId: TriangulationOutcomeId | null;
}

export interface TriangulationChronicleSession {
  roomId: string;
  inviteCode: string;
  playerId: string;
  sessionToken: string;
  resumed: boolean;
  scenarioId: typeof TRIANGULATION_SCENARIO_ID;
  runKind: ChronicleRunKind;
}

export function isTriangulationCoordinationArchitecture(
  value: unknown,
): value is TriangulationCoordinationArchitecture {
  return typeof value === 'string' &&
    (TRIANGULATION_COORDINATION_ARCHITECTURES as readonly string[]).includes(value);
}

export function isTriangulationReferenceCivilization(
  value: unknown,
): value is TriangulationReferenceCivilization {
  return typeof value === 'string' &&
    (TRIANGULATION_REFERENCE_CIVILIZATIONS as readonly string[]).includes(value);
}

export function triangulationOutcomeId(
  architecture: TriangulationCoordinationArchitecture,
  reference: TriangulationReferenceCivilization,
): TriangulationOutcomeId {
  const architectureKey = architecture === 'preserve_independent_frames'
    ? 'frames'
    : architecture === 'establish_unowned_measure'
      ? 'measure'
      : 'composite';
  return `triangulation_${architectureKey}_${reference}_reference` as TriangulationOutcomeId;
}

export function triangulationOutcomeResult(
  reference: TriangulationReferenceCivilization,
): 'victory' | 'defeat' {
  return reference === 'deme' ? 'victory' : 'defeat';
}
