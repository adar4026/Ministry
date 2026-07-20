// TASK_034 — legacy HourRecord edit/delete and Session long-press delete on
// /hours/month/[key], both now going through confirmAsync instead of a bare
// Alert.alert (a total no-op on react-native-web — see src/utils/confirm.ts).
// This screen previously had no test coverage at all.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Pressable, Text } from "react-native";
import { StoreProvider, useStore } from "@/store/StoreContext";
import { confirmAsync } from "@/utils/confirm";
import MonthDetailsScreen from "../[key]";

jest.mock("@/utils/confirm", () => ({ confirmAsync: jest.fn() }));
const mockConfirmAsync = confirmAsync as jest.Mock;

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

function buttonWithLabel(root: ReactTestRenderer["root"], label: string) {
  const textNode = root.findAllByType(Text).find((n) => n.props.children === label);
  if (!textNode) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = textNode.parent;
  while (node && typeof node.props?.onPress !== "function") node = node.parent;
  return node ?? undefined;
}

// History session rows (TASK_040 — shared HistorySessionRow, reused as-is
// from history.tsx) are identified by the actual <Pressable> element
// carrying the row's own accessibilityLabel prefix ("Запись <duration>,
// <date>[, заметка: ...]", see HistorySessionRow.tsx) — not by picking the
// first onLongPress-bearing node in the tree (the composite
// <HistorySessionRow> element itself also carries an onLongPress prop,
// forwarded to its inner Pressable, so that search matches the wrong node),
// and not by a bare accessibilityLabel/accessibilityRole match either
// (Pressable forwards those same props down to its inner host View nodes on
// web, so that match returns 3 hits per row — the Pressable plus two
// Views). react-native's `Pressable` export is `React.memo(InnerPressable)`
// — react-test-renderer reports a TestInstance's `.type` as the *inner*
// function, not the memo wrapper, so the identity check compares against
// `Pressable.type` (verified directly: `nodeWithLabel.type === Pressable`
// is false, `nodeWithLabel.type === (Pressable as any).type` is true).
// Keeps exactly one hit per row, in the row list's own order (most recent
// session first, per sortSessionsDescending()).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PressableInner = (Pressable as any).type;
function sessionRows(root: ReactTestRenderer["root"]) {
  return root.findAll(
    (n) =>
      n.type === PressableInner &&
      !!n.props &&
      n.props.accessibilityRole === "button" &&
      typeof n.props.accessibilityLabel === "string" &&
      n.props.accessibilityLabel.startsWith("Запись"),
  );
}

async function renderScreen(key: string): Promise<{ store: () => Store; root: () => ReactTestRenderer["root"] }> {
  mockParams = { key };
  let latest: Store | null = null;
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => { latest = s; }} />
        <MonthDetailsScreen />
      </StoreProvider>,
    );
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  return { store: () => latest as unknown as Store, root: () => renderer.root };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockConfirmAsync.mockReset();
  mockParams = {};
});

