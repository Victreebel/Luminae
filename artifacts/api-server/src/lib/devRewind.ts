import type { GameStateData } from "./gameEngine";

// DEV-ONLY: in-memory snapshot store for the rewind-to-pre-luminary feature.
// Captures the game state immediately before the first Luminary is claimed in
// a room.  Not persisted — lives for the server process lifetime, which is
// sufficient for local dev sessions.
//
// All exports are no-ops when NODE_ENV === "production".

const snapshots = new Map<string, GameStateData>();

export function captureDevSnapshot(roomId: string, state: GameStateData): void {
  if (process.env.NODE_ENV === "production") return;
  if (snapshots.has(roomId)) return;
  snapshots.set(roomId, JSON.parse(JSON.stringify(state)) as GameStateData);
}

export function getDevSnapshot(roomId: string): GameStateData | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  return snapshots.get(roomId);
}

export function clearDevSnapshot(roomId: string): void {
  snapshots.delete(roomId);
}
