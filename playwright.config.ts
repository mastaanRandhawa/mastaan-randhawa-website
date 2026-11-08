import { defineConfig } from "@playwright/test";

/**
 * End-to-end checks against the production build (`npm run test:e2e`).
 * Uses the system Chrome channel so no extra browser download is required.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    channel: "chrome",
    viewport: { width: 1280, height: 800 },
    launchOptions: { args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    port: 4173,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
