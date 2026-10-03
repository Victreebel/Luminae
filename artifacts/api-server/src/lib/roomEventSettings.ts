import type { EventFrequency } from "@workspace/game-types";

interface RoomEventSettings {
  gameMode: string;
  scenarioId?: string | null;
  eventFrequency?: string | null;
}

export function canCustomizeRoomEvents(room: RoomEventSettings): boolean {
  return !room.scenarioId && (room.gameMode === "standard" || room.gameMode === "custom");
}

/** Old regular lobbies inherit the standard rate; scenarios own their Event schedule. */
export function getRoomEventFrequency(room: RoomEventSettings): EventFrequency {
  if (!canCustomizeRoomEvents(room)) return "off";
  return room.eventFrequency === "off" || room.eventFrequency === "frequent"
    ? room.eventFrequency
    : "standard";
}
