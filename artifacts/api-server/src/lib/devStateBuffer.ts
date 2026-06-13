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

export function snapshotCount(roomId: string): number {
  return buffers.get(roomId)?.length ?? 0;
}

export function clearBuffer(roomId: string): void {
  buffers.delete(roomId);
  seededVersions.delete(roomId);
}
