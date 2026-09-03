import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AntimatterBlueprintCard } from "./AntimatterBlueprintCard";

describe("AntimatterBlueprintCard", () => {
  it("shows the manifested device and opens a component dossier from each likeness", async () => {
    render(<AntimatterBlueprintCard matchedSockets={3} />);

    expect(
      screen.getByAltText("The Antimatter Detonator suspended above a planet"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Horizon Extractor component record" }));

    const panel = await screen.findByTestId("antimatter-component-panel");
    expect(within(panel).getByText("Horizon Extractor")).toBeInTheDocument();
    expect(within(panel).getByText("1 Abyss Artifact")).toBeInTheDocument();
    expect(within(panel).getByText("Required")).toBeInTheDocument();
  });

  it("separates Causal Spark Coil affinity from its protocol form and exposes its lore", async () => {
    render(<AntimatterBlueprintCard />);

    fireEvent.click(screen.getByRole("button", { name: "Open Causal Spark Coil component record" }));

    const panel = await screen.findByTestId("antimatter-component-panel");
    expect(within(panel).getByText("Flare")).toBeInTheDocument();
    expect(
      within(panel).getByText("Control Instrument / Protocol Object"),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(/Before it fires, it asks what will happen three steps later/),
    ).toBeInTheDocument();
  });

  it("uses artwork hotspots as the card's only component controls", async () => {
    render(<AntimatterBlueprintCard presentation="card" />);

    expect(screen.getByTestId("antimatter-blueprint-card")).toHaveAttribute(
      "data-blueprint-presentation",
      "card",
    );
    expect(
      screen.getAllByRole("button", { name: /^Open .* component record$/ }),
    ).toHaveLength(4);
    expect(screen.getByText("Effect")).toBeInTheDocument();
    expect(
      screen.getByText(
        "A random Tier II Artifact becomes secretly marked. When Forged or Encrypted, Annihilate it. Gain 2 Eminence.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Broken Covenant")).not.toBeInTheDocument();
    expect(screen.queryByText(/Forger's Tier I Artifacts/)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open Magnetic Bottle component record",
      }),
    );

    expect(await screen.findByTestId("antimatter-component-panel")).toBeInTheDocument();
  });

  it("keeps the Tier II target and reward in the effect without duplicate summary cells", () => {
    render(<AntimatterBlueprintCard presentation="card" state="manifested" />);

    expect(screen.getByText(/A random Tier II Artifact becomes secretly marked/)).toBeInTheDocument();
    expect(screen.getByText("Armed")).toBeInTheDocument();
    expect(screen.queryByText("Random Tier II")).not.toBeInTheDocument();
    expect(screen.queryByText("+2 Eminence")).not.toBeInTheDocument();
  });

  it("documents the Tier II mark without revealing the intact Covenant clause", () => {
    render(<AntimatterBlueprintCard state="manifested" />);

    expect(screen.getByText(/A random Tier II Artifact becomes secretly marked/)).toBeInTheDocument();
    expect(screen.queryByText("Broken Covenant")).not.toBeInTheDocument();
  });

  it("reveals the Covenant consequence only after the broken state is declared", () => {
    const { rerender } = render(
      <AntimatterBlueprintCard presentation="card" covenantBroken />,
    );

    expect(screen.getByText("Broken Covenant")).toBeInTheDocument();
    expect(
      screen.getByText("Annihilate 2 of the Forger's Tier I Artifacts as well."),
    ).toBeInTheDocument();

    rerender(<AntimatterBlueprintCard state="manifested" covenantBroken />);
    expect(screen.getByText("Broken Covenant")).toBeInTheDocument();
  });
});
