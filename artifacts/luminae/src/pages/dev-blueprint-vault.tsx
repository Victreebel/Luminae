import { useEffect, useMemo, useState } from "react";
import { AccountArchive } from "@/components/archive/AccountArchive";
import type {
  AccountArchiveArtifact,
  BlueprintVaultState,
  PlayerStats,
} from "@/lib/accountSession";
import {
  BLUEPRINT_DEFINITIONS,
  buildCampaignProgressProjection,
  type BlueprintLoadout,
} from "@workspace/game-types";

type PreviewState =
  | "locked"
  | "threshold-ready"
  | "decryption-key"
  | "just-opened"
  | "opened"
  | "mobile-open"
  | "future-sealed";

const PREVIEW_STATES: Array<{ id: PreviewState; label: string }> = [
  { id: "locked", label: "Locked" },
  { id: "threshold-ready", label: "Threshold Ready" },
  { id: "decryption-key", label: "Decryption Key" },
  { id: "just-opened", label: "Just Opened" },
  { id: "opened", label: "Stable Opened Hub" },
  { id: "mobile-open", label: "Mobile Opened Hub" },
  { id: "future-sealed", label: "Future Records Sealed" },
];

const forgedAntimatterPreviewArtifacts: AccountArchiveArtifact[] = [
  {
    id: "t1r01",
    name: "Ignition Kernel",
    flavor: "A recovered ignition control artifact.",
    tier: 1,
    bonusAffinity: "flare",
    eminence: 0,
    forgeCount: 1,
  },
  {
    id: "t1p04",
    name: "Magnetic Bottle",
    flavor: "A recovered containment artifact.",
    tier: 1,
    bonusAffinity: "radiance",
    eminence: 0,
    forgeCount: 1,
  },
];

const baseStats: PlayerStats = {
  gamesPlayed: 8,
  wins: 4,
  losses: 4,
  ties: 0,
  avgEminence: 9,
  totalLume: 0,
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
    },
    vault: {
      qualifyingWins: 2,
      requiredWins: 5,
      unlocked: false,
      status: "classified",
      challengeRoomId: null,
    },
  },
};

function statsForPreview(preview: PreviewState): PlayerStats {
  if (preview === "threshold-ready") {
    return {
      ...baseStats,
      archive: {
        ...baseStats.archive!,
        vault: {
          qualifyingWins: 5,
          requiredWins: 5,
          unlocked: false,
          status: "challenge_ready",
          challengeRoomId: null,
        },
      },
    };
  }
  if (preview === "decryption-key") {
    return {
      ...baseStats,
      archive: {
        ...baseStats.archive!,
        vault: {
          qualifyingWins: 2,
          requiredWins: 5,
          unlocked: false,
          status: "challenge_ready",
          challengeRoomId: null,
        },
      },
    };
  }
  if (
    preview === "just-opened" ||
    preview === "opened" ||
    preview === "mobile-open" ||
    preview === "future-sealed"
  ) {
    return {
      ...baseStats,
      archive: {
        ...baseStats.archive!,
        artifacts: {
          ...baseStats.archive!.artifacts,
          discovered: forgedAntimatterPreviewArtifacts,
          discoveredByTier: {
            1: forgedAntimatterPreviewArtifacts.length,
            2: 0,
            3: 0,
          },
        },
        vault: {
          qualifyingWins: 5,
          requiredWins: 5,
          unlocked: true,
          status: "cleared",
          challengeRoomId: null,
        },
      },
    };
  }
  return baseStats;
}

function loadoutsForPreview(): BlueprintLoadout[] {
  return [
    { mode: "campaign", slots: ["bp_antimatter_detonator", null] },
    { mode: "custom", slots: [null, null] },
    { mode: "competitive", slots: [null, null] },
  ];
}

