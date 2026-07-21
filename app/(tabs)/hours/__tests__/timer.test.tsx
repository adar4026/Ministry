// TASK_046 — this screen previously had no test coverage at all. Covers:
// 1) the regression guard for the reported bug (Стоп -> save overlay
//    "Отмена" left the timer alive in "paused", still resumable/re-savable
//    — that part of the behavior is unchanged on purpose, see TASK_046.md
//    §4.3), and
// 2) the new, explicit "Отменить сессию" full-cancel action, which is the
//    actual fix — it must fully reset useTimer() state via discard() only
//    after a confirmed Alert (mocked via confirmAsync, same pattern as
//    monthDetailsScreen.test.tsx/entryScreen.test.tsx — never a bare
//    Alert.alert, a total no-op on react-native-web).
// Also covers the pre-existing recovery-screen "Удалить" confirmation,
// migrated in this task from a bare Alert.alert (broken on web, see
// docs/TASKS/TASK_046.md §4.3) to the same confirmAsync helper.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Text, TextInput } from "react-native";
import { StoreProvider, useStore } from "@/store/StoreContext";
import { confirmAsync } from "@/utils/confirm";
import TimerScreen from "../timer";

jest.mock("@/utils/confirm", () => ({ confirmAsync: jest.fn() }));
const mockConfirmAsync = confirmAsync as jest.Mock;

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({}),
}));

jest.setTimeout(30000);

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady: (store: Store) => void }) {
  const store = useStore();
  onReady(store);
  return null;
}

function buttonWithLabel(root: ReactTestRenderer["root"], label: string) {
  // "Сохранить" (and a few other labels) matches both a static header/status
  // Text and the actual button's Text — search every match, not just the
  // first, and keep the first ancestor chain that actually reaches an
  // onPress-bearing node.
  const textNodes = root.findAllByType(Text).filter((n) => n.props.children === label);
  for (const textNode of textNodes) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = textNode.parent;
    while (node && typeof node.props?.onPress !== "function") node = node.parent;
    if (node) return node;
  }
  return undefined;
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

async function renderScreen(): Promise<{ store: () => Store; texts: () => string[]; root: () => ReactTestRenderer["root"] }> {
  let latest: Store | null = null;
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => { latest = s; }} />
        <TimerScreen />
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

