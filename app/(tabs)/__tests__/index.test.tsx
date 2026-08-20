// TASK_043 — Home header avatar: shows profile.profilePhotoUri (TASK_042's
// UserProfile, same StoreContext field ProfileHeroCard reads on /profile —
// no second copy of the photo/URI), falls back to the shared placeholder,
// and opens the existing /profile route. First test coverage for this
// screen.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, useStore } from "@/store/StoreContext";
import { TAB_BAR_HEIGHT } from "@/components/TabBar";
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

function findAvatarButton(renderer: ReactTestRenderer) {
  return renderer.root.findByProps({ accessibilityLabel: "Открыть профиль" });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPush.mockClear();
});

describe("Home header avatar — TASK_043", () => {
  it("shows the shared placeholder when no photo is set", async () => {
    const { renderer } = await renderScreen();
    expect(renderer.root.findAllByType("Image" as never)).toHaveLength(0);
    expect(findAvatarButton(renderer)).toBeTruthy();
  });

  it("shows an Image with profile.profilePhotoUri once a photo is saved", async () => {
    const { renderer, store } = await renderScreen();
    await act(async () => {
      store().saveProfile({ profilePhotoUri: "file:///photo.jpg", events: [] });
    });
    const images = renderer.root.findAllByType("Image" as never);
    expect(images).toHaveLength(1);
    expect(images[0].props.source).toEqual({ uri: "file:///photo.jpg" });
  });

  it("tapping the avatar navigates to /profile", async () => {
    const { renderer } = await renderScreen();
    act(() => {
      findAvatarButton(renderer).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/profile");
  });

  it("updates the image immediately when the photo URI is replaced", async () => {
    const { renderer, store } = await renderScreen();
    await act(async () => {
      store().saveProfile({ profilePhotoUri: "file:///first.jpg", events: [] });
    });
    await act(async () => {
      store().saveProfile({ profilePhotoUri: "file:///second.jpg", events: [] });
    });
    const images = renderer.root.findAllByType("Image" as never);
    expect(images).toHaveLength(1);
    expect(images[0].props.source).toEqual({ uri: "file:///second.jpg" });
  });

  it("reverts to the placeholder immediately when the photo is removed", async () => {
    const { renderer, store } = await renderScreen();
    await act(async () => {
      store().saveProfile({ profilePhotoUri: "file:///photo.jpg", events: [] });
    });
    expect(renderer.root.findAllByType("Image" as never)).toHaveLength(1);
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
    const image = renderer.root.findAllByType("Image" as never)[0];
    act(() => {
      image.props.onError();
    });
    expect(renderer.root.findAllByType("Image" as never)).toHaveLength(0);
    expect(store().profile.profilePhotoUri).toBeUndefined();
    // The rest of the profile (name) is preserved — only the photo is cleared.
    expect(store().profile.displayName).toBe("Александр");
  });

  it("does not create a second photo storage key — the header reads the same profile the store exposes", async () => {
    const { renderer, store } = await renderScreen();
    await act(async () => {
      store().saveProfile({ profilePhotoUri: "file:///photo.jpg", events: [] });
    });
    const raw = await AsyncStorage.getItem("mj_profile_v1");
    expect(JSON.parse(raw!).profilePhotoUri).toBe("file:///photo.jpg");
    expect(renderer.root.findAllByType("Image" as never)[0].props.source).toEqual({ uri: "file:///photo.jpg" });
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
