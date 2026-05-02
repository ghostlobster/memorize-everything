import { describe, it, expect } from "vitest";
import { computeBestStreak, formatDuration } from "./session-stats";

describe("computeBestStreak", () => {
  it("returns 0 for empty array", () => {
    expect(computeBestStreak([])).toBe(0);
  });

  it("returns 0 when all wrong", () => {
    expect(computeBestStreak(["wrong", "wrong", "wrong"])).toBe(0);
  });

  it("returns 0 when all hard", () => {
    expect(computeBestStreak(["hard", "hard"])).toBe(0);
  });

  it("returns total count when all right", () => {
    expect(computeBestStreak(["right", "right", "right"])).toBe(3);
  });

  it("returns longest run in mixed sequence", () => {
    // right, right, wrong, right, right, right, wrong, right
    expect(
      computeBestStreak(["right", "right", "wrong", "right", "right", "right", "wrong", "right"]),
    ).toBe(3);
  });

  it("handles streak at start", () => {
    expect(computeBestStreak(["right", "right", "right", "wrong"])).toBe(3);
  });

  it("handles streak at end", () => {
    expect(computeBestStreak(["wrong", "right", "right", "right"])).toBe(3);
  });

  it("returns 1 for single right", () => {
    expect(computeBestStreak(["right"])).toBe(1);
  });

  it("hard resets the streak", () => {
    expect(computeBestStreak(["right", "right", "hard", "right"])).toBe(2);
  });
});

describe("formatDuration", () => {
  it("formats sub-minute as seconds", () => {
    expect(formatDuration(5000)).toBe("5s");
  });

  it("rounds to nearest second", () => {
    expect(formatDuration(5499)).toBe("5s");
    expect(formatDuration(5500)).toBe("6s");
  });

  it("formats exactly 60 seconds", () => {
    expect(formatDuration(60000)).toBe("1m 0s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90000)).toBe("1m 30s");
  });

  it("formats multi-minute sessions", () => {
    expect(formatDuration(300000)).toBe("5m 0s");
    expect(formatDuration(185000)).toBe("3m 5s");
  });

  it("formats 0ms as 0s", () => {
    expect(formatDuration(0)).toBe("0s");
  });
});
