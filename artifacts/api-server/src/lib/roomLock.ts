// Per-room async mutex. Single-instance only — fine for our deployment model.
// Ensures all read-modify-write cycles on a room's game state are serialized,
// regardless of whether the writer is a human action handler or the AI turn
// runner.

const queues = new Map<string, Promise<unknown>>();

export async function withRoomLock<T>(
  roomId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = queues.get(roomId) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  // Chain the new task after the previous one finishes (success or failure)
  const task = prev.then(() => fn()).finally(() => {
    release();
    // Clean up if we're the tail of the queue
    if (queues.get(roomId) === current) {
      queues.delete(roomId);
    }
  });
  const current = prev.then(() => next);
  queues.set(roomId, current);
  return task;
}

// Tracks which rooms already have an AI runner in-flight so we don't spawn
// duplicate concurrent runners.
const aiRunnerInflight = new Set<string>();

export function tryClaimAiRunner(roomId: string): boolean {
  if (aiRunnerInflight.has(roomId)) return false;
  aiRunnerInflight.add(roomId);
  return true;
}

export function releaseAiRunner(roomId: string): void {
  aiRunnerInflight.delete(roomId);
}
