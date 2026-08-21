// TASK_059 — end-to-end wiring of event reminders through StoreContext.
//
// The scheduling effect lives in StoreProvider (ADR-003: the store is the one
// place data work happens), so these tests drive the real store and assert on
// what the delivery channel was handed. The channel itself is mocked and
// reports the platform as supported, which is what the effect gates on.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create } from "react-test-renderer";
import { StoreProvider, useStore } from "@/store/StoreContext";
import { reminderId, type ScheduledReminder } from "@/data/notifications";

jest.mock("@/utils/localNotifications", () => ({
  isNotificationSupported: jest.fn(() => true),
  syncReminders: jest.fn(async () => {}),
  getNotificationSupport: jest.fn(() => ({ supported: true })),
  getPermissionState: jest.fn(() => "granted"),
  requestNotificationPermission: jest.fn(async () => "granted"),
  sendTestNotification: jest.fn(async () => {}),
  clearAllReminders: jest.fn(async () => {}),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const channel = require("@/utils/localNotifications") as {
  syncReminders: jest.Mock<Promise<void>, [ScheduledReminder[]]>;
};

type Store = ReturnType<typeof useStore>;

// Far enough ahead that both slots are always in the future, whenever the
// suite happens to run.
function futureISO(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function pastISO(daysAgo: number): string {
  return futureISO(-daysAgo);
}

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
        <Harness
          onReady={(s) => {
            latest = s;
          }}
        />
      </StoreProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return { get: () => latest as unknown as Store };
}

/** The full set handed to the channel by the most recent sync. */
function lastSync(): ScheduledReminder[] {
  const calls = channel.syncReminders.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0];
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("StoreContext — notification settings", () => {
  it("defaults to the master switch off, both kinds pre-selected", async () => {
    const { get } = await renderStore();
    expect(get().notificationSettings).toEqual({ enabled: false, dayBefore: true, sameDay: true });
  });

  it("persists settings to AsyncStorage under mj_notifications_v1", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().saveNotificationSettings({ enabled: true, dayBefore: false, sameDay: true });
      await Promise.resolve();
    });
    expect(get().notificationSettings).toEqual({ enabled: true, dayBefore: false, sameDay: true });
    expect(JSON.parse((await AsyncStorage.getItem("mj_notifications_v1"))!)).toEqual({
      enabled: true,
      dayBefore: false,
      sameDay: true,
    });
  });

  it("rehydrates saved settings on the next app start", async () => {
    await AsyncStorage.setItem(
      "mj_notifications_v1",
      JSON.stringify({ enabled: true, dayBefore: true, sameDay: false }),
    );
    const { get } = await renderStore();
    expect(get().notificationSettings).toEqual({ enabled: true, dayBefore: true, sameDay: false });
  });
});

