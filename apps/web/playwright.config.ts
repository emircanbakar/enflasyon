import { defineConfig, devices } from "@playwright/test";

/**
 * Uçtan uca ve erişilebilirlik testleri (docs/web.md, Bölüm 9). Üretim build'ine
 * karşı (`next start`) çalışır; önce `pnpm --filter web build` gerekir.
 */
const PORT = 3920;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    locale: "tr-TR",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 15"] } },
  ],
  webServer: {
    command: `pnpm exec next start --port ${String(PORT)}`,
    port: PORT,
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
});
