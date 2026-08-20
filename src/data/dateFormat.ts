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

// Short genitive-case Russian month abbreviations for the History list row
// date ("19 июл. 2026", TASK_032) — deliberately independent of
// src/data/constants.ts's MN (nominative, "Июл") / MF (nominative, "Июль"),
// which other screens (month headers, calendar pickers) already depend on
// and which use the wrong grammatical case for a "day of month" phrase.
const MONTH_ABBR_GEN = [
  "янв.", "февр.", "мар.", "апр.", "мая", "июн.",
  "июл.", "авг.", "сент.", "окт.", "нояб.", "дек.",
];

// "YYYY-MM-DD" (+ optional ISO datetime `startTime`) -> "19 июл. 2026" or
// "19 июл. 2026, 15:34" (TASK_032 History list row). `startTime` is only
// ever present for Session.source === "timer" — manual entries pass
// undefined and get the date-only form; this function itself is agnostic
// to `source`, the caller decides what to pass. Time-of-day is read from
// local Date fields (not toLocaleTimeString) so the "HH:MM" shape doesn't
// depend on the runtime's default locale. Malformed `dateISO` is returned
// unchanged, same convention as formatDateDMY() above.
export function formatHistoryListDate(dateISO: string, startTime?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!m) return dateISO;
  const [, y, moStr, dStr] = m;
  const mo = Number(moStr);
  const d = Number(dStr);
  const datePart = `${d} ${MONTH_ABBR_GEN[mo - 1]} ${y}`;
  if (!startTime) return datePart;

  const t = new Date(startTime);
  if (Number.isNaN(t.getTime())) return datePart;
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  return `${datePart}, ${hh}:${mm}`;
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

// Renders a `calendarElapsed()` result as a compact Russian phrase using
// calendar years/months/days, e.g. "2 г. 2 мес. 3 дн." (TASK_025 follow-up —
// replaces the earlier full-word plural phrase, "2 года 2 месяца 3 дня", to
// keep the Home "Последние события" date+duration line from overflowing on
// narrow screens). Fixed abbreviations, no grammatical plural agreement
// (matches the compact convention the owner asked for) — single space
// between number and unit, single space between units. Zero-value units are
// omitted; today is "Сегодня"; future dates fall back to "" (caller decides
// whether to render anything) since this section is for past events only.
export function formatElapsedRu(elapsed: CalendarElapsed): string {
  if (elapsed.isToday) return "Сегодня";
  if (elapsed.isFuture) return "";

  const parts: string[] = [];
  if (elapsed.years > 0) parts.push(`${elapsed.years} г.`);
  if (elapsed.months > 0) parts.push(`${elapsed.months} мес.`);
  if (elapsed.days > 0 || parts.length === 0) parts.push(`${elapsed.days} дн.`);
  return parts.join(" ");
}

// Compact duration for the Profile hero card's event rows (TASK_042 §5/§6).
// Deliberately distinct from formatElapsedRu() above: no dots ("2 г 1 мес",
// not "2 г. 1 мес."), no day component (the card only ever shows years and
// months), and "менее 1 мес" instead of a "0 дн." fallback when nothing full
// has elapsed yet. Built on the same calendarElapsed() calendar-exact
// years/months — no separate elapsed-time math.
export function formatProfileEventElapsed(elapsed: CalendarElapsed): string {
  if (elapsed.years === 0 && elapsed.months === 0) return "менее 1 мес";

  const parts: string[] = [];
  if (elapsed.years > 0) parts.push(`${elapsed.years} г`);
  if (elapsed.months > 0) parts.push(`${elapsed.months} мес`);
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Home-scoped human date presentation (TASK_048)
//
// The Home screen's event cards previously rendered raw `formatDateDMY()`
// output ("20-08-2026"), which reads as a technical record rather than a
// human date. TASK_022's DD-MM-YYYY contract is deliberately NOT revoked —
// it remains canonical for forms, History, the timer, the Events timeline
// and Profile. The two functions below are the Home/upcoming-events
// presentation layer only.
// ---------------------------------------------------------------------------

// Genitive month names for "4 сентября" phrasing — the same grammatical case
// as MONTHS_GEN on the Home header (app/(tabs)/index.tsx), spelled out in
// full rather than MONTH_ABBR_GEN's History-list abbreviations.
const MONTHS_GEN_FULL = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

// "YYYY-MM-DD" -> "4 сентября", or "4 сентября 2026" when the year differs
// from `now`'s year (the only case where the year actually carries
// information on a screen that is always anchored to today). Malformed
// input is returned unchanged — same convention as formatDateDMY() above.
export function formatDateHuman(iso: string, now: Date = new Date()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, yStr, moStr, dStr] = m;
  const y = Number(yStr);
  const mo = Number(moStr);
  const d = Number(dStr);
  if (mo < 1 || mo > 12) return iso;
  const base = `${d} ${MONTHS_GEN_FULL[mo - 1]}`;
  return y === now.getFullYear() ? base : `${base} ${y}`;
}

