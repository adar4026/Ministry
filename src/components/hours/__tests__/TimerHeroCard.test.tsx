// TASK_031: the Hours screen's new embedded timer hero card. Drives the
// same useTimer() hook as app/(tabs)/hours/timer.tsx end-to-end
// (start/pause/resume/stop/save) — no business logic is duplicated or
// reimplemented here, only a new presentation of the existing hook.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Text, TextInput } from "react-native";
import { StoreProvider, useStore } from "@/store/StoreContext";
import { confirmAsync } from "@/utils/confirm";
import { TimerHeroCard } from "@/components/hours/TimerHeroCard";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { router: mockRouter } = jest.requireMock("expo-router") as { router: { push: jest.Mock } };

// TASK_046: the new "Отменить сессию" full-cancel action goes through
// confirmAsync (not a bare Alert.alert, a total no-op on react-native-web —
// see src/utils/confirm.ts and docs/TASKS/TASK_046.md §4.3) — mocked here so
// the test controls the outcome deterministically.
jest.mock("@/utils/confirm", () => ({ confirmAsync: jest.fn() }));
const mockConfirmAsync = confirmAsync as jest.Mock;

jest.setTimeout(30000);

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady: (store: Store) => void }) {
  const store = useStore();
  onReady(store);
  return null;
}

function buttonWithLabel(root: ReactTestRenderer["root"], label: string) {
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

async function renderCard(): Promise<{ store: () => Store; texts: () => string[]; root: () => ReactTestRenderer["root"] }> {
  let latest: Store | null = null;
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => { latest = s; }} />
        <TimerHeroCard />
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

describe("TimerHeroCard — TASK_031", () => {
  it("idle: shows a textual status label (not color-only) and a primary start button", async () => {
    const { texts } = await renderCard();
    expect(texts()).toContain("Таймер не запущен");
    expect(texts()).toContain("Начать служение");
  });

  it("Начать служение starts the timer and flips the card to the running state with a live duration", async () => {
    const T0 = new Date("2026-07-19T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    try {
      const { root, texts } = await renderCard();
      const startBtn = buttonWithLabel(root(), "Начать служение");
      await act(async () => {
        startBtn?.props.onPress();
      });
      expect(texts()).toContain("Запущен");
      expect(texts().join(" ")).toMatch(/0:00|0:0\d/);
    } finally {
      jest.useRealTimers();
    }
  });

  it("Пауза pauses the timer and shows the 'Пауза' status text with a Продолжить button", async () => {
    const T0 = new Date("2026-07-19T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    try {
      const { root, texts } = await renderCard();
      await act(async () => { buttonWithLabel(root(), "Начать служение")?.props.onPress(); });
      await act(async () => { buttonWithLabel(root(), "Пауза")?.props.onPress(); });
      expect(texts()).toContain("Пауза");
      expect(texts()).toContain("Продолжить");
    } finally {
      jest.useRealTimers();
    }
  });

  it("Стоп banks the elapsed time and opens the inline save form prefilled from banked seconds", async () => {
    const T0 = new Date("2026-07-19T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    try {
      const { root, texts } = await renderCard();
      await act(async () => { buttonWithLabel(root(), "Начать служение")?.props.onPress(); });
      await act(async () => { jest.setSystemTime(new Date(T0.getTime() + 125_000)); });
      await act(async () => { buttonWithLabel(root(), "Стоп")?.props.onPress(); });

      expect(texts()).toContain("Сохранить время");
      expect(texts()).toContain("Сохранить");
      // prefillMin = ceil(125/60) = 3
      const durationInput = root().findAllByType(TextInput)[0];
      expect(durationInput.props.value).toBe("3");
    } finally {
      jest.useRealTimers();
    }
  });

  it("Сохранить appends exactly one session and returns the card to idle", async () => {
    const T0 = new Date("2026-07-19T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    try {
      const { root, store, texts } = await renderCard();
      await act(async () => { buttonWithLabel(root(), "Начать служение")?.props.onPress(); });
      await act(async () => { jest.setSystemTime(new Date(T0.getTime() + 125_000)); });
      await act(async () => { buttonWithLabel(root(), "Стоп")?.props.onPress(); });
      await act(async () => {
        buttonWithLabel(root(), "Сохранить")?.props.onPress();
        await Promise.resolve();
      });

      expect(store().sessions).toHaveLength(1);
      expect(store().sessions[0].source).toBe("timer");
      expect(store().sessions[0].durationMinutes).toBe(3);
      expect(texts()).toContain("Таймер не запущен");
    } finally {
      jest.useRealTimers();
    }
  });

  it("paused view exposes 'Отменить сессию', and Save form's Отмена alone does not discard (existing business logic unchanged)", async () => {
    const T0 = new Date("2026-07-19T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    try {
      const { root, texts } = await renderCard();
      await act(async () => { buttonWithLabel(root(), "Начать служение")?.props.onPress(); });
      await act(async () => { jest.setSystemTime(new Date(T0.getTime() + 125_000)); });
      await act(async () => { buttonWithLabel(root(), "Стоп")?.props.onPress(); });
      await act(async () => { buttonWithLabel(root(), "Отмена")?.props.onPress(); });

      expect(texts()).toContain("Пауза");
      expect(texts()).toContain("Продолжить");
      expect(texts()).toContain("Отменить сессию");
      expect(mockConfirmAsync).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("confirmed 'Отменить сессию' fully discards: card returns to idle, mj_timer_v1 reset, banked time gone", async () => {
    const T0 = new Date("2026-07-19T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    mockConfirmAsync.mockResolvedValue(true);
    try {
      const { root, texts } = await renderCard();
      await act(async () => { buttonWithLabel(root(), "Начать служение")?.props.onPress(); });
      await act(async () => { jest.setSystemTime(new Date(T0.getTime() + 125_000)); });
      await act(async () => { buttonWithLabel(root(), "Стоп")?.props.onPress(); });
      await act(async () => { buttonWithLabel(root(), "Отмена")?.props.onPress(); });

      await act(async () => {
        buttonWithLabel(root(), "Отменить сессию")?.props.onPress();
        await Promise.resolve();
      });

      expect(mockConfirmAsync).toHaveBeenCalledWith("Отменить сессию?", "Текущее время не будет сохранено.");
      expect(texts()).toContain("Таймер не запущен");
      expect(texts()).toContain("Начать служение");
      expect(texts()).not.toContain("Пауза");

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

  it("declining the 'Отменить сессию' confirmation leaves the paused session untouched", async () => {
    const T0 = new Date("2026-07-19T10:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    mockConfirmAsync.mockResolvedValue(false);
    try {
      const { root, texts } = await renderCard();
      await act(async () => { buttonWithLabel(root(), "Начать служение")?.props.onPress(); });
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

  it("does not attempt to render the recovery-screen/clock-rollback states itself — links out to /hours/timer instead", async () => {
    // Seed a timer state that's been running for >15 minutes so hydration
    // classifies it as recovery-screen (see classifyRecovery in
    // src/data/timer.ts) — the same rule timer.tsx already relies on.
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
    try {
      const { root, texts } = await renderCard();
      expect(texts()).toContain("Таймер требует внимания");
      const openBtn = buttonWithLabel(root(), "Открыть");
      await act(async () => { openBtn?.props.onPress(); });
      expect(mockRouter.push).toHaveBeenCalledWith("/hours/timer");
    } finally {
      jest.useRealTimers();
    }
  });
});