describe("TimerScreen (/hours/timer) — TASK_046 cancel flow", () => {
  it("Save overlay's Отмена only closes the overlay — the paused session stays alive, unchanged (existing business logic)", async () => {
    const T0 = new Date("2026-07-19T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    try {
      const { root, texts } = await renderScreen();
      await act(async () => { buttonWithLabel(root(), "Старт")?.props.onPress(); });
      await act(async () => { jest.setSystemTime(new Date(T0.getTime() + 125_000)); });
      await act(async () => { buttonWithLabel(root(), "Стоп")?.props.onPress(); });
      expect(texts()).toContain("Сохранить");

      await act(async () => { buttonWithLabel(root(), "Отмена")?.props.onPress(); });

      // Back to the paused view — banked time preserved, still resumable.
      expect(texts()).toContain("Пауза");
      expect(texts().join(" ")).toMatch(/2:05|0:0?2:05/); // formatHM(125s) == "2:05"
      expect(texts()).toContain("Продолжить");
      expect(mockConfirmAsync).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("paused view exposes an explicit 'Отменить сессию' action, separate from Стоп/Продолжить", async () => {
    const T0 = new Date("2026-07-19T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    try {
      const { root, texts } = await renderScreen();
      await act(async () => { buttonWithLabel(root(), "Старт")?.props.onPress(); });
      await act(async () => { jest.setSystemTime(new Date(T0.getTime() + 60_000)); });
      await act(async () => { buttonWithLabel(root(), "Стоп")?.props.onPress(); });
      await act(async () => { buttonWithLabel(root(), "Отмена")?.props.onPress(); });

      expect(texts()).toContain("Отменить сессию");
    } finally {
      jest.useRealTimers();
    }
  });

  it("confirmed 'Отменить сессию' fully discards the session: idle view, zero banked time, mj_timer_v1 reset", async () => {
    const T0 = new Date("2026-07-19T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    mockConfirmAsync.mockResolvedValue(true);
    try {
      const { root, texts } = await renderScreen();
      await act(async () => { buttonWithLabel(root(), "Старт")?.props.onPress(); });
      await act(async () => { jest.setSystemTime(new Date(T0.getTime() + 125_000)); });
      await act(async () => { buttonWithLabel(root(), "Стоп")?.props.onPress(); });
      await act(async () => { buttonWithLabel(root(), "Отмена")?.props.onPress(); });
      expect(texts()).toContain("Пауза");

      await act(async () => {
        buttonWithLabel(root(), "Отменить сессию")?.props.onPress();
        await Promise.resolve();
      });

      expect(mockConfirmAsync).toHaveBeenCalledWith("Отменить сессию?", "Текущее время не будет сохранено.");
      expect(texts()).toContain("Нет активного таймера");
      expect(texts()).not.toContain("Пауза");
      expect(texts()).not.toContain("Продолжить");

      const raw = await AsyncStorage.getItem("mj_timer_v1");
      expect(JSON.parse(raw as string)).toEqual({
        status: "idle",
        startedAt: null,
        firstStartedAt: null,
        bankedSeconds: 0,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not restore the cancelled session after a fresh mount (crash-recovery hydration)", async () => {
    const T0 = new Date("2026-07-19T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    mockConfirmAsync.mockResolvedValue(true);
    try {
      const { root, texts } = await renderScreen();
      await act(async () => { buttonWithLabel(root(), "Старт")?.props.onPress(); });
      await act(async () => { jest.setSystemTime(new Date(T0.getTime() + 60_000)); });
      await act(async () => { buttonWithLabel(root(), "Стоп")?.props.onPress(); });
      await act(async () => { buttonWithLabel(root(), "Отмена")?.props.onPress(); });
      await act(async () => {
        buttonWithLabel(root(), "Отменить сессию")?.props.onPress();
        await Promise.resolve();
      });

      const { texts: texts2 } = await renderScreen();
      expect(texts2()).toContain("Нет активного таймера");
    } finally {
      jest.useRealTimers();
    }
  });

  it("declining the 'Отменить сессию' confirmation leaves the paused session untouched", async () => {
    const T0 = new Date("2026-07-19T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    mockConfirmAsync.mockResolvedValue(false);
    try {
      const { root, texts } = await renderScreen();
      await act(async () => { buttonWithLabel(root(), "Старт")?.props.onPress(); });
      await act(async () => { jest.setSystemTime(new Date(T0.getTime() + 60_000)); });
      await act(async () => { buttonWithLabel(root(), "Стоп")?.props.onPress(); });
      await act(async () => { buttonWithLabel(root(), "Отмена")?.props.onPress(); });

      await act(async () => {
        buttonWithLabel(root(), "Отменить сессию")?.props.onPress();
        await Promise.resolve();
      });

      expect(texts()).toContain("Пауза");
      expect(texts()).toContain("Продолжить");
    } finally {
      jest.useRealTimers();
    }
  });

  it("regression: a normal Стоп -> Сохранить still appends exactly one Session and returns to idle", async () => {
    const T0 = new Date("2026-07-19T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    try {
      const { root, store, texts } = await renderScreen();
      await act(async () => { buttonWithLabel(root(), "Старт")?.props.onPress(); });
      await act(async () => { jest.setSystemTime(new Date(T0.getTime() + 125_000)); });
      await act(async () => { buttonWithLabel(root(), "Стоп")?.props.onPress(); });

      const durationInput = root().findAllByType(TextInput)[0];
      expect(durationInput.props.value).toBe("3");

      await act(async () => {
        buttonWithLabel(root(), "Сохранить")?.props.onPress();
        await Promise.resolve();
      });

      expect(store().sessions).toHaveLength(1);
      expect(store().sessions[0].source).toBe("timer");
      expect(texts()).toContain("Нет активного таймера");
    } finally {
      jest.useRealTimers();
    }
  });

  it("recovery-screen 'Удалить' now goes through confirmAsync (was a no-op-on-web bare Alert.alert) and discards on confirm", async () => {
    const started = new Date("2026-07-19T09:00:00.000Z");
    await AsyncStorage.setItem(
      "mj_timer_v1",
      JSON.stringify({
        status: "running",
        startedAt: started.toISOString(),
        firstStartedAt: started.toISOString(),
        bankedSeconds: 0,
      }),
    );
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-19T09:20:00.000Z"));
    mockConfirmAsync.mockResolvedValue(true);
    try {
      const { root, texts } = await renderScreen();
      expect(texts()).toContain("Таймер работал долго");

      await act(async () => {
        buttonWithLabel(root(), "Удалить")?.props.onPress();
        await Promise.resolve();
      });

      expect(mockConfirmAsync).toHaveBeenCalledWith("Удалить?", "Всё отслеженное время будет потеряно.");
      expect(texts()).toContain("Нет активного таймера");
    } finally {
      jest.useRealTimers();
    }
  });
});
