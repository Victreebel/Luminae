/**
 * Playwright configuration for the WebSocket connection-stability smoke test.
 *
 * Why a dedicated config?
 * The test idles for 60 seconds, so it needs a much higher per-test timeout
 * than the overlay-audit and dialog-keyboard suites.  A shared config with a
 * 120 s timeout would make every other test slower to fail; keeping this
 * separate lets each suite have the right timeout.
 *
 * Target:
 *   Desktop Chromium — tests here are about network/WebSocket behavior, not
 *   mobile layout, so the standard desktop viewport is correct.
 *
 * Run:
 *   pnpm --filter @workspace/scripts run test:ws-keepalive
 */

import { defineConfig, devices } from 'playwright/test';

const executablePath = process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: './connection-stability',
  testMatch: '**/*.spec.ts',

  // 60 s idle + ~30 s for setup/navigation/screenshots = 90 s of real work.
  // 150 s gives a comfortable buffer before Playwright times the test out.
  timeout: 150_000,

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:80',
        launchOptions: {
          executablePath,
          headless: true,
          // Chrome aggressively throttles setInterval in headless/background
          // tabs, sometimes to once per minute.  The game client relies on a
          // 10 s setInterval to send ping frames; if that fires late the proxy
          // drops the WebSocket after its 30 s idle window.  These flags keep
          // timers firing at full speed, matching real foreground-tab behavior.
          args: [
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
          ],
        },
        screenshot: 'only-on-failure',
      },
    },
  ],

  reporter: [['list']],
});
