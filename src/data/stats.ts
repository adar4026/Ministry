// Pure statistical helpers for TASK_005E Statistics screen.
// No StoreContext, no side effects — only math on precomputed arrays.
// See docs/TASKS/TASK_005_ARCHITECTURE.md §5, §84–86.

import type { HourRecord, Session } from "@/types";
import { currentServiceYearEndYear, parseServiceYearLabel, serviceYearMonths } from "./serviceYear";

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
// Session exists for that month, otherwise the legacy HourRecord's hours, or
// 0 if neither exists. This is the single primitive every other aggregation
// function in this layer is built on — never duplicate this resolution logic
// elsewhere. Private: exported call sites are monthTotal() and
// monthCellsForSY() below, each preserving its own public parameter shape.
//
// creditHours (TASK_039 — e.g. pioneer school attendance) is a completely
// separate quantity, not a portion of `hours` — this function never reads
// or subtracts it. Concrete example: a HourRecord with `hours: 30,
// creditHours: 30` (real-world case — November 2025, 30 real field-service
// hours plus a separate 30-hour pioneer-school credit) resolves here to
// exactly 30, not 0 and not 60 — the credit neither reduces nor inflates
// this number. See monthCredit()/totalCreditForPeriod() below for the
// parallel credit-only aggregation (which would return 30 for that same
// record), and HourRecord.creditHours (src/types/index.ts) for why the two
// are kept apart rather than one being derived from the other.
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

// ---------------------------------------------------------------------------
// History period filters (TASK_033) — Month/Year/All-time totals for the
// "Итого" card. Independent of dailyMinutesForMonth()/sessionsForMonth()
// above, which the calendar grid and session list keep using unchanged;
// these operate on the period selector's own state instead.
// ---------------------------------------------------------------------------

export type HistoryPeriod = "month" | "year" | "all";

// All Sessions whose `date` falls within the given calendar year — the
// year-scoped counterpart to sessionsForMonth() above.
export function sessionsForYear(sessions: Session[], year: number): Session[] {
  return sessions.filter((s) => parseISOYearMonth(s.date).year === year);
}

// All Sessions whose `date` equals the given ISO day exactly — used by the
// History calendar's day-tap handler (TASK_033 §4) to resolve which
// Session(s), if any, a tapped cell represents. The data model does not
// guarantee at most one Session per day (TASK_032 already sums same-day
// sessions into one calendar cell), so callers must handle 0/1/N results.
export function sessionsForDay(sessions: Session[], dateISO: string): Session[] {
  return sessions.filter((s) => s.date === dateISO);
}

export function sumDurationMinutes(sessions: Session[]): number {
  return sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
}

// Every distinct (year, month) pair that has either a legacy HourRecord or
// at least one Session — the "all-time" period has no natural start date
// otherwise. Mirrors the key-collection pattern serviceYearAggregation()
// (src/data/constants.ts) already uses for the same union, kept local here
// since that function groups by service year and this needs a flat list.
function unionMonthKeys(records: HourRecord[], sessions: Session[]): { year: number; month: number }[] {
  const keys: { year: number; month: number }[] = [];
  const seen = new Set<string>();
  const add = (year: number, month: number) => {
    const key = `${year}-${month}`;
    if (!seen.has(key)) {
      seen.add(key);
      keys.push({ year, month });
    }
  };
  records.forEach((r) => add(r.year, r.month));
  sessions.forEach((s) => {
    const p = parseISOYearMonth(s.date);
    add(p.year, p.month);
  });
  return keys;
}

