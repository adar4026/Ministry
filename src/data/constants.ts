import type { Category, HourRecord, MinistryEvent, Talk } from "@/types";

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
  card: "#ffffff",
  danger: "#dc2626",
  dangerBg: "#fee2e2",
  warn: "#f59e0b",
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

export type ServiceYearGroup = {
  sy: string;
  records: HourRecord[];
  total: number;
};

// Group hour records by service year, ascending by year label.
export function groupBySY(records: HourRecord[]): ServiceYearGroup[] {
  const map: Record<string, ServiceYearGroup> = {};
  records.forEach((r) => {
    const sy = svcYear(r.year, r.month);
    if (!map[sy]) map[sy] = { sy, records: [], total: 0 };
    map[sy].records.push(r);
    map[sy].total += r.hours;
  });
  return Object.values(map).sort((a, b) => a.sy.localeCompare(b.sy));
}

// Chronological sort helper for records within a group.
export function byYearMonth(a: HourRecord, b: HourRecord): number {
  return a.year !== b.year ? a.year - b.year : a.month - b.month;
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

// Hours recorded for the month containing `now` (0 if no record yet).
export function hoursForMonth(records: HourRecord[], now: Date = new Date()): number {
  const rec = records.find((r) => r.year === now.getFullYear() && r.month === now.getMonth() + 1);
  return rec?.hours ?? 0;
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
// hoursForMonth() — single source for the Today card.
export function monthProgress(records: HourRecord[], now: Date = new Date()): MonthProgress {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  const hoursDone = hoursForMonth(records, now);
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
