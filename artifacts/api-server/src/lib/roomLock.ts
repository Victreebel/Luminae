// Per-room async mutex. Single-instance only — fine for our deployment model.
// Ensures all read-modify-write cycles on a room's game state are serialized,
// regardless of whether the writer is a human action handler or the AI turn
// runner.

import { logger } from './logger';

const queues = new Map<string, Promise<unknown>>();

// Report a stalled room operation without violating serialization. Releasing
// the lock while the original task is still running would allow two mutations
// to race against the same room state.
const LOCK_TIMEOUT_MS = 30_000;

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
  const task = prev.then(() => {
    let released = false;
    const doRelease = () => {
      if (released) return;
      released = true;
      release();
      // Clean up if we're the tail of the queue
      if (queues.get(roomId) === current) {
        queues.delete(roomId);
      }
    };
    // Watchdog: forcibly release the lock if fn() never settles.
    const timeout = setTimeout(() => {
      logger.error({ roomId }, 'Room lock held >30 s; subsequent room actions remain queued');
    }, LOCK_TIMEOUT_MS);
    return fn().finally(() => {
      clearTimeout(timeout);
      doRelease();
    });
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
