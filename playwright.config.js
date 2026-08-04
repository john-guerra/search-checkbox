import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "list" : "html",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Always rebuild before serving, so e2e can never test a stale dist/.
  webServer: {
    command: "npm run build && npx http-server . -p 4173 --silent -c-1",
    url: "http://127.0.0.1:4173/example/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
