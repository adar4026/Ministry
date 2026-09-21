// TASK_081 — «Статистика»: year view, all-time view, empty state, navigation.
// TASK_082 — the year is the SERVICE year (Sep–Aug, labelled «2025–2026»);
// with `now` = 21 September 2026 the current one is 2027 (Sep 2026 … Aug 2027).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, STORAGE_KEYS } from "@/store/StoreContext";
import type { HourRecord, Session } from "@/types";
import StatisticsScreen from "../index";

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockCanGoBack = true;
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    back: () => mockBack(),
    replace: jest.fn(),
    canGoBack: () => mockCanGoBack,
  },
  useLocalSearchParams: () => mockParams,
}));

const NOW = new Date(2026, 8, 21, 12, 0, 0); // 21 September 2026

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
  return r.root
    .findAllByType(Text)
    .map((n) => n.props.children)
    .flat()
    .filter((c): c is string => typeof c === "string");
}

async function render(sessions: Session[] = [], records: HourRecord[] = []) {
  await AsyncStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
  await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <StatisticsScreen />
      </StoreProvider>,
    );
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
  return renderer;
}

const press = async (r: ReactTestRenderer, testID: string) =>
  act(async () => {
    r.root.findByProps({ testID }).props.onPress();
  });

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPush.mockClear();
  mockBack.mockClear();
  mockCanGoBack = true;
  mockParams = {};
  jest.useFakeTimers({ now: NOW });
});
afterEach(() => jest.useRealTimers());

