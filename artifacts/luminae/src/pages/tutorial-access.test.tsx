import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FIRST_CONTACT_INVESTIGATION_ID,
  FIRST_CONTACT_INVESTIGATION_VERSION,
  type TutorialInvestigationProgress,
} from "@workspace/game-types";
import { BEAT_INDEX } from "@/lib/tutorialData";
import Tutorial, { resolveTutorialPreviewBeat } from "./tutorial";

const accountState = vi.hoisted(() => ({
  account: null as { id: string; username: string } | null,
  token: null as string | null,
  isLoading: false,
}));

const mocks = vi.hoisted(() => ({
  hasCompleted: vi.fn(() => false),
  hasPending: vi.fn(() => false),
  loadAuthenticated: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/contexts/AccountContext", () => ({
  useAccount: () => accountState,
}));
vi.mock("wouter", () => ({
  useLocation: () => [window.location.pathname, mocks.navigate],
}));
vi.mock("@/hooks/use-escape-to-close", () => ({ useEscapeToClose: vi.fn() }));
vi.mock("@/lib/tutorialStartBeat", () => ({ consumePendingStartBeat: () => null }));
vi.mock("@/lib/tutorialProgress", () => ({
  clearTutorialProgress: vi.fn(),
  hasPendingTutorialCompletion: mocks.hasPending,
  hasTutorialBeenCompleted: mocks.hasCompleted,
  loadAuthenticatedTutorialInvestigationProgress: mocks.loadAuthenticated,
  loadTutorialProgress: () => null,
  loadTutorialProgressId: () => null,
}));
vi.mock("@/components/tutorial/TutorialDirector", () => ({
  TutorialDirector: () => <div>tutorial-director</div>,
}));
vi.mock("@/components/tutorial/TutorialStartModal", () => ({
  TutorialStartModal: () => <div>tutorial-start-modal</div>,
}));
vi.mock("@/components/LoginRegisterForm", () => ({
  LoginRegisterForm: () => <div>architect-record-form</div>,
}));
vi.mock("@/components/AccountLoadingScreen", () => ({
  AccountLoadingScreen: () => <div>account-loading</div>,
}));
vi.mock("@/lib/telemetry", () => ({ recordTelemetry: vi.fn() }));

function progress(completed: boolean): TutorialInvestigationProgress {
  return {
    investigationId: FIRST_CONTACT_INVESTIGATION_ID,
    definitionVersion: FIRST_CONTACT_INVESTIGATION_VERSION,
    completed,
    completedAt: completed ? "2026-09-09T00:00:00.000Z" : null,
    firstContactRapport: null,
    discoveries: [],
    completionLumeAwarded: completed ? 10 : 0,
    lumeBalance: completed ? 10 : 0,
  };
}

describe("First Contact route access", () => {
  beforeEach(() => {
    accountState.account = null;
    accountState.token = null;
    accountState.isLoading = false;
    mocks.hasCompleted.mockReturnValue(false);
    mocks.hasPending.mockReturnValue(false);
    mocks.loadAuthenticated.mockReset();
    mocks.navigate.mockReset();
    window.history.replaceState({}, "", "/tutorial");
  });

  it("does not mount the tutorial again for a completed account", async () => {
    accountState.account = { id: "account-1", username: "Architect" };
    accountState.token = "token-1";
    mocks.loadAuthenticated.mockResolvedValue(progress(true));

    render(<Tutorial />);

    expect(await screen.findByText("This encounter is part of your record")).toBeInTheDocument();
    expect(screen.queryByText("tutorial-director")).not.toBeInTheDocument();
    expect(screen.queryByText(/Inquiry/i)).not.toBeInTheDocument();
  });

  it("allows an authenticated account that has not completed First Contact to begin", async () => {
    accountState.account = { id: "account-2", username: "NewArchitect" };
    accountState.token = "token-2";
    mocks.loadAuthenticated.mockResolvedValue(progress(false));

    render(<Tutorial />);

    await waitFor(() => expect(screen.getByText("tutorial-director")).toBeInTheDocument());
  });

  it("keeps a completed guest at account establishment instead of replaying", () => {
    mocks.hasCompleted.mockReturnValue(true);

    render(<Tutorial />);

    expect(screen.getByText("Keep what you discovered")).toBeInTheDocument();
    expect(screen.getByText("architect-record-form")).toBeInTheDocument();
    expect(screen.queryByText("tutorial-director")).not.toBeInTheDocument();
  });

  it("does not expose the retired Inquiry route to a guest", () => {
    window.history.replaceState({}, "", "/tutorial?inquiry=1");

    render(<Tutorial />);

    expect(screen.getByText("tutorial-director")).toBeInTheDocument();
    expect(screen.queryByText(/Inquiry/i)).not.toBeInTheDocument();
  });

  it("does not expose the retired Inquiry route after authenticated completion", async () => {
    window.history.replaceState({}, "", "/tutorial?inquiry=1");
    accountState.account = { id: "account-3", username: "Investigator" };
    accountState.token = "token-3";
    mocks.loadAuthenticated.mockResolvedValue(progress(true));

    render(<Tutorial />);

    expect(await screen.findByText("This encounter is part of your record")).toBeInTheDocument();
    expect(screen.queryByText(/Inquiry/i)).not.toBeInTheDocument();
  });

  it("preserves development beat previews for completed-account QA", () => {
    window.history.replaceState({}, "", "/tutorial?beat=12&tutorialDebug=1");
    accountState.account = { id: "account-4", username: "QAArchitect" };
    accountState.token = "token-4";

    render(<Tutorial />);

    expect(screen.getByText("tutorial-director")).toBeInTheDocument();
    expect(mocks.loadAuthenticated).not.toHaveBeenCalled();
  });
});

describe("tutorial development deep links", () => {
  it("prefers stable beat IDs over numeric indices", () => {
    const params = new URLSearchParams("beatId=b9_first_forge&beat=0");
    expect(resolveTutorialPreviewBeat(params, true)).toBe(BEAT_INDEX.b9_first_forge);
  });

  it("retains numeric preview links and disables both forms outside development", () => {
    expect(resolveTutorialPreviewBeat(new URLSearchParams("beat=12"), true)).toBe(12);
    expect(resolveTutorialPreviewBeat(new URLSearchParams("beatId=b9_first_forge"), false)).toBeNull();
  });
});
