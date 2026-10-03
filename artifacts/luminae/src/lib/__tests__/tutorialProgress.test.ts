import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FIRST_CONTACT_COMPLETION_LUME,
  FIRST_CONTACT_INVESTIGATION_ID,
  FIRST_CONTACT_INVESTIGATION_VERSION,
  type TutorialInvestigationProgress,
} from "@workspace/game-types";
import {
  apiCompleteTutorialInvestigation,
  apiGetTutorialInvestigation,
} from "@/lib/accountSession";
import {
  claimPendingTutorialInvestigation,
  completeTutorialRun,
  loadAuthenticatedTutorialInvestigationProgress,
  setTutorialToken,
} from "@/lib/tutorialProgress";

vi.mock("@/lib/accountSession", () => ({
  apiCompleteTutorialInvestigation: vi.fn(),
  apiGetTutorialInvestigation: vi.fn(),
}));
vi.mock("@/lib/cinematicPrefs", () => ({ apiUpdatePreferences: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ recordProgressionOnce: vi.fn() }));

function progress(
  discoveries: TutorialInvestigationProgress["discoveries"] = [],
): TutorialInvestigationProgress {
  return {
    investigationId: FIRST_CONTACT_INVESTIGATION_ID,
    definitionVersion: FIRST_CONTACT_INVESTIGATION_VERSION,
    completed: true,
    completedAt: "2026-09-04T00:00:00.000Z",
    firstContactRapport: null,
    discoveries,
    completionLumeAwarded: FIRST_CONTACT_COMPLETION_LUME,
    lumeBalance: FIRST_CONTACT_COMPLETION_LUME,
  };
}

describe("tutorial investigation account boundary", () => {
  beforeEach(() => {
    localStorage.clear();
    setTutorialToken(null);
    vi.clearAllMocks();
  });

  it("claims guest completion exactly once", async () => {
    await completeTutorialRun({
      stance: "guarded",
      rapport: "sparring",
      discoveries: ["lumii_origin"],
    });
    expect(JSON.parse(localStorage.getItem("luminae_first_contact_investigation_v1") ?? "{}"))
      .toMatchObject({ stance: "guarded", rapport: "sparring", pendingCompletion: true });
    const claimed = progress(["lumii_origin"]);
    vi.mocked(apiCompleteTutorialInvestigation).mockResolvedValue(progress(["lumii_origin"]));

    await expect(claimPendingTutorialInvestigation("account-a-token")).resolves.toEqual(claimed);
    await expect(claimPendingTutorialInvestigation("account-b-token")).resolves.toBeNull();
    expect(apiCompleteTutorialInvestigation).toHaveBeenCalledTimes(1);
    expect(apiCompleteTutorialInvestigation).toHaveBeenCalledWith("account-a-token", {
      stance: "guarded",
      rapport: "sparring",
      discoveries: ["lumii_origin"],
    });
  });

  it("drops retired guest quiz fields while claiming an older local completion", async () => {
    localStorage.setItem("luminae_first_contact_investigation_v1", JSON.stringify({
      definitionVersion: 1,
      completed: true,
      stance: "curious",
      rapport: null,
      discoveries: [],
      pendingCompletion: true,
      pendingQuiz: true,
      quizAnswers: [{ questionId: "harness_patterns", choiceId: "up_to_three_or_pair" }],
      serverProgress: null,
    }));
    vi.mocked(apiCompleteTutorialInvestigation).mockResolvedValue(progress());

    await expect(claimPendingTutorialInvestigation("new-account-token")).resolves.toEqual(progress());

    const stored = JSON.parse(localStorage.getItem("luminae_first_contact_investigation_v1") ?? "{}");
    expect(stored).not.toHaveProperty("quizAnswers");
    expect(stored).not.toHaveProperty("pendingQuiz");
  });

  it("does not carry a previous account's local First Contact memory into a fresh account", async () => {
    localStorage.setItem("luminae_tutorial_completed", "1");
    localStorage.setItem("luminae_first_contact_stance", "guarded");
    localStorage.setItem("luminae_first_contact_investigation_v1", JSON.stringify({
      definitionVersion: 1,
      completed: true,
      stance: "guarded",
      rapport: "sparring",
      discoveries: ["lumii_origin", "artifact_mastery"],
      pendingCompletion: false,
      serverProgress: progress(["lumii_origin", "artifact_mastery"]),
    }));
    const freshProgress: TutorialInvestigationProgress = {
      ...progress(),
      completed: false,
      completedAt: null,
      completionLumeAwarded: 0,
      lumeBalance: 0,
      firstContactRapport: null,
      discoveries: [],
    };
    vi.mocked(apiGetTutorialInvestigation).mockResolvedValue(freshProgress);

    await expect(loadAuthenticatedTutorialInvestigationProgress("fresh-account-token"))
      .resolves.toEqual(freshProgress);

    expect(localStorage.getItem("luminae_tutorial_completed")).toBeNull();
    expect(localStorage.getItem("luminae_first_contact_stance")).toBeNull();
    expect(JSON.parse(localStorage.getItem("luminae_first_contact_investigation_v1") ?? "{}"))
      .toMatchObject({ completed: false, stance: null, rapport: null, discoveries: [] });
  });

  it("retries a signed-in completion after a network failure", async () => {
    setTutorialToken("account-token");
    vi.mocked(apiCompleteTutorialInvestigation)
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(progress());

    const localResult = await completeTutorialRun({ stance: "curious", rapport: null, discoveries: [] });
    expect(localResult.completionLumeAwarded).toBe(0);
    await expect(claimPendingTutorialInvestigation("account-token")).resolves.toEqual(progress());
    expect(apiCompleteTutorialInvestigation).toHaveBeenCalledTimes(2);
  });

  it("does not retain a pending claim after signed-in success", async () => {
    setTutorialToken("account-token");
    vi.mocked(apiCompleteTutorialInvestigation).mockResolvedValue(progress());

    await completeTutorialRun({ stance: "resolute", rapport: null, discoveries: [] });
    await expect(claimPendingTutorialInvestigation("another-token")).resolves.toBeNull();
    expect(apiGetTutorialInvestigation).not.toHaveBeenCalled();
  });
});
