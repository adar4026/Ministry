import {
  BACKUP_FILE_EXTENSION,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  ERR_BAD_JSON,
  ERR_CHECKSUM_MISMATCH,
  ERR_CHECKSUM_MISSING,
  ERR_NOT_MINISTRY,
  buildBackup,
  computeChecksum,
  formatBackupFilename,
  LEGACY_MFB_FILE_EXTENSION,
  validateBackup,
  validateBackupJSON,
  type MinistryBackupData,
} from "@/data/backup";
import { CATEGORY_KEYS } from "@/data/constants";
import { checksumOf } from "@/data/sha256";
import type { CustomCategory, HourRecord, MinistryEvent, Session, Talk, UserProfile } from "@/types";

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
const CUSTOM_CATEGORY: CustomCategory = { id: "x1784653775553td1", name: "Конгресс" };
const PROFILE: UserProfile = { displayName: "Тест", events: [{ id: "pe1", title: "Крещение", date: "2003-07-12" }] };

const FULL_DATA: MinistryBackupData = {
  records: [RECORD],
  events: [EVENT],
  talks: [TALK],
  sessions: [SESSION],
};

const EMPTY_DATA: MinistryBackupData = { records: [], events: [], talks: [], sessions: [] };

// A file exactly as TASK_013 wrote it: version 1, four collections, no
// checksum, `.json`. These are the copies already on the owner's devices.
function v1File(data: Partial<MinistryBackupData> = {}, overrides: Record<string, unknown> = {}) {
  const d = { records: [], events: [], talks: [], sessions: [], ...data };
  return {
    format: "ministry-backup",
    version: 1,
    createdAt: "2026-08-22T09:19:00.000Z",
    appVersion: "0.4.4",
    data: d,
    counts: {
      records: d.records!.length,
      events: d.events!.length,
      talks: d.talks!.length,
      sessions: d.sessions!.length,
    },
    ...overrides,
  };
}

describe("buildBackup — format v2", () => {
  it("includes every supported collection with correct contents", () => {
    const backup = buildBackup(FULL_DATA, new Date("2026-07-17T12:00:00.000Z"));
    expect(backup.data.records).toEqual([RECORD]);
    expect(backup.data.events).toEqual([EVENT]);
    expect(backup.data.talks).toEqual([TALK]);
    expect(backup.data.sessions).toEqual([SESSION]);
  });

  it("carries event topics and the profile when they are supplied", () => {
    const backup = buildBackup({ ...FULL_DATA, customCategories: [CUSTOM_CATEGORY], profile: PROFILE });
    expect(backup.data.customCategories).toEqual([CUSTOM_CATEGORY]);
    expect(backup.data.profile).toEqual(PROFILE);
    expect(backup.counts.customCategories).toBe(1);
  });

  it("does not include any unrelated keys", () => {
    const backup = buildBackup(FULL_DATA);
    expect(Object.keys(backup).sort()).toEqual([
      "appVersion",
      "checksum",
      "counts",
      "createdAt",
      "data",
      "format",
      "version",
    ]);
  });

  it("stamps correct metadata and counts", () => {
    const backup = buildBackup(FULL_DATA, new Date("2026-07-17T12:00:00.000Z"), "0.4.4");
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.version).toBe(2);
    expect(BACKUP_VERSION).toBe(2);
    expect(backup.createdAt).toBe("2026-07-17T12:00:00.000Z");
    expect(backup.appVersion).toBe("0.4.4");
    expect(backup.counts).toEqual({ records: 1, events: 1, talks: 1, sessions: 1, customCategories: 0 });
  });

  it("stamps a SHA-256 checksum over everything except the checksum field", () => {
    const backup = buildBackup(FULL_DATA, new Date("2026-07-17T12:00:00.000Z"));
    expect(backup.checksum).toMatch(/^[0-9a-f]{64}$/);

    const { checksum, ...payload } = backup;
    expect(checksum).toBe(computeChecksum(payload));
    expect(checksum).toBe(checksumOf(payload));
  });

  it("produces the same checksum regardless of how the JSON is formatted", () => {
    const backup = buildBackup(FULL_DATA);
    const pretty = validateBackupJSON(JSON.stringify(backup, null, 2));
    const compact = validateBackupJSON(JSON.stringify(backup));
    expect(pretty.ok).toBe(true);
    expect(compact.ok).toBe(true);
  });

  it("supports an empty but valid dataset", () => {
    const backup = buildBackup(EMPTY_DATA);
    expect(backup.counts).toEqual({ records: 0, events: 0, talks: 0, sessions: 0, customCategories: 0 });
    const result = validateBackup(backup);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup).toEqual(backup);
  });
});

