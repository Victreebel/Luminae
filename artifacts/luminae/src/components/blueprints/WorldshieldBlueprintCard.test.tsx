import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorldshieldBlueprintCard } from "./WorldshieldBlueprintCard";

describe("WorldshieldBlueprintCard", () => {
  it("presents the three-part defensive Covenant and its automatic effect", () => {
    render(<WorldshieldBlueprintCard matchedSockets={1} />);

    expect(
      screen.getByAltText(
        "The Worldshield Covenant spanning an inhabited planet as it intercepts a hostile strike",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /^Open .* component record$/ }),
    ).toHaveLength(3);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText(/Prevent the first hostile effect/)).toBeInTheDocument();
  });

  it("opens complete component information from the shield artwork", async () => {
    render(<WorldshieldBlueprintCard />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open Entropy Veil component record",
      }),
    );

    const panel = await screen.findByTestId("worldshield-component-panel");
    expect(within(panel).getByText("Entropy Veil")).toBeInTheDocument();
    expect(within(panel).getByText("Controlled decay masking")).toBeInTheDocument();
    expect(within(panel).getByText("Required")).toBeInTheDocument();
  });

  it("shows a public vigilant device after manifestation", () => {
    render(<WorldshieldBlueprintCard state="manifested" />);

    expect(screen.getByText("Vigilant")).toBeInTheDocument();
    expect(screen.getByText("Public Worldshield")).toBeInTheDocument();
  });
});
