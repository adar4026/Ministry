// TASK_043 introduced the Home header avatar (profile.profilePhotoUri from
// TASK_042's UserProfile, the same StoreContext field ProfileHeroCard reads
// on /profile). TASK_066 replaced that round control with a hamburger that
// opens the left drawer; the avatar — same store field, same broken-file
// fallback — now lives in the drawer's profile block. The TASK_043
// guarantees below are kept, re-pointed at the drawer.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Modal, ScrollView } from "react-native";
import { Stop } from "react-native-svg";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, useStore } from "@/store/StoreContext";
import { TAB_BAR_HEIGHT } from "@/components/TabBar";
import { DS, HOME_GRADIENT, HOME_MINT_GRADIENT, MINISTRY } from "@/components/dashboard/tokens";
import { HERO_HEIGHT } from "@/components/dashboard/HeroScene";
import { MenuIcon } from "@/components/icons";
import { APP_VERSION } from "@/data/appInfo";
import Dashboard from "../index";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

// TASK_048 — the bottom-inset assertions below need a device-like inset (a
// home indicator). Supplied through the real SafeAreaProvider's
// `initialMetrics` rather than a module mock, so the screen goes through the
// same context path it uses on a device.
const MOCK_INSETS = { top: 59, bottom: 34, left: 0, right: 0 };
const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: MOCK_INSETS };

jest.setTimeout(30000);

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady: (store: Store) => void }) {
  const store = useStore();
  onReady(store);
  return null;
}

async function renderScreen(): Promise<{ renderer: ReactTestRenderer; store: () => Store }> {
  let store!: Store;
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <StoreProvider>
          <Harness onReady={(s) => (store = s)} />
          <Dashboard />
        </StoreProvider>
      </SafeAreaProvider>,
    );
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  return { renderer, store: () => store };
}

function findMenuButton(renderer: ReactTestRenderer) {
  return renderer.root.findByProps({ accessibilityLabel: "Открыть меню" });
}

async function openDrawer(renderer: ReactTestRenderer) {
  await act(async () => {
    findMenuButton(renderer).props.onPress();
  });
}

function drawerModal(renderer: ReactTestRenderer) {
  return renderer.root.findAllByType(Modal).find((m) => m.props.visible && m.props.animationType === "none");
}

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType("Text" as never)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join("") : n.props.children))
    .filter((t): t is string => typeof t === "string");
}

// Home's own ScrollView is the one that is NOT inside the drawer modal.
function homeScroll(renderer: ReactTestRenderer) {
  return renderer.root.findAllByType(ScrollView).find((s) => s.props.testID !== "drawer-scroll")!;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPush.mockClear();
});

describe("Home header — hamburger, title, no logo — TASK_066", () => {
  function flat(style: unknown): Record<string, unknown> {
    if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
    return (style ?? {}) as Record<string, unknown>;
  }

  it("renders a hamburger button on the left with an SVG glyph, a label and a 44×44 hit area", async () => {
    const { renderer } = await renderScreen();
    const button = findMenuButton(renderer);
    expect(button.props.accessibilityRole).toBe("button");
    expect(button.props.accessibilityState).toEqual({ expanded: false });
    // react-native-web maps only the aria-* prop to the DOM attribute.
    expect(button.props["aria-expanded"]).toBe(false);
    expect(button.findAllByType(MenuIcon)).toHaveLength(1);
    const style = flat(typeof button.props.style === "function" ? button.props.style({ pressed: false }) : button.props.style);
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeGreaterThanOrEqual(44);
    // No circle/card behind it at rest.
    expect(style.backgroundColor).toBeUndefined();
    // It comes BEFORE the title in the header row.
    const row = button.parent!;
    expect(row.children.indexOf(button)).toBe(0);
    expect(texts(renderer)).not.toContain("☰");
  });

  it("keeps the title text, font and hero ink, laid out after the hamburger", async () => {
    const { renderer } = await renderScreen();
    const title = renderer.root.findAll((n) => n.props.children === "Христианская жизнь")[0];
    const style = flat(title.props.style);
    expect(style.fontSize).toBe(23);
    expect(style.fontWeight).toBe("700");
    expect(style.color).toBe(MINISTRY.ink);
    expect(texts(renderer)).not.toContain("Ministry");
  });

  it("no longer renders the round profile avatar / logo control on the right", async () => {
    const { renderer, store } = await renderScreen();
    expect(renderer.root.findAllByProps({ accessibilityLabel: "Открыть профиль" })).toHaveLength(0);
    // Even with a photo saved, the header shows no Image — nothing round
    // is reserved on the right.
    await act(async () => {
      store().saveProfile({ profilePhotoUri: "file:///photo.jpg", events: [] });
    });
    expect(renderer.root.findAllByType("Image" as never)).toHaveLength(0);
    const row = findMenuButton(renderer).parent!;
    expect(row.children).toHaveLength(2);
    expect(flat(row.props.style).justifyContent).not.toBe("space-between");
    expect(mockPush).not.toHaveBeenCalledWith("/profile");
  });

  it("the hero scene and hero content are untouched", async () => {
    const { renderer } = await renderScreen();
    expect(renderer.root.findByProps({ testID: "hero-scene" })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: "home-hero" })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: "Добавить часы" })).toBeTruthy();
  });
});

