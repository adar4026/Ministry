// Canonical domain module for Ministry's "service year" — the project's
// year runs September 1 through August 31, never the calendar year
// (docs/ARCHITECTURE.md "Логика служебного года"). TASK_038 found this
// boundary re-implemented independently in FIVE places — svcYear()
// (constants.ts), monthCellsForSY() and History's "Год" period (stats.ts),
// serviceYearBounds() (periodStats.ts), and a separate
// SERVICE_YEAR_MONTH_ORDER literal (HeatMap.tsx) — each with its own
// literal "9"/"8"/"7" month check or [9,10,...,8] array. One of them
// (History) had drifted to a plain calendar year and silently dropped
// September–December, which is what TASK_038 was filed to fix. This file
// is now the only place that encodes the Sep..Aug boundary; every other
// module imports from here instead of re-deriving it — see
// docs/TASKS/TASK_038_HISTORY_SERVICE_YEAR_FIX.md.
//
// Zero internal imports on purpose: a leaf module every other file can
// depend on without circular-import risk (constants.ts already imports
// from stats.ts; stats.ts must not import from constants.ts).

export const SERVICE_YEAR_START_MONTH = 9; // September, 1-indexed

// The Sep..Aug month-number sequence — the single literal encoding of
// "service years start in September" anywhere in this codebase.
// serviceYearMonths() below is built from it; HeatMap's fixed grid-position
// order (which only needs bare month numbers, not year-qualified pairs)
// imports this directly instead of keeping its own copy.
export const SERVICE_YEAR_MONTH_ORDER: readonly number[] = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

// The calendar year a service year *ends* in — the number the UI shows
// ("2026" for Sep 2025..Aug 2026). January..August belong to the service
// year ending in the same calendar year; September..December belong to the
// one ending the *next* calendar year.
export function serviceYearEndYear(year: number, month: number): number {
  return month >= SERVICE_YEAR_START_MONTH ? year + 1 : year;
}

// Which service year (by end-year) contains `now`.
export function currentServiceYearEndYear(now: Date = new Date()): number {
  return serviceYearEndYear(now.getFullYear(), now.getMonth() + 1);
}

// "YYYY–YYYY" display label for the service year ending in `endYear`, e.g.
// serviceYearLabel(2026) === "2025–2026" — the format svcYear() (constants.ts)
// has always returned.
export function serviceYearLabel(endYear: number): string {
  return `${endYear - 1}–${endYear}`;
}

// Inverse of serviceYearLabel(): "2025–2026" -> 2026. Reads the *second*
// year (the label's own end-year) rather than the first + 1, so it stays
// correct even for a label a caller received rather than derived itself.
export function parseServiceYearLabel(label: string): number {
  const [, endYearStr] = label.split("–");
  return parseInt(endYearStr, 10);
}

// Every (year, month) pair in the service year ending in `endYear`, in
// chronological order: September..December of (endYear - 1), then
// January..August of endYear. Built from SERVICE_YEAR_MONTH_ORDER above —
// nothing else should hardcode "for m=9..12" / "for m=1..8" or its own
// [9,10,11,12,1,2,3,4,5,6,7,8] literal.
export function serviceYearMonths(endYear: number): { year: number; month: number }[] {
  return SERVICE_YEAR_MONTH_ORDER.map((month) => ({
    year: month >= SERVICE_YEAR_START_MONTH ? endYear - 1 : endYear,
    month,
  }));
}

// Safe half-open [start, endExclusive) boundary for the service year ending
// in `endYear`: start = September 1 of (endYear - 1) at local midnight,
// endExclusive = September 1 of `endYear` at local midnight. Half-open is
// deliberate — it avoids the off-by-one double-counting risk of an
// inclusive "Aug 31 23:59:59.999" boundary; any instant strictly less than
// endExclusive is inside the service year, and Aug 31/Sep 1 are never lost
// or double-counted at the seam. Built from local Date fields (year, month,
// day) only, never a UTC/ISO string — avoids the timezone class of bug this
// domain is prone to (see docs/TASKS/TASK_038_HISTORY_SERVICE_YEAR_FIX.md).
export function serviceYearRange(endYear: number): { start: Date; endExclusive: Date } {
  return {
    start: new Date(endYear - 1, SERVICE_YEAR_START_MONTH - 1, 1, 0, 0, 0, 0),
    endExclusive: new Date(endYear, SERVICE_YEAR_START_MONTH - 1, 1, 0, 0, 0, 0),
  };
}
