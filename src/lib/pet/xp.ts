import type { Grade, PetSpecies } from "@/lib/db/schema";
import { categorizeTopic, dominantSpecies } from "./species";

export const XP_PER_GRADE: Record<Grade, number> = {
  right: 3,
  hard: 1,
  wrong: 0,
};

export function xpForGrade(grade: Grade): number {
  return XP_PER_GRADE[grade];
}

/**
 * Cumulative XP needed to reach `level`.
 *   level 1 → 0
 *   level 2 → 50
 *   level 3 → 150
 *   level 4 → 300
 *   level 5 → 500
 *   level 6 → 750
 * Curve: 25 * (level - 1) * level.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 25 * (level - 1) * level;
}

export function levelFor(xp: number): number {
  if (xp < 0) return 1;
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

/**
 * Map level → evolution stage.
 *   stage 1 (egg)      lvl 1–2
 *   stage 2 (baby)     lvl 3–5
 *   stage 3 (juvenile) lvl 6–9
 *   stage 4 (adult)    lvl 10–14
 *   stage 5 (epic)     lvl 15+
 */
export function stageFor(level: number): number {
  if (level >= 15) return 5;
  if (level >= 10) return 4;
  if (level >= 6) return 3;
  if (level >= 3) return 2;
  return 1;
}

export interface LevelProgress {
  level: number;
  stage: number;
  xpInLevel: number;
  xpNeeded: number;
  percent: number;
}

export function progressInLevel(xp: number): LevelProgress {
  const level = levelFor(xp);
  const stage = stageFor(level);
  const baseXp = xpForLevel(level);
  const nextXp = xpForLevel(level + 1);
  const xpInLevel = xp - baseXp;
  const xpNeeded = nextXp - baseXp;
  const percent =
    xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 0;
  return { level, stage, xpInLevel, xpNeeded, percent };
}

export interface PetState {
  xp: number;
  level: number;
  stage: number;
  species: PetSpecies;
  topicTally: Record<string, number>;
}

export interface XpDelta {
  next: PetState;
  xpAwarded: number;
  leveledUp: boolean;
  evolved: boolean;
  speciesShifted: boolean;
  prevLevel: number;
  prevStage: number;
  prevSpecies: PetSpecies;
}

/**
 * Pure: compute the next pet state given a grade on a deck of `topic`.
 * Does no I/O — used by both the server action and the unit tests.
 */
export function applyXp(
  prev: PetState,
  grade: Grade,
  topic: string,
): XpDelta {
  const award = xpForGrade(grade);
  const matchedSpecies = categorizeTopic(topic);
  const tally = { ...prev.topicTally };
  if (award > 0) {
    tally[matchedSpecies] = (tally[matchedSpecies] ?? 0) + award;
  }
  const xp = prev.xp + award;
  const level = levelFor(xp);
  const stage = stageFor(level);
  const species = dominantSpecies(tally);
  return {
    next: { xp, level, stage, species, topicTally: tally },
    xpAwarded: award,
    leveledUp: level > prev.level,
    evolved: stage > prev.stage,
    speciesShifted: species !== prev.species,
    prevLevel: prev.level,
    prevStage: prev.stage,
    prevSpecies: prev.species,
  };
}
