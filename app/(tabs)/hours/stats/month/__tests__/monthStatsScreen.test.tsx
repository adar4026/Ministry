// TASK_061 §2 — экран «Статистика за месяц»: заголовок и период, карточка
// итогов (факт/цель/остаток), блок «Динамика часов» с честной линией факта
// либо явной оговоркой для месяца без дневных дат.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, useStore } from "@/store/StoreContext";
import MonthStatsScreen from "../[key]";

let mockParams: { key?: string } = {};
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams,
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { router: mockRouter } = jest.requireMock("expo-router") as {
  router: { push: jest.Mock; back: jest.Mock; replace: jest.Mock; canGoBack: jest.Mock };
};

jest.setTimeout(30000);

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady: (store: Store) => void }) {
  const store = useStore();
  onReady(store);
  return null;
}

function collectText(node: unknown, out: string[]): void {
  if (node == null) return;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectText(n, out));
    return;
  }
  if (typeof node === "object" && "children" in (node as Record<string, unknown>)) {
    collectText((node as { children: unknown }).children, out);
  }
}

async function renderScreen(key: string): Promise<{ store: () => Store; texts: () => string[]; root: () => ReactTestRenderer["root"] }> {
  mockParams = { key };
  let latest: Store | null = null;
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness
          onReady={(s) => {
            latest = s;
          }}
        />
        <MonthStatsScreen />
      </StoreProvider>,
    );
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  return {
    store: () => latest as unknown as Store,
    texts: () => {
      const out: string[] = [];
      collectText(renderer.toJSON(), out);
      return out;
    },
    root: () => renderer.root,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockRouter.canGoBack.mockReturnValue(true);
});

const now = new Date();
const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

describe("Month statistics detail screen — TASK_061 §2", () => {
  it("shows the screen title and the period it describes", async () => {
    const { texts } = await renderScreen("2026-07");
    expect(texts()).toContain("Статистика за месяц");
    expect(texts()).toContain("Июль 2026");
    expect(texts().some((t) => t.includes("NaN") || t.includes("Infinity"))).toBe(false);
  });

  it("summary card shows only done/goal/remaining/goal lines", async () => {
    const { texts } = await renderScreen("2026-07");
    const all = texts().join(" ");
    expect(all).toContain("из ");
    expect(all).toContain("Осталось:");
    expect(all).toContain("Цель:");
  });

  it("never shows «Изучения Библии» or any other activity type", async () => {
    const { texts } = await renderScreen("2026-07");
    const all = texts();
    expect(all.some((t) => t.includes("Изучения Библии"))).toBe(false);
    expect(all.some((t) => t.includes("Изучени"))).toBe(false);
  });

  it("does not bring back the pace/days-left KPI columns", async () => {
    const { texts } = await renderScreen("2026-07");
    const all = texts();
    expect(all.some((t) => t.includes("Нужно в день"))).toBe(false);
    expect(all.some((t) => t.includes("Осталось дней"))).toBe(false);
  });

  it("renders the «Динамика часов» chart block with a two-item legend", async () => {
    const { texts } = await renderScreen("2026-07");
    const all = texts();
    expect(all).toContain("Динамика часов");
    expect(all).toContain("Факт");
    expect(all).toContain("Идеальный темп");
    expect(all).not.toContain("Текущий");
  });

  it("chart exposes a VoiceOver description with period, hours, goal and pace difference", async () => {
    const { root } = await renderScreen("2026-07");
    const chart = root().findAll((n) => n.props.accessibilityRole === "image")[0];
    const label = String(chart.props.accessibilityLabel);
    expect(label).toContain("Динамика часов");
    expect(label).toContain("Июль 2026");
    expect(label).toContain("из 50 ч");
    expect(/план|Цель/i.test(label)).toBe(true);
  });

  it("shows the legacy notice and NO fact line for a HourRecord-only month", async () => {
    const { store, texts, root } = await renderScreen("2026-06");
    await act(async () => {
      store().saveRecord({ year: 2026, month: 6, hours: 43, note: "" });
    });
    expect(texts().some((t) => t.includes("без разбивки по дням"))).toBe(true);
    expect(root().findAll((n) => n.props.accessibilityRole === "image")).toHaveLength(0);
  });

  it("draws a real chart for a Session-authoritative month (no legacy notice)", async () => {
    const { store, texts, root } = await renderScreen("2026-07");
    await act(async () => {
      store().saveSession({ date: "2026-07-05", durationMinutes: 90, source: "manual", note: "" } as any);
    });
    expect(texts().some((t) => t.includes("без разбивки по дням"))).toBe(false);
    expect(root().findAll((n) => n.props.accessibilityRole === "image").length).toBeGreaterThan(0);
  });

  it.each([
    ["28-day", "2026-02"],
    ["29-day (leap)", "2028-02"],
    ["30-day", "2026-04"],
    ["31-day", "2026-07"],
  ])("renders a %s month without NaN/Infinity/negative output", async (_label, key) => {
    const { texts } = await renderScreen(key);
    const all = texts().join(" ");
    expect(all.includes("NaN") || all.includes("Infinity") || all.includes("-")).toBe(false);
  });

  it("renders the current month (fact line stops today) as well as a finished one", async () => {
    const current = await renderScreen(currentKey);
    expect(current.texts()).toContain("Динамика часов");
    const finished = await renderScreen("2026-07");
    expect(finished.texts()).toContain("Динамика часов");
  });

  it("shows an explicit empty state instead of a fabricated line when there are no entries", async () => {
    const { texts } = await renderScreen("2026-07");
    expect(texts().some((t) => t.includes("Пока нет записей"))).toBe(true);
  });

  it("does not modify stored data by rendering", async () => {
    const { store, texts } = await renderScreen("2026-07");
    await act(async () => {
      store().saveRecord({ year: 2026, month: 6, hours: 43, note: "" });
      store().saveSession({ date: "2026-07-05", durationMinutes: 90, source: "manual", note: "" } as any);
    });
    texts();
    expect(store().records).toHaveLength(1);
    expect(store().records[0].hours).toBe(43);
    expect(store().sessions).toHaveLength(1);
    expect(store().sessions[0].durationMinutes).toBe(90);
  });

  it("BackButton falls back to /hours/stats when there is no history", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const { root } = await renderScreen("2026-07");
    const btn = root().findAll((n) => n.props.accessibilityLabel === "Назад")[0];
    await act(async () => btn.props.onPress());
    expect(mockRouter.replace).toHaveBeenCalledWith("/hours/stats");
  });
});
