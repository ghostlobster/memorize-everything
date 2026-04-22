import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { loadEnv, requireEnv } from "./env";

describe("requireEnv", () => {
  const key = "___TEST_ENV_VAR___";
  afterEach(() => {
    delete process.env[key];
  });

  it("returns the value when set", () => {
    process.env[key] = "hello";
    expect(requireEnv(key)).toBe("hello");
  });

  it("throws when missing", () => {
    expect(() => requireEnv(key)).toThrow(/Missing required environment variable/);
  });

  it("throws when empty string", () => {
    process.env[key] = "";
    expect(() => requireEnv(key)).toThrow();
  });
});

describe("loadEnv", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "me-env-"));
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
    delete process.env.A_PLAIN;
    delete process.env.A_QUOTED;
    delete process.env.A_COMMENTED;
    delete process.env.A_ALREADY_SET;
  });

  it("parses unquoted, quoted, and commented lines and respects existing env", () => {
    const dir = fs.mkdtempSync(path.join(tmpDir, "case-"));
    fs.writeFileSync(
      path.join(dir, ".env.local"),
      [
        "# a comment",
        "A_PLAIN=plain-value",
        'A_QUOTED="quoted-value"',
        "A_COMMENTED=visible",
        "A_ALREADY_SET=from-file",
        "",
      ].join("\n"),
    );
    process.env.A_ALREADY_SET = "from-process";
    process.chdir(dir);

    loadEnv();

    expect(process.env.A_PLAIN).toBe("plain-value");
    expect(process.env.A_QUOTED).toBe("quoted-value");
    expect(process.env.A_COMMENTED).toBe("visible");
    // pre-existing env is not overwritten
    expect(process.env.A_ALREADY_SET).toBe("from-process");
  });

  it("is a no-op when no env files exist", () => {
    const dir = fs.mkdtempSync(path.join(tmpDir, "empty-"));
    process.chdir(dir);
    expect(() => loadEnv()).not.toThrow();
  });
});
