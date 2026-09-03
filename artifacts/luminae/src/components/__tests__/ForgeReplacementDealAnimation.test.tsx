import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ForgeReplacementDealAnimation,
  REPLACEMENT_DEAL_DURATION_MS,
} from "@/components/ForgeReplacementDealAnimation";

describe("ForgeReplacementDealAnimation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("frames compact replacements and always completes", () => {
    const onComplete = vi.fn();

    render(
      <ForgeReplacementDealAnimation
        animKey="replacement"
        cardId="t1o01"
        tier={1}
        deckRect={{ x: 10, y: 10, w: 120, h: 80 }}
        slotRect={{ x: 180, y: 220, w: 120, h: 80 }}
        animX={[0, 80, 170]}
        animY={[0, -40, 210]}
        animRotateY={[0, 90, 180]}
        animScale={[1, 1, 1]}
        faceScale={1}
        cardFace={<div>Artifact artwork</div>}
        cardOverlay={<div>Artifact readout</div>}
        onComplete={onComplete}
      />,
    );

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
});
