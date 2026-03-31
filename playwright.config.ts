import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "screenshots",
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://localhost:1430",
    viewport: { width: 1280, height: 720 },
    screenshot: "off",
  },
  webServer: {
    command: "npx vite --port 1430 --strictPort",
    port: 1430,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "screenshots",
      use: { browserName: "chromium" },
    },
  ],
});
