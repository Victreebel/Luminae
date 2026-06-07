---
name: Vite HMR WebSocket keepalive — Replit proxy
description: How to keep the Vite HMR WebSocket alive through Replit's ~30s proxy idle timeout.
---

## The problem
Replit's reverse proxy drops WebSocket connections after ~30 s of idle. The game's `/ws` socket
avoids this with 10 s bidirectional ping/pong. The Vite HMR socket (path `/`) dropped every ~30 s,
making the dev banner briefly flash "reconnecting" — visible as an apparent page refresh or crash
mid-game.

## Root cause
Vite 7 sends `{type:"ping"}` from the client every `hmr.timeout` ms (default 30 000 ms). The Vite
server **never responds**, so only the client→server direction has traffic. Replit's proxy requires
**bidirectional** activity — if either direction is idle for 30 s, the connection is dropped.

## What was tried and FAILED

1. **`(server.ws as any).wss`** — Vite 7 does NOT expose the underlying ws.Server as a property on
   `server.ws`. The `wss` variable is a local closure inside `createWebSocketServer`, NOT a property
   of the returned HotChannel object. The plugin silently returned early every time.

2. **`server.ws.send('__hmr_keepalive__', {})` broadcast** — Does call `wss.clients.forEach()`
   correctly internally, BUT the application-level JSON message was NOT treated as keepalive traffic
   by the proxy. Connections still dropped at 13-25 s intervals.

3. **`window.WebSocket` patch sending raw `"ping"` strings** — caused server `"pong"` response →
   client tried `JSON.parse("pong")` → SyntaxError → Vite reconnected MORE aggressively (~12 s).

## What WORKS — two-part fix in `vite.config.ts`

1. `server.hmr.timeout: 10000` — Vite client sends `{type:"ping"}` every 10 s (client→server).

2. `hmrServerKeepalive` plugin (`apply: 'serve'`) — iterates `server.ws.clients` and calls
   `(client as any).socket.ping()` on each raw ws.WebSocket every 8 s.
   This sends WS **protocol-level PING frames** (RFC 6455 opcode 0x9). The browser responds with a
   PONG (opcode 0xA) automatically — creating **guaranteed bidirectional** traffic that resets the
   proxy idle timer on both halves of the connection.

**Why protocol-level, not application messages:**
Protocol-level ping/pong is handled at the WS framing layer by all proxy software. Application-level
JSON blobs may not be treated as "keepalive traffic" by the proxy.

**Vite 7 socket access:** `server.ws.clients` is a `Set<HotChannelClient>`. Each HotChannelClient
exposes the raw `ws.WebSocket` as `client.socket` (confirmed in Vite 7.3.2 source:
`clientsMap.set(socket, { send(...) {...}, socket })`). Access via `(client as any).socket`.

**Result:** After the initial ~45 s startup warmup, the connection stayed alive for **5+ minutes**
in testing, vs. drops every 10-25 s before the fix.

**How to apply:** Any future change to `vite.config.ts` must preserve both `server.hmr.timeout: 10000`
and the `hmrServerKeepalive` plugin. The plugin is safe: per-socket try/catch, `apply: 'serve'` only.
