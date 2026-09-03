import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_ARCHIVE_PRESENTATION,
  getArchivePresentation,
  setArchivePresentation,
} from "@/lib/archivePresentation";
import { ArchiveVessel } from "@/pages/game-board-forge-deck";

describe("Archive presentation preference", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("defaults to the crystal presentation", () => {
    expect(getArchivePresentation()).toBe(DEFAULT_ARCHIVE_PRESENTATION);

    const { container } = render(<ArchiveVessel tier={1} remaining={30} />);
    const archive = container.querySelector(".archive-vessel");

    expect(archive).toHaveAttribute("data-archive-presentation", "crystal");
    expect(container.querySelector(".archive-vessel__crystal")).not.toBeNull();
    expect(container.querySelector(".archive-vessel__card-stack")).toBeNull();
  });

  it("can show a physical tier card stack without changing Archive state", () => {
    setArchivePresentation("cards");

    const { container } = render(<ArchiveVessel tier={2} remaining={7} />);
    const archive = container.querySelector(".archive-vessel");

    expect(getArchivePresentation()).toBe("cards");
    expect(archive).toHaveAttribute("data-archive-presentation", "cards");
    expect(archive).toHaveAttribute("data-archive-state", "low");
    expect(container.querySelector(".archive-vessel__card-stack svg")).not.toBeNull();
    expect(container.querySelector(".archive-vessel__crystal")).toBeNull();
  });
});
