// TASK_067 — floating glass capsule, five slots with «Скоро» in the centre,
// the "+" moved out to its own floating button, the shared active pill and
// the drag maths. Kept in its own file: TabBar.test.tsx resets the module
// registry per test (for its Platform.OS cases), which would leave
// react-native's lazily-required hooks bound to a second React instance.
const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 12 },
};

import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Animated } from "react-native";
import { NAV } from "@/components/dashboard/tokens";
import { HourglassIcon } from "@/components/icons";
import {
  CAPSULE_HEIGHT,
  CAPSULE_PAD,
  REAL_SLOTS,
  SOON_INDEX,
  TAB_BAR_HEIGHT,
  TAB_SLOTS,
  TabBar,
  nearestRealSlot,
  shouldStartNavDrag,
  slotForRoute,
  slotWidthFor,
  useTabBarContentInset,
} from "@/components/TabBar";

jest.mock("expo-haptics", () => ({
  selectionAsync: () => Promise.resolve(),
  impactAsync: () => Promise.resolve(),
  ImpactFeedbackStyle: { Light: "light" },
}));

const ROUTES = ["index", "hours", "add", "timeline", "profile"] as const;
const TITLES: Record<string, string> = {
  index: "Главная",
  hours: "Часы",
  add: "Добавить",
  timeline: "События",
  profile: "Профиль",
};

function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return (style ?? {}) as Record<string, unknown>;
}

function renderBar(activeRoute: string, navigate = jest.fn(), emit = jest.fn(() => ({ defaultPrevented: false }))) {
  const routes = ROUTES.map((name) => ({ key: `${name}-key`, name }));
  const descriptors = Object.fromEntries(routes.map((r) => [r.key, { options: { title: TITLES[r.name] } }]));
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <TabBar
          state={{ routes, index: routes.findIndex((r) => r.name === activeRoute) } as never}
          descriptors={descriptors as never}
          navigation={{ emit, navigate } as never}
          insets={{ top: 0, bottom: 12, left: 0, right: 0 }}
        />
      </SafeAreaProvider>,
    );
  });
  // Lay the capsule out at a 390-pt phone width (358 = 390 − 2×16).
  act(() => {
    renderer.root.findByProps({ testID: "tab-capsule" }).props.onLayout({ nativeEvent: { layout: { width: 358, height: 64 } } });
  });
  return { renderer, navigate, emit };
}

function labelsInCapsule(renderer: ReactTestRenderer): string[] {
  const capsule = renderer.root.findByProps({ testID: "tab-capsule" });
  return capsule
    .findAllByType("Text" as never)
    .map((t) => t.props.children)
    .filter((c): c is string => typeof c === "string");
}

