// TASK_046 — the floating tab bar's wrap style must be position: "fixed" on
// web (pins it to the browser viewport itself, immune to iOS Safari's
// dynamic viewport-height recalculation during scroll/overscroll — see
// docs/TASKS/TASK_046.md §3.3/§4) and stays position: "absolute" on native
// (a sibling ScrollView's bounce there never moves this View, so there's
// nothing to fix). Platform.OS is baked into the style at module-load time
// (StyleSheet.create runs once, which is correct for a real app — Platform.OS
// never changes at runtime on an actual device/browser) — so each case below
// resets the module registry and re-requires "react-native" fresh, mutating
// that instance's Platform.OS *before* TabBar is (re-)required, so TabBar's
// own internal `require("react-native")` resolves to the same mutated
// instance.
const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 12 },
};

function renderWrapStyle(platformOS: "web" | "ios"): unknown {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require("react-native");
  RN.Platform.OS = platformOS;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { SafeAreaProvider } = require("react-native-safe-area-context");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TabBar } = require("@/components/TabBar");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { create, act } = require("react-test-renderer");

  let renderer: import("react-test-renderer").ReactTestRenderer;
  act(() => {
    renderer = create(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <TabBar
          state={{ routes: [{ key: "index", name: "index" }], index: 0 }}
          descriptors={{ index: { options: { title: "Главная" } } }}
          navigation={{ emit: () => ({ defaultPrevented: false }), navigate: () => {} }}
        />
      </SafeAreaProvider>,
    );
  });

  // The component doesn't export its `styles`, so inspect the resolved style
  // on the root wrap View (identified by its own pointerEvents="box-none").
  const wrapView = renderer!.root.findAllByProps({ pointerEvents: "box-none" })[0];
  return [wrapView.props.style].flat(Infinity).reduce((acc: object, s: object) => ({ ...acc, ...s }), {});
}

describe("TabBar wrap style — TASK_046 fixed positioning", () => {
  afterEach(() => {
    jest.resetModules();
  });

  it("is position: fixed on web", () => {
    const style = renderWrapStyle("web") as { position: string };
    expect(style.position).toBe("fixed");
  });

  it("stays position: absolute on native (iOS)", () => {
    const style = renderWrapStyle("ios") as { position: string };
    expect(style.position).toBe("absolute");
  });
});
