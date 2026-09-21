// TASK_078 — «Оформление»: three radio cards bound to settings.theme.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import AppearanceScreen from "../appearance";
import { StoreProvider } from "@/store/StoreContext";
import { ThemeProvider } from "@/theme";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => false, replace: jest.fn() }, useRouter: () => ({ back: jest.fn(), canGoBack: () => false, replace: jest.fn(), push: jest.fn() }) }));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 59, bottom: 34, left: 0, right: 0 } };

async function render(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <StoreProvider>
          <ThemeProvider>
            <AppearanceScreen />
          </ThemeProvider>
        </StoreProvider>
      </SafeAreaProvider>,
    );
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  return renderer;
}
const radio = (r: ReactTestRenderer, id: string) => r.root.findByProps({ testID: id });

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("AppearanceScreen", () => {
  it("shows the three choices as a radiogroup with «Системная тема» selected by default", async () => {
    const r = await render();
    expect(r.root.findAllByProps({ accessibilityRole: "radiogroup" }).length).toBeGreaterThan(0);
    expect(radio(r, "theme-system").props.accessibilityState).toEqual({ selected: true, checked: true });
    expect(radio(r, "theme-light").props.accessibilityState).toEqual({ selected: false, checked: false });
    expect(radio(r, "theme-dark").props.accessibilityState).toEqual({ selected: false, checked: false });
    expect(radio(r, "theme-dark").props.accessibilityLabel).toBe("Тёмная тема. Всегда тёмное оформление");
  });

  it("picking «Тёмная тема» persists theme: dark and moves the selection", async () => {
    const r = await render();
    await act(async () => {
      radio(r, "theme-dark").props.onPress();
    });
    expect(radio(r, "theme-dark").props.accessibilityState.selected).toBe(true);
    expect(radio(r, "theme-system").props.accessibilityState.selected).toBe(false);
    expect(JSON.parse((await AsyncStorage.getItem("mj_settings_v1"))!)).toEqual({ ministryMode: "pioneer", monthlyHourGoal: 50, theme: "dark" });
  });
});
