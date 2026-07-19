import { ScrollView, StyleSheet, Text, View } from "react-native";
import { TimerHeroCard } from "@/components/hours/TimerHeroCard";
import { HoursNavList } from "@/components/hours/HoursNavList";
import { HOURS_COLORS as C } from "@/components/hours/hoursTokens";

// "Часы" dashboard, redesigned (TASK_031) into a minimal time-tracking
// control center: a large heading, the timer as the page's main visual
// element, and a compact grouped list of the three remaining actions.
// Removed: the "Текущий служебный год" MonthChip grid, the monthly
// progress ring, the "До цели осталось"/"Осталось дней" chips, the pace
// status, the heat map, and the old four-card QuickActionsRow — see
// docs/TASKS/TASK_031_HOURS_PAGE_REDESIGN.md for what happened to each.
export default function HoursDashboard() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Часы</Text>
        <Text style={styles.subtitle}>Учёт служебного времени</Text>
      </View>

      <TimerHeroCard />

      <HoursNavList />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.screenBackground },
  content: { padding: 16, paddingTop: 8, gap: 16, paddingBottom: 32 },
  header: { paddingHorizontal: 4, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 34, fontWeight: "700", color: C.primaryText },
  subtitle: { fontSize: 15, color: C.secondaryText, marginTop: 2 },
});
