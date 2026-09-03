import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { db, telemetryEventsTable } from "@workspace/db";
import { optionalAccountAuth } from "../lib/accountAuth";
import { rateLimit } from "../lib/httpSecurity";

const router: IRouter = Router();
const allowedEvents = [
  "app_started",
  "client_error",
  "long_frame",
  "ws_disconnect",
  "ws_reconnect",
  "progression_step",
  "chronicle_closed",
  "lumii_outcome",
  "purchase_started",
  "purchase_pending",
  "purchase_completed",
  "purchase_failed",
] as const;
const DetailValue = z.union([z.string().max(200), z.number().finite(), z.boolean(), z.null()]);
const Event = z.object({
  sessionId: z.string().min(8).max(80),
  eventName: z.enum(allowedEvents),
  platform: z.enum(["web", "android_play", "android_galaxy", "mac"]),
  clientBuild: z.string().max(120).optional(),
  detail: z.record(z.string().max(64), DetailValue).default({}),
  occurredAt: z.coerce.date(),
});
const Body = z.object({ events: z.array(Event).min(1).max(20) });

router.post(
  "/telemetry/events",
  optionalAccountAuth,
  rateLimit({ scope: "telemetry", max: 30, windowMs: 60_000 }),
  async (req: Request, res): Promise<void> => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid telemetry batch" });
      return;
    }
    const now = Date.now();
    const accepted = parsed.data.events.filter((event) => {
      const delta = event.occurredAt.getTime() - now;
      return delta < 5 * 60_000 && delta > -7 * 24 * 60 * 60_000;
    });
    if (accepted.length > 0) {
      await db.insert(telemetryEventsTable).values(accepted.map((event) => ({
        accountId: req.account?.id ?? null,
        ...event,
      })));
    }
    res.status(202).json({ accepted: accepted.length });
  },
);

export default router;
