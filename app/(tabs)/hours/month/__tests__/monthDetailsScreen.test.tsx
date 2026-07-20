// TASK_034 — legacy HourRecord edit/delete and Session long-press delete on
// /hours/month/[key], both now going through confirmAsync instead of a bare
// Alert.alert (a total no-op on react-native-web — see src/utils/confirm.ts).
// This screen previously had no test coverage at all.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Text } from "react-native";
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
    const row = root().findAll((n) => n.props && typeof n.props.onLongPress === "function")[0];
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
    const row = root().findAll((n) => n.props && typeof n.props.onLongPress === "function")[0];
    await act(async () => {
      row.props.onLongPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Rows render sorted descending by date, so the first onLongPress-able
    // row is sess-2 (03-06); deleting it should leave sess-1 (03-05).
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
    const row = root().findAll((n) => n.props && typeof n.props.onLongPress === "function")[0];
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
