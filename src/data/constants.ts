import type { Category, CustomCategory, HourRecord, MinistryEvent, Session, Talk } from "@/types";
import type { Session as SessionType } from "@/types";

// sessionsForMonth() and monthTotal() live in ./stats (TASK_008 relocation —
// see that file's Aggregation Layer comment) so monthCellsForSY() can call
// the canonical primitive directly without a circular import. Imported here
// for local use (groupBySY, legacyEntryBlockReason, serviceYearAggregation,
// hoursForMonth below) and re-exported unchanged for every existing
// "@/data/constants" consumer.
import { monthTotal, parseISOYearMonth, sessionsForMonth } from "./stats";
import { serviceYearEndYear, serviceYearLabel } from "./serviceYear";

export {
  trailingPace,
  projectMonthEnd,
  projectServiceYearEnd,
  monthCellsForSY,
  monthTotal,
  sessionsForMonth,
} from "./stats";
export type { HistoryPeriod } from "./stats";
export {
  sessionsForYear,
  sessionsForDay,
  sumDurationMinutes,
  totalMinutesForPeriod,
  isCurrentMonth,
  isCurrentYear,
} from "./stats";

// Color palette (ported from the web prototype).
export const COLORS = {
  navy: "#0f2744",
  blue: "#1e3a5f",
  accent: "#3b82f6",
  light: "#f0f6ff",
  border: "#e2e8f0",
  muted: "#94a3b8",
  text: "#1e293b",
  bg: "#f8fafc",
  // Apple systemGroupedBackground (light). Home-screen only, for stronger
  // separation from the white cards; the shared `bg` above is untouched so
  // Hours/Events/Add/Profile keep their existing background.
  groupedBg: "#f2f2f7",
  card: "#ffffff",
  danger: "#dc2626",
  dangerBg: "#fee2e2",
  warn: "#f59e0b",
  green: "#22c55e",
  greenBg: "#dcfce7",
  teal: "#14b8a6",
  tealBg: "#ccfbf1",
  shadow: "#1e3a5f",
  onAccent: "#ffffff",
};

// Category metadata: label + badge background / text / timeline dot colors.
export const CAT: Record<
  Category,
  { label: string; bg: string; tx: string; dot: string }
> = {
  pioneer: { label: "Пионер", bg: "#dbeafe", tx: "#1e40af", dot: "#3b82f6" },
  appointment: { label: "Назначение", bg: "#dcfce7", tx: "#166534", dot: "#22c55e" },
  move: { label: "Переезд", bg: "#fef9c3", tx: "#854d0e", dot: "#eab308" },
  school: { label: "Школа", bg: "#ede9fe", tx: "#5b21b6", dot: "#8b5cf6" },
  personal: { label: "Личное", bg: "#fce7f3", tx: "#9d174d", dot: "#ec4899" },
  other: { label: "Событие", bg: "#f1f5f9", tx: "#475569", dot: "#94a3b8" },
};

export const CATEGORY_KEYS = Object.keys(CAT) as Category[];

// Single visual style for every user-created topic (TASK_045) — distinct
// from all six system categories and from TALK_CATEGORY's indigo, so a
// custom topic never reads as an existing built-in one.
const CUSTOM_CATEGORY_STYLE = { bg: "#cffafe", tx: "#155e75", dot: "#06b6d4" };

// Resolves an event's `category` (a system Category key OR a
// CustomCategory.id, TASK_045) to display metadata. Falls back to
// CAT.other for anything unresolved — the same fallback every existing
// caller (Badge, EventCard, the Events timeline) already used for any
// unrecognized category before this task.
export function categoryMeta(
  categoryId: string,
  customCategories: CustomCategory[] = [],
): { label: string; bg: string; tx: string; dot: string } {
  const system = (CAT as Record<string, (typeof CAT)[Category]>)[categoryId];
  if (system) return system;
  const custom = customCategories.find((c) => c.id === categoryId);
  if (custom) return { label: custom.name, ...CUSTOM_CATEGORY_STYLE };
  return CAT.other;
}

// Display metadata for public talks shown in the unified Events timeline.
// Talks keep their own collection (see StoreContext); this is UI-only styling
// and is deliberately NOT part of the MinistryEvent `Category` enum.
export const TALK_CATEGORY = { label: "Публичная речь", bg: "#e0e7ff", tx: "#3730a3", dot: "#6366f1" };

