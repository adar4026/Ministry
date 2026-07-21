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
  hours: number; // hours logged that month (may include creditHours below — never subtracted here)
  // Portion of `hours` that is a credit (e.g. pioneer school attendance),
  // not real field-service time — TASK_039. Optional/undefined means no
  // credit. Visible on the record (RecordForm, month detail, History's
  // legacy row) but excluded from every aggregated total
  // (resolveMonthTotal() in src/data/stats.ts is the single place that
  // subtracts it — no other consumer re-derives this).
  creditHours?: number;
  note: string; // optional note
};

// A user-defined memorable date on the Profile hero card (TASK_042) — no
// fixed "baptism"/"pioneer" fields; the user names and dates every entry
// themselves. Intentionally separate from MinistryEvent (timeline/Home) and
// Talk — this is profile-only data, never mixed with sessions/hours/timeline
// aggregation.
export type ProfileEvent = {
  id: string;
  title: string;
  date: string; // ISO: "2026-06-28"
};

// Profile hero card data (TASK_042). `events` holds at most 4 entries — the
// array order is the display order. Both `displayName` and
// `profilePhotoUri` are optional; an absent/empty profile renders as the
// card's empty state, not as pre-filled system fields.
export type UserProfile = {
  displayName?: string;
  profilePhotoUri?: string;
  events: ProfileEvent[];
};

// A user-defined event topic (TASK_045), created on-device to supplement the
// fixed system `Category` union below. Stable `id` (never the display text)
// is what MinistryEvent.category references for a user-created topic.
export type CustomCategory = {
  id: string;
  name: string;
};

export type MinistryEvent = {
  id: string;
  date: string; // ISO: "2026-06-28"
  title: string;
  // A system `Category` value, or a `CustomCategory.id` (TASK_045) — widened
  // from the closed `Category` union so user-created topics can be
  // referenced by their stable id without a migration of existing events
  // (whose values are still valid `Category` strings).
  category: string;
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