// The single selector behind the "Итого" card: total minutes for whichever
// period is active, Session-first per month (TASK_034 — history.tsx used to
// pass only `sessions` here, silently dropping every legacy HourRecord
// month; see docs/TASKS/TASK_034_HISTORY_DATA_RECOVERY_AND_CRUD.md §3.1).
// `year`/`month` describe the period currently shown by PeriodNav — "month"
// uses both (that exact calendar month); "year" uses `year` alone, but as a
// *service year* (TASK_038): the project's year has run September–August
// everywhere else since svcYear()/serviceYearAggregation()
// (src/data/constants.ts) — History's "year" period previously summed
// calendar Jan–Dec of `year` instead, silently dropping every Sep–Dec month
// of the *previous* calendar year that actually belongs to the displayed
// service year (see docs/TASKS/TASK_038_HISTORY_SERVICE_YEAR_FIX.md).
// `year` here means "the service year ending in August of `year`" — i.e.
// Sep(year-1)..Aug(year), matching PeriodNav's plain "2026" label — see
// serviceYearMonths() (src/data/serviceYear.ts), the single canonical
// source for that month order; this function does not re-derive it. "all"
// sums the union of every month that has a HourRecord or a Session, with no
// synthetic start/end date.
export function totalMinutesForPeriod(
  records: HourRecord[],
  sessions: Session[],
  period: HistoryPeriod,
  year: number,
  month: number,
): number {
  // monthTotal() returns hours (dividing Session minutes by 60 when
  // Session-authoritative); rounding each month's *60 round-trip back to
  // minutes avoids compounding float drift (e.g. 65 min / 60 * 60 !==
  // 65 exactly) across many summed months.
  if (period === "all") {
    return unionMonthKeys(records, sessions).reduce(
      (sum, { year: y, month: m }) => sum + Math.round(monthTotal(records, sessions, y, m) * 60),
      0,
    );
  }
  if (period === "year") {
    return serviceYearMonths(year).reduce(
      (sum, { year: y, month: m }) => sum + Math.round(monthTotal(records, sessions, y, m) * 60),
      0,
    );
  }
  return Math.round(monthTotal(records, sessions, year, month) * 60);
}

// The credit hours (TASK_039) recorded for one month — 0 if the month has
// no legacy HourRecord or the record has no creditHours set. Credit exists
// only on HourRecord, never Session (it's a monthly-report concept — a
// pioneer-school attendance credit — not a timed activity), so unlike
// resolveMonthTotal() this never looks at `sessions` at all.
function monthCredit(records: HourRecord[], year: number, month: number): number {
  return records.find((r) => r.year === year && r.month === month)?.creditHours ?? 0;
}

// The credit-hours counterpart to totalMinutesForPeriod() above — same
// period shapes (month/year/all), same service-year boundary
// (serviceYearMonths()), but sums creditHours instead of the real total,
// and is never added to or subtracted from it. Concrete example (the real
// case that motivated this function): a service year whose November has
// `hours: 30, creditHours: 30` and every other month has no credit —
// totalMinutesForPeriod(..., "year", ...) for that year is unaffected by
// November's creditHours at all (November still contributes exactly 30),
// while totalCreditForPeriod(..., "year", ...) for the same year returns
// 30 — the two numbers are shown side by side (never summed into one
// "combined" total anywhere in the code; a reader who wants "543" adds
// 513 + 30 themselves, informally, outside the app). Returned in *hours*
// (not minutes) since HourRecord.creditHours, like HourRecord.hours, has
// never carried Session-style minute precision — callers format it
// directly (formatDurationRu() etc. still expect minutes, so multiply by
// 60 first).
export function totalCreditForPeriod(records: HourRecord[], period: HistoryPeriod, year: number, month: number): number {
  if (period === "all") {
    return unionMonthKeys(records, []).reduce((sum, { year: y, month: m }) => sum + monthCredit(records, y, m), 0);
  }
  if (period === "year") {
    return serviceYearMonths(year).reduce((sum, { year: y, month: m }) => sum + monthCredit(records, y, m), 0);
  }
  return monthCredit(records, year, month);
}

// Whether (year, month) is the calendar month containing `now` — drives the
// "Текущий месяц" subtitle under the Month-period nav label.
export function isCurrentMonth(year: number, month: number, now: Date = new Date()): boolean {
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

// Whether `year` (a service-year end-year, e.g. "2026" for Sep 2025..Aug
// 2026 — see totalMinutesForPeriod()) is the service year containing `now`
// — drives the "Текущий год" subtitle under the Year-period nav label.
// Delegates to currentServiceYearEndYear() (src/data/serviceYear.ts) — the
// boundary rule itself does not live here.
export function isCurrentYear(year: number, now: Date = new Date()): boolean {
  return year === currentServiceYearEndYear(now);
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
  const endYear = parseServiceYearLabel(syLabel);
  return serviceYearMonths(endYear).map(({ year, month }) => {
    const hours = resolveMonthTotal(records, sessions, year, month);
    return { date: `${year}-${String(month).padStart(2, "0")}`, value: hours };
  });
}