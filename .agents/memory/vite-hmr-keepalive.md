---
name: Vite HMR WebSocket keepalive — Replit proxy
description: How to prevent Vite HMR WebSocket drops from reloading the page on Replit.
---

## The problem
Replit's reverse proxy force-closes **all** WebSocket connections after ~25 s on a **fixed lease**
— regardless of traffic volume or direction. No keepalive strategy can prevent this.

When the HMR WS drops, Vite 7 calls `location.reload()` via this path:
```
handleMessage("custom" / event="vite:ws:disconnect")
  → hmrClient.notifyListeners("vite:ws:disconnect", ...)  ← our listener fires here
  → if (!willUnload) { waitForSuccessfulPing(url) → location.reload() }
```
This triggered a full page reload every ~25 s, resetting all in-progress animations and game state.

## What was tried and FAILED (keepalive approaches)

All keepalive approaches failed because the proxy uses a **fixed lease**, not an idle timer:

1. **`(server.ws as any).wss` + per-socket pong** — Vite 7 does NOT expose `wss` as a property;
   it's a closure variable. Plugin silently returned early every time.
2. **`server.ws.send()` broadcast** — Application-level JSON. Didn't prevent drops.
3. **Protocol-level PING frames** via `(client as any).socket.ping()` — Did create real
   bidirectional traffic, reduced drops from every 20s to one drop per 5+ minutes in isolated
   testing, but the fixed lease means drops still happen regularly in production use.
4. **`hmrPongReply` plugin** — `server.ws.on("connection", ...)` routes to `wss` correctly in
   Vite 7 (verified: `"connection"` is in `wsServerEvents`). Pong replies do reach the browser
   and get processed. Still doesn't prevent the fixed-lease drops.

## What WORKS — `hmrNoReload` plugin in `vite.config.ts`

**Accept that the WS will drop every ~25 s. Prevent the reload instead.**

The plugin injects a `<script type="module">` into `index.html` (dev only) that patches
`location.reload` using a **boolean flag** (not a time window):

```js
let _suppressReload = false;
import.meta.hot.on('vite:ws:disconnect', () => { _suppressReload = true; });
import.meta.hot.on('vite:ws:connect',    () => { _suppressReload = false; });
location.reload = function patchedReload() {
  if (_suppressReload) return;  // swallow proxy-drop polling reload
  _reload();
};
```

**Why boolean, not time-based:** Replit's polling cycle after a drop can take 5–30 s — far outside
any fixed suppression window. The old 1-second window caused a white-out when polling took longer.
Boolean suppression is active for exactly as long as the socket is down.

**Why intentional reloads still work:** `vite:ws:connect` fires the moment the socket reconnects.
Any subsequent `location.reload()` from Vite (changed module that can't hot-swap) fires after
suppression is already off.

The `hmrPongReply` server plugin (also inside `hmrNoReload`) keeps bidirectional ping/pong to
reduce the visible `[vite] connecting...` banner frequency.

**Result:** Zero white-outs from proxy-forced HMR drops; intentional code-change reloads unaffected.

**Vite 7 key facts:**
- `server.ws.clients` → `Set<HotChannelClient>` with `client.socket` (raw ws.WebSocket).
- `server.ws.on("connection", fn)` → routes to underlying `wss.on("connection", fn)` because
  `"connection"` is in `wsServerEvents`.
- `hmr.timeout: 10000` → sets `pingInterval` for client pings (every 10s).
- `willUnload` is a module-level closure var — only settable by a real `beforeunload` event,
  not a synthetic dispatchEvent. Cannot be set from outside the Vite client module.

**How to apply:** Any future change to `vite.config.ts` must preserve the `hmrNoReload` plugin.

## Game WebSocket reconnect banner (use-game-websocket.ts)

The game WS (at `/ws`) goes through the same Replit proxy and drops on a similar idle timeout.

**Effective settings (both sides must match):**
- Server (`websocket.ts`): protocol-level `ws.ping()` every **5 s**
- Client (`use-game-websocket.ts`): app-level JSON ping every **5 s**
- Combined: max idle gap on the wire is ≤5 s, well below any typical proxy idle timeout

**Reconnect banner suppression:**
- Banner grace period: **1.5 s** — banner only appears if socket not reconnected within 1.5 s of drop
- Initial reconnect delay: **400 ms** — fast enough that proxy-forced reconnects complete in ~600–900 ms total, staying under the 1.5 s grace
- Backoff: doubles to max 16 s for genuine server-down scenarios

At 10 s ping intervals the drops happened every 10–17 s and reconnects took 2–3 s (exceeding the grace, showing the banner). At 5 s intervals the drops are far less frequent and reconnects complete in <1 s.
