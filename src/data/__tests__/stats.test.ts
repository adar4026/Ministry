// Unit tests for TASK_005E stats helpers
// Pure functions — no React, no StoreContext, no RN needed.
import {
  trailingPace,
  projectMonthEnd,
  projectServiceYearEnd,
  monthCellsForSY,
  dailyMinutesForMonth,
  monthTotal,
  sessionsForYear,
  sessionsForDay,
  sumDurationMinutes,
  totalMinutesForPeriod,
  totalCreditForPeriod,
  isCurrentMonth,
  isCurrentYear,
} from "../stats";
import type { Session } from "@/types";

function session(date: string, durationMinutes: number, overrides: Partial<Session> = {}): Session {
  return {
    id: `s-${date}-${durationMinutes}`,
    date,
    durationMinutes,
    source: "manual",
    note: "",
    startTime: undefined,
    endTime: undefined,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const RECORDS = [
  { year: 2026, month: 6, hours: 54 },
  { year: 2026, month: 5, hours: 43 },
  { year: 2026, month: 4, hours: 50 },
];

describe("trailingPace", () => {
  const now = new Date("2026-06-15T12:00:00.000Z"); // mid-June 2026

  it("returns 0 for empty sessions", () => {
    expect(trailingPace([], 7, now)).toBe(0);
  });

  it("returns 0 when no sessions in window", () => {
    const sessions = [session("2026-01-01", 60)];
    expect(trailingPace(sessions, 7, now)).toBe(0);
  });

  it("computes average minutes/day over trailing 7 days", () => {
    // 3 sessions in last 7 days: 60 + 90 + 30 = 180 min over ~7 days
    const sessions = [
      session("2026-06-10", 60),
      session("2026-06-12", 90),
      session("2026-06-14", 30),
    ];
    // 180 min / 7 days ≈ 25.7 min/day
    const pace = trailingPace(sessions, 7, now);
    expect(pace).toBeCloseTo(180 / 7, 1);
  });

  it("computes average minutes/day over trailing 30 days", () => {
    const sessions = [
      session("2026-05-20", 120),
      session("2026-06-01", 180),
      session("2026-06-10", 60),
    ];
    const pace = trailingPace(sessions, 30, now);
    // 360 min / 30 days = 12 min/day
    expect(pace).toBeCloseTo(12, 1);
  });

  it("uses elapsed days in window (windowDays), not calendar days with data", () => {
    // now is June 15, 7-day window = June 8-15 (7 full days elapsed)
    // 2 sessions on June 10 and 14 = 180 min total
    // pace = 180 min / 7 days = 25.7 min/day
    const sessions = [session("2026-06-10", 120), session("2026-06-14", 60)];
    const pace = trailingPace(sessions, 7, now);
    // Uses windowDays (7) as denominator, not days-with-data (2)
    expect(pace).toBeCloseTo(180 / 7, 1);
  });
});

describe("projectMonthEnd", () => {
  it("returns hoursDone when daysLeft <= 0", () => {
    expect(projectMonthEnd(50, 10, 0)).toBe(50);
    expect(projectMonthEnd(50, 10, -5)).toBe(50);
  });

  it("adds projected hours from pace", () => {
    // 30 hours done, 60 min/day pace, 10 days left = 600 min = 10h projected
    expect(projectMonthEnd(30, 60, 10)).toBe(40);
  });

  it("handles fractional pace", () => {
    // 45 min/day for 4 days = 180 min = 3h
    expect(projectMonthEnd(20, 45, 4)).toBe(23);
  });
});

describe("projectServiceYearEnd", () => {
  it("returns syTotal when monthsLeft <= 0", () => {
    expect(projectServiceYearEnd(400, 60, 0)).toBe(400);
    expect(projectServiceYearEnd(400, 60, -2)).toBe(400);
  });

  it("projects using avg days/month (30.44)", () => {
    // 400h done, 60 min/day pace, 3 months left
    // 60 * 30.44 * 3 / 60 = 91.32h additional
    const result = projectServiceYearEnd(400, 60, 3);
    expect(result).toBeCloseTo(491.32, 1);
  });
});

describe("monthCellsForSY", () => {
  const sessions = [
    session("2025-09-15", 120), // 2h
    session("2025-10-05", 180), // 3h
    session("2026-01-10", 300), // 5h
  ];

  it("returns 12 cells for Sep–Aug service year", () => {
    const cells = monthCellsForSY(RECORDS, sessions, "2025–2026");
    expect(cells).toHaveLength(12);
  });

  it("orders months Sep, Oct, Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug", () => {
    const cells = monthCellsForSY(RECORDS, sessions, "2025–2026");
    expect(cells.map((c) => c.date)).toEqual([
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
  });

  it("uses Session totals when sessions exist for month (authoritative)", () => {
    const cells = monthCellsForSY(RECORDS, sessions, "2025–2026");
    const sep = cells.find((c) => c.date === "2025-09")!;
    const oct = cells.find((c) => c.date === "2025-10")!;
    const jan = cells.find((c) => c.date === "2026-01")!;
    expect(sep.value).toBe(2);   // 120 min = 2h
    expect(oct.value).toBe(3);   // 180 min = 3h
    expect(jan.value).toBe(5);   // 300 min = 5h
  });

  it("falls back to HourRecord when no sessions for month", () => {
    const cells = monthCellsForSY(RECORDS, sessions, "2025–2026");
    // May 2026 has record 43h, no sessions
    const may = cells.find((c) => c.date === "2026-05")!;
    expect(may.value).toBe(43);
  });

  it("returns 0 for months with neither sessions nor records", () => {
    const cells = monthCellsForSY(RECORDS, sessions, "2025–2026");
    const feb = cells.find((c) => c.date === "2026-02")!;
    expect(feb.value).toBe(0);
  });

  it("Session wins over HourRecord for same month", () => {
    // Add a session for June 2026 (which has 54h record)
    const sessionsWithJun = [...sessions, session("2026-06-01", 600)]; // 10h
    const cells = monthCellsForSY(RECORDS, sessionsWithJun, "2025–2026");
    const jun = cells.find((c) => c.date === "2026-06")!;
    expect(jun.value).toBe(10); // Session 10h wins over record 54h
  });
});

// TASK_008 regression: monthCellsForSY() itself resolved each month's
// calendar year correctly even before TASK_008 (the year-picking arithmetic
// was never the bug) — but no test asserted *values* at the September,
// December, January, and August boundaries specifically, and no test
// exercised monthCellsForSY() with a zero-duration Session. Both gaps are
// closed here, independent of the presentation-layer defect (HeatMap.tsx)
// covered separately in src/components/__tests__/HeatMap.test.ts.
describe("monthCellsForSY — TASK_008 service-year boundary regression", () => {
  it("resolves September and December of the start year, and January and August of the following year, with correct values", () => {
    const records = [
      { year: 2025, month: 12, hours: 40 }, // Dec of the start year, legacy-only
      { year: 2026, month: 8, hours: 35 }, // Aug of the following year, legacy-only
    ];
    const boundarySessions = [
      session("2025-09-05", 120), // Sep of the start year: 2h
      session("2026-01-10", 180), // Jan of the following year: 3h
    ];
    const cells = monthCellsForSY(records, boundarySessions, "2025–2026");

    const sep = cells.find((c) => c.date === "2025-09")!;
    const dec = cells.find((c) => c.date === "2025-12")!;
    const jan = cells.find((c) => c.date === "2026-01")!;
    const aug = cells.find((c) => c.date === "2026-08")!;

    expect(sep.value).toBe(2);
    expect(dec.value).toBe(40);
    expect(jan.value).toBe(3);
    expect(aug.value).toBe(35);
  });

  it("a Session-authoritative month with a zero total is not replaced by the legacy record", () => {
    const records = [{ year: 2025, month: 9, hours: 40 }]; // legacy total for September
    const zeroSession = [session("2025-09-01", 0)]; // constructed directly, zero duration
    const cells = monthCellsForSY(records, zeroSession, "2025–2026");
    const sep = cells.find((c) => c.date === "2025-09")!;
    expect(sep.value).toBe(0); // Session-authoritative (0), not the legacy fallback (40)
  });
});

describe("dailyMinutesForMonth (TASK_032 History calendar)", () => {
  it("returns an empty Map for an empty sessions array", () => {
    expect(dailyMinutesForMonth([], 2026, 7).size).toBe(0);
  });

  it("buckets a single session under its day", () => {
    const map = dailyMinutesForMonth([session("2026-07-05", 90)], 2026, 7);
    expect(map.get(5)).toBe(90);
  });

  it("sums multiple sessions on the same day", () => {
    const sessions = [session("2026-07-19", 60), session("2026-07-19", 30, { id: "s2" })];
    const map = dailyMinutesForMonth(sessions, 2026, 7);
    expect(map.get(19)).toBe(90);
  });

  it("keeps sessions on different days in separate buckets", () => {
    const sessions = [session("2026-07-01", 40), session("2026-07-02", 20)];
    const map = dailyMinutesForMonth(sessions, 2026, 7);
    expect(map.get(1)).toBe(40);
    expect(map.get(2)).toBe(20);
  });

  it("excludes sessions from the previous and next month", () => {
    const sessions = [session("2026-06-30", 60), session("2026-07-15", 60), session("2026-08-01", 60)];
    const map = dailyMinutesForMonth(sessions, 2026, 7);
    expect(map.size).toBe(1);
    expect(map.get(15)).toBe(60);
  });

  it("handles February of a non-leap year (28 days)", () => {
    const map = dailyMinutesForMonth([session("2026-02-28", 45)], 2026, 2);
    expect(map.get(28)).toBe(45);
  });

  it("handles February of a leap year (29 days)", () => {
    const map = dailyMinutesForMonth([session("2028-02-29", 45)], 2028, 2);
    expect(map.get(29)).toBe(45);
  });

  it("handles a 30-day month", () => {
    const map = dailyMinutesForMonth([session("2026-04-30", 60)], 2026, 4);
    expect(map.get(30)).toBe(60);
  });

  it("handles a 31-day month", () => {
    const map = dailyMinutesForMonth([session("2026-07-31", 60)], 2026, 7);
    expect(map.get(31)).toBe(60);
  });

  it("does not mutate the input sessions array", () => {
    const sessions = [session("2026-07-01", 40)];
    const copy = [...sessions];
    dailyMinutesForMonth(sessions, 2026, 7);
    expect(sessions).toEqual(copy);
  });
});

describe("sessionsForYear (TASK_033)", () => {
  it("includes sessions across every month of the given year", () => {
    const sessions = [session("2026-01-05", 30), session("2026-07-19", 60), session("2026-12-31", 45)];
    expect(sessionsForYear(sessions, 2026)).toHaveLength(3);
  });

  it("excludes sessions from other years", () => {
    const sessions = [session("2025-12-31", 30), session("2026-01-01", 60), session("2027-01-01", 45)];
    expect(sessionsForYear(sessions, 2026).map((s) => s.date)).toEqual(["2026-01-01"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(sessionsForYear([session("2025-06-01", 30)], 2026)).toEqual([]);
  });
});

describe("sessionsForDay (TASK_033)", () => {
  it("returns an empty array for a day with no sessions", () => {
    expect(sessionsForDay([session("2026-07-01", 30)], "2026-07-19")).toEqual([]);
  });

  it("returns the single session for a day with one", () => {
    const s = session("2026-07-19", 60);
    expect(sessionsForDay([s], "2026-07-19")).toEqual([s]);
  });

  it("returns every session on a day with multiple", () => {
    const sessions = [
      session("2026-07-19", 60, { id: "a" }),
      session("2026-07-19", 30, { id: "b" }),
      session("2026-07-20", 10, { id: "c" }),
    ];
    expect(sessionsForDay(sessions, "2026-07-19").map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("sumDurationMinutes (TASK_033)", () => {
  it("returns 0 for an empty array", () => {
    expect(sumDurationMinutes([])).toBe(0);
  });

  it("sums durationMinutes across sessions", () => {
    expect(sumDurationMinutes([session("2026-01-01", 30), session("2026-01-02", 45)])).toBe(75);
  });
});

describe("totalMinutesForPeriod (TASK_033 — Итого card)", () => {
  const sessions = [
    session("2026-06-30", 100), // previous month, same year
    session("2026-07-05", 60),
    session("2026-07-19", 90),
    session("2026-08-01", 40), // next month, same year
    session("2025-07-19", 200), // same month/day, previous year
  ];

  it("month period sums only the given calendar month", () => {
    expect(totalMinutesForPeriod([], sessions, "month", 2026, 7)).toBe(150);
  });

  it("all period sums every stored session regardless of date", () => {
    expect(totalMinutesForPeriod([], sessions, "all", 2026, 7)).toBe(sumDurationMinutes(sessions));
  });

  it("returns 0 for an empty period (no matching sessions)", () => {
    expect(totalMinutesForPeriod([], [], "month", 2026, 7)).toBe(0);
    expect(totalMinutesForPeriod([], [], "year", 2026, 7)).toBe(0);
    expect(totalMinutesForPeriod([], [], "all", 2026, 7)).toBe(0);
  });

  it("month period falls back to the legacy HourRecord when the month has no Session (TASK_034)", () => {
    const records = [{ id: "r1", year: 2024, month: 3, hours: 12, note: "" }];
    expect(totalMinutesForPeriod(records, [], "month", 2024, 3)).toBe(12 * 60);
  });

  it("month period prefers Session over a legacy HourRecord for the same month (Session-first, TASK_034)", () => {
    const records = [{ id: "r1", year: 2026, month: 7, hours: 999, note: "" }];
    expect(totalMinutesForPeriod(records, sessions, "month", 2026, 7)).toBe(150);
  });

  it("all period includes every legacy HourRecord month with zero Sessions (TASK_034)", () => {
    const records = [{ id: "r1", year: 2003, month: 9, hours: 5, note: "" }];
    expect(totalMinutesForPeriod(records, [], "all", 2026, 7)).toBe(5 * 60);
  });
});

// TASK_038 — "year" period is a *service year* (Sep..Aug), matching
// svcYear()/serviceYearAggregation() (src/data/constants.ts) everywhere
// else in the app. `year` is the calendar year the service year ends in:
// "2026" means Sep 2025..Aug 2026. This block replaces the old (buggy)
// calendar-year assumption the same describe block used to assert.
describe("totalMinutesForPeriod — year period is a service year, Sep..Aug (TASK_038)", () => {
  it("sums September through December of the *previous* calendar year alongside January through August of `year`", () => {
    const sessions = [
      session("2025-09-15", 60), // Sep of previous calendar year — belongs to SY 2026
      session("2025-12-31", 45), // Dec of previous calendar year — belongs to SY 2026
      session("2026-01-10", 30), // Jan of `year` — belongs to SY 2026
      session("2026-08-01", 90), // Aug of `year` — belongs to SY 2026
    ];
    expect(totalMinutesForPeriod([], sessions, "year", 2026, 1)).toBe(60 + 45 + 30 + 90);
  });

  it("excludes September of `year` itself — that belongs to the *next* service year", () => {
    const sessions = [session("2026-09-01", 999)];
    expect(totalMinutesForPeriod([], sessions, "year", 2026, 1)).toBe(0);
    expect(totalMinutesForPeriod([], sessions, "year", 2027, 1)).toBe(999);
  });

  it("excludes August of the previous calendar year — that belongs to the *previous* service year", () => {
    const sessions = [session("2025-08-31", 999)];
    expect(totalMinutesForPeriod([], sessions, "year", 2026, 1)).toBe(0);
    expect(totalMinutesForPeriod([], sessions, "year", 2025, 1)).toBe(999);
  });

  it("boundary: August 31 is included in the service year ending that August", () => {
    const sessions = [session("2026-08-31", 40)];
    expect(totalMinutesForPeriod([], sessions, "year", 2026, 1)).toBe(40);
  });

  it("boundary: September 1 is included in the *next* service year, not the one just ending", () => {
    const sessions = [session("2026-09-01", 40)];
    expect(totalMinutesForPeriod([], sessions, "year", 2026, 1)).toBe(0);
    expect(totalMinutesForPeriod([], sessions, "year", 2027, 1)).toBe(40);
  });

  it("September and January of the same service year are summed together", () => {
    const sessions = [session("2025-09-05", 20), session("2026-01-05", 25)];
    expect(totalMinutesForPeriod([], sessions, "year", 2026, 1)).toBe(45);
  });

  it("the year total equals the sum of all 12 monthly totals of the service year", () => {
    const sessions = [
      session("2025-09-01", 10),
      session("2025-10-01", 20),
      session("2025-11-01", 30),
      session("2025-12-01", 40),
      session("2026-01-01", 50),
      session("2026-02-01", 60),
      session("2026-03-01", 70),
      session("2026-04-01", 80),
      session("2026-05-01", 90),
      session("2026-06-01", 100),
      session("2026-07-01", 110),
      session("2026-08-01", 120),
    ];
    const serviceYearMonths = [
      [2025, 9], [2025, 10], [2025, 11], [2025, 12],
      [2026, 1], [2026, 2], [2026, 3], [2026, 4], [2026, 5], [2026, 6], [2026, 7], [2026, 8],
    ];
    const expectedFromMonths = serviceYearMonths.reduce(
      (sum, [y, m]) => sum + Math.round(monthTotal([], sessions, y, m) * 60),
      0,
    );
    expect(totalMinutesForPeriod([], sessions, "year", 2026, 1)).toBe(expectedFromMonths);
    expect(totalMinutesForPeriod([], sessions, "year", 2026, 1)).toBe(
      sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    );
  });

  it("an empty service year (no matching Session or HourRecord) totals 0", () => {
    const sessions = [session("2020-01-01", 500)]; // far outside SY 2026
    expect(totalMinutesForPeriod([], sessions, "year", 2026, 1)).toBe(0);
  });

  it("does not lose minutes to rounding for non-hour-multiple durations across many months", () => {
    const sessions = [
      session("2025-09-15", 7), // 7 minutes, not a multiple of 60
      session("2025-10-15", 13),
      session("2026-01-15", 29),
      session("2026-08-15", 41),
    ];
    expect(totalMinutesForPeriod([], sessions, "year", 2026, 1)).toBe(7 + 13 + 29 + 41);
  });

  it("includes legacy HourRecord months alongside Session months across the Sep..Aug span (TASK_034 rule preserved)", () => {
    const records = [
      { id: "r1", year: 2025, month: 10, hours: 10, note: "" }, // Oct 2025, no Session
      { id: "r2", year: 2026, month: 7, hours: 999, note: "" }, // Session-covered — ignored
    ];
    const sessions = [session("2026-07-19", 90)];
    expect(totalMinutesForPeriod(records, sessions, "year", 2026, 1)).toBe(10 * 60 + 90);
  });
});

// TASK_039 — credit-hours counterpart to totalMinutesForPeriod(): same
// month/year/all period shapes and the same service-year boundary
// (serviceYearMonths()), but sums creditHours instead of the real total —
// entirely parallel, never combined with totalMinutesForPeriod()'s result.
describe("totalCreditForPeriod (TASK_039 — credit hours, separate from the real total)", () => {
  it("month period returns the given month's creditHours", () => {
    const records = [{ id: "r1", year: 2025, month: 11, hours: 30, creditHours: 30, note: "" }];
    expect(totalCreditForPeriod(records, "month", 2025, 11)).toBe(30);
  });

  it("month period returns 0 when the record has no creditHours", () => {
    const records = [{ id: "r1", year: 2025, month: 11, hours: 44, note: "" }];
    expect(totalCreditForPeriod(records, "month", 2025, 11)).toBe(0);
  });

  it("month period returns 0 when there is no record at all for that month", () => {
    expect(totalCreditForPeriod([], "month", 2025, 11)).toBe(0);
  });

  it("year period sums creditHours across the whole Sep..Aug service year", () => {
    const records = [
      { id: "r1", year: 2025, month: 9, hours: 44, note: "" }, // no credit
      { id: "r2", year: 2025, month: 11, hours: 30, creditHours: 30, note: "" },
      { id: "r3", year: 2026, month: 6, hours: 54, creditHours: 4, note: "" },
    ];
    expect(totalCreditForPeriod(records, "year", 2026, 1)).toBe(30 + 4);
  });

  it("year period respects the service-year boundary — a credit outside Sep..Aug is excluded", () => {
    const records = [{ id: "r1", year: 2026, month: 9, hours: 40, creditHours: 40, note: "" }]; // belongs to SY 2027
    expect(totalCreditForPeriod(records, "year", 2026, 1)).toBe(0);
    expect(totalCreditForPeriod(records, "year", 2027, 1)).toBe(40);
  });

  it("all period sums creditHours across every record that has one", () => {
    const records = [
      { id: "r1", year: 2009, month: 8, hours: 40, creditHours: 40, note: "Саранск" },
      { id: "r2", year: 2014, month: 8, hours: 30, creditHours: 30, note: "Ейск" },
      { id: "r3", year: 2025, month: 11, hours: 30, creditHours: 30, note: "Аликанте" },
      { id: "r4", year: 2025, month: 9, hours: 44, note: "" }, // no credit, must not contribute
    ];
    expect(totalCreditForPeriod(records, "all", 2026, 1)).toBe(40 + 30 + 30);
  });

  it("returns 0 for every period when no record has creditHours at all", () => {
    const records = [{ id: "r1", year: 2025, month: 11, hours: 30, note: "" }];
    expect(totalCreditForPeriod(records, "month", 2025, 11)).toBe(0);
    expect(totalCreditForPeriod(records, "year", 2026, 1)).toBe(0);
    expect(totalCreditForPeriod(records, "all", 2026, 1)).toBe(0);
  });

  it("never subtracts from or otherwise touches totalMinutesForPeriod()'s result", () => {
    const records = [{ id: "r1", year: 2025, month: 11, hours: 30, creditHours: 30, note: "" }];
    const realTotal = totalMinutesForPeriod(records, [], "month", 2025, 11);
    expect(realTotal).toBe(30 * 60); // full 30h, credit is not deducted
  });

  // The real-world scenario that motivated this task: November 2025 had 30
  // real field-service hours AND a separate 30-hour pioneer-school credit
  // (the old app displayed 60 — the two summed together — for that month).
  // Ministry keeps them as two independent figures: the main service-year
  // total is unaffected by adding creditHours (stays whatever it was before
  // — here, a small representative multi-month year, not literally the
  // owner's real 513h), while the credit total for the same year becomes
  // exactly 30. Neither number is ever derived from the other, and nothing
  // in the codebase adds them into one "combined 543-style" figure — that
  // combination, if wanted, happens only in the reader's head from the two
  // numbers shown side by side.
  it("real-world case: November's hours:30/creditHours:30 leaves the year's main total unchanged and gives a separate credit total of exactly 30", () => {
    const records = [
      { id: "r1", year: 2025, month: 9, hours: 44, note: "" },
      { id: "r2", year: 2025, month: 10, hours: 50, note: "" },
      { id: "r3", year: 2025, month: 11, hours: 30, creditHours: 30, note: "Школа пионеров Аликанте +30ч кредит" },
      { id: "r4", year: 2025, month: 12, hours: 42, note: "" },
    ];
    const mainTotalHours = totalMinutesForPeriod(records, [], "year", 2026, 1) / 60;
    const creditTotalHours = totalCreditForPeriod(records, "year", 2026, 1);
    expect(mainTotalHours).toBe(44 + 50 + 30 + 42); // November's 30 counts once, as real hours — not 0, not 60
    expect(creditTotalHours).toBe(30); // shown as its own, separate figure
  });
});

// serviceYearEndYear()/currentServiceYearEndYear() themselves are tested
// exhaustively in src/data/__tests__/serviceYear.test.ts (TASK_038) — this
// block only checks that isCurrentYear() correctly delegates to that
// domain rule, not the rule's boundary behavior a second time.
describe("isCurrentMonth / isCurrentYear (TASK_033, isCurrentYear now service-year-aware per TASK_038)", () => {
  const nowJuly = new Date("2026-07-19T12:00:00.000Z");
  const nowOctober = new Date("2026-10-19T12:00:00.000Z");

  it("isCurrentMonth is true only for the exact year+month of `now`", () => {
    expect(isCurrentMonth(2026, 7, nowJuly)).toBe(true);
    expect(isCurrentMonth(2026, 6, nowJuly)).toBe(false);
    expect(isCurrentMonth(2025, 7, nowJuly)).toBe(false);
  });

  it("isCurrentYear is true only for the service year containing `now`, not the plain calendar year", () => {
    expect(isCurrentYear(2026, nowJuly)).toBe(true);
    expect(isCurrentYear(2025, nowJuly)).toBe(false);
    expect(isCurrentYear(2027, nowJuly)).toBe(false);
    // In October 2026 the current service year ends in 2027, not 2026.
    expect(isCurrentYear(2027, nowOctober)).toBe(true);
    expect(isCurrentYear(2026, nowOctober)).toBe(false);
  });
});
