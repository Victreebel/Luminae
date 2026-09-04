import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MantleToOrbitBlueprintCard } from "./MantleToOrbitBlueprintCard";

describe("MantleToOrbitBlueprintCard", () => {
  it("keeps the Forge effect concise and the Covenant details on the reverse", () => {
    render(<MantleToOrbitBlueprintCard />);

    expect(
      screen.getByAltText(
        "The Mantle-to-Orbit Foundry connecting a planetary mantle furnace to an orbital fabrication ring",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /^Open .* component record$/ }),
    ).toHaveLength(3);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Twice, Foundry Forge a face-up Tier II Artifact/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Foundry storage does not consume ordinary Encryption capacity/),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show Blueprint components" }));

    expect(screen.getByText(/Intact Covenant: paid re-Forge/)).toBeInTheDocument();
    expect(screen.getByText(/Broken Covenant: free recovery/)).toBeInTheDocument();
    expect(
      screen.getByText(/Foundry storage does not consume ordinary Encryption capacity/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/divided as you choose/i),
    ).not.toBeInTheDocument();
  });

  it("opens the corresponding component record from the artwork", async () => {
    render(<MantleToOrbitBlueprintCard matchedSockets={2} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open Blackglass Forge Die component record",
      }),
    );

    const panel = await screen.findByTestId("mantle-to-orbit-component-panel");
    expect(within(panel).getByText("Blackglass Forge Die")).toBeInTheDocument();
    expect(
      within(panel).getByText("1 Tier I Abyss Fabrication Tool"),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Required")).toBeInTheDocument();
    expect(within(panel).getByText("Tier I")).toBeInTheDocument();
  });

  it("shows every component as matched after manifestation", async () => {
    render(<MantleToOrbitBlueprintCard state="manifested" />);

    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Public Foundry")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open Entropy Pyre Baffle component record",
      }),
    );

    const panel = await screen.findByTestId("mantle-to-orbit-component-panel");
    expect(within(panel).getByText("Matched")).toBeInTheDocument();
  });
});
