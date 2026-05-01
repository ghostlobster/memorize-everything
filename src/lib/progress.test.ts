import { describe, it, expect } from "vitest";
import { computeStreak } from "./progress";

describe("computeStreak", () => {
  const today = new Date("2026-05-01T12:00:00Z");

  it("returns 0 for empty activity", () => {
    expect(computeStreak([], today)).toBe(0);
  });

  it("returns 0 when today has no activity", () => {
    expect(computeStreak(["2026-04-30", "2026-04-29"], today)).toBe(0);
  });

  it("returns 1 when only today has activity", () => {
    expect(computeStreak(["2026-05-01"], today)).toBe(1);
  });

  it("returns 2 for today and yesterday", () => {
    expect(computeStreak(["2026-04-30", "2026-05-01"], today)).toBe(2);
  });

  it("returns 7 for a full week run ending today", () => {
    const days = ["2026-04-25", "2026-04-26", "2026-04-27", "2026-04-28",
                  "2026-04-29", "2026-04-30", "2026-05-01"];
    expect(computeStreak(days, today)).toBe(7);
  });

  it("stops at a gap — today + 3 days ago but not yesterday", () => {
    expect(computeStreak(["2026-04-28", "2026-05-01"], today)).toBe(1);
  });

  it("ignores future dates", () => {
    expect(computeStreak(["2026-05-01", "2026-05-02", "2026-05-03"], today)).toBe(1);
  });

  it("handles timestamp strings with time component", () => {
    expect(computeStreak(["2026-05-01T08:00:00Z", "2026-04-30T22:00:00Z"], today)).toBe(2);
  });
});
