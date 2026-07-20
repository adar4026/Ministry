// Pure period-progress model for TASK_037 Statistics overview + month/year
// detail screens. Builds on already-existing primitives instead of
// duplicating them: monthTotal()/monthCellsForSY()/serviceYearAggregation()
// (src/data/constants.ts, src/data/stats.ts) resolve the actual hour totals
// (Session-first per docs/TASKS/TASK_005_ARCHITECTURE.md §7–§8);
// idealCumulativeHours()/computePaceDeviation() (src/data/cumulativeProgress.ts,
// already used by the Home card) supply the ideal-pace line and the
// ahead/behind/on comparison — both the mini chart on the overview cards and
// the big chart on the detail screens read the same CumulativePoint[] shape,
// so neither duplicates the other's math.
import type { HourRecord, Session } from "@/types";
import {
  MN,
  MONTHLY_GOAL,
  YEARLY_GOAL,
  daysBetweenUTC,
  formatHM,
  isCurrentMonth,
  monthCellsForSY,
  monthTotal,
  serviceYearAggregation,
  svcYear,
} from "@/data/constants";
import { dailyMinutesForMonth, sessionsForMonth } from "@/data/stats";
import { computePaceDeviation, idealCumulativeHours } from "@/data/cumulativeProgress";
import { parseServiceYearLabel, serviceYearRange } from "@/data/serviceYear";

export { MONTHLY_GOAL, YEARLY_GOAL };

export type PeriodStatus = "ahead" | "behind" | "on" | "completed" | "no-goal";

export type PeriodSummary = {
  doneHours: number;
  goalHours: number;
  remainingHours: number; // max(0, goal - done)
  progressRatio: number; // done / goal, 0 when goal <= 0; NOT capped at 1 (over-completion preserved)
  daysLeft: number; // calendar days left in the period, including today; 0 for a past period
  requiredPerDay: number; // hours/day still needed on the remaining days, 0 if nothing left to do
  requiredPerWeek: number; // requiredPerDay * 7 — the "weekly pace" the service-year card/screen ask for
  status: PeriodStatus;
  deviationHours: number; // done - ideal-so-far; 0 for "no-goal"
};

