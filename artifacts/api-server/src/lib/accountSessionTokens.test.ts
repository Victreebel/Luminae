import { describe, expect, it } from "vitest";
import {
  generateAccountSessionToken,
  hashAccountSessionToken,
} from "./accountSessionTokens";

describe("account session tokens", () => {
  it("generates high-entropy bearer tokens and stores only a one-way digest", () => {
    const token = generateAccountSessionToken();
    const secondToken = generateAccountSessionToken();
    const digest = hashAccountSessionToken(token);

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(secondToken).not.toBe(token);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toBe(token);
    expect(hashAccountSessionToken(token)).toBe(digest);
  });
});
