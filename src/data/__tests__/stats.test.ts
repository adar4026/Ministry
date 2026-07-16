// Unit tests for TASK_005E stats helpers
// Pure functions — no React, no StoreContext, no RN needed.
import {
  trailingPace,
  projectMonthEnd,
  projectServiceYearEnd,
  monthCellsForSY,
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