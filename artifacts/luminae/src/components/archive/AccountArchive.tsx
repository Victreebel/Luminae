import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Archive,
  BookOpen,
  Clock,
  Check,
  Copy,
  Eye,
  FileClock,
  Globe2,
  Hammer,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  type BlueprintId,
  type BlueprintLoadout,
  type LumiiThresholdApproach,
  type LumiiThresholdDialogueChoiceId,
  type CampaignProgressProjection,
} from "@workspace/game-types";
import type {
  AccountArchiveArtifact,
  AccountArchiveChronicle,
  AccountArchiveLuminary,
  AccountArchiveSummary,
  BlueprintVaultState,
  GameHistoryEntry,
  PlayerStats,
} from "@/lib/accountSession";
import { CARD_ART } from "@/lib/cardArtManifest";
import { LUMINARY_RUNTIME_ART } from "@/lib/luminaryArtManifest";
import { recordProgressionOnce } from "@/lib/telemetry";
import { AFFINITY_META } from "@/lib/affinityMeta";
import { ArtifactFunctionTags } from "@/components/ArtifactFunctionTags";
import { CIVILIZATION_DYAD_VISUALS } from "@/lib/civilizationVisualState";
import {
  LumiiVaultEncounter,
  VaultThreshold,
  type VaultSourceRect,
} from "@/components/vault/LumiiVaultEncounter";
import "./AccountArchive.css";

const AntimatterBlueprintCard = lazy(async () => {
  const module =
    await import("@/components/blueprints/AntimatterBlueprintCard");
  return { default: module.AntimatterBlueprintCard };
});

export type ArchiveSection =
  | "civilization"
  | "artifacts"
  | "luminaries"
  | "matches"
  | "chronicles"
  | "vault";

type MatchSort = "newest" | "oldest" | "result" | "eminence";
type ArtifactSort = "tier" | "forged" | "name" | "affinity" | "eminence";
type LuminarySort = "allied" | "name" | "domain" | "eminence";

const LUMINARY_ART: Record<string, string> = {};
for (const [key, url] of Object.entries(LUMINARY_RUNTIME_ART)) {
  const match = key.match(/^([^/]+)\/panel_runtime$/);
  if (match) LUMINARY_ART[match[1]] = url;
}

const EMPTY_ARCHIVE: AccountArchiveSummary = {
  artifacts: {
    discovered: [],
    total: 90,
    discoveredByTier: { 1: 0, 2: 0, 3: 0 },
    totalByTier: { 1: 40, 2: 30, 3: 20 },
  },
  luminaries: { encountered: [], total: 17 },
  identity: {
    totalForges: 0,
    totalAlliances: 0,
    signatureArtifactId: null,
    closestLuminaryId: null,
  },
  vault: {
    qualifyingWins: 0,
    requiredWins: 5,
    unlocked: false,
    status: "classified",
    challengeRoomId: null,
  },
  chronicles: {
    entries: [],
    recovered: 0,
    total: 0,
  },
};

const AFFINITY_LABELS: Record<string, string> = {
  flare: "Flare",
  continuum: "Continuum",
  verdance: "Verdance",
  abyss: "Abyss",
  radiance: "Radiance",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function concealBlueprintTerms(text: string, unlocked: boolean): string {
  return unlocked ? text : text.replace(/Blueprints?/gi, "[REDACTED]");
}

function compareLuminaryNames(
  left: AccountArchiveLuminary,
  right: AccountArchiveLuminary,
): number {
  const leftIsConcealed = /^\?+$/.test(left.name.trim());
  const rightIsConcealed = /^\?+$/.test(right.name.trim());
  if (leftIsConcealed !== rightIsConcealed) return leftIsConcealed ? 1 : -1;
  return left.name.localeCompare(right.name);
}

function LuminaryMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`account-archive__luminary-mark ${className}`}
      aria-hidden="true"
    >
      ✦
    </span>
  );
}

function RedactionBand({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="account-archive__redaction"
      data-compact={compact}
      aria-hidden="true"
    >
      <span className="account-archive__redaction-word">Blueprint</span>
      <span className="account-archive__redaction-stamp">REDACTED</span>
    </span>
  );
}

type VaultHubStatus = {
  eyebrow: string;
  title: string;
  copy: string;
};

type RecoveredBlueprintRecord = {
  id: BlueprintId;
  label: string;
  name: string;
  serialCode: string;
  effect: string;
};

type SealedFutureRecord = {
  label: string;
  title: string;
  detail: string;
};

type PrimaryPostLumiiAction = {
  eyebrow: string;
  title: string;
  detail: string;
  status: string;
};

function vaultHubStatus(
  vaultState?: BlueprintVaultState | null,
): VaultHubStatus {
  const recoveredCount = vaultState?.unlockedBlueprintIds.length ?? 0;
  const sealedCount = vaultState?.corruptedRecordCount ?? 0;
  return {
    eyebrow: "OUTER VAULT ACCESS",
    title:
      recoveredCount > 0
        ? "First record recovered"
        : "Vault threshold stabilized",
    copy:
      sealedCount > 0
        ? "The first Blueprint is stable in the Archive. Remaining records are sealed for future story-mode campaigns."
        : "The opened Vault is stable. Further campaign records will be indexed when the next story-mode chapter is ready.",
  };
}

function getBlueprintName(
  vaultState: BlueprintVaultState,
  blueprintId: BlueprintId,
): string {
  return (
    vaultState.blueprints.find((blueprint) => blueprint.id === blueprintId)
      ?.name ??
    "Recovered Blueprint"
  );
}

function recoveredBlueprintRecords(
  vaultState?: BlueprintVaultState | null,
): RecoveredBlueprintRecord[] {
  if (!vaultState) return [];
  return vaultState.unlockedBlueprintIds.map((blueprintId, index) => {
    const blueprint = vaultState.blueprints.find(
      (candidate) => candidate.id === blueprintId,
    );
    return {
      id: blueprintId,
      label: `BLUEPRINT // ${String(index + 1).padStart(2, "0")} RECOVERED`,
      name: blueprint?.name ?? getBlueprintName(vaultState, blueprintId),
      serialCode:
        blueprint?.presentation.serialCode ??
        `BP-${String(index + 1).padStart(2, "0")}`,
      effect:
        blueprint?.publicEffect ??
        "Recovered protocol available for assignment.",
    };
  });
}

function sealedFutureRecords(
  count: number | null | undefined,
  startIndex: number,
): SealedFutureRecord[] {
  return Array.from({ length: Math.max(0, count ?? 0) }, (_, index) => ({
    label: `BLUEPRINT // ${String(startIndex + index).padStart(2, "0")}`,
    title: "▓▓▓▓▓▓ ░▒▓▓▓▓▓",
    detail: "Campaign record sealed",
  }));
}

function lumiiMemoryLine(clearance?: BlueprintVaultState["clearance"]): string {
  if (!(clearance?.thresholdRuptured ?? clearance?.covenantBroken)) {
    return "Lumii's firewall has withdrawn. The threshold remains quiet, but not reconciled.";
  }
  if (clearance.thresholdApproach === "kinship") {
    return "Lumii remembers that you crossed the threshold as someone familiar, not merely as an Architect.";
  }
  if (clearance.thresholdApproach === "dominion") {
    return "Lumii remembers that the Cipher answered to you, and that she did not.";
  }
  return "Lumii remembers the questions she could not safely answer.";
}

function primaryPostLumiiAction(
  vaultState?: BlueprintVaultState | null,
): PrimaryPostLumiiAction {
  const firstNode = vaultState?.campaignNodes[0] ?? null;
  if (firstNode && vaultState) {
    return {
      eyebrow: "RECOVERED THREAD",
      title: firstNode.title,
      detail: `${getBlueprintName(vaultState, firstNode.blueprintId)} protocol recovered. Full campaign deployment is paused for this release.`,
      status: "Campaign record pending",
    };
  }
  return {
    eyebrow: "STORY MODE",
    title: "First chapter complete",
    detail:
      "The next civilization campaign will become available in a future update.",
    status: "Further access unavailable",
  };
}

function SortControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="account-archive__sort">
      <ArrowUpDown aria-hidden="true" />
      <span>Sort</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResultBadge({ result }: { result: GameHistoryEntry["result"] }) {
  const labels = { win: "Win", loss: "Loss", tie: "Tie" };
  return (
    <span className="account-archive__result" data-result={result}>
      {labels[result]}
    </span>
  );
}

function outcomeLabel(
  category: NonNullable<NonNullable<GameHistoryEntry["civilizationRecord"]>["outcome"]>["category"],
): string {
  return String(category).charAt(0).toUpperCase() + String(category).slice(1);
}

const OUTCOME_DIMENSIONS = ["continuity", "agency", "achievement", "stability"] as const;

function dimensionLabel(dimension: (typeof OUTCOME_DIMENSIONS)[number]): string {
  return dimension.charAt(0).toUpperCase() + dimension.slice(1);
}

function recordLabel(value: string | null | undefined, fallback = "Unrecorded"): string {
  if (!value) return fallback;
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

function CivilizationMatchSnapshot({ game }: { game: GameHistoryEntry }) {
  const record = game.civilizationRecord;
  const [copied, setCopied] = useState(false);
  if (!record || record.evidence === "legacy_unavailable") return null;

  const dyad = record.dominantDyad ? CIVILIZATION_DYAD_VISUALS[record.dominantDyad] : null;
  const primaryAffinity = record.dominantAffinity ?? dyad?.affinities[0] ?? null;
  const secondaryAffinity = dyad?.affinities.find((affinity) => affinity !== primaryAffinity) ?? primaryAffinity;
  const primaryTone = primaryAffinity ? AFFINITY_META[primaryAffinity].hex : "#82ddff";
  const secondaryTone = secondaryAffinity ? AFFINITY_META[secondaryAffinity].hex : "#dfb86b";
  const identityLabel = dyad
    ? `${dyad.label} Dyad`
    : record.affinityForm === "plural"
      ? "Plural Civilization"
      : primaryAffinity
        ? `${recordLabel(primaryAffinity)} Civilization`
        : "Unformed Civilization";
  const reachDetail = record.currentReach
    ? `${recordLabel(record.currentReach)}${record.currentReachCondition && record.currentReachCondition !== "intact" ? ` / ${recordLabel(record.currentReachCondition)}` : ""}`
    : "Unrecorded";
  const metrics = [
    [record.masteredArtifactCount, "Mastered"],
    [record.operationalArtifactCount, "Operational"],
    [record.manifestedProjectCount, "Projects"],
    [record.civilizationEventCount, "Events"],
  ] as const;
  const shareText = [
    `LUMINAe Civilization Record | ${identityLabel}`,
    `${recordLabel(record.historicalMaturity)} maturity | ${reachDetail} Reach | ${recordLabel(record.stabilityBand)} stability`,
    metrics.filter(([value]) => value !== null).map(([value, label]) => `${value} ${label}`).join(" | "),
    `${game.eminenceEarned} Eminence | ${recordLabel(game.result)}`,
  ].filter(Boolean).join("\n");

  return (
    <section
      className="account-archive__civilization-snapshot"
      style={{
        "--civ-record-primary": primaryTone,
        "--civ-record-secondary": secondaryTone,
      } as CSSProperties}
      aria-label={`${identityLabel} record`}
    >
      <span className="account-archive__civilization-mark" aria-hidden="true">
        <i />
      </span>
      <div className="account-archive__civilization-heading">
        <small>Civilization Record</small>
        <strong>{identityLabel}</strong>
      </div>
      <dl className="account-archive__civilization-state">
        <div>
          <dt>Maturity</dt>
          <dd>{recordLabel(record.historicalMaturity)}</dd>
        </div>
        <div>
          <dt>Present Reach</dt>
          <dd>{reachDetail}</dd>
        </div>
        <div>
          <dt>Stability</dt>
          <dd>{recordLabel(record.stabilityBand)}</dd>
        </div>
      </dl>
      <dl className="account-archive__civilization-metrics">
        {metrics.map(([value, label]) => value !== null && (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        className="account-archive__civilization-copy"
        title="Copy Civilization Record"
        aria-label="Copy Civilization Record"
        onClick={() => {
          void navigator.clipboard?.writeText(shareText).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          });
        }}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
    </section>
  );
}

function MatchRecord({ stats, sort }: { stats: PlayerStats; sort: MatchSort }) {
  const matchHistory = stats.matchHistory ?? stats.recentGames;
  const games = useMemo(
    () =>
      [...matchHistory].sort((left, right) => {
        if (sort === "oldest") {
          return (
            new Date(left.finishedAt).getTime() -
            new Date(right.finishedAt).getTime()
          );
        }
        if (sort === "result") {
          const order = { win: 0, tie: 1, loss: 2 };
          return (
            order[left.result] - order[right.result] ||
            new Date(right.finishedAt).getTime() -
              new Date(left.finishedAt).getTime()
          );
        }
        if (sort === "eminence") {
          return (
            right.eminenceEarned - left.eminenceEarned ||
            new Date(right.finishedAt).getTime() -
              new Date(left.finishedAt).getTime()
          );
        }
        return (
          new Date(right.finishedAt).getTime() -
          new Date(left.finishedAt).getTime()
        );
      }),
    [matchHistory, sort],
  );

  if (games.length === 0) {
    return (
      <div className="account-archive__empty">
        <FileClock aria-hidden="true" />
        <p>No completed matches recorded</p>
        <span>Your first completed match will begin this record.</span>
      </div>
    );
  }

  return (
    <div className="account-archive__match-list">
      {games.map((game, index) => (
        <motion.article
          key={game.roomId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.025 }}
          className="account-archive__match"
        >
          <ResultBadge result={game.result} />
          <div className="account-archive__match-copy">
            <strong>{game.inviteCode}</strong>
            <span>
              {game.totalPlayers} player{game.totalPlayers === 1 ? "" : "s"}
              {game.civilizationRecord?.historicalContext === "forecast"
                ? " / defense forecast"
                : ""}
              {game.civilizationRecord?.historicalMaturity
                ? ` / ${game.civilizationRecord.historicalMaturity} / ${game.civilizationRecord.stabilityBand ?? "stability unrecorded"}`
                : game.civilizationRecord?.evidence === "legacy_unavailable"
                  ? " / civilization unrecorded"
                  : ""}
            </span>
            {game.civilizationRecord?.outcome && (
              <details className="account-archive__match-outcome">
                <summary>
                  {outcomeLabel(game.civilizationRecord.outcome.category)}
                  <span>{game.civilizationRecord.outcome.qualityScore} quality</span>
                </summary>
                <dl>
                  {OUTCOME_DIMENSIONS.map((dimension) => (
                    <div key={dimension}>
                      <dt>{dimensionLabel(dimension)}</dt>
                      <dd>{game.civilizationRecord!.outcome![dimension]}</dd>
                      {game.civilizationRecord!.outcome!.primaryFactors[dimension].map((factor) => (
                        <span key={`${factor.direction}:${factor.label}`} data-direction={factor.direction}>
                          {factor.direction === "support" ? "+" : "-"}{factor.points} {factor.label}
                        </span>
                      ))}
                    </div>
                  ))}
                </dl>
                <p>{game.civilizationRecord.outcome.explanation[0]}</p>
              </details>
            )}
          </div>
          <span className="account-archive__match-date">
            <Clock aria-hidden="true" />
            {formatDate(game.finishedAt)}
          </span>
          <div className="account-archive__match-rewards">
            <div className="account-archive__eminence">
              <strong>{game.eminenceEarned}</strong>
              <span>Eminence</span>
            </div>
            {game.civilizationRecord?.lume.status === "awarded" && (
              <div className="account-archive__lume" title={game.civilizationRecord.lume.explanation[0]}>
                <strong>+{game.civilizationRecord.lume.amount}</strong>
                <span>Lume</span>
              </div>
            )}
          </div>
          <CivilizationMatchSnapshot game={game} />
        </motion.article>
      ))}
    </div>
  );
}

function ChronicleArchive({
  entries,
  campaignProgress,
  isPending,
  onStartChronicle,
}: {
  entries: readonly AccountArchiveChronicle[];
  campaignProgress?: CampaignProgressProjection | null;
  isPending?: boolean;
  onStartChronicle?: (chronicleId: string) => void;
}) {
  const campaignEntries = campaignProgress?.openingChronicles ?? [];
  const archivedOnly = entries.filter(
    (entry) => !campaignEntries.some((campaign) => String(campaign.chronicleId) === String(entry.id)),
  );
  if (entries.length === 0 && campaignEntries.length === 0) {
    return (
      <div className="account-archive__empty">
        <BookOpen aria-hidden="true" />
        <p>No Chronicle records recovered</p>
        <span>Story-mode records will appear here as the Vault yields them.</span>
      </div>
    );
  }

  return (
    <div className="account-archive__chronicles">
      {campaignEntries.map((entry, index) => {
        const developmentTriangulation = import.meta.env.DEV &&
          entry.chronicleId === "chronicle_triangulation" &&
          campaignEntries.slice(0, index).every((prior) => prior.primary !== null);
        const canLaunch = (
          entry.chronicleId === "chronicle_trace" ||
          entry.chronicleId === "chronicle_recurrence" ||
          developmentTriangulation
        ) && (
          entry.state === "available" || entry.state === "completed" ||
          entry.state === "rehearsal" || developmentTriangulation
        );
        const completed = entry.primary !== null;
        return (
          <motion.article
            key={entry.chronicleId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.035 }}
            className="account-archive__chronicle account-archive__chronicle--campaign"
            data-status={entry.state}
          >
            <span className="account-archive__chronicle-mark" aria-hidden="true"><BookOpen /></span>
            <div>
              <p>{completed ? "History Recorded" : entry.state === "available" ? "Chronicle Available" : "Future Record"}</p>
              <h3>{entry.title}</h3>
              <span>
                {entry.chronicleId === "chronicle_trace"
                  ? completed
                    ? "Primary history is immutable. Re-enter through an Archive Rehearsal."
                    : "Guide two civilizations through Crownfall and establish the first stable Trace."
                  : entry.chronicleId === "chronicle_recurrence"
                    ? completed
                      ? "The Deep Index custody record is immutable. Re-enter through an Archive Rehearsal."
                      : "Decide who may hold a dangerous truth before the White Return."
                    : completed
                      ? "The Alignment record is immutable. Re-enter through an Archive Rehearsal."
                      : developmentTriangulation
                        ? "Development validation: align three civilizations before Blind Transit."
                        : "The next record is not yet available."}
              </span>
              {completed && <small>{entry.chronicleId === "chronicle_recurrence"
                ? entry.primary?.result === "victory" ? "The Meridian Houses established the reference" : "The Oru established the reference"
                : entry.primary?.result === "victory" ? "Vey established the reference" : "The Keelborn established the reference"}</small>}
            </div>
            {canLaunch && (
              <button
                type="button"
                className="account-archive__chronicle-action"
                onClick={() => onStartChronicle?.(entry.chronicleId)}
                disabled={isPending}
              >
                {isPending ? <Loader2 aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
                {completed ? "Archive Rehearsal" : `Enter ${entry.title}`}
              </button>
            )}
          </motion.article>
        );
      })}
      {archivedOnly.map((entry, index) => (
        <motion.article
          key={entry.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (campaignEntries.length + index) * 0.035 }}
          className="account-archive__chronicle"
          data-status={entry.status}
        >
          <span className="account-archive__chronicle-mark" aria-hidden="true">
            <BookOpen />
          </span>
          <div>
            <p>{entry.chapterLabel}</p>
            <h3>{entry.status === "recovered" ? entry.title : "Sealed Chronicle"}</h3>
            <span>{entry.status === "recovered" ? entry.summary : "A future story record remains inaccessible."}</span>
            {entry.unlockedAt && (
              <small>Recovered {formatDate(entry.unlockedAt)}</small>
            )}
          </div>
        </motion.article>
      ))}
    </div>
  );
}

