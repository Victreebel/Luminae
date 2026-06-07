import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

// Replit's reverse proxy drops idle WebSocket connections after ~30 s.
// The game's /ws WebSocket avoids this with 10 s bidirectional ping/pong.
// The Vite HMR socket needs the same treatment.
//
// Vite's client sends {type:"ping"} every `hmr.timeout` ms, but the Vite
// server never responds.  Without a server→client reply the proxy sees only
// one-directional traffic and still drops after 30 s.
//
// Fix (two parts):
//   1. server.hmr.timeout:10000 — client sends {type:"ping"} every 10 s.
//   2. hmrPongReply plugin — for each connected HMR WebSocket, listens for
//      {type:"ping"} TEXT messages and immediately replies {type:"pong"}.
//      This mirrors exactly what the game WS does, giving the proxy
//      bidirectional traffic every ~10 s on both halves of the connection.
//
// NOTE: In Vite 7, "connection" is listed in wsServerEvents, so
// server.ws.on("connection", fn) routes to the underlying ws.Server and
// delivers a raw ws.WebSocket instance — the correct public API for
// per-socket listeners.  The old (server.ws as any).wss path was removed.
function hmrPongReply(): Plugin {
  return {
    name: 'hmr-pong-reply',
    apply: 'serve',
    configureServer(server) {
      // Each new HMR client connection gets a raw ws.WebSocket socket.
      // We attach a message listener that answers every {type:"ping"} with
      // {type:"pong"}.  The Vite client silently ignores unknown message
      // types, so this has no side-effect on hot-reload behavior.
      server.ws.on('connection', (socket: import('ws').WebSocket) => {
        socket.on('message', (data: import('ws').RawData) => {
          try {
            const msg = JSON.parse(data.toString()) as { type?: string };
            if (msg?.type === 'ping') {
              socket.send(JSON.stringify({ type: 'pong' }));
            }
          } catch {
            // non-JSON frame (binary or raw ping) — ignore
          }
        });
      });
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
    hmrPongReply(),
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
    // the ping races against the drop and loses.  10 s keeps the HMR
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
