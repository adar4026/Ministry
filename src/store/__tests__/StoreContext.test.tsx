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

// TASK_042 — Profile hero card storage. Mirrors the Session CRUD suite
// above: empty-by-default seed, no baptism/pioneer preset fields, a single
// full-replace saveProfile(), and the 4-event cap enforced in the data layer
// itself (not just the UI) so no caller can ever persist a 5th event.
describe("StoreContext — Profile (TASK_042)", () => {
  it("starts with an empty profile — no name, no photo, no preset events", async () => {
    const { get } = await renderStore();
    expect(get().loaded).toBe(true);
    expect(get().profile).toEqual({ events: [] });
  });

  it("never seeds baptism/pioneer/move as default events", async () => {
    const { get } = await renderStore();
    const titles = get().profile.events.map((e) => e.title.toLowerCase());
    expect(titles).not.toEqual(expect.arrayContaining([expect.stringContaining("крещен")]));
    expect(titles).not.toEqual(expect.arrayContaining([expect.stringContaining("пионер")]));
  });

  it("saveProfile sets displayName, photo, and events", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().saveProfile({
        displayName: "Александр",
        profilePhotoUri: "file:///photo.jpg",
        events: [{ title: "Крещение", date: "2016-08-15" }],
      });
    });
    expect(get().profile.displayName).toBe("Александр");
    expect(get().profile.profilePhotoUri).toBe("file:///photo.jpg");
    expect(get().profile.events).toHaveLength(1);
    expect(get().profile.events[0].title).toBe("Крещение");
    expect(get().profile.events[0].id).toBeTruthy();
  });

  it("trims displayName and drops it to undefined when blank/whitespace-only", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().saveProfile({ displayName: "   ", events: [] });
    });
    expect(get().profile.displayName).toBeUndefined();
  });

  it("trims a padded displayName", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().saveProfile({ displayName: "  Александр  ", events: [] });
    });
    expect(get().profile.displayName).toBe("Александр");
  });

  it("caps events at 3 even if the caller passes more", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().saveProfile({
        events: [
          { title: "A", date: "2020-01-01" },
          { title: "B", date: "2020-01-02" },
          { title: "C", date: "2020-01-03" },
          { title: "D", date: "2020-01-04" },
          { title: "E", date: "2020-01-05" },
        ],
      });
    });
    expect(get().profile.events).toHaveLength(3);
    expect(get().profile.events.map((e) => e.title)).toEqual(["A", "B", "C"]);
  });

  it("preserves an existing event's id when it is passed back unchanged", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().saveProfile({ events: [{ title: "Пионер", date: "2022-09-01" }] });
    });
    const firstId = get().profile.events[0].id;

    await act(async () => {
      get().saveProfile({ events: [{ id: firstId, title: "Пионер (изменено)", date: "2022-09-01" }] });
    });
    expect(get().profile.events).toHaveLength(1);
    expect(get().profile.events[0].id).toBe(firstId);
    expect(get().profile.events[0].title).toBe("Пионер (изменено)");
  });

  it("persists the profile to AsyncStorage under mj_profile_v1", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().saveProfile({ displayName: "Тест", events: [] });
    });
    await act(async () => {
      await Promise.resolve();
    });
    const raw = await AsyncStorage.getItem("mj_profile_v1");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).displayName).toBe("Тест");
  });

  // TASK_042 revision — the previous (uncommitted, never-shipped) draft used
  // a 4-event limit; this proves a profile already persisted with 4 events
  // is safely normalized down to 3 on load, keeping the first three in order.
  it("normalizes a previously-saved 4-event profile down to the current 3-event limit on load", async () => {
    await AsyncStorage.setItem(
      "mj_profile_v1",
      JSON.stringify({
        displayName: "Александр",
        events: [
          { id: "1", title: "A", date: "2020-01-01" },
          { id: "2", title: "B", date: "2020-01-02" },
          { id: "3", title: "C", date: "2020-01-03" },
          { id: "4", title: "D", date: "2020-01-04" },
        ],
      }),
    );
    const { get } = await renderStore();
    expect(get().profile.events).toHaveLength(3);
    expect(get().profile.events.map((e) => e.id)).toEqual(["1", "2", "3"]);

    await act(async () => {
      await Promise.resolve();
    });
    const raw = await AsyncStorage.getItem("mj_profile_v1");
    expect(JSON.parse(raw as string).events).toHaveLength(3);
  });

  it("does not touch a profile already within the 3-event limit", async () => {
    const threeEvents = [
      { id: "1", title: "A", date: "2020-01-01" },
      { id: "2", title: "B", date: "2020-01-02" },
      { id: "3", title: "C", date: "2020-01-03" },
    ];
    await AsyncStorage.setItem("mj_profile_v1", JSON.stringify({ events: threeEvents }));
    const { get } = await renderStore();
    expect(get().profile.events).toEqual(threeEvents);
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

// TASK_045 — user-created event topics. System categories/`CAT` are
// unaffected; this is purely the new customCategories collection + its one
// mutator, addCustomCategory().
describe("StoreContext — addCustomCategory (TASK_045)", () => {
  it("starts with an empty customCategories array", async () => {
    const { get } = await renderStore();
    expect(get().loaded).toBe(true);
    expect(get().customCategories).toEqual([]);
  });

  it("creates a new topic with a generated id", async () => {
    const { get } = await renderStore();
    let result: ReturnType<Store["addCustomCategory"]>;
    await act(async () => {
      result = get().addCustomCategory("Конгрессы");
    });
    expect(result!.ok).toBe(true);
    expect(get().customCategories).toHaveLength(1);
    expect(get().customCategories[0].name).toBe("Конгрессы");
    expect(get().customCategories[0].id).toBeTruthy();
  });

  it("trims surrounding whitespace and collapses internal runs before saving", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().addCustomCategory("  Особые   дни  ");
    });
    expect(get().customCategories[0].name).toBe("Особые дни");
  });

  it("rejects an empty name", async () => {
    const { get } = await renderStore();
    let result: ReturnType<Store["addCustomCategory"]>;
    await act(async () => {
      result = get().addCustomCategory("");
    });
    expect(result!).toEqual({ ok: false, error: "empty" });
    expect(get().customCategories).toEqual([]);
  });

  it("rejects a whitespace-only name", async () => {
    const { get } = await renderStore();
    let result: ReturnType<Store["addCustomCategory"]>;
    await act(async () => {
      result = get().addCustomCategory("   ");
    });
    expect(result!).toEqual({ ok: false, error: "empty" });
    expect(get().customCategories).toEqual([]);
  });

  it("rejects a duplicate of an existing custom topic, case/whitespace-insensitively", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().addCustomCategory("Поездки");
    });
    let result: ReturnType<Store["addCustomCategory"]>;
    await act(async () => {
      result = get().addCustomCategory("  поездки  ");
    });
    expect(result!).toEqual({ ok: false, error: "duplicate" });
    expect(get().customCategories).toHaveLength(1);
  });

  it("rejects a name that duplicates an existing system category label", async () => {
    const { get } = await renderStore();
    let result: ReturnType<Store["addCustomCategory"]>;
    await act(async () => {
      // "Пионер" is CAT.pioneer's label — a custom topic must not shadow it.
      result = get().addCustomCategory("пионер");
    });
    expect(result!).toEqual({ ok: false, error: "duplicate" });
    expect(get().customCategories).toEqual([]);
  });

  it("persists customCategories to AsyncStorage under mj_custom_categories_v1", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().addCustomCategory("Конгрессы");
    });
    await act(async () => {
      await Promise.resolve();
    });
    const raw = await AsyncStorage.getItem("mj_custom_categories_v1");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Конгрессы");
  });

  it("survives a simulated app restart (remount against the same storage)", async () => {
    const first = await renderStore();
    await act(async () => {
      first.get().addCustomCategory("Собрания");
    });
    await act(async () => {
      await Promise.resolve();
    });

    const second = await renderStore();
    expect(second.get().customCategories).toHaveLength(1);
    expect(second.get().customCategories[0].name).toBe("Собрания");
  });
});

