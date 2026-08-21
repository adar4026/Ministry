// Component-level render test for UpcomingEventsCard (TASK_019): the Home
// "Ближайшие события" preview must cap at 3 items and route "Показать все"
// to the new dedicated /upcoming-events screen instead of the "События" tab
// (/timeline).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { UpcomingEventsCard } from "@/components/UpcomingEventsCard";
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
        <UpcomingEventsCard />
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
  mockRouter.push.mockClear();
});

describe("UpcomingEventsCard — TASK_056 unified 'События'-style cards", () => {
  it("labels today's event as 'Сегодня'", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      store().saveEvent({ date: futureISO(0), title: "Сегодняшнее", category: "other" });
    });
    expect(texts()).toContain("Сегодня");
  });

  it("labels a future event with the unified 'через N дн.' relative phrase", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      store().saveEvent({ date: futureISO(15), title: "Конгресс", category: "other" });
    });
    const rendered = texts().join(" ");
    expect(rendered).toContain("через 15 дн.");
    expect(rendered).not.toContain("Через 15 дней");
  });

  it("renders the DD-MM-YYYY date form on Home, not the old human/ISO forms", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      store().saveEvent({ date: futureISO(3), title: "B", category: "other" });
    });
    const rendered = texts().join(" ");
    expect(rendered).toMatch(/\d{2}-\d{2}-\d{4}/);
  });

  it("keeps the relative phrase for an event far beyond the old 30-day horizon", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      store().saveEvent({ date: futureISO(200), title: "Далёкое", category: "other" });
    });
    const rendered = texts().join(" ");
    expect(rendered).toMatch(/через \d+ мес\./);
  });

  it("renders the event title alone — never glued to a date", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      store().saveEvent({ date: futureISO(2), title: "Оплатить Telegram Premium", category: "other" });
    });
    expect(texts()).toContain("Оплатить Telegram Premium");
  });
});

describe("UpcomingEventsCard — TASK_019", () => {
  it("renders the empty state and hides 'Показать все' when there are no upcoming events", async () => {
    const { texts } = await renderCard();
    const rendered = texts();
    expect(rendered).toContain("Нет предстоящих событий");
    expect(rendered.join(" ")).not.toContain("Показать все");
  });

  it("renders no more than three upcoming events out of five stored ones", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      for (let i = 1; i <= 5; i++) {
        store().saveEvent({ date: futureISO(i), title: `Событие ${i}`, category: "other" });
      }
    });
    const rendered = texts().join(" ");
    expect(rendered).toContain("Событие 1");
    expect(rendered).toContain("Событие 2");
    expect(rendered).toContain("Событие 3");
    expect(rendered).not.toContain("Событие 4");
    expect(rendered).not.toContain("Событие 5");
  });

  it("'Показать все' navigates to the dedicated /upcoming-events screen, not the События tab", async () => {
    const { store, root } = await renderCard();
    await act(async () => {
      store().saveEvent({ date: futureISO(1), title: "Событие", category: "other" });
    });
    const button = root().findByProps({ accessibilityLabel: "Показать все предстоящие события" });
    await act(async () => {
      button.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith("/upcoming-events");
    expect(mockRouter.push).not.toHaveBeenCalledWith("/timeline");
  });
});