describe("TabBar — pure helpers (TASK_067)", () => {
  it("five slots, «Скоро» in the centre, real slots on either side", () => {
    expect(TAB_SLOTS).toEqual(["index", "hours", "soon", "timeline", "profile"]);
    expect(SOON_INDEX).toBe(2);
    expect(REAL_SLOTS).toEqual([0, 1, 3, 4]);
  });

  it("maps routes to slots; the placeholder and the add route have none", () => {
    expect(slotForRoute("index")).toBe(0);
    expect(slotForRoute("hours")).toBe(1);
    expect(slotForRoute("timeline")).toBe(3);
    expect(slotForRoute("profile")).toBe(4);
    expect(slotForRoute("soon")).toBe(-1);
    expect(slotForRoute("add")).toBe(-1);
  });

  it("slot width divides the capsule minus its padding into five", () => {
    expect(slotWidthFor(358)).toBeCloseTo((358 - CAPSULE_PAD * 2) / 5);
  });

  it("drag starts only after 8 px of clearly horizontal motion", () => {
    expect(shouldStartNavDrag(8, 0)).toBe(true);
    expect(shouldStartNavDrag(-30, 10)).toBe(true);
    expect(shouldStartNavDrag(7, 0)).toBe(false);
    expect(shouldStartNavDrag(10, 12)).toBe(false); // mostly vertical → scroll
    expect(shouldStartNavDrag(0, 40)).toBe(false);
  });

  it("nearestRealSlot never returns the centre placeholder", () => {
    for (let p = 0; p <= 4; p += 0.05) expect(nearestRealSlot(p, 1)).not.toBe(SOON_INDEX);
    expect(nearestRealSlot(0.2)).toBe(0);
    expect(nearestRealSlot(1.4)).toBe(1);
    expect(nearestRealSlot(1.6)).toBe(1); // still nearer to 1 than to 3
    expect(nearestRealSlot(2.4)).toBe(3);
    expect(nearestRealSlot(3.6)).toBe(4);
    expect(nearestRealSlot(4)).toBe(4);
    // Exactly on the centre: the tie breaks toward the direction of travel.
    expect(nearestRealSlot(2, 1)).toBe(3);
    expect(nearestRealSlot(2, -1)).toBe(1);
    // Never outside the capsule.
    expect(nearestRealSlot(-3)).toBe(0);
    expect(nearestRealSlot(9)).toBe(4);
  });
});

