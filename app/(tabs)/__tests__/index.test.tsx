// TASK_043 — Home header avatar: shows profile.profilePhotoUri (TASK_042's
// UserProfile, same StoreContext field ProfileHeroCard reads on /profile —
// no second copy of the photo/URI), falls back to the shared placeholder,
// and opens the existing /profile route. First test coverage for this
// screen.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, useStore } from "@/store/StoreContext";
import Dashboard from "../index";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

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
      <StoreProvider>
        <Harness onReady={(s) => (store = s)} />
        <Dashboard />
      </StoreProvider>,
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
