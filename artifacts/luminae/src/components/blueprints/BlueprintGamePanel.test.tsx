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