// Month names — short and full.
export const MN = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
export const MF = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

// Service year starts in September: Sep 2025 – Aug 2026 => "2025–2026".
// Delegates to src/data/serviceYear.ts, the single canonical source for the
// Sep..Aug boundary (TASK_038) — this function does not re-derive it.
export function svcYear(year: number, month: number): string {
  return serviceYearLabel(serviceYearEndYear(year, month));
}

export type LegacyEntryBlockReason = "current" | "future" | "session";

// Single shared predicate for the TASK_005B product rule (see
// docs/TASKS/TASK_005_ARCHITECTURE.md §10, resolved: "blocked, not
// warned"). The legacy HourRecord entry workflow (RecordForm) may not
// save for the current calendar month, any future month, or any past
// month that already has >=1 Session — those months are Session-
// authoritative or not yet reached, so a manual monthly total would
// either collide with real Session data or pre-empt it. Returns null when
// the month is a legitimate historical-backfill target. Every caller
// (add.tsx, hours.tsx, Home's index.tsx, all via RecordForm) must go
// through this one function — never re-implement the condition per screen.
export function legacyEntryBlockReason(
  sessions: Session[],
  year: number,
  month: number,
  now: Date = new Date(),
): LegacyEntryBlockReason | null {
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  if (year > nowYear || (year === nowYear && month > nowMonth)) return "future";
  if (year === nowYear && month === nowMonth) return "current";
  if (sessionsForMonth(sessions, year, month).length > 0) return "session";
  return null;
}

export const LEGACY_ENTRY_BLOCK_MESSAGE: Record<LegacyEntryBlockReason, string> = {
  current: "Текущий месяц нельзя записать здесь — используйте «Добавить время» или «Таймер» в разделе «Часы».",
  future: "Будущий месяц нельзя записать здесь — используйте «Добавить время» или «Таймер», когда время наступит.",
  session: "За этот месяц уже есть записи времени в разделе «Часы» → «История» — редактируйте их там.",
};

export type ServiceYearGroup = {
  sy: string;
  records: HourRecord[];
  total: number;
};

// Group hour records by service year, ascending by year label. `sessions`
// is optional and defaults to `[]`, so every existing call site (the Hours
// screen) keeps working unmodified and returns byte-identical results —
// `total` resolves through monthTotal() per §7–§8, which falls back to
// `r.hours` when no sessions are supplied.
export function groupBySY(records: HourRecord[], sessions: Session[] = []): ServiceYearGroup[] {
  const map: Record<string, ServiceYearGroup> = {};
  records.forEach((r) => {
    const sy = svcYear(r.year, r.month);
    if (!map[sy]) map[sy] = { sy, records: [], total: 0 };
    map[sy].records.push(r);
  });
  Object.values(map).forEach((g) => {
    g.total = g.records.reduce((sum, r) => sum + monthTotal(records, sessions, r.year, r.month), 0);
  });
  return Object.values(map).sort((a, b) => a.sy.localeCompare(b.sy));
}

// Chronological sort helper for records within a group.
export function byYearMonth(a: HourRecord, b: HourRecord): number {
  return a.year !== b.year ? a.year - b.year : a.month - b.month;
}

// Read-time presentation model for one visible month in a service year.
// Not a HourRecord, not a Session, never stored — produced only by
// serviceYearAggregation() below. See the "Home Service-Year ViewModel"
// addendum in docs/TASKS/TASK_005A.md.
export type ServiceYearMonth = {
  id: string; // deterministic UI identifier, "YYYY-MM"
  year: number;
  month: number;
  hours: number;
  source: "session" | "legacy";
};

export type ServiceYearAggregate = {
  sy: string;
  months: ServiceYearMonth[];
  total: number;
};

