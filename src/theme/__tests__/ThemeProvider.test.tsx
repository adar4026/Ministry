// TASK_078 — ThemeProvider: resolves the stored preference against the
// device scheme, keeps the registry in step DURING render, and lets a
// consumer switch schemes without remounting.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider } from "@/store/StoreContext";
import { DS } from "@/components/dashboard/tokens";
import { getScheme, setScheme } from "../scheme";
import { ThemeProvider, useTheme, useThemedStyles } from "../ThemeProvider";

const mockScheme = jest.fn<"light" | "dark" | null, []>(() => "light");
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: () => mockScheme(),
}));

const makeStyles = () => StyleSheet.create({ box: { backgroundColor: DS.cardBg } });
let mounts = 0;
function Probe() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  useEffect(() => {
    mounts += 1;
  }, []);
  return (
    <View style={styles.box} testID="probe">
      <Text testID="scheme">{theme.scheme}</Text>
      <Text testID="pref">{theme.preference}</Text>
      <Text testID="registry">{getScheme()}</Text>
      <Text testID="cycle" onPress={theme.cycle}>
        cycle
      </Text>
      <Text testID="set-dark" onPress={() => theme.setPreference("dark")}>
        dark
      </Text>
    </View>
  );
}

async function render(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <ThemeProvider>
          <Probe />
        </ThemeProvider>
      </StoreProvider>,
    );
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  return renderer;
}
const text = (r: ReactTestRenderer, id: string) => r.root.findByProps({ testID: id }).props.children as string;
const flat = (style: unknown) => StyleSheet.flatten(style as never) as Record<string, unknown>;

beforeEach(async () => {
  await AsyncStorage.clear();
  mockScheme.mockReturnValue("light");
  setScheme("light");
  mounts = 0;
});

describe("ThemeProvider", () => {
  it("defaults to system and paints the device scheme; the registry matches during render", async () => {
    mockScheme.mockReturnValue("dark");
    const r = await render();
    expect(text(r, "pref")).toBe("system");
    expect(text(r, "scheme")).toBe("dark");
    expect(text(r, "registry")).toBe("dark");
    expect(flat(r.root.findByProps({ testID: "probe" }).props.style).backgroundColor).toBe("#1c2029");
  });

  it("an explicit preference beats the device; changing it re-renders consumers without remounting them", async () => {
    mockScheme.mockReturnValue("dark");
    const r = await render();
    expect(text(r, "scheme")).toBe("dark");
    await act(async () => {
      r.root.findByProps({ testID: "cycle" }).props.onPress(); // system → light
    });
    expect(text(r, "pref")).toBe("light");
    expect(text(r, "scheme")).toBe("light");
    expect(flat(r.root.findByProps({ testID: "probe" }).props.style).backgroundColor).toBe("#ffffff");
    await act(async () => {
      r.root.findByProps({ testID: "set-dark" }).props.onPress();
    });
    expect(text(r, "scheme")).toBe("dark");
    expect(flat(r.root.findByProps({ testID: "probe" }).props.style).backgroundColor).toBe("#1c2029");
    expect(mounts).toBe(1);
    expect(JSON.parse((await AsyncStorage.getItem("mj_settings_v1"))!).theme).toBe("dark");
  });

  it("useThemedStyles hands back the same sheet object for the same scheme", async () => {
    const r = await render();
    const first = r.root.findByProps({ testID: "probe" }).props.style;
    await act(async () => {
      r.root.findByProps({ testID: "cycle" }).props.onPress(); // → light (explicit)
    });
    const second = r.root.findByProps({ testID: "probe" }).props.style;
    expect(second).toBe(first);
  });

  it("outside a provider, useTheme answers from the registry", () => {
    setScheme("dark");
    let r!: ReactTestRenderer;
    act(() => {
      r = create(<Probe />);
    });
    expect(text(r, "scheme")).toBe("dark");
    expect(flat(r.root.findByProps({ testID: "probe" }).props.style).backgroundColor).toBe("#1c2029");
  });
});
