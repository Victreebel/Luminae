import type { ComponentProps } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ForgeReplacementDealAnimation,
  REDUCED_REPLACEMENT_DEAL_DURATION_MS,
  REPLACEMENT_DEAL_DURATION_MS,
} from "@/components/ForgeReplacementDealAnimation";
import { gameAudio } from "@/lib/audio";
import { FORGE_REFILL_LOCK_MS, getForgeRefillRevealMs } from "@/lib/forgeRefillTiming";
import { DEAL_ANIM_MS, FORGE_FULL_MS } from "@/pages/game-constants";

const { useReducedMotionMock } = vi.hoisted(() => {
  // JSDOM has animation styles but no AnimationEvent constructor. Define it
  // before React loads so React listens for the standard animationend event.
  if (!("AnimationEvent" in window)) vi.stubGlobal("AnimationEvent", Event);
  return { useReducedMotionMock: vi.fn(() => false) };
});

vi.mock("framer-motion", () => ({ useReducedMotion: useReducedMotionMock }));
vi.mock("@/lib/audio", () => ({ gameAudio: { startForgeRefill: vi.fn(() => ({ reveal: vi.fn(), complete: vi.fn(), cancel: vi.fn() })) } }));

function replacementProps(
  overrides: Partial<ComponentProps<typeof ForgeReplacementDealAnimation>> = {},
): ComponentProps<typeof ForgeReplacementDealAnimation> {
  return {
    animKey: "replacement",
    cardId: "t1o01",
    tier: 1,
    deckRect: { x: 10, y: 10, w: 120, h: 80 },
    slotRect: { x: 180, y: 220, w: 120, h: 80 },
    animX: [0, 80, 170],
    animY: [0, -40, 210],
    animRotateY: [0, 90, 180],
    animScale: [1, 1, 1],
    faceScale: 1,
    cardFace: <div>Artifact artwork</div>,
    cardOverlay: <div>Artifact readout</div>,
    onComplete: vi.fn(),
    playSound: false,
    ...overrides,
  };
}

function endAnimation(element: HTMLElement, animationName: string) {
  const event = new Event("animationend", { bubbles: true });
  Object.defineProperty(event, "animationName", { value: animationName });
  fireEvent(element, event);
}

