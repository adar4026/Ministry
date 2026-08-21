import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useContext, type ComponentType } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/data/constants";
import { CalendarIcon, ChartIcon, HomeIcon, type IconProps, PersonIcon, PlusIcon } from "@/components/icons";

// Regular (non-center) tabs, in the order they should appear in the bar.
// "add" is rendered separately as the center "+" button.
const TAB_ORDER = ["index", "hours", "timeline", "profile"] as const;

const TAB_ICON: Record<string, ComponentType<IconProps>> = {
  index: HomeIcon,
  hours: ChartIcon,
  timeline: CalendarIcon,
  profile: PersonIcon,
};

const ACTIVE_BG = "#f1f5f9"; // light gray pill behind the active tab
const INACTIVE_COLOR = COLORS.text; // dark

// Bar geometry, kept as named parts so TAB_BAR_HEIGHT below stays derived
// from the same numbers the stylesheet uses instead of being a second,
// silently-drifting copy of them (TASK_048).
const BAR_V_PADDING = 8;
const BAR_BORDER_WIDTH = 1;
const TAB_INNER_V_PADDING = 6;
const TAB_INNER_GAP = 3;
const TAB_ICON_SIZE = 20;
const TAB_LABEL_LINE_HEIGHT = 14;

// Floor for the gap the wrapper leaves below the bar when the platform
// reports no bottom safe-area inset (web, older iPhones, Android without a
// gesture bar) — the `insets.bottom || 12` the wrapper itself applies.
const BAR_MIN_BOTTOM_PADDING = 12;

// Height of the bar box itself (border box), WITHOUT the space the wrapper
// leaves below it. Screens must not use this alone — see
// useTabBarContentInset().
export const TAB_BAR_HEIGHT =
  BAR_V_PADDING * 2 +
  BAR_BORDER_WIDTH * 2 +
  TAB_INNER_V_PADDING * 2 +
  TAB_ICON_SIZE +
  TAB_INNER_GAP +
  TAB_LABEL_LINE_HEIGHT;

// Breathing room between the last piece of scrollable content and the top
// edge of the bar — the "плюс безопасный отступ" part of the contract.
export const TAB_BAR_CONTENT_GAP = 16;

// The bottom inset scrollable content must reserve so nothing ends up hidden
// behind the fixed/absolute bar. Mirrors the wrapper's own geometry exactly:
// bar height + `insets.bottom || BAR_MIN_BOTTOM_PADDING` + a safe gap.
// Replaces the hardcoded 90, which was smaller than the bar actually
// occupies on any device with a home indicator (67 + 34 = 101).
export function useTabBarContentInset(gap: number = TAB_BAR_CONTENT_GAP): number {
  // Reads the context directly instead of calling useSafeAreaInsets(), which
  // throws when no SafeAreaProvider is mounted above it. Screens call this
  // helper from their own render path, including in isolated component tests
  // that mount a screen without the app shell — a spacing helper must
  // degrade to the no-inset value there, not crash the tree.
  const insets = useContext(SafeAreaInsetsContext);
  return TAB_BAR_HEIGHT + (insets?.bottom || BAR_MIN_BOTTOM_PADDING) + gap;
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routesByName = Object.fromEntries(state.routes.map((r) => [r.name, r]));
  const addRoute = routesByName["add"];

  function go(routeName: string, routeKey: string, isFocused: boolean) {
    const event = navigation.emit({ type: "tabPress", target: routeKey, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }

  function renderTab(routeName: string) {
    const route = routesByName[routeName];
    if (!route) return null;
    const { options } = descriptors[route.key];
    const label = typeof options.title === "string" ? options.title : routeName;
    const isFocused = state.routes[state.index]?.key === route.key;
    const Icon = TAB_ICON[routeName];
    const color = isFocused ? COLORS.accent : INACTIVE_COLOR;

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={() => go(route.name, route.key, isFocused)}
        onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
        style={styles.tab}
      >
        <View style={[styles.tabInner, isFocused && styles.tabInnerActive]}>
          <Icon size={TAB_ICON_SIZE} color={color} />
          <Text
            style={[styles.label, isFocused && styles.labelActive, { color }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      </Pressable>
    );
  }

  const [first, second, ...rest] = TAB_ORDER;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: insets.bottom || BAR_MIN_BOTTOM_PADDING }]}>
      <View style={styles.bar}>
        {renderTab(first)}
        {renderTab(second)}

        {addRoute && (
          <View style={styles.centerSlot}>
            <Pressable
              accessibilityRole="button"
              onPress={() => go(addRoute.name, addRoute.key, state.routes[state.index]?.key === addRoute.key)}
              style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            >
              <PlusIcon size={26} color="#fff" />
            </Pressable>
            <Text style={styles.centerLabel} numberOfLines={1}>
              {typeof descriptors[addRoute.key].options.title === "string"
                ? descriptors[addRoute.key].options.title
                : "Добавить"}
            </Text>
          </View>
        )}

        {rest.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // TASK_046: "fixed" pins the bar to the browser viewport itself on web,
    // immune to iOS Safari's dynamic viewport-height recalculation during
    // scroll (the "absolute" value stays anchored to the nearest positioned
    // ancestor's layout box, which can visually shift when that ancestor's
    // %-based height is recomputed). Native (iOS/Android) is unaffected by
    // that class of bug — a sibling ScrollView's momentum/bounce doesn't
    // move this View there — so it keeps "absolute" there.
    // react-native-web (already a dependency) passes "fixed" through as a
    // valid CSS position value; RN itself has no "fixed" position value, so
    // this must stay web-only.
    position: Platform.OS === "web" ? "fixed" : "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    // TASK_055 — explicit, not just absent: this full-width wrapper must
    // never carry its own background, shadow, gradient, or blur. Only the
    // `bar` pill below (compact, inset by marginHorizontal) is allowed a
    // shadow of its own.
    backgroundColor: "transparent",
  },
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: BAR_BORDER_WIDTH,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingTop: BAR_V_PADDING,
    paddingBottom: BAR_V_PADDING,
    marginHorizontal: 20,
    // TASK_055 — tightened from {opacity:0.12, radius:16, offset:6} so the
    // shadow stays a soft edge around the pill itself instead of a wide,
    // downward-smeared haze that read as a faint full-width strip near the
    // bottom edge, right where this bar already sits.
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  tab: {
    width: 60,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  tabInner: {
    width: "100%",
    alignItems: "center",
    gap: TAB_INNER_GAP,
    paddingVertical: TAB_INNER_V_PADDING,
    borderRadius: 16,
  },
  tabInnerActive: { backgroundColor: ACTIVE_BG },
  // Explicit lineHeight (was the platform default) so TAB_BAR_HEIGHT is an
  // exact figure rather than an estimate that differs between web and native.
  label: { fontSize: 11, fontWeight: "500", lineHeight: TAB_LABEL_LINE_HEIGHT },
  labelActive: { fontWeight: "600" },
  centerSlot: {
    width: 60,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPressed: { opacity: 0.85 },
  centerLabel: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: TAB_LABEL_LINE_HEIGHT,
    color: COLORS.text,
    marginTop: TAB_INNER_GAP,
  },
});
