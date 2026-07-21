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
  router: { push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { router: mockRouter } = jest.requireMock("expo-router") as {
  router: { back: jest.Mock; canGoBack: jest.Mock; replace: jest.Mock };
};

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
  const backButton = () => renderer.root.findAll((n) => n.props.accessibilityLabel === "Назад")[0];
  return { texts, backButton, root: () => renderer.root };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockParams = {};
  mockRouter.back.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.canGoBack.mockReturnValue(true);
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

describe("AddScreen (TASK_045A — back button on focus=event)", () => {
  it("does not render a back button when reached without a focus param", async () => {
    const { backButton } = await renderScreen();
    expect(backButton()).toBeUndefined();
  });

  it("renders an accessible back button when focus=event", async () => {
    mockParams = { focus: "event" };
    const { backButton } = await renderScreen();
    expect(backButton()).toBeDefined();
    expect(backButton().props.accessibilityRole).toBe("button");
  });

  it("always replaces to /timeline, even when canGoBack() is true (alwaysReplace — see BackButton.tsx)", async () => {
    // "add" and "timeline" are sibling Tabs.Screen routes, not nested in a
    // shared Stack: switching to "Мероприятия" via the tab bar never pushes
    // a history entry, so a plain canGoBack()/back() would pop to whatever
    // was open *before* that tab switch, not to "Мероприятия" itself. This
    // screen must always land on /timeline regardless of canGoBack().
    mockParams = { focus: "event" };
    mockRouter.canGoBack.mockReturnValue(true);
    const { backButton } = await renderScreen();
    await act(async () => backButton().props.onPress());
    expect(mockRouter.replace).toHaveBeenCalledWith("/timeline");
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("also replaces to /timeline when there is no history (direct deep-link load)", async () => {
    mockParams = { focus: "event" };
    mockRouter.canGoBack.mockReturnValue(false);
    const { backButton } = await renderScreen();
    await act(async () => backButton().props.onPress());
    expect(mockRouter.replace).toHaveBeenCalledWith("/timeline");
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
