// Component-level render test for HoursHeroCard (TASK_010 compact redesign;
// TASK_010 amendment adds the "+" quick manual-entry shortcut). Verifies the
// card renders real month-progress data end-to-end through StoreContext,
// that duplicate/removed elements stay gone, that "Начать служение" (moved
// to the Hours screen) never appears, and that the "+" button navigates to
// the existing Manual Time Entry route (`/hours/entry`) rather than the
// timer, without invoking any timer/session logic itself.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { HoursHeroCard } from "@/components/dashboard/HoursHeroCard";
import { StoreProvider, useStore } from "@/store/StoreContext";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { router: mockRouter } = jest.requireMock("expo-router") as { router: { push: jest.Mock } };

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

async function renderCard(): Promise<{ store: () => Store; texts: () => string[]; root: () => ReactTestRenderer["root"] }> {
  let latest: Store | null = null;
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => { latest = s; }} />
        <HoursHeroCard />
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

function setLegacyHours(store: Store, year: number, month: number, hours: number) {
  const existing = store.records.find((r) => r.year === year && r.month === month);
  store.saveRecord({ id: existing?.id, year, month, hours });
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("HoursHeroCard — TASK_010 compact monthly progress", () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  it("renders normal progress: hours done, percentage, remaining hours and days", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 33);
    });
    const rendered = texts();
    expect(rendered).toContain("33 ч");
    expect(rendered.join(" ")).toContain("из 50 ч");
    expect(rendered.some((t) => /^\d+$/.test(t))).toBe(true); // rounded percentage inside the ring
    expect(rendered.some((t) => t.startsWith("Осталось"))).toBe(true);
  });

  it("renders zero progress without a false percentage or crash", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 0);
    });
    const rendered = texts();
    expect(rendered).toContain("0 ч");
    expect(rendered).toContain("0");
  });

  it("shows 'Цель достигнута' when the goal is reached, with hours still visible", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 50);
    });
    const rendered = texts();
    expect(rendered).toContain("50 ч");
    expect(rendered).toContain("Цель достигнута");
  });

  it("caps the ring's percentage display sensibly when the goal is exceeded, without a negative remaining value", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 65);
    });
    const rendered = texts();
    expect(rendered).toContain("65 ч");
    expect(rendered).toContain("Цель достигнута");
    expect(rendered.some((t) => t.includes("-"))).toBe(false);
  });

  it("never renders the removed 'Начать служение' action or duplicate progress elements", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 33);
    });
    const rendered = texts();
    expect(rendered).not.toContain("Начать служение");
    expect(rendered.join(" ")).not.toContain("до месячной цели");
  });

  it("renders the quick '+' manual-entry button with the correct accessibility label", async () => {
    const { root } = await renderCard();
    const button = root().findByProps({ accessibilityLabel: "Добавить часы" });
    expect(button.props.accessibilityRole).toBe("button");
  });

  it("navigates to the existing Manual Time Entry route (not the timer) when the '+' button is pressed", async () => {
    mockRouter.push.mockClear();
    const { root } = await renderCard();
    const button = root().findByProps({ accessibilityLabel: "Добавить часы" });
    await act(async () => {
      button.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith("/hours/entry");
    expect(mockRouter.push).not.toHaveBeenCalledWith(expect.stringContaining("timer"));
  });
});
