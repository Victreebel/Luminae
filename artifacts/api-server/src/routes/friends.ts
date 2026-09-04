import { Router, type IRouter } from "express";
import type { Request } from "express";
import { eq, and, or, ne } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  accountsTable,
  friendshipsTable,
  playersTable,
} from "@workspace/db";
import { accountAuth } from "../lib/accountAuth";
import { getPresentIds } from "../lib/presence";
import { z } from "zod";

const router: IRouter = Router();

// Helper — is account online?
// True if: actively connected inside a game room, OR seen via any authenticated
// API call within the last 3 minutes (tracked by the in-memory presence map).
async function getOnlineAccountIds(accountIds: string[]): Promise<Set<string>> {
  if (accountIds.length === 0) return new Set();
  const { roomsTable } = await import("@workspace/db");
  const rows = await db
    .selectDistinct({ accountId: playersTable.accountId })
    .from(playersTable)
    .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
    .where(
      and(
        eq(playersTable.isConnected, true),
        ne(roomsTable.status, "finished"),
      ),
    );
  const inGameIds = new Set(rows.map((r) => r.accountId).filter((id): id is string => id !== null));
  const recentIds = getPresentIds(accountIds);
  return new Set(accountIds.filter((id) => inGameIds.has(id) || recentIds.has(id)));
}

// GET /api/friends — list accepted friends
router.get("/friends", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;

  const rows = await db
    .select({
      friendship: friendshipsTable,
      requester: { id: accountsTable.id, username: accountsTable.username },
    })
    .from(friendshipsTable)
    .innerJoin(accountsTable, or(
      and(eq(friendshipsTable.requesterId, account.id), eq(accountsTable.id, friendshipsTable.addresseeId)),
      and(eq(friendshipsTable.addresseeId, account.id), eq(accountsTable.id, friendshipsTable.requesterId)),
    ))
    .where(
      and(
        eq(friendshipsTable.status, "accepted"),
        or(
          eq(friendshipsTable.requesterId, account.id),
          eq(friendshipsTable.addresseeId, account.id),
        ),
      ),
    );

  const friendAccountIds = rows.map((r) => r.requester.id);
  const onlineSet = await getOnlineAccountIds(friendAccountIds);

  const friends = rows.map((r) => ({
    friendshipId: r.friendship.id,
    accountId: r.requester.id,
    username: r.requester.username,
    isOnline: onlineSet.has(r.requester.id),
  }));

  res.json({ friends });
});

// POST /api/friends/requests — send friend request by username
router.post("/friends/requests", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;

  const parsed = z.object({ username: z.string() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  const { username } = parsed.data;

  if (username.toLowerCase() === account.username.toLowerCase()) {
    res.status(400).json({ error: "Cannot send a friend request to yourself" });
    return;
  }

  const [target] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.username, username))
    .limit(1);

  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(friendshipsTable)
    .where(
      or(
        and(eq(friendshipsTable.requesterId, account.id), eq(friendshipsTable.addresseeId, target.id)),
        and(eq(friendshipsTable.requesterId, target.id), eq(friendshipsTable.addresseeId, account.id)),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.status === "accepted") {
      res.status(409).json({ error: "Already friends" });
    } else if (existing.status === "pending") {
      res.status(409).json({ error: "Friend request already pending" });
    } else {
      res.status(409).json({ error: "A friendship record already exists" });
    }
    return;
  }

  const [friendship] = await db
    .insert(friendshipsTable)
    .values({ requesterId: account.id, addresseeId: target.id, status: "pending" })
    .returning();

  res.status(201).json({
    id: friendship.id,
    requesterId: friendship.requesterId,
    addresseeId: friendship.addresseeId,
    status: friendship.status,
  });
});

// GET /api/friends/requests — incoming pending requests
router.get("/friends/requests", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;

  const rows = await db
    .select({
      friendship: friendshipsTable,
      requester: { id: accountsTable.id, username: accountsTable.username },
    })
    .from(friendshipsTable)
    .innerJoin(accountsTable, eq(accountsTable.id, friendshipsTable.requesterId))
    .where(
      and(
        eq(friendshipsTable.addresseeId, account.id),
        eq(friendshipsTable.status, "pending"),
      ),
    );

  const requests = rows.map((r) => ({
    id: r.friendship.id,
    from: { accountId: r.requester.id, username: r.requester.username },
    createdAt: r.friendship.createdAt,
  }));

  res.json({ requests });
});

// PATCH /api/friends/requests/:id — accept or decline
router.patch("/friends/requests/:id", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;
  const { id } = req.params as { id: string };

  const parsed = z.object({ action: z.enum(["accept", "decline"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "action must be 'accept' or 'decline'" });
    return;
  }

  const { action } = parsed.data;

  const [friendship] = await db
    .select()
    .from(friendshipsTable)
    .where(
      and(
        eq(friendshipsTable.id, id),
        eq(friendshipsTable.addresseeId, account.id),
        eq(friendshipsTable.status, "pending"),
      ),
    )
    .limit(1);

  if (!friendship) {
    res.status(404).json({ error: "Friend request not found" });
    return;
  }

  const newStatus = action === "accept" ? "accepted" : "declined";
  const [updated] = await db
    .update(friendshipsTable)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(friendshipsTable.id, id))
    .returning();

  res.json({ id: updated.id, status: updated.status });
});

// DELETE /api/friends/:id — unfriend (delete by friendship id)
router.delete("/friends/:id", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;
  const { id } = req.params as { id: string };

  const [friendship] = await db
    .select()
    .from(friendshipsTable)
    .where(
      and(
        eq(friendshipsTable.id, id),
        or(
          eq(friendshipsTable.requesterId, account.id),
          eq(friendshipsTable.addresseeId, account.id),
        ),
      ),
    )
    .limit(1);

  if (!friendship) {
    res.status(404).json({ error: "Friendship not found" });
    return;
  }

  await db.delete(friendshipsTable).where(eq(friendshipsTable.id, id));
  res.json({ ok: true });
});

export default router;
