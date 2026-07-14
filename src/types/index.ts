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

// A single dated time entry. Primary time-tracking entity going forward —
// see docs/TASKS/TASK_005_ARCHITECTURE.md. Kept intentionally minimal for
// TASK_005: no type/credit-hour classification yet.
export type Session = {
  id: string;
  date: string; // ISO day "YYYY-MM-DD" — the day the time was spent
  startTime?: string; // ISO datetime; required when source === "timer"
  endTime?: string; // ISO datetime; required when source === "timer"
  durationMinutes: number; // authoritative duration; always required
  note?: string;
  source: "manual" | "timer";
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
};

// Timer control state (crash-recovery, not a reporting entity).
// See docs/TASKS/TASK_005C.md §4-§8.
export type TimerStatus = "idle" | "running" | "paused";

export type TimerState = {
  status: TimerStatus;
  startedAt: string | null; // start of the CURRENT active segment
  firstStartedAt: string | null; // first Start of the outing (bookend)
  bankedSeconds: number; // active time banked across segments
};

// Recovery classifier outcomes (§7)
export type TimerRecoveryOutcome =
  | { kind: "idle" }
  | { kind: "paused"; state: TimerState }
  | { kind: "running"; state: TimerState }
  | { kind: "recovery-screen"; state: TimerState; elapsedSeconds: number; startedAt: Date }
  | { kind: "clock-rollback"; bankedSeconds: number; startedAt: Date };
