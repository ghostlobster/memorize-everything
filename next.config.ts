import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  // Keep @electric-sql/pglite out of the Next.js server bundle.
  // pglite uses `new URL(..., import.meta.url)` to locate its WASM
  // payload; once Next bundles it, the URL instance is from a
  // different module realm and Node's fs.readFile rejects it
  // ("path argument must be ... URL"). Marking it external keeps
  // it as a plain runtime require from node_modules, which works.
  // This branch is only exercised when DB_DRIVER=pglite (E2E).
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default config;
