// TASK_081 — «Статистика служения»: pure model over records + sessions.
import type { HourRecord, Session } from "@/types";
import {
  availableYears,
  buildServiceStatsIndex,
  durationPairs,
  formatSignedMinutes,
  formatSignedPercent,
  formatStatMinutes,
  groupThousands,
  lifetimeStats,
  monthDetail,
  yearComparison,
  yearStats,
  yearSwitcherBounds,
} from "../serviceStats";

let seq = 0;
function session(date: string, durationMinutes: number): Session {
  seq += 1;
  return {
    id: `s${seq}`,
    date,
    durationMinutes,
    source: "manual",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}
function record(year: number, month: number, hours: number, creditHours?: number): HourRecord {
  seq += 1;
  return { id: `r${seq}`, year, month, hours, note: "", ...(creditHours !== undefined ? { creditHours } : {}) };
}
const idx = (records: HourRecord[], sessions: Session[]) => buildServiceStatsIndex(records, sessions);

describe("buildServiceStatsIndex", () => {
  it("one session → one month bucket with one active day", () => {
    const index = idx([], [session("2026-03-05", 150)]);
    expect(index.size).toBe(1);
    const b = index.get("2026-03")!;
    expect(b).toMatchObject({ year: 2026, month: 3, minutes: 150, source: "session" });
    expect([...b.days.entries()]).toEqual([["2026-03-05", 150]]);
  });

  it("several sessions on the same day sum into one day and one month", () => {
    const b = idx([], [session("2026-03-05", 60), session("2026-03-05", 45), session("2026-03-06", 30)]).get("2026-03")!;
    expect(b.minutes).toBe(135);
    expect(b.days.size).toBe(2);
    expect(b.days.get("2026-03-05")).toBe(105);
  });

  it("is Session-first: a month with sessions ignores its legacy record, a month without uses it", () => {
    const index = idx([record(2026, 3, 40), record(2026, 4, 37.5)], [session("2026-03-01", 60)]);
    expect(index.get("2026-03")).toMatchObject({ minutes: 60, source: "session" });
    expect(index.get("2026-04")).toMatchObject({ minutes: 2250, source: "legacy" });
    expect(index.get("2026-04")!.days.size).toBe(0);
  });

  it("never adds creditHours to the total", () => {
    expect(idx([record(2025, 11, 30, 30)], []).get("2025-11")!.minutes).toBe(1800);
  });

  it("groups by the stored day string, so 31 December stays in its own year", () => {
    const index = idx([], [session("2025-12-31", 90), session("2026-01-01", 30)]);
    expect(index.get("2025-12")!.minutes).toBe(90);
    expect(index.get("2026-01")!.minutes).toBe(30);
    expect(yearStats(index, 2025).totalMinutes).toBe(90);
    expect(yearStats(index, 2026).totalMinutes).toBe(30);
  });

  it("skips malformed dates instead of throwing", () => {
    expect(idx([], [session("garbage", 60)]).size).toBe(0);
  });
});

describe("yearStats", () => {
  it("a year without entries is empty, with twelve zero months", () => {
    const y = yearStats(idx([], []), 2026);
    expect(y.hasData).toBe(false);
    expect(y.totalMinutes).toBe(0);
    expect(y.months).toHaveLength(12);
    expect(y.months.every((m) => m.minutes === 0 && m.source === "none")).toBe(true);
    expect(y.averagePerMonthMinutes).toBe(0);
    expect(y.busiestMonth).toBeNull();
  });

  it("several months: total, hours + minutes, active days, busiest month", () => {
    const index = idx(
      [],
      [session("2026-01-10", 2060), session("2026-02-03", 2470), session("2026-03-01", 3120), session("2026-03-02", 30)],
    );
    const y = yearStats(index, 2026);
    expect(y.totalMinutes).toBe(7680);
    expect(y.months[0]).toMatchObject({ month: 1, minutes: 2060, activeDays: 1, source: "session" });
    expect(y.months[2]).toMatchObject({ month: 3, minutes: 3150, activeDays: 2 });
    expect(y.months[3]).toMatchObject({ month: 4, minutes: 0, source: "none" });
    expect(y.monthsWithData).toBe(3);
    expect(y.activeDays).toBe(4);
    expect(y.busiestMonth).toEqual({ year: 2026, month: 3, minutes: 3150 });
    expect(formatStatMinutes(y.months[0].minutes)).toBe("34 ч 20 м");
  });

  it("an unfinished current year averages over months with data, not over 12", () => {
    // September 2026: Jan–Sep filled, Oct–Dec have not happened.
    const sessions: Session[] = [];
    for (let m = 1; m <= 9; m++) sessions.push(session(`2026-${String(m).padStart(2, "0")}-15`, 60 * 40));
    const y = yearStats(idx([], sessions), 2026);
    expect(y.totalMinutes).toBe(9 * 2400);
    expect(y.averagePerMonthMinutes).toBe(2400);
    expect(y.months.slice(9).every((m) => m.minutes === 0)).toBe(true);
  });

  it("a gap month inside a finished year does not dilute the average either", () => {
    const y = yearStats(idx([record(2024, 1, 30), record(2024, 3, 50)], []), 2024);
    expect(y.monthsWithData).toBe(2);
    expect(y.averagePerMonthMinutes).toBe(40 * 60);
  });

  it("several years are kept apart", () => {
    const index = idx([record(2024, 5, 10)], [session("2025-05-05", 60), session("2026-05-05", 120)]);
    expect(yearStats(index, 2024).totalMinutes).toBe(600);
    expect(yearStats(index, 2025).totalMinutes).toBe(60);
    expect(yearStats(index, 2026).totalMinutes).toBe(120);
    expect(availableYears(index)).toEqual([2024, 2025, 2026]);
  });
});

describe("yearComparison", () => {
  it("is null when the previous year has no data", () => {
    expect(yearComparison(idx([], [session("2026-01-01", 60)]), 2026)).toBeNull();
  });

  it("gives signed delta and percent against the previous year", () => {
    const index = idx([record(2025, 6, 391)], [session("2026-06-01", 428 * 60)]);
    expect(yearComparison(index, 2026)).toEqual({
      year: 2026,
      minutes: 428 * 60,
      prevYear: 2025,
      prevMinutes: 391 * 60,
      deltaMinutes: 37 * 60,
      deltaPercent: (37 / 391) * 100,
    });
    expect(formatSignedMinutes(37 * 60)).toBe("+37 ч");
    expect(formatSignedPercent((37 / 391) * 100)).toBe("+9,5 %");
  });

  it("handles a previous year that exists but totals zero (percent null)", () => {
    const c = yearComparison(idx([record(2025, 1, 0)], [session("2026-01-01", 60)]), 2026)!;
    expect(c.prevMinutes).toBe(0);
    expect(c.deltaPercent).toBeNull();
  });

  it("negative delta formats with a minus sign, zero with none", () => {
    expect(formatSignedMinutes(-75)).toBe("−1 ч 15 м");
    expect(formatSignedMinutes(0)).toBe("0 ч");
    expect(formatSignedPercent(-3)).toBe("−3 %");
    expect(formatSignedPercent(0.04)).toBe("0 %");
  });
});

describe("lifetimeStats", () => {
  it("is empty without data", () => {
    const l = lifetimeStats(idx([], []));
    expect(l.hasData).toBe(false);
    expect(l.firstDate).toBeNull();
    expect(l.years).toEqual([]);
    expect(l.averagePerMonthMinutes).toBe(0);
  });

  it("sums every year, finds the first entry and the busiest month, lists years newest first", () => {
    const index = idx(
      [record(2023, 9, 40), record(2023, 10, 45)],
      [session("2024-02-10", 600), session("2024-02-11", 30), session("2026-01-03", 120)],
    );
    const l = lifetimeStats(index);
    expect(l.totalMinutes).toBe((40 + 45) * 60 + 630 + 120);
    expect(l.firstDate).toBe("2023-09-01");
    expect(l.firstDateIsExact).toBe(false);
    expect(l.yearsWithData).toBe(3);
    expect(l.activeDays).toBe(3);
    expect(l.averagePerMonthMinutes).toBe(Math.round(l.totalMinutes / 4));
    expect(l.busiestMonth).toEqual({ year: 2023, month: 10, minutes: 2700 });
    expect(l.years).toEqual([
      { year: 2026, minutes: 120 },
      { year: 2024, minutes: 630 },
      { year: 2023, minutes: 5100 },
    ]);
  });

  it("uses the earliest session day when it precedes the earliest legacy month", () => {
    const l = lifetimeStats(idx([record(2024, 3, 10)], [session("2024-01-20", 60)]));
    expect(l.firstDate).toBe("2024-01-20");
    expect(l.firstDateIsExact).toBe(true);
  });
});

describe("monthDetail", () => {
  it("lists days ascending with total, active days and the per-active-day average", () => {
    const index = idx([], [session("2026-03-08", 105), session("2026-03-03", 150), session("2026-03-05", 240), session("2026-03-03", 30)]);
    const d = monthDetail(index, 2026, 3);
    expect(d.totalMinutes).toBe(525);
    expect(d.activeDays).toBe(3);
    expect(d.averagePerActiveDayMinutes).toBe(175);
    expect(d.source).toBe("session");
    expect(d.days).toEqual([
      { date: "2026-03-03", minutes: 180 },
      { date: "2026-03-05", minutes: 240 },
      { date: "2026-03-08", minutes: 105 },
    ]);
  });

  it("a legacy month has a total but no days", () => {
    const d = monthDetail(idx([record(2025, 4, 37.5)], []), 2025, 4);
    expect(d).toMatchObject({ totalMinutes: 2250, activeDays: 0, averagePerActiveDayMinutes: 0, source: "legacy", days: [] });
  });

  it("an empty month is 'none'", () => {
    expect(monthDetail(idx([], []), 2026, 6).source).toBe("none");
  });
});

describe("yearSwitcherBounds", () => {
  const now = new Date(2026, 8, 21);
  it("spans from the earliest year with data to the current year", () => {
    expect(yearSwitcherBounds(idx([record(2023, 1, 1)], []), now)).toEqual({ min: 2023, max: 2026 });
  });
  it("collapses to the current year without data", () => {
    expect(yearSwitcherBounds(idx([], []), now)).toEqual({ min: 2026, max: 2026 });
  });
  it("still reaches a year with data that lies after `now`", () => {
    expect(yearSwitcherBounds(idx([], [session("2027-01-01", 5)]), now)).toEqual({ min: 2026, max: 2027 });
  });
});

describe("formatting", () => {
  it("formatStatMinutes follows the app's «X ч Y м» shape and groups thousands", () => {
    expect(formatStatMinutes(0)).toBe("0 ч");
    expect(formatStatMinutes(65)).toBe("1 ч 5 м");
    expect(formatStatMinutes(37 * 60 + 30)).toBe("37 ч 30 м");
    expect(formatStatMinutes(52 * 60)).toBe("52 ч");
    expect(formatStatMinutes(1248 * 60 + 45)).toBe("1 248 ч 45 м");
    expect(groupThousands(1842)).toBe("1 842");
    expect(groupThousands(999)).toBe("999");
  });

  it("durationPairs splits number and unit without parsing the grouped string", () => {
    expect(durationPairs(428 * 60)).toEqual([["428", "ч"]]);
    expect(durationPairs(37 * 60 + 30)).toEqual([["37", "ч"], ["30", "м"]]);
    expect(durationPairs(1842 * 60)).toEqual([["1 842", "ч"]]);
    expect(durationPairs(0)).toEqual([["0", "ч"]]);
  });
});
