import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Archive,
  Check,
  Clock,
  Eye,
  FileClock,
  Hammer,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import {
  AFFINITY_IDENTITY_ADJECTIVES,
  ARTIFACT_TIER_LABELS,
  BLUEPRINT_CLEARANCE_REQUIRED_WINS,
  BLUEPRINT_DEFINITIONS,
  TECHNOLOGY_LINEAGE_LABELS,
  TECHNOLOGY_LINEAGE_NOUNS,
  type ArtifactId,
  type BlueprintDefinition,
  type BlueprintId,
  type BlueprintLoadout,
  type CivilizationIdentitySelection,
  type LumiiThresholdApproach,
  type LumiiThresholdDialogueChoiceId,
} from "@workspace/game-types";
import type {
  AccountArchiveArtifact,
  AccountArchiveLuminary,
  AccountArchiveSummary,
  ArchitectRecordState,
  BlueprintVaultState,
  GameHistoryEntry,
  PlayerStats,
} from "@/lib/accountSession";
import { CARD_ART } from "@/lib/cardArtManifest";
import { LUMINARY_RUNTIME_ART } from "@/lib/luminaryArtManifest";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  LumiiVaultEncounter,
  VaultThreshold,
  type VaultSourceRect,
} from "@/components/vault/LumiiVaultEncounter";
import "./AccountArchive.css";

const AntimatterBlueprintCard = lazy(async () => {
  const module = await import("@/components/blueprints/AntimatterBlueprintCard");
  return { default: module.AntimatterBlueprintCard };
});

const MantleToOrbitBlueprintCard = lazy(async () => {
  const module = await import("@/components/blueprints/MantleToOrbitBlueprintCard");
  return { default: module.MantleToOrbitBlueprintCard };
});

const AscensionRegistryBlueprintCard = lazy(async () => {
  const module = await import("@/components/blueprints/AscensionRegistryBlueprintCard");
  return { default: module.AscensionRegistryBlueprintCard };
});

const WorldshieldBlueprintCard = lazy(async () => {
  const module = await import("@/components/blueprints/WorldshieldBlueprintCard");
  return { default: module.WorldshieldBlueprintCard };
});

export type ArchiveSection = "artifacts" | "luminaries" | "matches" | "vault";

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
    selected: {
      lineage: null,
      affinity: null,
      signatureArtifactId: null,
      signatureLuminaryId: null,
      signatureBlueprintId: null,
      displayName: null,
      scaleType: 0,
      scaleLabel: "Pre-Type I",
      projectEpithet: null,
    },
    suggested: {
      lineage: null,
      affinity: null,
      signatureArtifactId: null,
      signatureLuminaryId: null,
      signatureBlueprintId: null,
    },
    options: {
      lineages: [],
      affinities: [],
      artifactIds: [],
      luminaryIds: [],
      blueprintIds: [],
    },
  },
  vault: {
    qualifyingWins: 0,
    requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
    unlocked: false,
    status: "classified",
    challengeRoomId: null,
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

function compareLuminaryNames(left: AccountArchiveLuminary, right: AccountArchiveLuminary): number {
  const leftIsConcealed = /^\?+$/.test(left.name.trim());
  const rightIsConcealed = /^\?+$/.test(right.name.trim());
  if (leftIsConcealed !== rightIsConcealed) return leftIsConcealed ? 1 : -1;
  return left.name.localeCompare(right.name);
}

function LuminaryMark({ className = "" }: { className?: string }) {
  return <span className={`account-archive__luminary-mark ${className}`} aria-hidden="true">✦</span>;
}

function RedactionBand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="account-archive__redaction" data-compact={compact} aria-hidden="true">
      <span className="account-archive__redaction-word">Blueprint</span>
      <span className="account-archive__redaction-stamp">REDACTED</span>
    </span>
  );
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
          <option key={option.value} value={option.value}>{option.label}</option>
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

