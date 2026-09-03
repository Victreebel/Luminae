export const OPENING_CHRONICLE_IDS = [
  'chronicle_trace',
  'chronicle_recurrence',
  'chronicle_triangulation',
] as const;

export type OpeningChronicleId = (typeof OPENING_CHRONICLE_IDS)[number];

export const CHRONICLE_RUN_KINDS = ['primary', 'rehearsal'] as const;
export type ChronicleRunKind = (typeof CHRONICLE_RUN_KINDS)[number];

export const ARCHITECT_FIRST_CONTACT_STANCES = [
  'curious',
  'guarded',
  'resolute',
] as const;
export type ArchitectFirstContactStance =
  (typeof ARCHITECT_FIRST_CONTACT_STANCES)[number];

export function isArchitectFirstContactStance(
  value: unknown,
): value is ArchitectFirstContactStance {
  return typeof value === 'string' &&
    (ARCHITECT_FIRST_CONTACT_STANCES as readonly string[]).includes(value);
}

export const CHRONICLE_PRIMARY_RESULTS = ['victory', 'defeat'] as const;
export type ChroniclePrimaryResult = (typeof CHRONICLE_PRIMARY_RESULTS)[number];

export const CAMPAIGN_CONTENT_STATES = [
  'locked',
  'pending_release',
  'available',
  'completed',
  'rehearsal',
] as const;
export type CampaignContentState = (typeof CAMPAIGN_CONTENT_STATES)[number];

export const CAMPAIGN_DIMENSIONS = ['agency', 'knowledge', 'plurality'] as const;
export type CampaignDimension = (typeof CAMPAIGN_DIMENSIONS)[number];

export const CAMPAIGN_CONTRIBUTION_DIRECTIONS = ['support', 'pressure'] as const;
export type CampaignContributionDirection =
  (typeof CAMPAIGN_CONTRIBUTION_DIRECTIONS)[number];

export const CAMPAIGN_VISIBILITIES = ['public', 'account', 'sealed'] as const;
export type CampaignVisibility = (typeof CAMPAIGN_VISIBILITIES)[number];

export interface CampaignStoryFactAuthoring {
  key: string;
  value: string | number | boolean | null;
  visibility: CampaignVisibility;
}

export interface CampaignDimensionContributionAuthoring {
  dimension: CampaignDimension;
  direction: CampaignContributionDirection;
  magnitude: number;
  rationaleKey: string;
  visibility: Exclude<CampaignVisibility, 'public'>;
}

export interface LumiiRelationshipMemoryAuthoring {
  key: string;
  valence: number;
  detail?: string | number | boolean | null;
  visibility: Exclude<CampaignVisibility, 'public'>;
}

export const CAMPAIGN_ENTITLEMENT_KINDS = [
  'blueprint',
  'archive_record',
  'cosmetic',
  'title',
  'codex',
] as const;
export type CampaignEntitlementKind =
  (typeof CAMPAIGN_ENTITLEMENT_KINDS)[number];

export interface CampaignEntitlementAuthoring {
  kind: CampaignEntitlementKind;
  entitlementId: string;
  competitivePower: boolean;
}

export interface ChronicleOutcomeAuthoring {
  chronicleId: string;
  definitionVersion: number;
  outcomeId: string;
  result: ChroniclePrimaryResult;
  facts: readonly CampaignStoryFactAuthoring[];
  dimensionContributions: readonly CampaignDimensionContributionAuthoring[];
  lumiiMemories: readonly LumiiRelationshipMemoryAuthoring[];
  baselineEntitlements: readonly CampaignEntitlementAuthoring[];
  expressionEntitlements?: readonly CampaignEntitlementAuthoring[];
}

export interface ChronicleDefinitionAuthoring {
  id: string;
  definitionVersion: number;
  title: string;
  scenarioId: string;
  released: boolean;
  lumePolicy: 'award' | 'record_only';
  prerequisiteChronicleIds: readonly string[];
  outcomes: readonly ChronicleOutcomeAuthoring[];
}

