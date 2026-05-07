/**
 * Capacitor configuration — used when wrapping Luminae as a native iOS/Android app.
 *
 * HOW TO BUILD A NATIVE APP (when ready):
 *
 *   1. Install Capacitor:
 *        pnpm --filter @workspace/luminae add @capacitor/core @capacitor/cli
 *        pnpm --filter @workspace/luminae add @capacitor/ios @capacitor/android
 *
 *   2. Build the web app first:
 *        pnpm --filter @workspace/luminae run build
 *
 *   3. Initialize and sync:
 *        cd artifacts/luminae
 *        npx cap init
 *        npx cap add ios
 *        npx cap add android
 *        npx cap sync
 *
 *   4. Open in Xcode / Android Studio:
 *        npx cap open ios
 *        npx cap open android
 *
 * MULTIPLAYER NOTE:
 *   The serverUrl below must point to your *deployed* production API server, not
 *   localhost, because the native app runs on a real device. After deploying
 *   via Replit, replace the placeholder with your actual domain.
 *
 *   WebSocket connections use wss:// (not ws://) in production automatically
 *   because the server already derives its URL from the HOST header.
 */

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.luminae.game",
  appName: "Luminae",
  webDir: "dist/public",
  // Point native builds at the deployed server. Change this to your real domain.
  // In dev/PWA mode this is unused — the Vite dev server handles everything.
  server: {
    url: "https://your-luminae-domain.replit.app",
    cleartext: false,
  },
  ios: {
    backgroundColor: "#0a0c14",
    contentInset: "always",
  },
  android: {
    backgroundColor: "#0a0c14",
    captureInput: true,
  },
};

export default config;
