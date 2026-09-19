// Floating bottom navigation — TASK_067: the same approved principle as
// LexCar's BottomNav and Alex Finance's `.nav` (TASK_056/057 there), built
// with Ministry's own stack and tokens.
//
//   [ Главная · Часы · Скоро · События · Профиль ]        (＋)
//
// • The capsule is a near-clear glass: translucency lives only in its
//   background (NAV.bg + backdrop-filter on web), never as opacity on the
//   bar, so icons and labels stay fully opaque. Native and browsers without
//   backdrop-filter get a dense light fill instead (NAV.bgSolid; the web
//   fallback is a `@supports not` rule in app/+html.tsx keyed on the
//   `data-ministry-glass` attribute set below).
// • One shared active pill (a glass lens on MINISTRY.accent) slides between
//   the FIVE equal slots via an Animated translateX. It can only rest on a
//   real tab (slots 0, 1, 3, 4); the centre slot is the "Скоро" placeholder.
// • A horizontal drag on the capsule (PanResponder — the project's existing
//   gesture primitive, see AddActionSheet / HomeDrawer) moves the pill with
//   the finger after an 8 px threshold, previews the nearest real tab, and on
//   release springs to it and calls the very same `go()` a tap would. Plain
//   taps below the threshold are untouched. Only Animated values change
//   during the gesture — no React re-render per move.
// • The "+" button left the capsule: it is a separate floating glass button
//   at the right, above the bar, with the exact action it always had. It is
//   not a descendant of the capsule, so the drag responder never sees it.
//
// Geometry (LexCar b2e5423 / Finance TASK_057): 64 pt tall, fully rounded
// ends (radius 32), 7 pt inner padding, 16 pt side margins, ≤ 480 pt wide.
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type View as ViewType,
} from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MINISTRY, NAV } from "@/components/dashboard/tokens";
import {
  CalendarIcon,
  ChartIcon,
  HomeIcon,
  HourglassIcon,
  type IconProps,
  PersonIcon,
  PlusIcon,
} from "@/components/icons";
import { prefersReducedMotion } from "@/utils/motion";

// The five slots of the capsule, left to right. `SOON` is not a route.
export const SOON_SLOT = "soon" as const;
export const TAB_SLOTS = ["index", "hours", SOON_SLOT, "timeline", "profile"] as const;
export const SOON_INDEX = 2;
/** Slots the pill may rest on — every slot except the placeholder. */
export const REAL_SLOTS: readonly number[] = TAB_SLOTS.map((_, i) => i).filter((i) => i !== SOON_INDEX);

const TAB_ICON: Record<string, ComponentType<IconProps>> = {
  index: HomeIcon,
  hours: ChartIcon,
  timeline: CalendarIcon,
  profile: PersonIcon,
};

// Capsule geometry.
export const CAPSULE_HEIGHT = 64;
export const CAPSULE_PAD = 7;
const CAPSULE_RADIUS = CAPSULE_HEIGHT / 2;
const CAPSULE_SIDE_MARGIN = 16;
const CAPSULE_MAX_WIDTH = 480;
const TAB_ICON_SIZE = 22;
const TAB_LABEL_SIZE = 11;
const TAB_LABEL_SIZE_NARROW = 10; // < 340 pt: «События» / «Профиль» must not clip
const NARROW_WINDOW = 340;
// Separate "+" button.
const ADD_SIZE = 48;
const ADD_GAP = 12;
// Gesture.
const DRAG_THRESHOLD = 8;
const STRETCH_MAX = 0.05;
const TAP_SUPPRESS_MS = 400;
const SPRING = { stiffness: 260, damping: 26, mass: 0.9 } as const;

// Height of the bar box itself, WITHOUT the space the wrapper leaves below
// it. Screens must not use this alone — see useTabBarContentInset().
export const TAB_BAR_HEIGHT = CAPSULE_HEIGHT;

// Floor for the gap the wrapper leaves below the bar when the platform
// reports no bottom safe-area inset (web, older iPhones, Android without a
// gesture bar) — the `insets.bottom || 12` the wrapper itself applies.
const BAR_MIN_BOTTOM_PADDING = 12;