describe("filenames (TASK_064)", () => {
  it("names a backup ministry-backup-YYYY-MM-DD-HHmm.json", () => {
    expect(formatBackupFilename(new Date(2026, 6, 17, 9, 5))).toBe("ministry-backup-2026-07-17-0905.json");
    expect(BACKUP_FILE_EXTENSION).toBe(".json");
  });

  it("no longer writes .mfb — iPhone shows that as an unknown file", () => {
    expect(formatBackupFilename(new Date(2026, 6, 17, 9, 5))).not.toContain(".mfb");
    expect(BACKUP_FILE_EXTENSION).not.toBe(".mfb");
    // ...and never Alex Finance's extension either.
    expect(BACKUP_FILE_EXTENSION).not.toBe(".afb");
  });

  it("keeps .mfb only as the legacy extension the picker still offers", () => {
    expect(LEGACY_MFB_FILE_EXTENSION).toBe(".mfb");
  });
});

describe("validateBackupJSON — a well-formed v2 file", () => {
  it("accepts it and reports a verified checksum", () => {
    const backup = buildBackup(FULL_DATA);
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sourceVersion).toBe(2);
    expect(result.migrated).toBe(false);
    expect(result.checksum).toBe("verified");
    expect(result.backup.counts).toEqual(backup.counts);
  });
});

describe("validateBackupJSON — checksum enforcement", () => {
  it("rejects a v2 file whose data was edited after it was written", () => {
    const backup = buildBackup(FULL_DATA);
    const tampered = {
      ...backup,
      data: { ...backup.data, records: [{ ...RECORD, hours: 999 }] },
    };
    const result = validateBackupJSON(JSON.stringify(tampered));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(ERR_CHECKSUM_MISMATCH);
  });

  it("rejects a v2 file whose counts were edited to disagree with the data", () => {
    const backup = buildBackup(FULL_DATA);
    const tampered = { ...backup, counts: { ...backup.counts, records: 99 } };
    const result = validateBackupJSON(JSON.stringify(tampered));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(ERR_CHECKSUM_MISMATCH);
  });

  it("rejects a v2 file carrying an outright wrong checksum", () => {
    const backup = buildBackup(FULL_DATA);
    const tampered = { ...backup, checksum: "0".repeat(64) };
    const result = validateBackupJSON(JSON.stringify(tampered));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(ERR_CHECKSUM_MISMATCH);
  });

  it("rejects a v2 file with no checksum at all", () => {
    const backup = buildBackup(FULL_DATA);
    const { checksum, ...withoutChecksum } = backup;
    const result = validateBackupJSON(JSON.stringify(withoutChecksum));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(ERR_CHECKSUM_MISSING);
  });

  it("accepts a checksum written in upper case", () => {
    const backup = buildBackup(FULL_DATA);
    const upper = { ...backup, checksum: backup.checksum.toUpperCase() };
    expect(validateBackupJSON(JSON.stringify(upper)).ok).toBe(true);
  });

  it("verifies the checksum BEFORE inspecting records, so tampering is named as tampering", () => {
    const backup = buildBackup(FULL_DATA);
    const tampered = { ...backup, data: { ...backup.data, talks: [{ ...TALK, date: "nonsense" }] } };
    const result = validateBackupJSON(JSON.stringify(tampered));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(ERR_CHECKSUM_MISMATCH);
  });
});

