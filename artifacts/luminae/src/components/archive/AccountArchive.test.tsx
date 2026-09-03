import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ARTIFACT_DEFINITIONS,
  BLUEPRINT_CLEARANCE_REQUIRED_WINS,
  BLUEPRINT_DEFINITIONS,
  type ArtifactId,
} from "@workspace/game-types";
import type { ArchitectRecordState, BlueprintVaultState, PlayerStats } from "@/lib/accountSession";
import { AccountArchive } from "./AccountArchive";

afterEach(cleanup);

function artifactRecord(id: ArtifactId, forgeCount: number) {
  return {
    ...ARTIFACT_DEFINITIONS[id],
    forgeCount,
    blueprintEligibility: [],
  };
}

const baseStats: PlayerStats = {
  gamesPlayed: 2,
  wins: 1,
  losses: 1,
  ties: 0,
  avgEminence: 8,
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

describe("Account Archive", () => {
  it("presents four large Archive destinations with record counts", () => {
    const onNavigate = vi.fn();
    render(<AccountArchive stats={baseStats} isLoading={false} onNavigate={onNavigate} />);

    expect(screen.getByRole("button", { name: "Match Record" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Artifacts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Luminaries" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Top Secret Vault" })).toBeInTheDocument();
    expect(screen.getByText("0 / 90 encountered")).toBeInTheDocument();
    expect(screen.getByText("0 / 17 encountered")).toBeInTheDocument();
    expect(screen.getByText("Entities that have allied with you previously.")).toBeInTheDocument();
    expect(document.querySelectorAll(".account-archive__redaction")).toHaveLength(1);
    expect(screen.queryByText("Blueprint Vault")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Artifacts" }));
    expect(onNavigate).toHaveBeenCalledWith("artifacts");
  });

  it("renders the animated Vault page with the live requirement progress", () => {
    render(<AccountArchive stats={baseStats} isLoading={false} page="vault" />);

    expect(screen.getByTestId("blueprint-vault")).toHaveAttribute("data-unlocked", "false");
    expect(document.querySelector(".account-archive__page-header")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".account-archive__redaction")).toHaveLength(1);
    expect(document.querySelector(".account-vault__cipher-sigil")).toBeInTheDocument();
    expect(screen.getByText(`2 / ${BLUEPRINT_CLEARANCE_REQUIRED_WINS}`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Win ${BLUEPRINT_CLEARANCE_REQUIRED_WINS} qualifying Core Game matches`)))
      .toBeInTheDocument();
    expect(screen.getByText("ACCESS DENIED")).toBeInTheDocument();
  });

  it("preserves earlier signals inside the sealed Vault record", () => {
    const signal = {
      id: "clearance_signal_1",
      kind: "clearance_signal" as const,
      ordinal: 1,
      title: "Signal 1 of 3",
      lines: ["That frequency again.", "It recognized the shape of your civilization."],
      acknowledgedAt: "2026-08-13T12:00:00.000Z",
    };
    const architectRecord: ArchitectRecordState = {
      campaignId: "architect_record",
      tutorialCompleted: true,
      firstContactStance: "curious",
      nodes: [],
      presentations: [signal],
      pendingPresentations: [],
      vaultShortcutVisible: false,
    };

    render(
      <AccountArchive
        stats={baseStats}
        isLoading={false}
        page="vault"
        architectRecord={architectRecord}
      />,
    );

    expect(screen.getByText("Recorded signals")).toBeInTheDocument();
    expect(screen.getByText("Signal 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("Recorded")).toBeInTheDocument();
    expect(screen.queryByText("The First Charge")).not.toBeInTheDocument();
  });

  it("reveals the Blueprint Vault name only after clearance", () => {
    const unlocked: PlayerStats = {
      ...baseStats,
      archive: {
        ...baseStats.archive!,
        vault: {
          qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
          requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
          unlocked: true,
          status: "cleared",
          challengeRoomId: null,
        },
      },
    };
    render(<AccountArchive stats={unlocked} isLoading={false} page="vault" />);

    expect(screen.getByTestId("blueprint-vault")).toHaveAttribute("data-unlocked", "true");
    expect(screen.getByText("Blueprint Vault")).toBeInTheDocument();
    expect(screen.getByTestId("vault-status")).toHaveTextContent("VAULT OPEN");
  });

  it("shows The First Charge as an inert future transmission after clearance", () => {
    const clearedStats: PlayerStats = {
      ...baseStats,
      archive: {
        ...baseStats.archive!,
        vault: {
          qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
          requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
          unlocked: true,
          status: "cleared",
          challengeRoomId: null,
        },
      },
    };
    const vaultState: BlueprintVaultState = {
      clearance: {
        qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
        requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
        status: "cleared",
        challengeRoomId: null,
        warningSeen: true,
        cipherDeactivated: true,
        thresholdApproach: "inquiry",
        thresholdDialoguePath: [],
        thresholdDialogueResolution: "continued",
        covenantBroken: true,
        decryptionKeyBypassActive: false,
        revealPending: false,
      },
      decryptionKeyAvailable: false,
      slotCount: 2,
      competitiveEnabled: false,
      unlockedBlueprintIds: ["bp_antimatter_detonator"],
      blueprints: [],
      corruptedRecordCount: 0,
      campaignNodes: [{
        id: "campaign_antimatter_first_charge",
        blueprintId: "bp_antimatter_detonator",
        title: "The First Charge",
        status: "future",
      }],
      loadouts: [],
      mastery: [],
    };

    render(
      <AccountArchive
        stats={clearedStats}
        isLoading={false}
        page="vault"
        blueprintVault={vaultState}
      />,
    );

    const futureTitle = screen.getByText("The First Charge");
    const futureNode = futureTitle.closest(".account-vault__campaign-node");
    expect(futureNode).not.toBeNull();
    expect(futureNode?.querySelector("button, a, svg")).toBeNull();
    expect(futureNode).toHaveTextContent("content not yet available");
  });

  it("distinguishes a ready Supreme Cipher from the inert first seal", () => {
    const readyStats: PlayerStats = {
      ...baseStats,
      archive: {
        ...baseStats.archive!,
        vault: {
          qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
          requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
          unlocked: false,
          status: "challenge_ready",
          challengeRoomId: null,
        },
      },
    };
    const vaultState: BlueprintVaultState = {
      clearance: {
        qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
        requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
        status: "challenge_ready",
        challengeRoomId: null,
        warningSeen: false,
        cipherDeactivated: false,
        thresholdApproach: null,
        thresholdDialoguePath: [],
        thresholdDialogueResolution: null,
        covenantBroken: false,
        decryptionKeyBypassActive: false,
        revealPending: false,
      },
      decryptionKeyAvailable: false,
      slotCount: 2,
      competitiveEnabled: false,
      unlockedBlueprintIds: [],
      blueprints: [],
      corruptedRecordCount: null,
      campaignNodes: [],
      loadouts: [],
      mastery: [],
    };
    const { rerender } = render(
      <AccountArchive stats={readyStats} isLoading={false} page="vault" blueprintVault={vaultState} />,
    );

    expect(screen.getByTestId("vault-status")).toHaveTextContent("SUPREME CIPHER READY");
    expect(screen.getByRole("button", { name: "Attempt Vault access" }))
      .toHaveTextContent("SUPREME CIPHER");
    expect(screen.getByRole("button", { name: "Attempt Vault access" }))
      .toHaveAttribute("data-cipher-dismissal", "permanent");

    rerender(
      <AccountArchive
        stats={readyStats}
        isLoading={false}
        page="vault"
        blueprintVault={{
          ...vaultState,
          clearance: { ...vaultState.clearance, cipherDeactivated: true },
        }}
      />,
    );
    expect(screen.getByTestId("vault-status")).toHaveTextContent("CIPHER DISMISSED");
    expect(screen.getByRole("button", { name: "Attempt Vault access" })).toHaveTextContent("THRESHOLD ARRESTED");
    expect(screen.getByRole("button", { name: "Attempt Vault access" })).toHaveAttribute("data-cipher-state", "hidden");
  });

  it("does not treat stale decryption-key residue as a permanent inert Cipher", () => {
    const staleVault: BlueprintVaultState = {
      clearance: {
        qualifyingWins: 2,
        requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
        status: "challenge_ready",
        challengeRoomId: null,
        warningSeen: false,
        cipherDeactivated: true,
        thresholdApproach: null,
        thresholdDialoguePath: [],
        thresholdDialogueResolution: null,
        covenantBroken: false,
        decryptionKeyBypassActive: false,
        revealPending: false,
      },
      decryptionKeyAvailable: false,
      slotCount: 2,
      competitiveEnabled: false,
      unlockedBlueprintIds: [],
      blueprints: [],
      corruptedRecordCount: null,
      campaignNodes: [],
      loadouts: [],
      mastery: [],
    };

    render(<AccountArchive stats={baseStats} isLoading={false} page="vault" blueprintVault={staleVault} />);

    expect(screen.getByTestId("vault-status")).toHaveTextContent("ACCESS DENIED");
    expect(screen.queryByText("FIRST SEAL INERT")).not.toBeInTheDocument();
    expect(screen.queryByText("THRESHOLD ARRESTED")).not.toBeInTheDocument();
  });

  it("offers a held decryption key and clearly marks its temporary access", () => {
    const useKey = vi.fn();
    const classifiedVault: BlueprintVaultState = {
      clearance: {
        qualifyingWins: 2,
        requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
        status: "classified",
        challengeRoomId: null,
        warningSeen: false,
        cipherDeactivated: false,
        thresholdApproach: null,
        thresholdDialoguePath: [],
        thresholdDialogueResolution: null,
        covenantBroken: false,
        decryptionKeyBypassActive: false,
        revealPending: false,
      },
      decryptionKeyAvailable: true,
      slotCount: 2,
      competitiveEnabled: false,
      unlockedBlueprintIds: [],
      blueprints: [],
      corruptedRecordCount: null,
      campaignNodes: [],
      loadouts: [],
      mastery: [],
    };
    const { rerender } = render(
      <AccountArchive
        stats={baseStats}
        isLoading={false}
        page="vault"
        blueprintVault={classifiedVault}
        onUseBlueprintDecryptionKey={useKey}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Spend Decryption Key/i }));
    expect(useKey).toHaveBeenCalledTimes(1);

    rerender(
      <AccountArchive
        stats={baseStats}
        isLoading={false}
        page="vault"
        blueprintVault={{
          ...classifiedVault,
          decryptionKeyAvailable: false,
          clearance: {
            ...classifiedVault.clearance,
            status: "challenge_ready",
            decryptionKeyBypassActive: true,
          },
        }}
      />,
    );
    expect(screen.getByTestId("vault-status")).toHaveTextContent("BLACK MARKET BYPASS");
    expect(screen.getByRole("button", { name: "Attempt Vault access" }))
      .toHaveTextContent("TEMPORARY OVERRIDE");
    expect(screen.getByRole("button", { name: "Attempt Vault access" }))
      .toHaveAttribute("data-cipher-dismissal", "temporary");
    expect(screen.getAllByText(
      new RegExp(`Leaving or losing restores the ${BLUEPRINT_CLEARANCE_REQUIRED_WINS}-win condition`, "i"),
    )).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Spend Decryption Key/i })).not.toBeInTheDocument();
  });

  it("turns the cleared Vault into a selectable archive of every discovered Blueprint", async () => {
    const onUpdateLoadout = vi.fn();
    const clearedStats: PlayerStats = {
      ...baseStats,
      archive: {
        ...baseStats.archive!,
        vault: {
          qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
          requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
          unlocked: true,
          status: "cleared",
          challengeRoomId: null,
        },
      },
    };
    const discoveredIds = [
      "bp_antimatter_detonator",
      "bp_mantle_to_orbit_foundry",
      "bp_worldshield_covenant",
    ] as const;
    const vaultState: BlueprintVaultState = {
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
      unlockedBlueprintIds: [...discoveredIds],
      blueprints: discoveredIds.map((id) => BLUEPRINT_DEFINITIONS[id]),
      corruptedRecordCount: 0,
      campaignNodes: [],
      loadouts: [
        { mode: "campaign", slots: ["bp_antimatter_detonator", "bp_mantle_to_orbit_foundry"] },
        { mode: "custom", slots: ["bp_worldshield_covenant", null] },
        { mode: "competitive", slots: [null, null] },
      ],
      mastery: [{
        blueprintId: "bp_worldshield_covenant",
        manifestations: 3,
        triggers: 2,
        armedMatchFinishes: 1,
      }],
    };

    render(
      <AccountArchive
        stats={clearedStats}
        isLoading={false}
        page="vault"
        blueprintVault={vaultState}
        onUpdateBlueprintLoadout={onUpdateLoadout}
      />,
    );

    expect(screen.queryByRole("button", { name: "Open cosmic technology vault" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Antimatter Detonator/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Mantle-to-Orbit Foundry/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Worldshield Covenant/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Worldshield Covenant/ }));

    expect(screen.getByRole("tab", { name: /Worldshield Covenant/ })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByTestId("worldshield-blueprint-card")).toBeInTheDocument();
    expect(screen.getByLabelText("Worldshield Covenant mastery")).toHaveTextContent("Manifested3Triggered2Armed Finishes1");
    expect(screen.getByText("Mantle-to-Orbit Foundry", { selector: ".account-vault__slots strong" })).toBeInTheDocument();

    fireEvent.click(screen.getByText("Mantle-to-Orbit Foundry", { selector: ".account-vault__slots strong" }));
    expect(onUpdateLoadout).toHaveBeenCalledWith("campaign", [
      "bp_antimatter_detonator",
      "bp_worldshield_covenant",
    ]);
  });

  it("turns repeated play into a Civilization Imprint", () => {
    const withIdentity: PlayerStats = {
      ...baseStats,
      archive: {
        ...baseStats.archive!,
        artifacts: {
          ...baseStats.archive!.artifacts,
          discovered: [{
            ...artifactRecord("t2o01", 4),
            name: "Alpha Engine",
            flavor: "A recurring choice.",
          }],
          discoveredByTier: { 1: 0, 2: 1, 3: 0 },
        },
        luminaries: {
          ...baseStats.archive!.luminaries,
          encountered: [{
            id: "lum_tide",
            name: "The Tide Architect",
            domain: "Continuum",
            eminence: 1,
            flavor: "It remembers every shore.",
            effectName: "Rising Archive",
            effectDescription: "Test effect.",
            summonColor: "#66aacc",
            summonSecondaryColor: "#ccddee",
            allianceCount: 3,
          }],
        },
        identity: {
          totalForges: 4,
          totalAlliances: 3,
          signatureArtifactId: "t2o01",
          closestLuminaryId: "lum_tide",
          selected: {
            ...baseStats.archive!.identity.selected,
            lineage: "boundary_science",
            affinity: "abyss",
            signatureArtifactId: "t2o01",
            signatureLuminaryId: "lum_tide",
            displayName: "The Veiled Horizon",
          },
          suggested: {
            lineage: "boundary_science",
            affinity: null,
            signatureArtifactId: "t2o01",
            signatureLuminaryId: "lum_tide",
            signatureBlueprintId: null,
          },
          options: {
            lineages: ["boundary_science"],
            affinities: ["abyss"],
            artifactIds: ["t2o01"],
            luminaryIds: ["lum_tide"],
            blueprintIds: [],
          },
        },
      },
    };

    render(<AccountArchive stats={withIdentity} isLoading={false} />);

    expect(screen.getByRole("region", { name: "Civilization Imprint" })).toBeInTheDocument();
    expect(screen.getByText("Alpha Engine", {
      selector: ".account-archive__identity-record strong",
    })).toBeInTheDocument();
    expect(screen.getByText("Forged 4 times")).toBeInTheDocument();
    expect(screen.getByText("The Tide Architect", {
      selector: ".account-archive__identity-record strong",
    })).toBeInTheDocument();
    expect(screen.getByText("Allied 3 times")).toBeInTheDocument();
  });

  it("sorts encountered Artifacts on their dedicated page", () => {
    const withArtifacts: PlayerStats = {
      ...baseStats,
      archive: {
        ...baseStats.archive!,
        artifacts: {
          ...baseStats.archive!.artifacts,
          discovered: [
            { ...artifactRecord("t1r01", 4), name: "Zeta Engine", flavor: "Late record" },
            { ...artifactRecord("t2o01", 1), name: "Alpha Engine", flavor: "Early record" },
          ],
          discoveredByTier: { 1: 1, 2: 1, 3: 0 },
        },
        identity: {
          ...baseStats.archive!.identity,
          totalForges: 5,
          signatureArtifactId: "t1r01",
        },
      },
    };
    render(<AccountArchive stats={withArtifacts} isLoading={false} page="artifacts" />);

    fireEvent.change(screen.getByLabelText("Sort Artifacts"), { target: { value: "name" } });

    const names = Array.from(document.querySelectorAll(".account-archive__artifact-copy h4"))
      .map((heading) => heading.textContent);
    expect(names).toEqual(["Alpha Engine", "Zeta Engine"]);

    fireEvent.change(screen.getByLabelText("Sort Artifacts"), { target: { value: "forged" } });
    const forgedOrder = Array.from(document.querySelectorAll(".account-archive__artifact-copy h4"))
      .map((heading) => heading.textContent);
    expect(forgedOrder).toEqual(["Zeta Engine", "Alpha Engine"]);
    expect(screen.getByText("Signature technology")).toBeInTheDocument();
    expect(screen.getByText("2 of 90 encountered")).toBeInTheDocument();
  });

  it("sorts a concealed Luminary after named Luminaries alphabetically", () => {
    const makeLuminary = (id: string, name: string) => ({
      id,
      name,
      domain: "Unknown",
      eminence: 1,
      flavor: "A recorded encounter.",
      effectName: "Recorded Effect",
      effectDescription: "Test effect.",
      summonColor: "#778899",
      summonSecondaryColor: "#aabbcc",
      allianceCount: 1,
    });
    const withLuminaries: PlayerStats = {
      ...baseStats,
      archive: {
        ...baseStats.archive!,
        luminaries: {
          encountered: [
            makeLuminary("unknown", "???"),
            makeLuminary("zeta", "Zeta Witness"),
            makeLuminary("alpha", "Alpha Witness"),
          ],
          total: 17,
        },
      },
    };
    render(<AccountArchive stats={withLuminaries} isLoading={false} page="luminaries" />);

    const names = Array.from(document.querySelectorAll(".account-archive__luminary-copy h3"))
      .map((heading) => heading.textContent);
    expect(names).toEqual(["Alpha Witness", "Zeta Witness", "???"]);
  });
});
