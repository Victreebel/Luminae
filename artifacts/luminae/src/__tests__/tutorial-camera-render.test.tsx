import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TutorialDirector,
  getAffinityDeliverySoundDelay,
} from "@/components/tutorial/TutorialDirector";
import { BEAT_INDEX } from "@/lib/tutorialData";

const audioSpies = vi.hoisted(() => ({
  playAffinityDelivery: vi.fn(),
}));

vi.mock("@/contexts/AccountContext", () => ({
  useAccount: () => ({ account: null, token: null, isLoading: false }),
}));

vi.mock("@/lib/audio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/audio")>();
  return {
    ...actual,
    gameAudio: new Proxy({}, {
      get: (_target, property) => {
        if (property === "isMuted") return () => true;
        if (property === "playAffinityDelivery") return audioSpies.playAffinityDelivery;
        return () => undefined;
      },
    }),
  };
});

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

function mediaQueryMatches(query: string): boolean {
  if (query.includes("prefers-reduced-motion")) return true;
  return query.split(",").some((candidate) => {
    const part = candidate.trim();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const maxWidth = part.match(/max-width:\s*(\d+)px/);
    const minWidth = part.match(/min-width:\s*(\d+)px/);
    const maxHeight = part.match(/max-height:\s*(\d+)px/);
    const minHeight = part.match(/min-height:\s*(\d+)px/);
    if (maxWidth && width > Number(maxWidth[1])) return false;
    if (minWidth && width < Number(minWidth[1])) return false;
    if (maxHeight && height > Number(maxHeight[1])) return false;
    if (minHeight && height < Number(minHeight[1])) return false;
    if (part.includes("orientation: landscape") && width <= height) return false;
    if (part.includes("orientation: portrait") && width > height) return false;
    return true;
  });
}

beforeEach(() => {
  localStorage.clear();
  audioSpies.playAffinityDelivery.mockClear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: mediaQueryMatches(query),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
});

describe("rendered tutorial camera", () => {
  it("shows the Forge alone for a required phone action", () => {
    setViewport(320, 568);
    const { container } = render(<TutorialDirector startBeat={BEAT_INDEX.b8_first_harness} />);
    const shell = container.querySelector<HTMLElement>("[data-tutorial-gameplay='true']");
    const secondary = container.querySelector<HTMLElement>(".tutorial-secondary-board");

    expect(shell).toHaveAttribute("data-tutorial-camera", "static");
    expect(shell).toHaveAttribute("data-tutorial-surface", "forge");
    expect(secondary).toHaveAttribute("hidden");
    expect(shell?.querySelectorAll("[data-lumii-presence]")).toHaveLength(1);
    expect(shell?.querySelector("[data-tutorial-pointer-zone='well']")).toBeTruthy();
  });

  it("swaps the phone surface to the Luminary signal without scrolling", () => {
    setViewport(844, 390);
    const { container } = render(<TutorialDirector startBeat={BEAT_INDEX.b15b_luminary_signal} />);
    const shell = container.querySelector<HTMLElement>("[data-tutorial-gameplay='true']");
    const forge = container.querySelector<HTMLElement>(".board-forge");
    const secondary = container.querySelector<HTMLElement>(".tutorial-secondary-board");

    expect(shell).toHaveAttribute("data-tutorial-camera", "static");
    expect(shell).toHaveAttribute("data-tutorial-surface", "luminary");
    expect(forge).toHaveAttribute("hidden");
    expect(secondary).not.toHaveAttribute("hidden");
    expect(container.querySelector("[data-tutorial-luminary-target]")).toBeTruthy();
    expect(container).toHaveTextContent("Verdant Oracle");
    expect(container).toHaveTextContent("4 / 5 Verdance to awaken");
  });

  it("uses the scrolling Well camera for the desktop Eminence lesson", () => {
    setViewport(1440, 900);
    const { container } = render(<TutorialDirector startBeat={BEAT_INDEX.b14_win_condition} />);
    const shell = container.querySelector<HTMLElement>("[data-tutorial-gameplay='true']");
    const dialogue = container.querySelector<HTMLElement>(".tutorial-dialogue");

    expect(shell).toHaveAttribute("data-tutorial-camera", "scrolling");
    expect(dialogue).toHaveAttribute("data-camera-focus", "well");
    expect(shell?.querySelector("[data-tutorial-pointer-zone='eminence']")).toBeTruthy();
  });

  it("keeps the final phone Forge card actionable after Lumii's delivery", async () => {
    setViewport(320, 568);
    const { container } = render(<TutorialDirector startBeat={BEAT_INDEX.b16_final_forge} />);
    const firstLine = await screen.findByText((_content, element) => (
      element?.classList.contains("tutorial-dialogue-text") === true
      && element.textContent === "I'll supply 4 Continuum. Your permanent bonus covers the fifth cost."
    ));
    fireEvent.click(firstLine.closest<HTMLElement>(".tutorial-dialogue-card")!);

    await waitFor(() => {
      expect(container.querySelectorAll("[data-lumii-presence]")).toHaveLength(1);
      expect(audioSpies.playAffinityDelivery).toHaveBeenCalledTimes(4);
    });
    expect(audioSpies.playAffinityDelivery.mock.calls).toEqual([
      ["continuum", 0, 4],
      ["continuum", 1, 4],
      ["continuum", 2, 4],
      ["continuum", 3, 4],
    ]);

    const card = await screen.findByRole(
      "button",
      { name: /Epoch Graft Ledger, Tier 2 Artifact/ },
      { timeout: 3_000 },
    );
    await waitFor(() => expect(card).toHaveAttribute("data-affordable", "true"));
    fireEvent.click(card);

    const sheet = await screen.findByRole("dialog", { name: "Artifact actions" });
    expect(within(sheet).getByRole("button", { name: /^FORGE/i })).toBeEnabled();
    expect(container.querySelector("[data-tutorial-surface='forge']")).toBeInTheDocument();
  });

  it("locks delivery sounds to the normal and reduced-motion landing beats", () => {
    expect([0, 1, 2, 3].map(index => getAffinityDeliverySoundDelay(index))).toEqual([
      1120, 1240, 1360, 1480,
    ]);
    expect([0, 1, 2, 3].map(index => getAffinityDeliverySoundDelay(index, true))).toEqual([
      32, 44, 56, 68,
    ]);
  });
});