describe("validateBackupJSON — declared counts must match the contents (TASK_064)", () => {
  it("rejects a v2 file whose counts lie, even with the checksum recomputed", () => {
    const backup = buildBackup(FULL_DATA);
    const lying = { ...backup, counts: { ...backup.counts, talks: 5 } };
    const resealed = { ...lying, checksum: computeChecksum((({ checksum, ...p }) => p)(lying)) };

    const result = validateBackupJSON(JSON.stringify(resealed));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        "Файл повреждён: в разделе «речи» указано 5, а фактически содержится 1.",
      );
    }
  });

  it("accepts a v1 file with stale counts and says what will actually be restored", () => {
    // TASK_013 never verified its own counts, so refusing an old copy over
    // them would lose data the file plainly contains.
    const file = v1File({ records: [RECORD] }, { counts: { records: 9, events: 0, talks: 0, sessions: 0 } });
    const result = validateBackupJSON(JSON.stringify(file));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.records).toEqual([RECORD]);
    expect(result.backup.counts.records).toBe(1);
    expect(result.notes).toContain(
      "В копии указано «записи часов: 9», фактически 1 — восстановлено будет фактическое количество.",
    );
  });
});

describe("validateBackupJSON — the format is read from the contents, not the extension (TASK_064)", () => {
  it("accepts an already-created .mfb file: same v2 payload, different name", () => {
    // The bytes TASK_062 wrote into `ministry-backup-….mfb` — compact, no
    // indentation. Nothing about validation ever saw the file name.
    const mfbContents = JSON.stringify(buildBackup(FULL_DATA, new Date("2026-08-22T09:19:00.000Z")));
    const result = validateBackupJSON(mfbContents);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sourceVersion).toBe(2);
    expect(result.checksum).toBe("verified");
    expect(result.backup.data.records).toEqual([RECORD]);
    expect(result.backup.data.talks).toEqual([TALK]);
  });

  it("rejects a foreign file even when it is valid JSON with a .json name", () => {
    const result = validateBackupJSON('{"format":"alex-finance-backup","version":2,"data":{}}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(ERR_NOT_MINISTRY);
  });
});

