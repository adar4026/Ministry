// TASK_066 — the Home drawer as a component: mount/unmount through the
// open and close animations, Escape (web), reduced motion, swipe decisions,
// panel geometry (never wider than the window — no horizontal overflow),
// safe-area insets, the profile summary bound to the single store, the
// grouped Profile-page content and the footer. The screen-level wiring
// (hamburger → drawer) is covered in app/(tabs)/__tests__/index.test.tsx.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Modal, Platform, ScrollView } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, useStore } from "@/store/StoreContext";
import { HeroCanvas } from "@/components/dashboard/HeroCanvas";
import { APP_VERSION, formatUpdatedLabel } from "@/data/appInfo";
import { ABOUT_ITEMS, SETTINGS_ITEMS } from "@/components/profile/profileMenu";
import { ProfileSettingsRow } from "@/components/profile/ProfileSettingsRow";
import { ProfileSummary } from "@/components/profile/ProfileSummary";
import { DrawerGroup } from "../DrawerGroup";
import {
  DRAWER_MAX_WIDTH,
  HomeDrawer,
  drawerPanelWidth,
  drawerProgressForDrag,
  shouldCaptureDrawerSwipe,
  shouldCloseDrawerOnRelease,
} from "../HomeDrawer";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

const mockImpact = jest.fn((..._args: unknown[]) => Promise.resolve());
jest.mock("expo-haptics", () => ({
  impactAsync: (...args: unknown[]) => mockImpact(...args),
  selectionAsync: () => Promise.resolve(),
  ImpactFeedbackStyle: { Light: "light" },
}));

jest.setTimeout(30000);

const INSETS = { top: 59, bottom: 34, left: 0, right: 0 };
const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: INSETS };

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady: (store: Store) => void }) {
  const store = useStore();
  onReady(store);
  return null;
}

function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return (style ?? {}) as Record<string, unknown>;
}

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType("Text" as never)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join("") : n.props.children))
    .filter((t): t is string => typeof t === "string");
}

async function renderDrawer(open: boolean, onClose = jest.fn()) {
  let store!: Store;
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <StoreProvider>
          <Harness onReady={(s) => (store = s)} />
          <HomeDrawer open={open} onClose={onClose} />
        </StoreProvider>
      </SafeAreaProvider>,
    );
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  const rerender = async (nextOpen: boolean) => {
    await act(async () => {
      renderer.update(
        <SafeAreaProvider initialMetrics={METRICS}>
          <StoreProvider>
            <Harness onReady={(s) => (store = s)} />
            <HomeDrawer open={nextOpen} onClose={onClose} />
          </StoreProvider>
        </SafeAreaProvider>,
      );
      for (let i = 0; i < 6; i++) await Promise.resolve();
    });
  };
  return { renderer, store: () => store, onClose, rerender };
}

function modal(renderer: ReactTestRenderer) {
  return renderer.root.findByType(Modal);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPush.mockClear();
  mockImpact.mockClear();
});

