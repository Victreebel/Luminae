import { describe, expect, it } from "vitest";
import { chooseAiAction } from "./aiPlayer.js";
import { applyAction, initializeGame, normalizeState, type AiDifficulty } from "./gameEngine.js";

function damagedGame() {
  const state = normalizeState(initializeGame([
    { id: "p1", name: "Player 1" },
    { id: "p2", name: "Player 2" },
  ], 2));
  state.currentPlayerIndex = 0;
  state.openingTurnOrder = null;
  const player = state.players[0];
  player.forgedArtifactIds = ["t1r01", "t1r02"];
  for (const artifactId of player.forgedArtifactIds) {
    player.civilization.artifacts[artifactId] = {
      artifactId,
      firstMasteredTurnCount: 0,
      masteryCount: 1,
      implementationState: "damaged",
      implementationStateChangedTurnCount: 1,
      implementationChangeSource: { sourceType: "scenario", sourceId: "damage_test" },
      historyEvidence: "recorded",
    };
  }
  return state;
}

describe("AI Artifact repair", () => {
  it.each<AiDifficulty>(["easy", "medium", "hard"])("%s AI queues repairs once before its core action", (difficulty) => {
    const state = damagedGame();
    const action = chooseAiAction(state, "p1", difficulty);
    expect(action).toEqual({ type: "repair_artifacts", artifactIds: ["t1r01", "t1r02"] });
    expect(applyAction(state, "p1", action)).toEqual({ success: true });
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.coreActionUsed).toBe(false);
    expect(chooseAiAction(state, "p1", difficulty).type).not.toBe("repair_artifacts");
  });

  it("queues only newly damaged owned implementations while other repairs are pending", () => {
    const state = damagedGame();
    state.players[0].pendingArtifactRepairIds = ["t1r01"];
    state.players[0].civilization.artifacts.unowned = {
      ...state.players[0].civilization.artifacts.t1r02,
      artifactId: "unowned",
    };
    expect(chooseAiAction(state, "p1", "hard")).toEqual({
      type: "repair_artifacts", artifactIds: ["t1r02"],
    });
  });

  it("leaves guided passive Lumii's pass behavior intact", () => {
    expect(chooseAiAction(damagedGame(), "p1", "passive")).toEqual({ type: "pass" });
  });
});
