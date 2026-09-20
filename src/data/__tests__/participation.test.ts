// TASK_073 — participation counters count DISTINCT dates.
import {
  isFutureDate,
  isISODay,
  lastParticipationDate,
  participationByMonth,
  participationDaySetForMonth,
  participationDaysInMonth,
  participationForMonth,
} from "@/data/participation";
import type { ServiceParticipation } from "@/types";

function p(date: string, id = date, createdAt = "2026-09-20T10:00:00.000Z"): ServiceParticipation {
  return { id, date, participated: true, createdAt, updatedAt: createdAt };
}

describe("participation — distinct-date counting", () => {
  const items = [p("2026-09-20"), p("2026-09-17"), p("2026-09-20", "dup"), p("2026-08-03"), p("2026-08-30")];

  it("counts a duplicated date once", () => {
    expect(participationDaysInMonth(items, 2026, 9)).toBe(2);
    expect(participationDaysInMonth(items, 2026, 8)).toBe(2);
    expect(participationDaysInMonth(items, 2026, 7)).toBe(0);
  });

  it("builds the day set for a calendar grid", () => {
    expect([...participationDaySetForMonth(items, 2026, 9)].sort()).toEqual([17, 20]);
  });

  it("groups by month, newest first, with distinct-day counts", () => {
    expect(participationByMonth(items)).toEqual([
      { key: "2026-09", year: 2026, month: 9, days: 2 },
      { key: "2026-08", year: 2026, month: 8, days: 2 },
    ]);
  });

  it("lists one record per date within a month, newest first", () => {
    const rows = participationForMonth(items, 2026, 9);
    expect(rows.map((r) => r.date)).toEqual(["2026-09-20", "2026-09-17"]);
  });

  it("returns the latest date", () => {
    expect(lastParticipationDate(items)).toBe("2026-09-20");
    expect(lastParticipationDate([])).toBeUndefined();
  });
});

describe("participation — date rules", () => {
  it("rejects future dates and accepts today", () => {
    expect(isFutureDate("2026-09-21", "2026-09-20")).toBe(true);
    expect(isFutureDate("2026-09-20", "2026-09-20")).toBe(false);
    expect(isFutureDate("2026-09-19", "2026-09-20")).toBe(false);
  });

  it("validates real calendar days only", () => {
    expect(isISODay("2026-09-20")).toBe(true);
    expect(isISODay("2026-02-30")).toBe(false);
    expect(isISODay("2026-9-2")).toBe(false);
    expect(isISODay(20260920)).toBe(false);
  });
});
