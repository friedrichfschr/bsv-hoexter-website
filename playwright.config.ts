import { defineConfig, devices } from "@playwright/test";

const testServerCommand = process.platform === "win32"
  ? 'if exist ".test-editorial-content" rmdir /s /q ".test-editorial-content" & set "EDITORIAL_API_KEY=e2e-editorial-key" && set "EDITORIAL_CONTENT_DIRECTORY=.test-editorial-content" && set "PREVIEW_FORMS_ENABLED=true" && npm run dev -- --hostname 127.0.0.1'
  : "rm -rf .test-editorial-content && EDITORIAL_API_KEY=e2e-editorial-key EDITORIAL_CONTENT_DIRECTORY=.test-editorial-content PREVIEW_FORMS_ENABLED=true npm run dev -- --hostname 127.0.0.1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: testServerCommand,
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
