import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  buildBackup,
  formatBackupFilename,
  validateBackup,
  validateBackupJSON,
  type MinistryBackupData,
} from "@/data/backup";
import type { HourRecord, MinistryEvent, Session, Talk } from "@/types";

const RECORD: HourRecord = { id: "r1", year: 2026, month: 6, hours: 12, note: "" };
const EVENT: MinistryEvent = { id: "e1", date: "2026-06-01", title: "Test event", category: "personal" };
const TALK: Talk = { id: "t1", date: "2026-06-02", number: 3, title: "Talk", location: "Hall" };
const SESSION: Session = {
  id: "s1",
  date: "2026-06-03",
  durationMinutes: 90,
  note: "",
  source: "manual",
  createdAt: "2026-06-03T10:00:00.000Z",
  updatedAt: "2026-06-03T10:00:00.000Z",
};

const FULL_DATA: MinistryBackupData = {
  records: [RECORD],
  events: [EVENT],
  talks: [TALK],
  sessions: [SESSION],
};

const EMPTY_DATA: MinistryBackupData = { records: [], events: [], talks: [], sessions: [] };

describe("buildBackup", () => {
  it("includes every supported category with correct contents", () => {
    const backup = buildBackup(FULL_DATA, new Date("2026-07-17T12:00:00.000Z"));
    expect(backup.data.records).toEqual([RECORD]);
    expect(backup.data.events).toEqual([EVENT]);
    expect(backup.data.talks).toEqual([TALK]);
    expect(backup.data.sessions).toEqual([SESSION]);
  });

  it("does not include any unrelated keys (only format/version/createdAt/appVersion/data/counts)", () => {
    const backup = buildBackup(FULL_DATA);
    expect(Object.keys(backup).sort()).toEqual(["appVersion", "counts", "createdAt", "data", "format", "version"]);
  });

  it("stamps correct metadata and counts", () => {
    const backup = buildBackup(FULL_DATA, new Date("2026-07-17T12:00:00.000Z"), "0.4.4");
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.createdAt).toBe("2026-07-17T12:00:00.000Z");
    expect(backup.appVersion).toBe("0.4.4");
    expect(backup.counts).toEqual({ records: 1, events: 1, talks: 1, sessions: 1 });
  });

  it("supports an empty but valid dataset", () => {
    const backup = buildBackup(EMPTY_DATA);
    expect(backup.counts).toEqual({ records: 0, events: 0, talks: 0, sessions: 0 });
    expect(validateBackup(backup)).toEqual({ ok: true, backup });
  });
});

describe("formatBackupFilename", () => {
  it("formats as ministry-backup-YYYY-MM-DD-HHmm.json", () => {
    expect(formatBackupFilename(new Date(2026, 6, 17, 9, 5))).toBe("ministry-backup-2026-07-17-0905.json");
  });
});

describe("validateBackupJSON — valid input", () => {
  it("parses and validates a well-formed backup", () => {
    const backup = buildBackup(FULL_DATA);
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.counts).toEqual(backup.counts);
  });
});

