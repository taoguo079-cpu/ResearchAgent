import { defineConfig, devices } from "@playwright/test";
const webUrl = `http://localhost:${process.env.E2E_WEB_PORT || "3000"}`;

const chromeExecutable =
  process.env.PLAYWRIGHT_CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : undefined);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: webUrl,
    trace: "on-first-retry",
    launchOptions: chromeExecutable
      ? { executablePath: chromeExecutable }
      : undefined,
  },
  projects: [
    {
      name: "chromium-1366",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 768 },
      },
    },
  ],
  webServer: {
    command:
      "powershell -NoProfile -ExecutionPolicy Bypass -File ../scripts/start_dev.ps1",
    url: webUrl,
    reuseExistingServer: process.env.PW_REUSE_SERVER === "1",
    timeout: 120_000,
  },
});