function ArtifactRecord({
  artifact,
  isSignature,
}: {
  artifact: AccountArchiveArtifact;
  isSignature: boolean;
}) {
  const forgeCount = artifact.forgeCount ?? 0;
  return (
    <article
      className="account-archive__artifact"
      data-affinity={artifact.bonusAffinity}
    >
      <div className="account-archive__artifact-art">
        {CARD_ART[artifact.id] ? (
          <img src={CARD_ART[artifact.id]} alt="" />
        ) : (
          <Hammer aria-hidden="true" />
        )}
        <span>Tier {artifact.tier}</span>
      </div>
      <div className="account-archive__artifact-copy">
        <p>
          {AFFINITY_LABELS[artifact.bonusAffinity] ?? artifact.bonusAffinity}
        </p>
        <h4>{artifact.name}</h4>
        <div className="account-archive__artifact-history">
          <span>
            {forgeCount > 0
              ? `Forged ${forgeCount} ${forgeCount === 1 ? "time" : "times"}`
              : "Obtained, not Forged"}
          </span>
          {isSignature && <strong>Signature technology</strong>}
        </div>
        <span>{artifact.flavor}</span>
        <ArtifactFunctionTags artifactId={artifact.id} compact className="mt-2" />
      </div>
      {artifact.eminence > 0 && (
        <div
          className="account-archive__artifact-value"
          title={`${artifact.eminence} Eminence`}
        >
          {artifact.eminence}
        </div>
      )}
    </article>
  );
}

function compareArtifacts(
  left: AccountArchiveArtifact,
  right: AccountArchiveArtifact,
  sort: ArtifactSort,
): number {
  if (sort === "forged") {
    return (
      (right.forgeCount ?? 0) - (left.forgeCount ?? 0) ||
      left.name.localeCompare(right.name)
    );
  }
  if (sort === "name") return left.name.localeCompare(right.name);
  if (sort === "affinity") {
    return (
      (AFFINITY_LABELS[left.bonusAffinity] ?? left.bonusAffinity).localeCompare(
        AFFINITY_LABELS[right.bonusAffinity] ?? right.bonusAffinity,
      ) || left.name.localeCompare(right.name)
    );
  }
  if (sort === "eminence") {
    return (
      right.eminence - left.eminence ||
      left.tier - right.tier ||
      left.name.localeCompare(right.name)
    );
  }
  return left.tier - right.tier || left.name.localeCompare(right.name);
}

