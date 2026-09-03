import { describe, expect, it } from "vitest";

import { shouldReconnectWebSocket } from "../use-game-websocket";

describe("shouldReconnectWebSocket", () => {
  it("does not retry terminal or policy closes", () => {
    expect(shouldReconnectWebSocket(1000)).toBe(false);
    expect(shouldReconnectWebSocket(1008)).toBe(false);
  });

  it("retries transient transport and server failures", () => {
    expect(shouldReconnectWebSocket(1006)).toBe(true);
    expect(shouldReconnectWebSocket(1011)).toBe(true);
    expect(shouldReconnectWebSocket(1012)).toBe(true);
    expect(shouldReconnectWebSocket(1013)).toBe(true);
  });
});
