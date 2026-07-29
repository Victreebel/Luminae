import { describe, expect, it } from "vitest";
import { CreateRoomBody } from "@workspace/api-zod";

describe("room creation contract", () => {
  const room = {
    hostName: "Stargazer",
    maxPlayers: 4,
    cinematicMode: "standard" as const,
    turnTimerSeconds: null,
  };

  it.each([15, 20, 25] as const)(
    "accepts a %i-Eminence victory requirement",
    (victoryRequirement) => {
      expect(CreateRoomBody.safeParse({ ...room, victoryRequirement }).success).toBe(true);
    },
  );

  it("rejects unsupported victory requirements", () => {
    expect(CreateRoomBody.safeParse({ ...room, victoryRequirement: 30 }).success).toBe(false);
  });
});
