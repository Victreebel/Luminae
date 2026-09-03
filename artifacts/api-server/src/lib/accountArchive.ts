import { CARD_MAP, LUMINARIES } from "./gameEngine";
import {
  AFFINITY_IDENTITY_ADJECTIVES,
  ARTIFACT_DEFINITIONS,
  BLUEPRINT_CLEARANCE_REQUIRED_WINS,
  BLUEPRINT_DEFINITIONS,
  KARDASHEV_TYPE_LABELS,
  TECHNOLOGY_LINEAGE_NOUNS,
  type ArtifactId,
  type AccountArchiveArtifact,
  type AccountArchiveLuminary,
  type AccountArchiveSummary,
  type BlueprintClearanceStatus,
  type BlueprintId,
  type CivilizationIdentitySelection,
  type KardashevType,
  type LuminaryId,
  type NaturalAffinityKey,
  type TechnologyLineage,
} from "@workspace/game-types";

export type {
  AccountArchiveArtifact,
  AccountArchiveLuminary,
  AccountArchiveSummary,
} from "@workspace/game-types";

export const BLUEPRINT_VAULT_REQUIRED_WINS = BLUEPRINT_CLEARANCE_REQUIRED_WINS;

export interface AccountArchiveMatch {
  playerId: string;
  finished: boolean;
  state: unknown;
  opponents: Array<{
    isAi: boolean;
    aiDifficulty: string | null;
  }>;
}

export interface PersistedArtifactUsage {
  artifactId: string;
  encounterCount: number;
  forgeCount: number;
}

export interface PersistedLuminaryUsage {
  luminaryId: string;
  allianceCount: number;
}

export interface PersistedBlueprintUsage {
  blueprintId: BlueprintId;
  manifestationCount: number;
}

