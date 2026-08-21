import { Tabs, usePathname } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabBar } from "@/components/TabBar";
// Imported straight from the token module, not the "@/components/dashboard"
// barrel: the barrel also pulls in HoursHeroCard -> StoreContext, which this
// layout is itself an ancestor of, and the resulting import cycle left
// HOME_GRADIENT undefined on first evaluation (TypeError in TabsLayout).
import { DS, HOME_MINT_GRADIENT } from "@/components/dashboard/tokens";
import { COLORS } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

export default function TabsLayout() {
  const { loaded } = useStore();
  // TASK_048 — top safe-area strip is painted by this SafeAreaView's own
  // background. On Home that used to be COLORS.bg (#f8fafc) sitting above
  // HomeBackground's gradient, which read on-device as an empty white band
  // over the header. Painting it with the gradient's FIRST stop makes the
  // status-bar area and the header one continuous iOS composition, while
  // `edges` (and therefore the guarantee that content never slides under
  // system elements) stays exactly as before.
  //
  // TASK_053: Home's color below switched from HOME_GRADIENT[0] to
  // HOME_MINT_GRADIENT[0] (Home's own mint gradient) — still gated on
  // `isHome`, so Hours/Timeline/Profile/upcoming-events (which reuse
  // <HomeBackground/> with the original HOME_GRADIENT) are unaffected.
  //
  // TASK_054: sceneStyle.paddingBottom is always 0 — it used to reserve
  // `bottomInset` of space on every non-Home tab, painted in this scene's
  // own backgroundColor (COLORS.bg). Because each screen paints its own
  // background over a shorter flex:1 box (shrunk by that reserved gap),
  // the reserved strip read as a solid, full-width band of a different
  // color sitting behind the floating TabBar — a visible seam. Each screen
  // now reserves its own clearance on its ScrollView content instead (same
  // useTabBarContentInset() hook, applied at the call site — see
  // app/(tabs)/hours/index.tsx, timeline.tsx, profile.tsx, add.tsx and the
  // nested hours/* screens), so its background fills the full height with
  // nothing else painted behind it. sceneStyle's own backgroundColor is
  // therefore never visible — kept as-is (harmless) rather than removed, to
  // keep this diff scoped to the padding that caused the seam.
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <SafeAreaView
      style={[styles.safe, isHome && { backgroundColor: HOME_MINT_GRADIENT[0] }]}
      edges={["top", "left", "right"]}
    >
      {loaded ? (
        <Tabs
          tabBar={(props) => <TabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: {
              backgroundColor: isHome ? DS.homeMintBase : COLORS.bg,
              // TASK_054 — every tab now owns its own bottom clearance on
              // its ScrollView content (useTabBarContentInset(), applied at
              // each screen's call site) so its background runs edge-to-edge
              // and content scrolls under the floating bar, with nothing
              // else painted in the reserved gap. See the TASK_054 comment
              // above for why this used to be `isHome ? 0 : bottomInset`.
              paddingBottom: 0,
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
