// TASK_042 — Profile screen integration: the new hero card replaces the old
// static header (hardcoded "Пользователь" + four "—" facts never wired to
// any store). This is the screen's first test coverage.
import { act, create } from "react-test-renderer";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg from "react-native-svg";
import { router } from "expo-router";
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

describe("ProfileScreen — TASK_044 page redesign", () => {
  it("shows a lightweight page title, not inside a heavy card", async () => {
    const renderer = await renderScreen();
    expect(findTexts(renderer)).toContain("Профиль");
  });

  it("groups export/backup and the sync placeholder under one 'Данные и резервные копии' section", async () => {
    const renderer = await renderScreen();
    const texts = findTexts(renderer);
    expect(texts).toContain("Данные и резервные копии");
    expect(texts).toContain("Экспорт данных");
    expect(texts).toContain("Резервная копия");
    expect(texts).toContain("Синхронизация");
  });

  it("keeps the export/import handlers reachable under their original accessibilityLabel", async () => {
    const renderer = await renderScreen();
    expect(renderer.root.findByProps({ accessibilityLabel: "Экспортировать данные" }).props.onPress).toBeInstanceOf(
      Function,
    );
    expect(renderer.root.findByProps({ accessibilityLabel: "Импортировать данные" }).props.onPress).toBeInstanceOf(
      Function,
    );
  });

  it("renders every 'Настройки' row and still routes taps through the existing soon() handler", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const renderer = await renderScreen();
    const texts = findTexts(renderer);
    for (const label of ["Уведомления", "Цели", "Календарь служения", "Статистика", "Оформление", "Язык"]) {
      expect(texts).toContain(label);
    }
    act(() => {
      renderer.root.findAllByProps({ accessibilityLabel: "Цели" })[0].props.onPress();
    });
    expect(alertSpy).toHaveBeenCalledWith("Цели", "Появится позже");
    alertSpy.mockRestore();
  });

  it("renders the 'О приложении' rows with the app version as a non-pressable value", async () => {
    const renderer = await renderScreen();
    // A row with no onPress (the app version) never gets wrapped in a
    // Pressable/accessibilityLabel at all — only interactive rows do.
    expect(renderer.root.findAllByProps({ accessibilityLabel: "Версия приложения" })).toHaveLength(0);
    const texts = findTexts(renderer);
    expect(texts).toContain("Версия приложения");
    expect(texts).toContain("История изменений");
    expect(texts).toContain("Обратная связь");
  });

  it("reuses HomeBackground (its gradient <Svg>) instead of a page-local background", async () => {
    const renderer = await renderScreen();
    expect(renderer.root.findAllByType(Svg).length).toBeGreaterThan(0);
  });
});

// TASK_059 — the "Уведомления" row stops being a placeholder.
describe("ProfileScreen — TASK_059 notifications entry point", () => {
  it("navigates to /notifications instead of showing the 'Появится позже' alert", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const pushSpy = jest.spyOn(router, "push").mockImplementation(() => {});
    const renderer = await renderScreen();

    act(() => {
      renderer.root.findAllByProps({ accessibilityLabel: "Уведомления" })[0].props.onPress();
    });

    expect(pushSpy).toHaveBeenCalledWith("/notifications");
    expect(alertSpy).not.toHaveBeenCalled();
    pushSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it("leaves every other settings row on the soon() handler", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const pushSpy = jest.spyOn(router, "push").mockImplementation(() => {});
    const renderer = await renderScreen();

    for (const label of ["Цели", "Календарь служения", "Статистика", "Оформление", "Язык"]) {
      act(() => {
        renderer.root.findAllByProps({ accessibilityLabel: label })[0].props.onPress();
      });
      expect(alertSpy).toHaveBeenLastCalledWith(label, "Появится позже");
    }
    expect(pushSpy).not.toHaveBeenCalled();
    pushSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