describe("validateBackupJSON — legacy v1 files", () => {
  it("reads and migrates a v1 file, and never calls a missing checksum damage", () => {
    const result = validateBackupJSON(JSON.stringify(v1File(FULL_DATA)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sourceVersion).toBe(1);
    expect(result.migrated).toBe(true);
    expect(result.checksum).toBe("absent-legacy");
    expect(result.backup.version).toBe(2);
    expect(result.backup.createdAt).toBe("2026-08-22T09:19:00.000Z");
    expect(result.notes.some((n) => /версия 1/i.test(n))).toBe(true);
  });

  it("loses no records, events, talks or sessions in the migration", () => {
    const result = validateBackupJSON(JSON.stringify(v1File(FULL_DATA)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.records).toEqual([RECORD]);
    expect(result.backup.data.events).toEqual([EVENT]);
    expect(result.backup.data.talks).toEqual([TALK]);
    expect(result.backup.data.sessions).toEqual([SESSION]);
    expect(result.backup.counts).toEqual({ records: 1, events: 1, talks: 1, sessions: 1, customCategories: 0 });
  });

  it("leaves topics and profile absent (not empty), so restore won't wipe the device's own", () => {
    const result = validateBackupJSON(JSON.stringify(v1File(FULL_DATA)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.customCategories).toBeUndefined();
    expect(result.backup.data.profile).toBeUndefined();
    expect(result.notes.some((n) => /останутся без изменений/.test(n))).toBe(true);
  });

  it("gives the migrated copy a checksum of its own", () => {
    const result = validateBackupJSON(JSON.stringify(v1File(FULL_DATA)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { checksum, ...payload } = result.backup;
    expect(checksum).toBe(computeChecksum(payload));
  });
});

describe("validateBackupJSON — an empty talk number is normal, not damage", () => {
  // The exact record from the owner's 22-08-2026 backup.
  const T6 = { id: "t6", date: "2026-06-28", number: null, title: "Речь 75", location: "Хихон" };

  it("accepts talk.number === null in a v1 file and keeps it null", () => {
    const result = validateBackupJSON(JSON.stringify(v1File({ talks: [T6] })));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.talks).toEqual([T6]);
  });

  it("accepts a talk with no number field at all and normalizes it to null", () => {
    const { number, ...noNumber } = T6;
    const result = validateBackupJSON(JSON.stringify(v1File({ talks: [noNumber as never] })));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.talks[0].number).toBeNull();
  });

  it("accepts talk.number === null in a v2 file", () => {
    const backup = buildBackup({ ...EMPTY_DATA, talks: [T6] });
    expect(validateBackupJSON(JSON.stringify(backup)).ok).toBe(true);
  });

  it("does not guess at a number of the wrong type — it says exactly what is wrong", () => {
    const result = validateBackupJSON(JSON.stringify(v1File({ talks: [{ ...T6, number: "75" } as never] })));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("у записи речи №1 (id: t6)");
    expect(result.error).toContain("«номер речи»");
    expect(result.issues[0].entity).toBe("talk");
    expect(result.issues[0].field).toBe("number");
  });
});

describe("validateBackupJSON — supported legacy and optional fields survive", () => {
  it("keeps creditHours (TASK_039) exactly as written", () => {
    const withCredit = { ...RECORD, id: "r9", creditHours: 4.5 };
    const result = validateBackupJSON(JSON.stringify(v1File({ records: [withCredit] })));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.records[0]).toEqual(withCredit);
    expect(result.notes.some((n) => /зачётными часами/.test(n))).toBe(true);
  });

  it("keeps creditHours through a v2 round-trip", () => {
    const withCredit = { ...RECORD, creditHours: 2 };
    const backup = buildBackup({ ...EMPTY_DATA, records: [withCredit] });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.data.records[0].creditHours).toBe(2);
  });

  it("keeps unknown extra fields rather than silently dropping them", () => {
    const exotic = { ...RECORD, id: "r7", futureField: "keep me" };
    const result = validateBackupJSON(JSON.stringify(v1File({ records: [exotic as never] })));
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.backup.data.records[0] as never as typeof exotic).futureField).toBe("keep me");
  });

  it("keeps a session's optional startTime/endTime and note", () => {
    const timed: Session = {
      ...SESSION,
      source: "timer",
      startTime: "2026-06-03T09:00:00.000Z",
      endTime: "2026-06-03T10:30:00.000Z",
      note: "поле",
    };
    const result = validateBackupJSON(JSON.stringify(v1File({ sessions: [timed] })));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.data.sessions[0]).toEqual(timed);
  });

  it("normalizes an absent optional text field to \"\" and says so, without inventing content", () => {
    const { note, ...noNote } = RECORD;
    const result = validateBackupJSON(JSON.stringify(v1File({ records: [noNote as never] })));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.records[0].note).toBe("");
    expect(result.notes.some((n) => /необязательных полей/.test(n))).toBe(true);
  });
});

describe("validateBackupJSON — user-created event topics (TASK_045)", () => {
  // The actual reason the owner's 22-08-2026 backup was refused: seven events
  // referenced custom topic ids, and the TASK_013 validator only knew the six
  // system categories.
  it("accepts an event whose category is a custom topic id", () => {
    const custom = { ...EVENT, id: "e22", category: "x1784653775553td1" };
    const result = validateBackupJSON(JSON.stringify(v1File({ events: [custom] })), CATEGORY_KEYS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.events[0].category).toBe("x1784653775553td1");
    expect(result.notes.some((n) => /пользовательскими темами: 1/.test(n))).toBe(true);
  });

  it("still accepts all six system categories", () => {
    const events = CATEGORY_KEYS.map((c, i) => ({ ...EVENT, id: `e${i}`, category: c }));
    const result = validateBackupJSON(JSON.stringify(v1File({ events })), CATEGORY_KEYS);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.notes.some((n) => /пользовательскими темами/.test(n))).toBe(false);
  });

  it("rejects an event with an empty or non-string topic", () => {
    for (const category of ["", 42, null]) {
      const result = validateBackupJSON(JSON.stringify(v1File({ events: [{ ...EVENT, category } as never] })));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("«тема»");
    }
  });

  it("validates the topics collection itself when a v2 file carries one", () => {
    const backup = buildBackup({ ...EMPTY_DATA, customCategories: [CUSTOM_CATEGORY] });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.data.customCategories).toEqual([CUSTOM_CATEGORY]);
  });

  it("names a broken topic instead of failing vaguely", () => {
    const backup = buildBackup({ ...EMPTY_DATA, customCategories: [{ id: "x1", name: "" } as never] });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("у темы событий №1 (id: x1)");
      expect(result.issues[0].entity).toBe("customCategory");
    }
  });
});

