// TASK_073 — the `hours` route presents the participation journal for a
// publisher and the unchanged Hours dashboard for a pioneer.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, STORAGE_KEYS, useStore } from "@/store/StoreContext";
import { TimerHeroCard } from "@/components/hours/TimerHeroCard";
import HoursDashboard from "../index";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.setTimeout(30000);

type Store = ReturnType<typeof useStore>;
function Harness({ onReady }: { onReady: (s: Store) => void }) {
  onReady(useStore());
  return null;
}
function texts(r: ReactTestRenderer): string[] {
  return r.root.findAllByType(Text).map((n) => n.props.children).flat().filter((c): c is string => typeof c === "string");
}
async function render() {
  let renderer!: ReactTestRenderer;
  let store!: Store;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => (store = s)} />
        <HoursDashboard />
      </StoreProvider>,
    );
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  return { renderer, store: () => store };
}
const mark = (date: string, id = date) => ({ id, date, participated: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });

beforeEach(async () => AsyncStorage.clear());

describe("hours tab — publisher journal", () => {
  beforeEach(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ministryMode: "publisher", monthlyHourGoal: 50 }));
  });

  it("shows «Служение», groups marks by month (newest first) with distinct-day counts, and no hours UI", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.participation,
      JSON.stringify([mark("2026-08-03"), mark("2026-09-20"), mark("2026-09-17"), mark("2026-09-20", "dup")]),
    );
    const { renderer } = await render();
    const t = texts(renderer);
    expect(t).toContain("Служение");
    expect(t).toContain("Журнал участия");
    expect(t).not.toContain("Часы");
    expect(t).not.toContain("Учёт служебного времени");
    expect(renderer.root.findAllByType(TimerHeroCard)).toHaveLength(0);
    const months = renderer.root.findAll((n) => typeof n.props.testID === "string" && n.props.testID.startsWith("journal-month-") && typeof n.type === "string");
    expect(months.map((m) => m.props.testID)).toEqual(["journal-month-2026-09", "journal-month-2026-08"]);
    expect(t).toContain("2 дня");
    expect(t).toContain("1 день");
    expect(t).toContain("20 сентября");
    expect(t).toContain("17 сентября");
    expect(t.filter((x) => x === "Служил")).toHaveLength(3); // one row per distinct date
  });

  it("tapping a row opens the sheet in edit mode; deleting removes the mark", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.participation, JSON.stringify([mark("2026-09-17"), mark("2026-09-10")]));
    const { renderer, store } = await render();
    await act(async () => renderer.root.findByProps({ testID: "participation-row-2026-09-17" }).props.onPress());
    expect(texts(renderer)).toContain("Сохранить");
    expect(texts(renderer)).toContain("Удалить отметку");
    // confirmAsync → Alert on iOS: auto-confirm.
    const { Alert } = require("react-native");
    const spy = jest.spyOn(Alert, "alert").mockImplementation((...args: unknown[]) => {
      const buttons = args[2] as Array<{ style?: string; onPress?: () => void }> | undefined;
      buttons?.find((b) => b.style === "destructive")?.onPress?.();
    });
    await act(async () => renderer.root.findByProps({ testID: "participation-delete" }).props.onPress());
    spy.mockRestore();
    expect(store().participation.map((p) => p.date)).toEqual(["2026-09-10"]);
  });

  it("empty journal shows a neutral empty state and the mark button", async () => {
    const { renderer } = await render();
    expect(texts(renderer)).toContain("Отметок пока нет");
    expect(renderer.root.findAllByProps({ testID: "journal-mark-button" }).length).toBeGreaterThan(0);
  });
});

describe("hours tab — pioneer stays the Hours dashboard", () => {
  it("renders «Часы» with the timer for the default (migrated) settings", async () => {
    const { renderer } = await render();
    expect(texts(renderer)).toContain("Часы");
    expect(renderer.root.findAllByType(TimerHeroCard)).toHaveLength(1);
    expect(renderer.root.findAllByProps({ testID: "participation-journal" })).toHaveLength(0);
  });
});
