// TASK_037 §4 — service-year statistics detail screen: header title, top
// summary, month-granularity cumulative chart, status text.
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

describe("Service-year statistics detail screen — TASK_037 §4", () => {
  it("shows the service-year title (Sep..Aug span, not a calendar year)", async () => {
    const { texts } = await renderScreen("2025");
    expect(texts()).toContain("2025–2026");
  });

  it("mixes legacy and Session months into one series without crashing or NaN", async () => {
    const { store, texts } = await renderScreen("2025");
    await act(async () => {
      store().saveRecord({ year: 2025, month: 9, hours: 40, note: "" });
      store().saveSession({ date: "2025-10-05", durationMinutes: 60 * 60, source: "manual", note: "" } as any);
    });
    const all = texts();
    expect(all.some((t) => t.includes("NaN") || t.includes("Infinity"))).toBe(false);
    expect(all).toContain("Фактически");
    expect(all).toContain("План");
  });

  it("renders a status line that is one of the known outcomes", async () => {
    const { texts } = await renderScreen("2025");
    const known = ["Впереди плана", "Ниже плана", "В соответствии с планом", "Цель выполнена", "Цель не задана"];
    expect(texts().some((t) => known.some((k) => t.includes(k)))).toBe(true);
  });

  it("BackButton falls back to /hours/stats when there is no history", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const { root } = await renderScreen("2025");
    const btn = root().findAll((n) => n.props.accessibilityLabel === "Назад")[0];
    await act(async () => btn.props.onPress());
    expect(mockRouter.replace).toHaveBeenCalledWith("/hours/stats");
  });
});
