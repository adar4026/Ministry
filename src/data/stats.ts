// Pure statistical helpers for TASK_005E Statistics screen.
// No StoreContext, no side effects — only math on precomputed arrays.
// See docs/TASKS/TASK_005_ARCHITECTURE.md §5, §84–86.

import type { HourRecord, Session } from "@/types";

// ---------------------------------------------------------------------------
// Aggregation Layer (TASK_005A) — the single source for resolving how many
// hours were spent in a given month across the two time-tracking sources:
// legacy monthly HourRecord totals, and granular Session entries. See
// docs/TASKS/TASK_005_ARCHITECTURE.md §7–§8 for the authoritative rule this
// implements: if any Session exists for a month, Sessions are authoritative
// for that month; otherwise the legacy HourRecord is used. The two sources
// are never merged or combined for the same month.
//
// Relocated here from constants.ts (TASK_008) so monthCellsForSY() below can
// call the single canonical primitive directly instead of duplicating it.
// Re-exported unchanged from constants.ts — see that file for the public
// entry point every other consumer imports from.
// ---------------------------------------------------------------------------

// "YYYY-MM-DD" -> { year, month }. Local parse, no Date/timezone involved.
export function parseISOYearMonth(iso: string): { year: number; month: number } {
  const [y, m] = iso.split("-").map(Number);
  return { year: y, month: m };
}

// All Sessions whose `date` falls within the given calendar month.
export function sessionsForMonth(sessions: Session[], year: number, month: number): Session[] {
  return sessions.filter((s) => {
    const p = parseISOYearMonth(s.date);
    return p.year === year && p.month === month;
  });
}

// Minimal shape the resolution logic actually needs — lets monthCellsForSY()
// keep accepting loosely-shaped record arrays (its original public
// signature) while monthTotal() keeps accepting full HourRecord[] (its
// original public signature), both delegating to the same implementation
// below instead of duplicating it.
type MonthTotalRecord = { year: number; month: number; hours: number };

// The authoritative hour total for one month: Session.sum() if at least one
// Session exists for that month, otherwise the legacy HourRecord's hours (or
// 0 if neither exists). This is the single primitive every other aggregation
// function in this layer is built on — never duplicate this resolution logic
// elsewhere. Private: exported call sites are monthTotal() and
// monthCellsForSY() below, each preserving its own public parameter shape.
function resolveMonthTotal(
  records: MonthTotalRecord[],
  sessions: Session[],
  year: number,
  month: number,
): number {
  const monthSessions = sessionsForMonth(sessions, year, month);
  if (monthSessions.length > 0) {
    return monthSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;
  }
  return records.find((r) => r.year === year && r.month === month)?.hours ?? 0;
}

export function monthTotal(records: HourRecord[], sessions: Session[], year: number, month: number): number {
  return resolveMonthTotal(records, sessions, year, month);
}

// Per-day duration totals for one calendar month (TASK_032 History
// calendar) — unlike monthTotal()/resolveMonthTotal() above, which collapse
// a month to a single number, this keeps one bucket per day-of-month so a
// calendar grid can render each cell independently. Built on
// sessionsForMonth() (never re-filters sessions itself); does not mutate
// `sessions`. Days with no Session simply have no entry in the returned Map
// — callers render those as 0.
export function dailyMinutesForMonth(sessions: Session[], year: number, month: number): Map<number, number> {
  const totals = new Map<number, number>();
  for (const s of sessionsForMonth(sessions, year, month)) {
    const day = Number(s.date.slice(8, 10));
    totals.set(day, (totals.get(day) ?? 0) + s.durationMinutes);
  }
  return totals;
}

/**
 * Compute average minutes per day over the trailing N days of sessions.
 * Returns 0 if no sessions in window.
 */
export function trailingPace(sessions: Session[], windowDays: number, now: Date = new Date()): number {
  if (sessions.length === 0) return 0;

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffISO = cutoff.toISOString().split("T")[0]; // "YYYY-MM-DD"

  const windowSessions = sessions.filter((s) => s.date >= cutoffISO);
  if (windowSessions.length === 0) return 0;

  const totalMinutes = windowSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  // Use actual elapsed days in window for pace (not calendar days)
  const elapsedDays = Math.max(1, Math.ceil((now.getTime() - cutoff.getTime()) / 86400000));
  return totalMinutes / elapsedDays;
}

/**
 * Project month-end total from current hours done and current pace.
 * paceMinPerDay = trailingPace(sessions, 7) or 30.
 * daysLeft = monthProgress(...).daysLeft
 */
export function projectMonthEnd(hoursDone: number, paceMinPerDay: number, daysLeft: number): number {
  if (daysLeft <= 0) return hoursDone;
  const projectedAdditionalHours = (paceMinPerDay * daysLeft) / 60;
  return hoursDone + projectedAdditionalHours;
}

/**
 * Project service-year-end total from current SY total and current monthly pace.
 * Assumes remaining months in SY will continue at current pace.
 */
export function projectServiceYearEnd(syTotalHours: number, paceMinPerDay: number, monthsLeftInSY: number): number {
  if (monthsLeftInSY <= 0) return syTotalHours;
  // Average days per month ≈ 30.44
  const avgDaysPerMonth = 30.44;
  const projectedAdditionalHours = (paceMinPerDay * avgDaysPerMonth * monthsLeftInSY) / 60;
  return syTotalHours + projectedAdditionalHours;
}

/**
 * Build 12 HeatMap cells for a service year (Sep–Aug).
 * Each cell: { date: "YYYY-MM", value: hours }.
 * Uses monthTotal (Session-authoritative when available).
 */
export function monthCellsForSY(
  records: { year: number; month: number; hours: number }[],
  sessions: Session[],
  syLabel: string, // e.g. "2025–2026"
): { date: string; value: number }[] {
  const [startYearStr] = syLabel.split("–");
  const startYear = parseInt(startYearStr, 10);
  // Service year: Sep (month 9) of startYear through Aug (month 8) of startYear+1
  const monthOrder = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

  return monthOrder.map((month) => {
    const year = month >= 9 ? startYear : startYear + 1;
    const hours = resolveMonthTotal(records, sessions, year, month);
    return { date: `${year}-${String(month).padStart(2, "0")}`, value: hours };
  });
}