describe("ForgeReplacementDealAnimation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useReducedMotionMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("frames compact replacements and always completes", () => {
    const onComplete = vi.fn();

    render(<ForgeReplacementDealAnimation {...replacementProps({ onComplete })} />);

    expect(screen.getByTestId("forge-replacement-deal-face")).toHaveAttribute(
      "data-frame-presentation",
      "compact",
    );
    expect(screen.getByText("Artifact readout")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(REPLACEMENT_DEAL_DURATION_MS + 150);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("forms in the target slot regardless of the deck position", () => {
    render(
      <ForgeReplacementDealAnimation {...replacementProps({
        deckRect: { x: -500, y: 1500, w: 44, h: 90 },
      })} />,
    );

    expect(screen.getByTestId("forge-replacement-deal-animation")).toHaveStyle({
      position: "fixed",
      left: "180px",
      top: "220px",
      width: "120px",
      height: "80px",
    });
  });

  it("preserves the explicit compact presentation for portrait mobile molds", () => {
    render(<ForgeReplacementDealAnimation {...replacementProps({
      compact: true,
      slotRect: { x: 180, y: 220, w: 82, h: 105 },
    })} />);

    expect(screen.getByTestId("forge-replacement-deal-face")).toHaveAttribute(
      "data-frame-presentation",
      "compact",
    );
    expect(screen.getByText("Artifact readout")).toBeInTheDocument();
  });

  it("preserves an explicit full presentation regardless of mold aspect ratio", () => {
    render(<ForgeReplacementDealAnimation {...replacementProps({ compact: false })} />);

    expect(screen.getByTestId("forge-replacement-deal-face")).toHaveAttribute(
      "data-frame-presentation",
      "full-card",
    );
  });

  it("waits through a stagger before completing without an animation event", () => {
    const onComplete = vi.fn();
    const delayMs = 600;
    render(<ForgeReplacementDealAnimation {...replacementProps({ onComplete, delayMs })} />);

    act(() => {
      vi.advanceTimersByTime(REPLACEMENT_DEAL_DURATION_MS + 150);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(delayMs);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("ignores child animation events and unrelated root animations", () => {
    const onComplete = vi.fn();
    render(<ForgeReplacementDealAnimation {...replacementProps({ onComplete })} />);

    endAnimation(screen.getByText("Artifact artwork"), "forge-refill-lifecycle");
    endAnimation(screen.getByTestId("forge-replacement-deal-animation"), "decorative-glow");

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("completes once when its lifecycle ends even if the event repeats and fallback fires", () => {
    const onComplete = vi.fn();
    render(<ForgeReplacementDealAnimation {...replacementProps({ onComplete })} />);
    const root = screen.getByTestId("forge-replacement-deal-animation");

    endAnimation(root, "forge-refill-lifecycle");
    expect(onComplete).toHaveBeenCalledTimes(1);
    endAnimation(root, "forge-refill-lifecycle");
    act(() => {
      vi.advanceTimersByTime(REPLACEMENT_DEAL_DURATION_MS + 150);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("uses the latest completion callback without restarting the fallback", () => {
    const originalComplete = vi.fn();
    const latestComplete = vi.fn();
    const props = replacementProps({ onComplete: originalComplete });
    const { rerender } = render(<ForgeReplacementDealAnimation {...props} />);

    act(() => {
      vi.advanceTimersByTime(REPLACEMENT_DEAL_DURATION_MS / 2);
    });
    rerender(<ForgeReplacementDealAnimation {...props} onComplete={latestComplete} />);
    act(() => {
      vi.advanceTimersByTime(REPLACEMENT_DEAL_DURATION_MS / 2 + 150);
    });

    expect(originalComplete).not.toHaveBeenCalled();
    expect(latestComplete).toHaveBeenCalledTimes(1);
  });

  it("allows a new animation key to complete after the previous fill", () => {
    const onComplete = vi.fn();
    const props = replacementProps({ onComplete });
    const { rerender } = render(<ForgeReplacementDealAnimation {...props} />);
    endAnimation(screen.getByTestId("forge-replacement-deal-animation"), "forge-refill-lifecycle");

    rerender(<ForgeReplacementDealAnimation {...props} animKey="next-replacement" />);
    act(() => {
      vi.advanceTimersByTime(REPLACEMENT_DEAL_DURATION_MS + 150);
    });

    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it("cancels fallback completion when unmounted", () => {
    const onComplete = vi.fn();
    const { unmount } = render(<ForgeReplacementDealAnimation {...replacementProps({ onComplete })} />);

    unmount();
    act(() => {
      vi.advanceTimersByTime(REPLACEMENT_DEAL_DURATION_MS + 150);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("uses the shorter reduced-motion lifetime and preserves the stagger", () => {
    useReducedMotionMock.mockReturnValue(true);
    const onComplete = vi.fn();
    const delayMs = 300;
    render(<ForgeReplacementDealAnimation {...replacementProps({ onComplete, delayMs })} />);

    expect(screen.getByTestId("forge-replacement-deal-animation")).toHaveAttribute("data-motion", "reduced");
    act(() => {
      vi.advanceTimersByTime(REDUCED_REPLACEMENT_DEAL_DURATION_MS + 150);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(delayMs);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("keeps gameplay locked through the visual fallback and full departure", () => {
    expect(DEAL_ANIM_MS).toBe(FORGE_REFILL_LOCK_MS);
    expect(DEAL_ANIM_MS).toBeGreaterThan(REPLACEMENT_DEAL_DURATION_MS);
    expect(FORGE_FULL_MS).toBeGreaterThanOrEqual(1300 + FORGE_REFILL_LOCK_MS);
  });

  it.each([
    { reducedMotion: false, playbackRate: 1 },
    { reducedMotion: false, playbackRate: 0.5 },
    { reducedMotion: true, playbackRate: 1 },
  ])("cues audio and depletion during the fade before completion (%j)", ({ reducedMotion, playbackRate }) => {
    const onReveal = vi.fn();
    const onComplete = vi.fn();
    const props = replacementProps({ playSound: true, delayMs: 240, reducedMotion, playbackRate, onReveal, onComplete });
    const { unmount } = render(<ForgeReplacementDealAnimation {...props} />);
    const durationMs = (reducedMotion ? REDUCED_REPLACEMENT_DEAL_DURATION_MS : REPLACEMENT_DEAL_DURATION_MS) / playbackRate;
    expect(gameAudio.startForgeRefill).toHaveBeenCalledWith({ durationMs, delayMs: 240 });
    const sound = vi.mocked(gameAudio.startForgeRefill).mock.results[0].value;
    act(() => { vi.advanceTimersByTime(240 + getForgeRefillRevealMs(durationMs, reducedMotion) - 1); });
    expect(sound.reveal).not.toHaveBeenCalled();
    expect(onReveal).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(sound.reveal).toHaveBeenCalledTimes(1);
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(sound.complete).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    endAnimation(screen.getByTestId("forge-replacement-deal-animation"), "forge-refill-lifecycle");
    endAnimation(screen.getByTestId("forge-replacement-deal-animation"), "forge-refill-lifecycle");
    expect(sound.reveal).toHaveBeenCalledTimes(1);
    expect(sound.complete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    unmount();
    expect(sound.cancel).toHaveBeenCalledTimes(1);
  });

  it("cancels an interrupted swell without playing a completion chime", () => {
    const onReveal = vi.fn();
    const { unmount } = render(<ForgeReplacementDealAnimation {...replacementProps({ playSound: true, onReveal })} />);
    const sound = vi.mocked(gameAudio.startForgeRefill).mock.results[0].value;
    unmount();
    act(() => { vi.advanceTimersByTime(FORGE_REFILL_LOCK_MS); });
    expect(sound.complete).not.toHaveBeenCalled();
    expect(sound.reveal).not.toHaveBeenCalled();
    expect(onReveal).not.toHaveBeenCalled();
    expect(sound.cancel).toHaveBeenCalledTimes(1);
  });

  it("does not postpone completion when preview sound is disabled midway", () => {
    const props = replacementProps({ playSound: true });
    const { rerender } = render(<ForgeReplacementDealAnimation {...props} />);
    const sound = vi.mocked(gameAudio.startForgeRefill).mock.results[0].value;
    act(() => { vi.advanceTimersByTime(1000); });
    rerender(<ForgeReplacementDealAnimation {...props} playSound={false} />);
    act(() => { vi.advanceTimersByTime(FORGE_REFILL_LOCK_MS - 1000); });
    expect(sound.cancel).toHaveBeenCalledTimes(1);
    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });

  it("uses the latest reveal callback without restarting or replaying the cue", () => {
    const originalReveal = vi.fn();
    const latestReveal = vi.fn();
    const props = replacementProps({ onReveal: originalReveal });
    const { rerender } = render(<ForgeReplacementDealAnimation {...props} />);
    act(() => { vi.advanceTimersByTime(500); });
    rerender(<ForgeReplacementDealAnimation {...props} onReveal={latestReveal} />);
    act(() => { vi.advanceTimersByTime(getForgeRefillRevealMs(REPLACEMENT_DEAL_DURATION_MS) - 500); });
    expect(originalReveal).not.toHaveBeenCalled();
    expect(latestReveal).toHaveBeenCalledOnce();
    endAnimation(screen.getByTestId("forge-replacement-deal-animation"), "forge-refill-lifecycle");
    expect(latestReveal).toHaveBeenCalledOnce();
    rerender(<ForgeReplacementDealAnimation {...props} animKey="next" onReveal={latestReveal} />);
    act(() => { vi.advanceTimersByTime(getForgeRefillRevealMs(REPLACEMENT_DEAL_DURATION_MS)); });
    expect(latestReveal).toHaveBeenCalledTimes(2);
  });

  it("attaches inside the live slot and resizes without restarting completion", () => {
    let measure: () => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { measure = callback; }
      observe() {}
      unobserve() {}
      disconnect = disconnect;
    });
    const slot = document.createElement("div");
    slot.dataset.slotKey = "1-0";
    let width = 103;
    Object.defineProperty(slot, "clientWidth", { get: () => width });
    Object.defineProperty(slot, "clientHeight", { get: () => 147 });
    document.body.append(slot);
    const props = replacementProps({ targetSlotKey: "1-0" });
    const { unmount } = render(<ForgeReplacementDealAnimation {...props} />);
    const effect = screen.getByTestId("forge-replacement-deal-animation");
    expect(effect.parentElement).toBe(slot);
    expect(effect).toHaveStyle({ position: "absolute", left: "0px", top: "0px", width: "100%", height: "100%" });
    expect(effect.style.getPropertyValue("--card-w")).toBe("97px");
    act(() => { vi.advanceTimersByTime(1000); });
    width = 120;
    act(() => { measure(); });
    expect(effect.style.getPropertyValue("--card-w")).toBe("114px");
    act(() => { vi.advanceTimersByTime(FORGE_REFILL_LOCK_MS - 1000); });
    expect(props.onComplete).toHaveBeenCalledTimes(1);
    unmount();
    expect(disconnect).toHaveBeenCalled();
    slot.remove();
  });

  it("does not leave a floating overlay when its live slot disappears", async () => {
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    const slot = document.createElement("div");
    slot.dataset.slotKey = "2-1";
    document.body.append(slot);
    render(<ForgeReplacementDealAnimation {...replacementProps({ targetSlotKey: "2-1" })} />);
    expect(screen.getByTestId("forge-replacement-deal-animation").parentElement).toBe(slot);
    await act(async () => { slot.remove(); });
    expect(screen.queryByTestId("forge-replacement-deal-animation")).not.toBeInTheDocument();
  });
});