function vaultForPreview(preview: PreviewState): BlueprintVaultState {
  const unlocked =
    preview === "just-opened" ||
    preview === "opened" ||
    preview === "mobile-open" ||
    preview === "future-sealed";
  return {
    clearance: {
      qualifyingWins:
        preview === "decryption-key"
          ? 2
          : unlocked || preview === "threshold-ready"
            ? 5
            : 2,
      requiredWins: 5,
      status: unlocked
        ? "cleared"
        : preview === "locked"
          ? "classified"
          : "challenge_ready",
      challengeRoomId: null,
      warningSeen: preview !== "locked",
      cipherDeactivated: unlocked,
      thresholdApproach: unlocked ? "inquiry" : null,
      thresholdDialoguePath: unlocked ? ["inquiry-answer"] : [],
      thresholdDialogueResolution: unlocked ? "continued" : null,
      thresholdRuptured: unlocked,
      covenantBroken: unlocked,
      decryptionKeyBypassActive: preview === "decryption-key",
      revealPending: preview === "just-opened",
    },
    decryptionKeyAvailable: preview === "locked",
    slotCount: 2,
    competitiveEnabled: false,
    unlockedBlueprintIds: unlocked ? ["bp_antimatter_detonator"] : [],
    blueprints: unlocked ? [BLUEPRINT_DEFINITIONS.bp_antimatter_detonator] : [],
    corruptedRecordCount: unlocked ? 2 : null,
    campaignNodes:
      unlocked && preview !== "future-sealed"
        ? [
            {
              id: "campaign_antimatter_first_charge",
              blueprintId: "bp_antimatter_detonator",
              title: "The First Charge",
              status: "pending_release",
            },
          ]
        : [],
    campaignProgress: buildCampaignProgressProjection({
      releasedChronicleIds: [],
      primaryOutcomes: [],
      rehearsals: [],
      calibrationInsightChronicleIds: [],
    }),
    loadouts: unlocked ? loadoutsForPreview() : [],
    mastery: [],
  };
}

function getInitialPreview(): PreviewState {
  const state = new URLSearchParams(window.location.search).get("state");
  return PREVIEW_STATES.some((entry) => entry.id === state)
    ? (state as PreviewState)
    : "opened";
}

export default function DevBlueprintVault() {
  const [preview, setPreview] = useState<PreviewState>(() =>
    getInitialPreview(),
  );
  const [phoneViewport, setPhoneViewport] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 430px)").matches,
  );
  const stats = useMemo(() => statsForPreview(preview), [preview]);
  const vault = useMemo(() => vaultForPreview(preview), [preview]);
  const isMobile = preview === "mobile-open";
  const compactBench = isMobile || phoneViewport;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const query = window.matchMedia("(max-width: 430px)");
    const update = () => setPhoneViewport(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const choosePreview = (next: PreviewState) => {
    setPreview(next);
    const url = new URL(window.location.href);
    url.searchParams.set("state", next);
    window.history.replaceState(null, "", url);
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        overflowX: "auto",
        background: "#04070b",
        padding: compactBench ? "3px" : "28px",
      }}
    >
      <header
        style={{
          display: compactBench ? "none" : undefined,
          margin: "0 auto 18px",
          maxWidth: "1500px",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#8d9aa5",
            fontFamily: "monospace",
            fontSize: "10px",
            textTransform: "uppercase",
          }}
        >
          Production State Preview
        </p>
        <h1
          style={{
            margin: "4px 0 0",
            fontFamily: "var(--font-serif, serif)",
            fontSize: "28px",
          }}
        >
          Blueprint Vault Hub
        </h1>
      </header>

      <nav
        aria-label="Blueprint Vault preview states"
        style={{
          display: compactBench ? "none" : "flex",
          flexWrap: "wrap",
          gap: "8px",
          margin: "0 auto 18px",
          maxWidth: "1500px",
        }}
      >
        {PREVIEW_STATES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => choosePreview(entry.id)}
            data-active={preview === entry.id}
            style={{
              minHeight: "34px",
              border:
                preview === entry.id
                  ? "1px solid #d8ad51"
                  : "1px solid rgba(154, 168, 180, 0.22)",
              borderRadius: "4px",
              background:
                preview === entry.id
                  ? "rgba(213, 173, 91, 0.18)"
                  : "rgba(9, 14, 20, 0.82)",
              color: preview === entry.id ? "#f0ce74" : "#aab4bc",
              fontFamily: "monospace",
              fontSize: "9px",
              fontWeight: 900,
              padding: "8px 10px",
              textTransform: "uppercase",
            }}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      <section
        style={{
          margin: "0 auto",
          maxWidth: compactBench ? "390px" : "980px",
          minWidth: compactBench ? "0" : "min(560px, 100%)",
        }}
      >
        <div
          style={{
            display: compactBench ? "none" : undefined,
            marginBottom: "8px",
            color: "#f0ce74",
            fontFamily: "monospace",
            fontSize: "10px",
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        >
          {PREVIEW_STATES.find((entry) => entry.id === preview)?.label}
        </div>
        <AccountArchive
          stats={stats}
          isLoading={false}
          page="vault"
          blueprintVault={vault}
          onUseBlueprintDecryptionKey={() => undefined}
          onUpdateBlueprintLoadout={() => undefined}
          onAcknowledgeVaultReveal={() => undefined}
        />
      </section>
    </main>
  );
}
