import { Tabs, usePathname } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabBar, useTabBarContentInset } from "@/components/TabBar";
// Imported straight from the token module, not the "@/components/dashboard"
// barrel: the barrel also pulls in HoursHeroCard -> StoreContext, which this
// layout is itself an ancestor of, and the resulting import cycle left
// HOME_GRADIENT undefined on first evaluation (TypeError in TabsLayout).
import { DS, HOME_GRADIENT } from "@/components/dashboard/tokens";
import { COLORS } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

export default function TabsLayout() {
  const { loaded } = useStore();
  // TASK_048 — two route-scoped background colors, no layout/edges change:
  //
  // 1. The top safe-area strip is painted by this SafeAreaView's own
  //    background. On Home that used to be COLORS.bg (#f8fafc) sitting above
  //    HomeBackground's gradient, which read on-device as an empty white band
  //    over the header. Painting it with the gradient's FIRST stop makes the
  //    status-bar area and the header one continuous iOS composition, while
  //    `edges` (and therefore the guarantee that content never slides under
  //    system elements) stays exactly as before.
  // 2. The scene's own bottom padding strip (the band behind the tab bar) is
  //    painted by sceneStyle's background — DS.homeBase on Home removes the
  //    visible seam between the Home background and that band.
  //
  // Every other tab keeps COLORS.bg on both.
  const pathname = usePathname();
  const isHome = pathname === "/";
  // Real clearance for the bar (bar height + home-indicator inset + gap)
  // instead of the previous hardcoded 90, which was smaller than the bar on
  // any device with a home indicator (65 + 34 = 99) and left the last list
  // item partly hidden underneath it.
  const bottomInset = useTabBarContentInset();

  return (
    <SafeAreaView
      style={[styles.safe, isHome && { backgroundColor: HOME_GRADIENT[0] }]}
      edges={["top", "left", "right"]}
    >
      {loaded ? (
        <Tabs
          tabBar={(props) => <TabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: {
              backgroundColor: isHome ? DS.homeBase : COLORS.bg,
              // Home owns its own bottom clearance on the ScrollView's
              // content (see app/(tabs)/index.tsx) so its background runs
              // edge-to-edge and the content scrolls under the floating bar
              // — the iOS composition this task asks for. The other tabs
              // keep the scene-level padding, now sized from the bar's real
              // geometry instead of the old hardcoded 90.
              paddingBottom: isHome ? 0 : bottomInset,
            },
          }}
        >
          <Tabs.Screen name="index" options={{ title: "Главная" }} />
          <Tabs.Screen name="hours" options={{ title: "Часы" }} />
          <Tabs.Screen name="timeline" options={{ title: "События" }} />
          <Tabs.Screen name="profile" options={{ title: "Профиль" }} />
          <Tabs.Screen name="add" options={{ title: "Добавить" }} />
        </Tabs>
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
});