// Breathing room between the last piece of scrollable content and the top
// edge of the bar — the "плюс безопасный отступ" part of the contract.
export const TAB_BAR_CONTENT_GAP = 16;

// The bottom inset scrollable content must reserve so nothing ends up hidden
// behind the fixed/absolute bar. Mirrors the wrapper's own geometry exactly:
// bar height + `insets.bottom || BAR_MIN_BOTTOM_PADDING` + a safe gap.
export function useTabBarContentInset(gap: number = TAB_BAR_CONTENT_GAP): number {
  // Reads the context directly instead of calling useSafeAreaInsets(), which
  // throws when no SafeAreaProvider is mounted above it. Screens call this
  // helper from their own render path, including in isolated component tests
  // that mount a screen without the app shell — a spacing helper must
  // degrade to the no-inset value there, not crash the tree.
  const insets = useContext(SafeAreaInsetsContext);
  return TAB_BAR_HEIGHT + (insets?.bottom || BAR_MIN_BOTTOM_PADDING) + gap;
}

// --- pure helpers (exported for tests) -------------------------------------

/** Slot index of a route name, or -1 (e.g. "add", which has no slot). */
export function slotForRoute(routeName: string): number {
  const i = (TAB_SLOTS as readonly string[]).indexOf(routeName);
  return i === SOON_INDEX ? -1 : i;
}

/** Width of one slot for a capsule of the given outer width. */
export function slotWidthFor(capsuleWidth: number): number {
  return (capsuleWidth - CAPSULE_PAD * 2) / TAB_SLOTS.length;
}

/** Whether a move of (dx, dy) since touch-down turns the touch into a drag. */
export function shouldStartNavDrag(dx: number, dy: number): boolean {
  return Math.abs(dx) >= DRAG_THRESHOLD && Math.abs(dx) > Math.abs(dy);
}

/**
 * The real tab nearest to a pill position expressed in slots (x / slotW).
 * The centre placeholder is never returned: exactly between its two
 * neighbours, the tie breaks toward the direction of travel.
 */
