// Domain types for Ministry.
// Note: named HourRecord / MinistryEvent (not Record / Event as in ARCHITECTURE.md)
// to avoid shadowing the global TypeScript `Record` and DOM `Event` types.

export type Category =
  | "pioneer"
  | "appointment"
  | "move"
  | "school"
  | "personal"
  | "other";

export type HourRecord = {
  id: string;
  year: number; // calendar year
  month: number; // 1–12
  hours: number; // hours logged that month
  note: string; // optional note
};

export type MinistryEvent = {
  id: string;
  date: string; // ISO: "2026-06-28"
  title: string;
  category: Category;
};

export type Talk = {
  id: string;
  date: string; // ISO: "2026-06-28"
  number: number | null; // talk number (null = special talk)
  title: string;
  location: string; // place / congregation
};
