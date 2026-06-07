import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

// Replit's reverse proxy drops idle WebSocket connections after ~30 s.
// The game's /ws WebSocket avoids this by having both the client AND server
// exchange pings every 10 s — creating bidirectional traffic in both
// directions of the proxy.
//
// Vite's HMR WS sends {type:"ping"} from the CLIENT every `hmr.timeout` ms
// (default 30 s), but the Vite server never responds.  Without a server→client
// reply the proxy sees only one-directional traffic and still drops at 30 s.
//
// Fix (two parts):
//   1. server.hmr.timeout:10000 — client sends {type:"ping"} every 10 s
//      (client→server direction, keeps that half of the proxy alive).
//   2. hmrServerKeepalive plugin — broadcasts a server→client frame every 8 s
//      via the supported server.ws.send() API (the server→client direction).
//
// NOTE: Vite 7 does NOT expose the underlying ws.Server as a property on
// server.ws — it is a local closure variable — so hooking per-socket message
// listeners via (server.ws as any).wss does not work in Vite 7.  Use the
// documented server.ws.send() broadcast instead.
function hmrServerKeepalive(): Plugin {
  return {
    name: 'hmr-server-keepalive',
    apply: 'serve',
    configureServer(server) {
      // Send WS protocol-level PING frames (RFC 6455 opcode 0x9) to every
      // connected HMR client every 8 s.  The browser must respond with a PONG
      // (opcode 0xA) automatically — creating guaranteed bidirectional traffic
      // that resets the Replit proxy idle timer in both directions.
      //
      // Why not server.ws.send() / broadcast?
      //   server.ws.send() sends application-level JSON messages that the proxy
      //   may or may not count as keepalive traffic depending on its config.
      //   Protocol-level ping/pong is handled at the WS framing layer and is
      //   the standard keepalive mechanism across all proxy software.
      //
      // Vite 7 exposes the raw ws.WebSocket as client.socket on each
      // HotChannelClient in server.ws.clients (verified in Vite 7.3.2 source).
      const interval = setInterval(() => {
        for (const client of server.ws.clients) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawSocket = (client as any).socket;
            if (rawSocket?.readyState === 1 /* OPEN */) {
              rawSocket.ping();
            }
          } catch { /* socket may be closing */ }
        }
      }, 8000);
      server.httpServer?.once('close', () => clearInterval(interval));
    },
  };
}

// PORT and BASE_PATH are required at runtime (dev server / preview), but the
// production build is a pure static asset emit and doesn't need them. The
// production deploy serves the built files via the artifact's static handler,
// so we only enforce these vars when we actually need to bind a port.
const isBuild = process.argv.includes("build");

const rawPort = process.env.PORT;
let port = 5173;
if (rawPort) {
  const parsed = Number(rawPort);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }
  port = parsed;
} else if (!isBuild) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    hmrServerKeepalive(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      // Let vite-plugin-pwa inject the manifest link tag and build the SW.
      // We supply our own manifest.json from public/ so injectManifest picks
      // it up; setting manifest:false would skip the <link> injection.
      includeAssets: [
        "favicon.svg",
        "favicon-32.png",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
        "opengraph.jpg",
      ],
      manifest: {
        id: "/",
        name: "Luminae",
        short_name: "Luminae",
        description: "Forge cosmic affinities. Claim eminence.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0a0c14",
        theme_color: "#0a0c14",
        categories: ["games", "entertainment"],
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        screenshots: [
          {
            src: "/opengraph.jpg",
            sizes: "1200x630",
            type: "image/jpeg",
            // @ts-expect-error form_factor not yet in vite-plugin-pwa types
            form_factor: "wide",
            label: "Luminae game board",
          },
        ],
      },
      workbox: {
        // Precache all JS/CSS/HTML + card art + icons
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2,webp}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Never intercept API or WebSocket traffic
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/ws/],
        runtimeCaching: [
          // Google Fonts stylesheet — cache-first, 1 year
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-css",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts files — cache-first, 1 year
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // API calls — NetworkFirst so multiplayer state is always fresh,
          // falls back to cache when offline.
          {
            urlPattern: /^.*\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-responses",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    // Vite's built-in client-side ping fires every `hmr.timeout` ms.
    // Default is 30 000 ms — exactly the Replit proxy idle timeout, so
    // the ping races against the drop and loses.  15 s keeps the HMR
    // WebSocket alive without flooding the connection.
    hmr: { timeout: 10000 },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
