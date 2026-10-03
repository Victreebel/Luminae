import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { db, telemetryEventsTable } from "@workspace/db";
import { TUTORIAL_DISCOVERY_IDS } from "@workspace/game-types";
import { and, gte, inArray, lt, sql } from "drizzle-orm";
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
  "tutorial_discovery",
  "tutorial_reward_claimed",
  "transmission_fault_presented",
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
const ONBOARDING_EVENTS = [
  "tutorial_discovery",
  "tutorial_reward_claimed",
  "transmission_fault_presented",
] as const;
const RETENTION_MS = 90 * 24 * 60 * 60_000;

const onboardingDetailSchemas = {
  tutorial_discovery: z.object({ discoveryId: z.enum(TUTORIAL_DISCOVERY_IDS) }).strict(),
  tutorial_reward_claimed: z.object({
    rewardId: z.literal("first_contact_completion"),
    lumeAwarded: z.number().int().min(0).max(10),
  }).strict(),
  transmission_fault_presented: z.object({
    variant: z.enum(["boundary", "vault"]),
  }).strict(),
} satisfies Record<(typeof ONBOARDING_EVENTS)[number], z.ZodType>;

function hasValidOnboardingDetail(event: z.infer<typeof Event>): boolean {
  if (!(ONBOARDING_EVENTS as readonly string[]).includes(event.eventName)) return true;
  const schema = onboardingDetailSchemas[event.eventName as (typeof ONBOARDING_EVENTS)[number]];
  return schema.safeParse(event.detail).success;
}

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
    if (!parsed.data.events.every(hasValidOnboardingDetail)) {
      res.status(400).json({ error: "Invalid telemetry detail" });
      return;
    }
    const now = Date.now();
    const accepted = parsed.data.events.filter((event) => {
      const delta = event.occurredAt.getTime() - now;
      return delta < 5 * 60_000 && delta > -7 * 24 * 60 * 60_000;
    });
    if (accepted.length > 0) {
      await db.transaction(async (tx) => {
        await tx.delete(telemetryEventsTable).where(
          lt(telemetryEventsTable.receivedAt, new Date(now - RETENTION_MS)),
        );
        await tx.insert(telemetryEventsTable).values(accepted.map((event) => ({
          accountId: req.account?.id ?? null,
          ...event,
        })));
      });
    }
    res.status(202).json({ accepted: accepted.length });
  },
);

router.get("/ops/telemetry/onboarding-funnel", async (req, res): Promise<void> => {
  const secret = process.env.LUMINAE_OPS_HEALTH_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsedDays = z.coerce.number().int().min(1).max(90).safeParse(req.query.days ?? 30);
  if (!parsedDays.success) {
    res.status(400).json({ error: "Invalid day range" });
    return;
  }
  const now = new Date();
  const since = new Date(now.getTime() - parsedDays.data * 24 * 60 * 60_000);
  await db.delete(telemetryEventsTable).where(
    lt(telemetryEventsTable.receivedAt, new Date(now.getTime() - RETENTION_MS)),
  );
  const rows = await db.select({
    day: sql<string>`to_char(date_trunc('day', ${telemetryEventsTable.occurredAt}), 'YYYY-MM-DD')`,
    eventName: telemetryEventsTable.eventName,
    events: sql<number>`count(*)::int`,
    accounts: sql<number>`count(distinct ${telemetryEventsTable.accountId})::int`,
    sessions: sql<number>`count(distinct ${telemetryEventsTable.sessionId})::int`,
  }).from(telemetryEventsTable).where(and(
    gte(telemetryEventsTable.occurredAt, since),
    inArray(telemetryEventsTable.eventName, ONBOARDING_EVENTS),
  )).groupBy(
    sql`date_trunc('day', ${telemetryEventsTable.occurredAt})`,
    telemetryEventsTable.eventName,
  ).orderBy(
    sql`date_trunc('day', ${telemetryEventsTable.occurredAt})`,
    telemetryEventsTable.eventName,
  );
  res.setHeader("Cache-Control", "no-store");
  res.json({ since: since.toISOString(), through: now.toISOString(), rows });
});

export default router;
