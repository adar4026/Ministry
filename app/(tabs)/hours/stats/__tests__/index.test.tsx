// TASK_061: «Статистика» — короткий экран-обзор. Две карточки итогов,
// ведущие на детальные экраны месяца и служебного года; никаких графиков,
// мини-графиков и KPI «нужно в день/неделю» на самом обзоре.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, useStore } from "@/store/StoreContext";
import StatsOverviewScreen from "../index";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
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

async function renderScreen(): Promise<{ texts: () => string[]; root: () => ReactTestRenderer["root"] }> {
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={() => {}} />
        <StatsOverviewScreen />
      </StoreProvider>,
    );
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  return {
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
});

describe("Statistics overview — TASK_061", () => {
  it("shows both period cards", async () => {
    const { texts } = await renderScreen();
    expect(texts()).toContain("Этот месяц");
    expect(texts()).toContain("Служебный год");
  });

  it("each card carries an explicit action row naming the screen it opens", async () => {
    const { texts } = await renderScreen();
    expect(texts()).toContain("Статистика за месяц");
    expect(texts()).toContain("Статистика за служебный год");
  });

  it("shows the goal-progress lines and nothing else numeric", async () => {
    const { texts } = await renderScreen();
    const all = texts().join(" ");
    expect(all).toContain("Осталось:");
    expect(all).toContain("из ");
    expect(all.includes("NaN") || all.includes("Infinity")).toBe(false);
  });

  it("has no chart of any kind — neither a big one nor a sparkline", async () => {
    const { texts, root } = await renderScreen();
    const all = texts();
    // Легенда и заголовки графиков живут только на детальных экранах
    expect(all).not.toContain("Факт");
    expect(all).not.toContain("Идеальный темп");
    expect(all.some((t) => t.includes("Динамика"))).toBe(false);
    // PeriodChart всегда объявляет себя как accessibilityRole="image"
    expect(root().findAll((n) => n.props.accessibilityRole === "image")).toHaveLength(0);
  });

  it("no longer shows per-day/per-week pace KPIs, days-left columns or Bible studies", async () => {
    const { texts } = await renderScreen();
    const all = texts();
    expect(all.some((t) => t.includes("Нужно в день"))).toBe(false);
    expect(all.some((t) => t.includes("Нужно в неделю"))).toBe(false);
    expect(all.some((t) => t.includes("Осталось дней"))).toBe(false);
    expect(all.some((t) => t.includes("Изучения Библии"))).toBe(false);
  });

  it("no longer shows the old overloaded blocks", async () => {
    const { texts } = await renderScreen();
    const all = texts();
    expect(all.some((t) => t.includes("Тепловая карта"))).toBe(false);
    expect(all.some((t) => t.includes("Прогноз конца месяца"))).toBe(false);
    expect(all.some((t) => t.includes("Тренд 12 месяцев"))).toBe(false);
    expect(all.some((t) => t.includes("Темп служения"))).toBe(false);
  });

  it("tapping the month card navigates to /hours/stats/month/<YYYY-MM>", async () => {
    const { root } = await renderScreen();
    const card = root().findAll((n) => n.props.accessibilityLabel?.toString().startsWith("Этот месяц:"))[0];
    await act(async () => card.props.onPress());
    expect(mockRouter.push).toHaveBeenCalledWith(expect.stringMatching(/^\/hours\/stats\/month\/\d{4}-\d{2}$/));
  });

  it("tapping the service-year card navigates to /hours/stats/year/<startYear>", async () => {
    const { root } = await renderScreen();
    const card = root().findAll((n) => n.props.accessibilityLabel?.toString().startsWith("Служебный год:"))[0];
    await act(async () => card.props.onPress());
    expect(mockRouter.push).toHaveBeenCalledWith(expect.stringMatching(/^\/hours\/stats\/year\/\d{4}$/));
  });

  it("renders the unified BackButton with a /hours fallback", async () => {
    const { root } = await renderScreen();
    const btn = root().findAll((n) => n.props.accessibilityLabel === "Назад")[0];
    expect(btn).toBeDefined();
    mockRouter.canGoBack.mockReturnValue(false);
    await act(async () => btn.props.onPress());
    expect(mockRouter.replace).toHaveBeenCalledWith("/hours");
  });
});
