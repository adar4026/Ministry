import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildBackup } from "@/data/backup";
import {
  BACKUP_META_KEYS,
  BackupImportError,
  diagnoseStorageKeys,
  markBackupCreated,
  performImport,
  readCurrentData,
  readLastBackupAt,
  readSafetyCopy,
} from "@/data/backupImport";
import { STORAGE_KEYS } from "@/store/StoreContext";
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
const TOPIC: CustomCategory = { id: "x1", name: "Конгресс" };
const PROFILE: UserProfile = { displayName: "Тест", events: [] };

// The AsyncStorage jest mock implements setItem in terms of multiSet
// (node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js),
// so a blanket `mockRejectedValueOnce` on multiSet would be swallowed by
// whichever write happens to come first — since TASK_062 that is the safety
// copy, not the data write. These helpers therefore target a specific key,
// and beforeEach restores the mock's own default implementation.
const REAL_MULTI_SET = (AsyncStorage.multiSet as jest.Mock).getMockImplementation()!;
const REAL_SET_ITEM = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;

type Pairs = [string, string][];

/**
 * Makes the FIRST multiSet that touches `key` reject, leaving every other
 * write (including the rollback that follows) working normally. Pass
 * `{ persist: true }` to keep failing, which also breaks the rollback.
 */
function failWriteOf(key: string, { persist = false }: { persist?: boolean } = {}) {
  let fired = false;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: Pairs, cb?: unknown) => {
    if (pairs.some(([k]) => k === key) && (persist || !fired)) {
      fired = true;
      throw new Error("disk full");
    }
    return REAL_MULTI_SET(pairs, cb);
  });
}

/** Lets the write of `key` "succeed" while actually storing something else. */
function corruptWriteOf(key: string, stored: string) {
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: Pairs, cb?: unknown) =>
    REAL_MULTI_SET(
      pairs.map(([k, v]) => (k === key ? [k, stored] : [k, v])),
      cb,
    ),
  );
}

beforeEach(async () => {
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(REAL_MULTI_SET);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(REAL_SET_ITEM);
  await AsyncStorage.clear();
});

describe("readCurrentData", () => {
  it("reads every supported key and defaults missing ones to []", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));
    const data = await readCurrentData();
    expect(data.records).toEqual([RECORD]);
    expect(data.events).toEqual([]);
    expect(data.talks).toEqual([]);
    expect(data.sessions).toEqual([]);
    expect(data.customCategories).toEqual([]);
    expect(data.profile).toBeUndefined();
  });

  it("includes event topics and the profile when the device has them", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.customCategories, JSON.stringify([TOPIC]));
    await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(PROFILE));
    const data = await readCurrentData();
    expect(data.customCategories).toEqual([TOPIC]);
    expect(data.profile).toEqual(PROFILE);
  });
});

describe("performImport — what gets written", () => {
  it("replaces the four core keys with the backup's contents", async () => {
    const backup = buildBackup({ records: [RECORD], events: [EVENT], talks: [TALK], sessions: [SESSION] });
    await performImport(backup);

    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.events))!)).toEqual([EVENT]);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.talks))!)).toEqual([TALK]);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.sessions))!)).toEqual([SESSION]);
  });

  it("writes event topics and the profile when the backup (v2) carries them", async () => {
    const backup = buildBackup({
      records: [],
      events: [],
      talks: [],
      sessions: [],
      customCategories: [TOPIC],
      profile: PROFILE,
    });
    await performImport(backup);

    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.customCategories))!)).toEqual([TOPIC]);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.profile))!)).toEqual(PROFILE);
  });

  it("leaves the device's own topics and profile alone when the backup (v1) has none", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.customCategories, JSON.stringify([TOPIC]));
    await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(PROFILE));

    // buildBackup omits both keys when they aren't supplied — exactly the
    // shape a migrated v1 file has.
    const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
    expect(backup.data.customCategories).toBeUndefined();
    await performImport(backup);

    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.customCategories))!)).toEqual([TOPIC]);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.profile))!)).toEqual(PROFILE);
  });

  it("leaves unrelated storage keys (including mj_timer_v1) untouched", async () => {
    await AsyncStorage.setItem("mj_timer_v1", JSON.stringify({ status: "idle" }));
    await AsyncStorage.setItem("some_unrelated_key", "untouched");

    const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
    await performImport(backup);

    expect(await AsyncStorage.getItem("mj_timer_v1")).toBe(JSON.stringify({ status: "idle" }));
    expect(await AsyncStorage.getItem("some_unrelated_key")).toBe("untouched");
  });
});

