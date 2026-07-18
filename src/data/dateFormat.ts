// Pure date-presentation helpers for the Home "Последние события" card
// (TASK_018). No StoreContext, no side effects.

// "YYYY-MM-DD" -> "DD-MM-YYYY". Presentation only — storage format unchanged.
// Malformed input is returned unchanged rather than crashing the Home screen.
// The single canonical full-date display formatter for the whole app
// (TASK_022) — every screen/component renders a user-facing calendar date
// through this function (re-exported from src/data/constants.ts for the
// call sites that already import from there) instead of a locally-grown
// duplicate. String-only (regex + group reorder) — never goes through
// `Date`, so there is no timezone-driven day shift.
export function formatDateDMY(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}-${mo}-${y}`;
}

// Inverse of formatDateDMY: "DD-MM-YYYY" -> "YYYY-MM-DD". Used only at a
// form's submit boundary to convert the visible, user-typed date back to
// the ISO value the rest of the app (storage, StoreContext, sorting)
// requires (TASK_022). String-only, same as formatDateDMY — no `Date`
// parsing, no timezone shift. Malformed input is returned unchanged.
export function parseDMYToISO(dmy: string): string {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dmy);
  if (!m) return dmy;
  const [, d, mo, y] = m;
  return `${y}-${mo}-${d}`;
}

// Format-only validity check for a user-typed "DD-MM-YYYY" date (TASK_022)
// — mirrors the format-only strictness of the ISO regex forms used before
// this task (e.g. no rejection of a calendar-impossible "31-02-2026"), just
// on the new visible shape.
export function isValidDMY(s: string): boolean {
  return /^\d{2}-\d{2}-\d{4}$/.test(s);
}

export type CalendarElapsed = {
  years: number;
  months: number;
  days: number;
  isFuture: boolean;
  isToday: boolean;
};

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

// `start` plus `n` whole calendar months, clamping the day-of-month to the
// target month's length (e.g. Jan 31 + 1 month = Feb 28/29, not a rollover
// into March) — the convention that matches how people read "N months
// after" an end-of-month date.
function addMonthsClamped(start: Date, n: number): Date {
  const firstOfTarget = new Date(start.getFullYear(), start.getMonth() + n, 1);
  const clampedDay = Math.min(start.getDate(), daysInMonth(firstOfTarget.getFullYear(), firstOfTarget.getMonth()));
  return new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth(), clampedDay);
}

function daysBetweenUTC(a: Date, b: Date): number {
  const aUTC = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUTC = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bUTC - aUTC) / 86400000);
}

// True calendar difference between `iso` (a "YYYY-MM-DD" day) and `now`,
// expressed as complete years, then complete months, then remaining days —
// not a division of elapsed milliseconds by fixed-length units. Finds the
// largest whole number of calendar months that, added to `start` (with
// end-of-month clamping), does not exceed `today`; the remainder in days is
// then an exact day-count between two real calendar dates. This naturally
// handles variable month lengths, leap years, and end-of-month dates.
export function calendarElapsed(iso: string, now: Date = new Date()): CalendarElapsed {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return { years: 0, months: 0, days: 0, isFuture: false, isToday: false };
  const [, yStr, moStr, dStr] = m;
  const y = Number(yStr);
  const mo = Number(moStr);
  const d = Number(dStr);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(y, mo - 1, d);

  if (start.getTime() === today.getTime()) {
    return { years: 0, months: 0, days: 0, isFuture: false, isToday: true };
  }
  if (start.getTime() > today.getTime()) {
    return { years: 0, months: 0, days: 0, isFuture: true, isToday: false };
  }

  let totalMonths =
    (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
  while (addMonthsClamped(start, totalMonths).getTime() > today.getTime()) totalMonths -= 1;
  while (addMonthsClamped(start, totalMonths + 1).getTime() <= today.getTime()) totalMonths += 1;

  const monthAnchor = addMonthsClamped(start, totalMonths);
  const days = daysBetweenUTC(monthAnchor, today);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return { years, months, days, isFuture: false, isToday: false };
}

// Exported so the 11-14 exception and the 21/22/25-style boundaries can be
// tested directly against every unit (years/months/days), even for month
// counts calendarElapsed() itself never produces (it always normalizes to
// 0-11 months) — the grammar rule is unit-agnostic and worth verifying on
// its own.
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

const YEAR_FORMS: [string, string, string] = ["год", "года", "лет"];
const MONTH_FORMS: [string, string, string] = ["месяц", "месяца", "месяцев"];
const DAY_FORMS: [string, string, string] = ["день", "дня", "дней"];

export function pluralYearsRu(n: number): string {
  return pluralRu(n, ...YEAR_FORMS);
}
export function pluralMonthsRu(n: number): string {
  return pluralRu(n, ...MONTH_FORMS);
}
export function pluralDaysRu(n: number): string {
  return pluralRu(n, ...DAY_FORMS);
}

// Renders a `calendarElapsed()` result as a Russian phrase using calendar
// years/months/days, e.g. "2 года 2 месяца 3 дня". Zero-value units are
// omitted; today is "Сегодня"; future dates fall back to "" (caller decides
// whether to render anything) since this section is for past events only.
export function formatElapsedRu(elapsed: CalendarElapsed): string {
  if (elapsed.isToday) return "Сегодня";
  if (elapsed.isFuture) return "";

  const parts: string[] = [];
  if (elapsed.years > 0) {
    parts.push(`${elapsed.years} ${pluralRu(elapsed.years, ...YEAR_FORMS)}`);
  }
  if (elapsed.months > 0) {
    parts.push(`${elapsed.months} ${pluralRu(elapsed.months, ...MONTH_FORMS)}`);
  }
  if (elapsed.days > 0 || parts.length === 0) {
    parts.push(`${elapsed.days} ${pluralRu(elapsed.days, ...DAY_FORMS)}`);
  }
  return parts.join(" ");
}
