// Exact calendar-based elapsed/remaining time for an event date, used by the
// "События" screen's event and talk cards (TASK_045). Deliberately
// independent from src/data/dateFormat.ts's calendarElapsed()/
// formatElapsedRu(): that pair is past-only by design (a future date
// collapses to zeros) and existing callers (dashboard EventCard,
// ProfileHeroCard's formatProfileEventElapsed) depend on exactly that
// collapsing behavior — see dateFormat.test.ts's "future dates are handled
// safely" case. This module computes a real calendar difference in both
// directions instead, so it does not reuse or modify that pair.

export type EventElapsed = {
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
// into March).
function addMonthsClamped(start: Date, n: number): Date {
  const firstOfTarget = new Date(start.getFullYear(), start.getMonth() + n, 1);
  const clampedDay = Math.min(start.getDate(), daysInMonth(firstOfTarget.getFullYear(), firstOfTarget.getMonth()));
  return new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth(), clampedDay);
}

// UTC-normalized whole-day difference — avoids any DST/local-time-of-day
// skew in the millisecond subtraction.
function daysBetweenUTC(a: Date, b: Date): number {
  const aUTC = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUTC = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bUTC - aUTC) / 86400000);
}

// Largest whole number of calendar months that, added to `from` (with
// end-of-month clamping), does not exceed `to`; the remainder in days is
// then an exact day-count between two real calendar dates — not a division
// of elapsed milliseconds by fixed-length units. Handles variable month
// lengths and leap years by construction. `to` must be >= `from`.
function calendarDiff(from: Date, to: Date): { years: number; months: number; days: number } {
  let totalMonths = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  while (addMonthsClamped(from, totalMonths).getTime() > to.getTime()) totalMonths -= 1;
  while (addMonthsClamped(from, totalMonths + 1).getTime() <= to.getTime()) totalMonths += 1;

  const anchor = addMonthsClamped(from, totalMonths);
  const days = daysBetweenUTC(anchor, to);
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12, days };
}

// True calendar difference between `iso` (a "YYYY-MM-DD" day) and `now`,
// symmetric for past and future dates — unlike dateFormat.ts's
// calendarElapsed(), whose future branch is a stub (see module comment
// above). Time-of-day on either date never affects the result: both dates
// are normalized to local calendar days before comparing.
export function eventElapsed(iso: string, now: Date = new Date()): EventElapsed {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return { years: 0, months: 0, days: 0, isFuture: false, isToday: false };
  const [, yStr, moStr, dStr] = m;
  const target = new Date(Number(yStr), Number(moStr) - 1, Number(dStr));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (target.getTime() === today.getTime()) {
    return { years: 0, months: 0, days: 0, isFuture: false, isToday: true };
  }

  const isFuture = target.getTime() > today.getTime();
  const diff = isFuture ? calendarDiff(today, target) : calendarDiff(target, today);
  return { ...diff, isFuture, isToday: false };
}

// Renders an eventElapsed() result as "Сегодня" / "прошло …" / "через …",
// with calendar years/months/days abbreviated ("2 г. 2 мес. 3 дн.") — zero
// parts omitted, matching the compact style already used elsewhere in the
// app (dateFormat.ts's formatElapsedRu).
export function formatEventElapsed(elapsed: EventElapsed): string {
  if (elapsed.isToday) return "Сегодня";

  const parts: string[] = [];
  if (elapsed.years > 0) parts.push(`${elapsed.years} г.`);
  if (elapsed.months > 0) parts.push(`${elapsed.months} мес.`);
  if (elapsed.days > 0 || parts.length === 0) parts.push(`${elapsed.days} дн.`);

  const prefix = elapsed.isFuture ? "через" : "прошло";
  return `${prefix} ${parts.join(" ")}`;
}
