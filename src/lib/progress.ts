/**
 * Computes the current study streak in days.
 * @param activityDays - ISO date strings (YYYY-MM-DD) for days with at least one review
 * @param today - reference date (defaults to now; injectable for testing)
 */
export function computeStreak(
  activityDays: string[],
  today: Date = new Date(),
): number {
  const daySet = new Set(activityDays.map((d) => d.slice(0, 10)));
  const cur = new Date(today);
  cur.setHours(0, 0, 0, 0);
  let streak = 0;
  while (daySet.has(cur.toISOString().slice(0, 10))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}
