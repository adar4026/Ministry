// TASK_083 — «Календарь служения» (/calendar): History's calendar body in
// Ministry's skin, opened from the drawer as a root-Stack screen.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, STORAGE_KEYS } from "@/store/StoreContext";
import type { HourRecord, MinistrySettings, Session } from "@/types";
import CalendarScreen from "../calendar";

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRedirect = jest.fn();
jest.mock("expo-router", () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: () => mockBack(), replace: jest.fn(), canGoBack: () => true },
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
}));

const NOW = new Date(2026, 8, 21, 12, 0, 0); // 21 September 2026

let seq = 0;
function session(date: string, durationMinutes: number): Session {
  seq += 1;
  return { id: `s${seq}`, date, durationMinutes, source: "manual", createdAt: `${date}T10:00:00.000Z`, updatedAt: `${date}T10:00:00.000Z` };
}
function record(year: number, month: number, hours: number, creditHours?: number): HourRecord {
  seq += 1;
  return { id: `r${seq}`, year, month, hours, note: "", ...(creditHours !== undefined ? { creditHours } : {}) };
}
function texts(r: ReactTestRenderer): string[] {
  return r.root.findAllByType(Text).map((n) => n.props.children).flat().filter((c): c is string | number => typeof c === "string" || typeof c === "number").map(String);
}
async function render(sessions: Session[] = [], records: HourRecord[] = [], settings?: Partial<MinistrySettings>) {
  await AsyncStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
  await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
  if (settings) await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ministryMode: "pioneer", monthlyHourGoal: 50, theme: "system", ...settings }));
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <CalendarScreen />
      </StoreProvider>,
    );
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
  return renderer;
}
const byLabel = (r: ReactTestRenderer, label: string) => r.root.findAllByProps({ accessibilityLabel: label })[0];
const press = async (r: ReactTestRenderer, label: string) =>
  act(async () => {
    byLabel(r, label).props.onPress();
  });

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPush.mockClear();
  mockBack.mockClear();
  mockRedirect.mockClear();
  jest.useFakeTimers({ now: NOW });
});
afterEach(() => jest.useRealTimers());

describe("/calendar — экран из шторки", () => {
  it("opens as its own screen: header «Календарь служения», back button, the current month, no History header", async () => {
    const r = await render([session("2026-09-05", 90)]);
    const t = texts(r);
    expect(t).toContain("Календарь служения");
    expect(t).not.toContain("История");
    expect(t).toContain("Сентябрь 2026");
    expect(t).toContain("Текущий месяц");
    expect(t).toContain("Итого");
    expect(t).toContain("1 час 30 минут");
    expect(mockRedirect).not.toHaveBeenCalled();
    await act(async () => byLabel(r, "Назад").props.onPress());
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("previous / next move the displayed month (Dec ↔ Jan wraps through the calendar year)", async () => {
    const r = await render([]);
    await press(r, "Предыдущий период");
    expect(texts(r)).toContain("Август 2026");
    for (let i = 0; i < 8; i++) await press(r, "Предыдущий период");
    expect(texts(r)).toContain("Декабрь 2025");
    await press(r, "Следующий период");
    expect(texts(r)).toContain("Январь 2026");
  });

  it("a day with one session opens the existing /entry editor", async () => {
    const one = session("2026-09-05", 90);
    const r = await render([one]);
    await press(r, "5: 1:30");
    expect(mockPush).toHaveBeenCalledWith(`/entry?id=${one.id}`);
  });

  it("a day with several sessions shows the picker, which opens the chosen session", async () => {
    const a = session("2026-09-05", 60);
    const b = session("2026-09-05", 45);
    const r = await render([a, b]);
    await press(r, "5: 1:45");
    expect(mockPush).not.toHaveBeenCalled();
    await press(r, "Запись: 0:45");
    expect(mockPush).toHaveBeenCalledWith(`/entry?id=${b.id}`);
  });

  it("a legacy month shows the monthly-total row and opens /hours/month/[key]", async () => {
    const r = await render([], [record(2026, 9, 30, 30)]);
    const t = texts(r);
    expect(t).toContain("Сохранён месячный итог без разбивки по дням");
    expect(t).toContain("30 часов 0 минут");
    await press(r, "Месячный итог: 30 ч, плюс 30 ч кредита, редактировать");
    expect(mockPush).toHaveBeenCalledWith("/hours/month/2026-09");
  });

  it("a publisher is redirected to the existing participation journal", async () => {
    const r = await render([], [], { ministryMode: "publisher" });
    expect(mockRedirect).toHaveBeenCalledWith("/participation");
    expect(texts(r)).not.toContain("Календарь служения");
  });

  it("«Год» is the SERVICE year: «2026–2027 · Сентябрь 2026 — август 2027», Sep–Aug sum; 31.08 and 01.09 fall on different sides", async () => {
    const r = await render([session("2026-08-31", 60), session("2026-09-01", 30), session("2026-10-05", 120)]);
    await press(r, "Год");
    const t = texts(r);
    expect(t).toContain("2026–2027");
    expect(t).toContain("Сентябрь 2026 — август 2027");
    expect(t).toContain("Текущий год");
    expect(t).toContain("2 часа 30 минут"); // 01.09 + 05.10 only
    await press(r, "Предыдущий период");
    const t2 = texts(r);
    expect(t2).toContain("2025–2026");
    expect(t2).toContain("Сентябрь 2025 — август 2026");
    expect(t2).toContain("1 час 0 минут"); // 31.08 only
    expect(t2).not.toContain("2 часа 30 минут");
  });
});
