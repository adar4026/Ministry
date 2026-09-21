import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { useTabBarContentInset } from "@/components/TabBar";
import { ServiceCalendarContent } from "@/components/hours/ServiceCalendarContent";
import { HISTORY_COLORS as C, HISTORY_FONT_FAMILY as FONT } from "@/components/hours/historyTokens";
import { useThemedStyles } from "@/theme";

// «История» of the «Часы» tab (TASK_032 → TASK_039). TASK_083: the whole
// calendar body — period switcher, ‹ › nav, «Итого», month grid, session /
// legacy list, day picker — now lives in ServiceCalendarContent, shared
// with the drawer's /calendar screen. This file is only History's own
// chrome: its header, its HISTORY_COLORS ground and the tab-bar inset. No
// CalendarVariantContext provider here, so the content renders in the
// default "history" skin — exactly as before.
export default function HistoryScreen() {
  const styles = useThemedStyles(makeStyles);
  // TASK_054 — clearance now lives on this ScrollView's own content instead
  // of the shared Tabs scene padding (see app/(tabs)/_layout.tsx).
  const bottomInset = useTabBarContentInset();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <BackButton fallbackHref="/hours" background={C.cardBackground} color={C.primaryText} style={styles.backBtn} />
        <Text style={styles.title} pointerEvents="none">
          История
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        <ServiceCalendarContent />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = () => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.screenBackground },
  header: {
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: C.primaryText,
    textAlign: "center",
    fontFamily: FONT,
  },
  content: { paddingHorizontal: 16, paddingTop: 8 },
});
