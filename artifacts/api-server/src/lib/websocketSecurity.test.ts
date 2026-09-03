import { describe, expect, it } from "vitest";
import {
  LUMINAE_WEBSOCKET_PROTOCOL,
  sessionTokenFromProtocolHeader,
  websocketSessionProtocol,
} from "./websocketSecurity";

describe("WebSocket authentication protocol", () => {
  it("round-trips a game session without placing it in the URL", () => {
    const token = "a".repeat(64);
    const header = `${LUMINAE_WEBSOCKET_PROTOCOL}, ${websocketSessionProtocol(token)}`;
    expect(sessionTokenFromProtocolHeader(header)).toBe(token);
  });

  it("rejects malformed session protocols", () => {
    expect(sessionTokenFromProtocolHeader("luminae-session-short")).toBeNull();
    expect(() => websocketSessionProtocol("not-a-token")).toThrow("Invalid game session token");
  });
});