// Session-aware service-year aggregation for Home's "Текущий служебный год"
// card (TASK_005A addendum). Unlike groupBySY() — which enumerates only
// months that have a legacy HourRecord, by design, since the Hours screen's
// existing contract must not change — this enumerates the *union* of months
// present in either `records` or `sessions`, so a month tracked exclusively
// via Session still appears. Every month resolves through the single
// monthTotal() primitive; grouping semantics (by service year, ascending)
// match groupBySY() exactly.
export function serviceYearAggregation(records: HourRecord[], sessions: Session[]): ServiceYearAggregate[] {
  const monthKeys: { year: number; month: number }[] = [];
  const seen = new Set<string>();
  const addKey = (year: number, month: number) => {
    const key = `${year}-${month}`;
    if (!seen.has(key)) {
      seen.add(key);
      monthKeys.push({ year, month });
    }
  };
  records.forEach((r) => addKey(r.year, r.month));
  sessions.forEach((s) => {
    const p = parseISOYearMonth(s.date);
    addKey(p.year, p.month);
  });

  const map: Record<string, ServiceYearAggregate> = {};
  monthKeys.forEach(({ year, month }) => {
    const sy = svcYear(year, month);
    if (!map[sy]) map[sy] = { sy, months: [], total: 0 };
    const hours = monthTotal(records, sessions, year, month);
    const source: ServiceYearMonth["source"] = sessionsForMonth(sessions, year, month).length > 0 ? "session" : "legacy";
    map[sy].months.push({ id: `${year}-${String(month).padStart(2, "0")}`, year, month, hours, source });
    map[sy].total += hours;
  });

  Object.values(map).forEach((g) => g.months.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month)));
  return Object.values(map).sort((a, b) => a.sy.localeCompare(b.sy));
}

// Simple unique id for user-created entries.
export const uid = (): string =>
  "x" + Date.now() + Math.random().toString(36).slice(2, 5);

// The one canonical full-date display formatter lives in dateFormat.ts
// (TASK_022) — re-exported here so the many existing call sites that
// already `import { formatDateDMY } from "@/data/constants"` keep working
// unchanged. This used to be a second, independently-maintained
// implementation that (bug) rendered "DD/MM/YYYY" instead of the app-wide
// "DD-MM-YYYY" — removed in favor of the single canonical function.
export { formatDateDMY } from "./dateFormat";

// Monthly service goal in hours (TASK_002 Phase 1; shared with the Today card).
export const MONTHLY_GOAL = 50;

// Service-year goal in hours (TASK_037; owner-confirmed fixed value — the
// project has no per-user settings screen to source this from).
export const YEARLY_GOAL = 600;

// Hours recorded for the month containing `now` (0 if neither a Session nor
// a record exists yet). `sessions` is optional and defaults to `[]`, so
// existing call sites (Hours screen, Home's TodayCard) keep working
// unmodified and return byte-identical results — see monthTotal() above.
export function hoursForMonth(records: HourRecord[], now: Date = new Date(), sessions: Session[] = []): number {
  return monthTotal(records, sessions, now.getFullYear(), now.getMonth() + 1);
}

