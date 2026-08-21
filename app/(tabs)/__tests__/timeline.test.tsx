// TASK_041 — "События" redesign: renamed top topic filters (no "Задания"),
// dark-background/white-card visual redesign, and swipe-left-to-delete for
// individual event/talk cards. This screen previously had no test coverage
// at all.
//
// react-native-gesture-handler's Swipeable can't be driven by a real drag in
// react-test-renderer (there's no native/DOM gesture runtime here), so it's
// replaced with a trivial stand-in that always renders both the card content
// and the revealed delete action — this exercises the exact same onDelete
// wiring and accessibility contract that the real Swipeable would trigger
// once a real swipe completes, without needing to simulate the gesture
// itself.
import { Pressable, Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StoreProvider, useStore } from "@/store/StoreContext";
import type { MinistryEvent, Talk } from "@/types";
import TimelineScreen from "../timeline";

// TASK_058 — AddActionSheet (rendered by this screen) reads safe-area
// insets; same fixed metrics used by profile.test.tsx/ProfileEditSheet.test.tsx.
const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { router: mockRouter } = jest.requireMock("expo-router") as { router: { push: jest.Mock } };

jest.mock("react-native-gesture-handler", () => {
  const RN = jest.requireActual("react-native");
  return {
    Swipeable: ({ children, renderRightActions }: { children: React.ReactNode; renderRightActions?: () => React.ReactNode }) => (
      <RN.View>
        {children}
        {renderRightActions ? renderRightActions() : null}
      </RN.View>
    ),
  };
});

jest.setTimeout(30000);

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady: (store: Store) => void }) {
  const store = useStore();
  onReady(store);
  return null;
}

function evt(id: string, date: string, title: string, category: MinistryEvent["category"]): MinistryEvent {
  return { id, date, title, category };
}

function talk(id: string, date: string, number: number | null, title: string, location: string): Talk {
  return { id, date, number, title, location };
}

// react-native's `Pressable` export is `React.memo(InnerPressable)` —
// react-test-renderer reports a TestInstance's `.type` as the inner
// function, not the memo wrapper (same convention already established in
// app/(tabs)/hours/month/__tests__/monthDetailsScreen.test.tsx).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PressableInner = (Pressable as any).type;

function pressableWithLabel(root: ReactTestRenderer["root"], label: string) {
  return root.findAll(
    (n) => n.type === PressableInner && !!n.props && n.props.accessibilityLabel === label,
  )[0];
}

