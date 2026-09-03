import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

// Replit's reverse proxy force-closes WebSocket connections after ~25 s on a
// fixed lease — regardless of traffic.  No keepalive can prevent this.
//
// When the HMR WS drops, Vite 7 calls location.reload() via:
//   handleMessage("custom" / "vite:ws:disconnect")
//     → notifyListeners("vite:ws:disconnect", ...)   ← our listener fires here
//     → if (!willUnload) { waitForSuccessfulPing → location.reload() }
//
// Fix: inject a tiny inline script into index.html (dev only) that registers
// a vite:ws:disconnect listener via import.meta.hot BEFORE Vite's own reload
// check runs.  The listener dispatches a "beforeunload" event, which sets
// Vite's module-level `willUnload = true`, so the reload branch is skipped.
// The HMR socket reconnects in ~200 ms; hot-module updates still work normally.
//
// The hmrPongReply plugin is kept for bidirectional ping/pong which reduces
// visible "[vite] connecting..." banner flashes to users.
function hmrNoReload(): Plugin {
  // Vite 7 calls location.reload() whenever the HMR WebSocket closes
  // (case "vite:ws:disconnect" in handleMessage → waitForSuccessfulPing → reload).
  // On Replit the proxy force-closes every WS connection on a ~25 s fixed lease,
  // so this triggers a full page reload every ~25 s regardless of keepalive traffic.
  //
  // Fix: patch location.reload in the injected script. Suppression is boolean,
  // not time-based: turned ON by vite:ws:disconnect, OFF by vite:ws:connect.
  // This covers the full waitForSuccessfulPing → reload path regardless of how
  // long Vite's polling cycle takes (can be 5–30 s on Replit's proxy).
  // Intentional HMR full-page reloads (changed module that can't hot-swap) still
  // fire normally because suppression ends the moment the socket reconnects.
  const script = `
if (import.meta.hot) {
  const _reload = location.reload.bind(location);
  // When the HMR socket drops (proxy force-close), suppress any location.reload()
  // until the socket successfully reconnects.  This blocks the
  // waitForSuccessfulPing → reload path that Vite triggers after polling,
  // which can take 5–30 s on Replit — far longer than the old 1 s window.
  // Once the socket reconnects (vite:ws:connect), suppression ends immediately
  // so that intentional HMR full-page-reloads (e.g. a module that can't hot-swap)
  // still fire normally.
  let _suppressReload = false;
  import.meta.hot.on('vite:ws:disconnect', () => {
    _suppressReload = true;
  });
  import.meta.hot.on('vite:ws:connect', () => {
    _suppressReload = false;
  });
  Object.defineProperty(location, 'reload', {
    configurable: true,
    value: function patchedReload() {
      if (_suppressReload) return; // swallow proxy-drop polling reload
      _reload();
    }
  });
}
`.trim();

  return {
    name: 'hmr-no-reload',
    apply: 'serve',
    transformIndexHtml(html) {
      // Inject before </head> so it runs before any app code.
      return html.replace('</head>', `<script type="module">\n${script}\n</script>\n</head>`);
    },
    configureServer(server) {
      // Keep bidirectional ping/pong to minimize "[vite] connecting..." banner flashes.
      // "connection" is in wsServerEvents in Vite 7 so this routes to the underlying ws.Server.
      server.ws.on('connection', (socket: import('ws').WebSocket) => {
        socket.on('message', (data: import('ws').RawData) => {
          try {
            const msg = JSON.parse(data.toString()) as { type?: string };
            if (msg?.type === 'ping') {
              socket.send(JSON.stringify({ type: 'pong' }));
            }
          } catch { /* non-JSON frame — ignore */ }
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
const buildStamp = new Date().toISOString();
const buildLabel = process.env.LUMINAE_BUILD_LABEL ?? buildStamp;

export default defineConfig({
  base: basePath,
  define: {
    __LUMINAE_BUILD_STAMP__: JSON.stringify(buildStamp),
    __LUMINAE_BUILD_LABEL__: JSON.stringify(buildLabel),
  },
  plugins: [
    hmrNoReload(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "prompt",
      // Let vite-plugin-pwa generate one authoritative manifest and inject its link.
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
        description: "Harness cosmic Affinities. Forge Artifacts. Gain Eminence.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
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
            label: "Luminae main menu",
          },
        ],
      },
      workbox: {
        // Keep the PWA install light. The generated game art library is large,
        // and precaching it all competes with animation/rendering on mobile and
        // wrapper builds. Browser HTTP cache can handle art assets on demand.
        globPatterns: ["**/*.{js,css,html,ico,svg,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        // Never intercept API or WebSocket traffic.
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
    proxy: {
      "/api": "http://localhost:8080",
      "/ws": {
        target: "ws://localhost:8080",
        ws: true,
      },
    },
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
    proxy: {
      "/api": "http://localhost:8080",
      "/ws": {
        target: "ws://localhost:8080",
        ws: true,
      },
    },
    allowedHosts: true,
  },
});
