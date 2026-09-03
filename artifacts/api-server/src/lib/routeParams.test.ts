import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { requireUuidParam } from "./routeParams";

describe("UUID route parameters", () => {
  it("passes valid identifiers and rejects malformed values before database access", () => {
    const next = vi.fn();
    const response = {
      status: vi.fn(),
      json: vi.fn(),
    };
    response.status.mockReturnValue(response);

    requireUuidParam({} as Request, response as unknown as Response, next, "065acc2e-ecf1-4a4c-8241-3588ad89edc5", "roomId");
    expect(next).toHaveBeenCalledTimes(1);

    requireUuidParam({} as Request, response as unknown as Response, next, "not-a-room", "roomId");
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: "Invalid identifier" });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
