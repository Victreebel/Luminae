import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import {
  API_BUILD_LABEL,
  API_BUILD_STARTED_AT,
} from "../lib/buildIdentity";
import { pool } from "@workspace/db";
import { getWebSocketMetrics } from "../lib/websocket";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/meta/build", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    service: "luminae-api",
    buildLabel: API_BUILD_LABEL,
    startedAt: API_BUILD_STARTED_AT,
  });
});

router.get("/ops/health", async (req, res): Promise<void> => {
  const expected = process.env.LUMINAE_OPS_HEALTH_SECRET;
  if (!expected || req.headers.authorization !== `Bearer ${expected}`) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const startedAt = performance.now();
  try {
    await pool.query("select 1");
    res.setHeader("Cache-Control", "no-store");
    res.json({
      status: "ok",
      buildLabel: API_BUILD_LABEL,
      databaseLatencyMs: Math.round(performance.now() - startedAt),
      websocket: getWebSocketMetrics(),
    });
  } catch {
    res.status(503).json({ status: "degraded", database: "unavailable" });
  }
});

export default router;
