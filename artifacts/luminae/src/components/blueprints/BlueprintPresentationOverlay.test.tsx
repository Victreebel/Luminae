import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GamePlayerState } from "@workspace/api-client-react";
import type { BlueprintManifestationEvent } from "@workspace/game-types";
import { BlueprintPresentationOverlay } from "./BlueprintPresentationOverlay";

const { playBlueprintManifestationCue } = vi.hoisted(() => ({
  playBlueprintManifestationCue: vi.fn(),
}));

vi.mock("@/lib/audio", () => ({
  gameAudio: { playBlueprintManifestationCue },
}));

const players = [{
  playerId: "p1",
  playerName: "Architect",
}] as GamePlayerState[];

function manifestation(blueprintId: BlueprintManifestationEvent["blueprintId"]): BlueprintManifestationEvent {
  return {
    eventId: `manifest-${blueprintId}`,
    blueprintId,
    ownerPlayerId: "p1",
    slotIndex: 0,
    presentationVariant: "armored",
    createdAt: 1,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BlueprintPresentationOverlay", () => {
  it("gives the Mantle-to-Orbit Foundry a distinct launch presentation and cue", () => {
    render(
      <BlueprintPresentationOverlay
        manifestation={manifestation("bp_mantle_to_orbit_foundry")}
        players={players}
        reducedMotion={false}
        onComplete={() => undefined}
      />,
    );

    expect(screen.getByTestId("foundry-manifestation")).toBeInTheDocument();
    expect(screen.getByText("Industrial chain online")).toBeInTheDocument();
    expect(playBlueprintManifestationCue).toHaveBeenCalledWith(
      "bp_mantle_to_orbit_foundry",
      { reducedMotion: false },
    );
  });

  it("gives Worldshield Covenant a distinct reduced-motion presentation and cue", () => {
    render(
      <BlueprintPresentationOverlay
        manifestation={manifestation("bp_worldshield_covenant")}
        players={players}
        reducedMotion
        onComplete={() => undefined}
      />,
    );

    expect(screen.getByTestId("worldshield-manifestation")).toBeInTheDocument();
    expect(screen.getByText("Covenant network established")).toBeInTheDocument();
    expect(playBlueprintManifestationCue).toHaveBeenCalledWith(
      "bp_worldshield_covenant",
      { reducedMotion: true },
    );
  });
});
