import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BLUEPRINT_DEFINITIONS, buildCampaignProgressProjection } from "@workspace/game-types";
import type { BlueprintVaultState, PlayerStats } from "@/lib/accountSession";
import { AccountArchive } from "./AccountArchive";

afterEach(cleanup);

const baseStats: PlayerStats = {
  gamesPlayed: 2,
  wins: 1,
  losses: 1,
  ties: 0,
  avgEminence: 8,
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

const pendingCampaignProgress = buildCampaignProgressProjection({
  releasedChronicleIds: [],
  primaryOutcomes: [],
  rehearsals: [],
  calibrationInsightChronicleIds: [],
});

describe("Account Archive", () => {
  it("summarizes recorded civilizations and labels unavailable legacy history truthfully", () => {
    const withCivilizationRecords: PlayerStats = {
      ...baseStats,
      totalLume: 6,
      recentGames: [
        {
          roomId: "recorded-room",
          inviteCode: "RECORDED",
          finishedAt: "2026-08-23T12:00:00.000Z",
          result: "win",
          eminenceEarned: 15,
          totalPlayers: 2,
          civilizationRecord: {
            version: 1,
            evidence: "recorded",
            historicalContext: "historical",
            historicalMaturity: "stellar",
            currentReach: "planetary",
            currentReachCondition: "degraded",
            stabilityBand: "strained",
            stabilityScore: 58,
            affinityForm: "dyad",
            dominantAffinity: "continuum",
            dominantDyad: "flux",
            masteredArtifactCount: 8,
            operationalArtifactCount: 7,
            damagedArtifactCount: 1,
            annihilatedArtifactCount: 0,
            manifestedProjectCount: 1,
            civilizationEventCount: 2,
            outcome: {
              policyId: "civilization-outcome-v1",
              evidence: "recorded",
              category: "enduring",
              qualityScore: 68,
              continuity: 74,
              agency: 75,
              achievement: 62,
              stability: 58,
              adversityIntensity: 10,
              recoveryCredit: 2,
              primaryFactors: {
                continuity: [{ direction: "support", points: 8, label: "Viable settled worlds preserve multiple futures" }],
                agency: [],
                achievement: [],
                stability: [{ direction: "pressure", points: 7, label: "Infrastructure remains strained" }],
              },
              explanation: ["Historical outcome: enduring."],
            },
            lume: {
              policyId: "civilization-lume-v1",
              status: "awarded",
              amount: 6,
              qualityScore: 68,
              recoveryCredit: 2,
              explanation: ["6 Lume awarded."],
            },
            unavailableFields: [],
          },
        },
        {
          roomId: "legacy-room",
          inviteCode: "LEGACY",
          finishedAt: "2026-08-22T12:00:00.000Z",
          result: "loss",
          eminenceEarned: 9,
          totalPlayers: 2,
          civilizationRecord: {
            version: 1,
            evidence: "legacy_unavailable",
            historicalContext: "unknown",
            historicalMaturity: null,
            currentReach: null,
            currentReachCondition: null,
            stabilityBand: null,
            stabilityScore: null,
            affinityForm: null,
            dominantAffinity: null,
            dominantDyad: null,
            masteredArtifactCount: null,
            operationalArtifactCount: null,
            damagedArtifactCount: null,
            annihilatedArtifactCount: null,
            manifestedProjectCount: 0,
            civilizationEventCount: null,
            outcome: null,
            lume: {
              policyId: "civilization-lume-v1",
              status: "unavailable",
              amount: 0,
              qualityScore: null,
              recoveryCredit: 0,
              explanation: ["No recorded Civilization state exists."],
            },
            unavailableFields: ["civilizationState"],
          },
        },
      ],
    };

    render(<AccountArchive stats={withCivilizationRecords} isLoading={false} page="matches" />);

    expect(screen.getByText("2 players / stellar / strained")).toBeInTheDocument();
    expect(screen.getByText("2 players / civilization unrecorded")).toBeInTheDocument();
    expect(screen.getByText(/Enduring/)).toBeInTheDocument();
    expect(screen.getByText("+6")).toBeInTheDocument();
    expect(screen.getByText("Achievement")).toBeInTheDocument();
    expect(screen.getByText("Historical outcome: enduring.")).toBeInTheDocument();
    expect(screen.getByText(/Viable settled worlds preserve multiple futures/)).toBeInTheDocument();
    expect(screen.getByText("2 matches recorded / 6 Lume")).toBeInTheDocument();
  });

  it("presents the Archive destinations and permanent Civilization reference", () => {
    const onNavigate = vi.fn();
    render(<AccountArchive stats={baseStats} isLoading={false} onNavigate={onNavigate} />);

    expect(screen.getByRole("button", { name: "Match Record" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Civilization Field Guide" })).toBeInTheDocument();
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

  it("explains Civilization causality and Blueprint manifestation without replaying onboarding", () => {
    render(<AccountArchive stats={baseStats} isLoading={false} page="civilization" />);

    expect(screen.getByText("Technology becomes history")).toBeInTheDocument();
    expect(screen.getByText("The Well is not fuel")).toBeInTheDocument();
    expect(screen.getByText("Artifacts become capability")).toBeInTheDocument();
    expect(screen.getByText("One class, local embodiments")).toBeInTheDocument();
    expect(screen.getByText("Discovery, pathway, and operation differ")).toBeInTheDocument();
    expect(screen.getByText("A seal archives mastery")).toBeInTheDocument();
    expect(screen.getByText("Stability is resilience")).toBeInTheDocument();
    expect(screen.getByText("Chronicles test what exists")).toBeInTheDocument();
    expect(screen.getByText("Blueprints manifest Projects")).toBeInTheDocument();
    expect(screen.getByText(/Lume reflects historical quality/)).toBeInTheDocument();
    expect(screen.getByText(/every paid Affinity returns/)).toBeInTheDocument();
    expect(screen.getByText(/do not consume the ordinary three-card Encryption capacity/)).toBeInTheDocument();
  });

  it("renders the animated Vault page with the live requirement progress", () => {
    render(<AccountArchive stats={baseStats} isLoading={false} page="vault" />);

    expect(screen.getByTestId("blueprint-vault")).toHaveAttribute("data-unlocked", "false");
    expect(document.querySelector(".account-archive__page-header")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".account-archive__redaction")).toHaveLength(1);
    expect(document.querySelector(".account-vault__cipher-sigil")).toBeInTheDocument();
    expect(screen.getByText("2 / 5")).toBeInTheDocument();
    expect(screen.getByText(/Win five standard matches/)).toBeInTheDocument();
    expect(screen.getByText("ACCESS DENIED")).toBeInTheDocument();
  });

  it("reveals the Blueprint Vault name only after clearance", () => {
    const unlocked: PlayerStats = {
      ...baseStats,
      archive: {
        ...baseStats.archive!,
        vault: {
          qualifyingWins: 5,
          requiredWins: 5,
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

  it("presents the opened Vault as a paused post-Lumii story hub", () => {
    const unlocked: PlayerStats = {
      ...baseStats,
      archive: {
        ...baseStats.archive!,
        vault: {
          qualifyingWins: 5,
          requiredWins: 5,
          unlocked: true,
          status: "cleared",
          challengeRoomId: null,
        },
      },
    };
    const vaultState: BlueprintVaultState = {
      clearance: {
        qualifyingWins: 5,
        requiredWins: 5,
        status: "cleared",
        challengeRoomId: null,
        warningSeen: true,
        cipherDeactivated: true,
        thresholdApproach: "inquiry",
        thresholdDialoguePath: ["inquiry-answer"],
        thresholdDialogueResolution: "continued",
        thresholdRuptured: true,
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
      campaignNodes: [{
        id: "campaign_antimatter_first_charge",
        blueprintId: "bp_antimatter_detonator",
        title: "The First Charge",
        status: "pending_release",
      }],
      campaignProgress: pendingCampaignProgress,
      loadouts: [
        { mode: "campaign", slots: ["bp_antimatter_detonator", null] },
        { mode: "custom", slots: [null, null] },
        { mode: "competitive", slots: [null, null] },
      ],
      mastery: [],
    };
    const updateLoadout = vi.fn();

    render(
      <AccountArchive
        stats={unlocked}
        isLoading={false}
        page="vault"
        blueprintVault={vaultState}
        onUpdateBlueprintLoadout={updateLoadout}
      />,
    );

    expect(screen.getAllByText("OUTER VAULT ACCESS").length).toBeGreaterThan(0);
    expect(document.querySelector(".account-vault__breach")).toBeInTheDocument();
    expect(document.querySelector(".account-vault__reveal")).not.toBeInTheDocument();
    expect(document.querySelector(".account-vault__cipher-conduits")).not.toBeInTheDocument();
    expect(document.querySelector(".account-vault__cipher-sigil")).not.toBeInTheDocument();
    expect(screen.getByText("First record recovered")).toBeInTheDocument();
    expect(screen.getAllByText("Antimatter Detonator").length).toBeGreaterThan(0);
    expect(screen.getByText("Sealed Campaign Records")).toBeInTheDocument();
    expect(screen.getByText("Progression pauses here while future campaigns remain under lock.")).toBeInTheDocument();
    expect(screen.getByText("The First Charge")).toBeInTheDocument();
    expect(screen.getByText("Campaign record pending")).toBeInTheDocument();
    expect(screen.queryByText("Campaign Node // Available")).not.toBeInTheDocument();

    const recoveredTab = screen.getByRole("button", { name: "Recovered" });
    const sealedTab = screen.getByRole("button", { name: "Sealed Records" });
    expect(recoveredTab).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector('[aria-label="Recovered Blueprint"]')).toHaveAttribute("data-mobile-active", "true");
    fireEvent.click(sealedTab);
    expect(sealedTab).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector('[aria-label="Sealed Campaign Records"]')).toHaveAttribute("data-mobile-active", "true");

    fireEvent.click(screen.getByRole("button", { name: /Slot 2\s*Unassigned\s*Select recovered Blueprint/i }));
    expect(updateLoadout).toHaveBeenCalledWith("campaign", [null, "bp_antimatter_detonator"]);
  });

  it("distinguishes a ready Supreme Cipher from the inert first seal", () => {
    const readyStats: PlayerStats = {
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
    const vaultState: BlueprintVaultState = {
      clearance: {
        qualifyingWins: 5,
        requiredWins: 5,
        status: "challenge_ready",
        challengeRoomId: null,
        warningSeen: false,
        cipherDeactivated: false,
        thresholdApproach: null,
        thresholdDialoguePath: [],
        thresholdDialogueResolution: null,
        thresholdRuptured: false,
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
      campaignProgress: pendingCampaignProgress,
      loadouts: [],
      mastery: [],
    };
    const { rerender } = render(
      <AccountArchive stats={readyStats} isLoading={false} page="vault" blueprintVault={vaultState} />,
    );

    expect(screen.getByTestId("vault-status")).toHaveTextContent("SUPREME CIPHER READY");
    expect(screen.getByRole("button", { name: "Attempt Blueprint Vault access" })).toHaveTextContent("SUPREME CIPHER");

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
    expect(screen.getByTestId("vault-status")).toHaveTextContent("CIPHER DEACTIVATED");
    expect(screen.getByRole("button", { name: "Attempt Blueprint Vault access" })).toHaveTextContent("THRESHOLD ARRESTED");
  });

  it("does not treat stale decryption-key residue as a permanent inert Cipher", () => {
    const staleVault: BlueprintVaultState = {
      clearance: {
        qualifyingWins: 2,
        requiredWins: 5,
        status: "challenge_ready",
        challengeRoomId: null,
        warningSeen: false,
        cipherDeactivated: true,
        thresholdApproach: null,
        thresholdDialoguePath: [],
        thresholdDialogueResolution: null,
        thresholdRuptured: false,
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
      campaignProgress: pendingCampaignProgress,
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
        requiredWins: 5,
        status: "classified",
        challengeRoomId: null,
        warningSeen: false,
        cipherDeactivated: false,
        thresholdApproach: null,
        thresholdDialoguePath: [],
        thresholdDialogueResolution: null,
        thresholdRuptured: false,
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
      campaignProgress: pendingCampaignProgress,
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
    expect(screen.getByRole("button", { name: "Attempt Blueprint Vault access" })).toHaveTextContent("TEMPORARY OVERRIDE");
    expect(screen.getAllByText(/Leaving or losing restores the five-win condition/i)).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Spend Decryption Key/i })).not.toBeInTheDocument();
  });

  it("turns repeated play into a Civilization Imprint", () => {
    const withIdentity: PlayerStats = {
      ...baseStats,
      archive: {
        ...baseStats.archive!,
        artifacts: {
          ...baseStats.archive!.artifacts,
          discovered: [{
            id: "alpha",
            name: "Alpha Engine",
            flavor: "A recurring choice.",
            tier: 2,
            bonusAffinity: "abyss",
            eminence: 2,
            forgeCount: 4,
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
          signatureArtifactId: "alpha",
          closestLuminaryId: "lum_tide",
        },
      },
    };

    render(<AccountArchive stats={withIdentity} isLoading={false} />);

    expect(screen.getByRole("region", { name: "Civilization Imprint" })).toBeInTheDocument();
    expect(screen.getByText("Alpha Engine")).toBeInTheDocument();
    expect(screen.getByText("Forged 4 times")).toBeInTheDocument();
    expect(screen.getByText("The Tide Architect")).toBeInTheDocument();
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
            { id: "zeta", name: "Zeta Engine", flavor: "Late record", tier: 1, bonusAffinity: "flare", eminence: 0, forgeCount: 4 },
            { id: "alpha", name: "Alpha Engine", flavor: "Early record", tier: 2, bonusAffinity: "abyss", eminence: 2, forgeCount: 1 },
          ],
          discoveredByTier: { 1: 1, 2: 1, 3: 0 },
        },
        identity: {
          ...baseStats.archive!.identity,
          totalForges: 5,
          signatureArtifactId: "zeta",
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
