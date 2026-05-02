import type { Grade } from "@/lib/db/schema";

export function computeBestStreak(grades: Grade[]): number {
  let best = 0;
  let current = 0;
  for (const g of grades) {
    if (g === "right") {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}