describe("MonthDetailsScreen — TASK_034 legacy HourRecord CRUD", () => {
  it("shows an 'Редактировать месячный итог' trigger for a legacy month", async () => {
    await AsyncStorage.setItem("mj_records_v1", JSON.stringify([{ id: "r1", year: 2026, month: 3, hours: 46, note: "" }]));
    const { root } = await renderScreen("2026-3");
    expect(buttonWithLabel(root(), "Редактировать месячный итог")).toBeDefined();
  });

  it("deletes only the targeted legacy record when confirmed", async () => {
    mockConfirmAsync.mockResolvedValue(true);
    await AsyncStorage.setItem(
      "mj_records_v1",
      JSON.stringify([
        { id: "r1", year: 2026, month: 3, hours: 46, note: "" },
        { id: "r2", year: 2026, month: 4, hours: 12, note: "" },
      ]),
    );
    const { root, store } = await renderScreen("2026-3");

    await act(async () => {
      buttonWithLabel(root(), "Редактировать месячный итог")?.props.onPress();
    });
    await act(async () => {
      buttonWithLabel(root(), "Удалить")?.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    const remaining = store().records;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("r2");
  });

  it("keeps the record when the delete confirmation is cancelled", async () => {
    mockConfirmAsync.mockResolvedValue(false);
    await AsyncStorage.setItem("mj_records_v1", JSON.stringify([{ id: "r1", year: 2026, month: 3, hours: 46, note: "" }]));
    const { root, store } = await renderScreen("2026-3");

    await act(async () => {
      buttonWithLabel(root(), "Редактировать месячный итог")?.props.onPress();
    });
    await act(async () => {
      buttonWithLabel(root(), "Удалить")?.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(store().records).toHaveLength(1);
  });

  it("deleting the legacy record does not touch Session data", async () => {
    mockConfirmAsync.mockResolvedValue(true);
    await AsyncStorage.setItem("mj_records_v1", JSON.stringify([{ id: "r1", year: 2026, month: 3, hours: 46, note: "" }]));
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([{ id: "s1", date: "2026-05-01", durationMinutes: 30, note: "", source: "manual", createdAt: "x", updatedAt: "x" }]),
    );
    const { root, store } = await renderScreen("2026-3");

    await act(async () => {
      buttonWithLabel(root(), "Редактировать месячный итог")?.props.onPress();
    });
    await act(async () => {
      buttonWithLabel(root(), "Удалить")?.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(store().records).toHaveLength(0);
    expect(store().sessions).toHaveLength(1);
  });
});

describe("MonthDetailsScreen — TASK_034 Session row press/long-press", () => {
  it("tapping a session row navigates to /entry?id=<session.id>", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([{ id: "sess-1", date: "2026-03-05", durationMinutes: 60, note: "", source: "manual", createdAt: "x", updatedAt: "x" }]),
    );
    const { root } = await renderScreen("2026-3");
    const row = sessionRows(root())[0];
    await act(async () => {
      row.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith("/entry?id=sess-1");
  });

  it("long-pressing a session row deletes only that session after confirmation", async () => {
    mockConfirmAsync.mockResolvedValue(true);
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([
        { id: "sess-1", date: "2026-03-05", durationMinutes: 60, note: "", source: "manual", createdAt: "x", updatedAt: "x" },
        { id: "sess-2", date: "2026-03-06", durationMinutes: 45, note: "", source: "manual", createdAt: "x", updatedAt: "x" },
      ]),
    );
    const { root, store } = await renderScreen("2026-3");
    const row = sessionRows(root())[0];
    await act(async () => {
      row.props.onLongPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Rows render sorted descending by date, so the first row is sess-2
    // (03-06); deleting it should leave sess-1 (03-05).
    const remaining = store().sessions;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("sess-1");
  });

  it("deleting the last Session of a month falls back to the legacy HourRecord as authoritative (Session-first)", async () => {
    mockConfirmAsync.mockResolvedValue(true);
    await AsyncStorage.setItem("mj_records_v1", JSON.stringify([{ id: "r1", year: 2026, month: 3, hours: 46, note: "" }]));
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([{ id: "sess-1", date: "2026-03-05", durationMinutes: 60, note: "", source: "manual", createdAt: "x", updatedAt: "x" }]),
    );
    const { root, store } = await renderScreen("2026-3");
    const row = sessionRows(root())[0];
    await act(async () => {
      row.props.onLongPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(store().sessions).toHaveLength(0);
    // monthTotal() (Session-first) now resolves from the legacy HourRecord again.
    const { monthTotal } = jest.requireActual("@/data/stats");
    expect(monthTotal(store().records, store().sessions, 2026, 3)).toBe(46);
  });
});

describe("MonthDetailsScreen — TASK_040 heat map removal and shared History row format", () => {
  it("no longer renders the day heat map or its old section header", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([{ id: "sess-1", date: "2026-07-05", durationMinutes: 60, note: "", source: "manual", createdAt: "x", updatedAt: "x" }]),
    );
    const { root } = await renderScreen("2026-7");
    expect(root().findAllByType(Text).some((n) => n.props.children === "Тепловая карта дня")).toBe(false);
    // HeatMap day cells carry an accessibilityLabel like "5 day: 1h" — assert none exist.
    const heatMapCells = root().findAll(
      (n) => !!n.props && typeof n.props.accessibilityLabel === "string" && / day: /.test(n.props.accessibilityLabel),
    );
    expect(heatMapCells).toHaveLength(0);
  });

  it("no longer renders the old 'Сессии' section header (only MonthHeader's unrelated 'Сессии'/'Легаси' source badge remains)", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([{ id: "sess-1", date: "2026-07-05", durationMinutes: 60, note: "", source: "manual", createdAt: "x", updatedAt: "x" }]),
    );
    const { root } = await renderScreen("2026-7");
    // Only one "Сессии" text node should remain — MonthHeader's small
    // source badge; the old SectionHeader("Сессии") list title is gone.
    expect(root().findAllByType(Text).filter((n) => n.props.children === "Сессии")).toHaveLength(1);
  });

  it("renders 'История за <month>' with the month computed dynamically from the displayed key", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([{ id: "sess-1", date: "2026-07-05", durationMinutes: 60, note: "", source: "manual", createdAt: "x", updatedAt: "x" }]),
    );
    const july = await renderScreen("2026-7");
    expect(july.root().findAllByType(Text).some((n) => n.props.children === "История за июль")).toBe(true);

    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([{ id: "sess-2", date: "2026-03-05", durationMinutes: 60, note: "", source: "manual", createdAt: "x", updatedAt: "x" }]),
    );
    const march = await renderScreen("2026-3");
    expect(march.root().findAllByType(Text).some((n) => n.props.children === "История за март")).toBe(true);
  });

  it("shows only sessions of the displayed month, not sessions from other months", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([
        { id: "in-month", date: "2026-07-10", durationMinutes: 60, note: "", source: "manual", createdAt: "x", updatedAt: "x" },
        { id: "other-month", date: "2026-08-10", durationMinutes: 30, note: "", source: "manual", createdAt: "x", updatedAt: "x" },
      ]),
    );
    const { root } = await renderScreen("2026-7");
    const rows = sessionRows(root());
    expect(rows).toHaveLength(1);
    await act(async () => {
      rows[0].props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith("/entry?id=in-month");
  });

  it("shows a session's note the same way HistorySessionRow does, and omits it when blank", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([
        { id: "with-note", date: "2026-07-05", durationMinutes: 60, note: "Служение утром", source: "manual", createdAt: "x", updatedAt: "x" },
        { id: "blank-note", date: "2026-07-06", durationMinutes: 60, note: "   ", source: "manual", createdAt: "x", updatedAt: "x" },
      ]),
    );
    const { root } = await renderScreen("2026-7");
    expect(root().findAllByType(Text).some((n) => n.props.children === "Служение утром")).toBe(true);
    const rows = sessionRows(root());
    expect(rows).toHaveLength(2);
    // The blank-note row's a11y label must not claim to have a note.
    const blankRow = rows.find((r) => r.props.accessibilityLabel.includes("6 июл"));
    expect(blankRow?.props.accessibilityLabel).not.toContain("заметка");
  });

  it("shows the pre-existing empty/legacy state (no 'История за' heading) when the month has no sessions", async () => {
    const { root } = await renderScreen("2026-9");
    expect(root().findAllByType(Text).some((n) => n.props.children === "Месяц без сессий")).toBe(true);
    expect(root().findAllByType(Text).some((n) => typeof n.props.children === "string" && n.props.children.startsWith("История за"))).toBe(false);
    expect(sessionRows(root())).toHaveLength(0);
  });
});

describe("MonthDetailsScreen — TASK_037 unified BackButton", () => {
  it("previously had no way back at all; now renders an accessible BackButton that falls back to /hours", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const { root } = await renderScreen("2026-3");
    const btn = root().findAll((n) => n.props.accessibilityLabel === "Назад")[0];
    expect(btn).toBeDefined();
    await act(async () => btn.props.onPress());
    expect(mockRouter.replace).toHaveBeenCalledWith("/hours");
  });
});
