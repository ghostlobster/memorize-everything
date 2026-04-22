import { describe, it, expect } from "vitest";
import { schedule, initialState, EASE_MIN, EASE_MAX } from "./sm2";

const NOW = new Date("2026-04-22T00:00:00Z");

describe("sm2", () => {
  it("initial state is sane", () => {
    const s = initialState();
    expect(s.repetition).toBe(0);
    expect(s.intervalDays).toBe(0);
    expect(s.ease).toBe(2.5);
  });

  it("first right: repetition=1, interval=1d", () => {
    const next = schedule(initialState(), "right", NOW);
    expect(next.repetition).toBe(1);
    expect(next.intervalDays).toBe(1);
    expect(next.ease).toBeGreaterThan(2.5);
    expect(next.nextDueAt.toISOString()).toBe("2026-04-23T00:00:00.000Z");
  });

  it("second right: repetition=2, interval=6d", () => {
    let s = schedule(initialState(), "right", NOW);
    s = schedule(s, "right", NOW);
    expect(s.repetition).toBe(2);
    expect(s.intervalDays).toBe(6);
  });

  it("third right: interval scales by (updated) ease", () => {
    let s = schedule(initialState(), "right", NOW);
    s = schedule(s, "right", NOW);
    s = schedule(s, "right", NOW);
    expect(s.repetition).toBe(3);
    // Using post-update ease (standard SM-2 variant): interval = round(6 * newEase)
    expect(s.intervalDays).toBe(Math.round(6 * s.ease));
    expect(s.intervalDays).toBeGreaterThan(6);
  });

  it("wrong resets repetition and schedules 1 day out", () => {
    let s = schedule(initialState(), "right", NOW);
    s = schedule(s, "right", NOW);
    s = schedule(s, "right", NOW);
    s = schedule(s, "wrong", NOW);
    expect(s.repetition).toBe(0);
    expect(s.intervalDays).toBe(1);
  });

  it("hard increments repetition modestly and lowers ease", () => {
    let s = schedule(initialState(), "right", NOW);
    s = schedule(s, "right", NOW); // interval 6d
    const priorEase = s.ease;
    s = schedule(s, "hard", NOW);
    expect(s.repetition).toBe(3);
    expect(s.intervalDays).toBe(Math.round(6 * 1.2));
    expect(s.ease).toBeLessThan(priorEase);
  });

  it("ease is clamped to [EASE_MIN, EASE_MAX]", () => {
    let s = initialState();
    for (let i = 0; i < 20; i++) s = schedule(s, "wrong", NOW);
    expect(s.ease).toBeGreaterThanOrEqual(EASE_MIN);

    s = initialState();
    for (let i = 0; i < 20; i++) s = schedule(s, "right", NOW);
    expect(s.ease).toBeLessThanOrEqual(EASE_MAX);
  });

  it("schedule is pure (same input → same output)", () => {
    const a = schedule({ repetition: 2, intervalDays: 6, ease: 2.5 }, "right", NOW);
    const b = schedule({ repetition: 2, intervalDays: 6, ease: 2.5 }, "right", NOW);
    expect(a).toEqual(b);
  });
});
