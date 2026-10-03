import { beforeEach, describe, expect, it } from "vitest";
import {
  clearLocalFirstContactStance,
  getLocalFirstContactStance,
  rememberLocalFirstContactStance,
  syncLocalFirstContactStance,
} from "../firstContactMemory";

describe("first-contact memory", () => {
  beforeEach(() => localStorage.clear());

  it("can replace unclaimed local stance before the account record is committed", () => {
    expect(rememberLocalFirstContactStance("curious")).toBe("curious");
    expect(rememberLocalFirstContactStance("resolute")).toBe("resolute");
    expect(getLocalFirstContactStance()).toBe("resolute");
  });

  it("accepts the server's canonical stance during account synchronization", () => {
    rememberLocalFirstContactStance("guarded");
    syncLocalFirstContactStance("resolute");
    expect(getLocalFirstContactStance()).toBe("resolute");
  });

  it("clears local stance when a different account has no First Contact record", () => {
    rememberLocalFirstContactStance("guarded");
    clearLocalFirstContactStance();
    expect(getLocalFirstContactStance()).toBeNull();
  });
});