describe("validateBackupJSON — rejections", () => {
  it("rejects invalid JSON", () => {
    const result = validateBackupJSON("{not valid json");
    expect(result.ok).toBe(false);
  });

  it("rejects the wrong format string", () => {
    const backup = buildBackup(FULL_DATA);
    const tampered = { ...backup, format: "some-other-format" };
    const result = validateBackupJSON(JSON.stringify(tampered));
    expect(result.ok).toBe(false);
  });

  it("rejects an unsupported (newer) version", () => {
    const backup = buildBackup(FULL_DATA);
    const tampered = { ...backup, version: 999 };
    const result = validateBackupJSON(JSON.stringify(tampered));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/новой версией/);
  });

  it("rejects missing top-level fields", () => {
    const result = validateBackupJSON(JSON.stringify({ format: BACKUP_FORMAT, version: 1 }));
    expect(result.ok).toBe(false);
  });

  it("rejects malformed category data (wrong types)", () => {
    const backup = buildBackup(FULL_DATA);
    const tampered = { ...backup, data: { ...backup.data, records: [{ id: "r1", year: "not-a-number" }] } };
    const result = validateBackupJSON(JSON.stringify(tampered));
    expect(result.ok).toBe(false);
  });

  it("rejects an event with an invalid date", () => {
    const backup = buildBackup({ ...EMPTY_DATA, events: [{ ...EVENT, date: "not-a-date" }] });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });

  it("rejects an event with an unsupported category", () => {
    const backup = buildBackup({ ...EMPTY_DATA, events: [{ ...EVENT, category: "bogus" as never }] });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });

  it("rejects a session missing required duration", () => {
    const badSession = { ...SESSION, durationMinutes: 0 };
    const backup = buildBackup({ ...EMPTY_DATA, sessions: [badSession] });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });

  it("rejects a timer-source session missing startTime/endTime", () => {
    const badSession: Session = { ...SESSION, source: "timer" };
    const backup = buildBackup({ ...EMPTY_DATA, sessions: [badSession] });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate ids within a category", () => {
    const backup = buildBackup({ ...EMPTY_DATA, records: [RECORD, { ...RECORD }] });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });

  it("rejects an unreasonably large payload", () => {
    const huge = "x".repeat(26 * 1024 * 1024);
    const result = validateBackupJSON(huge);
    expect(result.ok).toBe(false);
  });

  it("rejects a suspiciously large number of items in one category", () => {
    const manyRecords = Array.from({ length: 50_001 }, (_, i) => ({ ...RECORD, id: `r${i}` }));
    const backup = buildBackup({ ...EMPTY_DATA, records: manyRecords });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });
});

describe("validateBackupJSON — strict calendar-date validation (date-only fields)", () => {
  const badDates = ["July 10, 2026", "2026-02-30", "0", "2026-7-10", "2026-07-10T00:00:00Z", "2026-02-29"];

  it.each(badDates)("rejects %s as an event date", (date) => {
    const backup = buildBackup({ ...EMPTY_DATA, events: [{ ...EVENT, date }] });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });

  it.each(badDates)("rejects %s as a talk date", (date) => {
    const backup = buildBackup({ ...EMPTY_DATA, talks: [{ ...TALK, date }] });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });

  it.each(badDates)("rejects %s as a session date", (date) => {
    const backup = buildBackup({ ...EMPTY_DATA, sessions: [{ ...SESSION, date }] });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });

  it("accepts a valid leap-day date (2024-02-29)", () => {
    const backup = buildBackup({ ...EMPTY_DATA, events: [{ ...EVENT, date: "2024-02-29" }] });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(true);
  });

  it("rejects an invalid leap-day date on a non-leap year (2026-02-29)", () => {
    const backup = buildBackup({ ...EMPTY_DATA, events: [{ ...EVENT, date: "2026-02-29" }] });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });
});

describe("validateBackupJSON — strict ISO-datetime validation (timestamp fields)", () => {
  const badDateTimes = ["2026-06-03", "not-a-date", "2026-06-03 10:00:00", "0", "July 10, 2026 10:00:00"];

  it.each(badDateTimes)("rejects %s as session createdAt/updatedAt", (ts) => {
    const backup = buildBackup({
      ...EMPTY_DATA,
      sessions: [{ ...SESSION, createdAt: ts, updatedAt: ts }],
    });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });

  it.each(badDateTimes)("rejects %s as a timer session's startTime/endTime", (ts) => {
    const backup = buildBackup({
      ...EMPTY_DATA,
      sessions: [{ ...SESSION, source: "timer", startTime: ts, endTime: ts }],
    });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });

  it("rejects a malformed backup-level createdAt timestamp", () => {
    const backup = buildBackup(EMPTY_DATA);
    const tampered = { ...backup, createdAt: "2026-06-03" };
    const result = validateBackupJSON(JSON.stringify(tampered));
    expect(result.ok).toBe(false);
  });

  it("accepts a canonical ISO datetime with milliseconds", () => {
    const backup = buildBackup({
      ...EMPTY_DATA,
      sessions: [{ ...SESSION, createdAt: "2026-06-03T10:00:00.000Z", updatedAt: "2026-06-03T10:00:00.000Z" }],
    });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(true);
  });
});
