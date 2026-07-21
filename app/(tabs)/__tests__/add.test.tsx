// TASK_045 — /add?focus=event lands directly in event-creation mode (no
// intermediate record-type choice): only the event card renders. Without
// the param (reached via the tab bar's "+"), all three cards render exactly
// as before. This screen previously had no test coverage at all.
import { act, create } from "react-test-renderer";
import { Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StoreProvider } from "@/store/StoreContext";
import AddScreen from "../add";

let mockParams: { focus?: string } = {};
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

jest.setTimeout(30000);

async function renderScreen() {
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <AddScreen />
      </StoreProvider>,
    );
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  const texts = () => renderer.root.findAllByType(Text).map((n) => n.props.children);
  return { texts };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockParams = {};
});

describe("AddScreen (TASK_045 — focus=event)", () => {
  it("renders all three creation cards when reached without a focus param", async () => {
    const { texts } = await renderScreen();
    const t = texts();
    expect(t).toContain("Добавить месяц (часы)");
    expect(t).toContain("Добавить событие");
    expect(t).toContain("Добавить речь");
  });

  it("renders only the event card when focus=event", async () => {
    mockParams = { focus: "event" };
    const { texts } = await renderScreen();
    const t = texts();
    expect(t).toContain("Добавить событие");
    expect(t).not.toContain("Добавить месяц (часы)");
    expect(t).not.toContain("Добавить речь");
  });
});
