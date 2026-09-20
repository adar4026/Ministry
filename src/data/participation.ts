// TASK_073 — pure functions over ServiceParticipation[]. Everything here
// counts DISTINCT dates: the store already refuses to create a duplicate,
// but should storage ever hold two marks for one day (a restore, a bug), no
// counter may report two days of service.
import type { ServiceParticipation } from "@/types";

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODay(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = ISO_DAY.exec(value);
  if (!m) return false;
  const [, y, mo, d] = m.map(Number);
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

/** "YYYY-MM" prefix of an ISO day. */
export function monthKeyOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Distinct dates, sorted ascending. */
export function participationDates(items: ServiceParticipation[]): string[] {
  return Array.from(new Set(items.map((p) => p.date))).sort();
}

/** Distinct dates within a calendar month, sorted ascending. */
export function participationDatesForMonth(items: ServiceParticipation[], year: number, month: number): string[] {
  const key = monthKey(year, month);
  return participationDates(items).filter((d) => d.startsWith(key));
}

/** Number of distinct days of service in a calendar month. */
export function participationDaysInMonth(items: ServiceParticipation[], year: number, month: number): number {
  return participationDatesForMonth(items, year, month).length;
}

/** Day-of-month numbers marked in a calendar month (for calendar grids). */
export function participationDaySetForMonth(items: ServiceParticipation[], year: number, month: number): Set<number> {
  return new Set(participationDatesForMonth(items, year, month).map((d) => Number(d.slice(8, 10))));
}

export function hasParticipation(items: ServiceParticipation[], dateISO: string): boolean {
  return items.some((p) => p.date === dateISO);
}

export function participationForDate(items: ServiceParticipation[], dateISO: string): ServiceParticipation | undefined {
  return items.find((p) => p.date === dateISO);
}

/** Most recent distinct date, or undefined. */
export function lastParticipationDate(items: ServiceParticipation[]): string | undefined {
  const dates = participationDates(items);
  return dates[dates.length - 1];
}

export type ParticipationMonth = { key: string; year: number; month: number; days: number };

/** Months with at least one mark, newest first, with distinct-day counts. */
export function participationByMonth(items: ServiceParticipation[]): ParticipationMonth[] {
  const counts = new Map<string, number>();
  for (const d of participationDates(items)) {
    const k = monthKeyOf(d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, days]) => ({ key, year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)), days }));
}

/** Records of one month, newest date first, one per distinct date. */
export function participationForMonth(items: ServiceParticipation[], year: number, month: number): ServiceParticipation[] {
  const key = monthKey(year, month);
  const seen = new Set<string>();
  return [...items]
    .filter((p) => p.date.startsWith(key))
    .sort((a, b) => b.date.localeCompare(a.date) || a.createdAt.localeCompare(b.createdAt))
    .filter((p) => (seen.has(p.date) ? false : (seen.add(p.date), true)));
}

/** A date strictly after `todayISO` (lexicographic on ISO days is chronological). */
export function isFutureDate(dateISO: string, todayISO: string): boolean {
  return dateISO > todayISO;
}

// --- presentation helpers (Russian) -----------------------------------------

const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
// Prepositional case for "в сентябре".
const MONTHS_PREP = [
  "январе", "феврале", "марте", "апреле", "мае", "июне",
  "июле", "августе", "сентябре", "октябре", "ноябре", "декабре",
];

/** "в сентябре" for a 1–12 month. */
export function inMonthRu(month: number): string {
  return `в ${MONTHS_PREP[month - 1]}`;
}

/** "20 сентября" (+ " 2025" when the year differs from `todayISO`'s). */
export function formatDayShortRu(dateISO: string, todayISO?: string): string {
  const m = ISO_DAY.exec(dateISO);
  if (!m) return dateISO;
  const [, y, mo, d] = m;
  const base = `${Number(d)} ${MONTHS_GEN[Number(mo) - 1]}`;
  return todayISO && todayISO.slice(0, 4) !== y ? `${base} ${y}` : base;
}

/** "Сегодня, 20 сентября" / "Вчера, 19 сентября" / "17 сентября". */
export function formatDayLabelRu(dateISO: string, todayISO: string): string {
  const short = formatDayShortRu(dateISO, todayISO);
  if (dateISO === todayISO) return `Сегодня, ${short}`;
  const t = ISO_DAY.exec(todayISO);
  if (t) {
    const y = new Date(Number(t[1]), Number(t[2]) - 1, Number(t[3]) - 1);
    const p = (n: number) => String(n).padStart(2, "0");
    const yesterday = `${y.getFullYear()}-${p(y.getMonth() + 1)}-${p(y.getDate())}`;
    if (dateISO === yesterday) return `Вчера, ${short}`;
  }
  return short;
}

/** "сегодня" / "вчера" / "17 сентября" — for «Последний раз: …». */
export function formatRelativeDayRu(dateISO: string, todayISO: string): string {
  const label = formatDayLabelRu(dateISO, todayISO);
  if (label.startsWith("Сегодня")) return "сегодня";
  if (label.startsWith("Вчера")) return "вчера";
  return label;
}
