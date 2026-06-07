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
This triggered a full page reload every ~25 s, resetting all in-progress animations and game state
in the sandbox/dev page.

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

The plugin injects a `<script type="module">` into `index.html` (dev only) that:
1. Registers `import.meta.hot.on('vite:ws:disconnect', ...)` — fires before Vite's reload check.
2. Sets `_suppressUntil = Date.now() + 1000` on each disconnect.
3. Patches `location.reload` via `Object.defineProperty` to be a no-op within that 1s window.

The 1s window safely covers only the `waitForSuccessfulPing → reload` path (triggered ~0-200ms
after disconnect) while leaving intentional user-triggered reloads unaffected (those fire only
after real navigation, well outside the 1s window).

**Result:** 1 silent reconnect per ~70s vs. 49 full page reloads per ~86s before the fix.

**Vite 7 key facts:**
- `server.ws.clients` → `Set<HotChannelClient>` with `client.socket` (raw ws.WebSocket).
- `server.ws.on("connection", fn)` → routes to underlying `wss.on("connection", fn)` because
  `"connection"` is in `wsServerEvents`.
- `hmr.timeout: 10000` → sets `pingInterval` for client pings (every 10s).
- `willUnload` is a module-level closure var — only settable by a real `beforeunload` event,
  not a synthetic dispatchEvent. Cannot be set from outside the Vite client module.

**How to apply:** Any future change to `vite.config.ts` must preserve the `hmrNoReload` plugin.
The `hmrPongReply` inside it reduces the visible "[vite] connecting..." banner frequency (fewer
drops get through before being swallowed) so keep it too.
