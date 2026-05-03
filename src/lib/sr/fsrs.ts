/**
 * FSRS v5 — Free Spaced Repetition Scheduler (version 5).
 *
 * A drop-in replacement for the SM-2 scheduler in sm2.ts.
 * State mapping to existing schema columns:
 *   ease        → difficulty D ∈ [1, 10]
 *   intervalDays → stability S (days to 90 % retention)
 *   repetition  → review count (reset to 0 on Again)
 *
 * Only three ratings are used (no Easy):
 *   wrong → Again (1), hard → Hard (2), right → Good (3)
 *
 * Default weights from the FSRS v5 reference implementation.
 * DECAY and FACTOR are fixed constants; at 90 % target retention
 * the due interval equals the stability in days.
 */

import type { Grade } from "@/lib/db/schema";
import type { SchedulerState, SchedulerUpdate } from "./sm2";

// prettier-ignore
const W = [
  0.4072,  // w[0]  initial S for Again
  1.1829,  // w[1]  initial S for Hard
  3.1262,  // w[2]  initial S for Good
  15.4722, // w[3]  initial S for Easy
  7.2102,  // w[4]  initial D base
  0.5316,  // w[5]  initial D decay
  1.0651,  // w[6]  D delta weight
  0.0589,  // w[7]  D mean-reversion weight
  1.5330,  // w[8]  recall S factor (exp)
  0.1544,  // w[9]  recall S stability exponent
  1.0071,  // w[10] recall S retrievability factor
  1.9313,  // w[11] lapse S base
  0.1549,  // w[12] lapse S difficulty exponent
  0.2440,  // w[13] lapse S stability growth
  2.0755,  // w[14] lapse S retrievability decay
  0.1002,  // w[15] Hard penalty multiplier
  2.9898,  // w[16] Easy bonus multiplier
] as const;

// At target retention R_TARGET = 0.9, interval = stability (in days).
const DECAY = -0.5;
const FACTOR = 19 / 81; // = 0.9^(1/DECAY) − 1

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type Rating = 1 | 2 | 3 | 4;

function gradeToRating(grade: Grade): Rating {
  switch (grade) {
    case "wrong": return 1;
    case "hard":  return 2;
    case "right": return 3;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Probability of recall after `t` days with stability `s`. */
function retrievability(t: number, s: number): number {
  if (s <= 0) return 0;
  return Math.pow(1 + FACTOR * (t / s), DECAY);
}

/** Initial stability for the first review of a new card. */
function initialStability(rating: Rating): number {
  return W[rating - 1];
}

/** Initial difficulty for the first review of a new card (1=easiest, 10=hardest). */
function initialDifficulty(rating: Rating): number {
  return clamp(W[4] - Math.exp(W[5] * (rating - 1)) + 1, 1, 10);
}

/** Updated difficulty after a review. */
function nextDifficulty(d: number, rating: Rating): number {
  const d0Easy = initialDifficulty(4);
  const delta = d - W[6] * (rating - 3);
  return clamp(W[7] * d0Easy + (1 - W[7]) * delta, 1, 10);
}

/** Next stability after a successful recall. */
function nextRecallStability(d: number, s: number, r: number, rating: Rating): number {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus   = rating === 4 ? W[16] : 1;
  return s * (
    Math.exp(W[8]) *
    (11 - d) *
    Math.pow(s, -W[9]) *
    (Math.exp(W[10] * (1 - r)) - 1) *
    hardPenalty *
    easyBonus +
    1
  );
}

/** Next stability after forgetting (Again rating). */
function nextForgetStability(d: number, s: number, r: number): number {
  return (
    W[11] *
    Math.pow(d, -W[12]) *
    (Math.pow(s + 1, W[13]) - 1) *
    Math.exp(W[14] * (1 - r))
  );
}

/**
 * Schedule the next review using FSRS v5.
 * Pure — no DB, no side effects.
 */
export function scheduleFsrs(
  prev: SchedulerState,
  grade: Grade,
  now: Date = new Date(),
): SchedulerUpdate {
  const rating = gradeToRating(grade);

  if (prev.repetition === 0) {
    // First review of a new card — use initial values.
    const s = initialStability(rating);
    const d = initialDifficulty(rating);
    const intervalDays = Math.max(1, Math.round(s));
    return {
      repetition: rating === 1 ? 0 : 1,
      intervalDays,
      ease: d,
      nextDueAt: new Date(now.getTime() + intervalDays * MS_PER_DAY),
    };
  }

  // Existing card: ease stores D, intervalDays stores S.
  const s = Math.max(0.1, prev.intervalDays);
  const d = clamp(prev.ease, 1, 10);
  const t = prev.intervalDays; // elapsed time ≈ scheduled interval
  const r = retrievability(t, s);

  const newD = nextDifficulty(d, rating);
  const newS =
    rating === 1
      ? Math.max(0.1, nextForgetStability(d, s, r))
      : Math.max(s, nextRecallStability(d, s, r, rating));
  const intervalDays = Math.max(1, Math.round(newS));

  return {
    repetition: rating === 1 ? 0 : prev.repetition + 1,
    intervalDays,
    ease: newD,
    nextDueAt: new Date(now.getTime() + intervalDays * MS_PER_DAY),
  };
}
