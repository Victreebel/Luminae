import { CARD_MAP, LUMINARIES } from "./gameEngine";
import { getCardLore } from "./cardLore";
import {
  BLUEPRINT_CLEARANCE_REQUIRED_WINS,
  CHRONICLE_DEFINITIONS,
  CHRONICLE_IDS,
  type AccountArchiveArtifact,
  type AccountArchiveChronicle,
  type AccountArchiveLuminary,
  type AccountArchiveSummary,
  type BlueprintClearanceStatus,
  type ChronicleId,
} from "@workspace/game-types";

export type {
  AccountArchiveArtifact,
  AccountArchiveChronicle,
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

export interface PersistedChronicleUnlock {
  chronicleId: string;
  source: string;
  unlockedAt: Date;
}

function isChronicleId(value: string): value is ChronicleId {
  return (CHRONICLE_IDS as readonly string[]).includes(value);
}

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
  const civilization = asRecord(player["civilization"]);
  const artifactHistory = civilization ? asRecord(civilization["artifacts"]) : null;
  for (const artifactId of Object.keys(artifactHistory ?? {})) target.add(artifactId);
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
  chronicleUnlocks: PersistedChronicleUnlock[] = [],
): AccountArchiveSummary {
  const discovered = [...artifactIds]
    .map((id): AccountArchiveArtifact | null => {
      const card = CARD_MAP.get(id);
      if (!card) return null;
      const lore = getCardLore(id);
      return {
        id,
        name: lore.name,
        flavor: lore.flavor,
        tier: card.tier,
        bonusAffinity: card.bonusAffinity,
        eminence: card.eminence,
        forgeCount: artifactForgeCounts.get(id) ?? 0,
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
  const chronicleUnlockMap = new Map(
    chronicleUnlocks
      .filter((entry) => isChronicleId(entry.chronicleId))
      .map((entry) => [entry.chronicleId, entry]),
  );
  const chronicleEntries: AccountArchiveChronicle[] = CHRONICLE_IDS.map((chronicleId) => {
    const definition = CHRONICLE_DEFINITIONS[chronicleId];
    const unlock = chronicleUnlockMap.get(chronicleId);
    return {
      id: chronicleId,
      title: definition.title,
      chapterLabel: definition.chapterLabel,
      summary: definition.summary,
      status: unlock ? 'recovered' : 'sealed',
      unlockedAt: unlock?.unlockedAt.toISOString() ?? null,
      relatedBlueprintIds: [...definition.relatedBlueprintIds],
    };
  });

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
    },
    vault,
    chronicles: {
      entries: chronicleEntries,
      recovered: chronicleEntries.filter((entry) => entry.status === 'recovered').length,
      total: CHRONICLE_IDS.length,
    },
  };
}

export function buildAccountArchiveFromPersistedStats(input: {
  artifacts: PersistedArtifactUsage[];
  luminaries: PersistedLuminaryUsage[];
  chronicles?: PersistedChronicleUnlock[];
  qualifyingWins: number;
  clearanceStatus: BlueprintClearanceStatus;
  challengeRoomId: string | null;
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

  return buildArchiveSummary(
    artifactForgeCounts,
    artifactIds,
    luminaryAllianceCounts,
    luminaryIds,
    {
      qualifyingWins: input.qualifyingWins,
      requiredWins: BLUEPRINT_VAULT_REQUIRED_WINS,
      unlocked: input.clearanceStatus === "cleared",
      status: input.clearanceStatus,
      challengeRoomId: input.challengeRoomId,
    },
    input.chronicles ?? [],
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
      qualifyingWins,
      requiredWins: BLUEPRINT_VAULT_REQUIRED_WINS,
      unlocked: false,
      status: qualifyingWins >= BLUEPRINT_VAULT_REQUIRED_WINS
        ? "challenge_ready"
        : "classified",
      challengeRoomId: null,
    },
  );
}
