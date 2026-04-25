import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const PORT = process.env.PORT ?? "3000";
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Playwright config.
 *
 * Two modes:
 *   - local / CI (default): spawn `next dev` + pglite-backed DB,
 *     authenticated flows covered (golden-path.spec.ts).
 *   - remote (E2E_BASE_URL set): run only the tests that work
 *     against an already-deployed preview. Currently just
 *     landing.spec.ts.
 *
 * The pglite data directory is seeded once in globalSetup (see
 * e2e/global-setup.ts → scripts/seed-e2e.ts) and the same directory
 * is passed to the Next.js webServer via PGLITE_DATA_DIR so both
 * processes share the file-backed store.
 *
 * Run locally:
 *   pnpm exec playwright install --with-deps chromium   # once
 *   pnpm e2e
 */
const PGLITE_DATA_DIR =
  process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".e2e-db");

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/support/**"],
  fullyParallel: false, // pglite is single-writer; keep workers serial
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: process.env.E2E_BASE_URL
    ? undefined
    : "./e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Only start a local server when we weren't given a remote URL.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // `next build && next start` is more deterministic than
        // `next dev`: dev compiles routes on first request which
        // makes the webServer wait flaky in CI, and any module-load
        // error (DB driver, auth config) surfaces at build time
        // rather than mid-test. Build runs against the same
        // DB_DRIVER=pglite seed used at runtime.
        command: "pnpm build && pnpm start",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        env: {
          DB_DRIVER: "pglite",
          PGLITE_DATA_DIR,
          // These are stubs because DB_DRIVER=pglite takes the pglite
          // branch in client.ts; DATABASE_URL is never read. Kept set
          // so Auth.js config module-init doesn't throw.
          DATABASE_URL: "postgresql://stub:stub@localhost:5432/stub",
          DATABASE_URL_UNPOOLED:
            "postgresql://stub:stub@localhost:5432/stub",
          AUTH_SECRET:
            process.env.AUTH_SECRET ?? "e2e-placeholder-secret",
          // Auth.js v5 requires the host to be trusted in
          // production builds (`pnpm start`). Without this, every
          // request to /api/auth/* fails with UntrustedHost.
          AUTH_TRUST_HOST: "true",
          AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID ?? "stub",
          AUTH_GITHUB_SECRET:
            process.env.AUTH_GITHUB_SECRET ?? "stub",
          DEFAULT_MODEL_PROVIDER: "google",
          GOOGLE_GENERATIVE_AI_API_KEY:
            process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "stub",
        },
      },
});