function MatchRecord({ stats, sort }: { stats: PlayerStats; sort: MatchSort }) {
  const matchHistory = stats.matchHistory ?? stats.recentGames;
  const games = useMemo(() => [...matchHistory].sort((left, right) => {
    if (sort === "oldest") {
      return new Date(left.finishedAt).getTime() - new Date(right.finishedAt).getTime();
    }
    if (sort === "result") {
      const order = { win: 0, tie: 1, loss: 2 };
      return order[left.result] - order[right.result]
        || new Date(right.finishedAt).getTime() - new Date(left.finishedAt).getTime();
    }
    if (sort === "eminence") {
      return right.eminenceEarned - left.eminenceEarned
        || new Date(right.finishedAt).getTime() - new Date(left.finishedAt).getTime();
    }
    return new Date(right.finishedAt).getTime() - new Date(left.finishedAt).getTime();
  }), [matchHistory, sort]);

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
            <span>{game.totalPlayers} player{game.totalPlayers === 1 ? "" : "s"}</span>
            {game.civilizationIdentity?.displayName && (
              <small>
                {game.civilizationIdentity.displayName}
                {game.civilizationIdentity.projectEpithet ? ` // ${game.civilizationIdentity.projectEpithet}` : ""}
              </small>
            )}
          </div>
          <span className="account-archive__match-date">
            <Clock aria-hidden="true" />
            {formatDate(game.finishedAt)}
          </span>
          <div className="account-archive__eminence">
            <strong>{game.eminenceEarned}</strong>
            <span>Eminence</span>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

function ArtifactRecord({ artifact, isSignature, onInspect }: {
  artifact: AccountArchiveArtifact;
  isSignature: boolean;
  onInspect: () => void;
}) {
  const forgeCount = artifact.forgeCount ?? 0;
  return (
    <button
      type="button"
      className="account-archive__artifact"
      data-affinity={artifact.bonusAffinity}
      onClick={onInspect}
      aria-label={`Inspect ${artifact.name}`}
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
        <p>{AFFINITY_LABELS[artifact.bonusAffinity] ?? artifact.bonusAffinity}</p>
        <h4>{artifact.name}</h4>
        <div className="account-archive__artifact-history">
          <span>{forgeCount > 0
            ? `Forged ${forgeCount} ${forgeCount === 1 ? "time" : "times"}`
            : "Obtained, not Forged"}</span>
          {isSignature && <strong>Signature technology</strong>}
        </div>
        <span>{artifact.flavor}</span>
      </div>
      {artifact.eminence > 0 && (
        <div className="account-archive__artifact-value" title={`${artifact.eminence} Eminence`}>
          {artifact.eminence}
        </div>
      )}
    </button>
  );
}

function compareArtifacts(left: AccountArchiveArtifact, right: AccountArchiveArtifact, sort: ArtifactSort): number {
  if (sort === "forged") {
    return (right.forgeCount ?? 0) - (left.forgeCount ?? 0) || left.name.localeCompare(right.name);
  }
  if (sort === "name") return left.name.localeCompare(right.name);
  if (sort === "affinity") {
    return (AFFINITY_LABELS[left.bonusAffinity] ?? left.bonusAffinity).localeCompare(
      AFFINITY_LABELS[right.bonusAffinity] ?? right.bonusAffinity,
    ) || left.name.localeCompare(right.name);
  }
  if (sort === "eminence") {
    return right.eminence - left.eminence || left.tier - right.tier || left.name.localeCompare(right.name);
  }
  return left.tier - right.tier || left.name.localeCompare(right.name);
}

function ClassifiedRelationship({ tier }: { tier: 1 | 2 | 3 }) {
  return (
    <span className="account-archive__classified-link" aria-label={`Classified Tier ${tier} technology`}>
      <i aria-hidden="true">CLASSIFIED RECORD</i>
      <small>Tier {tier}</small>
    </span>
  );
}

function ArtifactDetailPanel({ artifact, archive, onClose, onInspect }: {
  artifact: AccountArchiveArtifact;
  archive: AccountArchiveSummary;
  onClose: () => void;
  onInspect: (artifact: AccountArchiveArtifact) => void;
}) {
  const dossierRef = useRef<HTMLElement | null>(null);
  useFocusTrap(dossierRef, true, onClose);

  const relatedArtifact = (id: ArtifactId | null) =>
    id ? archive.artifacts.discovered.find((candidate) => candidate.id === id) : undefined;
  const costs = Object.entries(artifact.cost).filter(([, value]) => value > 0);

  const relationshipList = (
    title: string,
    relationships: AccountArchiveArtifact["builtOn"],
  ) => (
    <section className="account-archive__dossier-section">
      <h4>{title}</h4>
      <div className="account-archive__dossier-links">
        {relationships.length > 0 ? relationships.map((relationship, index) => {
          const related = relatedArtifact(relationship.id);
          return relationship.known && related ? (
            <button key={relationship.id} type="button" onClick={() => onInspect(related)}>
              <span>{related.name}</span><small>{ARTIFACT_TIER_LABELS[related.tier]}</small>
            </button>
          ) : <ClassifiedRelationship key={`${title}-${index}`} tier={relationship.tier} />;
        }) : <span className="account-archive__dossier-none">No immediate dependency recorded</span>}
      </div>
    </section>
  );

  return (
    <div className="account-archive__dossier-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        ref={(element) => { dossierRef.current = element; }}
        className="account-archive__dossier"
        role="dialog"
        aria-modal="true"
        aria-labelledby="artifact-dossier-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="account-archive__dossier-header">
          <div>
            <p>{ARTIFACT_TIER_LABELS[artifact.tier]} // {TECHNOLOGY_LINEAGE_LABELS[artifact.lineage]}</p>
            <h3 id="artifact-dossier-title">{artifact.name}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Artifact record"><X aria-hidden="true" /></button>
        </header>

        <div className="account-archive__dossier-art" data-affinity={artifact.bonusAffinity}>
          {CARD_ART[artifact.id] ? <img src={CARD_ART[artifact.id]} alt="" /> : <Hammer aria-hidden="true" />}
          <span>Forged {artifact.forgeCount} {artifact.forgeCount === 1 ? "time" : "times"}</span>
        </div>

        <section className="account-archive__dossier-capability">
          <p>{artifact.practicalCapability}</p>
          <blockquote>{artifact.mystery}</blockquote>
        </section>

        <section className="account-archive__dossier-rules" aria-label={`${artifact.name} rules`}>
          <div><span>Cost</span><strong>{costs.map(([affinity, value]) => `${value} ${AFFINITY_LABELS[affinity] ?? affinity}`).join(" + ") || "None"}</strong></div>
          <div><span>Affinity</span><strong>{AFFINITY_LABELS[artifact.bonusAffinity]}</strong></div>
          <div><span>Eminence</span><strong>{artifact.eminence}</strong></div>
          <div><span>Forms</span><strong>{artifact.forms.join(" / ")}</strong></div>
        </section>

        {relationshipList("Built On", artifact.builtOn)}
        {relationshipList("Leads Toward", artifact.leadsToward)}

        <section className="account-archive__dossier-section">
          <h4>Project Leads</h4>
          <div className="account-archive__dossier-links">
            {artifact.projectLeads.length > 0 ? artifact.projectLeads.map((lead, index) => lead.revealed && lead.name ? (
              <span key={lead.name} className="account-archive__project-lead"><span>{lead.name}</span><small>{lead.priority}</small></span>
            ) : <ClassifiedRelationship key={`project-${index}`} tier={artifact.tier} />) : (
              <span className="account-archive__dossier-none">No Project destination recorded</span>
            )}
          </div>
        </section>

        {artifact.blueprintEligibility.length > 0 && (
          <section className="account-archive__dossier-section">
            <h4>Known Blueprint Eligibility</h4>
            <div className="account-archive__dossier-links">
              {artifact.blueprintEligibility.map((blueprintId) => (
                <span key={blueprintId} className="account-archive__project-lead">
                  <span>{archive.vault.unlocked ? BLUEPRINT_DEFINITIONS[blueprintId].name : "CLASSIFIED RECORD"}</span>
                  <small>{archive.vault.unlocked ? "component" : "restricted"}</small>
                </span>
              ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}

function ArtifactArchive({ archive, sort }: { archive: AccountArchiveSummary; sort: ArtifactSort }) {
  const [selectedArtifact, setSelectedArtifact] = useState<AccountArchiveArtifact | null>(null);
  const sortedArtifacts = useMemo(
    () => [...archive.artifacts.discovered].sort((left, right) => compareArtifacts(left, right, sort)),
    [archive.artifacts.discovered, sort],
  );

  if (sort !== "tier") {
    const unknown = Math.max(0, archive.artifacts.total - sortedArtifacts.length);
    return (
      <div className="account-archive__catalog">
        {sortedArtifacts.length > 0 ? (
          <div className="account-archive__artifact-grid">
            {sortedArtifacts.map((artifact) => (
              <ArtifactRecord
                key={artifact.id}
                artifact={artifact}
                isSignature={archive.identity?.signatureArtifactId === artifact.id}
                onInspect={() => setSelectedArtifact(artifact)}
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
        {selectedArtifact && (
          <ArtifactDetailPanel
            artifact={selectedArtifact}
            archive={archive}
            onClose={() => setSelectedArtifact(null)}
            onInspect={setSelectedArtifact}
          />
        )}
      </div>
    );
  }

  return (
    <div className="account-archive__catalog">
      {[1, 2, 3].map((tier) => {
        const typedTier = tier as 1 | 2 | 3;
        const artifacts = sortedArtifacts.filter((artifact) => artifact.tier === typedTier);
        const known = archive.artifacts.discoveredByTier[typedTier];
        const total = archive.artifacts.totalByTier[typedTier];
        return (
          <section key={tier} className="account-archive__tier">
            <header>
              <div>
                <p>Tier {tier}</p>
                <h3>{ARTIFACT_TIER_LABELS[typedTier]}</h3>
              </div>
              <span>{known} / {total} encountered</span>
            </header>
            <div className="account-archive__tier-meter" aria-label={`${known} of ${total} Tier ${tier} Artifacts encountered`}>
              <span style={{ width: `${total > 0 ? (known / total) * 100 : 0}%` }} />
            </div>
            {artifacts.length > 0 ? (
              <div className="account-archive__artifact-grid">
                {artifacts.map((artifact) => (
                  <ArtifactRecord
                    key={artifact.id}
                    artifact={artifact}
                    isSignature={archive.identity?.signatureArtifactId === artifact.id}
                    onInspect={() => setSelectedArtifact(artifact)}
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
      {selectedArtifact && (
        <ArtifactDetailPanel
          artifact={selectedArtifact}
          archive={archive}
          onClose={() => setSelectedArtifact(null)}
          onInspect={setSelectedArtifact}
        />
      )}
    </div>
  );
}

function LuminaryRecord({ luminary, vaultUnlocked, isClosest }: {
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
      style={{
        "--luminary-primary": luminary.summonColor,
        "--luminary-secondary": luminary.summonSecondaryColor,
      } as CSSProperties}
    >
      <div className="account-archive__luminary-art">
        {LUMINARY_ART[luminary.id] ? (
          <img src={LUMINARY_ART[luminary.id]} alt="" />
        ) : (
          <LuminaryMark />
        )}
        <span className="account-archive__luminary-domain">{luminary.domain}</span>
      </div>
      <div className="account-archive__luminary-copy">
        <div className="account-archive__luminary-meta">
          <p>Allied {allianceCount} {allianceCount === 1 ? "time" : "times"}</p>
          <span>{luminary.eminence} Eminence</span>
        </div>
        <h3>{luminary.name}</h3>
        {isClosest && <span className="account-archive__identity-tag">Closest recurring ally</span>}
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

function LuminaryArchive({ archive, sort }: { archive: AccountArchiveSummary; sort: LuminarySort }) {
  const luminaries = useMemo(() => [...archive.luminaries.encountered].sort((left, right) => {
    if (sort === "allied") {
      return (right.allianceCount ?? 0) - (left.allianceCount ?? 0) || compareLuminaryNames(left, right);
    }
    if (sort === "domain") return left.domain.localeCompare(right.domain) || compareLuminaryNames(left, right);
    if (sort === "eminence") return right.eminence - left.eminence || compareLuminaryNames(left, right);
    return compareLuminaryNames(left, right);
  }), [archive.luminaries.encountered, sort]);
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
          <span aria-hidden="true">UNKNOWN ENTITIES // {String(unknown).padStart(2, "0")}</span>
          <div>{Array.from({ length: Math.min(unknown, 12) }, (_, index) => <i key={index} />)}</div>
        </div>
      )}
    </div>
  );
}

type VaultLoadoutMode = Extract<BlueprintLoadout["mode"], "campaign" | "custom">;

const BLUEPRINT_FAMILY_LABELS: Record<BlueprintDefinition["family"], string> = {
  catastrophe_engine: "Catastrophe Engine",
  industrial_chain: "Ascension Industry",
  institution: "Ascension Institution",
  covenant: "Planetary Covenant",
};

function VaultBlueprintCard({
  blueprintId,
  covenantBroken,
}: {
  blueprintId: BlueprintId;
  covenantBroken: boolean;
}) {
  switch (blueprintId) {
    case "bp_antimatter_detonator":
      return (
        <AntimatterBlueprintCard
          state="assembling"
          presentation="card"
          matchedSockets={0}
          covenantBroken={covenantBroken}
        />
      );
    case "bp_mantle_to_orbit_foundry":
      return <MantleToOrbitBlueprintCard state="assembling" matchedSockets={0} />;
    case "bp_ascension_registry":
      return <AscensionRegistryBlueprintCard state="assembling" matchedSockets={0} />;
    case "bp_worldshield_covenant":
      return <WorldshieldBlueprintCard state="assembling" matchedSockets={0} />;
  }
}

function BlueprintVault({
  archive,
  vaultState,
  architectRecord,
  isLoading,
  isPending,
  onResumeChallenge,
  onDeactivateCipher,
  onChooseApproach,
  onRecordDialogue,
  onResolveDialogue,
  onUseDecryptionKey,
  onPrepareChallenge,
  onStartQualifyingMatch,
  onEnterPreparedChallenge,
  onAcknowledgeReveal,
  onUpdateLoadout,
}: {
  archive: AccountArchiveSummary;
  vaultState?: BlueprintVaultState | null;
  architectRecord?: ArchitectRecordState | null;
  isLoading?: boolean;
  isPending?: boolean;
  onResumeChallenge?: () => Promise<void> | void;
  onDeactivateCipher?: () => Promise<void> | void;
  onChooseApproach?: (approach: LumiiThresholdApproach) => Promise<void> | void;
  onRecordDialogue?: (
    path: LumiiThresholdDialogueChoiceId[],
  ) => Promise<readonly LumiiThresholdDialogueChoiceId[] | void> | readonly LumiiThresholdDialogueChoiceId[] | void;
  onResolveDialogue?: () => Promise<void> | void;
  onUseDecryptionKey?: () => Promise<void> | void;
  onPrepareChallenge?: () => Promise<void> | void;
  onStartQualifyingMatch?: () => Promise<void> | void;
  onEnterPreparedChallenge?: () => void;
  onAcknowledgeReveal?: () => Promise<void> | void;
  onUpdateLoadout?: (mode: VaultLoadoutMode, slots: Array<BlueprintId | null>) => void;
}) {
  const thresholdRef = useRef<HTMLButtonElement | null>(null);
  const [encounterMode, setEncounterMode] = useState<"entry" | "victory" | null>(null);
  const [sourceRect, setSourceRect] = useState<VaultSourceRect | null>(null);
  const [loadoutMode, setLoadoutMode] = useState<VaultLoadoutMode>("campaign");
  const [selectedBlueprintRecord, setSelectedBlueprintRecord] = useState<BlueprintId | null>(null);
  const clearance = vaultState?.clearance;
  const status = clearance?.status ?? archive.vault.status ?? (archive.vault.unlocked ? "cleared" : "classified");
  const qualifyingWins = clearance?.qualifyingWins ?? archive.vault.qualifyingWins;
  const requiredWins = clearance?.requiredWins ?? archive.vault.requiredWins;
  const unlocked = status === "cleared";
  const challengeReady = status === "challenge_ready";
  const challengeActive = status === "challenge_active";
  const completed = Math.min(qualifyingWins, requiredWins);
  const covenantBroken = clearance?.covenantBroken ?? false;
  const reportedCipherDeactivated = clearance?.cipherDeactivated ?? false;
  const thresholdApproach = clearance?.thresholdApproach ?? null;
  const thresholdDialoguePath = clearance?.thresholdDialoguePath ?? [];
  const thresholdDialogueResolution = clearance?.thresholdDialogueResolution ?? null;
  const decryptionKeyBypassActive = clearance?.decryptionKeyBypassActive ?? false;
  const architectRecordComplete = qualifyingWins >= requiredWins;
  const cipherDeactivated = reportedCipherDeactivated && architectRecordComplete;
  const cipherDismissalMode = decryptionKeyBypassActive ? "temporary" : "permanent";
  const thresholdAccessReady = challengeReady && (architectRecordComplete || decryptionKeyBypassActive);
  const decryptionKeyAvailable = vaultState?.decryptionKeyAvailable ?? false;
  const revealPending = clearance?.revealPending ?? false;
  const discoveredBlueprints = (vaultState?.unlockedBlueprintIds ?? []).map((blueprintId) =>
    vaultState?.blueprints.find((blueprint) => blueprint.id === blueprintId)
      ?? BLUEPRINT_DEFINITIONS[blueprintId]
  );
  const selectedBlueprintId = selectedBlueprintRecord
    && discoveredBlueprints.some((blueprint) => blueprint.id === selectedBlueprintRecord)
    ? selectedBlueprintRecord
    : discoveredBlueprints[0]?.id ?? null;
  const selectedBlueprint = selectedBlueprintId
    ? discoveredBlueprints.find((blueprint) => blueprint.id === selectedBlueprintId) ?? null
    : null;
  const selectedMastery = selectedBlueprintId
    ? vaultState?.mastery.find((record) => record.blueprintId === selectedBlueprintId)
    : undefined;
  const activeLoadout = vaultState?.loadouts.find((loadout) => loadout.mode === loadoutMode);
  const activeSlots = activeLoadout?.slots ?? [null, null];
  const selectedCampaignNodes = selectedBlueprintId
    ? vaultState?.campaignNodes.filter((node) => node.blueprintId === selectedBlueprintId) ?? []
    : [];

  useEffect(() => {
    if (!unlocked || !revealPending || encounterMode) return;
    const rect = thresholdRef.current?.getBoundingClientRect();
    if (rect) {
      setSourceRect({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
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
          ? "COVENANT BROKEN"
        : cipherDeactivated
          ? "CIPHER DISMISSED"
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
      setSourceRect({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    }
    setEncounterMode(revealPending ? "victory" : "entry");
  };

  const toggleLoadoutSlot = (slotIndex: number) => {
    if (!selectedBlueprintId || !onUpdateLoadout) return;
    const nextSlots = Array.from({ length: 2 }, (_, index) => activeSlots[index] ?? null);
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
            <><span>REDACTION LIFTED</span><span>OUTER VAULT ACCESS</span><span>VAULT OPEN</span></>
          ) : (
            <><span>DANGER</span><span>KEEP OUT</span><span>FORBIDDEN</span><span>DANGER</span></>
          )}
        </div>

        <header className="account-vault__header">
          <div>
            <p>
              {unlocked ? <Sparkles aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
              {unlocked ? "Recovered Civilization Record" : "Restricted Civilization Record"}
            </p>
            <h2>{unlocked ? "Blueprint Vault" : <><RedactionBand />Vault</>}</h2>
          </div>
          <span data-testid="vault-status">{statusLabel}</span>
        </header>

        {isLoading ? (
          <div className="account-vault__loading" aria-label="Reading Vault record">
            <Loader2 aria-hidden="true" />
            <span>Reading threshold</span>
          </div>
        ) : (
          <>
            {!unlocked && (
              <>
                <VaultThreshold
                  ref={thresholdRef}
                  state={challengeActive ? "hostile" : "sealed"}
                  cipherState={cipherDeactivated ? "hidden" : "active"}
                  cipherDismissalMode={cipherDismissalMode}
                  interactive={(thresholdAccessReady || challengeActive || revealPending) && !isPending}
                  ariaLabel={challengeActive
                    ? "Resume the Lumii confrontation"
                    : thresholdAccessReady
                      ? "Attempt Vault access"
                      : "Sealed cosmic technology vault"}
                  sealLabel={sealLabel}
                  onActivate={activateThreshold}
                />

                <div className="account-vault__orders">
                  <div className="account-vault__requirement">
                    <p>ACCESS CONDITION</p>
                    <strong>{decryptionKeyBypassActive
                      ? "Black Market Decryption Key accepted."
                      : `Win ${requiredWins} qualifying Core Game matches against three Hard AI opponents.`}</strong>
                    <span>{decryptionKeyBypassActive
                      ? `Defeat Lumii on this access attempt. Leaving or losing restores the ${requiredWins}-win condition.`
                      : "Each match must use Quick 15, three Hard AI opponents, no timer, and no Blueprint loadout."}</span>
                    {!challengeReady && decryptionKeyAvailable && (
                      <button
                        type="button"
                        className="account-vault__decryption-key-button"
                        onClick={() => void onUseDecryptionKey?.()}
                        disabled={isPending || !onUseDecryptionKey}
                      >
                        {isPending ? <Loader2 aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
                        <span><strong>Spend Decryption Key</strong><small>Single use · bypasses this access condition</small></span>
                      </button>
                    )}
                  </div>
                  <div className="account-vault__progress">
                    <div>
                      <span>CIPHER PROGRESS</span>
                      <strong>{completed} / {requiredWins}</strong>
                    </div>
                    <div className="account-vault__progress-segments" aria-label={`${completed} of ${requiredWins} qualifying wins`}>
                      {Array.from({ length: requiredWins }, (_, index) => (
                        <i key={index} data-complete={index < completed} />
                      ))}
                    </div>
                    {!challengeReady && !challengeActive && onStartQualifyingMatch && (
                      <button
                        type="button"
                        className="account-vault__decryption-key-button"
                        onClick={() => void onStartQualifyingMatch()}
                        disabled={isPending}
                      >
                        {isPending ? <Loader2 aria-hidden="true" /> : <Hammer aria-hidden="true" />}
                        <span>
                          <strong>Start or resume qualifying match</strong>
                          <small>Core Game · Quick 15 · three Hard AI · no timer</small>
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {(architectRecord?.presentations.length ?? 0) > 0 && (
                  <section className="account-vault__signal-record" aria-labelledby="architect-signal-record-title">
                    <header>
                      <div>
                        <span>ARCHITECT RECORD</span>
                        <strong id="architect-signal-record-title">Recorded signals</strong>
                      </div>
                      <small>{architectRecord?.presentations.length} preserved</small>
                    </header>
                    <div>
                      {architectRecord?.presentations.map((presentation) => (
                        <details key={presentation.id}>
                          <summary>
                            <span>{String(presentation.ordinal).padStart(2, "0")}</span>
                            <strong>{presentation.title}</strong>
                            <small>{presentation.acknowledgedAt ? "Recorded" : "Unread"}</small>
                          </summary>
                          <div>
                            {presentation.lines.map((line) => <p key={line}>{line}</p>)}
                          </div>
                        </details>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {unlocked && vaultState ? (
              <div className="account-vault__collection">
                <div className="account-vault__collection-header">
                  <div>
                    <p>DISCOVERED BLUEPRINTS // {String(discoveredBlueprints.length).padStart(2, "0")}</p>
                    <h3>Civilization Projects</h3>
                  </div>
                  <div className="account-vault__mode-switch" aria-label="Blueprint loadout mode">
                    {(["campaign", "custom"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        data-active={loadoutMode === mode}
                        onClick={() => setLoadoutMode(mode)}
                      >
                        {mode === "campaign" ? "Vault" : "Custom"}
                      </button>
                    ))}
                  </div>
                </div>

                {discoveredBlueprints.length > 0 ? (
                  <>
                    <div className="account-vault__blueprint-index" role="tablist" aria-label="Discovered Blueprints">
                      {discoveredBlueprints.map((blueprint, index) => {
                        const mastery = vaultState.mastery.find((record) => record.blueprintId === blueprint.id);
                        const assignedSlot = activeSlots.findIndex((blueprintId) => blueprintId === blueprint.id);
                        return (
                          <button
                            key={blueprint.id}
                            type="button"
                            role="tab"
                            aria-selected={selectedBlueprintId === blueprint.id}
                            data-active={selectedBlueprintId === blueprint.id}
                            data-family={blueprint.family}
                            onClick={() => setSelectedBlueprintRecord(blueprint.id)}
                          >
                            <span className="account-vault__blueprint-number">{String(index + 1).padStart(2, "0")}</span>
                            <span className="account-vault__blueprint-index-copy">
                              <small>{BLUEPRINT_FAMILY_LABELS[blueprint.family]}</small>
                              <strong>{blueprint.name}</strong>
                              <span>{mastery?.manifestations ?? 0} manifestations</span>
                            </span>
                            <span className="account-vault__blueprint-index-state">
                              {assignedSlot >= 0 ? `Slot ${assignedSlot + 1}` : "Unassigned"}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedBlueprint && selectedBlueprintId && (
                      <section className="account-vault__selected-record" aria-label={`${selectedBlueprint.name} Vault record`}>
                        <header>
                          <div>
                            <span>{selectedBlueprint.presentation.serialCode} // {selectedBlueprint.presentation.scaleLabel}</span>
                            <strong>{selectedBlueprint.name}</strong>
                          </div>
                          <dl className="account-vault__mastery" aria-label={`${selectedBlueprint.name} mastery`}>
                            <div><dt>Manifested</dt><dd>{selectedMastery?.manifestations ?? 0}</dd></div>
                            <div><dt>Triggered</dt><dd>{selectedMastery?.triggers ?? 0}</dd></div>
                            <div><dt>Armed Finishes</dt><dd>{selectedMastery?.armedMatchFinishes ?? 0}</dd></div>
                          </dl>
                        </header>

                        <Suspense fallback={<div className="account-vault__card-loading"><Loader2 aria-hidden="true" /></div>}>
                          <VaultBlueprintCard
                            blueprintId={selectedBlueprintId}
                            covenantBroken={covenantBroken}
                          />
                        </Suspense>
                      </section>
                    )}
                  </>
                ) : (
                  <div className="account-vault__empty-collection">
                    <ShieldAlert aria-hidden="true" />
                    <strong>No recovered projects</strong>
                    <span>The Vault is open, but its surviving records have not synchronized.</span>
                  </div>
                )}

                <div className="account-vault__slots" aria-label={`${loadoutMode} Blueprint loadout`}>
                  {Array.from({ length: vaultState.slotCount }, (_, slotIndex) => {
                    const blueprintId = activeSlots[slotIndex] ?? null;
                    const blueprintName = blueprintId
                      ? BLUEPRINT_DEFINITIONS[blueprintId].name
                      : null;
                    return (
                      <button
                        type="button"
                        key={slotIndex}
                        data-filled={blueprintId !== null}
                        disabled={isPending || !selectedBlueprintId}
                        onClick={() => toggleLoadoutSlot(slotIndex)}
                      >
                        <span>Slot {slotIndex + 1}</span>
                        <strong>{blueprintName ?? "Unassigned"}</strong>
                        <small>{blueprintId
                          ? blueprintId === selectedBlueprintId
                            ? "Selected record // click to remove"
                            : "Selected for play"
                          : selectedBlueprintId
                            ? `Assign ${BLUEPRINT_DEFINITIONS[selectedBlueprintId].name}`
                            : "Select recovered Blueprint"}</small>
                      </button>
                    );
                  })}
                </div>

                {selectedCampaignNodes.map((node) => (
                  <div className="account-vault__campaign-node" key={node.id}>
                    <div>
                      <span>Vault Transmission // Future</span>
                      <strong>{node.title}</strong>
                      <small>Signal recorded; content not yet available</small>
                    </div>
                  </div>
                ))}

                {(vaultState.corruptedRecordCount ?? 0) > 0 && (
                  <div className="account-vault__corrupted" aria-label={`${vaultState.corruptedRecordCount} corrupted Vault records`}>
                    {Array.from({ length: vaultState.corruptedRecordCount ?? 0 }, (_, index) => (
                      <article key={index}>
                        <span>BLUEPRINT // {String(index + 2).padStart(2, "0")}</span>
                        <strong aria-label="Corrupted record">▓▓▓▓▓▓ ░▒▓▓▓▓▓</strong>
                        <small>RECORD CORRUPTED</small>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <footer className="account-vault__notice">
                <ShieldAlert aria-hidden="true" />
                <div>
                  <strong>{challengeActive
                    ? "The forecast is still running"
                    : decryptionKeyBypassActive
                      ? "Black Market bypass active"
                    : thresholdAccessReady
                      ? cipherDeactivated
                        ? "The Supreme Cipher is gone"
                        : "The Supreme Cipher answers to you"
                      : "Knowledge isolation remains in force"}</strong>
                  <span>{challengeActive
                    ? "Your confrontation is preserved exactly where it stopped."
                    : decryptionKeyBypassActive
                      ? `The Cipher is being forced open for this attempt only. Leaving or losing restores the ${requiredWins}-win condition.`
                    : thresholdAccessReady
                      ? cipherDeactivated
                        ? covenantBroken
                          ? "Lumii remembers the rupture. The defense forecast can be entered again."
                          : "The first seal has been irreversibly broken. Lumii's independent firewall still holds the doors."
                        : "The Architect-owned Cipher is now the sole entry control."
                      : "Do not attempt entry. Do not reproduce the symbols. Do not answer voices from within."}</span>
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
          cipherDismissalMode={cipherDismissalMode}
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
            if (!onPrepareChallenge) throw new Error("The defense forecast is unavailable.");
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

function CivilizationIdentityEditor({ archive, onConfirm }: {
  archive: AccountArchiveSummary;
  onConfirm?: (selection: CivilizationIdentitySelection) => Promise<void> | void;
}) {
  const identity = archive.identity ?? EMPTY_ARCHIVE.identity;
  const [selection, setSelection] = useState<CivilizationIdentitySelection>(identity.selected);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelection(identity.selected);
  }, [identity.selected]);

  const setField = <K extends keyof CivilizationIdentitySelection>(
    field: K,
    value: CivilizationIdentitySelection[K],
  ) => setSelection((current) => ({ ...current, [field]: value }));
  const suggested = identity.suggested;
  const hasSuggestion = Object.values(suggested).some(Boolean);
  const displayName = selection.lineage && selection.affinity
    ? `The ${AFFINITY_IDENTITY_ADJECTIVES[selection.affinity]} ${TECHNOLOGY_LINEAGE_NOUNS[selection.lineage]}`
    : "Identity incomplete";
  const selectedArtifactName = (artifactId: string) =>
    archive.artifacts.discovered.find((artifact) => artifact.id === artifactId)?.name ?? artifactId;
  const selectedLuminaryName = (luminaryId: string) =>
    archive.luminaries.encountered.find((luminary) => luminary.id === luminaryId)?.name ?? luminaryId;

  const confirm = async () => {
    if (!onConfirm) return;
    setIsSaving(true);
    setError(null);
    try {
      await onConfirm(selection);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Identity could not be confirmed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="account-archive__identity-editor">
      <div className="account-archive__identity-title">
        <div>
          <small>Public Designation</small>
          <strong>{displayName}</strong>
          {identity.selected.projectEpithet && <span>{identity.selected.projectEpithet}</span>}
        </div>
        {hasSuggestion && (
          <button type="button" onClick={() => setSelection(suggested)} disabled={isSaving}>
            Use suggested pattern
          </button>
        )}
      </div>

      <div className="account-archive__identity-fields">
        <label>
          <span>Lineage</span>
          <select value={selection.lineage ?? ""} onChange={(event) => setField("lineage", event.target.value as CivilizationIdentitySelection["lineage"] || null)}>
            <option value="">Unselected</option>
            {identity.options.lineages.map((lineage) => <option key={lineage} value={lineage}>{TECHNOLOGY_LINEAGE_LABELS[lineage]}</option>)}
          </select>
        </label>
        <label>
          <span>Affinity Ethos</span>
          <select value={selection.affinity ?? ""} onChange={(event) => setField("affinity", event.target.value as CivilizationIdentitySelection["affinity"] || null)}>
            <option value="">Unselected</option>
            {identity.options.affinities.map((affinity) => <option key={affinity} value={affinity}>{AFFINITY_LABELS[affinity]}</option>)}
          </select>
        </label>
        <label>
          <span>Signature Artifact</span>
          <select value={selection.signatureArtifactId ?? ""} onChange={(event) => setField("signatureArtifactId", event.target.value as CivilizationIdentitySelection["signatureArtifactId"] || null)}>
            <option value="">Unselected</option>
            {identity.options.artifactIds.map((artifactId) => <option key={artifactId} value={artifactId}>{selectedArtifactName(artifactId)}</option>)}
          </select>
        </label>
        <label>
          <span>Signature Luminary</span>
          <select value={selection.signatureLuminaryId ?? ""} onChange={(event) => setField("signatureLuminaryId", event.target.value as CivilizationIdentitySelection["signatureLuminaryId"] || null)}>
            <option value="">Unselected</option>
            {identity.options.luminaryIds.map((luminaryId) => <option key={luminaryId} value={luminaryId}>{selectedLuminaryName(luminaryId)}</option>)}
          </select>
        </label>
        <label>
          <span>Signature Project</span>
          <select value={selection.signatureBlueprintId ?? ""} onChange={(event) => setField("signatureBlueprintId", event.target.value as CivilizationIdentitySelection["signatureBlueprintId"] || null)}>
            <option value="">Unselected</option>
            {identity.options.blueprintIds.map((blueprintId) => <option key={blueprintId} value={blueprintId}>{BLUEPRINT_DEFINITIONS[blueprintId].name}</option>)}
          </select>
        </label>
      </div>
      <div className="account-archive__identity-confirm">
        {error && <span role="alert">{error}</span>}
        <button type="button" onClick={() => void confirm()} disabled={!onConfirm || isSaving}>
          {isSaving ? <Loader2 aria-hidden="true" /> : <Check aria-hidden="true" />}
          Confirm identity
        </button>
      </div>
    </div>
  );
}

function ArchiveLanding({ stats, archive, onNavigate, onUpdateIdentity }: {
  stats: PlayerStats;
  archive: AccountArchiveSummary;
  onNavigate: (section: ArchiveSection) => void;
  onUpdateIdentity?: (selection: CivilizationIdentitySelection) => Promise<void> | void;
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
      id: "vault",
      label: archive.vault.unlocked ? "Blueprint Vault" : "Top Secret Vault",
      redacted: !archive.vault.unlocked,
      eyebrow: archive.vault.unlocked ? "Clearance Recognized" : "Restricted Knowledge",
      description: archive.vault.unlocked ? "The containment threshold has been met." : "Access remains sealed by Lumii protocol.",
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
        <div className="account-archive__foyer-seal" aria-hidden="true"><Archive /></div>
        <div>
          <p>Civilization Archive</p>
          <h2>Recorded Knowledge</h2>
        </div>
        <span>{archive.artifacts.discovered.length + archive.luminaries.encountered.length} verified records</span>
      </div>

      <section className="account-archive__identity" aria-label="Civilization Imprint">
        <header>
          <div>
            <p>Civilization Imprint</p>
            <h3>Patterns Across Histories</h3>
          </div>
          <span>{identity.totalForges} Forges // {identity.totalAlliances} alliances</span>
        </header>
        <div className="account-archive__identity-records">
          <div className="account-archive__identity-record" data-kind="artifact">
            <span className="account-archive__identity-mark"><Hammer aria-hidden="true" /></span>
            <div>
              <small>Signature Technology</small>
              <strong>{signatureArtifact?.name
                ?? (identity.totalForges > 0 ? "No sole signature" : "No pattern established")}</strong>
              <span>{signatureArtifact
                ? `Forged ${signatureArtifact.forgeCount} ${signatureArtifact.forgeCount === 1 ? "time" : "times"}`
                : identity.totalForges > 0
                  ? "Multiple technologies share the Forge lead."
                  : "Your Forge record is still unwritten."}</span>
            </div>
          </div>
          <div className="account-archive__identity-record" data-kind="luminary">
            <span className="account-archive__identity-mark"><LuminaryMark /></span>
            <div>
              <small>Closest Recurring Ally</small>
              <strong>{closestLuminary?.name
                ?? (identity.totalAlliances > 0 ? "No sole recurring ally" : "No bond established")}</strong>
              <span>{closestLuminary
                ? `Allied ${closestLuminary.allianceCount} ${closestLuminary.allianceCount === 1 ? "time" : "times"}`
                : identity.totalAlliances > 0
                  ? "Multiple Luminaries share the alliance lead."
                  : "No Luminary alliance has been recorded."}</span>
            </div>
          </div>
        </div>
        <CivilizationIdentityEditor archive={archive} onConfirm={onUpdateIdentity} />
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
              <span className="account-archive__door-trace" aria-hidden="true" />
              <span className="account-archive__door-medallion">{section.icon}</span>
              <span className="account-archive__door-copy">
                <small>{section.eyebrow}</small>
                <strong>{section.redacted ? <><RedactionBand compact />Vault</> : section.label}</strong>
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

const PAGE_TITLES: Record<ArchiveSection, { eyebrow: string; title: string }> = {
  artifacts: { eyebrow: "Recovered Technology", title: "Artifacts" },
  luminaries: { eyebrow: "Civilization Allies", title: "Luminaries" },
  matches: { eyebrow: "Chronological Record", title: "Match Record" },
  vault: { eyebrow: "Restricted Knowledge", title: "Vault" },
};

export function AccountArchive({
  stats,
  isLoading,
  page = null,
  onNavigate = () => undefined,
  blueprintVault,
  architectRecord,
  isVaultLoading = false,
  isVaultPending = false,
  onResumeBlueprintChallenge,
  onDeactivateBlueprintCipher,
  onChooseBlueprintThresholdApproach,
  onRecordBlueprintThresholdDialogue,
  onResolveBlueprintThresholdDialogue,
  onUseBlueprintDecryptionKey,
  onPrepareBlueprintChallenge,
  onStartQualifyingMatch,
  onEnterPreparedBlueprintChallenge,
  onAcknowledgeVaultReveal,
  onUpdateBlueprintLoadout,
  onUpdateCivilizationIdentity,
}: {
  stats: PlayerStats | null;
  isLoading: boolean;
  page?: ArchiveSection | null;
  onNavigate?: (section: ArchiveSection | null) => void;
  blueprintVault?: BlueprintVaultState | null;
  architectRecord?: ArchitectRecordState | null;
  isVaultLoading?: boolean;
  isVaultPending?: boolean;
  onResumeBlueprintChallenge?: () => Promise<void> | void;
  onDeactivateBlueprintCipher?: () => Promise<void> | void;
  onChooseBlueprintThresholdApproach?: (approach: LumiiThresholdApproach) => Promise<void> | void;
  onRecordBlueprintThresholdDialogue?: (
    path: LumiiThresholdDialogueChoiceId[],
  ) => Promise<readonly LumiiThresholdDialogueChoiceId[] | void> | readonly LumiiThresholdDialogueChoiceId[] | void;
  onResolveBlueprintThresholdDialogue?: () => Promise<void> | void;
  onUseBlueprintDecryptionKey?: () => Promise<void> | void;
  onPrepareBlueprintChallenge?: () => Promise<void> | void;
  onStartQualifyingMatch?: () => Promise<void> | void;
  onEnterPreparedBlueprintChallenge?: () => void;
  onAcknowledgeVaultReveal?: () => Promise<void> | void;
  onUpdateBlueprintLoadout?: (
    mode: VaultLoadoutMode,
    slots: Array<BlueprintId | null>,
  ) => void;
  onUpdateCivilizationIdentity?: (selection: CivilizationIdentitySelection) => Promise<void> | void;
}) {
  const [matchSort, setMatchSort] = useState<MatchSort>("newest");
  const [artifactSort, setArtifactSort] = useState<ArtifactSort>("tier");
  const [luminarySort, setLuminarySort] = useState<LuminarySort>("name");
  const archive = stats?.archive ?? EMPTY_ARCHIVE;

  if (isLoading || !stats) {
    return (
      <div className="account-archive__loading" aria-label="Loading Archive">
        <div /><div /><div />
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
          onUpdateIdentity={onUpdateCivilizationIdentity}
        />
      </div>
    );
  }

  const count = page === "artifacts"
    ? `${archive.artifacts.discovered.length} of ${archive.artifacts.total} encountered`
    : page === "luminaries"
      ? `${archive.luminaries.encountered.length} of ${archive.luminaries.total} encountered`
      : page === "matches"
        ? `${stats.gamesPlayed} match${stats.gamesPlayed === 1 ? "" : "es"} recorded`
        : `${Math.min(archive.vault.qualifyingWins, archive.vault.requiredWins)} of ${archive.vault.requiredWins} Cipher conditions`;

  return (
    <div className="account-archive" data-page={page}>
      <button type="button" className="account-archive__back" onClick={() => onNavigate(null)}>
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
        {page === "matches" && <MatchRecord stats={stats} sort={matchSort} />}
        {page === "artifacts" && <ArtifactArchive archive={archive} sort={artifactSort} />}
        {page === "luminaries" && <LuminaryArchive archive={archive} sort={luminarySort} />}
        {page === "vault" && (
          <BlueprintVault
            archive={archive}
            vaultState={blueprintVault}
            architectRecord={architectRecord}
            isLoading={isVaultLoading}
            isPending={isVaultPending}
            onResumeChallenge={onResumeBlueprintChallenge}
            onDeactivateCipher={onDeactivateBlueprintCipher}
            onChooseApproach={onChooseBlueprintThresholdApproach}
            onRecordDialogue={onRecordBlueprintThresholdDialogue}
            onResolveDialogue={onResolveBlueprintThresholdDialogue}
            onUseDecryptionKey={onUseBlueprintDecryptionKey}
            onPrepareChallenge={onPrepareBlueprintChallenge}
            onStartQualifyingMatch={onStartQualifyingMatch}
            onEnterPreparedChallenge={onEnterPreparedBlueprintChallenge}
            onAcknowledgeReveal={onAcknowledgeVaultReveal}
            onUpdateLoadout={onUpdateBlueprintLoadout}
          />
        )}
      </motion.div>
    </div>
  );
}
