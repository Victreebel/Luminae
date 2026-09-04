import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  UX_REVIEW_ACTIVE_KEY,
  UX_REVIEW_CONTEXT_KEY,
  UX_REVIEW_COVERAGE_KEY,
  appendUxReviewEvent,
  formatUxReviewFeedbackContext,
  getUxReviewEvents,
  resetUxReviewClientState,
  type UxReviewContext,
} from "../uxReview";

describe("UX review client support", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("clears Luminae player state while preserving audit coverage", async () => {
    localStorage.setItem("luminae_account_session", "account");
    localStorage.setItem(UX_REVIEW_ACTIVE_KEY, "1");
    localStorage.setItem(UX_REVIEW_COVERAGE_KEY, JSON.stringify(["tutorial"]));
    localStorage.setItem("unrelated_key", "preserved");

    await resetUxReviewClientState();

    expect(localStorage.getItem("luminae_account_session")).toBeNull();
    expect(localStorage.getItem(UX_REVIEW_ACTIVE_KEY)).toBeNull();
    expect(localStorage.getItem(UX_REVIEW_COVERAGE_KEY)).toBe('["tutorial"]');
    expect(localStorage.getItem("unrelated_key")).toBe("preserved");
  });

  it("bounds captured events to the most recent 80", () => {
    for (let index = 0; index < 85; index += 1) {
      appendUxReviewEvent("navigation", { route: `/stage/${index}` });
    }
    const events = getUxReviewEvents();
    expect(events).toHaveLength(80);
    expect(events[0]?.detail.route).toBe("/stage/5");
    expect(events.at(-1)?.detail.route).toBe("/stage/84");
  });

  it("formats enough context for a reproducible natural-language report", () => {
    const context: UxReviewContext = {
      capturedAt: "2026-08-25T12:00:00.000Z",
      buildLabel: "review-build",
      buildStamp: "stamp",
      url: "http://localhost:5191/tutorial",
      route: "/tutorial",
      viewport: { width: 390, height: 844, devicePixelRatio: 3 },
      online: true,
      visibility: "visible",
      preferences: {
        muted: false,
        reducedMotion: false,
        skipCinematics: false,
        swiftEffects: false,
        hints: true,
      },
      run: null,
    };
    localStorage.setItem(UX_REVIEW_CONTEXT_KEY, JSON.stringify(context));
    const report = formatUxReviewFeedbackContext(context, []);
    expect(report).toContain("review-build");
    expect(report).toContain("/tutorial");
    expect(report).toContain("390x844");
  });
});
