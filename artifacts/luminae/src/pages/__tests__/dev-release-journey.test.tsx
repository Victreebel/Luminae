import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import DevReleaseJourney from "../dev-release-journey";

describe("release journey review console", () => {
  beforeAll(() => {
    vi.stubGlobal("__LUMINAE_BUILD_LABEL__", "test-build");
    vi.stubGlobal("__LUMINAE_BUILD_STAMP__", "test-stamp");
  });

  it("teaches the audit loop and exposes the complete launch journey", () => {
    render(<DevReleaseJourney />);

    expect(screen.getByRole("heading", { name: "Three-minute audit tutorial" })).toBeInTheDocument();
    expect(screen.getByText("Play as a new customer")).toBeInTheDocument();
    expect(screen.getByText("Tell Codex naturally")).toBeInTheDocument();
    expect(screen.getByText("The Trace")).toBeInTheDocument();
    expect(screen.getByText("The Recurrence")).toBeInTheDocument();
    expect(screen.getByText("The Triangulation")).toBeInTheDocument();
    expect(screen.getByText("The Threshold and Defense Forecast")).toBeInTheDocument();
    expect(screen.getByText("Stable post-Lumii Vault hub")).toBeInTheDocument();
  });
});