describe("performImport — safety copy (TASK_062 §5.2)", () => {
  it("saves the device's current data before replacing anything", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));
    await AsyncStorage.setItem(STORAGE_KEYS.customCategories, JSON.stringify([TOPIC]));

    const backup = buildBackup({ records: [], events: [], talks: [], sessions: [] });
    await performImport(backup);

    const safety = await readSafetyCopy();
    expect(safety).not.toBeNull();
    // The PRE-restore state, not the restored one.
    expect(safety!.data.records).toEqual([RECORD]);
    expect(safety!.data.customCategories).toEqual([TOPIC]);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([]);
  });

  it("refuses to restore at all if the safety copy cannot be written", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("quota exceeded"));

    const backup = buildBackup({ records: [], events: [], talks: [], sessions: [] });
    const error = await performImport(backup).catch((e) => e);

    expect(error).toBeInstanceOf(BackupImportError);
    expect(error.message).toMatch(/страховочную копию/);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
    expect(await AsyncStorage.getItem(BACKUP_META_KEYS.safety)).toBeNull();
  });
});

describe("performImport — atomicity", () => {
  it("rolls back to previous values when the write fails", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));

    const backup = buildBackup({ records: [], events: [], talks: [], sessions: [] });
    failWriteOf(STORAGE_KEYS.records);

    await expect(performImport(backup)).rejects.toBeInstanceOf(BackupImportError);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
  });

  it("rolls back when post-write byte verification fails", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));

    const backup = buildBackup({ records: [], events: [], talks: [], sessions: [SESSION] });
    corruptWriteOf(STORAGE_KEYS.sessions, "corrupted");

    await expect(performImport(backup)).rejects.toThrow(/сессии/);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.sessions)).toBeNull();
  });

  it("rolls back when the stored entity count disagrees with the backup's counts", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));

    // A backup whose declared count no longer matches the data it carries:
    // the write succeeds byte-for-byte, and only the independent count check
    // catches it.
    const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
    const lying = { ...backup, counts: { ...backup.counts, records: 5 } };

    await expect(performImport(lying)).rejects.toThrow(/ожидалось 5, сохранено 1/);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
  });

  it("verifies the count of event topics too", async () => {
    const backup = buildBackup({ records: [], events: [], talks: [], sessions: [], customCategories: [TOPIC] });
    const lying = { ...backup, counts: { ...backup.counts, customCategories: 9 } };

    await expect(performImport(lying)).rejects.toThrow(/темы событий/);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.customCategories)).toBeNull();
  });

  it("removes keys that had no previous value when rolling back (rather than leaving the failed write)", async () => {
    // No existing value for `sessions` — snapshot captures null.
    const backup = buildBackup({ records: [], events: [], talks: [], sessions: [SESSION] });
    failWriteOf(STORAGE_KEYS.sessions);

    await expect(performImport(backup)).rejects.toBeInstanceOf(BackupImportError);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.sessions)).toBeNull();
  });

  it("says the previous data is intact when it rolls back", async () => {
    const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
    failWriteOf(STORAGE_KEYS.records);
    await expect(performImport(backup)).rejects.toThrow(/прежние данные на месте/);
  });

  it("never claims the previous data is intact when even the rollback fails", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));
    const backup = buildBackup({ records: [], events: [], talks: [], sessions: [] });
    failWriteOf(STORAGE_KEYS.records, { persist: true });

    const error = await performImport(backup).catch((e) => e);
    expect(error).toBeInstanceOf(BackupImportError);
    expect(error.message).toMatch(/Откат тоже не удался/);
    expect(error.message).toMatch(/Страховочная копия/);
    expect(error.message).not.toMatch(/прежние данные на месте/);
  });
});

