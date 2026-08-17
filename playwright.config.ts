import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end configuration.
 *
 * By default this builds and serves the app with `next start`. Set `BASE_URL`
 * to run the same suite against a Workers preview (`npm run preview`) or a
 * deployed environment — the acceptance gate requires the suite to pass
 * against the Workers runtime, not only against `next start`, because the two
 * have already diverged once on this project.
 */
const baseURL = process.env.BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"] } },
  ],

  // Skipped when BASE_URL points at an already-running server.
  ...(process.env.BASE_URL
    ? {}
    : {
        webServer: {
          command: "npm run build && npx next start --port 3100",
          url: "http://127.0.0.1:3100/api/health/",
          reuseExistingServer: !process.env.CI,
          timeout: 300_000,
        },
      }),
});
