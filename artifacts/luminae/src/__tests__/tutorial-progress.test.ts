import { beforeEach, describe, expect, it, vi } from "vitest";

const { claimOnboarding, updatePreferences } = vi.hoisted(() => ({
  claimOnboarding: vi.fn(),
  updatePreferences: vi.fn(),
}));

vi.mock("@/lib/accountSession", () => ({
  apiClaimArchitectRecordOnboarding: claimOnboarding,
}));

vi.mock("@/lib/cinematicPrefs", () => ({
  apiUpdatePreferences: updatePreferences,
}));

import { BEAT_INDEX, RESERVE_CARD_ID, resolveTutorialBeatIndex } from "@/lib/tutorialData";
import {
  TUTORIAL_CLAIM_KEY,
  claimPendingTutorialCompletion,
  clearTutorialProgress,
  getSavedFirstContactStance,
  hasPendingTutorialCompletion,
  hasTutorialBeenCompleted,
  loadTutorialProgress,
  loadTutorialProgressId,
  loadTutorialState,
  markTutorialComplete,
  saveTutorialProgress,
  saveTutorialProgressId,
  saveTutorialState,
  setTutorialToken,
} from "@/lib/tutorialProgress";

const PROGRESS_KEY = "luminae_tutorial_progress";
const PROGRESS_ID_KEY = "luminae_tutorial_progress_id";
const PROGRESS_VERSION_KEY = "luminae_tutorial_progress_ver";
const STATE_KEY = "luminae_tutorial_state";

describe("tutorial progress continuity", () => {
  beforeEach(() => {
    localStorage.clear();
    claimOnboarding.mockReset();
    updatePreferences.mockReset();
    setTutorialToken(null);
  });

  it("restores the exact beat, substep, selection, board state, and stance", () => {
    const state = {
      beat: BEAT_INDEX.b11_forge_reserved,
      dlgLine: 1,
      subStep: 1,
      wellSel: { verdance: 2 },
      reserved: [RESERVE_CARD_ID],
      forged: ["t1e01"],
      firstContactStance: "guarded" as const,
    };

    saveTutorialProgress(state.beat);
    saveTutorialProgressId("b11_forge_reserved");
    saveTutorialState(state);

    expect(loadTutorialProgress()).toBe(state.beat);
    expect(loadTutorialProgressId()).toBe("b11_forge_reserved");
    expect(loadTutorialState()).toEqual(state);
  });

  it("migrates a version-5 save by stable beat ID", () => {
    localStorage.setItem(PROGRESS_VERSION_KEY, "5");
    localStorage.setItem(PROGRESS_KEY, "999");
    localStorage.setItem(PROGRESS_ID_KEY, "b3b_farewell");

    expect(loadTutorialProgress()).toBe(BEAT_INDEX.b3c_border);
    expect(resolveTutorialBeatIndex(loadTutorialProgressId())).toBe(BEAT_INDEX.b3c_border);
    expect(localStorage.getItem(PROGRESS_KEY)).toBe(String(BEAT_INDEX.b3c_border));
    expect(localStorage.getItem(PROGRESS_VERSION_KEY)).toBe("10");
  });

  it("moves a version-7 save from the removed Affinity strategy beat into assembly", () => {
    localStorage.setItem(PROGRESS_VERSION_KEY, "7");
    localStorage.setItem(PROGRESS_KEY, "999");
    localStorage.setItem(PROGRESS_ID_KEY, "b5b_affinity_strategy");

    expect(loadTutorialProgress()).toBe(BEAT_INDEX.b5c_architect_assembly);
    expect(resolveTutorialBeatIndex(loadTutorialProgressId())).toBe(BEAT_INDEX.b5c_architect_assembly);
    expect(localStorage.getItem(PROGRESS_KEY)).toBe(String(BEAT_INDEX.b5c_architect_assembly));
    expect(localStorage.getItem(PROGRESS_VERSION_KEY)).toBe("10");
  });

  it("migrates version-9 Lumii turns to their corrected order", () => {
    localStorage.setItem(PROGRESS_VERSION_KEY, "9");
    localStorage.setItem(PROGRESS_KEY, "999");
    localStorage.setItem(PROGRESS_ID_KEY, "b11a_lumii_harness_three");

    expect(loadTutorialProgress()).toBe(BEAT_INDEX.b11a_lumii_forge);
    expect(resolveTutorialBeatIndex(loadTutorialProgressId())).toBe(BEAT_INDEX.b11a_lumii_forge);
    expect(localStorage.getItem(PROGRESS_VERSION_KEY)).toBe("10");
    expect(localStorage.getItem(STATE_KEY)).toBeNull();
  });

  it("discards a version-5 save without a known stable beat ID", () => {
    localStorage.setItem(PROGRESS_VERSION_KEY, "5");
    localStorage.setItem(PROGRESS_KEY, "8");
    localStorage.setItem(PROGRESS_ID_KEY, "retired_beat");

    expect(loadTutorialProgress()).toBeNull();
    expect(loadTutorialProgressId()).toBeNull();
  });

  it("discards saves from unknown tutorial sequences", () => {
    localStorage.setItem(PROGRESS_VERSION_KEY, "4");
    localStorage.setItem(PROGRESS_KEY, "8");
    localStorage.setItem(PROGRESS_ID_KEY, "b8_first_harness");
    localStorage.setItem(STATE_KEY, JSON.stringify({ beat: 8, subStep: 1 }));

    expect(loadTutorialProgress()).toBeNull();
    expect(loadTutorialProgressId()).toBeNull();
    expect(loadTutorialState()).toBeNull();
  });

  it("does not grant completion when progress is merely saved or cleared", () => {
    saveTutorialProgress(BEAT_INDEX.b16_final_forge);
    saveTutorialState({ beat: BEAT_INDEX.b16_final_forge, subStep: 0 });
    clearTutorialProgress();

    expect(hasTutorialBeenCompleted()).toBe(false);
    expect(hasPendingTutorialCompletion()).toBe(false);
  });

  it("records an explicit completion and keeps its claim until the API accepts it", async () => {
    markTutorialComplete("resolute", "completion-1");

    expect(hasTutorialBeenCompleted()).toBe(true);
    expect(getSavedFirstContactStance()).toBe("resolute");
    expect(hasPendingTutorialCompletion()).toBe(true);

    claimOnboarding.mockRejectedValueOnce(new Error("offline"));
    await expect(claimPendingTutorialCompletion("token")).rejects.toThrow("offline");
    expect(hasPendingTutorialCompletion()).toBe(true);

    claimOnboarding.mockResolvedValueOnce(undefined);
    await expect(claimPendingTutorialCompletion("token")).resolves.toBe(true);
    expect(claimOnboarding).toHaveBeenLastCalledWith("token", {
      claimId: "completion-1",
      stance: "resolute",
    });
    expect(localStorage.getItem(TUTORIAL_CLAIM_KEY)).toBeNull();
  });

  it("claims signed-in completion before synchronizing account preferences", async () => {
    let acceptClaim: (() => void) | undefined;
    claimOnboarding.mockImplementationOnce(() => new Promise<void>((resolve) => {
      acceptClaim = resolve;
    }));
    updatePreferences.mockResolvedValueOnce(undefined);
    setTutorialToken("token");

    markTutorialComplete("curious", "completion-2");
    await Promise.resolve();
    expect(claimOnboarding).toHaveBeenCalledTimes(1);
    expect(updatePreferences).not.toHaveBeenCalled();

    acceptClaim?.();
    await vi.waitFor(() => expect(updatePreferences).toHaveBeenCalledWith(
      "token",
      { tutorialCompleted: true },
    ));
  });
});