describe("Home drawer — open / close — TASK_066", () => {
  it("is closed by default and opens from the hamburger", async () => {
    const { renderer } = await renderScreen();
    expect(drawerModal(renderer)).toBeUndefined();
    await openDrawer(renderer);
    expect(drawerModal(renderer)).toBeTruthy();
    expect(findMenuButton(renderer).props.accessibilityState).toEqual({ expanded: true });
    expect(findMenuButton(renderer).props["aria-expanded"]).toBe(true);
    expect(renderer.root.findByProps({ accessibilityLabel: "Меню" }).props.role).toBe("dialog");
  });

  it("closes from the × button", async () => {
    const { renderer } = await renderScreen();
    await openDrawer(renderer);
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Закрыть меню" }).props.onPress();
    });
    expect(findMenuButton(renderer).props.accessibilityState).toEqual({ expanded: false });
  });

  it("closes from a tap on the dimmed backdrop", async () => {
    const { renderer } = await renderScreen();
    await openDrawer(renderer);
    await act(async () => {
      renderer.root.findByProps({ testID: "drawer-backdrop" }).props.onPress();
    });
    expect(findMenuButton(renderer).props.accessibilityState).toEqual({ expanded: false });
  });

  it("the Home screen keeps working after the drawer closes", async () => {
    const { renderer } = await renderScreen();
    await openDrawer(renderer);
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Закрыть меню" }).props.onPress();
    });
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Добавить часы" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/entry");
    expect(homeScroll(renderer)).toBeTruthy();
  });
});

describe("Home drawer — profile summary from the single store — TASK_066", () => {
  it("shows the empty-state invitation on first run, no preset facts", async () => {
    const { renderer } = await renderScreen();
    await openDrawer(renderer);
    const t = texts(renderer);
    expect(t).toContain("Настроить профиль");
    expect(t.join(" ").toLowerCase()).not.toMatch(/крещ[её]н|пионер с/);
  });

  it("shows the name and every profile event (title, DD-MM-YYYY date, elapsed) from useStore().profile", async () => {
    const { renderer, store } = await renderScreen();
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
    await openDrawer(renderer);
    const t = texts(renderer);
    expect(t).toContain("Алекс");
    expect(t).toContain("Крещение");
    expect(t).toContain("13-05-2012");
    expect(t).toContain("Пионер");
    expect(t).toContain("01-09-2024");
    expect(t).toContain("Последний переезд");
    expect(t).toContain("15-05-2024");
    // The same record the store persists under the one profile key.
    const raw = JSON.parse((await AsyncStorage.getItem("mj_profile_v1"))!);
    expect(raw.events.map((e: { title: string }) => e.title)).toEqual(["Крещение", "Пионер", "Последний переезд"]);
  });

  it("re-renders automatically when the profile changes while the drawer is open", async () => {
    const { renderer, store } = await renderScreen();
    await openDrawer(renderer);
    await act(async () => {
      store().saveProfile({ displayName: "Александр", events: [{ title: "Крещение", date: "2012-05-13" }] });
    });
    expect(texts(renderer)).toContain("Александр");
    await act(async () => {
      store().saveProfile({ displayName: "Саша", events: [{ title: "Крещение", date: "2013-06-01" }] });
    });
    const t = texts(renderer);
    expect(t).toContain("Саша");
    expect(t).not.toContain("Александр");
    expect(t).toContain("01-06-2013");
    expect(t).not.toContain("13-05-2012");
  });

  it("saving in the drawer's editor writes through the store and the summary reflects it", async () => {
    const { renderer, store } = await renderScreen();
    await openDrawer(renderer);
    await act(async () => {
      renderer.root.findByProps({ testID: "profile-summary" }).props.onPress();
    });
    act(() => {
      renderer.root.findAllByProps({ accessibilityLabel: "Имя" })[0].props.onChangeText("Алекс");
    });
    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: "Сохранить" }).props.onPress();
    });
    expect(store().profile.displayName).toBe("Алекс");
    expect(texts(renderer)).toContain("Алекс");
  });
});

