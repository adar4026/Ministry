import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
          <Icon size={20} color={color} />
          <Text style={[styles.label, { color }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Pressable>
    );
  }

  const [first, second, ...rest] = TAB_ORDER;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: insets.bottom || 12 }]}>
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    marginHorizontal: 20,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
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
    gap: 3,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tabInnerActive: { backgroundColor: ACTIVE_BG },
  label: { fontSize: 10, fontWeight: "600" },
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
  centerLabel: { fontSize: 10, fontWeight: "600", color: COLORS.text, marginTop: 3 },
});
