import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScenarioProtocolEvent } from "@workspace/api-client-react";
import { ScenarioProtocolPresentationOverlay } from "./ScenarioProtocolPresentationOverlay";

vi.mock("./AntimatterDetonationAnimation", () => ({
  AntimatterDetonationAnimation: ({
    identityRedacted,
    card,
  }: {
    identityRedacted?: boolean;
    card: { name: string };
  }) => (
    <div
      data-testid="redacted-annihilation"
      data-identity-redacted={identityRedacted || undefined}
    >
      {card.name}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function event(
  slotIndex: 0 | 1 | 2,
  kind: "manifestation" | "effect",
): ScenarioProtocolEvent {
  const protocolId = [
    "sealed_protocol_01",
    "sealed_protocol_02",
    "sealed_protocol_03",
  ][slotIndex] as ScenarioProtocolEvent["protocolId"];
  return {
    eventId: `${protocolId}-${kind}`,
    protocolId,
    ownerPlayerId: "lumii",
    slotIndex,
    kind,
    publicEffect: "A public consequence without a Blueprint identity.",
    ...(kind === "effect" ? {
      triggeringPlayerId: slotIndex === 1 ? "lumii" : "architect",
      targetCardId: "target",
      targetArtifact: {
        id: "target",
        name: "Public Target",
        tier: slotIndex === 1 ? 3 : 2,
        bonusAffinity: "radiance",
        eminence: 2,
        cost: { flare: 0, continuum: 1, verdance: 0, abyss: 0, radiance: 1, singularity: 0 },
        flavor: "Visible public information.",
      },
      ...(slotIndex === 0 ? { trigger: "forged" as const, hostileEffect: "annihilation" as const } : {}),
      ...(slotIndex === 2 ? { hostileEffect: "burn" as const, intercepted: true } : {}),
    } : {}),
    createdAt: 1,
  };
}

describe("Lumii sealed protocol presentations", () => {
  it.each([
    [0, "collapse"],
    [1, "ascent"],
    [2, "bastion"],
  ] as const)("uses the protocol %s manifestation profile", (slotIndex, profile) => {
    const view = render(
      <ScenarioProtocolPresentationOverlay
        event={event(slotIndex, "manifestation")}
        reducedMotion
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("data-profile", profile);
    expect(screen.getByText(`SEALED PROTOCOL // 0${slotIndex + 1}`)).toBeInTheDocument();
    expect(view.container.textContent).not.toMatch(/Antimatter|Mantle-to-Orbit|Worldshield/);
  });

  it("runs the full annihilation motion with its device identity redacted", async () => {
    render(
      <ScenarioProtocolPresentationOverlay
        event={event(0, "effect")}
        reducedMotion
        onComplete={vi.fn()}
      />,
    );

    expect(await screen.findByTestId("redacted-annihilation"))
      .toHaveAttribute("data-identity-redacted", "true");
    expect(screen.getByText("SEALED PROTOCOL // 01")).toBeInTheDocument();
  });

  it("shows the exact Foundry reduction without naming its Blueprint", () => {
    const view = render(
      <ScenarioProtocolPresentationOverlay
        event={event(1, "effect")}
        reducedMotion
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByText("TIER III FORGE COST REDUCED BY 3")).toBeInTheDocument();
    expect(view.container.textContent).not.toContain("Mantle-to-Orbit");
  });

  it("renders the defensive interception as the bastion profile", () => {
    render(
      <ScenarioProtocolPresentationOverlay
        event={event(2, "effect")}
        reducedMotion
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("data-profile", "bastion");
    expect(screen.getByText("HOSTILE CONSEQUENCE INTERCEPTED")).toBeInTheDocument();
  });
});
