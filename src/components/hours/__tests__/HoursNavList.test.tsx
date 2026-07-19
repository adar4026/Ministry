// TASK_031: the compact grouped nav list replacing the old four-card
// QuickActionsRow on the "Часы" screen — three rows (Добавить время /
// История / Статистика), each with an icon, title, secondary
// description, chevron, and a fully pressable row, routing to the same
// existing screens as before.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Text } from "react-native";
import { StoreProvider, useStore } from "@/store/StoreContext";
import { HoursNavList } from "@/components/hours/HoursNavList";

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

function rowWithLabel(root: ReactTestRenderer["root"], label: string) {
  const textNode = root.findAllByType(Text).find((n) => n.props.children === label);
  if (!textNode) return undefined;
  let node: any = textNode.parent;
  while (node && !((node.type as any)?.displayName === "Pressable" || (node.type as any)?.name === "Pressable")) {
    node = node.parent;
  }
  return node ?? undefined;
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

async function renderList(): Promise<{ store: () => Store; texts: () => string[]; root: () => ReactTestRenderer["root"] }> {
  let latest: Store | null = null;
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => { latest = s; }} />
        <HoursNavList />
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
});

describe("HoursNavList — TASK_031", () => {
  it("renders the three recommended labels and secondary descriptions", async () => {
    const { texts } = await renderList();
    const t = texts();
    expect(t).toContain("Добавить время");
    expect(t).toContain("Записать часы вручную");
    expect(t).toContain("История");
    expect(t).toContain("Все записи времени");
    expect(t).toContain("Статистика");
    expect(t).toContain("Аналитика и отчёты");
  });

  it("does not render a Таймер row (the timer moved to the hero card)", async () => {
    const { texts } = await renderList();
    expect(texts()).not.toContain("Таймер");
  });

  it("tapping a row navigates to its existing route", async () => {
    const { root } = await renderList();
    await act(async () => { rowWithLabel(root(), "Добавить время")?.props.onPress(); });
    expect(mockRouter.push).toHaveBeenCalledWith("/entry");

    await act(async () => { rowWithLabel(root(), "Статистика")?.props.onPress(); });
    expect(mockRouter.push).toHaveBeenCalledWith("/hours/stats");
  });

  it("disables the История row when there are no sessions yet", async () => {
    const { root } = await renderList();
    const row = rowWithLabel(root(), "История");
    expect(row?.props.disabled).toBe(true);
  });

  it("enables the История row once a session exists, and it navigates on tap", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([
        {
          id: "s1",
          date: "2026-07-19",
          durationMinutes: 30,
          note: "",
          source: "manual",
          createdAt: "2026-07-19T00:00:00.000Z",
          updatedAt: "2026-07-19T00:00:00.000Z",
        },
      ]),
    );
    const { root } = await renderList();
    const row = rowWithLabel(root(), "История");
    expect(row?.props.disabled).toBe(false);
    await act(async () => { row?.props.onPress(); });
    expect(mockRouter.push).toHaveBeenCalledWith("/hours/history");
  });
});
