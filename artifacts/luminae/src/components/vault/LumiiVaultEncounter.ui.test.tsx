import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GameState } from "@workspace/api-client-react";
import { outOfGameAudio } from "@/lib/outOfGameAudio";
import { LumiiOrb, type LumiiAppearance } from "@/components/LumiiTutorial";
import { LUMII_NODE_COLORS } from "@/lib/lumiiIdentity";
import {
  LUMII_THRESHOLD_TIMING,
  LumiiEncounterHud,
  LumiiVaultEncounter,
} from "./LumiiVaultEncounter";

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

function revealCompleteLumiiReply() {
  let advance = screen.queryByRole("button", {
    name: "Continue Lumii dialogue",
  });
  while (advance) {
    fireEvent.click(advance);
    advance = screen.queryByRole("button", { name: "Continue Lumii dialogue" });
  }
}

function makeHudState(): GameState {
  return {
    startedAt: "test-start",
    version: 1,
    currentPlayerIndex: 0,
    victoryRequirement: 15,
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
  it.each([
    ["spectrum", "white"],
    ["hostile", "red"],
    ["yielding", "white"],
  ] satisfies Array<[LumiiAppearance, "white" | "red"]>)(
    "keeps Lumii node-free with a separate %s identity core",
    (appearance, core) => {
      const view = render(<LumiiOrb appearance={appearance} size={80} />);

      expect(view.container.querySelectorAll("[data-lumii-node]")).toHaveLength(
        0,
      );
      expect(
        view.container.querySelector("[data-lumii-node-count]"),
      ).not.toBeInTheDocument();
      expect(
        view.container.querySelector(`[data-lumii-core="${core}"]`),
      ).toBeInTheDocument();
      expect(
        view.container.querySelector('[data-lumii-core-role="identity"]'),
      ).toBeInTheDocument();
      expect(
        view.container.querySelector(`[data-lumii-signature-halo="${core}"]`),
      ).toBeInTheDocument();
    },
  );

  it.each(["spectrum", "hostile", "yielding"] satisfies LumiiAppearance[])(
    "keeps Lumii's %s radiating motes on the canonical natural-Affinity palette",
    async (appearance) => {
      const view = render(
        <LumiiOrb appearance={appearance} highlightZone="well" size={80} />,
      );

      expect(LUMII_NODE_COLORS).toEqual({
        flare: "#FF5A3C",
        radiance: "#DFC878",
        verdance: "#2ECC71",
        continuum: "#3D6BFF",
        abyss: "#A832D4",
      });
      expect(view.container.querySelectorAll("[data-lumii-node]")).toHaveLength(
        0,
      );

      await waitFor(() => {
        expect(
          view.container.querySelectorAll("[data-lumii-mote]"),
        ).toHaveLength(12);
      });
      const motes = [...view.container.querySelectorAll("[data-lumii-mote]")];
      expect(
        new Set(motes.map((mote) => mote.getAttribute("data-lumii-mote"))),
      ).toEqual(
        new Set(["flare", "radiance", "verdance", "continuum", "abyss"]),
      );
    },
  );

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
    expect(screen.getByText("You 0 · Lumii 0")).toBeInTheDocument();
    expect(screen.queryByText("Your turn")).toBeNull();
    expect(
      screen.getByRole("meter", { name: "Forecast Pressure" }),
    ).toHaveAttribute("aria-valuenow", "0");
    expect(view.container.textContent).not.toContain("0/0");
    expect(view.container.textContent).not.toContain("0 / 0");
  });

  it("keeps the Defense Forecast identity name-only and groups its actions", () => {
    const view = render(
      <LumiiEncounterHud
        state={makeHudState()}
        localPlayerId="player"
        suppressed
        placement="docked"
        onWithdraw={() => undefined}
        menuAction={
          <button type="button" aria-label="More game options">
            ...
          </button>
        }
      />,
    );

    expect(screen.getByText("Defense Forecast")).toBeInTheDocument();
    expect(screen.getByText("Lumii")).toHaveClass(
      "lumii-encounter-hud__name-pill",
    );
    expect(
      screen.getByTestId("lumii-encounter-hud-entity"),
    ).toBeInTheDocument();
    expect(
      view.container.querySelector(".lumii-encounter-hud__identity")
        ?.firstElementChild,
    ).toBe(screen.getByTestId("lumii-encounter-hud-entity"));
    expect(
      view.container.querySelector(".lumii-encounter-hud__name-pill svg"),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Withdraw to Vault" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "More game options" }),
    ).toBeInTheDocument();
  });

  it("marks Lumii's Forecast HUD for artifact absorption reactions", () => {
    const view = render(
      <LumiiEncounterHud
        state={makeHudState()}
        localPlayerId="player"
        suppressed
        placement="docked"
        absorbPulseKey={7}
      />,
    );

    expect(
      view.container.querySelector(".lumii-encounter-hud"),
    ).toHaveAttribute("data-lumii-absorbing", "true");
    expect(screen.getByTestId("lumii-encounter-hud-entity")).toHaveAttribute(
      "data-lumii-hud-entity",
      "true",
    );
    expect(screen.getByText("Lumii")).toHaveAttribute(
      "data-lumii-hud-name-pill",
      "true",
    );
  });

  it("distinguishes Lumii's active boss turn from her name and entity", () => {
    const bossTurnState = {
      ...makeHudState(),
      currentPlayerIndex: 1,
    } as GameState;
    const view = render(
      <LumiiEncounterHud
        state={bossTurnState}
        localPlayerId="player"
        suppressed
        placement="docked"
      />,
    );

    expect(screen.getByText("Lumii calculating")).toHaveAttribute(
      "data-turn",
      "lumii",
    );
    expect(screen.getByText("Lumii")).toHaveClass(
      "lumii-encounter-hud__name-pill",
    );
    expect(
      screen.getByTestId("lumii-encounter-hud-entity"),
    ).toBeInTheDocument();
    expect(
      view.container.querySelector(".lumii-encounter-hud"),
    ).toHaveAttribute("data-lumii-turn", "true");
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

    expect(
      warning.container.querySelector('[data-lumii-core="white"]'),
    ).toBeInTheDocument();
    expect(
      warning.container.querySelectorAll("[data-lumii-node]"),
    ).toHaveLength(0);
    expect(screen.getByTestId("lumii-vault-firewall")).toHaveAttribute(
      "data-node-count",
      "5",
    );
    expect(
      screen.getByTestId("lumii-vault-firewall").querySelectorAll("i"),
    ).toHaveLength(5);
    expect(
      warning.container.querySelector('[data-lumii-core="red"]'),
    ).not.toBeInTheDocument();
    warning.unmount();

    const combative = render(
      <LumiiVaultEncounter
        controlledPhase="hostile"
        previewViewport="desktop"
        muted
        forceReducedMotion
      />,
    );

    expect(
      combative.container.querySelector('[data-lumii-core="red"]'),
    ).toBeInTheDocument();
    expect(
      combative.container.querySelector('[data-lumii-core="white"]'),
    ).not.toBeInTheDocument();
    expect(
      combative.container.querySelector(".lumii-vault-encounter__lumii"),
    ).toHaveAttribute("data-combative-shift", "true");
    expect(
      combative.container.querySelector(
        ".lumii-vault-encounter__combative-flare",
      ),
    ).toBeInTheDocument();
  });

  it("keeps the same Lumii presence mounted when she becomes combative", () => {
    const encounter = render(
      <LumiiVaultEncounter
        controlledPhase="dialogue"
        previewViewport="desktop"
        muted
        forceReducedMotion
      />,
    );

    const peacefulPresence = screen.getByTestId("lumii-vault-presence");
    expect(
      encounter.container.querySelector('[data-lumii-core="white"]'),
    ).toBeInTheDocument();

    encounter.rerender(
      <LumiiVaultEncounter
        controlledPhase="hostile"
        previewViewport="desktop"
        covenantBroken
        muted
        forceReducedMotion
      />,
    );

    expect(screen.getByTestId("lumii-vault-presence")).toBe(peacefulPresence);
    expect(
      encounter.container.querySelector(".lumii-vault-encounter__lumii"),
    ).toHaveAttribute("data-combative-shift", "true");
    expect(
      encounter.container.querySelector('[data-lumii-core="red"]'),
    ).toBeInTheDocument();
    expect(
      encounter.container.querySelector('[data-lumii-core="white"]'),
    ).not.toBeInTheDocument();
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
        controlledPhase="opening"
        previewViewport="desktop"
        muted={false}
        forceReducedMotion
      />,
    );

    expect(startScore).toHaveBeenLastCalledWith("cipher");
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

  it("reveals choices only after the visible final sentence is clicked", () => {
    render(
      <LumiiVaultEncounter
        controlledPhase="dialogue"
        previewViewport="desktop"
        thresholdApproach="kinship"
        muted
        forceReducedMotion
      />,
    );

    expect(screen.getByText("I don't know.")).toBeInTheDocument();
    expect(screen.queryByText("And I don't want to.")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "I thought you wanted me to explore the Universe?",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Leave the Vault/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Continue Lumii dialogue" }),
    );
    expect(screen.getByText("And I don't want to.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "I thought you wanted me to explore the Universe?",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Leave the Vault/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Continue Lumii dialogue" }),
    );
    expect(
      screen.getByText("I need you to leave the Vault sealed."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "I thought you wanted me to explore the Universe?",
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue Lumii dialogue" }),
    );
    expect(
      screen.getByText("I need you to leave the Vault sealed."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "I thought you wanted me to explore the Universe?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Leave the Vault/i }),
    ).toBeInTheDocument();
  });

  it("plays the Inquiry aside locally and returns to the same choices", () => {
    const onRecordDialoguePath = vi.fn();
    render(
      <LumiiVaultEncounter
        controlledPhase="dialogue"
        previewViewport="desktop"
        thresholdApproach="inquiry"
        dialoguePath={["inquiry-demand-answer"]}
        muted
        forceReducedMotion
        onRecordDialoguePath={onRecordDialoguePath}
      />,
    );

    revealCompleteLumiiReply();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Convenient.",
      }),
    );
    expect(screen.getByText("Efficient, too.")).toBeInTheDocument();
    revealCompleteLumiiReply();
    expect(
      screen.getByText("Saved us a whole conversation."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByRole("button", { name: "Where did it come from?" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Convenient.",
      }),
    ).not.toBeInTheDocument();
    expect(onRecordDialoguePath).not.toHaveBeenCalled();
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
    const encounter = screen.getByRole("dialog", {
      name: "Lumii Vault encounter",
    });

    fireEvent.click(encounter);
    expect(onPhaseChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(90));
    fireEvent.click(encounter);
    expect(onPhaseChange).toHaveBeenCalledWith("cipher-inert");
  });

  it("dismisses the Cipher completely before the doors begin opening", async () => {
    const view = render(
      <LumiiVaultEncounter
        controlledPhase="cipher-dismiss"
        previewViewport="desktop"
        muted
        forceReducedMotion
      />,
    );

    const threshold = screen.getByRole("button", {
      name: "Sealed cosmic technology vault",
    });
    expect(threshold).toHaveAttribute("data-vault-state", "sealed");
    expect(threshold).toHaveAttribute("data-cipher-state", "dismissing");

    view.rerender(
      <LumiiVaultEncounter
        controlledPhase="opening"
        previewViewport="desktop"
        muted
        forceReducedMotion
      />,
    );
    expect(threshold).toHaveAttribute("data-vault-state", "arrested");
    expect(threshold).toHaveAttribute("data-cipher-state", "hidden");
    expect(
      screen.queryByText("Architect, please wait."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("lumii-vault-firewall"),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText("Architect, please wait."),
    ).toBeInTheDocument();
    expect(
      view.container.querySelector(".lumii-vault-encounter__lumii"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "What's wrong?" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the Black Market Cipher shutdown sounds reversible", () => {
    const cinematicSound = vi
      .spyOn(outOfGameAudio, "playLumiiCinematic")
      .mockReturnValue(true);
    vi.spyOn(outOfGameAudio, "startLumiiThresholdScore").mockReturnValue(true);
    vi.spyOn(outOfGameAudio, "stopLumiiThresholdScore").mockReturnValue(true);
    const view = render(
      <LumiiVaultEncounter
        controlledPhase="cipher-collapse"
        cipherDismissalMode="temporary"
        previewViewport="desktop"
        muted={false}
      />,
    );

    expect(cinematicSound).toHaveBeenCalledWith("cipher-collapse");
    view.rerender(
      <LumiiVaultEncounter
        controlledPhase="cipher-dismiss"
        cipherDismissalMode="temporary"
        previewViewport="desktop"
        muted={false}
      />,
    );
    expect(cinematicSound).toHaveBeenCalledWith("cipher-dismiss");
  });

  it("phases the Black Market Cipher as one intact glyph and restores it on return", () => {
    const view = render(
      <LumiiVaultEncounter
        controlledPhase="cipher-inert"
        cipherDismissalMode="temporary"
        previewViewport="desktop"
        muted
        forceReducedMotion
      />,
    );
    const threshold = screen.getByRole("button", {
      name: "Sealed cosmic technology vault",
    });

    expect(threshold).toHaveAttribute("data-cipher-state", "inert");
    expect(
      view.container.querySelector(
        ".vault-threshold__cipher-whole--inert [data-cipher-sigil]",
      ),
    ).toBeInTheDocument();

    view.rerender(
      <LumiiVaultEncounter
        controlledPhase="closing"
        cipherDismissalMode="temporary"
        previewViewport="desktop"
        muted
        forceReducedMotion
      />,
    );
    expect(threshold).toHaveAttribute("data-cipher-state", "restoring");

    view.rerender(
      <LumiiVaultEncounter
        controlledPhase="closing"
        cipherDismissalMode="permanent"
        previewViewport="desktop"
        muted
        forceReducedMotion
      />,
    );
    expect(threshold).toHaveAttribute("data-cipher-state", "hidden");
  });

  it("marks the earned Architect dismissal with fracture and release sounds", () => {
    const cinematicSound = vi
      .spyOn(outOfGameAudio, "playLumiiCinematic")
      .mockReturnValue(true);
    vi.spyOn(outOfGameAudio, "startLumiiThresholdScore").mockReturnValue(true);
    vi.spyOn(outOfGameAudio, "stopLumiiThresholdScore").mockReturnValue(true);
    const view = render(
      <LumiiVaultEncounter
        controlledPhase="cipher-collapse"
        cipherDismissalMode="permanent"
        previewViewport="desktop"
        muted={false}
      />,
    );

    const threshold = screen.getByRole("button", {
      name: "Sealed cosmic technology vault",
    });
    expect(threshold).toHaveAttribute("data-cipher-dismissal", "permanent");
    expect(
      view.container.querySelectorAll(".vault-threshold__architect-rupture i"),
    ).toHaveLength(9);
    expect(
      view.container.querySelectorAll(
        ".vault-threshold__cipher-whole--energized [data-cipher-line]",
      ),
    ).toHaveLength(5);
    expect(
      view.container.querySelectorAll(".vault-threshold__architect-shard"),
    ).toHaveLength(10);
    expect(cinematicSound).toHaveBeenCalledWith("architect-cipher-fracture");

    view.rerender(
      <LumiiVaultEncounter
        controlledPhase="cipher-dismiss"
        cipherDismissalMode="permanent"
        previewViewport="desktop"
        muted={false}
      />,
    );
    expect(cinematicSound).toHaveBeenCalledWith("architect-cipher-release");
  });

  it("uses a low-pressure cue while Architect authority bears down on the Cipher", () => {
    const cinematicSound = vi
      .spyOn(outOfGameAudio, "playLumiiCinematic")
      .mockReturnValue(true);
    vi.spyOn(outOfGameAudio, "startLumiiThresholdScore").mockReturnValue(true);
    vi.spyOn(outOfGameAudio, "stopLumiiThresholdScore").mockReturnValue(true);

    render(
      <LumiiVaultEncounter
        controlledPhase="cipher-surge"
        cipherDismissalMode="permanent"
        previewViewport="desktop"
        muted={false}
      />,
    );

    expect(cinematicSound).toHaveBeenCalledWith("architect-cipher-pressure");
  });

  it("does not reconstruct a permanently dismissed Cipher on return", () => {
    render(
      <LumiiVaultEncounter
        controlledPhase="expanding"
        cipherDeactivated
        cipherDismissalMode="permanent"
        previewViewport="desktop"
        muted
        forceReducedMotion
      />,
    );

    expect(
      screen.getByRole("button", { name: "Sealed cosmic technology vault" }),
    ).toHaveAttribute("data-cipher-state", "hidden");
  });

  it("sounds the door movement and halt, then waits for a click before Lumii arrives", () => {
    vi.useFakeTimers();
    const cinematicSound = vi
      .spyOn(outOfGameAudio, "playLumiiCinematic")
      .mockReturnValue(true);
    const startScore = vi
      .spyOn(outOfGameAudio, "startLumiiThresholdScore")
      .mockReturnValue(true);
    const stopScore = vi
      .spyOn(outOfGameAudio, "stopLumiiThresholdScore")
      .mockReturnValue(true);
    const onPhaseChange = vi.fn();
    render(
      <LumiiVaultEncounter
        controlledPhase="opening"
        previewViewport="desktop"
        muted={false}
        onPhaseChange={onPhaseChange}
      />,
    );

    const encounter = screen.getByRole("dialog", {
      name: "Lumii Vault encounter",
    });
    expect(cinematicSound).toHaveBeenCalledWith("vault-doors-open");
    expect(startScore).toHaveBeenCalledWith("cipher");
    expect(
      screen.queryByText("Architect, please wait."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("lumii-vault-firewall"),
    ).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1_000));
    fireEvent.click(encounter);
    expect(onPhaseChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(LUMII_THRESHOLD_TIMING.doorsOpen - 1_000));
    expect(cinematicSound).toHaveBeenCalledWith("vault-doors-halt");
    expect(stopScore).toHaveBeenCalledWith(0.08);
    expect(screen.getByText("Architect, please wait.")).toBeInTheDocument();
    expect(
      screen.queryByTestId("lumii-vault-firewall"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Lumii" }));
    expect(onPhaseChange).toHaveBeenCalledWith("approach");
  });

  it("waits until all five firewall lines have deployed before pulsing the Vault ring", () => {
    vi.useFakeTimers();
    render(
      <LumiiVaultEncounter
        controlledPhase="approach"
        previewViewport="desktop"
        muted
      />,
    );

    const encounter = screen.getByRole("dialog", {
      name: "Lumii Vault encounter",
    });
    expect(encounter).not.toHaveAttribute("data-firewall-ready");

    act(() =>
      vi.advanceTimersByTime(LUMII_THRESHOLD_TIMING.firewallDeploy - 1),
    );
    expect(encounter).not.toHaveAttribute("data-firewall-ready");

    act(() => vi.advanceTimersByTime(1));
    expect(encounter).toHaveAttribute("data-firewall-ready", "true");
  });

  it("anchors Lumii's firewall to the rendered Vault center", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect() {
        if (this.classList.contains("lumii-vault-encounter__stage")) {
          return {
            x: 10,
            y: 20,
            top: 20,
            right: 710,
            bottom: 247,
            left: 10,
            width: 700,
            height: 227,
            toJSON: () => undefined,
          };
        }
        if (this.classList.contains("lumii-vault-encounter__threshold")) {
          return {
            x: 130,
            y: 130,
            top: 130,
            right: 598,
            bottom: 598,
            left: 130,
            width: 468,
            height: 468,
            toJSON: () => undefined,
          };
        }
        return {
          x: 0,
          y: 0,
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: 0,
          height: 0,
          toJSON: () => undefined,
        };
      },
    );

    render(
      <LumiiVaultEncounter
        controlledPhase="approach"
        previewViewport="desktop"
        muted
        forceReducedMotion
      />,
    );

    const anchor = screen
      .getByTestId("lumii-vault-firewall")
      .closest(".lumii-vault-encounter__firewall-anchor");
    expect(anchor).toHaveStyle({ left: "354px", top: "344px" });
  });

  it("keeps Lumii's restraints mounted while the doors close", () => {
    const view = render(
      <LumiiVaultEncounter
        controlledPhase="leaving"
        previewViewport="desktop"
        muted
        forceReducedMotion
      />,
    );

    expect(screen.getByTestId("lumii-vault-firewall")).toHaveAttribute(
      "data-retreating",
      "true",
    );
    expect(
      view.container.querySelector(".lumii-vault-encounter__lumii"),
    ).toHaveAttribute("data-retreating", "true");
  });

  it("finishes the door closure before returning the machine to the Vault", async () => {
    vi.useFakeTimers();
    render(
      <LumiiVaultEncounter cipherDeactivated previewViewport="desktop" muted />,
    );

    act(() => vi.advanceTimersByTime(650));
    act(() => vi.advanceTimersByTime(LUMII_THRESHOLD_TIMING.cipherDismiss));
    act(() => vi.advanceTimersByTime(LUMII_THRESHOLD_TIMING.doorsOpen));
    fireEvent.click(screen.getByRole("button", { name: "Continue to Lumii" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Leave the Vault/i }));
    });

    const encounter = screen.getByRole("dialog", {
      name: "Lumii Vault encounter",
    });
    expect(encounter).toHaveAttribute("data-phase", "leaving");
    act(() => vi.advanceTimersByTime(899));
    expect(encounter).toHaveAttribute("data-phase", "leaving");
    act(() => vi.advanceTimersByTime(1));
    expect(encounter).toHaveAttribute("data-phase", "closing");
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

    expect(
      screen.queryByText("Architect, please wait."),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector(".lumii-vault-encounter__lumii"),
    ).toHaveAttribute("data-arriving", "true");
    expect(
      screen.queryByRole("button", { name: /kinship|inquiry|dominion/i }),
    ).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "What's wrong?" }));
    });
    expect(onChooseApproach).toHaveBeenCalledWith("kinship");
    expect(onPhaseChange).toHaveBeenCalledWith("dialogue");
  });

  it("keeps Leave the Vault at every Inquiry question", () => {
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
    expect(
      screen.queryByRole("button", { name: /Leave the Vault/i }),
    ).not.toBeInTheDocument();
    revealCompleteLumiiReply();
    expect(
      screen.getByRole("button", { name: /Leave the Vault/i }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "What does that mean?" }),
    );
    expect(screen.getByText("It is a warning.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Leave the Vault/i }),
    ).not.toBeInTheDocument();
    revealCompleteLumiiReply();
    expect(
      screen.getByRole("button", { name: /Leave the Vault/i }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "A warning against what?" }),
    );
    expect(
      screen.getByText(
        "I think it warns that not every truth is safe to hold.",
      ),
    ).toBeInTheDocument();
    revealCompleteLumiiReply();
    expect(
      screen.getByRole("button", { name: "Then why preserve it?" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Leave the Vault/i }));
    expect(onPhaseChange).toHaveBeenCalledWith("leaving");
  });

  it("records the complete response path and restores its exact dialogue node", async () => {
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

    revealCompleteLumiiReply();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "What does that mean?" }),
      );
    });
    expect(onRecordDialoguePath).toHaveBeenLastCalledWith(["inquiry-meaning"]);
    view.unmount();

    render(
      <LumiiVaultEncounter
        controlledPhase="dialogue"
        previewViewport="desktop"
        thresholdApproach="inquiry"
        dialoguePath={["inquiry-meaning", "inquiry-warning-against-truth"]}
        muted
      />,
    );
    expect(
      screen.getByText(
        "I think it warns that not every truth is safe to hold.",
      ),
    ).toBeInTheDocument();
    revealCompleteLumiiReply();
    expect(
      screen.getByRole("button", { name: "Then why preserve it?" }),
    ).toBeInTheDocument();
  });

  it("keeps the exchange visible and retries a response that was not saved", async () => {
    const onRecordDialoguePath = vi
      .fn()
      .mockRejectedValueOnce(
        new Error("Response not saved. Your place is preserved. Try again."),
      )
      .mockResolvedValueOnce(undefined);
    render(
      <LumiiVaultEncounter
        controlledPhase="dialogue"
        previewViewport="desktop"
        thresholdApproach="inquiry"
        muted
        onRecordDialoguePath={onRecordDialoguePath}
      />,
    );

    revealCompleteLumiiReply();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "That's not an answer." }),
      );
    });
    expect(
      screen.getByText(
        "Response not saved. Your place is preserved. Try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("A Basilisk.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry response" }),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry response" }));
    });
    expect(onRecordDialoguePath).toHaveBeenNthCalledWith(1, [
      "inquiry-demand-answer",
    ]);
    expect(onRecordDialoguePath).toHaveBeenNthCalledWith(2, [
      "inquiry-demand-answer",
    ]);
    expect(screen.getByText("It is the only word I have.")).toBeInTheDocument();
  });

  it("hydrates the authoritative response when another tab continues the exchange", async () => {
    const onRecordDialoguePath = vi.fn().mockResolvedValue(["inquiry-meaning"]);
    render(
      <LumiiVaultEncounter
        controlledPhase="dialogue"
        previewViewport="desktop"
        thresholdApproach="inquiry"
        muted
        onRecordDialoguePath={onRecordDialoguePath}
      />,
    );

    revealCompleteLumiiReply();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "That's not an answer." }),
      );
    });

    expect(screen.getByText("It is a warning.")).toBeInTheDocument();
    expect(
      screen.queryByText("Response not saved. Try again."),
    ).not.toBeInTheDocument();
  });

  it("requires a second Inquiry branch before the Lumii confrontation", async () => {
    const onRecordDialoguePath = vi.fn().mockResolvedValue(undefined);
    const onBeginChallenge = vi.fn().mockResolvedValue(undefined);
    const onPhaseChange = vi.fn();
    render(
      <LumiiVaultEncounter
        controlledPhase="dialogue"
        previewViewport="desktop"
        thresholdApproach="inquiry"
        muted
        onRecordDialoguePath={onRecordDialoguePath}
        onBeginChallenge={onBeginChallenge}
        onPhaseChange={onPhaseChange}
      />,
    );

    revealCompleteLumiiReply();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "That's not an answer." }),
      );
    });
    revealCompleteLumiiReply();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Where did it come from?" }),
      );
    });
    expect(screen.getByText("I don't know why I know it.")).toBeInTheDocument();
    revealCompleteLumiiReply();
    expect(
      screen.getByRole("button", { name: "What does that mean?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "How do you know?" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /door is the only answer/i }),
    ).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "What does that mean?" }),
      );
    });
    revealCompleteLumiiReply();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "A warning against what?" }),
      );
    });
    revealCompleteLumiiReply();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Then why preserve it?" }),
      );
    });
    revealCompleteLumiiReply();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /^I've heard the warning\. I'm still going\./i,
        }),
      );
    });
    expect(onBeginChallenge).toHaveBeenCalledOnce();
    expect(onPhaseChange).toHaveBeenCalledWith("decision");
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

    revealCompleteLumiiReply();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Leave the Vault/i }));
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

    revealCompleteLumiiReply();
    expect(
      screen.queryByRole("button", { name: /Continue opening/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stand aside." }));
    expect(screen.getByText("No.")).toBeInTheDocument();
    revealCompleteLumiiReply();
    fireEvent.click(
      screen.getByRole("button", { name: "Is that your final answer?" }),
    );
    expect(screen.getByText("It is.")).toBeInTheDocument();
    revealCompleteLumiiReply();
    expect(
      screen.getByText("Commits to opposing Lumii · opening the Vault"),
    ).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Then stop me\./i }));
    });
    expect(onBeginChallenge).toHaveBeenCalledOnce();
    expect(onPhaseChange).toHaveBeenCalledWith("decision");
  });

  it("keeps Lumii calm through her branch-specific decision, then turns hostile on the final click", () => {
    const onPhaseChange = vi.fn();
    const encounter = render(
      <LumiiVaultEncounter
        controlledPhase="decision"
        previewViewport="desktop"
        thresholdApproach="kinship"
        covenantBroken
        muted
        forceReducedMotion
        onPhaseChange={onPhaseChange}
      />,
    );

    expect(screen.getByText("No.")).toBeInTheDocument();
    expect(
      encounter.container.querySelector('[data-lumii-core="white"]'),
    ).toBeInTheDocument();
    expect(
      encounter.container.querySelector('[data-lumii-core="red"]'),
    ).not.toBeInTheDocument();

    revealCompleteLumiiReply();
    expect(onPhaseChange).toHaveBeenCalledWith("hostile");

    encounter.rerender(
      <LumiiVaultEncounter
        controlledPhase="hostile"
        previewViewport="desktop"
        thresholdApproach="kinship"
        covenantBroken
        muted
        forceReducedMotion
        onPhaseChange={onPhaseChange}
      />,
    );
    expect(
      encounter.container.querySelector('[data-lumii-core="red"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("COVENANT BROKEN")).toBeInTheDocument();
    expect(
      screen.queryByText("Then I must know what stopping you would require."),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["kinship", "Are you still afraid?"],
    ["inquiry", "Why yield?"],
    ["dominion", "How'd that work out for you?"],
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
    expect(
      screen.queryByRole("button", { name: question }),
    ).not.toBeInTheDocument();
    revealCompleteLumiiReply();
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

    expect(
      screen.queryByRole("button", { name: /Challenge again/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Return to Vault/i }),
    ).not.toBeInTheDocument();
    revealCompleteLumiiReply();
    expect(screen.getByText("I can stop you.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Challenge again/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Return to Vault/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Rematch/i }),
    ).not.toBeInTheDocument();
  });

  it("reveals the recovered Blueprint in the terminal before the reward exchange", async () => {
    render(
      <LumiiVaultEncounter
        controlledPhase="reward"
        previewViewport="desktop"
        muted
        forceReducedMotion
      />,
    );

    expect(screen.getByTestId("lumii-vault-terminal")).toHaveAttribute(
      "data-unlocked",
      "true",
    );
    expect(screen.getByText("VAULT TERMINAL")).toBeInTheDocument();
    expect(screen.getByText("BLUEPRINT // 01 RECOVERED")).toBeInTheDocument();
    expect((await screen.findAllByText("Antimatter Detonator")).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText(/This is what you were guarding/),
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId("lumii-vault-terminal")
        .compareDocumentPosition(
          screen.getByText(/This is what you were guarding/),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("It is dangerous.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Enter Vault/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue Lumii dialogue" }),
    );
    expect(
      screen.getByText(/what frightened me has not yet taken shape/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Enter Vault/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue Lumii dialogue" }),
    );
    expect(
      screen.getByText(/what frightened me has not yet taken shape/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Enter Vault/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/This is what you were afraid of/),
    ).not.toBeInTheDocument();
  });
});
