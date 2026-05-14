import { defineConfig, devices } from 'playwright/test';

const executablePath = process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: './overlay-audit',
  testMatch: '**/*.spec.ts',
  timeout: 120_000,
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        baseURL: 'http://localhost:80',
        launchOptions: { executablePath, headless: true },
        screenshot: 'only-on-failure',
      },
    },
  ],
  reporter: [['list']],
});
