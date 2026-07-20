// TASK_037 §3 — month statistics detail screen: header title, top summary,
// cumulative chart vs. the legacy no-daily-breakdown notice, status text.
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

describe("Month statistics detail screen — TASK_037 §3", () => {
  it("shows the month/year title and no-data-yet state without crashing", async () => {
    const { texts } = await renderScreen("2026-07");
    expect(texts()).toContain("Июль 2026");
    expect(texts().some((t) => t.includes("NaN") || t.includes("Infinity"))).toBe(false);
  });

  it("shows the legacy notice (no chart) for a HourRecord-only month, not a fabricated daily curve", async () => {
    const { store, texts } = await renderScreen("2026-06");
    await act(async () => {
      store().saveRecord({ year: 2026, month: 6, hours: 43, note: "" });
    });
    const all = texts();
    expect(all.some((t) => t.includes("без разбивки по дням"))).toBe(true);
  });

  it("shows a real cumulative chart for a Session-authoritative month (no legacy notice)", async () => {
    const { store, texts } = await renderScreen("2026-07");
    await act(async () => {
      store().saveSession({ date: "2026-07-05", durationMinutes: 90, source: "manual", note: "" } as any);
    });
    expect(texts().some((t) => t.includes("без разбивки по дням"))).toBe(false);
    expect(texts()).toContain("Фактически");
    expect(texts()).toContain("План");
  });

  it("renders a status line that is one of the known outcomes", async () => {
    const { texts } = await renderScreen("2026-07");
    const known = ["Впереди плана", "Ниже плана", "В соответствии с планом", "Цель выполнена", "Цель не задана"];
    expect(texts().some((t) => known.some((k) => t.includes(k)))).toBe(true);
  });

  it("BackButton falls back to /hours/stats when there is no history", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const { root } = await renderScreen("2026-07");
    const btn = root().findAll((n) => n.props.accessibilityLabel === "Назад")[0];
    await act(async () => btn.props.onPress());
    expect(mockRouter.replace).toHaveBeenCalledWith("/hours/stats");
  });
});
