import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GamePlayerState } from "@workspace/api-client-react";
import { BLUEPRINT_DEFINITIONS, OUTER_VAULT_BLUEPRINT_IDS } from "@workspace/game-types";
import { BlueprintGamePanel } from "./BlueprintGamePanel";

function player(overrides: Partial<GamePlayerState> = {}): GamePlayerState {
  return {
    playerId: "p1",
    playerName: "Architect",
    forgedArtifacts: [],
    reservedArtifacts: [],
    affinities: {
      flare: 0,
      continuum: 0,
      verdance: 0,
      abyss: 0,
      radiance: 0,
      singularity: 0,
    },
    bonuses: {
      flare: 0,
      continuum: 0,
      verdance: 0,
      abyss: 0,
      radiance: 0,
      singularity: 0,
    },
    eminence: 0,
    discountedForgeIds: [],
    luminaries: [],
    isConnected: true,
    plannedAction: null,
    plannedActionCancelReason: null,
    ...overrides,
  } as GamePlayerState;
}

describe("BlueprintGamePanel", () => {
  it("keeps the launch outer-Vault pool to Antimatter, Foundry, and Worldshield", () => {
    expect(OUTER_VAULT_BLUEPRINT_IDS).toEqual([
      "bp_antimatter_detonator",
      "bp_mantle_to_orbit_foundry",
      "bp_worldshield_covenant",
    ]);
  });

  it("keeps Foundry recovery status here while controls live with stored components", () => {
    const me = player({
      blueprintPrivateStates: [{
        blueprintId: "bp_mantle_to_orbit_foundry",
        slotIndex: 0,
        matchedComponentIds: [],
        manifested: true,
        foundryStoredArtifactIds: ["t1r07"],
        foundryRecoveryArtifactIds: ["t1r07"],
      }],
      manifestedBlueprintDevices: [{
        blueprintId: "bp_mantle_to_orbit_foundry",
        definition: BLUEPRINT_DEFINITIONS.bp_mantle_to_orbit_foundry as never,
        ownerPlayerId: "p1",
        slotIndex: 0,
        state: "recovering",
        presentationVariant: "armored",
        foundryUsesRemaining: 0,
      }],
    });

    render(
      <BlueprintGamePanel
        me={me}
        players={[me]}
        loreCatalog={{ t1r07: { name: "Entropy Pyre Baffle" } } as never}
        onOpenArtifact={() => undefined}
      />,
    );

    expect(screen.getByText("1 component awaiting recovery")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Recover/i })).not.toBeInTheDocument();
  });

  it("uses Antimatter Detonator as a complete private-to-public Legacy project example", () => {
    const assembling = player({
      blueprintPrivateStates: [{
        blueprintId: "bp_antimatter_detonator",
        slotIndex: 0,
        matchedComponentIds: ["t1r01"],
        manifested: false,
        definition: BLUEPRINT_DEFINITIONS.bp_antimatter_detonator as never,
      }],
    });
    const { rerender } = render(
      <BlueprintGamePanel
        me={assembling}
        players={[assembling]}
        onOpenArtifact={() => undefined}
      />,
    );

    expect(screen.getByText("Antimatter Detonator")).toBeInTheDocument();
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
    expect(screen.getByTestId("antimatter-blueprint-card")).toHaveAttribute(
      "data-blueprint-state",
      "assembling",
    );
    expect(screen.queryByText(/Legacy \d+\/\d+/)).not.toBeInTheDocument();

    const manifested = player({
      blueprintPrivateStates: [{
        blueprintId: "bp_antimatter_detonator",
        slotIndex: 0,
        matchedComponentIds: BLUEPRINT_DEFINITIONS.bp_antimatter_detonator.components.map((component) => component.artifactId),
        manifested: true,
        definition: BLUEPRINT_DEFINITIONS.bp_antimatter_detonator as never,
      }],
      manifestedBlueprintDevices: [{
        blueprintId: "bp_antimatter_detonator",
        ownerPlayerId: "p1",
        slotIndex: 0,
        state: "armed",
        presentationVariant: "armored",
        definition: BLUEPRINT_DEFINITIONS.bp_antimatter_detonator as never,
      }],
      civilization: {
        projects: [{
          projectId: "project:0:bp_antimatter_detonator",
          blueprintId: "bp_antimatter_detonator",
          slotIndex: 0,
          status: "manifested",
          deviceState: "armed",
          presentationVariant: "armored",
          manifestedTurnCount: 4,
          stateChangedTurnCount: 4,
          activeCapabilityIds: ["project:claim_annihilation"],
          historyEvidence: "recorded",
        }],
      } as never,
    });
    rerender(
      <BlueprintGamePanel
        me={manifested}
        players={[manifested]}
        onOpenArtifact={() => undefined}
      />,
    );

    expect(screen.getByTestId("antimatter-blueprint-card")).toHaveAttribute(
      "data-blueprint-state",
      "manifested",
    );
    expect(screen.getByText("Armed")).toBeInTheDocument();
    expect(screen.queryByText(/Capability (online|dormant)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Legacy \d+\/\d+/)).not.toBeInTheDocument();
  });

  it("uses a Blueprint card for projects without dedicated hero artwork", () => {
    const me = player({
      blueprintPrivateStates: [{
        blueprintId: "bp_worldshield_covenant",
        slotIndex: 0,
        matchedComponentIds: ["t1o01"],
        manifested: false,
        definition: BLUEPRINT_DEFINITIONS.bp_worldshield_covenant as never,
      }],
    });

    render(
      <BlueprintGamePanel
        me={me}
        players={[me]}
        onOpenArtifact={() => undefined}
      />,
    );

    expect(screen.getByTestId("bp_worldshield_covenant-blueprint-card")).toHaveAttribute(
      "data-blueprint-presentation",
      "card",
    );
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("renders public Ascension Deferral pressure without revealing a sealed protocol identity", () => {
    const lumii = player({
      playerId: "lumii",
      playerName: "Lumii",
    });

    render(
      <BlueprintGamePanel
        players={[lumii]}
        scenarioProtocols={[{
          protocolId: "sealed_protocol_03",
          ownerPlayerId: "lumii",
          slotIndex: 2,
          state: "ready",
          publicEffect: "A public readiness record is being kept.",
          ascensionDeferrals: 1,
        }]}
        onOpenArtifact={() => undefined}
      />,
    );

    expect(screen.getByText("SEALED PROTOCOL // 03")).toBeInTheDocument();
    expect(screen.getByText("Deferral 1/2")).toBeInTheDocument();
    expect(screen.queryByText("Ascension Registry")).not.toBeInTheDocument();
  });
});
