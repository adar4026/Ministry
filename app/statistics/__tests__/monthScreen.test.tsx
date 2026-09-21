// TASK_081 — «Статистика → месяц»: summary, day list, day → existing editor.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, STORAGE_KEYS } from "@/store/StoreContext";
import type { HourRecord, Session } from "@/types";
import StatisticsMonthScreen from "../month/[key]";

const mockPush = jest.fn();
let mockKey: string | undefined = "2026-03";
jest.mock("expo-router", () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), replace: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => ({ key: mockKey }),
}));

let seq = 0;
function session(date: string, durationMinutes: number): Session {
  seq += 1;
  return { id: `s${seq}`, date, durationMinutes, source: "manual", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
}
function record(year: number, month: number, hours: number): HourRecord {
  seq += 1;
  return { id: `r${seq}`, year, month, hours, note: "" };
}
function texts(r: ReactTestRenderer): string[] {
  return r.root.findAllByType(Text).map((n) => n.props.children).flat().filter((c): c is string => typeof c === "string");
}
async function render(sessions: Session[] = [], records: HourRecord[] = []) {
  await AsyncStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
  await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <StatisticsMonthScreen />
      </StoreProvider>,
    );
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
  return renderer;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPush.mockClear();
  mockKey = "2026-03";
});

describe("Статистика за месяц", () => {
  it("shows the month title, total, service days, per-day average and the days in order", async () => {
    const r = await render([session("2026-03-08", 105), session("2026-03-03", 150), session("2026-03-05", 240), session("2026-03-03", 30)]);
    const t = texts(r);
    expect(r.root.findByProps({ testID: "stats-month-title" }).props.children).toBe("Март 2026");
    expect(r.root.findByProps({ testID: "stats-hero" }).props.accessibilityLabel).toBe("Март 2026: 8 ч 45 м");
    expect(r.root.findByProps({ testID: "fact-days" }).props.accessibilityLabel).toBe("Дней служения: 3");
    expect(r.root.findByProps({ testID: "fact-perDay" }).props.accessibilityLabel).toBe("Среднее за день служения: 2 ч 55 м");
    expect(t).toContain("Дни служения");
    const days = r.root.findByProps({ testID: "stats-month-days" });
    const ids = [...new Set(days.findAll((n) => typeof n.props.testID === "string" && n.props.testID.startsWith("stats-day-2026")).map((n) => n.props.testID))];
    expect(ids).toEqual(["stats-day-2026-03-03", "stats-day-2026-03-05", "stats-day-2026-03-08"]);
    expect(r.root.findByProps({ testID: "stats-day-2026-03-03" }).props.accessibilityLabel).toBe("3 марта: 3 ч");
  });

  it("a day with one session opens the existing editor; a day with several offers a picker", async () => {
    const single = session("2026-03-05", 240);
    const a = session("2026-03-03", 150);
    const b = session("2026-03-03", 30);
    const r = await render([single, a, b]);
    await act(async () => r.root.findByProps({ testID: "stats-day-2026-03-05" }).props.onPress());
    expect(mockPush).toHaveBeenCalledWith(`/entry?id=${single.id}`);

    await act(async () => r.root.findByProps({ testID: "stats-day-2026-03-03" }).props.onPress());
    const picks = [...new Set(r.root.findAll((n) => typeof n.props.testID === "string" && n.props.testID.startsWith("stats-day-session-")).map((n) => n.props.testID))];
    expect(picks.sort()).toEqual([`stats-day-session-${a.id}`, `stats-day-session-${b.id}`].sort());
    await act(async () => r.root.findByProps({ testID: `stats-day-session-${a.id}` }).props.onPress());
    expect(mockPush).toHaveBeenLastCalledWith(`/entry?id=${a.id}`);
  });

  it("a legacy month shows the total, says there is no day breakdown and links to /hours/month", async () => {
    mockKey = "2025-04";
    const r = await render([], [record(2025, 4, 37.5)]);
    const t = texts(r);
    expect(r.root.findByProps({ testID: "stats-hero" }).props.accessibilityLabel).toBe("Апрель 2025: 37 ч 30 м");
    expect(t).toContain("Сохранён месячный итог без разбивки по дням");
    expect(r.root.findAllByProps({ testID: "stats-month-days" })).toHaveLength(0);
    await act(async () => r.root.findByProps({ testID: "stats-month-legacy-link" }).props.onPress());
    expect(mockPush).toHaveBeenCalledWith("/hours/month/2025-04");
  });

  it("an empty month and a malformed key degrade gracefully", async () => {
    const r = await render([]);
    expect(texts(r)).toContain("Нет записей за этот месяц");
    mockKey = "garbage";
    const r2 = await render([]);
    expect(r2.toJSON()).toBeNull();
  });
});
