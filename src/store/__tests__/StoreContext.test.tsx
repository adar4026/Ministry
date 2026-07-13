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