function ArtifactArchive({
  archive,
  sort,
}: {
  archive: AccountArchiveSummary;
  sort: ArtifactSort;
}) {
  const sortedArtifacts = useMemo(
    () =>
      [...archive.artifacts.discovered].sort((left, right) =>
        compareArtifacts(left, right, sort),
      ),
    [archive.artifacts.discovered, sort],
  );

  if (sort !== "tier") {
    const unknown = Math.max(
      0,
      archive.artifacts.total - sortedArtifacts.length,
    );
    return (
      <div className="account-archive__catalog">
        {sortedArtifacts.length > 0 ? (
          <div className="account-archive__artifact-grid">
            {sortedArtifacts.map((artifact) => (
              <ArtifactRecord
                key={artifact.id}
                artifact={artifact}
                isSignature={
                  archive.identity?.signatureArtifactId === artifact.id
                }
              />
            ))}
          </div>
        ) : (
          <div className="account-archive__empty">
            <Hammer aria-hidden="true" />
            <p>No Artifact records verified</p>
            <span>Records appear after you obtain or use an Artifact.</span>
          </div>
        )}
        {unknown > 0 && (
          <div className="account-archive__redacted-row">
            <span aria-hidden="true">████ ████████ ██████</span>
            <strong>{unknown} records remain unrecognized</strong>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="account-archive__catalog">
      {[1, 2, 3].map((tier) => {
        const typedTier = tier as 1 | 2 | 3;
        const artifacts = sortedArtifacts.filter(
          (artifact) => artifact.tier === typedTier,
        );
        const known = archive.artifacts.discoveredByTier[typedTier];
        const total = archive.artifacts.totalByTier[typedTier];
        return (
          <section key={tier} className="account-archive__tier">
            <header>
              <div>
                <p>Tier {tier}</p>
                <h3>
                  {tier === 1
                    ? "Planetary"
                    : tier === 2
                      ? "Stellar"
                      : "Galactic"}{" "}
                  Records
                </h3>
              </div>
              <span>
                {known} / {total} encountered
              </span>
            </header>
            <div
              className="account-archive__tier-meter"
              aria-label={`${known} of ${total} Tier ${tier} Artifacts encountered`}
            >
              <span
                style={{ width: `${total > 0 ? (known / total) * 100 : 0}%` }}
              />
            </div>
            {artifacts.length > 0 ? (
              <div className="account-archive__artifact-grid">
                {artifacts.map((artifact) => (
                  <ArtifactRecord
                    key={artifact.id}
                    artifact={artifact}
                    isSignature={
                      archive.identity?.signatureArtifactId === artifact.id
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="account-archive__redacted-row">
                <span aria-hidden="true">████ ████████ ██████</span>
                <strong>{total} records remain unrecognized</strong>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function LuminaryRecord({
  luminary,
  vaultUnlocked,
  isClosest,
}: {
  luminary: AccountArchiveLuminary;
  vaultUnlocked: boolean;
  isClosest: boolean;
}) {
  const allianceCount = luminary.allianceCount ?? 0;
  const effectDescription = luminary.effectDescription
    ? concealBlueprintTerms(luminary.effectDescription, vaultUnlocked)
    : null;
  return (
    <article
      className="account-archive__luminary"
      style={
        {
          "--luminary-primary": luminary.summonColor,
          "--luminary-secondary": luminary.summonSecondaryColor,
        } as CSSProperties
      }
    >
      <div className="account-archive__luminary-art">
        {LUMINARY_ART[luminary.id] ? (
          <img src={LUMINARY_ART[luminary.id]} alt="" />
        ) : (
          <LuminaryMark />
        )}
        <span className="account-archive__luminary-domain">
          {luminary.domain}
        </span>
      </div>
      <div className="account-archive__luminary-copy">
        <div className="account-archive__luminary-meta">
          <p>
            Allied {allianceCount} {allianceCount === 1 ? "time" : "times"}
          </p>
          <span>{luminary.eminence} Eminence</span>
        </div>
        <h3>{luminary.name}</h3>
        {isClosest && (
          <span className="account-archive__identity-tag">
            Closest recurring ally
          </span>
        )}
        <blockquote>{luminary.flavor}</blockquote>
        {luminary.effectName && (
          <div className="account-archive__luminary-effect">
            <strong>{luminary.effectName}</strong>
            {effectDescription && <span>{effectDescription}</span>}
          </div>
        )}
      </div>
    </article>
  );
}

function LuminaryArchive({
  archive,
  sort,
}: {
  archive: AccountArchiveSummary;
  sort: LuminarySort;
}) {
  const luminaries = useMemo(
    () =>
      [...archive.luminaries.encountered].sort((left, right) => {
        if (sort === "allied") {
          return (
            (right.allianceCount ?? 0) - (left.allianceCount ?? 0) ||
            compareLuminaryNames(left, right)
          );
        }
        if (sort === "domain")
          return (
            left.domain.localeCompare(right.domain) ||
            compareLuminaryNames(left, right)
          );
        if (sort === "eminence")
          return (
            right.eminence - left.eminence || compareLuminaryNames(left, right)
          );
        return compareLuminaryNames(left, right);
      }),
    [archive.luminaries.encountered, sort],
  );
  const unknown = Math.max(0, archive.luminaries.total - luminaries.length);

  return (
    <div className="account-archive__luminary-section">
      {luminaries.length > 0 ? (
        <div className="account-archive__luminary-grid">
          {luminaries.map((luminary) => (
            <LuminaryRecord
              key={luminary.id}
              luminary={luminary}
              vaultUnlocked={archive.vault.unlocked}
              isClosest={archive.identity?.closestLuminaryId === luminary.id}
            />
          ))}
        </div>
      ) : (
        <div className="account-archive__empty">
          <Eye aria-hidden="true" />
          <p>No encounters verified</p>
          <span>Records appear after a Luminary joins your civilization.</span>
        </div>
      )}
      {unknown > 0 && (
        <div className="account-archive__unknown-encounters">
          <span aria-hidden="true">
            UNKNOWN ENTITIES // {String(unknown).padStart(2, "0")}
          </span>
          <div>
            {Array.from({ length: Math.min(unknown, 12) }, (_, index) => (
              <i key={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type VaultLoadoutMode = Extract<
  BlueprintLoadout["mode"],
  "campaign" | "custom"
>;

function BlueprintVault({
  archive,
  vaultState,
  isLoading,
  isPending,
  onResumeChallenge,
  onDeactivateCipher,
  onChooseApproach,
  onRecordDialogue,
  onResolveDialogue,
  onUseDecryptionKey,
  onPrepareChallenge,
  onEnterPreparedChallenge,
  onAcknowledgeReveal,
  onUpdateLoadout,
}: {
  archive: AccountArchiveSummary;
  vaultState?: BlueprintVaultState | null;
  isLoading?: boolean;
  isPending?: boolean;
  onResumeChallenge?: () => Promise<void> | void;
  onDeactivateCipher?: () => Promise<void> | void;
  onChooseApproach?: (approach: LumiiThresholdApproach) => Promise<void> | void;
  onRecordDialogue?: (
    path: LumiiThresholdDialogueChoiceId[],
  ) => Promise<void> | void;
  onResolveDialogue?: () => Promise<void> | void;
  onUseDecryptionKey?: () => Promise<void> | void;
  onPrepareChallenge?: () => Promise<void> | void;
  onEnterPreparedChallenge?: () => void;
  onAcknowledgeReveal?: () => Promise<void> | void;
  onUpdateLoadout?: (
    mode: VaultLoadoutMode,
    slots: Array<BlueprintId | null>,
  ) => void;
}) {
  const thresholdRef = useRef<HTMLButtonElement | null>(null);
  const [encounterMode, setEncounterMode] = useState<
    "entry" | "victory" | null
  >(null);
  const [sourceRect, setSourceRect] = useState<VaultSourceRect | null>(null);
  const [loadoutMode, setLoadoutMode] = useState<VaultLoadoutMode>("campaign");
  const [mobileHubSection, setMobileHubSection] = useState<
    "recovered" | "sealed"
  >("recovered");
  const clearance = vaultState?.clearance;
  const status =
    clearance?.status ??
    archive.vault.status ??
    (archive.vault.unlocked ? "cleared" : "classified");
  const qualifyingWins =
    clearance?.qualifyingWins ?? archive.vault.qualifyingWins;
  const requiredWins = clearance?.requiredWins ?? archive.vault.requiredWins;
  const unlocked = status === "cleared";
  const challengeReady = status === "challenge_ready";
  const challengeActive = status === "challenge_active";
  const completed = Math.min(qualifyingWins, requiredWins);
  const covenantBroken = clearance?.thresholdRuptured ?? clearance?.covenantBroken ?? false;
  const reportedCipherDeactivated = clearance?.cipherDeactivated ?? false;
  const thresholdApproach = clearance?.thresholdApproach ?? null;
  const thresholdDialoguePath = clearance?.thresholdDialoguePath ?? [];
  const thresholdDialogueResolution =
    clearance?.thresholdDialogueResolution ?? null;
  const decryptionKeyBypassActive =
    clearance?.decryptionKeyBypassActive ?? false;
  const architectRecordComplete = qualifyingWins >= requiredWins;
  const cipherDeactivated =
    reportedCipherDeactivated && architectRecordComplete;
  const thresholdAccessReady =
    challengeReady && (architectRecordComplete || decryptionKeyBypassActive);
  const decryptionKeyAvailable = vaultState?.decryptionKeyAvailable ?? false;
  const revealPending = clearance?.revealPending ?? false;
  const selectedBlueprintId = vaultState?.unlockedBlueprintIds[0] ?? null;
  const activeLoadout = vaultState?.loadouts.find(
    (loadout) => loadout.mode === loadoutMode,
  );
  const activeSlots = activeLoadout?.slots ?? [null, null];
  const forgedArtifactIds = useMemo(
    () =>
      archive.artifacts.discovered
        .filter((artifact) => artifact.forgeCount > 0)
        .map((artifact) => artifact.id),
    [archive.artifacts.discovered],
  );
  const antimatterComponentIds = useMemo(
    () => new Set(
      vaultState?.blueprints
        .find((blueprint) => blueprint.id === "bp_antimatter_detonator")
        ?.components.map((component) => component.artifactId) ?? [],
    ),
    [vaultState?.blueprints],
  );
  const knownAntimatterComponentCount = forgedArtifactIds.filter((artifactId) =>
    antimatterComponentIds.has(artifactId),
  ).length;
  const hubStatus = vaultHubStatus(vaultState);
  const blueprintRecords = recoveredBlueprintRecords(vaultState);
  const primaryBlueprintRecord = blueprintRecords[0] ?? null;
  const futureRecords = sealedFutureRecords(
    vaultState?.corruptedRecordCount,
    blueprintRecords.length + 1,
  );
  const storyAction = primaryPostLumiiAction(vaultState);
  const memoryLine = lumiiMemoryLine(clearance);
  const antimatterRecovered =
    vaultState?.unlockedBlueprintIds.includes("bp_antimatter_detonator") ??
    false;

  useEffect(() => {
    if (unlocked) recordProgressionOnce("vault_opened");
    if (antimatterRecovered) recordProgressionOnce("antimatter_recovered");
  }, [antimatterRecovered, unlocked]);

  useEffect(() => {
    if (!unlocked || !revealPending || encounterMode) return;
    const rect = thresholdRef.current?.getBoundingClientRect();
    if (rect) {
      setSourceRect({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
    setEncounterMode("victory");
  }, [encounterMode, revealPending, unlocked]);

  const statusLabel = unlocked
    ? "VAULT OPEN"
    : challengeActive
      ? "DEFENSE FORECAST ACTIVE"
      : decryptionKeyBypassActive
        ? "BLACK MARKET BYPASS"
        : covenantBroken
          ? "THRESHOLD RUPTURED"
          : cipherDeactivated
            ? "CIPHER DEACTIVATED"
            : thresholdAccessReady
              ? "SUPREME CIPHER READY"
              : "ACCESS DENIED";
  const sealLabel = unlocked
    ? "REDACTION LIFTED"
    : challengeActive
      ? "CONTESTED"
      : decryptionKeyBypassActive
        ? "TEMPORARY OVERRIDE"
        : covenantBroken
          ? "DEFENSE FORECAST"
          : cipherDeactivated
            ? "THRESHOLD ARRESTED"
            : challengeReady
              ? "SUPREME CIPHER"
              : "TOP SECRET";

  const activateThreshold = () => {
    if (challengeActive) {
      void Promise.resolve(onResumeChallenge?.()).catch(() => undefined);
      return;
    }
    if (!challengeReady && !revealPending) return;
    const rect = thresholdRef.current?.getBoundingClientRect();
    if (rect) {
      setSourceRect({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
    setEncounterMode(revealPending ? "victory" : "entry");
  };

  const toggleLoadoutSlot = (slotIndex: number) => {
    if (!selectedBlueprintId || !onUpdateLoadout) return;
    const nextSlots = Array.from(
      { length: 2 },
      (_, index) => activeSlots[index] ?? null,
    );
    if (nextSlots[slotIndex] === selectedBlueprintId) {
      nextSlots[slotIndex] = null;
    } else {
      for (let index = 0; index < nextSlots.length; index += 1) {
        if (nextSlots[index] === selectedBlueprintId) nextSlots[index] = null;
      }
      nextSlots[slotIndex] = selectedBlueprintId;
    }
    onUpdateLoadout(loadoutMode, nextSlots);
  };

  return (
    <>
      <section
        className="account-vault"
        data-unlocked={unlocked}
        data-status={status}
        data-testid="blueprint-vault"
      >
        <div className="account-vault__warning-rail" aria-hidden="true">
          {unlocked ? (
            <>
              <span>REDACTION LIFTED</span>
              <span>OUTER VAULT ACCESS</span>
              <span>VAULT OPEN</span>
            </>
          ) : (
            <>
              <span>DANGER</span>
              <span>KEEP OUT</span>
              <span>FORBIDDEN</span>
              <span>DANGER</span>
            </>
          )}
        </div>

        <header className="account-vault__header">
          <div>
            <p>
              {unlocked ? (
                <Sparkles aria-hidden="true" />
              ) : (
                <ShieldAlert aria-hidden="true" />
              )}
              {unlocked
                ? "Recovered Civilization Record"
                : "Restricted Civilization Record"}
            </p>
            <h2>
              {unlocked ? (
                "Blueprint Vault"
              ) : (
                <>
                  <RedactionBand />
                  Vault
                </>
              )}
            </h2>
          </div>
          <span data-testid="vault-status">{statusLabel}</span>
        </header>

        {isLoading ? (
          <div
            className="account-vault__loading"
            aria-label="Reading Vault record"
          >
            <Loader2 aria-hidden="true" />
            <span>Reading threshold</span>
          </div>
        ) : (
          <>
            <VaultThreshold
              ref={thresholdRef}
              state={unlocked ? "open" : challengeActive ? "hostile" : "sealed"}
              cipherState={
                unlocked ? "hidden" : cipherDeactivated ? "inert" : "active"
              }
              interactive={
                (thresholdAccessReady || challengeActive || revealPending) &&
                !isPending
              }
              ariaLabel={
                challengeActive
                  ? "Resume the Lumii confrontation"
                  : thresholdAccessReady
                    ? "Attempt Blueprint Vault access"
                    : unlocked
                      ? "Open cosmic technology vault"
                      : "Sealed cosmic technology vault"
              }
              sealLabel={sealLabel}
              onActivate={activateThreshold}
            />

            <div className="account-vault__orders">
              <div className="account-vault__requirement">
                <p>{unlocked ? "ARCHITECT RECORD" : "ACCESS CONDITION"}</p>
                <strong>
                  {decryptionKeyBypassActive
                    ? "Black Market Decryption Key accepted."
                    : "Win five standard matches against three Hard AI opponents."}
                </strong>
                <span>
                  {decryptionKeyBypassActive
                    ? "Defeat Lumii on this access attempt. Leaving or losing restores the five-win condition."
                    : "All three opponents must be set to Hard in each qualifying match."}
                </span>
                {!unlocked && !challengeReady && decryptionKeyAvailable && (
                  <button
                    type="button"
                    className="account-vault__decryption-key-button"
                    onClick={() => void onUseDecryptionKey?.()}
                    disabled={isPending || !onUseDecryptionKey}
                  >
                    {isPending ? (
                      <Loader2 aria-hidden="true" />
                    ) : (
                      <KeyRound aria-hidden="true" />
                    )}
                    <span>
                      <strong>Spend Decryption Key</strong>
                      <small>Single use · bypasses this access condition</small>
                    </span>
                  </button>
                )}
              </div>
              <div className="account-vault__progress">
                <div>
                  <span>
                    {unlocked ? "ARCHITECT RECORD" : "CIPHER PROGRESS"}
                  </span>
                  <strong>
                    {completed} / {requiredWins}
                  </strong>
                </div>
                <div
                  className="account-vault__progress-segments"
                  aria-label={`${completed} of ${requiredWins} qualifying wins`}
                >
                  {Array.from({ length: requiredWins }, (_, index) => (
                    <i key={index} data-complete={index < completed} />
                  ))}
                </div>
              </div>
            </div>

            {unlocked && vaultState ? (
              <div className="account-vault__collection">
                <section
                  className="account-vault__hub-core"
                  aria-label="Opened Vault status"
                >
                  <div>
                    <p>{hubStatus.eyebrow}</p>
                    <h3>{hubStatus.title}</h3>
                    <span>{hubStatus.copy}</span>
                  </div>
                  <div
                    className="account-vault__lumii-memory"
                    aria-label="Lumii threshold memory"
                  >
                    <small>
                      {covenantBroken ? "THRESHOLD RUPTURED" : "LUMII SIGNAL"}
                    </small>
                    <strong>Threshold memory</strong>
                    <span>{memoryLine}</span>
                  </div>
                </section>

                <div
                  className="account-vault__mobile-section-tabs"
                  aria-label="Vault hub section"
                >
                  <button
                    type="button"
                    aria-pressed={mobileHubSection === "recovered"}
                    data-active={mobileHubSection === "recovered"}
                    onClick={() => setMobileHubSection("recovered")}
                  >
                    <Sparkles aria-hidden="true" />
                    Recovered
                  </button>
                  <button
                    type="button"
                    aria-pressed={mobileHubSection === "sealed"}
                    data-active={mobileHubSection === "sealed"}
                    onClick={() => setMobileHubSection("sealed")}
                  >
                    <LockKeyhole aria-hidden="true" />
                    Sealed Records
                  </button>
                </div>

                <div className="account-vault__hub-grid">
                  <section
                    className="account-vault__blueprint-record"
                    aria-label="Recovered Blueprint"
                    data-mobile-active={mobileHubSection === "recovered"}
                  >
                    <div className="account-vault__collection-header">
                      <div>
                        <p>
                          {primaryBlueprintRecord?.label ??
                            "BLUEPRINT // 01 RECOVERED"}
                        </p>
                        <h3>
                          {primaryBlueprintRecord?.name ??
                            "Recovered Blueprint"}
                        </h3>
                        {primaryBlueprintRecord && (
                          <span>
                            {primaryBlueprintRecord.serialCode} · Milestone
                            recovered
                          </span>
                        )}
                      </div>
                    </div>

                    {antimatterRecovered && (
                      <Suspense
                        fallback={
                          <div className="account-vault__card-loading">
                            <Loader2 aria-hidden="true" />
                          </div>
                        }
                      >
                        <AntimatterBlueprintCard
                          state="assembling"
                          presentation="card"
                          matchedSockets={knownAntimatterComponentCount}
                          assigned={activeSlots.includes(
                            "bp_antimatter_detonator",
                          )}
                          knownComponentIds={forgedArtifactIds}
                        />
                      </Suspense>
                    )}

                    {primaryBlueprintRecord && (
                      <p className="account-vault__blueprint-effect">
                        {primaryBlueprintRecord.effect}
                      </p>
                    )}

                    <div className="account-vault__loadout-panel">
                      <div className="account-vault__collection-header">
                        <div>
                          <p>MODE ASSIGNMENT</p>
                          <h3>Owner Loadout</h3>
                        </div>
                        <div
                          className="account-vault__mode-switch"
                          aria-label="Blueprint loadout mode"
                        >
                          {(["campaign", "custom"] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              data-active={loadoutMode === mode}
                              onClick={() => setLoadoutMode(mode)}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div
                        className="account-vault__slots"
                        aria-label={`${loadoutMode} Blueprint loadout`}
                      >
                        {Array.from(
                          { length: vaultState.slotCount },
                          (_, slotIndex) => {
                            const blueprintId = activeSlots[slotIndex] ?? null;
                            return (
                              <button
                                type="button"
                                key={slotIndex}
                                data-filled={blueprintId !== null}
                                disabled={isPending || !selectedBlueprintId}
                                onClick={() => toggleLoadoutSlot(slotIndex)}
                              >
                                <span>Slot {slotIndex + 1}</span>
                                <strong>
                                  {blueprintId
                                    ? getBlueprintName(vaultState, blueprintId)
                                    : "Unassigned"}
                                </strong>
                                <small>
                                  {blueprintId
                                    ? "Selected for play"
                                    : "Select recovered Blueprint"}
                                </small>
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </section>

                  <section
                    className="account-vault__campaign-records"
                    aria-label="Sealed Campaign Records"
                    data-mobile-active={mobileHubSection === "sealed"}
                  >
                    <div className="account-vault__collection-header">
                      <div>
                        <p>STORY MODE INDEX</p>
                        <h3>Sealed Campaign Records</h3>
                        <span>
                          Progression pauses here while future campaigns remain
                          under lock.
                        </span>
                      </div>
                    </div>

                    <div className="account-vault__campaign-node">
                      <div>
                        <span>{storyAction.eyebrow}</span>
                        <strong>{storyAction.title}</strong>
                        <small>{storyAction.detail}</small>
                      </div>
                      <em>{storyAction.status}</em>
                    </div>

                    {futureRecords.length > 0 && (
                      <div
                        className="account-vault__corrupted"
                        aria-label={`${futureRecords.length} sealed future Vault records`}
                      >
                        {futureRecords.map((record) => (
                          <article key={record.label}>
                            <span>{record.label}</span>
                            <strong aria-label="Corrupted record">
                              {record.title}
                            </strong>
                            <small>{record.detail}</small>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            ) : (
              <footer className="account-vault__notice">
                <ShieldAlert aria-hidden="true" />
                <div>
                  <strong>
                    {challengeActive
                      ? "The forecast is still running"
                      : decryptionKeyBypassActive
                        ? "Black Market bypass active"
                        : thresholdAccessReady
                          ? cipherDeactivated
                            ? "The Supreme Cipher is deactivated"
                            : "The Supreme Cipher answers to you"
                          : "Knowledge isolation remains in force"}
                  </strong>
                  <span>
                    {challengeActive
                      ? "Your confrontation is preserved exactly where it stopped."
                      : decryptionKeyBypassActive
                        ? "The Cipher is being forced open for this attempt only. Leaving or losing restores the five-win condition."
                        : thresholdAccessReady
                          ? cipherDeactivated
                            ? covenantBroken
                              ? "Lumii remembers the rupture. The defense forecast can be entered again."
                              : "The mechanical doors are closed. Lumii's independent firewall still holds the threshold."
                            : "The Architect-owned Cipher is now the sole entry control."
                          : "Do not attempt entry. Do not reproduce the symbols. Do not answer voices from within."}
                  </span>
                </div>
              </footer>
            )}
          </>
        )}
      </section>

      {encounterMode && (
        <LumiiVaultEncounter
          sourceRect={sourceRect}
          attempt={covenantBroken ? "remembered" : "first"}
          outcome={encounterMode === "victory" ? "victory" : "entry"}
          cipherDeactivated={cipherDeactivated}
          covenantBroken={covenantBroken}
          thresholdApproach={thresholdApproach}
          dialoguePath={thresholdDialoguePath}
          dialogueResolution={thresholdDialogueResolution}
          onLeave={() => setEncounterMode(null)}
          onDeactivateCipher={onDeactivateCipher}
          onChooseApproach={onChooseApproach}
          onRecordDialoguePath={onRecordDialogue}
          onResolveDialogue={onResolveDialogue}
          onBeginChallenge={async () => {
            if (!onPrepareChallenge)
              throw new Error("The defense forecast is unavailable.");
            await onPrepareChallenge();
          }}
          onChallengeReady={onEnterPreparedChallenge}
          onEnterVault={async () => {
            await onAcknowledgeReveal?.();
            setEncounterMode(null);
          }}
        />
      )}
    </>
  );
}

const CIVILIZATION_GUIDE_ENTRIES = [
  {
    label: "Affinity commitment",
    title: "The Well is not fuel",
    copy: "Affinity is finite Domain addressability. Harnessing stabilizes uncommitted possibilities, and Forging commits them to accelerated research, construction, and adoption. Once implementation sustains itself, every paid Affinity returns to its matching Well channel.",
  },
  {
    label: "Implemented technology",
    title: "Artifacts become capability",
    copy: "The civilization openly masters and implements a bounded capability. Its permanent bonus is the expertise, infrastructure, and institutions left behind, not retained fuel or ownership of an idea.",
  },
  {
    label: "Artifact signature",
    title: "One class, local embodiments",
    copy: "Each Artifact class has a recognizable signature but can take different local forms. First mastery causes Domain-local signature interference for that same class, delaying rivals without suppressing related technologies or the whole lineage.",
  },
  {
    label: "Lifecycle",
    title: "Discovery, pathway, and operation differ",
    copy: "Forge masters and implements. Encrypt isolates an uncommitted path. Burn collapses a path for the epoch. Assimilate consumes it without normal implementation. Damage suspends operation. Annihilate destroys an implementation or near-complete path while history survives.",
  },
  {
    label: "Foundry exception",
    title: "A seal archives mastery",
    copy: "Foundry Overdrive archives its three component implementations, removes their bonuses, unwinds their active interference, and holds them in Cipher storage for re-Forge. Foundry Components do not consume the ordinary three-card Encryption capacity.",
  },
  {
    label: "Civilization portrait",
    title: "Consequences appear at honest scale",
    copy: "The portrait shows districts, routes, institutions, fields, and large projects where they could plausibly exist. Scan deployment sites to connect each visible consequence to the Artifact history that caused it.",
  },
  {
    label: "Current condition",
    title: "Stability is resilience",
    copy: "Stability shows how well the civilization can absorb disruption. Conditions name concrete causes such as Damage, Isolation, Quarantine, or Disruption; resolving a cause changes Stability.",
  },
  {
    label: "Historical pressure",
    title: "Chronicles test what exists",
    copy: "Chronicle choices and exceptional events respond to active capabilities, Affinity identity, Stability, and prior history. Their consequences persist in the Civilization Record.",
  },
  {
    label: "Observation closure",
    title: "Records preserve the civilization",
    copy: "When a match closes, Continuity, Agency, Achievement, and Stability form an immutable record. Lume reflects historical quality, which can differ from the competitive result.",
  },
  {
    label: "Recovered designs",
    title: "Blueprints manifest Projects",
    copy: "A Blueprint automatically manifests when its exact Artifact pattern is complete. The Project then exists, but its activation, trigger, custody, and consequences follow that Project's own rules.",
  },
] as const;

function CivilizationFieldGuide() {
  return (
    <section className="overflow-hidden border border-white/10 bg-[#070b13]" aria-label="Civilization system reference">
      <header className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(25,55,77,0.46),rgba(7,11,19,0.9))] px-4 py-4 sm:px-5">
        <p className="text-[9px] font-black uppercase text-cyan-100/55">Architect reference</p>
        <h3 className="mt-1 font-serif text-xl font-semibold text-white sm:text-2xl">Technology becomes history</h3>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/62 sm:text-sm">
          The Forge accelerates which reachable futures become operational first. The Civilization layer shows what those commitments build, how society responds under pressure, and what remains when observation closes.
        </p>
      </header>
      <div className="divide-y divide-white/8">
        {CIVILIZATION_GUIDE_ENTRIES.map((entry, index) => (
          <article key={entry.title} className="grid gap-2 px-4 py-4 sm:grid-cols-[42px_minmax(0,0.62fr)_minmax(0,1.38fr)] sm:items-start sm:gap-4 sm:px-5">
            <span className="font-mono text-[10px] text-cyan-100/38">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <small className="block text-[9px] font-black uppercase text-amber-100/48">{entry.label}</small>
              <strong className="mt-1 block text-sm font-semibold text-white/92">{entry.title}</strong>
            </div>
            <p className="text-xs leading-relaxed text-white/58">{entry.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ArchiveLanding({
  stats,
  archive,
  onNavigate,
}: {
  stats: PlayerStats;
  archive: AccountArchiveSummary;
  onNavigate: (section: ArchiveSection) => void;
}) {
  const identity = archive.identity ?? EMPTY_ARCHIVE.identity;
  const signatureArtifact = archive.artifacts.discovered.find(
    (artifact) => artifact.id === identity.signatureArtifactId,
  );
  const closestLuminary = archive.luminaries.encountered.find(
    (luminary) => luminary.id === identity.closestLuminaryId,
  );
  const sections: Array<{
    id: ArchiveSection;
    label: string;
    redacted?: boolean;
    eyebrow: string;
    description: string;
    icon: ReactNode;
    metric: string;
  }> = [
    {
      id: "civilization",
      label: "Civilization Field Guide",
      eyebrow: "System Reference",
      description: "How technology becomes visible, consequential history.",
      icon: <Globe2 aria-hidden="true" />,
      metric: "Portrait / state / record",
    },
    {
      id: "artifacts",
      label: "Artifacts",
      eyebrow: "Recovered Technology",
      description: "Technology held or used by your civilization.",
      icon: <Hammer aria-hidden="true" />,
      metric: `${archive.artifacts.discovered.length} / ${archive.artifacts.total} encountered`,
    },
    {
      id: "luminaries",
      label: "Luminaries",
      eyebrow: "Civilization Allies",
      description: "Entities that have allied with you previously.",
      icon: <LuminaryMark />,
      metric: `${archive.luminaries.encountered.length} / ${archive.luminaries.total} encountered`,
    },
    {
      id: "matches",
      label: "Match Record",
      eyebrow: "Chronological Record",
      description: "Completed conflicts and their outcomes.",
      icon: <FileClock aria-hidden="true" />,
      metric: `${stats.gamesPlayed} match${stats.gamesPlayed === 1 ? "" : "es"} recorded`,
    },
    {
      id: "chronicles",
      label: "Chronicles",
      eyebrow: "Story Records",
      description: "Recovered story-mode records and sealed future threads.",
      icon: <BookOpen aria-hidden="true" />,
      metric: `${archive.chronicles?.recovered ?? 0} / ${archive.chronicles?.total ?? 0} recovered`,
    },
    {
      id: "vault",
      label: archive.vault.unlocked ? "Blueprint Vault" : "Top Secret Vault",
      redacted: !archive.vault.unlocked,
      eyebrow: archive.vault.unlocked
        ? "Clearance Recognized"
        : "Restricted Knowledge",
      description: archive.vault.unlocked
        ? "The containment threshold has been met."
        : "Access remains sealed by Lumii protocol.",
      icon: <LockKeyhole aria-hidden="true" />,
      metric: `${Math.min(archive.vault.qualifyingWins, archive.vault.requiredWins)} / ${archive.vault.requiredWins} clearance`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="account-archive__foyer"
    >
      <div className="account-archive__foyer-title">
        <div className="account-archive__foyer-seal" aria-hidden="true">
          <Archive />
        </div>
        <div>
          <p>Civilization Archive</p>
          <h2>Recorded Knowledge</h2>
        </div>
        <span>
          {archive.artifacts.discovered.length +
            archive.luminaries.encountered.length}{" "}
          verified records
        </span>
      </div>

      <section
        className="account-archive__identity"
        aria-label="Civilization Imprint"
      >
        <header>
          <div>
            <p>Civilization Imprint</p>
            <h3>Patterns Across Histories</h3>
          </div>
          <span>
            {identity.totalForges} Forges // {identity.totalAlliances} alliances
          </span>
        </header>
        <div className="account-archive__identity-records">
          <div
            className="account-archive__identity-record"
            data-kind="artifact"
          >
            <span className="account-archive__identity-mark">
              <Hammer aria-hidden="true" />
            </span>
            <div>
              <small>Signature Technology</small>
              <strong>
                {signatureArtifact?.name ??
                  (identity.totalForges > 0
                    ? "No sole signature"
                    : "No pattern established")}
              </strong>
              <span>
                {signatureArtifact
                  ? `Forged ${signatureArtifact.forgeCount} ${signatureArtifact.forgeCount === 1 ? "time" : "times"}`
                  : identity.totalForges > 0
                    ? "Multiple technologies share the Forge lead."
                    : "Your Forge record is still unwritten."}
              </span>
            </div>
          </div>
          <div
            className="account-archive__identity-record"
            data-kind="luminary"
          >
            <span className="account-archive__identity-mark">
              <LuminaryMark />
            </span>
            <div>
              <small>Closest Recurring Ally</small>
              <strong>
                {closestLuminary?.name ??
                  (identity.totalAlliances > 0
                    ? "No sole recurring ally"
                    : "No bond established")}
              </strong>
              <span>
                {closestLuminary
                  ? `Allied ${closestLuminary.allianceCount} ${closestLuminary.allianceCount === 1 ? "time" : "times"}`
                  : identity.totalAlliances > 0
                    ? "Multiple Luminaries share the alliance lead."
                    : "No Luminary alliance has been recorded."}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="account-archive__doors">
        {sections.map((section, index) => {
          return (
            <motion.button
              key={section.id}
              type="button"
              aria-label={section.label}
              data-oom-sound={section.id === "vault" ? "vault" : "archive"}
              className={`account-archive__door account-archive__door--${section.id}`}
              onClick={() => onNavigate(section.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 + index * 0.04 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
            >
              <span
                className="account-archive__door-trace"
                aria-hidden="true"
              />
              <span className="account-archive__door-medallion">
                {section.icon}
              </span>
              <span className="account-archive__door-copy">
                <small>{section.eyebrow}</small>
                <strong>
                  {section.redacted ? (
                    <>
                      <RedactionBand compact />
                      Vault
                    </>
                  ) : (
                    section.label
                  )}
                </strong>
                <span>{section.description}</span>
              </span>
              <span className="account-archive__door-status">
                <small>{section.metric}</small>
                <ArrowRight aria-hidden="true" />
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

const PAGE_TITLES: Record<ArchiveSection, { eyebrow: string; title: string }> =
  {
    civilization: { eyebrow: "System Reference", title: "Civilization Field Guide" },
    artifacts: { eyebrow: "Recovered Technology", title: "Artifacts" },
    luminaries: { eyebrow: "Civilization Allies", title: "Luminaries" },
    matches: { eyebrow: "Chronological Record", title: "Match Record" },
    chronicles: { eyebrow: "Story Records", title: "Chronicles" },
    vault: { eyebrow: "Restricted Knowledge", title: "Vault" },
  };

export function AccountArchive({
  stats,
  isLoading,
  page = null,
  onNavigate = () => undefined,
  blueprintVault,
  campaignProgress,
  isChroniclePending = false,
  onStartTraceChronicle,
  onStartRecurrenceChronicle,
  onStartTriangulationChronicle,
  isVaultLoading = false,
  isVaultPending = false,
  onResumeBlueprintChallenge,
  onDeactivateBlueprintCipher,
  onChooseBlueprintThresholdApproach,
  onRecordBlueprintThresholdDialogue,
  onResolveBlueprintThresholdDialogue,
  onUseBlueprintDecryptionKey,
  onPrepareBlueprintChallenge,
  onEnterPreparedBlueprintChallenge,
  onAcknowledgeVaultReveal,
  onUpdateBlueprintLoadout,
}: {
  stats: PlayerStats | null;
  isLoading: boolean;
  page?: ArchiveSection | null;
  onNavigate?: (section: ArchiveSection | null) => void;
  blueprintVault?: BlueprintVaultState | null;
  campaignProgress?: CampaignProgressProjection | null;
  isChroniclePending?: boolean;
  onStartTraceChronicle?: () => void;
  onStartRecurrenceChronicle?: () => void;
  onStartTriangulationChronicle?: () => void;
  isVaultLoading?: boolean;
  isVaultPending?: boolean;
  onResumeBlueprintChallenge?: () => Promise<void> | void;
  onDeactivateBlueprintCipher?: () => Promise<void> | void;
  onChooseBlueprintThresholdApproach?: (
    approach: LumiiThresholdApproach,
  ) => Promise<void> | void;
  onRecordBlueprintThresholdDialogue?: (
    path: LumiiThresholdDialogueChoiceId[],
  ) => Promise<void> | void;
  onResolveBlueprintThresholdDialogue?: () => Promise<void> | void;
  onUseBlueprintDecryptionKey?: () => Promise<void> | void;
  onPrepareBlueprintChallenge?: () => Promise<void> | void;
  onEnterPreparedBlueprintChallenge?: () => void;
  onAcknowledgeVaultReveal?: () => Promise<void> | void;
  onUpdateBlueprintLoadout?: (
    mode: VaultLoadoutMode,
    slots: Array<BlueprintId | null>,
  ) => void;
}) {
  const [matchSort, setMatchSort] = useState<MatchSort>("newest");
  const [artifactSort, setArtifactSort] = useState<ArtifactSort>("tier");
  const [luminarySort, setLuminarySort] = useState<LuminarySort>("name");
  const archive = stats?.archive ?? EMPTY_ARCHIVE;

  if (isLoading || !stats) {
    return (
      <div className="account-archive__loading" aria-label="Loading Archive">
        <div />
        <div />
        <div />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="account-archive" data-page="index">
        <ArchiveLanding
          stats={stats}
          archive={archive}
          onNavigate={onNavigate}
        />
      </div>
    );
  }

  const count =
    page === "civilization"
      ? "Visible history / current state / permanent record"
      : page === "artifacts"
      ? `${archive.artifacts.discovered.length} of ${archive.artifacts.total} encountered`
      : page === "luminaries"
        ? `${archive.luminaries.encountered.length} of ${archive.luminaries.total} encountered`
      : page === "matches"
        ? `${stats.gamesPlayed} match${stats.gamesPlayed === 1 ? "" : "es"} recorded / ${stats.totalLume ?? 0} Lume`
        : page === "chronicles"
          ? `${archive.chronicles?.recovered ?? 0} of ${archive.chronicles?.total ?? 0} recovered`
          : `${Math.min(archive.vault.qualifyingWins, archive.vault.requiredWins)} of ${archive.vault.requiredWins} Cipher conditions`;

  return (
    <div className="account-archive" data-page={page}>
      <button
        type="button"
        className="account-archive__back"
        onClick={() => onNavigate(null)}
      >
        <ArrowLeft aria-hidden="true" />
        <span>Archive</span>
      </button>

      {page !== "vault" && (
        <header className="account-archive__page-header">
          <div>
            <p>{PAGE_TITLES[page].eyebrow}</p>
            <h2>{PAGE_TITLES[page].title}</h2>
            <span>{count}</span>
          </div>
          {page === "matches" && (
            <SortControl<MatchSort>
              label="Sort Match Record"
              value={matchSort}
              onChange={setMatchSort}
              options={[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
                { value: "result", label: "Result" },
                { value: "eminence", label: "Eminence" },
              ]}
            />
          )}
          {page === "artifacts" && (
            <SortControl<ArtifactSort>
              label="Sort Artifacts"
              value={artifactSort}
              onChange={setArtifactSort}
              options={[
                { value: "tier", label: "Tier" },
                { value: "forged", label: "Most forged" },
                { value: "name", label: "Name" },
                { value: "affinity", label: "Affinity" },
                { value: "eminence", label: "Eminence" },
              ]}
            />
          )}
          {page === "luminaries" && (
            <SortControl<LuminarySort>
              label="Sort Luminaries"
              value={luminarySort}
              onChange={setLuminarySort}
              options={[
                { value: "allied", label: "Most allied" },
                { value: "name", label: "Name" },
                { value: "domain", label: "Domain" },
                { value: "eminence", label: "Eminence" },
              ]}
            />
          )}
        </header>
      )}

      <motion.div
        key={page}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="account-archive__content"
      >
        {page === "civilization" && <CivilizationFieldGuide />}
        {page === "matches" && <MatchRecord stats={stats} sort={matchSort} />}
        {page === "artifacts" && (
          <ArtifactArchive archive={archive} sort={artifactSort} />
        )}
        {page === "luminaries" && (
          <LuminaryArchive archive={archive} sort={luminarySort} />
        )}
        {page === "chronicles" && (
          <ChronicleArchive
            entries={archive.chronicles?.entries ?? []}
            campaignProgress={campaignProgress}
            isPending={isChroniclePending}
            onStartChronicle={(chronicleId) => {
              if (chronicleId === "chronicle_triangulation") onStartTriangulationChronicle?.();
              else if (chronicleId === "chronicle_recurrence") onStartRecurrenceChronicle?.();
              else onStartTraceChronicle?.();
            }}
          />
        )}
        {page === "vault" && (
          <BlueprintVault
            archive={archive}
            vaultState={blueprintVault}
            isLoading={isVaultLoading}
            isPending={isVaultPending}
            onResumeChallenge={onResumeBlueprintChallenge}
            onDeactivateCipher={onDeactivateBlueprintCipher}
            onChooseApproach={onChooseBlueprintThresholdApproach}
            onRecordDialogue={onRecordBlueprintThresholdDialogue}
            onResolveDialogue={onResolveBlueprintThresholdDialogue}
            onUseDecryptionKey={onUseBlueprintDecryptionKey}
            onPrepareChallenge={onPrepareBlueprintChallenge}
            onEnterPreparedChallenge={onEnterPreparedBlueprintChallenge}
            onAcknowledgeReveal={onAcknowledgeVaultReveal}
            onUpdateLoadout={onUpdateBlueprintLoadout}
          />
        )}
      </motion.div>
    </div>
  );
}
