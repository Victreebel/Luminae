import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { db } from "@workspace/db";
import { playersTable } from "@workspace/db";
import type { Player } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

// roomId → Map<playerId, ws>
const connections = new Map<string, Map<string, WebSocket>>();

export function getConnectedPlayerIds(roomId: string): Set<string> {
  const room = connections.get(roomId);
  if (!room) return new Set();
  return new Set(room.keys());
}

export function broadcastToRoom(roomId: string, payload: unknown): void {
  const room = connections.get(roomId);
  if (!room) return;
  const msg = JSON.stringify(payload);
  for (const [, ws] of room) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

export function sendToPlayer(roomId: string, playerId: string, payload: unknown): void {
  const room = connections.get(roomId);
  if (!room) return;
  const ws = room.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

// Strip plannedAction / plannedActionCancelReason for all players except the
// viewer.  Generic over any formatted state object whose players array carries
// those fields.  Call this before sending state to a specific client so that
// players cannot read each other's planned moves via REST or WebSocket.
export function filterStateForPlayer<
  T extends {
    players: Array<{
      playerId: string;
      plannedAction: unknown;
      plannedActionCancelReason: unknown;
    }>;
  },
>(state: T, viewerPlayerId: string): T {
  return {
    ...state,
    players: state.players.map((p) =>
      p.playerId === viewerPlayerId
        ? p
        : { ...p, plannedAction: null, plannedActionCancelReason: null },
    ),
  };
}

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    handleConnection(ws, req).catch((err) => {
      logger.error({ err }, "Unhandled error in WebSocket connection handler");
      try {
        ws.close(1011, "Internal server error");
      } catch {
        // already closed
      }
    });
  });

  logger.info("WebSocket server initialized at /ws");
}

async function handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
  const urlStr = req.url ?? "";
  const url = new URL(urlStr, "http://localhost");
  const roomId = url.searchParams.get("roomId");
  const sessionToken = url.searchParams.get("sessionToken");

  if (!roomId || !sessionToken) {
    ws.close(1008, "Missing roomId or sessionToken");
    return;
  }

  // Authenticate
  let player: Player | undefined;

  try {
    const rows = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.sessionToken, sessionToken))
      .limit(1);
    player = rows[0];
  } catch (err) {
    logger.error({ err, roomId }, "DB error during WebSocket auth");
    ws.close(1011, "Internal server error");
    return;
  }

  if (!player || player.roomId !== roomId) {
    ws.close(1008, "Unauthorized");
    return;
  }

  const playerId = player.id;
  const playerName = player.name;

  // Register connection
  if (!connections.has(roomId)) {
    connections.set(roomId, new Map());
  }
  connections.get(roomId)!.set(playerId, ws);

  // Mark connected in DB — non-fatal if this fails
  try {
    await db
      .update(playersTable)
      .set({ isConnected: true })
      .where(eq(playersTable.id, playerId));
  } catch (err) {
    logger.warn({ err, roomId, playerId }, "Failed to mark player connected in DB");
  }

  logger.info({ roomId, playerId }, "Player connected via WebSocket");

  // Notify room of reconnect
  broadcastToRoom(roomId, {
    type: "player_connected",
    playerId,
    playerName,
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { type: string; text?: string };
      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      } else if (msg.type === "chat_message") {
        const text = (msg.text ?? "").trim().slice(0, 200);
        if (text) {
          broadcastToRoom(roomId, {
            type: "chat_message",
            playerId,
            playerName,
            text,
            timestamp: Date.now(),
          });
        }
      }
    } catch {
      // ignore malformed
    }
  });

  ws.on("close", () => {
    handleClose(ws, roomId, playerId, playerName).catch((err) => {
      logger.error({ err, roomId, playerId }, "Unhandled error in WebSocket close handler");
    });
  });

  ws.on("error", (err) => {
    logger.error({ err, roomId, playerId }, "WebSocket error");
  });
}

async function handleClose(ws: WebSocket, roomId: string, playerId: string, playerName: string): Promise<void> {
  const room = connections.get(roomId);
  if (!room) return; // Room already cleaned up by a concurrent close — skip double-disconnect.
  // Only clean up if this socket is still the registered connection for this player.
  // A newer reconnect may have already replaced it — in that case, leave the new
  // connection intact and skip the disconnect logic entirely.
  if (room.get(playerId) !== ws) return;
  room.delete(playerId);
  if (room.size === 0) connections.delete(roomId);

  try {
    await db
      .update(playersTable)
      .set({ isConnected: false })
      .where(eq(playersTable.id, playerId));
  } catch (err) {
    logger.warn({ err, roomId, playerId }, "Failed to mark player disconnected in DB");
  }

  logger.info({ roomId, playerId }, "Player disconnected");

  broadcastToRoom(roomId, {
    type: "player_disconnected",
    playerId,
    playerName,
  });
}
