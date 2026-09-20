// TASK_073 — regression suite for the ministry-mode migration and the
// participation model, against the real StoreProvider + AsyncStorage mock.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create } from "react-test-renderer";
import { StoreProvider, STORAGE_KEYS, useStore } from "@/store/StoreContext";
import { MONTHLY_GOAL, toISODate } from "@/data/constants";
import { participationDaysInMonth } from "@/data/participation";
import type { HourRecord, Session } from "@/types";

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady: (store: Store) => void }) {
  onReady(useStore());
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
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  return { get: () => latest as unknown as Store };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

const RECORD: HourRecord = { id: "r1", year: 2026, month: 8, hours: 44, note: "" };
const SESSION: Session = {
  id: "s1", date: "2026-09-10", durationMinutes: 120, note: "", source: "manual",
  createdAt: "2026-09-10T10:00:00.000Z", updatedAt: "2026-09-10T10:00:00.000Z",
};

// Only the pre-TASK_073 keys exist — no mj_settings_v1, no mj_participation_v1.
async function seedLegacyInstallation() {
  await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));
  await AsyncStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([SESSION]));
  await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify({ displayName: "A", events: [] }));
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("existing user migration", () => {
  it("old data without ministryMode hydrates as pioneer with the 50-hour goal, data intact", async () => {
    await seedLegacyInstallation();
    const { get } = await renderStore();
    expect(get().loaded).toBe(true);
    expect(get().settings).toEqual({ ministryMode: "pioneer", monthlyHourGoal: MONTHLY_GOAL });
    expect(get().participation).toEqual([]);
    expect(get().records).toEqual([RECORD]);
    expect(get().sessions).toEqual([SESSION]);
  });

  it("is non-destructive: the old keys are byte-identical after hydration, only the two new keys are added", async () => {
    await seedLegacyInstallation();
    const before = Object.fromEntries(await AsyncStorage.multiGet(await AsyncStorage.getAllKeys()));
    await renderStore();
    await flush();
    const after = Object.fromEntries(await AsyncStorage.multiGet(await AsyncStorage.getAllKeys()));
    for (const k of Object.keys(before)) expect(after[k]).toBe(before[k]);
    expect(JSON.parse(after[STORAGE_KEYS.settings]!)).toEqual({ ministryMode: "pioneer", monthlyHourGoal: 50 });
    expect(JSON.parse(after[STORAGE_KEYS.participation]!)).toEqual([]);
  });

  it("repairs a partial/corrupt settings object to safe defaults without touching other keys", async () => {
    await seedLegacyInstallation();
    await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ monthlyHourGoal: "fifty" }));
    const { get } = await renderStore();
    expect(get().settings).toEqual({ ministryMode: "pioneer", monthlyHourGoal: 50 });
    await flush();
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.settings))!)).toEqual({ ministryMode: "pioneer", monthlyHourGoal: 50 });
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
  });

  it("a stored publisher setting is respected on the next launch", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ministryMode: "publisher", monthlyHourGoal: 50 }));
    const { get } = await renderStore();
    expect(get().settings.ministryMode).toBe("publisher");
  });
});

describe("mode switching is reversible and keeps hours + goal", () => {
  it("Pioneer → Publisher keeps hours in storage; Publisher → Pioneer shows them again", async () => {
    await seedLegacyInstallation();
    const { get } = await renderStore();
    await act(async () => get().setMinistryMode("publisher"));
    expect(get().settings.ministryMode).toBe("publisher");
    expect(get().records).toEqual([RECORD]);
    expect(get().sessions).toEqual([SESSION]);
    await flush();
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.sessions))!)).toEqual([SESSION]);

    await act(async () => get().setMinistryMode("pioneer"));
    expect(get().settings.ministryMode).toBe("pioneer");
    expect(get().sessions).toEqual([SESSION]);
  });

  it("Special pioneer stores its own mode", async () => {
    const { get } = await renderStore();
    await act(async () => get().setMinistryMode("specialPioneer"));
    expect(get().settings.ministryMode).toBe("specialPioneer");
    await flush();
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.settings))!).ministryMode).toBe("specialPioneer");
  });

  it("goal persistence: Pioneer 50 → Publisher → Pioneer is still 50; a custom goal survives too", async () => {
    const { get } = await renderStore();
    expect(get().settings.monthlyHourGoal).toBe(50);
    await act(async () => get().setMinistryMode("publisher"));
    await act(async () => get().setMinistryMode("pioneer"));
    expect(get().settings.monthlyHourGoal).toBe(50);

    await act(async () => get().setMonthlyHourGoal(70));
    await act(async () => get().setMinistryMode("publisher"));
    expect(get().settings.monthlyHourGoal).toBe(70);
    await act(async () => get().setMinistryMode("specialPioneer"));
    expect(get().settings).toEqual({ ministryMode: "specialPioneer", monthlyHourGoal: 70 });
  });

  it("setMonthlyHourGoal accepts any whole number in range or null, rejects junk", async () => {
    const { get } = await renderStore();
    await act(async () => get().setMonthlyHourGoal(30));
    expect(get().settings.monthlyHourGoal).toBe(30);
    await act(async () => get().setMonthlyHourGoal(600));
    expect(get().settings.monthlyHourGoal).toBe(600);
    await act(async () => get().setMonthlyHourGoal(null));
    expect(get().settings.monthlyHourGoal).toBeNull();
    await act(async () => get().setMonthlyHourGoal(-1));
    expect(get().settings.monthlyHourGoal).toBeNull();
    await act(async () => get().setMonthlyHourGoal(2.5));
    expect(get().settings.monthlyHourGoal).toBeNull();
  });

  it("switching mode never converts hours to participation or participation to hours", async () => {
    await seedLegacyInstallation();
    const { get } = await renderStore();
    await act(async () => get().setMinistryMode("publisher"));
    expect(get().participation).toEqual([]);
    await act(async () => { get().markParticipation("2026-09-05", new Date(2026, 8, 20)); });
    await act(async () => get().setMinistryMode("pioneer"));
    expect(get().sessions).toEqual([SESSION]);
    expect(get().participation).toHaveLength(1);
  });
});

