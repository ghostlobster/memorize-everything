/**
 * Builds a 6-row × 7-col month grid (Mon–Sun).
 * Each cell is an ISO date string (YYYY-MM-DD) or null for padding days.
 *
 * @param year  - full year (e.g. 2026)
 * @param month - 1-indexed month (1 = January … 12 = December)
 */
export function buildMonthGrid(
  year: number,
  month: number,
): (string | null)[][] {
  // First day of the month (0=Sun … 6=Sat)
  const firstDay = new Date(year, month - 1, 1).getDay();
  // Convert Sun-based to Mon-based offset (Mon=0 … Sun=6)
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (string | null)[] = [];

  // Leading padding
  for (let i = 0; i < startOffset; i++) cells.push(null);

  // Month days
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(iso);
  }

  // Trailing padding to fill 6 rows × 7 cols = 42 cells
  while (cells.length < 42) cells.push(null);

  // Chunk into weeks
  const grid: (string | null)[][] = [];
  for (let i = 0; i < 42; i += 7) {
    grid.push(cells.slice(i, i + 7));
  }
  return grid;
}

/**
 * Parses a `?month=YYYY-MM` URL param.
 * Falls back to the current month when the param is absent or malformed.
 */
export function parseMonthParam(param: string | undefined): {
  year: number;
  month: number;
} {
  if (param) {
    const match = param.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      if (month >= 1 && month <= 12) return { year, month };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Returns the ISO YYYY-MM string for the previous month. */
export function prevMonth(year: number, month: number): string {
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Returns the ISO YYYY-MM string for the next month. */
export function nextMonth(year: number, month: number): string {
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
