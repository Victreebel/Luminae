/**
 * Playwright configuration for the dialog keyboard-navigation mobile tests.
 *
 * Why a dedicated config (not the shared playwright.config.ts)?
 * The shared config uses `devices['Desktop Chrome']` with a resized viewport —
 * that only shrinks the viewport; it does not flip isMobile, hasTouch, or the
 * user-agent string.  These tests must emulate a real mobile browser, so we
 * use named device descriptors from the Playwright device registry.
 *
 * Device targets:
 *   • Pixel 5 (Chromium) — Android Chrome emulation
 *     - isMobile: true, hasTouch: true
 *     - viewport 393×851, deviceScaleFactor 2.75
 *     - UA: Mozilla/5.0 (Linux; Android 11; Pixel 5) …
 *
 * Chromium is the only browser installed in this environment; WebKit requires
 * system libraries (libhyphen, libsecret, libatk, libGLESv2 etc.) that are
 * not present on the current host.  Add a WebKit project here once those
 * dependencies are available.
 */

import { defineConfig, devices } from 'playwright/test';

const executablePath = process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: './overlay-audit',
  testMatch: '**/dialog-keyboard-mobile.spec.ts',
  timeout: 120_000,

  projects: [
    {
      name: 'Pixel 5 — Android Chrome (Chromium)',
      use: {
        ...devices['Pixel 5'],
        baseURL: 'http://localhost:80',
        launchOptions: { executablePath, headless: true },
        screenshot: 'only-on-failure',
      },
    },
  ],

  reporter: [['list']],
});
