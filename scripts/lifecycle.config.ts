import { defineConfig, devices } from 'playwright/test';

const executablePath = process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
const baseURL = process.env.LUMINAE_E2E_BASE_URL ?? 'http://127.0.0.1:5191';

export default defineConfig({
  testDir: './lifecycle',
  testMatch: '**/*.spec.ts',
  timeout: 240_000,
  fullyParallel: false,
  projects: [
    {
      name: 'phone-rematch',
      use: {
        ...devices['Pixel 5'],
        baseURL,
        viewport: { width: 390, height: 844 },
        launchOptions: { executablePath, headless: true },
        screenshot: 'only-on-failure',
      },
    },
    {
      name: 'desktop-rematch',
      use: {
        ...devices['Desktop Chrome'],
        baseURL,
        viewport: { width: 1440, height: 900 },
        launchOptions: { executablePath, headless: true },
        screenshot: 'only-on-failure',
      },
    },
  ],
  reporter: [['list']],
});
