// TASK_081 — pure statistics model for the «Статистика» section
// (/statistics). No React, no store, no side effects: an index built once
// from the two existing time sources, and cheap read-only views over it.
//
// Sources and the aggregation rule are the app's existing ones, not a
// second copy: `records` (legacy HourRecord monthly totals) and `sessions`
// (dated Session entries), Session-first per month exactly as monthTotal()
// (src/data/stats.ts, docs/TASKS/TASK_005_ARCHITECTURE.md §7–§8) — a month
// with at least one Session ignores its HourRecord entirely; a month with
// no Session falls back to the record. creditHours (TASK_039) is not field
// service time and is never included here, same as everywhere else.
//
// Everything is counted in whole MINUTES and only formatted as hours at the
// edge (formatStatMinutes) — no fractional-hour sums, no float drift.
// Dates are grouped by string slices of the stored "YYYY-MM-DD" day, never
// through `new Date()`, so a late-evening 31 December entry can never slide
// into the neighbouring day or year via a timezone conversion.
import type { HourRecord, Session } from "@/types";
import { formatHM } from "@/data/constants";

export type MonthSource = "session" | "legacy";

export type MonthBucket = {
  year: number;
  month: number; // 1–12
  minutes: number;
  source: MonthSource;
  // Per-day minutes, keyed by "YYYY-MM-DD". Empty for a legacy month —
  // a monthly HourRecord carries no day breakdown at all.
  days: Map<string, number>;
};

// "YYYY-MM" → bucket. Built once per data change (the screen memoizes it on
// `records`/`sessions`); every view below is a read over this map, so
// switching the displayed year never re-walks the raw collections.
export type ServiceStatsIndex = Map<string, MonthBucket>;

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function buildServiceStatsIndex(records: HourRecord[], sessions: Session[]): ServiceStatsIndex {
  const index: ServiceStatsIndex = new Map();

  for (const s of sessions) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.date);
    if (!m) continue; // malformed date: not attributable to any month
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12) continue;
    const key = monthKey(year, month);
    let bucket = index.get(key);
    if (!bucket) {
      bucket = { year, month, minutes: 0, source: "session", days: new Map() };
      index.set(key, bucket);
    }
    const minutes = Math.max(0, Math.round(s.durationMinutes));
    bucket.minutes += minutes;
    bucket.days.set(s.date, (bucket.days.get(s.date) ?? 0) + minutes);
  }

  // Legacy monthly totals only fill months no Session touched (Session-first).
  for (const r of records) {
    if (r.month < 1 || r.month > 12) continue;
    const key = monthKey(r.year, r.month);
    if (index.has(key)) continue;
    const minutes = Math.max(0, Math.round((r.hours ?? 0) * 60));
    index.set(key, { year: r.year, month: r.month, minutes, source: "legacy", days: new Map() });
  }

  return index;
}

// ---------------------------------------------------------------------------
// Year view
// ---------------------------------------------------------------------------

export type MonthStat = {
  month: number; // 1–12
  minutes: number;
  activeDays: number; // distinct Session dates; 0 for a legacy month
  source: MonthSource | "none";
};

export type BusiestMonth = { year: number; month: number; minutes: number };

export type YearStats = {
  year: number;
  totalMinutes: number;
  months: MonthStat[]; // always 12, January..December
  monthsWithData: number;
  // total / monthsWithData — a month with no entries (including the months
  // of the current year that have not happened yet) never dilutes it.
  averagePerMonthMinutes: number;
  activeDays: number;
  busiestMonth: BusiestMonth | null;
  hasData: boolean;
};

export function yearStats(index: ServiceStatsIndex, year: number): YearStats {
  const months: MonthStat[] = [];
  let totalMinutes = 0;
  let monthsWithData = 0;
  let activeDays = 0;
  let busiest: BusiestMonth | null = null;

  for (let month = 1; month <= 12; month++) {
    const bucket = index.get(monthKey(year, month));
    if (!bucket) {
      months.push({ month, minutes: 0, activeDays: 0, source: "none" });
      continue;
    }
    months.push({ month, minutes: bucket.minutes, activeDays: bucket.days.size, source: bucket.source });
    totalMinutes += bucket.minutes;
    monthsWithData += 1;
    activeDays += bucket.days.size;
    if (!busiest || bucket.minutes > busiest.minutes) busiest = { year, month, minutes: bucket.minutes };
  }

  return {
    year,
    totalMinutes,
    months,
    monthsWithData,
    averagePerMonthMinutes: monthsWithData > 0 ? Math.round(totalMinutes / monthsWithData) : 0,
    activeDays,
    busiestMonth: busiest,
    hasData: monthsWithData > 0,
  };
}

export type YearComparison = {
  year: number;
  minutes: number;
  prevYear: number;
  prevMinutes: number;
  deltaMinutes: number; // minutes - prevMinutes (signed)
  deltaPercent: number | null; // null when prevMinutes is 0
};

// Neutral year-over-year figures. `null` when the previous year has no data
// at all — the UI then simply omits the block (never "worse"/"better").
export function yearComparison(index: ServiceStatsIndex, year: number): YearComparison | null {
  const prev = yearStats(index, year - 1);
  if (!prev.hasData) return null;
  const cur = yearStats(index, year);
  const deltaMinutes = cur.totalMinutes - prev.totalMinutes;
  return {
    year,
    minutes: cur.totalMinutes,
    prevYear: year - 1,
    prevMinutes: prev.totalMinutes,
    deltaMinutes,
    deltaPercent: prev.totalMinutes > 0 ? (deltaMinutes / prev.totalMinutes) * 100 : null,
  };
}

// ---------------------------------------------------------------------------
// Lifetime view
// ---------------------------------------------------------------------------

