// Unit tests for TASK_037 period-progress model (Statistics overview +
// month/year detail screens). Pure functions — no React, no StoreContext.
import {
  monthPeriodSummary,
  monthHasDailyBreakdown,
  yearPeriodSummary,
  periodStatusLabel,
  MONTHLY_GOAL,
  YEARLY_GOAL,
  type PeriodSummary,
} from "../periodStats";
import type { HourRecord, Session } from "@/types";

function session(date: string, durationMinutes: number, overrides: Partial<Session> = {}): Session {
  return {
    id: `s-${date}-${durationMinutes}-${Math.random()}`,
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

function record(year: number, month: number, hours: number): HourRecord {
  return { id: `r-${year}-${month}`, year, month, hours, note: "" };
}

describe("monthPeriodSummary", () => {
  it("goal already met exactly — status completed, nothing remaining", () => {
    const sessions = [session("2026-07-01", 50 * 60)];
    const now = new Date("2026-07-15T12:00:00.000Z");
    const s = monthPeriodSummary([], sessions, 2026, 7, 50, now);
    expect(s.status).toBe("completed");
    expect(s.remainingHours).toBe(0);
    expect(s.doneHours).toBe(50);
  });

  it("goal exceeded — status completed, progressRatio > 1, remaining stays 0 (fact not clamped to goal)", () => {
    const sessions = [session("2026-07-01", 70 * 60)];
    const now = new Date("2026-07-15T12:00:00.000Z");
    const s = monthPeriodSummary([], sessions, 2026, 7, 50, now);
    expect(s.status).toBe("completed");
    expect(s.doneHours).toBe(70);
    expect(s.progressRatio).toBeGreaterThan(1);
    expect(s.remainingHours).toBe(0);
  });

  it("goal is zero/unset — no-goal status, no division by zero, no NaN/Infinity", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    const s = monthPeriodSummary([], [session("2026-07-01", 120)], 2026, 7, 0, now);
    expect(s.status).toBe("no-goal");
    expect(s.remainingHours).toBe(0);
    expect(s.requiredPerDay).toBe(0);
    expect(s.requiredPerWeek).toBe(0);
    expect(Number.isFinite(s.progressRatio)).toBe(true);
    expect(Number.isFinite(s.deviationHours)).toBe(true);
  });

  it("no data yet, goal positive — never negative remaining/days, never NaN", () => {
    const now = new Date("2026-07-05T12:00:00.000Z");
    const s = monthPeriodSummary([], [], 2026, 7, 50, now);
    expect(s.doneHours).toBe(0);
    expect(s.remainingHours).toBe(50);
    expect(s.daysLeft).toBeGreaterThanOrEqual(0);
    expect(s.requiredPerDay).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(s.requiredPerDay)).toBe(true);
  });

  it("today is the first day of the month — full days-left window, no crash", () => {
    const now = new Date("2026-07-01T09:00:00.000Z");
    const s = monthPeriodSummary([], [], 2026, 7, 50, now);
    expect(s.daysLeft).toBe(31);
    expect(s.status).not.toBe(undefined);
  });

  it("today is the last day of the month — one day left", () => {
    const now = new Date("2026-07-31T09:00:00.000Z");
    const s = monthPeriodSummary([], [session("2026-07-15", 25 * 60)], 2026, 7, 50, now);
    expect(s.daysLeft).toBe(1);
    expect(s.requiredPerDay).toBeCloseTo(25, 5);
  });

  it("viewing a completed past month — zero days left, elapsed = full month, no negative days", () => {
    const now = new Date("2026-07-15T12:00:00.000Z"); // viewing June from July
    const s = monthPeriodSummary([], [session("2026-06-10", 40 * 60)], 2026, 6, 50, now);
    expect(s.daysLeft).toBe(0);
    expect(s.requiredPerDay).toBe(0);
    expect(s.status).toBe("behind"); // 40 of 50, month over
  });

  it("legacy (HourRecord-only) month — total resolves same as Session-first callers elsewhere", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    const s = monthPeriodSummary([record(2026, 6, 43)], [], 2026, 6, 50, now);
    expect(s.doneHours).toBe(43);
  });

  it("fractional/non-hour-aligned durations don't get silently rounded away", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    const s = monthPeriodSummary([], [session("2026-07-01", 95)], 2026, 7, 50, now); // 1h35m
    expect(s.doneHours).toBeCloseTo(95 / 60, 8);
  });

  it("very large recorded values stay finite and sane", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    const s = monthPeriodSummary([], [session("2026-07-01", 999999 * 60)], 2026, 7, 50, now);
    expect(Number.isFinite(s.doneHours)).toBe(true);
    expect(s.status).toBe("completed");
    expect(s.remainingHours).toBe(0);
  });

  it("empty statistics (no records, no sessions) never throws", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    expect(() => monthPeriodSummary([], [], 2026, 7, MONTHLY_GOAL, now)).not.toThrow();
  });
});

