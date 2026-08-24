// Ministry backup format: build + validate + migrate (TASK_013, TASK_062,
// TASK_064). Pure, platform-independent — no AsyncStorage, no DOM. See
// docs/TASKS/TASK_064_BACKUP_SINGLE_JSON_FORMAT.md for the current spec.
//
// The format is recognised by the file's CONTENTS, never by its extension:
//   v2 — payload with a SHA-256 checksum and all six data collections. This
//        is what the app writes, always as `.json` (TASK_064). Files written
//        as `.mfb` by TASK_062 hold exactly this payload and still restore.
//   v1 — TASK_013 `.json`, four collections, no checksum. Read-only legacy:
//        still restored, never written again.
//
// Validation is deliberately field-level: every rejection names the entity,
// its position/id, the field and the reason. There is no catch-all
// "the file contains corrupted records" outcome — that message hid the real
// cause (see TASK_062 §1) and is gone.

import { checksumOf } from "./sha256";
import type {
  CustomCategory,
  HourRecord,
  MinistryEvent,
  ProfileEvent,
  Session,
  Talk,
  UserProfile,
} from "@/types";

export const BACKUP_FORMAT = "ministry-backup" as const;
export const BACKUP_VERSION = 2 as const;

/**
 * Backups are plain `.json` (TASK_064). The former `.mfb` gained nothing for
 * data integrity — the checksum lives inside the payload — while iOS showed
 * it as an unknown file with a question mark, which is what made owners
 * distrust their own copies.
 */
export const BACKUP_FILE_EXTENSION = ".json";
/**
 * The extension TASK_062 briefly wrote. Never produced again, still offered
 * in the file picker and still restored: those files carry a valid v2
 * payload, and format detection reads the contents, not the name.
 */
export const LEGACY_MFB_FILE_EXTENSION = ".mfb";

// Mirrors the literal in app/(tabs)/profile.tsx — no shared APP_VERSION
// constant exists in the codebase yet; introducing one is out of scope here.
export const APP_VERSION = "0.4.4";

export type MinistryBackupData = {
  records: HourRecord[];
  events: MinistryEvent[];
  talks: Talk[];
  sessions: Session[];
  // Present in v2 files only. A v1 file simply has no notion of these, which
  // is why restore leaves the device's own values alone rather than wiping
  // them — see src/data/backupImport.ts.
  customCategories?: CustomCategory[];
  profile?: UserProfile;
};

export type MinistryBackupCounts = {
  records: number;
  events: number;
  talks: number;
  sessions: number;
  customCategories: number;
};

export type MinistryBackup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  appVersion: string;
  createdAt: string;
  counts: MinistryBackupCounts;
  data: MinistryBackupData;
  /** SHA-256 of every other field, canonically serialized (see sha256.ts). */
  checksum: string;
};

/** Everything the checksum covers: the whole backup except the checksum itself. */
export type MinistryBackupPayload = Omit<MinistryBackup, "checksum">;

// Sanity ceilings — guard against corrupted/hostile payloads, not real usage.
const MAX_ITEMS_PER_CATEGORY = 50_000;
const MAX_JSON_LENGTH = 25 * 1024 * 1024; // 25 MB

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------

function payloadOf(
  data: MinistryBackupData,
  createdAt: string,
  appVersion: string,
): MinistryBackupPayload {
  // Optional collections are omitted entirely (not set to undefined) so the
  // canonical serialization — and therefore the checksum — is identical for
  // a backup written with and without them present as explicit `undefined`.
  const out: MinistryBackupData = {
    records: data.records,
    events: data.events,
    talks: data.talks,
    sessions: data.sessions,
  };
  if (data.customCategories) out.customCategories = data.customCategories;
  if (data.profile) out.profile = data.profile;

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    appVersion,
    createdAt,
    counts: {
      records: out.records.length,
      events: out.events.length,
      talks: out.talks.length,
      sessions: out.sessions.length,
      customCategories: out.customCategories?.length ?? 0,
    },
    data: out,
  };
}

/** Computes the checksum a backup payload must carry. */
export function computeChecksum(payload: MinistryBackupPayload): string {
  return checksumOf(payload);
}

