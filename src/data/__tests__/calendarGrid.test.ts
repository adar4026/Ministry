import { buildMonthGrid, addMonths, WEEKDAYS_SHORT } from "@/data/calendarGrid";

describe("WEEKDAYS_SHORT", () => {
  it("starts the week on Monday", () => {
    expect(WEEKDAYS_SHORT).toEqual(["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]);
  });
});

describe("buildMonthGrid", () => {
  it("pads July 2026 (starts on a Wednesday) with 2 leading blanks", () => {
    // 1 July 2026 is a Wednesday -> Monday-first index 2 (Mon=0, Tue=1, Wed=2).
    const grid = buildMonthGrid(2026, 6); // monthIndex0 6 = July
    expect(grid[0]).toEqual([null, null, 1, 2, 3, 4, 5]);
    expect(grid[grid.length - 1]).toContain(31);
  });

  it("every row has exactly 7 columns", () => {
    const grid = buildMonthGrid(2026, 6);
    for (const week of grid) expect(week).toHaveLength(7);
  });

  it("includes every day of the month exactly once, in order", () => {
    const grid = buildMonthGrid(2026, 3); // April, 30 days
    const days = grid.flat().filter((d): d is number => d !== null);
    expect(days).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it("handles February in a leap year (2028 -> 29 days)", () => {
    const grid = buildMonthGrid(2028, 1);
    const days = grid.flat().filter((d): d is number => d !== null);
    expect(days).toHaveLength(29);
    expect(days[days.length - 1]).toBe(29);
  });

  it("handles February in a non-leap year (2026 -> 28 days)", () => {
    const grid = buildMonthGrid(2026, 1);
    const days = grid.flat().filter((d): d is number => d !== null);
    expect(days).toHaveLength(28);
  });

  it("trailing cells after the last day of the month are blank, not the next month's days", () => {
    const grid = buildMonthGrid(2026, 6); // July 2026 ends on a Friday
    const lastWeek = grid[grid.length - 1];
    expect(lastWeek).toEqual([27, 28, 29, 30, 31, null, null]);
  });

  it("a month starting on Monday has zero leading blanks", () => {
    // 1 June 2026 is a Monday.
    const grid = buildMonthGrid(2026, 5);
    expect(grid[0][0]).toBe(1);
    expect(grid[0]).not.toContain(null);
  });
});

describe("addMonths", () => {
  it("moves forward within the same year", () => {
    expect(addMonths(2026, 5, 1)).toEqual({ year: 2026, monthIndex0: 6 });
  });

  it("moves backward within the same year", () => {
    expect(addMonths(2026, 5, -1)).toEqual({ year: 2026, monthIndex0: 4 });
  });

  it("rolls December forward into January of the next year", () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, monthIndex0: 0 });
  });

  it("rolls January backward into December of the previous year", () => {
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, monthIndex0: 11 });
  });
});
