import { afterEach, describe, expect, it, vi } from "vitest";

const logger = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock("./logger", () => ({ logger }));

import { withRoomLock } from "./roomLock";

describe("withRoomLock", () => {
  afterEach(() => {
    vi.useRealTimers();
    logger.error.mockReset();
  });

  it("reports a stalled task without allowing a second mutation to overlap", async () => {
    vi.useFakeTimers();
    const order: string[] = [];
    let releaseFirst: (() => void) | undefined;

    const first = withRoomLock("stalled-room", async () => {
      order.push("first:start");
      await new Promise<void>((resolve) => { releaseFirst = resolve; });
      order.push("first:end");
    });
    const second = withRoomLock("stalled-room", async () => {
      order.push("second:start");
    });

    await vi.advanceTimersByTimeAsync(30_001);
    expect(order).toEqual(["first:start"]);
    expect(logger.error).toHaveBeenCalledOnce();

    releaseFirst?.();
    await first;
    await second;
    expect(order).toEqual(["first:start", "first:end", "second:start"]);
  });
});
