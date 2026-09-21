// TASK_073 — «Настройки»: ministry mode radio cards + the pioneer goal field.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, STORAGE_KEYS, useStore } from "@/store/StoreContext";
import SettingsScreen from "../settings";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false } }));

type Store = ReturnType<typeof useStore>;
function Harness({ onReady }: { onReady: (s: Store) => void }) {
  onReady(useStore());
  return null;
}
function texts(r: ReactTestRenderer): string[] {
  return r.root.findAllByType(Text).map((n) => n.props.children).flat().filter((c): c is string => typeof c === "string");
}
async function render() {
  let renderer!: ReactTestRenderer;
  let store!: Store;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => (store = s)} />
        <SettingsScreen />
      </StoreProvider>,
    );
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  return { renderer, store: () => store };
}
const radio = (r: ReactTestRenderer, mode: string) => r.root.findByProps({ testID: `mode-${mode}` });

beforeEach(async () => AsyncStorage.clear());

describe("Settings — Служение", () => {
  it("offers the three modes, pioneer selected for a migrated install, goal field showing 50", async () => {
    const { renderer } = await render();
    const t = texts(renderer);
    expect(t).toContain("Настройки");
    expect(t).toContain("Служение");
    expect(t).toContain("Мой режим служения");
    expect(t).toContain("Возвещатель");
    expect(t).toContain("Пионер");
    expect(t).toContain("Специальный пионер");
    expect(radio(renderer, "pioneer").props.accessibilityState.checked).toBe(true);
    expect(radio(renderer, "publisher").props.accessibilityState.checked).toBe(false);
    expect(t).toContain("Цель часов");
    expect(renderer.root.findByProps({ testID: "goal-input" }).props.value).toBe("50");
  });

  it("choosing «Возвещатель» persists the mode and hides the goal without clearing it", async () => {
    const { renderer, store } = await render();
    await act(async () => radio(renderer, "publisher").props.onPress());
    expect(store().settings.ministryMode).toBe("publisher");
    expect(renderer.root.findAllByProps({ testID: "goal-card" })).toHaveLength(0);
    expect(store().settings.monthlyHourGoal).toBe(50);
    await act(async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); });
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.settings))!)).toEqual({ ministryMode: "publisher", monthlyHourGoal: 50, theme: "system" });

    await act(async () => radio(renderer, "specialPioneer").props.onPress());
    expect(store().settings.ministryMode).toBe("specialPioneer");
    expect(renderer.root.findByProps({ testID: "goal-input" }).props.value).toBe("50");
  });

  it("the goal accepts any whole number (30 / 600), empty means no goal, junk is refused with a hint", async () => {
    const { renderer, store } = await render();
    const input = () => renderer.root.findByProps({ testID: "goal-input" });
    await act(async () => input().props.onChangeText("30"));
    await act(async () => input().props.onBlur());
    expect(store().settings.monthlyHourGoal).toBe(30);
    await act(async () => input().props.onChangeText("600"));
    await act(async () => input().props.onSubmitEditing());
    expect(store().settings.monthlyHourGoal).toBe(600);
    await act(async () => input().props.onChangeText(""));
    await act(async () => input().props.onBlur());
    expect(store().settings.monthlyHourGoal).toBeNull();
    await act(async () => input().props.onChangeText("0"));
    await act(async () => input().props.onBlur());
    expect(store().settings.monthlyHourGoal).toBeNull();
    expect(texts(renderer).some((x) => x.startsWith("Введите целое число"))).toBe(true);
    expect(input().props.value).toBe("");
  });
});
