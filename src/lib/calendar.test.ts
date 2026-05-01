import { describe, it, expect } from "vitest";
import { buildMonthGrid, parseMonthParam, prevMonth, nextMonth } from "./calendar";

describe("buildMonthGrid", () => {
  it("returns a 6×7 grid", () => {
    const grid = buildMonthGrid(2026, 5);
    expect(grid).toHaveLength(6);
    for (const row of grid) expect(row).toHaveLength(7);
  });

  it("has the correct number of non-null day cells", () => {
    const grid = buildMonthGrid(2026, 5); // May 2026 has 31 days
    const days = grid.flat().filter(Boolean);
    expect(days).toHaveLength(31);
  });

  it("starts May 2026 on Friday (index 4 in Mon-based week)", () => {
    const grid = buildMonthGrid(2026, 5);
    const firstRow = grid[0];
    // Mon-Sun: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4
    // May 1 2026 is a Friday → first 4 cells null
    expect(firstRow[0]).toBeNull();
    expect(firstRow[1]).toBeNull();
    expect(firstRow[2]).toBeNull();
    expect(firstRow[3]).toBeNull();
    expect(firstRow[4]).toBe("2026-05-01");
  });

  it("starts February 2026 on Sunday (index 6 in Mon-based week)", () => {
    const grid = buildMonthGrid(2026, 2);
    const firstRow = grid[0];
    expect(firstRow[6]).toBe("2026-02-01");
    // First 6 cells are null
    for (let i = 0; i < 6; i++) expect(firstRow[i]).toBeNull();
  });

  it("uses 28 cells for February 2025 (non-leap)", () => {
    const grid = buildMonthGrid(2025, 2);
    const days = grid.flat().filter(Boolean);
    expect(days).toHaveLength(28);
  });

  it("uses 29 cells for February 2024 (leap year)", () => {
    const grid = buildMonthGrid(2024, 2);
    const days = grid.flat().filter(Boolean);
    expect(days).toHaveLength(29);
  });

  it("formats day strings as YYYY-MM-DD with zero-padding", () => {
    const grid = buildMonthGrid(2026, 1);
    const firstDay = grid.flat().find(Boolean);
    expect(firstDay).toBe("2026-01-01");
  });
});

describe("parseMonthParam", () => {
  it("returns current month when param is undefined", () => {
    const now = new Date();
    const result = parseMonthParam(undefined);
    expect(result.year).toBe(now.getFullYear());
    expect(result.month).toBe(now.getMonth() + 1);
  });

  it("parses a valid YYYY-MM string", () => {
    expect(parseMonthParam("2026-05")).toEqual({ year: 2026, month: 5 });
  });

  it("falls back to current month on invalid string", () => {
    const now = new Date();
    const result = parseMonthParam("not-a-month");
    expect(result.year).toBe(now.getFullYear());
  });

  it("rejects month 00 as invalid", () => {
    const now = new Date();
    expect(parseMonthParam("2026-00").month).toBe(now.getMonth() + 1);
  });

  it("rejects month 13 as invalid", () => {
    const now = new Date();
    expect(parseMonthParam("2026-13").month).toBe(now.getMonth() + 1);
  });
});

describe("prevMonth / nextMonth", () => {
  it("prevMonth wraps December to previous year", () => {
    expect(prevMonth(2026, 1)).toBe("2025-12");
  });

  it("nextMonth wraps December forward", () => {
    expect(nextMonth(2025, 12)).toBe("2026-01");
  });

  it("nextMonth increments normally", () => {
    expect(nextMonth(2026, 5)).toBe("2026-06");
  });

  it("prevMonth decrements normally", () => {
    expect(prevMonth(2026, 5)).toBe("2026-04");
  });
});