describe("participation model", () => {
  const NOW = new Date(2026, 8, 20, 12, 0, 0);

  it("marks a day once: a duplicate is a no-op that does not add a second day", async () => {
    const { get } = await renderStore();
    let r1!: ReturnType<Store["markParticipation"]>;
    let r2!: ReturnType<Store["markParticipation"]>;
    await act(async () => { r1 = get().markParticipation("2026-09-20", NOW); });
    await act(async () => { r2 = get().markParticipation("2026-09-20", NOW); });
    expect(r1).toMatchObject({ ok: true, created: true });
    expect(r2).toMatchObject({ ok: true, created: false });
    expect(get().participation).toHaveLength(1);
    expect(get().participation[0]).toMatchObject({ date: "2026-09-20", participated: true });
    expect(get().participation[0].id).toBeTruthy();
    expect(get().participation[0].createdAt).toBe(NOW.toISOString());
    expect(participationDaysInMonth(get().participation, 2026, 9)).toBe(1);
  });

  it("persists under mj_participation_v1", async () => {
    const { get } = await renderStore();
    await act(async () => { get().markParticipation("2026-09-19", NOW); });
    await flush();
    const raw = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.participation))!);
    expect(raw).toHaveLength(1);
    expect(raw[0].date).toBe("2026-09-19");
  });

  it("delete reduces the monthly day count", async () => {
    const { get } = await renderStore();
    await act(async () => { get().markParticipation("2026-09-20", NOW); });
    await act(async () => { get().markParticipation("2026-09-17", NOW); });
    expect(participationDaysInMonth(get().participation, 2026, 9)).toBe(2);
    const id = get().participation.find((p) => p.date === "2026-09-17")!.id;
    await act(async () => get().deleteParticipation(id));
    expect(participationDaysInMonth(get().participation, 2026, 9)).toBe(1);
    expect(get().participation.map((p) => p.date)).toEqual(["2026-09-20"]);
  });

  it("refuses a future date (tomorrow) and accepts today", async () => {
    const { get } = await renderStore();
    let r!: ReturnType<Store["markParticipation"]>;
    await act(async () => { r = get().markParticipation("2026-09-21", NOW); });
    expect(r).toEqual({ ok: false, error: "future" });
    expect(get().participation).toEqual([]);
    await act(async () => { r = get().markParticipation(toISODate(NOW), NOW); });
    expect(r.ok).toBe(true);
  });

  it("refuses an invalid day", async () => {
    const { get } = await renderStore();
    let r!: ReturnType<Store["markParticipation"]>;
    await act(async () => { r = get().markParticipation("2026-02-30", NOW); });
    expect(r).toEqual({ ok: false, error: "invalid" });
  });

  it("updateParticipationDate moves a mark, refuses future and already-marked days", async () => {
    const { get } = await renderStore();
    await act(async () => { get().markParticipation("2026-09-20", NOW); });
    await act(async () => { get().markParticipation("2026-09-17", NOW); });
    const id = get().participation.find((p) => p.date === "2026-09-17")!.id;
    let r!: ReturnType<Store["updateParticipationDate"]>;
    await act(async () => { r = get().updateParticipationDate(id, "2026-09-25", NOW); });
    expect(r).toEqual({ ok: false, error: "future" });
    await act(async () => { r = get().updateParticipationDate(id, "2026-09-20", NOW); });
    expect(r).toEqual({ ok: false, error: "duplicate" });
    await act(async () => { r = get().updateParticipationDate(id, "2026-09-15", NOW); });
    expect(r).toMatchObject({ ok: true });
    expect(get().participation.map((p) => p.date).sort()).toEqual(["2026-09-15", "2026-09-20"]);
    const moved = get().participation.find((p) => p.id === id)!;
    expect(moved.updatedAt).toBe(NOW.toISOString());
    await act(async () => { r = get().updateParticipationDate("nope", "2026-09-15", NOW); });
    expect(r).toEqual({ ok: false, error: "missing" });
  });

  it("stored duplicates (e.g. from an old restore) still count as one day", async () => {
    const dup = { id: "a", date: "2026-09-20", participated: true, createdAt: "x", updatedAt: "x" };
    await AsyncStorage.setItem(STORAGE_KEYS.participation, JSON.stringify([dup, { ...dup, id: "b" }]));
    const { get } = await renderStore();
    expect(get().participation).toHaveLength(2);
    expect(participationDaysInMonth(get().participation, 2026, 9)).toBe(1);
  });

  it("a corrupt (non-array) participation key reads as empty", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.participation, JSON.stringify({ oops: 1 }));
    const { get } = await renderStore();
    expect(get().participation).toEqual([]);
  });
});