// TASK_043's photo guarantees, now on the drawer's avatar.
describe("Drawer avatar — TASK_043 guarantees kept — TASK_066", () => {
  it("shows the shared placeholder when no photo is set", async () => {
    const { renderer } = await renderScreen();
    await openDrawer(renderer);
    expect(renderer.root.findAllByType("Image" as never)).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: "profile-summary" })).toBeTruthy();
  });

  it("shows an Image with profile.profilePhotoUri once a photo is saved, and replaces/removes it live", async () => {
    const { renderer, store } = await renderScreen();
    await openDrawer(renderer);
    await act(async () => {
      store().saveProfile({ profilePhotoUri: "file:///first.jpg", events: [] });
    });
    let images = renderer.root.findAllByType("Image" as never);
    expect(images).toHaveLength(1);
    expect(images[0].props.source).toEqual({ uri: "file:///first.jpg" });
    await act(async () => {
      store().saveProfile({ profilePhotoUri: "file:///second.jpg", events: [] });
    });
    images = renderer.root.findAllByType("Image" as never);
    expect(images).toHaveLength(1);
    expect(images[0].props.source).toEqual({ uri: "file:///second.jpg" });
    await act(async () => {
      store().saveProfile({ profilePhotoUri: undefined, events: [] });
    });
    expect(renderer.root.findAllByType("Image" as never)).toHaveLength(0);
  });

  it("falls back to the placeholder and clears the invalid URI via saveProfile when the image fails to load", async () => {
    const { renderer, store } = await renderScreen();
    await act(async () => {
      store().saveProfile({ displayName: "Александр", profilePhotoUri: "file:///missing.jpg", events: [] });
    });
    await openDrawer(renderer);
    const image = renderer.root.findAllByType("Image" as never)[0];
    await act(async () => {
      image.props.onError();
    });
    expect(renderer.root.findAllByType("Image" as never)).toHaveLength(0);
    expect(store().profile.profilePhotoUri).toBeUndefined();
    expect(store().profile.displayName).toBe("Александр");
  });

  it("does not create a second photo storage key — the drawer reads the same profile the store exposes", async () => {
    const { renderer, store } = await renderScreen();
    await openDrawer(renderer);
    await act(async () => {
      store().saveProfile({ profilePhotoUri: "file:///photo.jpg", events: [] });
    });
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((k) => /profile/i.test(k))).toEqual(["mj_profile_v1"]);
    expect(renderer.root.findAllByType("Image" as never)[0].props.source).toEqual({ uri: "file:///photo.jpg" });
  });
});

describe("Home drawer — Profile page content moved in — TASK_066", () => {
  it("renders every Profile-page item, grouped, plus the footer with the real version", async () => {
    const { renderer } = await renderScreen();
    await openDrawer(renderer);
    const t = texts(renderer);
    for (const label of [
      "Профиль", "Личные данные",
      "Служение", "Цели", "Календарь служения", "Статистика",
      "Приложение", "Уведомления", "Оформление", "Язык",
      "Данные и резервные копии", "Создать резервную копию", "Восстановить из копии", "Синхронизация",
      "О приложении", "Версия приложения", "История изменений", "Обратная связь",
    ]) {
      expect(t).toContain(label);
    }
    expect(t).toContain(APP_VERSION);
    expect(t).toContain(`A-Lex Ministry · v${APP_VERSION}`);
    expect(t.some((s) => /^Обновлено: [а-я]+ \d{4}$/.test(s))).toBe(true);
  });

  it("'Уведомления' still opens the real /notifications route", async () => {
    const { renderer } = await renderScreen();
    await openDrawer(renderer);
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Уведомления" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/notifications");
  });

  it("the footer is the last child of the drawer's scroll content, not a fixed overlay", async () => {
    const { renderer } = await renderScreen();
    await openDrawer(renderer);
    const scroll = renderer.root.findByProps({ testID: "drawer-scroll" });
    const footer = renderer.root.findByProps({ testID: "drawer-footer" });
    // The footer is a descendant of the ScrollView…
    let n = footer.parent;
    let inside = false;
    while (n) {
      if (n === scroll) inside = true;
      n = n.parent;
    }
    expect(inside).toBe(true);
    // …and nothing is rendered after it inside the scroll content.
    const siblings = footer.parent!.children;
    expect(siblings[siblings.length - 1]).toBe(footer);
  });
});

