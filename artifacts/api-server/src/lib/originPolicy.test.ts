import { describe, expect, it } from "vitest";
import { isOriginAllowed, parseConfiguredOrigins } from "./originPolicy";

describe("request origin policy", () => {
  const configuredOrigins = parseConfiguredOrigins(
    "https://play.luminae.game, https://preview.luminae.game ",
  );

  it("allows configured origins and non-browser clients", () => {
    expect(isOriginAllowed(undefined, { configuredOrigins, allowLoopback: false })).toBe(true);
    expect(isOriginAllowed("https://play.luminae.game", { configuredOrigins, allowLoopback: false })).toBe(true);
  });

  it("allows loopback only when development policy enables it", () => {
    expect(isOriginAllowed("http://localhost:5191", { configuredOrigins, allowLoopback: true })).toBe(true);
    expect(isOriginAllowed("http://127.0.0.1:5187", { configuredOrigins, allowLoopback: true })).toBe(true);
    expect(isOriginAllowed("http://localhost:5191", { configuredOrigins, allowLoopback: false })).toBe(false);
  });

  it("rejects lookalike and unconfigured origins", () => {
    expect(isOriginAllowed("https://play.luminae.game.attacker.example", { configuredOrigins, allowLoopback: false })).toBe(false);
    expect(isOriginAllowed("https://attacker.example", { configuredOrigins, allowLoopback: false })).toBe(false);
  });
});