// How soon an upcoming item is due. Drives color only — every variant also
// has a self-sufficient text label (see upcomingDateLabel), so the state is
// never communicated by color alone.
// TASK_049: "upcoming" (8-30 days) was split out of what used to be a single
// "later" bucket covering both 8-30 days and >30 days — the owner's color
// scale treats those two ranges differently (brand accent vs. neutral).
// TASK_052: the >30-day cutover that used to produce "later" for a real
// future date is gone — every future date beyond tomorrow is now "soon" or
// "upcoming" (see upcomingDateLabel below), however far out. "later" is
// only reachable via the malformed-input fallback now (kept for that
// defensive case, and so URGENCY_COLOR below stays a total function over
// this type).
export type UpcomingUrgency = "overdue" | "today" | "tomorrow" | "soon" | "upcoming" | "later";

export type UpcomingDateLabel = {
  // Always present, always human-readable on its own.
  primary: string;
  // Absolute calendar date, shown only when it adds context the relative
  // phrase doesn't already carry (null for today/tomorrow, and for far
  // dates where `primary` IS the calendar date).
  secondary: string | null;
  urgency: UpcomingUrgency;
  // TASK_050: the bare day count for a "Через N дней" primary (diff >= 2,
  // i.e. urgency "soon" or "upcoming" — TASK_052 removed the old 30-day
  // upper bound, so this now covers every future date beyond tomorrow,
  // however far out) — lets the renderer highlight just the number without
  // parsing it back out of `primary`. Null for every other row shape
  // (overdue/today/tomorrow/malformed input), where `primary` is not of
  // that form.
  days: number | null;
};

// Above this, "через N дней" is informational rather than urgent. Purely a
// coloring/urgency-tier signal now — TASK_052 removed the old 30-day cap
// that used to switch the primary label itself to a bare calendar date past
// this point; every future date beyond tomorrow gets "Через N дней" +
// the absolute date, no matter how far out.
const SOON_DAYS = 7;

// Human relative status for a Home event card. Calendar-day based (both
// dates normalized to local midnight via daysBetweenUTC), so it never drifts
// with the time of day or DST.
export function upcomingDateLabel(iso: string, now: Date = new Date()): UpcomingDateLabel {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const absolute = formatDateHuman(iso, now);
  if (!m) return { primary: absolute, secondary: null, urgency: "later", days: null };

  const [, yStr, moStr, dStr] = m;
  const target = new Date(Number(yStr), Number(moStr) - 1, Number(dStr));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = daysBetweenUTC(today, target);

  if (diff < 0) return { primary: "Просрочено", secondary: absolute, urgency: "overdue", days: null };
  if (diff === 0) return { primary: "Сегодня", secondary: null, urgency: "today", days: null };
  if (diff === 1) return { primary: "Завтра", secondary: null, urgency: "tomorrow", days: null };
  // TASK_052: no upper bound — every future date beyond tomorrow gets
  // "Через N дней" plus the absolute date, however far out (was capped at
  // 30 days before, past which `primary` fell back to a bare calendar
  // date with no relative phrase at all).
  return {
    primary: `Через ${diff} ${pluralDaysRu(diff)}`,
    secondary: absolute,
    urgency: diff <= SOON_DAYS ? "soon" : "upcoming",
    days: diff,
  };
}
