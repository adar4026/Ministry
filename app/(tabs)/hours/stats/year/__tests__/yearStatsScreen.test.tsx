// TASK_061 §3 — экран «Статистика за служебный год»: заголовок и период,
// карточка итогов, блок «Динамика служебного года» с дневным доменом X
// (Сен 1 … Авг 31) и честной пометкой месяцев без дневной детализации.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, useStore } from "@/store/StoreContext";
import YearStatsScreen from "../[key]";

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
        <YearStatsScreen />
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
const currentStartYear = now.getMonth() + 1 >= 9 ? now.getFullYear() : now.getFullYear() - 1;

describe("Service-year statistics detail screen — TASK_061 §3", () => {
  it("shows the screen title and the service year it describes (Sep..Aug, not a calendar year)", async () => {
    const { texts } = await renderScreen("2025");
    expect(texts()).toContain("Статистика за служебный год");
    expect(texts()).toContain("2025–2026");
  });

  it("summary card shows only done/goal/remaining/goal lines", async () => {
    const { texts } = await renderScreen("2025");
    const all = texts().join(" ");
    expect(all).toContain("из ");
    expect(all).toContain("Осталось:");
    expect(all).toContain("Цель:");
  });

  it("never shows «Изучения Библии» or any other activity type", async () => {
    const { texts } = await renderScreen("2025");
    expect(texts().some((t) => t.includes("Изучени"))).toBe(false);
  });

  it("does not bring back the pace/days-left KPI columns", async () => {
    const { texts } = await renderScreen("2025");
    const all = texts();
    expect(all.some((t) => t.includes("Нужно в неделю"))).toBe(false);
    expect(all.some((t) => t.includes("Осталось дней"))).toBe(false);
  });

  it("renders the «Динамика служебного года» block with a two-item legend", async () => {
    const { texts } = await renderScreen("2025");
    const all = texts();
    expect(all).toContain("Динамика служебного года");
    expect(all).toContain("Факт");
    expect(all).toContain("Идеальный темп");
    expect(all).not.toContain("Текущий");
  });

  it("chart exposes a VoiceOver description with period, hours, goal and pace difference", async () => {
    const { root } = await renderScreen("2025");
    const chart = root().findAll((n) => n.props.accessibilityRole === "image")[0];
    const label = String(chart.props.accessibilityLabel);
    expect(label).toContain("Динамика служебного года");
    expect(label).toContain("2025–2026");
    expect(label).toContain("из 600 ч");
  });

  it("keeps per-record markers off the year line (hundreds of days would clutter it)", async () => {
    const { root } = await renderScreen("2025");
    const chart = root().findAll((n) => n.props.accessibilityRole === "image")[0];
    expect(chart).toBeDefined();
    const card = root().findAll((n) => n.props.showMarkers === false);
    expect(card.length).toBeGreaterThan(0);
  });

  it("mixes legacy and Session months into one series, flagging the months without daily dates", async () => {
    const { store, texts } = await renderScreen("2025");
    await act(async () => {
      store().saveRecord({ year: 2025, month: 9, hours: 40, note: "" });
      store().saveSession({ date: "2025-10-05", durationMinutes: 60 * 60, source: "manual", note: "" } as any);
    });
    const all = texts();
    expect(all.some((t) => t.includes("NaN") || t.includes("Infinity"))).toBe(false);
    expect(all.some((t) => t.includes("Без дневной детализации"))).toBe(true);
    expect(all.some((t) => t.includes("Сентябрь 2025"))).toBe(true);
  });

  it("renders both a finished service year and the current one", async () => {
    const finished = await renderScreen("2020");
    expect(finished.texts()).toContain("Динамика служебного года");
    const current = await renderScreen(String(currentStartYear));
    expect(current.texts()).toContain("Динамика служебного года");
  });

  it("shows an explicit empty state instead of a fabricated line when there are no entries", async () => {
    const { texts } = await renderScreen("2025");
    expect(texts().some((t) => t.includes("Пока нет записей"))).toBe(true);
  });

  it("does not modify stored data by rendering", async () => {
    const { store } = await renderScreen("2025");
    await act(async () => {
      store().saveRecord({ year: 2025, month: 9, hours: 40, note: "" });
      store().saveSession({ date: "2025-10-05", durationMinutes: 120, source: "manual", note: "" } as any);
    });
    expect(store().records).toHaveLength(1);
    expect(store().records[0].hours).toBe(40);
    expect(store().sessions).toHaveLength(1);
    expect(store().sessions[0].date).toBe("2025-10-05");
  });

  it("BackButton falls back to /hours/stats when there is no history", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const { root } = await renderScreen("2025");
    const btn = root().findAll((n) => n.props.accessibilityLabel === "Назад")[0];
    await act(async () => btn.props.onPress());
    expect(mockRouter.replace).toHaveBeenCalledWith("/hours/stats");
  });
});
