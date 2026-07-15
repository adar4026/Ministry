// Pure statistical helpers for TASK_005E Statistics screen.
// No StoreContext, no side effects â only math on precomputed arrays.
// See docs/TASKS/TASK_005_ARCHITECTURE.md Â§5, Â§84â86.

import type { Session } from "@/types";

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
  // Average days per month â 30.44
  const avgDaysPerMonth = 30.44;
  const projectedAdditionalHours = (paceMinPerDay * avgDaysPerMonth * monthsLeftInSY) / 60;
  return syTotalHours + projectedAdditionalHours;
}

/**
 * Build 12 HeatMap cells for a service year (SepâAug).
 * Each cell: { date: "YYYY-MM", value: hours }.
 * Uses monthTotal (Session-authoritative when available).
 */
export function monthCellsForSY(
  records: { year: number; month: number; hours: number }[],
  sessions: Session[],
  syLabel: string, // e.g. "2025â2026"
): { date: string; value: number }[] {
  const [startYearStr] = syLabel.split("â");
  const startYear = parseInt(startYearStr, 10);
  // Service year: Sep (month 9) of startYear through Aug (month 8) of startYear+1
  const monthOrder = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

  return monthOrder.map((month, idx) => {
    const year = month >= 9 ? startYear : startYear + 1;
    const hours = monthTotalFromSources(records, sessions, year, month);
    return { date: `${year}-${String(month).padStart(2, "0")}`, value: hours };
  });
}

// Internal helper â mirrors monthTotal logic but accepts raw arrays for stats layer.
function monthTotalFromSources(
  records: { year: number; month: number; hours: number }[],
  sessions: Session[],
  year: number,
  month: number,
): number {
  const monthSessions = sessions.filter((s) => {
    const [y, m] = s.date.split("-").map(Number);
    return y === year && m === month;
  });
  if (monthSessions.length > 0) {
    return monthSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;
  }
  return records.find((r) => r.year === year && r.month === month)?.hours ?? 0;
}