function pressableAncestorOfText(root: ReactTestRenderer["root"], text: string) {
  const textNode = root.findAllByType(Text).find((n) => n.props.children === text);
  if (!textNode) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = textNode.parent;
  while (node && node.type !== PressableInner) node = node.parent;
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

async function renderScreen(): Promise<{
  texts: () => string[];
  root: () => ReactTestRenderer["root"];
  store: () => Store;
}> {
  let latest: Store | null = null;
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <StoreProvider>
          <Harness onReady={(s) => { latest = s; }} />
          <TimelineScreen />
        </StoreProvider>
      </SafeAreaProvider>,
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
    store: () => latest as unknown as Store,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

// Helper to find the TextInput inside a given Field-wrapped modal, matched by
// its current placeholder (same shape as other TextField lookups in this
// file, e.g. `placeholder: "Поиск..."`).
function textFieldByPlaceholder(root: ReactTestRenderer["root"], placeholder: string) {
  return root.findByProps({ placeholder });
}

describe("Events screen (TASK_041) — top topic filters", () => {
  it("renames the topic labels and does not add «Задания»", async () => {
    const { texts } = await renderScreen();
    const t = texts();
    expect(t).toContain("Публичные");
    expect(t).toContain("Назначения");
    expect(t).toContain("Школы");
    expect(t).not.toContain("Публичные речи");
    expect(t).not.toContain("Назначение");
    expect(t).not.toContain("Школа");
    expect(t).not.toContain("Задания");
  });

  it("keeps existing category filtering behavior", async () => {
    await AsyncStorage.setItem(
      "mj_events_v1",
      JSON.stringify([
        evt("e1", "2026-07-01", "Собрание пионеров", "pioneer"),
        evt("e2", "2026-07-02", "Встреча по назначению", "appointment"),
      ]),
    );
    const { root, texts } = await renderScreen();
    expect(texts()).toEqual(expect.arrayContaining(["Собрание пионеров", "Встреча по назначению"]));

    const appointmentChip = pressableAncestorOfText(root(), "Назначения");
    expect(appointmentChip).toBeTruthy();
    await act(async () => {
      appointmentChip!.props.onPress();
    });

    const t = texts();
    expect(t).toContain("Встреча по назначению");
    expect(t).not.toContain("Собрание пионеров");
  });

  it("keeps existing search filtering behavior", async () => {
    await AsyncStorage.setItem(
      "mj_events_v1",
      JSON.stringify([
        evt("e1", "2026-07-01", "Переезд в новый дом", "move"),
        evt("e2", "2026-07-02", "Другое событие", "other"),
      ]),
    );
    const { root, texts } = await renderScreen();
    const search = root().findByProps({ placeholder: "Поиск..." });
    await act(async () => {
      search.props.onChangeText("переезд");
    });
    const t = texts();
    expect(t).toContain("Переезд в новый дом");
    expect(t).not.toContain("Другое событие");
  });
});

describe("Events screen (TASK_041) — card redesign", () => {
  it("shows an empty-state message when there are no items", async () => {
    const { texts } = await renderScreen();
    expect(texts()).toContain("Нет событий");
  });

  it("no longer renders the old vertical rail element style", async () => {
    // Regression guard: the removed `rail` View used `position: "absolute"`
    // with a `left`/`width` background line. Assert no host node in the
    // tree carries that exact shape anymore.
    await AsyncStorage.setItem(
      "mj_events_v1",
      JSON.stringify([evt("e1", "2026-07-01", "Событие", "other")]),
    );
    const { root } = await renderScreen();
    const rails = root().findAll((n) => {
      const s = n.props?.style;
      const flat = Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s;
      return !!flat && flat.position === "absolute" && typeof flat.width === "number" && flat.width <= 2;
    });
    expect(rails.length).toBe(0);
  });
});

describe("Events screen (TASK_041) — swipe-to-delete", () => {
  it("exposes an accessible delete action for an event card and deletes only that event", async () => {
    await AsyncStorage.setItem(
      "mj_events_v1",
      JSON.stringify([
        evt("e1", "2026-07-01", "Первое событие", "other"),
        evt("e2", "2026-07-02", "Второе событие", "other"),
      ]),
    );
    const { root, texts, store } = await renderScreen();

    const deleteBtn = pressableWithLabel(root(), "Удалить событие: Первое событие");
    expect(deleteBtn).toBeTruthy();
    expect(deleteBtn.props.accessibilityRole).toBe("button");

    await act(async () => {
      deleteBtn.props.onPress();
    });

    expect(store().events.find((e) => e.id === "e1")).toBeUndefined();
    expect(store().events.find((e) => e.id === "e2")).toBeTruthy();
    const t = texts();
    expect(t).not.toContain("Первое событие");
    expect(t).toContain("Второе событие");
  });

  it("exposes an accessible delete action for a talk card and deletes only that talk", async () => {
    await AsyncStorage.setItem(
      "mj_talks_v1",
      JSON.stringify([
        talk("t1", "2026-07-01", 12, "Первая речь", "Зал царства"),
        talk("t2", "2026-07-02", 13, "Вторая речь", "Зал царства"),
      ]),
    );
    const { root, texts, store } = await renderScreen();

    const deleteBtn = pressableWithLabel(root(), "Удалить речь: Первая речь");
    expect(deleteBtn).toBeTruthy();

    await act(async () => {
      deleteBtn.props.onPress();
    });

    expect(store().talks.find((t) => t.id === "t1")).toBeUndefined();
    expect(store().talks.find((t) => t.id === "t2")).toBeTruthy();
    const t = texts();
    expect(t).not.toContain("Первая речь");
    expect(t).toContain("Вторая речь");
  });

  it("keeps the normal tap action (edit) working after the swipe redesign", async () => {
    await AsyncStorage.setItem(
      "mj_events_v1",
      JSON.stringify([evt("e1", "2026-07-01", "Редактируемое событие", "other")]),
    );
    const { root } = await renderScreen();

    const editBtn = pressableAncestorOfText(root(), "✏");
    expect(editBtn).toBeTruthy();
    await act(async () => {
      editBtn!.props.onPress();
    });

    const titleInput = root()
      .findAllByType(require("react-native").TextInput)
      .find((n: { props: { value?: string } }) => n.props.value === "Редактируемое событие");
    expect(titleInput).toBeTruthy();
  });
});

// TASK_045 — header block, "Добавить событие"/"Добавить тему" actions, and
// the exact (non-rounded) calendar duration on cards.
describe("Events screen (TASK_045) — header and actions", () => {
  it("shows the page title and subtitle above the search field", async () => {
    const { texts } = await renderScreen();
    const t = texts();
    expect(t).toContain("События");
    expect(t).toContain("Важные даты и мероприятия");
  });

  it("'+' opens the add menu, and 'Добавить событие' navigates to /add?focus=event, reusing the existing form/route", async () => {
    const { root } = await renderScreen();
    await act(async () => {
      pressableWithLabel(root(), "Добавить")!.props.onPress();
    });
    const btn = pressableAncestorOfText(root(), "Добавить событие");
    expect(btn).toBeTruthy();
    await act(async () => {
      btn!.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith("/add?focus=event");
  });

  it("shows the exact calendar duration (with a day remainder), not a whole month rounded off", async () => {
    // 12 days back from "today" is always < 1 calendar month, regardless of
    // when this test runs — no month-boundary ambiguity to account for.
    const today = new Date();
    const past = new Date(today);
    past.setDate(past.getDate() - 12);
    const iso = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}-${String(past.getDate()).padStart(2, "0")}`;
    await AsyncStorage.setItem("mj_events_v1", JSON.stringify([evt("e1", iso, "Старое событие", "other")]));
    const { texts } = await renderScreen();
    expect(texts()).toContain("прошло 12 дн.");
  });
});

// TASK_058 — "Добавить тему" now lives inside AddActionSheet, opened via the
// compact "+" header button; opens the same, unchanged topic-creation Modal.
function openAddTopicModal(root: ReactTestRenderer["root"]) {
  pressableWithLabel(root, "Добавить")!.props.onPress();
}

describe("Events screen (TASK_045/TASK_058) — custom topics", () => {
  it("rejects an empty topic name with a visible message and no filter chip added", async () => {
    const { root, texts } = await renderScreen();
    await act(async () => {
      openAddTopicModal(root());
    });
    await act(async () => {
      pressableAncestorOfText(root(), "Добавить тему")!.props.onPress();
    });
    await act(async () => {
      pressableAncestorOfText(root(), "Сохранить")!.props.onPress();
    });
    expect(texts()).toContain("Введите название темы.");
  });

  it("creates a new topic and shows it immediately as a filter chip", async () => {
    const { root, texts, store } = await renderScreen();
    await act(async () => {
      openAddTopicModal(root());
    });
    await act(async () => {
      pressableAncestorOfText(root(), "Добавить тему")!.props.onPress();
    });
    const input = textFieldByPlaceholder(root(), "Например, Конгрессы");
    await act(async () => {
      input.props.onChangeText("Конгрессы");
    });
    await act(async () => {
      pressableAncestorOfText(root(), "Сохранить")!.props.onPress();
    });
    expect(store().customCategories.map((c) => c.name)).toContain("Конгрессы");
    expect(texts()).toContain("Конгрессы");
  });

  it("rejects a duplicate topic name (case/whitespace-insensitive) with a visible message", async () => {
    const { root, texts, store } = await renderScreen();
    await act(async () => {
      store().addCustomCategory("Поездки");
    });
    await act(async () => {
      openAddTopicModal(root());
    });
    await act(async () => {
      pressableAncestorOfText(root(), "Добавить тему")!.props.onPress();
    });
    const input = textFieldByPlaceholder(root(), "Например, Конгрессы");
    await act(async () => {
      input.props.onChangeText("  поездки  ");
    });
    await act(async () => {
      pressableAncestorOfText(root(), "Сохранить")!.props.onPress();
    });
    expect(texts()).toContain("Такая тема уже существует.");
    expect(store().customCategories).toHaveLength(1);
  });

  it("shows an event tagged with a custom topic when that topic's filter is selected", async () => {
    await AsyncStorage.setItem(
      "mj_custom_categories_v1",
      JSON.stringify([{ id: "cc1", name: "Конгрессы" }]),
    );
    await AsyncStorage.setItem(
      "mj_events_v1",
      JSON.stringify([
        evt("e1", "2026-07-01", "Окружной конгресс", "cc1"),
        evt("e2", "2026-07-02", "Другое событие", "other"),
      ]),
    );
    const { root, texts } = await renderScreen();
    expect(texts()).toEqual(expect.arrayContaining(["Окружной конгресс", "Другое событие"]));

    const chip = pressableAncestorOfText(root(), "Конгрессы");
    expect(chip).toBeTruthy();
    await act(async () => {
      chip!.props.onPress();
    });

    const t = texts();
    expect(t).toContain("Окружной конгресс");
    expect(t).not.toContain("Другое событие");
  });
});

describe("Events screen (TASK_058) — collapsible 'Все темы'", () => {
  it("hides the system 'Событие' topic behind 'Все темы' by default", async () => {
    const { texts } = await renderScreen();
    expect(texts()).not.toContain("Событие");
  });

  it("reveals hidden topics when 'Все темы' is expanded and hides them again on second press", async () => {
    const { root, texts } = await renderScreen();
    await act(async () => {
      pressableWithLabel(root(), "Показать остальные темы")!.props.onPress();
    });
    expect(texts()).toContain("Событие");

    await act(async () => {
      pressableWithLabel(root(), "Свернуть остальные темы")!.props.onPress();
    });
    expect(texts()).not.toContain("Событие");
  });

  it("shows a dynamic created-topics count in 'Все темы (N)', counting every user-created topic", async () => {
    const { texts, store } = await renderScreen();
    expect(texts()).toContain("Все темы (0)");

    // "Конгрессы" is the one custom topic matched into the primary row by
    // name (TASK_058); it still counts toward N even though it isn't
    // itself hidden.
    await act(async () => {
      store().addCustomCategory("Конгрессы");
    });
    await act(async () => {
      store().addCustomCategory("Здоровье");
    });
    expect(texts()).toContain("Все темы (2)");
  });

  it("keeps a hidden topic filtering correctly once selected, without disturbing the primary row", async () => {
    await AsyncStorage.setItem(
      "mj_events_v1",
      JSON.stringify([
        evt("e1", "2026-07-01", "Пионерское собрание", "pioneer"),
        evt("e2", "2026-07-02", "Разное", "other"),
      ]),
    );
    const { root, texts } = await renderScreen();
    await act(async () => {
      pressableWithLabel(root(), "Показать остальные темы")!.props.onPress();
    });
    const hiddenChip = pressableAncestorOfText(root(), "Событие");
    expect(hiddenChip).toBeTruthy();
    await act(async () => {
      hiddenChip!.props.onPress();
    });

    const t = texts();
    expect(t).toContain("Разное");
    expect(t).not.toContain("Пионерское собрание");
    // the primary "Пионер" chip is still there, unaffected by the hidden
    // section being expanded and filtered on.
    expect(t).toContain("Пионер");
  });
});