describe("HomeDrawer — open / close lifecycle", () => {
  it("renders nothing while closed", async () => {
    const { renderer } = await renderDrawer(false);
    expect(modal(renderer).props.visible).toBe(false);
    expect(renderer.root.findAllByProps({ testID: "drawer-panel" })).toHaveLength(0);
  });

  it("mounts the modal, the panel and the dialog semantics when opened, with a light haptic", async () => {
    const { renderer } = await renderDrawer(true);
    const m = modal(renderer);
    expect(m.props.visible).toBe(true);
    expect(m.props.transparent).toBe(true);
    // The motion is our own Animated progress, not RNModal's slide.
    expect(m.props.animationType).toBe("none");
    const panel = renderer.root.findByProps({ testID: "drawer-panel" });
    expect(panel.props.role).toBe("dialog");
    expect(panel.props.accessibilityViewIsModal).toBe(true);
    expect(panel.props.accessibilityLabel).toBe("Меню");
    expect(mockImpact).toHaveBeenCalledTimes(1);
  });

  it("stays mounted through the close animation, then unmounts", async () => {
    jest.useFakeTimers();
    try {
      const { renderer, rerender } = await renderDrawer(true);
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      await rerender(false);
      // Still visible right after `open` flips: the panel is sliding out.
      expect(modal(renderer).props.visible).toBe(true);
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(modal(renderer).props.visible).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it("× and the backdrop both call onClose; the hardware back request does too", async () => {
    const { renderer, onClose } = await renderDrawer(true);
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Закрыть меню" }).props.onPress();
    });
    act(() => {
      renderer.root.findByProps({ testID: "drawer-backdrop" }).props.onPress();
    });
    act(() => {
      modal(renderer).props.onRequestClose();
    });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("the × button is a real 44×44 button", async () => {
    const { renderer } = await renderDrawer(true);
    const btn = renderer.root.findByProps({ accessibilityLabel: "Закрыть меню" });
    expect(btn.props.accessibilityRole).toBe("button");
    const style = flat(btn.props.style({ pressed: false }));
    expect(style.width).toBe(44);
    expect(style.height).toBe(44);
  });
});

describe("HomeDrawer — web: Escape and reduced motion", () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
    // @ts-expect-error — test-only teardown of the jsdom-less shim
    delete globalThis.window;
    // @ts-expect-error — same
    delete globalThis.document;
  });

  function installWebShims(reduced: boolean) {
    const listeners = new Map<string, Set<(e: unknown) => void>>();
    const doc = {
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      },
      removeEventListener: (type: string, fn: (e: unknown) => void) => {
        listeners.get(type)?.delete(fn);
      },
      dispatch: (type: string, e: unknown) => listeners.get(type)?.forEach((fn) => fn(e)),
      count: (type: string) => listeners.get(type)?.size ?? 0,
    };
    // @ts-expect-error — minimal window for the test
    globalThis.window = { matchMedia: () => ({ matches: reduced }) };
    // @ts-expect-error — minimal document for the test
    globalThis.document = doc;
    return doc;
  }

  it("Escape closes the drawer, and the listener is removed once closed", async () => {
    Platform.OS = "web";
    const doc = installWebShims(false);
    const { renderer, onClose, rerender } = await renderDrawer(true);
    expect(doc.count("keydown")).toBe(1);
    act(() => {
      doc.dispatch("keydown", { key: "Enter" });
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      doc.dispatch("keydown", { key: "Escape" });
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    await rerender(false);
    // reduced-motion off → animation → still rendered; simulate its end by
    // waiting real time.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(modal(renderer).props.visible).toBe(false);
    expect(doc.count("keydown")).toBe(0);
  });

  it("with prefers-reduced-motion the drawer opens and closes without an animation", async () => {
    Platform.OS = "web";
    installWebShims(true);
    const { renderer, rerender } = await renderDrawer(true);
    const panel = renderer.root.findByProps({ testID: "drawer-panel" });
    // Progress is already 1 → translateX resolves to 0 immediately.
    const tx = flat(panel.props.style).transform as { translateX: { __getValue: () => number } }[];
    expect(tx[0].translateX.__getValue()).toBe(0);
    await rerender(false);
    // No close animation: unmounted synchronously.
    expect(modal(renderer).props.visible).toBe(false);
  });
});

describe("HomeDrawer — swipe decisions (pure)", () => {
  it("captures only clearly leftward, horizontal moves", () => {
    expect(shouldCaptureDrawerSwipe(-30, 4)).toBe(true);
    expect(shouldCaptureDrawerSwipe(-9, 0)).toBe(true);
    expect(shouldCaptureDrawerSwipe(-8, 0)).toBe(false); // below the 8 px slop
    expect(shouldCaptureDrawerSwipe(30, 0)).toBe(false); // rightward: nothing to do
    expect(shouldCaptureDrawerSwipe(-30, 25)).toBe(false); // mostly vertical → scroll
  });

  it("maps a leftward drag onto open-progress and ignores rightward pulls", () => {
    expect(drawerProgressForDrag(0, 300)).toBe(1);
    expect(drawerProgressForDrag(-150, 300)).toBe(0.5);
    expect(drawerProgressForDrag(-300, 300)).toBe(0);
    expect(drawerProgressForDrag(-900, 300)).toBe(0);
    expect(drawerProgressForDrag(120, 300)).toBe(1);
  });

  it("closes on release past 60 px or faster than 0.5 px/ms leftward", () => {
    expect(shouldCloseDrawerOnRelease(-61, 0)).toBe(true);
    expect(shouldCloseDrawerOnRelease(-20, -0.6)).toBe(true);
    expect(shouldCloseDrawerOnRelease(-59, -0.4)).toBe(false);
    expect(shouldCloseDrawerOnRelease(40, 1)).toBe(false);
  });

  it("wires those decisions into the panel's responder handlers", async () => {
    const { renderer } = await renderDrawer(true);
    const panel = renderer.root.findByProps({ testID: "drawer-panel" });
    expect(typeof panel.props.onMoveShouldSetResponderCapture).toBe("function");
    expect(typeof panel.props.onResponderMove).toBe("function");
    expect(typeof panel.props.onResponderRelease).toBe("function");
  });
});

describe("HomeDrawer — geometry and safe area (no horizontal overflow)", () => {
  it("panel width is 86 % of the window, capped at 360, never the full width", () => {
    expect(drawerPanelWidth(320)).toBe(275);
    expect(drawerPanelWidth(375)).toBe(323);
    expect(drawerPanelWidth(390)).toBe(335);
    expect(drawerPanelWidth(430)).toBe(360);
    expect(drawerPanelWidth(1024)).toBe(DRAWER_MAX_WIDTH);
    for (const w of [320, 375, 390, 430, 768]) expect(drawerPanelWidth(w)).toBeLessThan(w);
  });

  it("the mounted panel is absolutely positioned at the left, clipped, and narrower than the window", async () => {
    const { renderer } = await renderDrawer(true);
    const panel = renderer.root.findByProps({ testID: "drawer-panel" });
    const style = flat(panel.props.style);
    expect(style.position).toBe("absolute");
    expect(style.left).toBe(0);
    expect(style.overflow).toBe("hidden");
    // jest-expo's window is 750 wide → capped panel.
    expect(style.width).toBe(DRAWER_MAX_WIDTH);
    expect(style.width as number).toBeLessThan(750);
    // Nothing in the scroll content forces a fixed width wider than the panel.
    const scroll = renderer.root.findByProps({ testID: "drawer-scroll" });
    expect(flat(scroll.props.contentContainerStyle).width).toBeUndefined();
    expect(flat(scroll.props.contentContainerStyle).minWidth).toBeUndefined();
  });

  it("applies the top inset to the scroll content and the bottom inset to the footer", async () => {
    const { renderer } = await renderDrawer(true);
    const scroll = renderer.root.findByProps({ testID: "drawer-scroll" });
    expect(flat(scroll.props.contentContainerStyle).paddingTop).toBe(INSETS.top + 12);
    const footer = renderer.root.findByProps({ testID: "drawer-footer" });
    expect(flat(footer.props.style).paddingBottom as number).toBeGreaterThanOrEqual(INSETS.bottom + 22);
  });

  it("uses the Ministry scene as a STATIC background — no second WebGL canvas", async () => {
    const { renderer } = await renderDrawer(true);
    const panel = renderer.root.findByProps({ testID: "drawer-panel" });
    expect(panel.findAllByProps({ testID: "hero-scene" }).length).toBeGreaterThan(0);
    expect(panel.findAllByType(HeroCanvas)).toHaveLength(0);
  });

  it("has its own vertical ScrollView inside the panel", async () => {
    const { renderer } = await renderDrawer(true);
    const panel = renderer.root.findByProps({ testID: "drawer-panel" });
    const scrolls = panel.findAllByType(ScrollView);
    expect(scrolls.length).toBeGreaterThanOrEqual(1);
    expect(scrolls[0].props.testID).toBe("drawer-scroll");
    expect(scrolls[0].props.horizontal).toBeFalsy();
  });
});

describe("HomeDrawer — profile summary from useStore().profile", () => {
  it("shows the empty invitation on first run and opens the editor from it", async () => {
    const { renderer } = await renderDrawer(true);
    expect(texts(renderer)).toContain("Настроить профиль");
    await act(async () => {
      renderer.root.findByProps({ testID: "profile-summary" }).props.onPress();
    });
    // The editor sheet (its own modal) is now visible with its title.
    const sheets = renderer.root.findAllByType(Modal).filter((m) => m.props.visible);
    expect(sheets.length).toBeGreaterThanOrEqual(2);
    expect(renderer.root.findAllByProps({ accessibilityLabel: "Имя" }).length).toBeGreaterThan(0);
  });

  it("renders the stored name and the three user-named dates, and tracks store changes", async () => {
    const { renderer, store } = await renderDrawer(true);
    await act(async () => {
      store().saveProfile({
        displayName: "Алекс",
        events: [
          { title: "Крещение", date: "2012-05-13" },
          { title: "Пионер", date: "2024-09-01" },
          { title: "Последний переезд", date: "2024-05-15" },
        ],
      });
    });
    let t = texts(renderer);
    expect(t).toContain("Алекс");
    expect(t).toContain("Крещение");
    expect(t).toContain("13-05-2012");
    expect(t).toContain("Пионер");
    expect(t).toContain("Последний переезд");
    await act(async () => {
      store().saveProfile({ displayName: "Алекс", events: [{ title: "Крещение", date: "2012-05-13" }] });
    });
    t = texts(renderer);
    expect(t).not.toContain("Пионер");
  });

  // TASK_072 — the dates live in the summary's milestones block and are
  // edited from the same sheet, so the ПРОФИЛЬ group has one row only.
  it("has no «Памятные даты» row or «N из 3» counter — ПРОФИЛЬ is a single whole «Личные данные» cell", async () => {
    const { renderer, store } = await renderDrawer(true);
    await act(async () => {
      store().saveProfile({ displayName: "Алекс", events: [{ title: "Крещение", date: "2012-05-13" }] });
    });
    const t = texts(renderer);
    expect(t).not.toContain("Памятные даты");
    expect(t.some((s) => /^\d из \d$/.test(s))).toBe(false);
    expect(renderer.root.findAllByProps({ accessibilityLabel: "Памятные даты" })).toHaveLength(0);
    const profileGroup = renderer.root.findAllByType(DrawerGroup).find((g) => g.props.title === "Профиль")!;
    const rows = profileGroup.findAllByType(ProfileSettingsRow);
    expect(rows).toHaveLength(1);
    expect(rows[0].props.title).toBe("Личные данные");
    expect(rows[0].props.last).toBe(true); // no divider under a lone row
  });

  it("'Личные данные' opens the ProfileEditSheet", async () => {
    const { renderer } = await renderDrawer(true);
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Личные данные" }).props.onPress();
    });
    expect(renderer.root.findAllByProps({ accessibilityLabel: "Сохранить" }).length).toBeGreaterThan(0);
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Закрыть редактор профиля" }).props.onPress();
    });
  });

  it("keeps the name row clear of the overlaid × so the milestones block can run full width", async () => {
    const { renderer } = await renderDrawer(true);
    const summary = renderer.root.findByType(ProfileSummary);
    expect(summary.props.headTrailingSpace).toBeGreaterThanOrEqual(44);
    const close = renderer.root.findByProps({ testID: "drawer-close" });
    const style = flat(typeof close.props.style === "function" ? close.props.style({ pressed: false }) : close.props.style);
    expect(style.position).toBe("absolute");
  });
});