// TASK_048 — the last list item must never end up hidden behind the fixed
// bottom bar. Home's background now runs edge-to-edge (the Tabs sceneStyle
// stops padding this route), so the clearance has to live on the scroll
// content itself.
describe("Home bottom inset vs. the tab bar — TASK_048", () => {
  function flatten(style: unknown): Record<string, unknown> {
    if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten));
    return (style ?? {}) as Record<string, unknown>;
  }

  it("reserves at least the bar height plus the bottom safe-area inset", async () => {
    const { renderer } = await renderScreen();
    const scroll = renderer.root.findByType(ScrollView);
    const paddingBottom = flatten(scroll.props.contentContainerStyle).paddingBottom as number;
    expect(typeof paddingBottom).toBe("number");
    expect(paddingBottom).toBeGreaterThanOrEqual(TAB_BAR_HEIGHT + MOCK_INSETS.bottom);
  });

  it("leaves a visible gap on top of that clearance, not just a flush fit", async () => {
    const { renderer } = await renderScreen();
    const scroll = renderer.root.findByType(ScrollView);
    const paddingBottom = flatten(scroll.props.contentContainerStyle).paddingBottom as number;
    expect(paddingBottom).toBeGreaterThan(TAB_BAR_HEIGHT + MOCK_INSETS.bottom);
  });

  it("does not fall back to a hardcoded value that ignores the safe-area inset", async () => {
    const { renderer } = await renderScreen();
    const scroll = renderer.root.findByType(ScrollView);
    const paddingBottom = flatten(scroll.props.contentContainerStyle).paddingBottom as number;
    expect(paddingBottom).not.toBe(90);
    expect(paddingBottom).not.toBe(16);
  });
});

