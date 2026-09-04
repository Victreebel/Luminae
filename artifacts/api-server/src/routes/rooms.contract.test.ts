import { describe, expect, it } from "vitest";
import { CreateChallengeBody, CreateRoomBody } from "@workspace/api-zod";

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

  it("defaults new room requests to 20 Eminence", () => {
    expect(CreateRoomBody.parse(room).victoryRequirement).toBe(20);
  });

  it("rejects unsupported victory requirements", () => {
    expect(CreateRoomBody.safeParse({ ...room, victoryRequirement: 30 }).success).toBe(false);
  });
});

describe("challenge creation contract", () => {
  it("defaults direct challenges to 20 Eminence", () => {
    expect(CreateChallengeBody.parse({ challengedUsername: "Aurin" }).victoryRequirement)
      .toBe(20);
  });

  it("retains 15 Eminence as an explicit configured challenge target", () => {
    expect(CreateChallengeBody.parse({
      challengedUsername: "Aurin",
      victoryRequirement: 15,
    }).victoryRequirement).toBe(15);
  });
});
