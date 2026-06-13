// Dev-only: rolling in-memory snapshot buffer for turn rewind.
// All call sites are gated with process.env.NODE_ENV !== 'production'.
// In production, this module is never imported and the routes don't register.

const BUFFER_SIZE = 10;
const buffers = new Map<string, Record<string, unknown>[]>();

/** Snapshot the current state (deep-cloned) before applying an action. */
export function pushSnapshot(roomId: string, state: Record<string, unknown>): void {
  if (!buffers.has(roomId)) buffers.set(roomId, []);
  const buf = buffers.get(roomId)!;
  buf.push(JSON.parse(JSON.stringify(state)));
  if (buf.length > BUFFER_SIZE) buf.shift();
}

/** Pop the most-recent snapshot (oldest-to-newest; pop = most recent). */
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
}