export type LifetimeStats = {
  totalMinutes: number;
  // Earliest Session day, or the 1st of the earliest legacy month —
  // "YYYY-MM-DD". Null when there is no data at all.
  firstDate: string | null;
  // False when `firstDate` is only known to the month (a legacy HourRecord
  // has no day), so the UI shows "Сентябрь 2023" rather than a made-up day.
  firstDateIsExact: boolean;
  yearsWithData: number;
  activeDays: number;
  averagePerMonthMinutes: number; // over months with data
  busiestMonth: BusiestMonth | null;
  years: { year: number; minutes: number }[]; // newest first
  hasData: boolean;
};

export function lifetimeStats(index: ServiceStatsIndex): LifetimeStats {
  let totalMinutes = 0;
  let activeDays = 0;
  let firstDate: string | null = null;
  let firstDateIsExact = false;
  let busiest: BusiestMonth | null = null;
  const perYear = new Map<number, number>();

  for (const bucket of index.values()) {
    totalMinutes += bucket.minutes;
    activeDays += bucket.days.size;
    perYear.set(bucket.year, (perYear.get(bucket.year) ?? 0) + bucket.minutes);
    if (!busiest || bucket.minutes > busiest.minutes) {
      busiest = { year: bucket.year, month: bucket.month, minutes: bucket.minutes };
    }
    const exact = bucket.days.size > 0;
    const candidate = exact ? [...bucket.days.keys()].sort()[0] : `${monthKey(bucket.year, bucket.month)}-01`;
    if (firstDate === null || candidate < firstDate) {
      firstDate = candidate;
      firstDateIsExact = exact;
    }
  }

  const years = [...perYear.entries()]
    .map(([year, minutes]) => ({ year, minutes }))
    .sort((a, b) => b.year - a.year);

  return {
    totalMinutes,
    firstDate,
    firstDateIsExact,
    yearsWithData: years.length,
    activeDays,
    averagePerMonthMinutes: index.size > 0 ? Math.round(totalMinutes / index.size) : 0,
    busiestMonth: busiest,
    years,
    hasData: index.size > 0,
  };
}

// ---------------------------------------------------------------------------
// Month detail
// ---------------------------------------------------------------------------

export type MonthDetail = {
  year: number;
  month: number;
  totalMinutes: number;
  activeDays: number;
  averagePerActiveDayMinutes: number;
  source: MonthSource | "none";
  days: { date: string; minutes: number }[]; // ascending by date
};

export function monthDetail(index: ServiceStatsIndex, year: number, month: number): MonthDetail {
  const bucket = index.get(monthKey(year, month));
  if (!bucket) {
    return { year, month, totalMinutes: 0, activeDays: 0, averagePerActiveDayMinutes: 0, source: "none", days: [] };
  }
  const days = [...bucket.days.entries()]
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const activeDays = days.length;
  return {
    year,
    month,
    totalMinutes: bucket.minutes,
    activeDays,
    averagePerActiveDayMinutes: activeDays > 0 ? Math.round(bucket.minutes / activeDays) : 0,
    source: bucket.source,
    days,
  };
}

// ---------------------------------------------------------------------------
// Year navigation
// ---------------------------------------------------------------------------

// Every calendar year that has at least one month with data, ascending.
export function availableYears(index: ServiceStatsIndex): number[] {
  const years = new Set<number>();
  for (const bucket of index.values()) years.add(bucket.year);
  return [...years].sort((a, b) => a - b);
}

// Range the ‹ › switcher may move through: from the earliest year with data
// (or the current year when there is none) up to the current year — there
// is nothing meaningful to show for a year that has not started.
export function yearSwitcherBounds(index: ServiceStatsIndex, now: Date = new Date()): { min: number; max: number } {
  const current = now.getFullYear();
  const years = availableYears(index);
  const earliest = years.length > 0 ? years[0] : current;
  return { min: Math.min(earliest, current), max: Math.max(current, years[years.length - 1] ?? current) };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

// No-break space (U+00A0) between thousands groups: "1 842". Used only
// here — no other screen ever shows a four-digit hour figure.
const THOUSANDS_SEP = " ";

export function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEP);
}

// [["37","ч"],["30","м"]] / [["52","ч"]] / [["0","ч"]] — the hero figure's
// number/unit pairs (number large, unit smaller, one baseline — the layout
// GlassFigure uses on the Home hero). Built straight from minutes rather than
// by parsing a formatted string, so the thousands separator never splits a
// number in two.
export function durationPairs(minutes: number): Array<[string, string]> {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  const pairs: Array<[string, string]> = [[groupThousands(h), "ч"]];
  if (m > 0) pairs.push([String(m), "м"]);
  return pairs;
}

// "37 ч 30 м" / "52 ч" / "0 ч" — formatHM()'s approved shape, with thousands
// grouped ("1 842 ч 15 м") for the lifetime figures this section can reach.
export function formatStatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const text = formatHM(total / 60);
  if (total < 60 * 1000) return text;
  return text.replace(/^\d+/, (h) => groupThousands(Number(h)));
}

// Signed delta for the comparison block: "+37 ч 20 м" / "−12 ч" / "0 ч".
export function formatSignedMinutes(deltaMinutes: number): string {
  if (deltaMinutes === 0) return "0 ч";
  const sign = deltaMinutes > 0 ? "+" : "−";
  return `${sign}${formatStatMinutes(Math.abs(deltaMinutes))}`;
}

// "+9,5 %" / "−3 %" / "0 %" — one decimal, Russian decimal comma, dropped
// when the value is whole.
export function formatSignedPercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10;
  if (rounded === 0) return "0 %";
  const sign = rounded > 0 ? "+" : "−";
  const abs = Math.abs(rounded);
  const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(1).replace(".", ",");
  return `${sign}${text} %`;
}
