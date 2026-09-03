import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AscensionRegistryBlueprintCard } from "./AscensionRegistryBlueprintCard";

describe("AscensionRegistryBlueprintCard", () => {
  it("presents the three-part public institution and exact judgment rule", () => {
    render(<AscensionRegistryBlueprintCard matchedSockets={1} />);

    expect(screen.getAllByRole("button", { name: /^Open .* component record$/ }))
      .toHaveLength(3);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText(/At 2, gain 2 Eminence and become Spent/)).toBeInTheDocument();
  });

  it("opens complete component information from its artwork", async () => {
    render(<AscensionRegistryBlueprintCard />);
    fireEvent.click(screen.getByRole("button", {
      name: "Open Null-Loop Anchor component record",
    }));

    const panel = await screen.findByTestId("ascension-registry-component-panel");
    expect(within(panel).getByText("Null-Loop Anchor")).toBeInTheDocument();
    expect(within(panel).getByText("Recursive delay boundary")).toBeInTheDocument();
    expect(within(panel).getByText("Required")).toBeInTheDocument();
  });

  it("shows the manifested Registry as public and Active", () => {
    render(<AscensionRegistryBlueprintCard state="manifested" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Public Registry")).toBeInTheDocument();
  });
});
