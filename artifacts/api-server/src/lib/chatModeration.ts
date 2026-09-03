import { and, eq, inArray } from "drizzle-orm";
import { accountBlocksTable, db, moderationEventsTable } from "@workspace/db";

const DIRECT_HARM = /\b(?:kys|kill\s+yourself|go\s+die|doxx?(?:ing|ed)?)\b/gi;
const URL = /(?:https?:\/\/|www\.)\S+/gi;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?:\+?\d[\s().-]*){8,}\b/g;

export function filterChatText(input: string): { text: string; filtered: boolean } {
  const normalized = input
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  const text = normalized
    .replace(URL, "[link removed]")
    .replace(EMAIL, "[contact removed]")
    .replace(PHONE, "[contact removed]")
    .replace(DIRECT_HARM, "[message removed]");
  return { text, filtered: text !== normalized };
}

export async function blockedRecipientAccountIds(
  senderAccountId: string,
  recipientAccountIds: readonly string[],
): Promise<Set<string>> {
  if (recipientAccountIds.length === 0) return new Set();
  const rows = await db
    .select({ accountId: accountBlocksTable.blockerAccountId })
    .from(accountBlocksTable)
    .where(and(
      eq(accountBlocksTable.blockedAccountId, senderAccountId),
      inArray(accountBlocksTable.blockerAccountId, [...recipientAccountIds]),
    ));
  return new Set(rows.map((row) => row.accountId));
}

export async function recordModerationEvent(input: {
  accountId: string | null;
  roomId: string;
  playerId: string;
  eventType: "chat_filtered" | "chat_rate_limited" | "chat_rejected";
  detail?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(moderationEventsTable).values({
    accountId: input.accountId,
    roomId: input.roomId,
    playerId: input.playerId,
    eventType: input.eventType,
    detail: input.detail ?? {},
  });
}