export interface ChroniclePrimaryOutcomeSummary {
  chronicleId: string;
  definitionVersion: number;
  outcomeId: string;
  result: ChroniclePrimaryResult;
  roomId: string | null;
  completedAt: string;
  lumeEarned: number;
}

export interface ChronicleRehearsalSummary {
  chronicleId: string;
  definitionVersion: number;
  outcomeId: string;
  result: ChroniclePrimaryResult;
  roomId: string | null;
  completedAt: string;
  preparednessObjectiveMet: boolean;
}

export interface CampaignChronicleProgress {
  chronicleId: OpeningChronicleId;
  title: string;
  state: CampaignContentState;
  primary: ChroniclePrimaryOutcomeSummary | null;
  rehearsalCount: number;
  calibrationInsightEarned: boolean;
}

export interface CampaignProgressProjection {
  openingChronicles: CampaignChronicleProgress[];
  thresholdAvailable: boolean;
  completedPrimaryCount: number;
  calibrationInsightCount: number;
}

export interface BuildCampaignProgressProjectionInput {
  releasedChronicleIds: readonly string[];
  primaryOutcomes: readonly ChroniclePrimaryOutcomeSummary[];
  rehearsals: readonly ChronicleRehearsalSummary[];
  calibrationInsightChronicleIds: readonly string[];
}

const OPENING_CHRONICLE_TITLES: Record<OpeningChronicleId, string> = {
  chronicle_trace: 'The Trace',
  chronicle_recurrence: 'The Recurrence',
  chronicle_triangulation: 'The Triangulation',
};

export function isOpeningChronicleId(value: string): value is OpeningChronicleId {
  return (OPENING_CHRONICLE_IDS as readonly string[]).includes(value);
}

export function rehearsalEntitlementsAreNonPower(
  entitlements: readonly CampaignEntitlementAuthoring[],
): boolean {
  return entitlements.every((entitlement) => !entitlement.competitivePower);
}

export function validateChronicleOutcomeAuthoring(
  outcome: ChronicleOutcomeAuthoring,
): string[] {
  const errors: string[] = [];
  if (!outcome.chronicleId.trim()) errors.push('chronicleId is required');
  if (!Number.isInteger(outcome.definitionVersion) || outcome.definitionVersion < 1) {
    errors.push('definitionVersion must be a positive integer');
  }
  if (!outcome.outcomeId.trim()) errors.push('outcomeId is required');

  const factKeys = new Set<string>();
  for (const fact of outcome.facts) {
    if (!fact.key.trim()) errors.push('fact keys must be non-empty');
    if (factKeys.has(fact.key)) errors.push(`duplicate fact key: ${fact.key}`);
    factKeys.add(fact.key);
  }

  const contributionKeys = new Set<string>();
  for (const contribution of outcome.dimensionContributions) {
    const key = `${contribution.dimension}:${contribution.rationaleKey}`;
    if (!Number.isInteger(contribution.magnitude) || contribution.magnitude < 1) {
      errors.push(`invalid contribution magnitude: ${key}`);
    }
    if (contributionKeys.has(key)) errors.push(`duplicate contribution: ${key}`);
    contributionKeys.add(key);
  }

  const memoryKeys = new Set<string>();
  for (const memory of outcome.lumiiMemories) {
    if (!memory.key.trim()) errors.push('memory keys must be non-empty');
    if (memoryKeys.has(memory.key)) errors.push(`duplicate Lumii memory: ${memory.key}`);
    memoryKeys.add(memory.key);
  }

  const baselineKeys = new Set<string>();
  for (const entitlement of outcome.baselineEntitlements) {
    const key = `${entitlement.kind}:${entitlement.entitlementId}`;
    if (!entitlement.entitlementId.trim()) errors.push('entitlement IDs must be non-empty');
    if (baselineKeys.has(key)) errors.push(`duplicate baseline entitlement: ${key}`);
    baselineKeys.add(key);
  }
  for (const entitlement of outcome.expressionEntitlements ?? []) {
    if (entitlement.competitivePower) {
      errors.push(`branch-specific entitlement cannot grant competitive power: ${entitlement.entitlementId}`);
    }
  }
  return errors;
}

