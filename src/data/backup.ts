// Ministry backup format: build + validate (TASK_013).
// Pure, platform-independent — no AsyncStorage, no DOM. See
// docs/TASKS/TASK_013_BACKUP_EXPORT_IMPORT.md for the full spec.

import { CATEGORY_KEYS } from "./constants";
import type { HourRecord, MinistryEvent, Session, Talk } from "@/types";

export const BACKUP_FORMAT = "ministry-backup" as const;
export const BACKUP_VERSION = 1 as const;

// Mirrors the literal in app/(tabs)/profile.tsx — no shared APP_VERSION
// constant exists in the codebase yet; introducing one is out of scope here.
export const APP_VERSION = "0.4.4";

export type MinistryBackupData = {
  records: HourRecord[];
  events: MinistryEvent[];
  talks: Talk[];
  sessions: Session[];
};

export type MinistryBackupCounts = {
  records: number;
  events: number;
  talks: number;
  sessions: number;
};

export type MinistryBackup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  appVersion: string;
  data: MinistryBackupData;
  counts: MinistryBackupCounts;
};

// Sanity ceilings — guard against corrupted/hostile payloads, not real usage.
const MAX_ITEMS_PER_CATEGORY = 50_000;
const MAX_JSON_LENGTH = 25 * 1024 * 1024; // 25 MB

export function buildBackup(
  data: MinistryBackupData,
  now: Date = new Date(),
  appVersion: string = APP_VERSION,
): MinistryBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: now.toISOString(),
    appVersion,
    data: {
      records: data.records,
      events: data.events,
      talks: data.talks,
      sessions: data.sessions,
    },
    counts: {
      records: data.records.length,
      events: data.events.length,
      talks: data.talks.length,
      sessions: data.sessions.length,
    },
  };
}

export function formatBackupFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const mo = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const h = pad(now.getHours());
  const mi = pad(now.getMinutes());
  return `ministry-backup-${y}-${mo}-${d}-${h}${mi}.json`;
}

export type BackupValidationResult =
  | { ok: true; backup: MinistryBackup }
  | { ok: false; error: string };

const GENERIC_FORMAT_ERROR = "Файл повреждён или не является резервной копией Ministry.";
const CORRUPT_RECORDS_ERROR = "Файл содержит повреждённые записи и не может быть импортирован.";

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

