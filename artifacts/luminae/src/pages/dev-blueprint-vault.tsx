import { AccountArchive } from "@/components/archive/AccountArchive";
import type { BlueprintVaultState, PlayerStats } from "@/lib/accountSession";
import {
  ARTIFACT_DEFINITIONS,
  BLUEPRINT_CLEARANCE_REQUIRED_WINS,
  BLUEPRINT_DEFINITIONS,
  type AccountArchiveArtifact,
  type ArtifactId,
} from "@workspace/game-types";

const lockedStats: PlayerStats = {
  gamesPlayed: 8,
  wins: 4,
  losses: 4,
  ties: 0,
  avgEminence: 9,
  recentGames: [],
  archive: {
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
      qualifyingWins: 2,
      requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
      unlocked: false,
      status: "classified",
      challengeRoomId: null,
    },
  },
};

const revealedStats: PlayerStats = {
  ...lockedStats,
  archive: {
    ...lockedStats.archive!,
    vault: {
      qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
      requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
      unlocked: true,
      status: "cleared",
      challengeRoomId: null,
    },
  },
};

const artifactFixtureIds = new Set<ArtifactId>([
  "t1s04",
  "t1o05",
  "t1p04",
  "t2r01",
  "t2r05",
  "t2o03",
  "t2p01",
  "t3r01",
]);

const artifactFixture = Array.from(artifactFixtureIds).map((id, index): AccountArchiveArtifact => {
  const definition = ARTIFACT_DEFINITIONS[id];
  const relationship = (relatedId: ArtifactId) => {
    const known = artifactFixtureIds.has(relatedId);
    return {
      id: known ? relatedId : null,
      name: known ? ARTIFACT_DEFINITIONS[relatedId].name : null,
      tier: ARTIFACT_DEFINITIONS[relatedId].tier,
      known,
    };
  };

  return {
    ...definition,
    forms: [...definition.forms],
    forgeCount: Math.max(1, 8 - index),
    builtOn: definition.builtOn.map(relationship),
    leadsToward: definition.leadsToward.map(relationship),
    projectLeads: definition.projectLeads.map((lead, leadIndex) => ({
      name: leadIndex === 0 ? lead.name : null,
      priority: lead.priority,
      revealed: leadIndex === 0,
    })),
    blueprintEligibility: Object.values(BLUEPRINT_DEFINITIONS)
      .filter((blueprint) => blueprint.components.some((component) => component.artifactId === id))
      .map((blueprint) => blueprint.id),
  };
});

const artifactStats: PlayerStats = {
  ...revealedStats,
  archive: {
    ...revealedStats.archive!,
    artifacts: {
      discovered: artifactFixture,
      total: 90,
      discoveredByTier: { 1: 3, 2: 4, 3: 1 },
      totalByTier: { 1: 40, 2: 30, 3: 20 },
    },
    identity: {
      ...revealedStats.archive!.identity!,
      totalForges: artifactFixture.reduce((sum, artifact) => sum + artifact.forgeCount, 0),
      signatureArtifactId: "t1s04",
      selected: {
        ...revealedStats.archive!.identity!.selected,
        lineage: "causality",
        affinity: "continuum",
        signatureArtifactId: "t1s04",
        displayName: "The Recursive Chronicle",
      },
      options: {
        ...revealedStats.archive!.identity!.options,
        lineages: ["causality", "energy", "boundary_science"],
        affinities: ["continuum", "flare", "abyss"],
        artifactIds: Array.from(artifactFixtureIds),
        blueprintIds: ["bp_antimatter_detonator"],
      },
    },
  },
};

const revealedVault: BlueprintVaultState = {
  clearance: {
    qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
    requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
    status: "cleared",
    challengeRoomId: null,
    warningSeen: true,
    cipherDeactivated: true,
    thresholdApproach: "inquiry",
    thresholdDialoguePath: ["inquiry-answer"],
    thresholdDialogueResolution: "continued",
    covenantBroken: true,
    decryptionKeyBypassActive: false,
    revealPending: false,
  },
  decryptionKeyAvailable: false,
  slotCount: 2,
  competitiveEnabled: false,
  unlockedBlueprintIds: ["bp_antimatter_detonator"],
  blueprints: [BLUEPRINT_DEFINITIONS.bp_antimatter_detonator],
  corruptedRecordCount: 2,
  campaignNodes: [
    {
      id: "campaign_antimatter_first_charge",
      blueprintId: "bp_antimatter_detonator",
      title: "The First Charge",
      status: "available",
    },
  ],
  loadouts: [
    { mode: "campaign", slots: ["bp_antimatter_detonator", null] },
    { mode: "custom", slots: ["bp_antimatter_detonator", null] },
    { mode: "competitive", slots: [null, null] },
  ],
  mastery: [
    {
      blueprintId: "bp_antimatter_detonator",
      manifestations: 0,
      triggers: 0,
      armedMatchFinishes: 0,
    },
  ],
};

export default function DevBlueprintVault() {
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const unlockedOnly = searchParams.get("state") === "unlocked";
  const artifactOnly = searchParams.get("page") === "artifacts";

  return (
    <main
      style={{
        minHeight: "100dvh",
        overflowX: "auto",
        background: "#04070b",
        padding: "28px",
      }}
    >
      <header style={{ margin: "0 auto 18px", maxWidth: "1500px" }}>
        <p style={{ margin: 0, color: "#8d9aa5", fontFamily: "monospace", fontSize: "10px", textTransform: "uppercase" }}>
          {artifactOnly
            ? "Technology System v2 Archive Fixture"
            : unlockedOnly
              ? "Post-Lumii Civilization Archive"
              : "Production State Comparison"}
        </p>
        <h1 style={{ margin: "4px 0 0", fontFamily: "var(--font-serif, serif)", fontSize: "28px" }}>
          {artifactOnly ? "Artifact Dossiers" : unlockedOnly ? "Discovered Blueprints" : "Blueprint Vault"}
        </h1>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: unlockedOnly || artifactOnly ? "minmax(0, 1080px)" : "repeat(2, minmax(560px, 1fr))",
          justifyContent: "center",
          gap: "18px",
          margin: "0 auto",
          maxWidth: "1500px",
        }}
      >
        {!unlockedOnly && !artifactOnly && (
          <section style={{ minWidth: 0 }}>
            <div style={{ marginBottom: "8px", color: "#e76a61", fontFamily: "monospace", fontSize: "10px", fontWeight: 900, textTransform: "uppercase" }}>
              Redacted / Classified
            </div>
            <AccountArchive stats={lockedStats} isLoading={false} page="vault" />
          </section>
        )}

        <section style={{ minWidth: 0 }}>
          {!unlockedOnly && !artifactOnly && (
            <div style={{ marginBottom: "8px", color: "#f0ce74", fontFamily: "monospace", fontSize: "10px", fontWeight: 900, textTransform: "uppercase" }}>
              Revealed / Cleared
            </div>
          )}
          <AccountArchive
            stats={artifactOnly ? artifactStats : revealedStats}
            isLoading={false}
            page={artifactOnly ? "artifacts" : "vault"}
            blueprintVault={artifactOnly ? undefined : revealedVault}
            onUpdateBlueprintLoadout={() => undefined}
          />
        </section>
      </div>
    </main>
  );
}
