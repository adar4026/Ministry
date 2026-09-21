import { Redirect } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { DS, HomeBackground } from "@/components/dashboard";
import { ServiceCalendarContent } from "@/components/hours/ServiceCalendarContent";
import { CalendarVariantContext } from "@/components/hours/calendarVariant";
import { useStore } from "@/store/StoreContext";
import { useThemedStyles } from "@/theme";

// TASK_083 — «Календарь служения», opened from the Home drawer / Profile
// page (СЛУЖЕНИЕ → Календарь служения). A root-Stack route like
// /statistics and /participation, so no tab bar sits under it and «Назад»
// returns to where the drawer was opened (fallback: Home).
//
// It is NOT a second calendar: the body is History's own
// ServiceCalendarContent (period switcher, ‹ › nav, «Итого», month grid,
// sessions / legacy row, day → /entry) rendered in the "ministry" skin —
// DS / MINISTRY tokens on the Home ground instead of History's lavender.
//
// A publisher does not keep hours; their service calendar is the
// participation journal that already exists, so /calendar simply redirects
// there rather than growing a second publisher calendar.
export default function ServiceCalendarScreen() {
  const styles = useThemedStyles(makeStyles);
  const { settings } = useStore();

  if (settings.ministryMode === "publisher") return <Redirect href="/participation" />;

  return (
    <View style={styles.screen}>
      <HomeBackground />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <BackButton fallbackHref="/" background={DS.cardBg} color={DS.navy} style={styles.back} />
          <Text style={styles.title} pointerEvents="none">
            Календарь служения
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="calendar-scroll">
          <CalendarVariantContext.Provider value="ministry">
            <ServiceCalendarContent />
          </CalendarVariantContext.Provider>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.homeBase },
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, justifyContent: "center", minHeight: 52 },
  back: { position: "absolute", left: 16 },
  // 18 pt / 46 px side padding: «Календарь служения» (~186 px) stays on one line
  // beside the 44 pt back button at the 320 px minimum width.
  title: { fontSize: 18, fontWeight: "700", color: DS.navy, textAlign: "center", letterSpacing: -0.3, paddingHorizontal: 46 },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
});
