import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const host = "127.0.0.1";
const port = 4321;
const baseURL = `http://${host}:${port}/riftboundoc/`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["line"]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: isCI ? `npm run preview -- --host ${host} --port ${port}` : `npm run dev -- --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
