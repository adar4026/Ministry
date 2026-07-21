// TASK_042 — Profile screen integration: the new hero card replaces the old
// static header (hardcoded "Пользователь" + four "—" facts never wired to
// any store). This is the screen's first test coverage.
import { act, create } from "react-test-renderer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StoreProvider, useStore } from "@/store/StoreContext";
import ProfileScreen from "../profile";

jest.setTimeout(30000);

type Store = ReturnType<typeof useStore>;

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function findTexts(renderer: ReturnType<typeof create>): string[] {
  return renderer.root
    .findAllByType("Text" as never)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join("") : n.props.children))
    .filter((t): t is string => typeof t === "string");
}

async function renderScreen() {
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <StoreProvider>
          <ProfileScreen />
        </StoreProvider>
      </SafeAreaProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("ProfileScreen — TASK_042 hero card", () => {
  it("shows the empty-state hero card on first run, no preset facts", async () => {
    const renderer = await renderScreen();
    const texts = findTexts(renderer);
    expect(texts).toContain("Настроить профиль");
    expect(texts.join(" ").toLowerCase()).not.toMatch(/крещ[её]н|пионер с|g-8/);
  });

  it("no longer shows the old hardcoded 'Пользователь' placeholder name", async () => {
    const renderer = await renderScreen();
    expect(findTexts(renderer)).not.toContain("Пользователь");
  });

  it("tapping the hero card opens the edit sheet", async () => {
    const renderer = await renderScreen();
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Настроить профиль" }).props.onPress();
    });
    expect(findTexts(renderer)).toContain("Профиль");
  });

  it("saving in the edit sheet updates the store and the card reflects it immediately", async () => {
    const renderer = await renderScreen();
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Настроить профиль" }).props.onPress();
    });
    act(() => {
      renderer.root.findAllByProps({ accessibilityLabel: "Имя" })[0].props.onChangeText("Александр");
    });
    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: "Сохранить" }).props.onPress();
    });
    const texts = findTexts(renderer);
    expect(texts).toContain("Александр");
    expect(texts).not.toContain("Настроить профиль");
  });

  it("still shows the unrelated 'Настройки'/'О приложении' sections untouched", async () => {
    const renderer = await renderScreen();
    const texts = findTexts(renderer);
    expect(texts).toContain("Настройки");
    expect(texts).toContain("О приложении");
    expect(texts).toContain("0.4.4");
  });
});
