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
//
// Dates are DERIVED from the current date, never hardcoded. The fixtures
// used to be pinned to the month this file was written in (session
// 2026-07-10, record 2026-03), which made the "no longer 0 ч" assertion
// below pass only while the machine clock was inside July 2026: the Home
// hero card's headline is hoursForMonth(records, now, sessions), so a
// session dated in any OTHER month contributes nothing to it and the
// headline stays "0 ч". Nothing about timezones was involved — the
// aggregation path (parseISOYearMonth -> sessionsForMonth) parses the ISO
// day as a string and never constructs a Date — it was purely the fixture
// data drifting out of the window the assertion describes.
const NOW = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Today. The only kind of session that can move the hero card's headline
// off "0 ч" is one inside the current month — that is exactly the condition
// the assertion is about, so the fixture has to guarantee it rather than
// hope for it.
const CURRENT_MONTH_DAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
// Six months back, day 5 — always a real calendar date (JS normalizes the
// negative month) and always strictly in the past, which is what
// "Последние события" (events filtered to date <= today) and the legacy
// HourRecord path (legacyEntryBlockReason refuses the current month) need.
const PAST_DAY = new Date(NOW.getFullYear(), NOW.getMonth() - 6, 5);

const SYNTHETIC_RECORD: HourRecord = {
  id: "synt-r1",
  year: PAST_DAY.getFullYear(),
  month: PAST_DAY.getMonth() + 1,
  hours: 44,
  note: "",
};
const SYNTHETIC_EVENT: MinistryEvent = {
  id: "synt-e1",
  date: isoDay(PAST_DAY),
  title: "Synthetic import event",
  category: "personal",
};
const SYNTHETIC_SESSION: Session = {
  id: "synt-s1",
  date: isoDay(CURRENT_MONTH_DAY),
  durationMinutes: 90,
  note: "",
  source: "manual",
  createdAt: `${isoDay(CURRENT_MONTH_DAY)}T10:00:00.000Z`,
  updatedAt: `${isoDay(CURRENT_MONTH_DAY)}T10:00:00.000Z`,
};

// Guards the derivation itself, so a future edit that re-pins a fixture to
// a literal date fails here with a clear reason instead of failing the
// assertion it silently invalidates.
describe("test fixtures are anchored to the current date", () => {
  it("puts the session in the current month, so it reaches the hero card's headline", () => {
    expect(SYNTHETIC_SESSION.date.slice(0, 7)).toBe(`${NOW.getFullYear()}-${pad(NOW.getMonth() + 1)}`);
  });

  it("puts the event and the legacy record strictly in the past", () => {
    expect(SYNTHETIC_EVENT.date < isoDay(NOW)).toBe(true);
    const recordMonth = SYNTHETIC_RECORD.year * 12 + SYNTHETIC_RECORD.month;
    expect(recordMonth).toBeLessThan(NOW.getFullYear() * 12 + NOW.getMonth() + 1);
  });
});

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
    // Stronger than the negative above: the headline is the imported
    // session's own 90 minutes, not merely "something other than zero".
    expect(texts).toContain("1 ч 30 м");
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
