import { router } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { HeatMap } from "@/components/HeatMap";
import { MonthChip } from "@/components/MonthChip";
import { MonthSummaryCard } from "@/components/MonthSummaryCard";
import { QuickActionsRow } from "@/components/QuickActionsRow";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { COLORS, formatHM, monthProgress, serviceYearAggregation, svcYear } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

export default function HoursDashboard() {
  const { records, sessions } = useStore();

  const p = useMemo(() => monthProgress(records, new Date(), sessions), [records, sessions]);
  const hoursDone = p.hoursDone;
  const daysLeft = p.daysLeft;
  const pace = p.requiredPerDay > 0 ? Math.round(p.requiredPerDay * 60) : 0; // minutes per day

  // Service year aggregation for the month grid
  const groups = useMemo(() => serviceYearAggregation(records, sessions), [records, sessions]);
  const currentSY = groups[groups.length - 1];

  // HeatMap cells for current service year (12 months: Sep-Aug)
  const now = new Date();
  const syStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const monthCells = useMemo(() => {
    const cells: { date: string; value: number }[] = [];
    const monthOrder = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7]; // Sep-Aug
    monthOrder.forEach((month, idx) => {
      const year = idx < 4 ? syStartYear : syStartYear + 1;
      const total = records
        .filter((r) => r.year === year && r.month === month + 1)
        .reduce((sum, r) => sum + r.hours, 0);
      const sessionTotal = sessions
        .filter((s) => {
          const [y, m] = s.date.split("-").map(Number);
          return y === year && m === month + 1;
        })
        .reduce((sum, s) => sum + s.durationMinutes / 60, 0);
      const hours = sessionTotal > 0 ? sessionTotal : total;
      cells.push({ date: `${year}-${String(month + 1).padStart(2, "0")}`, value: hours });
    });
    return cells;
  }, [records, sessions, syStartYear]);

  function handleMonthPress(key: string) {
    router.push(`/hours/month/${key}`);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <MonthSummaryCard
        hoursDone={hoursDone}
        goal={50}
        pace={pace}
        daysLeft={daysLeft}
        onPress={() => router.push(`/hours/month/${currentSY?.months[0]?.id || ""}`)}
      />

      <QuickActionsRow />

      <View style={styles.section}>
        <SectionHeader title="Тепловая карта служебной год" />
        <HeatMap cells={monthCells} granularity="month" cellSize={30} gap={4} onPressCell={(date, value) => {
          if (value > 0) router.push(`/hours/month/${date}`);
        }} />
      </View>

      {currentSY && (
        <View style={styles.section}>
          <SectionHeader title={`Служебный год ${currentSY.sy} (${formatHM(currentSY.total)})`} />
          <SummaryCard accent={COLORS.accent} meta={formatHM(currentSY.total)}>
            <View style={styles.monthGrid}>
              {currentSY.months.map((m) => (
                <View key={m.id} style={styles.gridItem}>
                  <MonthChip
                    record={m}
                    onPress={() => handleMonthPress(m.id)}
                  />
                </View>
              ))}
            </View>
          </SummaryCard>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.groupedBg },
  content: { padding: 16, gap: 24 },
  section: { gap: 10 },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  gridItem: { width: "23%" },
});