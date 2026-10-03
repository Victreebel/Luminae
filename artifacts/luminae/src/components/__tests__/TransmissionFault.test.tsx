import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransmissionFault } from "@/components/TransmissionFault";
import { gameAudio } from "@/lib/audio";
import { recordTelemetry } from "@/lib/telemetry";

vi.mock("@/lib/audio", () => ({
  gameAudio: { playTutorialCue: vi.fn() },
}));
vi.mock("@/lib/telemetry", () => ({ recordTelemetry: vi.fn() }));

describe("TransmissionFault", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    vi.mocked(gameAudio.playTutorialCue).mockClear();
    vi.mocked(recordTelemetry).mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("completes the boundary fault once through its guarded fallback", () => {
    const onComplete = vi.fn();
    render(<TransmissionFault variant="boundary" muted onComplete={onComplete} />);

    expect(screen.getByTestId("transmission-static-field")).toBeInTheDocument();
    expect(screen.getByTestId("transmission-scanlines")).toBeInTheDocument();
    expect(screen.getByTestId("transmission-fault-boundary")).not.toHaveTextContent("TRANSMISSION INCOMPLETE");
    expect(gameAudio.playTutorialCue).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2_000));
    expect(onComplete).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(2_000));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(recordTelemetry).toHaveBeenCalledWith("transmission_fault_presented", { variant: "boundary" });
  });

  it("reveals only the three approved Vault fragments and preserves muted support", () => {
    const onComplete = vi.fn();
    render(<TransmissionFault variant="vault" muted={false} onComplete={onComplete} />);

    expect(screen.getByTestId("transmission-fault-vault")).toHaveTextContent("BA······");
    act(() => vi.advanceTimersByTime(430));
    expect(screen.getByTestId("transmission-fault-vault")).toHaveTextContent("··SILI··");
    act(() => vi.advanceTimersByTime(430));
    expect(screen.getByTestId("transmission-fault-vault")).toHaveTextContent("·····ISK");
    expect(screen.queryByText("BASILISK")).not.toBeInTheDocument();
    expect(gameAudio.playTutorialCue).toHaveBeenCalledWith("transmission-fault");
    act(() => vi.advanceTimersByTime(2_000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
