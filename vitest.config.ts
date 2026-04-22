import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.ts"],
      exclude: [
        // Tests themselves
        "src/lib/**/*.test.ts",
        // DB schema: type definitions only
        "src/lib/db/schema.ts",
        // I/O-only modules that wrap Next.js / DB / external APIs.
        // Covered by E2E / manual testing; mocking them adds brittle
        // fixtures without catching real regressions.
        "src/lib/db/client.ts",
        "src/lib/auth/config.ts",
        "src/lib/auth/handlers.ts",
        "src/lib/auth/require-user.ts",
        "src/lib/ai/generate-deck.ts",
        "src/lib/ai/prime-card.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
