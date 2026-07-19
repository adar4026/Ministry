// TASK_030: the redesigned "Добавить время" screen — capsule header
// buttons, large title, no clock time, disabled/enabled Save wiring, and
// create vs. edit mode via the ?id search param.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Text } from "react-native";
import { StoreProvider, useStore } from "@/store/StoreContext";
import { WheelPicker } from "@/components/WheelPicker";
import { TabBar } from "@/components/TabBar";
import EntryScreen from "../entry";

let mockParams: { id?: string } = {};
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { router: mockRouter } = jest.requireMock("expo-router") as {
  router: { push: jest.Mock; back: jest.Mock; replace: jest.Mock };
};

jest.setTimeout(30000);

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady: (store: Store) => void }) {
  const store = useStore();
  onReady(store);
  return null;
}

// Finds the Text node with the exact label, then walks up to its nearest
// Pressable ancestor.
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

async function renderScreen(): Promise<{ store: () => Store; texts: () => string[]; root: () => ReactTestRenderer["root"] }> {
  let latest: Store | null = null;
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => { latest = s; }} />
        <EntryScreen />
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

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockParams = {};
});

describe("EntryScreen — TASK_030", () => {
  it("shows the large 'Добавить время' title and capsule Отмена/Добавить buttons in create mode", async () => {
    const { texts } = await renderScreen();
    expect(texts()).toContain("Добавить время");
    expect(texts()).toContain("Отмена");
    expect(texts()).toContain("Добавить");
    expect(texts()).not.toContain("Редактировать запись");
  });

  // TASK_030 follow-up §11: moved to a root-level route (`app/entry.tsx`,
  // outside `(tabs)`) specifically so the bottom Tabs navigator — and its
  // TabBar — is never mounted underneath this screen, unlike the old
  // `(tabs)/hours/entry.tsx` location.
  it("never renders the bottom TabBar (standalone screen, outside the tab layout)", async () => {
    const { root } = await renderScreen();
    expect(root().findAllByType(TabBar)).toHaveLength(0);
  });

  it("never shows a clock time (no HH:MM anywhere on the screen)", async () => {
    const { texts } = await renderScreen();
    const joined = texts().join(" ");
    expect(joined).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it("Отмена navigates back without saving", async () => {
    const { root, store } = await renderScreen();
    const cancelBtn = buttonWithLabel(root(), "Отмена");
    await act(async () => {
      cancelBtn?.props.onPress();
    });
    expect(mockRouter.back).toHaveBeenCalled();
    expect(store().sessions).toHaveLength(0);
  });

  it("disables Добавить at the default 0h/0m duration, and enables it once a duration is picked", async () => {
    const { root } = await renderScreen();
    const addBtn = buttonWithLabel(root(), "Добавить");
    expect(addBtn?.props.disabled).toBe(true);

    const hoursWheel = root().findAllByType(WheelPicker)[0];
    await act(async () => {
      hoursWheel.props.onChange(1);
    });

    const addBtnAfter = buttonWithLabel(root(), "Добавить");
    expect(addBtnAfter?.props.disabled).toBe(false);
  });

  it("Добавить saves exactly one session and navigates back, guarding against double submit", async () => {
    const { root, store } = await renderScreen();
    const hoursWheel = root().findAllByType(WheelPicker)[0];
    await act(async () => {
      hoursWheel.props.onChange(1);
    });

    const addBtn = buttonWithLabel(root(), "Добавить");
    await act(async () => {
      addBtn?.props.onPress();
      addBtn?.props.onPress(); // rapid double-press
    });

    expect(store().sessions).toHaveLength(1);
    expect(store().sessions[0].durationMinutes).toBe(60);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("switches to edit mode with 'Редактировать запись' / 'Сохранить' when ?id matches a session", async () => {
    // Real navigation only ever mounts EntryScreen *after* the store it
    // navigated from (history/month details) has already loaded sessions —
    // you can't tap an edit row before it's rendered. So this seeds
    // AsyncStorage and rehydrates a StoreProvider first, in isolation, then
    // mounts EntryScreen as a fresh addition to that already-hydrated tree
    // (not an in-place prop swap on an already-mounted SessionForm, whose
    // wheel `useState` initializer — by design — only seeds once at mount).
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([
        {
          id: "seeded-1",
          date: "2026-06-01",
          durationMinutes: 90,
          note: "",
          source: "manual",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ]),
    );
    mockParams = { id: "seeded-1" };

    let latest: Store | null = null;
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <StoreProvider>
          <Harness onReady={(s) => { latest = s; }} />
        </StoreProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect((latest as unknown as Store).sessions).toHaveLength(1);

    await act(async () => {
      renderer.update(
        <StoreProvider>
          <Harness onReady={(s) => { latest = s; }} />
          <EntryScreen />
        </StoreProvider>,
      );
    });

    const out: string[] = [];
    collectText(renderer!.toJSON(), out);
    expect(out).toContain("Редактировать запись");
    expect(out).toContain("Сохранить");
    const hoursWheel = renderer!.root.findAllByType(WheelPicker)[0];
    expect(hoursWheel.props.value).toBe(1);
  });
});
