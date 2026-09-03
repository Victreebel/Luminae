import { describe, expect, it } from "vitest";
import { GUIDED_LUMII_AVATAR_ID, PLAYER_AVATAR_IDS, pickUniqueAvatar } from "./avatarAssignment";

describe("pickUniqueAvatar", () => {
  it("keeps a valid requested avatar when it is free", () => {
    expect(pickUniqueAvatar("oracle", ["stargazer"])).toBe("oracle");
  });

  it("uses the first free avatar when the requested avatar is taken", () => {
    expect(pickUniqueAvatar("stargazer", ["stargazer", "forgemaster"])).toBe("voidcaller");
  });

  it("replaces missing and unknown avatar IDs", () => {
    expect(pickUniqueAvatar(null, [])).toBe("stargazer");
    expect(pickUniqueAvatar("not-an-avatar", ["stargazer"])).toBe("forgemaster");
  });

  it("keeps Lumii outside the player avatar allowlist", () => {
    expect(PLAYER_AVATAR_IDS).not.toContain(GUIDED_LUMII_AVATAR_ID);
    expect(pickUniqueAvatar(GUIDED_LUMII_AVATAR_ID, [])).toBe("stargazer");
  });
});
