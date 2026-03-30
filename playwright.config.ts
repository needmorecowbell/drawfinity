import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "screenshots",
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://localhost:1420",
    viewport: { width: 1280, height: 720 },
    screenshot: "off",
  },
  webServer: {
    command: "npm run dev",
    port: 1420,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: "screenshots",
      use: { browserName: "chromium" },
    },
  ],
});