describe("validateBackupJSON — specific, named errors", () => {
  it("says the JSON is unreadable", () => {
    const result = validateBackupJSON("{not valid json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(ERR_BAD_JSON);
      expect(result.issues).toEqual([]);
    }
  });

  it("says a foreign file is not a Ministry backup", () => {
    for (const foreign of ['{"format":"alex-finance-backup","version":2}', '{"hello":"world"}', "[]", "null"]) {
      const result = validateBackupJSON(foreign);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe(ERR_NOT_MINISTRY);
    }
  });

  it("names the entity, its position and the missing field for a talk with no date", () => {
    const { date, ...noDate } = TALK;
    const result = validateBackupJSON(JSON.stringify(v1File({ talks: [noDate as never] })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Не удалось восстановить: у записи речи №1 (id: t1) отсутствует обязательная дата.");
      expect(result.issues[0]).toMatchObject({ entity: "talk", index: 0, id: "t1", field: "date" });
    }
  });

  it("names a missing id", () => {
    const { id, ...noId } = EVENT;
    const result = validateBackupJSON(JSON.stringify(v1File({ events: [noId as never] })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("у события №1");
      expect(result.error).toContain("идентификатор");
      expect(result.issues[0].field).toBe("id");
    }
  });

  it("names a malformed date and shows the offending value", () => {
    const result = validateBackupJSON(JSON.stringify(v1File({ events: [{ ...EVENT, date: "28.06.2026" }] })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("«28.06.2026»");
      expect(result.error).toContain("ГГГГ-ММ-ДД");
    }
  });

  it("names a duplicate id and the record it collides with", () => {
    const result = validateBackupJSON(JSON.stringify(v1File({ records: [RECORD, { ...RECORD }] })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("у записи часов №2 (id: r1)");
      expect(result.error).toContain("дубликаты недопустимы");
    }
  });

  it("names a missing collection instead of blaming the records", () => {
    const broken = v1File(FULL_DATA);
    delete (broken.data as Record<string, unknown>).talks;
    const result = validateBackupJSON(JSON.stringify(broken));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("раздел «речи» отсутствует");
  });

  it("reports how many problems there are when a file has several", () => {
    const result = validateBackupJSON(
      JSON.stringify(v1File({ talks: [{ ...TALK, id: "", date: "oops" }] })),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBe(2);
      expect(result.error).toContain("Всего проблем: 2.");
    }
  });

  it("never falls back to the old catch-all wording", () => {
    const result = validateBackupJSON(JSON.stringify(v1File({ talks: [{ ...TALK, date: null } as never] })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toContain("повреждённые записи");
  });

  it("rejects an unsupported (newer) version", () => {
    const backup = { ...buildBackup(FULL_DATA), version: 999 };
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/новой версией/);
  });

  it("rejects missing top-level fields", () => {
    expect(validateBackupJSON(JSON.stringify({ format: BACKUP_FORMAT, version: 1 })).ok).toBe(false);
  });

  it("rejects a malformed backup-level createdAt timestamp", () => {
    const result = validateBackupJSON(JSON.stringify(v1File(FULL_DATA, { createdAt: "2026-06-03" })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("дата создания копии");
  });

  it("rejects an unreasonably large payload", () => {
    expect(validateBackupJSON("x".repeat(26 * 1024 * 1024)).ok).toBe(false);
  });

  it("rejects a suspiciously large number of items in one collection", () => {
    const manyRecords = Array.from({ length: 50_001 }, (_, i) => ({ ...RECORD, id: `r${i}` }));
    const result = validateBackupJSON(JSON.stringify(v1File({ records: manyRecords })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("слишком много записей");
  });
});

describe("validateBackupJSON — per-field record/session rules", () => {
  it("rejects a record with a non-numeric year, naming the field", () => {
    const result = validateBackupJSON(
      JSON.stringify(v1File({ records: [{ id: "r1", year: "not-a-number" } as never] })),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("«год»");
  });

  it("rejects a negative creditHours, naming the field", () => {
    const result = validateBackupJSON(JSON.stringify(v1File({ records: [{ ...RECORD, creditHours: -1 }] })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("«зачётные часы»");
  });

  it("rejects a session missing required duration", () => {
    const result = validateBackupJSON(JSON.stringify(v1File({ sessions: [{ ...SESSION, durationMinutes: 0 }] })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("«длительность в минутах»");
  });

  it("rejects a timer-source session missing startTime/endTime", () => {
    const result = validateBackupJSON(JSON.stringify(v1File({ sessions: [{ ...SESSION, source: "timer" }] })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("сессия таймера");
  });

  it("rejects a session with an unknown source", () => {
    const result = validateBackupJSON(JSON.stringify(v1File({ sessions: [{ ...SESSION, source: "magic" } as never] })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("«источник»");
  });

  it("rejects a session missing createdAt", () => {
    const { createdAt, ...noCreatedAt } = SESSION;
    const result = validateBackupJSON(JSON.stringify(v1File({ sessions: [noCreatedAt as never] })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("«дата создания»");
  });
});

describe("validateBackupJSON — strict calendar-date validation (date-only fields)", () => {
  const badDates = ["July 10, 2026", "2026-02-30", "0", "2026-7-10", "2026-07-10T00:00:00Z", "2026-02-29"];

  it.each(badDates)("rejects %s as an event date", (date) => {
    expect(validateBackupJSON(JSON.stringify(v1File({ events: [{ ...EVENT, date }] }))).ok).toBe(false);
  });

  it.each(badDates)("rejects %s as a talk date", (date) => {
    expect(validateBackupJSON(JSON.stringify(v1File({ talks: [{ ...TALK, date }] }))).ok).toBe(false);
  });

  it.each(badDates)("rejects %s as a session date", (date) => {
    expect(validateBackupJSON(JSON.stringify(v1File({ sessions: [{ ...SESSION, date }] }))).ok).toBe(false);
  });

  it("accepts a valid leap-day date (2024-02-29)", () => {
    expect(validateBackupJSON(JSON.stringify(v1File({ events: [{ ...EVENT, date: "2024-02-29" }] }))).ok).toBe(true);
  });
});

describe("validateBackupJSON — strict ISO-datetime validation (timestamp fields)", () => {
  const badDateTimes = ["2026-06-03", "not-a-date", "2026-06-03 10:00:00", "0", "July 10, 2026 10:00:00"];

  it.each(badDateTimes)("rejects %s as session createdAt/updatedAt", (ts) => {
    const sessions = [{ ...SESSION, createdAt: ts, updatedAt: ts }];
    expect(validateBackupJSON(JSON.stringify(v1File({ sessions }))).ok).toBe(false);
  });

  it.each(badDateTimes)("rejects %s as a timer session's startTime/endTime", (ts) => {
    const sessions = [{ ...SESSION, source: "timer" as const, startTime: ts, endTime: ts }];
    expect(validateBackupJSON(JSON.stringify(v1File({ sessions }))).ok).toBe(false);
  });

  it("accepts a canonical ISO datetime with milliseconds", () => {
    expect(validateBackupJSON(JSON.stringify(v1File({ sessions: [SESSION] }))).ok).toBe(true);
  });
});

describe("validateBackupJSON — profile section (v2 only)", () => {
  it("accepts and preserves a profile", () => {
    const backup = buildBackup({ ...EMPTY_DATA, profile: PROFILE });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.data.profile).toEqual(PROFILE);
  });

  it("names a broken memorable date rather than dropping it", () => {
    const broken: UserProfile = { events: [{ id: "pe1", title: "X", date: "12.07.2003" }] };
    const backup = buildBackup({ ...EMPTY_DATA, profile: broken });
    const result = validateBackupJSON(JSON.stringify(backup));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0].entity).toBe("profile");
      expect(result.error).toContain("памятной даты");
    }
  });
});
