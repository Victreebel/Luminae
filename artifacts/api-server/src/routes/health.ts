import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import {
  API_BUILD_LABEL,
  API_BUILD_STARTED_AT,
} from "../lib/buildIdentity";

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

export default router;
