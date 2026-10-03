import type { ArchitectFirstContactStance } from './chronicles';

export const FIRST_CONTACT_INVESTIGATION_ID = 'first_contact' as const;
export const FIRST_CONTACT_INVESTIGATION_VERSION = 4;
export const FIRST_CONTACT_COMPLETION_LUME = 10;

export const FIRST_CONTACT_RAPPORTS = [
  'receptive',
  'probing',
  'sparring',
] as const;
export type FirstContactRapport = (typeof FIRST_CONTACT_RAPPORTS)[number];

export function isFirstContactRapport(value: unknown): value is FirstContactRapport {
  return typeof value === 'string'
    && (FIRST_CONTACT_RAPPORTS as readonly string[]).includes(value);
}

export const TUTORIAL_DISCOVERY_IDS = [
  'lumii_origin',
  'artifact_mastery',
  'encryption_authority',
] as const;
export type TutorialDiscoveryId = (typeof TUTORIAL_DISCOVERY_IDS)[number];

export function isTutorialDiscoveryId(value: unknown): value is TutorialDiscoveryId {
  return typeof value === 'string' &&
    (TUTORIAL_DISCOVERY_IDS as readonly string[]).includes(value);
}

export interface TutorialInvestigationProgress {
  investigationId: typeof FIRST_CONTACT_INVESTIGATION_ID;
  definitionVersion: number;
  completed: boolean;
  completedAt: string | null;
  firstContactRapport: FirstContactRapport | null;
  discoveries: TutorialDiscoveryId[];
  completionLumeAwarded: number;
  lumeBalance: number | null;
}

export interface CompleteTutorialInvestigationRequest {
  stance: ArchitectFirstContactStance;
  rapport?: FirstContactRapport | null;
  discoveries: TutorialDiscoveryId[];
}
