// TASK_008 regression: HeatMap's month-granularity grid used to derive one
// shared `year` from cells[0] (the September cell) and reuse it to
// reconstruct every lookup key, so January-August were looked up against
// the September start year instead of their own, later, calendar year —
// silently rendering 8 of 12 months as "no data" regardless of how
// correctly the caller (monthCellsForSY) computed the underlying cells.
//
// resolveMonthGridCells() replaces that shared-year reconstruction: each
// grid position resolves from the supplied cell's own encoded month, taken
// directly from its "YYYY-MM" date string. These tests exercise that
// mapping directly — the same function HeatMap's render body consumes —
// not just the upstream aggregation data. Under the pre-TASK_008 shared-year
// behavior, the "January of the following year" and "August of the
// following year" assertions below would have failed (cell undefined /
// value 0); under the corrected implementation they pass.
import { resolveMonthGridCells } from "../HeatMap";

function cell(date: string, value: number) {
  return { date, value };
}

// A full Sep(2025)-Aug(2026) service year, each cell carrying its own
// correct calendar year exactly as monthCellsForSY() produces it.
const FULL_YEAR_CELLS = [
  cell("2025-09", 10),
  cell("2025-10", 11),
  cell("2025-11", 12),
  cell("2025-12", 13),
  cell("2026-01", 21),
  cell("2026-02", 22),
  cell("2026-03", 23),
  cell("2026-04", 24),
  cell("2026-05", 25),
  cell("2026-06", 26),
  cell("2026-07", 27),
  cell("2026-08", 28),
];

describe("resolveMonthGridCells", () => {
  it("returns 12 grid positions in Sep-Aug service-year order", () => {
    const positions = resolveMonthGridCells(FULL_YEAR_CELLS);
    expect(positions.map((p) => p.month)).toEqual([9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("resolves September of the start year from its own cell", () => {
    const positions = resolveMonthGridCells(FULL_YEAR_CELLS);
    expect(positions[0].cell?.date).toBe("2025-09");
    expect(positions[0].cell?.value).toBe(10);
  });

  it("resolves December of the start year from its own cell", () => {
    const positions = resolveMonthGridCells(FULL_YEAR_CELLS);
    expect(positions[3].cell?.date).toBe("2025-12");
    expect(positions[3].cell?.value).toBe(13);
  });

  it("resolves January of the following year from its own cell — not lost, not zeroed", () => {
    const positions = resolveMonthGridCells(FULL_YEAR_CELLS);
    expect(positions[4].cell?.date).toBe("2026-01");
    expect(positions[4].cell?.value).toBe(21);
  });

  it("resolves August of the following year from its own cell — not lost, not zeroed", () => {
    const positions = resolveMonthGridCells(FULL_YEAR_CELLS);
    expect(positions[11].cell?.date).toBe("2026-08");
    expect(positions[11].cell?.value).toBe(28);
  });

  it("regression: every January-August position resolves against the following year, not the September start year", () => {
    const positions = resolveMonthGridCells(FULL_YEAR_CELLS);
    const janThroughAug = positions.slice(4); // grid positions 4..11 = Jan..Aug
    janThroughAug.forEach((p) => {
      expect(p.cell).toBeDefined();
      expect(p.cell?.date.startsWith("2026-")).toBe(true);
      expect(p.cell?.value).toBeGreaterThan(0);
    });
  });

  it("a grid position with no matching cell resolves to undefined, not a false match from another year", () => {
    // Only September supplied — every other position must stay unmatched
    // rather than falling back to a wrong-year guess.
    const positions = resolveMonthGridCells([cell("2025-09", 10)]);
    expect(positions[0].cell?.date).toBe("2025-09");
    positions.slice(1).forEach((p) => expect(p.cell).toBeUndefined());
  });
});
