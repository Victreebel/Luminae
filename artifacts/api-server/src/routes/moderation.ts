import { Router, type IRouter, type Request } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  accountBlocksTable,
  db,
  moderationEventsTable,
  moderationReportsTable,
  playersTable,
} from "@workspace/db";
import { accountAuth } from "../lib/accountAuth";
import { rateLimit } from "../lib/httpSecurity";

const router: IRouter = Router();
const BlockBody = z.object({
  roomId: z.string().uuid(),
  playerId: z.string().uuid(),
  blocked: z.boolean(),
});
const ReportBody = z.object({
  roomId: z.string().uuid(),
  playerId: z.string().uuid(),
  category: z.enum(["harassment", "hate", "threat", "privacy", "spam", "other"]),
  evidenceText: z.string().trim().max(200).optional(),
  evidenceTimestamp: z.coerce.date().optional(),
});

async function resolveRoomAccounts(accountId: string, roomId: string, playerId: string) {
  const [self, target] = await Promise.all([
    db.select({ id: playersTable.id })
      .from(playersTable)
      .where(and(eq(playersTable.roomId, roomId), eq(playersTable.accountId, accountId)))
      .limit(1),
    db.select({ id: playersTable.id, accountId: playersTable.accountId })
      .from(playersTable)
      .where(and(eq(playersTable.roomId, roomId), eq(playersTable.id, playerId)))
      .limit(1),
  ]);
  if (!self[0] || !target[0]?.accountId || target[0].accountId === accountId) return null;
  return target[0];
}

router.post(
  "/moderation/block",
  accountAuth,
  rateLimit({ scope: "moderation-block", max: 20, windowMs: 60_000 }),
  async (req: Request, res): Promise<void> => {
    const parsed = BlockBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid block request" });
      return;
    }
    const target = await resolveRoomAccounts(req.account!.id, parsed.data.roomId, parsed.data.playerId);
    if (!target) {
      res.status(404).json({ error: "Player is not available for moderation" });
      return;
    }
    if (parsed.data.blocked) {
      await db.insert(accountBlocksTable).values({
        blockerAccountId: req.account!.id,
        blockedAccountId: target.accountId!,
      }).onConflictDoNothing();
    } else {
      await db.delete(accountBlocksTable).where(and(
        eq(accountBlocksTable.blockerAccountId, req.account!.id),
        eq(accountBlocksTable.blockedAccountId, target.accountId!),
      ));
    }
    await db.insert(moderationEventsTable).values({
      accountId: req.account!.id,
      roomId: parsed.data.roomId,
      playerId: parsed.data.playerId,
      eventType: parsed.data.blocked ? "player_blocked" : "player_unblocked",
    });
    res.json({ ok: true, blocked: parsed.data.blocked });
  },
);

router.post(
  "/moderation/report",
  accountAuth,
  rateLimit({ scope: "moderation-report", max: 5, windowMs: 60_000 }),
  async (req: Request, res): Promise<void> => {
    const parsed = ReportBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid report" });
      return;
    }
    const target = await resolveRoomAccounts(req.account!.id, parsed.data.roomId, parsed.data.playerId);
    if (!target) {
      res.status(404).json({ error: "Player is not available for moderation" });
      return;
    }
    const [report] = await db.insert(moderationReportsTable).values({
      reporterAccountId: req.account!.id,
      reportedAccountId: target.accountId,
      roomId: parsed.data.roomId,
      reportedPlayerId: parsed.data.playerId,
      category: parsed.data.category,
      evidenceText: parsed.data.evidenceText,
      evidenceTimestamp: parsed.data.evidenceTimestamp,
    }).returning({ id: moderationReportsTable.id });
    await db.insert(moderationEventsTable).values({
      accountId: req.account!.id,
      roomId: parsed.data.roomId,
      playerId: parsed.data.playerId,
      eventType: "player_reported",
      detail: { reportId: report.id, category: parsed.data.category },
    });
    res.status(201).json({ ok: true, reportId: report.id });
  },
);

export default router;
