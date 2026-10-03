import { describe, expect, it } from "vitest";
import { CreateChallengeBody, CreateRoomBody } from "@workspace/api-zod";
import { PublicCreateRoomBody, UpdateRoomSettingsBody } from "./roomSettingsContract";

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

  it("defaults regular rooms to standard Event frequency", () => {
    expect(PublicCreateRoomBody.parse(room).eventFrequency).toBe("standard");
  });

  it.each(["off", "standard", "frequent"] as const)(
    "accepts %s Events without requiring Blueprint clearance or a custom game mode",
    (eventFrequency) => {
      const parsed = PublicCreateRoomBody.parse({ ...room, eventFrequency });
      expect(parsed.gameMode).toBe("standard");
      expect(parsed.eventFrequency).toBe(eventFrequency);
      expect(UpdateRoomSettingsBody.parse({ sessionToken: "host", eventFrequency }).eventFrequency)
        .toBe(eventFrequency);
    },
  );

  it("rejects invalid Event settings instead of silently falling back", () => {
    expect(PublicCreateRoomBody.safeParse({ ...room, eventFrequency: "unlimited" }).success).toBe(false);
    expect(UpdateRoomSettingsBody.safeParse({ sessionToken: "host", eventFrequency: "unlimited" }).success)
      .toBe(false);
  });

  it("does not expose experimental Event pools or story-mode creation", () => {
    expect(PublicCreateRoomBody.parse({ ...room, eventContentProfile: "lore_pilot_v1" }))
      .not.toHaveProperty("eventContentProfile");
    expect(PublicCreateRoomBody.safeParse({ ...room, gameMode: "campaign" }).success).toBe(false);
  });

  it("preserves the room setting when updating only presentation options", () => {
    expect(UpdateRoomSettingsBody.parse({ sessionToken: "host", cinematicMode: "epic" }))
      .not.toHaveProperty("eventFrequency");
  });
});

describe("challenge creation contract", () => {
  it("accepts old challenge requests that omit Event frequency", () => {
    expect(CreateChallengeBody.safeParse({ challengedUsername: "Aurin" }).success)
      .toBe(true);
  });

  it.each(["off", "standard", "frequent"] as const)("supports %s Events in friend challenges", (eventFrequency) => {
    expect(CreateChallengeBody.parse({ challengedUsername: "Aurin", eventFrequency }).eventFrequency)
      .toBe(eventFrequency);
  });

  it("rejects invalid challenge Event frequency", () => {
    expect(CreateChallengeBody.safeParse({ challengedUsername: "Aurin", eventFrequency: "unlimited" }).success)
      .toBe(false);
  });

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
