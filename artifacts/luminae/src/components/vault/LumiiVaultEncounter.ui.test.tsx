import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GameState } from "@workspace/api-client-react";
import { DEFAULT_VICTORY_REQUIREMENT } from "@workspace/game-types";
import { outOfGameAudio } from "@/lib/outOfGameAudio";
import { LumiiEncounterHud, LumiiVaultEncounter } from "./LumiiVaultEncounter";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function makeHudState(): GameState {
  return {
    startedAt: "test-start",
    version: 1,
    victoryRequirement: DEFAULT_VICTORY_REQUIREMENT,
    players: [
      {
        playerId: "player",
        playerName: "Architect",
        isAi: false,
        eminence: 0,
        forgedArtifacts: [],
      },
      {
        playerId: "lumii",
        playerName: "Lumii",
        isAi: true,
        eminence: 0,
        forgedArtifacts: [],
      },
    ],
  } as GameState;
}

describe("Lumii Vault encounter interactions", () => {
  it("labels the HUD pressure meter instead of showing an unlabeled numeric ratio", () => {
    const view = render(
      <LumiiEncounterHud
        state={makeHudState()}
        localPlayerId="player"
        suppressed
        placement="docked"
      />,
    );

    expect(screen.getByText("Forecast Pressure")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Forecast Pressure" })).toHaveAttribute("aria-valuenow", "0");
    expect(view.container.textContent).not.toContain("0/0");
    expect(view.container.textContent).not.toContain("0 / 0");
  });

  it("changes Lumii's central orb from white to red when she becomes combative", () => {
    const warning = render(
      <LumiiVaultEncounter
        controlledPhase="approach"
        previewViewport="desktop"
        muted
        forceReducedMotion
      />,
    );

    expect(warning.container.querySelector('[data-lumii-core="white"]')).toBeInTheDocument();
    expect(warning.container.querySelector('[data-lumii-core="red"]')).not.toBeInTheDocument();
    warning.unmount();

    const combative = render(
      <LumiiVaultEncounter
        controlledPhase="hostile"
        previewViewport="desktop"
        muted
        forceReducedMotion
      />,
    );

    expect(combative.container.querySelector('[data-lumii-core="red"]')).toBeInTheDocument();
    expect(combative.container.querySelector('[data-lumii-core="white"]')).not.toBeInTheDocument();
  });

  it("retargets the Threshold score according to cinematic stakes", () => {
    const startScore = vi
      .spyOn(outOfGameAudio, "startLumiiThresholdScore")
      .mockReturnValue(true);
    const stopScore = vi
      .spyOn(outOfGameAudio, "stopLumiiThresholdScore")
      .mockReturnValue(true);

    const view = render(
      <LumiiVaultEncounter
        controlledPhase="expanding"
        previewViewport="desktop"
        muted={false}
        forceReducedMotion
      />,
    );

    expect(startScore).toHaveBeenLastCalledWith("awe");
    view.rerender(
      <LumiiVaultEncounter
        controlledPhase="hostile"
        previewViewport="desktop"
        muted={false}
        forceReducedMotion
      />,
    );
    expect(startScore).toHaveBeenLastCalledWith("hostile");
    view.rerender(
      <LumiiVaultEncounter
        controlledPhase="reward"
        previewViewport="desktop"
        muted={false}
        forceReducedMotion
      />,
    );
    expect(startScore).toHaveBeenLastCalledWith("release");

    view.unmount();
    expect(stopScore).toHaveBeenCalled();
  });

  it("reveals Lumii replies one sentence at a time", async () => {
    vi.useFakeTimers();
    render(
      <LumiiVaultEncounter
        controlledPhase="dialogue"
        previewViewport="desktop"
        thresholdApproach="kinship"
        muted
        forceReducedMotion
      />,
    );

    expect(screen.getByText("I don't know how to name it.")).toBeInTheDocument();
    expect(screen.queryByText("I only know I am afraid I may stop being afraid.")).not.toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("I only know I am afraid I may stop being afraid.")).toBeInTheDocument();
  });

  it("advances a guarded static phase with one click", () => {
    vi.useFakeTimers();
    const onPhaseChange = vi.fn();
    render(
      <LumiiVaultEncounter
        controlledPhase="cipher-collapse"
        previewViewport="desktop"
        muted
        forceReducedMotion
        onPhaseChange={onPhaseChange}
      />,
    );
    const encounter = screen.getByRole("dialog", { name: "Lumii Vault encounter" });

    fireEvent.click(encounter);
    expect(onPhaseChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(90));
    fireEvent.click(encounter);
    expect(onPhaseChange).toHaveBeenCalledWith("cipher-inert");
  });

  it("records an exclusive approach before entering its dialogue", async () => {
    const onChooseApproach = vi.fn().mockResolvedValue(undefined);
    const onPhaseChange = vi.fn();
    render(
      <LumiiVaultEncounter
        controlledPhase="approach"
        previewViewport="desktop"
        muted
        onChooseApproach={onChooseApproach}
        onPhaseChange={onPhaseChange}
      />,
    );

    expect(screen.getByText("Architect.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /kinship|inquiry|dominion/i })).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Lumii, what are you afraid of?" }));
    });
    expect(onChooseApproach).toHaveBeenCalledWith("kinship");
    expect(onPhaseChange).toHaveBeenCalledWith("dialogue");
  });

  it("keeps Leave it sealed at every Inquiry question", () => {
    const onPhaseChange = vi.fn();
    render(
      <LumiiVaultEncounter
        controlledPhase="dialogue"
        previewViewport="desktop"
        thresholdApproach="inquiry"
        muted
        onPhaseChange={onPhaseChange}
      />,
    );

    expect(screen.getByText("A Basilisk.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Leave it sealed/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "What does it do to the one who understands?" }));
    expect(screen.getByText("It removes the instinct to turn away.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Leave it sealed/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "A warning against knowledge itself?" }));
    expect(screen.getByText("No.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Leave it sealed/i }));
    expect(onPhaseChange).toHaveBeenCalledWith("leaving");
  });

  it("records the complete response path and restores its exact dialogue node", async () => {
    vi.useFakeTimers();
    const onRecordDialoguePath = vi.fn().mockResolvedValue(undefined);
    const view = render(
      <LumiiVaultEncounter
        controlledPhase="dialogue"
        previewViewport="desktop"
        thresholdApproach="inquiry"
        muted
        onRecordDialoguePath={onRecordDialoguePath}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "What does it do to the one who understands?" }));
    });
    expect(onRecordDialoguePath).toHaveBeenLastCalledWith(["inquiry-warning"]);
    view.unmount();

    render(
      <LumiiVaultEncounter
        controlledPhase="dialogue"
        previewViewport="desktop"
        thresholdApproach="inquiry"
        dialoguePath={["inquiry-warning", "inquiry-warning-against"]}
        muted
        forceReducedMotion
      />,
    );
    expect(screen.getByText("No.")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(160);
    });
    expect(screen.getByText("Against believing every truth improves the mind that holds it.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Then why preserve a truth like that?" })).toBeInTheDocument();
  });

  it("persists an early departure before closing the encounter", async () => {
    const onResolveDialogue = vi.fn().mockResolvedValue(undefined);
    const onPhaseChange = vi.fn();
    render(
      <LumiiVaultEncounter
        controlledPhase="dialogue"
        previewViewport="desktop"
        thresholdApproach="kinship"
        muted
        onResolveDialogue={onResolveDialogue}
        onPhaseChange={onPhaseChange}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Leave it sealed/i }));
    });
    expect(onResolveDialogue).toHaveBeenCalledOnce();
    expect(onPhaseChange).toHaveBeenCalledWith("leaving");
  });

  it("creates the challenge from an authored escalation line", async () => {
    const onBeginChallenge = vi.fn().mockResolvedValue(undefined);
    const onPhaseChange = vi.fn();
    render(
      <LumiiVaultEncounter
        controlledPhase="dialogue"
        previewViewport="desktop"
        thresholdApproach="dominion"
        muted
        onBeginChallenge={onBeginChallenge}
        onPhaseChange={onPhaseChange}
      />,
    );

    expect(screen.queryByRole("button", { name: /Continue opening/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stand aside." }));
    expect(screen.getByText("No.")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Then stop me." }));
    });
    expect(onBeginChallenge).toHaveBeenCalledOnce();
    expect(onPhaseChange).toHaveBeenCalledWith("hostile");
  });

  it.each([
    ["kinship", "Are you still afraid?"],
    ["inquiry", "Why yield?"],
    ["dominion", "Can you stop me?"],
  ] as const)("uses the %s victory exchange", (route, question) => {
    render(
      <LumiiVaultEncounter
        controlledPhase="victory"
        previewViewport="desktop"
        thresholdApproach={route}
        cipherDeactivated
        covenantBroken
        muted
      />,
    );
    expect(screen.getByText("I have seen enough.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: question })).toBeInTheDocument();
  });

  it("uses scenario-specific controls after defeat", () => {
    render(
      <LumiiVaultEncounter
        controlledPhase="defeat"
        previewViewport="desktop"
        muted
        onChallengeAgain={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Challenge again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Return to Vault/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Rematch/i })).not.toBeInTheDocument();
  });

  it("keeps the reward mysterious without repeating the Kinship question", async () => {
    vi.useFakeTimers();
    render(
      <LumiiVaultEncounter
        controlledPhase="reward"
        previewViewport="desktop"
        muted
        forceReducedMotion
      />,
    );

    expect(screen.getByText(/This is what you were guarding/)).toBeInTheDocument();
    expect(screen.getByText("It is dangerous.")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText(/what frightened me has not yet taken shape/)).toBeInTheDocument();
    expect(screen.queryByText(/This is what you were afraid of/)).not.toBeInTheDocument();
  });
});
