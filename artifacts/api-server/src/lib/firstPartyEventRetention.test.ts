import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {},
  firstPartyEventsTable: { occurredAt: {} },
}));
import {
  FIRST_PARTY_EVENT_RETENTION_MS,
  firstPartyEventRetentionCutoff,
} from "./firstPartyEventRetention.js";

describe("first-party event retention", () => {
  it("expires raw events at exactly 90 days", () => {
    const now = Date.UTC(2026, 7, 13, 12, 0, 0);
    expect(firstPartyEventRetentionCutoff(now).getTime()).toBe(
      now - FIRST_PARTY_EVENT_RETENTION_MS,
    );
  });
});
