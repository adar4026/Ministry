// TASK_031: the redesigned "Часы" screen. Verifies the removed dashboard
// blocks are gone (service-year grid, progress ring/chips, pace status,
// heat map, old four-card QuickActionsRow) and the new minimal
// composition is present (large title, embedded timer, compact nav
// list) — see docs/TASKS/TASK_031_HOURS_PAGE_REDESIGN.md.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, useStore } from "@/store/StoreContext";
import { TimerHeroCard } from "@/components/hours/TimerHeroCard";
import { HoursNavList } from "@/components/hours/HoursNavList";
import HoursDashboard from "../index";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

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
        <HoursDashboard />
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

describe("Hours screen — TASK_031 redesign", () => {
  it("shows the large 'Часы' title and subtitle, not inside a heavy card", async () => {
    const { texts } = await renderScreen();
    expect(texts()).toContain("Часы");
    expect(texts()).toContain("Учёт служебного времени");
  });

  it("embeds the timer as the page's main visual element", async () => {
    const { root } = await renderScreen();
    expect(root().findAllByType(TimerHeroCard)).toHaveLength(1);
  });

  it("renders the compact nav list with the three remaining actions", async () => {
    const { root, texts } = await renderScreen();
    expect(root().findAllByType(HoursNavList)).toHaveLength(1);
    expect(texts()).toContain("Добавить время");
    expect(texts()).toContain("История");
    expect(texts()).toContain("Статистика");
  });

  it("no longer renders the 'Служебный год' service-year block", async () => {
    const { texts } = await renderScreen();
    expect(texts().some((t) => t.includes("Служебный год"))).toBe(false);
  });

  it("no longer renders the heat map section", async () => {
    const { texts } = await renderScreen();
    expect(texts().some((t) => t.includes("Тепловая карта"))).toBe(false);
  });

  it("no longer renders the monthly goal chips or pace status", async () => {
    const { texts } = await renderScreen();
    const t = texts();
    expect(t).not.toContain("До цели осталось");
    expect(t).not.toContain("Осталось дней");
    expect(t.some((s) => s.startsWith("Темп:"))).toBe(false);
    expect(t).not.toContain("Оперёд");
    expect(t).not.toContain("Отстаёт");
    expect(t).not.toContain("В графике");
  });

  it("starts and stops the timer through the same screen (integration, current architecture)", async () => {
    // Fake timers so the running-mode 1s tick (src/hooks/useTimer.ts) never
    // fires as a real interval past this test's end — it would otherwise
    // keep updating state after Jest tears the environment down.
    jest.useFakeTimers();
    try {
      const { root, texts } = await renderScreen();
      expect(texts()).toContain("Таймер не запущен");

      const startText = root().findAllByType(require("react-native").Text)
        .find((n: any) => n.props.children === "Начать служение");
      let node: any = startText?.parent;
      while (node && !((node.type as any)?.displayName === "Pressable" || (node.type as any)?.name === "Pressable")) {
        node = node.parent;
      }
      await act(async () => { node?.props.onPress(); });

      expect(texts()).toContain("Запущен");

      const stopText = root().findAllByType(require("react-native").Text)
        .find((n: any) => n.props.children === "Стоп");
      let stopNode: any = stopText?.parent;
      while (stopNode && !((stopNode.type as any)?.displayName === "Pressable" || (stopNode.type as any)?.name === "Pressable")) {
        stopNode = stopNode.parent;
      }
      await act(async () => { stopNode?.props.onPress(); });

      expect(texts()).toContain("Сохранить время");
    } finally {
      jest.useRealTimers();
    }
  });
});
