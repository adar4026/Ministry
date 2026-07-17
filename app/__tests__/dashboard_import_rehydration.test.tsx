// TASK_013 production bug regression: an import that wrote correct data to
// AsyncStorage was followed by an empty Home screen on the installed iOS
// PWA, because success previously relied on react-native-web's Alert.alert()
// invoking an onPress callback that triggered window.location.reload() —
// but Alert.alert is a total no-op on web, so that callback never fired.
// These tests render the ACTUAL Home screen (Dashboard) under a real
// StoreProvider and prove that calling StoreContext.replaceAllData() (what
// BackupSection now does as part of a successful import) makes
// "Текущий служебный год" and "Последние события" appear with the imported
// data immediately, in the same mount — no reload required — and that the
// data still shows after a genuine remount (simulating an actual reload).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create } from "react-test-renderer";
import { Text } from "react-native";
import { StoreProvider, useStore } from "@/store/StoreContext";
import type { HourRecord, MinistryEvent, Session } from "@/types";
import Dashboard from "../(tabs)/index";

beforeEach(async () => {
  await AsyncStorage.clear();
});

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady: (store: Store) => void }) {
  const store = useStore();
  onReady(store);
  return <Dashboard />;
}

async function renderDashboard(): Promise<{ renderer: ReturnType<typeof create>; get: () => Store }> {
  let latest: Store | null = null;
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => { latest = s; }} />
      </StoreProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return { renderer, get: () => latest as unknown as Store };
}

function allTexts(renderer: ReturnType<typeof create>): string[] {
  return renderer.root
    .findAllByType(Text)
    .map((n) => n.props.children)
    .filter((c): c is string => typeof c === "string");
}

// Synthetic data mimicking the shape of a real (legacy + session-based)
// backup — not the user's actual data.
const SYNTHETIC_RECORD: HourRecord = { id: "synt-r1", year: 2026, month: 3, hours: 44, note: "" };
const SYNTHETIC_EVENT: MinistryEvent = { id: "synt-e1", date: "2026-01-05", title: "Synthetic import event", category: "personal" };
const SYNTHETIC_SESSION: Session = {
  id: "synt-s1",
  date: "2026-07-10",
  durationMinutes: 90,
  note: "",
  source: "manual",
  createdAt: "2026-07-10T10:00:00.000Z",
  updatedAt: "2026-07-10T10:00:00.000Z",
};

describe("Dashboard (Home) — reflects imported data via replaceAllData, no reload", () => {
  it("shows the empty state before any import", async () => {
    const { renderer } = await renderDashboard();
    const texts = allTexts(renderer);
    expect(texts).not.toContain("Текущий служебный год");
    expect(texts.some((t) => t.includes("Synthetic import event"))).toBe(false);
  });

  it("shows non-zero totals, Текущий служебный год, and Последние события immediately after replaceAllData — same mount, no reload", async () => {
    const { renderer, get } = await renderDashboard();

    await act(async () => {
      get().replaceAllData({
        records: [SYNTHETIC_RECORD],
        events: [SYNTHETIC_EVENT],
        talks: [],
        sessions: [SYNTHETIC_SESSION],
      });
    });

    const texts = allTexts(renderer);
    expect(texts).toContain("Текущий служебный год");
    expect(texts.some((t) => t.includes("Synthetic import event"))).toBe(true);
    // "0 ч" (the pre-import empty-state total) must no longer be the
    // headline figure once a session contributes hours for the current month.
    expect(texts).not.toContain("0 ч");
  });

  it("keeps showing the imported data after a simulated remount/reload", async () => {
    const { get } = await renderDashboard();
    await act(async () => {
      get().replaceAllData({
        records: [SYNTHETIC_RECORD],
        events: [SYNTHETIC_EVENT],
        talks: [],
        sessions: [SYNTHETIC_SESSION],
      });
    });
    await act(async () => {
      await Promise.resolve(); // flush persistence effects
    });

    const { renderer: remounted } = await renderDashboard();
    const texts = allTexts(remounted);
    expect(texts).toContain("Текущий служебный год");
    expect(texts.some((t) => t.includes("Synthetic import event"))).toBe(true);
  });
});
