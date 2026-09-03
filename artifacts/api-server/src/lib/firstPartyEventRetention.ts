import { lt } from "drizzle-orm";
import { db, firstPartyEventsTable } from "@workspace/db";
import { logger } from "./logger";

export const FIRST_PARTY_EVENT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function firstPartyEventRetentionCutoff(now = Date.now()): Date {
  return new Date(now - FIRST_PARTY_EVENT_RETENTION_MS);
}

export async function pruneExpiredFirstPartyEvents(now = Date.now()): Promise<void> {
  await db.delete(firstPartyEventsTable).where(
    lt(firstPartyEventsTable.occurredAt, firstPartyEventRetentionCutoff(now)),
  );
}

export function startFirstPartyEventRetention(): () => void {
  const prune = () => {
    void pruneExpiredFirstPartyEvents().catch((error: unknown) => {
      logger.warn({ error }, "First-party event retention cleanup deferred");
    });
  };
  prune();
  const timer = setInterval(prune, CLEANUP_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
