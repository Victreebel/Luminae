// Dev-only: rolling in-memory snapshot buffer for turn rewind.
// All call sites are gated with process.env.NODE_ENV !== 'production'.
// In production, this module is never imported and the routes don't register.

const BUFFER_SIZE = 10;
const buffers = new Map<string, Record<string, unknown>[]>();

// Track the last DB version we auto-seeded for each room so polling the GET
// state route doesn't keep inserting duplicate snapshots.
const seededVersions = new Map<string, number>();

/** Snapshot the current state (deep-cloned) before applying an action. */
export function pushSnapshot(roomId: string, state: Record<string, unknown>): void {
  if (!buffers.has(roomId)) buffers.set(roomId, []);
  const buf = buffers.get(roomId)!;
  buf.push(JSON.parse(JSON.stringify(state)));
  if (buf.length > BUFFER_SIZE) buf.shift();
}

/**
 * Seed the buffer once from the DB state when a room is first fetched in this
 * server session. Skipped if we have already seeded this version or the buffer
 * already has action-based snapshots (which are more precise).
 */
export function seedFromDb(roomId: string, state: Record<string, unknown>): void {
  const version = (state as { version?: number }).version ?? -1;
  if (seededVersions.get(roomId) === version) return;
  seededVersions.set(roomId, version);
  // Only seed when empty — don't overwrite action snapshots from this session.
  if ((buffers.get(roomId)?.length ?? 0) === 0) {
    pushSnapshot(roomId, state);
  }
}

/** Pop the most-recent snapshot (returns null when buffer is empty). */
export function popSnapshot(roomId: string): Record<string, unknown> | null {
  const buf = buffers.get(roomId);
  if (!buf || buf.length === 0) return null;
  return buf.pop()!;
}

/**
 * Find the most-recent snapshot that has pendingSummonEvents, pop it and all
 * more-recent snapshots, and return the target state plus how many steps were
 * consumed. Returns null if no such snapshot exists in the buffer.
 */
export function popToSummon(roomId: string): { state: Record<string, unknown>; steps: number } | null {
  const buf = buffers.get(roomId);
  if (!buf || buf.length === 0) return null;

  // Scan backward (newest → oldest) for the first snapshot with pending arrivals.
  for (let i = buf.length - 1; i >= 0; i--) {
    const snapshot = buf[i];
    const pending = (snapshot as { pendingSummonEvents?: unknown[] }).pendingSummonEvents;
    if (Array.isArray(pending) && pending.length > 0) {
      const steps = buf.length - i;
      const target = snapshot;
      // Remove this snapshot and everything after it.
      buf.splice(i);
      return { state: target, steps };
    }
  }
  return null;
}

/** True if the buffer contains at least one snapshot with pendingSummonEvents. */
export function hasSummonSnapshot(roomId: string): boolean {
  const buf = buffers.get(roomId);
  if (!buf) return false;
  return buf.some(s => {
    const p = (s as { pendingSummonEvents?: unknown[] }).pendingSummonEvents;
    return Array.isArray(p) && p.length > 0;
  });
}

export function snapshotCount(roomId: string): number {
  return buffers.get(roomId)?.length ?? 0;
}

export function clearBuffer(roomId: string): void {
  buffers.delete(roomId);
  seededVersions.delete(roomId);
}
