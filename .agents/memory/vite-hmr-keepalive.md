---
name: Vite HMR WebSocket keepalive — Replit proxy
description: How to keep the Vite HMR WebSocket alive through Replit's ~30s proxy idle timeout.
---

## The problem
Replit's reverse proxy drops WebSocket connections after ~30 s of idle. The game's `/ws` socket
avoids this with 10 s bidirectional ping/pong. The Vite HMR socket (path `/`) dropped every ~30 s,
making the dev banner briefly flash "reconnecting" — visible as an apparent page refresh.

## Root cause
Vite 7 already has a built-in client-side ping: the browser sends `{type:"ping"}` every `hmr.timeout`
ms (default 30 000 ms). The Vite server **never responds**, so only the client→server direction has
traffic. Replit's proxy requires **bidirectional** activity — if either direction is idle for 30 s,
the connection is dropped. Client-only pings are not enough.

## What was tried and failed
- Server-side `socket.ping()` and `server.ws.send` broadcast: server→client frames alone don't reset the proxy timer.
- `window.WebSocket` patch sending raw `"ping"` strings: caused server `"pong"` response → client
  tried `JSON.parse("pong")` → SyntaxError → Vite reconnected more aggressively (intervals shortened to ~12 s).
- `server.hmr.timeout: 15000` alone (client ping at 15 s, no server response): still dropped at ~30 s.

## What works
Two-part fix in `vite.config.ts`:
1. `server.hmr.timeout: 10000` — client sends `{type:"ping"}` every 10 s (same as game WS)
2. `hmrPongReply` plugin (`apply: 'serve'`) — hooks into `server.ws.wss` via `configureServer`,
   listens for `{type:"ping"}` TEXT messages from each client, immediately replies with
   `{type:"pong"}` TEXT message. Creates bidirectional 10 s traffic identical to the game WS.

**Why:** The `{type:"pong"}` message from the server is an unrecognized type in Vite's client
`handleMessage` switch — it falls through silently. No client-side error.

**How to apply:** Any future change to `vite.config.ts` must preserve both the `hmr.timeout`
setting and the `hmrPongReply` plugin. Removing either part breaks the keepalive.
