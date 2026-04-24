import { spawnSync } from "node:child_process";
import path from "node:path";

/**
 * Runs once before Playwright spawns the webServer or any tests.
 * Reseeds the pglite data directory so every test run starts from
 * the same state.
 */
export default async function globalSetup() {
  const dataDir =
    process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".e2e-db");

  const res = spawnSync(
    "pnpm",
    ["tsx", "scripts/seed-e2e.ts"],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        PGLITE_DATA_DIR: dataDir,
      },
    },
  );

  if (res.status !== 0) {
    throw new Error(`seed-e2e failed with status ${res.status}`);
  }
}
