import { beforeEach, describe, expect, it } from "vitest";
import {
  getLocalFirstContactStance,
  rememberLocalFirstContactStance,
  syncLocalFirstContactStance,
} from "../firstContactMemory";

describe("first-contact memory", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the first player stance during ordinary tutorial replays", () => {
    expect(rememberLocalFirstContactStance("curious")).toBe("curious");
    expect(rememberLocalFirstContactStance("resolute")).toBe("curious");
    expect(getLocalFirstContactStance()).toBe("curious");
  });

  it("accepts the server's canonical stance during account synchronization", () => {
    rememberLocalFirstContactStance("guarded");
    syncLocalFirstContactStance("resolute");
    expect(getLocalFirstContactStance()).toBe("resolute");
  });
});
