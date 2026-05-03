import type { Grade } from "@/lib/db/schema";

/**
 * Returns true when the most recent `threshold` consecutive grades are all
 * "wrong", indicating the card is a leech and should be auto-suspended.
 *
 * An intervening non-wrong grade resets the consecutive run.
 * If fewer than `threshold` reviews exist the card cannot be a leech yet.
 *
 * @param recentGrades - Ordered newest-first (index 0 = most recent review).
 * @param threshold    - Number of consecutive wrongs required (default 4).
 */
export function isLeech(recentGrades: Grade[], threshold: number): boolean {
  if (recentGrades.length < threshold) return false;
  return recentGrades.slice(0, threshold).every((g) => g === "wrong");
}

export function leechThreshold(): number {
  const raw = process.env.LEECH_THRESHOLD;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
}