export type CumulativePoint = {
  index: number; // 1-based day-of-month, or 1-based month-of-service-year
  label: string; // "5" (day) or "Сен" (month)
  actualHours: number; // cumulative actual through this index
  idealHours: number; // cumulative ideal-pace-to-goal through this index
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function buildSummary(
  doneHours: number,
  goalHours: number,
  totalUnits: number,
  elapsedUnits: number,
  daysLeft: number,
): PeriodSummary {
  const remainingHours = Math.max(0, goalHours - doneHours);
  const progressRatio = goalHours > 0 ? doneHours / goalHours : 0;
  const requiredPerDay = daysLeft > 0 ? remainingHours / daysLeft : 0;
  const requiredPerWeek = requiredPerDay * 7;

  // computePaceDeviation() is defensive against goalHours <= 0 already (see
  // cumulativeProgress.test.ts), so it's always safe to call first — the
  // no-goal/completed cases below only override the *label*, not the math.
  const dev = computePaceDeviation(doneHours, goalHours, totalUnits, elapsedUnits);
  let status: PeriodStatus = dev.status;
  if (goalHours <= 0) status = "no-goal";
  else if (doneHours >= goalHours) status = "completed";

  return {
    doneHours,
    goalHours,
    remainingHours,
    progressRatio,
    daysLeft,
    requiredPerDay,
    requiredPerWeek,
    status,
    deviationHours: dev.deviationHours,
  };
}

function isPastMonth(year: number, month: number, now: Date): boolean {
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
}

// Progress of one calendar month against `goalHours` (defaults to the
// project's MONTHLY_GOAL). `year`/`month` are explicit — not derived from
// `now` — so this works for any month, past or current (the detail screen's
// whole point per TASK_037 §3 is that it isn't hard-wired to "this month").
export function monthPeriodSummary(
  records: HourRecord[],
  sessions: Session[],
  year: number,
  month: number,
  goalHours: number = MONTHLY_GOAL,
  now: Date = new Date(),
): PeriodSummary {
  const doneHours = monthTotal(records, sessions, year, month);
  const daysInMonth = new Date(year, month, 0).getDate();
  const current = isCurrentMonth(year, month, now);
  const past = isPastMonth(year, month, now);
  const elapsedUnits = current ? clamp(now.getDate(), 0, daysInMonth) : past ? daysInMonth : 0;
  const daysLeft = current ? Math.max(0, daysInMonth - now.getDate() + 1) : past ? 0 : daysInMonth;
  return buildSummary(doneHours, goalHours, daysInMonth, elapsedUnits, daysLeft);
}

// Day-by-day cumulative actual/ideal series for one calendar month — only
// meaningful for a Session-authoritative month (a legacy HourRecord month
// has no day-level breakdown to draw; callers must check
// sessionsForMonth(...).length > 0 first, same guard month/[key].tsx already
// uses to pick between its Session list and its legacy empty-state).
export function monthCumulativePoints(sessions: Session[], year: number, month: number, goalHours: number): CumulativePoint[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const daily = dailyMinutesForMonth(sessions, year, month);
  let running = 0;
  const points: CumulativePoint[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    running += daily.get(day) ?? 0;
    points.push({
      index: day,
      label: String(day),
      actualHours: running / 60,
      idealHours: idealCumulativeHours(goalHours, daysInMonth, day),
    });
  }
  return points;
}

// Inclusive day count between two calendar dates (both ends counted) — the
// UTC-safe diff itself is daysBetweenUTC() (src/data/constants.ts, already
// used by relativeDays()); this only adds the +1 span semantics that
// constants.ts's callers don't need.
function daysBetweenInclusive(a: Date, b: Date): number {
  return daysBetweenUTC(a, b) + 1;
}

// Derives its Sep 1/Aug 31 boundary from serviceYearRange() (src/data/
// serviceYear.ts) — the single canonical source for the service-year
// boundary (TASK_038) — rather than re-deriving month 8/7 locally. That
// function returns a half-open [start, endExclusive) range; `end` here is
// the *inclusive* last day (Aug 31), computed via Date field subtraction
// (not a literal month number) so it stays correct regardless of DST.
function serviceYearBounds(syLabel: string): { start: Date; end: Date; totalDays: number } {
  const endYear = parseServiceYearLabel(syLabel);
  const { start, endExclusive } = serviceYearRange(endYear);
  const end = new Date(endExclusive.getFullYear(), endExclusive.getMonth(), endExclusive.getDate() - 1);
  const totalDays = daysBetweenInclusive(start, end);
  return { start, end, totalDays };
}

// Progress of one service year (e.g. "2025–2026") against `goalHours`
// (defaults to YEARLY_GOAL). Mirrors monthPeriodSummary() but at
// day-resolution over the whole Sep–Aug span, since a service year's
// "required weekly pace" needs real calendar days, not a 12-unit count.
export function yearPeriodSummary(
  records: HourRecord[],
  sessions: Session[],
  syLabel: string,
  goalHours: number = YEARLY_GOAL,
  now: Date = new Date(),
): PeriodSummary {
  const { start, end, totalDays } = serviceYearBounds(syLabel);
  const doneHours = serviceYearAggregation(records, sessions).find((g) => g.sy === syLabel)?.total ?? 0;
  const current = svcYear(now.getFullYear(), now.getMonth() + 1) === syLabel;
  const past = now.getTime() > end.getTime();
  const elapsedUnits = current ? clamp(daysBetweenInclusive(start, now), 0, totalDays) : past ? totalDays : 0;
  const daysLeft = current ? Math.max(0, daysBetweenInclusive(now, end)) : past ? 0 : totalDays;
  return buildSummary(doneHours, goalHours, totalDays, elapsedUnits, daysLeft);
}

// Month-by-month cumulative actual/ideal series for a whole service year
// (12 points, Sep..Aug) — built directly on monthCellsForSY() (the same
// primitive the old TrendChart/HeatMap used) rather than re-deriving the
// Sep-first month order a second time.
export function yearCumulativePoints(
  records: HourRecord[],
  sessions: Session[],
  syLabel: string,
  goalHours: number,
): CumulativePoint[] {
  const cells = monthCellsForSY(records, sessions, syLabel);
  let running = 0;
  return cells.map((cell, idx) => {
    running += cell.value;
    const month = parseInt(cell.date.split("-")[1], 10);
    return {
      index: idx + 1,
      label: MN[month - 1],
      actualHours: running,
      idealHours: idealCumulativeHours(goalHours, cells.length, idx + 1),
    };
  });
}

// 1-based position of a calendar month within the Sep..Aug service-year
// order (Sep=1 ... Aug=12) — the index into yearCumulativePoints() that
// corresponds to a given calendar month, used to place the "today" marker
// on the year chart from both the overview card and the year detail screen.
export function serviceYearMonthIndex(month: number): number {
  return ((month - 9 + 12) % 12) + 1;
}

// Short human status line shared by the overview cards and both detail
// screens (TASK_037 §2.1/§3.2/§4.2) — one place owns the wording so the two
// contexts never drift apart.
export function periodStatusLabel(summary: PeriodSummary): string {
  switch (summary.status) {
    case "no-goal":
      return "Цель не задана";
    case "completed":
      return "Цель выполнена";
    case "ahead":
      return `Впереди плана на ${formatHM(summary.deviationHours)}`;
    case "behind":
      return `Ниже плана на ${formatHM(Math.abs(summary.deviationHours))}`;
    case "on":
    default:
      return "В соответствии с планом";
  }
}

// Whether a Session-authoritative day-level chart can be drawn for this
// month — the single guard month-detail UI needs to pick between
// monthCumulativePoints() and a legacy "no daily breakdown" notice.
export function monthHasDailyBreakdown(sessions: Session[], year: number, month: number): boolean {
  return sessionsForMonth(sessions, year, month).length > 0;
}
