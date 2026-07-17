// Unit tests for TASK_005A's Session CRUD wiring in StoreContext, mirroring
// the existing records/saveRecord/deleteRecord pattern. Uses AsyncStorage's
// official jest mock (@react-native-async-storage/async-storage/jest/async-storage-mock)
// and react-test-renderer to drive the hook without any UI.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create } from "react-test-renderer";
import { StoreProvider, useStore } from "@/store/StoreContext";

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady: (store: Store) => void }) {
  const store = useStore();
  onReady(store);
  return null;
}

async function renderStore(): Promise<{ get: () => Store }> {
  let latest: Store | null = null;
  await act(async () => {
    create(
      <StoreProvider>
        <Harness onReady={(s) => { latest = s; }} />
      </StoreProvider>,
    );
    // Flush the async AsyncStorage.getItem() hydration in usePersistentState.
    await Promise.resolve();
    await Promise.resolve();
  });
  return { get: () => latest as unknown as Store };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("StoreContext — Session CRUD", () => {
  it("starts with an empty sessions array (no seed data for Session)", async () => {
    const { get } = await renderStore();
    expect(get().loaded).toBe(true);
    expect(get().sessions).toEqual([]);
  });

  it("saveSession without an id creates a new Session with generated id/createdAt/updatedAt", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().saveSession({ date: "2026-06-10", durationMinutes: 90, source: "manual", note: "test" });
    });
    expect(get().sessions).toHaveLength(1);
    const s = get().sessions[0];
    expect(s.id).toBeTruthy();
    expect(s.date).toBe("2026-06-10");
    expect(s.durationMinutes).toBe(90);
    expect(s.source).toBe("manual");
    expect(s.note).toBe("test");
    expect(s.createdAt).toBeTruthy();
    expect(s.updatedAt).toBe(s.createdAt);
  });

  it("saveSession with an id updates the existing Session, preserving createdAt", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().saveSession({ date: "2026-06-10", durationMinutes: 90, source: "manual" });
    });
    const original = get().sessions[0];

    await act(async () => {
      get().saveSession({ id: original.id, date: "2026-06-10", durationMinutes: 120, source: "manual", note: "edited" });
    });
    expect(get().sessions).toHaveLength(1);
    const updated = get().sessions[0];
    expect(updated.id).toBe(original.id);
    expect(updated.durationMinutes).toBe(120);
    expect(updated.note).toBe("edited");
    expect(updated.createdAt).toBe(original.createdAt);
  });

  it("deleteSession removes only the targeted Session", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().saveSession({ date: "2026-06-10", durationMinutes: 60, source: "manual" });
      get().saveSession({ date: "2026-06-11", durationMinutes: 30, source: "timer", startTime: "2026-06-11T10:00:00.000Z", endTime: "2026-06-11T10:30:00.000Z" });
    });
    expect(get().sessions).toHaveLength(2);
    const toDelete = get().sessions[0].id;

    await act(async () => {
      get().deleteSession(toDelete);
    });
    expect(get().sessions).toHaveLength(1);
    expect(get().sessions.find((s) => s.id === toDelete)).toBeUndefined();
  });

  it("persists sessions to AsyncStorage under mj_sessions_v1", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().saveSession({ date: "2026-06-10", durationMinutes: 45, source: "manual" });
    });
    await act(async () => {
      await Promise.resolve();
    });
    const raw = await AsyncStorage.getItem("mj_sessions_v1");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].durationMinutes).toBe(45);
  });
});

// TASK_009: src/data/seed.js's SEED_RECORDS/SEED_EVENTS/SEED_TALKS are now
// empty arrays. These tests prove existing device data still loads ahead of
// the empty seed, that a fresh install starts empty, and that a second
// launch neither duplicates nor resets data.
describe("StoreContext — TASK_009 empty-seed behavior", () => {
  const FIXTURE_RECORD = { id: "fx-r1", year: 2030, month: 1, hours: 5, note: "fixture" };
  const FIXTURE_EVENT = { id: "fx-e1", date: "2030-01-01", title: "Fixture Event", category: "other" };
  const FIXTURE_TALK = { id: "fx-t1", date: "2030-01-01", number: 1, title: "Fixture Talk", location: "Fixture" };

  describe("existing-data preservation", () => {
    beforeEach(async () => {
      await AsyncStorage.setItem("mj_records_v1", JSON.stringify([FIXTURE_RECORD]));
      await AsyncStorage.setItem("mj_events_v1", JSON.stringify([FIXTURE_EVENT]));
      await AsyncStorage.setItem("mj_talks_v1", JSON.stringify([FIXTURE_TALK]));
    });

    it("loads stored records/events/talks unchanged instead of the empty seed", async () => {
      const { get } = await renderStore();
      expect(get().loaded).toBe(true);
      expect(get().records).toEqual([FIXTURE_RECORD]);
      expect(get().events).toEqual([FIXTURE_EVENT]);
      expect(get().talks).toEqual([FIXTURE_TALK]);
    });

    it("does not overwrite stored data with the empty seed after hydration", async () => {
      const { get } = await renderStore();
      await act(async () => {
        await Promise.resolve();
      });
      const rawRecords = await AsyncStorage.getItem("mj_records_v1");
      const rawEvents = await AsyncStorage.getItem("mj_events_v1");
      const rawTalks = await AsyncStorage.getItem("mj_talks_v1");
      expect(JSON.parse(rawRecords as string)).toEqual([FIXTURE_RECORD]);
      expect(JSON.parse(rawEvents as string)).toEqual([FIXTURE_EVENT]);
      expect(JSON.parse(rawTalks as string)).toEqual([FIXTURE_TALK]);
      expect(get().records).toEqual([FIXTURE_RECORD]);
    });
  });

  describe("empty first run", () => {
    it("starts records/events/talks/sessions all empty with storage cleared", async () => {
      const { get } = await renderStore();
      expect(get().loaded).toBe(true);
      expect(get().records).toEqual([]);
      expect(get().events).toEqual([]);
      expect(get().talks).toEqual([]);
      expect(get().sessions).toEqual([]);
    });

    it("persists empty-array JSON for records/events/talks on first run", async () => {
      await renderStore();
      const rawRecords = await AsyncStorage.getItem("mj_records_v1");
      const rawEvents = await AsyncStorage.getItem("mj_events_v1");
      const rawTalks = await AsyncStorage.getItem("mj_talks_v1");
      expect(JSON.parse(rawRecords as string)).toEqual([]);
      expect(JSON.parse(rawEvents as string)).toEqual([]);
      expect(JSON.parse(rawTalks as string)).toEqual([]);
    });
  });

  describe("second launch", () => {
    it("stays empty, non-duplicated, and non-reset across a remount against the same storage", async () => {
      const first = await renderStore();
      expect(first.get().records).toEqual([]);
      await act(async () => {
        await Promise.resolve();
      });

      const second = await renderStore();
      expect(second.get().loaded).toBe(true);
      expect(second.get().records).toEqual([]);
      expect(second.get().events).toEqual([]);
      expect(second.get().talks).toEqual([]);
      expect(second.get().sessions).toEqual([]);

      const rawRecords = await AsyncStorage.getItem("mj_records_v1");
      const rawEvents = await AsyncStorage.getItem("mj_events_v1");
      const rawTalks = await AsyncStorage.getItem("mj_talks_v1");
      expect(JSON.parse(rawRecords as string)).toEqual([]);
      expect(JSON.parse(rawEvents as string)).toEqual([]);
      expect(JSON.parse(rawTalks as string)).toEqual([]);
    });
  });
});
