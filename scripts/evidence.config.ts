import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './evidence',
  timeout: 120_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.LUMINAE_E2E_BASE_URL ?? 'http://127.0.0.1:5191',
    browserName: 'chromium',
    headless: true,
    colorScheme: 'dark',
  },
});