// TASK_013 production bug fix regression tests. Root cause: react-native-web's
// Alert.alert() is a no-op (its entire implementation is `static alert() {}`),
// so the button callback that used to trigger window.location.reload() after
// a successful import never fired — the import wrote correct data to
// AsyncStorage, but the already-mounted StoreContext's live state was never
// refreshed, so Home kept rendering its stale (pre-import) empty state
// forever. The fix: StoreContext.replaceAllData() applies imported data to
// the live context directly, with no reload required. These tests guard
// both halves of that fix: (a) the hydration guard that has always prevented
// a premature empty-array write from clobbering real storage, and (b)
// replaceAllData actually updating and persisting the four collections.
describe("StoreContext — TASK_013 replaceAllData / import rehydration", () => {
  const REAL_RECORD = { id: "real-r1", year: 2026, month: 3, hours: 20, note: "real" };

  it("never persists the initial empty seed before hydration completes", async () => {
    await AsyncStorage.setItem("mj_records_v1", JSON.stringify([REAL_RECORD]));
    // AsyncStorage.setItem is already a jest.fn() (see
    // @react-native-async-storage/async-storage/jest/async-storage-mock.js),
    // so jest.spyOn returns that same object rather than wrapping it — its
    // call history persists across every earlier test in this file (clear it
    // so only this test's calls are inspected below), and mockRestore() on
    // such an object strips its implementation entirely instead of reverting
    // it (breaking every later test's real setItem calls) — since we never
    // override the implementation here, just don't call mockRestore() at all.
    const setItemSpy = jest.spyOn(AsyncStorage, "setItem");
    setItemSpy.mockClear();

    await renderStore();

    // Every setItem call for mj_records_v1 must carry the real (non-empty)
    // value — none may have written "[]" while hydration was still pending
    // (that would be the empty-initial-state-overwrite race described in
    // the bug report).
    const recordsCalls = setItemSpy.mock.calls.filter(([key]) => key === "mj_records_v1");
    expect(recordsCalls.length).toBeGreaterThan(0);
    for (const [, value] of recordsCalls) {
      expect(JSON.parse(value as string)).toEqual([REAL_RECORD]);
    }
  });

  it("existing storage survives StoreContext mount unchanged", async () => {
    await AsyncStorage.setItem("mj_records_v1", JSON.stringify([REAL_RECORD]));
    const { get } = await renderStore();
    expect(get().records).toEqual([REAL_RECORD]);
    expect(JSON.parse((await AsyncStorage.getItem("mj_records_v1"))!)).toEqual([REAL_RECORD]);
  });

  it("replaceAllData updates all four active context collections", async () => {
    const { get } = await renderStore();
    const newRecord = { id: "new-r1", year: 2026, month: 7, hours: 8, note: "" };
    const newEvent = { id: "new-e1", date: "2026-07-01", title: "New event", category: "personal" as const };
    const newTalk = { id: "new-t1", date: "2026-07-02", number: 5, title: "New talk", location: "Hall" };
    const newSession = {
      id: "new-s1",
      date: "2026-07-03",
      durationMinutes: 60,
      note: "",
      source: "manual" as const,
      createdAt: "2026-07-03T10:00:00.000Z",
      updatedAt: "2026-07-03T10:00:00.000Z",
    };

    await act(async () => {
      get().replaceAllData({ records: [newRecord], events: [newEvent], talks: [newTalk], sessions: [newSession] });
    });

    expect(get().records).toEqual([newRecord]);
    expect(get().events).toEqual([newEvent]);
    expect(get().talks).toEqual([newTalk]);
    expect(get().sessions).toEqual([newSession]);
  });

  it("imported data applied via replaceAllData persists and survives a simulated remount/reload", async () => {
    const { get } = await renderStore();
    const newRecord = { id: "persist-r1", year: 2026, month: 8, hours: 15, note: "" };

    await act(async () => {
      get().replaceAllData({ records: [newRecord], events: [], talks: [], sessions: [] });
    });
    await act(async () => {
      await Promise.resolve(); // flush the persistence effect
    });

    // Simulate a full page reload: mount a brand new StoreProvider instance
    // against the same (mocked) AsyncStorage backing store.
    const remounted = await renderStore();
    expect(remounted.get().records).toEqual([newRecord]);
  });
});
