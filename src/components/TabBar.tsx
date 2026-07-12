import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/data/constants";

// Regular (non-center) tabs, in the order they should appear in the bar.
// "add" is rendered separately as the center "+" button.
const TAB_ORDER = ["index", "hours", "timeline", "talks"] as const;

const TAB_ICON: Record<string, string> = {
  index: "🏠",
  hours: "📊",
  timeline: "📅",
  talks: "🎤",
};

const INACTIVE_COLOR = "rgba(255,255,255,0.85)";

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

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={() => go(route.name, route.key, isFocused)}
        onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
        style={styles.tab}
      >
        <Text style={[styles.icon, { color: isFocused ? COLORS.accent : INACTIVE_COLOR }]}>
          {TAB_ICON[routeName]}
        </Text>
        <Text
          style={[styles.label, { color: isFocused ? COLORS.accent : INACTIVE_COLOR }]}
          numberOfLines={1}
        >
          {label}
        </Text>
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
              <Text style={styles.fabPlus}>+</Text>
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
    backgroundColor: COLORS.navy,
    borderRadius: 28,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  tab: {
    width: 62,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 4,
    gap: 2,
  },
  icon: { fontSize: 18, lineHeight: 20 },
  label: { fontSize: 10, fontWeight: "600" },
  centerSlot: {
    width: 62,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -26,
    borderWidth: 3,
    borderColor: COLORS.navy,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  fabPressed: { opacity: 0.85 },
  fabPlus: { color: "#fff", fontSize: 28, fontWeight: "600", lineHeight: 30, marginTop: -2 },
  centerLabel: { fontSize: 10, fontWeight: "600", color: "#fff", marginTop: 2 },
});
