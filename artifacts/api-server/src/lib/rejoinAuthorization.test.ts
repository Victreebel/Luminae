import { describe, expect, it } from "vitest";
import { authorizePlayerRejoin } from "./rejoinAuthorization";

describe("player rejoin authorization", () => {
  it("allows an account to recover only its own seat", () => {
    expect(authorizePlayerRejoin({
      targetAccountId: "account-a",
      targetSessionToken: "old-token",
      requesterAccountId: "account-a",
      providedSessionToken: undefined,
    })).toEqual({ allowed: true });
    expect(authorizePlayerRejoin({
      targetAccountId: "account-a",
      targetSessionToken: "old-token",
      requesterAccountId: "account-b",
      providedSessionToken: "old-token",
    })).toMatchObject({ allowed: false, status: 403 });
  });

  it("requires the current game secret for a guest seat", () => {
    expect(authorizePlayerRejoin({
      targetAccountId: null,
      targetSessionToken: "old-token",
      requesterAccountId: null,
      providedSessionToken: "old-token",
    })).toEqual({ allowed: true });
    expect(authorizePlayerRejoin({
      targetAccountId: null,
      targetSessionToken: "old-token",
      requesterAccountId: null,
      providedSessionToken: undefined,
    })).toMatchObject({ allowed: false, status: 403 });
  });
});
