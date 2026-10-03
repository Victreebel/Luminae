import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VictoryCinematic } from "@/components/VictoryCinematic";

vi.mock("@/components/KardashevScene", () => ({
  KardashevScene: () => <div data-testid="victory-civilization-scene" />,
}));

const baseProps = {
  winnerName: "Aurelia",
  isLocalWinner: true,
  isSpectator: false,
  civName: "The Radiant Compact",
  tier: 2 as const,
  palette: {
    primary: "#f4cf78",
    secondary: "#5b431b",
    accent: "#fff1b8",
  },
  eminence: 22,
  cardsForged: 9,
  accolades: [],
  onDismiss: vi.fn(),
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("VictoryCinematic Legacy hierarchy", () => {
  it("uses a singular Absolute Victory presentation when one player earns both titles", () => {
    render(
      <VictoryCinematic
        {...baseProps}
        legacyWinnerName="Aurelia"
        isLocalLegacyWinner
        isAbsoluteVictory
        legacyCompletedCriteria={4}
        legacyRequiredCriteria={4}
      />,
    );

    expect(screen.getByRole("heading", { name: "Absolute Victory" })).toBeInTheDocument();
    expect(screen.getByText("Legacy")).toBeInTheDocument();
    expect(screen.queryByLabelText("Legacy Victory: Aurelia")).not.toBeInTheDocument();
  });

  it("keeps a different Legacy Victor in a secondary laureate panel", () => {
    render(
      <VictoryCinematic
        {...baseProps}
        legacyWinnerName="Nysa"
        legacyCompletedCriteria={4}
        legacyRequiredCriteria={4}
      />,
    );

    expect(screen.getByRole("heading", { name: "Victory" })).toBeInTheDocument();
    expect(screen.getByLabelText("Legacy Victory: Nysa")).toBeInTheDocument();
  });

  it("acknowledges a local Legacy Victory without replacing the Eminence victor", () => {
    render(
      <VictoryCinematic
        {...baseProps}
        isLocalWinner={false}
        legacyWinnerName="Stargazer"
        isLocalLegacyWinner
        legacyCompletedCriteria={4}
        legacyRequiredCriteria={4}
      />,
    );

    expect(screen.getByRole("heading", { name: "Legacy Victory" })).toBeInTheDocument();
    expect(screen.getByText("Aurelia claimed the Eminence Victory")).toBeInTheDocument();
    expect(screen.getByLabelText("Legacy Victory: Stargazer")).toBeInTheDocument();
  });
});