describe("StoreContext — reminder scheduling", () => {
  async function enabledStore() {
    const store = await renderStore();
    await act(async () => {
      store.get().saveNotificationSettings({ enabled: true, dayBefore: true, sameDay: true });
      await Promise.resolve();
    });
    return store;
  }

  it("schedules nothing while notifications are switched off", async () => {
    const { get } = await renderStore();
    await act(async () => {
      get().saveEvent({ date: futureISO(10), title: "Конгресс", category: "other" });
      await Promise.resolve();
    });
    expect(lastSync()).toEqual([]);
  });

  it("schedules both reminders when an event is created", async () => {
    const { get } = await enabledStore();
    await act(async () => {
      get().saveEvent({ date: futureISO(10), title: "Конгресс", category: "other" });
      await Promise.resolve();
    });
    const id = get().events[0].id;
    expect(lastSync().map((r) => r.id).sort()).toEqual(
      [reminderId(id, "dayBefore"), reminderId(id, "sameDay")].sort(),
    );
  });

  it("cancels the reminders of a deleted event", async () => {
    const { get } = await enabledStore();
    await act(async () => {
      get().saveEvent({ date: futureISO(10), title: "Конгресс", category: "other" });
      await Promise.resolve();
    });
    expect(lastSync()).toHaveLength(2);

    const id = get().events[0].id;
    await act(async () => {
      get().deleteEvent(id);
      await Promise.resolve();
    });
    expect(lastSync()).toEqual([]);
  });

  it("re-creates reminders with the new fire time when the date is edited", async () => {
    const { get } = await enabledStore();
    await act(async () => {
      get().saveEvent({ date: futureISO(10), title: "Конгресс", category: "other" });
      await Promise.resolve();
    });
    const id = get().events[0].id;
    const before = lastSync().map((r) => r.fireAt);

    await act(async () => {
      get().saveEvent({ id, date: futureISO(20), title: "Конгресс", category: "other" });
      await Promise.resolve();
    });
    const after = lastSync();
    expect(after.map((r) => r.id).sort()).toEqual([reminderId(id, "dayBefore"), reminderId(id, "sameDay")].sort());
    expect(after.map((r) => r.fireAt)).not.toEqual(before);
    expect(after).toHaveLength(2); // still two — not four
  });

  it("re-creates reminders with the new text when the title is edited", async () => {
    const { get } = await enabledStore();
    await act(async () => {
      get().saveEvent({ date: futureISO(10), title: "Конгресс", category: "other" });
      await Promise.resolve();
    });
    const id = get().events[0].id;
    await act(async () => {
      get().saveEvent({ id, date: futureISO(10), title: "Областной конгресс", category: "other" });
      await Promise.resolve();
    });
    expect(lastSync().map((r) => r.body)).toEqual(["«Областной конгресс»", "«Областной конгресс»"]);
  });

  it("never schedules anything for a past event", async () => {
    const { get } = await enabledStore();
    await act(async () => {
      get().saveEvent({ date: pastISO(5), title: "Прошедшее", category: "other" });
      await Promise.resolve();
    });
    expect(lastSync()).toEqual([]);
  });

  it("keeps only the future event when past and future events coexist", async () => {
    const { get } = await enabledStore();
    await act(async () => {
      get().saveEvent({ date: pastISO(5), title: "Прошедшее", category: "other" });
      get().saveEvent({ date: futureISO(10), title: "Будущее", category: "other" });
      await Promise.resolve();
    });
    expect(lastSync().every((r) => r.eventTitle === "Будущее")).toBe(true);
    expect(lastSync()).toHaveLength(2);
  });

  it("re-syncs every future event when a single kind is switched off, with no duplicates", async () => {
    const { get } = await enabledStore();
    await act(async () => {
      get().saveEvent({ date: futureISO(10), title: "A", category: "other" });
      get().saveEvent({ date: futureISO(20), title: "B", category: "other" });
      await Promise.resolve();
    });
    expect(lastSync()).toHaveLength(4);

    await act(async () => {
      get().saveNotificationSettings({ enabled: true, dayBefore: false, sameDay: true });
      await Promise.resolve();
    });
    const after = lastSync();
    expect(after).toHaveLength(2);
    expect(after.every((r) => r.kind === "sameDay")).toBe(true);
    expect(new Set(after.map((r) => r.id)).size).toBe(2);
  });

  it("cancels everything for every event when the master switch is turned off", async () => {
    const { get } = await enabledStore();
    await act(async () => {
      get().saveEvent({ date: futureISO(10), title: "A", category: "other" });
      get().saveEvent({ date: futureISO(20), title: "B", category: "other" });
      await Promise.resolve();
    });
    await act(async () => {
      get().saveNotificationSettings({ enabled: false, dayBefore: true, sameDay: true });
      await Promise.resolve();
    });
    expect(lastSync()).toEqual([]);
  });

  it("restores the same set — no duplicates — when the master switch goes off and back on", async () => {
    const { get } = await enabledStore();
    await act(async () => {
      get().saveEvent({ date: futureISO(10), title: "A", category: "other" });
      await Promise.resolve();
    });
    const before = lastSync();

    await act(async () => {
      get().saveNotificationSettings({ enabled: false, dayBefore: true, sameDay: true });
      await Promise.resolve();
      get().saveNotificationSettings({ enabled: true, dayBefore: true, sameDay: true });
      await Promise.resolve();
    });
    const after = lastSync();
    expect(after.map((r) => r.id)).toEqual(before.map((r) => r.id));
    expect(new Set(after.map((r) => r.id)).size).toBe(after.length);
  });

  it("re-syncs after a backup restore replaces the whole event list", async () => {
    const { get } = await enabledStore();
    await act(async () => {
      get().saveEvent({ date: futureISO(10), title: "Старое", category: "other" });
      await Promise.resolve();
    });

    await act(async () => {
      get().replaceAllData({
        records: [],
        talks: [],
        sessions: [],
        events: [{ id: "restored", date: futureISO(30), title: "Восстановленное", category: "other" }],
      });
      await Promise.resolve();
    });
    const after = lastSync();
    expect(after.map((r) => r.id).sort()).toEqual(
      [reminderId("restored", "dayBefore"), reminderId("restored", "sameDay")].sort(),
    );
  });

  it("re-pings the channel on its refresh interval so a killed worker timer still fires", async () => {
    const { get } = await enabledStore();
    await act(async () => {
      get().saveEvent({ date: futureISO(10), title: "A", category: "other" });
      await Promise.resolve();
    });
    const callsBefore = channel.syncReminders.mock.calls.length;
    await act(async () => {
      jest.advanceTimersByTime(60_000);
      await Promise.resolve();
    });
    expect(channel.syncReminders.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(lastSync()).toHaveLength(2); // still exactly two — re-syncs never accumulate
  });
});
