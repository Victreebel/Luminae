import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { db } from "@workspace/db";
import { playersTable } from "@workspace/db";
import type { Player } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import {
  getBalanceLabMemoryPlayerBySession,
  getBalanceLabMemoryRoom,
  setBalanceLabMemoryPlayerConnected,
  type BalanceLabMemoryPlayer,
} from "./balanceLabRooms";
import { isRuntimeOriginAllowed } from "./originPolicy";
import {
  LUMINAE_WEBSOCKET_PROTOCOL,
  sessionTokenFromProtocolHeader,
} from "./websocketSecurity";
export { filterStateForPlayer } from "./stateProjection";

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

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 16 * 1024,
    perMessageDeflate: false,
    handleProtocols(protocols) {
      return protocols.has(LUMINAE_WEBSOCKET_PROTOCOL)
        ? LUMINAE_WEBSOCKET_PROTOCOL
        : false;
    },
  });

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
  return wss;
}

async function handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  if (!isRuntimeOriginAllowed(origin)) {
    ws.close(1008, "Origin not allowed");
    return;
  }

  const urlStr = req.url ?? "";
  const url = new URL(urlStr, "http://localhost");
  const roomId = url.searchParams.get("roomId");
  const sessionToken = sessionTokenFromProtocolHeader(req.headers["sec-websocket-protocol"])
    ?? url.searchParams.get("sessionToken");

  if (!roomId || !sessionToken) {
    ws.close(1008, "Missing roomId or sessionToken");
    return;
  }

  // Authenticate
  let player: Player | BalanceLabMemoryPlayer | undefined;

  const memoryRoom = getBalanceLabMemoryRoom(roomId);
  if (memoryRoom) {
    player = getBalanceLabMemoryPlayerBySession(roomId, sessionToken) ?? undefined;
  } else {
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
  const roomConnections = connections.get(roomId)!;
  const previousConnection = roomConnections.get(playerId);
  roomConnections.set(playerId, ws);
  if (previousConnection && previousConnection !== ws) {
    previousConnection.close(1000, "Reconnected elsewhere");
  }

  if (memoryRoom) {
    setBalanceLabMemoryPlayerConnected(roomId, playerId, true);
  } else {
    // Mark connected in DB — non-fatal if this fails
    try {
      await db
        .update(playersTable)
        .set({ isConnected: true })
        .where(eq(playersTable.id, playerId));
    } catch (err) {
      logger.warn({ err, roomId, playerId }, "Failed to mark player connected in DB");
    }
  }

  logger.info({ roomId, playerId }, "Player connected via WebSocket");

  // Send WebSocket protocol-level PING frames every 5 s so that intermediate
  // proxies (e.g. Replit's janeway reverse proxy) see real TCP-layer keepalive
  // traffic and reset their idle/lease timers.  This is distinct from the
  // app-level JSON {type:"ping"} that the client sends — protocol PINGs are
  // handled at the WebSocket framing layer and are more likely to be recognised
  // by proxies as genuine keepalive activity.
  // 5 s (not 10 s) ensures the max idle gap is well under any typical proxy
  // idle timeout even when the client-side JSON ping and server PING happen
  // to fire on the same cycle.
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 5_000);

  ws.on("pong", () => {
    // Protocol-level pong received — connection is alive.  No action needed.
  });

  // Notify room of reconnect
  broadcastToRoom(roomId, {
    type: "player_connected",
    playerId,
    playerName,
  });

  let messageWindowStartedAt = Date.now();
  let messagesInWindow = 0;
  ws.on("message", (raw) => {
    const now = Date.now();
    if (now - messageWindowStartedAt >= 10_000) {
      messageWindowStartedAt = now;
      messagesInWindow = 0;
    }
    messagesInWindow += 1;
    if (messagesInWindow > 30) {
      ws.close(1008, "Message rate exceeded");
      return;
    }

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
    clearInterval(pingInterval);
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

  // Yield one event-loop tick so a near-simultaneous reconnect (rapid refresh)
  // has a chance to register its new WS in the connections map before we decide
  // to mark the player offline. Without this yield, a late-firing close handler
  // from the old socket can overwrite the isConnected:true set by the new socket.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  // If the player already reconnected during that tick their new socket is now
  // in the map and wrote isConnected:true — skip our stale disconnect update.
  const freshRoom = connections.get(roomId);
  if (freshRoom?.has(playerId)) return;

  if (getBalanceLabMemoryRoom(roomId)) {
    setBalanceLabMemoryPlayerConnected(roomId, playerId, false);
  } else {
    try {
      await db
        .update(playersTable)
        .set({ isConnected: false })
        .where(eq(playersTable.id, playerId));
    } catch (err) {
      logger.warn({ err, roomId, playerId }, "Failed to mark player disconnected in DB");
    }
  }

  logger.info({ roomId, playerId }, "Player disconnected");

  broadcastToRoom(roomId, {
    type: "player_disconnected",
    playerId,
    playerName,
  });
}