// TASK_048 §2.5 — the tab bar's center "+" and the goal card's own add
// button are two different actions and must stay two different routes.
describe("Global add vs. contextual add — TASK_048", () => {
  it("the goal card's add button is labelled 'Добавить часы' and opens the hours entry route", async () => {
    const { renderer } = await renderScreen();
    const button = renderer.root.findByProps({ accessibilityLabel: "Добавить часы" });
    act(() => {
      button.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/entry");
    // Never the global add screen the tab bar's "+" opens.
    expect(mockPush).not.toHaveBeenCalledWith("/add");
  });

  it("Home never renders a second, ambiguous bare 'Добавить' action of its own", async () => {
    const { renderer } = await renderScreen();
    const out: string[] = [];
    const walk = (node: unknown): void => {
      if (node == null) return;
      if (typeof node === "string") return void out.push(node);
      if (Array.isArray(node)) return void node.forEach(walk);
      if (typeof node === "object" && "children" in (node as Record<string, unknown>)) {
        walk((node as { children: unknown }).children);
      }
    };
    walk(renderer.toJSON());
    expect(out).toContain("Добавить часы");
    expect(out).not.toContain("Добавить");
  });
});

// TASK_065 — the top card is gone: the header and the month figures sit
// directly on the hero scene, the scene is decoration only (never a tap
// target), the flat ground below it is the same MINISTRY.bg the scene
// dissolves into, and Home applies the top safe-area inset itself (its
// SafeAreaView edge is off so the scene runs under the status bar).
describe("Home hero zone — TASK_065", () => {
  function flat(style: unknown): Record<string, unknown> {
    if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
    return (style ?? {}) as Record<string, unknown>;
  }

  it("renders the hero scene and hero content, and no HoursHeroCard", async () => {
    const { renderer } = await renderScreen();
    expect(renderer.root.findByProps({ testID: "hero-scene" })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: "home-hero" })).toBeTruthy();
    // The old white card's a11y shape ("Детали месяца" + "Добавить часы")
    // lives on inside HomeHero, but there is no card surface around it.
    const hero = renderer.root.findByProps({ testID: "home-hero" });
    expect(flat(hero.props.style).backgroundColor).toBeUndefined();
    expect(renderer.root.findAllByProps({ testID: "hours-hero-card" })).toHaveLength(0);
  });

  it("does not render the old SVG HomeBackground / mint gradient any more", async () => {
    const { renderer } = await renderScreen();
    const stopColors = renderer.root.findAllByType(Stop).map((s) => s.props.stopColor);
    expect(stopColors).not.toContain(HOME_MINT_GRADIENT[0]);
    expect(stopColors).not.toContain(HOME_GRADIENT[0]);
    // The scene's fallback gradient carries the Ministry palette instead.
    expect(stopColors).toContain(MINISTRY.heroTop);
    expect(stopColors).toContain(MINISTRY.bg);
  });

  it("the scene never intercepts pointer events and is clipped", async () => {
    const { renderer } = await renderScreen();
    const scene = renderer.root.findByProps({ testID: "hero-scene" });
    const style = flat(scene.props.style);
    expect(style.pointerEvents).toBe("none");
    expect(style.overflow).toBe("hidden");
    expect(style.position).toBe("absolute");
  });

  it("the flat ground below the hero is MINISTRY.bg — the color the scene dissolves into", async () => {
    const { renderer } = await renderScreen();
    const screenView = renderer.root.findByType(ScrollView).parent!;
    expect(flat(screenView.props.style).backgroundColor).toBe(MINISTRY.bg);
  });

  it("applies the top safe-area inset to its own content (the layout no longer pads it)", async () => {
    const { renderer } = await renderScreen();
    const scroll = renderer.root.findByType(ScrollView);
    const paddingTop = flat(scroll.props.contentContainerStyle).paddingTop as number;
    expect(paddingTop).toBe(MOCK_INSETS.top + 10);
    // …and the scene is tall enough to run under that inset as well.
    const scene = renderer.root.findByProps({ testID: "hero-scene" });
    expect(flat(scene.props.style).height as number).toBeGreaterThan(MOCK_INSETS.top + HERO_HEIGHT);
  });

  it("header text uses the hero inks, not the blue DS.navy", async () => {
    const { renderer } = await renderScreen();
    const title = renderer.root.findAll((n) => n.props.children === "Христианская жизнь")[0];
    expect(flat(title.props.style).color).toBe(MINISTRY.ink);
    expect(flat(title.props.style).color).not.toBe(DS.navy);
  });
});

// TASK_073 — a publisher's Home carries no hours: the hero switches to
// participation days and the service-year hours grid is not rendered; both
// come back untouched when the mode is switched back.
describe("Home — ministry mode — TASK_073", () => {
  const collect = (renderer: ReactTestRenderer): string[] => {
    const out: string[] = [];
    const walk = (node: unknown): void => {
      if (node == null) return;
      if (typeof node === "string" || typeof node === "number") { out.push(String(node)); return; }
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (typeof node === "object" && "children" in (node as Record<string, unknown>)) walk((node as { children: unknown }).children);
    };
    walk(renderer.toJSON());
    return out;
  };

  it("pioneer (migrated) shows the service-year grid and hours pills; publisher hides them and shows «Отметить служение»", async () => {
    const now = new Date();
    const iso = now.toISOString();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    await AsyncStorage.setItem("mj_sessions_v1", JSON.stringify([{ id: "s1", date: day, durationMinutes: 60, note: "", source: "manual", createdAt: iso, updatedAt: iso }]));
    const { renderer, store } = await renderScreen();
    expect(store().settings.ministryMode).toBe("pioneer");
    expect(collect(renderer)).toContain("Текущий служебный год");
    expect(collect(renderer)).toContain("Добавить часы");

    await act(async () => store().setMinistryMode("publisher"));
    let t = collect(renderer);
    expect(t).not.toContain("Текущий служебный год");
    expect(t).not.toContain("Добавить часы");
    expect(t.some((x) => x.includes("из цели"))).toBe(false);
    expect(t).toContain("Отметить служение");
    expect(t).toContain("Ближайшие события");
    expect(t).toContain("Последние события");
    expect(store().sessions).toHaveLength(1);

    await act(async () => store().setMinistryMode("pioneer"));
    t = collect(renderer);
    expect(t).toContain("Текущий служебный год");
    expect(t).toContain("Добавить часы");
  });
});