// "X ч Y м" formatting for possibly-fractional hour values ("2 ч 30 м";
// zero minutes are omitted: "50 ч").
export function formatHM(hours: number): string {
  let h = Math.floor(hours);
  let m = Math.round((hours - h) * 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  return m === 0 ? `${h} ч` : `${h} ч ${m} м`;
}

// "H:MM" clock-style duration for the History calendar/list (TASK_032) —
// independent of formatHM()'s "X ч Y м" text form, which other screens
// already depend on and which this does not replace. Minutes are always
// two digits ("1:05", not "1:5"); negative/NaN input is not a case any
// current caller (durationMinutes is always a non-negative integer) can
// produce, so it isn't guarded here.
export function formatClockDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

// Russian plural form selection (one/few/many) for a non-negative integer.
function pluralRu(n: number, [one, few, many]: [string, string, string]): string {
  const n100 = n % 100;
  const n10 = n100 % 10;
  if (n100 > 10 && n100 < 20) return many;
  if (n10 === 1) return one;
  if (n10 >= 2 && n10 <= 4) return few;
  return many;
}

// "N час/часа/часов" for the hours wheel (TASK_011).
export function formatHoursWord(n: number): string {
  return `${n} ${pluralRu(n, ["час", "часа", "часов"])}`;
}

// "N минута/минуты/минут" for the minutes wheel (TASK_011).
export function formatMinutesWord(n: number): string {
  return `${n} ${pluralRu(n, ["минута", "минуты", "минут"])}`;
}

// "N часов M минут" for the History "Итого" card total (TASK_033) — unlike
// formatHM()'s "X ч Y м", which omits a zero-minute remainder, this always
// renders both parts ("0 часов 0 минут", "46 часов 0 минут") to match the
// card's required always-both-units display. Built on formatHoursWord()/
// formatMinutesWord() above so the plural grammar isn't duplicated a third
// time; input is always a non-negative integer (durationMinutes sums), so
// no negative/NaN guard is needed here.
export function formatDurationRu(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${formatHoursWord(h)} ${formatMinutesWord(m)}`;
}

// Rounds a total-minutes duration to the nearest 5-minute step (the
// hour/minute wheel's only granularity — TASK_011). Standard round-half-up:
// remainder 0–2 rounds down, 3–4 rounds up; a remainder of 58 correctly
// rolls over into the next hour (58 -> 60). Used only for existing
// records whose stored duration isn't itself a multiple of 5 (e.g. a timer
// session, durationMinutes = ceil(bankedSeconds/60)) — new manual entries
// are always built from 5-minute wheel values already.
export function roundDurationToNearestFive(totalMinutes: number): number {
  return Math.round(totalMinutes / 5) * 5;
}

// "X ч Y м" for a fractional-hours duration, rounded to the nearest 5-minute
// increment for DISPLAY ONLY (TASK_014, Home month card) — reuses
// roundDurationToNearestFive() above so every duration shown in that card
// shares one rounding rule instead of a second ad hoc one. The caller's own
// stored/raw value (e.g. monthProgress()'s hoursDone/hoursRemaining/
// requiredPerDay) is never mutated — rounding happens only on the minutes
// total that goes straight into the returned string. Negative input clamps
// to 0 (defensive; no current caller produces a negative duration here).
export function formatHMRounded(hours: number): string {
  const totalMinutes = roundDurationToNearestFive(Math.round(Math.max(0, hours) * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} м`;
}

export type MonthProgress = {
  daysInMonth: number;
  daysLeft: number; // remaining days including today
  hoursDone: number;
  hoursRemaining: number; // to MONTHLY_GOAL, min 0
  requiredPerDay: number; // avg hours/day over the remaining days to hit the goal
  status: "ahead" | "on" | "behind";
};

// Derived state of the current month vs. the monthly goal, built on
// hoursForMonth() — single source for the Today card. `sessions` is
// optional and defaults to `[]` — see hoursForMonth() above.
export function monthProgress(records: HourRecord[], now: Date = new Date(), sessions: Session[] = []): MonthProgress {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  const hoursDone = hoursForMonth(records, now, sessions);
  const hoursRemaining = Math.max(0, MONTHLY_GOAL - hoursDone);
  const requiredPerDay = daysLeft > 0 ? hoursRemaining / daysLeft : hoursRemaining;

  // Expected pace by the start of today, with half a day's pace as tolerance.
  const dailyPace = MONTHLY_GOAL / daysInMonth;
  const expected = dailyPace * (now.getDate() - 1);
  const status =
    hoursDone >= expected + dailyPace / 2 ? "ahead" : hoursDone < expected - dailyPace / 2 ? "behind" : "on";

  return { daysInMonth, daysLeft, hoursDone, hoursRemaining, requiredPerDay, status };
}

// "YYYY-MM-DD" for a Date, in local time (no UTC shift).
export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Russian plural for days: 1 день / 2 дня / 5 дней.
export function dayWord(n: number): string {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return "день";
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return "дня";
  return "дней";
}

// Russian plural for months: 1 месяц / 2 месяца / 5 месяцев.
export function monthWord(n: number): string {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return "месяц";
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return "месяца";
  return "месяцев";
}

// `start` plus `n` whole calendar months, clamping the day-of-month to the
// target month's length (e.g. Jan 31 + 1 month = Feb 28/29, not a rollover
// into March) — mirrors dateFormat.ts's addMonthsClamped, kept local here
// since relativeDays doesn't need the years split that helper also does.
function addMonthsClamped(start: Date, n: number): Date {
  const firstOfTarget = new Date(start.getFullYear(), start.getMonth() + n, 1);
  const daysInTargetMonth = new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth() + 1, 0).getDate();
  const clampedDay = Math.min(start.getDate(), daysInTargetMonth);
  return new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth(), clampedDay);
}

