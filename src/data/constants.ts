import type { Category, HourRecord, MinistryEvent, Session, Talk } from "@/types";

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
export function svcYear(year: number, month: number): string {
  return month >= 9 ? `${year}–${year + 1}` : `${year - 1}–${year}`;
}

// ---------------------------------------------------------------------------
// Aggregation Layer (TASK_005A) — the single source for resolving how many
// hours were spent in a given month across the two time-tracking sources:
// legacy monthly HourRecord totals, and granular Session entries. See
// docs/TASKS/TASK_005_ARCHITECTURE.md §7–§8 for the authoritative rule this
// implements: if any Session exists for a month, Sessions are authoritative
// for that month; otherwise the legacy HourRecord is used. The two sources
// are never merged or combined for the same month.
// ---------------------------------------------------------------------------

// "YYYY-MM-DD" -> { year, month }. Local parse, no Date/timezone involved.
function parseISOYearMonth(iso: string): { year: number; month: number } {
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

// The authoritative hour total for one month: Session.sum() if at least one
// Session exists for that month, otherwise the legacy HourRecord's hours (or
// 0 if neither exists). This is the single primitive every other aggregation
// function in this layer is built on — never duplicate this resolution logic
// elsewhere.
export function monthTotal(records: HourRecord[], sessions: Session[], year: number, month: number): number {
  const monthSessions = sessionsForMonth(sessions, year, month);
  if (monthSessions.length > 0) {
    return monthSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;
  }
  return records.find((r) => r.year === year && r.month === month)?.hours ?? 0;
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

// Time elapsed since an ISO date ("YYYY-MM-DD"), relative to now.
// "Сегодня" for today, "X мес." under a year, "X лет Y мес." from a year on.
export function timeElapsed(isoDate: string, now: Date = new Date()): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const event = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (event.getTime() === today.getTime()) return "Сегодня";

  let months = (today.getFullYear() - event.getFullYear()) * 12 + (today.getMonth() - event.getMonth());
  if (today.getDate() < event.getDate()) months -= 1;
  months = Math.max(0, months);

  if (months < 12) return `${months} мес.`;

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return `${years} лет ${remMonths} мес.`;
}

// Display-only: "YYYY-MM-DD" -> "DD/MM/YYYY". Stored dates stay ISO.
export function formatDateDMY(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

// Monthly service goal in hours (TASK_002 Phase 1; shared with the Today card).
export const MONTHLY_GOAL = 50;

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

// "Сегодня" / "Завтра" / "Через N дней" / "Через N месяцев" for a future
// ISO date, relative to now. Assumes dateISO is today or later.
export function relativeDays(dateISO: string, now: Date = new Date()): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays <= 0) return "Сегодня";
  if (diffDays === 1) return "Завтра";
  if (diffDays < 30) return `Через ${diffDays} ${dayWord(diffDays)}`;
  const months = Math.round(diffDays / 30);
  return `Через ${months} ${monthWord(months)}`;
}

// Display title for a Talk (shared with the Events timeline).
export function talkTitle(t: Talk): string {
  return t.title || (t.number ? `Речь №${t.number}` : "Специальная речь");
}

export type UpcomingItem = { kind: "event" | "talk"; id: string; date: string; title: string };

// Combine events + talks into a single future-only, date-sorted list.
// UI-layer combination only — both collections stay separate in storage.
export function upcomingItems(
  events: MinistryEvent[],
  talks: Talk[],
  now: Date = new Date(),
  limit = 3,
): UpcomingItem[] {
  const todayISO = toISODate(now);
  const items: UpcomingItem[] = [
    ...events.filter((e) => e.date >= todayISO).map((e) => ({ kind: "event" as const, id: e.id, date: e.date, title: e.title })),
    ...talks.filter((t) => t.date >= todayISO).map((t) => ({ kind: "talk" as const, id: t.id, date: t.date, title: talkTitle(t) })),
  ];
  return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}