describe("HomeDrawer — grouped Profile content and footer", () => {
  it("renders every SETTINGS/ABOUT item from the shared profileMenu, the backup rows and the sync row", async () => {
    const { renderer } = await renderDrawer(true);
    const t = texts(renderer);
    for (const item of [...SETTINGS_ITEMS, ...ABOUT_ITEMS]) expect(t).toContain(item.label);
    for (const label of ["Создать резервную копию", "Восстановить из копии", "Синхронизация", "Скоро — через A-Lex Core", "Версия приложения"]) {
      expect(t).toContain(label);
    }
    expect(t).toContain(APP_VERSION);
  });

  it("groups are titled Профиль / Служение / Приложение / Данные и резервные копии / О приложении, in that order", async () => {
    const { renderer } = await renderDrawer(true);
    const titles = renderer.root
      .findAllByType(DrawerGroup)
      .map((g) => g.findAllByType("Text" as never)[0].props.children);
    expect(titles).toEqual(["Профиль", "Служение", "Приложение", "Данные и резервные копии", "О приложении"]);
  });

  it("'Уведомления' pushes /notifications", async () => {
    const { renderer } = await renderDrawer(true);
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Уведомления" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/notifications");
  });

  it("footer: 'A-Lex Ministry · v<version>' bold, 'Обновлено: <month year>' lighter, centred, last in the scroll", async () => {
    const { renderer } = await renderDrawer(true);
    const footer = renderer.root.findByProps({ testID: "drawer-footer" });
    const [name, date] = footer.findAllByType("Text" as never);
    expect(name.props.children).toBe(`A-Lex Ministry · v${APP_VERSION}`);
    expect(date.props.children).toBe(`Обновлено: ${formatUpdatedLabel()}`);
    expect(flat(name.props.style).fontWeight).toBe("700");
    expect(Number(flat(date.props.style).fontWeight)).toBeLessThan(700);
    expect(flat(name.props.style).textAlign).toBe("center");
    expect(flat(footer.props.style).position).toBeUndefined();
    const siblings = footer.parent!.children;
    expect(siblings[siblings.length - 1]).toBe(footer);
  });
});
