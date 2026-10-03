import { defineConfig, devices } from "playwright/test";

const port = Number(process.env.LUMINAE_PREPUBLICATION_PORT ?? 4175);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./prepublication",
  testMatch: "**/*.spec.ts",
  timeout: 120_000,
  fullyParallel: false,
  webServer: {
    command: `PORT=${port} pnpm --dir .. --filter @workspace/luminae run dev -- --host 127.0.0.1 --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "compact-phone",
      use: {
        ...devices["Pixel 5"],
        baseURL,
        viewport: { width: 320, height: 568 },
        screenshot: "only-on-failure",
      },
    },
    {
      name: "phone-portrait",
      use: {
        ...devices["Pixel 5"],
        baseURL,
        viewport: { width: 390, height: 844 },
        screenshot: "only-on-failure",
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        baseURL,
        viewport: { width: 768, height: 1024 },
        screenshot: "only-on-failure",
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        baseURL,
        viewport: { width: 1440, height: 900 },
        screenshot: "only-on-failure",
      },
    },
  ],
  reporter: [["list"]],
});
