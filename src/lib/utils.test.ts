import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cn, formatRelative } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("deduplicates conflicting tailwind utilities (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });
});

describe("formatRelative", () => {
  const FIXED = new Date("2026-04-22T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'never' for null/undefined", () => {
    expect(formatRelative(null)).toBe("never");
    expect(formatRelative(undefined)).toBe("never");
  });

  it("accepts Date and string input", () => {
    expect(formatRelative(FIXED)).toBe("today");
    expect(formatRelative(FIXED.toISOString())).toBe("today");
  });

  it("labels adjacent days", () => {
    const tomorrow = new Date(FIXED.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(FIXED.getTime() - 24 * 60 * 60 * 1000);
    expect(formatRelative(tomorrow)).toBe("tomorrow");
    expect(formatRelative(yesterday)).toBe("yesterday");
  });

  it("formats future and past deltas", () => {
    const in5 = new Date(FIXED.getTime() + 5 * 24 * 60 * 60 * 1000);
    const past3 = new Date(FIXED.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelative(in5)).toBe("in 5d");
    expect(formatRelative(past3)).toBe("3d ago");
  });
});
