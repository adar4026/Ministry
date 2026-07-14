// Integration test (TASK_005C): proves the timer's Save actually APPENDS a new
// Session through StoreContext.saveSession — the regression guard for the bug
// where timerToSession minted its own id, routing saveSession down its update
// path and silently dropping the record. Mirrors StoreContext.test.tsx's
// react-test-renderer + AsyncStorage-mock harness; drives useTimer end-to-end.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create } from "react-test-renderer";
import { StoreProvider, useStore } from "@/store/StoreContext";
import { useTimer, type TimerHook } from "@/hooks/useTimer";

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady: (store: Store, timer: TimerHook) => void }) {
  const store = useStore();
  const timer = useTimer();
  onReady(store, timer);
  return null;
}

async function renderTimer() {
  let store: Store | null = null;
  let timer: TimerHook | null = null;
  await act(async () => {
    create(
      <StoreProvider>
        <Harness onReady={(s, t) => { store = s; timer = t; }} />
      </StoreProvider>,
    );
    // Flush async hydration: StoreProvider's usePersistentState + useTimer's getItem.
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  return { store: () => store as unknown as Store, timer: () => timer as unknown as TimerHook };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("useTimer × StoreContext — Save appends a Session (regression)", () => {
  it("start -> elapse -> stop -> save appends exactly one timer Session via saveSession", async () => {
    const T0 = new Date("2026-06-11T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    try {
      const { store, timer } = await renderTimer();
      expect(store().loaded).toBe(true);
      expect(store().sessions).toEqual([]);

      await act(async () => { timer().start(); });
      // Advance the wall clock 125s so a real active segment is banked.
      await act(async () => { jest.setSystemTime(new Date(T0.getTime() + 125_000)); });
      await act(async () => { timer().stop(); });
      expect(timer().state.bankedSeconds).toBe(125);
      expect(timer().prefillMin).toBe(3); // ceil(125/60)

      await act(async () => {
        timer().save({ date: "2026-06-11", durationMinutes: timer().prefillMin, note: "outing" });
        await Promise.resolve();
      });

      // The record must be APPENDED (create branch), not dropped by an update.
      const sessions = store().sessions;
      expect(sessions).toHaveLength(1);
      const s = sessions[0];
      expect(s.id).toBeTruthy();            // minted by StoreContext, not the timer
      expect(s.source).toBe("timer");
      expect(s.date).toBe("2026-06-11");
      expect(s.durationMinutes).toBe(3);
      expect(s.startTime).toBe(T0.toISOString());
      expect(s.endTime).toBe(new Date(T0.getTime() + 125_000).toISOString());
      expect(s.note).toBe("outing");
      expect(s.createdAt).toBeTruthy();
      expect(s.updatedAt).toBe(s.createdAt);

      // Timer resets to idle after a successful save.
      expect(timer().mode).toBe("idle");
      expect(timer().state.status).toBe("idle");
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not append when banked time is zero (Save is a no-op)", async () => {
    const T0 = new Date("2026-06-11T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    try {
      const { store, timer } = await renderTimer();
      await act(async () => { timer().start(); });
      await act(async () => { timer().stop(); }); // no elapsed -> banked 0
      expect(timer().state.bankedSeconds).toBe(0);
      await act(async () => {
        timer().save({ date: "2026-06-11", durationMinutes: 1 });
        await Promise.resolve();
      });
      expect(store().sessions).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
