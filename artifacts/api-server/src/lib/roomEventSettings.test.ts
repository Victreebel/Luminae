import { describe, expect, it } from "vitest";
import { canCustomizeRoomEvents, getRoomEventFrequency } from "./roomEventSettings";

describe("room Event settings", () => {
  it.each(["standard", "custom"])("allows independent Event settings in %s rooms", (gameMode) => {
    for (const eventFrequency of ["off", "standard", "frequent"] as const) {
      const room = { gameMode, eventFrequency, scenarioId: null };
      expect(canCustomizeRoomEvents(room)).toBe(true);
      expect(getRoomEventFrequency(room)).toBe(eventFrequency);
    }
  });

  it("defaults old regular lobbies without a saved setting to the standard rate", () => {
    expect(getRoomEventFrequency({ gameMode: "standard" })).toBe("standard");
    expect(getRoomEventFrequency({ gameMode: "custom", eventFrequency: "unknown" })).toBe("standard");
  });

  it.each([
    { gameMode: "campaign", scenarioId: "chronicle_trace" },
    { gameMode: "campaign", scenarioId: "blueprint_clearance_lumii" },
    { gameMode: "standard", scenarioId: "future_authored_scenario" },
    { gameMode: "campaign", scenarioId: null },
  ])("keeps authored scenarios out of the regular pool: $scenarioId", (room) => {
    expect(canCustomizeRoomEvents(room)).toBe(false);
    expect(getRoomEventFrequency({ ...room, eventFrequency: "frequent" })).toBe("off");
  });
});
