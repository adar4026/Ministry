import type { Category, HourRecord } from "@/types";

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
