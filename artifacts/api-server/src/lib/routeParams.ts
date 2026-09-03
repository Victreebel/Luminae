import type { RequestParamHandler } from "express";
import { z } from "zod";

const UuidParam = z.string().uuid();

export const requireUuidParam: RequestParamHandler = (_req, res, next, value) => {
  if (!UuidParam.safeParse(value).success) {
    res.status(400).json({ error: "Invalid identifier" });
    return;
  }
  next();
};