export function buildBackup(
  data: MinistryBackupData,
  now: Date = new Date(),
  appVersion: string = APP_VERSION,
): MinistryBackup {
  const payload = payloadOf(data, now.toISOString(), appVersion);
  return { ...payload, checksum: computeChecksum(payload) };
}

function timestampPart(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(
    now.getMinutes(),
  )}`;
}

/**
 * The one backup file the app writes: `ministry-backup-YYYY-MM-DD-HHmm.json`.
 * There is no second "export" file any more (TASK_064) — the old export wrote
 * the same payload under a different name, which only made the owner guess
 * which of two identical things to keep.
 */
export function formatBackupFilename(now: Date = new Date()): string {
  return `ministry-backup-${timestampPart(now)}${BACKUP_FILE_EXTENSION}`;
}

// ---------------------------------------------------------------------------
// Validation primitives
// ---------------------------------------------------------------------------

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

/** `null` and `undefined` both mean "the optional value is simply absent". */
function isAbsent(v: unknown): boolean {
  return v === undefined || v === null;
}

// Values are echoed back in error text only for structural fields — dates,
// numbers, enum-like keys and ids. Never for `note` / `title` / `location`,
// which hold the owner's own words (TASK_013 §7 privacy rule).
function showValue(v: unknown): string {
  if (v === undefined) return "отсутствует";
  if (typeof v === "string") return `«${v.length > 40 ? `${v.slice(0, 40)}…` : v}»`;
  if (typeof v === "number" || typeof v === "boolean" || v === null) return String(v);
  if (Array.isArray(v)) return "список";
  return "объект";
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export type BackupEntity = "record" | "event" | "talk" | "session" | "customCategory" | "profile";

export type BackupIssue = {
  entity: BackupEntity;
  /** 0-based position in its collection; -1 for collection-level problems. */
  index: number;
  id?: string;
  field?: string;
  /** Lowercase clause, ready to embed after "Не удалось восстановить: ". */
  summary: string;
  /** The same clause as a standalone sentence, for list rendering. */
  message: string;
};

// Genitive ("у ...") subject for each entity, so a clause reads naturally.
const ENTITY_SUBJECT: Record<BackupEntity, string> = {
  record: "у записи часов",
  event: "у события",
  talk: "у записи речи",
  session: "у сессии",
  customCategory: "у темы событий",
  profile: "у профиля",
};

export const ENTITY_LABEL: Record<BackupEntity, string> = {
  record: "Записи часов",
  event: "События",
  talk: "Речи",
  session: "Сессии",
  customCategory: "Темы событий",
  profile: "Профиль",
};

function makeIssue(
  entity: BackupEntity,
  index: number,
  id: string | undefined,
  field: string | undefined,
  problem: string,
): BackupIssue {
  const position =
    index >= 0 ? ` №${index + 1}${isNonEmptyString(id) ? ` (id: ${id})` : ""}` : "";
  const summary = `${ENTITY_SUBJECT[entity]}${position} ${problem}`;
  return {
    entity,
    index,
    id: isNonEmptyString(id) ? id : undefined,
    field,
    summary,
    message: `${summary.charAt(0).toUpperCase()}${summary.slice(1)}.`,
  };
}

type FieldProblem = { field?: string; problem: string };
type ItemResult<T> = { ok: true; value: T } | { ok: false; problems: FieldProblem[] };

// Counts every place a legacy/absent optional value was brought to the shape
// the app stores. Reported to the user; never a silent change of meaning.
type Normalizer = { count: number; creditHours: number; customTopicEvents: number };

// ---------------------------------------------------------------------------
// Per-entity validation + migration
// ---------------------------------------------------------------------------

/**
 * Optional text field (`note`, `title`, `location`): a string is kept as is,
 * an absent value becomes "" (what every writer in the app stores), and any
 * other type is a hard error. "" is not invented information — it is the
 * app's own representation of "not filled in".
 */
function optionalText(
  x: Record<string, unknown>,
  field: string,
  label: string,
  out: Record<string, unknown>,
  problems: FieldProblem[],
  norm: Normalizer,
): void {
  const v = x[field];
  if (typeof v === "string") return;
  if (isAbsent(v)) {
    if (v !== undefined || !(field in x)) norm.count++;
    out[field] = "";
    return;
  }
  problems.push({ field, problem: `поле «${label}» должно быть текстом, а получено: ${showValue(v)}` });
}

function validateRecordItem(x: unknown, norm: Normalizer): ItemResult<HourRecord> {
  if (!isPlainObject(x)) return { ok: false, problems: [{ problem: "запись не является объектом" }] };
  const problems: FieldProblem[] = [];
  const out: Record<string, unknown> = { ...x };

  if (!isNonEmptyString(x.id)) {
    problems.push({ field: "id", problem: "отсутствует обязательный идентификатор (id)" });
  }
  if (!isFiniteNumber(x.year) || x.year < 1900 || x.year > 2200) {
    problems.push({ field: "year", problem: `поле «год» недопустимо: ${showValue(x.year)}` });
  }
  if (!isFiniteNumber(x.month) || x.month < 1 || x.month > 12) {
    problems.push({ field: "month", problem: `поле «месяц» недопустимо: ${showValue(x.month)}` });
  }
  if (!isFiniteNumber(x.hours) || x.hours < 0 || x.hours > 100_000) {
    problems.push({ field: "hours", problem: `поле «часы» недопустимо: ${showValue(x.hours)}` });
  }

  // TASK_039 legacy/optional field — kept verbatim when present and valid,
  // never dropped and never invented.
  if (isAbsent(x.creditHours)) {
    if (x.creditHours === null) norm.count++;
    delete out.creditHours;
  } else if (isFiniteNumber(x.creditHours) && x.creditHours >= 0) {
    norm.creditHours++;
  } else {
    problems.push({
      field: "creditHours",
      problem: `поле «зачётные часы» недопустимо: ${showValue(x.creditHours)}`,
    });
  }

  optionalText(x, "note", "заметка", out, problems, norm);

  if (problems.length) return { ok: false, problems };
  return { ok: true, value: out as unknown as HourRecord };
}

function validateEventItem(x: unknown, norm: Normalizer, systemCategories: readonly string[]): ItemResult<MinistryEvent> {
  if (!isPlainObject(x)) return { ok: false, problems: [{ problem: "запись не является объектом" }] };
  const problems: FieldProblem[] = [];
  const out: Record<string, unknown> = { ...x };

  if (!isNonEmptyString(x.id)) {
    problems.push({ field: "id", problem: "отсутствует обязательный идентификатор (id)" });
  }
  if (!isStrictCalendarDate(x.date)) {
    problems.push({
      field: "date",
      problem: isAbsent(x.date)
        ? "отсутствует обязательная дата"
        : `дата имеет неверный формат: ${showValue(x.date)} (ожидается ГГГГ-ММ-ДД)`,
    });
  }
  // TASK_045 widened MinistryEvent.category from the closed six-key union to
  // `string`, so a user-created topic can be referenced by its stable id.
  // The TASK_013 validator was never widened with it, which is what actually
  // blocked the owner's 22-08-2026 backup (7 events on custom topics) behind
  // the old catch-all "corrupted records" message.
  if (!isNonEmptyString(x.category)) {
    problems.push({ field: "category", problem: `поле «тема» пустое или неверного типа: ${showValue(x.category)}` });
  } else if (!systemCategories.includes(x.category)) {
    norm.customTopicEvents++;
  }

  optionalText(x, "title", "название", out, problems, norm);

  if (problems.length) return { ok: false, problems };
  return { ok: true, value: out as unknown as MinistryEvent };
}

function validateTalkItem(x: unknown, norm: Normalizer): ItemResult<Talk> {
  if (!isPlainObject(x)) return { ok: false, problems: [{ problem: "запись не является объектом" }] };
  const problems: FieldProblem[] = [];
  const out: Record<string, unknown> = { ...x };

  if (!isNonEmptyString(x.id)) {
    problems.push({ field: "id", problem: "отсутствует обязательный идентификатор (id)" });
  }
  if (!isStrictCalendarDate(x.date)) {
    problems.push({
      field: "date",
      problem: isAbsent(x.date)
        ? "отсутствует обязательная дата"
        : `дата имеет неверный формат: ${showValue(x.date)} (ожидается ГГГГ-ММ-ДД)`,
    });
  }

  // An empty talk number is a normal, supported state (a special talk has
  // no number). `null` is the app's own representation; a field that is
  // missing altogether means the same thing and becomes `null`. A value of
  // any other type is NOT guessed at — including a numeric string, which
  // would require deciding what the owner meant.
  if (isAbsent(x.number)) {
    if (x.number === undefined) norm.count++;
    out.number = null;
  } else if (!isFiniteNumber(x.number)) {
    problems.push({
      field: "number",
      problem: `поле «номер речи» должно быть числом или пустым (null), а получено: ${showValue(x.number)}`,
    });
  }

  optionalText(x, "title", "название", out, problems, norm);
  optionalText(x, "location", "место", out, problems, norm);

  if (problems.length) return { ok: false, problems };
  return { ok: true, value: out as unknown as Talk };
}

function validateSessionItem(x: unknown, norm: Normalizer): ItemResult<Session> {
  if (!isPlainObject(x)) return { ok: false, problems: [{ problem: "запись не является объектом" }] };
  const problems: FieldProblem[] = [];
  const out: Record<string, unknown> = { ...x };

  if (!isNonEmptyString(x.id)) {
    problems.push({ field: "id", problem: "отсутствует обязательный идентификатор (id)" });
  }
  if (!isStrictCalendarDate(x.date)) {
    problems.push({
      field: "date",
      problem: isAbsent(x.date)
        ? "отсутствует обязательная дата"
        : `дата имеет неверный формат: ${showValue(x.date)} (ожидается ГГГГ-ММ-ДД)`,
    });
  }
  if (x.source !== "manual" && x.source !== "timer") {
    problems.push({ field: "source", problem: `поле «источник» недопустимо: ${showValue(x.source)}` });
  }

  for (const field of ["startTime", "endTime"] as const) {
    const v = x[field];
    const label = field === "startTime" ? "время начала" : "время окончания";
    if (isAbsent(v)) {
      if (v === null) norm.count++;
      delete out[field];
    } else if (!isStrictISODateTime(v)) {
      problems.push({ field, problem: `поле «${label}» имеет неверный формат: ${showValue(v)}` });
    }
  }
  if (x.source === "timer" && (isAbsent(out.startTime) || isAbsent(out.endTime))) {
    problems.push({
      field: "startTime",
      problem: "сессия таймера обязана содержать время начала и окончания",
    });
  }

  if (!isFiniteNumber(x.durationMinutes) || x.durationMinutes <= 0 || x.durationMinutes > 100_000) {
    problems.push({
      field: "durationMinutes",
      problem: `поле «длительность в минутах» недопустимо: ${showValue(x.durationMinutes)}`,
    });
  }

  for (const field of ["createdAt", "updatedAt"] as const) {
    const label = field === "createdAt" ? "дата создания" : "дата изменения";
    if (!isStrictISODateTime(x[field])) {
      problems.push({
        field,
        problem: isAbsent(x[field])
          ? `отсутствует обязательное поле «${label}»`
          : `поле «${label}» имеет неверный формат: ${showValue(x[field])}`,
      });
    }
  }

  optionalText(x, "note", "заметка", out, problems, norm);

  if (problems.length) return { ok: false, problems };
  return { ok: true, value: out as unknown as Session };
}

function validateCustomCategoryItem(x: unknown): ItemResult<CustomCategory> {
  if (!isPlainObject(x)) return { ok: false, problems: [{ problem: "запись не является объектом" }] };
  const problems: FieldProblem[] = [];
  if (!isNonEmptyString(x.id)) {
    problems.push({ field: "id", problem: "отсутствует обязательный идентификатор (id)" });
  }
  if (!isNonEmptyString(x.name)) {
    problems.push({ field: "name", problem: `поле «название» пустое или неверного типа: ${showValue(x.name)}` });
  }
  if (problems.length) return { ok: false, problems };
  return { ok: true, value: { ...(x as object) } as unknown as CustomCategory };
}

function validateProfile(raw: unknown): { ok: true; value: UserProfile } | { ok: false; issues: BackupIssue[] } {
  if (!isPlainObject(raw)) {
    return { ok: false, issues: [makeIssue("profile", -1, undefined, undefined, "раздел не является объектом")] };
  }
  const issues: BackupIssue[] = [];
  const out: Record<string, unknown> = { ...raw };

  for (const field of ["displayName", "profilePhotoUri"] as const) {
    const v = raw[field];
    const label = field === "displayName" ? "имя" : "фотография";
    if (isAbsent(v)) delete out[field];
    else if (typeof v !== "string") {
      issues.push(makeIssue("profile", -1, undefined, field, `поле «${label}» должно быть текстом`));
    }
  }

  const rawEvents = raw.events;
  if (isAbsent(rawEvents)) {
    out.events = [];
  } else if (!Array.isArray(rawEvents)) {
    issues.push(makeIssue("profile", -1, undefined, "events", "раздел «памятные даты» не является списком"));
  } else {
    const events: ProfileEvent[] = [];
    rawEvents.forEach((e, i) => {
      if (!isPlainObject(e)) {
        issues.push(makeIssue("profile", i, undefined, "events", "памятная дата не является объектом"));
        return;
      }
      if (!isNonEmptyString(e.id)) {
        issues.push(makeIssue("profile", i, undefined, "id", "у памятной даты отсутствует идентификатор (id)"));
      }
      if (!isStrictCalendarDate(e.date)) {
        issues.push(
          makeIssue(
            "profile",
            i,
            isNonEmptyString(e.id) ? e.id : undefined,
            "date",
            isAbsent(e.date)
              ? "у памятной даты отсутствует обязательная дата"
              : `у памятной даты неверный формат даты: ${showValue(e.date)}`,
          ),
        );
      }
      if (typeof e.title !== "string" && !isAbsent(e.title)) {
        issues.push(makeIssue("profile", i, undefined, "title", "у памятной даты название должно быть текстом"));
      }
      events.push({ ...(e as object), title: typeof e.title === "string" ? e.title : "" } as ProfileEvent);
    });
    out.events = events;
  }

  if (issues.length) return { ok: false, issues };
  return { ok: true, value: out as unknown as UserProfile };
}

// ---------------------------------------------------------------------------
// Collection validation
// ---------------------------------------------------------------------------

// Cap on how many item problems are collected before giving up — enough to
// show the owner a real picture, bounded so a wholly foreign file doesn't
// build a 50 000-entry list.
const MAX_COLLECTED_ISSUES = 25;

type CollectionResult<T> = { ok: true; items: T[] } | { ok: false; issues: BackupIssue[] };

function validateCollection<T extends { id: string }>(
  raw: unknown,
  entity: BackupEntity,
  collectionLabel: string,
  validateItem: (x: unknown) => ItemResult<T>,
): CollectionResult<T> {
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      issues: [
        makeIssue(
          entity,
          -1,
          undefined,
          undefined,
          `раздел «${collectionLabel}» отсутствует в файле или не является списком`,
        ),
      ],
    };
  }
  if (raw.length > MAX_ITEMS_PER_CATEGORY) {
    return {
      ok: false,
      issues: [
        makeIssue(
          entity,
          -1,
          undefined,
          undefined,
          `раздел «${collectionLabel}» содержит слишком много записей (${raw.length}), файл считается повреждённым`,
        ),
      ],
    };
  }

  const issues: BackupIssue[] = [];
  const items: T[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i < raw.length; i++) {
    const source = isPlainObject(raw[i]) ? (raw[i] as Record<string, unknown>) : undefined;
    const id = isNonEmptyString(source?.id) ? (source!.id as string) : undefined;
    const result = validateItem(raw[i]);
    if (!result.ok) {
      for (const p of result.problems) {
        if (issues.length < MAX_COLLECTED_ISSUES) issues.push(makeIssue(entity, i, id, p.field, p.problem));
      }
      continue;
    }
    if (id !== undefined) {
      const first = seen.get(id);
      if (first !== undefined) {
        if (issues.length < MAX_COLLECTED_ISSUES) {
          issues.push(
            makeIssue(entity, i, id, "id", `идентификатор уже занят записью №${first + 1} — дубликаты недопустимы`),
          );
        }
        continue;
      }
      seen.set(id, i);
    }
    items.push(result.value);
  }

  if (issues.length) return { ok: false, issues };
  return { ok: true, items };
}

// ---------------------------------------------------------------------------
// Top-level validation
// ---------------------------------------------------------------------------

export const ERR_NOT_MINISTRY = "Это не резервная копия Ministry.";
export const ERR_BAD_JSON = "Файл не удалось прочитать: неверный JSON.";
export const ERR_CHECKSUM_MISMATCH =
  "Контрольная сумма не совпадает: файл мог быть изменён или повреждён.";
export const ERR_CHECKSUM_MISSING =
  "В резервной копии версии 2 нет контрольной суммы: файл повреждён или создан не приложением Ministry.";
export const ERR_TOO_LARGE = "Файл слишком большой для восстановления (более 25 МБ).";
export const ERR_NEWER_VERSION =
  "Эта резервная копия создана более новой версией приложения. Обновите Ministry перед восстановлением.";
export const RESTORE_ERROR_PREFIX = "Не удалось восстановить: ";

/** Human label per collection, for the declared-counts check below. */
const COUNT_LABEL: Record<"records" | "events" | "talks" | "sessions" | "customCategories", string> = {
  records: "записи часов",
  events: "события",
  talks: "речи",
  sessions: "сессии",
  customCategories: "темы событий",
};

export type BackupChecksumState = "verified" | "absent-legacy";

export type BackupValidationResult =
  | {
      ok: true;
      /** Always normalized to the current (v2) in-memory shape. */
      backup: MinistryBackup;
      /** Format version of the FILE as read: 1 = legacy `.json`, 2 = `.mfb`. */
      sourceVersion: 1 | 2;
      /** True when the file was written in an older format and was migrated. */
      migrated: boolean;
      checksum: BackupChecksumState;
      /** Non-blocking, human-readable notes about the file and the migration. */
      notes: string[];
    }
  | { ok: false; error: string; issues: BackupIssue[] };

function fail(error: string, issues: BackupIssue[] = []): BackupValidationResult {
  return { ok: false, error, issues };
}

function failWithIssues(issues: BackupIssue[]): BackupValidationResult {
  const headline = `${RESTORE_ERROR_PREFIX}${issues[0].summary}.`;
  const error = issues.length > 1 ? `${headline} Всего проблем: ${issues.length}.` : headline;
  return { ok: false, error, issues };
}

/**
 * Validates an already-parsed backup value (no JSON parsing here).
 *
 * `systemCategories` exists only so the count of "events on user-created
 * topics" in the notes is accurate; an unknown category id is never an error
 * (see validateEventItem).
 */
export function validateBackup(
  raw: unknown,
  systemCategories: readonly string[] = [],
): BackupValidationResult {
  if (!isPlainObject(raw) || raw.format !== BACKUP_FORMAT) return fail(ERR_NOT_MINISTRY);

  if (!isFiniteNumber(raw.version) || !Number.isInteger(raw.version) || raw.version < 1) {
    return fail(ERR_NOT_MINISTRY);
  }
  if (raw.version > BACKUP_VERSION) return fail(ERR_NEWER_VERSION);
  const sourceVersion = raw.version as 1 | 2;

  if (!isStrictISODateTime(raw.createdAt)) {
    return fail("Файл повреждён: дата создания копии отсутствует или имеет неверный формат.");
  }

  const notes: string[] = [];

  let appVersion: string;
  if (typeof raw.appVersion === "string") {
    appVersion = raw.appVersion;
  } else if (isAbsent(raw.appVersion)) {
    appVersion = "неизвестно";
    notes.push("В копии не указана версия приложения.");
  } else {
    return fail("Файл повреждён: версия приложения указана неверно.");
  }

  // Checksum is verified BEFORE the contents are inspected, so a tampered
  // file is reported as tampered rather than as a field-level problem.
  let checksum: BackupChecksumState;
  if (sourceVersion >= 2) {
    if (!isNonEmptyString(raw.checksum)) return fail(ERR_CHECKSUM_MISSING);
    const { checksum: _ignored, ...rest } = raw;
    if (checksumOf(rest).toLowerCase() !== raw.checksum.toLowerCase()) {
      return fail(ERR_CHECKSUM_MISMATCH);
    }
    checksum = "verified";
  } else {
    // Expected for v1 — never treated as damage.
    checksum = "absent-legacy";
    notes.push("Это копия старого формата (версия 1). Контрольной суммы в ней нет — это нормально.");
  }

  if (!isPlainObject(raw.data)) {
    return fail("Файл повреждён: в копии нет раздела с данными.");
  }
  const data = raw.data;

  const norm: Normalizer = { count: 0, creditHours: 0, customTopicEvents: 0 };

  const records = validateCollection<HourRecord>(data.records, "record", "записи часов", (x) =>
    validateRecordItem(x, norm),
  );
  if (!records.ok) return failWithIssues(records.issues);

  const events = validateCollection<MinistryEvent>(data.events, "event", "события", (x) =>
    validateEventItem(x, norm, systemCategories),
  );
  if (!events.ok) return failWithIssues(events.issues);

  const talks = validateCollection<Talk>(data.talks, "talk", "речи", (x) => validateTalkItem(x, norm));
  if (!talks.ok) return failWithIssues(talks.issues);

  const sessions = validateCollection<Session>(data.sessions, "session", "сессии", (x) =>
    validateSessionItem(x, norm),
  );
  if (!sessions.ok) return failWithIssues(sessions.issues);

  const migratedData: MinistryBackupData = {
    records: records.items,
    events: events.items,
    talks: talks.items,
    sessions: sessions.items,
  };

  if (!isAbsent(data.customCategories)) {
    const customCategories = validateCollection<CustomCategory>(
      data.customCategories,
      "customCategory",
      "темы событий",
      validateCustomCategoryItem,
    );
    if (!customCategories.ok) return failWithIssues(customCategories.issues);
    migratedData.customCategories = customCategories.items;
  }

  if (!isAbsent(data.profile)) {
    const profile = validateProfile(data.profile);
    if (!profile.ok) return failWithIssues(profile.issues);
    migratedData.profile = profile.value;
  }

  // The counts a v2 file declares must agree with what it actually carries —
  // otherwise "260 записей часов" in the preview would be a promise the file
  // never had to keep. The checksum already covers `counts`, so a hand edit is
  // caught earlier; this catches a file rebuilt with a recomputed sum.
  // A v1 file's counts were never verified (TASK_013), so a mismatch there is
  // a note rather than a refusal to restore the owner's data.
  const declared = isPlainObject(raw.counts) ? raw.counts : undefined;
  if (declared) {
    const actual = {
      records: migratedData.records.length,
      events: migratedData.events.length,
      talks: migratedData.talks.length,
      sessions: migratedData.sessions.length,
      customCategories: migratedData.customCategories?.length,
    };
    for (const key of ["records", "events", "talks", "sessions", "customCategories"] as const) {
      const value = declared[key];
      const real = actual[key];
      if (real === undefined || !isFiniteNumber(value) || value === real) continue;
      if (sourceVersion >= 2) {
        return fail(
          `Файл повреждён: в разделе «${COUNT_LABEL[key]}» указано ${value}, а фактически содержится ${real}.`,
        );
      }
      notes.push(
        `В копии указано «${COUNT_LABEL[key]}: ${value}», фактически ${real} — восстановлено будет фактическое количество.`,
      );
    }
  }

  if (migratedData.customCategories === undefined && migratedData.profile === undefined) {
    notes.push(
      "Темы событий и профиль в копию не входят — на этом устройстве они останутся без изменений.",
    );
  }
  if (norm.customTopicEvents > 0) {
    notes.push(`Событий с пользовательскими темами: ${norm.customTopicEvents}.`);
  }
  if (norm.creditHours > 0) {
    notes.push(`Записей с зачётными часами: ${norm.creditHours} — сохранены без изменений.`);
  }
  if (norm.count > 0) {
    notes.push(
      `Пустых необязательных полей приведено к текущему формату: ${norm.count}. Данные при этом не менялись.`,
    );
  }

  const payload = payloadOf(migratedData, raw.createdAt, appVersion);
  const backup: MinistryBackup = { ...payload, checksum: computeChecksum(payload) };

  return {
    ok: true,
    backup,
    sourceVersion,
    migrated: sourceVersion < BACKUP_VERSION,
    checksum,
    notes,
  };
}

/** Parses raw JSON text and validates it. Never throws. */
export function validateBackupJSON(
  json: string,
  systemCategories: readonly string[] = [],
): BackupValidationResult {
  if (json.length > MAX_JSON_LENGTH) return fail(ERR_TOO_LARGE);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return fail(ERR_BAD_JSON);
  }
  return validateBackup(parsed, systemCategories);
}
