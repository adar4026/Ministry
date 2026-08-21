// TASK_059 — pure scheduling logic for event reminders.
//
// Platform-free by design: no Notification API, no service worker, no
// AsyncStorage. This module answers exactly one question — "given these
// events, these settings and this moment, which reminders should exist?" —
// and is the single source of truth for reminder ids, fire times and texts.
// Delivery lives in src/utils/localNotifications(.web).ts; persistence and
// orchestration live in src/store/StoreContext.tsx.
import type { MinistryEvent, NotificationSettings } from "@/types";

export type ReminderKind = "dayBefore" | "sameDay";

// A MinistryEvent carries a date but no time (see ARCHITECTURE.md), so the
// reminder schedule is fixed rather than derived per event: the evening
// before, and the morning of. Local wall-clock times — see reminderFireAt().
export const REMINDER_TIMES: Record<ReminderKind, { hour: number; minute: number }> = {
  dayBefore: { hour: 19, minute: 0 },
  sameDay: { hour: 9, minute: 0 },
};

// Day offset applied to the event's own date for each kind.
const DAY_OFFSET: Record<ReminderKind, number> = { dayBefore: -1, sameDay: 0 };

export const REMINDER_KINDS: ReminderKind[] = ["dayBefore", "sameDay"];

// Off by default: the app must not ask for the OS notification permission
// until the owner turns the master switch on themselves. The two per-kind
// switches default to on so that flipping the master switch alone already
// produces the documented default scheme.
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  dayBefore: true,
  sameDay: true,
};

// Notification copy (Russian) — TASK_059 §2. The app had no prior
// notification format to inherit, so this is the canonical one.
export const REMINDER_TITLES: Record<ReminderKind, string> = {
  dayBefore: "Завтра событие",
  sameDay: "Сегодня событие",
};

// Fallback for an event whose title is blank/whitespace-only. EventForm
// requires a title, so this only guards data restored from an older backup.
const UNTITLED = "Событие";

export function reminderTitle(kind: ReminderKind): string {
  return REMINDER_TITLES[kind];
}

export function reminderBody(eventTitle: string): string {
  const t = eventTitle.trim();
  return `«${t || UNTITLED}»`;
}

/** Deterministic reminder id — one event × one kind is always exactly one id. */
export function reminderId(eventId: string, kind: ReminderKind): string {
  return `${eventId}::${kind}`;
}

function parseISODate(dateISO: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO ?? "");
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  // Reject calendar-impossible dates ("2026-02-31") — Date would silently
  // roll them over into the next month.
  const probe = new Date(y, m - 1, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) return null;
  return { y, m, d };
}

/**
 * When a reminder of `kind` for an event dated `dateISO` should fire, in the
 * device's own timezone. Returns null for a malformed/impossible date.
 *
 * Built with the LOCAL Date constructor rather than UTC arithmetic on
 * purpose: 19:00 and 09:00 are wall-clock times, so a DST change must not
 * shift them, and `d - 1` must roll back across month/year boundaries using
 * the local calendar. Neither 09:00 nor 19:00 falls inside any real-world
 * DST gap, so no reminder time is unrepresentable.
 */
export function reminderFireAt(dateISO: string, kind: ReminderKind): Date | null {
  const parts = parseISODate(dateISO);
  if (!parts) return null;
  const { hour, minute } = REMINDER_TIMES[kind];
  return new Date(parts.y, parts.m - 1, parts.d + DAY_OFFSET[kind], hour, minute, 0, 0);
}

export type ScheduledReminder = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  kind: ReminderKind;
  /** Notification title, e.g. "Завтра событие". */
  title: string;
  /** Notification body, e.g. «Конгресс». */
  body: string;
  /** Epoch milliseconds. */
  fireAt: number;
};

function enabledKinds(settings: NotificationSettings): ReminderKind[] {
  if (!settings.enabled) return [];
  return REMINDER_KINDS.filter((k) => settings[k]);
}

/**
 * The complete set of reminders that should be scheduled right now.
 *
 * Only STRICTLY future reminders are returned: a past event, and a slot that
 * has already come and gone today, are both excluded (`fireAt > now`). The
 * catch-up delivery of a slot that fell due while the app was closed is the
 * service worker's job (it keeps its own delivered-flags) — deliberately not
 * this function's, which stays a pure "what should be pending" answer.
 */
export function planReminders(
  events: MinistryEvent[],
  settings: NotificationSettings,
  now: Date = new Date(),
): ScheduledReminder[] {
  const kinds = enabledKinds(settings);
  if (kinds.length === 0) return [];

  const nowMs = now.getTime();
  const byId = new Map<string, ScheduledReminder>();

  for (const event of events) {
    for (const kind of kinds) {
      const fireAt = reminderFireAt(event.date, kind);
      if (!fireAt) continue;
      if (fireAt.getTime() <= nowMs) continue;

      const id = reminderId(event.id, kind);
      // First one wins — defensive against duplicate event ids in storage;
      // the deterministic id means a re-plan can never add a second copy.
      if (byId.has(id)) continue;

      byId.set(id, {
        id,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        kind,
        title: reminderTitle(kind),
        body: reminderBody(event.title),
        fireAt: fireAt.getTime(),
      });
    }
  }

  return [...byId.values()].sort((a, b) => a.fireAt - b.fireAt || a.id.localeCompare(b.id));
}

export type ReminderDiff = {
  /** Reminders to schedule (new, or changed and therefore re-scheduled). */
  add: ScheduledReminder[];
  /** Ids to cancel (gone, or changed and therefore replaced). */
  remove: string[];
  /** Present in both and byte-identical — left alone. */
  unchanged: ScheduledReminder[];
};

function sameReminder(a: ScheduledReminder, b: ScheduledReminder): boolean {
  return a.fireAt === b.fireAt && a.title === b.title && a.body === b.body;
}

/**
 * What has to change to get from `current` to `next`.
 *
 * "Cancel the old ones and create new ones" on an edit is a consequence of
 * this diff, not a separate code path: editing a date moves `fireAt`, editing
 * a title changes `body`, and either puts the reminder in `remove` AND `add`.
 */
export function diffReminders(current: ScheduledReminder[], next: ScheduledReminder[]): ReminderDiff {
  const currentById = new Map(current.map((r) => [r.id, r]));
  const nextById = new Map(next.map((r) => [r.id, r]));

  const add: ScheduledReminder[] = [];
  const unchanged: ScheduledReminder[] = [];
  for (const r of next) {
    const existing = currentById.get(r.id);
    if (existing && sameReminder(existing, r)) unchanged.push(r);
    else add.push(r);
  }

  const remove: string[] = [];
  for (const r of current) {
    const replacement = nextById.get(r.id);
    if (!replacement || !sameReminder(r, replacement)) remove.push(r.id);
  }

  return { add, remove, unchanged };
}