export function validateChronicleDefinitionAuthoring(
  definition: ChronicleDefinitionAuthoring,
): string[] {
  const errors = definition.outcomes.flatMap(validateChronicleOutcomeAuthoring);
  if (!definition.id.trim()) errors.push('Chronicle definition ID is required');
  if (!definition.scenarioId.trim()) errors.push('Chronicle scenario ID is required');
  if (!Number.isInteger(definition.definitionVersion) || definition.definitionVersion < 1) {
    errors.push('Chronicle definition version must be a positive integer');
  }
  if (definition.outcomes.length === 0) errors.push('At least one authored outcome is required');
  if (!definition.outcomes.some((outcome) => outcome.result === 'victory')) {
    errors.push('A required Chronicle must author a victory outcome');
  }
  if (!definition.outcomes.some((outcome) => outcome.result === 'defeat')) {
    errors.push('A required Chronicle must author a fail-forward defeat outcome');
  }
  for (const outcome of definition.outcomes) {
    if (outcome.chronicleId !== definition.id) {
      errors.push(`Outcome ${outcome.outcomeId} belongs to a different Chronicle`);
    }
    if (outcome.definitionVersion !== definition.definitionVersion) {
      errors.push(`Outcome ${outcome.outcomeId} uses a different definition version`);
    }
  }
  const baselineSignatures = new Set(definition.outcomes.map((outcome) =>
    outcome.baselineEntitlements
      .map((entitlement) => `${entitlement.kind}:${entitlement.entitlementId}:${entitlement.competitivePower}`)
      .sort()
      .join('|'),
  ));
  if (baselineSignatures.size > 1) {
    errors.push('Baseline entitlements must be outcome-invariant');
  }
  return errors;
}

export function buildCampaignProgressProjection(
  input: BuildCampaignProgressProjectionInput,
): CampaignProgressProjection {
  const released = new Set(input.releasedChronicleIds);
  const primaryByChronicle = new Map(
    input.primaryOutcomes.map((outcome) => [outcome.chronicleId, outcome]),
  );
  const rehearsalCounts = new Map<string, number>();
  for (const rehearsal of input.rehearsals) {
    rehearsalCounts.set(
      rehearsal.chronicleId,
      (rehearsalCounts.get(rehearsal.chronicleId) ?? 0) + 1,
    );
  }
  const insights = new Set(input.calibrationInsightChronicleIds);

  const openingChronicles = OPENING_CHRONICLE_IDS.map((chronicleId, index) => {
    const primary = primaryByChronicle.get(chronicleId) ?? null;
    const previousComplete = index === 0 || OPENING_CHRONICLE_IDS
      .slice(0, index)
      .every((requiredId) => primaryByChronicle.has(requiredId));
    const rehearsalCount = rehearsalCounts.get(chronicleId) ?? 0;
    let state: CampaignContentState;

    if (primary) {
      state = rehearsalCount > 0 ? 'rehearsal' : 'completed';
    } else if (!released.has(chronicleId)) {
      state = 'pending_release';
    } else {
      state = previousComplete ? 'available' : 'locked';
    }

    return {
      chronicleId,
      title: OPENING_CHRONICLE_TITLES[chronicleId],
      state,
      primary,
      rehearsalCount,
      calibrationInsightEarned: insights.has(chronicleId),
    } satisfies CampaignChronicleProgress;
  });

  const completedPrimaryCount = OPENING_CHRONICLE_IDS.filter((chronicleId) =>
    primaryByChronicle.has(chronicleId),
  ).length;

  return {
    openingChronicles,
    thresholdAvailable: completedPrimaryCount === OPENING_CHRONICLE_IDS.length,
    completedPrimaryCount,
    calibrationInsightCount: OPENING_CHRONICLE_IDS.filter((chronicleId) =>
      insights.has(chronicleId),
    ).length,
  };
}