describe("Статистика — служебный год", () => {
  it("opens on the CURRENT service year (2026–2027 in September 2026) with the /hours/stats label and the Sep–Aug range", async () => {
    const r = await render([session("2026-09-02", 60)]);
    const t = texts(r);
    expect(t).toContain("Статистика");
    expect(r.root.findByProps({ testID: "stats-year" }).props.children).toBe("2026–2027");
    expect(r.root.findByProps({ testID: "stats-year-range" }).props.children).toBe("Сентябрь 2026 — август 2027");
    expect(t).toContain("Текущий год");
    expect(r.root.findByProps({ testID: "stats-hero" }).props.accessibilityLabel).toContain("1 ч");
    // Only September has happened: 1 of 12 months, average over that one.
    expect(t).toContain("1 из 12");
    expect(t).toContain("Среднее 1 ч / месяц");
  });

  it("a full service year: hero total, average over months with data, tiles, Sep→Aug rows, all-time link", async () => {
    mockParams = { year: "2026" }; // Sep 2025 … Aug 2026
    const r = await render([
      session("2025-10-10", 34 * 60 + 20),
      session("2026-03-01", 52 * 60),
      session("2026-03-15", 30),
      session("2026-09-02", 60), // next service year — must NOT be counted
    ]);
    const t = texts(r);
    expect(r.root.findByProps({ testID: "stats-year" }).props.children).toBe("2025–2026");
    expect(t).not.toContain("Текущий год");
    // Hero: 34:20 + 52:30 = 86 ч 50 м, average over the 2 months with data.
    expect(r.root.findByProps({ testID: "stats-hero" }).props.accessibilityLabel).toContain("86 ч 50 м");
    expect(t).toContain("Служение за служебный год");
    expect(t).toContain("Среднее 43 ч 25 м / месяц");
    expect(t).toContain("Кратко");
    expect(t).toContain("Динамика");
    expect(t).toContain("По месяцам");
    expect(t).toContain("За всё время");
    // Twelve rows in service order: first September (2025), last August (2026).
    const months = r.root.findByProps({ testID: "stats-months" });
    const ids = [...new Set(months.findAll((n) => typeof n.props.testID === "string" && n.props.testID.startsWith("stats-month-")).map((n) => n.props.testID))];
    expect(ids).toEqual([
      "stats-month-2025-09", "stats-month-2025-10", "stats-month-2025-11", "stats-month-2025-12",
      "stats-month-2026-01", "stats-month-2026-02", "stats-month-2026-03", "stats-month-2026-04",
      "stats-month-2026-05", "stats-month-2026-06", "stats-month-2026-07", "stats-month-2026-08",
    ]);
    expect(r.root.findByProps({ testID: "stats-month-2025-10" }).props.accessibilityLabel).toBe("Октябрь: 34 ч 20 м");
    expect(r.root.findByProps({ testID: "stats-month-2026-03" }).props.accessibilityLabel).toBe("Март: 52 ч 30 м");
    expect(r.root.findByProps({ testID: "stats-month-2026-06" }).props.accessibilityLabel).toBe("Июнь: нет записей");
    // Tiles: 3 service days, busiest March, 2 of 12 months.
    expect(t).toContain("Дней служения");
    expect(t).toContain("3");
    expect(t).toContain("2 из 12");
    // No previous service year data → no comparison block.
    expect(r.root.findAllByProps({ testID: "stats-comparison" })).toHaveLength(0);
    expect(t).not.toContain("Сравнение");
  });

  it("tapping a month with data opens /statistics/month/YYYY-MM with the month's own calendar year", async () => {
    mockParams = { year: "2026" };
    const r = await render([session("2025-11-01", 60), session("2026-03-01", 60)]);
    await press(r, "stats-month-2025-11");
    expect(mockPush).toHaveBeenCalledWith("/statistics/month/2025-11");
    await press(r, "stats-month-2026-03");
    expect(mockPush).toHaveBeenCalledWith("/statistics/month/2026-03");
    expect(r.root.findByProps({ testID: "stats-month-2026-06" }).props.onPress).toBeUndefined();
  });

  it("the stepper moves between the earliest service year with data and the current one (2027), never into the future", async () => {
    const r = await render([session("2026-02-01", 60)], [record(2024, 5, 10)]);
    const year = () => r.root.findByProps({ testID: "stats-year" }).props.children;
    expect(year()).toBe("2026–2027");
    expect(r.root.findByProps({ testID: "stats-year-next" }).props.accessibilityState.disabled).toBe(true);
    // Sep 2026 … Aug 2027 has no data yet → empty state, still on the stepper.
    expect(r.root.findAllByProps({ testID: "stats-empty" }).length).toBeGreaterThan(0);
    await press(r, "stats-year-prev");
    expect(year()).toBe("2025–2026");
    expect(r.root.findByProps({ testID: "stats-hero" }).props.accessibilityLabel).toContain("1 ч");
    await press(r, "stats-year-prev");
    expect(year()).toBe("2024–2025");
    expect(texts(r)).toContain("Пока нет статистики");
    await press(r, "stats-year-prev");
    expect(year()).toBe("2023–2024"); // May 2024 belongs to Sep 2023 … Aug 2024
    expect(r.root.findByProps({ testID: "stats-year-prev" }).props.accessibilityState.disabled).toBe(true);
    expect(r.root.findByProps({ testID: "stats-hero" }).props.accessibilityLabel).toContain("10 ч");
    await press(r, "stats-year-next");
    await press(r, "stats-year-next");
    await press(r, "stats-year-next");
    expect(year()).toBe("2026–2027");
  });

  it("compares with the previous SERVICE year (June 2025 → 2024–2025) with neutral figures", async () => {
    mockParams = { year: "2026" };
    const r = await render([session("2026-01-01", 428 * 60)], [record(2025, 6, 391)]);
    const t = texts(r);
    expect(t).toContain("Сравнение");
    expect(t).toContain("2025–2026");
    expect(t).toContain("2024–2025");
    expect(r.root.findByProps({ testID: "stats-comparison-delta" }).props.children).toBe("+37 ч");
    expect(t).toContain("+9,5 %");
    expect(t.join(" ")).not.toMatch(/лучше|хуже|мало|нужно/i);
  });

  it("regression: December and January sit in ONE service year, and a January entry never opens a Jan–Dec year", async () => {
    mockParams = { year: "2026" };
    const r = await render([session("2025-12-31", 90), session("2026-01-01", 30)]);
    expect(r.root.findByProps({ testID: "stats-hero" }).props.accessibilityLabel).toContain("2 ч");
    expect(texts(r)).toContain("2 из 12");
    const months = r.root.findByProps({ testID: "stats-months" });
    const first = months.findAll((n) => typeof n.props.testID === "string" && n.props.testID.startsWith("stats-month-"))[0];
    expect(first.props.testID).toBe("stats-month-2025-09");
  });

  it("empty state offers «Открыть календарь» → /calendar (TASK_083)", async () => {
    const r = await render([]);
    expect(texts(r)).toContain("Пока нет статистики");
    expect(r.root.findAllByProps({ testID: "stats-trend" })).toHaveLength(0);
    await press(r, "stats-open-calendar");
    expect(mockPush).toHaveBeenCalledWith("/calendar");
  });

  it("the back button pops history (Профиль → Статистика → назад)", async () => {
    const r = await render([]);
    await act(async () => {
      r.root.findByProps({ accessibilityLabel: "Назад" }).props.onPress();
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("a legacy-only service year shows the total, marks the months as monthly totals and does not invent days", async () => {
    mockParams = { year: "2024" }; // Sep 2023 … Aug 2024
    const r = await render([], [record(2024, 5, 37.5), record(2024, 6, 40)]);
    const t = texts(r);
    expect(r.root.findByProps({ testID: "stats-year" }).props.children).toBe("2023–2024");
    expect(r.root.findByProps({ testID: "stats-hero" }).props.accessibilityLabel).toContain("77 ч 30 м");
    expect(t).toContain("месячный итог");
    expect(t).toContain("нет разбивки по дням");
  });
});

describe("Статистика — за всё время", () => {
  // Sep/Oct 2023 + Feb 2024 → service year 2024; Jan 2026 → 2026.
  const data = [session("2026-01-03", 120), session("2024-02-10", 600), session("2024-02-11", 30)];
  const legacy = [record(2023, 9, 40), record(2023, 10, 45)];

  it("switches via the segment: lifetime hero, facts, SERVICE years newest first", async () => {
    const r = await render(data, legacy);
    await press(r, "stats-mode-all");
    const t = texts(r);
    expect(t).toContain("Всего служения");
    expect(r.root.findByProps({ testID: "stats-hero" }).props.accessibilityLabel).toContain("97 ч 30 м");
    expect(t).toContain("Первая запись");
    expect(t).toContain("Сентябрь 2023"); // legacy month — no invented day
    expect(t).toContain("2 года");
    expect(t).toContain("3 дня");
    expect(t).toContain("По годам");
    const years = r.root.findByProps({ testID: "stats-years" });
    // findAll sees both the Pressable and its host view — dedupe, keep order.
    const labels = [...new Set(years.findAll((n) => typeof n.props.testID === "string" && n.props.testID.startsWith("stats-year-2")).map((n) => n.props.testID))];
    expect(labels).toEqual(["stats-year-2026", "stats-year-2024"]);
    expect(r.root.findByProps({ testID: "stats-year-2024" }).props.accessibilityLabel).toBe("2023–2024: 95 ч 30 м");
    expect(r.root.findAllByProps({ testID: "stats-year-prev" })).toHaveLength(0);
  });

  it("the «За всё время» link at the bottom of the year view opens the same lifetime view", async () => {
    mockParams = { year: "2026" };
    const r = await render(data, legacy);
    await press(r, "stats-all-link");
    expect(texts(r)).toContain("Всего служения");
  });

  it("tapping a year in «По годам» returns to that SERVICE year's statistics", async () => {
    const r = await render(data, legacy);
    await press(r, "stats-mode-all");
    await press(r, "stats-year-2024");
    expect(r.root.findByProps({ testID: "stats-year" }).props.children).toBe("2023–2024");
    expect(r.root.findByProps({ testID: "stats-hero" }).props.accessibilityLabel).toContain("95 ч 30 м");
  });

  it("with no data at all the lifetime view is the same empty state", async () => {
    const r = await render([]);
    await press(r, "stats-mode-all");
    expect(texts(r)).toContain("Пока нет статистики");
  });
});