// UTC-normalized whole-day difference between two calendar dates — avoids
// any DST/local-time-of-day skew in the millisecond subtraction. Exported
// for src/data/periodStats.ts's daysBetweenInclusive() (TASK_037), which
// needs the same UTC-safe technique plus 1 for an inclusive span length —
// kept as the single implementation instead of a second copy.
export function daysBetweenUTC(a: Date, b: Date): number {
  const aUTC = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUTC = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bUTC - aUTC) / 86400000);
}

// "Сегодня" / "Через N мес" / "Через N мес M д." / "Через M д." for a future
// ISO date, relative to now. Assumes dateISO is today or later. Calendar-based
// (TASK_020): finds the largest whole number of calendar months that, added
// to today (with end-of-month clamping), doesn't exceed the target date,
// then expresses the remainder as exact calendar days — not a division of
// the millisecond difference by an assumed 30-day month. This keeps e.g. an
// event on 04/09 from a 07/18 "today" as "2 мес 20 д." (2 full months to
// 04/07... 04/09, +20 days), not a rounded "2 мес"/"3 мес".
// Units are compact, undeclined abbreviations ("мес", "д.") rather than
// monthWord()/dayWord()'s full Russian plural forms (TASK_020A) — this
// compact style is specific to this list-row label; monthWord()/dayWord()
// keep full declension for their other, unrelated call sites (TodayCard,
// MonthSummaryCard, HoursHeroCard).
export function relativeDays(dateISO: string, now: Date = new Date()): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (target.getTime() <= today.getTime()) return "Сегодня";

  let months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
  while (addMonthsClamped(today, months).getTime() > target.getTime()) months -= 1;
  while (addMonthsClamped(today, months + 1).getTime() <= target.getTime()) months += 1;

  const monthAnchor = addMonthsClamped(today, months);
  const days = daysBetweenUTC(monthAnchor, target);

  const parts: string[] = [];
  if (months > 0) parts.push(`${months} мес`);
  if (days > 0 || months === 0) parts.push(`${days} д.`);
  return `Через ${parts.join(" ")}`;
}

// Display title for a Talk (shared with the Events timeline).
export function talkTitle(t: Talk): string {
  return t.title || (t.number ? `Речь №${t.number}` : "Специальная речь");
}

// TASK_056: each item now carries its full source record (`event`/`talk`),
// not just the flattened id/date/title — the unified card (EventListCard)
// needs the category (events) / location+number (talks) to render the dot,
// badge and metadata line, and the edit icon needs the whole record to open
// EventForm/TalkForm with `initial` set.
export type UpcomingItem =
  | { kind: "event"; id: string; date: string; title: string; event: MinistryEvent }
  | { kind: "talk"; id: string; date: string; title: string; talk: Talk };

// Combine events + talks into a single future-only, date-sorted list —
// the one shared selector for "upcoming" items (TASK_007, limit extended in
// TASK_019). UI-layer combination only — both collections stay separate in
// storage. `date` fields are date-only ISO strings ("YYYY-MM-DD"), so
// lexicographic comparison is chronological comparison — no Date parsing
// (and therefore no timezone-shift risk) is needed for the sort itself.
// `limit` is optional: omit it (or pass `undefined`) for the complete
// upcoming list (TASK_019's dedicated screen); pass a number (Home passes
// 3) to cap it. Ties on `date` break on `id` for a deterministic order that
// doesn't rely on Array.prototype.sort's stability guarantee.
export function upcomingItems(
  events: MinistryEvent[],
  talks: Talk[],
  now: Date = new Date(),
  limit?: number,
): UpcomingItem[] {
  const todayISO = toISODate(now);
  const items: UpcomingItem[] = [
    ...events
      .filter((e) => e.date >= todayISO)
      .map((e) => ({ kind: "event" as const, id: e.id, date: e.date, title: e.title, event: e })),
    ...talks
      .filter((t) => t.date >= todayISO)
      .map((t) => ({ kind: "talk" as const, id: t.id, date: t.date, title: talkTitle(t), talk: t })),
  ];
  const sorted = items.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return limit === undefined ? sorted : sorted.slice(0, limit);
}
