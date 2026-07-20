// TASK_019: the dedicated /upcoming-events screen renders the complete
// upcoming list (no Home 3-item cap, no month/year window) and its empty
// state, under a real StoreProvider.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, useStore } from "@/store/StoreContext";
import UpcomingEventsScreen from "../upcoming-events";

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
  if (typeof node === "string") {
    out.push(node);
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

async function renderScreen(): Promise<{ store: () => Store; texts: () => string[]; root: () => ReactTestRenderer["root"] }> {
  let latest: Store | null = null;
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => { latest = s; }} />
        <UpcomingEventsScreen />
      </StoreProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
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

function futureISO(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockRouter.canGoBack.mockReturnValue(true);
});

describe("UpcomingEventsScreen — TASK_019", () => {
  it("shows the page title and an accessible back control", async () => {
    const { texts, root } = await renderScreen();
    expect(texts()).toContain("Ближайшие события");
    const back = root().findAll((n) => n.props.accessibilityLabel === "Назад")[0];
    expect(back).toBeDefined();
    await act(async () => {
      back.props.onPress();
    });
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("falls back to replacing with Home when there is no navigation history (direct web load)", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const { root } = await renderScreen();
    const back = root().findAll((n) => n.props.accessibilityLabel === "Назад")[0];
    await act(async () => {
      back.props.onPress();
    });
    expect(mockRouter.replace).toHaveBeenCalledWith("/");
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("renders the empty state when there are no upcoming events", async () => {
    const { texts } = await renderScreen();
    expect(texts()).toContain("Нет предстоящих событий");
  });

  it("renders the complete upcoming list — more than 3 events, no Home cap and no month/year window", async () => {
    const { store, texts } = await renderScreen();
    await act(async () => {
      for (let i = 1; i <= 5; i++) {
        store().saveEvent({ date: futureISO(i * 30), title: `Событие ${i}`, category: "other" });
      }
      // Far beyond any plausible month/quarter window — must still appear.
      store().saveEvent({ date: futureISO(900), title: "Далёкое событие", category: "other" });
    });
    const rendered = texts().join(" ");
    for (let i = 1; i <= 5; i++) expect(rendered).toContain(`Событие ${i}`);
    expect(rendered).toContain("Далёкое событие");
  });
});
