import { describe, it, expect } from "vitest";
import {
  applyXp,
  levelFor,
  progressInLevel,
  stageFor,
  xpForGrade,
  xpForLevel,
} from "./xp";
import type { PetState } from "./xp";

const initial: PetState = {
  xp: 0,
  level: 1,
  stage: 1,
  species: "pip",
  topicTally: {},
};

describe("xp curve", () => {
  it("xpForGrade matches the published table", () => {
    expect(xpForGrade("right")).toBe(3);
    expect(xpForGrade("hard")).toBe(1);
    expect(xpForGrade("wrong")).toBe(0);
  });

  it("xpForLevel anchors at the documented thresholds", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(50);
    expect(xpForLevel(3)).toBe(150);
    expect(xpForLevel(5)).toBe(500);
    expect(xpForLevel(15)).toBe(25 * 14 * 15);
  });

  it("xpForLevel is strictly increasing", () => {
    let prev = -1;
    for (let l = 1; l <= 20; l++) {
      const cur = xpForLevel(l);
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });

  it("levelFor inverts xpForLevel at thresholds", () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(49)).toBe(1);
    expect(levelFor(50)).toBe(2);
    expect(levelFor(149)).toBe(2);
    expect(levelFor(150)).toBe(3);
    expect(levelFor(10_000)).toBeGreaterThanOrEqual(15);
  });

  it("stageFor maps to documented bands", () => {
    expect(stageFor(1)).toBe(1);
    expect(stageFor(2)).toBe(1);
    expect(stageFor(3)).toBe(2);
    expect(stageFor(5)).toBe(2);
    expect(stageFor(6)).toBe(3);
    expect(stageFor(9)).toBe(3);
    expect(stageFor(10)).toBe(4);
    expect(stageFor(14)).toBe(4);
    expect(stageFor(15)).toBe(5);
    expect(stageFor(99)).toBe(5);
  });

  it("progressInLevel reports a sensible bar", () => {
    const p = progressInLevel(75);
    expect(p.level).toBe(2);
    expect(p.xpInLevel).toBe(25);
    expect(p.xpNeeded).toBe(100);
    expect(p.percent).toBe(25);
  });
});

describe("applyXp", () => {
  it("right on a CS topic awards 3 XP and tallies cyber_fox", () => {
    const r = applyXp(initial, "right", "Transformer attention");
    expect(r.xpAwarded).toBe(3);
    expect(r.next.xp).toBe(3);
    expect(r.next.topicTally.cyber_fox).toBe(3);
    expect(r.next.species).toBe("cyber_fox");
    expect(r.speciesShifted).toBe(true);
    expect(r.leveledUp).toBe(false);
  });

  it("wrong awards 0 XP and does not change tally", () => {
    const r = applyXp(initial, "wrong", "Krebs cycle");
    expect(r.xpAwarded).toBe(0);
    expect(r.next.xp).toBe(0);
    expect(r.next.topicTally).toEqual({});
    expect(r.speciesShifted).toBe(false);
  });

  it("crossing the level-2 threshold flips leveledUp", () => {
    const before: PetState = {
      ...initial,
      xp: 49,
      level: 1,
    };
    const after = applyXp(before, "right", "Algebra");
    expect(after.next.xp).toBe(52);
    expect(after.next.level).toBe(2);
    expect(after.leveledUp).toBe(true);
    expect(after.evolved).toBe(false);
  });

  it("crossing the stage-2 boundary flips evolved", () => {
    const before: PetState = {
      ...initial,
      xp: xpForLevel(3) - 1, // one below level 3
      level: 2,
      stage: 1,
      species: "cyber_fox",
      topicTally: { cyber_fox: 50 },
    };
    const after = applyXp(before, "right", "Coding");
    expect(after.next.level).toBeGreaterThanOrEqual(3);
    expect(after.next.stage).toBe(2);
    expect(after.evolved).toBe(true);
  });

  it("species shifts when a new topic dominates the tally", () => {
    let s: PetState = { ...initial };
    for (let i = 0; i < 10; i++) {
      s = applyXp(s, "right", "Software engineering").next;
    }
    expect(s.species).toBe("cyber_fox");
    let sawShift = false;
    for (let i = 0; i < 20; i++) {
      const r = applyXp(s, "right", "Krebs cycle");
      if (r.speciesShifted) sawShift = true;
      s = r.next;
    }
    expect(s.species).toBe("leaf_axolotl");
    expect(sawShift).toBe(true);
  });

  it("hard on an unmatched topic still tallies the default species", () => {
    const r = applyXp(initial, "hard", "Knitting");
    expect(r.xpAwarded).toBe(1);
    expect(r.next.topicTally.pip).toBe(1);
    expect(r.next.species).toBe("pip");
  });
});