describe("monthHasDailyBreakdown", () => {
  // Дневной ряд графика переехал в src/data/periodChart.ts (TASK_061) —
  // здесь остаётся только сам признак «есть ли по месяцу реальные даты».
  it("is true only when the month has at least one Session", () => {
    expect(monthHasDailyBreakdown([session("2026-07-01", 60)], 2026, 7)).toBe(true);
    expect(monthHasDailyBreakdown([session("2026-06-01", 60)], 2026, 7)).toBe(false);
    expect(monthHasDailyBreakdown([], 2026, 7)).toBe(false);
  });
});

describe("yearPeriodSummary", () => {
  it("service year starting in September, not January, resolves correct elapsed/left days", () => {
    const now = new Date("2025-10-01T12:00:00.000Z"); // 31 days into "2025–2026" (Sep 1 .. Oct 1 inclusive)
    const s = yearPeriodSummary([], [session("2025-09-15", 100 * 60)], "2025–2026", 600, now);
    expect(s.doneHours).toBe(100);
    expect(s.daysLeft).toBeGreaterThan(300);
    expect(s.daysLeft).toBeLessThan(340);
  });

  it("counts both span endpoints inclusively — exact day counts, not off-by-one (daysBetweenInclusive regression)", () => {
    // 2025–2026 spans Sep 1 2025 .. Aug 31 2026 inclusive — 365 days (2026 is
    // not a leap year). On the very first day, the whole span is still
    // ahead; on the very last day, exactly one day (today) remains — never
    // 364/0 or 366/2, which an off-by-one in the UTC day-diff would produce.
    const firstDay = new Date("2025-09-01T09:00:00.000Z");
    expect(yearPeriodSummary([], [], "2025–2026", 600, firstDay).daysLeft).toBe(365);

    const lastDay = new Date("2026-08-31T09:00:00.000Z");
    expect(yearPeriodSummary([], [], "2025–2026", 600, lastDay).daysLeft).toBe(1);
  });

  it("goal met exactly for the year — completed status", () => {
    const now = new Date("2026-03-01T12:00:00.000Z");
    const s = yearPeriodSummary([], [session("2025-09-01", 600 * 60)], "2025–2026", 600, now);
    expect(s.status).toBe("completed");
    expect(s.remainingHours).toBe(0);
  });

  it("zero/unset yearly goal — no-goal status, no crash", () => {
    const now = new Date("2026-03-01T12:00:00.000Z");
    const s = yearPeriodSummary([], [], "2025–2026", 0, now);
    expect(s.status).toBe("no-goal");
    expect(Number.isFinite(s.requiredPerWeek)).toBe(true);
  });

  it("viewing a fully completed past service year — zero days left", () => {
    const now = new Date("2026-12-01T12:00:00.000Z"); // well after 2025–2026 ended (Aug 31 2026)
    const s = yearPeriodSummary([], [session("2025-09-10", 200 * 60)], "2025–2026", 600, now);
    expect(s.daysLeft).toBe(0);
    expect(s.requiredPerWeek).toBe(0);
  });

  it("empty statistics for a service year with zero data never throws and returns 0 done", () => {
    const now = new Date("2026-03-01T12:00:00.000Z");
    expect(() => yearPeriodSummary([], [], "2025–2026", YEARLY_GOAL, now)).not.toThrow();
    const s = yearPeriodSummary([], [], "2025–2026", YEARLY_GOAL, now);
    expect(s.doneHours).toBe(0);
  });
});

describe("periodStatusLabel", () => {
  function summary(overrides: Partial<PeriodSummary>): PeriodSummary {
    return {
      doneHours: 0,
      goalHours: 50,
      remainingHours: 0,
      progressRatio: 0,
      daysLeft: 0,
      requiredPerDay: 0,
      requiredPerWeek: 0,
      status: "on",
      deviationHours: 0,
      ...overrides,
    };
  }

  it("covers all five statuses with distinct, non-empty text", () => {
    const behind = periodStatusLabel(summary({ status: "behind", deviationHours: -(2 + 30 / 60) }));
    const ahead = periodStatusLabel(summary({ status: "ahead", deviationHours: 1 + 15 / 60 }));
    const on = periodStatusLabel(summary({ status: "on" }));
    const completed = periodStatusLabel(summary({ status: "completed" }));
    const noGoal = periodStatusLabel(summary({ status: "no-goal" }));

    expect(behind).toContain("Ниже плана");
    expect(behind).not.toContain("-");
    expect(ahead).toContain("Впереди плана");
    expect(on).toBe("В соответствии с планом");
    expect(completed).toBe("Цель выполнена");
    expect(noGoal).toBe("Цель не задана");

    const all = [behind, ahead, on, completed, noGoal];
    expect(new Set(all).size).toBe(all.length);
  });
});
