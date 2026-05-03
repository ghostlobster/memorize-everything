import { describe, it, expect } from "vitest";
import { scheduleFsrs } from "./fsrs";
import type { SchedulerState } from "./sm2";

const NOW = new Date("2026-04-22T00:00:00Z");

const NEW_CARD: SchedulerState = { repetition: 0, intervalDays: 0, ease: 0 };

describe("fsrs — new card (first review)", () => {
  it("Good: S=3.1262, interval=3, difficulty≈5.31", () => {
    const r = scheduleFsrs(NEW_CARD, "right", NOW);
    expect(r.repetition).toBe(1);
    expect(r.intervalDays).toBe(3); // round(3.1262)
    expect(r.ease).toBeCloseTo(5.31, 1);
  });

  it("Hard: S=1.1829, interval=1, difficulty≈6.51", () => {
    const r = scheduleFsrs(NEW_CARD, "hard", NOW);
    expect(r.repetition).toBe(1);
    expect(r.intervalDays).toBe(1); // round(1.1829)
    expect(r.ease).toBeCloseTo(6.51, 1);
  });

  it("Wrong: S=0.4072, interval=1, difficulty≈7.21", () => {
    const r = scheduleFsrs(NEW_CARD, "wrong", NOW);
    expect(r.repetition).toBe(0); // again resets
    expect(r.intervalDays).toBe(1); // max(1, round(0.4072))
    expect(r.ease).toBeCloseTo(7.21, 1);
  });

  it("nextDueAt is `interval` days after `now`", () => {
    const r = scheduleFsrs(NEW_CARD, "right", NOW);
    const expected = new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000);
    expect(r.nextDueAt.toISOString()).toBe(expected.toISOString());
  });
});

describe("fsrs — subsequent reviews", () => {
  it("Good → Good: stability grows beyond first interval", () => {
    const s1 = scheduleFsrs(NEW_CARD, "right", NOW);           // interval=3
    const s2 = scheduleFsrs(s1, "right", NOW);                  // reviewed at day 3
    expect(s2.intervalDays).toBeGreaterThan(s1.intervalDays);
    expect(s2.repetition).toBe(2);
  });

  it("Good → Hard: smaller growth and Hard penalty applied", () => {
    const s1 = scheduleFsrs(NEW_CARD, "right", NOW);            // interval=3
    const sGood = scheduleFsrs(s1, "right", NOW);
    const sHard = scheduleFsrs(s1, "hard",  NOW);
    // Hard grows less than Good
    expect(sHard.intervalDays).toBeLessThan(sGood.intervalDays);
    expect(sHard.repetition).toBe(2);
  });

  it("Good → Wrong: stability shrinks, difficulty rises, repetition resets", () => {
    const s1 = scheduleFsrs(NEW_CARD, "right", NOW);            // interval=3, D≈5.31
    const sWrong = scheduleFsrs(s1, "wrong", NOW);
    expect(sWrong.repetition).toBe(0);                          // reset
    expect(sWrong.intervalDays).toBeLessThanOrEqual(s1.intervalDays);
    // Difficulty increases after a lapse
    expect(sWrong.ease).toBeGreaterThan(s1.ease);
  });

  it("repeated Good reviews grow interval monotonically", () => {
    let s = scheduleFsrs(NEW_CARD, "right", NOW);
    for (let i = 0; i < 5; i++) {
      const next = scheduleFsrs(s, "right", NOW);
      expect(next.intervalDays).toBeGreaterThanOrEqual(s.intervalDays);
      s = next;
    }
  });
});

describe("fsrs — difficulty bounds", () => {
  it("difficulty is clamped to [1, 10]", () => {
    // Drive difficulty toward extremes with many Hard or Wrong reviews.
    let s = scheduleFsrs(NEW_CARD, "right", NOW);
    for (let i = 0; i < 20; i++) s = scheduleFsrs(s, "wrong", NOW);
    expect(s.ease).toBeLessThanOrEqual(10);
    expect(s.ease).toBeGreaterThanOrEqual(1);

    s = scheduleFsrs(NEW_CARD, "right", NOW);
    for (let i = 0; i < 20; i++) s = scheduleFsrs(s, "right", NOW);
    expect(s.ease).toBeLessThanOrEqual(10);
    expect(s.ease).toBeGreaterThanOrEqual(1);
  });

  it("interval is always at least 1", () => {
    const r = scheduleFsrs(NEW_CARD, "wrong", NOW);
    expect(r.intervalDays).toBeGreaterThanOrEqual(1);
  });
});

describe("fsrs — purity", () => {
  it("same input always produces the same output", () => {
    const state: SchedulerState = { repetition: 2, intervalDays: 10, ease: 5.5 };
    const a = scheduleFsrs(state, "right", NOW);
    const b = scheduleFsrs(state, "right", NOW);
    expect(a).toEqual(b);
  });

  it("does not mutate the input state", () => {
    const state: SchedulerState = { repetition: 1, intervalDays: 3, ease: 5.31 };
    const copy = { ...state };
    scheduleFsrs(state, "hard", NOW);
    expect(state).toEqual(copy);
  });
});
