/**
 * Minimal SM-2 implementation.
 *
 * Three grades → internal quality mapping:
 *   wrong → 2 (lapse; reset repetition, shorten ease)
 *   hard  → 3 (marginal success)
 *   right → 5 (clean recall)
 *
 * Ease factor is clamped to [1.3, 2.8].
 * First two successful repetitions use fixed intervals (1d, 6d).
 */

import type { Grade } from "@/lib/db/schema";

export const EASE_MIN = 1.3;
export const EASE_MAX = 2.8;
export const EASE_START = 2.5;

export interface SchedulerState {
  repetition: number;
  intervalDays: number;
  ease: number;
}

export interface SchedulerUpdate extends SchedulerState {
  nextDueAt: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function qualityFor(grade: Grade): number {
  switch (grade) {
    case "wrong":
      return 2;
    case "hard":
      return 3;
    case "right":
      return 5;
  }
}

/**
 * Compute the next scheduler state given the previous state and a grade.
 * Pure — no DB, no clock other than the optional `now` argument.
 */
export function schedule(
  prev: SchedulerState,
  grade: Grade,
  now: Date = new Date(),
): SchedulerUpdate {
  const q = qualityFor(grade);
  const prevEase = clamp(prev.ease, EASE_MIN, EASE_MAX);

  // Ease update (standard SM-2 formula).
  const rawEase = prevEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  const ease = clamp(rawEase, EASE_MIN, EASE_MAX);

  let repetition: number;
  let intervalDays: number;

  if (grade === "wrong") {
    repetition = 0;
    intervalDays = 1;
  } else if (grade === "hard") {
    // Hard: small positive progress without jumping the full ease multiplier.
    repetition = prev.repetition + 1;
    if (prev.intervalDays <= 0) intervalDays = 1;
    else intervalDays = Math.max(1, Math.round(prev.intervalDays * 1.2));
  } else {
    // right
    repetition = prev.repetition + 1;
    if (repetition === 1) intervalDays = 1;
    else if (repetition === 2) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(prev.intervalDays * ease));
  }

  const nextDueAt = new Date(now.getTime() + intervalDays * MS_PER_DAY);
  return { repetition, intervalDays, ease, nextDueAt };
}

export function initialState(): SchedulerState {
  return { repetition: 0, intervalDays: 0, ease: EASE_START };
}
