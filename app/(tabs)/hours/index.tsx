import { ScrollView, StyleSheet, Text, View } from "react-native";
import { TimerHeroCard } from "@/components/hours/TimerHeroCard";
import { HoursNavList } from "@/components/hours/HoursNavList";
import { HOURS_COLORS as C } from "@/components/hours/hoursTokens";
import { DS, HomeBackground } from "@/components/dashboard";
import { useTabBarContentInset } from "@/components/TabBar";

// "Часы" dashboard, redesigned (TASK_031) into a minimal time-tracking
// control center: a large heading, the timer as the page's main visual
// element, and a compact grouped list of the three remaining actions.
// Removed: the "Текущий служебный год" MonthChip grid, the monthly
// progress ring, the "До цели осталось"/"Осталось дней" chips, the pace
// status, the heat map, and the old four-card QuickActionsRow — see
// docs/TASKS/TASK_031_HOURS_PAGE_REDESIGN.md for what happened to each.
//
// TASK_046: background unified with Home/Profile/Events — same
// View{DS.homeBase} + <HomeBackground/> + transparent ScrollView pattern,
// instead of this screen's own flat HOURS_COLORS.screenBackground.
export default function HoursDashboard() {
  // TASK_054 — clearance now lives on this ScrollView's own content instead
  // of the shared Tabs scene padding (see app/(tabs)/_layout.tsx), so the
  // screen's background fills the full height with nothing else painted
  // behind the floating TabBar.
  const bottomInset = useTabBarContentInset();

  return (
    <View style={styles.screen}>
      <HomeBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Часы</Text>
          <Text style={styles.subtitle}>Учёт служебного времени</Text>
        </View>

        <TimerHeroCard />

        <HoursNavList />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.homeBase },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 8, gap: 16 },
  header: { paddingHorizontal: 4, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 34, fontWeight: "700", color: C.primaryText },
  subtitle: { fontSize: 15, color: C.secondaryText, marginTop: 2 },
});