const EMPTY_IDENTITY: CivilizationIdentitySelection = {
  lineage: null,
  affinity: null,
  signatureArtifactId: null,
  signatureLuminaryId: null,
  signatureBlueprintId: null,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function collectPlayerArtifacts(player: Record<string, unknown>, target: Set<string>): void {
  for (const field of [
    "forgedArtifactIds",
    "reservedArtifactIds",
    "privateReservedArtifactIds",
    "assimilatedArtifactIds",
  ]) {
    for (const cardId of asStringArray(player[field])) target.add(cardId);
  }
}

function asUsageCounts(value: unknown): Record<string, number> | null {
  const record = asRecord(value);
  if (!record) return null;

  const counts: Record<string, number> = {};
  for (const [id, count] of Object.entries(record)) {
    if (typeof count === "number" && Number.isInteger(count) && count > 0) counts[id] = count;
  }
  return counts;
}

function countsFromIds(ids: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}

function addUsageCounts(
  totals: Map<string, number>,
  discoveredIds: Set<string>,
  counts: Record<string, number>,
): void {
  for (const [id, count] of Object.entries(counts)) {
    totals.set(id, (totals.get(id) ?? 0) + count);
    discoveredIds.add(id);
  }
}

function uniqueUsageLeader<T>(
  entries: T[],
  countFor: (entry: T) => number,
  nameFor: (entry: T) => string,
): T | undefined {
  const ranked = [...entries]
    .filter((entry) => countFor(entry) > 0)
    .sort((left, right) => countFor(right) - countFor(left) || nameFor(left).localeCompare(nameFor(right)));
  if (!ranked[0]) return undefined;
  if (ranked[1] && countFor(ranked[1]) === countFor(ranked[0])) return undefined;
  return ranked[0];
}

function archiveNameCompare(left: string, right: string): number {
  if (left === "???" && right !== "???") return 1;
  if (right === "???" && left !== "???") return -1;
  return left.localeCompare(right);
}

function buildArchiveSummary(
  artifactForgeCounts: Map<string, number>,
  artifactIds: Set<string>,
  luminaryAllianceCounts: Map<string, number>,
  luminaryIds: Set<string>,
  vault: AccountArchiveSummary["vault"],
  identitySelection: CivilizationIdentitySelection = EMPTY_IDENTITY,
  blueprintManifestations: Map<BlueprintId, number> = new Map(),
  scaleType: KardashevType = 0,
  revealedProjectNames: ReadonlySet<string> = new Set(),
): AccountArchiveSummary {
  const discovered = [...artifactIds]
    .map((id): AccountArchiveArtifact | null => {
      const definition = ARTIFACT_DEFINITIONS[id as ArtifactId];
      if (!definition) return null;
      return {
        id: definition.id,
        name: definition.name,
        flavor: definition.flavor,
        practicalCapability: definition.practicalCapability,
        mystery: definition.mystery,
        forms: [...definition.forms],
        tier: definition.tier,
        bonusAffinity: definition.bonusAffinity,
        cost: { ...definition.cost },
        eminence: definition.eminence,
        forgeCount: artifactForgeCounts.get(id) ?? 0,
        lineage: definition.lineage,
        builtOn: definition.builtOn.map((artifactId) => {
          const known = artifactIds.has(artifactId);
          const related = ARTIFACT_DEFINITIONS[artifactId];
          return {
            id: known ? artifactId : null,
            name: known ? related.name : null,
            tier: related.tier,
            known,
          };
        }),
        leadsToward: definition.leadsToward.map((artifactId) => {
          const known = artifactIds.has(artifactId);
          const related = ARTIFACT_DEFINITIONS[artifactId];
          return {
            id: known ? artifactId : null,
            name: known ? related.name : null,
            tier: related.tier,
            known,
          };
        }),
        projectLeads: definition.projectLeads.map((lead) => {
          const revealed = revealedProjectNames.has(lead.name);
          return {
            name: revealed ? lead.name : null,
            priority: lead.priority,
            revealed,
          };
        }),
        blueprintEligibility: Object.values(BLUEPRINT_DEFINITIONS)
          .filter((blueprint) => blueprint.components.some((component) => component.artifactId === definition.id))
          .map((blueprint) => blueprint.id),
      };
    })
    .filter((artifact): artifact is AccountArchiveArtifact => artifact !== null)
    .sort((left, right) => left.tier - right.tier || archiveNameCompare(left.name, right.name));

  const encountered = LUMINARIES
    .filter((luminary) => luminaryIds.has(luminary.id))
    .map((luminary): AccountArchiveLuminary => ({
      id: luminary.id,
      name: luminary.name,
      domain: luminary.domain,
      eminence: luminary.eminence,
      flavor: luminary.flavor,
      effectName: luminary.effectName ?? null,
      effectDescription: luminary.effectDescription ?? null,
      summonColor: luminary.summonColor,
      summonSecondaryColor: luminary.summonSecondaryColor,
      allianceCount: luminaryAllianceCounts.get(luminary.id) ?? 0,
    }))
    .sort((left, right) => archiveNameCompare(left.name, right.name));

  const totalByTier: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  for (const card of CARD_MAP.values()) totalByTier[card.tier] += 1;

  const discoveredByTier: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  for (const artifact of discovered) discoveredByTier[artifact.tier] += 1;

  const signatureArtifact = uniqueUsageLeader(
    discovered,
    (artifact) => artifact.forgeCount,
    (artifact) => artifact.name,
  );
  const closestLuminary = uniqueUsageLeader(
    encountered,
    (luminary) => luminary.allianceCount,
    (luminary) => luminary.name,
  );
  const forgeCountForLineage = new Map<TechnologyLineage, number>();
  const forgeCountForAffinity = new Map<NaturalAffinityKey, number>();
  for (const artifact of discovered) {
    forgeCountForLineage.set(
      artifact.lineage,
      (forgeCountForLineage.get(artifact.lineage) ?? 0) + artifact.forgeCount,
    );
    forgeCountForAffinity.set(
      artifact.bonusAffinity,
      (forgeCountForAffinity.get(artifact.bonusAffinity) ?? 0) + artifact.forgeCount,
    );
  }
  const earnedLineages = [...forgeCountForLineage]
    .filter(([, count]) => count >= 3)
    .map(([lineage]) => lineage);
  const earnedAffinities = [...forgeCountForAffinity]
    .filter(([, count]) => count >= 5)
    .map(([affinity]) => affinity);
  const earnedBlueprintIds = [...blueprintManifestations]
    .filter(([, count]) => count > 0)
    .map(([blueprintId]) => blueprintId);
  const leadingLineage = uniqueUsageLeader(
    earnedLineages,
    (lineage) => forgeCountForLineage.get(lineage) ?? 0,
    (lineage) => lineage,
  );
  const leadingAffinity = uniqueUsageLeader(
    earnedAffinities,
    (affinity) => forgeCountForAffinity.get(affinity) ?? 0,
    (affinity) => affinity,
  );
  const suggested: CivilizationIdentitySelection = {
    lineage: leadingLineage ?? null,
    affinity: leadingAffinity ?? null,
    signatureArtifactId: signatureArtifact?.id ?? null,
    signatureLuminaryId: (closestLuminary?.id as LuminaryId | undefined) ?? null,
    signatureBlueprintId: earnedBlueprintIds.length === 1 ? earnedBlueprintIds[0] : null,
  };
  const displayName = identitySelection.lineage && identitySelection.affinity
    ? `The ${AFFINITY_IDENTITY_ADJECTIVES[identitySelection.affinity]} ${TECHNOLOGY_LINEAGE_NOUNS[identitySelection.lineage]}`
    : null;
  const projectEpithet = identitySelection.signatureBlueprintId
    ? BLUEPRINT_DEFINITIONS[identitySelection.signatureBlueprintId].name
    : null;

  return {
    artifacts: {
      discovered,
      total: CARD_MAP.size,
      discoveredByTier,
      totalByTier,
    },
    luminaries: {
      encountered,
      total: LUMINARIES.length,
    },
    identity: {
      totalForges: discovered.reduce((sum, artifact) => sum + artifact.forgeCount, 0),
      totalAlliances: encountered.reduce((sum, luminary) => sum + luminary.allianceCount, 0),
      signatureArtifactId: signatureArtifact?.id ?? null,
      closestLuminaryId: closestLuminary?.id ?? null,
      selected: {
        ...identitySelection,
        displayName,
        scaleType,
        scaleLabel: KARDASHEV_TYPE_LABELS[scaleType],
        projectEpithet,
      },
      suggested,
      options: {
        lineages: earnedLineages,
        affinities: earnedAffinities,
        artifactIds: discovered
          .filter((artifact) => artifact.forgeCount > 0)
          .map((artifact) => artifact.id),
        luminaryIds: encountered
          .filter((luminary) => luminary.allianceCount > 0)
          .map((luminary) => luminary.id as LuminaryId),
        blueprintIds: earnedBlueprintIds,
      },
    },
    vault,
  };
}

export function buildAccountArchiveFromPersistedStats(input: {
  artifacts: PersistedArtifactUsage[];
  luminaries: PersistedLuminaryUsage[];
  blueprints?: PersistedBlueprintUsage[];
  qualifyingWins: number;
  clearanceStatus: BlueprintClearanceStatus;
  challengeRoomId: string | null;
  identitySelection?: CivilizationIdentitySelection;
  highestKardashevType?: KardashevType;
  revealedProjectNames?: string[];
}): AccountArchiveSummary {
  const artifactIds = new Set(
    input.artifacts.filter((entry) => entry.encounterCount > 0).map((entry) => entry.artifactId),
  );
  const artifactForgeCounts = new Map(
    input.artifacts.map((entry) => [entry.artifactId, entry.forgeCount]),
  );
  const luminaryIds = new Set(
    input.luminaries.filter((entry) => entry.allianceCount > 0).map((entry) => entry.luminaryId),
  );
  const luminaryAllianceCounts = new Map(
    input.luminaries.map((entry) => [entry.luminaryId, entry.allianceCount]),
  );
  const blueprintManifestations = new Map(
    (input.blueprints ?? []).map((entry) => [entry.blueprintId, entry.manifestationCount]),
  );

  return buildArchiveSummary(
    artifactForgeCounts,
    artifactIds,
    luminaryAllianceCounts,
    luminaryIds,
    {
      qualifyingWins: Math.min(input.qualifyingWins, BLUEPRINT_VAULT_REQUIRED_WINS),
      requiredWins: BLUEPRINT_VAULT_REQUIRED_WINS,
      unlocked: input.clearanceStatus === "cleared",
      status: input.clearanceStatus,
      challengeRoomId: input.challengeRoomId,
    },
    input.identitySelection ?? EMPTY_IDENTITY,
    blueprintManifestations,
    input.highestKardashevType ?? 0,
    new Set(input.revealedProjectNames ?? []),
  );
}

export function buildAccountArchive(matches: AccountArchiveMatch[]): AccountArchiveSummary {
  const artifactIds = new Set<string>();
  const luminaryIds = new Set<string>();
  const artifactForgeCounts = new Map<string, number>();
  const luminaryAllianceCounts = new Map<string, number>();
  let qualifyingWins = 0;

  for (const match of matches) {
    const state = asRecord(match.state);
    if (!state) continue;

    const statePlayers = Array.isArray(state["players"])
      ? state["players"].map(asRecord).filter((player): player is Record<string, unknown> => player !== null)
      : [];
    const accountPlayer = statePlayers.find((player) => player["playerId"] === match.playerId);

    if (accountPlayer) {
      collectPlayerArtifacts(accountPlayer, artifactIds);
      const luminaries = asStringArray(accountPlayer["luminaries"]);
      for (const luminaryId of luminaries) {
        luminaryIds.add(luminaryId);
      }

      const forgeCounts = asUsageCounts(accountPlayer["artifactForgeCounts"])
        ?? countsFromIds(asStringArray(accountPlayer["forgedArtifactIds"]));
      const allianceCounts = asUsageCounts(accountPlayer["luminaryAllianceCounts"])
        ?? countsFromIds(luminaries);
      addUsageCounts(artifactForgeCounts, artifactIds, forgeCounts);
      addUsageCounts(luminaryAllianceCounts, luminaryIds, allianceCounts);
    }

    const won = match.finished && state["winnerId"] === match.playerId;
    const defeatedThreeHardAi = match.opponents.length === 3 && match.opponents.every(
      (opponent) => opponent.isAi && opponent.aiDifficulty === "hard",
    );
    if (won && defeatedThreeHardAi) qualifyingWins += 1;
  }

  return buildArchiveSummary(
    artifactForgeCounts,
    artifactIds,
    luminaryAllianceCounts,
    luminaryIds,
    {
      qualifyingWins: Math.min(qualifyingWins, BLUEPRINT_VAULT_REQUIRED_WINS),
      requiredWins: BLUEPRINT_VAULT_REQUIRED_WINS,
      unlocked: false,
      status: qualifyingWins >= BLUEPRINT_VAULT_REQUIRED_WINS
        ? "challenge_ready"
        : "classified",
      challengeRoomId: null,
    },
  );
}
