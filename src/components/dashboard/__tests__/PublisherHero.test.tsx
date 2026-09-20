// TASK_073 — the hero's content layer follows the ministry mode.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, STORAGE_KEYS, useStore } from "@/store/StoreContext";
import { HomeHero } from "@/components/dashboard/HomeHero";
import { MINISTRY } from "@/components/dashboard/tokens";
import { toISODate } from "@/data/constants";
import type { ServiceParticipation, Session } from "@/types";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

type Store = ReturnType<typeof useStore>;
function Harness({ onReady }: { onReady: (s: Store) => void }) {
  onReady(useStore());
  return null;
}

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType(Text)
    .map((n) => n.props.children)
    .flat()
    .filter((c): c is string => typeof c === "string");
}

async function render(): Promise<{ renderer: ReactTestRenderer; store: () => Store }> {
  let renderer!: ReactTestRenderer;
  let store!: Store;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => (store = s)} />
        <HomeHero />
      </StoreProvider>,
    );
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  return { renderer, store: () => store };
}

const now = new Date();
function dayISO(day: number): string {
  return toISODate(new Date(now.getFullYear(), now.getMonth(), day));
}
function mark(date: string, id = date): ServiceParticipation {
  return { id, date, participated: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
}
function sessionToday(minutes: number): Session {
  const iso = now.toISOString();
  return { id: "s1", date: toISODate(now), durationMinutes: minutes, note: "", source: "manual", createdAt: iso, updatedAt: iso };
}
const figureText = (r: ReactTestRenderer) =>
  r.root.findByProps({ testID: "home-hero-figure" }).findAllByType(Text).map((n) => n.props.children).filter((c): c is string => typeof c === "string");

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPush.mockClear();
});

describe("HomeHero — publisher mode", () => {
  beforeEach(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ministryMode: "publisher", monthlyHourGoal: 50 }));
  });

  it("shows the count of DISTINCT days of service this month as the glass figure, no hours anywhere", async () => {
    const d1 = dayISO(1);
    const d2 = dayISO(Math.max(1, now.getDate() - 1));
    await AsyncStorage.setItem(STORAGE_KEYS.participation, JSON.stringify([mark(d1), mark(d2, "b"), mark(d1, "dup")]));
    await AsyncStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([sessionToday(600)]));
    const { renderer } = await render();
    const expected = d1 === d2 ? "1" : "2";
    expect(figureText(renderer)).toEqual([expected]);
    const all = texts(renderer);
    expect(all.some((t) => /^дн(я|ей|ень) служения в [а-я]+$/.test(t))).toBe(true);
    expect(all.some((t) => t.includes("из цели"))).toBe(false);
    expect(all.some((t) => t.includes("% выполнено"))).toBe(false);
    expect(all.some((t) => t.includes("Осталось"))).toBe(false);
    expect(all).not.toContain("Добавить часы");
    expect(all).toContain("Отметить служение");
    expect(all).toContain("Детали");
    // No progress fill in the accent colour (the hours bar).
    const fills = renderer.root.findAll((n) => n.props.style && [n.props.style].flat(Infinity).some((s: any) => s && s.height === "100%" && s.backgroundColor === MINISTRY.accent));
    expect(fills).toHaveLength(0);
  });

  it("renders the month mini calendar with the marked days filled", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.participation, JSON.stringify([mark(dayISO(1))]));
    const { renderer } = await render();
    expect(renderer.root.findAllByProps({ testID: "participation-mini-calendar" }).length).toBeGreaterThan(0);
    expect(renderer.root.findAllByProps({ testID: "mini-cal-marked-1" }).length).toBeGreaterThan(0);
    if (now.getDate() !== 1) expect(renderer.root.findAllByProps({ testID: "mini-cal-day-" + now.getDate() }).length).toBeGreaterThan(0);
  });

  it("«Отметить служение» opens the sheet; marking today adds one day; marking again is «Уже отмечено»", async () => {
    const { renderer, store } = await render();
    expect(figureText(renderer)).toEqual(["0"]);
    await act(async () => renderer.root.findByProps({ testID: "publisher-mark-button" }).props.onPress());
    const submit = () => renderer.root.findByProps({ testID: "participation-submit" });
    expect(texts(renderer).some((t) => t.startsWith("Сегодня, "))).toBe(true);
    await act(async () => submit().props.onPress());
    expect(store().participation).toHaveLength(1);
    expect(store().participation[0].date).toBe(toISODate(now));
    expect(figureText(renderer)).toEqual(["1"]);
    expect(texts(renderer)).toContain("Последний раз: сегодня");
    // Open again for the same day: disabled, no second record.
    await act(async () => renderer.root.findByProps({ testID: "publisher-mark-button" }).props.onPress());
    expect(submit().props.accessibilityState.disabled).toBe(true);
    expect(texts(renderer)).toContain("Уже отмечено");
    await act(async () => submit().props.onPress?.());
    expect(store().participation).toHaveLength(1);
  });

  it("«Детали» opens the participation statistics, not the hours month", async () => {
    const { renderer } = await render();
    await act(async () => renderer.root.findByProps({ accessibilityLabel: "Детали участия" }).props.onPress());
    expect(mockPush).toHaveBeenCalledWith("/participation");
  });
});

describe("HomeHero — mode switching is reversible", () => {
  it("Pioneer → Publisher hides hours; Publisher → Pioneer brings the very same hours back", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([sessionToday(90)]));
    const { renderer, store } = await render();
    expect(figureText(renderer)).toEqual(["1", "ч", "30", "м"]);
    expect(texts(renderer).some((t) => t.startsWith("из цели 50 ч"))).toBe(true);

    await act(async () => store().setMinistryMode("publisher"));
    expect(figureText(renderer)).toEqual(["0"]);
    expect(texts(renderer).some((t) => t.includes("из цели"))).toBe(false);
    expect(store().sessions).toHaveLength(1);

    await act(async () => store().setMinistryMode("pioneer"));
    expect(figureText(renderer)).toEqual(["1", "ч", "30", "м"]);
    expect(texts(renderer).some((t) => t.startsWith("из цели 50 ч"))).toBe(true);
  });

  it("Special pioneer uses the hours hero with the user's own goal", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ministryMode: "specialPioneer", monthlyHourGoal: 130 }));
    const { renderer } = await render();
    expect(texts(renderer).some((t) => t.startsWith("из цели 130 часов"))).toBe(true);
    expect(texts(renderer)).toContain("Добавить часы");
  });

  it("a null goal shows the pre-existing «Месячная цель не задана» branch", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ministryMode: "pioneer", monthlyHourGoal: null }));
    const { renderer } = await render();
    expect(texts(renderer)).toContain("Месячная цель не задана");
  });
});
