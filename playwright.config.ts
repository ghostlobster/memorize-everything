import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "3000";
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Playwright is opt-in for CI. Tests run only when a dev server is available
 * (either started by `webServer` below, or when E2E_BASE_URL points at a
 * preview deployment).
 *
 * Run locally:
 *   pnpm exec playwright install chromium
 *   pnpm e2e
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Only start a local server when we weren't given a remote URL.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm build && pnpm start",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          // Stubs so the build & auth routes don't crash when no real DB is wired.
          // The smoke test only exercises the unauthenticated landing page.
          DATABASE_URL:
            process.env.DATABASE_URL ?? "postgresql://stub:stub@localhost:5432/stub",
          DATABASE_URL_UNPOOLED:
            process.env.DATABASE_URL_UNPOOLED ??
            "postgresql://stub:stub@localhost:5432/stub",
          AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-placeholder-secret",
          AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID ?? "stub",
          AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET ?? "stub",
          DEFAULT_MODEL_PROVIDER: "google",
          GOOGLE_GENERATIVE_AI_API_KEY:
            process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "stub",
        },
      },
});
