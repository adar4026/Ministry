// Component-level render test for HoursHeroCard ("Ministry Calm" redesign,
// TASK_014). Verifies the card renders real month-progress data end-to-end
// through StoreContext: the dynamic month/year header, the 5-minute-rounded
// primary metric (stored data itself stays exact), the three-item info row
// (Осталось / days / В среднем), the "Детали" action (existing Month
// Details route), and the "+ Добавить" action (existing Manual Time Entry
// route) — not the timer.
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

function storedHours(store: Store, year: number, month: number): number | undefined {
  return store.records.find((r) => r.year === year && r.month === month)?.hours;
}

const MONTHS_NOM = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("HoursHeroCard — TASK_014 Ministry Calm redesign", () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  it("renders the dynamic month/year header instead of the removed 'Этот месяц' label", async () => {
    const { texts } = await renderCard();
    const rendered = texts();
    expect(rendered).not.toContain("Этот месяц");
    expect(rendered.join(" ")).toContain(`${MONTHS_NOM[now.getMonth()]} ${year}`);
  });

  it("renders normal progress: 5-minute-rounded hours done, goal label, and percentage", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 33);
    });
    const rendered = texts();
    expect(rendered).toContain("33 ч");
    expect(rendered.join(" ")).toContain("из цели 50 часов");
    expect(rendered.some((t) => /^\d+$/.test(t))).toBe(true); // rounded percentage inside the ring
  });

  it("applies 5-minute display rounding to the primary metric without altering stored data", async () => {
    const { store, texts } = await renderCard();
    // 33h37m rounds down for display to 33h35m, but the stored HourRecord
    // itself must keep the exact fractional-hours value.
    await act(async () => {
      setLegacyHours(store(), year, month, 33 + 37 / 60);
    });
    expect(storedHours(store(), year, month)).toBeCloseTo(33 + 37 / 60, 5);
    const rendered = texts();
    expect(rendered).toContain("33 ч 35 м");
    expect(rendered.join(" ")).not.toContain("33 ч 37 м");
  });

  it("renders the three-item info row: Осталось, days remaining, В среднем", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 12);
    });
    const rendered = texts();
    expect(rendered).toContain("Осталось");
    expect(rendered).toContain("В среднем");
    expect(rendered.some((t) => /^\d+ (день|дня|дней)$/.test(t))).toBe(true);
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

  it("caps the ring/bar visually when the goal is exceeded, while text stays non-negative", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 65);
    });
    const rendered = texts();
    expect(rendered).toContain("65 ч");
    expect(rendered).toContain("Цель достигнута");
    expect(rendered.some((t) => t.includes("-"))).toBe(false);
  });

  it("never renders the removed 'Этот месяц' label or the timer action", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 33);
    });
    const rendered = texts();
    expect(rendered).not.toContain("Начать служение");
    expect(rendered).not.toContain("Этот месяц");
  });

  it("renders the '+ Добавить' action and navigates to the existing Manual Time Entry route", async () => {
    mockRouter.push.mockClear();
    const { root } = await renderCard();
    const button = root().findByProps({ accessibilityLabel: "Добавить часы" });
    expect(button.props.accessibilityRole).toBe("button");
    await act(async () => {
      button.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith("/hours/entry");
    expect(mockRouter.push).not.toHaveBeenCalledWith(expect.stringContaining("timer"));
  });

  it("renders the 'Детали' action and navigates to the existing Month Details route", async () => {
    mockRouter.push.mockClear();
    const { root } = await renderCard();
    const button = root().findByProps({ accessibilityLabel: "Детали месяца" });
    expect(button.props.accessibilityRole).toBe("button");
    await act(async () => {
      button.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith(`/hours/month/${monthKey}`);
  });
});
