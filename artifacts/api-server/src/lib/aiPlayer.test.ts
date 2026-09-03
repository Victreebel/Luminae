import { afterEach, describe, expect, it, vi } from "vitest";
import { AI_STRATEGIES, chooseAiAction } from "./aiPlayer";
import {
  applyAction,
  getBalanceRulesetCandidate,
  initializeGame,
  setBalanceRuleset,
  zeroAffinities,
} from "./gameEngine";

function makeState() {
  const state = initializeGame(
    [
      { id: "architect", name: "Architect" },
      { id: "lumii", name: "Lumii" },
    ],
    2,
  );
  const lumii = state.players.find((player) => player.playerId === "lumii")!;
  lumii.affinities = zeroAffinities();
  lumii.reservedArtifactIds = [];
  lumii.privateReservedArtifactIds = [];
  return { state, lumii };
}

describe("AI Encryption policy", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses a natural-Affinity Harness when Lumii cannot afford a Forge", () => {
    const { state } = makeState();
    vi.spyOn(Math, "random").mockReturnValue(1);

    const action = chooseAiAction(state, "lumii", "hard", {
      allowEncryption: false,
    });

    expect(action.type).toMatch(/^harness_/);
    expect(action.type).not.toBe("reserve_artifact");
  });

  it("passes instead of Encrypting when Lumii's natural Well is empty", () => {
    const { state } = makeState();
    state.affinityWell.flare = 0;
    state.affinityWell.continuum = 0;
    state.affinityWell.verdance = 0;
    state.affinityWell.abyss = 0;
    state.affinityWell.radiance = 0;

    expect(
      chooseAiAction(state, "lumii", "hard", { allowEncryption: false }),
    ).toEqual({ type: "pass" });
  });

  it("keeps Encryption available to ordinary rival Architects", () => {
    const { state } = makeState();
    state.affinityWell.flare = 0;
    state.affinityWell.continuum = 0;
    state.affinityWell.verdance = 0;
    state.affinityWell.abyss = 0;
    state.affinityWell.radiance = 0;

    expect(chooseAiAction(state, "lumii", "hard").type).toBe("reserve_artifact");
  });
});

describe("hard AI Luminary tactics", () => {
  it("stops valuing an active Luminary after another player claims it", () => {
    const { state, lumii } = makeState();
    lumii.affinities = {
      flare: 10,
      continuum: 10,
      verdance: 10,
      abyss: 10,
      radiance: 10,
      singularity: 0,
    };
    state.forgeTier1 = ["t1r01", "t1e01"];
    state.forgeTier2 = [];
    state.forgeTier3 = [];
    state.activeLuminaries = ["lum_verdant"];

    expect(chooseAiAction(state, "lumii", "hard")).toEqual({
      type: "forge_artifact",
      cardId: "t1e01",
    });

    state.players.find((player) => player.playerId === "architect")!.luminaries = [
      "lum_verdant",
    ];

    expect(chooseAiAction(state, "lumii", "hard")).toEqual({
      type: "forge_artifact",
      cardId: "t1r01",
    });
  });

  it("uses Final Hunger when no ordinary Forge is affordable", () => {
    const { state } = makeState();
    state.forgeTier1 = ["t1r01"];
    state.forgeTier2 = [];
    state.forgeTier3 = [];
    state.firstHungerAvailable = "lumii";

    expect(chooseAiAction(state, "lumii", "hard")).toEqual({
      type: "assimilate",
      cardId: "t1r01",
    });
  });
});