export function nearestRealSlot(position: number, dir: 1 | -1 = 1): number {
  let best = REAL_SLOTS[0];
  let bestDist = Infinity;
  for (const s of REAL_SLOTS) {
    const d = Math.abs(position - s);
    if (d < bestDist - 1e-9 || (Math.abs(d - bestDist) < 1e-9 && (dir > 0 ? s > best : s < best))) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}

// --- styles that differ by platform ----------------------------------------

const GLASS_CAPSULE = Platform.select<object>({
  web: {
    backgroundColor: NAV.bg,
    backdropFilter: `blur(${NAV.blur}) saturate(${NAV.saturate})`,
    WebkitBackdropFilter: `blur(${NAV.blur}) saturate(${NAV.saturate})`,
    boxShadow: `0 8px 24px ${NAV.shadow}, inset 0 1px 0 ${NAV.highlight}`,
  },
  default: {
    backgroundColor: NAV.bgSolid,
    shadowColor: MINISTRY.heroDeep,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});

const GLASS_ADD = Platform.select<object>({
  web: {
    backgroundColor: NAV.addBg,
    backdropFilter: `blur(${NAV.blur}) saturate(${NAV.saturate})`,
    WebkitBackdropFilter: `blur(${NAV.blur}) saturate(${NAV.saturate})`,
    boxShadow: `0 6px 18px ${NAV.addShadow}, inset 0 1px 0 ${NAV.addHighlight}`,
  },
  default: {
    backgroundColor: NAV.addBgSolid,
    shadowColor: MINISTRY.heroDeep,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
});

const GLASS_PILL = Platform.select<object>({
  web: { boxShadow: `inset 0 1px 0 ${NAV.pillHighlight}, 0 3px 12px ${NAV.pillGlow}` },
  default: {
    shadowColor: MINISTRY.accent,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
});

// Live-glass decorations: real gradients on web, soft solid stand-ins on
// native (no gradient primitive without a dependency).
const GLINT_LAYER = Platform.select<object>({
  web: { backgroundImage: `radial-gradient(closest-side, ${NAV.glint} 0%, transparent 72%)` },
  default: { backgroundColor: NAV.glint, borderRadius: 999 },
});
const EDGE_LAYER = Platform.select<object>({
  web: {
    backgroundImage: `linear-gradient(90deg, ${NAV.edgeDark} 0%, transparent 38%, transparent 62%, ${NAV.edgeLight} 100%)`,
  },
  default: {},
});

// RNW turns `dataSet` into `data-*` attributes — the hook for the CSS
// `@supports not (backdrop-filter)` fallback in app/+html.tsx. Not a RN prop,
// hence the loose spread.
const glassAttr = (kind: "nav" | "add"): Record<string, unknown> =>
  Platform.OS === "web" ? { dataSet: { ministryGlass: kind } } : {};

// react-native-web has no native animated module; asking for it only warns.
const NATIVE_DRIVER = Platform.OS !== "web";

function haptic(fn: () => Promise<void>) {
  fn().catch(() => {});
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const narrow = windowWidth < NARROW_WINDOW;
  const routesByName = useMemo(() => Object.fromEntries(state.routes.map((r) => [r.name, r])), [state.routes]);
  const addRoute = routesByName["add"];
  const focusedRoute = state.routes[state.index];
  const activeSlot = focusedRoute ? slotForRoute(focusedRoute.name) : -1;

  // --- navigation (unchanged contract: tabPress event, then navigate) ------
  const suppressTapsUntil = useRef(0);
  const go = useCallback(
    (routeName: string, routeKey: string, isFocused: boolean) => {
      const event = navigation.emit({ type: "tabPress", target: routeKey, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(routeName);
    },
    [navigation],
  );
  // A tap that the browser may still deliver right after a drag must not
  // switch tabs a second time (or to the tab under the finger).
  const tapGo = useCallback(
    (routeName: string, routeKey: string, isFocused: boolean) => {
      if (Date.now() < suppressTapsUntil.current) return;
      go(routeName, routeKey, isFocused);
    },
    [go],
  );

  // --- geometry: measured once per layout, never per move ------------------
  const [capsuleWidth, setCapsuleWidth] = useState(0);
  const slotW = capsuleWidth > 0 ? slotWidthFor(capsuleWidth) : 0;
  const geom = useRef({ slotW: 0, maxX: 0, pillH: CAPSULE_HEIGHT - CAPSULE_PAD * 2, left: 0, top: 0 });
  geom.current.slotW = slotW;
  geom.current.maxX = slotW * (TAB_SLOTS.length - 1);
  const capsuleRef = useRef<ViewType>(null);
  const onCapsuleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setCapsuleWidth((prev) => (prev === w ? prev : w));
  }, []);

  // --- animated values (the only things that change during a drag) --------
  const pillX = useRef(new Animated.Value(0)).current;
  const pillOpacity = useRef(new Animated.Value(0)).current;
  const stretch = useRef(new Animated.Value(1)).current;
  const edgeDir = useRef(new Animated.Value(1)).current;
  const edgeOpacity = useRef(new Animated.Value(0)).current;
  const glintOpacity = useRef(new Animated.Value(0)).current;
  const glintX = useRef(new Animated.Value(0)).current;
  const glintY = useRef(new Animated.Value(0)).current;
  const soonScale = useRef(new Animated.Value(1)).current;

  // Gesture state lives in a ref: nothing here triggers a render.
  const gesture = useRef({
    dragging: false,
    grantDx: 0,
    baseX: 0,
    x: 0,
    v: 0,
    dir: 1 as 1 | -1,
    reduced: false,
  });
  const activeSlotRef = useRef(activeSlot);
  activeSlotRef.current = activeSlot;
  const [preview, setPreview] = useState<number>(-1);
  const previewRef = useRef(-1);
  const setPreviewIfChanged = useCallback((slot: number) => {
    if (previewRef.current === slot) return;
    previewRef.current = slot;
    setPreview(slot);
  }, []);

  // Pill follows the active tab: instantly on the first layout, with a
  // spring afterwards (a short timing under reduced motion). Hidden when no
  // slot is active (the "add" route).
  const pillReady = useRef(false);
  useEffect(() => {
    if (slotW <= 0) return;
    if (activeSlot < 0) {
      Animated.timing(pillOpacity, { toValue: 0, duration: 160, useNativeDriver: NATIVE_DRIVER }).start();
      pillReady.current = false;
      return;
    }
    const target = activeSlot * slotW;
    if (gesture.current.dragging) return; // the finger owns the position
    if (!pillReady.current) {
      pillX.setValue(target);
      pillReady.current = true;
      Animated.timing(pillOpacity, { toValue: 1, duration: 180, useNativeDriver: NATIVE_DRIVER }).start();
      return;
    }
    if (prefersReducedMotion()) {
      Animated.timing(pillX, { toValue: target, duration: 200, useNativeDriver: NATIVE_DRIVER }).start();
    } else {
      Animated.spring(pillX, { toValue: target, ...SPRING, useNativeDriver: NATIVE_DRIVER }).start();
    }
  }, [activeSlot, slotW, pillX, pillOpacity]);

  // --- drag ------------------------------------------------------------------
  const goRef = useRef(go);
  goRef.current = go;
  const routesRef = useRef(routesByName);
  routesRef.current = routesByName;

  const settle = useCallback(
    (target: number) => {
      const s = gesture.current;
      const g = geom.current;
      s.dragging = false;
      setPreviewIfChanged(-1);
      const reduced = s.reduced;
      const toX = target * g.slotW;
      if (reduced) {
        Animated.timing(pillX, { toValue: toX, duration: 200, useNativeDriver: NATIVE_DRIVER }).start();
      } else {
        Animated.spring(pillX, { toValue: toX, ...SPRING, useNativeDriver: NATIVE_DRIVER }).start();
      }
      Animated.parallel([
        Animated.timing(stretch, { toValue: 1, duration: 220, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(edgeOpacity, { toValue: 0, duration: 220, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(glintOpacity, { toValue: 0, duration: 220, useNativeDriver: NATIVE_DRIVER }),
      ]).start();
      suppressTapsUntil.current = Date.now() + TAP_SUPPRESS_MS;
    },
    [pillX, stretch, edgeOpacity, glintOpacity, setPreviewIfChanged],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Capture only a clearly horizontal move past the threshold; until
        // then the tab Pressables handle plain taps, and vertical motion is
        // never ours.
        onMoveShouldSetPanResponderCapture: (_e, g) =>
          activeSlotRef.current >= 0 && geom.current.slotW > 0 && shouldStartNavDrag(g.dx, g.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (_e, g) => {
          const s = gesture.current;
          s.dragging = true;
          s.reduced = prefersReducedMotion();
          // Start the pill exactly where it is: the threshold must not jump.
          s.grantDx = g.dx;
          s.baseX = activeSlotRef.current * geom.current.slotW;
          s.x = s.baseX;
          s.v = 0;
          pillX.stopAnimation();
          pillX.setValue(s.baseX);
          // Capsule origin for the glint — once per gesture, not per move.
          capsuleRef.current?.measureInWindow?.((x, y) => {
            geom.current.left = x;
            geom.current.top = y;
          });
          if (!s.reduced) {
            Animated.timing(glintOpacity, { toValue: 1, duration: 160, useNativeDriver: NATIVE_DRIVER }).start();
          }
        },
        onPanResponderMove: (_e, g) => {
          const s = gesture.current;
          const gm = geom.current;
          if (!s.dragging || gm.slotW <= 0) return;
          const prev = s.x;
          s.x = Math.min(gm.maxX, Math.max(0, s.baseX + (g.dx - s.grantDx)));
          const delta = s.x - prev;
          if (Math.abs(delta) > 0.5) s.dir = delta > 0 ? 1 : -1;
          // Smoothed speed 0…1 — the edge sheen must not flicker.
          const inst = Math.min(1, Math.abs(delta) / 14);
          s.v = s.v * 0.7 + inst * 0.3;
          pillX.setValue(s.x);
          if (!s.reduced) {
            stretch.setValue(1 + STRETCH_MAX * s.v);
            edgeDir.setValue(s.dir);
            edgeOpacity.setValue(s.v);
            // Glint under the finger, in pill coordinates.
            const gx = Math.min(gm.slotW, Math.max(0, g.moveX - gm.left - CAPSULE_PAD - s.x));
            const gy = Math.min(gm.pillH, Math.max(0, g.moveY - gm.top - CAPSULE_PAD));
            glintX.setValue(gx);
            glintY.setValue(gy);
          }
          setPreviewIfChanged(nearestRealSlot(s.x / gm.slotW, s.dir));
        },
        onPanResponderRelease: () => {
          const s = gesture.current;
          const gm = geom.current;
          if (!s.dragging) return;
          const target = gm.slotW > 0 ? nearestRealSlot(s.x / gm.slotW, s.dir) : activeSlotRef.current;
          settle(target);
          if (target !== activeSlotRef.current) {
            const route = routesRef.current[TAB_SLOTS[target] as string];
            if (route) goRef.current(route.name, route.key, false);
          }
        },
        onPanResponderTerminate: () => {
          if (gesture.current.dragging) settle(activeSlotRef.current);
        },
      }),
    [pillX, stretch, edgeDir, edgeOpacity, glintOpacity, glintX, glintY, settle, setPreviewIfChanged],
  );

  // --- "Скоро" -----------------------------------------------------------------
  const onSoonPress = useCallback(() => {
    haptic(() => Haptics.selectionAsync());
    if (prefersReducedMotion()) return;
    Animated.sequence([
      Animated.timing(soonScale, { toValue: 0.92, duration: 90, useNativeDriver: NATIVE_DRIVER }),
      Animated.timing(soonScale, { toValue: 1, duration: 130, useNativeDriver: NATIVE_DRIVER }),
    ]).start();
  }, [soonScale]);

  // --- render --------------------------------------------------------------------
  const labelSize = narrow ? TAB_LABEL_SIZE_NARROW : TAB_LABEL_SIZE;

  function renderSlot(slot: number) {
    if (slot === SOON_INDEX) {
      return (
        <Pressable
          key="soon"
          accessibilityRole="button"
          accessibilityLabel="Скоро — появится позже"
          accessibilityState={{ disabled: true }}
          aria-disabled
          onPress={onSoonPress}
          style={styles.tab}
          testID="tab-soon"
        >
          <Animated.View style={[styles.tabInner, { transform: [{ scale: soonScale }] }]}>
            <HourglassIcon size={TAB_ICON_SIZE} color={NAV.muted} />
            <Text style={[styles.label, styles.labelSoon, { fontSize: labelSize }]} numberOfLines={1}>
              Скоро
            </Text>
          </Animated.View>
        </Pressable>
      );
    }
    const routeName = TAB_SLOTS[slot] as string;
    const route = routesByName[routeName];
    if (!route) return <View key={routeName} style={styles.tab} />;
    const { options } = descriptors[route.key];
    const label = typeof options.title === "string" ? options.title : routeName;
    const isFocused = focusedRoute?.key === route.key;
    const Icon = TAB_ICON[routeName];
    const highlighted = isFocused || preview === slot;
    const color = highlighted ? NAV.active : NAV.muted;

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={() => tapGo(route.name, route.key, isFocused)}
        onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
        style={styles.tab}
        testID={`tab-${routeName}`}
      >
        <View style={styles.tabInner}>
          <Icon size={TAB_ICON_SIZE} color={color} />
          <Text
            style={[styles.label, { color, fontSize: labelSize }, isFocused && styles.labelActive]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: insets.bottom || BAR_MIN_BOTTOM_PADDING }]}
    >
      {/* Tall enough to contain the "+" above the capsule, so native hit
          testing (which clips to the parent box) reaches it. */}
      <View pointerEvents="box-none" style={styles.shell}>
        {addRoute && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              typeof descriptors[addRoute.key].options.title === "string"
                ? (descriptors[addRoute.key].options.title as string)
                : "Добавить"
            }
            onPress={() => go(addRoute.name, addRoute.key, focusedRoute?.key === addRoute.key)}
            style={({ pressed }) => [styles.add, GLASS_ADD, pressed && styles.addPressed]}
            testID="tab-add"
            {...glassAttr("add")}
          >
            <PlusIcon size={22} color={MINISTRY.ink} />
          </Pressable>
        )}

        <View
          ref={capsuleRef}
          onLayout={onCapsuleLayout}
          style={[styles.capsule, GLASS_CAPSULE]}
          testID="tab-capsule"
          {...pan.panHandlers}
          {...glassAttr("nav")}
        >
          {slotW > 0 && (
            <Animated.View
              pointerEvents="none"
              testID="tab-pill"
              style={[
                styles.pill,
                GLASS_PILL,
                { width: slotW, opacity: pillOpacity, transform: [{ translateX: pillX }, { scaleX: stretch }] },
              ]}
            >
              <Animated.View
                pointerEvents="none"
                style={[styles.edge, EDGE_LAYER, { opacity: edgeOpacity, transform: [{ scaleX: edgeDir }] }]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.glint,
                  GLINT_LAYER,
                  {
                    opacity: glintOpacity,
                    transform: [
                      { translateX: Animated.subtract(glintX, GLINT_W / 2) },
                      { translateY: Animated.subtract(glintY, GLINT_H / 2) },
                    ],
                  },
                ]}
              />
            </Animated.View>
          )}
          {TAB_SLOTS.map((_, i) => renderSlot(i))}
        </View>
      </View>
    </View>
  );
}

const GLINT_W = 56;
const GLINT_H = 48;

const styles = StyleSheet.create({
  wrap: {
    // TASK_046: "fixed" pins the bar to the browser viewport itself on web,
    // immune to iOS Safari's dynamic viewport-height recalculation during
    // scroll; native keeps "absolute" (a sibling ScrollView's bounce never
    // moves this View there). RN has no "fixed", so this stays web-only.
    position: Platform.OS === "web" ? "fixed" : "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: CAPSULE_SIDE_MARGIN,
    // TASK_055 — this full-width wrapper never carries its own background,
    // shadow, gradient, or blur; only the capsule and the "+" do.
    backgroundColor: "transparent",
  },
  shell: {
    width: "100%",
    maxWidth: CAPSULE_MAX_WIDTH,
    height: CAPSULE_HEIGHT + ADD_GAP + ADD_SIZE,
    justifyContent: "flex-end",
  },
  capsule: {
    position: "relative",
    flexDirection: "row",
    alignItems: "stretch",
    height: CAPSULE_HEIGHT,
    borderRadius: CAPSULE_RADIUS,
    borderWidth: 1,
    borderColor: NAV.border,
    padding: CAPSULE_PAD,
    overflow: "hidden",
  },
  pill: {
    position: "absolute",
    top: CAPSULE_PAD,
    bottom: CAPSULE_PAD,
    left: CAPSULE_PAD,
    borderRadius: 999,
    backgroundColor: NAV.pillBg,
    borderWidth: 1,
    borderColor: NAV.pillBorder,
    overflow: "hidden",
  },
  edge: { ...StyleSheet.absoluteFillObject, borderRadius: 999 },
  glint: { position: "absolute", left: 0, top: 0, width: GLINT_W, height: GLINT_H },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 2,
    width: "100%",
  },
  label: { fontWeight: "600", lineHeight: 13, letterSpacing: 0 },
  labelActive: { fontWeight: "700" },
  labelSoon: { color: NAV.muted, opacity: 0.75 },
  add: {
    position: "absolute",
    right: 0,
    top: 0,
    width: ADD_SIZE,
    height: ADD_SIZE,
    borderRadius: ADD_SIZE / 2,
    borderWidth: 1,
    borderColor: NAV.addBorder,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  addPressed: { transform: [{ scale: 0.92 }] },
});