describe("TabBar — structure (TASK_067)", () => {
  it("renders the four real tabs in their original order with «Скоро» strictly in the centre", () => {
    const { renderer } = renderBar("index");
    expect(labelsInCapsule(renderer)).toEqual(["Главная", "Часы", "Скоро", "События", "Профиль"]);
  });

  it("is a compact 64-pt capsule with fully rounded ends, translucent (never opacity on the bar)", () => {
    const { renderer } = renderBar("index");
    const capsule = renderer.root.findByProps({ testID: "tab-capsule" });
    const style = flat(capsule.props.style);
    expect(style.height).toBe(CAPSULE_HEIGHT);
    expect(style.borderRadius).toBe(CAPSULE_HEIGHT / 2);
    expect(style.borderWidth).toBe(1);
    expect(style.borderColor).toBe(NAV.border);
    expect(style.opacity).toBeUndefined();
    expect(TAB_BAR_HEIGHT).toBe(64);
  });

  it("the «Скоро» tab uses the calm hourglass icon, is marked disabled and never navigates or steals active", () => {
    const { renderer, navigate, emit } = renderBar("hours");
    const soon = renderer.root.findByProps({ testID: "tab-soon" });
    expect(soon.findAllByType(HourglassIcon)).toHaveLength(1);
    expect(soon.props.accessibilityState).toEqual({ disabled: true });
    expect(soon.props["aria-disabled"]).toBe(true);
    act(() => {
      soon.props.onPress();
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
    // The real tab keeps `selected`; the placeholder never gets it.
    expect(renderer.root.findByProps({ testID: "tab-hours" }).props.accessibilityState).toEqual({ selected: true });
    expect(soon.props.accessibilityState.selected).toBeUndefined();
  });

  it("a plain tap on a real tab still emits tabPress and navigates", () => {
    const { renderer, navigate, emit } = renderBar("index");
    act(() => {
      renderer.root.findByProps({ testID: "tab-timeline" }).props.onPress();
    });
    expect(emit).toHaveBeenCalledWith({ type: "tabPress", target: "timeline-key", canPreventDefault: true });
    expect(navigate).toHaveBeenCalledWith("timeline");
  });

  it("the «+» is a separate floating glass button OUTSIDE the capsule with the old add action", () => {
    const { renderer, navigate } = renderBar("index");
    const add = renderer.root.findByProps({ testID: "tab-add" });
    const capsule = renderer.root.findByProps({ testID: "tab-capsule" });
    expect(capsule.findAllByProps({ testID: "tab-add" })).toHaveLength(0);
    expect(add.props.accessibilityLabel).toBe("Добавить");
    const style = flat(add.props.style({ pressed: false }));
    expect(style.width).toBe(48);
    expect(style.height).toBe(48);
    expect(style.position).toBe("absolute");
    expect(style.right).toBe(0);
    expect(style.borderColor).toBe(NAV.addBorder);
    expect(style.backgroundColor).not.toBe("#3b82f6"); // not the old primary blue
    act(() => {
      add.props.onPress();
    });
    expect(navigate).toHaveBeenCalledWith("add");
    // No visible "Добавить" caption inside the capsule any more.
    expect(labelsInCapsule(renderer)).not.toContain("Добавить");
  });

  it("the capsule owns the drag responder; the «+» does not", () => {
    const { renderer } = renderBar("index");
    const capsule = renderer.root.findByProps({ testID: "tab-capsule" });
    expect(typeof capsule.props.onMoveShouldSetResponderCapture).toBe("function");
    expect(typeof capsule.props.onResponderMove).toBe("function");
    expect(typeof capsule.props.onResponderRelease).toBe("function");
    const add = renderer.root.findByProps({ testID: "tab-add" });
    expect(add.props.onMoveShouldSetResponderCapture).toBeUndefined();
    expect(add.props.onResponderMove).toBeUndefined();
  });
});

describe("TabBar — active pill (TASK_067)", () => {
  function pillOf(renderer: ReactTestRenderer) {
    return renderer.root.findByProps({ testID: "tab-pill" });
  }
  function pillX(renderer: ReactTestRenderer): number {
    const tf = flat(pillOf(renderer).props.style).transform as { translateX?: Animated.Value }[];
    const tx = tf.find((t) => "translateX" in t)!.translateX as unknown as { __getValue: () => number };
    return tx.__getValue();
  }

  it("is one shared glass lens of exactly one slot width on the accent, sitting on the active tab", () => {
    const { renderer } = renderBar("index");
    const style = flat(pillOf(renderer).props.style);
    expect(style.width).toBeCloseTo(slotWidthFor(358));
    expect(style.backgroundColor).toBe(NAV.pillBg);
    expect(style.borderColor).toBe(NAV.pillBorder);
    expect(style.borderRadius).toBe(999);
    expect(style.position).toBe("absolute");
    expect(pillX(renderer)).toBeCloseTo(0);
  });

  it("rests on the active tab's slot — and only on real slots", () => {
    for (const [route, slot] of [["hours", 1], ["timeline", 3], ["profile", 4]] as const) {
      const { renderer } = renderBar(route);
      expect(pillX(renderer)).toBeCloseTo(slot * slotWidthFor(358));
      expect(REAL_SLOTS).toContain(slot);
    }
  });

  it("is hidden while the add route (no slot) is active", () => {
    const { renderer } = renderBar("add");
    const op = flat(pillOf(renderer).props.style).opacity as unknown as { __getValue: () => number };
    expect(op.__getValue()).toBe(0);
  });

  it("carries the two live-glass overlays (glint + edge) that stay invisible at rest", () => {
    const { renderer } = renderBar("index");
    const overlays = pillOf(renderer).findAllByType(Animated.View).filter((v) => v !== pillOf(renderer));
    expect(overlays.length).toBeGreaterThanOrEqual(2);
    for (const o of overlays) {
      const op = flat(o.props.style).opacity as unknown as { __getValue: () => number };
      expect(op.__getValue()).toBe(0);
      expect(o.props.pointerEvents).toBe("none");
    }
  });
});

describe("useTabBarContentInset — contract unchanged (TASK_067)", () => {
  it("bar height + bottom inset (or 12) + 16", () => {
    let value = 0;
    function Probe() {
      value = useTabBarContentInset();
      return null;
    }
    act(() => {
      create(
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 59, bottom: 34, left: 0, right: 0 } }}>
          <Probe />
        </SafeAreaProvider>,
      );
    });
    expect(value).toBe(64 + 34 + 16);
  });
});