describe("balance-laboratory AI strategies", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses the legal two-same Harness when it completes a concentrated cost", () => {
    const { state } = makeState();
    state.forgeTier1 = ["t1r04"];
    state.forgeTier2 = [];
    state.forgeTier3 = [];
    state.affinityWell.continuum = 4;

    expect(
      chooseAiAction(state, "lumii", "hard", {
        allowEncryption: false,
        strategy: "adaptive",
      }),
    ).toEqual({
      type: "harness_two_affinities",
      affinity: "continuum",
    });
  });

  it("does not migrate the concentrated Harness policy into ordinary AI games", () => {
    const { state } = makeState();
    state.forgeTier1 = ["t1r04"];
    state.forgeTier2 = [];
    state.forgeTier3 = [];
    state.affinityWell.continuum = 4;

    expect(
      chooseAiAction(state, "lumii", "hard", { allowEncryption: false }).type,
    ).not.toBe("harness_two_affinities");
  });

  it("lets specialization select a stable requested Affinity lane", () => {
    const { state, lumii } = makeState();
    lumii.affinities = {
      flare: 10,
      continuum: 10,
      verdance: 10,
      abyss: 10,
      radiance: 10,
      singularity: 0,
    };
    state.forgeTier1 = ["t1r01", "t1e01"];
    state.forgeTier2 = [];
    state.forgeTier3 = [];

    expect(
      chooseAiAction(state, "lumii", "hard", {
        strategy: "specialization",
        focusAffinity: "flare",
      }),
    ).toEqual({ type: "forge_artifact", cardId: "t1r01" });
  });

  it("makes encrypt-denial reserve before a non-winning Forge", () => {
    const { state, lumii } = makeState();
    lumii.affinities = {
      flare: 10,
      continuum: 10,
      verdance: 10,
      abyss: 10,
      radiance: 10,
      singularity: 0,
    };
    state.forgeTier1 = ["t1r01"];
    state.forgeTier2 = [];
    state.forgeTier3 = [];
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(
      chooseAiAction(state, "lumii", "hard", { strategy: "encrypt-denial" }),
    ).toMatchObject({ type: "reserve_artifact", cardId: "t1r01" });
  });

  it("never tries to Encrypt a Nullified Artifact", () => {
    const { state, lumii } = makeState();
    lumii.affinities = {
      flare: 10,
      continuum: 10,
      verdance: 10,
      abyss: 10,
      radiance: 10,
      singularity: 0,
    };
    state.forgeTier1 = ["t1r01", "t1e01"];
    state.forgeTier2 = [];
    state.forgeTier3 = [];
    state.artifactMarkers = {};
    state.artifactMarkers.t1r01 = {
      type: "nullified",
      ownerId: "architect",
      summonedAtTurnCount: state.turnCount,
    };
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(
      chooseAiAction(state, "lumii", "hard", { strategy: "encrypt-denial" }),
    ).toMatchObject({ type: "reserve_artifact", cardId: "t1e01" });
  });

  it("does not try to Encrypt while another civilization's Forgotten Hour is active", () => {
    const { state, lumii } = makeState();
    lumii.affinities = {
      flare: 10,
      continuum: 10,
      verdance: 10,
      abyss: 10,
      radiance: 10,
      singularity: 0,
    };
    state.forgeTier1 = ["t1r01"];
    state.forgeTier2 = [];
    state.forgeTier3 = [];
    state.forgottenHourCycle = {
      architect: { lastAppliedTurnCount: 1, cooldownOwnerTurnsRemaining: null },
    };
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(
      chooseAiAction(state, "lumii", "hard", { strategy: "encrypt-denial" }),
    ).toMatchObject({ type: "forge_artifact", cardId: "t1r01" });
  });

  it("keeps every laboratory strategy on the public action grammar", () => {
    for (const strategy of AI_STRATEGIES) {
      const { state } = makeState();
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      const action = chooseAiAction(state, "lumii", "hard", {
        strategy,
        allowEncryption: false,
      });
      expect([
        "forge_artifact",
        "forge_reserved_artifact",
        "harness_three_affinities",
        "harness_two_affinities",
        "assimilate",
        "pass",
      ]).toContain(action.type);
      vi.restoreAllMocks();
    }
  });

  it("collects a natural payment instead of submitting an illegal zero-cost advanced Forge", () => {
    const { state, lumii } = makeState();
    lumii.bonuses = {
      flare: 10,
      continuum: 10,
      verdance: 10,
      abyss: 10,
      radiance: 10,
      singularity: 0,
    };
    lumii.affinities.singularity = 1;
    state.forgeTier1 = [];
    state.forgeTier2 = ["t2r01"];
    state.forgeTier3 = [];
    const ruleset = getBalanceRulesetCandidate("payment-floor");
    expect(ruleset).not.toBeNull();
    setBalanceRuleset(state, ruleset ? { ...ruleset } : null);

    expect(
      chooseAiAction(state, "lumii", "hard", { allowEncryption: false }),
    ).toMatchObject({ type: "harness_three_affinities" });
  });

  it("chooses a legal uncovered requirement for a multi-option Artifact-bound Focus", () => {
    const { state, lumii } = makeState();
    const cardId = "t1r01";
    const ruleset = getBalanceRulesetCandidate("focus");
    expect(ruleset).not.toBeNull();
    setBalanceRuleset(state, ruleset ? { ...ruleset } : null);
    state.activeLuminaries = [];
    state.forgeTier1 = [];
    state.forgeTier2 = [];
    state.forgeTier3 = [];
    state.deckTier1 = state.deckTier1.filter((id) => id !== cardId);
    lumii.reservedArtifactIds = [cardId];
    lumii.privateReservedArtifactIds = [];
    lumii.affinities = {
      flare: 0,
      continuum: 0,
      verdance: 1,
      abyss: 0,
      radiance: 0,
      singularity: 1,
    };
    state.experimentalBalanceState!.focusedReservationIdsByPlayerId = {
      lumii: [cardId],
    };

    const action = chooseAiAction(state, "lumii", "hard", {
      allowEncryption: false,
    });

    expect(action).toEqual({
      type: "forge_reserved_artifact",
      cardId,
      affinity: "radiance",
    });
    state.currentPlayerIndex = state.players.findIndex((player) => player.playerId === "lumii");
    expect(applyAction(state, "lumii", action).success).toBe(true);
  });

  it("forges when lineage substitutes the last requirement and waives the floor", () => {
    const { state, lumii } = makeState();
    lumii.bonuses = {
      flare: 0,
      continuum: 2,
      verdance: 0,
      abyss: 3,
      radiance: 1,
      singularity: 0,
    };
    lumii.affinities.singularity = 1;
    lumii.forgedArtifactIds = ["t1s04"];
    state.forgeTier1 = [];
    state.forgeTier2 = ["t2r01"];
    state.forgeTier3 = [];
    const ruleset = getBalanceRulesetCandidate("lineage-floor");
    expect(ruleset).not.toBeNull();
    setBalanceRuleset(state, ruleset ? { ...ruleset } : null);

    expect(
      chooseAiAction(state, "lumii", "hard", { allowEncryption: false }),
    ).toMatchObject({ type: "forge_artifact", cardId: "t2r01" });
  });
});
