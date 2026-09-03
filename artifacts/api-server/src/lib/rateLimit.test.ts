import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { createFixedWindowRateLimit } from "./rateLimit";

function responseDouble() {
  const headers = new Map<string, string>();
  const response = {
    setHeader: vi.fn((name: string, value: string) => headers.set(name, value)),
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return { response: response as unknown as Response, headers, status: response.status, json: response.json };
}

describe("fixed-window rate limit", () => {
  it("allows the configured number of requests and then returns 429", () => {
    const limit = createFixedWindowRateLimit({ limit: 2, windowMs: 60_000 });
    const request = { ip: "127.0.0.1", socket: {} } as Request;
    const first = responseDouble();
    const second = responseDouble();
    const blocked = responseDouble();
    const next = vi.fn();

    limit(request, first.response, next);
    limit(request, second.response, next);
    limit(request, blocked.response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(blocked.status).toHaveBeenCalledWith(429);
    expect(blocked.json).toHaveBeenCalledWith({ error: "Too many attempts. Try again later." });
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("bounds tracked clients and rate-limits excess addresses together", () => {
    const limit = createFixedWindowRateLimit({ limit: 1, windowMs: 60_000, maxBuckets: 1 });
    const next = vi.fn();

    limit({ ip: "10.0.0.1", socket: {} } as Request, responseDouble().response, next);
    limit({ ip: "10.0.0.2", socket: {} } as Request, responseDouble().response, next);
    const blocked = responseDouble();
    limit({ ip: "10.0.0.3", socket: {} } as Request, blocked.response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(blocked.status).toHaveBeenCalledWith(429);
  });
});
