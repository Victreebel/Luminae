import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { acknowledgePresentation, getArchitectRecord, trackEvent } = vi.hoisted(() => ({
  acknowledgePresentation: vi.fn(),
  getArchitectRecord: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/dashboard", vi.fn()],
}));

vi.mock("@/contexts/AccountContext", () => ({
  useAccount: () => ({
    account: { id: "account-1", username: "Architect" },
    token: "token",
  }),
}));

vi.mock("@/lib/accountSession", () => ({
  apiAcknowledgeArchitectRecordPresentation: acknowledgePresentation,
  apiGetArchitectRecord: getArchitectRecord,
}));

vi.mock("@/lib/firstPartyTelemetry", () => ({
  trackFirstPartyEvent: trackEvent,
}));

vi.mock("@/components/LumiiTutorial", () => ({
  LumiiOrb: () => <div aria-label="Lumii" />,
}));

import { ArchitectRecordContinuity } from "./ArchitectRecordContinuity";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Architect Record continuity", () => {
  it("lets a failed acknowledgement remain unread and be deferred", async () => {
    getArchitectRecord.mockResolvedValue({
      campaignId: "architect_record",
      tutorialCompleted: true,
      firstContactStance: "curious",
      nodes: [],
      presentations: [],
      pendingPresentations: [{
        id: "clearance_signal_1",
        kind: "clearance_signal",
        ordinal: 1,
        title: "Signal 1 of 3",
        lines: ["Recognition."],
        acknowledgedAt: null,
      }],
      vaultShortcutVisible: false,
    });
    acknowledgePresentation.mockRejectedValue(new Error("offline"));

    render(<ArchitectRecordContinuity />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Record signal" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be recorded");
    expect(trackEvent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
