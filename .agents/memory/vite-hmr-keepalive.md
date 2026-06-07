---
name: Vite HMR WebSocket keepalive — Replit proxy
description: How to keep the Vite HMR WebSocket alive through Replit's ~30s proxy idle timeout.
---

## The problem
Replit's reverse proxy drops WebSocket connections after ~30 s of idle. The game's `/ws` socket
avoids this with 10 s bidirectional ping/pong. The Vite HMR socket dropped every ~30 s,
making the dev banner flash "reconnecting" — visible as an apparent page refresh and causing
cascading game WebSocket disconnect/reconnect in the API server logs.

## Root cause
Vite's client sends `{type:"ping"}` every `hmr.timeout` ms but the server never responds.
Replit's proxy requires **bidirectional** activity — if either direction is idle for 30 s the
connection is dropped. Client-only pings are not enough.

## What was tried and failed
- `server.ws.send()` broadcast every 8 s: server→client frames alone don't reset the proxy
  timer. Both directions must carry traffic within the 30 s window.
- `window.WebSocket` patch sending raw `"ping"` strings: caused `"pong"` response → client
  tried `JSON.parse("pong")` → SyntaxError → Vite reconnected more aggressively (~12 s).
- `(server.ws as any).wss` to hook raw WebSocket: `.wss` was removed in Vite 7.3.2 —
  it is a local closure variable, not a property on `server.ws`. The guard `if (!wss) return`
  silently disabled the plugin entirely.
- `server.ws.clients` + `(client as any).socket.ping()` — protocol-level RFC 6455 PING frames
  via internal socket access. Also relies on undocumented internals (`client.socket`) that may
  break across Vite versions; superseded by the public API approach below.

## What works (current implementation)
Two-part fix in `vite.config.ts`:
1. `server.hmr.timeout: 10000` — client sends `{type:"ping"}` every 10 s.
2. `hmrPongReply` plugin (`apply: 'serve'`) — uses `server.ws.on("connection", socket => { … })`
   to attach a per-socket message listener. Replies to each `{type:"ping"}` with
   `{type:"pong"}` immediately. Creates true bidirectional 10 s traffic identical to the game WS.

**Why `server.ws.on("connection", …)` works in Vite 7:** `"connection"` is listed in Vite 7's
`wsServerEvents` array, so `server.ws.on("connection", fn)` is routed to the underlying
`ws.Server` and delivers a raw `ws.WebSocket` instance. This is the correct public API for
per-socket listeners — no internal hacks required.

**Why:** The `{type:"pong"}` message from the server is an unrecognized type in Vite's client
`handleMessage` switch — it falls through silently. No client-side error or side-effect.

**How to apply:** Any future change to `vite.config.ts` must preserve both the `hmr.timeout`
setting and the `hmrPongReply` plugin. Do NOT revert to `server.ws.send()` broadcast,
`(server.ws as any).wss`, or `server.ws.clients` internal access — all are broken or fragile
for different reasons. The `server.ws.on("connection")` path is the only confirmed working
approach for Vite 7.
