import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildBackup } from "@/data/backup";
import { BackupImportError, diagnoseStorageKeys, performImport, readCurrentData } from "@/data/backupImport";
import { STORAGE_KEYS } from "@/store/StoreContext";
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

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("readCurrentData", () => {
  it("reads the 4 supported keys and defaults missing ones to []", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));
    const data = await readCurrentData();
    expect(data.records).toEqual([RECORD]);
    expect(data.events).toEqual([]);
    expect(data.talks).toEqual([]);
    expect(data.sessions).toEqual([]);
  });
});

describe("performImport", () => {
  it("replaces the 4 supported keys with the backup's contents", async () => {
    const backup = buildBackup({ records: [RECORD], events: [EVENT], talks: [TALK], sessions: [SESSION] });
    await performImport(backup);

    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.events))!)).toEqual([EVENT]);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.talks))!)).toEqual([TALK]);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.sessions))!)).toEqual([SESSION]);
  });

  it("leaves unrelated storage keys (including mj_timer_v1) untouched", async () => {
    await AsyncStorage.setItem("mj_timer_v1", JSON.stringify({ status: "idle" }));
    await AsyncStorage.setItem("some_unrelated_key", "untouched");

    const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
    await performImport(backup);

    expect(await AsyncStorage.getItem("mj_timer_v1")).toBe(JSON.stringify({ status: "idle" }));
    expect(await AsyncStorage.getItem("some_unrelated_key")).toBe("untouched");
  });

  // The AsyncStorage jest mock's multiGet/multiSet are already jest.fn()s
  // (see @react-native-async-storage/async-storage/jest/async-storage-mock.js);
  // jest.spyOn on an already-mocked function just returns the same object
  // rather than wrapping it, so mockRestore() doesn't reliably undo a
  // *Once() override the way it would for a real spy. Using
  // `mockRejectedValueOnce`/`mockImplementationOnce` directly needs no
  // restore — the queued override is consumed exactly once and every
  // later call (including StoreContext's own reads/writes in other tests)
  // falls straight back through to the mock's real default implementation.
  it("rolls back to previous values when the write fails", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));

    const backup = buildBackup({ records: [], events: [], talks: [], sessions: [] });
    (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(new Error("disk full"));

    await expect(performImport(backup)).rejects.toBeInstanceOf(BackupImportError);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
  });

  it("rolls back to previous values when post-write verification fails", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));

    const backup = buildBackup({ records: [], events: [], talks: [], sessions: [SESSION] });
    // Corrupt just the write of the `sessions` key so the real post-write
    // multiGet naturally reads back a value that doesn't match what
    // performImport expects — triggering its verification-failure path.
    // Only this one queued call is overridden; rollback's own multiSet
    // call falls through to the real implementation.
    const realMultiSet = (AsyncStorage.multiSet as jest.Mock).getMockImplementation()!;
    (AsyncStorage.multiSet as jest.Mock).mockImplementationOnce((pairs: [string, string][]) =>
      realMultiSet(pairs.map(([k, v]) => (k === STORAGE_KEYS.sessions ? [k, "corrupted"] : [k, v]))),
    );

    await expect(performImport(backup)).rejects.toBeInstanceOf(BackupImportError);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.sessions)).toBeNull();
  });

  it("removes keys that had no previous value when rolling back (rather than leaving the failed write)", async () => {
    // No existing value for `sessions` — snapshot captures null.
    const backup = buildBackup({ records: [], events: [], talks: [], sessions: [SESSION] });
    (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(new Error("boom"));

    await expect(performImport(backup)).rejects.toBeInstanceOf(BackupImportError);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.sessions)).toBeNull();
  });

  // TASK_013 production bug fix: applyToLiveStore is how a successful import
  // reaches the live StoreContext (via replaceAllData) as part of the SAME
  // transaction as the storage write — see the doc comment on performImport.
  describe("applyToLiveStore (StoreContext rehydration)", () => {
    it("is called with the verified backup data after a successful write", async () => {
      const backup = buildBackup({ records: [RECORD], events: [EVENT], talks: [TALK], sessions: [SESSION] });
      const apply = jest.fn();

      await performImport(backup, apply);

      expect(apply).toHaveBeenCalledTimes(1);
      expect(apply).toHaveBeenCalledWith({ records: [RECORD], events: [EVENT], talks: [TALK], sessions: [SESSION] });
    });

    it("rolls back storage and never calls applyToLiveStore if the write fails", async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));
      const backup = buildBackup({ records: [], events: [], talks: [], sessions: [] });
      const apply = jest.fn();
      (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(new Error("disk full"));

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

      // Storage rolled back to the pre-import snapshot — never left holding
      // the imported data while the live app failed to pick it up.
      expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
    });

    it("still works when applyToLiveStore is omitted (backward compatible)", async () => {
      const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
      await expect(performImport(backup)).resolves.toBeUndefined();
      expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
    });
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