// TASK_013 production bug fix: applyToLiveStore is how a successful restore
// reaches the live StoreContext (via replaceAllData) as part of the SAME
// transaction as the storage write — see the doc comment on performImport.
describe("performImport — applyToLiveStore (StoreContext rehydration)", () => {
  it("is called with the verified backup data after a successful write", async () => {
    const backup = buildBackup({ records: [RECORD], events: [EVENT], talks: [TALK], sessions: [SESSION] });
    const apply = jest.fn();

    await performImport(backup, apply);

    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith({ records: [RECORD], events: [EVENT], talks: [TALK], sessions: [SESSION] });
  });

  it("passes topics and the profile through to the live store as well", async () => {
    const backup = buildBackup({
      records: [],
      events: [],
      talks: [],
      sessions: [],
      customCategories: [TOPIC],
      profile: PROFILE,
    });
    const apply = jest.fn();

    await performImport(backup, apply);

    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ customCategories: [TOPIC], profile: PROFILE }));
  });

  it("rolls back storage and never calls applyToLiveStore if the write fails", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));
    const backup = buildBackup({ records: [], events: [], talks: [], sessions: [] });
    const apply = jest.fn();
    failWriteOf(STORAGE_KEYS.records);

    await expect(performImport(backup, apply)).rejects.toBeInstanceOf(BackupImportError);

    expect(apply).not.toHaveBeenCalled();
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
  });

  it("rolls back storage if applyToLiveStore itself throws (rehydration failure)", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));
    const backup = buildBackup({ records: [], events: [], talks: [], sessions: [] });
    const apply = jest.fn(() => {
      throw new Error("StoreContext not ready");
    });

    await expect(performImport(backup, apply)).rejects.toBeInstanceOf(BackupImportError);

    // Storage rolled back to the pre-restore snapshot — never left holding
    // the restored data while the live app failed to pick it up.
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
  });

  it("still works when applyToLiveStore is omitted (backward compatible)", async () => {
    const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
    await expect(performImport(backup)).resolves.toBeUndefined();
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
  });
});

describe("last backup timestamp", () => {
  it("is null until a backup file is created", async () => {
    expect(await readLastBackupAt()).toBeNull();
  });

  it("records and reads back the moment a backup file was created", async () => {
    await markBackupCreated(new Date("2026-08-22T09:19:00.000Z"));
    expect(await readLastBackupAt()).toBe("2026-08-22T09:19:00.000Z");
  });

  it("ignores an unreadable stored value instead of showing nonsense", async () => {
    await AsyncStorage.setItem(BACKUP_META_KEYS.lastBackupAt, "not-a-date");
    expect(await readLastBackupAt()).toBeNull();
  });

  it("is not app data — a restore never overwrites it", async () => {
    await markBackupCreated(new Date("2026-08-22T09:19:00.000Z"));
    await performImport(buildBackup({ records: [], events: [], talks: [], sessions: [] }));
    expect(await readLastBackupAt()).toBe("2026-08-22T09:19:00.000Z");
  });
});

describe("diagnoseStorageKeys", () => {
  it("reports existence, byte length, and item count without exposing content", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD, { ...RECORD, id: "r2" }]));
    // events/talks/sessions left unset.

    const result = await diagnoseStorageKeys();
    const records = result.find((d) => d.key === STORAGE_KEYS.records)!;
    const events = result.find((d) => d.key === STORAGE_KEYS.events)!;

    expect(records.exists).toBe(true);
    expect(records.itemCount).toBe(2);
    expect(records.byteLength).toBeGreaterThan(0);
    expect(events.exists).toBe(false);
    expect(events.itemCount).toBeNull();
    expect(events.byteLength).toBe(0);

    // Content-free: the diagnostic object never contains the actual record
    // fields (id/year/month/hours/note) — only key/exists/byteLength/itemCount.
    for (const d of result) {
      expect(Object.keys(d).sort()).toEqual(["byteLength", "exists", "itemCount", "key"]);
    }
  });
});