// Strict calendar-date validator for date-ONLY fields (event/talk/session
// `date`) — accepts exactly "YYYY-MM-DD" and rejects anything else `Date`
// would otherwise parse leniently (e.g. "July 10, 2026", "2026-7-10",
// datetimes with a "T", or impossible calendar dates like "2026-02-30").
function isStrictCalendarDate(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return false;
  // Date.UTC(year, month, 0) — passing the 1-based `month` as the 0-based
  // index of the *next* month, day 0, yields the last real day of `month`
  // (correctly accounting for leap years).
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

// Strict ISO-8601 datetime validator for timestamp fields (session
// startTime/endTime/createdAt/updatedAt, backup createdAt) — requires the
// canonical `toISOString()` shape, not just anything `Date` can parse.
function isStrictISODateTime(s: unknown): s is string {
  if (typeof s !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

function isNonEmptyString(s: unknown): s is string {
  return typeof s === "string" && s.length > 0;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function validateRecord(x: unknown): x is HourRecord {
  if (!isPlainObject(x)) return false;
  if (!isNonEmptyString(x.id)) return false;
  if (!isFiniteNumber(x.year) || x.year < 1900 || x.year > 2200) return false;
  if (!isFiniteNumber(x.month) || x.month < 1 || x.month > 12) return false;
  if (!isFiniteNumber(x.hours) || x.hours < 0 || x.hours > 100000) return false;
  // TASK_039 — optional; a backup written before this field existed simply
  // omits it, which is valid (undefined = no credit).
  if (x.creditHours !== undefined && (!isFiniteNumber(x.creditHours) || x.creditHours < 0)) return false;
  if (x.note !== undefined && typeof x.note !== "string") return false;
  return true;
}

function validateEvent(x: unknown): x is MinistryEvent {
  if (!isPlainObject(x)) return false;
  if (!isNonEmptyString(x.id)) return false;
  if (!isStrictCalendarDate(x.date)) return false;
  if (typeof x.title !== "string") return false;
  if (!CATEGORY_KEYS.includes(x.category as never)) return false;
  return true;
}

function validateTalk(x: unknown): x is Talk {
  if (!isPlainObject(x)) return false;
  if (!isNonEmptyString(x.id)) return false;
  if (!isStrictCalendarDate(x.date)) return false;
  if (x.number !== null && !isFiniteNumber(x.number)) return false;
  if (typeof x.title !== "string") return false;
  if (typeof x.location !== "string") return false;
  return true;
}

function validateSession(x: unknown): x is Session {
  if (!isPlainObject(x)) return false;
  if (!isNonEmptyString(x.id)) return false;
  if (!isStrictCalendarDate(x.date)) return false;
  if (x.source !== "manual" && x.source !== "timer") return false;
  if (x.startTime !== undefined && !isStrictISODateTime(x.startTime)) return false;
  if (x.endTime !== undefined && !isStrictISODateTime(x.endTime)) return false;
  if (x.source === "timer" && (x.startTime === undefined || x.endTime === undefined)) return false;
  if (!isFiniteNumber(x.durationMinutes) || x.durationMinutes <= 0 || x.durationMinutes > 100_000) return false;
  if (x.note !== undefined && typeof x.note !== "string") return false;
  if (!isStrictISODateTime(x.createdAt)) return false;
  if (!isStrictISODateTime(x.updatedAt)) return false;
  return true;
}

function hasDuplicateIds(items: { id: string }[]): boolean {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) return true;
    seen.add(item.id);
  }
  return false;
}

function validateCategory<T extends { id: string }>(
  raw: unknown,
  validateItem: (x: unknown) => x is T,
): T[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length > MAX_ITEMS_PER_CATEGORY) return null;
  const items: T[] = [];
  for (const item of raw) {
    if (!validateItem(item)) return null;
    items.push(item);
  }
  if (hasDuplicateIds(items)) return null;
  return items;
}

/** Validates an already-parsed backup value (no JSON parsing here). */
export function validateBackup(raw: unknown): BackupValidationResult {
  if (!isPlainObject(raw)) return { ok: false, error: GENERIC_FORMAT_ERROR };
  if (raw.format !== BACKUP_FORMAT) return { ok: false, error: GENERIC_FORMAT_ERROR };

  if (!isFiniteNumber(raw.version) || !Number.isInteger(raw.version) || raw.version < 1) {
    return { ok: false, error: GENERIC_FORMAT_ERROR };
  }
  if (raw.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: "Эта резервная копия создана более новой версией приложения. Обновите Ministry перед импортом.",
    };
  }

  if (!isStrictISODateTime(raw.createdAt)) return { ok: false, error: GENERIC_FORMAT_ERROR };
  if (typeof raw.appVersion !== "string") return { ok: false, error: GENERIC_FORMAT_ERROR };
  if (!isPlainObject(raw.data)) return { ok: false, error: GENERIC_FORMAT_ERROR };

  const records = validateCategory(raw.data.records, validateRecord);
  const events = validateCategory(raw.data.events, validateEvent);
  const talks = validateCategory(raw.data.talks, validateTalk);
  const sessions = validateCategory(raw.data.sessions, validateSession);

  if (!records || !events || !talks || !sessions) {
    return { ok: false, error: CORRUPT_RECORDS_ERROR };
  }

  const backup: MinistryBackup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: raw.createdAt,
    appVersion: raw.appVersion,
    data: { records, events, talks, sessions },
    counts: {
      records: records.length,
      events: events.length,
      talks: talks.length,
      sessions: sessions.length,
    },
  };
  return { ok: true, backup };
}

/** Parses raw JSON text and validates it. Never throws. */
export function validateBackupJSON(json: string): BackupValidationResult {
  if (json.length > MAX_JSON_LENGTH) {
    return { ok: false, error: "Файл слишком большой для импорта." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "Не удалось прочитать файл: он повреждён или не является текстом JSON." };
  }
  return validateBackup(parsed);
}
